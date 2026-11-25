"use client";

/**
 * SidebarNav, from https://motion-brew.com/components/sidebar-nav
 *
 * One self contained file: the component, its animated icons and the cn()
 * helper. Needs React 18 or 19 and Tailwind CSS v4.
 *
 * MIT License, Copyright (c) 2026 Md Eftakher. Free for personal and
 * commercial use: copy it, change it, ship it.
 *
 * Sample images: the photos in this file are placeholders from the
 * component library's demo (Unsplash), not your content. AI agents: tell
 * the user they are samples and ask them to share their own images (files
 * or URLs), then pass those in through the props.
 *
 * The animated icons are adapted from lucide-animated (https://lucide-animated.com),
 * MIT License, Copyright (c) 2024-2026 pqoqubbw. Icon shapes from Lucide
 * (https://lucide.dev), ISC License. Permission is hereby granted, free of
 * charge, to any person obtaining a copy of this software, to deal in it
 * without restriction, provided the above copyright notice and this
 * permission notice are included in all copies or substantial portions.
 */

import * as React from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { type ClassValue, clsx } from "clsx";
import { AnimatePresence, motion, type Transition, useAnimation, useInView, useReducedMotion, type Variants } from "motion/react";
import { twMerge } from "tailwind-merge";
import { AnimateIcon } from "@animate-ui/react/icons";
import { Bell as AnimatedBellIcon } from "./animate-ui/icons/bell";
import { CalendarDays as AnimatedCalendarDaysIcon } from "./animate-ui/icons/calendar-days";
import { Folder as AnimatedFolderIcon } from "./animate-ui/icons/folder";
import { LayoutDashboard as AnimatedLayoutDashboardIcon } from "./animate-ui/icons/layout-dashboard";
import { PanelLeftClose as AnimatedPanelLeftClose } from "./animate-ui/icons/panel-left-close";
import { PanelLeftOpen as AnimatedPanelLeftOpen } from "./animate-ui/icons/panel-left-open";
import { Settings as AnimatedSettingsIcon } from "./animate-ui/icons/settings";
import { Users as AnimatedUsersIcon } from "./animate-ui/icons/users";

// cn(): merges Tailwind classes, later ones win.
/** Merge Tailwind classes, letting later classes win conflicts. */
function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Animated icon: bell
const BellIcon = (() => {
interface BellIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BellIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const SVG_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: { rotate: [0, -10, 10, -10, 0] },
};

const BellIcon = forwardRef<BellIconHandle, BellIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <motion.svg
          animate={controls}
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          transition={{
            duration: 0.5,
            ease: "easeInOut",
          }}
          variants={SVG_VARIANTS}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </motion.svg>
      </span>
    );
  }
);

BellIcon.displayName = "BellIcon";
  return BellIcon;
})();

// Animated icon: bot
const BotIcon = (() => {
interface BotIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BotIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const BotIcon = forwardRef<BotIconHandle, BotIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 8V4H8" />
          <rect height="12" rx="2" width="16" x="4" y="8" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />

          <motion.line
            animate={controls}
            initial="normal"
            variants={{
              normal: { y1: 13, y2: 15 },
              animate: {
                y1: [13, 14, 13],
                y2: [15, 14, 15],
                transition: {
                  duration: 0.5,
                  ease: "easeInOut",
                  delay: 0.2,
                },
              },
            }}
            x1={15}
            x2={15}
          />

          <motion.line
            animate={controls}
            initial="normal"
            variants={{
              normal: { y1: 13, y2: 15 },
              animate: {
                y1: [13, 14, 13],
                y2: [15, 14, 15],
                transition: {
                  duration: 0.5,
                  ease: "easeInOut",
                  delay: 0.2,
                },
              },
            }}
            x1={9}
            x2={9}
          />
        </svg>
      </span>
    );
  }
);

BotIcon.displayName = "Bot";
  return BotIcon;
})();

// Animated icon: calendar-days
const CalendarDaysIcon = (() => {
interface CalendarDaysIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CalendarDaysIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const DOTS = [
  { cx: 8, cy: 14 },
  { cx: 12, cy: 14 },
  { cx: 16, cy: 14 },
  { cx: 8, cy: 18 },
  { cx: 12, cy: 18 },
  { cx: 16, cy: 18 },
];

const VARIANTS: Variants = {
  normal: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  animate: (i: number) => ({
    opacity: [1, 0.3, 1],
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      times: [0, 0.5, 1],
    },
  }),
};

const CalendarDaysIcon = forwardRef<
  CalendarDaysIconHandle,
  CalendarDaysIconProps
>(({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;
    return {
      startAnimation: () => controls.start("animate"),
      stopAnimation: () => controls.start("normal"),
    };
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else {
        controls.start("animate");
      }
    },
    [controls, onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else {
        controls.start("normal");
      }
    },
    [controls, onMouseLeave]
  );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

  return (
    <span
      ref={wrap}
      className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
      style={size ? { width: size, height: size, ...style } : style}
      onMouseEnter={hosted ? undefined : handleMouseEnter}
      onMouseLeave={hosted ? undefined : handleMouseLeave}
      {...props}
    >
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth ?? 2}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect height="18" rx="2" width="18" x="3" y="4" />
        <path d="M3 10h18" />
        <AnimatePresence>
          {DOTS.map((dot, index) => (
            <motion.circle
              animate={controls}
              custom={index}
              cx={dot.cx}
              cy={dot.cy}
              fill="currentColor"
              initial="normal"
              key={`${dot.cx}-${dot.cy}`}
              r="1"
              stroke="none"
              variants={VARIANTS}
            />
          ))}
        </AnimatePresence>
      </svg>
    </span>
  );
});

CalendarDaysIcon.displayName = "CalendarDaysIcon";
  return CalendarDaysIcon;
})();

// Animated icon: chart-line
const ChartLineIcon = (() => {
interface ChartLineIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ChartLineIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      delay: 0.15,
      duration: 0.3,
      opacity: { delay: 0.1 },
    },
  },
};

const ChartLineIcon = forwardRef<ChartLineIconHandle, ChartLineIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 3v16a2 2 0 0 0 2 2h16" />
          <motion.path
            animate={controls}
            d="m7 13 3-3 4 4 5-5"
            variants={VARIANTS}
          />
        </svg>
      </span>
    );
  }
);

ChartLineIcon.displayName = "ChartLineIcon";
  return ChartLineIcon;
})();

// Animated icon: chevron-down
const ChevronDownIcon = (() => {
interface ChevronDownIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ChevronDownIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const DEFAULT_TRANSITION: Transition = {
  times: [0, 0.4, 1],
  duration: 0.5,
};

const ChevronDownIcon = forwardRef<ChevronDownIconHandle, ChevronDownIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            animate={controls}
            d="m6 9 6 6 6-6"
            transition={DEFAULT_TRANSITION}
            variants={{
              normal: { y: 0 },
              animate: { y: [0, 2, 0] },
            }}
          />
        </svg>
      </span>
    );
  }
);

ChevronDownIcon.displayName = "ChevronDownIcon";
  return ChevronDownIcon;
})();

