import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap } from 'lucide-react';

/**
 * Global splash shown while the auth session is being restored.
 * Prevents any flash/re-render of protected routes or the /auth page
 * during the initial auth check.
 */
export const AuthSplash = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useAuth();

  if (!loading) return <>{children}</>;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Vérification de votre session"
      className="min-h-screen w-full flex items-center justify-center bg-background"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="font-display text-lg font-semibold">Révisions IA</p>
          <p className="text-sm text-muted-foreground">Vérification de votre session…</p>
        </div>
        <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] bg-primary/70" />
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(120%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
    </div>
  );
};
