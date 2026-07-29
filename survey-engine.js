/**
 * Formal survey rules engine — questions, options and document mapping.
 * Kept separate from UI so rules can scale without touching the wizard markup.
 */

const SURVEY_STANDARD_DOCUMENTS = [
  {
    id: "pb1",
    title: "Wniosek o pozwolenie na budowę (PB-1)",
    source: "standard",
  },
  {
    id: "pb5",
    title: "Oświadczenie o prawie do dysponowania nieruchomością na cele budowlane (PB-5)",
    source: "standard",
  },
  {
    id: "bioz",
    title: "Informacja BIOZ",
    source: "standard",
  },
];

const SURVEY_MEDIA_OPTIONS = [
  { value: "woda", label: "Woda" },
  { value: "kanalizacja", label: "Kanalizacja" },
  { value: "prad", label: "Prąd" },
  { value: "gaz", label: "Gaz" },
  { value: "cieplo", label: "Ciepło sieciowe" },
];

/** @type {Array<{ id: string, type: 'single'|'multi', title: string, help?: string, options: Array<{ value: string, label: string }> }>} */
const SURVEY_QUESTIONS = [
  {
    id: "mpzp",
    type: "single",
    title: "Czy działka posiada Miejscowy Plan Zagospodarowania Przestrzennego (MPZP)?",
    help: "Brak MPZP zwykle oznacza konieczność uzyskania Warunków Zabudowy.",
    options: [
      { value: "yes", label: "Tak" },
      { value: "no", label: "Nie" },
    ],
  },
  {
    id: "landClass",
    type: "single",
    title: "Jaka jest klasyfikacja gruntów?",
    options: [
      { value: "budowlane", label: "Budowlane" },
      { value: "rolne", label: "Rolne" },
      { value: "lesne", label: "Leśne" },
    ],
  },
  {
    id: "driveway",
    type: "single",
    title: "Czy projekt zakłada budowę lub przebudowę zjazdu z drogi publicznej?",
    options: [
      { value: "yes", label: "Tak" },
      { value: "no", label: "Nie" },
    ],
  },
  {
    id: "media",
    type: "multi",
    title: "Jakie nowe przyłącza mediów są wymagane?",
    help: "Możesz zaznaczyć kilka opcji — dla każdej powstanie osobny wniosek.",
    options: SURVEY_MEDIA_OPTIONS,
  },
  {
    id: "heritage",
    type: "single",
    title: "Czy budynek lub działka znajduje się w strefie ochrony konserwatorskiej?",
    options: [
      { value: "yes", label: "Tak" },
      { value: "no", label: "Nie" },
    ],
  },
  {
    id: "environment",
    type: "single",
    title:
      "Czy inwestycja należy do przedsięwzięć mogących znacząco oddziaływać na środowisko?",
    options: [
      { value: "yes", label: "Tak" },
      { value: "no", label: "Nie" },
    ],
  },
  {
    id: "water",
    type: "single",
    title:
      "Czy projekt ingeruje w stosunki wodne (np. budowa mostu, odprowadzanie wód do rzeki)?",
    options: [
      { value: "yes", label: "Tak" },
      { value: "no", label: "Nie" },
    ],
  },
];

/**
 * @param {Record<string, string | string[]>} answers
 * @param {{ requiresPermit?: boolean }} [options]
 * @returns {Array<{ id: string, title: string, source: 'standard'|'conditional', ruleId: string }>}
 */
function evaluateFormalSurveyDocuments(answers, options = {}) {
  const requiresPermit = options.requiresPermit !== false;
  const docs = [];
  const pushUnique = (doc) => {
    if (docs.some((item) => item.id === doc.id)) return;
    docs.push(doc);
  };

  if (requiresPermit) {
    SURVEY_STANDARD_DOCUMENTS.forEach((doc) => {
      pushUnique({ ...doc, ruleId: "standard-permit" });
    });
  }

  if (answers.mpzp === "no") {
    pushUnique({
      id: "wz",
      title: "Wniosek o ustalenie Warunków Zabudowy (WZ)",
      source: "conditional",
      ruleId: "mpzp-no",
    });
  }

  if (answers.landClass === "rolne" || answers.landClass === "lesne") {
    pushUnique({
      id: "land-exclusion",
      title: "Wniosek o wyłączenie gruntów z produkcji rolniczej/leśnej",
      source: "conditional",
      ruleId: "land-class",
    });
  }

  if (answers.driveway === "yes") {
    pushUnique({
      id: "driveway-permit",
      title: "Wniosek o wydanie zezwolenia na lokalizację zjazdu",
      source: "conditional",
      ruleId: "driveway-yes",
    });
  }

  const media = Array.isArray(answers.media) ? answers.media : [];
  media.forEach((value) => {
    const option = SURVEY_MEDIA_OPTIONS.find((item) => item.value === value);
    if (!option) return;
    pushUnique({
      id: `media-${value}`,
      title: `Wniosek o wydanie warunków przyłączeniowych — ${option.label}`,
      source: "conditional",
      ruleId: `media-${value}`,
    });
  });

  if (answers.heritage === "yes") {
    pushUnique({
      id: "heritage-permit",
      title: "Wniosek o pozwolenie wojewódzkiego/miejskiego konserwatora zabytków",
      source: "conditional",
      ruleId: "heritage-yes",
    });
  }

  if (answers.environment === "yes") {
    pushUnique({
      id: "dsu",
      title: "Wniosek o wydanie Decyzji o Środowiskowych Uwarunkowaniach (DŚU)",
      source: "conditional",
      ruleId: "environment-yes",
    });
  }

  if (answers.water === "yes") {
    pushUnique({
      id: "water-permit",
      title: "Wniosek o pozwolenie wodnoprawne",
      source: "conditional",
      ruleId: "water-yes",
    });
  }

  return docs;
}

function createEmptySurveyAnswers() {
  return {
    mpzp: "",
    landClass: "",
    driveway: "",
    media: [],
    heritage: "",
    environment: "",
    water: "",
  };
}

function getSurveyAnsweredCount(answers) {
  return SURVEY_QUESTIONS.filter((question) => {
    const value = answers[question.id];
    if (question.type === "multi") return Array.isArray(value) && value.length > 0;
    return typeof value === "string" && value.length > 0;
  }).length;
}

function isSurveyComplete(answers) {
  return SURVEY_QUESTIONS.every((question) => {
    const value = answers[question.id];
    if (question.type === "multi") return Array.isArray(value); // empty allowed = none selected
    return typeof value === "string" && value.length > 0;
  });
}
