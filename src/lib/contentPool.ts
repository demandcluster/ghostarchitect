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
    // 3. Select and balance items
    const getBalancedItems = (type: ContentPoolType, count: number, maliciousKey: string) => {
      const items = pool.filter(i => i.type === type);
      const allFlat = items.flatMap(i => i.data.map((d: any) => ({ data: d, qualityScore: i.qualityScore, id: i.id })));
      if (allFlat.length === 0) return [];

      // For pre-breach emails, we don't necessarily need a balance of malicious items
      if (type === 'EMAIL_PRE') {
        return this.shuffle(allFlat).slice(0, count);
      }

      const malicious = allFlat.filter(i => i.data[maliciousKey] === true);
      const legitimate = allFlat.filter(i => i.data[maliciousKey] === false);

      // Target a specific mix if possible
      const targetMalicious = Math.ceil(count * 0.5); // 50% malicious for breach
      const targetLegit = count - targetMalicious;

      const selected = [
        ...this.pickRandom(malicious, targetMalicious),
        ...this.pickRandom(legitimate, targetLegit)
      ];

      // If we don't have enough balanced items, fill with whatever is left
      if (selected.length < count) {
        const remaining = allFlat.filter(i => !selected.includes(i));
        selected.push(...this.pickRandom(remaining, count - selected.length));
      }

      return this.shuffle(selected);
    };

    // For logs and DMs, we keep the batch/chain logic
    const findBatches = (type: ContentPoolType) => pool.filter(i => i.type === type);

    const preEmails = getBalancedItems('EMAIL_PRE', 5, 'isPhishing');
    const breachEmails = getBalancedItems('EMAIL_BREACH', 8, 'isPhishing');
    const logs = this.pickRandom(findBatches('LOG_BATCH'), 1);
    const advice = this.pickRandom(findBatches('NPC_ADVICE'), 1);
    const bins = getBalancedItems('LOLBIN_BATCH', 10, 'isMalicious');
    const wifi = getBalancedItems('WIFI_BATCH', 6, 'isEvilTwin');

    const dmIntroPool = findBatches('DM_INTRO');
    const dmScenarioPool = findBatches('DM_SCENARIO');

    const intro = this.pickRandom(dmIntroPool, 1)[0];
    // For DMs, we pick 2 social engineering and 2 legitimate scenarios for balance
    const sPool = dmScenarioPool.map(s => ({ ...s, isSE: s.data.setup?.text?.toLowerCase().includes('password') || s.data.setup?.text?.toLowerCase().includes('link') }));
    const scenarios = [
      ...this.pickRandom(sPool.filter(s => s.isSE), 2),
      ...this.pickRandom(sPool.filter(s => !s.isSE), 2)
    ];

    // 4. Branding and Chaining
    const brand = (item: any, complexity: number) => {
      let str = JSON.stringify(item);
      // Support both {{tag}} and [tag] formats, case-insensitive
      const replacements = [
        { regex: /{{teamName}}|\[teamName\]/gi, value: options.teamName },
        { regex: /{{fakeDomain}}|\[fakeDomain\]/gi, value: options.fakeDomain },
        { regex: /{{playerHandle}}|\[playerHandle\]/gi, value: options.playerHandle },
      ];

      replacements.forEach(({ regex, value }) => {
        str = str.replace(regex, value);
      });
      
      const branded = JSON.parse(str);

      // Handle phishing link placeholder conditionally
      const fakeBase = options.fakeDomain.split('.')[0];
      const phishingUrl = `https://${fakeBase}-secure-auth.net/login/verify`;
      const safeUrl = `https://kb.${options.fakeDomain}/security/verify-identity`;
      
      const replaceLinks = (obj: any) => {
        if (!obj) return;
        if (typeof obj === 'string') {
          return obj.replace(/{{phishing-link}}|\[phishing-link\]/gi, branded.isPhishing ? phishingUrl : safeUrl);
        }
        if (typeof obj === 'object') {
          for (const key in obj) {
            obj[key] = replaceLinks(obj[key]);
          }
        }
        return obj;
      };

      // Heal missing email fields if this item looks like an email
      if (branded.from && branded.body) {
        // Ensure isPhishing exists
        if (branded.isPhishing === undefined) {
          branded.isPhishing = false; 
        }

        // Apply link replacement to body and subject
        if (branded.body) branded.body = replaceLinks(branded.body);
        if (branded.subject) branded.subject = replaceLinks(branded.subject);
        if (branded.text) branded.text = replaceLinks(branded.text); // For DMs

        // Ensure date exists and is in a splitable format
        if (!branded.date) {
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0];
          const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
          branded.date = `${dateStr} ${timeStr}`;
        }

        if (!branded.headers) {
          branded.headers = {
            returnPath: `<${branded.from}>`,
            spf: branded.isPhishing ? 'fail' : 'pass',
            dkim: branded.isPhishing ? 'fail' : 'pass',
            dmarc: branded.isPhishing ? 'fail' : 'pass'
          };
        } else {
          // Ensure sub-fields exist
          branded.headers.spf = branded.headers.spf || (branded.isPhishing ? 'fail' : 'pass');
          branded.headers.dkim = branded.headers.dkim || (branded.isPhishing ? 'fail' : 'pass');
          branded.headers.dmarc = branded.headers.dmarc || (branded.isPhishing ? 'fail' : 'pass');
          branded.headers.returnPath = branded.headers.returnPath || `<${branded.from}>`;
        }
      }

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
      
      // Randomize choice order to prevent predictable correct answers
      if (setup.choices && Array.isArray(setup.choices)) {
        setup.choices = this.shuffle([...setup.choices]);
      }

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

    const result = {
      preBreachEmails: preEmails.map(i => brand(i.data, i.qualityScore)),
      socialEngineeringDMs,
      breachEmails: breachEmails.map(i => brand(i.data, i.qualityScore)),
      logEntries: logs.flatMap(i => i.data.map((e: any) => brand(e, i.qualityScore))),
      npcBadAdvice: advice.flatMap(i => i.data.map((e: any) => brand(e, i.qualityScore))),
      lolbins: bins.map(i => brand(i.data, i.qualityScore)),
      wifi: wifi.map(i => brand(i.data, i.qualityScore)),
      isOfflineContent: poolItems.length === 0
    };

    console.log(`[ContentPool] Fetched content for ${options.playerHandle}: ${result.preBreachEmails.length} pre, ${result.breachEmails.length} breach emails`);
    return result;
  }

  private pickRandom(arr: any[], count: number) {
    const shuffled = this.shuffle([...arr]);
    return shuffled.slice(0, count);
  }

  private shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
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
