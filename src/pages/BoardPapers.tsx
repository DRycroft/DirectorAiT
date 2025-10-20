import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { BoardPaperTemplateBuilder } from "@/components/BoardPaperTemplateBuilder";

const BoardPapers = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Board Papers</h1>
          <p className="text-muted-foreground">
            Set up and manage your board paper templates
          </p>
        </div>
        <BoardPaperTemplateBuilder />
      </main>
      <Footer />
    </div>
  );
};

export default BoardPapers;
