import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentGenerator } from './contentGenerator';
import type { ZhipuAIClient } from '@/lib/zhipuAI';
import type { Email, LogEntry, DMMessage, LOLBin, WiFiNetwork } from '@/content/types';

describe('ContentGenerator', () => {
  let generator: ContentGenerator;
  let mockZhipuClient: any;

  beforeEach(() => {
    mockZhipuClient = {
      generateContent: vi.fn(),
      generateBatch: vi.fn(),
    };
    generator = new ContentGenerator(mockZhipuClient);
  });

  describe('Email Generation', () => {
    it('generates valid SPF/DKIM/DMARC headers', async () => {
      mockZhipuClient.generateContent.mockResolvedValue(JSON.stringify([
        {
          id: '1',
          from: 'test@test.com',
          to: 'user@test.com',
          subject: 'Test',
          date: '2026-03-10 10:00',
          body: 'Test',
          headers: { spf: 'pass', dkim: 'pass', dmarc: 'pass', returnPath: 'test@test.com' },
          isPhishing: false,
          indicators: [],
          difficulty: 'easy'
        }
      ]));

      const emails = await generator['generatePreBreachEmails'](5, 'en', 0.9);

      expect(emails).toHaveLength(1);
      emails.forEach(email => {
        expect(['pass', 'fail', 'none']).toContain(email.headers.spf);
        expect(['pass', 'fail']).toContain(email.headers.dkim);
      });
    });

    it('generates phishing emails with indicators', async () => {
      mockZhipuClient.generateContent.mockResolvedValue(JSON.stringify([
        {
          id: '1',
          from: 'test@test.com',
          to: 'user@test.com',
          subject: 'Test',
          date: '2026-03-10 10:00',
          body: 'Test urgent',
          headers: {
            spf: 'fail',
            dkim: 'pass',
            dmarc: 'fail',
            returnPath: 'test@test.com'
          },
          difficulty: 'medium'
        }
      ]));

      const emails = await generator['generateBreachEmails'](10, 'en', 0.9);

      expect(emails).toHaveLength(1);
      emails.forEach(email => {
        expect(email.isPhishing).toBe(true);
        expect(email.indicators.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Log Entry Generation', () => {
    it('generates real MITRE ATT&CK IDs', async () => {
      mockZhipuClient.generateContent.mockResolvedValue(JSON.stringify([
        {
          id: '1',
          timestamp: '2026-03-10 10:00',
          level: 'WARN',
          source: 'sshd',
          message: 'Test',
          isMalicious: true,
          attackTechnique: 'SSH',
          mitreId: 'T1110.001'
        }
      ]));

      const logs = await generator['generateLogEntries'](10, 'en', 0.9);

      expect(logs).toHaveLength(1);
      logs.forEach(log => {
        expect(log.mitreId).toMatch(/^T\d+\.\d+$/);
      });
    });

    it('includes at least one malicious entry', async () => {
      mockZhipuClient.generateContent.mockResolvedValue(JSON.stringify([
        {
          id: '1',
          timestamp: '2026-03-10 10:00',
          level: 'INFO',
          source: 'cron',
          message: 'Test',
          isMalicious: false
        },
        {
          id: '2',
          timestamp: '2026-03-10 10:05',
          level: 'WARN',
          source: 'sshd',
          message: 'Test',
          isMalicious: true,
          attackTechnique: 'SSH',
          mitreId: 'T1110.001'
        }
      ]));

      const logs = await generator['generateLogEntries'](10, 'en', 0.9);

      const malicious = logs.filter(l => l.isMalicious);
      expect(malicious.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Content Uniqueness', () => {
    it('generates different content across sessions', async () => {
      mockZhipuClient.generateContent.mockResolvedValue(
        JSON.stringify([{ id: '1', from: 'a@test.com', to: 'b@test.com', subject: 'Test', date: '2026-03-10 10:00', body: 'Test', headers: { returnPath: 'a@test.com', spf: 'pass', dkim: 'pass', dmarc: 'pass' }, isPhishing: false, indicators: [], difficulty: 'easy' }])
      );

      const session1 = await generator.generateAll({ locale: 'en', sessionId: 's1' });
      mockZhipuClient.generateContent.mockResolvedValue(
        JSON.stringify([{ id: '2', from: 'c@test.com', to: 'd@test.com', subject: 'Test2', date: '2026-03-10 11:00', body: 'Test2', headers: { returnPath: 'c@test.com', spf: 'pass', dkim: 'pass', dmarc: 'pass' }, isPhishing: false, indicators: [], difficulty: 'easy' }])
      );
      const session2 = await generator.generateAll({ locale: 'en', sessionId: 's2' });

      expect(session1.breachEmails).not.toEqual(session2.breachEmails);
      expect(session1.logEntries).not.toEqual(session2.logEntries);
    });
  });

  describe('generateAll', () => {
    it('generates all content types in parallel', async () => {
      mockZhipuClient.generateContent
        .mockResolvedValueOnce(JSON.stringify([{ id: '1', from: 'a@test.com', to: 'b@test.com', subject: 'Test', date: '2026-03-10 10:00', body: 'Test', headers: { returnPath: 'a@test.com', spf: 'pass', dkim: 'pass', dmarc: 'pass' }, isPhishing: false, indicators: [], difficulty: 'easy' }]))
        .mockResolvedValueOnce(JSON.stringify([{ id: '2', from: 'x@test.com', to: 'y@test.com', subject: 'Phish', date: '2026-03-10 10:00', body: 'Urgent', headers: { returnPath: 'x@test.com', spf: 'fail', dkim: 'pass', dmarc: 'fail' }, difficulty: 'medium' }]))
        .mockResolvedValueOnce(JSON.stringify([{ id: '3', timestamp: '2026-03-10 10:00', level: 'INFO', source: 'cron', message: 'Test', isMalicious: false }]))
        .mockResolvedValueOnce(JSON.stringify([{ id: '4', sender: 'test', senderRole: 'IT', avatar: 'T', text: 'Test', timestamp: 123, choices: [] }]))
        .mockResolvedValueOnce(JSON.stringify([{ id: '5', sender: 'test2', senderRole: 'Admin', avatar: 'A', text: 'Bad advice', timestamp: 124, choices: [], isBadAdvice: true }]))
        .mockResolvedValueOnce(JSON.stringify([{ id: '6', processName: 'powershell', pid: 123, commandLine: 'test', isMalicious: false, description: 'Test' }]))
        .mockResolvedValueOnce(JSON.stringify([{ ssid: 'Test', bssid: 'AA:BB:CC:DD:EE:FF', signalStrength: -60, authType: 'WPA2-PSK', isEvilTwin: false, indicators: [] }]));

      const result = await generator.generateAll({ locale: 'en', sessionId: 's1' });

      expect(result.preBreachEmails).toHaveLength(1);
      expect(result.breachEmails).toHaveLength(1);
      expect(result.logEntries).toHaveLength(1);
      expect(result.socialEngineeringDMs).toHaveLength(1);
      expect(result.npcBadAdvice).toHaveLength(1);
      expect(result.lolbins).toHaveLength(1);
      expect(result.wifi).toHaveLength(1);
      expect(result.sessionId).toBe('s1');
      expect(result.isOfflineContent).toBe(false);
    });
  });
});
