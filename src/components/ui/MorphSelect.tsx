// WeCare PMS — Morph Select Component
// Adapted from beui.dev/components/motion/select for this project's design tokens

import { Check, ChevronDown } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
  type Variants,
} from 'motion/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// Shared-layout morph transition
const MORPH: Transition = { type: 'spring', duration: 0.5, bounce: 0.22 };

// Trigger and panel header share this row so the morph stays seamless.
const ROW =
  'flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-sm';

const LIST: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.08 } },
};
const ITEM: Variants = {
  hidden: { opacity: 0, y: -6, filter: 'blur(3px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

interface MorphContextValue {
  value: string | undefined;
  open: boolean;
  setOpen: (open: boolean) => void;
  select: (value: string) => void;
  register: (value: string, label: string) => void;
  unregister: (value: string) => void;
  labelFor: (value: string | undefined) => string | undefined;
  placeholder: string;
  setPlaceholder: (p: string) => void;
  reduce: boolean;
  layoutId: string;
  triggerId: string;
  listId: string;
  disabled: boolean;
}

const MorphContext = createContext<MorphContextValue | null>(null);

function useMorphContext(component: string) {
  const ctx = useContext(MorphContext);
  if (!ctx) throw new Error(`${component} must be used within <MorphSelect>`);
  return ctx;
}

export interface MorphSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function MorphSelect({
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
  children,
}: MorphSelectProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(defaultValue);
  const [labels, setLabels] = useState<
    Map<string, { label: string; count: number }>
  >(new Map());
  const [placeholder, setPlaceholder] = useState('Select');

  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const select = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next);
      onValueChange?.(next);
      setOpen(false);
    },
    [controlled, onValueChange],
  );

  const register = useCallback((v: string, label: string) => {
    setLabels((m) => {
      const next = new Map(m);
      next.set(v, { label, count: (m.get(v)?.count ?? 0) + 1 });
      return next;
    });
  }, []);

  const unregister = useCallback((v: string) => {
    setLabels((m) => {
      const entry = m.get(v);
      if (!entry) return m;
      const next = new Map(m);
      if (entry.count <= 1) next.delete(v);
      else next.set(v, { label: entry.label, count: entry.count - 1 });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const ctx = useMemo<MorphContextValue>(
    () => ({
      value: current,
      open,
      setOpen,
      select,
      register,
      unregister,
      labelFor: (v) => (v === undefined ? undefined : labels.get(v)?.label),
      placeholder,
      setPlaceholder,
      reduce,
      layoutId: `${baseId}-surface`,
      triggerId: `${baseId}-trigger`,
      listId: `${baseId}-list`,
      disabled,
    }),
    [current, open, select, register, unregister, labels, placeholder, reduce, baseId, disabled],
  );

  return (
    <MorphContext.Provider value={ctx}>
      <div ref={rootRef} className={cn('relative', className)}>
        {children}
      </div>
    </MorphContext.Provider>
  );
}

export interface MorphSelectValueProps {
  placeholder?: string;
  className?: string;
}

export function MorphSelectValue({ placeholder, className }: MorphSelectValueProps) {
  const ctx = useMorphContext('MorphSelectValue');
  useEffect(() => {
    if (placeholder) ctx.setPlaceholder(placeholder);
  }, [placeholder, ctx.setPlaceholder]);
  const label = ctx.labelFor(ctx.value);
  return (
    <span
      className={cn(
        label ? 'text-[#172B4D] dark:text-slate-100' : 'text-[#899BB1] dark:text-slate-500',
        className,
      )}
    >
      {label ?? placeholder ?? 'Select'}
    </span>
  );
}

export interface MorphSelectTriggerProps {
  className?: string;
  children: ReactNode;
}

export function MorphSelectTrigger({ className, children }: MorphSelectTriggerProps) {
  const ctx = useMorphContext('MorphSelectTrigger');
  return (
    <>
      {/* invisible sizer — keeps surrounding layout from shifting when the morph panel is absolute */}
      <div
        aria-hidden
        className={cn(ROW, 'invisible rounded-xl border border-[#E3EAF3] dark:border-slate-700')}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0" />
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {!ctx.open ? (
          <motion.button
            key="trigger"
            layoutId={ctx.layoutId}
            type="button"
            id={ctx.triggerId}
            disabled={ctx.disabled}
            aria-haspopup="listbox"
            aria-expanded={ctx.open}
            aria-controls={ctx.listId}
            onClick={() => ctx.setOpen(true)}
            transition={ctx.reduce ? { duration: 0 } : MORPH}
            style={{ borderRadius: 10 }}
            className={cn(
              ROW,
              'absolute inset-x-0 top-0 z-10 border border-[#E3EAF3] dark:border-slate-700',
              'bg-white dark:bg-slate-800 text-[#172B4D] dark:text-slate-100',
              'outline-none transition-colors cursor-pointer',
              'hover:border-[#1769E8] dark:hover:border-blue-500',
              'focus-visible:ring-2 focus-visible:ring-[#1769E8]/20',
              'disabled:pointer-events-none disabled:opacity-50',
              className,
            )}
          >
            <motion.span layout="position" className="min-w-0 truncate text-left">
              {children}
            </motion.span>
            <motion.span layout="position" className="text-[#899BB1] dark:text-slate-400 shrink-0">
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export interface MorphSelectContentProps {
  className?: string;
  children: ReactNode;
}

export function MorphSelectContent({ className, children }: MorphSelectContentProps) {
  const ctx = useMorphContext('MorphSelectContent');
  const label = ctx.labelFor(ctx.value);
  return (
    <>
      {/* always-mounted hidden copy — keeps item registrations alive while closed */}
      <div className="hidden">{children}</div>

      <AnimatePresence initial={false} mode="popLayout">
        {ctx.open ? (
          <motion.div
            key="panel"
            layoutId={ctx.layoutId}
            id={ctx.listId}
            role="listbox"
            aria-labelledby={ctx.triggerId}
            transition={ctx.reduce ? { duration: 0 } : MORPH}
            style={{ borderRadius: 10 }}
            className={cn(
              'absolute inset-x-0 top-0 z-50 overflow-hidden',
              'border border-[#E3EAF3] dark:border-slate-700',
              'bg-white dark:bg-slate-800',
              'shadow-xl',
              className,
            )}
          >
            {/* header mirrors the trigger — click collapses back */}
            <motion.button
              type="button"
              layout="position"
              aria-expanded
              onClick={() => ctx.setOpen(false)}
              className={cn(ROW, 'outline-none hover:bg-[#F4F2EE] dark:hover:bg-slate-700/50 transition-colors')}
            >
              <span
                className={cn(
                  'min-w-0 truncate',
                  label
                    ? 'text-[#172B4D] dark:text-slate-100'
                    : 'text-[#899BB1] dark:text-slate-500',
                )}
              >
                {label ?? ctx.placeholder}
              </span>
              <motion.span
                animate={{ rotate: 180 }}
                transition={ctx.reduce ? { duration: 0 } : MORPH}
                className="text-[#899BB1] dark:text-slate-400 shrink-0"
              >
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </motion.button>

            <div className="h-px bg-[#E3EAF3] dark:bg-slate-700" />

            <motion.ul
              initial="hidden"
              animate="show"
              variants={ctx.reduce ? undefined : LIST}
              className="p-1 max-h-56 overflow-y-auto"
            >
              {children}
            </motion.ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export interface MorphSelectItemProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function MorphSelectItem({
  value,
  disabled = false,
  className,
  children,
}: MorphSelectItemProps) {
  const ctx = useMorphContext('MorphSelectItem');
  const selected = ctx.value === value;
  const label = typeof children === 'string' ? children : value;

  useLayoutEffect(() => {
    ctx.register(value, label);
    return () => ctx.unregister(value);
  }, [ctx.register, ctx.unregister, value, label]);

  return (
    <motion.li variants={ctx.reduce ? undefined : ITEM}>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        disabled={disabled}
        onClick={() => ctx.select(value)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none transition-colors',
          selected
            ? 'bg-[#DCEBFF] dark:bg-blue-900/40 text-[#1769E8] dark:text-blue-300 font-medium'
            : 'text-[#5E718D] dark:text-slate-400 hover:bg-[#F4F2EE] dark:hover:bg-slate-700/60 hover:text-[#172B4D] dark:hover:text-slate-100',
          'disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
      >
        <span className="truncate">{children}</span>
        {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#1769E8] dark:text-blue-400" /> : null}
      </button>
    </motion.li>
  );
}

export default MorphSelect;

export {
  MorphSelect as Select,
  MorphSelectTrigger as SelectTrigger,
  MorphSelectValue as SelectValue,
  MorphSelectContent as SelectContent,
  MorphSelectItem as SelectItem,
};
