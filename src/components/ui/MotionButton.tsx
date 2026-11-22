import React, { forwardRef } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { animationEasings } from '../../animations/tokens';

export interface MotionButtonProps extends HTMLMotionProps<'button'> {
  disableMotion?: boolean;
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  (
    {
      disabled,
      disableMotion = false,
      whileHover,
      whileTap,
      transition,
      type = 'button',
      children,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const isInteractive = !disabled && !disableMotion && !shouldReduceMotion;

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled}
        whileHover={isInteractive ? (whileHover ?? { scale: 1.02 }) : undefined}
        whileTap={isInteractive ? (whileTap ?? { scale: 0.98 }) : undefined}
        transition={transition ?? animationEasings.springSnappy}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

MotionButton.displayName = 'MotionButton';