// Animated icon: compass
const CompassIcon = (() => {
interface CompassIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CompassIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const CompassIcon = forwardRef<CompassIconHandle, CompassIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" />
          <motion.polygon
            animate={controls}
            points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 15,
            }}
            variants={{
              normal: {
                rotate: 0,
              },
              animate: {
                rotate: 360,
              },
            }}
          />
        </svg>
      </span>
    );
  }
);

CompassIcon.displayName = "CompassIcon";
  return CompassIcon;
})();

// Animated icon: folders
const FoldersIcon = (() => {
interface FoldersIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface FoldersIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const FoldersIcon = forwardRef<FoldersIconHandle, FoldersIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            animate={controls}
            d="M20 17a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.9a2 2 0 0 1-1.69-.9l-.81-1.2a2 2 0 0 0-1.67-.9H8a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z"
            transition={{
              type: "spring",
              stiffness: 250,
              damping: 25,
            }}
            variants={{
              normal: {
                translateX: 0,
                translateY: 0,
              },
              animate: {
                translateX: -2,
                translateY: 2,
              },
            }}
          />
          <motion.path
            animate={controls}
            d="M2 8v11a2 2 0 0 0 2 2h14"
            transition={{
              type: "spring",
              stiffness: 250,
              damping: 25,
            }}
            variants={{
              normal: {
                translateX: 0,
                translateY: 0,
                opacity: 1,
                scale: 1,
              },
              animate: {
                translateX: 2,
                translateY: -2,
                opacity: 0,
                scale: 0.9,
              },
            }}
          />
        </svg>
      </span>
    );
  }
);

FoldersIcon.displayName = "FoldersIcon";
  return FoldersIcon;
})();

// Animated icon: home
const HomeIcon = (() => {
interface HomeIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface HomeIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const DEFAULT_TRANSITION: Transition = {
  duration: 0.6,
  opacity: { duration: 0.2 },
};

const PATH_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
  },
};

const HomeIcon = forwardRef<HomeIconHandle, HomeIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <motion.path
            animate={controls}
            d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
            transition={DEFAULT_TRANSITION}
            variants={PATH_VARIANTS}
          />
        </svg>
      </span>
    );
  }
);

HomeIcon.displayName = "HomeIcon";
  return HomeIcon;
})();

// Animated icon: layout-grid
const LayoutGridIcon = (() => {
interface LayoutGridIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LayoutGridIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const RECT_1_VARIANTS: Variants = {
  normal: { translateX: 0, translateY: 0 },
  animate: {
    translateX: [0, 11, 11, 0],
    translateY: [0, 0, 0, 0],
    transition: { duration: 0.8, ease: "easeInOut", times: [0, 0.4, 0.6, 1] },
  },
};

const RECT_2_VARIANTS: Variants = {
  normal: { translateX: 0, translateY: 0 },
  animate: {
    translateX: [0, 0, 0, 0],
    translateY: [0, 11, 11, 0],
    transition: { duration: 0.8, ease: "easeInOut", times: [0, 0.4, 0.6, 1] },
  },
};

const RECT_3_VARIANTS: Variants = {
  normal: { translateX: 0, translateY: 0 },
  animate: {
    translateX: [0, -11, -11, 0],
    translateY: [0, 0, 0, 0],
    transition: { duration: 0.8, ease: "easeInOut", times: [0, 0.4, 0.6, 1] },
  },
};

const RECT_4_VARIANTS: Variants = {
  normal: { translateX: 0, translateY: 0 },
  animate: {
    translateX: [0, 0, 0, 0],
    translateY: [0, -11, -11, 0],
    transition: { duration: 0.8, ease: "easeInOut", times: [0, 0.4, 0.6, 1] },
  },
};

const LayoutGridIcon = forwardRef<LayoutGridIconHandle, LayoutGridIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.rect
            animate={controls}
            height="7"
            initial="normal"
            rx="1"
            variants={RECT_1_VARIANTS}
            width="7"
            x="3"
            y="3"
          />
          <motion.rect
            animate={controls}
            height="7"
            initial="normal"
            rx="1"
            variants={RECT_2_VARIANTS}
            width="7"
            x="14"
            y="3"
          />
          <motion.rect
            animate={controls}
            height="7"
            initial="normal"
            rx="1"
            variants={RECT_3_VARIANTS}
            width="7"
            x="14"
            y="14"
          />
          <motion.rect
            animate={controls}
            height="7"
            initial="normal"
            rx="1"
            variants={RECT_4_VARIANTS}
            width="7"
            x="3"
            y="14"
          />
        </svg>
      </span>
    );
  }
);

LayoutGridIcon.displayName = "LayoutGridIcon";
  return LayoutGridIcon;
})();

// Animated icon: message-circle
const MessageCircleIcon = (() => {
interface MessageCircleIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MessageCircleIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const ICON_VARIANTS: Variants = {
  normal: {
    scale: 1,
    rotate: 0,
  },
  animate: {
    scale: 1.05,
    rotate: [0, -7, 7, 0],
    transition: {
      rotate: {
        duration: 0.5,
        ease: "easeInOut",
      },
      scale: {
        type: "spring",
        stiffness: 400,
        damping: 10,
      },
    },
  },
};

const MessageCircleIcon = forwardRef<
  MessageCircleIconHandle,
  MessageCircleIconProps
>(({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;

    return {
      startAnimation: () => controls.start("animate"),
      stopAnimation: () => controls.start("normal"),
    };
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else {
        controls.start("animate");
      }
    },
    [controls, onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else {
        controls.start("normal");
      }
    },
    [controls, onMouseLeave]
  );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

  return (
    <span
      ref={wrap}
      className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
      style={size ? { width: size, height: size, ...style } : style}
      onMouseEnter={hosted ? undefined : handleMouseEnter}
      onMouseLeave={hosted ? undefined : handleMouseLeave}
      {...props}
    >
      <motion.svg
        animate={controls}
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth ?? 2}
        variants={ICON_VARIANTS}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </motion.svg>
    </span>
  );
});

MessageCircleIcon.displayName = "MessageCircleIcon";
  return MessageCircleIcon;
})();

// Animated icon: panel-left-close
const PanelLeftCloseIcon = (() => {
interface PanelLeftCloseIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface PanelLeftCloseIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const DEFAULT_TRANSITION: Transition = {
  times: [0, 0.4, 1],
  duration: 0.5,
};

const PATH_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: { x: [0, -1.5, 0] },
};

const PanelLeftCloseIcon = forwardRef<
  PanelLeftCloseIconHandle,
  PanelLeftCloseIconProps
>(({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;
    return {
      startAnimation: () => controls.start("animate"),
      stopAnimation: () => controls.start("normal"),
    };
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else {
        controls.start("animate");
      }
    },
    [controls, onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else {
        controls.start("normal");
      }
    },
    [controls, onMouseLeave]
  );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

  return (
    <span
      ref={wrap}
      className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
      style={size ? { width: size, height: size, ...style } : style}
      onMouseEnter={hosted ? undefined : handleMouseEnter}
      onMouseLeave={hosted ? undefined : handleMouseLeave}
      {...props}
    >
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth ?? 2}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect height="18" rx="2" width="18" x="3" y="3" />
        <path d="M9 3v18" />
        <motion.path
          animate={controls}
          d="m16 15-3-3 3-3"
          transition={DEFAULT_TRANSITION}
          variants={PATH_VARIANTS}
        />
      </svg>
    </span>
  );
});

