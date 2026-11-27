// WeCare PMS — Morph Select Component
// Inline shared-element (layoutId) morphing dropdown with spring physics

import { Check, ChevronDown } from 'lucide-react';
import {
  LayoutGroup,
  motion,
  type Transition,
  useReducedMotion,
} from 'motion/react';
import {
  Children,
  createContext,
  isValidElement,
  type ReactNode,
  type RefObject,
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

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return Children.toArray(node).map(extractText).join('');
}

const MORPH_SPRING: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 30,
  mass: 0.9,
};

const MORPH_RETURN_SPRING: Transition = {
  type: 'spring',
  stiffness: 190,
  damping: 26,
  mass: 1.05,
};

const ROW =
  'h-9 flex w-full items-center justify-between gap-2 px-3 text-xs leading-none box-border';

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
  morphId: string;
  triggerId: string;
  listId: string;
  disabled: boolean;
  wrapperRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(defaultValue);
  const [labels, setLabels] = useState<
    Map<string, { label: string; count: number }>
  >(new Map());
  const [placeholder, setPlaceholder] = useState('Select');

  const cancelCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleCloseTimer = useCallback(() => {
    cancelCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, 2000);
  }, [cancelCloseTimer]);

  useEffect(() => {
    if (!open) {
      cancelCloseTimer();
    }
  }, [open, cancelCloseTimer]);

  useEffect(() => {
    return () => cancelCloseTimer();
  }, [cancelCloseTimer]);

  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const select = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next);
      onValueChange?.(next);
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    },
    [controlled, onValueChange],
  );

  const register = useCallback((v: string, label: string) => {
    setLabels((m) => {
      const existing = m.get(v);
      if (existing && existing.label === label) {
        const next = new Map(m);
        next.set(v, { label, count: existing.count + 1 });
        return next;
      }
      const next = new Map(m);
      next.set(v, { label, count: (existing?.count ?? 0) + 1 });
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
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
      morphId: `${baseId}-morph-surface`,
      triggerId: `${baseId}-trigger`,
      listId: `${baseId}-list`,
      disabled,
      wrapperRef,
      triggerRef,
      panelRef,
    }),
    [current, open, select, register, unregister, labels, placeholder, reduce, baseId, disabled],
  );

  return (
    <LayoutGroup id={baseId}>
      <MorphContext.Provider value={ctx}>
        <div
          ref={wrapperRef}
          onMouseEnter={cancelCloseTimer}
          onMouseLeave={() => {
            if (open) scheduleCloseTimer();
          }}
          className={cn(
            'relative w-full h-9 box-border min-w-0',
            open && 'z-40',
            className,
          )}
        >
          {children}
        </div>
      </MorphContext.Provider>
    </LayoutGroup>
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
        'min-w-0 truncate block text-left',
        label ? 'text-[#0F172A] dark:text-[#ECECEE]' : 'text-[#64748B] dark:text-[#9A9AA2]',
        className,
      )}
    >
      {label ?? placeholder ?? 'Select'}
    </span>
  );
}

export interface MorphSelectTriggerProps {
  className?: string;
  'aria-label'?: string;
  children: ReactNode;
}

