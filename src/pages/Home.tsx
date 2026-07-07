import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useObjectives } from "@/hooks/useObjectives";
import { useControls } from "@/hooks/useControls";
import { useCourses } from "@/hooks/useCourses";
import { useAuth } from "@/contexts/AuthContext";

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

const SHORTCUTS = [
  { to: "/flashcards", label: "Flashcards" },
  { to: "/qcm", label: "QCM" },
  { to: "/revision-generator", label: "Fiches" },
  { to: "/study-chat", label: "Aide IA" },
] as const;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const Home = () => {
  const { user } = useAuth();
  const { getTotalStudyTime, getStudyStreak } = useStudySessions();
  const { objectives } = useObjectives();
  const { controls } = useControls();
  const { courses, getRevisionEvents } = useCourses();

  const totalMinutes = getTotalStudyTime();
  const streak = getStudyStreak();
  const completedObjectives = objectives.filter((o) => o.completed).length;
  const totalObjectives = objectives.length;
  const completionPct =
    totalObjectives === 0 ? 0 : Math.round((completedObjectives / totalObjectives) * 100);
  const activeCourses = courses.length;

  const today = new Date().toISOString().split("T")[0];
  const todayRevisions = getRevisionEvents().filter((e) => e.date === today).slice(0, 3);

  const upcomingControls = [...controls]
    .filter((c) => new Date(c.date) >= new Date(today))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 2);

  const focusObjective = objectives.find((o) => !o.completed);

  const now = new Date();
  const dateLabel = capitalize(
    now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
  );

  const firstName =
    (user?.user_metadata?.first_name as string | undefined)?.trim() ||
    (user?.email ? user.email.split("@")[0] : "toi");

  return (
    <PageTransition>
      <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-[hsl(var(--muted))]">
        <main className="mx-auto max-w-6xl px-6 md:px-12 py-10 md:py-16 pb-32">
          {/* Editorial masthead */}
          <header className="mb-12 md:mb-16">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-neutral-500">
              <span>{dateLabel}</span>
              <span className="hidden sm:inline">Édition personnelle — nº {streak.toString().padStart(2, "0")}</span>
            </div>
            <div className="mt-6 border-t border-neutral-300/70" />
            <h1
              className="mt-8 text-4xl sm:text-5xl md:text-6xl italic tracking-tight text-neutral-900"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Bonjour, {capitalize(firstName)}.
            </h1>
            <p
              className="mt-3 text-base md:text-lg text-neutral-600 max-w-xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              La discipline se fabrique une page après l'autre. Voici la tienne pour aujourd'hui.
            </p>

            {/* KPI ledger */}
            <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-8 border-y border-neutral-300/70 py-6">
              {[
                { v: formatTime(totalMinutes), k: "Temps de révision" },
                { v: `${streak}${streak > 1 ? " jours" : " jour"}`, k: "Série actuelle" },
                { v: `${completionPct}%`, k: "Objectifs remplis" },
                { v: activeCourses.toString(), k: "Cours actifs" },
              ].map((item) => (
                <div key={item.k}>
                  <dd className="block text-2xl md:text-3xl font-semibold text-neutral-900 tracking-tight">
                    {item.v}
                  </dd>
                  <dt className="mt-1 text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                    {item.k}
                  </dt>
                </div>
              ))}
            </dl>
          </header>

          {/* Bento */}
          <div className="grid grid-cols-12 gap-5 md:gap-6 auto-rows-[minmax(120px,auto)]">
            {/* Révisions du jour — bloc principal */}
            <section className="col-span-12 lg:col-span-8 lg:row-span-2 bg-white border border-neutral-200 p-8 md:p-10 flex flex-col min-h-[420px]">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                    Chapitre I
                  </p>
                  <h2
                    className="mt-2 text-3xl md:text-4xl italic text-neutral-900"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Révisions du jour
                  </h2>
                </div>
                <span className="text-[10px] px-3 py-1 border border-neutral-800 rounded-full uppercase tracking-widest">
                  {todayRevisions.length > 0 ? "À traiter" : "Repos"}
                </span>
              </div>

              <div className="flex-1 divide-y divide-neutral-200/80">
                {todayRevisions.length === 0 ? (
                  <p
                    className="text-neutral-500 italic text-lg py-6"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Aucune révision prévue aujourd'hui — profites-en pour prendre de l'avance.
                  </p>
                ) : (
                  todayRevisions.map((r, i) => (
                    <div key={i} className="py-5 first:pt-0">
                      <div className="flex items-baseline justify-between gap-4 mb-1.5">
                        <div className="flex items-baseline gap-4 min-w-0">
                          <span className="text-xs text-neutral-400 tabular-nums">
                            {(i + 1).toString().padStart(2, "0")}
                          </span>
                          <h3 className="text-lg md:text-xl font-medium truncate text-neutral-900">
                            {r.courseName}
                          </h3>
                        </div>
                        <span className="text-xs text-neutral-500 whitespace-nowrap">
                          Révision nº {r.revisionNumber}
                        </span>
                      </div>
                      <p className="pl-9 text-sm text-neutral-500">
                        Session planifiée dans le calendrier J+X.
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  to="/classroom"
                  className="inline-block px-8 py-3 bg-neutral-900 text-[hsl(var(--background))] text-sm font-medium hover:bg-neutral-700 transition-colors"
                >
                  Commencer une session
                </Link>
                <Link
                  to="/calendar"
                  className="relative text-sm text-neutral-700 hover:text-neutral-900 after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:bg-neutral-800 after:origin-right after:scale-x-0 hover:after:origin-left hover:after:scale-x-100 after:transition-transform after:duration-300"
                >
                  Voir le calendrier
                </Link>
              </div>
            </section>

            {/* Prochains contrôles */}
            <section className="col-span-12 sm:col-span-6 lg:col-span-4 border border-neutral-200 p-7 min-h-[210px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 font-semibold">
                  Prochains contrôles
                </h3>
                <Link
                  to="/controls"
                  className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Tous
                </Link>
              </div>
              {upcomingControls.length === 0 ? (
                <p className="text-sm text-neutral-500">Aucun contrôle à venir.</p>
              ) : (
                <ul className="space-y-5">
                  {upcomingControls.map((c) => {
                    const d = new Date(c.date);
                    return (
                      <li key={c.id} className="flex items-center gap-4">
                        <div className="w-11 h-11 border border-neutral-300 flex flex-col items-center justify-center leading-none">
                          <span
                            className="text-sm italic font-medium text-neutral-900"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {d.getDate()}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-neutral-500 mt-0.5">
                            {d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-neutral-900">{c.name}</p>
                          <p className="text-[11px] text-neutral-500 truncate">{c.subject}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Accès rapide — grille de cellules */}
            <section className="col-span-12 sm:col-span-6 lg:col-span-4 grid grid-cols-2 gap-px bg-neutral-200 border border-neutral-200 min-h-[210px]">
              {SHORTCUTS.map((s, i) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="group bg-[hsl(var(--background))] p-5 hover:bg-neutral-200 transition-colors flex flex-col justify-between"
                >
                  <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                    {(i + 1).toString().padStart(2, "0")}
                  </span>
                  <div className="flex items-end justify-between">
                    <span
                      className="text-lg italic text-neutral-900"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {s.label}
                    </span>
                    <span className="text-lg text-neutral-500 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </section>

            {/* Objectif en cours — bandeau */}
            <section className="col-span-12 lg:col-span-8 border border-neutral-200 p-7 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="min-w-0">
                <h3 className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 font-semibold mb-2">
                  Objectif en cours
                </h3>
                <p
                  className="text-xl md:text-2xl italic text-neutral-900 truncate"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {focusObjective ? focusObjective.text : "Tous tes objectifs sont accomplis."}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-40 md:w-52 h-px bg-neutral-300 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-neutral-900"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <span
                  className="text-sm italic tabular-nums text-neutral-900"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {completionPct}%
                </span>
                <Link
                  to="/classroom"
                  className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Gérer
                </Link>
              </div>
            </section>

            {/* Colophon — signature discrète */}
            <section className="col-span-12 lg:col-span-4 border border-neutral-200 p-7 flex flex-col justify-between min-h-[140px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 font-semibold">
                Colophon
              </p>
              <p
                className="mt-4 text-base italic text-neutral-700 leading-snug"
                style={{ fontFamily: "var(--font-display)" }}
              >
                « Repetitio est mater studiorum. »
              </p>
              <p className="mt-3 text-[11px] text-neutral-500">
                La répétition est la mère de l'étude.
              </p>
            </section>
          </div>
        </main>

        <ScrollToTop />
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Home;
