"use client";

/**
 * TabBar, from https://motion-brew.com/components/tab-bar
 *
 * One self contained file: the component, its animated icons and the cn()
 * helper. Needs React 18 or 19 and Tailwind CSS v4.
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
import { AnimatePresence, LayoutGroup, motion, type Transition, useAnimation, useInView, useReducedMotion, type Variants } from "motion/react";
import { twMerge } from "tailwind-merge";

// cn(): merges Tailwind classes, later ones win.
/** Merge Tailwind classes, letting later classes win conflicts. */
function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Animated icon: chart-pie
const ChartPieIcon = (() => {
interface ChartPieIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ChartPieIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const PATH_VARIANTS: Variants = {
  normal: { translateX: 0, translateY: 0 },
  animate: { translateX: 1.1, translateY: -1.1 },
};

const ChartPieIcon = forwardRef<ChartPieIconHandle, ChartPieIconProps>(
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
            d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"
            transition={{
              type: "spring",
              stiffness: 250,
              damping: 15,
              bounce: 0.6,
            }}
            variants={PATH_VARIANTS}
          />
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        </svg>
      </span>
    );
  }
);

ChartPieIcon.displayName = "ChartPieIcon";
  return ChartPieIcon;
})();

// Animated icon: history
const HistoryIcon = (() => {
interface HistoryIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface HistoryIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const ARROW_TRANSITION: Transition = {
  type: "spring",
  stiffness: 250,
  damping: 25,
};

const ARROW_VARIANTS: Variants = {
  normal: {
    rotate: "0deg",
  },
  animate: {
    rotate: "-50deg",
  },
};

const HAND_TRANSITION: Transition = {
  duration: 0.6,
  ease: [0.4, 0, 0.2, 1],
};

const HAND_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    originX: "0%",
    originY: "100%",
  },
  animate: {
    rotate: -360,
    originX: "0%",
    originY: "100%",
  },
};

const MINUTE_HAND_TRANSITION: Transition = {
  duration: 0.5,
  ease: "easeInOut",
};

const MINUTE_HAND_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    originX: "0%",
    originY: "0%",
  },
  animate: {
    rotate: -45,
    originX: "0%",
    originY: "0%",
  },
};

const HistoryIcon = forwardRef<HistoryIconHandle, HistoryIconProps>(
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
          <motion.g
            animate={controls}
            transition={ARROW_TRANSITION}
            variants={ARROW_VARIANTS}
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </motion.g>
          <motion.line
            animate={controls}
            initial="normal"
            transition={HAND_TRANSITION}
            variants={HAND_VARIANTS}
            x1="12"
            x2="12"
            y1="12"
            y2="7"
          />
          <motion.line
            animate={controls}
            initial="normal"
            transition={MINUTE_HAND_TRANSITION}
            variants={MINUTE_HAND_VARIANTS}
            x1="12"
            x2="16"
            y1="12"
            y2="14"
          />
        </svg>
      </span>
    );
  }
);

HistoryIcon.displayName = "HistoryIcon";
  return HistoryIcon;
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

// Animated icon: plus
const PlusIcon = (() => {
interface PlusIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface PlusIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const PlusIcon = forwardRef<PlusIconHandle, PlusIconProps>(
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
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
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
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </motion.svg>
      </span>
    );
  }
);

PlusIcon.displayName = "PlusIcon";
  return PlusIcon;
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

// Animated icon: user
const UserIcon = (() => {
interface UserIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface UserIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size in px; by default it follows className, like a lucide icon. */
  size?: number;
  /** Play while true; when set, hover no longer drives it. */
  active?: boolean;
  /** Line weight, like a lucide icon's. Default `2`. */
  strokeWidth?: number | string;
}

const PATH_VARIANT: Variants = {
  normal: { pathLength: 1, opacity: 1, pathOffset: 0 },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    pathOffset: [1, 0],
  },
};

