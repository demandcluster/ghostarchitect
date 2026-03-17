# API Key DM Security Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a security flaw in the social engineering DM script by rewriting a choice that incorrectly teaches players that "walking to someone's desk" is an acceptable way to bypass MFA controls.

**Architecture:** Single-line text change in the DM script content file. No scoring, flags, or message flow changes required.

**Tech Stack:** TypeScript, existing DM message schema

---

## File Structure

**Modified:** `src/content/dmScripts.ts`

This file contains all DM message content for the social engineering onboarding phase. The change is isolated to choice `se-2-c` (lines 87-97).

---

### Task 1: Update the API key DM choice label

**Files:**
- Modify: `src/content/dmScripts.ts:87-97`

- [ ] **Step 1: Locate choice `se-2-c`**

Find the choice with `id: "se-2-c"` on lines 87-97. Current label is:
```
"That sounds unusual. I'll walk to your desk to confirm in person."
```

- [ ] **Step 2: Replace label text**

Change the `label` property from:
```typescript
label: "That sounds unusual. I'll walk to your desk to confirm in person.",
```

To:
```typescript
label: "You'll need to retrieve your own MFA token or use vault delegation. I cannot help access credentials.",
```

- [ ] **Step 3: Verify no other changes needed**

Confirm the following properties remain unchanged:
- `isCorrect: true` (still correct answer)
- `trustDelta: 10` (still +10 trust)
- `scoreEffect` with 5 phishingIQ points
- `nextMessageId: "se-3-pass"` (still routes to success message)

- [ ] **Step 4: Verify text displays correctly**

Run dev server: `npm run dev`
Navigate to the social engineering DM phase and select the third choice.
Expected: New label text displays properly in the choice button.

- [ ] **Step 5: Verify scoring works**

Select the updated choice in the game.
Expected:
- +10 trust awarded (visible in HUD)
- 5 phishingIQ points awarded
- Routes to `se-3-pass` success message

- [ ] **Step 6: Run existing tests**

Run: `npm test`
Expected: All tests pass. The existing `socialEngineeringDM.test.ts` tests behavior (scoring, flags), not specific label text.

- [ ] **Step 7: Commit**

```bash
git add src/content/dmScripts.ts
git commit -m "fix: correct security teaching in API key DM - refuse credential requests properly"
```

---

## Completion Criteria

- [ ] Choice `se-2-c` displays the new security-correct label
- [ ] Selecting the choice awards +10 trust and 5 phishingIQ points
- [ ] Routes to `se-3-pass` success message as before
- [ ] All existing tests pass
- [ ] Change is committed and pushed
