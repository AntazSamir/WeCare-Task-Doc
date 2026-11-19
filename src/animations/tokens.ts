/**
 * Centralized Animation Design Tokens
 * 
 * Provides unified durations, easing curves, opacity, scale,
 * slide distances, and stagger presets across CSS and Motion components.
 */

// ─── 1. Durations (100ms – 700ms) ───────────────────────────────────────────
export const animationDurations = {
  instant: 0.1,    // 100ms - micro-interactions, toggles, icon switches
  fast: 0.15,      // 150ms - dropdowns, buttons, tooltips, hover highlights
  normal: 0.2,     // 200ms - tab switches, card entries, list item adds
  moderate: 0.25,  // 250ms - modal reveals, page transitions, alert popups
  slow: 0.35,      // 350ms - drawer slide-outs, accordion height collapses
  slower: 0.5,     // 500ms - major panel expansions, celebratory cards
  deliberate: 0.7, // 700ms - complex multi-stage progress, full-screen loaders
} as const;

export const animationDurationsMs = {
  instant: 100,
  fast: 150,
  normal: 200,
  moderate: 250,
  slow: 350,
  slower: 500,
  deliberate: 700,
} as const;

// ─── 2. Easing Curves ───────────────────────────────────────────────────────
export const animationEasings = {
  // Natural fluid deceleration for crisp, zero-pill, zero-slop UI
  standard: [0.16, 1, 0.3, 1] as const,
  // Smooth symmetrical transition for state toggles and collapses
  inOut: [0.4, 0, 0.2, 1] as const,
  // Fast start, soft stop for entering elements
  out: [0, 0, 0.2, 1] as const,
  // Accelerating exit for disappearing elements
  in: [0.4, 0, 1, 1] as const,
  // Subtle energetic spring for floating notifications / toasts
  bounce: [0.34, 1.56, 0.64, 1] as const,
  // Native motion spring presets
  spring: { type: 'spring', stiffness: 350, damping: 28 } as const,
  springGentle: { type: 'spring', stiffness: 260, damping: 26 } as const,
  springSnappy: { type: 'spring', stiffness: 450, damping: 30 } as const,
};

export const animationEasingsCss = {
  standard: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ─── 3. Opacity Tokens ──────────────────────────────────────────────────────
export const animationOpacities = {
  hidden: 0,
  subtle: 0.4,
  translucent: 0.7,
  visible: 1,
} as const;

// ─── 4. Scale Tokens ────────────────────────────────────────────────────────
export const animationScales = {
  modalInitial: 0.98,
  dropdownInitial: 0.96,
  popInitial: 0.92,
  full: 1,
  pressed: 0.98,
  hover: 1.01,
} as const;

// ─── 5. Slide Distance Tokens (px / string) ─────────────────────────────────
export const animationDistances = {
  none: 0,
  micro: 4,     // 4px - micro tab nudges, tooltip offset
  sm: 8,        // 8px - standard card nudges, dropdown offset
  md: 12,       // 12px - toast float, list item entry
  lg: 20,       // 20px - page slide entry
  xl: 32,       // 32px - modal offset
  full: '100%', // drawer slide-in
} as const;

// ─── 6. Stagger & Delay Tokens (seconds) ────────────────────────────────────
export const animationStaggers = {
  fast: 0.03,    // 30ms between items
  normal: 0.05,  // 50ms between items
  slow: 0.08,    // 80ms between items
} as const;

export const animationDelays = {
  none: 0,
  fast: 0.05,
  normal: 0.1,
  moderate: 0.2,
  slow: 0.35,
} as const;

// ─── 7. Standard Motion Transition Presets ──────────────────────────────────
export const animationTransitions = {
  page: {
    duration: animationDurations.moderate,
    ease: animationEasings.standard,
  },
  tab: {
    duration: animationDurations.fast,
    ease: animationEasings.standard,
  },
  fade: {
    duration: animationDurations.normal,
    ease: animationEasings.out,
  },
  modal: {
    duration: animationDurations.normal,
    ease: animationEasings.standard,
  },
  drawer: {
    duration: animationDurations.slow,
    ease: animationEasings.standard,
  },
  dropdown: {
    duration: animationDurations.fast,
    ease: animationEasings.standard,
  },
  toast: {
    duration: animationDurations.normal,
    ease: animationEasings.standard,
  },
  collapse: {
    duration: animationDurations.normal,
    ease: animationEasings.inOut,
  },
  reduced: {
    duration: 0.001,
  },
} as const;

// Combined export object
export const animationTokens = {
  duration: animationDurations,
  durationMs: animationDurationsMs,
  ease: animationEasings,
  easeCss: animationEasingsCss,
  opacity: animationOpacities,
  scale: animationScales,
  distance: animationDistances,
  stagger: animationStaggers,
  delay: animationDelays,
  transitions: animationTransitions,
} as const;

export default animationTokens;
