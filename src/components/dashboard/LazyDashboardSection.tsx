import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Lazy load dashboard sections
export const LazyBoardPulseSection = lazy(() => 
  import("./sections/BoardPulseSection").then(m => ({ default: m.BoardPulseSection }))
);

export const LazyFinancialSection = lazy(() => 
  import("./sections/FinancialSection").then(m => ({ default: m.FinancialSection }))
);

export const LazyGovernanceSection = lazy(() => 
  import("./sections/GovernanceSection").then(m => ({ default: m.GovernanceSection }))
);

export const LazyPeopleSection = lazy(() => 
  import("./sections/PeopleSection").then(m => ({ default: m.PeopleSection }))
);

export const LazyHealthSafetySection = lazy(() => 
  import("./sections/HealthSafetySection").then(m => ({ default: m.HealthSafetySection }))
);

export const LazyCustomersSalesSection = lazy(() => 
  import("./sections/CustomersSalesSection").then(m => ({ default: m.CustomersSalesSection }))
);

// Loading skeleton for dashboard sections
export const DashboardSectionSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-1/3" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </CardContent>
  </Card>
);

// HOC to wrap sections with Suspense
export const withLazySectionLoader = (Component: React.ComponentType<any>) => {
  return (props: any) => (
    <Suspense fallback={<DashboardSectionSkeleton />}>
      <Component {...props} />
    </Suspense>
  );
};
