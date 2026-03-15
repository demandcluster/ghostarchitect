# OS Interface Polish Design

## Overview

Enhance the Ghost Architect interface with improved interactions, smoother transitions, and a rewarding trophy system. This design focuses on incremental polish that builds on existing patterns while delivering premium-feeling moments.

## Scope

Three main areas of improvement:
1. **Taskbar Polish** - Better hover/active states and transitions
2. **Phase Transitions** - Enhanced breach transition and step-to-step fades
3. **Trophy Rank System** - Animated reward reveal with confetti effects

## 1. Taskbar Polish

### Current State
- Taskbar displays app icons with basic hover states
- Active app highlighted with background color
- No visible transition animations between states

### Enhancements

#### Hover Effect
- Scale active/app icon to 1.1x on hover
- Add subtle glow effect using rgba of current accent color
- Apply to all taskbar buttons

#### Active State
- Fill background with accent color when active
- Add stronger border using theme's border-strong variable
- Maintain 1.1x scale for active apps
- Apply glow effect to active state

#### Transitions
- Use Framer Motion `motion.div` wrapper for all taskbar buttons
- Spring-based physics: `stiff: 300, damping: 25`
- Smooth transitions for all state changes (hover, active, inactive)

#### Accessibility
- Add focus ring using `var(--accent-ring)` (add to globals.css before implementation)
- Ensure all buttons are tab-navigable
- Maintain visible focus state throughout interaction

### Technical Implementation

Add to `globals.css` before implementation:
```css
--accent-ring: rgba(59,110,248,0.35);
```

Update `Taskbar.tsx`:
```tsx
import { motion } from "framer-motion";

// Wrap each taskbar button:
<motion.button
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 300, damping: 25 }}
  className={`... ${activeApp === app.id ? "bg-accent ring-1 ring-accent-ring" : ""}`}
>
  {/* icon and label */}
</motion.button>
```

## 2. Phase Transitions

### Current State
- GSAP-powered breach transition with glitch bands and terminal POST screen
- No animations between other game steps
- Direct content switches without fade effects

### Enhancements

#### Breach Transition
1. **Sharper Glitch Bands**
   - Randomize glitch band positions more aggressively
   - Add RGB shift effect to glitched text
   - Increase glitch intensity during breach moment

2. **Terminal Typing Speed**
   - Speed up POST request typing animation
   - Add cursor blink effect during typing
   - Make terminal feel more urgent

3. **Scanline Fade-in**
   - Animate scanline opacity from 0.3 → 0 over 2 seconds
   - Smooth reveal of breach mode
   - Maintain glitch effects during fade

4. **Screen Shake**
   - Add subtle shake effect during glitch bands (0.5s duration)
   - Simulate system instability during breach
   - Use CSS transform translate with random offsets

#### Step-to-Step Transitions
Add smooth fade/slide transitions between all game steps:

```tsx
// New hook: useStepTransition
import { useGameStore } from "@/stores/gameStore";

function useStepTransition() {
  const setPhase = useGameStore((s) => s.setPhase);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const changeStep = useCallback(async (newStep: GameStep) => {
    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // fade out
    setPhase(newStep);
    await new Promise(resolve => setTimeout(resolve, 300)); // fade in
    setIsTransitioning(false);
  }, [setPhase]);

  return { isTransitioning, changeStep };
}
```

Apply transitions to:
- Window content updates
- Taskbar app switching
- HUD score changes

### Technical Implementation

Enhance `TransitionOverlay.tsx`:
- Add more aggressive glitch randomization
- Implement RGB shift using CSS text-shadow offsets
- Add screen shake with CSS animation

Create new `useStepTransition.ts` hook:
- Wrap step changes with fade-out/fade-in
- Use Framer Motion `AnimatePresence` for smooth transitions
- Apply to all step transitions in `page.tsx`

## 3. Trophy Rank System

### Current State
- No reward system at end of game
- Debrief shows final score but no celebration

### Design

#### Rank Thresholds (500-point max)
- **Bronze**: 0-249 points
- **Silver**: 250-399 points
- **Gold**: 400-449 points
- **Platinum**: 450-500 points

Note: Time bonus (up to +25 total based on response speed under 120s) is displayed separately from category score.

#### Trophy Badge UI
```
┌─────────────────────────────────────┐
│  🏆   RANK ACHIEVED           │
│        PLATINUM                   │
│                                     │
│  Final Score: 487/500 (+15)       │
└─────────────────────────────────────┘
```

