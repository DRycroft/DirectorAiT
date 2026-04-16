
/**
 * Lazy Loading Utilities
 * 
 * Utilities for code splitting and lazy loading components.
 * Improves initial bundle size and load time.
 */

import React, { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading fallback component
 */
const DefaultLoadingFallback = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFn);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || <DefaultLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyLoadWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries: number = 3,
  fallback?: React.ReactNode
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      const attemptImport = (retriesLeft: number) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (retriesLeft === 0) {
              reject(error);
              return;
            }
            
            console.warn(
              `Failed to load component, retrying... (${retriesLeft} attempts left)`
            );
            
            setTimeout(() => {
              attemptImport(retriesLeft - 1);
            }, 1000);
          });
      };

      attemptImport(retries);
    });
  });

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || <DefaultLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

export function preloadComponent(importFn: () => Promise<{ default: ComponentType<unknown> }>): void {
  importFn().catch((error) => {
    console.error('Failed to preload component:', error);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyRoute<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazyLoadWithRetry(importFn, 3, <DefaultLoadingFallback />);
}

export const LazyImage = React.memo(({
  src,
  alt,
  className,
  placeholder,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  placeholder?: string;
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      {!isLoaded && (
        <Skeleton className={className} />
      )}
      <img
        ref={imgRef}
        src={isInView ? src : placeholder}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setIsLoaded(true)}
        {...props}
      />
    </div>
  );
});

LazyImage.displayName = 'LazyImage';
