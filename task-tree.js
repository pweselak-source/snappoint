/**
 * Hierarchia zadań procesu inwestycyjnego (szkielet + ścieżki dokumentów).
 * Wymaga: escapeHtml nie jest tu używany — czysta logika danych.
 */

const TASK_IDS = {
  CONCEPT: "t-concept",
  BUILDING: "t-building",
  BUILDING_CREATE: "t-building-create",
  BUILDING_REVISIONS: "t-building-revisions",
  BUILDING_HANDOFF: "t-building-handoff",
  PREP: "t-prep",
  PERMIT: "t-permit",
};

function docProcessTaskId(docId) {
  return `t-doc-${docId}`;
}

function docStepTaskId(docId, stepKey) {
  return `t-doc-${docId}-${stepKey}`;
}

/** Szablony ścieżek per typ dokumentu z ankiety */
const DOC_PATH_TEMPLATES = {
  pb1: {
    processName: "Wniosek o pozwolenie na budowę (PB-1)",
    sortGroup: 10,
    steps: [
      { key: "create", name: "Wytworzenie wniosku PB-1", kind: "doc-create" },
      { key: "bundle", name: "Kompletacja załączników", kind: "step" },
      { key: "submit", name: "Złożenie wniosku w organie", kind: "step" },
    ],
  },
  pb5: {
    processName: "Oświadczenie o prawie do dysponowania (PB-5)",
    sortGroup: 20,
    steps: [
      { key: "create", name: "Wytworzenie oświadczenia PB-5", kind: "doc-create" },
      { key: "sign", name: "Podpisanie przez dysponenta", kind: "step" },
      { key: "attach", name: "Dołączenie do wniosku PB-1", kind: "step" },
    ],
  },
  bioz: {
    processName: "Informacja BIOZ",
    sortGroup: 30,
    steps: [
      { key: "create", name: "Wytworzenie informacji BIOZ", kind: "doc-create" },
      { key: "verify", name: "Weryfikacja z projektem budowlanym", kind: "step" },
      { key: "attach", name: "Dołączenie do wniosku PB-1", kind: "step" },
    ],
  },
  wz: {
    processName: "Uzyskanie Warunków Zabudowy",
    sortGroup: 40,
    steps: [
      { key: "create", name: "Wytworzenie wniosku WZ", kind: "doc-create" },
      { key: "submit", name: "Złożenie wniosku WZ", kind: "step" },
      { key: "obtain", name: "Uzyskanie decyzji WZ", kind: "step" },
    ],
  },
  "land-exclusion": {
    processName: "Wyłączenie gruntów z produkcji rolniczej/leśnej",
    sortGroup: 50,
    steps: [
      { key: "create", name: "Wytworzenie wniosku o wyłączenie", kind: "doc-create" },
      { key: "submit", name: "Złożenie wniosku", kind: "step" },
      { key: "obtain", name: "Uzyskanie decyzji", kind: "step" },
    ],
  },
  "driveway-permit": {
    processName: "Zezwolenie na lokalizację zjazdu",
    sortGroup: 60,
    steps: [
      { key: "create", name: "Wytworzenie wniosku o zjazd", kind: "doc-create" },
      { key: "submit", name: "Złożenie / uzgodnienie z zarządcą drogi", kind: "step" },
      { key: "obtain", name: "Uzyskanie zezwolenia", kind: "step" },
    ],
  },
  "heritage-permit": {
    processName: "Pozwolenie konserwatorskie",
    sortGroup: 70,
    steps: [
      { key: "create", name: "Wytworzenie wniosku konserwatorskiego", kind: "doc-create" },
      { key: "submit", name: "Złożenie wniosku", kind: "step" },
      { key: "obtain", name: "Uzyskanie pozwolenia / uzgodnienia", kind: "step" },
    ],
  },
  dsu: {
    processName: "Decyzja o środowiskowych uwarunkowaniach",
    sortGroup: 80,
    steps: [
      { key: "create", name: "Wytworzenie wniosku DŚU", kind: "doc-create" },
      { key: "submit", name: "Złożenie wniosku DŚU", kind: "step" },
      { key: "obtain", name: "Uzyskanie decyzji DŚU", kind: "step" },
    ],
  },
  "water-permit": {
    processName: "Pozwolenie wodnoprawne",
    sortGroup: 90,
    steps: [
      { key: "create", name: "Wytworzenie wniosku wodnoprawnego", kind: "doc-create" },
      { key: "submit", name: "Złożenie wniosku", kind: "step" },
      { key: "obtain", name: "Uzyskanie pozwolenia wodnoprawnego", kind: "step" },
    ],
  },
};

