'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type ThemeSelection = 'light' | 'dark' | 'system';

export interface ThemeTogglerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: ThemeSelection | string;
  resolvedTheme?: 'light' | 'dark' | string;
  setTheme?: (theme: ThemeSelection) => void;
  modes?: ThemeSelection[];
  variant?: string;
  size?: string;
  children?: React.ReactNode;
}

export interface ThemeTogglerButtonIconProps {
  light?: React.ReactNode;
  dark?: React.ReactNode;
}

const ThemeTogglerButtonContext = React.createContext<{
  resolvedTheme?: 'light' | 'dark' | string;
}>({});

export const ThemeTogglerButtonIcon: React.FC<ThemeTogglerButtonIconProps> = ({ light, dark }) => {
  const context = React.useContext(ThemeTogglerButtonContext);
  const isDark = context.resolvedTheme === 'dark';

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={isDark ? 'dark' : 'light'}
        initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className="inline-flex items-center justify-center"
      >
        {isDark ? dark : light}
      </motion.span>
    </AnimatePresence>
  );
};

export const ThemeTogglerButton = React.forwardRef<HTMLButtonElement, ThemeTogglerButtonProps>(
  (
    {
      theme = 'light',
      resolvedTheme = 'light',
      setTheme,
      modes = ['light', 'dark'],
      variant,
      size,
      className = '',
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick) {
        onClick(e);
      }
      if (setTheme) {
        const nextMode = resolvedTheme === 'dark' ? 'light' : 'dark';
        setTheme(nextMode);
      }
    };

    return (
      <ThemeTogglerButtonContext.Provider value={{ resolvedTheme }}>
        <button
          ref={ref}
          onClick={handleClick}
          className={`inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer ${className}`}
          {...props}
        >
          {children}
        </button>
      </ThemeTogglerButtonContext.Provider>
    );
  }
);

ThemeTogglerButton.displayName = 'ThemeTogglerButton';