export function MorphSelectTrigger({ className, 'aria-label': ariaLabel, children }: MorphSelectTriggerProps) {
  const ctx = useMorphContext('MorphSelectTrigger');

  if (ctx.open) {
    return null;
  }

  return (
    <motion.button
      ref={ctx.triggerRef}
      layoutId={ctx.morphId}
      transition={ctx.reduce ? { duration: 0 } : MORPH_RETURN_SPRING}
      style={{ borderRadius: 8 }}
      type="button"
      id={ctx.triggerId}
      disabled={ctx.disabled}
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={false}
      aria-controls={ctx.listId}
      onClick={() => ctx.setOpen(true)}
      className={cn(
        ROW,
        'rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32]',
        'bg-white dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE]',
        'outline-none transition-colors duration-150 cursor-pointer',
        'hover:border-[#1E40AF] dark:hover:border-[#4C8DF6]',
        'focus-visible:ring-2 focus-visible:ring-[#1E40AF] dark:focus-visible:ring-[#4C8DF6] focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      <motion.span
        layout="position"
        transition={ctx.reduce ? { duration: 0 } : MORPH_RETURN_SPRING}
        className="min-w-0 truncate text-left flex-1 block"
      >
        {children}
      </motion.span>
      <ChevronDown className="h-3.5 w-3.5 text-[#64748B] dark:text-[#9A9AA2] shrink-0 ml-1 transition-transform duration-300" />
    </motion.button>
  );
}

export interface MorphSelectContentProps {
  className?: string;
  children: ReactNode;
}

export function MorphSelectContent({ className, children }: MorphSelectContentProps) {
  const ctx = useMorphContext('MorphSelectContent');
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [maxListHeight, setMaxListHeight] = useState<number>(224);

  useLayoutEffect(() => {
    if (!ctx.open) return;
    const wrapper = ctx.wrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const margin = 12;
    const headerHeight = 36;
    const spaceBelow = viewportH - rect.top - headerHeight - margin;
    const spaceAbove = rect.bottom - headerHeight - margin;

    const flipTop = spaceBelow < 160 && spaceAbove > spaceBelow;
    const available = Math.max(108, Math.min(224, flipTop ? spaceAbove : spaceBelow));

    setPlacement(flipTop ? 'top' : 'bottom');
    setMaxListHeight(available);
  }, [ctx.open, ctx.wrapperRef]);

  if (!ctx.open) {
    return (
      <ul className="hidden" aria-hidden="true">
        {children}
      </ul>
    );
  }

  const activeLabel = ctx.labelFor(ctx.value);

  const headerRow = (
    <button
      type="button"
      onClick={() => {
        ctx.setOpen(false);
        requestAnimationFrame(() => ctx.triggerRef.current?.focus());
      }}
      className={cn(
        ROW,
        'text-left outline-none cursor-pointer transition-colors',
        'bg-white dark:bg-[#252528] hover:bg-[#F8FAFC] dark:hover:bg-[#2E2E32]',
        placement === 'bottom'
          ? 'border-b border-[#E2E8F0] dark:border-[#2E2E32]'
          : 'border-t border-[#E2E8F0] dark:border-[#2E2E32]',
      )}
    >
      <motion.span
        layout="position"
        className={cn(
          'min-w-0 truncate text-left flex-1 block font-medium',
          activeLabel
            ? 'text-[#0F172A] dark:text-[#ECECEE]'
            : 'text-[#64748B] dark:text-[#9A9AA2]',
        )}
      >
        {activeLabel ?? ctx.placeholder}
      </motion.span>
      <ChevronDown className="h-3.5 w-3.5 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0 ml-1 rotate-180 transition-transform duration-150" />
    </button>
  );

  const optionsList = (
    <motion.ul
      id={ctx.listId}
      role="listbox"
      aria-labelledby={ctx.triggerId}
      initial={ctx.reduce ? { opacity: 1 } : { opacity: 0, y: placement === 'bottom' ? -4 : 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ctx.reduce ? { duration: 0 } : { duration: 0.14, ease: [0.16, 1, 0.3, 1], delay: 0.02 }}
      style={{ maxHeight: maxListHeight }}
      className="p-1 overflow-y-auto overscroll-contain space-y-0.5"
    >
      {children}
    </motion.ul>
  );

  return (
    <motion.div
      ref={ctx.panelRef}
      layoutId={ctx.morphId}
      transition={ctx.reduce ? { duration: 0 } : MORPH_SPRING}
      style={{ borderRadius: 8 }}
      className={cn(
        'absolute left-0 right-0 z-[70] overflow-hidden rounded-lg',
        placement === 'bottom' ? 'top-0' : 'bottom-0',
        'border border-[#1E40AF]/40 dark:border-[#3A3A3F]',
        'bg-white dark:bg-[#1C1C1E]',
        'shadow-xl ring-2 ring-[#1E40AF]/10 dark:shadow-none dark:ring-0',
        className,
      )}
    >
      {placement === 'bottom' ? (
        <>
          {headerRow}
          {optionsList}
        </>
      ) : (
        <>
          {optionsList}
          {headerRow}
        </>
      )}
    </motion.div>
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
  const extracted = extractText(children).trim();
  const label = extracted || value;

  useLayoutEffect(() => {
    ctx.register(value, label);
    return () => ctx.unregister(value);
  }, [ctx.register, ctx.unregister, value, label]);

  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        disabled={disabled}
        onClick={() => ctx.select(value)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-xs outline-none transition-colors cursor-pointer',
          selected
            ? 'bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] text-[#1E40AF] dark:text-[#4C8DF6] font-medium'
            : 'text-[#64748B] dark:text-[#9A9AA2] hover:bg-[#F8FAFC] dark:hover:bg-[#252528] hover:text-[#0F172A] dark:hover:text-[#ECECEE]',
          'disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
      >
        <span className="truncate">{children}</span>
        {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#1E40AF] dark:text-[#4C8DF6]" /> : null}
      </button>
    </li>
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
