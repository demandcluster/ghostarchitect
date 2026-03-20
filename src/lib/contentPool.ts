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

    // Helper to clean malformed AI strings
    const clean = (val: any): string | undefined => {
      if (val === null || val === undefined) return undefined;
      const s = String(val).trim();
      if (s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null' || s === '') return undefined;
      return s;
    };

    // 3. Select and balance items
    const getBalancedItems = (type: ContentPoolType, count: number, maliciousKey: string) => {
      const items = pool.filter(i => i.type === type);
      const allFlat = items.flatMap(i => {
        const rawData = i.data;
        let dataArray: any[] = [];
        
        if (Array.isArray(rawData)) {
          dataArray = rawData;
        } else if (rawData && typeof rawData === 'object') {
          dataArray = [rawData];
        }
        
        if (dataArray.length === 0) return [];
        return dataArray.map((d: any) => ({ 
          data: d, 
          qualityScore: i.qualityScore, 
          id: i.id,
          // Pre-normalization for filtering
          isMalicious: d[maliciousKey] === true || 
                       String(d[maliciousKey]) === 'true' ||
                       String(d.type || '').toLowerCase().includes('phish') ||
                       String(d.subject || d.title || '').toLowerCase().includes('urgent')
        }));
      });
      
      if (allFlat.length === 0) {
        console.warn(`[ContentPool] No items found for type: ${type}`);
        return [];
      }

      if (type === 'EMAIL_PRE') {
        return this.shuffle(allFlat).slice(0, count);
      }

      const malicious = allFlat.filter(i => i.isMalicious);
      const legitimate = allFlat.filter(i => !i.isMalicious);

      console.log(`[ContentPool] ${type} candidates: ${malicious.length} mal, ${legitimate.length} legit (Target: ${count})`);

      const targetMalicious = Math.ceil(count * 0.5); 
      const targetLegit = count - targetMalicious;

      const selected = [
        ...this.pickRandom(malicious, targetMalicious),
        ...this.pickRandom(legitimate, targetLegit)
      ];

      if (selected.length < count) {
        const remaining = allFlat.filter(i => !selected.includes(i));
        selected.push(...this.pickRandom(remaining, count - selected.length));
      }

      return this.shuffle(selected);
    };

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
    const sPool = dmScenarioPool.map(s => {
      const sData = s.data as any;
      const text = (sData.setup?.text || '').toLowerCase();
      return { 
        ...s, 
        isSE: text.includes('password') || text.includes('link') || text.includes('urgent') || text.includes('access')
      };
    });
    const scenarios = [
      ...this.pickRandom(sPool.filter(s => s.isSE), 2),
      ...this.pickRandom(sPool.filter(s => !s.isSE), 2)
    ];

    // 4. Branding and Chaining
    const brand = (item: any, complexity: number) => {
      if (!item) return item;
      let branded = typeof item === 'string' ? JSON.parse(item) : { ...item };
      let str = JSON.stringify(branded);

      const replacements = [
        { regex: /{{teamName}}|\[teamName\]/gi, value: options.teamName },
        { regex: /{{fakeDomain}}|\[fakeDomain\]/gi, value: options.fakeDomain },
        { regex: /{{playerHandle}}|\[playerHandle\]/gi, value: options.playerHandle },
      ];

      replacements.forEach(({ regex, value }) => {
        str = str.replace(regex, value);
      });
      
      branded = JSON.parse(str);

      const fakeBase = options.fakeDomain.split('.')[0];
      const phishingUrl = `https://${fakeBase}-secure-auth.net/login/verify`;
      const safeUrl = `https://kb.${options.fakeDomain}/security/verify-identity`;
      
      const replaceLinks = (val: any): any => {
        if (!val) return val;
        if (typeof val === 'string') {
          return val.replace(/{{phishing-link}}|\[phishing-link\]/gi, branded.isPhishing ? phishingUrl : safeUrl);
        }
        if (Array.isArray(val)) return val.map(replaceLinks);
        if (typeof val === 'object') {
          const newObj = { ...val };
          for (const key in newObj) {
            newObj[key] = replaceLinks(newObj[key]);
          }
          return newObj;
        }
        return val;
      };

      if (branded.from || branded.sender || branded.body || branded.text || branded.subject || branded.title) {
        branded.from = clean(branded.from) || clean(branded.sender) || clean(branded.author) || 'system@' + options.fakeDomain;
        branded.to = clean(branded.to) || clean(branded.recipient) || clean(branded.receiver) || options.playerHandle + '@' + options.fakeDomain;
        branded.subject = clean(branded.subject) || clean(branded.title) || 'No Subject';
        branded.body = clean(branded.body) || clean(branded.text) || clean(branded.message) || clean(branded.content) || '';
        
        if (branded.isPhishing === undefined) {
          branded.isPhishing = String(branded.type || '').toLowerCase().includes('phish') || 
                               String(branded.subject).toLowerCase().includes('urgent') ||
                               false; 
        } else {
          branded.isPhishing = branded.isPhishing === true || String(branded.isPhishing) === 'true';
        }

        branded = replaceLinks(branded);

        let dateVal = clean(branded.date) || clean(branded.timestamp) || clean(branded.time);
        if (!dateVal || !dateVal.includes('-')) {
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0];
          const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
          branded.date = `${dateStr} ${timeStr}`;
        } else {
          branded.date = dateVal;
        }

        const extractEmail = (fromStr: string): string => {
          const match = fromStr.match(/<(.+?)>/);
          if (match) return match[1];
          if (fromStr.includes('@')) return fromStr.trim();
          return fromStr.toLowerCase().replace(/\s+/g, '.') + '@' + options.fakeDomain;
        };

        if (!branded.headers) {
          branded.headers = {
            returnPath: `<${extractEmail(branded.from)}>`,
            spf: branded.isPhishing ? 'fail' : 'pass',
            dkim: branded.isPhishing ? 'fail' : 'pass',
            dmarc: branded.isPhishing ? 'fail' : 'pass'
          };
        } else {
          branded.headers.spf = clean(branded.headers.spf) || (branded.isPhishing ? 'fail' : 'pass');
          branded.headers.dkim = clean(branded.headers.dkim) || (branded.isPhishing ? 'fail' : 'pass');
          branded.headers.dmarc = clean(branded.headers.dmarc) || (branded.isPhishing ? 'fail' : 'pass');
          let rp = clean(branded.headers.returnPath) || `<${extractEmail(branded.from)}>`;
          if (!rp.startsWith('<')) rp = `<${rp}>`;
          branded.headers.returnPath = rp;
        }
      }

      // Automatically shuffle DM choices if they exist
      if (branded.choices && Array.isArray(branded.choices)) {
        branded.choices = this.shuffle([...branded.choices]);
      }

      return { ...branded, complexity };
    };

    const socialEngineeringDMs: DMMessage[] = [];
    if (intro) {
      const brandedIntro = brand(intro.data, intro.qualityScore);
      if (scenarios.length > 0) brandedIntro.nextMessageId = `s1-setup-${options.sessionId}`;
      socialEngineeringDMs.push(brandedIntro);
    }

    scenarios.forEach((s, idx) => {
      const complexity = s.qualityScore;
      const sData = s.data as any;
      const sId = idx + 1;
      const nextSId = idx < scenarios.length - 1 ? `s${sId + 1}-setup-${options.sessionId}` : undefined;
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

    const allSelectedItems = [...preEmails, ...breachEmails, ...logs, ...advice, ...bins, ...wifi, intro, ...scenarios].filter(Boolean);
    const allSelectedIds = allSelectedItems.map(i => i!.id);
    if (sessionExists && allSelectedIds.length > 0) {
      await prisma.sessionSeenContent.createMany({
        data: allSelectedIds.map(id => ({ sessionId: options.sessionId, contentId: id })),
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

  async refillPool(section: 'initial' | 'secondary' | 'all' = 'all') {
    if (!this.generator) return;
    const prisma = requirePrisma();
    try {
      console.log(`[PoolManager] Refilling pool for section: ${section}`);
      const batch = await this.generator.generateBatch({ sessionId: 'pool-gen', locale: 'en', section });
      const entries: { type: ContentPoolType; data: any }[] = [];
      if (batch.preBreachEmails.length > 0) entries.push({ type: 'EMAIL_PRE', data: batch.preBreachEmails });
      if (batch.breachEmails.length > 0) entries.push({ type: 'EMAIL_BREACH', data: batch.breachEmails });
      if (batch.logEntries.length > 0) entries.push({ type: 'LOG_BATCH', data: batch.logEntries });
      if (batch.npcBadAdvice.length > 0) entries.push({ type: 'NPC_ADVICE', data: batch.npcBadAdvice });
      if (batch.lolbins.length > 0) entries.push({ type: 'LOLBIN_BATCH', data: batch.lolbins });
      if (batch.wifi.length > 0) entries.push({ type: 'WIFI_BATCH', data: batch.wifi });
      const dmItems = batch.socialEngineeringDMs;
      dmItems.forEach((item: any) => {
        if (item.setup) entries.push({ type: 'DM_SCENARIO', data: item });
        else entries.push({ type: 'DM_INTRO', data: item });
      });
      for (const entry of entries) {
        const item = await prisma.contentPool.create({ data: { type: entry.type, data: entry.data, audited: false } });
        this.auditItem(item.id, entry.type, entry.data);
      }
    } catch (e) { console.error('[PoolManager] Refill error:', e); }
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
        await prisma.contentPool.update({ where: { id }, data: { qualityScore: result.score, audited: true } });
        console.log(`[PoolManager] Item ${id} approved (score ${result.score})`);
      }
    } catch (e) { console.error('[PoolManager] Audit failed for item:', id, e); }
  }
}
