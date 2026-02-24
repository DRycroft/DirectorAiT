import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { createQueryClient } from "@/lib/queryClient";
import { initWebVitals } from "@/lib/performance";
import { initCacheCleanup } from "@/lib/cache";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Eagerly load landing and auth pages for fast initial load
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SignUp from "./pages/SignUp";
import AuthCallback from "./pages/AuthCallback";
import ActionLink from "./pages/ActionLink";
import NotFound from "./pages/NotFound";
import Health from "./pages/Health";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

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

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

// Create enhanced query client with optimized caching
const queryClient = createQueryClient();

const App = () => {
  useEffect(() => {
    initWebVitals();
    const cleanupCache = initCacheCleanup();
    return () => {
      cleanupCache?.();
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/auth/reset-password" element={<ResetPassword />} />
                  <Route path="/action/:token" element={<ActionLink />} />
                  <Route path="/health" element={<Health />} />

                  {/* Protected routes */}
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/builder" element={<ProtectedRoute><DashboardBuilder /></ProtectedRoute>} />
                  <Route path="/dashboard/executive" element={<ProtectedRoute><ExecutiveDashboard /></ProtectedRoute>} />
                  <Route path="/boards-committees" element={<ProtectedRoute><BoardsAndCommittees /></ProtectedRoute>} />
                  <Route path="/team" element={<ProtectedRoute><TeamOverview /></ProtectedRoute>} />
                  <Route path="/boards" element={<ProtectedRoute><Boards /></ProtectedRoute>} />
                  <Route path="/boards/:boardId" element={<ProtectedRoute><BoardDetail /></ProtectedRoute>} />
                  <Route path="/boards/:boardId/team" element={<ProtectedRoute><BoardAndTeam /></ProtectedRoute>} />
                  <Route path="/board-papers" element={<ProtectedRoute><BoardPapers /></ProtectedRoute>} />
                  <Route path="/board-papers/:id" element={<ProtectedRoute><BoardPaperDocument /></ProtectedRoute>} />
                  <Route path="/compliance" element={<ProtectedRoute><Compliance /></ProtectedRoute>} />
                  <Route path="/library" element={<ProtectedRoute><BoardLibrary /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/member-intake" element={<ProtectedRoute><MemberIntake /></ProtectedRoute>} />
                  <Route path="/member-invite" element={<ProtectedRoute><MemberInvite /></ProtectedRoute>} />
                  <Route path="/member-approval/:memberId" element={<ProtectedRoute><MemberApproval /></ProtectedRoute>} />
                  <Route path="/export-team/:boardId" element={<ProtectedRoute><ExportTeam /></ProtectedRoute>} />
                  <Route path="/pack-management" element={<ProtectedRoute><PackManagement /></ProtectedRoute>} />
                  <Route path="/pack/:packId/sections" element={<ProtectedRoute><PackSections /></ProtectedRoute>} />
                  <Route path="/report-submission/:sectionId" element={<ProtectedRoute><ReportSubmission /></ProtectedRoute>} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
