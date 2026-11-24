import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  useVelocity,
} from 'motion/react';
import { cn } from '../../lib/utils';

export interface RoundedSlidingTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  title?: string;
  disabled?: boolean;
}

interface RoundedSlidingTabsProps {
  tabs: RoundedSlidingTabItem[];
  value: string;
  onValueChange: (id: string) => void;
  stretch?: number;
  blur?: number;
  label?: string;
  variant?: 'cards' | 'segmented';
  className?: string;
  indicatorClassName?: string;
  buttonClassName?: string;
  activeButtonClassName?: string;
  inactiveButtonClassName?: string;
}

export const RoundedSlidingTabs: React.FC<RoundedSlidingTabsProps> = ({
  tabs,
  value,
  onValueChange,
  stretch = 0,
  blur = 10,
  label = 'Sections',
  variant = 'cards',
  className,
  indicatorClassName,
  buttonClassName,
  activeButtonClassName,
  inactiveButtonClassName,
}) => {
  const reduceMotion = !!useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const filterId = `rect-tab-blur-${uid}`;

  const trackRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const blurNode = useRef<SVGFEGaussianBlurElement>(null);
  const placed = useRef(false);

  const index = Math.max(
    0,
    tabs.findIndex((t) => t.id === value)
  );

  const [indicatorHeight, setIndicatorHeight] = useState(28);
  const [indicatorTop, setIndicatorTop] = useState(4);
  const left = useMotionValue(0);
  const width = useMotionValue(0);

  const center = useTransform([left, width], ([l, w]: number[]) => l + w / 2);
  const speed = useVelocity(center);

  useMotionValueEvent(speed, 'change', (v) => {
    const sd = blur > 0 && !reduceMotion ? Math.min(blur, Math.abs(v) / 420) : 0;
    blurNode.current?.setAttribute('stdDeviation', `${sd.toFixed(2)} 0`);
  });

  const moveTo = useCallback(
    (instant: boolean) => {
      const tab = tabRefs.current[index];
      if (!tab) return;

      const l = tab.offsetLeft;
      const w = tab.offsetWidth;
      const h = tab.offsetHeight;
      const t = tab.offsetTop;

      if (h > 0) {
        setIndicatorHeight(h);
        setIndicatorTop(t);
      }

      if (instant || reduceMotion) {
        left.set(l);
        width.set(w);
        return;
      }

      const amount = Math.min(1, Math.max(0, stretch));
      const mass = 0.8;
      const critical = (k: number) => 2 * Math.sqrt(k * mass);
      const leadStiffness = 640;
      const trailStiffness = 700 - 540 * amount;

      const spring = {
        type: 'spring' as const,
        stiffness: amount === 0 ? leadStiffness : trailStiffness,
        damping: critical(amount === 0 ? leadStiffness : trailStiffness) * 0.95,
        mass,
      };

      animate(left, l, spring);
      animate(width, w, spring);
    },
    [index, tabs.length, left, width, reduceMotion, stretch]
  );

  useLayoutEffect(() => {
    moveTo(!placed.current);
    placed.current = true;
  }, [moveTo, value]);

  useEffect(() => {
    const el = trackRef.current;
    const activeTabEl = tabRefs.current[index];
    if (!el) return;
    const ro = new ResizeObserver(() => moveTo(true));
    ro.observe(el);
    if (activeTabEl) ro.observe(activeTabEl);
    return () => ro.disconnect();
  }, [moveTo, index]);

  const focusTab = (nextIdx: number) => {
    const wrapped = (nextIdx + tabs.length) % tabs.length;
    const target = tabs[wrapped];
    if (!target || target.disabled) return;
    onValueChange(target.id);
    tabRefs.current[wrapped]?.focus();
  };

  const defaultTrackClass =
    variant === 'segmented'
      ? 'relative inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] text-xs max-w-full overflow-x-auto'
      : 'relative flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs';

  const defaultIndicatorClass =
    variant === 'segmented'
      ? 'rounded-md bg-white dark:bg-[#1C1C1E] dark:border dark:border-[#3A3A3F] shadow-xs dark:shadow-none'
      : 'rounded-md bg-blue-600 dark:bg-[#4C8DF6] shadow-xs dark:shadow-none';

  const defaultButtonBase =
    variant === 'segmented'
      ? 'relative inline-flex items-center justify-center gap-1.5 px-3 h-8 box-border rounded-md font-medium transition-colors duration-200 shrink-0 whitespace-nowrap'
      : 'relative inline-flex items-center gap-1.5 px-3 h-[28px] box-border rounded-md font-medium transition-colors duration-200 shrink-0 whitespace-nowrap';

  const defaultActiveBtn =
    variant === 'segmented'
      ? 'border border-transparent bg-transparent text-[#1E40AF] dark:text-[#4C8DF6] font-semibold'
      : 'border border-transparent bg-transparent text-white';

  const defaultInactiveBtn =
    variant === 'segmented'
      ? 'border border-transparent bg-transparent text-[#64748B] dark:text-[#9A9AA2] hover:text-[#0F172A] dark:hover:text-[#ECECEE]'
      : 'bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-[#2E2E32] text-slate-600 dark:text-[#9A9AA2] hover:bg-slate-50 dark:hover:bg-[#252528]';

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          focusTab(index + 1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          focusTab(index - 1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          focusTab(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          focusTab(tabs.length - 1);
        }
      }}
      className={cn(defaultTrackClass, className)}
    >
      <svg aria-hidden="true" className="absolute size-0 pointer-events-none">
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur ref={blurNode} stdDeviation="0 0" />
        </filter>
      </svg>

      {/* Sliding Rounded-Rectangle Active Indicator */}
      <motion.span
        aria-hidden="true"
        className={cn('pointer-events-none absolute left-0 z-10', defaultIndicatorClass, indicatorClassName)}
        style={{
          top: indicatorTop,
          height: indicatorHeight,
          x: left,
          width,
          filter: blur > 0 && !reduceMotion ? `url(#${filterId})` : undefined,
        }}
      />

      {tabs.map((tab, i) => {
        const active = i === index;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${tab.id}`}
            title={tab.title}
            disabled={tab.disabled}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(tab.id)}
            style={{ transform: 'none' }}
            className={cn(
              defaultButtonBase,
              buttonClassName,
              active
                ? cn(defaultActiveBtn, activeButtonClassName)
                : cn(defaultInactiveBtn, inactiveButtonClassName)
            )}
          >
            <span className="relative z-20 inline-flex items-center gap-1.5 tabular-nums">
              {tab.icon}
              <span>{tab.label}</span>
              {tab.trailing}
            </span>
          </button>
        );
      })}
    </div>
  );
};
