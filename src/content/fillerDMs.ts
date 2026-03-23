import type { DMMessage } from "./types";
import { OFFICE_CHATTER_DMS } from "./dmScripts";

/**
 * Intersperse filler (non-scoring) office chatter DMs between real DMs.
 * Filler messages are inserted before DMs at roughly every 3rd position,
 * using a stable shuffle seeded by the real message IDs.
 *
 * The returned array preserves the original message order and chain
 * (nextMessageId) — filler DMs have no nextMessageId and no choices.
 */
export function intersperseFiller(
  realDMs: DMMessage[],
  fillerPool: DMMessage[] = OFFICE_CHATTER_DMS
): DMMessage[] {
  if (fillerPool.length === 0) return realDMs;

  const result: DMMessage[] = [];
  let fillerIdx = 0;

  for (let i = 0; i < realDMs.length; i++) {
    // Insert a filler DM before every 3rd real message (starting at index 2)
    if (i > 0 && i % 3 === 0 && fillerIdx < fillerPool.length) {
      result.push(fillerPool[fillerIdx]);
      fillerIdx++;
    }
    result.push(realDMs[i]);
  }

  return result;
}

/**
 * Given a list of currently revealed real DM IDs and a merged message array,
 * returns the full set of IDs that should be revealed (including any filler
 * DMs that appear before already-revealed real DMs).
 */
export function revealedWithFiller(
  revealedRealIds: string[],
  mergedMessages: DMMessage[]
): string[] {
  if (revealedRealIds.length === 0) return [];

  const revealedSet = new Set(revealedRealIds);
  const result: string[] = [];

  for (const msg of mergedMessages) {
    if (revealedSet.has(msg.id)) {
      result.push(msg.id);
    } else if (msg.id.startsWith("chatter-") || msg.id.startsWith("ai-chatter-")) {
      // Reveal filler if the next real DM after it is revealed
      const msgIndex = mergedMessages.indexOf(msg);
      const nextReal = mergedMessages.slice(msgIndex + 1).find(
        (m) => !m.id.startsWith("chatter-") && !m.id.startsWith("ai-chatter-")
      );
      if (nextReal && revealedSet.has(nextReal.id)) {
        result.push(msg.id);
      }
    }
  }

  return result;
}
