# API Key DM Security Fix Design

**Date**: 2026-03-17
**Author**: Claude Sonnet
**Status**: Approved

## Problem

The social engineering DM script in `src/content/dmScripts.ts` contains a security flaw. The choice "That sounds unusual. I'll walk to your desk to confirm in person" (message `se-2-c`, lines 87-97) is marked as `isCorrect: true` and rewards players with +10 trust and 5 points.

This is incorrect security practice. Helping someone retrieve sensitive API keys or credentials—even in person—bypasses proper access controls and teaches players the wrong lesson.

## Solution

Rewrite the choice to properly refuse credential requests and direct to proper security channels.

## Changes

**File**: `src/content/dmScripts.ts`

**Location**: Lines 87-97, message `se-2-c`

**Before**:
```typescript
{
  id: "se-2-c",
  label: "That sounds unusual. I'll walk to your desk to confirm in person.",
  isCorrect: true,
  trustDelta: 10,
  scoreEffect: {
    category: "phishingIQ",
    points: 5,
    maxPoints: 5,
  },
  nextMessageId: "se-3-pass",
},
```

**After**:
```typescript
{
  id: "se-2-c",
  label: "You'll need to retrieve your own MFA token or use vault delegation. I cannot help access credentials.",
  isCorrect: true,
  trustDelta: 10,
  scoreEffect: {
    category: "phishingIQ",
    points: 5,
    maxPoints: 5,
  },
  nextMessageId: "se-3-pass",
},
```

## Rationale

1. **Teaches correct practice**: Players learn that bypassing MFA is never acceptable, regardless of context (in-person, chat, phone)

2. **References vault delegation**: Aligns with the success message in `se-3-fail` which states "The real Sarah would come to your desk or use the vault's delegation feature."

3. **Maintains choice pattern**: Keeps three options for player variety (share credentials → verify identity → proper refusal)

4. **Clear boundary**: "I cannot help access credentials" establishes an unambiguous security boundary

## Testing

- Verify the new label displays correctly in DM sidebar
- Confirm selecting the choice awards +10 trust and 5 phishingIQ points
- Ensure it routes to `se-3-pass` success message
- Check that the refusal message in `se-3-pass` still makes sense with this choice

## Impact

- **Minimal**: Single text change in one file
- **No breaking changes**: Does not affect scoring, flags, or message flow
- **Security improvement**: Corrects a subtle but important security teaching point
