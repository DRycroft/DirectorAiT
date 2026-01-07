import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createQueryClient } from "@/lib/queryClient";
import { initWebVitals } from "@/lib/performance";
import { initCacheCleanup } from "@/lib/cache";

// Eagerly load landing and auth pages for fast initial load
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SignUp from "./pages/SignUp";
import AuthCallback from "./pages/AuthCallback";
import ActionLink from "./pages/ActionLink";
import NotFound from "./pages/NotFound";
import Health from "./pages/Health";

// Lazy load heavy/authenticated routes
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardBuilder = lazy(() => import("./pages/DashboardBuilder"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));
const Boards = lazy(() => import("./pages/Boards"));
const BoardDetail = lazy(() => import("./pages/BoardDetail"));
const BoardAndTeam = lazy(() => import("./pages/BoardAndTeam"));
const TeamOverview = lazy(() => import("./pages/TeamOverview"));
const BoardPapers = lazy(() => import("./pages/BoardPapers"));
const BoardPaperDocument = lazy(() => import("./pages/BoardPaperDocument"));
const MemberIntake = lazy(() => import("./pages/MemberIntake"));
const MemberInvite = lazy(() => import("./pages/MemberInvite"));
const MemberApproval = lazy(() => import("./pages/MemberApproval"));
const ExportTeam = lazy(() => import("./pages/ExportTeam"));
const BoardsAndCommittees = lazy(() => import("./pages/BoardsAndCommittees"));
const Settings = lazy(() => import("./pages/Settings"));
const Compliance = lazy(() => import("./pages/Compliance"));
const BoardLibrary = lazy(() => import("./pages/BoardLibrary"));
const PackManagement = lazy(() => import("./pages/PackManagement"));
const PackSections = lazy(() => import("./pages/PackSections"));
const ReportSubmission = lazy(() => import("./pages/ReportSubmission"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Create enhanced query client with optimized caching
const queryClient = createQueryClient();

const App = () => {
  // Initialize performance monitoring and cache cleanup
  useEffect(() => {
    // Initialize Web Vitals tracking
    initWebVitals();
    
    // Initialize cache cleanup (runs every 5 minutes)
    const cleanupCache = initCacheCleanup();
    
    // Cleanup on unmount
    return () => {
      cleanupCache();
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/builder" element={<DashboardBuilder />} />
            <Route path="/dashboard/executive" element={<ExecutiveDashboard />} />
            <Route path="/boards-committees" element={<BoardsAndCommittees />} />
            <Route path="/team" element={<TeamOverview />} />
            <Route path="/boards" element={<Boards />} />
            <Route path="/boards/:boardId" element={<BoardDetail />} />
            <Route path="/boards/:boardId/team" element={<BoardAndTeam />} />
            <Route path="/board-papers" element={<BoardPapers />} />
            <Route path="/board-papers/:id" element={<BoardPaperDocument />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/library" element={<BoardLibrary />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/member-intake" element={<MemberIntake />} />
            <Route path="/member-invite" element={<MemberInvite />} />
            <Route path="/member-approval/:memberId" element={<MemberApproval />} />
            <Route path="/export-team/:boardId" element={<ExportTeam />} />
            <Route path="/pack-management" element={<PackManagement />} />
            <Route path="/pack/:packId/sections" element={<PackSections />} />
            <Route path="/report-submission/:sectionId" element={<ReportSubmission />} />
            <Route path="/action/:token" element={<ActionLink />} />
            <Route path="/health" element={<Health />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
