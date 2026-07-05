import Home from "./Home";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { BottomNav } from "@/components/BottomNav";
import { WelcomeHeader } from "@/components/WelcomeHeader";
import { ProfileDashboard } from "@/components/ProfileDashboard";
import { useHomePreference } from "@/hooks/useHomePreference";

/**
 * Route `/`: renders either the classic Home page or the dashboard hub,
 * depending on the user's preference (set from the Profile page).
 */
const HomeRoute = () => {
  const { preference } = useHomePreference();

  if (preference === "home") return <Home />;

  return (
    <PageTransition>
      <div className="min-h-screen pb-24 bg-background">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4">
            <WelcomeHeader />
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Tableau de bord
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Toutes tes sections d'étude à portée de main
            </p>
          </div>
        </header>
        <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
          <ProfileDashboard />
        </main>
        <ScrollToTop />
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default HomeRoute;