const CIRCLE_VARIANT: Variants = {
  normal: {
    pathLength: 1,
    pathOffset: 0,
    scale: 1,
  },
  animate: {
    pathLength: [0, 1],
    pathOffset: [1, 0],
    scale: [0.5, 1],
  },
};

const UserIcon = forwardRef<UserIconHandle, UserIconProps>(
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
          <motion.circle
            animate={controls}
            cx="12"
            cy="8"
            r="5"
            variants={CIRCLE_VARIANT}
          />

          <motion.path
            animate={controls}
            d="M20 21a8 8 0 0 0-16 0"
            transition={{
              delay: 0.2,
              duration: 0.4,
            }}
            variants={PATH_VARIANT}
          />
        </svg>
      </span>
    );
  }
);

UserIcon.displayName = "UserIcon";
  return UserIcon;
})();

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

// TabBar

/**
 * TabBar
 *
 * Trigger: press (plus keys and in view). A white mobile bottom navigation in
 * three styles. Pill: the active tab grows into an ink pill that shows its
 * label while the others stay icons, and the pill glides between tabs as the
 * row reflows. Labels: icons over labels; the active one turns to ink, sits
 * on a soft disc and has a small dot gliding beneath it. Action: four
 * icon-only tabs (the active one on a soft disc) around a raised ink button
 * with a white plus in the middle that springs and turns its plus a quarter
 * when pressed. In every style a tap plays the tab's animated icon,
 * dips the tab, sends a soft ripple out from under it, and badges pop in
 * and out. When it scrolls into view the bar rises in and its tabs follow.
 * Left and right arrows move between tabs. Reduced motion keeps every state
 * without movement.
 *
 * Engine: motion/react (layoutId pill, dot and disc, a layout reflow, spring
 * presses and ripples) with animated icons from lucide-animated (MIT),
 * vendored in src/icons.
 */

export type TabIcon =
  | "home"
  | "search"
  | "analytics"
  | "history"
  | "profile"
  | "bell"
  | "chat"
  | "explore"
  | "settings";

export interface TabItem {
  id: string;
  label: string;
  icon: TabIcon;
  /** A small count on the icon. */
  badge?: number;
}

export type TabBarVariant = "pill" | "labels" | "action";

