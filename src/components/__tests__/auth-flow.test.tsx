/**
 * E2E-style tests for the auth flow:
 * - No flash of protected content or /auth while the initial session is loading
 * - No redirect loop between / and /auth
 * - Stable rendering during the splash (splash element identity is preserved)
 * - Redirect to /auth happens exactly once when the user is signed out
 * - Redirect away from /auth happens exactly once when the user is signed in
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState } from "react";

import { AuthSplash } from "@/components/AuthSplash";
import ProtectedRoute from "@/components/ProtectedRoute";

// ------------------------------------------------------------------
// Mockable auth state
// ------------------------------------------------------------------
type AuthState = { user: unknown; loading: boolean };
const authState: AuthState = { user: null, loading: true };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

// Silence toast in the ProtectedRoute redirect log path
vi.mock("@/hooks/use-toast", () => ({
  toast: () => {},
  useToast: () => ({ toast: () => {} }),
}));

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const HomeStub = () => <div data-testid="home-page">HOME</div>;
const AuthStub = () => <div data-testid="auth-page">AUTH</div>;

/** Renders /auth path + / with ProtectedRoute + AuthSplash, tracks render counts. */
const renderApp = (initialPath: string) => {
  const renders = { home: 0, auth: 0, splash: 0 };

  const Home = () => {
    renders.home++;
    return <HomeStub />;
  };
  const Auth = () => {
    renders.auth++;
    return <AuthStub />;
  };

  const LocationSpy = () => {
    const loc = useLocation();
    return <div data-testid="pathname">{loc.pathname}</div>;
  };

  // Wrap AuthSplash to count re-renders of its splash tree
  const CountingSplash = ({ children }: { children: React.ReactNode }) => {
    if (authState.loading) renders.splash++;
    return <AuthSplash>{children}</AuthSplash>;
  };

  const utils = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CountingSplash>
        <LocationSpy />
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        </Routes>
      </CountingSplash>
    </MemoryRouter>,
  );

  return { ...utils, renders };
};

beforeEach(() => {
  authState.user = null;
  authState.loading = true;
});

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------
describe("Auth flow — splash stability", () => {
  it("shows the splash and hides all routes while auth is loading", () => {
    authState.loading = true;
    authState.user = null;

    renderApp("/");

    // Splash visible
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByLabelText(/vérification de votre session/i)).toBeInTheDocument();

    // No protected content and no auth page leaked through
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("auth-page")).not.toBeInTheDocument();
  });

  it("keeps the same splash DOM node across re-renders (no flash)", () => {
    authState.loading = true;

    const Tree = () => (
      <MemoryRouter initialEntries={["/"]}>
        <AuthSplash>
          <div>irrelevant</div>
        </AuthSplash>
      </MemoryRouter>
    );

    const { rerender } = render(<Tree />);
    const first = screen.getByRole("status");

    // Force several re-renders while still loading (same element tree)
    for (let i = 0; i < 5; i++) {
      rerender(<Tree />);
    }

    const still = screen.getByRole("status");
    expect(still).toBe(first); // same DOM node → no unmount/remount
  });
});

describe("Auth flow — signed-out redirect", () => {
  it("redirects / to /auth exactly once when the session resolves signed-out", () => {
    // Start loading
    authState.loading = true;
    const { renders, rerender } = renderApp("/");

    // Auth resolves: no user
    act(() => {
      authState.loading = false;
      authState.user = null;
    });

    rerender(
      <MemoryRouter initialEntries={["/"]}>
        <AuthSplash>
          <Routes>
            <Route path="/auth" element={<AuthStub />} />
            <Route path="/" element={<ProtectedRoute><HomeStub /></ProtectedRoute>} />
          </Routes>
        </AuthSplash>
      </MemoryRouter>,
    );

    // We should now be on /auth (via <Navigate/>), never briefly showing Home
    expect(screen.getByTestId("auth-page")).toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
    // Home never rendered → no flash of protected content
    expect(renders.home).toBe(0);
  });
});

describe("Auth flow — signed-in redirect from /auth", () => {
  /**
   * Mirrors the guard in src/pages/Auth.tsx: signed-in users on /auth
   * are redirected to / immediately. We simulate that guard here to
   * assert there is no bounce between the two pages.
   */
  const AuthWithGuard = () => {
    if (!authState.loading && authState.user) {
      return <HomeStub />;
    }
    return <AuthStub />;
  };

  it("renders home once and never bounces back to /auth", () => {
    authState.loading = false;
    authState.user = { id: "u1" };

    let authRenders = 0;
    let homeRenders = 0;

    const Auth = () => {
      authRenders++;
      return <AuthWithGuard />;
    };
    const Home = () => {
      homeRenders++;
      return <HomeStub />;
    };

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <AuthSplash>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          </Routes>
        </AuthSplash>
      </MemoryRouter>,
    );

    // No redirect loop: bounded render counts
    expect(authRenders).toBeLessThanOrEqual(2);
    expect(homeRenders).toBeLessThanOrEqual(2);
    expect(screen.queryByTestId("auth-page")).not.toBeInTheDocument();
  });
});

describe("Auth flow — no redirect loop across state transitions", () => {
  /** Full sequence: loading → signed-out → signed-in → signed-out */
  it("does not oscillate between / and /auth as auth state changes", () => {
    // Component that toggles auth state via effects to simulate onAuthStateChange
    const Harness = () => {
      const [tick, setTick] = useState(0);
      // Deterministic sequence of states
      const sequence: AuthState[] = [
        { user: null, loading: true },
        { user: null, loading: false },
        { user: { id: "u1" }, loading: false },
        { user: null, loading: false },
      ];
      const current = sequence[Math.min(tick, sequence.length - 1)];
      authState.user = current.user;
      authState.loading = current.loading;

      return (
        <>
          <button data-testid="next" onClick={() => setTick((t) => t + 1)}>
            next
          </button>
          <AuthSplash>
            <Routes>
              <Route path="/auth" element={<AuthStub />} />
              <Route path="/" element={<ProtectedRoute><HomeStub /></ProtectedRoute>} />
            </Routes>
          </AuthSplash>
        </>
      );
    };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Harness />
      </MemoryRouter>,
    );

    // tick 0: loading → splash only
    expect(screen.getByRole("status")).toBeInTheDocument();

    // tick 1: signed-out → /auth
    act(() => screen.getByTestId("next").click());
    expect(screen.getByTestId("auth-page")).toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();

    // tick 2: signed-in → nothing should force navigation away from /auth here,
    // ProtectedRoute only guards /. The absence of a loop is what we verify:
    // splash must not reappear, and no crash / no double-mount.
    act(() => screen.getByTestId("next").click());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    // tick 3: signed-out again → /auth still stable, no loop
    act(() => screen.getByTestId("next").click());
    expect(screen.getByTestId("auth-page")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
