
/**
 * Accessibility Utilities
 * 
 * Utilities for improving accessibility and WCAG 2.1 AA compliance.
 * Includes keyboard navigation, focus management, and ARIA helpers.
 */

/**
 * Trap focus within a container (useful for modals/dialogs)
 * 
 * @param container - The container element to trap focus within
 * @returns Cleanup function to remove event listeners
 * 
 * @example
 * ```typescript
 * const cleanup = trapFocus(dialogElement);
 * // When dialog closes:
 * cleanup();
 * ```
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Focus first element
  firstFocusable?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Announce message to screen readers
 * 
 * @param message - Message to announce
 * @param priority - Priority level ('polite' or 'assertive')
 * 
 * @example
 * ```typescript
 * announceToScreenReader('Form submitted successfully', 'polite');
 * ```
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if an element is visible to screen readers
 * 
 * @param element - Element to check
 * @returns Whether the element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  
  return !(
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    element.getAttribute('aria-hidden') === 'true' ||
    element.hasAttribute('hidden')
  );
}

/**
 * Get all focusable elements within a container
 * 
 * @param container - Container element
 * @returns Array of focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  return Array.from(elements).filter(el => isVisibleToScreenReader(el));
}

/**
 * Restore focus to a previously focused element
 * Useful when closing modals/dialogs
 * 
 * @param element - Element to restore focus to
 */
export function restoreFocus(element: HTMLElement | null): void {
  if (element && typeof element.focus === 'function') {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      element.focus();
    }, 0);
  }
}

/**
 * Create a focus trap manager for modals/dialogs
 * 
 * @example
 * ```typescript
 * const focusTrap = createFocusTrap();
 * 
 * // When opening modal
 * focusTrap.activate(modalElement);
 * 
 * // When closing modal
 * focusTrap.deactivate();
 * ```
 */
export function createFocusTrap() {
  let cleanup: (() => void) | null = null;
  let previouslyFocused: HTMLElement | null = null;

  return {
    activate(container: HTMLElement) {
      // Store currently focused element
      previouslyFocused = document.activeElement as HTMLElement;
      
      // Trap focus
      cleanup = trapFocus(container);
    },
    
    deactivate() {
      // Remove focus trap
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
      
      // Restore focus
      restoreFocus(previouslyFocused);
      previouslyFocused = null;
    },
  };
}

/**
 * Check color contrast ratio between two colors
 * 
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @returns Contrast ratio
 * 
 * @example
 * ```typescript
 * const ratio = getContrastRatio('#000000', '#FFFFFF');
 * console.log(ratio); // 21 (perfect contrast)
 * ```
 */
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const [rs, gs, bs] = [r, g, b].map(c => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 * 
 * @param ratio - Contrast ratio
 * @param isLargeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns Whether the contrast meets WCAG AA standards
 */
export function meetsWCAGAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 * 
 * @param ratio - Contrast ratio
 * @param isLargeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns Whether the contrast meets WCAG AAA standards
 */
export function meetsWCAGAAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Generate a unique ID for accessibility purposes
 * Useful for aria-labelledby, aria-describedby, etc.
 * 
 * @param prefix - Prefix for the ID
 * @returns Unique ID
 */
let idCounter = 0;
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

/**
 * Keyboard navigation helper
 * Handles arrow key navigation for lists, menus, etc.
 * 
 * @param event - Keyboard event
 * @param items - Array of items to navigate
 * @param currentIndex - Current focused index
 * @param options - Navigation options
 * @returns New index
 */
export function handleArrowKeyNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  options: {
    loop?: boolean;
    horizontal?: boolean;
  } = {}
): number {
  const { loop = true, horizontal = false } = options;
  const { key } = event;

  const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
  const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';

  if (key === nextKey) {
    event.preventDefault();
    const nextIndex = currentIndex + 1;
    if (nextIndex >= items.length) {
      return loop ? 0 : currentIndex;
    }
    items[nextIndex]?.focus();
    return nextIndex;
  }

  if (key === prevKey) {
    event.preventDefault();
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      return loop ? items.length - 1 : currentIndex;
    }
    items[prevIndex]?.focus();
    return prevIndex;
  }

  if (key === 'Home') {
    event.preventDefault();
    items[0]?.focus();
    return 0;
  }

  if (key === 'End') {
    event.preventDefault();
    const lastIndex = items.length - 1;
    items[lastIndex]?.focus();
    return lastIndex;
  }

  return currentIndex;
}
