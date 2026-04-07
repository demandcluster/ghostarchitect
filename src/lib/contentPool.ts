import { requirePrisma } from './prisma';
import { OpenAIClient, AuditClient } from './openaiAI';
import type { Email, LogEntry, LOLBin, WiFiNetwork } from '@/content/types';

export type ContentPoolType =
  | 'EMAIL_PRE'
  | 'EMAIL_BREACH'
  | 'LOG_BATCH'
  | 'LOLBIN_BATCH'
  | 'WIFI_BATCH';

export interface PoolFetchOptions {
  sessionId: string;
  teamName: string;
  fakeDomain: string;
  playerHandle: string;
}

interface PoolItem {
  id: string;
  type: string;
  data: unknown;
  qualityScore: number;
}

interface BalancedItem {
  data: Record<string, unknown>;
  qualityScore: number;
  id: string;
  isMalicious: boolean;
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
    const poolItemsRaw = await prisma.contentPool.findMany({
      where: {
        audited: true,
        qualityScore: { gte: 5 }
      }
    });
    
    const poolItems = poolItemsRaw as unknown as PoolItem[];

    // 2. Filter out seen content (only if session exists in DB)
    const sessionExists = await prisma.session.findUnique({
      where: { id: options.sessionId },
      select: { id: true }
    });

    const seenIds = sessionExists 
      ? (await prisma.sessionSeenContent.findMany({
          where: { sessionId: options.sessionId },
          select: { contentId: true }
        })).map((s: { contentId: string }) => s.contentId)
      : [];

    const available = poolItems.filter(item => !seenIds.includes(item.id));
    
    // Fallback to all if pool is empty or everything seen
    const pool = available.length > 0 ? available : poolItems;