export interface TabBarProps {
  /** Four or five tabs work best (four for the action style). */
  tabs?: TabItem[];
  /** Default `"pill"`. */
  variant?: TabBarVariant;
  /** The selected tab, when you control it. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** The middle button in the action style. */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const ICONS: Record<
  TabIcon,
  React.ComponentType<{
    active?: boolean;
    className?: string;
    strokeWidth?: number;
  }>
> = {
  home: HomeIcon,
  search: SearchIcon,
  analytics: ChartPieIcon,
  history: HistoryIcon,
  profile: UserIcon,
  bell: BellIcon,
  chat: MessageCircleIcon,
  explore: CompassIcon,
  settings: SettingsIcon,
};

const DEFAULT_TABS: TabItem[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "search", label: "Search", icon: "search" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
  { id: "history", label: "History", icon: "history", badge: 3 },
  { id: "profile", label: "Profile", icon: "profile" },
];

const GLIDE = [0.22, 1, 0.36, 1] as const;
const SPRING: Transition = { type: "spring", stiffness: 500, damping: 34 };
const POP: Transition = { type: "spring", stiffness: 600, damping: 26 };

export const TabBar = React.forwardRef<HTMLElement, TabBarProps>(
  function TabBar(
    {
      tabs = DEFAULT_TABS,
      variant = "pill",
      value,
      defaultValue,
      onChange,
      actionLabel = "Create",
      onAction,
      className,
    },
    ref,
  ) {
    const still = !!useReducedMotion();
    const uid = React.useId();
    const root = React.useRef<HTMLElement>(null);
    React.useImperativeHandle(ref, () => root.current!);
    const seen = useInView(root, { once: true, amount: 0.4 });
    const shown = seen || still;
    const list = variant === "action" ? tabs.slice(0, 4) : tabs.slice(0, 5);
    const [own, setOwn] = React.useState(defaultValue ?? list[0]?.id ?? "");
    const current = value ?? own;
    // The tab whose icon is playing, and a count per tab for its ripple.
    const [playing, setPlaying] = React.useState<string | null>(null);
    const [taps, setTaps] = React.useState<Record<string, number>>({});
    const [spins, setSpins] = React.useState(0);
    const timer = React.useRef(0);
    React.useEffect(() => () => window.clearTimeout(timer.current), []);

    const choose = (id: string) => {
      setTaps((t) => ({ ...t, [id]: (t[id] ?? 0) + 1 }));
      setPlaying(id);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPlaying(null), 900);
      if (id === current) return;
      if (value === undefined) setOwn(id);
      onChange?.(id);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const buttons = Array.from(
        root.current?.querySelectorAll<HTMLElement>("[data-tab]") ?? [],
      );
      const at = buttons.indexOf(document.activeElement as HTMLElement);
      if (at < 0) return;
      e.preventDefault();
      const next =
        buttons[
          (at + (e.key === "ArrowRight" ? 1 : buttons.length - 1)) %
            buttons.length
        ];
      next?.focus();
    };

    const tab = (t: TabItem, i: number) => {
      const on = t.id === current;
      const Icon = ICONS[t.icon];
      const ripple = taps[t.id] ?? 0;
      const pill = variant === "pill";
      // The action style shows icons only; its tabs keep their names for screen readers.
      const iconOnly = variant === "action";
      return (
        <motion.button
          key={t.id}
          type="button"
          data-tab=""
          layout={pill && !still ? "position" : false}
          aria-label={t.badge ? `${t.label}, ${t.badge} new` : t.label}
          aria-current={on ? "page" : undefined}
          onClick={() => choose(t.id)}
          initial={still ? false : { opacity: 0, y: 12 }}
          animate={shown ? { opacity: 1, y: 0 } : undefined}
          whileTap={still ? undefined : { scale: 0.88 }}
          transition={{
            ...SPRING,
            opacity: { duration: 0.4, delay: still ? 0 : 0.15 + i * 0.05 },
            y: { ...SPRING, delay: still ? 0 : 0.15 + i * 0.05 },
          }}
          className={cn(
            "group relative flex cursor-pointer select-none items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#242423]/30",
            pill
              ? "h-12 rounded-full"
              : iconOnly
                ? "h-12 flex-1 rounded-2xl"
                : "h-14 flex-1 flex-col gap-1 rounded-2xl",
            pill && (on ? "gap-2 pl-4 pr-5" : "w-12"),
          )}
        >
          {/* Pill: an ink capsule glides to the active tab. */}
          {pill && on && (
            <motion.span
              layoutId={`${uid}-pill`}
              transition={still ? { duration: 0 } : SPRING}
              className="absolute inset-0 z-0 rounded-full bg-[#242423]/[0.07] dark:bg-white/[0.1]"
            />
          )}
          {/* A soft hover wash for the others. */}
          {!on && (
            <span
              aria-hidden
              className={cn(
                "absolute z-0 rounded-full bg-[#242423]/[0.05] dark:bg-white/[0.06] opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                pill
                  ? "inset-0"
                  : iconOnly
                    ? "left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2"
                    : "left-1/2 top-1 size-10 -translate-x-1/2",
              )}
            />
          )}

          <span className="relative z-10 grid place-items-center">
            {/* Labels: the active icon sits on a soft disc. */}
            {variant !== "pill" && on && (
              <motion.span
                layoutId={`${uid}-disc`}
                transition={still ? { duration: 0 } : SPRING}
                className="absolute size-10 rounded-full bg-[#242423]/[0.07]"
              />
            )}
            {/* A ripple from every tap. */}
            <AnimatePresence>
              {!still && ripple > 0 && (
                <motion.span
                  key={ripple}
                  aria-hidden
                  initial={{ scale: 0.4, opacity: 0.45 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: GLIDE }}
                  className={cn(
                    "absolute size-8 rounded-full",
                    "bg-[#242423]/15",
                  )}
                />
              )}
            </AnimatePresence>
            <motion.span
              className={cn(
                "relative grid transition-colors duration-300",
                on
                  ? "text-[#242423]"
                  : "text-[#a3a3a0] group-hover:text-[#5c5c59]",
              )}
              animate={{ y: variant === "labels" && on && !still ? -1 : 0 }}
              transition={SPRING}
            >
              {/* Each tap bounces the icon in with a little wiggle, then it plays. */}
              <motion.span
                key={ripple}
                className="grid"
                initial={
                  ripple > 0 && !still ? { scale: 0.7, rotate: -14 } : false
                }
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 11 }}
              >
                <Icon
                  className="size-[22px]"
                  strokeWidth={on ? 2.25 : 2}
                  active={playing === t.id}
                />
              </motion.span>
            </motion.span>
            {/* Badge */}
            <AnimatePresence>
              {!!t.badge && (
                <motion.span
                  key="badge"
                  initial={still ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={still ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                  transition={POP}
                  className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#d64545] px-1 text-[12px] font-semibold leading-none text-white ring-2 ring-white"
                >
                  {t.badge}
                </motion.span>
              )}
            </AnimatePresence>
          </span>

          {/* Pill: the label slides out of the capsule. Labels: always shown. */}
          {pill ? (
            <AnimatePresence initial={false} mode="popLayout">
              {on && (
                <motion.span
                  key="label"
                  initial={
                    still
                      ? { opacity: 0 }
                      : { opacity: 0, x: -6, filter: "blur(3px)" }
                  }
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{
                    duration: 0.3,
                    ease: GLIDE,
                    delay: still ? 0 : 0.06,
                  }}
                  className="relative z-10 whitespace-nowrap text-[14px] font-medium text-[#242423] dark:text-[#ECECEE]"
                >
                  {t.label}
                </motion.span>
              )}
            </AnimatePresence>
          ) : iconOnly ? null : (
            <span
              className={cn(
                "relative text-[12px] leading-4 transition-colors duration-300",
                on
                  ? "font-semibold text-[#242423]"
                  : "font-medium text-[#242423]/45",
              )}
            >
              {t.label}
            </span>
          )}

          {/* Labels: a small dot glides under the active tab. */}
          {variant === "labels" && on && (
            <motion.span
              layoutId={`${uid}-dot`}
              transition={still ? { duration: 0 } : SPRING}
              className="absolute -bottom-1 size-1 rounded-full bg-[#242423]"
            />
          )}
        </motion.button>
      );
    };

