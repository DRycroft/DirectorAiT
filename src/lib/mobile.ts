
/**
 * Mobile Optimization Utilities
 * 
 * Utilities for detecting mobile devices, handling touch events,
 * and optimizing mobile user experience.
 */

/**
 * Detect if the device is mobile
 * 
 * @returns Whether the device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Detect if the device is a tablet
 * 
 * @returns Whether the device is a tablet
 */
export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent);
  
  return isTablet;
}

/**
 * Detect if the device supports touch
 * 
 * @returns Whether the device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Get viewport dimensions
 * 
 * @returns Viewport width and height
 */
export function getViewportDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

/**
 * Check if viewport is in portrait orientation
 * 
 * @returns Whether the viewport is in portrait orientation
 */
export function isPortrait(): boolean {
  const { width, height } = getViewportDimensions();
  return height > width;
}

/**
 * Check if viewport is in landscape orientation
 * 
 * @returns Whether the viewport is in landscape orientation
 */
export function isLandscape(): boolean {
  return !isPortrait();
}

/**
 * Prevent default touch behavior (useful for custom gestures)
 * 
 * @param element - Element to prevent default touch behavior on
 * @returns Cleanup function
 */
export function preventDefaultTouch(element: HTMLElement): () => void {
  const handler = (e: TouchEvent) => {
    e.preventDefault();
  };
  
  element.addEventListener('touchstart', handler, { passive: false });
  element.addEventListener('touchmove', handler, { passive: false });
  
  return () => {
    element.removeEventListener('touchstart', handler);
    element.removeEventListener('touchmove', handler);
  };
}

/**
 * Detect swipe gesture
 * 
 * @param element - Element to detect swipe on
 * @param callback - Callback function with swipe direction
 * @returns Cleanup function
 * 
 * @example
 * ```typescript
 * const cleanup = detectSwipe(element, (direction) => {
 *   console.log('Swiped:', direction);
 * });
 * ```
 */
export function detectSwipe(
  element: HTMLElement,
  callback: (direction: 'left' | 'right' | 'up' | 'down') => void,
  threshold: number = 50
): () => void {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  };

  const handleSwipe = () => {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // Check if swipe is significant enough
    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
      return;
    }

    // Determine direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      callback(deltaX > 0 ? 'right' : 'left');
    } else {
      // Vertical swipe
      callback(deltaY > 0 ? 'down' : 'up');
    }
  };

  element.addEventListener('touchstart', handleTouchStart);
  element.addEventListener('touchend', handleTouchEnd);

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

/**
 * Detect pinch gesture (for zoom)
 * 
 * @param element - Element to detect pinch on
 * @param callback - Callback function with scale factor
 * @returns Cleanup function
 */
export function detectPinch(
  element: HTMLElement,
  callback: (scale: number) => void
): () => void {
  let initialDistance = 0;

  const getDistance = (touches: TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance = getDistance(e.touches);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && initialDistance > 0) {
      const currentDistance = getDistance(e.touches);
      const scale = currentDistance / initialDistance;
      callback(scale);
    }
  };

  element.addEventListener('touchstart', handleTouchStart);
  element.addEventListener('touchmove', handleTouchMove);

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
  };
}

/**
 * Optimize images for mobile
 * Returns appropriate image size based on device
 * 
 * @param baseUrl - Base image URL
 * @param sizes - Available image sizes
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  sizes: { mobile: string; tablet: string; desktop: string }
): string {
  const { width } = getViewportDimensions();
  
  if (width < 768) {
    return sizes.mobile;
  } else if (width < 1024) {
    return sizes.tablet;
  } else {
    return sizes.desktop;
  }
}

/**
 * Add haptic feedback (vibration) on touch devices
 * 
 * @param pattern - Vibration pattern (duration in ms or array of durations)
 */
export function hapticFeedback(pattern: number | number[] = 10): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Detect if device is in standalone mode (installed PWA)
 * 
 * @returns Whether the app is running as installed PWA
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Get safe area insets for devices with notches
 * 
 * @returns Safe area insets
 */
export function getSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
  };
}