const MEDIA_LABELS = {
  woda: "Woda",
  kanalizacja: "Kanalizacja",
  prad: "Prąd",
  gaz: "Gaz",
  cieplo: "Ciepło sieciowe",
};

function resolveDocPathTemplate(doc) {
  const id = String(doc?.id || "");
  if (DOC_PATH_TEMPLATES[id]) return DOC_PATH_TEMPLATES[id];
  if (id.startsWith("media-")) {
    const media = id.slice("media-".length);
    const label = MEDIA_LABELS[media] || media;
    return {
      processName: `Uzyskanie warunków przyłączeniowych — ${label}`,
      sortGroup: 55,
      steps: [
        { key: "create", name: `Wytworzenie wniosku — ${label}`, kind: "doc-create" },
        { key: "submit", name: "Złożenie wniosku do gestora", kind: "step" },
        { key: "obtain", name: "Uzyskanie warunków / decyzji", kind: "step" },
      ],
    };
  }
  return {
    processName: doc?.title || "Proces dokumentu",
    sortGroup: 100,
    steps: [
      { key: "create", name: "Wytworzenie dokumentu", kind: "doc-create" },
      { key: "submit", name: "Złożenie wniosku", kind: "step" },
      { key: "obtain", name: "Uzyskanie decyzji / załatwienie", kind: "step" },
    ],
  };
}

function makeProcessTask(partial) {
  return {
    id: partial.id,
    name: partial.name,
    parentId: partial.parentId ?? null,
    kind: partial.kind || "process",
    source: partial.source || "system",
    linkedDoc: partial.linkedDoc || null,
    dependsOn: Array.isArray(partial.dependsOn) ? [...partial.dependsOn] : [],
    pathKey: partial.pathKey || null,
    stepKey: partial.stepKey || null,
    sortOrder: typeof partial.sortOrder === "number" ? partial.sortOrder : 0,
    docId: partial.docId || null,
  };
}

function createSkeletonProcessTasks() {
  const tasks = [
    makeProcessTask({
      id: TASK_IDS.CONCEPT,
      name: "Koncepcja projektowa",
      kind: "process",
      sortOrder: 1,
      pathKey: "concept",
    }),
    makeProcessTask({
      id: TASK_IDS.BUILDING,
      name: "Projekt budowlany",
      parentId: TASK_IDS.CONCEPT,
      kind: "process",
      sortOrder: 1,
      pathKey: "building",
    }),
    makeProcessTask({
      id: TASK_IDS.BUILDING_CREATE,
      name: "Wytworzenie projektu budowlanego",
      parentId: TASK_IDS.BUILDING,
      kind: "doc-create",
      sortOrder: 1,
      pathKey: "building",
      stepKey: "create",
      linkedDoc: { kind: "building", id: "building-project", name: "Projekt budowlany" },
    }),
    makeProcessTask({
      id: TASK_IDS.BUILDING_REVISIONS,
      name: "Uzupełnienie / korekty projektu",
      parentId: TASK_IDS.BUILDING,
      kind: "step",
      sortOrder: 2,
      pathKey: "building",
      stepKey: "revisions",
      linkedDoc: { kind: "building", id: "building-project", name: "Projekt budowlany" },
    }),
    makeProcessTask({
      id: TASK_IDS.BUILDING_HANDOFF,
      name: "Przekazanie projektu do pakietu wniosku",
      parentId: TASK_IDS.BUILDING,
      kind: "step",
      sortOrder: 3,
      pathKey: "building",
      stepKey: "handoff",
      linkedDoc: { kind: "building", id: "building-project", name: "Projekt budowlany" },
    }),
    makeProcessTask({
      id: TASK_IDS.PREP,
      name: "Przygotowanie wniosku o pozwolenie na budowę",
      kind: "process",
      sortOrder: 2,
      pathKey: "prep",
    }),
    makeProcessTask({
      id: TASK_IDS.PERMIT,
      name: "Uzyskanie pozwolenia na budowę",
      kind: "milestone",
      sortOrder: 3,
      pathKey: "permit",
    }),
  ];

  // Chain inside building
  setTaskDepends(tasks, TASK_IDS.BUILDING_REVISIONS, [TASK_IDS.BUILDING_CREATE]);
  setTaskDepends(tasks, TASK_IDS.BUILDING_HANDOFF, [TASK_IDS.BUILDING_REVISIONS]);

  return tasks;
}

