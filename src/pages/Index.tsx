import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Security from "@/components/Security";
import PilotProgram from "@/components/PilotProgram";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <Security />
      <PilotProgram />
      <Footer />
    </div>
  );
};

export default Index;
