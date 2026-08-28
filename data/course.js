// English A1 → C2 (for Spanish speakers) — course data root.
// Each data/lesson-NN.js file pushes one lesson into window.COURSE.lessons.
// Loaded via <script> tags in index.html (no fetch, so it works from file://).
// Field convention: items carry `en` (English term) and `es` (Spanish gloss).
window.COURSE = window.COURSE || { lessons: [] };

// CEFR levels, in order, with a short Spanish "can-do" summary for the dashboard.
window.COURSE.levels = [
  { code: "A1", name: "Principiante",        blurb: "Lo básico para sobrevivir: saludar, presentarte, usar números, la hora, la comida y preguntas sencillas." },
  { code: "A2", name: "Elemental",           blurb: "Hablar del pasado y de tu rutina, comprar, describir el clima y la salud, expresar gustos." },
  { code: "B1", name: "Intermedio",          blurb: "Usar el present perfect y los condicionales, narrar, dar opiniones, manejar viajes y trabajo." },
  { code: "B2", name: "Intermedio alto",     blurb: "Debatir, usar la voz pasiva y el estilo indirecto, dominar los tiempos perfectos, hablar de la sociedad." },
  { code: "C1", name: "Avanzado",            blurb: "Argumentar con matices, usar conectores y modismos, leer prensa y literatura, elegir bien las palabras." },
  { code: "C2", name: "Dominio",             blurb: "Dominar el estilo, el registro, las variedades regionales, la ironía y la sutileza casi nativa." }
];

// Unit groupings used to organise the sidebar navigation (two per level).
window.COURSE.units = [
  { name: "A1 · Unidad 1 — Primeros pasos",          level: "A1", ids: ["00", "01", "02", "03", "04"] },
  { name: "A1 · Unidad 2 — Lo cotidiano",            level: "A1", ids: ["05", "06", "07", "08", "09"] },
  { name: "A2 · Unidad 3 — Hablar del pasado",       level: "A2", ids: ["10", "11", "12", "13", "14"] },
  { name: "A2 · Unidad 4 — Vida diaria",             level: "A2", ids: ["15", "16", "17", "18", "19"] },
  { name: "B1 · Unidad 5 — Conectar ideas",          level: "B1", ids: ["20", "21", "22", "23", "24"] },
  { name: "B1 · Unidad 6 — Desenvolverse",           level: "B1", ids: ["25", "26", "27", "28", "29"] },
  { name: "B2 · Unidad 7 — Estructuras avanzadas",   level: "B2", ids: ["30", "31", "32", "33", "34"] },
  { name: "B2 · Unidad 8 — Ideas y sociedad",        level: "B2", ids: ["35", "36", "37", "38", "39"] },
  { name: "C1 · Unidad 9 — Sofisticación",           level: "C1", ids: ["40", "41", "42", "43", "44"] },
  { name: "C1 · Unidad 10 — Dominio del mundo real", level: "C1", ids: ["45", "46", "47", "48", "49"] },
  { name: "C2 · Unidad 11 — Estilo y sutileza",      level: "C2", ids: ["50", "51", "52", "53", "54"] },
  { name: "C2 · Unidad 12 — Nivel casi nativo",      level: "C2", ids: ["55", "56", "57", "58", "59"] }
];