    // Helper to clean malformed AI strings
    const clean = (val: unknown): string | undefined => {
      if (val === null || val === undefined) return undefined;
      const s = String(val).trim();
      if (s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null' || s === '') return undefined;
      return s;
    };

    // 3. Select and balance items
    const getBalancedItems = (type: ContentPoolType, count: number, maliciousKey: string): BalancedItem[] => {
      const items = pool.filter(i => i.type === type);
      const allFlat = items.flatMap(i => {
        const rawData = i.data;
        let dataArray: Record<string, unknown>[] = [];
        
        if (Array.isArray(rawData)) {
          dataArray = rawData.filter(d => d && typeof d === 'object' && !Array.isArray(d)) as Record<string, unknown>[];
        } else if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
          dataArray = [rawData as Record<string, unknown>];
        }
        
        if (dataArray.length === 0) return [];
        return dataArray.map((d) => {
          // Check the explicit key and common AI-generated variants
          const checkBool = (...keys: string[]) => keys.some(k => d[k] === true || String(d[k] || '') === 'true');
          const checkStr = (...keys: string[]) => keys.map(k => String(d[k] || '').toLowerCase()).join(' ');

          let mal = checkBool(maliciousKey, 'isPhishing', 'isMalicious', 'isEvil', 'isEvilTwin', 'malicious', 'phishing', 'evil');
          if (!mal) {
            const text = checkStr('type', 'category', 'classification');
            mal = /phish|malicious|evil|suspicious|attack|threat/.test(text);
          }
          if (!mal && maliciousKey === 'isPhishing') {
            const subj = checkStr('subject', 'title', 'name');
            mal = /urgent|verify.*account|suspend|click.*immediately|security.*alert/i.test(subj);
          }

          return { data: d, qualityScore: i.qualityScore, id: i.id, isMalicious: mal };
        });
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

      const pickedMal = this.pickRandom(malicious, targetMalicious);
      const pickedLegit = this.pickRandom(legitimate, targetLegit);

      // Guarantee at least 1 malicious item — if none detected, force-pick from pool
      if (pickedMal.length === 0 && allFlat.length > 0) {
        console.warn(`[ContentPool] ${type}: no malicious items detected, force-marking random item`);
        const forced = allFlat[Math.floor(Math.random() * allFlat.length)];
        (forced.data as Record<string, unknown>)[maliciousKey] = true;
        forced.isMalicious = true;
        pickedMal.push(forced);
        // Remove from legit pick if it was there
        const idx = pickedLegit.indexOf(forced);
        if (idx !== -1) pickedLegit.splice(idx, 1);
      }

      const selected = [...pickedMal, ...pickedLegit];

      if (selected.length < count) {
        const remaining = allFlat.filter(i => !selected.includes(i));
        selected.push(...this.pickRandom(remaining, count - selected.length));
      }

      return this.shuffle(selected);
    };

    const findBatches = (type: ContentPoolType) => pool.filter(i => i.type === type);

    const preEmails = getBalancedItems('EMAIL_PRE', 5, 'isPhishing');
    const breachEmails = getBalancedItems('EMAIL_BREACH', 8, 'isPhishing');
    const logs = findBatches('LOG_BATCH');
    const bins = getBalancedItems('LOLBIN_BATCH', 10, 'isMalicious');
    const wifi = getBalancedItems('WIFI_BATCH', 6, 'isEvilTwin');

    // 4. Branding and Chaining
    const brand = (item: unknown, complexity: number): Record<string, unknown> => {
      if (!item) return {} as Record<string, unknown>;
      if (typeof item === 'string') {
        try { item = JSON.parse(item); } catch { return { value: item, complexity } as Record<string, unknown>; }
      }
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return { value: item, complexity } as Record<string, unknown>;
      let branded = { ...(item as Record<string, unknown>) };
      let str = JSON.stringify(branded);

      const replacements = [
        { regex: /{{teamName}}|\[teamName\]|\bteamName\b/gi, value: options.teamName },
        { regex: /{{fakeDomain}}|\[fakeDomain\]|\bfakeDomain(?:\.com)?\b/gi, value: options.fakeDomain },
        { regex: /{{playerHandle}}|\[playerHandle\]|\bplayerHandle\b/gi, value: options.playerHandle },
      ];

      replacements.forEach(({ regex, value }) => {
        str = str.replace(regex, value);
      });
      
      branded = JSON.parse(str) as Record<string, unknown>;

      const fakeBase = options.fakeDomain.split('.')[0];
      const phishingUrl = `https://${fakeBase}-secure-auth.net/login/verify`;
      const safeUrl = `https://kb.${options.fakeDomain}/security/verify-identity`;
      
      const replaceLinks = (val: any): any => {
        if (!val) return val;
        if (typeof val === 'string') {
          return val.replace(/{{phishing-link}}|\[phishing-link\]/gi, branded.isPhishing ? phishingUrl : safeUrl);
        }
        if (Array.isArray(val)) return val.map(replaceLinks);
        if (typeof val === 'object' && val !== null) {
          const newObj = { ...val } as Record<string, unknown>;
          for (const key in newObj) {
            newObj[key] = replaceLinks(newObj[key]);
          }
          return newObj;
        }
        return val;
      };

      // Detect DM messages (have choices, senderRole, or avatar) and skip email normalization
      const isDM = branded.choices || branded.senderRole || branded.avatar;

      if (!isDM && (branded.from || branded.sender || branded.body || branded.text || branded.subject || branded.title)) {
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

        const deeplyBranded = replaceLinks(branded) as Record<string, unknown>;
        Object.assign(branded, deeplyBranded);

        const dateVal = clean(branded.date) || clean(branded.timestamp) || clean(branded.time);
        if (!dateVal || !dateVal.includes('-')) {
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0];
          const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
          branded.date = `${dateStr} ${timeStr}`;
        } else {
          branded.date = dateVal;
        }

        const extractEmail = (fromStr: string): string => {
          const match = fromStr.match(/<([^>]+)>/);
          if (match) return match[1];
          if (fromStr.includes('@')) return fromStr.trim();
          return fromStr.toLowerCase().replace(/\s+/g, '.') + '@' + options.fakeDomain;
        };

        if (!branded.headers) {
          branded.headers = {
            returnPath: `<${extractEmail(String(branded.from))}>`,
            spf: branded.isPhishing ? 'fail' : 'pass',
            dkim: branded.isPhishing ? 'fail' : 'pass',
            dmarc: branded.isPhishing ? 'fail' : 'pass'
          };
        } else {
          const h = branded.headers as Record<string, unknown>;
          h.spf = clean(h.spf) || (branded.isPhishing ? 'fail' : 'pass');
          h.dkim = clean(h.dkim) || (branded.isPhishing ? 'fail' : 'pass');
          h.dmarc = clean(h.dmarc) || (branded.isPhishing ? 'fail' : 'pass');
          let rp = clean(h.returnPath) || `<${extractEmail(String(branded.from))}>`;
          if (!rp.startsWith('<')) rp = `<${rp}>`;
          h.returnPath = rp;
        }
      }

      // LOLBin normalization is handled at the result assembly level (see lolbins: safeFlatMap(...).map(...))
      // to avoid brand() type-detection conflicts. Do NOT add LOLBin normalization here.

      // Normalize log entry fields (must be before email normalization to prevent false matches)
      if (branded.level !== undefined || branded.severity !== undefined || branded.logLevel !== undefined) {
        branded.id = clean(branded.id) || `log-${Math.random().toString(36).slice(2, 8)}`;
        branded.timestamp = clean(branded.timestamp) || clean(branded.time) || clean(branded.date) || new Date().toISOString();
        const lvl = (clean(branded.level) || clean(branded.severity) || clean(branded.logLevel) || 'INFO').toUpperCase();
        branded.level = ['INFO', 'WARN', 'ERROR', 'CRITICAL'].includes(lvl) ? lvl : 'INFO';
        branded.source = clean(branded.source) || clean(branded.service) || clean(branded.processName) || clean(branded.process) || clean(branded.origin) || 'system';
        // AI generates logs with eventID/destination/processName/commandLine instead of message
        const cmdLine = clean(branded.commandLine) || clean(branded.command) || '';
        const dest = clean(branded.destination) || '';
        const eventId = clean(branded.eventID) || clean(branded.eventId) || '';
        const synthParts = [eventId && `EventID:${eventId}`, dest && `dst:${dest}`, cmdLine].filter(Boolean);
        branded.message = clean(branded.message) || clean(branded.text) || clean(branded.msg) || clean(branded.content) || clean(branded.body) || clean(branded.description) || (synthParts.length > 0 ? synthParts.join(' ') : '');
        const mal = branded.isMalicious ?? branded.malicious ?? branded.suspicious ?? false;
        branded.isMalicious = mal === true || String(mal) === 'true';
        branded.attackTechnique = clean(branded.attackTechnique) || clean(branded.technique) || clean(branded.attack) || undefined;
        branded.mitreId = clean(branded.mitreId) || clean(branded.mitre) || clean(branded.mitreAttackId) || undefined;
        // Remove fields that would trigger email normalization
        delete branded.text;
        delete branded.body;
        delete branded.content;
        return { ...branded, complexity };
      }

      // Normalize WiFi network fields
      if (branded.isEvilTwin !== undefined || branded.evil !== undefined || branded.bssid || branded.signalStrength !== undefined || branded.signal !== undefined) {
        branded.id = clean(branded.id) || `wifi-${Math.random().toString(36).slice(2, 8)}`;
        branded.ssid = clean(branded.ssid) || clean(branded.name) || clean(branded.networkName) || `${options.teamName}-Secure`;
        branded.bssid = clean(branded.bssid) || clean(branded.macAddress) || clean(branded.mac) || 'XX:XX:XX:XX:XX:XX';
        const sig = branded.signalStrength ?? branded.signal ?? branded.strength ?? -65;
        branded.signalStrength = typeof sig === 'number' ? sig : parseInt(String(sig), 10) || -65;
        branded.authType = clean(branded.authType) || clean(branded.auth) || clean(branded.security) || clean(branded.encryption) || 'WPA2-PSK';
        const evil = branded.isEvilTwin ?? branded.evil ?? branded.isMalicious ?? branded.isEvil ?? false;
        branded.isEvilTwin = evil === true || String(evil) === 'true';
        if (!branded.indicators || !Array.isArray(branded.indicators)) {
          branded.indicators = branded.hints ? (Array.isArray(branded.hints) ? branded.hints : []) : [];
        }
        // Ensure corporate SSIDs are branded with team name
        const ssid = String(branded.ssid);
        if (!ssid.toLowerCase().includes(options.teamName.toLowerCase())) {
          branded.ssid = `${options.teamName}-${ssid}`;
        }
        return { ...branded, complexity };
      }

      return { ...branded, complexity };
    };

    const allSelectedItems = [...preEmails, ...breachEmails, ...logs, ...bins, ...wifi].filter(Boolean);
    const allSelectedIds = allSelectedItems.map(i => i!.id);
    if (sessionExists && allSelectedIds.length > 0) {
      await prisma.sessionSeenContent.createMany({
        data: allSelectedIds.map(id => ({ sessionId: options.sessionId, contentId: id })),
        skipDuplicates: true
      });
    }

    const safeFlatMap = (items: { data: unknown; qualityScore: number }[]) => {
      const seen = new Set<string>();
      return items.flatMap(i => {
        const arr = Array.isArray(i.data) ? (i.data as unknown[]) : (i.data ? [i.data] : []);
        return arr.map((e, idx) => {
          const branded = brand(e, i.qualityScore);
          // Deduplicate IDs
          const rec = branded as Record<string, unknown>;
          let id = String(rec.id || '');
          if (!id || seen.has(id)) {
            id = `${id || 'item'}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
            rec.id = id;
          }
          seen.add(id);
          return branded;
        });
      });
    };

    const result = {
      preBreachEmails: safeFlatMap(preEmails) as unknown as Email[],
      breachEmails: safeFlatMap(breachEmails) as unknown as Email[],
      logEntries: safeFlatMap(this.pickRandom(logs, 1)) as unknown as LogEntry[],
      lolbins: bins.flatMap(i => {
        const arr = Array.isArray(i.data) ? (i.data as Record<string, unknown>[]) : (i.data ? [i.data as Record<string, unknown>] : []);
        return arr;
      }).map((r, idx) => {
        // Direct normalization — skip brand() to avoid field mangling
        const processName = String(r.processName || r.process || r.name || r.executable || r.binary || 'unknown.exe');
        const pid = typeof r.pid === 'number' ? r.pid : (typeof r.PID === 'number' ? r.PID : Math.floor(Math.random() * 60000) + 1000);
        const commandLine = String(r.commandLine || r.command || r.cmd || r.args || processName);
        const description = String(r.description || r.desc || r.details || r.info || r.text || r.message || '');
        const mal = r.isMalicious ?? r.malicious ?? r.suspicious ?? false;
        return {
          id: String(r.id || `lolbin-${crypto.randomUUID().slice(0, 8)}`),
          processName,
          pid: typeof pid === 'number' ? pid : parseInt(String(pid), 10) || (Math.floor(Math.random() * 60000) + 1000),
          commandLine,
          description,
          isMalicious: mal === true || String(mal) === 'true',
          mitreId: String(r.mitreId || r.mitre || r.mitreAttackId || r.technique || '') || undefined,
          complexity: r.complexity as number | undefined,
        } as unknown as LOLBin;
      }),
      wifi: wifi.map(w => {
        const d = w.data as Record<string, unknown>;
        const branded = brand(d, w.qualityScore);
        // Force WiFi normalization regardless of what brand() detected
        const ssidRaw = String(branded.ssid || branded.name || branded.networkName || branded.value || '');
        const ssid = ssidRaw || `${options.teamName}-Secure`;
        const bssid = String(branded.bssid || branded.macAddress || branded.mac || `${Math.floor(Math.random()*256).toString(16).padStart(2,'0').toUpperCase()}:${Math.floor(Math.random()*256).toString(16).padStart(2,'0').toUpperCase()}:${Math.floor(Math.random()*256).toString(16).padStart(2,'0').toUpperCase()}:${Math.floor(Math.random()*256).toString(16).padStart(2,'0').toUpperCase()}:${Math.floor(Math.random()*256).toString(16).padStart(2,'0').toUpperCase()}:${Math.floor(Math.random()*256).toString(16).padStart(2,'0').toUpperCase()}`);
        const sig = Number(branded.signalStrength ?? branded.signal ?? branded.strength ?? branded.rssi ?? -(Math.floor(Math.random() * 50) + 35));
        const authType = String(branded.authType || branded.auth || branded.security || branded.encryption || '');
        const typeStr = String(branded.type || branded.category || branded.classification || '').toLowerCase();
        const evil = branded.isEvilTwin === true || String(branded.isEvilTwin) === 'true'
          || branded.evil === true || branded.isEvil === true || branded.isMalicious === true
          || /evil|suspicious|rogue|fake|malicious/i.test(typeStr);
        const indicators = Array.isArray(branded.indicators) ? branded.indicators as string[]
          : Array.isArray(branded.hints) ? branded.hints as string[] : [];
        return {
          id: String(branded.id || `wifi-${Math.random().toString(36).slice(2, 8)}`),
          ssid: evil ? (ssid.toLowerCase().includes(options.teamName.toLowerCase()) ? ssid : `${options.teamName}-${ssid}`) : ssid,
          bssid,
          signalStrength: sig,
          authType: authType || (evil ? 'WPA2-PSK' : 'WPA2-Enterprise (802.1X)'),
          isEvilTwin: evil,
          indicators,
        } as unknown as WiFiNetwork;
      }),
      isOfflineContent: poolItems.length === 0
    };

    console.log(`[ContentPool] Fetched content for ${options.playerHandle}: ${result.preBreachEmails.length} pre, ${result.breachEmails.length} breach emails`);
    return result;
  }

  private pickRandom<T>(arr: T[], count: number): T[] {
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
      const entries: { type: ContentPoolType; data: unknown }[] = [];
      if (batch.preBreachEmails.length > 0) entries.push({ type: 'EMAIL_PRE', data: batch.preBreachEmails });
      if (batch.breachEmails.length > 0) entries.push({ type: 'EMAIL_BREACH', data: batch.breachEmails });
      if (batch.logEntries.length > 0) entries.push({ type: 'LOG_BATCH', data: batch.logEntries });
      if (batch.lolbins.length > 0) entries.push({ type: 'LOLBIN_BATCH', data: batch.lolbins });
      if (batch.wifi.length > 0) entries.push({ type: 'WIFI_BATCH', data: batch.wifi });
      for (const entry of entries) {
        const item = await prisma.contentPool.create({ data: { type: entry.type, data: entry.data as any, audited: false } });
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
