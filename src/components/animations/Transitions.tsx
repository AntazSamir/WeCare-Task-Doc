import React, { createContext, useContext, forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
  type HTMLMotionProps,
} from 'motion/react';
import {
  animationDurations,
  animationEasings,
  animationScales,
  animationDistances,
  animationStaggers,
} from '../../animations/tokens';
import { cn } from '../../lib/utils';

// ─── 1. PageTransition ──────────────────────────────────────────────────────
export interface PageTransitionProps extends HTMLMotionProps<'div'> {
  viewKey?: string | number;
  direction?: 'up' | 'down' | 'none';
  duration?: number;
  children: React.ReactNode;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  (
    {
      viewKey,
      direction = 'up',
      duration = animationDurations.moderate,
      className = '',
      children,
      style,
      ...rest
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const yOffset =
      shouldReduceMotion || direction === 'none'
        ? 0
        : direction === 'up'
        ? animationDistances.sm
        : -animationDistances.sm;

    return (
      <motion.div
        key={viewKey}
        ref={ref}
        initial={{ opacity: 0, y: yOffset }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -yOffset }}
        transition={{
          duration: shouldReduceMotion ? 0.001 : duration,
          ease: animationEasings.standard,
        }}
        style={{ willChange: 'opacity, transform', ...style }}
        className={className}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);
PageTransition.displayName = 'PageTransition';

// ─── 2. TabTransition ───────────────────────────────────────────────────────
export interface TabTransitionProps extends HTMLMotionProps<'div'> {
  viewKey?: string | number;
  duration?: number;
  children: React.ReactNode;
}

export const TabTransition = forwardRef<HTMLDivElement, TabTransitionProps>(
  (
    {
      viewKey,
      duration = animationDurations.fast,
      className = '',
      children,
      style,
      ...rest
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.div
        key={viewKey}
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0.001 : duration,
          ease: animationEasings.standard,
        }}
        style={{ willChange: 'opacity', ...style }}
        className={className}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);
TabTransition.displayName = 'TabTransition';

// ─── 3. FadeTransition ──────────────────────────────────────────────────────
export interface FadeTransitionProps extends HTMLMotionProps<'div'> {
  show?: boolean;
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}

export const FadeTransition = forwardRef<HTMLDivElement, FadeTransitionProps>(
  (
    {
      show = true,
      duration = animationDurations.normal,
      delay = 0,
      className = '',
      children,
      style,
      ...rest
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();

    if (!show) return null;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0.001 : duration,
          delay: shouldReduceMotion ? 0 : delay,
          ease: animationEasings.out,
        }}
        style={{ willChange: 'opacity', ...style }}
        className={className}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);
FadeTransition.displayName = 'FadeTransition';

// Ref-counted body scroll lock with scrollbar-width compensation to prevent background jumps
let activeScrollLocks = 0;
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return;
    if (activeScrollLocks === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      savedBodyOverflow = document.body.style.overflow;
      savedBodyPaddingRight = document.body.style.paddingRight;
      if (scrollbarWidth > 0) {
        const computedPadding = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
        document.body.style.paddingRight = `${computedPadding + scrollbarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
    }
    activeScrollLocks += 1;

    return () => {
      activeScrollLocks = Math.max(0, activeScrollLocks - 1);
      if (activeScrollLocks === 0) {
        document.body.style.overflow = savedBodyOverflow;
        document.body.style.paddingRight = savedBodyPaddingRight;
      }
    };
  }, [locked]);
}

// ─── 4. ModalTransition ─────────────────────────────────────────────────────
export interface ModalTransitionProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  backdropClassName?: string;
  cardClassName?: string;
  className?: string;
  containerClassName?: string;
}

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  isOpen,
  onClose,
  children,
  backdropClassName = 'fixed inset-0 bg-[#1E3A8A]/40 dark:bg-black/75 backdrop-blur-xs',
  cardClassName = 'w-full max-w-lg rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] shadow-2xl dark:shadow-none',
  containerClassName = 'fixed inset-0 z-50 flex justify-center p-4 overflow-y-auto scrollbar-stable',
}) => {
  const shouldReduceMotion = useReducedMotion();
  useBodyScrollLock(isOpen);

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div
          className={containerClassName}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0.001 : animationDurations.fast,
              ease: animationEasings.out,
            }}
            onClick={onClose}
            className={cn(backdropClassName, 'fixed inset-0 z-40')}
            aria-hidden="true"
          />

          {/* Modal Card */}
          <motion.div
            initial={{
              opacity: 0,
              scale: shouldReduceMotion ? 1 : animationScales.modalInitial,
            }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: shouldReduceMotion ? 1 : animationScales.modalInitial,
            }}
            transition={{
              duration: shouldReduceMotion ? 0.001 : animationDurations.normal,
              ease: animationEasings.standard,
            }}
            style={{ willChange: 'opacity, transform' }}
            className={cn(cardClassName, 'relative z-[60] my-auto')}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

// ─── 5. DrawerTransition ────────────────────────────────────────────────────
export interface DrawerTransitionProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  side?: 'right' | 'left';
  backdropClassName?: string;
  panelClassName?: string;
}

export const DrawerTransition: React.FC<DrawerTransitionProps> = ({
  isOpen,
  onClose,
  children,
  side = 'right',
  backdropClassName = 'fixed inset-0 z-50 bg-[#1E3A8A]/40 dark:bg-black/75 backdrop-blur-xs',
  panelClassName = 'fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-[#1C1C1E] border-l border-[#E2E8F0] dark:border-[#2E2E32] shadow-2xl dark:shadow-none z-50 flex flex-col',
}) => {
  const shouldReduceMotion = useReducedMotion();
  useBodyScrollLock(isOpen);
  const initialOffset = side === 'right' ? '100%' : '-100%';

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0.001 : animationDurations.fast,
              ease: animationEasings.out,
            }}
            onClick={onClose}
            className={cn(backdropClassName, 'fixed inset-0 z-50')}
            aria-hidden="true"
          />

          {/* Slideout Panel */}
          <motion.div
            initial={{ x: shouldReduceMotion ? 0 : initialOffset }}
            animate={{ x: 0 }}
            exit={{ x: shouldReduceMotion ? 0 : initialOffset }}
            transition={{
              duration: shouldReduceMotion ? 0.001 : animationDurations.slow,
              ease: animationEasings.standard,
            }}
            style={{ willChange: 'transform' }}
            className={cn(panelClassName, 'z-[60]')}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

// ─── 6. DropdownTransition ──────────────────────────────────────────────────
export interface DropdownTransitionProps extends HTMLMotionProps<'div'> {
  isOpen?: boolean;
  align?: 'left' | 'right' | 'center';
  children: React.ReactNode;
}

export const DropdownTransition = forwardRef<HTMLDivElement, DropdownTransitionProps>(
  (
    {
      isOpen = true,
      align = 'right',
      className = '',
      children,
      style,
      ...rest
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const transformOrigin =
      align === 'right' ? 'top right' : align === 'center' ? 'top center' : 'top left';

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={ref}
            initial={{
              opacity: 0,
              scale: shouldReduceMotion ? 1 : animationScales.dropdownInitial,
              y: shouldReduceMotion ? 0 : -6,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: shouldReduceMotion ? 1 : animationScales.dropdownInitial,
              y: shouldReduceMotion ? 0 : -6,
              transition: {
                duration: shouldReduceMotion ? 0.001 : 0.36,
                ease: animationEasings.standard,
              },
            }}
            transition={{
              duration: shouldReduceMotion ? 0.001 : animationDurations.fast,
              ease: animationEasings.standard,
            }}
            style={{
              transformOrigin,
              willChange: 'opacity, transform',
              ...style,
            }}
            className={className}
            {...rest}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
DropdownTransition.displayName = 'DropdownTransition';

// ─── 7. CollapseTransition ──────────────────────────────────────────────────
export interface CollapseTransitionProps {
  isOpen: boolean;
  children: React.ReactNode;
  duration?: number;
  className?: string;
}

export const CollapseTransition: React.FC<CollapseTransitionProps> = ({
  isOpen,
  children,
  duration = animationDurations.normal,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{
            height: 0,
            opacity: 0,
          }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: {
              height: {
                duration: shouldReduceMotion ? 0.001 : duration,
                ease: animationEasings.inOut,
              },
              opacity: {
                duration: shouldReduceMotion ? 0.001 : duration * 0.8,
                ease: animationEasings.standard,
              },
            },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: {
              height: {
                duration: shouldReduceMotion ? 0.001 : duration * 0.85,
                ease: animationEasings.inOut,
              },
              opacity: {
                duration: shouldReduceMotion ? 0.001 : duration * 0.5,
              },
            },
          }}
          style={{ overflow: 'hidden' }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── 8. StaggerContainer & StaggerItem ───────────────────────────────────────
interface StaggerContextValue {
  staggerDelay: number;
}
const StaggerContext = createContext<StaggerContextValue>({
  staggerDelay: animationStaggers.normal,
});

export interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  staggerDelay?: number;
  delayChildren?: number;
  children: React.ReactNode;
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  (
    {
      staggerDelay = animationStaggers.normal,
      delayChildren = 0,
      className = '',
      children,
      ...rest
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();

    const containerVariants: Variants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
          delayChildren: shouldReduceMotion ? 0 : delayChildren,
        },
      },
    };

    return (
      <StaggerContext.Provider value={{ staggerDelay }}>
        <motion.div
          ref={ref}
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className={className}
          {...rest}
        >
          {children}
        </motion.div>
      </StaggerContext.Provider>
    );
  }
);
StaggerContainer.displayName = 'StaggerContainer';

export interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ className = '', children, style, ...rest }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    const itemVariants: Variants = {
      hidden: {
        opacity: 0,
        y: shouldReduceMotion ? 0 : animationDistances.sm,
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: shouldReduceMotion ? 0.001 : animationDurations.normal,
          ease: animationEasings.standard,
        },
      },
    };

    return (
      <motion.div
        ref={ref}
        variants={itemVariants}
        style={{ willChange: 'opacity, transform', ...style }}
        className={className}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerItem.displayName = 'StaggerItem';

// ─── 9. ToastTransition ─────────────────────────────────────────────────────
export interface ToastTransitionProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const ToastTransition = forwardRef<HTMLDivElement, ToastTransitionProps>(
  (
    {
      children,
      position = 'bottom-right',
      className = '',
      style,
      ...rest
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const isTop = position.startsWith('top');
    const yOffset = isTop ? -animationDistances.md : animationDistances.md;

    return (
      <motion.div
        ref={ref}
        initial={{
          opacity: 0,
          y: shouldReduceMotion ? 0 : yOffset,
          scale: shouldReduceMotion ? 1 : animationScales.dropdownInitial,
        }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{
          opacity: 0,
          y: shouldReduceMotion ? 0 : yOffset * 0.75,
          scale: shouldReduceMotion ? 1 : animationScales.dropdownInitial,
        }}
        transition={{
          duration: shouldReduceMotion ? 0.001 : animationDurations.normal,
          ease: animationEasings.standard,
        }}
        style={{ willChange: 'opacity, transform', ...style }}
        className={className}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);
ToastTransition.displayName = 'ToastTransition';