    const half = Math.ceil(list.length / 2);

    return (
      <motion.nav
        ref={root}
        aria-label="Main"
        onKeyDown={onKeyDown}
        initial={still ? false : { opacity: 0, y: 24, filter: "blur(6px)" }}
        animate={shown ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
        transition={{ duration: 0.6, ease: GLIDE }}
        className={cn(
          "relative w-[380px] max-w-full rounded-full bg-white p-2 text-[#242423] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.18)]",
          className,
        )}
      >
        <LayoutGroup id={uid}>
          {variant === "action" ? (
            <div className="relative flex items-center">
              {list.slice(0, half).map(tab)}
              {/* The raised action in the middle. */}
              <div className="relative grid w-16 shrink-0 place-items-center">
                <motion.button
                  type="button"
                  aria-label={actionLabel}
                  onClick={() => {
                    setSpins((s) => s + 1);
                    onAction?.();
                  }}
                  initial={still ? false : { scale: 0.5, opacity: 0 }}
                  animate={
                    shown
                      ? { scale: 1, opacity: 1, rotate: still ? 0 : spins * 90 }
                      : undefined
                  }
                  whileHover={still ? undefined : { y: -3 }}
                  whileTap={still ? undefined : { scale: 0.88 }}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 18,
                    opacity: { duration: 0.3, delay: still ? 0 : 0.3 },
                  }}
                  className="relative -mt-10 grid size-14 cursor-pointer place-items-center rounded-full bg-[#242423] text-white shadow-[0_10px_22px_-10px_rgba(36,36,35,0.6)] outline-none ring-4 ring-white transition-colors hover:bg-[#3a3a38] focus-visible:ring-[#242423]/30"
                >
                  <AnimatePresence>
                    {!still && spins > 0 && (
                      <motion.span
                        key={spins}
                        aria-hidden
                        initial={{ scale: 1, opacity: 0.4 }}
                        animate={{ scale: 1.8, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: GLIDE }}
                        className="absolute inset-0 rounded-full bg-[#242423]/20"
                      />
                    )}
                  </AnimatePresence>
                  <PlusIcon className="relative size-6" strokeWidth={2.5} />
                </motion.button>
              </div>
              {list.slice(half).map((t, i) => tab(t, i + half))}
            </div>
          ) : (
            <div
              className={cn(
                "flex items-center",
                variant === "pill" ? "justify-between px-1" : "",
              )}
            >
              {list.map(tab)}
            </div>
          )}
        </LayoutGroup>
      </motion.nav>
    );
  },
);

