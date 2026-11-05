/**
 * Generowanie instancji Flow projektu z predefiniowanej ścieżki Workflow.
 * Zależności: normalizeWorkflowTask / getWorkflowTaskMap / listAllPotentialWorkflowDocuments (app/survey).
 */

const PROJECT_FLOW_SEED_DOC = "building-project";

/**
 * Wybierz podzbiór zadań wzorca na podstawie dokumentów seed.
 * Bierze: zadania powiązane z dokumentami seed, ich nadrzędne, podzadania,
 * kroki bez dokumentu w tych samych gałęziach oraz zależności strzałkami.
 * @param {Array} templateTasks
 * @param {Set<string>|string[]} seedDocIds
 * @returns {Array}
 */
function selectWorkflowTasksForSeedDocuments(templateTasks, seedDocIds) {
  const list = Array.isArray(templateTasks) ? templateTasks : [];
  const seeds = seedDocIds instanceof Set ? seedDocIds : new Set(seedDocIds || []);
  if (!list.length || !seeds.size) return [];

  const taskMap = new Map(list.map((task) => [task.id, task]));
  const childrenOf = new Map();
  list.forEach((task) => {
    const key = task.parentId || "";
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key).push(task.id);
  });

  const included = new Set();

  const isForeignDocTask = (task) =>
    Boolean(task?.linkedDocId && !seeds.has(task.linkedDocId));

  const addWithAncestors = (taskId) => {
    let current = taskId;
    while (current && taskMap.has(current) && !included.has(current)) {
      included.add(current);
      current = taskMap.get(current)?.parentId || null;
    }
  };

  /** Podzadania w gałęzi — pomija obce dokumenty spoza seed. */
  const addDescendantsFiltered = (taskId) => {
    (childrenOf.get(taskId) || []).forEach((childId) => {
      const child = taskMap.get(childId);
      if (!child || included.has(childId) || isForeignDocTask(child)) return;
      included.add(childId);
      addDescendantsFiltered(childId);
    });
  };

  const includeBranch = (taskId) => {
    if (!taskMap.has(taskId)) return;
    addWithAncestors(taskId);
    addDescendantsFiltered(taskId);
  };

  // 1. Zadania powiązane z dokumentami seed + ich drzewo (góra i dół)
  list.forEach((task) => {
    if (task.linkedDocId && seeds.has(task.linkedDocId)) {
      includeBranch(task.id);
    }
  });

  // 2. Fixpoint: strzałki + kroki bez obcego dokumentu pod wspólnym rodzicem
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...included]) {
      const task = taskMap.get(id);
      if (!task) continue;

      (task.blockedBy || []).forEach((predId) => {
        if (!included.has(predId) && taskMap.has(predId)) {
          includeBranch(predId);
          changed = true;
        }
      });
      (task.blocks || []).forEach((succId) => {
        if (!included.has(succId) && taskMap.has(succId)) {
          includeBranch(succId);
          changed = true;
        }
      });

      if (task.parentId && included.has(task.parentId)) {
        (childrenOf.get(task.parentId) || []).forEach((siblingId) => {
          if (included.has(siblingId)) return;
          const sibling = taskMap.get(siblingId);
          if (!sibling || isForeignDocTask(sibling)) return;
          includeBranch(siblingId);
          changed = true;
        });
      }
    }
  }

  const idSet = included;
  return list
    .filter((task) => idSet.has(task.id))
    .map((task) => {
      const parentId =
        task.parentId && idSet.has(task.parentId) ? task.parentId : null;
      const blocks = (task.blocks || []).filter((id) => idSet.has(id));
      const blockedBy = (task.blockedBy || []).filter((id) => idSet.has(id));
      return {
        ...task,
        parentId,
        blocks,
        blockedBy,
        startDate: null,
      };
    });
}

/**
 * Dokumenty seed: zawsze Projekt budowlany + dokumenty z ankiety (jeśli są).
 */
function resolveProjectFlowSeedDocIds(project) {
  const seeds = new Set([PROJECT_FLOW_SEED_DOC]);
  (project?.formalSurvey?.documents || []).forEach((doc) => {
    if (doc?.id) seeds.add(doc.id);
  });
  return seeds;
}

function workflowDocumentTitleById(docId) {
  if (!docId) return "";
  if (typeof listAllPotentialWorkflowDocuments === "function") {
    const hit = listAllPotentialWorkflowDocuments().find((doc) => doc.id === docId);
    if (hit?.title) return hit.title;
  }
  return docId;
}

