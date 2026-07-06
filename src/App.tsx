import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeBackground } from "./components/ThemeBackground";
import { useThemeCustomization } from "./hooks/useThemeCustomization";
import ProtectedRoute from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Classroom from "./pages/Classroom";
import Flashcards from "./pages/Flashcards";
import Controls from "./pages/Controls";
import Profile from "./pages/Profile";
import StudyChat from "./pages/StudyChat";
import Schedule from "./pages/Schedule";
import Admin from "./pages/Admin";
import RevisionGenerator from "./pages/RevisionGenerator";
import CoursNotes from "./pages/CoursNotes";
import QCM from "./pages/QCM";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthSplash } from "./components/AuthSplash";

const queryClient = new QueryClient();

const ThemedApp = ({ children }: { children: React.ReactNode }) => {
  // Initializes the chosen theme + applies CSS vars (background image, colors).
  useThemeCustomization();
  return (
    <>
      <ThemeBackground />
      {children}
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <ThemedApp>
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <AuthSplash>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                <Route path="/classroom" element={<ProtectedRoute><Classroom /></ProtectedRoute>} />
                <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
                <Route path="/controls" element={<ProtectedRoute><Controls /></ProtectedRoute>} />
                <Route path="/study-chat" element={<ProtectedRoute><StudyChat /></ProtectedRoute>} />
                <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/revision-generator" element={<ProtectedRoute><RevisionGenerator /></ProtectedRoute>} />
                <Route path="/cours" element={<ProtectedRoute><CoursNotes /></ProtectedRoute>} />
                <Route path="/qcm" element={<ProtectedRoute><QCM /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </AuthSplash>
            </BrowserRouter>
            </ThemedApp>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
