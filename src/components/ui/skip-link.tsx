
/**
 * Skip Link Component
 * 
 * Provides a skip-to-content link for keyboard users.
 * Required for WCAG 2.1 AA compliance.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Skip Link component for keyboard navigation
 * Becomes visible when focused
 */
export const SkipLink = React.memo(({
  href = '#main-content',
  children = 'Skip to main content',
  className,
}: SkipLinkProps) => {
  return (
    <a
      href={href}
      className={cn(
        // Hidden by default
        'sr-only',
        // Visible when focused
        'focus:not-sr-only',
        'focus:absolute',
        'focus:top-4',
        'focus:left-4',
        'focus:z-50',
        'focus:px-4',
        'focus:py-2',
        'focus:bg-primary',
        'focus:text-primary-foreground',
        'focus:rounded-md',
        'focus:shadow-lg',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-ring',
        'focus:ring-offset-2',
        'transition-all',
        className
      )}
    >
      {children}
    </a>
  );
});

SkipLink.displayName = 'SkipLink';