function setTaskDepends(tasks, taskId, dependsOn) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  const next = [...new Set([...(task.dependsOn || []), ...dependsOn])];
  task.dependsOn = next;
}

function buildDocumentProcessBranch(doc, sortBase = 100) {
  const template = resolveDocPathTemplate(doc);
  const processId = docProcessTaskId(doc.id);
  const linkedDoc = {
    kind: "survey-doc",
    id: doc.id,
    name: doc.title || template.processName,
  };
  const branch = [
    makeProcessTask({
      id: processId,
      name: template.processName,
      parentId: TASK_IDS.PREP,
      kind: "process",
      source: "survey",
      sortOrder: sortBase + (template.sortGroup || 0),
      pathKey: doc.id,
      docId: doc.id,
      linkedDoc,
    }),
  ];

  let prevStepId = null;
  template.steps.forEach((step, index) => {
    const stepId = docStepTaskId(doc.id, step.key);
    branch.push(
      makeProcessTask({
        id: stepId,
        name: step.name,
        parentId: processId,
        kind: step.kind || "step",
        source: "survey",
        sortOrder: index + 1,
        pathKey: doc.id,
        stepKey: step.key,
        docId: doc.id,
        linkedDoc,
        dependsOn: prevStepId ? [prevStepId] : [],
      })
    );
    prevStepId = stepId;
  });

  return branch;
}

/** Domyślne zależności między gałęziami (v1 — do doszlifowania). */
function applyCrossPathDependencies(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const has = (id) => byId.has(id);
  const link = (fromId, toIds) => {
    if (!has(fromId)) return;
    setTaskDepends(tasks, fromId, toIds.filter(has));
  };

  const lastStep = (docId, keys) => {
    for (const key of keys) {
      const id = docStepTaskId(docId, key);
      if (has(id)) return id;
    }
    return null;
  };

  // WZ zakończone → start wytworzenia PB (równolegle z innymi, ale WZ blokuje start koncepcji-PB)
  const wzObtain = lastStep("wz", ["obtain"]);
  if (wzObtain) link(TASK_IDS.BUILDING_CREATE, [wzObtain]);

  // Media → przekazanie projektu
  tasks
    .filter((t) => t.stepKey === "obtain" && String(t.docId || "").startsWith("media-"))
    .forEach((t) => link(TASK_IDS.BUILDING_HANDOFF, [t.id]));

  // Decyzje / uzgodnienia → złożenie PB-1
  ["dsu", "heritage-permit", "land-exclusion", "driveway-permit", "water-permit"].forEach(
    (docId) => {
      const obtainId = lastStep(docId, ["obtain"]);
      if (obtainId) link(docStepTaskId("pb1", "submit"), [obtainId]);
    }
  );

  // PB-5 / BIOZ dołączenie → kompletacja PB-1
  ["pb5", "bioz"].forEach((docId) => {
    const attachId = lastStep(docId, ["attach"]);
    if (attachId) link(docStepTaskId("pb1", "bundle"), [attachId]);
  });

  // Przekazanie projektu → kompletacja PB-1
  link(docStepTaskId("pb1", "bundle"), [TASK_IDS.BUILDING_HANDOFF]);

  // Złożenie PB-1 → kamień milowy PnB
  link(TASK_IDS.PERMIT, [docStepTaskId("pb1", "submit")]);

  return tasks;
}

function mergeProcessTaskLists(existing, incoming) {
  const byId = new Map((existing || []).map((t) => [t.id, { ...t }]));
  (incoming || []).forEach((task) => {
    if (!byId.has(task.id)) {
      byId.set(task.id, { ...task });
      return;
    }
    // Nie nadpisujemy ręcznie zmienionych dependsOn poza uzupełnieniem brakujących z szablonu
    const current = byId.get(task.id);
    const deps = [
      ...new Set([...(current.dependsOn || []), ...(task.dependsOn || [])]),
    ];
    byId.set(task.id, { ...current, dependsOn: deps });
  });
  return [...byId.values()];
}

function migrateLegacyTaskMeta(project) {
  if (!project) return;
  const mapPairs = [
    ["building-project", typeof TASK_IDS !== "undefined" ? TASK_IDS.BUILDING_CREATE : "t-building-create"],
  ];
  (project.formalSurvey?.documents || []).forEach((doc) => {
    mapPairs.push([doc.id, `t-doc-${doc.id}-create`]);
  });
  const buckets = [
    "taskOwners",
    "taskStartDates",
    "taskDueDates",
    "taskDescriptions",
    "taskNotes",
    "taskBoardStatus",
  ];
  mapPairs.forEach(([from, to]) => {
    buckets.forEach((bucket) => {
      const bag = project[bucket];
      if (!bag || bag[to] != null || bag[from] == null) return;
      bag[to] = bag[from];
    });
  });
}

