import { requirePrisma } from './prisma';
import { OpenAIClient, AuditClient } from './openaiAI';
import type { Email, LogEntry, DMMessage, LOLBin, WiFiNetwork } from '@/content/types';

export type ContentPoolType = 
  | 'EMAIL_PRE' 
  | 'EMAIL_BREACH' 
  | 'DM_INTRO' 
  | 'DM_SCENARIO' 
  | 'NPC_ADVICE' 
  | 'LOG_BATCH' 
  | 'LOLBIN_BATCH' 
  | 'WIFI_BATCH';

export interface PoolFetchOptions {
  sessionId: string;
  teamName: string;
  fakeDomain: string;
  playerHandle: string;
}

export class ContentPoolManager {
  private static instance: ContentPoolManager;
  private generator: OpenAIClient | null;
  private auditor: AuditClient | null;

  private constructor() {
    const generatorKey = process.env.OPENAI_API_KEY;
    this.generator = generatorKey ? new OpenAIClient({ apiKey: generatorKey }) : null;
    this.auditor = generatorKey ? new AuditClient(generatorKey) : null;
  }

  public static getInstance(): ContentPoolManager {
    if (!ContentPoolManager.instance) {
      ContentPoolManager.instance = new ContentPoolManager();
    }
    return ContentPoolManager.instance;
  }

  /**
   * Fetch branded content from the pool for a session.
   */
  async fetchBrandedContent(options: PoolFetchOptions) {
    const prisma = requirePrisma();
    
    // 1. Get pool items (audited and high score)
    const poolItems = await prisma.contentPool.findMany({
      where: {
        audited: true,
        qualityScore: { gte: 5 }
      }
    });

    // 2. Filter out seen content (only if session exists in DB)
    const sessionExists = await prisma.session.findUnique({
      where: { id: options.sessionId },
      select: { id: true }
    });

    const seenIds = sessionExists 
      ? (await prisma.sessionSeenContent.findMany({
          where: { sessionId: options.sessionId },
          select: { contentId: true }
        })).map(s => s.contentId)
      : [];

    const available = poolItems.filter(item => !seenIds.includes(item.id));
    
    // Fallback to all if pool is empty or everything seen
    const pool = available.length > 0 ? available : poolItems;

    // 3. Select items for each type
    const findItems = (type: ContentPoolType) => pool.filter(i => i.type === type);
    
    const preEmails = this.pickRandom(findItems('EMAIL_PRE'), 1);
    const breachEmails = this.pickRandom(findItems('EMAIL_BREACH'), 1);
    const logs = this.pickRandom(findItems('LOG_BATCH'), 1);
    const advice = this.pickRandom(findItems('NPC_ADVICE'), 1);
    const bins = this.pickRandom(findItems('LOLBIN_BATCH'), 1);
    const wifi = this.pickRandom(findItems('WIFI_BATCH'), 1);

    // DM Special Handling: Intro + 4 Scenarios
    const dmIntroPool = findItems('DM_INTRO');
    const dmScenarioPool = findItems('DM_SCENARIO');
    
    const intro = this.pickRandom(dmIntroPool, 1)[0];
    const scenarios = this.pickRandom(dmScenarioPool, 4);

    // 4. Branding and Chaining
    const brand = (item: any, complexity: number) => {
      let str = JSON.stringify(item);
      str = str.replace(/{{teamName}}/g, options.teamName);
      str = str.replace(/{{fakeDomain}}/g, options.fakeDomain);
      str = str.replace(/{{playerHandle}}/g, options.playerHandle);
      const branded = JSON.parse(str);
      return { ...branded, complexity };
    };

    // Construct the DM Chain
    const socialEngineeringDMs: DMMessage[] = [];
    if (intro) {
      const brandedIntro = brand(intro.data, intro.qualityScore);
      // Link intro to first scenario if scenarios exist
      if (scenarios.length > 0) {
        brandedIntro.nextMessageId = `s1-setup-${options.sessionId}`;
      }
      socialEngineeringDMs.push(brandedIntro);
    }

    scenarios.forEach((s, idx) => {
      const complexity = s.qualityScore;
      const sData = s.data as any; // { setup, onPass, onFail }
      const sId = idx + 1;
      const nextSId = idx < scenarios.length - 1 ? `s${sId + 1}-setup-${options.sessionId}` : undefined;

      // Setup unique IDs for this session chain
      const setupId = `s${sId}-setup-${options.sessionId}`;
      const passId = `s${sId}-pass-${options.sessionId}`;
      const failId = `s${sId}-fail-${options.sessionId}`;

      const setup = brand(sData.setup, complexity);
      setup.id = setupId;
      setup.choices.forEach((c: any) => {
        c.nextMessageId = c.nextMessageId === 'ON_PASS_ID' ? passId : failId;
      });

      const pass = brand(sData.onPass, complexity);
      pass.id = passId;
      pass.nextMessageId = nextSId;

      const fail = brand(sData.onFail, complexity);
      fail.id = failId;
      fail.nextMessageId = nextSId;

      socialEngineeringDMs.push(setup, pass, fail);
    });

    // 5. Track seen IDs (only if session exists in DB)
    const allSelectedItems = [...preEmails, ...breachEmails, ...logs, ...advice, ...bins, ...wifi, intro, ...scenarios].filter(Boolean);
    const allSelectedIds = allSelectedItems.map(i => i!.id);
    if (sessionExists && allSelectedIds.length > 0) {
      await prisma.sessionSeenContent.createMany({
        data: allSelectedIds.map(id => ({
          sessionId: options.sessionId,
          contentId: id
        })),
        skipDuplicates: true
      });
    }

    return {
      preBreachEmails: preEmails.flatMap(i => i.data.map((e: any) => brand(e, i.qualityScore))),
      socialEngineeringDMs,
      breachEmails: breachEmails.flatMap(i => i.data.map((e: any) => brand(e, i.qualityScore))),
      logEntries: logs.flatMap(i => i.data.map((e: any) => brand(e, i.qualityScore))),
      npcBadAdvice: advice.flatMap(i => i.data.map((e: any) => brand(e, i.qualityScore))),
      lolbins: bins.flatMap(i => i.data.map((e: any) => brand(e, i.qualityScore))),
      wifi: wifi.flatMap(i => i.data.map((e: any) => brand(e, i.qualityScore))),
      isOfflineContent: poolItems.length === 0
    };
  }

