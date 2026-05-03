/**
 * Affiche une image de fond floutée + un voile semi-transparent (couleur du thème)
 * derrière TOUT le contenu de l'app. Le composant est purement décoratif.
 */
export function ThemeBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        backgroundImage: "var(--bg-image)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        // Note: filter is applied via a child to avoid affecting children of this div
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "var(--bg-image)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(18px) saturate(1.05)",
          transform: "scale(1.08)", // évite les bords flous visibles
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "hsl(var(--bg-overlay))",
        }}
      />
    </div>
  );
}