/**
 * Zapewnia szkielet + gałęzie dla dokumentów ankiety (add-only).
 * @returns {{ processTasks: Array, changed: boolean }}
 */
/**
 * @deprecated Stary generator szkieletu — nie używany.
 * Zadania projektu powstają z Flow (project-flow.js → project.flowInstance).
 */
function ensureProjectProcessTasks(project) {
  const before = JSON.stringify({
    tasks: project?.processTasks || [],
    meta: {
      owners: project?.taskOwners || {},
      status: project?.taskBoardStatus || {},
    },
  });
  migrateLegacyTaskMeta(project);
  let tasks = Array.isArray(project?.processTasks) ? [...project.processTasks] : [];

  if (!tasks.some((t) => t.id === TASK_IDS.CONCEPT)) {
    tasks = mergeProcessTaskLists(createSkeletonProcessTasks(), tasks);
  }

  const docs = project?.formalSurvey?.documents || [];
  docs.forEach((doc, index) => {
    const processId = docProcessTaskId(doc.id);
    if (tasks.some((t) => t.id === processId)) return;
    const branch = buildDocumentProcessBranch(doc, 100 + index * 10);
    tasks = mergeProcessTaskLists(tasks, branch);
  });

  tasks = applyCrossPathDependencies(tasks);

  const after = JSON.stringify({
    tasks,
    meta: {
      owners: project?.taskOwners || {},
      status: project?.taskBoardStatus || {},
    },
  });
  return { processTasks: tasks, changed: before !== after };
}

/**
 * Scalanie dokumentów ankiety: nigdy nie usuwa istniejących.
 */
function mergeSurveyDocumentsAddOnly(existingDocs, nextDocs) {
  const merged = Array.isArray(existingDocs) ? [...existingDocs] : [];
  (nextDocs || []).forEach((doc) => {
    if (!merged.some((item) => String(item.id) === String(doc.id))) {
      merged.push(doc);
    }
  });
  return merged;
}

function findProcessTask(project, taskId) {
  return (project?.processTasks || []).find((t) => String(t.id) === String(taskId)) || null;
}

function findAnyStoredTask(project, taskId) {
  const process = findProcessTask(project, taskId);
  if (process) return process;
  return (project?.customTasks || []).find((t) => String(t.id) === String(taskId)) || null;
}

function getTaskParentId(project, taskId) {
  return findAnyStoredTask(project, taskId)?.parentId || null;
}

function getTaskDescendantIds(project, taskId) {
  const all = [
    ...(project?.processTasks || []),
    ...(project?.customTasks || []).map((t) => ({
      id: t.id,
      parentId: t.parentId || null,
    })),
  ];
  const childrenOf = new Map();
  all.forEach((t) => {
    if (!t.parentId) return;
    if (!childrenOf.has(t.parentId)) childrenOf.set(t.parentId, []);
    childrenOf.get(t.parentId).push(t.id);
  });
  const out = [];
  const walk = (id) => {
    (childrenOf.get(id) || []).forEach((childId) => {
      out.push(childId);
      walk(childId);
    });
  };
  walk(taskId);
  return out;
}

function documentCreateTaskId(kind, linkId) {
  if (kind === "building") return TASK_IDS.BUILDING_CREATE;
  if (kind === "survey-doc") return docStepTaskId(linkId, "create");
  return String(linkId);
}

function typeLabelForProcessKind(kind) {
  if (kind === "doc-create") return "Dokument";
  if (kind === "flow") return "Flow";
  if (kind === "step") return "Krok";
  if (kind === "milestone") return "Kamień milowy";
  if (kind === "process") return "Proces";
  return "Zadanie";
}

function sortProcessTasksTree(tasks) {
  const byParent = new Map();
  tasks.forEach((t) => {
    const key = t.parentId || "";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(t);
  });
  byParent.forEach((list) => {
    list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name).localeCompare(String(b.name), "pl"));
  });
  const ordered = [];
  const walk = (parentId, depth) => {
    const key = parentId || "";
    (byParent.get(key) || []).forEach((task) => {
      ordered.push({ ...task, depth });
      walk(task.id, depth + 1);
    });
  };
  walk(null, 0);
  return ordered;
}