// ─── SidebarTabBar (Vertical Sidebar Navigation using TabBar Motion Engine) ───
export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; color?: string }>;
  count?: number;
  isLiveSync?: boolean;
  syncStatusColor?: string;
  syncTitle?: string;
}

export interface SidebarNavSection {
  title: string;
  items: SidebarNavItem[];
}

export interface SidebarTabBarProps {
  sections: SidebarNavSection[];
  value: string;
  onChange: (id: string) => void;
  collapsed?: boolean;
  className?: string;
}

export const SidebarTabBar = React.forwardRef<HTMLElement, SidebarTabBarProps>(
  function SidebarTabBar(
    { sections, value, onChange, collapsed = false, className },
    ref,
  ) {
    const still = !!useReducedMotion();
    const uid = React.useId();
    const root = React.useRef<HTMLElement>(null);
    React.useImperativeHandle(ref, () => root.current!);
    const [taps, setTaps] = React.useState<Record<string, number>>({});

    const choose = (id: string) => {
      setTaps((t) => ({ ...t, [id]: (t[id] ?? 0) + 1 }));
      if (id !== value) {
        onChange(id);
      }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") {
        return;
      }
      const buttons = Array.from(
        root.current?.querySelectorAll<HTMLElement>("[data-sidebar-tab]") ?? [],
      );
      if (buttons.length === 0) return;
      const at = buttons.indexOf(document.activeElement as HTMLElement);
      if (at < 0 && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      if (e.key === "Home") {
        buttons[0]?.focus();
        return;
      }
      if (e.key === "End") {
        buttons[buttons.length - 1]?.focus();
        return;
      }
      const nextIndex = (at + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length;
      buttons[nextIndex]?.focus();
    };

    let globalIdx = 0;

    return (
      <nav
        ref={root}
        aria-label="Main Navigation"
        onKeyDown={onKeyDown}
        className={cn("space-y-2.5", className)}
      >
        <LayoutGroup id={`${uid}-sidebar`}>
          {sections.map((section, idx) => (
            <div key={section.title} className="space-y-0.5">
              {!collapsed ? (
                <div className="px-2 pt-0.5 pb-0.5">
                  <span className="text-[10px] font-semibold tracking-[0.06em] uppercase text-[#64748B] dark:text-[#9A9AA2]">
                    {section.title}
                  </span>
                </div>
              ) : (
                idx > 0 && (
                  <div className="my-1.5 mx-1.5 border-t border-[#E2E8F0] dark:border-[#2E2E32]" />
                )
              )}

              <div className={cn("space-y-0.5", collapsed && "flex flex-col items-center")}>
                {section.items.map((item) => {
                  const itemIndex = globalIdx++;
                  const Icon = item.icon;
                  const on = value === item.id;
                  const ripple = taps[item.id] ?? 0;

                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      data-sidebar-tab=""
                      onClick={() => choose(item.id)}
                      aria-current={on ? "page" : undefined}
                      aria-label={item.label}
                      title={
                        collapsed
                          ? `${item.label}${typeof item.count === "number" ? ` (${item.count})` : ""}`
                          : undefined
                      }
                      initial={still ? false : { opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileTap={still ? undefined : { scale: collapsed ? 0.88 : 0.97 }}
                      transition={{
                        opacity: { duration: 0.25, delay: still ? 0 : Math.min(itemIndex * 0.02, 0.24) },
                        x: { ...SPRING, delay: still ? 0 : Math.min(itemIndex * 0.02, 0.24) },
                      }}
                      className={cn(
                        "group relative flex cursor-pointer select-none items-center rounded-md outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#1E40AF]/40 dark:focus-visible:ring-[#4C8DF6]/50",
                        collapsed
                          ? "h-8 w-8 justify-center"
                          : "w-full justify-between px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0",
                        on
                          ? "text-[#1E40AF] dark:text-[#4C8DF6]"
                          : "text-[#0F172A] dark:text-[#9A9AA2] hover:text-[#1E40AF] dark:hover:text-[#ECECEE]",
                      )}
                    >
                      {/* Gliding active background capsule */}
                      {on && (
                        <motion.span
                          layoutId={`${uid}-sidebar-pill`}
                          transition={still ? { duration: 0 } : SPRING}
                          className="pointer-events-none absolute inset-0 z-0 rounded-md bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] border border-[#1E40AF]/15 dark:border-[rgba(76,141,246,0.28)] shadow-[0_1px_2px_rgba(30,64,175,0.06)] dark:shadow-none"
                        />
                      )}

                      {/* Gliding active left accent bar */}
                      {on && (
                        <motion.span
                          layoutId={`${uid}-sidebar-accent`}
                          transition={still ? { duration: 0 } : SPRING}
                          className="pointer-events-none absolute left-0 top-1.5 bottom-1.5 z-20 w-[2.5px] rounded-r bg-[#1E40AF] dark:bg-[#4C8DF6]"
                        />
                      )}

                      {/* Soft hover wash for inactive tabs */}
                      {!on && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 z-0 rounded-md bg-[#F1F5F9]/80 dark:bg-[#252528] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        />
                      )}

                      {collapsed ? (
                        <>
                          <span className="relative z-10 grid place-items-center">
                            <AnimatePresence>
                              {!still && ripple > 0 && (
                                <motion.span
                                  key={ripple}
                                  aria-hidden
                                  initial={{ scale: 0.4, opacity: 0.45 }}
                                  animate={{ scale: 2, opacity: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.55, ease: GLIDE }}
                                  className="pointer-events-none absolute size-5 rounded-full bg-[#1E40AF]/20 dark:bg-[rgba(76,141,246,0.22)]"
                                />
                              )}
                            </AnimatePresence>
                            <motion.span
                              key={ripple}
                              className="relative grid"
                              initial={ripple > 0 && !still ? { scale: 0.7, rotate: -14 } : false}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 520, damping: 11 }}
                            >
                              <Icon
                                className={cn(
                                  "w-3.5 h-3.5 shrink-0 transition-colors duration-200",
                                  on
                                    ? "text-[#1E40AF] dark:text-[#4C8DF6]"
                                    : "text-[#64748B] group-hover:text-[#1E40AF] dark:text-[#9A9AA2] dark:group-hover:text-[#ECECEE]",
                                )}
                              />
                            </motion.span>
                          </span>

                          {item.isLiveSync ? (
                            <span
                              className={cn(
                                "absolute top-1.5 right-1.5 z-20 w-1.5 h-1.5 rounded-full ring-2 ring-white dark:ring-[#161616]",
                                item.syncStatusColor ?? "bg-[#16A34A] dark:bg-[#34C26B]",
                              )}
                            />
                          ) : typeof item.count === "number" && item.count > 0 ? (
                            <span className="absolute top-1 right-1 z-20 w-1.5 h-1.5 rounded-full bg-[#1E40AF] dark:bg-[#4C8DF6] ring-2 ring-white dark:ring-[#161616]" />
                          ) : null}
                        </>
                      ) : (
                        <>
                          <span className="relative z-10 flex items-center gap-2 min-w-0 flex-1 pr-1.5">
                            <span className="relative grid place-items-center shrink-0">
                              <AnimatePresence>
                                {!still && ripple > 0 && (
                                  <motion.span
                                    key={ripple}
                                    aria-hidden
                                    initial={{ scale: 0.4, opacity: 0.45 }}
                                    animate={{ scale: 2, opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.55, ease: GLIDE }}
                                    className="pointer-events-none absolute size-5 rounded-full bg-[#1E40AF]/20 dark:bg-[rgba(76,141,246,0.22)]"
                                  />
                                )}
                              </AnimatePresence>
                              <motion.span
                                key={ripple}
                                className="relative grid"
                                initial={ripple > 0 && !still ? { scale: 0.7, rotate: -14 } : false}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 520, damping: 11 }}
                              >
                                <Icon
                                  className={cn(
                                    "w-3.5 h-3.5 shrink-0 transition-colors duration-200",
                                    on
                                      ? "text-[#1E40AF] dark:text-[#4C8DF6]"
                                      : "text-[#64748B] group-hover:text-[#1E40AF] dark:text-[#9A9AA2] dark:group-hover:text-[#ECECEE]",
                                  )}
                                />
                              </motion.span>
                            </span>
                            <motion.span
                              className={cn(
                                "truncate transition-colors duration-200",
                                on
                                  ? "font-semibold text-[#1E40AF] dark:text-[#4C8DF6]"
                                  : "text-[#0F172A] dark:text-[#9A9AA2] group-hover:text-[#1E40AF] dark:group-hover:text-[#ECECEE]",
                              )}
                              animate={{ x: on && !still ? 2 : 0 }}
                              transition={SPRING}
                            >
                              {item.label}
                            </motion.span>
                          </span>

                          <div className="relative z-10 flex items-center gap-1 shrink-0">
                            {item.isLiveSync && (
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  item.syncStatusColor ?? "bg-[#16A34A] dark:bg-[#34C26B]",
                                )}
                                title={item.syncTitle}
                              />
                            )}
                            <AnimatePresence mode="popLayout">
                              {typeof item.count === "number" && (
                                <motion.span
                                  key={item.count}
                                  initial={still ? false : { scale: 0.85, opacity: 0.6 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={still ? undefined : { scale: 0.8, opacity: 0 }}
                                  transition={POP}
                                  className={cn(
                                    "tabular-nums text-[10px] px-1.5 py-0.5 leading-none rounded-full font-medium transition-colors duration-200",
                                    on
                                      ? "bg-[#1E40AF]/12 text-[#1E40AF] dark:bg-[rgba(76,141,246,0.18)] dark:text-[#4C8DF6]"
                                      : item.count === 0
                                      ? "text-[#64748B] bg-[#F1F5F9] dark:bg-[#252528] dark:text-[#66666E]"
                                      : "text-[#64748B] bg-[#F1F5F9] dark:bg-[#252528] dark:text-[#9A9AA2]",
                                  )}
                                >
                                  {item.count}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                        </>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </LayoutGroup>
      </nav>
    );
  },
);


