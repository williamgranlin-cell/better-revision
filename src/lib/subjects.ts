// Centralized subjects list for the entire application
export interface SubjectGroup {
  label: string;
  subjects: { value: string; label: string }[];
}

export const SUBJECT_GROUPS: SubjectGroup[] = [
  {
    label: "📚 Lycée / Collège",
    subjects: [
      { value: "maths", label: "Mathématiques" },
      { value: "physique", label: "Physique-Chimie" },
      { value: "svt", label: "SVT" },
      { value: "francais", label: "Français" },
      { value: "histoire", label: "Histoire-Géographie" },
      { value: "anglais", label: "Anglais" },
      { value: "espagnol", label: "Espagnol" },
      { value: "allemand", label: "Allemand" },
      { value: "philosophie", label: "Philosophie" },
      { value: "ses", label: "SES" },
      { value: "nsi", label: "NSI (Numérique)" },
      { value: "arts", label: "Arts plastiques" },
      { value: "musique", label: "Musique" },
      { value: "eps", label: "EPS" },
    ],
  },
  {
    label: "🎓 Études Supérieures - Sciences",
    subjects: [
      { value: "analyse", label: "Analyse mathématique" },
      { value: "algebre", label: "Algèbre linéaire" },
      { value: "probabilites", label: "Probabilités & Statistiques" },
      { value: "mecanique", label: "Mécanique" },
      { value: "thermodynamique", label: "Thermodynamique" },
      { value: "electromagnetisme", label: "Électromagnétisme" },
      { value: "optique", label: "Optique" },
      { value: "quantique", label: "Physique quantique" },
      { value: "chimie-orga", label: "Chimie organique" },
      { value: "chimie-inorga", label: "Chimie inorganique" },
      { value: "biochimie", label: "Biochimie" },
      { value: "biologie-cell", label: "Biologie cellulaire" },
      { value: "genetique", label: "Génétique" },
      { value: "ecologie", label: "Écologie" },
      { value: "geologie", label: "Géologie" },
    ],
  },
  {
    label: "💻 Informatique & Tech",
    subjects: [
      { value: "algo", label: "Algorithmique" },
      { value: "programmation", label: "Programmation" },
      { value: "bdd", label: "Bases de données" },
      { value: "reseaux", label: "Réseaux" },
      { value: "securite", label: "Cybersécurité" },
      { value: "ia-ml", label: "IA & Machine Learning" },
      { value: "web", label: "Développement Web" },
      { value: "systemes", label: "Systèmes d'exploitation" },
      { value: "architecture", label: "Architecture des ordinateurs" },
    ],
  },
  {
    label: "💼 Commerce & Économie",
    subjects: [
      { value: "microeco", label: "Microéconomie" },
      { value: "macroeco", label: "Macroéconomie" },
      { value: "comptabilite", label: "Comptabilité" },
      { value: "finance", label: "Finance" },
      { value: "marketing", label: "Marketing" },
      { value: "management", label: "Management" },
      { value: "droit-affaires", label: "Droit des affaires" },
      { value: "rh", label: "Ressources humaines" },
      { value: "strategie", label: "Stratégie d'entreprise" },
    ],
  },
  {
    label: "⚖️ Droit",
    subjects: [
      { value: "droit-civil", label: "Droit civil" },
      { value: "droit-penal", label: "Droit pénal" },
      { value: "droit-constit", label: "Droit constitutionnel" },
      { value: "droit-admin", label: "Droit administratif" },
      { value: "droit-travail", label: "Droit du travail" },
      { value: "droit-euro", label: "Droit européen" },
      { value: "droit-intern", label: "Droit international" },
    ],
  },
  {
    label: "🏥 Médecine & Santé",
    subjects: [
      { value: "anatomie", label: "Anatomie" },
      { value: "physiologie", label: "Physiologie" },
      { value: "pharmacologie", label: "Pharmacologie" },
      { value: "pathologie", label: "Pathologie" },
      { value: "histologie", label: "Histologie" },
      { value: "immunologie", label: "Immunologie" },
      { value: "microbiologie", label: "Microbiologie" },
      { value: "neurologie", label: "Neurologie" },
      { value: "cardiologie", label: "Cardiologie" },
      { value: "psychiatrie", label: "Psychiatrie" },
    ],
  },
  {
    label: "📖 Lettres & Sciences Humaines",
    subjects: [
      { value: "litterature", label: "Littérature" },
      { value: "linguistique", label: "Linguistique" },
      { value: "psychologie", label: "Psychologie" },
      { value: "sociologie", label: "Sociologie" },
      { value: "anthropologie", label: "Anthropologie" },
      { value: "histoire-art", label: "Histoire de l'art" },
      { value: "geopolitique", label: "Géopolitique" },
      { value: "relations-inter", label: "Relations internationales" },
      { value: "sciences-po", label: "Sciences politiques" },
    ],
  },
  {
    label: "🔧 Ingénierie",
    subjects: [
      { value: "resistance", label: "Résistance des matériaux" },
      { value: "materiaux", label: "Science des matériaux" },
      { value: "electronique", label: "Électronique" },
      { value: "automatique", label: "Automatique" },
      { value: "signal", label: "Traitement du signal" },
      { value: "genie-civil", label: "Génie civil" },
      { value: "genie-chimique", label: "Génie chimique" },
      { value: "energetique", label: "Énergétique" },
    ],
  },
];

// Flat list of all subjects for simple select components
export const ALL_SUBJECTS = SUBJECT_GROUPS.flatMap((group) => group.subjects);

// Get subject label by value
export const getSubjectLabel = (value: string): string => {
  const subject = ALL_SUBJECTS.find((s) => s.value === value);
  return subject?.label || value;
};