/**
 * Scal wygenerowane zadania z istniejącą instancją (merge addytywny po id).
 * Zachowuje lokalne startDate / ręczne zmiany użytkownika na istniejących.
 */
function mergeProjectFlowTasks(existingTasks, generatedTasks) {
  const existingMap = new Map((existingTasks || []).map((task) => [task.id, task]));
  const merged = [];
  const seen = new Set();

  (generatedTasks || []).forEach((gen, index) => {
    const prev = existingMap.get(gen.id);
    const normalized = typeof normalizeWorkflowTask === "function"
      ? normalizeWorkflowTask(
          {
            ...gen,
            startDate: prev?.startDate || null,
            durationDays:
              gen.durationDays != null ? gen.durationDays : prev?.durationDays ?? null,
            parallel: Boolean(gen.parallel),
          },
          index
        )
      : { ...gen, startDate: prev?.startDate || null };

    // Zadanie z blockedBy nie może mieć ręcznej daty startu
    if ((normalized.blockedBy || []).length) {
      normalized.startDate = null;
    }
    merged.push(normalized);
    seen.add(normalized.id);
  });

  // Zachowaj zadania dodane ręcznie w instancji (poza wzorcem), których nie ma w gen
  (existingTasks || []).forEach((task, index) => {
    if (seen.has(task.id)) return;
    const kept =
      typeof normalizeWorkflowTask === "function"
        ? normalizeWorkflowTask(task, merged.length + index)
        : { ...task };
    if ((kept.blockedBy || []).length) kept.startDate = null;
    merged.push(kept);
  });

  return merged;
}

/**
 * Dokumenty spoza ankiety wynikające z flow → lista jak dokumenty ankiety.
 */
function collectFlowExtraDocuments(tasks, project) {
  const surveyIds = new Set(
    (project?.formalSurvey?.documents || []).map((doc) => doc.id)
  );
  const extras = [];
  const seen = new Set();
  (tasks || []).forEach((task) => {
    const docId = task.linkedDocId;
    if (!docId || surveyIds.has(docId) || seen.has(docId)) return;
    if (docId === PROJECT_FLOW_SEED_DOC && !surveyIds.size) {
      // building-project zawsze jako dokument do wykonania przy generacji „na sucho”
    }
    seen.add(docId);
    extras.push({
      id: docId,
      title: workflowDocumentTitleById(docId),
      source: docId === PROJECT_FLOW_SEED_DOC ? "system" : "flow",
      ruleId: "flow",
    });
  });
  return extras;
}

/**
 * Zbuduj / scal flowInstance projektu z wybranej ścieżki wzorca.
 * @returns {{ project, addedTasks: number, docs: number }}
 */
function applyWorkflowPathToProject(project, templatePath) {
  if (!project || !templatePath) {
    return { project, addedTasks: 0, docs: 0 };
  }
  const seedIds = resolveProjectFlowSeedDocIds(project);
  const selected = selectWorkflowTasksForSeedDocuments(
    templatePath.tasks || [],
    seedIds
  );
  const existing = project.flowInstance?.tasks || [];
  const beforeIds = new Set(existing.map((task) => task.id));
  const mergedTasks = mergeProjectFlowTasks(existing, selected);
  const flowDocuments = collectFlowExtraDocuments(mergedTasks, project);
  // building-project zawsze na liście dokumentów projektu gdy jest w zadaniach
  const hasBuilding = mergedTasks.some(
    (task) => task.linkedDocId === PROJECT_FLOW_SEED_DOC
  );
  if (hasBuilding && !flowDocuments.some((doc) => doc.id === PROJECT_FLOW_SEED_DOC)) {
    flowDocuments.unshift({
      id: PROJECT_FLOW_SEED_DOC,
      title: workflowDocumentTitleById(PROJECT_FLOW_SEED_DOC),
      source: "system",
      ruleId: "flow",
    });
  }

  const addedTasks = mergedTasks.filter((task) => !beforeIds.has(task.id)).length;
  const next = {
    ...project,
    flowInstance: {
      sourcePathId: templatePath.id,
      sourcePathName: templatePath.name,
      generatedAt: project.flowInstance?.generatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: mergedTasks,
    },
    flowDocuments,
    // stary system — nie używamy
    processTasks: [],
    updatedAt: new Date().toISOString(),
  };
  return { project: next, addedTasks, docs: flowDocuments.length };
}
