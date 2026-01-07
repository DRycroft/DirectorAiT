import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BoardsManagement from "@/components/settings/BoardsManagement";

export default function BoardsAndCommittees() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-24 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Boards & Committees</h1>
          <p className="text-muted-foreground">
            Manage main boards, sub-committees, and special purpose committees across your organization
          </p>
        </div>
        <BoardsManagement />
      </main>
      <Footer />
    </div>
  );
}
