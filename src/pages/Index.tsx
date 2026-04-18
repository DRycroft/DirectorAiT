import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HistoricalContext from "@/components/HistoricalContext";
import Security from "@/components/Security";
import PilotProgram from "@/components/PilotProgram";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, loading, isBootstrapping } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isBootstrapping && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, isBootstrapping, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <HistoricalContext />
      <Security />
      <PilotProgram />
      <Footer />
    </div>
  );
};

export default Index;