// Canonical lesson outline (title + slug per id). The dashboard and a few
// fallbacks read this so the app still works before every lesson file loads.
window.COURSE.outline = [
  { id: "00", level: "A1", slug: "alphabet-sounds",      title: "The Alphabet, Sounds & Survival Phrases" },
  { id: "01", level: "A1", slug: "greetings",            title: "Greetings & Introductions" },
  { id: "02", level: "A1", slug: "to-be",                title: "The Verb \"to be\" (am/is/are)" },
  { id: "03", level: "A1", slug: "articles-nouns",       title: "Articles (a/an/the) & Plural Nouns" },
  { id: "04", level: "A1", slug: "present-simple",       title: "Present Simple: Everyday Actions" },
  { id: "05", level: "A1", slug: "numbers-time",         title: "Numbers, Time & Dates" },
  { id: "06", level: "A1", slug: "family-possessives",   title: "Family & Possessives (my / 's)" },
  { id: "07", level: "A1", slug: "food-ordering",        title: "Food & Ordering at a Café" },
  { id: "08", level: "A1", slug: "have-got",             title: "\"have / have got\" & Common Irregular Verbs" },
  { id: "09", level: "A1", slug: "questions-directions", title: "Questions, Directions & Places" },

  { id: "10", level: "A2", slug: "past-simple",          title: "Past Simple (regular & irregular)" },
  { id: "11", level: "A2", slug: "present-continuous",   title: "Present Continuous (-ing now)" },
  { id: "12", level: "A2", slug: "simple-vs-continuous", title: "Present Simple vs Continuous" },
  { id: "13", level: "A2", slug: "future-going-to-will", title: "The Future: \"going to\" & \"will\"" },
  { id: "14", level: "A2", slug: "daily-routine",        title: "Daily Routine & Adverbs of Frequency" },
  { id: "15", level: "A2", slug: "comparatives",         title: "Comparatives & Superlatives" },
  { id: "16", level: "A2", slug: "like-ing",             title: "Likes & Dislikes (verb + -ing)" },
  { id: "17", level: "A2", slug: "weather-seasons",      title: "Weather & Seasons" },
  { id: "18", level: "A2", slug: "shopping-clothing",    title: "Shopping & Clothing" },
  { id: "19", level: "A2", slug: "health-body",          title: "Health & the Body" },

  { id: "20", level: "B1", slug: "present-perfect",      title: "Present Perfect (have done)" },
  { id: "21", level: "B1", slug: "perfect-vs-past",      title: "Present Perfect vs Past Simple" },
  { id: "22", level: "B1", slug: "modals-obligation",    title: "Modals: Advice & Obligation (should / must / have to)" },
  { id: "23", level: "B1", slug: "conditionals-0-1",     title: "Zero & First Conditional" },
  { id: "24", level: "B1", slug: "relative-clauses",     title: "Relative Clauses (who / which / that)" },
  { id: "25", level: "B1", slug: "travel-transport",     title: "Travel & Transport" },
  { id: "26", level: "B1", slug: "work-studies",         title: "Work & Studies" },
  { id: "27", level: "B1", slug: "phrasal-verbs-1",      title: "Phrasal Verbs (everyday)" },
  { id: "28", level: "B1", slug: "narrating",            title: "Narrating a Story (past continuous)" },
  { id: "29", level: "B1", slug: "connectors",           title: "Linking Words & Connectors" },

  { id: "30", level: "B2", slug: "conditionals-2-3",     title: "Second & Third Conditionals" },
  { id: "31", level: "B2", slug: "passive-voice",        title: "The Passive Voice" },
  { id: "32", level: "B2", slug: "reported-speech",      title: "Reported Speech" },
  { id: "33", level: "B2", slug: "past-perfect",         title: "Past Perfect & Narrative Tenses" },
  { id: "34", level: "B2", slug: "modals-deduction",     title: "Modals of Deduction & Probability" },
  { id: "35", level: "B2", slug: "opinions-debate",      title: "Expressing Opinions & Debating" },
  { id: "36", level: "B2", slug: "environment-society",  title: "Environment & Society" },
  { id: "37", level: "B2", slug: "abstract-description", title: "Describing the Abstract" },
  { id: "38", level: "B2", slug: "register-formality",   title: "Register: Formal vs Informal" },
  { id: "39", level: "B2", slug: "phrasal-verbs-2",      title: "Advanced Phrasal & Idiomatic Verbs" },

  { id: "40", level: "C1", slug: "mixed-conditionals",   title: "Mixed Conditionals & Hypotheticals" },
  { id: "41", level: "C1", slug: "inversion-emphasis",   title: "Inversion & Emphasis (cleft sentences)" },
  { id: "42", level: "C1", slug: "discourse-markers",    title: "Advanced Connectors & Discourse Markers" },
  { id: "43", level: "C1", slug: "collocation-nuance",   title: "Nuance, Connotation & Collocation" },
  { id: "44", level: "C1", slug: "argumentative-essay",  title: "The Argumentative Essay" },
  { id: "45", level: "C1", slug: "media-language",       title: "News & Media Language" },
  { id: "46", level: "C1", slug: "literature",           title: "Literature & Cultural Analysis" },
  { id: "47", level: "C1", slug: "idioms-slang",         title: "Idioms, Colloquialisms & Slang" },
  { id: "48", level: "C1", slug: "precision-synonyms",   title: "Precision: Synonyms & Word Choice" },
  { id: "49", level: "C1", slug: "error-correction",     title: "Advanced Error Correction" },

  { id: "50", level: "C2", slug: "stylistics",           title: "Stylistics & Tone" },
  { id: "51", level: "C2", slug: "idiomatic-mastery",    title: "Idiomatic Mastery" },
  { id: "52", level: "C2", slug: "regional-varieties",   title: "Regional Varieties (British vs American)" },
  { id: "53", level: "C2", slug: "professional-registers", title: "Specialized & Professional Registers" },
  { id: "54", level: "C2", slug: "subtle-grammar",       title: "Subtle Grammatical Distinctions" },
  { id: "55", level: "C2", slug: "rhetoric",             title: "Rhetoric & Persuasion" },
  { id: "56", level: "C2", slug: "authentic-texts",      title: "Analyzing Authentic Texts" },
  { id: "57", level: "C2", slug: "humor-wordplay",       title: "Humor, Irony & Wordplay" },
  { id: "58", level: "C2", slug: "native-pitfalls",      title: "Near-Native Pitfalls (false friends for Spanish speakers)" },
  { id: "59", level: "C2", slug: "capstone",             title: "Capstone: Synthesis & Mastery" }
];