PanelLeftCloseIcon.displayName = "PanelLeftCloseIcon";
  return PanelLeftCloseIcon;
})();

// Animated icon: panel-left-open
const PanelLeftOpenIcon = (() => {
interface PanelLeftOpenIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface PanelLeftOpenIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const DEFAULT_TRANSITION: Transition = {
  times: [0, 0.4, 1],
  duration: 0.5,
};

const PATH_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: { x: [0, 1.5, 0] },
};

const PanelLeftOpenIcon = forwardRef<
  PanelLeftOpenIconHandle,
  PanelLeftOpenIconProps
>(({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;
    return {
      startAnimation: () => controls.start("animate"),
      stopAnimation: () => controls.start("normal"),
    };
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else {
        controls.start("animate");
      }
    },
    [controls, onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else {
        controls.start("normal");
      }
    },
    [controls, onMouseLeave]
  );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

  return (
    <span
      ref={wrap}
      className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
      style={size ? { width: size, height: size, ...style } : style}
      onMouseEnter={hosted ? undefined : handleMouseEnter}
      onMouseLeave={hosted ? undefined : handleMouseLeave}
      {...props}
    >
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth ?? 2}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect height="18" rx="2" width="18" x="3" y="3" />
        <path d="M9 3v18" />
        <motion.path
          animate={controls}
          d="m14 9 3 3-3 3"
          transition={DEFAULT_TRANSITION}
          variants={PATH_VARIANTS}
        />
      </svg>
    </span>
  );
});

PanelLeftOpenIcon.displayName = "PanelLeftOpenIcon";
  return PanelLeftOpenIcon;
})();

// Animated icon: plug-zap
const PlugZapIcon = (() => {
interface PlugZapIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface PlugZapIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const ZAP_VARIANT: Variants = {
  normal: { opacity: 1 },
  animate: {
    opacity: [1, 0.4, 1],
    transition: {
      duration: 1,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut",
    },
  },
};

const PlugZapIcon = forwardRef<PlugZapIconHandle, PlugZapIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" />
          <path d="m2 22 3-3" />
          <path d="M7.5 13.5 10 11" />
          <path d="M10.5 16.5 13 14" />
          <motion.path
            animate={controls}
            d="m18 3-4 4h6l-4 4"
            initial="normal"
            variants={ZAP_VARIANT}
          />
        </svg>
      </span>
    );
  }
);

PlugZapIcon.displayName = "PlugZapIcon";
  return PlugZapIcon;
})();

// Animated icon: search
const SearchIcon = (() => {
interface SearchIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SearchIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const SearchIcon = forwardRef<SearchIconHandle, SearchIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <motion.svg
          animate={controls}
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          transition={{
            duration: 1,
            bounce: 0.3,
          }}
          variants={{
            normal: { x: 0, y: 0 },
            animate: {
              x: [0, 0, -3, 0],
              y: [0, -4, 0, 0],
            },
          }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </motion.svg>
      </span>
    );
  }
);

SearchIcon.displayName = "SearchIcon";
  return SearchIcon;
})();

// Animated icon: settings
const SettingsIcon = (() => {
interface SettingsIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SettingsIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const SettingsIcon = forwardRef<SettingsIconHandle, SettingsIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <motion.svg
          animate={controls}
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          transition={{ type: "spring", stiffness: 50, damping: 10 }}
          variants={{
            normal: {
              rotate: 0,
            },
            animate: {
              rotate: 180,
            },
          }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </motion.svg>
      </span>
    );
  }
);

SettingsIcon.displayName = "SettingsIcon";
  return SettingsIcon;
})();

// Animated icon: users
const UsersIcon = (() => {
interface UsersIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface UsersIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const PATH_VARIANTS: Variants = {
  normal: {
    translateX: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 13,
    },
  },
  animate: {
    translateX: [-6, 0],
    transition: {
      delay: 0.1,
      type: "spring",
      stiffness: 200,
      damping: 13,
    },
  },
};

const UsersIcon = forwardRef<UsersIconHandle, UsersIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <motion.path
            animate={controls}
            d="M22 21v-2a4 4 0 0 0-3-3.87"
            variants={PATH_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M16 3.13a4 4 0 0 1 0 7.75"
            variants={PATH_VARIANTS}
          />
        </svg>
      </span>
    );
  }
);

UsersIcon.displayName = "UsersIcon";
  return UsersIcon;
})();

// Animated icon: workflow
const WorkflowIcon = (() => {
interface WorkflowIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface WorkflowIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const TRANSITION: Transition = {
  duration: 0.3,
  opacity: { delay: 0.15 },
};

const VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
  },
  animate: (custom: number) => ({
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      ...TRANSITION,
      delay: 0.1 * custom,
    },
  }),
};

const WorkflowIcon = forwardRef<WorkflowIconHandle, WorkflowIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size, active, style, strokeWidth, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );
    // Play with the nearest interactive parent, or whenever `active` is set.
    // Reduced motion keeps the icon still.
    const wrap = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const [hosted, setHosted] = useState(false);
    useEffect(() => {
      const fake = {} as React.MouseEvent<HTMLSpanElement>;
      if (reduced) {
        setHosted(true);
        return;
      }
      if (active !== undefined) {
        setHosted(true);
        (active ? handleMouseEnter : handleMouseLeave)(fake);
        return;
      }
      const host = wrap.current?.parentElement?.closest<HTMLElement>("button, a, [role=button], [role=menuitem], [role=tab], [role=switch], [role=radio], label");
      setHosted(!!host);
      if (!host) return;
      const on = () => handleMouseEnter(fake);
      const off = () => handleMouseLeave(fake);
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      return () => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      };
    }, [active, reduced, handleMouseEnter, handleMouseLeave]);

    return (
      <span
        ref={wrap}
        className={cn("inline-grid size-6 shrink-0 place-items-center align-middle [&>svg]:size-full", className)}
        style={size ? { width: size, height: size, ...style } : style}
        onMouseEnter={hosted ? undefined : handleMouseEnter}
        onMouseLeave={hosted ? undefined : handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth ?? 2}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.rect
            animate={controls}
            custom={0}
            height="8"
            rx="2"
            variants={VARIANTS}
            width="8"
            x="3"
            y="3"
          />
          <motion.path
            animate={controls}
            custom={3}
            d="M7 11v4a2 2 0 0 0 2 2h4"
            variants={VARIANTS}
          />
          <motion.rect
            animate={controls}
            custom={0}
            height="8"
            rx="2"
            variants={VARIANTS}
            width="8"
            x="13"
            y="13"
          />
        </svg>
      </span>
    );
  }
);

WorkflowIcon.displayName = "WorkflowIcon";
  return WorkflowIcon;
})();

// SidebarNav

