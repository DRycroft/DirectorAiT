import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SignUp from "./pages/SignUp";
import BoardLibrary from "./pages/BoardLibrary";
import Dashboard from "./pages/Dashboard";
import DashboardBuilder from "./pages/DashboardBuilder";
import Boards from "./pages/Boards";
import BoardDetail from "./pages/BoardDetail";
import BoardAndTeam from "./pages/BoardAndTeam";
import TeamOverview from "./pages/TeamOverview";
import BoardPapers from "./pages/BoardPapers";
import BoardPaperDocument from "./pages/BoardPaperDocument";
import MemberIntake from "./pages/MemberIntake";
import MemberInvite from "./pages/MemberInvite";
import MemberApproval from "./pages/MemberApproval";
import ExportTeam from "./pages/ExportTeam";
import BoardsAndCommittees from "./pages/BoardsAndCommittees";
import Settings from "./pages/Settings";
import Compliance from "./pages/Compliance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/builder" element={<DashboardBuilder />} />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