  private pickRandom(arr: any[], count: number) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Refill the pool in background
   */
  async refillPool(section: 'initial' | 'secondary' | 'all' = 'all') {
    if (!this.generator) return;
    const prisma = requirePrisma();

    try {
      console.log(`[PoolManager] Refilling pool for section: ${section}`);
      const batch = await this.generator.generateBatch({
        sessionId: 'pool-gen',
        locale: 'en',
        section
      });

      const entries: { type: ContentPoolType; data: any }[] = [];
      
      if (batch.preBreachEmails.length > 0) entries.push({ type: 'EMAIL_PRE', data: batch.preBreachEmails });
      if (batch.breachEmails.length > 0) entries.push({ type: 'EMAIL_BREACH', data: batch.breachEmails });
      if (batch.logEntries.length > 0) entries.push({ type: 'LOG_BATCH', data: batch.logEntries });
      if (batch.npcBadAdvice.length > 0) entries.push({ type: 'NPC_ADVICE', data: batch.npcBadAdvice });
      if (batch.lolbins.length > 0) entries.push({ type: 'LOLBIN_BATCH', data: batch.lolbins });
      if (batch.wifi.length > 0) entries.push({ type: 'WIFI_BATCH', data: batch.wifi });

      // Handle the new specialized DM types
      // The AI returns these combined in socialEngineeringDMs for transport
      const dmItems = batch.socialEngineeringDMs;
      dmItems.forEach((item: any) => {
        if (item.setup) {
          entries.push({ type: 'DM_SCENARIO', data: item });
        } else {
          entries.push({ type: 'DM_INTRO', data: item });
        }
      });

      for (const entry of entries) {
        const item = await prisma.contentPool.create({
          data: {
            type: entry.type,
            data: entry.data,
            audited: false
          }
        });
        
        // Trigger background audit
        this.auditItem(item.id, entry.type, entry.data);
      }
    } catch (e) {
      console.error('[PoolManager] Refill error:', e);
    }
  }

  private async auditItem(id: string, type: string, data: any) {
    if (!this.auditor) return;
    const prisma = requirePrisma();
    
    try {
      const result = await this.auditor.auditContent(type, data);
      if (result.score < 4) {
        await prisma.contentPool.delete({ where: { id } });
        console.log(`[PoolManager] Item ${id} rejected (score ${result.score})`);
      } else {
        await prisma.contentPool.update({
          where: { id },
          data: {
            qualityScore: result.score,
            audited: true
          }
        });
        console.log(`[PoolManager] Item ${id} approved (score ${result.score})`);
      }
    } catch (e) {
      console.error('[PoolManager] Audit failed for item:', id, e);
    }
  }
}