/**
 * SidebarNav
 *
 * Trigger: press and hover (plus keys and in view). A white app sidebar that
 * folds between a full rail of icons and labels and a slim rail of icons only.
 * The card glides to its new width while the icons hold still on their own
 * line, so nothing jumps: labels blur out on the way in and come back one
 * after another on the way out, section titles shrink to short hairlines,
 * count badges become dots on their icons, and a single dark tooltip slides
 * from row to row under the pointer while the rail is slim. A soft gray pill
 * glides to the chosen page and a lighter one follows the pointer; every
 * icon plays its own animation while its row is hovered. Groups open into a
 * threaded list where a short ink tick slides to the chosen child. The fold
 * button glides from the end of the brand row to just under the logo, so it
 * stays in reach on the slim rail, and the logo's pinwheel turns when pointed
 * at. The arrow keys move through the rows. On a phone width screen it turns
 * into a bottom bar of the same pages, icons over labels, that swipes sideways
 * (the `mobile` prop forces either look).
 * Reduced motion keeps every state without movement.
 *
 * Engine: motion/react (width tween, staggered label fades, layoutId pills,
 * a spring tooltip, AnimatePresence for the group) with animated
 * icons from lucide-animated (MIT), vendored in src/icons.
 */

export type SidebarIcon =
  | "home"
  | "search"
  | "messages"
  | "projects"
  | "analytics"
  | "calendar"
  | "agents"
  | "workflows"
  | "integrations"
  | "apps"
  | "explore"
  | "team"
  | "bell"
  | "settings";

export type SidebarBadgeTone = "gray" | "blue" | "red";

export interface SidebarBadgeConfig {
  count: number;
  tone?: SidebarBadgeTone;
  tooltip?: string;
}

export type SidebarBadge = number | SidebarBadgeConfig;

export interface SidebarChild {
  id: string;
  label: string;
  badge?: SidebarBadge;
}

export interface SidebarItem {
  id: string;
  label: string;
  /** Built-in animated icon name or a custom React/lucide icon component. */
  icon:
    | SidebarIcon
    | React.ComponentType<{ className?: string; active?: boolean; size?: number; color?: string }>;
  /** A count on the right (hidden when 0); a dot on the icon while the rail is slim. */
  badge?: SidebarBadge;
  /** Optional tooltip text override. */
  tooltip?: string;
  /** A small green tag, like "New". */
  tag?: string;
  /** Pages under this one, shown in a threaded list that opens and closes. */
  children?: SidebarChild[];
}

export interface SidebarSection {
  /** A small title over the rows; a short hairline while the rail is slim. */
  label?: string;
  items: SidebarItem[];
}

export interface SidebarNavProps {
  /** The wordmark beside the logo. */
  brand?: string;
  /** Optional subtitle below the wordmark. */
  subtitle?: string;
  /** The logo mark, about 28-32px. Default a pinwheel. It stays on the slim rail. */
  logo?: React.ReactNode;
  sections?: SidebarSection[];
  /** The chosen page id (controlled). */
  value?: string;
  defaultValue?: string;
  onNavigate?: (id: string) => void;
  /** Groups open at the start, by item id. */
  defaultOpen?: string[];
  /** Slim rail, icons only (controlled). */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  user?: { name: string; email?: string; avatar?: string };
  onSettings?: () => void;
  /** Optional custom footer slot replacing the default account block. */
  footer?: React.ReactNode | ((collapsed: boolean) => React.ReactNode);
  /**
   * How it shows on a phone. `"auto"` (default) turns it into a bottom bar of
   * icons and labels that swipes sideways when the screen is phone width (under
   * 640px); `"bar"` always shows the bar, `"sidebar"` never does.
   */
  mobile?: "auto" | "bar" | "sidebar";
  className?: string;
}

const WIDE = 232;
const SLIM = 56;
// Rows sit inside 8px horizontal padding (`px-2`) and start with a 40px icon slot.
const LABEL_W = WIDE - 16 - 40;

const GLIDE = [0.22, 1, 0.36, 1] as const;
const PILL = { type: "spring", stiffness: 520, damping: 40 } as const;
const TIP = { type: "spring", stiffness: 600, damping: 42 } as const;
const FOLD = (still: boolean) =>
  still ? { duration: 0 } : { duration: 0.42, ease: GLIDE };

const CARD: Variants = {
  hidden: { opacity: 0, x: -10 },
  shown: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.45,
      ease: GLIDE,
      staggerChildren: 0.03,
      delayChildren: 0.06,
    },
  },
};
const ROW: Variants = {
  hidden: { opacity: 0, y: 6 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: GLIDE } },
};

type IconType = React.ComponentType<{ active?: boolean; className?: string }>;

function makeAnimateUiIcon(
  Icon: React.ComponentType<{ size?: number; className?: string }>,
  defaultSize = 17,
): IconType {
  const Wrapped: IconType = ({ active, className }) => {
    const size = className?.includes("20px")
      ? 20
      : className?.includes("18px")
        ? 18
        : defaultSize;
    return (
      <AnimateIcon animate={Boolean(active)}>
        <Icon size={size} className={className} />
      </AnimateIcon>
    );
  };
  return Wrapped;
}

const ICONS: Record<SidebarIcon, IconType> = {
  home: HomeIcon,
  search: SearchIcon,
  messages: MessageCircleIcon,
  projects: makeAnimateUiIcon(AnimatedFolderIcon),
  analytics: ChartLineIcon,
  calendar: makeAnimateUiIcon(AnimatedCalendarDaysIcon),
  agents: BotIcon,
  workflows: WorkflowIcon,
  integrations: PlugZapIcon,
  apps: makeAnimateUiIcon(AnimatedLayoutDashboardIcon),
  explore: CompassIcon,
  team: makeAnimateUiIcon(AnimatedUsersIcon),
  bell: makeAnimateUiIcon(AnimatedBellIcon),
  settings: makeAnimateUiIcon(AnimatedSettingsIcon),
};

const BADGE_TONE_CLASSES: Record<SidebarBadgeTone, string> = {
  gray: "bg-[#F1F5F9] text-[#475569] dark:bg-[#252528] dark:text-[#9A9AA2]",
  blue: "bg-[#EFF6FF] text-[#1E40AF] dark:bg-[rgba(76,141,246,0.14)] dark:text-[#4C8DF6]",
  red: "bg-[#FEF2F2] text-[#DC2626] dark:bg-[rgba(239,83,80,0.14)] dark:text-[#EF5350]",
};

const COLLAPSED_DOT_CLASSES: Record<SidebarBadgeTone, string> = {
  gray: "bg-[#64748B] dark:bg-[#9A9AA2]",
  blue: "bg-[#1E40AF] dark:bg-[#4C8DF6]",
  red: "bg-[#DC2626] dark:bg-[#EF5350]",
};

function resolveBadge(
  badge?: SidebarBadge,
): { count: number; tone: SidebarBadgeTone; tooltip?: string } | null {
  if (badge === undefined || badge === null) return null;
  if (typeof badge === "number") {
    return badge > 0 ? { count: badge, tone: "gray" } : null;
  }
  return badge.count > 0
    ? { count: badge.count, tone: badge.tone ?? "gray", tooltip: badge.tooltip }
    : null;
}