- Large trophy emoji (🥉/🥈/🥇/🏆) on left
- Rank name using Tailwind colors for theme consistency:
  - Bronze: `text-amber-700` (#92400e)
  - Silver: `text-slate-400` (#94a3b8)
  - Gold: `text-yellow-400` (#facc15)
  - Platinum: `text-slate-300` (#cbd5e1)
- Final score with time bonus shown separately

#### Animation Sequence

1. **Debrief completes** → Trophy modal slides up from bottom (0.5s, spring easing)
2. **Badge reveals** → Trophy emoji bounces in (scale 0 → 1 with elastic easing)
3. **Confetti bursts** → 100-150 particles explode from center, fall with gravity
4. **Rank appears** → Text fades in with slide-up animation (0.3s delay)
5. **Score counts up** → Number animates from 0 to final (1.2s, easeOut)
6. **Time bonus adds** → (+15) fades in after score animation completes

### Technical Implementation

Create `TrophyBadge.tsx` component:

```tsx
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface TrophyBadgeProps {
  totalScore: number;
  timeBonus: number;
}

export function TrophyBadge({ totalScore, timeBonus }: TrophyBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const rank = calculateRank(totalScore);

  const handleBadgeReveal = () => {
    // Fire confetti when trophy emoji completes bounce animation
    // Skip for users who prefer reduced motion
    if (!prefersReducedMotion) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: rank.colors
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {/* Trophy emoji with confetti on reveal */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          onAnimationComplete={handleBadgeReveal}
        >
          {rank.emoji}
        </motion.div>

        {/* Rank and score with animated count-up */}
        <div className={`font-bold text-2xl ${rank.className}`}>
          {rank.name}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function calculateRank(score: number): {
  name: string;
  emoji: string;
  className: string;
  colors: string[];
} {
  if (score >= 450) {
    return { name: "PLATINUM", emoji: "🏆", className: "text-slate-300", colors: ["#cbd5e1", "#e2e8f0", "#ffffff"] };
  }
  if (score >= 400) {
    return { name: "GOLD", emoji: "🥇", className: "text-yellow-400", colors: ["#facc15", "#fde047", "#ffffff"] };
  }
  if (score >= 250) {
    return { name: "SILVER", emoji: "🥈", className: "text-slate-400", colors: ["#94a3b8", "#cbd5e1", "#ffffff"] };
  }
  return { name: "BRONZE", emoji: "🥉", className: "text-amber-700", colors: ["#b45309", "#d97706", "#ffffff"] };
}
```

Dependencies:
- `canvas-confetti` (~3kb) for particle effects
- Framer Motion for reveal animations
- Access to `scoreStore` for total score and time bonus

Accessibility considerations:
- Skip confetti and reduce animations when `prefers-reduced-motion` is true
- Use `useReducedMotion()` hook from Framer Motion to detect preference
- Provide fallback for no-animation mode throughout trophy reveal

Integration point:
- Add TrophyBadge modal to DebriefPage component
- Trigger on completion of debrief/ending calculation
- Show over debrief content with backdrop blur

## Implementation Priority

1. **Taskbar Polish** (Quick wins, builds on existing patterns)
   - Update Taskbar.tsx with Framer Motion
   - Add hover/active state animations
   - Add focus rings for accessibility

2. **Step Transitions** (Minimal new code, high impact)
   - Create useStepTransition hook
   - Apply AnimatePresence to step changes
   - Test across all game phases

3. **Trophy Badge** (New component, memorable moment)
   - Create TrophyBadge.tsx component
   - Install canvas-confetti dependency
   - Integrate with DebriefPage

4. **Breach Transition** (Enhancement of existing code)
   - Improve glitch randomization
   - Add RGB shift and screen shake
   - Tune timing for dramatic effect

## Success Criteria

- Taskbar icons have smooth hover/active transitions with spring physics
- All step changes include fade-out/fade-in transitions
- Breach transition feels more dramatic with enhanced glitch effects
- Trophy badge reveals with confetti burst and animated score count-up
- Keyboard navigation works throughout with visible focus states
- All animations feel smooth and performant (60fps)

## Trade-offs

### Incremental vs. Comprehensive

This design uses incremental polish (Approach A) rather than comprehensive overhaul:

**Pros:**
- Faster implementation (~3-5 days vs. 1-2 weeks)
- Lower risk, builds on existing patterns
- Maintains clean, focused aesthetic
- Easy to extend in v2 if desired

**Cons:**
- Less ambitious than full OS simulation
- Some animations remain basic
- No desktop environment features (icons, wallpaper, etc.)

**Decision:** Incremental polish is appropriate for this stage of development. Premium feel can be achieved through high-quality execution of focused improvements rather than adding more features.

## Future Enhancements

Potential v2 improvements:
- Draggable/resizable windows
- Notification center with toast messages
- Desktop icons and wallpaper customization
- System apps (calculator, notepad, settings panel)
- Shareable trophy image generation
- Leaderboard rank badges
- Achievement system for specific accomplishments