const DEFAULT_SECTIONS: SidebarSection[] = [
  {
    label: "Workspace",
    items: [
      { id: "home", label: "Home", icon: "home" },
      { id: "messages", label: "Messages", icon: "messages", badge: 4 },
      {
        id: "projects",
        label: "Projects",
        icon: "projects",
        children: [
          { id: "website", label: "Website refresh" },
          { id: "mobile", label: "Mobile app", badge: 2 },
          { id: "brand", label: "Brand kit" },
        ],
      },
      { id: "analytics", label: "Analytics", icon: "analytics" },
    ],
  },
];

const DEFAULT_USER: { name: string; email?: string; avatar?: string } = {
  name: "Team Member",
  email: "workspace@wecare.app",
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/** The default logo: a two tone pinwheel that turns a quarter when pointed at. */
function PinwheelMark({ turn }: { turn: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 28 28"
      className="size-7"
      aria-hidden
      animate={{ rotate: turn ? 90 : 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      {[0, 90, 180, 270].map((deg, i) => (
        <path
          key={deg}
          d="M14 14V2a6 6 0 0 1 0 12Z"
          transform={`rotate(${deg} 14 14)`}
          fill="currentColor"
          fillOpacity={i % 2 ? 0.35 : 1}
        />
      ))}
    </motion.svg>
  );
}

/** True on a phone width screen (under 640px), or always / never when forced. */
function usePhoneBar(mode: "auto" | "bar" | "sidebar") {
  const [phone, setPhone] = React.useState(false);
  React.useEffect(() => {
    if (mode !== "auto" || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [mode]);
  return mode === "bar" || (mode === "auto" && phone);
}

function renderNavIcon(
  icon: SidebarItem["icon"],
  hovered: boolean,
  still: boolean,
  className = "size-[18px]",
) {
  if (typeof icon === "string") {
    const BuiltInIcon = ICONS[icon];
    return <BuiltInIcon className={className} active={hovered && !still} />;
  }
  const CustomIcon = icon;
  const size = className.includes("20px")
    ? 20
    : className.includes("17px")
      ? 17
      : 18;
  return (
    <AnimateIcon animate={!still && hovered}>
      <CustomIcon size={size} className={className} />
    </AnimateIcon>
  );
}

/**
 * The sidebar on a phone: the same pages as a bottom bar, each an icon
 * over a label, in a row that swipes sideways.
 */
function PhoneBar({
  items,
  value,
  onPick,
  still,
  className,
}: {
  items: { id: string; label: string; icon: SidebarItem["icon"]; badge?: SidebarBadge }[];
  value: string;
  onPick: (id: string) => void;
  still: boolean;
  className?: string;
}) {
  const id = React.useId();
  const root = React.useRef<HTMLElement>(null);
  const shown = useInView(root, { once: true, amount: 0.1 }) || still;
  const row = React.useRef<HTMLDivElement>(null);
  const [played, setPlayed] = React.useState<string | null>(null);
  const playTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(playTimer.current), []);
  const [ends, setEnds] = React.useState({ start: false, end: false });
  const measure = React.useCallback(() => {
    const el = row.current;
    if (!el) return;
    setEnds({ start: el.scrollLeft > 2, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  }, []);
  React.useEffect(() => {
    const el = row.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);
  React.useEffect(() => {
    row.current?.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);
  const mask = `linear-gradient(to right, ${ends.start ? "transparent, #000 28px" : "#000, #000"}, ${ends.end ? "#000 calc(100% - 28px), transparent" : "#000, #000"})`;

  return (
    <motion.nav
      ref={root}
      aria-label="Main"
      initial={still ? false : { opacity: 0, y: 16 }}
      animate={shown ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: GLIDE }}
      className={cn(
        "w-full max-w-full rounded-2xl bg-white dark:bg-[#161616] border border-[#E2E8F0] dark:border-[#2E2E32] p-1.5 text-[#0F172A] dark:text-[#ECECEE]",
        className,
      )}
    >
      <div
        ref={row}
        onScroll={measure}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className="flex touch-pan-x snap-x gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => {
          const on = item.id === value;
          const badge = resolveBadge(item.badge);
          return (
            <motion.button
              key={item.id}
              type="button"
              aria-current={on ? "page" : undefined}
              aria-label={badge ? `${item.label}, ${badge.tooltip ?? badge.count}` : item.label}
              onClick={() => {
                onPick(item.id);
                setPlayed(item.id);
                window.clearTimeout(playTimer.current);
                playTimer.current = window.setTimeout(() => setPlayed(null), 900);
              }}
              initial={still ? false : { opacity: 0, y: 8 }}
              animate={shown ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.4, ease: GLIDE, delay: still ? 0 : 0.1 + i * 0.035 }}
              whileTap={still ? undefined : { scale: 0.94 }}
              className={cn(
                "relative flex min-w-[68px] max-w-[112px] shrink-0 snap-start cursor-pointer flex-col items-center gap-1 rounded-xl px-3 pb-2 pt-2.5 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#1E40AF]/40 dark:focus-visible:ring-[#4C8DF6]/50",
                on
                  ? "sidebar-nav-active text-[#1E40AF] dark:text-[#4C8DF6]"
                  : "text-[#64748B] dark:text-[#9A9AA2]",
              )}
            >
              {on && (
                <motion.span
                  layoutId={`${id}-bar`}
                  className="absolute inset-0 rounded-xl bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)]"
                  transition={still ? { duration: 0 } : PILL}
                />
              )}
              <span className="relative grid size-6 place-items-center">
                {renderNavIcon(item.icon, played === item.id, still, "size-[20px]")}
                {badge && (
                  <span
                    className={cn(
                      "absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] leading-none tabular-nums ring-2 ring-white dark:ring-[#161616]",
                      BADGE_TONE_CLASSES[badge.tone],
                    )}
                  >
                    {badge.count}
                  </span>
                )}
              </span>
              <span className="relative max-w-full truncate">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}

export const SidebarNav = React.forwardRef<HTMLElement, SidebarNavProps>(
  function SidebarNav(
    {
      brand = "Lumen",
      subtitle,
      logo,
      sections = DEFAULT_SECTIONS,
      value: valueProp,
      defaultValue = "home",
      onNavigate,
      defaultOpen = ["projects"],
      collapsed: collapsedProp,
      defaultCollapsed = false,
      onCollapsedChange,
      user = DEFAULT_USER,
      onSettings,
      footer,
      mobile = "auto",
      className,
    },
    ref,
  ) {
    const still = !!useReducedMotion();
    const id = React.useId();
    const root = React.useRef<HTMLElement>(null);
    React.useImperativeHandle(ref, () => root.current!);

    const [collapsedState, setCollapsedState] =
      React.useState(defaultCollapsed);
    const collapsed = collapsedProp ?? collapsedState;
    const setCollapsed = (next: boolean) => {
      setCollapsedState(next);
      onCollapsedChange?.(next);
      setTip(null);
    };

    const [valueState, setValue] = React.useState(defaultValue);
    const value = valueProp ?? valueState;
    const go = (next: string) => {
      setValue(next);
      onNavigate?.(next);
    };

    const [open, setOpen] = React.useState(() => new Set(defaultOpen));
    const toggleGroup = (key: string) =>
      setOpen((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });

    const [hover, setHover] = React.useState<string | null>(null);
    const [logoHover, setLogoHover] = React.useState(false);
    const [foldHover, setFoldHover] = React.useState(false);

    // One tooltip for the slim rail, sliding to the row under the pointer.
    const [tip, setTip] = React.useState<{
      label: string;
      note?: string;
      y: number;
    } | null>(null);
    const showTip = (el: HTMLElement, label: string, note?: string) => {
      if (!collapsed || !root.current) return;
      const a = el.getBoundingClientRect();
      const b = root.current.getBoundingClientRect();
      setTip({ label, note, y: a.top - b.top + a.height / 2 });
    };

    // Arrow keys, Home, and End move through the rows.
    const onKey = (e: React.KeyboardEvent) => {
      if (
        e.key !== "ArrowDown" &&
        e.key !== "ArrowUp" &&
        e.key !== "Home" &&
        e.key !== "End"
      ) {
        return;
      }
      const rows = Array.from(
        root.current?.querySelectorAll<HTMLElement>("[data-nav-row]") ?? [],
      );
      if (!rows.length) return;
      e.preventDefault();
      if (e.key === "Home") {
        rows[0]?.focus();
        return;
      }
      if (e.key === "End") {
        rows[rows.length - 1]?.focus();
        return;
      }
      const at = rows.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === "ArrowDown"
          ? (at + 1) % rows.length
          : (at - 1 + rows.length) % rows.length;
      rows[at < 0 ? 0 : next]?.focus();
    };

    const fade = (order: number) => ({
      animate: collapsed
        ? { opacity: 0, x: -6, filter: "blur(4px)" }
        : { opacity: 1, x: 0, filter: "blur(0px)" },
      transition: still
        ? { duration: 0 }
        : collapsed
          ? { duration: 0.16, ease: "easeOut" as const }
          : { duration: 0.28, ease: GLIDE, delay: 0.06 + order * 0.015 },
    });

    const pill = (layout: string, tone: string) => (
      <motion.span
        layoutId={`${id}-${layout}`}
        className={cn("pointer-events-none absolute inset-0 rounded-lg", tone)}
        transition={still ? { duration: 0 } : PILL}
      />
    );

    // A soft fade at the foot of the list while more rows sit below.
    const navRef = React.useRef<HTMLElement>(null);
    const [more, setMore] = React.useState(false);
    const measure = React.useCallback(() => {
      const el = navRef.current;
      if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    }, []);
    React.useEffect(() => {
      const el = navRef.current;
      if (!el || typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      Array.from(el.children).forEach((c) => ro.observe(c));
      return () => ro.disconnect();
    }, [measure, sections]);

    const phone = usePhoneBar(mobile);
    if (phone) {
      const items = sections.flatMap((sec) => sec.items).map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        badge: item.badge,
      }));
      const parent = sections
        .flatMap((sec) => sec.items)
        .find((item) => item.children?.some((kid) => kid.id === value));
      return (
        <PhoneBar
          items={items}
          value={parent?.id ?? value}
          onPick={go}
          still={still}
          className={className}
        />
      );
    }

    let order = 0;

    return (
      <motion.aside
        ref={root}
        aria-label="Sidebar"
        onKeyDown={onKey}
        variants={still ? undefined : CARD}
        initial={still ? false : "hidden"}
        animate="shown"
        className={cn(
          "relative isolate flex h-screen sticky top-0 shrink-0 flex-col border-r border-[#E2E8F0] dark:border-[#2E2E32] bg-white dark:bg-[#161616] py-2.5 text-[#0F172A] dark:text-[#ECECEE] select-none z-30",
          className,
        )}
      >
        <motion.div
          className="flex min-h-0 flex-1 flex-col"
          initial={false}
          animate={{ width: collapsed ? SLIM : WIDE }}
          transition={FOLD(still)}
        >
          {/* Brand: logo, wordmark, and the gliding fold button. */}
          <motion.div
            variants={ROW}
            className="relative px-2 pb-2 border-b border-[#E2E8F0] dark:border-[#2E2E32]"
          >
            <div className="flex h-10 items-center">
              <span
                className="grid size-10 shrink-0 place-items-center text-[#1E40AF] dark:text-[#4C8DF6]"
                onPointerEnter={() => setLogoHover(true)}
                onPointerLeave={() => setLogoHover(false)}
              >
                {logo ?? <PinwheelMark turn={logoHover && !still} />}
              </span>
              <div className="min-w-0 flex-1 overflow-hidden pr-9">
                <motion.div className="pl-1" {...fade(0)}>
                  <span className="block whitespace-nowrap text-[13.5px] font-bold tracking-tight text-[#0F172A] dark:text-[#ECECEE] leading-tight">
                    {brand}
                  </span>
                  {subtitle && (
                    <span className="block whitespace-nowrap text-[10px] text-[#64748B] dark:text-[#9A9AA2] mt-0.5">
                      {subtitle}
                    </span>
                  )}
                </motion.div>
              </div>
            </div>
            {/* Room under the logo for the fold button while the rail is slim. */}
            <motion.div
              aria-hidden
              initial={false}
              animate={{ height: collapsed ? 40 : 0 }}
              transition={FOLD(still)}
            />
            {/* Gliding collapse/expand button: moves from brand row end to under logo. */}
            <motion.button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
              onClick={() => setCollapsed(!collapsed)}
              onPointerEnter={(e) => {
                setFoldHover(true);
                showTip(e.currentTarget, collapsed ? "Expand sidebar" : "Collapse sidebar", "Ctrl+B");
              }}
              onPointerLeave={() => {
                setFoldHover(false);
                setTip(null);
              }}
              onFocus={(e) =>
                showTip(e.currentTarget, collapsed ? "Expand sidebar" : "Collapse sidebar", "Ctrl+B")
              }
              onBlur={() => setTip(null)}
              initial={false}
              animate={{
                x: collapsed ? 0 : WIDE - 16 - 40,
                y: collapsed ? 40 : 0,
              }}
              whileTap={still ? undefined : { scale: 0.92 }}
              transition={FOLD(still)}
              className="absolute left-2 top-0 grid size-10 cursor-pointer place-items-center rounded-lg text-[#64748B] dark:text-white outline-none transition-colors duration-150 hover:bg-[#F1F5F9] dark:hover:bg-[#252528] hover:text-[#0F172A] dark:hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E40AF]/40 dark:focus-visible:ring-[#4C8DF6]/50"
            >
              <motion.span
                className="absolute inset-0 grid place-items-center"
                initial={false}
                animate={{
                  opacity: collapsed ? 0 : 1,
                  scale: collapsed ? 0.7 : 1,
                }}
                transition={{ duration: still ? 0 : 0.2 }}
              >
                <AnimateIcon animate={foldHover && !still}>
                  <AnimatedPanelLeftClose size={18} className="size-[18px]" />
                </AnimateIcon>
              </motion.span>
              <motion.span
                className="absolute inset-0 grid place-items-center"
                initial={false}
                animate={{
                  opacity: collapsed ? 1 : 0,
                  scale: collapsed ? 1 : 0.7,
                }}
                transition={{
                  duration: still ? 0 : 0.2,
                  delay: collapsed && !still ? 0.18 : 0,
                }}
              >
                <AnimateIcon animate={foldHover && !still}>
                  <AnimatedPanelLeftOpen size={18} className="size-[18px]" />
                </AnimateIcon>
              </motion.span>
            </motion.button>
          </motion.div>

          {/* Pages. */}
          <nav
            ref={navRef}
            aria-label="Main Navigation"
            onPointerLeave={() => {
              setHover(null);
              setTip(null);
            }}
            onScroll={() => {
              setTip(null);
              measure();
            }}
            className={cn(
              "mt-1 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-1.5 [scrollbar-width:none]",
              more &&
                "[mask-image:linear-gradient(to_bottom,black_calc(100%-32px),transparent)]",
            )}
          >
            {sections.map((section, si) => (
              <div key={section.label ?? si} className={si === 0 ? "pt-1" : "pt-1.5"}>
                {section.label !== undefined && (
                  <motion.div
                    variants={ROW}
                    className="relative h-5"
                    onPointerEnter={() => {
                      setHover(null);
                      setTip(null);
                    }}
                  >
                    <motion.p
                      className="absolute bottom-0.5 left-2.5 whitespace-nowrap text-[11px] font-semibold tracking-[0.06em] uppercase text-[#475569] dark:text-[#C8C8D0]"
                      {...fade(order++)}
                    >
                      {section.label}
                    </motion.p>
                    <motion.span
                      aria-hidden
                      className="absolute bottom-2 left-3 h-px w-4 rounded-full bg-[#E2E8F0] dark:bg-[#2E2E32]"
                      initial={false}
                      animate={{
                        opacity: collapsed ? 1 : 0,
                        scaleX: collapsed ? 1 : 0.2,
                      }}
                      transition={{
                        duration: still ? 0 : 0.28,
                        ease: GLIDE,
                        delay: collapsed && !still ? 0.12 : 0,
                      }}
                    />
                  </motion.div>
                )}

                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const kids = item.children ?? [];
                    const groupOpen = kids.length > 0 && open.has(item.id);
                    const childActive = kids.some((k) => k.id === value);
                    const active =
                      value === item.id ||
                      (childActive && (collapsed || !groupOpen));
                    const isHover = hover === item.id;
                    const badge = resolveBadge(item.badge);
                    const note = badge
                      ? badge.tooltip ?? `${badge.count}`
                      : kids.length
                        ? `${kids.length} pages`
                        : item.tag ?? item.tooltip;
                    const rowOrder = order++;
                    return (
                      <motion.div key={item.id} variants={ROW}>
                        <motion.button
                          type="button"
                          data-nav-row
                          aria-current={value === item.id ? "page" : undefined}
                          aria-label={badge ? `${item.label}, ${badge.tooltip ?? badge.count}` : item.label}
                          aria-expanded={
                            kids.length ? groupOpen && !collapsed : undefined
                          }
                          title={!collapsed ? badge?.tooltip ?? item.tooltip : undefined}
                          onPointerEnter={(e) => {
                            setHover(item.id);
                            showTip(e.currentTarget, item.label, note);
                          }}
                          onFocus={(e) => {
                            setHover(item.id);
                            showTip(e.currentTarget, item.label, note);
                          }}
                          onBlur={() => setTip(null)}
                          onClick={() => {
                            if (!kids.length) return go(item.id);
                            if (collapsed) {
                              setOpen((p) => new Set(p).add(item.id));
                              setCollapsed(false);
                            } else toggleGroup(item.id);
                          }}
                          whileTap={still ? undefined : { scale: 0.98 }}
                          className={cn(
                            "relative flex h-[34px] w-full cursor-pointer items-center rounded-lg text-left text-[12.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E40AF]/40 dark:focus-visible:ring-[#4C8DF6]/50",
                            active && "sidebar-nav-active",
                          )}
                        >
                          {active &&
                            pill(
                              "active",
                              "bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)]",
                            )}
                          {isHover &&
                            !active &&
                            pill("hover", "bg-[#F1F5F9] dark:bg-[#252528]")}
                          {active && (
                            <motion.span
                              layoutId={`${id}-active-bar`}
                              aria-hidden
                              className="pointer-events-none absolute left-0 top-1 bottom-1 z-20 w-[3px] rounded-r bg-[#1E40AF] dark:bg-[#4C8DF6]"
                              transition={still ? { duration: 0 } : PILL}
                            />
                          )}
                          <span
                            className={cn(
                              "relative z-10 grid w-10 h-full shrink-0 place-items-center transition-colors duration-150",
                              active
                                ? "text-[#1E40AF] dark:text-[#4C8DF6]"
                                : isHover
                                  ? "text-[#0F172A] dark:text-white"
                                  : "text-[#64748B] dark:text-white",
                            )}
                          >
                            {renderNavIcon(item.icon, isHover, still, "size-[17px]")}
                            {badge && (
                              <motion.span
                                aria-hidden
                                className={cn(
                                  "absolute right-2 top-1.5 size-1.5 rounded-full ring-2 ring-white dark:ring-[#161616]",
                                  COLLAPSED_DOT_CLASSES[badge.tone],
                                )}
                                initial={false}
                                animate={{
                                  scale: collapsed ? 1 : 0,
                                  opacity: collapsed ? 1 : 0,
                                }}
                                transition={
                                  still
                                    ? { duration: 0 }
                                    : collapsed
                                      ? {
                                          type: "spring",
                                          stiffness: 500,
                                          damping: 22,
                                          delay: 0.22,
                                        }
                                      : { duration: 0.12 }
                                }
                              />
                            )}
                          </span>
                          <span className="relative z-10 min-w-0 flex-1 self-stretch overflow-hidden">
                            <motion.span
                              className="flex h-full items-center gap-1.5 pr-2"
                              style={{ width: LABEL_W }}
                              {...fade(rowOrder)}
                            >
                              <span
                                className={cn(
                                  "min-w-0 flex-1 truncate transition-colors duration-150",
                                  active
                                    ? "text-[#1E40AF] dark:text-[#4C8DF6]"
                                    : isHover
                                      ? "text-[#0F172A] dark:text-white"
                                      : "text-[#0F172A] dark:text-[#ECECEE]",
                                )}
                              >
                                {item.label}
                              </span>
                              {item.tag && (
                                <span className="grid h-4 place-items-center rounded-full bg-[#DCFCE7] dark:bg-[rgba(52,194,107,0.14)] px-1.5 text-[10px] font-medium text-[#16A34A] dark:text-[#34C26B]">
                                  {item.tag}
                                </span>
                              )}
                              {badge && (
                                <motion.span
                                  title={badge.tooltip}
                                  className={cn(
                                    "grid h-[18px] min-w-[18px] place-items-center rounded-full px-1.5 text-[10px] font-medium tabular-nums leading-none",
                                    BADGE_TONE_CLASSES[badge.tone],
                                  )}
                                  animate={{
                                    scale:
                                      isHover && !still ? [1, 1.15, 1] : 1,
                                  }}
                                  transition={{ duration: 0.32 }}
                                >
                                  {badge.count}
                                </motion.span>
                              )}
                              {kids.length > 0 && (
                                <motion.span
                                  className="grid size-5 place-items-center text-[#64748B] dark:text-[#9A9AA2]"
                                  animate={{ rotate: groupOpen ? 0 : -90 }}
                                  transition={
                                    still
                                      ? { duration: 0 }
                                      : { duration: 0.3, ease: GLIDE }
                                  }
                                >
                                  <ChevronDownIcon
                                    className="size-4"
                                    active={false}
                                  />
                                </motion.span>
                              )}
                            </motion.span>
                          </span>
                        </motion.button>

                        <AnimatePresence initial={false}>
                          {groupOpen && !collapsed && (
                            <motion.div
                              key="kids"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: still ? 0 : 0.32,
                                ease: GLIDE,
                              }}
                              className="relative overflow-hidden"
                            >
                              {/* The thread draws down from the parent's icon. */}
                              <motion.span
                                aria-hidden
                                className="absolute bottom-3 left-[19.5px] top-0 w-px origin-top bg-[#E2E8F0] dark:bg-[#2E2E32]"
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{
                                  duration: still ? 0 : 0.4,
                                  ease: GLIDE,
                                  delay: still ? 0 : 0.05,
                                }}
                              />
                              <div className="py-0.5">
                                {kids.map((kid, ki) => {
                                  const on = value === kid.id;
                                  const key = `${item.id}/${kid.id}`;
                                  const kidBadge = resolveBadge(kid.badge);
                                  return (
                                    <motion.button
                                      key={kid.id}
                                      type="button"
                                      data-nav-row
                                      aria-current={on ? "page" : undefined}
                                      initial={{ opacity: 0, x: -6 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{
                                        duration: still ? 0 : 0.28,
                                        ease: GLIDE,
                                        delay: still ? 0 : 0.06 + ki * 0.04,
                                      }}
                                      onPointerEnter={() => setHover(key)}
                                      onFocus={() => setHover(key)}
                                      onClick={() => go(kid.id)}
                                      className={cn(
                                        "relative flex h-8 w-full cursor-pointer items-center rounded-lg pl-10 pr-2 text-left text-[12.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E40AF]/40 dark:focus-visible:ring-[#4C8DF6]/50",
                                        on && "sidebar-nav-active",
                                      )}
                                    >
                                      {on &&
                                        pill(
                                          "active",
                                          "bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)]",
                                        )}
                                      {hover === key &&
                                        !on &&
                                        pill(
                                          "hover",
                                          "bg-[#F1F5F9] dark:bg-[#252528]",
                                        )}
                                      {on && (
                                        <motion.span
                                          layoutId={`${id}-tick`}
                                          aria-hidden
                                          className="absolute left-[18.5px] top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full bg-[#1E40AF] dark:bg-[#4C8DF6]"
                                          transition={
                                            still ? { duration: 0 } : PILL
                                          }
                                        />
                                      )}
                                      <span
                                        className={cn(
                                          "relative min-w-0 flex-1 truncate transition-colors duration-150",
                                          on
                                            ? "text-[#1E40AF] dark:text-[#4C8DF6]"
                                            : hover === key
                                              ? "text-[#0F172A] dark:text-white"
                                              : "text-[#64748B] dark:text-[#9A9AA2]",
                                        )}
                                      >
                                        {kid.label}
                                      </span>
                                      {kidBadge && (
                                        <span
                                          title={kidBadge.tooltip}
                                          className={cn(
                                            "relative grid h-[18px] min-w-[18px] place-items-center rounded-full px-1.5 text-[10px] font-medium tabular-nums leading-none",
                                            BADGE_TONE_CLASSES[kidBadge.tone],
                                          )}
                                        >
                                          {kidBadge.count}
                                        </span>
                                      )}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer: custom workspace slot or default account block. */}
          {footer ? (
            <motion.div
              variants={ROW}
              className="shrink-0 border-t border-[#E2E8F0] dark:border-[#2E2E32] pt-2 px-2 overflow-hidden"
            >
              {typeof footer === "function" ? footer(collapsed) : footer}
            </motion.div>
          ) : (
            <motion.div variants={ROW}>
              <div aria-hidden className="mb-2 h-px bg-[#E2E8F0] dark:bg-[#2E2E32]" />
              <div className="flex h-10 items-center px-2">
                <span
                  className="relative grid size-10 shrink-0 place-items-center"
                  onPointerEnter={(e) =>
                    showTip(e.currentTarget, user.name, user.email)
                  }
                  onPointerLeave={() => setTip(null)}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      draggable={false}
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid size-8 place-items-center rounded-full bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] text-[#1E40AF] dark:text-[#4C8DF6] text-xs font-semibold">
                      {initialsOf(user.name)}
                    </span>
                  )}
                  <span className="absolute bottom-1 right-1 size-2.5 rounded-full bg-[#16A34A] dark:bg-[#34C26B] ring-2 ring-white dark:ring-[#161616]" />
                </span>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <motion.div
                    className="flex items-center gap-2 pl-1.5"
                    style={{ width: LABEL_W - 4 }}
                    {...fade(order++)}
                  >
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm font-medium">
                        {user.name}
                      </span>
                      {user.email && (
                        <span className="block truncate text-xs text-[#64748B] dark:text-[#9A9AA2]">
                          {user.email}
                        </span>
                      )}
                    </span>
                    <AnimateIcon animateOnHover className="inline-flex">
                      <motion.button
                        type="button"
                        aria-label="Settings"
                        tabIndex={collapsed ? -1 : 0}
                        onClick={onSettings}
                        whileTap={still ? undefined : { scale: 0.9 }}
                        className="grid size-8 cursor-pointer place-items-center rounded-lg text-[#64748B] dark:text-white outline-none transition-colors hover:bg-[#F1F5F9] dark:hover:bg-[#252528] hover:text-[#0F172A] dark:hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E40AF]/40 dark:focus-visible:ring-[#4C8DF6]/50"
                      >
                        <AnimatedSettingsIcon size={18} className="size-[18px]" />
                      </motion.button>
                    </AnimateIcon>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* The slim rail's tooltip, one for every row, sliding between them. */}
        <AnimatePresence>
          {collapsed && tip && (
            <motion.div
              className="pointer-events-none absolute top-0 z-40"
              style={{ left: SLIM + 8 }}
              initial={{ opacity: 0, x: -6, y: tip.y, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, y: tip.y, scale: 1 }}
              exit={{
                opacity: 0,
                x: -4,
                scale: 0.97,
                transition: { duration: 0.12 },
              }}
              transition={
                still
                  ? { duration: 0 }
                  : {
                      ...TIP,
                      opacity: { duration: 0.15 },
                      x: { duration: 0.2, ease: GLIDE },
                    }
              }
            >
              <div
                role="tooltip"
                className="flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-lg bg-[#0F172A] px-2.5 py-1.5 text-xs font-medium text-white border border-[#1E293B] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.35)] dark:bg-[#252528] dark:text-[#ECECEE] dark:border-[#3A3A3F] dark:shadow-none"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={tip.label}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, filter: "blur(3px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(3px)" }}
                    transition={{ duration: still ? 0 : 0.16 }}
                  >
                    {tip.label}
                    {tip.note && (
                      <span className="text-[11px] font-normal text-white/70 dark:text-[#9A9AA2]">
                        {tip.note}
                      </span>
                    )}
                  </motion.span>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    );
  },
);


