/**
 * snapPoint UI V2 — logika nowego interfejsu
 * Dane projektów: ten sam localStorage co V1 (loadProjects / saveProjects).
 */

(function () {
  /** @type {{ name: "home", tab?: "projects" | "tasks" | "docs" } | { name: "workflow" } | { name: "workflow-path", pathId: string, tab?: "tasks" | "docs" } | { name: "new-project" } | { name: "edit-project", projectId: string, tab?: "project" | "tasks" | "permissions", taskId?: string } | { name: "plot-detail", projectId: string, plotId: string } | { name: "doc-detail", projectId: string, docId: string } | { name: "task-detail", projectId: string, taskId: string } | { name: "tasks", projectId: string } | { name: "docs", projectId: string } | { name: "project-docs", projectId: string } | { name: "configuration", tab?: string }} */
  let v2Route = { name: "home", tab: "projects" };

  /** @type {{ code: string, name: string, description: string }} */
  let projectFormDraft = { code: "", name: "", description: "" };

  /** @type {{ name: string, size: number, dataUrl: string, mime: string }[]} */
  let v2PendingFiles = [];
  let v2PendingProjectId = "";
  let v2TypeDraftId = "";
  /** @type {ReturnType<typeof setTimeout> | null} */
  let v2ToastTimer = null;

  /** @type {{ projectId: string, step: number, answers: Record<string, string | string[]> } | null} */
  let v2SurveyDraft = null;
  /** @type {ResizeObserver | null} */
  let v2DocsHeightObserver = null;
  /** @type {{ projectId: string, taskId: string } | null} */
  let v2PendingTaskFlash = null;
  let v2TaskFlashTimer = null;
  /** @type {HTMLElement | null} */
  let v2DocDragGhost = null;
  /** @type {object[]} */
  let v2NavHistory = [];
  /** @type {object | null} */
  let v2LastMountedRoute = null;
  let v2SkipHistoryPush = false;
  /** @type {((name: string) => void) | null} */
  let v2TaskNameOnSave = null;

  const TOP_PAIR_HEIGHT_KEY = "snappoint.v2.projectForm.topPairHeight";
  const TOP_PAIR_MIN_H = 180;
  const TOP_PAIR_MAX_H = 900;
  const V2_ROUTE_KEY = "snappoint.v2.route";

  function getUiVersion() {
    try {
      return localStorage.getItem("snappoint.uiVersion") === "v2" ? "v2" : "v1";
    } catch (e) {
      return "v1";
    }
  }

  function esc(value) {
    if (typeof escapeHtml === "function") return escapeHtml(String(value ?? ""));
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatRegDate(iso) {
    if (!iso) return "—";
    if (typeof formatDateOnly === "function" && /^\d{4}-\d{2}-\d{2}/.test(String(iso))) {
      return formatDateOnly(String(iso).slice(0, 10));
    }
    try {
      return new Intl.DateTimeFormat("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(iso));
    } catch (e) {
      return String(iso).slice(0, 10);
    }
  }

  function projectOwnerName(project) {
    if (project?.ownerName) return String(project.ownerName);
    if (project?.createdByName) return String(project.createdByName);
    if (typeof getCurrentAccountUser === "function") {
      return getCurrentAccountUser()?.name || "—";
    }
    return "—";
  }

  function countProjectTasks(project) {
    if (typeof collectProjectTasks === "function") {
      return collectProjectTasks(project).length;
    }
    const flow = project?.flowInstance?.tasks;
    if (Array.isArray(flow)) return flow.length;
    return Array.isArray(project?.customTasks) ? project.customTasks.length : 0;
  }

  function countProjectDocs(project) {
    const attachments = Array.isArray(project?.files) ? project.files.length : 0;
    const survey = Array.isArray(project?.formalSurvey?.documents)
      ? project.formalSurvey.documents.length
      : 0;
    const flowDocs = Array.isArray(project?.flowDocuments) ? project.flowDocuments.length : 0;
    return attachments + survey + flowDocs;
  }

  function iconEnter() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function iconCopy() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="1.5"/><path d="M5.5 15.5V5.5A1.5 1.5 0 0 1 7 4h10" stroke-linecap="round"/></svg>`;
  }

  function iconTrash() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M8 7l.6 12h6.8L16 7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function iconWfBlocks() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7 8h6M7 12h10M7 16h8" stroke-linecap="round"/><path d="M4 6.5h16v11H4z" stroke-linejoin="round" opacity="0.35"/></svg>`;
  }

  function iconWfLinkDoc() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M8 12h8M10 8.5 7 12l3 3.5M14 8.5l3 3.5-3 3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function iconPaperclip() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m16.5 7.5-7.8 7.8a2.4 2.4 0 0 0 3.4 3.4l8.1-8.1a4 4 0 0 0-5.7-5.7l-8.4 8.4a5.5 5.5 0 0 0 7.8 7.8l7.2-7.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function iconClose() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke-linecap="round"/></svg>`;
  }

  function iconDetails() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.8M12 17.7v2.8M3.5 12h2.8M17.7 12h2.8" stroke-linecap="round"/></svg>`;
  }

  function iconFilter() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5z" stroke-linejoin="round"/></svg>`;
  }

  function iconDownload() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 4v10.5M8.5 11.5 12 15l3.5-3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke-linecap="round"/></svg>`;
  }

  function iconExpand() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 4.5H4.5V9M15 4.5h4.5V9M9 19.5H4.5V15M15 19.5h4.5V15" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function iconBulkAdd() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 7.5h11.5v12H8V7.5Z" stroke-linejoin="round"/><path d="M5.5 4.5H16v2" stroke-linecap="round"/><path d="M11.5 12v5M9 14.5h5" stroke-linecap="round"/></svg>`;
  }

  function iconGotoTask() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 7h8M5 12h6M5 17h8" stroke-linecap="round"/><path d="M14 8.5h5.5V14M19.5 8.5 14.5 13.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function iconInfo() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.2"/><path d="M12 10.5V16M12 7.8h.01" stroke-linecap="round"/></svg>`;
  }

  const FORMAL_DOCS_RAIL_KEY = "snappoint.v2.tasks.formalDocsOpen";
  const V2_TASKS_VIEW_KEY = "snappoint.v2.tasks.viewMode";
  const V2_TASKS_VIEW_MODES = ["list", "gantt", "kanban"];
  const V2_WF_VIEW_KEY = "snappoint.v2.workflow.viewMode";
  const V2_WF_VIEW_MODES = ["list", "gantt"];
  const V2_TASKS_TABLE_KEY = "snappoint.v2.tasks.tableLayout";
  const V2_TASKS_LIST_EDIT_KEY = "snappoint.v2.tasks.listEdit";
  /** Zachowanie pozycji scrolla Gantta przy remount (np. usuwanie powiązania). */
  let v2GanttScrollPreserve = null;
  /** Widok zadań sprzed otwarcia panelu (przywracany po zamknięciu). */
  let v2TasksViewBeforeFocus = null;
  const V2_TASK_COL_DEFS = [
    { id: "name", label: "Nazwa zadania", pinned: true, defaultWidth: 280, min: 140 },
    { id: "icons", label: "Powiązania", defaultWidth: 52, min: 40 },
    { id: "status", label: "Status", defaultWidth: 140, min: 100 },
    { id: "duration", label: "Czas trwania", defaultWidth: 110, min: 80 },
    { id: "start", label: "Data od", defaultWidth: 132, min: 110 },
    { id: "due", label: "Data do", defaultWidth: 132, min: 110 },
    { id: "owner", label: "Właściciel", defaultWidth: 168, min: 120 },
    { id: "notes", label: "Uwagi", defaultWidth: 200, min: 120 },
  ];

  function defaultV2TasksTableState() {
    return {
      order: V2_TASK_COL_DEFS.map((col) => col.id),
      visible: Object.fromEntries(V2_TASK_COL_DEFS.map((col) => [col.id, true])),
      widths: Object.fromEntries(
        V2_TASK_COL_DEFS.map((col) => [col.id, col.defaultWidth])
      ),
    };
  }

  function loadV2TasksTableState() {
    const base = defaultV2TasksTableState();
    try {
      const raw = localStorage.getItem(V2_TASKS_TABLE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== "object") return base;
      const ids = new Set(V2_TASK_COL_DEFS.map((col) => col.id));
      const order = [];
      const seen = new Set();
      (Array.isArray(parsed.order) ? parsed.order : []).forEach((id) => {
        if (!ids.has(id) || seen.has(id) || id === "name") return;
        seen.add(id);
        order.push(id);
      });
      V2_TASK_COL_DEFS.forEach((col) => {
        if (col.id === "name" || seen.has(col.id)) return;
        order.push(col.id);
      });
      const visible = { ...base.visible, ...(parsed.visible || {}) };
      visible.name = true;
      const widths = { ...base.widths };
      V2_TASK_COL_DEFS.forEach((col) => {
        const value = Number(parsed.widths?.[col.id]);
        if (Number.isFinite(value) && value >= col.min) widths[col.id] = value;
      });
      return { order: ["name", ...order], visible, widths };
    } catch (e) {
      return base;
    }
  }

  function saveV2TasksTableState(state) {
    try {
      localStorage.setItem(V2_TASKS_TABLE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  function getV2VisibleTaskColumns(state) {
    const layout = state || loadV2TasksTableState();
    return layout.order
      .map((id) => V2_TASK_COL_DEFS.find((col) => col.id === id))
      .filter((col) => col && (col.pinned || layout.visible[col.id] !== false));
  }

  function loadFormalDocsRailOpen() {
    try {
      return localStorage.getItem(FORMAL_DOCS_RAIL_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function saveFormalDocsRailOpen(open) {
    try {
      localStorage.setItem(FORMAL_DOCS_RAIL_KEY, open ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
  }

  function getV2TasksViewMode() {
    try {
      const raw = String(localStorage.getItem(V2_TASKS_VIEW_KEY) || "list");
      return V2_TASKS_VIEW_MODES.includes(raw) ? raw : "list";
    } catch (e) {
      return "list";
    }
  }

  function setV2TasksViewMode(mode) {
    const next = V2_TASKS_VIEW_MODES.includes(mode) ? mode : "list";
    try {
      localStorage.setItem(V2_TASKS_VIEW_KEY, next);
    } catch (e) {
      /* ignore */
    }
    return next;
  }

  function iconV2ViewList() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 7h11M9 12h11M9 17h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="3.2" y="5.2" width="3.6" height="3.6" rx="1" fill="currentColor"/><rect x="3.2" y="10.2" width="3.6" height="3.6" rx="1" fill="currentColor"/><rect x="3.2" y="15.2" width="3.6" height="3.6" rx="1" fill="currentColor"/></svg>`;
  }

  function iconV2ViewGantt() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4.5v15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="7" y="5.2" width="7.5" height="3.2" rx="1" fill="currentColor"/><rect x="7" y="10.4" width="12" height="3.2" rx="1" fill="currentColor"/><rect x="7" y="15.6" width="5" height="3.2" rx="1" fill="currentColor"/></svg>`;
  }

  function iconV2ViewKanban() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3.5" width="5.2" height="17" rx="1.2" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.6"/><rect x="9.4" y="3.5" width="5.2" height="11.5" rx="1.2" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.6"/><rect x="15.8" y="3.5" width="5.2" height="14.2" rx="1.2" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.6"/></svg>`;
  }

  function v2TasksViewSwitcherHtml(activeMode) {
    const modes = [
      { id: "list", label: "Lista", title: "Widok listy", icon: iconV2ViewList() },
      { id: "gantt", label: "Gantt", title: "Widok Gantta", icon: iconV2ViewGantt() },
      { id: "kanban", label: "Kanban", title: "Widok Kanban", icon: iconV2ViewKanban() },
    ];
    return `
      <div class="v2-tasks-view-switch" role="group" aria-label="Tryb widoku zadań">
        ${modes
          .map(
            (mode) => `
          <button
            type="button"
            class="v2-tasks-view-btn${activeMode === mode.id ? " is-active" : ""}"
            data-role="v2-tasks-view"
            data-view="${mode.id}"
            title="${esc(mode.title)}"
            aria-label="${esc(mode.title)}"
            aria-pressed="${activeMode === mode.id ? "true" : "false"}"
          >
            ${mode.icon}
            <span>${esc(mode.label)}</span>
          </button>`
          )
          .join("")}
      </div>`;
  }

  function getV2WorkflowViewMode() {
    try {
      const raw = String(localStorage.getItem(V2_WF_VIEW_KEY) || "list");
      return V2_WF_VIEW_MODES.includes(raw) ? raw : "list";
    } catch (e) {
      return "list";
    }
  }

  function setV2WorkflowViewMode(mode) {
    const next = V2_WF_VIEW_MODES.includes(mode) ? mode : "list";
    try {
      localStorage.setItem(V2_WF_VIEW_KEY, next);
    } catch (e) {
      /* ignore */
    }
    return next;
  }

  function v2WorkflowViewSwitcherHtml(activeMode) {
    const modes = [
      { id: "list", label: "Lista", title: "Widok listy", icon: iconV2ViewList() },
      { id: "gantt", label: "Gantt", title: "Widok Gantta — czas trwania", icon: iconV2ViewGantt() },
    ];
    return `
      <div class="v2-tasks-view-switch" role="group" aria-label="Tryb widoku workflow">
        ${modes
          .map(
            (mode) => `
          <button
            type="button"
            class="v2-tasks-view-btn${activeMode === mode.id ? " is-active" : ""}"
            data-role="v2-wf-view"
            data-view="${mode.id}"
            title="${esc(mode.title)}"
            aria-label="${esc(mode.title)}"
            aria-pressed="${activeMode === mode.id ? "true" : "false"}"
          >
            ${mode.icon}
            <span>${esc(mode.label)}</span>
          </button>`
          )
          .join("")}
      </div>`;
  }

  function findTaskLinkedToDoc(project, docId) {
    const id = String(docId || "");
    if (!id || typeof collectProjectTasks !== "function") return null;
    const tasks = collectProjectTasks(project);
    return (
      tasks.find((task) => {
        if (id === "building-project") {
          return (
            task.linkedDoc?.kind === "building" ||
            String(task.linkedDoc?.id || "") === "building-project" ||
            String(task.docId || "") === "building-project"
          );
        }
        return (
          String(task.linkedDoc?.id || "") === id || String(task.docId || "") === id
        );
      }) || null
    );
  }

  function getFormalDocLinkStatus(project, doc) {
    const fill = getFormalDocFill(project, doc);
    const done = Number(fill.percent) >= 100;
    const task = findTaskLinkedToDoc(project, doc?.id);
    if (task && done) return { tone: "done", linked: true, outside: false, task, fill };
    if (task && !done) return { tone: "linked", linked: true, outside: false, task, fill };
    if (!task && done) return { tone: "outside", linked: false, outside: true, task: null, fill };
    return { tone: "unlinked", linked: false, outside: false, task: null, fill };
  }

  function getLinkedDocIdFromTask(task) {
    if (!task) return "";
    if (task.linkedDoc?.kind === "building") return "building-project";
    if (task.linkedDoc?.id) return String(task.linkedDoc.id);
    if (task.docId) return String(task.docId);
    return "";
  }

  function expandAncestorsToTask(projectId, taskId) {
    if (typeof loadTaskExpandState !== "function" || typeof saveTaskExpandState !== "function") {
      return;
    }
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || typeof collectProjectTasks !== "function") return;
    const tasks = collectProjectTasks(project);
    const byId = new Map(tasks.map((item) => [String(item.id), item]));
    const map = loadTaskExpandState(projectId);
    let parentId = byId.get(String(taskId))?.parentId || null;
    while (parentId) {
      map[String(parentId)] = true;
      parentId = byId.get(String(parentId))?.parentId || null;
    }
    saveTaskExpandState(projectId, map);
  }

  function queueTaskFlash(projectId, taskId) {
    v2PendingTaskFlash = {
      projectId: String(projectId),
      taskId: String(taskId),
    };
  }

  function findElByData(root, selector, dataKey, value) {
    return Array.from(root.querySelectorAll(selector)).find(
      (el) => String(el.dataset[dataKey] || "") === String(value)
    );
  }

  function applyPendingTaskFlash(root, projectId) {
    if (
      !v2PendingTaskFlash ||
      String(v2PendingTaskFlash.projectId) !== String(projectId)
    ) {
      return;
    }
    const taskId = String(v2PendingTaskFlash.taskId);
    v2PendingTaskFlash = null;
    const row = findElByData(root, ".v2-task-row", "taskId", taskId);
    if (!row) return;
    row.classList.add("is-task-flash");
    row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (v2TaskFlashTimer) window.clearTimeout(v2TaskFlashTimer);
    v2TaskFlashTimer = window.setTimeout(() => {
      row.classList.remove("is-task-flash");
      v2TaskFlashTimer = null;
    }, 2800);
  }

  function ensureFormalRailOpen(root) {
    const layout = root.querySelector('[data-role="v2-tasks-layout"]');
    const formalToggle = root.querySelector('[data-role="v2-formal-rail-toggle"]');
    const formalPanel = root.querySelector(".v2-formal-rail-panel");
    if (!layout || layout.classList.contains("is-formal-open")) return;
    layout.classList.add("is-formal-open");
    if (formalToggle) {
      formalToggle.setAttribute("aria-expanded", "true");
      formalToggle.title = "Zwiń dokumentację formalną";
    }
    if (formalPanel) formalPanel.hidden = false;
    saveFormalDocsRailOpen(true);
  }

  function setFormalDocFlash(root, docId, on) {
    if (on) ensureFormalRailOpen(root);
    const item = findElByData(
      root,
      '[data-role="v2-formal-rail-doc"]',
      "docId",
      docId
    );
    if (!item) return null;
    item.classList.toggle("is-flash-green", Boolean(on));
    if (on) item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return item;
  }

  function clearV2DocDragGhost() {
    if (v2DocDragGhost?.parentNode) v2DocDragGhost.parentNode.removeChild(v2DocDragGhost);
    v2DocDragGhost = null;
    document.body.classList.remove("v2-doc-dragging");
  }

  function createV2DocDragGhost(title) {
    clearV2DocDragGhost();
    const ghost = document.createElement("div");
    ghost.className = "v2-doc-drag-ghost";
    ghost.innerHTML = `
      <span class="v2-doc-drag-ghost-ico" aria-hidden="true">${iconFormalDocLink()}</span>
      <span class="v2-doc-drag-ghost-name">${esc(title || "Dokument")}</span>`;
    document.body.appendChild(ghost);
    v2DocDragGhost = ghost;
    document.body.classList.add("v2-doc-dragging");
    return ghost;
  }

  function linkV2DocToTask(projectId, taskId, docId) {
    const pid = String(projectId || "");
    const tid = String(taskId || "");
    const did = String(docId || "");
    if (!pid || !tid || !did) return false;
    ensureV2ProjectFlow(pid);
    const project =
      typeof getProjectById === "function" ? getProjectById(pid) : null;
    if (!project || typeof persistProject !== "function") return false;

    const inFlow = (project.flowInstance?.tasks || []).some(
      (item) => String(item.id) === tid
    );
    if (inFlow && typeof linkWorkflowTaskDocument === "function") {
      if (typeof setWorkflowRuntime === "function") {
        setWorkflowRuntime({ mode: "project", projectId: pid });
      }
      linkWorkflowTaskDocument(tid, did);
      return true;
    }

    const docs = getProjectFormDocuments(project);
    const doc = docs.find((item) => String(item.id) === did);
    const linkedDoc = {
      kind: did === "building-project" ? "building" : "survey-doc",
      id: did,
      name: doc?.title || did,
    };

    const customTasks = Array.isArray(project.customTasks) ? project.customTasks : [];
    const hasCustom = customTasks.some((item) => String(item.id) === tid);
    if (hasCustom) {
      persistProject({
        ...project,
        customTasks: customTasks.map((item) => {
          if (String(item.id) === tid) return { ...item, linkedDoc };
          if (String(item.linkedDoc?.id || "") === did) {
            return { ...item, linkedDoc: null };
          }
          return item;
        }),
        updatedAt: new Date().toISOString(),
      });
      return true;
    }

    if (typeof linkWorkflowTaskDocument === "function") {
      if (typeof setWorkflowRuntime === "function") {
        setWorkflowRuntime({ mode: "project", projectId: pid });
      }
      linkWorkflowTaskDocument(tid, did);
      return true;
    }
    return false;
  }

  function isProjectDocsRoute() {
    return v2Route.name === "project-docs" || v2Route.name === "docs";
  }

  function getDocsProjectId() {
    if (
      v2Route.name === "edit-project" ||
      v2Route.name === "project-docs" ||
      v2Route.name === "docs"
    ) {
      return String(v2Route.projectId || "");
    }
    return "";
  }

  function parseV2DeepLink() {
    try {
      const params = new URLSearchParams(window.location.search);
      const route = params.get("v2");
      const projectId = params.get("projectId");
      if (route === "configuration" || route === "config") {
        return { name: "configuration", tab: "statuses" };
      }
      if (route === "project-docs" && projectId) {
        return { name: "project-docs", projectId: String(projectId) };
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  function openProjectDocsWindow(projectId) {
    const id = String(projectId || "");
    if (!id) return;
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("v2", "project-docs");
    url.searchParams.set("projectId", id);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  function remountIfDocsContext() {
    if (v2Route.name === "edit-project" || isProjectDocsRoute()) mountV2();
  }

  function captureV2GanttScroll() {
    const scroller = document.querySelector('[data-role="v2-gantt-pan"]');
    if (!scroller) {
      v2GanttScrollPreserve = null;
      return;
    }
    v2GanttScrollPreserve = {
      left: scroller.scrollLeft,
      top: scroller.scrollTop,
    };
  }

  function restoreV2GanttScroll() {
    const saved = v2GanttScrollPreserve;
    v2GanttScrollPreserve = null;
    if (!saved) return;
    const apply = () => {
      const scroller = document.querySelector('[data-role="v2-gantt-pan"]');
      if (!scroller) return;
      scroller.scrollLeft = saved.left;
      scroller.scrollTop = saved.top;
    };
    apply();
    requestAnimationFrame(apply);
  }

  function remountTasksTab() {
    if (
      (v2Route.name === "edit-project" && (v2Route.tab || "project") === "tasks") ||
      v2Route.name === "task-detail"
    ) {
      captureV2GanttScroll();
      mountV2();
    }
  }

  function iconTaskCarton() {
    return `<svg class="v2-task-ico is-carton" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 8.2 12 4.8l7.5 3.4v8.8L12 20.2l-7.5-3.2V8.2Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.55" stroke-linejoin="round"/><path d="M4.5 8.2 12 11.6l7.5-3.4M12 11.6V20.2" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function iconTaskFolder() {
    return `<svg class="v2-task-ico is-folder" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5h5.2l1.8 1.8H20.5v9.2H3.5V7.5Z" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.55" stroke-linejoin="round"/></svg>`;
  }

  function iconTaskDoc() {
    return `<svg class="v2-task-ico is-doc" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7.2L19 8.3V20.5H7V3.5Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.55" stroke-linejoin="round"/><path d="M14.2 3.5V8.3H19M9.5 12h5M9.5 15.5h5" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function iconTaskCard() {
    return `<svg class="v2-task-ico is-card" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.2h14v12.6H5V6.2Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.55" stroke-linejoin="round"/><path d="M5 9.2h14M8.2 12.4h7.6M8.2 15.2h5.2" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>`;
  }

  /** Karteczka — dokument formalny (szara). */
  function iconFormalDocLink() {
    return `<svg class="v2-task-ico is-formal-link" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 5.2h8.4l3.2 3.2V18.8H6.2V5.2Z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.45" stroke-linejoin="round"/><path d="M14.6 5.2v3.2h3.2M8.4 11.2h7.2M8.4 14.2h5.2" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function iconBulkOwner() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7.2 7.8h6.2v6.2H7.2V7.8Z" stroke-linejoin="round"/><path d="M10.6 10.2H17V16.6h-6.4V10.2Z" stroke-linejoin="round" opacity="0.85"/><path d="M10.9 11.6v3.2M9.3 13.2h3.2M13.6 13.2v3.2M12 14.8h3.2" stroke-linecap="round"/></svg>`;
  }

  function iconColumns() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="1.4"/><path d="M9 4.5v15M15 4.5v15" stroke-linecap="round"/></svg>`;
  }

  function iconLockClosed() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="6" y="11" width="12" height="9" rx="1.5"/><path d="M8.5 11V8.2a3.5 3.5 0 0 1 7 0V11" stroke-linecap="round"/><circle cx="12" cy="15.2" r="1.1" fill="currentColor" stroke="none"/></svg>`;
  }

  function iconLockOpen() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="6" y="11" width="12" height="9" rx="1.5"/><path d="M8.5 11V8.2a3.5 3.5 0 0 1 6.7-1.4" stroke-linecap="round"/><circle cx="12" cy="15.2" r="1.1" fill="currentColor" stroke="none"/></svg>`;
  }

  function iconTaskAddPlus() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>`;
  }

  function iconCollapseAllTasks() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="m6 14 6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function iconExpandAllTasks() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="m6 10 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function v2TasksTreeFoldHtml() {
    return `
      <div class="v2-tasks-tree-fold" role="group" aria-label="Zwiń lub rozwiń drzewo zadań">
        <button
          type="button"
          class="v2-tasks-tree-fold-btn"
          data-role="v2-tasks-collapse-all"
          title="Zwiń wszystkie zadania"
          aria-label="Zwiń wszystkie zadania"
        >${iconCollapseAllTasks()}</button>
        <button
          type="button"
          class="v2-tasks-tree-fold-btn"
          data-role="v2-tasks-expand-all"
          title="Rozwiń wszystkie zadania"
          aria-label="Rozwiń wszystkie zadania"
        >${iconExpandAllTasks()}</button>
      </div>`;
  }

  function v2TasksPanelToolbarHtml(viewMode) {
    const mode = String(viewMode || "list");
    const editable = loadV2TasksListEdit();
    const layout = loadV2TasksTableState();
    const colsChrome =
      mode === "list"
        ? `<div class="v2-cols-menu-wrap" data-role="v2-cols-menu-wrap">
            <button
              type="button"
              class="v2-cols-menu-btn"
              data-role="v2-cols-menu-toggle"
              title="Kolumny"
              aria-expanded="false"
              aria-haspopup="true"
            >${iconColumns()}<span>Kolumny</span></button>
            ${v2TasksColumnsMenuHtml(layout)}
          </div>`
        : "";
    return `
      <div class="v2-tasks-panel-toolbar" data-role="v2-tasks-panel-toolbar">
        <div class="v2-tasks-panel-toolbar-start">
          ${v2TasksViewSwitcherHtml(mode)}
          ${v2TasksTreeFoldHtml()}
        </div>
        <div class="v2-tasks-panel-toolbar-end">
          <button
            type="button"
            class="v2-list-edit-toggle${editable ? " is-open" : ""}"
            data-role="v2-list-edit-toggle"
            title="${editable ? "Zablokuj edycję" : "Odblokuj edycję"}"
            aria-pressed="${editable ? "true" : "false"}"
            aria-label="${editable ? "Zablokuj edycję" : "Odblokuj edycję"}"
          >${editable ? iconLockOpen() : iconLockClosed()}<span>${
            editable ? "Edycja" : "Podgląd"
          }</span></button>
          ${colsChrome}
          <button
            type="button"
            class="v2-task-add-icon-btn"
            data-role="v2-task-add-root"
            title="Dodaj zadanie"
            aria-label="Dodaj zadanie"
          >${iconTaskAddPlus()}</button>
        </div>
      </div>`;
  }

  function loadV2TasksListEdit() {
    try {
      return localStorage.getItem(V2_TASKS_LIST_EDIT_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function saveV2TasksListEdit(open) {
    try {
      localStorage.setItem(V2_TASKS_LIST_EDIT_KEY, open ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
  }

  function v2TaskLevelIcon(depth) {
    const level = Math.max(0, Number(depth) || 0);
    if (level <= 0) return iconTaskCarton();
    if (level === 1) return iconTaskFolder();
    if (level === 2) return iconTaskDoc();
    return iconTaskCard();
  }

  function v2TaskDateLabel(iso) {
    if (!iso) return "—";
    if (typeof formatDateOnly === "function" && /^\d{4}-\d{2}-\d{2}/.test(String(iso))) {
      return formatDateOnly(String(iso).slice(0, 10));
    }
    return String(iso).slice(0, 10);
  }

  function v2TaskDurationLabel(project, task) {
    const flowTask = (project?.flowInstance?.tasks || []).find(
      (item) => String(item.id) === String(task.id)
    );
    const probe = {
      startDate: task.startDate || "",
      dueDate: task.dueDate || "",
      durationDays: flowTask?.durationDays,
    };
    let days = null;
    if (typeof taskDisplaySpanDays === "function") {
      days = taskDisplaySpanDays(probe);
    } else if (probe.durationDays > 0) {
      days = Number(probe.durationDays);
    }
    if (days == null || days <= 0) return "—";
    if (typeof formatTaskDaysCount === "function") return formatTaskDaysCount(days);
    return `${Math.round(days)} dni`;
  }

  function v2TaskOwnerLabel(project, task) {
    if (typeof ownerLabel === "function") return ownerLabel(project, task.ownerId);
    return "Brak właściciela";
  }

  function ensureV2ProjectFlow(projectId) {
    if (typeof setWorkflowRuntime === "function") {
      setWorkflowRuntime({ mode: "project", projectId: String(projectId) });
    }
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || typeof persistProject !== "function") return null;
    if (project.flowInstance && Array.isArray(project.flowInstance.tasks)) return project;
    return persistProject({
      ...project,
      flowInstance: {
        sourcePathId: project.flowInstance?.sourcePathId || null,
        sourcePathName: project.flowInstance?.sourcePathName || "Flow projektu",
        generatedAt: project.flowInstance?.generatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks: [],
      },
      updatedAt: new Date().toISOString(),
    });
  }

  function expandV2TaskNode(projectId, taskId) {
    if (typeof loadTaskExpandState !== "function" || typeof saveTaskExpandState !== "function") {
      return;
    }
    const map = loadTaskExpandState(projectId);
    map[taskId] = true;
    saveTaskExpandState(projectId, map);
  }

  function toggleV2TaskExpand(projectId, taskId) {
    if (typeof loadTaskExpandState !== "function" || typeof saveTaskExpandState !== "function") {
      return;
    }
    const map = loadTaskExpandState(projectId);
    const tasks =
      typeof collectProjectTasks === "function"
        ? collectProjectTasks(getProjectById(projectId) || {})
        : [];
    const task = tasks.find((item) => String(item.id) === String(taskId));
    const currently =
      typeof isTaskNodeExpanded === "function"
        ? isTaskNodeExpanded(projectId, task || { id: taskId, depth: 0 }, map)
        : Boolean(map[taskId]);
    map[taskId] = !currently;
    saveTaskExpandState(projectId, map);
  }

  function cloneV2Route(route) {
    try {
      return JSON.parse(JSON.stringify(route || { name: "home" }));
    } catch (e) {
      return { name: "home" };
    }
  }

  function routesEqual(a, b) {
    return JSON.stringify(a || null) === JSON.stringify(b || null);
  }

  function persistV2Route(route) {
    try {
      localStorage.setItem(V2_ROUTE_KEY, JSON.stringify(route || { name: "home" }));
    } catch (e) {
      /* ignore */
    }
  }

  function loadV2Route() {
    try {
      const raw = JSON.parse(localStorage.getItem(V2_ROUTE_KEY) || "null");
      if (!raw || typeof raw !== "object" || !raw.name) return null;
      return raw;
    } catch (e) {
      return null;
    }
  }

  function rememberV2History(previous) {
    if (!previous || previous.name === undefined) return;
    v2NavHistory.push(cloneV2Route(previous));
    if (v2NavHistory.length > 40) v2NavHistory.shift();
  }

  function goBackV2() {
    if (document.querySelector('[data-role="v2-task-sheet-root"]')) {
      closeV2TaskSidePanel({ save: true });
      return;
    }
    leaveDocFormContext();
    const prev = v2NavHistory.pop();
    v2SkipHistoryPush = true;
    v2Route = prev ? cloneV2Route(prev) : { name: "home" };
    persistV2Route(v2Route);
    mountV2();
  }

  function ensureV2TaskNameModal() {
    let modal = document.getElementById("v2TaskNameModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "v2TaskNameModal";
    modal.className = "v2-file-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="v2-file-modal-backdrop" data-role="v2-task-name-close"></div>
      <div class="v2-file-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="v2TaskNameTitle">
        <header class="v2-file-modal-head">
          <div>
            <p class="v2-file-modal-kicker" data-role="v2-task-name-eyebrow">Zadanie</p>
            <h2 id="v2TaskNameTitle" data-role="v2-task-name-title">Nowe zadanie</h2>
          </div>
          <button type="button" class="v2-file-modal-close" data-role="v2-task-name-close" aria-label="Zamknij">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <div class="v2-file-modal-body">
          <label class="v2-field">
            <span class="v2-field-label">Nazwa zadania</span>
            <input
              type="text"
              data-role="v2-task-name-input"
              maxlength="160"
              autocomplete="off"
              placeholder="np. Projekt budowlany"
            />
          </label>
        </div>
        <footer class="v2-file-modal-foot">
          <button type="button" class="v2-back-btn" data-role="v2-task-name-close">Anuluj</button>
          <button type="button" class="v2-file-modal-confirm" data-role="v2-task-name-save">Zapisz</button>
        </footer>
      </div>`;
    document.body.appendChild(modal);

    const close = () => {
      modal.hidden = true;
      v2TaskNameOnSave = null;
      const input = modal.querySelector('[data-role="v2-task-name-input"]');
      if (input) input.value = "";
    };

    const save = () => {
      const input = modal.querySelector('[data-role="v2-task-name-input"]');
      const name = String(input?.value || "").trim();
      if (!name) {
        input?.focus();
        showV2Toast("Podaj nazwę zadania");
        return;
      }
      const onSave = v2TaskNameOnSave;
      close();
      if (typeof onSave === "function") onSave(name);
    };

    modal.addEventListener("click", (event) => {
      const target = event.target.closest("[data-role]");
      if (!target) return;
      const role = target.dataset.role;
      if (role === "v2-task-name-close") {
        event.preventDefault();
        close();
        return;
      }
      if (role === "v2-task-name-save") {
        event.preventDefault();
        save();
      }
    });

    modal
      .querySelector('[data-role="v2-task-name-input"]')
      ?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          save();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      });

    return modal;
  }

  function openV2TaskNameModal({ title, eyebrow, placeholder, onSave }) {
    const modal = ensureV2TaskNameModal();
    v2TaskNameOnSave = typeof onSave === "function" ? onSave : null;
    const titleEl = modal.querySelector('[data-role="v2-task-name-title"]');
    const eyebrowEl = modal.querySelector('[data-role="v2-task-name-eyebrow"]');
    const input = modal.querySelector('[data-role="v2-task-name-input"]');
    if (titleEl) titleEl.textContent = title || "Nowe zadanie";
    if (eyebrowEl) eyebrowEl.textContent = eyebrow || "Zadanie";
    if (input) {
      input.value = "";
      input.placeholder = placeholder || "np. Projekt budowlany";
    }
    modal.hidden = false;
    requestAnimationFrame(() => input?.focus());
  }

  function iconGeoportalApi() {
    return `<svg class="v2-geoportal-api-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
      <path d="M8.5 8.5h7v7h-7V8.5Z" stroke-linejoin="round"/>
      <path d="M12 5.2V8.5M12 15.5v3.3M5.2 12H8.5M15.5 12h3.3" stroke-linecap="round"/>
      <circle cx="12" cy="12" r="1.35"/>
    </svg>`;
  }

  function setV2TaskBoardStatus(projectId, taskId, statusId) {
    if (typeof persistTaskBoardStatus === "function") {
      return Boolean(persistTaskBoardStatus(projectId, taskId, statusId));
    }
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || !taskId || typeof persistProject !== "function") return false;
    const key = String(taskId);
    const nextStatus = String(statusId || "");
    persistProject({
      ...project,
      taskBoardStatus: {
        ...(project.taskBoardStatus || {}),
        [key]: nextStatus,
      },
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  /** Kolory % wypełnienia: 0% stonowany czerwony → 100% stonowany zielony. */
  function v2FillPercentTone(percent) {
    const pct = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    if (pct <= 0) return "is-pct-0";
    if (pct < 25) return "is-pct-20";
    if (pct < 50) return "is-pct-40";
    if (pct < 75) return "is-pct-60";
    if (pct < 100) return "is-pct-80";
    return "is-pct-100";
  }

  function v2StatusColorId(statusKey) {
    const statuses = getV2TaskStatusOptions();
    const hit = statuses.find((item) => String(item.id) === String(statusKey || ""));
    if (hit?.color && typeof normalizeStatusColor === "function") {
      return normalizeStatusColor(hit.color, "gray");
    }
    if (hit?.color) return String(hit.color);
    const idx = Math.max(
      0,
      statuses.findIndex((item) => String(item.id) === String(statusKey || ""))
    );
    if (typeof defaultStatusColorForIndex === "function") {
      return defaultStatusColorForIndex(idx);
    }
    return ["gray", "blue", "green", "amber", "violet"][Math.min(idx, 4)] || "gray";
  }

  /** Kolor statusu z konfiguracji (podstawowa paleta). */
  function v2StatusToneClass(statusKey) {
    return `is-color-${v2StatusColorId(statusKey)}`;
  }

  function setV2TaskOwner(projectId, taskId, ownerId) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || !taskId || typeof persistProject !== "function") return false;
    const nextOwner = String(ownerId || "none");
    persistProject({
      ...project,
      taskOwners: {
        ...(project.taskOwners || {}),
        [String(taskId)]: nextOwner,
      },
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  function getV2TaskNotes(project, taskId) {
    if (typeof getTaskNotes === "function") return getTaskNotes(project, taskId);
    const bag = project?.taskNotes || {};
    const key = String(taskId ?? "");
    const saved = bag[key] ?? bag[taskId];
    return typeof saved === "string" ? saved : "";
  }

  function setV2TaskNotes(projectId, taskId, notes) {
    if (typeof persistTaskNotes === "function") {
      return Boolean(persistTaskNotes(projectId, taskId, notes));
    }
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || !taskId || typeof persistProject !== "function") return false;
    persistProject({
      ...project,
      taskNotes: {
        ...(project.taskNotes || {}),
        [String(taskId)]: String(notes || ""),
      },
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  function v2TaskNotesInputHtml(project, task) {
    const value = getV2TaskNotes(project, task.id);
    return `
      <input
        type="text"
        class="v2-task-notes-input"
        data-role="v2-task-notes-inline"
        data-task-id="${esc(String(task.id))}"
        value="${esc(value)}"
        placeholder="Uwagi…"
        aria-label="Uwagi do zadania"
        title="Uwagi"
      />`;
  }

  function v2TaskStatusSelectHtml(task) {
    const statuses = getV2TaskStatusOptions();
    const current = String(task.statusKey || statuses[0]?.id || "todo");
    const options = statuses
      .map((status) => {
        const selected = String(status.id) === current ? " selected" : "";
        return `<option value="${esc(status.id)}"${selected}>${esc(
          status.label || status.id
        )}</option>`;
      })
      .join("");
    return `
      <select
        class="v2-task-status-select ${v2StatusToneClass(current)}"
        data-role="v2-task-status-inline"
        data-task-id="${esc(String(task.id))}"
        data-status="${esc(current)}"
        aria-label="Status zadania"
        title="Status"
      >${options}</select>`;
  }

  function v2TaskOwnerSelectHtml(project, task) {
    const options =
      typeof getTaskOwnerOptions === "function"
        ? getTaskOwnerOptions(project)
        : [{ id: "none", name: "Brak właściciela" }];
    const current = String(task.ownerId || options[0]?.id || "none");
    const opts = options
      .map((opt) => {
        const selected = String(opt.id) === current ? " selected" : "";
        return `<option value="${esc(opt.id)}"${selected}>${esc(opt.name)}</option>`;
      })
      .join("");
    return `
      <select
        class="v2-task-owner-select"
        data-role="v2-task-owner-inline"
        data-task-id="${esc(String(task.id))}"
        aria-label="Właściciel zadania"
        title="Właściciel"
      >${opts}</select>`;
  }

  function getV2TaskAuthorName(project, taskId) {
    const saved = project?.taskAuthors?.[taskId];
    if (typeof saved === "string" && saved.trim()) return saved.trim();
    const user =
      typeof getCurrentAccountUser === "function" ? getCurrentAccountUser() : null;
    return user?.name || "—";
  }

  function getV2TaskRegisteredLabel(project, task) {
    const flowTask = (project?.flowInstance?.tasks || []).find(
      (item) => String(item.id) === String(task.id)
    );
    const custom = (project?.customTasks || []).find(
      (item) => String(item.id) === String(task.id)
    );
    const iso =
      flowTask?.createdAt ||
      custom?.updatedAt ||
      task.updatedAt ||
      project?.updatedAt ||
      project?.createdAt ||
      "";
    if (!iso) return "—";
    if (typeof formatDate === "function") return formatDate(iso);
    return v2TaskDateLabel(iso);
  }

  function getV2TaskStatusOptions() {
    if (typeof getKanbanStatuses === "function") return getKanbanStatuses();
    return [
      { id: "todo", label: "Do zrobienia" },
      { id: "progress", label: "W toku" },
      { id: "done", label: "Gotowe" },
    ];
  }

  function stampV2TaskAuthor(projectId, taskId) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || !taskId || typeof persistProject !== "function") return;
    if (project.taskAuthors?.[taskId]) return;
    const user =
      typeof getCurrentAccountUser === "function" ? getCurrentAccountUser() : null;
    if (!user?.name) return;
    persistProject({
      ...project,
      taskAuthors: { ...(project.taskAuthors || {}), [taskId]: user.name },
      updatedAt: new Date().toISOString(),
    });
  }

  function applyV2NewSubtaskSchedule(projectId, taskId, parentId) {
    const pid = String(projectId || "");
    const tid = String(taskId || "");
    const parent = String(parentId || "");
    if (!pid || !tid || !parent || typeof getProjectById !== "function") return;
    const project = getProjectById(pid);
    if (!project) return;
    const parentStart = String(
      (typeof getTaskStartDate === "function"
        ? getTaskStartDate(project, parent)
        : project.taskStartDates?.[parent]) || ""
    ).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parentStart)) return;

    let endIso = parentStart;
    if (typeof parseTaskDateOnly === "function" && typeof addDaysIso === "function") {
      const startDate = parseTaskDateOnly(parentStart);
      // 2 dni włącznie: start + 1 dzień kalendarzowy
      endIso = toIsoDateOnly(addDaysIso(startDate, 1));
    }
    const parentDue = String(
      (typeof getTaskDueDate === "function"
        ? getTaskDueDate(project, parent)
        : project.taskDueDates?.[parent]) || ""
    ).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(parentDue) && endIso > parentDue) {
      endIso = parentDue;
    }

    let next = {
      ...project,
      taskStartDates: { ...(project.taskStartDates || {}), [tid]: parentStart },
      taskDueDates: { ...(project.taskDueDates || {}), [tid]: endIso },
      customTasks: (project.customTasks || []).map((item) =>
        String(item.id) === tid
          ? {
              ...item,
              startDate: parentStart,
              dueDate: endIso,
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
      updatedAt: new Date().toISOString(),
    };
    if (next.flowInstance?.tasks) {
      next = {
        ...next,
        flowInstance: {
          ...next.flowInstance,
          tasks: next.flowInstance.tasks.map((item) =>
            String(item.id) === tid
              ? { ...item, startDate: parentStart, durationDays: 2 }
              : item
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    if (typeof persistProject === "function") persistProject(next);
  }

  function createV2ProjectTask(projectId, name, parentId = null) {
    ensureV2ProjectFlow(projectId);
    let created = null;
    if (typeof createWorkflowTask === "function") {
      created = createWorkflowTask(name, parentId || null);
    } else {
      const project =
        typeof getProjectById === "function" ? getProjectById(projectId) : null;
      if (!project || typeof persistProject !== "function") return null;
      const taskId = `task-${Date.now()}`;
      persistProject({
        ...project,
        customTasks: [
          ...(project.customTasks || []),
          {
            id: taskId,
            name,
            parentId: parentId || null,
            updatedAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      });
      created = { id: taskId, name };
    }
    if (created?.id) stampV2TaskAuthor(projectId, created.id);
    if (created?.id && parentId) {
      applyV2NewSubtaskSchedule(projectId, created.id, parentId);
    }
    return created;
  }

  function confirmV2Dialog({
    title = "Potwierdzenie",
    message = "",
    confirmLabel = "Usuń",
    cancelLabel = "Anuluj",
    danger = true,
  } = {}) {
    return new Promise((resolve) => {
      const existing = document.querySelector('[data-role="v2-confirm-modal"]');
      existing?.remove();
      const modal = document.createElement("div");
      modal.className = "v2-modal";
      modal.dataset.role = "v2-confirm-modal";
      modal.innerHTML = `
        <div class="v2-modal-backdrop" data-role="v2-confirm-close"></div>
        <div class="v2-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="v2ConfirmTitle">
          <header class="v2-modal-head">
            <div>
              <p class="v2-modal-kicker">snapPoint</p>
              <h2 class="v2-projects-title" id="v2ConfirmTitle">${esc(title)}</h2>
            </div>
            <button type="button" class="v2-modal-close" data-role="v2-confirm-close" aria-label="Zamknij">×</button>
          </header>
          <div class="v2-modal-body">
            <p class="v2-confirm-message">${esc(message).replace(/\n/g, "<br>")}</p>
          </div>
          <footer class="v2-modal-foot">
            <button type="button" class="v2-section-btn" data-role="v2-confirm-close">${esc(
              cancelLabel
            )}</button>
            <button
              type="button"
              class="v2-section-btn${danger ? " is-danger" : ""}"
              data-role="v2-confirm-ok"
            >${esc(confirmLabel)}</button>
          </footer>
        </div>`;
      document.body.appendChild(modal);
      const close = (value) => {
        modal.remove();
        resolve(value);
      };
      modal.querySelectorAll('[data-role="v2-confirm-close"]').forEach((el) => {
        el.addEventListener("click", () => close(false));
      });
      modal.querySelector('[data-role="v2-confirm-ok"]')?.addEventListener("click", () => {
        close(true);
      });
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close(false);
        }
        if (event.key === "Enter") {
          event.preventDefault();
          close(true);
        }
      });
      requestAnimationFrame(() => {
        modal.querySelector('[data-role="v2-confirm-ok"]')?.focus();
      });
    });
  }

  async function confirmDeleteV2ProjectTask(projectId, taskId) {
    const pid = String(projectId || "");
    const tid = String(taskId || "");
    if (!pid || !tid || typeof getProjectById !== "function") return false;
    if (typeof setWorkflowRuntime === "function") {
      setWorkflowRuntime({ mode: "project", projectId: pid });
    }
    const project = getProjectById(pid);
    if (!project) return false;
    const tasks =
      typeof collectProjectTasks === "function" ? collectProjectTasks(project) : [];
    const task = tasks.find((item) => String(item.id) === tid);
    if (!task) return false;
    const ok = await confirmV2Dialog({
      title: "Usuń zadanie",
      message: `Czy na pewno chcesz usunąć to zadanie i wszystkie podrzędne zadania?\n\n„${
        task.name || "Zadanie"
      }”`,
      confirmLabel: "Usuń",
      cancelLabel: "Anuluj",
      danger: true,
    });
    if (!ok) return false;
    if (typeof deleteProjectTaskCascade === "function") {
      return Boolean(deleteProjectTaskCascade(pid, tid));
    }
    return false;
  }

  function unlinkV2TaskFormalDoc(projectId, taskId) {
    const pid = String(projectId || "");
    const tid = String(taskId || "");
    if (!pid || !tid || typeof getProjectById !== "function") return false;
    ensureV2ProjectFlow(pid);
    if (typeof setWorkflowRuntime === "function") {
      setWorkflowRuntime({ mode: "project", projectId: pid });
    }
    const project = getProjectById(pid);
    if (!project || typeof persistProject !== "function") return false;

    const inFlow = (project.flowInstance?.tasks || []).some(
      (item) => String(item.id) === tid
    );
    if (inFlow && typeof linkWorkflowTaskDocument === "function") {
      linkWorkflowTaskDocument(tid, null);
    }

    const next = {
      ...getProjectById(pid),
      customTasks: (getProjectById(pid)?.customTasks || []).map((item) =>
        String(item.id) === tid ? { ...item, linkedDoc: null } : item
      ),
      updatedAt: new Date().toISOString(),
    };
    if (next.flowInstance?.tasks) {
      next.flowInstance = {
        ...next.flowInstance,
        tasks: next.flowInstance.tasks.map((item) =>
          String(item.id) === tid
            ? { ...item, linkedDocId: null, linkedDoc: null }
            : item
        ),
        updatedAt: new Date().toISOString(),
      };
    }
    persistProject(next);
    return true;
  }

  function collectV2RelatedTasks(project, task) {
    if (!task || typeof collectProjectTasks !== "function") return [];
    const all = collectProjectTasks(project);
    const byId = new Map(all.map((item) => [String(item.id), item]));
    const related = new Map();

    const add = (item, relation) => {
      if (!item || String(item.id) === String(task.id)) return;
      if (related.has(String(item.id))) return;
      related.set(String(item.id), { ...item, relation });
    };

    if (task.parentId && byId.has(String(task.parentId))) {
      add(byId.get(String(task.parentId)), "Nadrzędne");
    }
    all
      .filter((item) => String(item.parentId || "") === String(task.id))
      .forEach((item) => add(item, "Podzadanie"));
    all
      .filter(
        (item) =>
          String(item.parentId || "") === String(task.parentId || "") &&
          String(item.id) !== String(task.id)
      )
      .forEach((item) => add(item, "Równoległe"));

    const flowTask = (project?.flowInstance?.tasks || []).find(
      (item) => String(item.id) === String(task.id)
    );
    (flowTask?.blockedBy || []).forEach((id) => {
      if (byId.has(String(id))) add(byId.get(String(id)), "Wymaga");
    });
    (flowTask?.blocks || []).forEach((id) => {
      if (byId.has(String(id))) add(byId.get(String(id)), "Blokuje");
    });
    (task.dependsOn || []).forEach((id) => {
      if (byId.has(String(id))) add(byId.get(String(id)), "Wymaga");
    });

    return Array.from(related.values());
  }

  function collectV2VisibleTasks(project) {
    if (typeof collectProjectTasks !== "function") return [];
    const all = collectProjectTasks(project);
    if (typeof filterTasksByExpandState === "function") {
      return filterTasksByExpandState(project.id, all);
    }
    return all;
  }

  function resolveV2LinkedDocTitle(project, docId) {
    const id = String(docId || "");
    if (!id) return "Dokument formalny";
    const doc = getProjectFormDocuments(project).find((item) => String(item.id) === id);
    return doc?.title || "Dokument formalny";
  }

  function v2FlowTaskForProject(project, taskId) {
    return (project?.flowInstance?.tasks || []).find(
      (item) => String(item.id) === String(taskId)
    );
  }

  function v2TaskDateInputHtml(task, field) {
    const value =
      field === "start"
        ? String(task.startDate || "").slice(0, 10)
        : String(task.dueDate || "").slice(0, 10);
    const role = field === "start" ? "v2-task-start-inline" : "v2-task-due-inline";
    const label = field === "start" ? "Data od" : "Data do";
    return `
      <input
        type="date"
        class="v2-task-date-input"
        data-role="${role}"
        data-task-id="${esc(String(task.id))}"
        value="${esc(value)}"
        aria-label="${esc(label)}"
        title="${esc(label)}"
      />`;
  }

  function v2ProjectFlowStartAnchorHtml(project) {
    const hasTasks =
      (project?.flowInstance?.tasks || []).length > 0 ||
      (project?.customTasks || []).length > 0 ||
      (typeof collectProjectTasks === "function" &&
        collectProjectTasks(project || {}).length > 0);
    if (!hasTasks) return "";
    const startIso =
      typeof getProjectFlowScheduleAnchor === "function"
        ? getProjectFlowScheduleAnchor(project) || ""
        : "";
    const hasStart = Boolean(startIso);
    return `
      <label class="v2-flow-start-anchor${hasStart ? "" : " is-needed"}" title="Zawsze data najwcześniejszego zadania. Zmiana przesuwa cały harmonogram względem tej daty.">
        <span class="v2-flow-start-anchor-label">Start projektu</span>
        <input
          type="date"
          data-role="v2-flow-start-anchor"
          value="${esc(startIso)}"
          aria-label="Data startu projektu (najwcześniejsze zadanie)"
        />
      </label>`;
  }

  function v2TaskListCellHtml(project, task, colId, expandMap, editable) {
    const depth = Math.max(0, Number(task.depth) || 0);
    if (colId === "name") {
      const expanded =
        typeof isTaskNodeExpanded === "function"
          ? isTaskNodeExpanded(project.id, task, expandMap)
          : Boolean(expandMap[task.id]);
      const toggle = task.hasChildren
        ? `<button
            type="button"
            class="v2-task-toggle${expanded ? " is-open" : ""}"
            data-role="v2-task-toggle"
            data-task-id="${esc(task.id)}"
            aria-expanded="${expanded ? "true" : "false"}"
            title="${expanded ? "Zwiń" : "Rozwiń"}"
            aria-label="${expanded ? "Zwiń podzadania" : "Rozwiń podzadania"}"
          >${expanded ? "−" : "+"}</button>`
        : `<span class="v2-task-toggle-spacer" aria-hidden="true"></span>`;
      const addChild = editable
        ? `<button
            type="button"
            class="v2-task-add-child"
            data-role="v2-task-add-child"
            data-task-id="${esc(task.id)}"
            title="Dodaj podzadanie"
            aria-label="Dodaj podzadanie do: ${esc(task.name || "Zadanie")}"
          >+</button>`
        : "";
      const deleteBtn = editable
        ? `<button
            type="button"
            class="v2-task-delete"
            data-role="v2-task-delete"
            data-task-id="${esc(task.id)}"
            title="Usuń zadanie"
            aria-label="Usuń zadanie: ${esc(task.name || "Zadanie")}"
          >×</button>`
        : "";
      return `
        <div class="v2-task-name" style="--v2-task-depth:${depth}">
          ${toggle}
          <span class="v2-task-kind-icon" aria-hidden="true">${v2TaskLevelIcon(depth)}</span>
          <button
            type="button"
            class="v2-task-title-link"
            data-role="v2-open-task"
            data-task-id="${esc(task.id)}"
            title="Otwórz zadanie"
          >${esc(task.name || "Zadanie")}</button>
          ${addChild}
          ${deleteBtn}
        </div>`;
    }
    if (colId === "icons") {
      const linkedDocId = getLinkedDocIdFromTask(task);
      if (!linkedDocId) return "";
      const docTitle = resolveV2LinkedDocTitle(project, linkedDocId);
      return `
        <span class="v2-task-icons">
          <button
            type="button"
            class="v2-task-linked-doc"
            data-role="v2-task-linked-doc"
            data-doc-id="${esc(linkedDocId)}"
            title="${esc(docTitle)}"
            aria-label="Dokument formalny: ${esc(docTitle)}"
          >${iconFormalDocLink()}</button>
        </span>`;
    }
    if (colId === "status") {
      const tone = v2StatusToneClass(task.statusKey);
      return editable
        ? v2TaskStatusSelectHtml(task)
        : `<span class="v2-task-readonly v2-task-status-pill ${tone}">${esc(
            task.status || "—"
          )}</span>`;
    }
    if (colId === "duration") return esc(v2TaskDurationLabel(project, task));
    if (colId === "start") {
      return editable
        ? v2TaskDateInputHtml(task, "start")
        : `<span class="v2-task-readonly">${esc(v2TaskDateLabel(task.startDate))}</span>`;
    }
    if (colId === "due") {
      return editable
        ? v2TaskDateInputHtml(task, "due")
        : `<span class="v2-task-readonly">${esc(v2TaskDateLabel(task.dueDate))}</span>`;
    }
    if (colId === "owner") {
      return editable
        ? v2TaskOwnerSelectHtml(project, task)
        : `<span class="v2-task-readonly">${esc(v2TaskOwnerLabel(project, task))}</span>`;
    }
    if (colId === "notes") {
      const notes = getV2TaskNotes(project, task.id);
      return editable
        ? v2TaskNotesInputHtml(project, task)
        : `<span class="v2-task-readonly" title="${esc(notes)}">${esc(
            notes || "—"
          )}</span>`;
    }
    return "";
  }

  function v2TasksColumnsMenuHtml(layout) {
    const items = V2_TASK_COL_DEFS.map((col) => {
      const checked = col.pinned || layout.visible[col.id] !== false;
      return `
        <label class="v2-cols-menu-item${col.pinned ? " is-pinned" : ""}">
          <input
            type="checkbox"
            data-role="v2-col-visibility"
            data-col="${esc(col.id)}"
            ${checked ? "checked" : ""}
            ${col.pinned ? "disabled" : ""}
          />
          <span>${esc(col.label)}</span>
        </label>`;
    }).join("");
    return `
      <div class="v2-cols-menu" data-role="v2-cols-menu" hidden>
        <p class="v2-cols-menu-title">Widoczne kolumny</p>
        ${items}
      </div>`;
  }

  function projectTasksListViewHtml(project) {
    const all =
      typeof collectProjectTasks === "function" ? collectProjectTasks(project) : [];
    const visible = collectV2VisibleTasks(project);
    const expandMap =
      typeof loadTaskExpandState === "function" ? loadTaskExpandState(project.id) : {};
    const layout = loadV2TasksTableState();
    const columns = getV2VisibleTaskColumns(layout);
    const editable = loadV2TasksListEdit();

    if (!all.length) {
      return `<p class="v2-docs-empty">Brak zadań. Dodaj pierwsze zadanie ikoną „+” w nagłówku.</p>`;
    }

    const colgroup = columns
      .map((col) => {
        const width = layout.widths[col.id] || col.defaultWidth;
        return `<col data-col="${esc(col.id)}" style="width:${width}px" />`;
      })
      .join("");

    const headCells = columns
      .map((col) => {
        const canDrag = editable && !col.pinned;
        const bulkOwner =
          editable && col.id === "owner"
            ? `<button
                type="button"
                class="v2-th-bulk-owner"
                data-role="v2-bulk-owner"
                title="Masowe przypisanie właściciela"
                aria-label="Masowe przypisanie właściciela"
              >${iconBulkOwner()}</button>`
            : "";
        return `
          <th
            class="v2-task-col-${esc(col.id)}"
            data-col="${esc(col.id)}"
            ${canDrag ? 'draggable="true"' : ""}
            scope="col"
          >
            <span class="v2-th-label">${esc(col.label)}</span>
            ${bulkOwner}
            ${
              editable
                ? `<span class="v2-col-resize" data-role="v2-task-col-resize" data-col="${esc(
                    col.id
                  )}" title="Zmień szerokość"></span>`
                : ""
            }
          </th>`;
      })
      .join("");

    const rows = visible
      .map((task) => {
        const depth = Math.max(0, Number(task.depth) || 0);
        const cells = columns
          .map(
            (col) => `
          <td class="v2-task-col-${esc(col.id)}" data-col="${esc(col.id)}">
            ${v2TaskListCellHtml(project, task, col.id, expandMap, editable)}
          </td>`
          )
          .join("");
        return `
          <tr
            class="v2-task-row"
            data-task-id="${esc(task.id)}"
            data-depth="${depth}"
            data-role="v2-task-drop"
          >${cells}</tr>`;
      })
      .join("");

    return `
      <div
        class="v2-tasks-table-wrap${editable ? " is-editable" : " is-locked"}"
        data-role="v2-tasks-table-wrap"
      >
        <table
          class="v2-tasks-table${editable ? " is-col-customizable" : ""}"
          data-role="v2-tasks-table"
        >
          <colgroup>${colgroup}</colgroup>
          <thead>
            <tr class="v2-tasks-head-row">${headCells}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function projectTasksKanbanViewHtml(project) {
    const columns = getV2TaskStatusOptions();
    const all =
      typeof collectProjectTasks === "function" ? collectProjectTasks(project) : [];
    const leafTasks = all.filter((task) => !task.hasChildren);

    if (!all.length) {
      return `<p class="v2-docs-empty">Brak zadań. Dodaj pierwsze zadanie ikoną „+” w nagłówku.</p>`;
    }

    const cardsByStatus = new Map(columns.map((col) => [col.id, []]));
    const fallbackId = columns[0]?.id || "todo";
    leafTasks.forEach((task) => {
      const key = String(task.statusKey || fallbackId);
      if (!cardsByStatus.has(key)) cardsByStatus.set(key, []);
      cardsByStatus.get(key).push(task);
    });

    const board = columns
      .map((column) => {
        const tasks = cardsByStatus.get(column.id) || [];
        const cards = tasks
          .map((task) => {
            const progress = Number.isFinite(Number(task.progress))
              ? Math.round(Number(task.progress))
              : 0;
            const dueLabel = task.dueDate
              ? v2TaskDateLabel(task.dueDate)
              : "Bez terminu";
            const startLabel = task.startDate ? v2TaskDateLabel(task.startDate) : "";
            const dateLine =
              startLabel && task.dueDate ? `${startLabel} – ${dueLabel}` : dueLabel;
            return `
              <article
                class="v2-kanban-card"
                draggable="true"
                data-role="v2-kanban-card"
                data-task-id="${esc(task.id)}"
                data-status="${esc(column.id)}"
              >
                <button
                  type="button"
                  class="v2-kanban-card-title"
                  data-role="v2-open-task"
                  data-task-id="${esc(task.id)}"
                  title="Otwórz zadanie"
                >${esc(task.name || "Zadanie")}</button>
                <p class="v2-kanban-card-meta">${esc(dateLine)}</p>
                <p class="v2-kanban-card-owner">${esc(v2TaskOwnerLabel(project, task))}</p>
                <div class="v2-kanban-card-progress" title="${progress}%">
                  <span class="v2-kanban-card-bar" aria-hidden="true">
                    <span style="width:${progress}%"></span>
                  </span>
                  <strong>${progress}%</strong>
                </div>
              </article>`;
          })
          .join("");
        return `
          <section class="v2-kanban-column" data-status="${esc(column.id)}">
            <header class="v2-kanban-column-head">
              <h3>${esc(column.label || column.id)}</h3>
              <span class="v2-kanban-column-count" data-role="v2-kanban-column-count">${
                tasks.length
              }</span>
            </header>
            <div
              class="v2-kanban-column-body"
              data-role="v2-kanban-drop"
              data-status="${esc(column.id)}"
            >
              ${
                cards ||
                `<p class="v2-kanban-empty" data-role="v2-kanban-empty">Przeciągnij zadanie tutaj</p>`
              }
              ${
                cards
                  ? `<p class="v2-kanban-empty" data-role="v2-kanban-empty" hidden>Przeciągnij zadanie tutaj</p>`
                  : ""
              }
            </div>
          </section>`;
      })
      .join("");

    return `
      <div class="v2-kanban" data-role="v2-kanban-view" data-project-id="${esc(project.id)}">
        <div class="v2-kanban-board" data-role="v2-kanban-board">${board}</div>
      </div>`;
  }

  function projectTasksGanttViewHtml(project) {
    const all =
      typeof collectProjectTasks === "function" ? collectProjectTasks(project) : [];
    if (!all.length) {
      return `<p class="v2-docs-empty">Brak zadań. Dodaj pierwsze zadanie ikoną „+” w nagłówku.</p>`;
    }

    const scale =
      typeof getGanttScale === "function" && getGanttScale() === "week" ? "week" : "month";
    const expandMap =
      typeof loadTaskExpandState === "function" ? loadTaskExpandState(project.id) : {};
    const byId = new Map(all.map((task) => [String(task.id), task]));
    const rows = all.map((task) => {
      // Jawnie bierz daty z map projektu (źródło prawdy po przeciągnięciu na Gancie)
      const tid = String(task.id);
      const startFromMap =
        typeof getTaskStartDate === "function"
          ? getTaskStartDate(project, tid)
          : project?.taskStartDates?.[tid] || "";
      const dueFromMap =
        typeof getTaskDueDate === "function"
          ? getTaskDueDate(project, tid)
          : project?.taskDueDates?.[tid] || "";
      const scheduledTask = {
        ...task,
        startDate: startFromMap || task.startDate || "",
        dueDate: dueFromMap || task.dueDate || "",
      };
      const span =
        typeof resolveGanttSpan === "function"
          ? resolveGanttSpan(scheduledTask)
          : null;
      const treeHidden =
        typeof ganttTaskTreeHidden === "function"
          ? ganttTaskTreeHidden(project.id, task, byId, expandMap)
          : false;
      const expanded =
        typeof isTaskNodeExpanded === "function"
          ? isTaskNodeExpanded(project.id, task, expandMap)
          : Boolean(expandMap[task.id]);
      return { task: scheduledTask, span, treeHidden, expanded };
    });
    const scheduled = rows.filter((row) => row.span);

    // Ta sama podkładka dla obu skal — zmiana tydzień/miesiąc nie przesuwa zakresu kalendarza
    const padPast = 21;
    const padFuture = 120;
    let rangeStart;
    let rangeEnd;
    if (scheduled.length) {
      rangeStart = v2GanttNoon(
        new Date(Math.min(...scheduled.map((row) => row.span.start.getTime())))
      );
      rangeEnd = v2GanttNoon(
        new Date(Math.max(...scheduled.map((row) => row.span.end.getTime())))
      );
    } else {
      const today = new Date();
      rangeStart = v2GanttNoon(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() - padPast)
      );
      rangeEnd = v2GanttNoon(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() + padFuture)
      );
    }
    rangeStart = v2GanttNoon(
      new Date(
        rangeStart.getFullYear(),
        rangeStart.getMonth(),
        rangeStart.getDate() - padPast
      )
    );
    rangeEnd = v2GanttNoon(
      new Date(
        rangeEnd.getFullYear(),
        rangeEnd.getMonth(),
        rangeEnd.getDate() + padFuture
      )
    );

    const totalDays = Math.max(1, v2GanttDayDiff(rangeStart, rangeEnd) + 1);
    // Stała szerokość dnia w danej skali — kreski = dokładnie 1 dzień
    const dayWidth = scale === "week" ? 32 : 12;
    const timelineWidth = totalDays * dayWidth;
    const ticks =
      scale === "week" && typeof ganttWeekTicks === "function"
        ? ganttWeekTicks(rangeStart, rangeEnd)
        : typeof ganttMonthTicks === "function"
          ? ganttMonthTicks(rangeStart, rangeEnd)
          : [];
    const today = new Date();
    const todayNoon = v2GanttNoon(today);
    const todayOffset = v2GanttDayDiff(rangeStart, todayNoon);
    const showToday = todayOffset >= 0 && todayOffset < totalDays;
    const rangeStartIso =
      typeof toIsoDateOnly === "function" ? toIsoDateOnly(rangeStart) : "";
    const rangeEndIso =
      typeof toIsoDateOnly === "function" ? toIsoDateOnly(rangeEnd) : "";

    const tickHead = ticks
      .map((tick) => {
        const left = v2GanttDayDiff(rangeStart, tick.start) * dayWidth;
        const width = (v2GanttDayDiff(tick.start, tick.end) + 1) * dayWidth;
        return `<div class="v2-gantt-tick" style="left:${left}px;width:${width}px">${esc(
          tick.label
        )}</div>`;
      })
      .join("");

    const bodyRows = rows
      .map(({ task, span, treeHidden, expanded }) => {
        const depth = Math.max(0, Number(task.depth) || 0);
        const depthTone = Math.min(3, depth);
        const progress = Number.isFinite(Number(task.progress))
          ? Math.round(Number(task.progress))
          : 0;
        const startIso =
          span && typeof toIsoDateOnly === "function" ? toIsoDateOnly(span.start) : "";
        const endIso =
          span && typeof toIsoDateOnly === "function" ? toIsoDateOnly(span.end) : "";
        const dateLine = span
          ? `${v2TaskDateLabel(startIso)} – ${v2TaskDateLabel(endIso)}`
          : "Bez dat";
        const left = span ? v2GanttDayDiff(rangeStart, span.start) * dayWidth : 0;
        const width = span
          ? Math.max(dayWidth, (v2GanttDayDiff(span.start, span.end) + 1) * dayWidth)
          : 0;
        // Nadrzędne: tylko przesuwanie (dzieci jadą razem); resize zostaje dla liści
        const isParentBar = Boolean(task.hasChildren);
        const ganttEditable = loadV2TasksListEdit();
        const parentBounds =
          task.parentId && typeof getProjectTaskScheduleBounds === "function"
            ? getProjectTaskScheduleBounds(project, task.parentId)
            : { start: null, due: null };
        const expandBtn = task.hasChildren
          ? `<button
              type="button"
              class="v2-gantt-toggle${expanded ? " is-open" : ""}"
              data-role="v2-task-toggle"
              data-task-id="${esc(task.id)}"
              aria-expanded="${expanded ? "true" : "false"}"
              title="${expanded ? "Zwiń" : "Rozwiń"}"
            >${expanded ? "−" : "+"}</button>`
          : `<span class="v2-gantt-toggle-spacer" aria-hidden="true"></span>`;
        const addChild = ganttEditable
          ? `<button
              type="button"
              class="v2-task-add-child"
              data-role="v2-task-add-child"
              data-task-id="${esc(task.id)}"
              title="Dodaj podzadanie"
              aria-label="Dodaj podzadanie do: ${esc(task.name || "Zadanie")}"
            >+</button>`
          : "";
        const deleteBtn = ganttEditable
          ? `<button
              type="button"
              class="v2-task-delete"
              data-role="v2-task-delete"
              data-task-id="${esc(task.id)}"
              title="Usuń zadanie"
              aria-label="Usuń zadanie: ${esc(task.name || "Zadanie")}"
            >×</button>`
          : "";
        const barHtml = span
          ? `<div
              class="v2-gantt-bar is-depth-${depthTone}${
                isParentBar ? " is-summary" : ""
              }"
              data-role="v2-gantt-bar"
              data-task-id="${esc(task.id)}"
              data-project-id="${esc(project.id)}"
              data-parent-id="${esc(task.parentId || "")}"
              data-summary="${isParentBar ? "1" : "0"}"
              data-start="${esc(startIso)}"
              data-end="${esc(endIso)}"
              data-bound-start="${esc(parentBounds.start || "")}"
              data-bound-end="${esc(parentBounds.due || "")}"
              style="left:${left}px;width:${width}px"
              title="${esc(
                `${task.name || "Zadanie"} · ${dateLine} · ${progress}%${
                  parentBounds.start
                    ? ` · w ramach ${v2TaskDateLabel(parentBounds.start)}–${v2TaskDateLabel(
                        parentBounds.due
                      )}`
                    : ""
                }`
              )}"
            >
              ${
                ganttEditable
                  ? `<span class="v2-gantt-handle is-start" data-role="v2-gantt-resize" data-edge="start"></span>`
                  : ""
              }
              <span class="v2-gantt-bar-label">${esc(task.name || "Zadanie")}</span>
              <span class="v2-gantt-bar-pct">${progress}%</span>
              ${
                ganttEditable
                  ? `<span class="v2-gantt-handle is-end" data-role="v2-gantt-resize" data-edge="end"></span>`
                  : ""
              }
              ${
                ganttEditable
                  ? `<button
                type="button"
                class="v2-gantt-dep-port"
                data-role="v2-gantt-dep-port"
                title="Przeciągnij na inne zadanie, aby powiązać"
                aria-label="Utwórz powiązanie"
              >+</button>`
                  : ""
              }
            </div>`
          : `<div class="v2-gantt-unscheduled" title="Brak dat — ustaw w formularzu zadania">Bez dat</div>`;

        return `
          <div
            class="v2-gantt-row${task.hasChildren ? " has-children" : ""}${
              treeHidden ? " is-tree-hidden" : ""
            }"
            data-role="v2-gantt-row"
            data-task-id="${esc(task.id)}"
            data-parent-id="${esc(task.parentId || "")}"
            data-depth="${depth}"
            style="--v2-gantt-depth:${depth}"
            ${treeHidden ? "hidden" : ""}
          >
            <div class="v2-gantt-label" style="--v2-gantt-depth:${depth}">
              ${expandBtn}
              <button
                type="button"
                class="v2-gantt-label-btn"
                data-role="v2-open-task"
                data-task-id="${esc(task.id)}"
                title="Otwórz zadanie"
              >
                <strong>${esc(task.name || "Zadanie")}</strong>
                <span>${esc(dateLine)}</span>
              </button>
              ${addChild}
              ${deleteBtn}
            </div>
            <div
              class="v2-gantt-track"
              style="width:${timelineWidth}px;background-size:${dayWidth}px 100%"
            >${barHtml}</div>
          </div>`;
      })
      .join("");

    const ganttEditable = loadV2TasksListEdit();
    return `
      <div
        class="v2-gantt${ganttEditable ? " is-editable" : " is-locked"}"
        data-role="v2-gantt-view"
        data-project-id="${esc(project.id)}"
        data-range-start="${esc(rangeStartIso)}"
        data-day-width="${dayWidth}"
        data-timeline-width="${timelineWidth}"
        data-editable="${ganttEditable ? "1" : "0"}"
      >
        <div class="v2-gantt-toolbar">
          <p class="v2-gantt-range">
            ${esc(v2TaskDateLabel(rangeStartIso))} – ${esc(v2TaskDateLabel(rangeEndIso))}
          </p>
          <div class="v2-gantt-scale" role="group" aria-label="Skala czasu">
            <button
              type="button"
              class="v2-gantt-scale-btn${scale === "week" ? " is-active" : ""}"
              data-role="v2-gantt-scale"
              data-scale="week"
              aria-pressed="${scale === "week" ? "true" : "false"}"
            >Tydzień</button>
            <button
              type="button"
              class="v2-gantt-scale-btn${scale === "month" ? " is-active" : ""}"
              data-role="v2-gantt-scale"
              data-scale="month"
              aria-pressed="${scale === "month" ? "true" : "false"}"
            >Miesiąc</button>
          </div>
        </div>
        <div class="v2-gantt-scroll" data-role="v2-gantt-pan">
          <div
            class="v2-gantt-chart"
            style="--v2-gantt-label-width:15rem;--v2-gantt-day-width:${dayWidth}px;--v2-gantt-timeline-width:${timelineWidth}px"
          >
            <div class="v2-gantt-head">
              <div class="v2-gantt-label-head">Zadanie</div>
              <div
                class="v2-gantt-timeline-head"
                style="width:${timelineWidth}px;background-size:${dayWidth}px 100%"
              >
                <div class="v2-gantt-ticks">${tickHead}</div>
                ${
                  showToday
                    ? `<div class="v2-gantt-today" style="left:${
                        todayOffset * dayWidth + dayWidth / 2
                      }px" title="Dziś"></div>`
                    : ""
                }
              </div>
            </div>
            <div class="v2-gantt-body" data-role="v2-gantt-body">
              <svg class="v2-gantt-dep-svg is-paint-layer" data-role="v2-gantt-dep-svg" aria-hidden="true"></svg>
              <svg class="v2-gantt-dep-svg is-hit-layer" data-role="v2-gantt-dep-hit-svg" aria-hidden="true"></svg>
              ${bodyRows}
            </div>
          </div>
        </div>
      </div>`;
  }

  /** Kalendarzowy dzień w południe — bez skoków ±1 przy zmianie skali. */
  function v2GanttNoon(date) {
    if (!date || Number.isNaN(date.getTime?.())) return new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  }

  function v2GanttDayDiff(from, to) {
    const a = v2GanttNoon(from);
    const b = v2GanttNoon(to);
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function projectTasksExplorerHtml(project) {
    const viewMode = getV2TasksViewMode();
    const formalOpen = loadFormalDocsRailOpen();
    const formalDocs = getProjectFormDocuments(project);
    const formalItems = formalDocs
      .map((doc) => {
        const status = getFormalDocLinkStatus(project, doc);
        const title = doc.title || "Dokument";
        const docId = String(doc.id || "");
        const info =
          status.tone === "outside"
            ? `<span class="v2-formal-rail-info" title="Wykonano poza zadaniem" aria-label="Wykonano poza zadaniem">${iconInfo()}</span>`
            : "";
        const linkedTaskId =
          status.linked && status.task ? String(status.task.id) : "";
        const gotoTask = linkedTaskId
          ? `<button
              type="button"
              class="v2-formal-rail-goto"
              data-role="v2-formal-goto-task"
              data-task-id="${esc(linkedTaskId)}"
              title="Przejdź do powiązanego zadania"
              aria-label="Przejdź do zadania: ${esc(status.task.name || "Zadanie")}"
            >${iconGotoTask()}</button>`
          : "";
        return `
          <li class="v2-formal-rail-row">
            <button
              type="button"
              class="v2-formal-rail-item is-${esc(status.tone)}"
              data-role="v2-formal-rail-doc"
              data-doc-id="${esc(docId)}"
              data-doc-title="${esc(title)}"
              data-task-id="${esc(linkedTaskId)}"
              draggable="true"
              title="${esc(title)} · ${status.fill.percent}% — przeciągnij na zadanie, aby powiązać"
            >
              <span class="v2-formal-rail-item-name">${esc(title)}</span>
              <span class="v2-formal-rail-item-meta">
                <span class="v2-formal-rail-pct">${status.fill.percent}%</span>
                ${info}
              </span>
            </button>
            ${gotoTask}
          </li>`;
      })
      .join("");

    const panelHtml =
      viewMode === "kanban"
        ? projectTasksKanbanViewHtml(project)
        : viewMode === "gantt"
          ? projectTasksGanttViewHtml(project)
          : projectTasksListViewHtml(project);

    return `
      <div class="v2-doc-work" data-role="v2-project-tasks-tab" data-tasks-view="${esc(
        viewMode
      )}">
        <header class="v2-doc-work-head v2-tasks-head">
          <div class="v2-tasks-head-copy">
            <h2 class="v2-projects-title">Zadania</h2>
            <p class="v2-doc-work-meta">${esc(project.title || "Projekt")}</p>
          </div>
          <div class="v2-tasks-head-actions">
            ${v2ProjectFlowStartAnchorHtml(project)}
            <button
              type="button"
              class="v2-section-btn"
              data-role="v2-flow-export"
              title="Zapisz zadania projektu jako szablon Workflow"
            >Eksportuj flow</button>
            <button
              type="button"
              class="v2-section-btn"
              data-role="v2-flow-import"
              title="Zaimportuj zadania z szablonu Workflow"
            >Importuj flow</button>
          </div>
        </header>
        <div
          class="v2-tasks-layout${formalOpen ? " is-formal-open" : ""}"
          data-role="v2-tasks-layout"
        >
          <section class="v2-doc-work-panel v2-tasks-panel" data-role="v2-tasks-panel">
            ${v2TasksPanelToolbarHtml(viewMode)}
            ${panelHtml}
          </section>
          <aside class="v2-formal-rail" data-role="v2-formal-rail" aria-label="Dokumentacja formalna">
            <button
              type="button"
              class="v2-formal-rail-toggle"
              data-role="v2-formal-rail-toggle"
              aria-expanded="${formalOpen ? "true" : "false"}"
              title="${formalOpen ? "Zwiń dokumentację formalną" : "Rozwiń dokumentację formalną"}"
            >
              <span class="v2-formal-rail-toggle-label">Dokumentacja formalna</span>
            </button>
            <div class="v2-formal-rail-panel" ${formalOpen ? "" : "hidden"}>
              <header class="v2-formal-rail-head">
                <h3 class="v2-formal-rail-title">Dokumentacja formalna</h3>
              </header>
              ${
                formalDocs.length
                  ? `<ul class="v2-formal-rail-list">${formalItems}</ul>`
                  : `<p class="v2-docs-empty">Brak dokumentów formalnych.</p>`
              }
            </div>
          </aside>
        </div>
      </div>`;
  }

  function getV2TaskAttachments(project, taskId) {
    const bag = project?.taskAttachments || {};
    const key = String(taskId ?? "");
    const list = bag[key] ?? bag[taskId];
    return Array.isArray(list) ? list : [];
  }

  function formatV2FileSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function v2TaskSheetNotesHtml(text) {
    const body = String(text || "");
    const empty = !body.trim();
    return `
      <div
        class="v2-task-sheet-notes${empty ? " is-empty" : ""}"
        data-role="v2-task-notes-block"
      >
        <div
          class="v2-task-sheet-editor"
          data-role="v2-task-description"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          aria-label="Notatki do zadania"
          data-placeholder="⋯"
        >${esc(body).replace(/\n/g, "<br>")}</div>
      </div>`;
  }

  function defaultV2TaskChecklist() {
    return [0, 1, 2].map((index) => ({
      id: `chk-default-${index + 1}`,
      text: "To-do",
      done: false,
    }));
  }

  function getV2TaskChecklist(project, taskId) {
    const bag = project?.taskChecklists || {};
    const key = String(taskId ?? "");
    const list = bag[key] ?? bag[taskId];
    if (Array.isArray(list) && list.length) {
      return list.map((item, index) => ({
        id: String(item?.id || `chk-${index + 1}`),
        text: String(item?.text ?? "To-do"),
        done: Boolean(item?.done),
      }));
    }
    return defaultV2TaskChecklist();
  }

  function persistV2TaskChecklist(projectId, taskId, items) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || !taskId || typeof persistProject !== "function") return false;
    const normalized = (items || []).map((item, index) => ({
      id: String(item.id || `chk-${Date.now()}-${index}`),
      text: String(item.text || ""),
      done: Boolean(item.done),
    }));
    persistProject({
      ...project,
      taskChecklists: {
        ...(project.taskChecklists || {}),
        [String(taskId)]: normalized,
      },
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  function readV2TaskChecklistFromDom(root) {
    return [...(root?.querySelectorAll('[data-role="v2-task-check-item"]') || [])].map(
      (row, index) => ({
        id: String(row.dataset.checkId || `chk-${index + 1}`),
        text: String(
          row.querySelector('[data-role="v2-task-check-text"]')?.value || ""
        ),
        done: Boolean(row.querySelector('[data-role="v2-task-check-done"]')?.checked),
      })
    );
  }

  function v2TaskSheetChecklistHtml(project, taskId) {
    const items = getV2TaskChecklist(project, taskId);
    const rows = items
      .map(
        (item) => `
        <li
          class="v2-task-check-item${item.done ? " is-done" : ""}"
          data-role="v2-task-check-item"
          data-check-id="${esc(item.id)}"
        >
          <label class="v2-task-check-toggle">
            <input
              type="checkbox"
              data-role="v2-task-check-done"
              ${item.done ? "checked" : ""}
              aria-label="Odhacz podzadanie"
            />
            <span class="v2-task-check-box" aria-hidden="true"></span>
          </label>
          <input
            type="text"
            class="v2-task-check-text"
            data-role="v2-task-check-text"
            value="${esc(item.text || "To-do")}"
            placeholder="To-do"
            aria-label="Treść podzadania"
          />
        </li>`
      )
      .join("");
    return `
      <section class="v2-task-sheet-checklist" data-role="v2-task-checklist" aria-label="Zadania">
        <div class="v2-task-sheet-section-label">Zadania</div>
        <ul class="v2-task-check-list">${rows}</ul>
        <button type="button" class="v2-task-check-add" data-role="v2-task-check-add">
          + Dodaj pozycję
        </button>
      </section>`;
  }

  function applyV2TaskFocusMode(taskId) {
    const tid = String(taskId || "");
    document.body.classList.add("is-v2-task-focus");
    document.querySelectorAll(".v2-task-row.is-active-task").forEach((row) => {
      row.classList.remove("is-active-task");
    });
    if (!tid) return;
    const row =
      document.querySelector(`.v2-task-row[data-task-id="${tid}"]`) ||
      document.querySelector(`[data-role="v2-gantt-row"][data-task-id="${tid}"]`) ||
      document.querySelector(`[data-role="v2-kanban-card"][data-task-id="${tid}"]`);
    row?.classList.add("is-active-task");
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function clearV2TaskFocusMode() {
    document.body.classList.remove("is-v2-task-focus");
    document.querySelectorAll(".is-active-task").forEach((el) => {
      el.classList.remove("is-active-task");
    });
  }

  function v2TaskSheetAttachmentsHtml(project, taskId) {
    const files = getV2TaskAttachments(project, taskId);
    const rows = files
      .map(
        (file) => `
        <li class="v2-task-sheet-file" data-file-id="${esc(file.id)}">
          <button
            type="button"
            class="v2-task-sheet-file-open"
            data-role="v2-task-file-open"
            data-file-id="${esc(file.id)}"
            title="Pobierz"
          >
            <span class="v2-task-sheet-file-ico" aria-hidden="true">${iconPaperclip()}</span>
            <span class="v2-task-sheet-file-meta">
              <strong>${esc(file.name || "Plik")}</strong>
              <span>${esc(formatV2FileSize(file.size))}</span>
            </span>
          </button>
          <button
            type="button"
            class="v2-icon-btn is-danger"
            data-role="v2-task-file-delete"
            data-file-id="${esc(file.id)}"
            data-file-name="${esc(file.name || "Plik")}"
            title="Usuń załącznik"
            aria-label="Usuń załącznik: ${esc(file.name || "Plik")}"
          >${iconTrash()}</button>
        </li>`
      )
      .join("");
    return `
      <section class="v2-task-sheet-files" aria-label="Załączniki">
        <header class="v2-task-sheet-files-head">
          <h3>Załączniki</h3>
          <button
            type="button"
            class="v2-task-sheet-attach-btn"
            data-role="v2-task-attach"
            title="Dodaj plik z dysku"
          >${iconPaperclip()}<span>Dodaj z dysku</span></button>
          <input type="file" multiple hidden data-role="v2-task-file-input" />
        </header>
        ${
          files.length
            ? `<ul class="v2-task-sheet-file-list">${rows}</ul>`
            : `<p class="v2-task-sheet-files-empty">Brak załączników — dodaj plik z dysku.</p>`
        }
      </section>`;
  }

  function projectTaskSheetHtml(project, taskId) {
    const tasks =
      typeof collectProjectTasks === "function" ? collectProjectTasks(project) : [];
    const task = tasks.find((item) => String(item.id) === String(taskId));
    if (!task) {
      return `
        <div class="v2-task-sheet-root" data-role="v2-task-sheet-root">
          <div class="v2-task-sheet-backdrop" data-role="v2-task-sheet-close"></div>
          <aside class="v2-task-sheet" role="dialog" aria-modal="true" aria-label="Zadanie">
            <p class="v2-docs-empty">Nie znaleziono zadania.</p>
          </aside>
        </div>`;
    }

    const statuses = getV2TaskStatusOptions();
    const statusOptions = statuses
      .map((status) => {
        const selected = String(task.statusKey || "") === String(status.id) ? " selected" : "";
        return `<option value="${esc(status.id)}"${selected}>${esc(
          status.label || status.id
        )}</option>`;
      })
      .join("");

    const ownerOptions =
      typeof getTaskOwnerOptions === "function"
        ? getTaskOwnerOptions(project)
            .map((opt) => {
              const selected =
                String(task.ownerId || "") === String(opt.id) ? " selected" : "";
              return `<option value="${esc(opt.id)}"${selected}>${esc(opt.name)}</option>`;
            })
            .join("")
        : `<option value="none">Brak właściciela</option>`;

    const linkedDocId = getLinkedDocIdFromTask(task);
    const linkedDoc = linkedDocId
      ? getProjectFormDocuments(project).find(
          (doc) => String(doc.id) === String(linkedDocId)
        ) || {
          id: linkedDocId,
          title:
            (typeof resolveLinkedDocLabel === "function" && task.linkedDoc
              ? resolveLinkedDocLabel(project, task.linkedDoc)
              : "") ||
            task.linkedDoc?.name ||
            "Dokument formalny",
        }
      : null;
    const linkedDocFill = linkedDoc ? getFormalDocFill(project, linkedDoc) : null;
    const formalHtml = linkedDoc
      ? `
        <div class="v2-task-sheet-prop">
          <span class="v2-task-sheet-prop-label">Dokument</span>
          <div class="v2-task-sheet-prop-value v2-task-sheet-formal">
            <button
              type="button"
              class="v2-task-sheet-formal-btn"
              data-role="v2-open-linked-doc"
              data-doc-id="${esc(String(linkedDoc.id))}"
            >${esc(linkedDoc.title || "Dokument formalny")}</button>
            <span class="v2-fill-pct ${v2FillPercentTone(linkedDocFill.percent)}">${
              linkedDocFill.percent
            }%</span>
            <button
              type="button"
              class="v2-task-sheet-unlink"
              data-role="v2-unlink-formal-doc"
              title="Odepnij dokument formalny"
              aria-label="Odepnij dokument formalny"
            >Odepnij</button>
          </div>
        </div>`
      : "";

    const notes =
      typeof getTaskDescription === "function"
        ? getTaskDescription(project, task.id)
        : task.description || "";
    const listNotes = getV2TaskNotes(project, task.id);
    const statusTone = v2StatusToneClass(task.statusKey);
    const depthTone = Math.min(3, Math.max(0, Number(task.depth) || 0));

    return `
      <div class="v2-task-sheet-root" data-role="v2-task-sheet-root">
        <div class="v2-task-sheet-backdrop" data-role="v2-task-sheet-close"></div>
        <aside
          class="v2-task-sheet is-depth-${depthTone}"
          data-role="v2-task-detail"
          data-project-id="${esc(project.id)}"
          data-task-id="${esc(task.id)}"
          role="dialog"
          aria-modal="true"
          aria-labelledby="v2TaskSheetTitle"
        >
          <header class="v2-task-sheet-head">
            <div class="v2-task-sheet-head-main">
              <p class="v2-task-sheet-kicker">${esc(project.title || "Projekt")}</p>
              <h2 class="v2-task-sheet-title" id="v2TaskSheetTitle">${esc(
                task.name || "Zadanie"
              )}</h2>
            </div>
            <button
              type="button"
              class="v2-task-sheet-close"
              data-role="v2-task-sheet-close"
              title="Zamknij"
              aria-label="Zamknij panel zadania"
            >${iconClose()}<span>Zamknij</span></button>
          </header>

          <div class="v2-task-sheet-body" data-role="v2-task-sheet-body">
            <div class="v2-task-sheet-props">
              <label class="v2-task-sheet-prop">
                <span class="v2-task-sheet-prop-label">Status</span>
                <select
                  class="v2-task-sheet-control ${statusTone}"
                  name="status"
                  data-role="v2-task-status"
                >${statusOptions}</select>
              </label>
              <label class="v2-task-sheet-prop">
                <span class="v2-task-sheet-prop-label">Właściciel</span>
                <select
                  class="v2-task-sheet-control"
                  name="ownerId"
                  data-role="v2-task-owner"
                >${ownerOptions}</select>
              </label>
              <label class="v2-task-sheet-prop">
                <span class="v2-task-sheet-prop-label">Od</span>
                <input
                  class="v2-task-sheet-control"
                  type="date"
                  name="startDate"
                  data-role="v2-task-start"
                  value="${esc(task.startDate || "")}"
                />
              </label>
              <label class="v2-task-sheet-prop">
                <span class="v2-task-sheet-prop-label">Do</span>
                <input
                  class="v2-task-sheet-control"
                  type="date"
                  name="dueDate"
                  data-role="v2-task-due"
                  value="${esc(task.dueDate || "")}"
                />
              </label>
              <div class="v2-task-sheet-prop">
                <span class="v2-task-sheet-prop-label">Autor</span>
                <span class="v2-task-sheet-prop-text">${esc(
                  getV2TaskAuthorName(project, task.id)
                )}</span>
              </div>
              <div class="v2-task-sheet-prop">
                <span class="v2-task-sheet-prop-label">Utworzono</span>
                <span class="v2-task-sheet-prop-text">${esc(
                  getV2TaskRegisteredLabel(project, task)
                )}</span>
              </div>
              <label class="v2-task-sheet-prop v2-task-sheet-prop-wide">
                <span class="v2-task-sheet-prop-label">Uwagi</span>
                <input
                  class="v2-task-sheet-control"
                  type="text"
                  data-role="v2-task-sheet-notes"
                  value="${esc(listNotes)}"
                  placeholder="Krótka uwaga…"
                />
              </label>
              ${formalHtml}
            </div>

            <div class="v2-task-sheet-section-label">Notatki</div>
            ${v2TaskSheetNotesHtml(notes)}

            ${v2TaskSheetChecklistHtml(project, task.id)}

            ${v2TaskSheetAttachmentsHtml(project, task.id)}
          </div>
        </aside>
      </div>`;
  }

  function readV2TaskSheetDescription(root) {
    const editor = root?.querySelector('[data-role="v2-task-description"]');
    if (!editor) return "";
    const text = String(editor.innerText || editor.textContent || "");
    return text.replace(/\u00a0/g, " ").replace(/\n+$/g, "").trimEnd();
  }

  function syncV2TaskSheetNotesEmpty(root) {
    const block = root?.querySelector('[data-role="v2-task-notes-block"]');
    const editor = root?.querySelector('[data-role="v2-task-description"]');
    if (!block || !editor) return;
    const empty = !String(editor.innerText || "").replace(/\u00a0/g, " ").trim();
    block.classList.toggle("is-empty", empty);
  }

  function saveV2TaskDetailForm({ silent = false, remount = false } = {}) {
    const root = document.querySelector('[data-role="v2-task-detail"]');
    const projectId = String(
      root?.dataset.projectId || v2Route.projectId || ""
    );
    const taskId = String(root?.dataset.taskId || v2Route.taskId || "");
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!root || !project || !taskId || typeof persistProject !== "function") return false;

    const ownerId = String(
      root.querySelector('[data-role="v2-task-owner"]')?.value || "none"
    );
    const startDate = String(
      root.querySelector('[data-role="v2-task-start"]')?.value || ""
    );
    const dueDate = String(root.querySelector('[data-role="v2-task-due"]')?.value || "");
    const statusKey = String(
      root.querySelector('[data-role="v2-task-status"]')?.value || ""
    );
    const description = readV2TaskSheetDescription(root);
    const listNotes = String(
      root.querySelector('[data-role="v2-task-sheet-notes"]')?.value || ""
    );
    const checklist = readV2TaskChecklistFromDom(root);

    const now = new Date().toISOString();
    let next = {
      ...project,
      autoScheduleDates: false,
      taskOwners: { ...(project.taskOwners || {}), [taskId]: ownerId },
      taskStartDates: { ...(project.taskStartDates || {}), [taskId]: startDate },
      taskDueDates: { ...(project.taskDueDates || {}), [taskId]: dueDate },
      taskDescriptions: { ...(project.taskDescriptions || {}), [taskId]: description },
      taskNotes: { ...(project.taskNotes || {}), [taskId]: listNotes },
      taskChecklists: { ...(project.taskChecklists || {}), [taskId]: checklist },
      taskBoardStatus: {
        ...(project.taskBoardStatus || {}),
        ...(statusKey ? { [taskId]: statusKey } : {}),
      },
      updatedAt: now,
    };

    if (Array.isArray(next.customTasks)) {
      next = {
        ...next,
        customTasks: next.customTasks.map((item) =>
          String(item.id) === taskId
            ? {
                ...item,
                startDate,
                dueDate,
                ownerId,
                description,
                updatedAt: now,
              }
            : item
        ),
      };
    }

    if (next.flowInstance?.tasks) {
      next = {
        ...next,
        flowInstance: {
          ...next.flowInstance,
          updatedAt: now,
          tasks: next.flowInstance.tasks.map((item) => {
            if (String(item.id) !== taskId) return item;
            let durationDays = item.durationDays;
            if (
              startDate &&
              dueDate &&
              typeof parseTaskDateOnly === "function" &&
              typeof ganttDayDiff === "function"
            ) {
              const s = parseTaskDateOnly(startDate);
              const e = parseTaskDateOnly(dueDate);
              if (s && e) {
                const days = ganttDayDiff(s, e) + 1;
                if (days > 0) durationDays = days;
              }
            }
            return {
              ...item,
              startDate: startDate || null,
              durationDays,
            };
          }),
        },
      };
    }

    if (startDate && dueDate && typeof clampTaskRangeToParent === "function") {
      const clamped = clampTaskRangeToParent(next, taskId, startDate, dueDate);
      if (clamped?.clamped) {
        if (!silent) {
          showV2Toast("Data podrzędna musi zawierać się w nadrzędnej", {
            tone: "error",
          });
        }
        return false;
      }
    }

    persistProject(next);
    if (!silent) showV2Toast("Zapisano zadanie");
    if (remount) mountV2();
    return true;
  }

  function closeV2TaskSidePanel({ save = true } = {}) {
    if (save) saveV2TaskDetailForm({ silent: true });
    document.querySelector('[data-role="v2-task-sheet-root"]')?.remove();
    document.removeEventListener("keydown", onV2TaskSheetKeydown, true);
    clearV2TaskFocusMode();
    const restoreView = v2TasksViewBeforeFocus;
    v2TasksViewBeforeFocus = null;
    if (v2Route.name === "edit-project" && v2Route.taskId) {
      const next = { ...v2Route };
      delete next.taskId;
      v2Route = next;
      persistV2Route(v2Route);
    } else if (v2Route.name === "task-detail") {
      v2Route = {
        name: "edit-project",
        projectId: String(v2Route.projectId || ""),
        tab: "tasks",
      };
      mountV2();
      return;
    }
    if (restoreView && getV2TasksViewMode() !== restoreView) {
      setV2TasksViewMode(restoreView);
      remountTasksTab();
    }
  }

  function onV2TaskSheetKeydown(event) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeV2TaskSidePanel({ save: true });
  }

  function ensureV2TaskFocusListView() {
    const current = getV2TasksViewMode();
    if (current === "list") return false;
    if (v2TasksViewBeforeFocus == null) v2TasksViewBeforeFocus = current;
    setV2TasksViewMode("list");
    return true;
  }

  function openV2TaskSidePanel(projectId, taskId) {
    const pid = String(projectId || "");
    const tid = String(taskId || "");
    if (!pid || !tid) return;
    const project =
      typeof getProjectById === "function" ? getProjectById(pid) : null;
    if (!project) return;

    const onTasksTab =
      v2Route.name === "edit-project" &&
      String(v2Route.projectId) === pid &&
      (v2Route.tab || "project") === "tasks" &&
      Boolean(document.querySelector('[data-role="v2-project-tasks-tab"]'));

    if (!onTasksTab) {
      ensureV2TaskFocusListView();
      v2Route = {
        name: "edit-project",
        projectId: pid,
        tab: "tasks",
        taskId: tid,
      };
      mountV2();
      return;
    }

    if (ensureV2TaskFocusListView()) {
      v2Route = { ...v2Route, tab: "tasks", taskId: tid };
      persistV2Route(v2Route);
      remountTasksTab();
      return;
    }

    const existing = document.querySelector('[data-role="v2-task-sheet-root"]');
    if (existing) {
      saveV2TaskDetailForm({ silent: true });
      existing.remove();
      document.removeEventListener("keydown", onV2TaskSheetKeydown, true);
    }

    v2Route = { ...v2Route, tab: "tasks", taskId: tid };
    persistV2Route(v2Route);

    const wrap = document.createElement("div");
    wrap.innerHTML = projectTaskSheetHtml(project, tid);
    const sheetRoot = wrap.firstElementChild;
    if (!sheetRoot) return;
    document.body.appendChild(sheetRoot);
    bindV2TaskSidePanel(sheetRoot, pid, tid);
    applyV2TaskFocusMode(tid);
    requestAnimationFrame(() => {
      sheetRoot.classList.add("is-open");
      applyV2TaskFocusMode(tid);
    });
  }

  function mountV2TaskSidePanelIfNeeded(project) {
    const taskId = String(v2Route.taskId || "");
    if (!taskId || !project) return;
    if (ensureV2TaskFocusListView()) {
      remountTasksTab();
      return;
    }
    const existing = document.querySelector('[data-role="v2-task-sheet-root"]');
    if (existing) {
      existing.remove();
      document.removeEventListener("keydown", onV2TaskSheetKeydown, true);
    }
    const wrap = document.createElement("div");
    wrap.innerHTML = projectTaskSheetHtml(project, taskId);
    const sheetRoot = wrap.firstElementChild;
    if (!sheetRoot) return;
    document.body.appendChild(sheetRoot);
    bindV2TaskSidePanel(sheetRoot, project.id, taskId);
    applyV2TaskFocusMode(taskId);
    requestAnimationFrame(() => {
      sheetRoot.classList.add("is-open");
      applyV2TaskFocusMode(taskId);
    });
  }

  async function addV2TaskAttachments(projectId, taskId, fileList) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || !taskId || typeof persistProject !== "function") return false;
    const files = Array.from(fileList || []);
    if (!files.length) return false;
    const maxBytes = 2.5 * 1024 * 1024;
    const key = String(taskId);
    const current = [...getV2TaskAttachments(project, key)];
    for (const file of files) {
      if (file.size > maxBytes) {
        showV2Toast(`Plik „${file.name}” jest za duży (max 2,5 MB)`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        current.push({
          id: `tf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name || "plik",
          size: file.size || 0,
          type: file.type || "",
          dataUrl,
          addedAt: new Date().toISOString(),
        });
      } catch (e) {
        showV2Toast(`Nie udało się odczytać „${file.name}”`);
      }
    }
    persistProject({
      ...project,
      taskAttachments: {
        ...(project.taskAttachments || {}),
        [key]: current,
      },
      updatedAt: new Date().toISOString(),
    });
    showV2Toast("Dodano załącznik");
    return true;
  }

  function deleteV2TaskAttachment(projectId, taskId, fileId) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || !taskId || !fileId || typeof persistProject !== "function") {
      return false;
    }
    const key = String(taskId);
    const next = getV2TaskAttachments(project, key).filter(
      (item) => String(item.id) !== String(fileId)
    );
    persistProject({
      ...project,
      taskAttachments: {
        ...(project.taskAttachments || {}),
        [key]: next,
      },
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  function downloadV2TaskAttachment(projectId, taskId, fileId) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    const file = getV2TaskAttachments(project, taskId).find(
      (item) => String(item.id) === String(fileId)
    );
    if (!file?.dataUrl) return;
    const link = document.createElement("a");
    link.href = file.dataUrl;
    link.download = file.name || "plik";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function refreshV2TaskSheetAttachments(sheet, projectId, taskId) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || !sheet) return;
    const section = sheet.querySelector(".v2-task-sheet-files");
    if (!section) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = v2TaskSheetAttachmentsHtml(project, taskId);
    const next = tmp.firstElementChild;
    if (!next) return;
    section.replaceWith(next);
    bindV2TaskSheetFiles(sheet, projectId, taskId);
    const body = sheet.querySelector('[data-role="v2-task-sheet-body"]');
    if (body) body.scrollTop = body.scrollHeight;
  }

  function bindV2TaskSheetFiles(sheet, projectId, taskId) {
    const input = sheet.querySelector('[data-role="v2-task-file-input"]');
    sheet.querySelector('[data-role="v2-task-attach"]')?.addEventListener("click", () => {
      input?.click();
    });
    input?.addEventListener("change", async () => {
      const ok = await addV2TaskAttachments(projectId, taskId, input.files);
      input.value = "";
      if (ok) refreshV2TaskSheetAttachments(sheet, projectId, taskId);
    });
    sheet.querySelectorAll('[data-role="v2-task-file-open"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        downloadV2TaskAttachment(projectId, taskId, btn.dataset.fileId);
      });
    });
    sheet.querySelectorAll('[data-role="v2-task-file-delete"]').forEach((btn) => {
      btn.addEventListener("click", async () => {
        const name = btn.dataset.fileName || "ten plik";
        const ok = await confirmV2Dialog({
          title: "Usuń załącznik",
          message: `Czy na pewno chcesz usunąć załącznik „${name}”?`,
          confirmLabel: "Usuń",
          cancelLabel: "Anuluj",
          danger: true,
        });
        if (!ok) return;
        if (!deleteV2TaskAttachment(projectId, taskId, btn.dataset.fileId)) return;
        showV2Toast("Usunięto załącznik");
        refreshV2TaskSheetAttachments(sheet, projectId, taskId);
      });
    });
  }

  function bindV2TaskChecklist(sheet, projectId, taskId) {
    const saveChecks = () => {
      persistV2TaskChecklist(projectId, taskId, readV2TaskChecklistFromDom(sheet));
    };

    const bindRow = (row) => {
      const box = row.querySelector('[data-role="v2-task-check-done"]');
      const text = row.querySelector('[data-role="v2-task-check-text"]');
      box?.addEventListener("change", () => {
        row.classList.toggle("is-done", Boolean(box.checked));
        saveChecks();
      });
      text?.addEventListener("change", saveChecks);
      text?.addEventListener("blur", saveChecks);
      text?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        text.blur();
        sheet.querySelector('[data-role="v2-task-check-add"]')?.click();
      });
    };

    sheet.querySelectorAll('[data-role="v2-task-check-item"]').forEach(bindRow);

    sheet.querySelector('[data-role="v2-task-check-add"]')?.addEventListener("click", () => {
      const list = sheet.querySelector(".v2-task-check-list");
      if (!list) return;
      const id = `chk-${Date.now()}`;
      const li = document.createElement("li");
      li.className = "v2-task-check-item";
      li.dataset.role = "v2-task-check-item";
      li.dataset.checkId = id;
      li.innerHTML = `
        <label class="v2-task-check-toggle">
          <input type="checkbox" data-role="v2-task-check-done" aria-label="Odhacz podzadanie" />
          <span class="v2-task-check-box" aria-hidden="true"></span>
        </label>
        <input
          type="text"
          class="v2-task-check-text"
          data-role="v2-task-check-text"
          value="To-do"
          placeholder="To-do"
          aria-label="Treść podzadania"
        />`;
      list.appendChild(li);
      bindRow(li);
      const input = li.querySelector('[data-role="v2-task-check-text"]');
      input?.focus();
      input?.select();
      saveChecks();
    });
  }

  function bindV2TaskSidePanel(sheetRoot, projectId, taskId) {
    const sheet = sheetRoot.querySelector('[data-role="v2-task-detail"]') || sheetRoot;
    const autosave = () => saveV2TaskDetailForm({ silent: true });

    sheetRoot.querySelectorAll('[data-role="v2-task-sheet-close"]').forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        closeV2TaskSidePanel({ save: true });
      });
    });

    // Klik w lewą połowę (lista) nie zamyka — tylko jawny close / Esc
    sheetRoot
      .querySelector('.v2-task-sheet-backdrop[data-role="v2-task-sheet-close"]')
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        closeV2TaskSidePanel({ save: true });
      });

    document.addEventListener("keydown", onV2TaskSheetKeydown, true);

    [
      '[data-role="v2-task-owner"]',
      '[data-role="v2-task-status"]',
      '[data-role="v2-task-start"]',
      '[data-role="v2-task-due"]',
      '[data-role="v2-task-sheet-notes"]',
    ].forEach((sel) => {
      sheet.querySelector(sel)?.addEventListener("change", autosave);
    });

    const editor = sheet.querySelector('[data-role="v2-task-description"]');
    editor?.addEventListener("input", () => syncV2TaskSheetNotesEmpty(sheet));
    editor?.addEventListener("blur", autosave);
    editor?.addEventListener("focus", () => {
      sheet.querySelector('[data-role="v2-task-notes-block"]')?.classList.remove("is-empty");
    });
    syncV2TaskSheetNotesEmpty(sheet);

    sheet.querySelectorAll('[data-role="v2-open-linked-doc"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const docId = String(btn.dataset.docId || "");
        if (!docId) return;
        saveV2TaskDetailForm({ silent: true });
        clearV2TaskFocusMode();
        v2Route = {
          name: "doc-detail",
          projectId: String(projectId),
          docId,
        };
        mountV2();
      });
    });

    sheet
      .querySelector('[data-role="v2-unlink-formal-doc"]')
      ?.addEventListener("click", async (event) => {
        event.preventDefault();
        const ok = await confirmV2Dialog({
          title: "Odepnij dokument",
          message: "Czy na pewno chcesz odpiąć dokumentację formalną od tego zadania?",
          confirmLabel: "Odepnij",
          cancelLabel: "Anuluj",
          danger: true,
        });
        if (!ok) return;
        saveV2TaskDetailForm({ silent: true });
        if (!unlinkV2TaskFormalDoc(projectId, taskId)) {
          showV2Toast("Nie udało się odpiąć dokumentu", { tone: "error" });
          return;
        }
        showV2Toast("Odpięto dokument formalny");
        v2Route = { ...v2Route, tab: "tasks", taskId: String(taskId) };
        persistV2Route(v2Route);
        remountTasksTab();
      });

    bindV2TaskChecklist(sheet, projectId, taskId);
    bindV2TaskSheetFiles(sheet, projectId, taskId);
  }

  function canOpenV2TaskPanelFromList() {
    if (getV2TasksViewMode() !== "list") return true;
    return !loadV2TasksListEdit();
  }

  function requestOpenV2Task(projectId, taskId) {
    if (!canOpenV2TaskPanelFromList()) return;
    openV2TaskSidePanel(projectId, taskId);
  }

  function syncV2KanbanColumnMeta(board) {
    if (!board) return;
    board.querySelectorAll(".v2-kanban-column").forEach((column) => {
      const cards = [...column.querySelectorAll('[data-role="v2-kanban-card"]')];
      const countEl = column.querySelector('[data-role="v2-kanban-column-count"]');
      if (countEl) countEl.textContent = String(cards.length);
      const emptyEl = column.querySelector('[data-role="v2-kanban-empty"]');
      if (emptyEl) emptyEl.hidden = cards.length > 0;
    });
  }

  function bindV2KanbanBoard(root, projectId) {
    const board = root.querySelector('[data-role="v2-kanban-board"]');
    if (!board) return;
    const pid = String(projectId || "");
    let dragTaskId = "";

    board.querySelectorAll('[data-role="v2-kanban-card"]').forEach((card) => {
      card.addEventListener("mousedown", (event) => {
        const interactive = event.target.closest("button, a, input, select, label");
        card.draggable = !interactive;
      });
      card.addEventListener("mouseup", () => {
        card.draggable = true;
      });
      card.addEventListener("dragstart", (event) => {
        if (!card.draggable) {
          event.preventDefault();
          return;
        }
        dragTaskId = String(card.dataset.taskId || "");
        card.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", dragTaskId);
      });
      card.addEventListener("dragend", () => {
        card.draggable = true;
        card.classList.remove("is-dragging");
        board.querySelectorAll('[data-role="v2-kanban-drop"]').forEach((zone) => {
          zone.classList.remove("is-drop-target");
        });
        dragTaskId = "";
      });
    });

    board.querySelectorAll('[data-role="v2-kanban-drop"]').forEach((zone) => {
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        zone.classList.add("is-drop-target");
      });
      zone.addEventListener("dragleave", () => {
        zone.classList.remove("is-drop-target");
      });
      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        zone.classList.remove("is-drop-target");
        const taskId =
          event.dataTransfer.getData("text/plain") || dragTaskId || "";
        const status = String(zone.dataset.status || "");
        const valid = new Set(getV2TaskStatusOptions().map((item) => item.id));
        if (!taskId || !valid.has(status)) return;

        const saved =
          typeof persistTaskBoardStatus === "function"
            ? persistTaskBoardStatus(pid, taskId, status)
            : setV2TaskBoardStatus(pid, taskId, status)
              ? { taskIds: [taskId], statusId: status }
              : null;
        if (!saved) {
          showV2Toast("Nie udało się zmienić statusu");
          return;
        }

        const card = board.querySelector(
          `[data-role="v2-kanban-card"][data-task-id="${CSS.escape(String(taskId))}"]`
        );
        if (card && card.parentElement !== zone) {
          card.dataset.status = status;
          zone.appendChild(card);
        }
        syncV2KanbanColumnMeta(board);
        const label =
          getV2TaskStatusOptions().find((item) => item.id === status)?.label || status;
        showV2Toast(`Zmieniono status: ${label}`);
      });
    });
  }

  function v2CollectSubtreeTaskIds(project, rootTaskId) {
    const tid = String(rootTaskId || "");
    const subtree = new Set([tid]);
    if (!tid || typeof collectProjectTasks !== "function") return subtree;
    const all = collectProjectTasks(project);
    all.forEach((task) => {
      let parent = task.parentId;
      while (parent) {
        if (String(parent) === tid) {
          subtree.add(String(task.id));
          break;
        }
        const p = all.find((item) => String(item.id) === String(parent));
        parent = p?.parentId;
      }
    });
    return subtree;
  }

  function persistV2TaskSchedule(projectId, taskId, startIso, endIso, options = {}) {
    const pid = String(projectId || "");
    const tid = String(taskId || "");
    const silent = Boolean(options?.silent);
    if (!pid || !tid || typeof getProjectById !== "function" || typeof persistProject !== "function") {
      return null;
    }
    if (typeof setWorkflowRuntime === "function") {
      setWorkflowRuntime({ mode: "project", projectId: pid });
    }
    const project = getProjectById(pid);
    if (!project) return null;

    let start = String(startIso || "").slice(0, 10);
    let end = String(endIso || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return null;
    }

    // Podrzędne muszą mieścić się w ramach nadrzędnego — poza zakresem: odrzuć
    if (typeof clampTaskRangeToParent === "function") {
      const clamped = clampTaskRangeToParent(project, tid, start, end);
      if (clamped?.clamped) {
        if (!silent) {
          showV2Toast("Data podrzędna musi zawierać się w nadrzędnej", {
            tone: "error",
          });
          remountTasksTab();
        }
        return null;
      }
    }

    const collected =
      typeof collectProjectTasks === "function" ? collectProjectTasks(project) : [];
    const collectedTask = collected.find((item) => String(item.id) === tid);
    const oldStart = String(
      project.taskStartDates?.[tid] || collectedTask?.startDate || ""
    ).slice(0, 10);
    const hasChildren = Boolean(collectedTask?.hasChildren);

    // Nadrzędne przy samym przesunięciu: dzieci jadą razem; przy zmianie długości — tylko ten wiersz
    const oldEnd = String(
      project.taskDueDates?.[tid] || collectedTask?.dueDate || ""
    ).slice(0, 10);
    const oldDate =
      oldStart && typeof parseTaskDateOnly === "function"
        ? parseTaskDateOnly(oldStart)
        : null;
    const newDate =
      typeof parseTaskDateOnly === "function" ? parseTaskDateOnly(start) : null;
    const oldEndDate =
      oldEnd && typeof parseTaskDateOnly === "function"
        ? parseTaskDateOnly(oldEnd)
        : null;
    const newEndDate =
      typeof parseTaskDateOnly === "function" ? parseTaskDateOnly(end) : null;
    const startDelta =
      oldDate && newDate && typeof ganttDayDiff === "function"
        ? ganttDayDiff(oldDate, newDate)
        : 0;
    const durationUnchanged =
      oldDate &&
      oldEndDate &&
      newDate &&
      newEndDate &&
      typeof ganttDayDiff === "function" &&
      ganttDayDiff(oldDate, oldEndDate) === ganttDayDiff(newDate, newEndDate);

    if (
      !silent &&
      hasChildren &&
      startDelta &&
      durationUnchanged &&
      typeof shiftProjectScheduleByDays === "function"
    ) {
      const onlyIds = v2CollectSubtreeTaskIds(project, tid);
      let next = shiftProjectScheduleByDays(project, startDelta, { onlyIds });
      next = {
        ...next,
        autoScheduleDates: false,
        taskStartDates: { ...(next.taskStartDates || {}), [tid]: start },
        taskDueDates: { ...(next.taskDueDates || {}), [tid]: end },
        updatedAt: new Date().toISOString(),
      };
      // Po przesunięciu gałęzi: poza ramami dziadka → odrzuć
      if (typeof clampTaskRangeToParent === "function") {
        const again = clampTaskRangeToParent(next, tid, start, end);
        if (again?.clamped) {
          if (!silent) {
            showV2Toast("Data podrzędna musi zawierać się w nadrzędnej", {
              tone: "error",
            });
            remountTasksTab();
          }
          return null;
        }
      }
      const saved = persistProject(next);
      if (!silent) remountTasksTab();
      return saved;
    }

    const latest = getProjectById(pid) || project;
    const customTasks = (latest.customTasks || []).map((item) =>
      String(item.id) === tid
        ? {
            ...item,
            startDate: start,
            dueDate: end,
            updatedAt: new Date().toISOString(),
          }
        : item
    );

    let nextFlowTasks = latest.flowInstance?.tasks || null;
    if (nextFlowTasks) {
      nextFlowTasks = nextFlowTasks.map((item) => {
        if (String(item.id) !== tid) return item;
        let durationDays = item.durationDays;
        const startDate =
          typeof parseTaskDateOnly === "function" ? parseTaskDateOnly(start) : null;
        const endDate =
          typeof parseTaskDateOnly === "function" ? parseTaskDateOnly(end) : null;
        if (startDate && endDate && typeof ganttDayDiff === "function") {
          const calDays = ganttDayDiff(startDate, endDate) + 1;
          if (calDays > 0) durationDays = calDays;
        } else if (
          !hasChildren &&
          typeof workflowCountWorkingDaysInclusive === "function"
        ) {
          const days = workflowCountWorkingDaysInclusive(start, end);
          if (days > 0) durationDays = days;
        }
        return { ...item, durationDays, startDate: start };
      });
    }

    let next = {
      ...latest,
      autoScheduleDates: false,
      customTasks,
      taskStartDates: { ...(latest.taskStartDates || {}), [tid]: start },
      taskDueDates: { ...(latest.taskDueDates || {}), [tid]: end },
      updatedAt: new Date().toISOString(),
    };
    if (nextFlowTasks && latest.flowInstance) {
      next = {
        ...next,
        flowInstance: {
          ...latest.flowInstance,
          tasks: nextFlowTasks,
          updatedAt: new Date().toISOString(),
        },
      };
    }
    // Zmiana ram nadrzędnego — potomne muszą zostać w środku
    if (hasChildren && typeof clampProjectSubtreeToParentBounds === "function") {
      next = clampProjectSubtreeToParentBounds(next, tid);
    }
    const saved = persistProject(next);
    if (!saved) return null;
    if (!silent) remountTasksTab();
    return saved;
  }

  function flushV2GanttDatesFromDom(root, projectId) {
    const pid = String(projectId || "");
    if (!pid || !root) return;
    root.querySelectorAll('[data-role="v2-gantt-bar"]').forEach((bar) => {
      const taskId = String(bar.dataset.taskId || "");
      const startIso = String(bar.dataset.start || "");
      const endIso = String(bar.dataset.end || "");
      if (!taskId || !startIso || !endIso) return;
      persistV2TaskSchedule(pid, taskId, startIso, endIso, { silent: true });
    });
  }

  function syncV2GanttTreeDom(root, projectId) {
    const gantt = root.querySelector('[data-role="v2-gantt-view"]');
    if (!gantt || typeof getProjectById !== "function") return;
    const project = getProjectById(projectId);
    if (!project || typeof collectProjectTasks !== "function") return;

    const tasks = collectProjectTasks(project);
    const expandMap =
      typeof loadTaskExpandState === "function" ? loadTaskExpandState(projectId) : {};
    const byId = new Map(tasks.map((task) => [String(task.id), task]));

    gantt.querySelectorAll('[data-role="v2-gantt-row"]').forEach((row) => {
      const taskId = String(row.dataset.taskId || "");
      const task = byId.get(taskId);
      const treeHidden =
        task && typeof ganttTaskTreeHidden === "function"
          ? ganttTaskTreeHidden(projectId, task, byId, expandMap)
          : false;
      row.hidden = treeHidden;
      row.classList.toggle("is-tree-hidden", treeHidden);
      row.dataset.treeHidden = treeHidden ? "1" : "0";

      const toggle = row.querySelector('[data-role="v2-task-toggle"]');
      if (toggle && task) {
        const expanded =
          typeof isTaskNodeExpanded === "function"
            ? isTaskNodeExpanded(projectId, task, expandMap)
            : Boolean(expandMap[taskId]);
        toggle.classList.toggle("is-open", expanded);
        toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        toggle.title = expanded ? "Zwiń" : "Rozwiń";
        toggle.textContent = expanded ? "−" : "+";
      }
    });
    drawV2GanttDependencyLinks(gantt);
  }

  function drawV2GanttDependencyLinks(gantt) {
    const body = gantt?.querySelector('[data-role="v2-gantt-body"]');
    const paint = body?.querySelector('[data-role="v2-gantt-dep-svg"]');
    let hit = body?.querySelector('[data-role="v2-gantt-dep-hit-svg"]');
    if (!body || !paint) return;
    if (!hit) {
      hit = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      hit.setAttribute("data-role", "v2-gantt-dep-hit-svg");
      hit.classList.add("v2-gantt-dep-svg", "is-hit-layer");
      hit.setAttribute("aria-hidden", "true");
      body.appendChild(hit);
    }
    paint.classList.add("is-paint-layer");
    if (
      typeof ganttBarAnchorPoints !== "function" ||
      typeof collectProjectDependencyEdges !== "function"
    ) {
      return;
    }

    const width = Math.max(1, body.scrollWidth || body.clientWidth);
    const height = Math.max(1, body.scrollHeight || body.clientHeight);
    [paint, hit].forEach((svg) => {
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.style.width = `${width}px`;
      svg.style.height = `${height}px`;
    });

    const bodyRect = body.getBoundingClientRect();
    const barMap = new Map();
    body.querySelectorAll('[data-role="v2-gantt-bar"]').forEach((bar) => {
      const row = bar.closest('[data-role="v2-gantt-row"]');
      if (!row || row.hidden || row.classList.contains("is-tree-hidden")) return;
      const taskId = String(bar.dataset.taskId || "");
      const projectId = String(bar.dataset.projectId || gantt.dataset.projectId || "");
      if (!taskId || !projectId) return;
      barMap.set(`${projectId}::${taskId}`, {
        bar,
        ...ganttBarAnchorPoints(bar, bodyRect),
        parentId: bar.dataset.parentId || "",
        projectId,
        taskId,
      });
    });

    const pid = String(gantt.dataset.projectId || "");
    const edges =
      pid && typeof collectProjectDependencyEdges === "function"
        ? collectProjectDependencyEdges(getProjectById(pid) || {})
        : [];

    /** Jedno załamanie: pion z źródła, potem poziom do celu. */
    const simpleDepPath = (from, to) => {
      const exitBottom = to.midY >= from.midY;
      const x1 = from.cx;
      const y1 = exitBottom ? from.bottom : from.top;
      const enterFromLeft = to.cx >= from.cx;
      const x2 = enterFromLeft ? to.left : to.right;
      const y2 = to.midY;
      return `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`;
    };

    const laneEdges = [];
    edges.forEach((edge) => {
      const fromMeta = barMap.get(`${pid}::${edge.from}`);
      const toMeta = barMap.get(`${pid}::${edge.to}`);
      if (!fromMeta || !toMeta) return;
      if ((fromMeta.parentId || "") !== (toMeta.parentId || "")) return;
      laneEdges.push({
        id: `${edge.from}__${edge.to}`,
        from: edge.from,
        to: edge.to,
        d: simpleDepPath(fromMeta, toMeta),
      });
    });

    paint.innerHTML = `
      ${laneEdges
        .map(
          (edge) => `
        <g class="v2-gantt-dep-edge" data-from="${esc(edge.from)}" data-to="${esc(edge.to)}">
          <path class="v2-gantt-dep-line" d="${edge.d}" />
        </g>`
        )
        .join("")}
      <path class="v2-gantt-dep-preview" data-role="v2-gantt-dep-preview" hidden d="" />
    `;

    hit.innerHTML = laneEdges
      .map(
        (edge) => `
        <g class="v2-gantt-dep-edge" data-from="${esc(edge.from)}" data-to="${esc(edge.to)}">
          <path class="v2-gantt-dep-hit" d="${edge.d}" />
        </g>`
      )
      .join("");

    const clearEdgeHover = () => {
      paint.classList.remove("is-hovering");
      paint.querySelectorAll(".v2-gantt-dep-edge").forEach((other) => {
        other.classList.remove("is-hot");
      });
    };

    const setHotEdge = (fromId, toId) => {
      paint.classList.add("is-hovering");
      paint.querySelectorAll(".v2-gantt-dep-edge").forEach((other) => {
        const hot =
          String(other.dataset.from) === String(fromId) &&
          String(other.dataset.to) === String(toId);
        other.classList.toggle("is-hot", hot);
      });
    };

    const highlightEdgesForTask = (taskId) => {
      const tid = String(taskId || "");
      let any = false;
      paint.querySelectorAll(".v2-gantt-dep-edge").forEach((group) => {
        const hot =
          String(group.dataset.from) === tid || String(group.dataset.to) === tid;
        group.classList.toggle("is-hot", hot);
        if (hot) any = true;
      });
      paint.classList.toggle("is-hovering", any);
    };

    hit.querySelectorAll(".v2-gantt-dep-edge").forEach((group) => {
      group.addEventListener("pointerenter", () => {
        setHotEdge(group.dataset.from, group.dataset.to);
      });
      group.addEventListener("pointerleave", clearEdgeHover);
      group.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeV2DepContextMenu();
        const fromId = group.dataset.from;
        const toId = group.dataset.to;
        if (!fromId || !toId) return;
        openV2DepContextMenu(event.clientX, event.clientY, pid, fromId, toId);
      });
    });

    body.querySelectorAll('[data-role="v2-gantt-bar"]').forEach((bar) => {
      if (bar._v2DepHoverBound) return;
      bar._v2DepHoverBound = true;
      bar.addEventListener("pointerenter", () => {
        highlightEdgesForTask(bar.dataset.taskId);
      });
      bar.addEventListener("pointerleave", (event) => {
        const nextBar = event.relatedTarget?.closest?.('[data-role="v2-gantt-bar"]');
        const nextHit = event.relatedTarget?.closest?.(".v2-gantt-dep-edge");
        if (nextBar || nextHit) return;
        clearEdgeHover();
      });
    });
  }

  function closeV2DepContextMenu() {
    document.getElementById("v2DepContextMenu")?.remove();
  }

  function openV2DepContextMenu(clientX, clientY, projectId, fromId, toId) {
    closeV2DepContextMenu();
    const menu = document.createElement("div");
    menu.id = "v2DepContextMenu";
    menu.className = "v2-dep-context-menu";
    menu.innerHTML = `
      <button type="button" data-role="v2-dep-remove">Usuń powiązanie</button>`;
    document.body.appendChild(menu);
    const pad = 6;
    const rect = menu.getBoundingClientRect();
    let left = clientX;
    let top = clientY;
    if (left + rect.width > window.innerWidth - pad) {
      left = window.innerWidth - rect.width - pad;
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = window.innerHeight - rect.height - pad;
    }
    menu.style.left = `${Math.max(pad, left)}px`;
    menu.style.top = `${Math.max(pad, top)}px`;

    menu.querySelector('[data-role="v2-dep-remove"]')?.addEventListener("click", () => {
      closeV2DepContextMenu();
      if (typeof setWorkflowRuntime === "function") {
        setWorkflowRuntime({ mode: "project", projectId: String(projectId) });
      }
      if (typeof setProjectTaskDependency !== "function") return;
      if (
        !setProjectTaskDependency(String(projectId), String(fromId), String(toId), {
          remove: true,
        })
      ) {
        return;
      }
      showV2Toast("Usunięto powiązanie");
      const gantt = document.querySelector('[data-role="v2-gantt-view"]');
      if (gantt) {
        drawV2GanttDependencyLinks(gantt);
      } else {
        remountTasksTab();
      }
    });

    const cleanup = () => {
      document.removeEventListener("mousedown", onDoc, true);
      document.removeEventListener("keydown", onKey, true);
    };
    const onDoc = (event) => {
      if (menu.contains(event.target)) return;
      closeV2DepContextMenu();
      cleanup();
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      closeV2DepContextMenu();
      cleanup();
    };
    window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc, true);
      document.addEventListener("keydown", onKey, true);
    }, 0);
  }

  function bindV2GanttBoard(root, projectId) {
    const gantt = root.querySelector('[data-role="v2-gantt-view"]');
    if (!gantt) return;
    const pid = String(projectId || "");
    const ganttEditable =
      gantt.dataset.editable === "1" || loadV2TasksListEdit();
    if (!ganttEditable) {
      // Podgląd: bez przeciągania / zależności — tylko skala i rozwijanie
      root.querySelectorAll('[data-role="v2-gantt-scale"]').forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.preventDefault();
          const scale = btn.dataset.scale === "week" ? "week" : "month";
          if (typeof getGanttScale === "function" && getGanttScale() === scale) return;
          if (typeof setGanttScale === "function") setGanttScale(scale);
          remountTasksTab();
        });
      });
      return;
    }
    const dayWidth = Number(gantt.dataset.dayWidth) || 16;
    const timelineWidth = Number(gantt.dataset.timelineWidth) || 0;
    const parsedRange =
      typeof parseTaskDateOnly === "function"
        ? parseTaskDateOnly(gantt.dataset.rangeStart)
        : null;
    const rangeStart = parsedRange ? v2GanttNoon(parsedRange) : null;
    const body = gantt.querySelector('[data-role="v2-gantt-body"]');

    root.querySelectorAll('[data-role="v2-gantt-scale"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const scale = btn.dataset.scale === "week" ? "week" : "month";
        if (typeof getGanttScale === "function" && getGanttScale() === scale) return;
        flushV2GanttDatesFromDom(root, pid);
        if (typeof setGanttScale === "function") setGanttScale(scale);
        remountTasksTab();
      });
    });

    const applyBarGeometry = (bar, leftPx, widthPx, { respectBounds = true } = {}) => {
      let left = Math.round(leftPx / dayWidth) * dayWidth;
      let width = Math.max(dayWidth, Math.round(widthPx / dayWidth) * dayWidth);
      if (left < 0) left = 0;
      if (timelineWidth > 0 && left >= timelineWidth) {
        left = Math.max(0, timelineWidth - dayWidth);
      }
      if (timelineWidth > 0 && left + width > timelineWidth) {
        width = Math.max(dayWidth, timelineWidth - left);
      }

      // Podrzędne: nie wychodź poza ramy nadrzędnego
      if (
        respectBounds &&
        rangeStart &&
        bar.dataset.boundStart &&
        bar.dataset.boundEnd &&
        typeof parseTaskDateOnly === "function" &&
        typeof toIsoDateOnly === "function" &&
        typeof addDaysIso === "function"
      ) {
        const bS = parseTaskDateOnly(bar.dataset.boundStart);
        const bE = parseTaskDateOnly(bar.dataset.boundEnd);
        if (bS && bE) {
          const boundLeft = v2GanttDayDiff(rangeStart, v2GanttNoon(bS)) * dayWidth;
          const boundRight =
            (v2GanttDayDiff(rangeStart, v2GanttNoon(bE)) + 1) * dayWidth;
          const boundWidth = Math.max(dayWidth, boundRight - boundLeft);
          if (width > boundWidth) width = boundWidth;
          if (left < boundLeft) left = boundLeft;
          if (left + width > boundRight) left = Math.max(boundLeft, boundRight - width);
        }
      }

      bar.style.left = `${left}px`;
      bar.style.width = `${width}px`;
      if (!rangeStart || typeof addDaysIso !== "function" || typeof toIsoDateOnly !== "function") {
        return { startIso: bar.dataset.start, endIso: bar.dataset.end };
      }
      const startOffset = Math.round(left / dayWidth);
      const dayCount = Math.max(1, Math.round(width / dayWidth));
      const start = v2GanttNoon(addDaysIso(rangeStart, startOffset));
      const end = v2GanttNoon(addDaysIso(start, dayCount - 1));
      const startIso = toIsoDateOnly(start);
      const endIso = toIsoDateOnly(end);
      bar.dataset.start = startIso;
      bar.dataset.end = endIso;
      const dateLine = `${v2TaskDateLabel(startIso)} – ${v2TaskDateLabel(endIso)}`;
      const row = bar.closest('[data-role="v2-gantt-row"]');
      const datesEl = row?.querySelector(".v2-gantt-label-btn span");
      if (datesEl) datesEl.textContent = dateLine;
      const label = bar.querySelector(".v2-gantt-bar-label")?.textContent || "";
      const progress = bar.querySelector(".v2-gantt-bar-pct")?.textContent || "";
      bar.title = `${label} · ${dateLine}${progress ? ` · ${progress}` : ""}`;
      return { startIso, endIso };
    };

    gantt.querySelectorAll('[data-role="v2-gantt-bar"]').forEach((bar) => {
      let depHoverTimer = null;
      bar.addEventListener("pointerenter", () => {
        window.clearTimeout(depHoverTimer);
        depHoverTimer = window.setTimeout(() => {
          bar.classList.add("is-dep-ready");
        }, 1000);
      });
      bar.addEventListener("pointerleave", () => {
        window.clearTimeout(depHoverTimer);
        depHoverTimer = null;
        if (!gantt.classList.contains("is-dep-linking")) {
          bar.classList.remove("is-dep-ready");
        }
      });

      bar.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        if (event.target.closest('[data-role="v2-gantt-dep-port"]')) return;
        const isParentBar =
          bar.dataset.summary === "1" || bar.classList.contains("is-summary");
        const handle = event.target.closest('[data-role="v2-gantt-resize"]');
        event.preventDefault();
        event.stopPropagation();

        const mode = handle ? `resize-${handle.dataset.edge}` : "move";
        const originX = event.clientX;
        const originLeft = parseFloat(bar.style.left) || 0;
        const originWidth = parseFloat(bar.style.width) || dayWidth;
        const originStart = bar.dataset.start || "";
        const originEnd = bar.dataset.end || "";
        bar.classList.add("is-dragging");

        const parentId = String(bar.dataset.taskId || "");
        const subtreeBars = [];
        if (isParentBar && mode === "move" && parentId) {
          gantt.querySelectorAll('[data-role="v2-gantt-bar"]').forEach((other) => {
            if (other === bar) return;
            let walk = String(other.dataset.parentId || "");
            const guard = new Set();
            while (walk && !guard.has(walk)) {
              guard.add(walk);
              if (walk === parentId) {
                subtreeBars.push({
                  bar: other,
                  left: parseFloat(other.style.left) || 0,
                  width: parseFloat(other.style.width) || dayWidth,
                });
                break;
              }
              const parentRow = gantt.querySelector(
                `[data-role="v2-gantt-row"][data-task-id="${walk}"]`
              );
              walk = String(parentRow?.dataset.parentId || "");
            }
          });
        }

        const onMove = (moveEvent) => {
          const dx = moveEvent.clientX - originX;
          if (mode === "move") {
            applyBarGeometry(bar, originLeft + dx, originWidth);
            const appliedLeft = parseFloat(bar.style.left) || 0;
            const clampedDx = appliedLeft - originLeft;
            subtreeBars.forEach((item) => {
              applyBarGeometry(item.bar, item.left + clampedDx, item.width, {
                respectBounds: false,
              });
            });
          } else if (mode === "resize-start") {
            const nextLeft = originLeft + dx;
            const nextWidth = originWidth - dx;
            if (nextWidth >= dayWidth) applyBarGeometry(bar, nextLeft, nextWidth);
          } else if (mode === "resize-end") {
            applyBarGeometry(bar, originLeft, originWidth + dx);
          }
          drawV2GanttDependencyLinks(gantt);
        };

        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          bar.classList.remove("is-dragging");
          const taskId = String(bar.dataset.taskId || "");
          const startIso = String(bar.dataset.start || "");
          const endIso = String(bar.dataset.end || "");
          if (!taskId || !startIso || !endIso) {
            drawV2GanttDependencyLinks(gantt);
            return;
          }
          if (startIso === originStart && endIso === originEnd) {
            drawV2GanttDependencyLinks(gantt);
            return;
          }
          if (!persistV2TaskSchedule(pid, taskId, startIso, endIso)) {
            applyBarGeometry(bar, originLeft, originWidth);
            subtreeBars.forEach((item) => {
              applyBarGeometry(item.bar, item.left, item.width, {
                respectBounds: false,
              });
            });
            drawV2GanttDependencyLinks(gantt);
            return;
          }
          const resized = mode !== "move";
          showV2Toast(
            isParentBar && !resized
              ? `Przesunięto gałąź: ${v2TaskDateLabel(startIso)}`
              : `Termin: ${v2TaskDateLabel(startIso)} – ${v2TaskDateLabel(endIso)}`
          );
          drawV2GanttDependencyLinks(gantt);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });
    });

    gantt.querySelectorAll('[data-role="v2-gantt-dep-port"]').forEach((port) => {
      port.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const fromBar = port.closest('[data-role="v2-gantt-bar"]');
        if (!fromBar || !body) return;
        const fromId = String(fromBar.dataset.taskId || "");
        const fromParentId = String(fromBar.dataset.parentId || "");
        if (!fromId) return;

        drawV2GanttDependencyLinks(gantt);
        gantt.classList.add("is-dep-linking");
        fromBar.classList.add("is-link-source", "is-dep-ready");
        const preview = body.querySelector('[data-role="v2-gantt-dep-preview"]');

        const updatePreview = (clientX, clientY) => {
          if (!preview || typeof ganttBarAnchorPoints !== "function") return;
          const pts = ganttBarAnchorPoints(fromBar, body.getBoundingClientRect());
          const rect = body.getBoundingClientRect();
          const x2 = clientX - rect.left;
          const y2 = clientY - rect.top;
          preview.removeAttribute("hidden");
          preview.setAttribute("d", `M ${pts.cx} ${pts.bottom} L ${pts.cx} ${y2} L ${x2} ${y2}`);
        };

        const clearLinkUi = () => {
          gantt.classList.remove("is-dep-linking");
          fromBar.classList.remove("is-link-source");
          gantt.querySelectorAll(".v2-gantt-bar.is-link-target").forEach((el) => {
            el.classList.remove("is-link-target", "is-link-invalid");
          });
          if (preview) {
            preview.setAttribute("hidden", "");
            preview.setAttribute("d", "");
          }
        };

        updatePreview(event.clientX, event.clientY);

        const onMove = (moveEvent) => {
          updatePreview(moveEvent.clientX, moveEvent.clientY);
          gantt.querySelectorAll(".v2-gantt-bar.is-link-target").forEach((el) => {
            el.classList.remove("is-link-target", "is-link-invalid");
          });
          const targetBar = moveEvent.target.closest?.('[data-role="v2-gantt-bar"]');
          if (!targetBar || targetBar === fromBar) return;
          targetBar.classList.add("is-link-target");
          if (String(targetBar.dataset.parentId || "") !== fromParentId) {
            targetBar.classList.add("is-link-invalid");
          }
        };

        const onUp = (upEvent) => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          const targetBar =
            upEvent.target.closest?.('[data-role="v2-gantt-bar"]') ||
            document
              .elementFromPoint(upEvent.clientX, upEvent.clientY)
              ?.closest?.('[data-role="v2-gantt-bar"]');
          clearLinkUi();
          if (!targetBar || targetBar === fromBar) {
            drawV2GanttDependencyLinks(gantt);
            return;
          }
          const toId = String(targetBar.dataset.taskId || "");
          if (!toId) {
            drawV2GanttDependencyLinks(gantt);
            return;
          }
          if (String(targetBar.dataset.parentId || "") !== fromParentId) {
            showV2Toast("Powiązania tylko na tym samym poziomie");
            drawV2GanttDependencyLinks(gantt);
            return;
          }
          if (typeof setWorkflowRuntime === "function") {
            setWorkflowRuntime({ mode: "project", projectId: pid });
          }
          if (typeof setProjectTaskDependency !== "function") {
            showV2Toast("Nie udało się utworzyć powiązania");
            return;
          }
          if (
            !setProjectTaskDependency(pid, fromId, toId, {
              remove: false,
            })
          ) {
            drawV2GanttDependencyLinks(gantt);
            return;
          }
          showV2Toast("Dodano powiązanie");
          remountTasksTab();
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });
    });

    drawV2GanttDependencyLinks(gantt);
    requestAnimationFrame(() => drawV2GanttDependencyLinks(gantt));
    if (typeof ResizeObserver !== "undefined" && body) {
      gantt._v2GanttDepResizeObserver?.disconnect?.();
      const observer = new ResizeObserver(() => drawV2GanttDependencyLinks(gantt));
      observer.observe(body);
      gantt._v2GanttDepResizeObserver = observer;
    }

    restoreV2GanttScroll();

    const scroller = gantt.querySelector('[data-role="v2-gantt-pan"]');
    if (!scroller) return;
    scroller.addEventListener("scroll", () => drawV2GanttDependencyLinks(gantt), {
      passive: true,
    });
    scroller.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      if (
        event.target.closest(
          ".v2-gantt-bar, .v2-gantt-label, .v2-gantt-label-head, .v2-gantt-toggle, .v2-gantt-scale, button, a, input, select, label"
        )
      ) {
        return;
      }
      const startX = event.clientX;
      const originLeft = scroller.scrollLeft;
      scroller.classList.add("is-panning");
      event.preventDefault();
      const onMove = (moveEvent) => {
        scroller.scrollLeft = originLeft - (moveEvent.clientX - startX);
        drawV2GanttDependencyLinks(gantt);
      };
      const onUp = () => {
        scroller.classList.remove("is-panning");
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        drawV2GanttDependencyLinks(gantt);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }

  function openV2BulkOwnerModal(projectId) {
    const pid = String(projectId || "");
    const project =
      typeof getProjectById === "function" ? getProjectById(pid) : null;
    if (!project) return;
    const tasks =
      typeof collectProjectTasks === "function" ? collectProjectTasks(project) : [];
    if (!tasks.length) {
      showV2Toast("Brak zadań");
      return;
    }
    const ownerOptions =
      typeof getTaskOwnerOptions === "function"
        ? getTaskOwnerOptions(project)
        : [{ id: "none", name: "Brak właściciela" }];

    let modal = document.getElementById("v2BulkOwnerModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "v2BulkOwnerModal";
      modal.className = "v2-modal";
      modal.hidden = true;
      document.body.appendChild(modal);
    }

    const rows = tasks
      .map(
        (task) => `
        <label class="v2-bulk-owner-row">
          <input type="checkbox" data-role="v2-bulk-owner-check" value="${esc(
            String(task.id)
          )}" />
          <span class="v2-bulk-owner-name" style="--v2-task-depth:${Math.max(
            0,
            Number(task.depth) || 0
          )}">${esc(task.name || "Zadanie")}</span>
        </label>`
      )
      .join("");

    const opts = ownerOptions
      .map((opt) => `<option value="${esc(opt.id)}">${esc(opt.name)}</option>`)
      .join("");

    modal.innerHTML = `
      <div class="v2-modal-backdrop" data-role="v2-bulk-owner-close"></div>
      <div class="v2-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="v2BulkOwnerTitle">
        <header class="v2-modal-head">
          <div>
            <p class="v2-modal-kicker">Zadania</p>
            <h2 id="v2BulkOwnerTitle">Masowe przypisanie właściciela</h2>
          </div>
          <button type="button" class="v2-modal-close" data-role="v2-bulk-owner-close" aria-label="Zamknij">×</button>
        </header>
        <div class="v2-modal-body">
          <div class="v2-bulk-owner-list">${rows}</div>
          <label class="v2-field">
            <span class="v2-field-label">Właściciel</span>
            <select data-role="v2-bulk-owner-select">${opts}</select>
          </label>
        </div>
        <footer class="v2-modal-foot">
          <button type="button" class="ghost-btn" data-role="v2-bulk-owner-close">Anuluj</button>
          <button type="button" class="v2-section-btn" data-role="v2-bulk-owner-save">Zapisz</button>
        </footer>
      </div>`;

    const close = () => {
      modal.hidden = true;
    };
    modal.querySelectorAll('[data-role="v2-bulk-owner-close"]').forEach((el) => {
      el.addEventListener("click", close);
    });
    modal.querySelector('[data-role="v2-bulk-owner-save"]')?.addEventListener("click", () => {
      const selected = [
        ...modal.querySelectorAll('[data-role="v2-bulk-owner-check"]:checked'),
      ].map((input) => String(input.value));
      const ownerId = String(
        modal.querySelector('[data-role="v2-bulk-owner-select"]')?.value || "none"
      );
      if (!selected.length) {
        showV2Toast("Zaznacz co najmniej jedno zadanie");
        return;
      }
      const latest =
        typeof getProjectById === "function" ? getProjectById(pid) : null;
      if (!latest || typeof persistProject !== "function") {
        showV2Toast("Nie udało się zapisać");
        return;
      }
      const owners = { ...(latest.taskOwners || {}) };
      selected.forEach((taskId) => {
        owners[taskId] = ownerId;
      });
      persistProject({
        ...latest,
        taskOwners: owners,
        updatedAt: new Date().toISOString(),
      });
      close();
      showV2Toast(`Przypisano właściciela (${selected.length})`);
      remountTasksTab();
    });

    modal.hidden = false;
  }

  function bindV2TasksEditToggle(root) {
    root.querySelector('[data-role="v2-list-edit-toggle"]')?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        const next = !loadV2TasksListEdit();
        saveV2TasksListEdit(next);
        remountTasksTab();
      }
    );
  }

  function bindV2TasksTableChrome(root, projectId) {
    const table = root.querySelector('[data-role="v2-tasks-table"]');
    if (!table) return;
    const pid = String(projectId || "");

    const menuWrap = root.querySelector('[data-role="v2-cols-menu-wrap"]');
    const menu = root.querySelector('[data-role="v2-cols-menu"]');
    const toggle = root.querySelector('[data-role="v2-cols-menu-toggle"]');
    const closeColsMenu = () => {
      if (!menu || menu.hidden) return;
      menu.hidden = true;
      toggle?.setAttribute("aria-expanded", "false");
      document.removeEventListener("mousedown", onDocCloseCols, true);
    };
    const onDocCloseCols = (event) => {
      if (menuWrap?.contains(event.target)) return;
      closeColsMenu();
    };
    toggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const willOpen = Boolean(menu?.hidden);
      if (!menu) return;
      if (willOpen) {
        menu.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
        document.addEventListener("mousedown", onDocCloseCols, true);
      } else {
        closeColsMenu();
      }
    });

    root.querySelectorAll('[data-role="v2-col-visibility"]').forEach((input) => {
      input.addEventListener("change", () => {
        const colId = String(input.dataset.col || "");
        if (!colId || colId === "name") return;
        const layout = loadV2TasksTableState();
        layout.visible[colId] = Boolean(input.checked);
        saveV2TasksTableState(layout);
        remountTasksTab();
      });
    });

    root.querySelector('[data-role="v2-bulk-owner"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openV2BulkOwnerModal(pid);
    });

    root.querySelectorAll('[data-role="v2-task-col-resize"]').forEach((handle) => {
      handle.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = handle.dataset.col;
        const def = V2_TASK_COL_DEFS.find((col) => col.id === key);
        const col = table.querySelector(`col[data-col="${key}"]`);
        const th = handle.closest("th");
        if (!col || !th || !key || !def) return;
        const startX = event.clientX;
        const startWidth = th.getBoundingClientRect().width;
        const onMove = (moveEvent) => {
          const next = Math.max(
            def.min,
            Math.round(startWidth + (moveEvent.clientX - startX))
          );
          col.style.width = `${next}px`;
          const layout = loadV2TasksTableState();
          layout.widths[key] = next;
          saveV2TasksTableState(layout);
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          document.body.classList.remove("v2-col-resizing");
        };
        document.body.classList.add("v2-col-resizing");
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    });

    let dragKey = null;
    table.querySelectorAll("thead th[data-col]").forEach((th) => {
      if (th.dataset.col === "name") return;
      th.addEventListener("dragstart", (event) => {
        if (event.target.closest('[data-role="v2-task-col-resize"], button')) {
          event.preventDefault();
          return;
        }
        dragKey = th.dataset.col;
        th.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", dragKey || "");
      });
      th.addEventListener("dragend", () => {
        th.classList.remove("is-dragging");
        table.querySelectorAll("th.is-drop-target").forEach((el) => {
          el.classList.remove("is-drop-target");
        });
        dragKey = null;
      });
      th.addEventListener("dragover", (event) => {
        if (!dragKey || dragKey === th.dataset.col || th.dataset.col === "name") return;
        event.preventDefault();
        th.classList.add("is-drop-target");
      });
      th.addEventListener("dragleave", () => th.classList.remove("is-drop-target"));
      th.addEventListener("drop", (event) => {
        event.preventDefault();
        th.classList.remove("is-drop-target");
        const from = dragKey || event.dataTransfer.getData("text/plain");
        const to = th.dataset.col;
        if (!from || !to || from === to || to === "name" || from === "name") return;
        const layout = loadV2TasksTableState();
        const rest = layout.order.filter((id) => id !== "name" && id !== from);
        const toIndex = rest.indexOf(to);
        if (toIndex < 0) return;
        rest.splice(toIndex, 0, from);
        layout.order = ["name", ...rest];
        saveV2TasksTableState(layout);
        remountTasksTab();
      });
    });
  }

  function bindProjectTasksExplorer(root, projectId) {
    const pid = String(projectId || "");
    if (!pid) return;

    root.querySelectorAll('[data-role="v2-tasks-view"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const mode = String(btn.dataset.view || "list");
        if (getV2TasksViewMode() === mode) return;
        flushV2GanttDatesFromDom(root, pid);
        setV2TasksViewMode(mode);
        remountTasksTab();
      });
    });

    const foldTree = (expanded) => {
      const project =
        typeof getProjectById === "function" ? getProjectById(pid) : null;
      if (!project || typeof collectProjectTasks !== "function") return;
      const tasks = collectProjectTasks(project);
      if (typeof setAllTaskExpandState === "function") {
        setAllTaskExpandState(pid, tasks, expanded);
      }
      remountTasksTab();
    };
    root
      .querySelector('[data-role="v2-tasks-collapse-all"]')
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        foldTree(false);
      });
    root
      .querySelector('[data-role="v2-tasks-expand-all"]')
      ?.addEventListener("click", (event) => {
        event.preventDefault();
        foldTree(true);
      });

    root.querySelectorAll('[data-role="v2-task-toggle"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleV2TaskExpand(pid, btn.dataset.taskId);
        // Gantt: tylko ukryj/pokaż wiersze — remount kasowałby lokalnie ustawione paski
        if (root.querySelector('[data-role="v2-gantt-view"]')) {
          syncV2GanttTreeDom(root, pid);
        } else {
          remountTasksTab();
        }
      });
    });

    root.querySelectorAll('[data-role="v2-open-task"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const taskId = btn.dataset.taskId;
        if (!taskId) return;
        requestOpenV2Task(pid, taskId);
      });
    });

    bindV2TasksEditToggle(root);
    bindV2KanbanBoard(root, pid);
    bindV2GanttBoard(root, pid);

    const layout = root.querySelector('[data-role="v2-tasks-layout"]');
    const formalToggle = root.querySelector('[data-role="v2-formal-rail-toggle"]');
    const formalPanel = root.querySelector(".v2-formal-rail-panel");
    formalToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      const open = !layout?.classList.contains("is-formal-open");
      layout?.classList.toggle("is-formal-open", open);
      formalToggle.setAttribute("aria-expanded", open ? "true" : "false");
      formalToggle.title = open
        ? "Zwiń dokumentację formalną"
        : "Rozwiń dokumentację formalną";
      if (formalPanel) formalPanel.hidden = !open;
      saveFormalDocsRailOpen(open);
    });

    const clearFormalTaskHover = () => {
      root
        .querySelectorAll(
          ".v2-task-row.is-rail-hover, .v2-task-row.is-rail-hover-nested, .v2-kanban-card.is-rail-hover, .v2-kanban-card.is-rail-hover-nested, [data-role='v2-gantt-row'].is-rail-hover, [data-role='v2-gantt-row'].is-rail-hover-nested"
        )
        .forEach((el) => {
          el.classList.remove("is-rail-hover", "is-rail-hover-nested");
          el.querySelectorAll("[data-role='v2-rail-nest-hint']").forEach((hint) => {
            hint.remove();
          });
        });
    };
    const findVisibleTaskHoverTarget = (taskId) => {
      const tid = String(taskId || "");
      if (!tid) return null;
      const viewMode = getV2TasksViewMode();

      if (viewMode === "kanban") {
        const direct = root.querySelector(
          `[data-role="v2-kanban-card"][data-task-id="${tid}"]`
        );
        if (direct) return { row: direct, nested: false, kind: "kanban" };
        const project =
          typeof getProjectById === "function" ? getProjectById(pid) : null;
        if (!project || typeof collectProjectTasks !== "function") return null;
        const all = collectProjectTasks(project);
        const child = all.find(
          (item) =>
            !item.hasChildren &&
            String(item.parentId || "") === tid &&
            root.querySelector(
              `[data-role="v2-kanban-card"][data-task-id="${String(item.id)}"]`
            )
        );
        if (child) {
          const card = root.querySelector(
            `[data-role="v2-kanban-card"][data-task-id="${String(child.id)}"]`
          );
          if (card) return { row: card, nested: true, kind: "kanban" };
        }
        // Dokument na nadrzędnym: podświetl pierwszą widoczną kartę-potomka
        const descendants = all.filter((item) => {
          if (item.hasChildren) return false;
          let walk = String(item.parentId || "");
          const guard = new Set();
          while (walk && !guard.has(walk)) {
            guard.add(walk);
            if (walk === tid) return true;
            walk = String(
              all.find((row) => String(row.id) === walk)?.parentId || ""
            );
          }
          return false;
        });
        for (const leaf of descendants) {
          const card = root.querySelector(
            `[data-role="v2-kanban-card"][data-task-id="${String(leaf.id)}"]`
          );
          if (card) return { row: card, nested: true, kind: "kanban" };
        }
        return null;
      }

      if (viewMode === "gantt") {
        const direct = root.querySelector(
          `[data-role="v2-gantt-row"][data-task-id="${tid}"]`
        );
        if (direct && !direct.hidden) return { row: direct, nested: false, kind: "gantt" };
        const project =
          typeof getProjectById === "function" ? getProjectById(pid) : null;
        if (!project || typeof collectProjectTasks !== "function") return null;
        const byId = new Map(
          collectProjectTasks(project).map((item) => [String(item.id), item])
        );
        let parentId = byId.get(tid)?.parentId || null;
        while (parentId) {
          const row = root.querySelector(
            `[data-role="v2-gantt-row"][data-task-id="${String(parentId)}"]`
          );
          if (row && !row.hidden) return { row, nested: true, kind: "gantt" };
          parentId = byId.get(String(parentId))?.parentId || null;
        }
        return null;
      }

      const direct = root.querySelector(`.v2-task-row[data-task-id="${tid}"]`);
      if (direct) return { row: direct, nested: false, kind: "list" };
      const project =
        typeof getProjectById === "function" ? getProjectById(pid) : null;
      if (!project || typeof collectProjectTasks !== "function") return null;
      const byId = new Map(
        collectProjectTasks(project).map((item) => [String(item.id), item])
      );
      let parentId = byId.get(tid)?.parentId || null;
      while (parentId) {
        const row = root.querySelector(
          `.v2-task-row[data-task-id="${String(parentId)}"]`
        );
        if (row) return { row, nested: true, kind: "list" };
        parentId = byId.get(String(parentId))?.parentId || null;
      }
      return null;
    };
    const setFormalTaskHover = (taskId) => {
      clearFormalTaskHover();
      const target = findVisibleTaskHoverTarget(taskId);
      if (!target?.row) return;
      target.row.classList.add("is-rail-hover");
      if (target.nested) {
        target.row.classList.add("is-rail-hover-nested");
        const name =
          target.row.querySelector(".v2-task-name") ||
          target.row.querySelector(".v2-kanban-card-title") ||
          target.row.querySelector(".v2-gantt-label");
        if (name && !name.querySelector('[data-role="v2-rail-nest-hint"]')) {
          const hint = document.createElement("span");
          hint.className = "v2-rail-nest-hint";
          hint.dataset.role = "v2-rail-nest-hint";
          hint.setAttribute("aria-hidden", "true");
          hint.title = "Zadanie jest zwinięte poniżej";
          hint.innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v11.5M7.5 12.5 12 17l4.5-4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
          name.appendChild(hint);
        }
      }
      target.row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    root.querySelectorAll('[data-role="v2-formal-rail-doc"]').forEach((btn) => {
      btn.addEventListener("pointerenter", () => {
        setFormalTaskHover(btn.dataset.taskId);
      });
      btn.addEventListener("pointerleave", (event) => {
        const next = event.relatedTarget?.closest?.(
          '[data-role="v2-formal-rail-doc"], [data-role="v2-formal-goto-task"]'
        );
        if (next) return;
        clearFormalTaskHover();
      });

      btn.addEventListener("click", (event) => {
        if (btn.dataset.v2DragMoved === "1") {
          event.preventDefault();
          btn.dataset.v2DragMoved = "0";
          return;
        }
        event.preventDefault();
        const docId = String(btn.dataset.docId || "");
        if (!docId) return;
        v2Route = {
          name: "doc-detail",
          projectId: pid,
          docId,
        };
        mountV2();
      });

      btn.addEventListener("dragstart", (event) => {
        const docId = String(btn.dataset.docId || "");
        const title = String(btn.dataset.docTitle || btn.textContent || "Dokument");
        if (!docId || !event.dataTransfer) return;
        btn.dataset.v2DragMoved = "1";
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.setData("text/plain", docId);
        event.dataTransfer.setData("application/x-v2-formal-doc", docId);
        const ghost = createV2DocDragGhost(title);
        try {
          event.dataTransfer.setDragImage(ghost, 16, 18);
        } catch (e) {
          /* ignore */
        }
        btn.classList.add("is-dragging");
      });

      btn.addEventListener("dragend", () => {
        btn.classList.remove("is-dragging");
        clearV2DocDragGhost();
        root.querySelectorAll(".v2-task-row.is-drop-target").forEach((row) => {
          row.classList.remove("is-drop-target");
        });
        window.setTimeout(() => {
          btn.dataset.v2DragMoved = "0";
        }, 0);
      });
    });

    root.querySelectorAll('[data-role="v2-formal-goto-task"]').forEach((btn) => {
      btn.addEventListener("pointerenter", () => {
        setFormalTaskHover(btn.dataset.taskId);
      });
      btn.addEventListener("pointerleave", (event) => {
        const next = event.relatedTarget?.closest?.(
          '[data-role="v2-formal-rail-doc"], [data-role="v2-formal-goto-task"]'
        );
        if (next) return;
        clearFormalTaskHover();
      });
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const taskId = String(btn.dataset.taskId || "");
        if (!taskId) return;
        expandAncestorsToTask(pid, taskId);
        queueTaskFlash(pid, taskId);
        v2Route = { ...v2Route, name: "edit-project", projectId: pid, tab: "tasks", taskId };
        remountTasksTab();
      });
    });

    root.querySelectorAll('[data-role="v2-task-drop"]').forEach((row) => {
      row.addEventListener("dragover", (event) => {
        if (![...event.dataTransfer.types].includes("application/x-v2-formal-doc")) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        row.classList.add("is-drop-target");
      });
      row.addEventListener("dragleave", () => {
        row.classList.remove("is-drop-target");
      });
      row.addEventListener("drop", (event) => {
        event.preventDefault();
        row.classList.remove("is-drop-target");
        const docId =
          event.dataTransfer.getData("application/x-v2-formal-doc") ||
          event.dataTransfer.getData("text/plain");
        const taskId = String(row.dataset.taskId || "");
        if (!docId || !taskId) return;
        const ok = linkV2DocToTask(pid, taskId, docId);
        if (!ok) {
          showV2Toast("Nie udało się powiązać dokumentu");
          return;
        }
        showV2Toast("Powiązano dokument z zadaniem");
        expandV2TaskNode(pid, taskId);
        remountTasksTab();
      });
    });

    root.querySelectorAll('[data-role="v2-task-linked-doc"]').forEach((btn) => {
      // Tylko tooltip (title) — bez otwierania/podświetlania raila dokumentów
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const docId = String(btn.dataset.docId || "");
        if (!docId) return;
        v2Route = {
          name: "doc-detail",
          projectId: pid,
          docId,
        };
        mountV2();
      });
    });

    applyPendingTaskFlash(root, pid);

    root.querySelectorAll('[data-role="v2-task-status-inline"]').forEach((select) => {
      select.addEventListener("change", (event) => {
        event.stopPropagation();
        const taskId = String(select.dataset.taskId || "");
        const statusId = String(select.value || "");
        if (!taskId || !statusId) return;
        if (!setV2TaskBoardStatus(pid, taskId, statusId)) {
          showV2Toast("Nie udało się zmienić statusu");
          return;
        }
        showV2Toast("Zmieniono status");
        remountTasksTab();
      });
      select.addEventListener("click", (event) => event.stopPropagation());
      select.addEventListener("mousedown", (event) => event.stopPropagation());
    });

    root.querySelectorAll('[data-role="v2-task-owner-inline"]').forEach((select) => {
      select.addEventListener("change", (event) => {
        event.stopPropagation();
        const taskId = String(select.dataset.taskId || "");
        const ownerId = String(select.value || "none");
        if (!taskId) return;
        if (!setV2TaskOwner(pid, taskId, ownerId)) {
          showV2Toast("Nie udało się zmienić właściciela");
          return;
        }
        showV2Toast("Zmieniono właściciela");
      });
      select.addEventListener("click", (event) => event.stopPropagation());
      select.addEventListener("mousedown", (event) => event.stopPropagation());
    });

    root.querySelectorAll('[data-role="v2-task-notes-inline"]').forEach((input) => {
      const saveNotes = () => {
        const taskId = String(input.dataset.taskId || "");
        if (!taskId) return;
        const previous = getV2TaskNotes(
          typeof getProjectById === "function" ? getProjectById(pid) : null,
          taskId
        );
        const next = String(input.value || "");
        if (next === previous) return;
        if (!setV2TaskNotes(pid, taskId, next)) {
          showV2Toast("Nie udało się zapisać uwag");
          return;
        }
        showV2Toast("Zapisano uwagi");
      };
      input.addEventListener("change", (event) => {
        event.stopPropagation();
        saveNotes();
      });
      input.addEventListener("blur", saveNotes);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          input.blur();
        }
      });
      input.addEventListener("click", (event) => event.stopPropagation());
      input.addEventListener("mousedown", (event) => event.stopPropagation());
    });

    const saveInlineTaskDate = (taskId, field, value) => {
      const project =
        typeof getProjectById === "function" ? getProjectById(pid) : null;
      if (!project || !taskId) return false;
      const tasks =
        typeof collectProjectTasks === "function" ? collectProjectTasks(project) : [];
      const task = tasks.find((item) => String(item.id) === String(taskId));
      let start =
        field === "start" ? String(value || "") : String(task?.startDate || "").slice(0, 10);
      let due =
        field === "due" ? String(value || "") : String(task?.dueDate || "").slice(0, 10);
      if (start && !due) due = start;
      if (due && !start) start = due;
      if (!start && !due) {
        const next = {
          ...project,
          taskStartDates: { ...(project.taskStartDates || {}), [String(taskId)]: "" },
          taskDueDates: { ...(project.taskDueDates || {}), [String(taskId)]: "" },
          customTasks: (project.customTasks || []).map((item) =>
            String(item.id) === String(taskId)
              ? { ...item, startDate: "", dueDate: "", updatedAt: new Date().toISOString() }
              : item
          ),
          updatedAt: new Date().toISOString(),
        };
        if (typeof persistProject === "function") persistProject(next);
        return true;
      }
      return Boolean(persistV2TaskSchedule(pid, taskId, start, due));
    };

    root.querySelectorAll('[data-role="v2-task-start-inline"]').forEach((input) => {
      input.addEventListener("change", (event) => {
        event.stopPropagation();
        const taskId = String(input.dataset.taskId || "");
        if (!taskId) return;
        if (!saveInlineTaskDate(taskId, "start", input.value)) {
          remountTasksTab();
          return;
        }
        showV2Toast("Zapisano datę od");
        remountTasksTab();
      });
      input.addEventListener("click", (event) => event.stopPropagation());
    });

    root
      .querySelector('[data-role="v2-flow-start-anchor"]')
      ?.addEventListener("change", (event) => {
        event.stopPropagation();
        const input = event.currentTarget;
        const startIso = String(input?.value || "").trim();
        const project =
          typeof getProjectById === "function" ? getProjectById(pid) : null;
        if (!project || !startIso) return;
        if (typeof setWorkflowRuntime === "function") {
          setWorkflowRuntime({ mode: "project", projectId: pid });
        }
        if (typeof applyProjectFlowStartAnchor !== "function") {
          showV2Toast("Nie udało się ustawić daty startu");
          return;
        }
        const next = applyProjectFlowStartAnchor(project, startIso);
        if (!next || typeof persistProject !== "function") {
          showV2Toast("Nie udało się ustawić daty startu");
          remountTasksTab();
          return;
        }
        persistProject(next);
        showV2Toast(`Start projektu: ${startIso} — całość przesunięta`);
        remountTasksTab();
      });

    root.querySelectorAll('[data-role="v2-task-due-inline"]').forEach((input) => {
      input.addEventListener("change", (event) => {
        event.stopPropagation();
        const taskId = String(input.dataset.taskId || "");
        if (!taskId) return;
        if (!saveInlineTaskDate(taskId, "due", input.value)) {
          remountTasksTab();
          return;
        }
        showV2Toast("Zapisano datę do");
        remountTasksTab();
      });
      input.addEventListener("click", (event) => event.stopPropagation());
    });

    bindV2TasksTableChrome(root, pid);

    root.querySelector('[data-role="v2-flow-export"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const project =
        typeof getProjectById === "function" ? getProjectById(pid) : null;
      if (!project) return;
      exportV2ProjectFlowAsTemplate(project);
    });

    root.querySelector('[data-role="v2-flow-import"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const project =
        typeof getProjectById === "function" ? getProjectById(pid) : null;
      if (!project) return;
      openV2ImportFlowPicker(project);
    });

    root.querySelector('[data-role="v2-task-add-root"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const project =
        typeof getProjectById === "function" ? getProjectById(pid) : null;
      openV2TaskNameModal({
        title: "Zadanie główne",
        eyebrow: project?.title || "Projekt",
        placeholder: "np. Projekt budowlany",
        onSave: (name) => {
          const created = createV2ProjectTask(pid, name, null);
          if (!created) {
            showV2Toast("Nie udało się dodać zadania");
            return;
          }
          showV2Toast(`Dodano zadanie: ${created.name}`);
          remountTasksTab();
        },
      });
    });

    root.querySelectorAll('[data-role="v2-task-add-child"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!loadV2TasksListEdit()) {
          showV2Toast("Odblokuj edycję, aby dodać podzadanie", { tone: "error" });
          return;
        }
        const parentId = btn.dataset.taskId;
        const project =
          typeof getProjectById === "function" ? getProjectById(pid) : null;
        const tasks =
          typeof collectProjectTasks === "function" ? collectProjectTasks(project || {}) : [];
        const parent = tasks.find((item) => String(item.id) === String(parentId));
        openV2TaskNameModal({
          title: "Podzadanie",
          eyebrow: parent?.name || project?.title || "Projekt",
          placeholder: "np. Korekty dokumentacji",
          onSave: (name) => {
            expandV2TaskNode(pid, parentId);
            const created = createV2ProjectTask(pid, name, parentId);
            if (!created) {
              showV2Toast("Nie udało się dodać podzadania");
              return;
            }
            showV2Toast(`Dodano podzadanie: ${created.name}`);
            remountTasksTab();
          },
        });
      });
    });

    root.querySelectorAll('[data-role="v2-task-delete"]').forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!loadV2TasksListEdit()) {
          showV2Toast("Odblokuj edycję, aby usuwać zadania", { tone: "error" });
          return;
        }
        const taskId = String(btn.dataset.taskId || "");
        if (!taskId) return;
        const removed = await confirmDeleteV2ProjectTask(pid, taskId);
        if (!removed) return;
        showV2Toast("Usunięto zadanie");
        remountTasksTab();
      });
    });
  }

  const PROJECT_COLS_KEY = "snappoint.v2.projects.cols";
  const PROJECT_FILTERS_KEY = "snappoint.v2.projects.filters";

  const PROJECT_COL_DEFS = {
    name: { key: "name", label: "Nazwa projektu", filterable: true, cls: "v2-col-name", defaultWidth: 180 },
    status: { key: "status", label: "Status", filterable: true, cls: "v2-col-status", defaultWidth: 110 },
    registered: { key: "registered", label: "Data rejestracji", filterable: true, cls: "v2-col-date", defaultWidth: 120 },
    start: { key: "start", label: "Data startu", filterable: true, cls: "v2-col-date", defaultWidth: 110 },
    end: { key: "end", label: "Data zakończenia", filterable: true, cls: "v2-col-date", defaultWidth: 130 },
    owner: { key: "owner", label: "Właściciel", filterable: true, cls: "v2-col-owner", defaultWidth: 120 },
    tasks: { key: "tasks", label: "Zadania", filterable: true, cls: "v2-col-count", defaultWidth: 80 },
    docs: { key: "docs", label: "Dokumentacja", filterable: true, cls: "v2-col-count", defaultWidth: 110 },
    actions: { key: "actions", label: "Akcje", filterable: false, cls: "v2-col-actions", defaultWidth: 110 },
  };

  const DEFAULT_COL_ORDER = [
    "name",
    "status",
    "registered",
    "start",
    "end",
    "owner",
    "tasks",
    "docs",
    "actions",
  ];

  /** @type {{ order: string[], widths: Record<string, number>, filtersOn: boolean, filters: Record<string, string> }} */
  let projectsTableState = loadProjectsTableState();

  function loadProjectsTableState() {
    const defaults = {
      order: DEFAULT_COL_ORDER.slice(),
      widths: Object.fromEntries(
        DEFAULT_COL_ORDER.map((key) => [key, PROJECT_COL_DEFS[key].defaultWidth])
      ),
      filtersOn: false,
      filters: {},
    };
    try {
      const cols = JSON.parse(localStorage.getItem(PROJECT_COLS_KEY) || "null");
      const filters = JSON.parse(localStorage.getItem(PROJECT_FILTERS_KEY) || "null");
      if (cols && Array.isArray(cols.order)) {
        const order = cols.order.filter((key) => PROJECT_COL_DEFS[key]);
        DEFAULT_COL_ORDER.forEach((key) => {
          if (!order.includes(key)) order.push(key);
        });
        defaults.order = order;
      }
      if (cols && cols.widths && typeof cols.widths === "object") {
        defaults.widths = { ...defaults.widths, ...cols.widths };
      }
      if (filters && typeof filters === "object") {
        defaults.filtersOn = Boolean(filters.on);
        defaults.filters =
          filters.values && typeof filters.values === "object" ? filters.values : {};
      }
    } catch (e) {
      /* ignore */
    }
    return defaults;
  }

  function saveProjectsTableState() {
    try {
      localStorage.setItem(
        PROJECT_COLS_KEY,
        JSON.stringify({
          order: projectsTableState.order,
          widths: projectsTableState.widths,
        })
      );
      localStorage.setItem(
        PROJECT_FILTERS_KEY,
        JSON.stringify({
          on: projectsTableState.filtersOn,
          values: projectsTableState.filters,
        })
      );
    } catch (e) {
      /* ignore */
    }
  }

  function projectStatusLabel(_project) {
    return "W trakcie";
  }

  function projectRowValues(project) {
    const id = String(project.id || "");
    const title = project.title || "Bez tytułu";
    const status = projectStatusLabel(project);
    const owner = projectOwnerName(project);
    const registered = formatRegDate(project.createdAt);
    const start = formatRegDate(project.startDate || project.projectStartDate || "");
    const end = formatRegDate(project.endDate || project.dueDate || project.projectEndDate || "");
    const tasks = String(countProjectTasks(project));
    const docs = String(countProjectDocs(project));
    return {
      id,
      title,
      cells: {
        name: { text: title, filter: title },
        status: { text: status, filter: status },
        registered: { text: registered, filter: registered },
        start: { text: start, filter: start },
        end: { text: end, filter: end },
        owner: { text: owner, filter: owner },
        tasks: { text: tasks, filter: tasks, html: true },
        docs: { text: docs, filter: docs, html: true },
        actions: { text: "", filter: "", html: true },
      },
    };
  }

  function renderProjectCell(key, row) {
    const id = row.id;
    const title = row.title;
    if (key === "tasks") {
      return `<a href="#" class="v2-count-link" data-role="v2-open-tasks" data-project-id="${esc(id)}" title="Lista zadań">${esc(row.cells.tasks.text)}</a>`;
    }
    if (key === "docs") {
      return `<a href="#" class="v2-count-link" data-role="v2-open-docs" data-project-id="${esc(id)}" title="Dokumentacja">${esc(row.cells.docs.text)}</a>`;
    }
    if (key === "actions") {
      return `<span class="v2-actions-row">
        <button type="button" class="v2-icon-btn" data-role="v2-project-open" data-project-id="${esc(id)}" title="Wejdź w projekt" aria-label="Wejdź w projekt: ${esc(title)}">${iconEnter()}</button>
        <button type="button" class="v2-icon-btn" data-role="v2-project-copy" data-project-id="${esc(id)}" title="Kopiuj projekt" aria-label="Kopiuj projekt: ${esc(title)}">${iconCopy()}</button>
        <button type="button" class="v2-icon-btn is-danger" data-role="v2-project-delete" data-project-id="${esc(id)}" title="Usuń projekt" aria-label="Usuń projekt: ${esc(title)}">${iconTrash()}</button>
      </span>`;
    }
    if (key === "status") {
      return `<span class="v2-status-pill">${esc(row.cells.status.text)}</span>`;
    }
    if (key === "name") {
      return `<a href="#" class="v2-project-name-link" data-role="v2-project-open" data-project-id="${esc(id)}" title="Otwórz projekt">${esc(row.cells.name.text)}</a>`;
    }
    return esc(row.cells[key]?.text ?? "");
  }

  function rowMatchesFilters(row) {
    if (!projectsTableState.filtersOn) return true;
    return projectsTableState.order.every((key) => {
      const def = PROJECT_COL_DEFS[key];
      if (!def?.filterable) return true;
      const query = String(projectsTableState.filters[key] || "")
        .trim()
        .toLowerCase();
      if (!query) return true;
      return String(row.cells[key]?.filter || "")
        .toLowerCase()
        .includes(query);
    });
  }

  function emptyPanelHtml(title, lead) {
    return `
      <section class="v2-panel" data-role="v2-panel">
        <header class="v2-panel-head">
          <button type="button" class="v2-back-btn" data-role="v2-back-home">← Projekty</button>
          <h2 class="v2-projects-title">${esc(title)}</h2>
        </header>
        <div class="v2-panel-empty">
          <p>${esc(lead)}</p>
        </div>
      </section>`;
  }

  function isProjectFormRoute() {
    return (
      v2Route.name === "new-project" ||
      v2Route.name === "edit-project" ||
      v2Route.name === "plot-detail" ||
      v2Route.name === "doc-detail" ||
      v2Route.name === "task-detail" ||
      isProjectDocsRoute()
    );
  }

  function normalizeHomeTab(tab) {
    if (tab === "tasks" || tab === "docs") return tab;
    return "projects";
  }

  function syncV2Topbar() {
    const isV2 = getUiVersion() === "v2";
    const onForm = isV2 && isProjectFormRoute();
    const onEdit = isV2 && v2Route.name === "edit-project";
    const onDocsPage = isV2 && isProjectDocsRoute();
    const onDetailOnly =
      isV2 && (v2Route.name === "plot-detail" || v2Route.name === "doc-detail");
    const editTab = v2Route.name === "edit-project" ? v2Route.tab || "project" : "project";
    const onProjectsList =
      isV2 &&
      v2Route.name === "home" &&
      normalizeHomeTab(v2Route.tab) === "projects";
    const newBtn = document.querySelector('[data-role="v2-new-project"]');
    const backBtn = document.querySelector('[data-role="v2-form-back"]');
    const saveBtn = document.querySelector('[data-role="v2-form-save"]');
    const tabs = document.querySelector('[data-role="v2-project-edit-tabs"]');
    if (newBtn) newBtn.hidden = !onProjectsList;
    if (backBtn) backBtn.hidden = !onForm;
    if (saveBtn)
      saveBtn.hidden =
        !onForm ||
        onDetailOnly ||
        onDocsPage ||
        (onEdit && (editTab === "tasks" || editTab === "permissions"));
    if (tabs) {
      tabs.hidden = !onEdit;
      tabs.querySelectorAll('[data-role="v2-building-tab"]').forEach((btn) => {
        const active = btn.dataset.tab === editTab;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
    }
  }

  function showV2Toast(message, options = {}) {
    const tone = options?.tone === "error" ? "error" : "ok";
    let toast = document.getElementById("v2Toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "v2Toast";
      toast.className = "v2-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.classList.toggle("is-error", tone === "error");
    toast.setAttribute("role", tone === "error" ? "alert" : "status");
    const icon =
      tone === "error"
        ? `<span class="v2-toast-check is-error" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6">
              <path d="M12 8v5M12 16.5h.01" stroke-linecap="round" />
              <path d="M10.3 4.8 2.9 17.2A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.8L13.7 4.8a2 2 0 0 0-3.4 0Z" stroke-linejoin="round" />
            </svg>
          </span>`
        : `<span class="v2-toast-check" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6">
              <path d="m5 12 5 5L20 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>`;
    toast.innerHTML = `
      ${icon}
      <span class="v2-toast-text">${esc(message)}</span>`;
    toast.classList.remove("is-visible");
    void toast.offsetWidth;
    toast.classList.add("is-visible");
    if (v2ToastTimer) window.clearTimeout(v2ToastTimer);
    v2ToastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, tone === "error" ? 4200 : 2800);
  }

  function categoryLabel(categoryId) {
    if (!categoryId) return "Bez typu";
    if (typeof findCategoryLabel === "function") {
      const label = findCategoryLabel(categoryId);
      return label && label !== "Wybierz typ…" ? label : "Bez typu";
    }
    return String(categoryId);
  }

  function docsTableBodyHtml(project) {
    const files = Array.isArray(project?.files) ? project.files : [];
    return files
      .slice()
      .sort((a, b) => String(b.addedAt || "").localeCompare(String(a.addedAt || "")))
      .map((file) => {
        const id = String(file.id || "");
        const name = file.name || "plik";
        const typeLabel = categoryLabel(file.categoryId);
        const hasType = Boolean(file.categoryId);
        const added = formatRegDate(file.addedAt || project.createdAt || "");
        return `
          <tr data-file-id="${esc(id)}">
            <td>
              <button
                type="button"
                class="v2-file-link"
                data-role="v2-download-file"
                data-file-id="${esc(id)}"
                title="Pobierz plik"
              >${esc(name)}</button>
            </td>
            <td>
              <span class="v2-file-type${hasType ? "" : " is-empty"}">${esc(typeLabel)}</span>
            </td>
            <td class="v2-col-date">${esc(added)}</td>
            <td class="v2-col-actions">
              <span class="v2-actions-row">
                <button
                  type="button"
                  class="v2-icon-btn is-danger"
                  data-role="v2-delete-file"
                  data-file-id="${esc(id)}"
                  data-file-name="${esc(name)}"
                  title="Usuń plik"
                  aria-label="Usuń plik: ${esc(name)}"
                >${iconTrash()}</button>
              </span>
            </td>
          </tr>`;
      })
      .join("");
  }

  function docsActionsHtml({ expand = false } = {}) {
    return `
      <div class="v2-section-actions">
        <button
          type="button"
          class="v2-docs-add-btn is-disabled"
          disabled
          title="Dodaj wiele — wkrótce"
          aria-label="Dodaj wiele (niedostępne)"
        >${iconBulkAdd()}</button>
        <label class="v2-docs-add-btn" title="Dodaj plik" aria-label="Dodaj plik">
          <input type="file" multiple hidden data-role="v2-docs-file-input" />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
        </label>
        ${
          expand
            ? `<button
                type="button"
                class="v2-docs-add-btn"
                data-role="v2-docs-expand"
                title="Otwórz dokumentację w nowej karcie"
                aria-label="Powiększ widok dokumentacji"
              >${iconExpand()}</button>`
            : ""
        }
      </div>`;
  }

  function docsListHtml(project) {
    const files = Array.isArray(project?.files) ? project.files : [];
    const rows = docsTableBodyHtml(project);
    if (!files.length) {
      return `<p class="v2-docs-empty">Brak plików. Użyj „+”, aby dodać dokumentację.</p>`;
    }
    return `
      <div class="v2-docs-table-wrap">
        <table class="v2-docs-table">
          <thead>
            <tr>
              <th>Nazwa pliku</th>
              <th>Typ</th>
              <th>Data dodania</th>
              <th class="v2-col-actions">Akcje</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function docsSectionHtml(project) {
    return `
      <section class="v2-form-section" data-role="v2-project-docs" aria-labelledby="v2-docs-title">
        <header class="v2-form-section-head">
          <h3 class="v2-form-section-title" id="v2-docs-title">Dokumentacja projektowa</h3>
          ${docsActionsHtml({ expand: true })}
        </header>
        <div class="v2-docs-scroll">
          ${docsListHtml(project)}
        </div>
      </section>`;
  }

  function projectDocsPageHtml(project) {
    return `
      <div class="v2-docs-page" data-role="v2-docs-page">
        <section class="v2-form-section v2-docs-page-panel" data-role="v2-project-docs" aria-labelledby="v2-docs-page-title">
          <header class="v2-form-section-head">
            <div class="v2-docs-page-titles">
              <h2 class="v2-form-section-title" id="v2-docs-page-title">Dokumentacja projektowa</h2>
              <p class="v2-docs-page-meta">${esc(project.title || "Projekt")}</p>
            </div>
            ${docsActionsHtml({ expand: false })}
          </header>
          <div class="v2-docs-scroll">
            ${docsListHtml(project)}
          </div>
        </section>
      </div>`;
  }

  function plotsSectionHtml(project) {
    const plots = Array.isArray(project?.plots) ? project.plots : [];
    const rows = plots
      .map((plot) => {
        const id = String(plot.id || "");
        const label = plot.name || plot.code || "Działka";
        return `
          <tr data-plot-id="${esc(id)}">
            <td>
              <input
                type="text"
                class="v2-plot-input"
                data-role="v2-plot-name"
                data-plot-id="${esc(id)}"
                value="${esc(plot.name || "")}"
                placeholder="Nazwa działki"
              />
            </td>
            <td>
              <input
                type="text"
                class="v2-plot-input"
                data-role="v2-plot-code"
                data-plot-id="${esc(id)}"
                value="${esc(plot.code || "")}"
                placeholder="Kod działki"
              />
            </td>
            <td>
              <a
                href="#"
                class="v2-count-link"
                data-role="v2-plot-details"
                data-plot-id="${esc(id)}"
                title="Szczegóły działki"
              >Szczegóły</a>
            </td>
            <td class="v2-col-actions">
              <span class="v2-actions-row">
                <button
                  type="button"
                  class="v2-icon-btn is-danger"
                  data-role="v2-delete-plot"
                  data-plot-id="${esc(id)}"
                  data-plot-name="${esc(label)}"
                  title="Usuń działkę"
                  aria-label="Usuń działkę: ${esc(label)}"
                >${iconTrash()}</button>
              </span>
            </td>
          </tr>`;
      })
      .join("");

    return `
      <section class="v2-form-section" data-role="v2-project-plots" aria-labelledby="v2-plots-title">
        <header class="v2-form-section-head">
          <h3 class="v2-form-section-title" id="v2-plots-title">Działki</h3>
          <div class="v2-section-actions">
            <button
              type="button"
              class="v2-section-btn v2-geoportal-btn"
              data-role="v2-geoportal"
              title="Geoportal API"
            >
              ${iconGeoportalApi()}
              <span>Geoportal</span>
            </button>
            <button
              type="button"
              class="v2-docs-add-btn"
              data-role="v2-add-plot"
              title="Dodaj działkę ręcznie"
              aria-label="Dodaj działkę ręcznie"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </header>
        ${
          plots.length
            ? `<div class="v2-docs-table-wrap">
                <table class="v2-docs-table" data-role="v2-plots-table">
                  <thead>
                    <tr>
                      <th>Nazwa działki</th>
                      <th>Kod działki</th>
                      <th>Szczegóły działki</th>
                      <th class="v2-col-actions">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>`
            : `<p class="v2-docs-empty">Brak działek. Użyj „+”, aby dodać ręcznie, lub Geoportal.</p>`
        }
      </section>`;
  }

  function getProjectFormDocuments(project) {
    const surveyDocs = Array.isArray(project?.formalSurvey?.documents)
      ? project.formalSurvey.documents
          .slice()
          .filter((doc) => String(doc.id) !== "building-project")
      : [];
    surveyDocs.unshift({
      id: "building-project",
      title: "Projekt budowlany",
      source: "system",
    });
    return surveyDocs;
  }

  function getFormalDocFill(project, doc) {
    if (String(doc?.id) === "building-project") {
      return countBuildingFormFill(project);
    }
    if (typeof countDocFormFill === "function") {
      return countDocFormFill(doc.id, project?.docForms?.[doc.id] || {});
    }
    return { filled: 0, total: 0, percent: 0 };
  }

  function formsSectionHtml(project) {
    const surveyDocs = getProjectFormDocuments(project);
    const rows = surveyDocs
      .map((doc) => {
        const id = String(doc.id || "");
        const title = doc.title || "Dokument";
        const isBuilding = id === "building-project";
        const fill = getFormalDocFill(project, doc);
        const linkedTask = findTaskLinkedToDoc(project, id);
        const gotoTaskBtn = linkedTask
          ? `<button
                type="button"
                class="v2-icon-btn"
                data-role="v2-goto-doc-task"
                data-task-id="${esc(String(linkedTask.id))}"
                title="Przejdź do zadania"
                aria-label="Przejdź do zadania: ${esc(linkedTask.name || "Zadanie")}"
              >${iconGotoTask()}</button>`
          : "";
        const deleteBtn = isBuilding
          ? ""
          : `<button
                type="button"
                class="v2-icon-btn is-danger"
                data-role="v2-delete-doc"
                data-doc-id="${esc(id)}"
                data-doc-name="${esc(title)}"
                title="Usuń dokument"
                aria-label="Usuń dokument: ${esc(title)}"
              >${iconTrash()}</button>`;
        const actions =
          gotoTaskBtn || deleteBtn
            ? `<span class="v2-actions-row">${gotoTaskBtn}${deleteBtn}</span>`
            : "";
        return `
          <tr data-doc-id="${esc(id)}">
            <td>
              <a
                href="#"
                class="v2-project-name-link"
                data-role="v2-doc-details"
                data-doc-id="${esc(id)}"
                title="Wejdź w dokument"
              >${esc(title)}</a>
            </td>
            <td class="v2-col-fill">
              <span
                class="v2-fill-pct ${v2FillPercentTone(fill.percent)}"
                title="${fill.filled}/${fill.total} pól"
              >${fill.percent}%</span>
            </td>
            <td class="v2-col-actions">${actions}</td>
          </tr>`;
      })
      .join("");

    const availableTypes = getAvailableFormTypes(project);
    const plusDisabled = availableTypes.length === 0;

    return `
      <section class="v2-form-section" data-role="v2-project-forms" aria-labelledby="v2-forms-title">
        <header class="v2-form-section-head">
          <h3 class="v2-form-section-title" id="v2-forms-title">Dokumentacja formalna</h3>
          <div class="v2-section-actions">
            <button
              type="button"
              class="v2-section-btn v2-survey-btn"
              data-role="v2-open-survey"
              data-project-id="${esc(String(project?.id || ""))}"
              title="Ankieta formalna"
            >
              <svg class="v2-survey-btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                <path d="M7 3.5h7.2L19 8.3V20.5H7V3.5Z" stroke-linejoin="round"/>
                <path d="M14.2 3.5V8.3H19M9.2 12h5.6M9.2 15.2h5.6M9.2 18.2h3.4" stroke-linecap="round"/>
              </svg>
              <span>Ankieta</span>
            </button>
            <button
              type="button"
              class="v2-docs-add-btn${plusDisabled ? " is-disabled" : ""}"
              data-role="v2-add-custom-form"
              title="${plusDisabled ? "Wszystkie typy są już na liście" : "Dodaj dokument formalny"}"
              aria-label="${plusDisabled ? "Brak dostępnych typów" : "Dodaj dokument formalny"}"
              ${plusDisabled ? "disabled aria-disabled=\"true\"" : ""}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </header>
        ${
          surveyDocs.length
            ? `<div class="v2-docs-table-wrap">
                <table class="v2-docs-table" data-role="v2-survey-docs-table">
                  <thead>
                    <tr>
                      <th>Nazwa dokumentu</th>
                      <th class="v2-col-fill">Wypełnienie</th>
                      <th class="v2-col-actions">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>`
            : `<p class="v2-docs-empty">Brak dokumentów. Uruchom ankietę, aby wygenerować listę formalną. Ponowne uruchomienie nie usuwa istniejących pozycji — może tylko dodać nowe.</p>`
        }
      </section>`;
  }

  function metricsSectionHtml() {
    const draft = projectFormDraft;
    return `
      <section class="v2-form-section" data-role="v2-project-metrics" aria-labelledby="v2-metrics-title">
        <header class="v2-form-section-head">
          <h3 class="v2-form-section-title" id="v2-metrics-title">Metryka projektu</h3>
        </header>
        <form class="v2-form-fields" data-role="v2-project-form" autocomplete="off">
          <label class="v2-field is-emphasis">
            <span class="v2-field-label">Nazwa</span>
            <input
              type="text"
              name="name"
              data-role="v2-field-name"
              value="${esc(draft.name)}"
              placeholder="Nazwa projektu"
            />
          </label>
          <label class="v2-field">
            <span class="v2-field-label">Kod</span>
            <input
              type="text"
              name="code"
              data-role="v2-field-code"
              value="${esc(draft.code)}"
              placeholder="np. PRJ-001"
            />
          </label>
          <label class="v2-field">
            <span class="v2-field-label">Opis</span>
            <textarea
              name="description"
              data-role="v2-field-description"
              rows="4"
              placeholder="Krótki opis projektu"
            >${esc(draft.description)}</textarea>
          </label>
        </form>
      </section>`;
  }

  function projectFormHtml({ mode, project = null }) {
    const isEdit = mode === "edit" && project;
    const topPair = isEdit
      ? `
        <div class="v2-form-top-pair" data-role="v2-form-top-pair">
          <div class="v2-form-top-pair-grid">
            ${metricsSectionHtml()}
            ${docsSectionHtml(project)}
          </div>
          <button
            type="button"
            class="v2-form-top-resize"
            data-role="v2-form-top-resize"
            aria-label="Zmień wysokość Metryki i Dokumentacji"
            title="Przeciągnij, aby zmienić wysokość"
          >
            <span class="v2-form-top-resize-grip" aria-hidden="true"></span>
          </button>
        </div>`
      : metricsSectionHtml();
    return `
      <div class="v2-project-form" data-role="v2-project-form-view" data-mode="${esc(mode)}">
        ${topPair}
        ${isEdit ? plotsSectionHtml(project) : ""}
        ${isEdit ? formsSectionHtml(project) : ""}
      </div>`;
  }

  function readProjectFormDraftFromDom() {
    const form = document.querySelector('[data-role="v2-project-form"]');
    if (!form) return { ...projectFormDraft };
    return {
      code: String(form.querySelector('[data-role="v2-field-code"]')?.value || "").trim(),
      name: String(form.querySelector('[data-role="v2-field-name"]')?.value || "").trim(),
      description: String(form.querySelector('[data-role="v2-field-description"]')?.value || "").trim(),
    };
  }

  function loadTopPairHeight() {
    try {
      const raw = Number(localStorage.getItem(TOP_PAIR_HEIGHT_KEY));
      if (!Number.isFinite(raw)) return null;
      return Math.min(TOP_PAIR_MAX_H, Math.max(TOP_PAIR_MIN_H, Math.round(raw)));
    } catch (e) {
      return null;
    }
  }

  function saveTopPairHeight(height) {
    try {
      const value = Math.min(TOP_PAIR_MAX_H, Math.max(TOP_PAIR_MIN_H, Math.round(height)));
      localStorage.setItem(TOP_PAIR_HEIGHT_KEY, String(value));
    } catch (e) {
      /* ignore */
    }
  }

  function clampTopPairHeight(height) {
    const maxByViewport = Math.max(
      TOP_PAIR_MIN_H,
      Math.floor(window.innerHeight * 0.7)
    );
    const max = Math.min(TOP_PAIR_MAX_H, maxByViewport);
    return Math.min(max, Math.max(TOP_PAIR_MIN_H, Math.round(height)));
  }

  function applyTopPairHeight(metrics, docs, height) {
    const h = `${clampTopPairHeight(height)}px`;
    metrics.style.height = h;
    docs.style.height = h;
  }

  function measureNaturalMetricsHeight(metrics, docs) {
    const prevHeight = docs.style.height;
    const prevVisibility = docs.style.visibility;
    docs.style.visibility = "hidden";
    docs.style.height = "0px";
    metrics.style.height = "";
    const height = Math.ceil(metrics.getBoundingClientRect().height);
    docs.style.visibility = prevVisibility;
    docs.style.height = prevHeight;
    return height > 0 ? height : TOP_PAIR_MIN_H;
  }

  function bindTopPairResize(root) {
    const pair = root.querySelector('[data-role="v2-form-top-pair"]');
    const metrics = root.querySelector('[data-role="v2-project-metrics"]');
    const docs = root.querySelector('[data-role="v2-project-docs"]');
    const handle = root.querySelector('[data-role="v2-form-top-resize"]');
    if (!pair || !metrics || !docs) return;

    if (v2DocsHeightObserver) {
      v2DocsHeightObserver.disconnect();
      v2DocsHeightObserver = null;
    }

    const saved = loadTopPairHeight();
    const initial = saved || measureNaturalMetricsHeight(metrics, docs);
    applyTopPairHeight(metrics, docs, initial);

    if (!handle || handle.dataset.v2Bound === "1") return;
    handle.dataset.v2Bound = "1";

    handle.addEventListener("pointerdown", (event) => {
      if (event.button != null && event.button !== 0) return;
      event.preventDefault();
      const startY = event.clientY;
      const startH = metrics.getBoundingClientRect().height;
      handle.classList.add("is-dragging");
      document.body.classList.add("v2-row-resizing");
      try {
        handle.setPointerCapture(event.pointerId);
      } catch (e) {
        /* ignore */
      }

      const onMove = (moveEvent) => {
        const next = clampTopPairHeight(startH + (moveEvent.clientY - startY));
        applyTopPairHeight(metrics, docs, next);
      };

      const onUp = (upEvent) => {
        handle.classList.remove("is-dragging");
        document.body.classList.remove("v2-row-resizing");
        try {
          handle.releasePointerCapture(upEvent.pointerId);
        } catch (e) {
          /* ignore */
        }
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
        saveTopPairHeight(metrics.getBoundingClientRect().height);
      };

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    });
  }

  function bindProjectForm(root) {
    const form = root.querySelector('[data-role="v2-project-form"]');
    if (form) {
      const syncDraft = () => {
        projectFormDraft = readProjectFormDraftFromDom();
      };
      form.addEventListener("input", syncDraft);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        saveCurrentProjectForm();
      });
    }
    bindProjectDocs(root);
    bindProjectPlots(root);
    bindProjectForms(root);
    bindTopPairResize(root);
  }

  function persistProjectPlots(projectId, plots) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || typeof persistProject !== "function") return null;
    return persistProject({
      ...project,
      plots,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Mock metadanych działki (jak po ULDK / EGiB / warstwach Geoportalu).
   * Trzy serie → trzy zakładki: ewidencja, geometria, planowanie.
   * Dwa warianty A/B — naprzemiennie przy ręcznym dodaniu działki.
   */
  const PLOT_META_VARIANTS = [
    {
      id: "A",
      egib: {
        idDzialki: "141201_1.0012.12/3",
        nrDzialki: "12/3",
        nrObrebu: "0012",
        nazwaObrebu: "Lipki",
        jednostkaEwidencyjna: "141201_1",
        nazwaGminy: "Konstancin-Jeziorna",
        powiat: "piaseczyński",
        wojewodztwo: "mazowieckie",
        poleEwidencyjneM2: "1245",
        klasouzytki: "B — tereny mieszkaniowe (0,1245 ha)",
        numerKW: "WA1P/00012345/8",
        grupaRejestrowa: "1.1 — osoby fizyczne",
        datasource: "ULDK → WFS EGiB powiat (mock)",
      },
      geometry: {
        srid: "2180 (PUWG 1992)",
        centroidXy: "635412.18, 473881.54",
        extent: "635390.02,473860.11,635434.55,473902.88",
        geomWkt:
          "POLYGON((635390.02 473860.11,635434.55 473860.11,635434.55 473902.88,635390.02 473902.88,635390.02 473860.11))",
        shapeLengthM: "178.4",
        shapeAreaM2: "1244.7",
        najnizszyNpm: "92.1",
        najwyższyNpm: "94.8",
      },
      planning: {
        mpzp: "Tak",
        mpzpSymbol: "MN",
        mpzpUchwala: "XXI/142/2020 Rady Miejskiej Konstancina-Jeziorny",
        przeznaczenie: "Zabudowa mieszkaniowa jednorodzinna",
        wzStatus: "Nie dotyczy (jest MPZP)",
        ochronaKonserwatorska: "Nie",
        formaOchrony: "—",
        dostepDoDrogi: "Tak — droga gminna (ul. Lipkowska)",
        mediaIstniejace: "Woda, kanalizacja, energia elektryczna",
        uwagi:
          "Mock warstw planistycznych Geoportalu — do podmiany po realnym API.",
      },
    },
    {
      id: "B",
      egib: {
        idDzialki: "146501_1.0008.8/1",
        nrDzialki: "8/1",
        nrObrebu: "0008",
        nazwaObrebu: "Skolimów",
        jednostkaEwidencyjna: "146501_1",
        nazwaGminy: "m.st. Warszawa — Wilanów",
        powiat: "m.st. Warszawa",
        wojewodztwo: "mazowieckie",
        poleEwidencyjneM2: "2100",
        klasouzytki: "R IVa — grunty orne (0,15 ha); B — tereny mieszkaniowe (0,06 ha)",
        numerKW: "WA4M/00098765/2",
        grupaRejestrowa: "1.1 — osoby fizyczne",
        datasource: "ULDK → LPIS fallback (mock)",
      },
      geometry: {
        srid: "2180 (PUWG 1992)",
        centroidXy: "638902.44, 476210.09",
        extent: "638870.10,476180.00,638935.20,476245.50",
        geomWkt:
          "POLYGON((638870.10 476180.00,638935.20 476180.00,638935.20 476245.50,638870.10 476245.50,638870.10 476180.00))",
        shapeLengthM: "261.2",
        shapeAreaM2: "2098.3",
        najnizszyNpm: "88.4",
        najwyższyNpm: "91.2",
      },
      planning: {
        mpzp: "Nie",
        mpzpSymbol: "—",
        mpzpUchwala: "—",
        przeznaczenie: "Brak MPZP — wymagane warunki zabudowy",
        wzStatus: "Decyzja WZ w toku (mock)",
        ochronaKonserwatorska: "Tak — strefa A",
        formaOchrony: "Strefa ochrony konserwatorskiej układu urbanistycznego",
        dostepDoDrogi: "Tak — droga powiatowa",
        mediaIstniejace: "Woda, energia elektryczna (brak kanalizacji)",
        uwagi:
          "Mock: brak MPZP → ścieżka WZ; ograniczenie konserwatorskie wpływa na dokumentację.",
      },
    },
  ];

  const PLOT_META_TAB_FIELDS = {
    egib: [
      ["idDzialki", "Identyfikator działki (TERYT)"],
      ["nrDzialki", "Numer działki"],
      ["nrObrebu", "Numer obrębu"],
      ["nazwaObrebu", "Nazwa obrębu"],
      ["jednostkaEwidencyjna", "Jednostka ewidencyjna"],
      ["nazwaGminy", "Gmina"],
      ["powiat", "Powiat"],
      ["wojewodztwo", "Województwo"],
      ["poleEwidencyjneM2", "Powierzchnia ewidencyjna [m²]"],
      ["klasouzytki", "Klasoużytki"],
      ["numerKW", "Numer księgi wieczystej"],
      ["grupaRejestrowa", "Grupa rejestrowa"],
      ["datasource", "Źródło danych (ULDK)"],
    ],
    geometry: [
      ["srid", "Układ współrzędnych (SRID)"],
      ["centroidXy", "Centroid X, Y"],
      ["extent", "Zasięg (bbox)"],
      ["geomWkt", "Geometria WKT"],
      ["shapeLengthM", "Obwód [m]"],
      ["shapeAreaM2", "Powierzchnia z geometrii [m²]"],
      ["najnizszyNpm", "Najniższy punkt [m n.p.m.]"],
      ["najwyższyNpm", "Najwyższy punkt [m n.p.m.]"],
    ],
    planning: [
      ["mpzp", "MPZP"],
      ["mpzpSymbol", "Symbol terenu MPZP"],
      ["mpzpUchwala", "Uchwała / akt planu"],
      ["przeznaczenie", "Przeznaczenie"],
      ["wzStatus", "Warunki zabudowy"],
      ["ochronaKonserwatorska", "Ochrona konserwatorska"],
      ["formaOchrony", "Forma ochrony"],
      ["dostepDoDrogi", "Dostęp do drogi publicznej"],
      ["mediaIstniejace", "Media istniejące"],
      ["uwagi", "Uwagi (mock Geoportal)"],
    ],
  };

  function clonePlotMeta(variant) {
    return JSON.parse(JSON.stringify(variant));
  }

  function createMockPlotMeta(variantIndex) {
    const variant = PLOT_META_VARIANTS[variantIndex % PLOT_META_VARIANTS.length];
    return {
      variantId: variant.id,
      fetchedAt: new Date().toISOString(),
      source: "geoportal-mock",
      egib: clonePlotMeta(variant.egib),
      geometry: clonePlotMeta(variant.geometry),
      planning: clonePlotMeta(variant.planning),
    };
  }

  function ensurePlotMeta(projectId, plot) {
    if (!plot || plot.meta) return plot;
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    const plots = Array.isArray(project?.plots) ? project.plots : [];
    const index = plots.findIndex((item) => String(item.id) === String(plot.id));
    const meta = createMockPlotMeta(index < 0 ? plots.length : index);
    const nextPlots = plots.map((item) =>
      String(item.id) === String(plot.id)
        ? {
            ...item,
            meta,
            code: item.code || meta.egib.idDzialki,
            name: item.name || `Działka ${meta.egib.nrDzialki}`,
          }
        : item
    );
    persistProjectPlots(projectId, nextPlots);
    return nextPlots.find((item) => String(item.id) === String(plot.id)) || plot;
  }

  function addManualPlot(projectId, options = {}) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project) return;
    const plots = Array.isArray(project.plots) ? project.plots.slice() : [];
    const meta = createMockPlotMeta(plots.length);
    plots.push({
      id: `plot${Date.now()}`,
      name: `Działka ${meta.egib.nrDzialki}`,
      code: meta.egib.idDzialki,
      source: options.source || "manual",
      metaSource: "geoportal-mock",
      meta,
    });
    persistProjectPlots(projectId, plots);
    mountV2();
  }

  function plotMetaFieldsHtml(sectionKey, meta) {
    const fields = PLOT_META_TAB_FIELDS[sectionKey] || [];
    const data = meta?.[sectionKey] || {};
    const rows = fields
      .map(([key, label]) => {
        const value = data[key];
        const text =
          value === undefined || value === null || value === ""
            ? "—"
            : String(value);
        const isLong = text.length > 80 || key === "geomWkt" || key === "uwagi";
        return `
          <div class="v2-plot-meta-row${isLong ? " is-wide" : ""}">
            <dt>${esc(label)}</dt>
            <dd>${esc(text)}</dd>
          </div>`;
      })
      .join("");
    return `<dl class="v2-plot-meta-grid">${rows}</dl>`;
  }

  function plotDetailHtml(project, plot) {
    const meta = plot?.meta || createMockPlotMeta(0);
    const label = plot?.name || plot?.code || "Szczegóły działki";
    const variant = meta.variantId || "?";
    const fetched = meta.fetchedAt
      ? new Date(meta.fetchedAt).toLocaleString("pl-PL")
      : "—";
    return `
      <section class="v2-panel v2-plot-detail" data-role="v2-plot-detail" data-plot-id="${esc(
        String(plot.id || "")
      )}">
        <header class="v2-panel-head v2-plot-detail-head">
          <button type="button" class="v2-back-btn" data-role="v2-back-home">← Projekt</button>
          <div class="v2-plot-detail-titles">
            <h2 class="v2-projects-title">${esc(label)}</h2>
            <p class="v2-plot-detail-meta">
              Geoportal mock · wariant ${esc(variant)} · pobrano ${esc(fetched)}
              ${plot?.code ? ` · <span class="v2-plot-detail-code">${esc(plot.code)}</span>` : ""}
            </p>
          </div>
        </header>
        <div class="v2-plot-detail-tabs" role="tablist" aria-label="Metadane działki">
          <button type="button" class="v2-home-tab is-active" role="tab" aria-selected="true"
            data-role="v2-plot-meta-tab" data-tab="egib">Ewidencja</button>
          <button type="button" class="v2-home-tab" role="tab" aria-selected="false"
            data-role="v2-plot-meta-tab" data-tab="geometry">Geometria</button>
          <button type="button" class="v2-home-tab" role="tab" aria-selected="false"
            data-role="v2-plot-meta-tab" data-tab="planning">Planowanie</button>
        </div>
        <div class="v2-plot-detail-body">
          <div class="v2-plot-meta-panel" data-role="v2-plot-meta-panel" data-tab="egib">
            <p class="v2-plot-meta-lead">Atrybuty EGiB / ULDK (identyfikacja ewidencyjna).</p>
            ${plotMetaFieldsHtml("egib", meta)}
          </div>
          <div class="v2-plot-meta-panel" data-role="v2-plot-meta-panel" data-tab="geometry" hidden>
            <p class="v2-plot-meta-lead">Geometria i lokalizacja przestrzenna (ULDK: WKT, extent, SRID).</p>
            ${plotMetaFieldsHtml("geometry", meta)}
          </div>
          <div class="v2-plot-meta-panel" data-role="v2-plot-meta-panel" data-tab="planning" hidden>
            <p class="v2-plot-meta-lead">Warstwy planistyczne i ograniczenia (mock Geoportalu poza ULDK).</p>
            ${plotMetaFieldsHtml("planning", meta)}
          </div>
        </div>
      </section>`;
  }

  function bindPlotDetail(root, projectId, plotId) {
    void plotId;
    root.querySelector('[data-role="v2-back-home"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      v2Route = { name: "edit-project", projectId, tab: "project" };
      mountV2();
    });

    const tabs = root.querySelectorAll('[data-role="v2-plot-meta-tab"]');
    const panels = root.querySelectorAll('[data-role="v2-plot-meta-panel"]');
    tabs.forEach((tab) => {
      tab.addEventListener("click", (event) => {
        event.preventDefault();
        const id = tab.dataset.tab;
        tabs.forEach((btn) => {
          const on = btn.dataset.tab === id;
          btn.classList.toggle("is-active", on);
          btn.setAttribute("aria-selected", on ? "true" : "false");
        });
        panels.forEach((panel) => {
          panel.hidden = panel.dataset.tab !== id;
        });
      });
    });
  }

  function updatePlotField(projectId, plotId, field, value) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project) return;
    const plots = (Array.isArray(project.plots) ? project.plots : []).map((plot) => {
      if (String(plot.id) !== String(plotId)) return plot;
      return { ...plot, [field]: value };
    });
    persistProjectPlots(projectId, plots);
  }

  async function deletePlot(projectId, plotId, plotName) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project) return;
    const label = plotName || "tę działkę";
    const ok = await confirmV2Dialog({
      title: "Usuń działkę",
      message: `Czy na pewno chcesz usunąć działkę „${label}”?`,
      confirmLabel: "Usuń",
      cancelLabel: "Anuluj",
      danger: true,
    });
    if (!ok) return;
    const plots = (Array.isArray(project.plots) ? project.plots : []).filter(
      (plot) => String(plot.id) !== String(plotId)
    );
    persistProjectPlots(projectId, plots);
    showV2Toast("Usunięto działkę");
    mountV2();
  }

  function bindProjectPlots(root) {
    if (v2Route.name !== "edit-project") return;
    const projectId = v2Route.projectId;

    root.querySelector('[data-role="v2-add-plot"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      addManualPlot(projectId);
    });

    root.querySelector('[data-role="v2-geoportal"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      // Pobieranie z Geoportalu — na razie mock (te same 2 warianty meta)
      addManualPlot(projectId, { source: "geoportal-mock" });
      showV2Toast("Geoportal (mock): dodano działkę z metadanymi");
    });

    root.querySelectorAll('[data-role="v2-plot-name"]').forEach((input) => {
      input.addEventListener("change", () => {
        updatePlotField(projectId, input.dataset.plotId, "name", input.value);
      });
    });
    root.querySelectorAll('[data-role="v2-plot-code"]').forEach((input) => {
      input.addEventListener("change", () => {
        updatePlotField(projectId, input.dataset.plotId, "code", input.value);
      });
    });

    root.querySelectorAll('[data-role="v2-plot-details"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        v2Route = {
          name: "plot-detail",
          projectId,
          plotId: String(link.dataset.plotId || ""),
        };
        mountV2();
      });
    });

    root.querySelectorAll('[data-role="v2-delete-plot"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        deletePlot(projectId, btn.dataset.plotId, btn.dataset.plotName);
      });
    });
  }

  function getSurveyQuestions() {
    return typeof SURVEY_QUESTIONS !== "undefined" && Array.isArray(SURVEY_QUESTIONS)
      ? SURVEY_QUESTIONS
      : [];
  }

  function ensureV2SurveyModal() {
    let modal = document.getElementById("v2SurveyModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "v2SurveyModal";
    modal.className = "v2-survey-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="v2-survey-modal-backdrop" data-role="v2-survey-close"></div>
      <div class="v2-survey-dialog" role="dialog" aria-modal="true" aria-labelledby="v2SurveyTitle">
        <header class="v2-survey-head">
          <div>
            <p class="v2-survey-kicker">Dokumentacja formalna</p>
            <h2 id="v2SurveyTitle">Ankieta formalna</h2>
            <p class="v2-survey-progress" data-role="v2-survey-progress"></p>
          </div>
          <button type="button" class="v2-file-modal-close" data-role="v2-survey-close" aria-label="Zamknij">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <div class="v2-survey-body" data-role="v2-survey-body"></div>
        <footer class="v2-survey-foot">
          <button type="button" class="v2-back-btn" data-role="v2-survey-prev">Wstecz</button>
          <div class="v2-survey-foot-right">
            <button type="button" class="v2-back-btn" data-role="v2-survey-close">Anuluj</button>
            <button type="button" class="v2-survey-primary" data-role="v2-survey-next">Dalej</button>
          </div>
        </footer>
      </div>`;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      const target = event.target.closest("[data-role]");
      if (!target) return;
      const role = target.dataset.role;
      if (role === "v2-survey-close") {
        event.preventDefault();
        closeV2SurveyModal();
        return;
      }
      if (role === "v2-survey-prev") {
        event.preventDefault();
        if (!v2SurveyDraft) return;
        v2SurveyDraft.step = Math.max(0, v2SurveyDraft.step - 1);
        renderV2SurveyStep();
        return;
      }
      if (role === "v2-survey-next") {
        event.preventDefault();
        advanceV2Survey();
        return;
      }
      if (role === "v2-survey-option") {
        const questionId = target.dataset.questionId;
        const value = target.dataset.value;
        const type = target.dataset.type;
        if (!v2SurveyDraft || !questionId || value == null) return;
        if (type === "multi") {
          const current = Array.isArray(v2SurveyDraft.answers[questionId])
            ? [...v2SurveyDraft.answers[questionId]]
            : [];
          const idx = current.indexOf(value);
          if (idx >= 0) current.splice(idx, 1);
          else current.push(value);
          v2SurveyDraft.answers[questionId] = current;
        } else {
          v2SurveyDraft.answers[questionId] = value;
        }
        renderV2SurveyStep();
      }
    });

    return modal;
  }

  function closeV2SurveyModal() {
    const modal = document.getElementById("v2SurveyModal");
    if (modal) modal.hidden = true;
    v2SurveyDraft = null;
  }

  function renderV2SurveyStep() {
    const modal = ensureV2SurveyModal();
    const questions = getSurveyQuestions();
    if (!v2SurveyDraft || !questions.length) return;

    const step = v2SurveyDraft.step;
    const question = questions[step];
    const body = modal.querySelector('[data-role="v2-survey-body"]');
    const progress = modal.querySelector('[data-role="v2-survey-progress"]');
    const prev = modal.querySelector('[data-role="v2-survey-prev"]');
    const next = modal.querySelector('[data-role="v2-survey-next"]');
    if (!question || !body) return;

    if (progress) progress.textContent = `Pytanie ${step + 1} z ${questions.length}`;
    if (prev) prev.disabled = step === 0;
    if (next) next.textContent = step >= questions.length - 1 ? "Zapisz ankietę" : "Dalej";

    const answer = v2SurveyDraft.answers[question.id];
    const options = (question.options || [])
      .map((option) => {
        const selected =
          question.type === "multi"
            ? Array.isArray(answer) && answer.includes(option.value)
            : answer === option.value;
        return `
          <button
            type="button"
            class="v2-survey-option${selected ? " is-selected" : ""}"
            data-role="v2-survey-option"
            data-type="${esc(question.type)}"
            data-question-id="${esc(question.id)}"
            data-value="${esc(option.value)}"
          >
            <input
              type="${question.type === "multi" ? "checkbox" : "radio"}"
              tabindex="-1"
              ${selected ? "checked" : ""}
              readonly
            />
            <span>${esc(option.label)}</span>
          </button>`;
      })
      .join("");

    body.innerHTML = `
      <p class="v2-survey-question-title">${esc(question.title)}</p>
      ${question.help ? `<p class="v2-survey-help">${esc(question.help)}</p>` : ""}
      <div class="v2-survey-options">${options}</div>`;
  }

  function advanceV2Survey() {
    const questions = getSurveyQuestions();
    if (!v2SurveyDraft || !questions.length) return;
    const question = questions[v2SurveyDraft.step];
    if (!question) return;

    const value = v2SurveyDraft.answers[question.id];
    if (question.type === "single" && !value) {
      showV2Toast("Wybierz odpowiedź");
      return;
    }

    if (v2SurveyDraft.step < questions.length - 1) {
      v2SurveyDraft.step += 1;
      renderV2SurveyStep();
      return;
    }

    saveV2Survey();
  }

  function saveV2Survey() {
    if (!v2SurveyDraft || typeof persistProject !== "function") return;
    const project =
      typeof getProjectById === "function" ? getProjectById(v2SurveyDraft.projectId) : null;
    if (!project) return;

    const questions = getSurveyQuestions();
    const unanswered = questions.find((question) => {
      if (question.type === "multi") return false;
      return !v2SurveyDraft.answers[question.id];
    });
    if (unanswered) {
      showV2Toast("Uzupełnij wszystkie pytania");
      return;
    }

    const documents =
      typeof evaluateFormalSurveyDocuments === "function"
        ? evaluateFormalSurveyDocuments(v2SurveyDraft.answers)
        : [];
    const now = new Date().toISOString();
    const existingDocs = Array.isArray(project.formalSurvey?.documents)
      ? project.formalSurvey.documents
      : [];
    // Nigdy nie usuwamy już zapisanych dokumentów — tylko dokładamy nowe z wyników ankiety
    const mergedDocs =
      typeof mergeSurveyDocumentsAddOnly === "function"
        ? mergeSurveyDocumentsAddOnly(existingDocs, documents)
        : (() => {
            const merged = [...existingDocs];
            documents.forEach((doc) => {
              if (!merged.some((item) => String(item.id) === String(doc.id))) {
                merged.push(doc);
              }
            });
            return merged;
          })();
    const added = mergedDocs.length - existingDocs.length;

    persistProject({
      ...project,
      formalSurvey: {
        answers: {
          ...v2SurveyDraft.answers,
          media: Array.isArray(v2SurveyDraft.answers.media)
            ? [...v2SurveyDraft.answers.media]
            : [],
        },
        documents: mergedDocs,
        completedAt: project.formalSurvey?.completedAt || now,
        updatedAt: now,
      },
      updatedAt: now,
    });

    closeV2SurveyModal();
    showV2Toast(
      added > 0
        ? `Zapisano ankietę — dodano ${added} dok. (łącznie ${mergedDocs.length})`
        : `Zapisano ankietę — bez zmian listy (${mergedDocs.length} dok.)`
    );
    if (v2Route.name === "edit-project") mountV2();
  }

  function openV2SurveyModal(projectId) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || !getSurveyQuestions().length) return;

    const saved = project.formalSurvey?.answers || {};
    const empty =
      typeof createEmptySurveyAnswers === "function"
        ? createEmptySurveyAnswers()
        : { media: [] };

    v2SurveyDraft = {
      projectId: String(projectId),
      step: 0,
      answers: {
        ...empty,
        ...saved,
        media: Array.isArray(saved.media) ? [...saved.media] : [],
      },
    };

    const modal = ensureV2SurveyModal();
    modal.hidden = false;
    renderV2SurveyStep();
  }

  async function deleteSurveyDocument(projectId, docId, docName) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || typeof persistProject !== "function") return;
    const label = docName || "ten dokument";
    const ok = await confirmV2Dialog({
      title: "Usuń dokument",
      message: `Czy na pewno chcesz usunąć dokument „${label}”?`,
      confirmLabel: "Usuń",
      cancelLabel: "Anuluj",
      danger: true,
    });
    if (!ok) return;
    const documents = (project.formalSurvey?.documents || []).filter(
      (doc) => String(doc.id) !== String(docId)
    );
    persistProject({
      ...project,
      formalSurvey: {
        ...(project.formalSurvey || {}),
        documents,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });
    showV2Toast("Usunięto dokument");
    if (v2Route.name === "edit-project") mountV2();
  }

  function getAvailableFormTypes(project) {
    const catalog =
      typeof listAllPotentialWorkflowDocuments === "function"
        ? listAllPotentialWorkflowDocuments()
        : [];
    const existing = new Set(
      getProjectFormDocuments(project).map((doc) => String(doc.id))
    );
    return catalog.filter((doc) => doc?.id && !existing.has(String(doc.id)));
  }

  function ensureV2AddFormModal() {
    let modal = document.getElementById("v2AddFormModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "v2AddFormModal";
    modal.className = "v2-file-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="v2-file-modal-backdrop" data-role="v2-add-form-close"></div>
      <div class="v2-file-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="v2AddFormTitle">
        <header class="v2-file-modal-head">
          <div>
            <p class="v2-file-modal-kicker">Dokumentacja formalna</p>
            <h2 id="v2AddFormTitle">Dodaj dokument formalny</h2>
            <p class="v2-file-modal-file">Wybierz typ, którego jeszcze nie ma na liście.</p>
          </div>
          <button type="button" class="v2-file-modal-close" data-role="v2-add-form-close" aria-label="Zamknij">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <div class="v2-file-modal-body" data-role="v2-add-form-body"></div>
        <footer class="v2-file-modal-foot">
          <button type="button" class="v2-back-btn" data-role="v2-add-form-close">Anuluj</button>
        </footer>
      </div>`;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      const target = event.target.closest("[data-role]");
      if (!target) return;
      const role = target.dataset.role;
      if (role === "v2-add-form-close") {
        event.preventDefault();
        closeV2AddFormModal();
        return;
      }
      if (role === "v2-add-form-option") {
        event.preventDefault();
        addFormTypeToProject(target.dataset.docId);
      }
    });

    return modal;
  }

  function closeV2AddFormModal() {
    const modal = document.getElementById("v2AddFormModal");
    if (modal) modal.hidden = true;
  }

  function openV2AddFormModal(projectId) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project) return;
    const available = getAvailableFormTypes(project);
    const modal = ensureV2AddFormModal();
    const body = modal.querySelector('[data-role="v2-add-form-body"]');
    if (!body) return;

    if (!available.length) {
      body.innerHTML = `<p class="v2-docs-empty">Wszystkie dostępne typy są już na liście.</p>`;
    } else {
      const groups = new Map();
      available.forEach((doc) => {
        const group = doc.group || "Inne";
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(doc);
      });
      body.innerHTML = [...groups.entries()]
        .map(
          ([group, docs]) => `
          <div>
            <p class="v2-file-modal-group-label">${esc(group)}</p>
            <div class="v2-file-modal-options">
              ${docs
                .map(
                  (doc) => `
                <button
                  type="button"
                  class="v2-file-type-option"
                  data-role="v2-add-form-option"
                  data-doc-id="${esc(doc.id)}"
                >
                  <strong>${esc(doc.title)}</strong>
                  ${doc.ruleHint ? `<span>${esc(doc.ruleHint)}</span>` : ""}
                </button>`
                )
                .join("")}
            </div>
          </div>`
        )
        .join("");
    }

    modal.hidden = false;
  }

  function addFormTypeToProject(docId) {
    if (v2Route.name !== "edit-project" || !docId) return;
    const projectId = v2Route.projectId;
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || typeof persistProject !== "function") return;

    const catalog =
      typeof listAllPotentialWorkflowDocuments === "function"
        ? listAllPotentialWorkflowDocuments()
        : [];
    const type = catalog.find((doc) => String(doc.id) === String(docId));
    if (!type) return;

    const existing = Array.isArray(project.formalSurvey?.documents)
      ? project.formalSurvey.documents
      : [];
    if (existing.some((doc) => String(doc.id) === String(docId))) {
      closeV2AddFormModal();
      return;
    }

    const now = new Date().toISOString();
    persistProject({
      ...project,
      formalSurvey: {
        ...(project.formalSurvey || { answers: {} }),
        documents: [
          ...existing,
          {
            id: type.id,
            title: type.title,
            source: type.source || "manual",
            ruleId: "manual-add",
          },
        ],
        updatedAt: now,
      },
      updatedAt: now,
    });

    closeV2AddFormModal();
    showV2Toast("Dodano formularz");
    mountV2();
  }

  function bindProjectForms(root) {
    if (v2Route.name !== "edit-project") return;
    const projectId = v2Route.projectId;

    root.querySelector('[data-role="v2-open-survey"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      openV2SurveyModal(projectId);
    });

    root.querySelector('[data-role="v2-add-custom-form"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      if (event.currentTarget.disabled) return;
      openV2AddFormModal(projectId);
    });

    root.querySelectorAll('[data-role="v2-doc-details"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        v2Route = {
          name: "doc-detail",
          projectId,
          docId: String(btn.dataset.docId || ""),
        };
        mountV2();
      });
    });

    root.querySelectorAll('[data-role="v2-goto-doc-task"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const taskId = String(btn.dataset.taskId || "");
        if (!taskId) return;
        openV2TaskSidePanel(projectId, taskId);
      });
    });

    root.querySelectorAll('[data-role="v2-delete-doc"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        deleteSurveyDocument(projectId, btn.dataset.docId, btn.dataset.docName);
      });
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Nie udało się odczytać pliku"));
      reader.readAsDataURL(file);
    });
  }

  function downloadProjectFile(projectId, fileId) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    const file = project?.files?.find((item) => String(item.id) === String(fileId));
    if (!file) return;
    const name = file.name || "plik";
    if (file.dataUrl) {
      const link = document.createElement("a");
      link.href = file.dataUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    if (typeof downloadAttachmentMock === "function") {
      downloadAttachmentMock(file);
    }
  }

  function ensureV2FileTypeModal() {
    let modal = document.getElementById("v2FileTypeModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "v2FileTypeModal";
    modal.className = "v2-file-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="v2-file-modal-backdrop" data-role="v2-file-modal-skip"></div>
      <div class="v2-file-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="v2FileTypeTitle">
        <header class="v2-file-modal-head">
          <div>
            <p class="v2-file-modal-kicker">Typ załącznika</p>
            <h2 id="v2FileTypeTitle">Wybierz typ pliku</h2>
            <p class="v2-file-modal-file" data-role="v2-file-modal-name"></p>
          </div>
          <button type="button" class="v2-file-modal-close" data-role="v2-file-modal-skip" aria-label="Pomiń">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <div class="v2-file-modal-body" data-role="v2-file-modal-body"></div>
        <footer class="v2-file-modal-foot">
          <button type="button" class="v2-back-btn" data-role="v2-file-modal-skip">Pomiń</button>
          <button type="button" class="v2-file-modal-confirm" data-role="v2-file-modal-confirm" disabled>Zapisz typ</button>
        </footer>
      </div>`;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      const target = event.target.closest("[data-role]");
      if (!target) return;
      const role = target.dataset.role;
      if (role === "v2-file-modal-skip") {
        event.preventDefault();
        commitV2PendingFile("");
        return;
      }
      if (role === "v2-file-modal-confirm") {
        event.preventDefault();
        if (!v2TypeDraftId) return;
        commitV2PendingFile(v2TypeDraftId);
        return;
      }
      if (role === "v2-file-type-option") {
        event.preventDefault();
        v2TypeDraftId = target.dataset.categoryId || "";
        modal.querySelectorAll(".v2-file-type-option").forEach((el) => {
          el.classList.toggle("is-selected", el.dataset.categoryId === v2TypeDraftId);
        });
        const confirm = modal.querySelector('[data-role="v2-file-modal-confirm"]');
        if (confirm) confirm.disabled = !v2TypeDraftId;
      }
    });

    return modal;
  }

  function v2FileTypeOptionsHtml(selectedId) {
    const groups =
      typeof attachmentCategories !== "undefined" && Array.isArray(attachmentCategories)
        ? attachmentCategories
        : [];
    return groups
      .map(
        (group) => `
      <div>
        <p class="v2-file-modal-group-label">${esc(group.group)}</p>
        <div class="v2-file-modal-options">
          ${(group.types || [])
            .map(
              (type) => `
            <button
              type="button"
              class="v2-file-type-option${selectedId === type.id ? " is-selected" : ""}"
              data-role="v2-file-type-option"
              data-category-id="${esc(type.id)}"
            >
              <strong>${esc(type.label)}</strong>
              <span>${esc(type.hint || "")}</span>
            </button>`
            )
            .join("")}
        </div>
      </div>`
      )
      .join("");
  }

  function openV2FileTypeModal() {
    const next = v2PendingFiles[0];
    if (!next) {
      closeV2FileTypeModal();
      return;
    }
    const modal = ensureV2FileTypeModal();
    v2TypeDraftId = "";
    const body = modal.querySelector('[data-role="v2-file-modal-body"]');
    const nameEl = modal.querySelector('[data-role="v2-file-modal-name"]');
    const confirm = modal.querySelector('[data-role="v2-file-modal-confirm"]');
    if (body) body.innerHTML = v2FileTypeOptionsHtml("");
    if (nameEl) {
      nameEl.textContent =
        v2PendingFiles.length > 1
          ? `${next.name} (${v2PendingFiles.length} plików)`
          : next.name;
    }
    if (confirm) confirm.disabled = true;
    modal.hidden = false;
  }

  function closeV2FileTypeModal() {
    const modal = document.getElementById("v2FileTypeModal");
    if (modal) modal.hidden = true;
    v2PendingFiles = [];
    v2PendingProjectId = "";
    v2TypeDraftId = "";
  }

  function commitV2PendingFile(categoryId) {
    const next = v2PendingFiles.shift();
    const projectId = v2PendingProjectId;
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!next || !project || typeof persistProject !== "function") {
      closeV2FileTypeModal();
      return;
    }

    const user = typeof getCurrentAccountUser === "function" ? getCurrentAccountUser() : null;
    const file = {
      id: `f${Date.now()}${Math.floor(Math.random() * 1000)}`,
      name: next.name,
      size: next.size,
      categoryId: categoryId || "",
      mime: next.mime || "",
      dataUrl: next.dataUrl || "",
      addedAt: new Date().toISOString(),
      addedById: user?.id || "",
      addedByName: user?.name || "",
    };

    persistProject({
      ...project,
      files: [...(project.files || []), file],
      updatedAt: new Date().toISOString(),
    });
    showV2Toast("Dodano załącznik");

    if (v2PendingFiles.length) {
      openV2FileTypeModal();
      return;
    }

    closeV2FileTypeModal();
    remountIfDocsContext();
  }

  async function deleteProjectFile(projectId, fileId, fileName) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project || typeof persistProject !== "function") return;
    const label = fileName || "ten plik";
    const ok = await confirmV2Dialog({
      title: "Usuń załącznik",
      message: `Czy na pewno chcesz usunąć załącznik „${label}”?`,
      confirmLabel: "Usuń",
      cancelLabel: "Anuluj",
      danger: true,
    });
    if (!ok) return;
    persistProject({
      ...project,
      files: (project.files || []).filter((item) => String(item.id) !== String(fileId)),
      updatedAt: new Date().toISOString(),
    });
    showV2Toast("Usunięto załącznik");
    remountIfDocsContext();
  }

  async function queueV2ProjectFiles(projectId, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const prepared = [];
    for (const file of files) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        prepared.push({
          name: file.name,
          size: file.size,
          mime: file.type || "",
          dataUrl,
        });
      } catch (e) {
        prepared.push({
          name: file.name,
          size: file.size,
          mime: file.type || "",
          dataUrl: "",
        });
      }
    }
    v2PendingProjectId = String(projectId || "");
    v2PendingFiles = prepared;
    openV2FileTypeModal();
  }

  function bindProjectDocs(root) {
    const input = root.querySelector('[data-role="v2-docs-file-input"]');
    if (input && input.dataset.v2Bound !== "1") {
      input.dataset.v2Bound = "1";
      input.addEventListener("change", () => {
        const projectId = getDocsProjectId();
        if (!projectId || !input.files?.length) return;
        queueV2ProjectFiles(projectId, input.files);
        input.value = "";
      });
    }

    root.querySelectorAll('[data-role="v2-docs-expand"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const projectId = getDocsProjectId();
        if (!projectId) return;
        openProjectDocsWindow(projectId);
      });
    });

    root.querySelectorAll('[data-role="v2-download-file"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const projectId = getDocsProjectId();
        if (!projectId) return;
        downloadProjectFile(projectId, btn.dataset.fileId);
      });
    });

    root.querySelectorAll('[data-role="v2-delete-file"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const projectId = getDocsProjectId();
        if (!projectId) return;
        deleteProjectFile(projectId, btn.dataset.fileId, btn.dataset.fileName);
      });
    });
  }

  function saveCurrentProjectForm() {
    if (!isProjectFormRoute()) return;
    if (
      v2Route.name === "task-detail" ||
      (v2Route.name === "edit-project" && v2Route.taskId)
    ) {
      saveV2TaskDetailForm({ silent: false });
      return;
    }
    if (typeof persistProject !== "function") return;

    const draft = readProjectFormDraftFromDom();
    projectFormDraft = draft;
    if (!draft.name) {
      const nameInput = document.querySelector('[data-role="v2-field-name"]');
      if (nameInput) nameInput.focus();
      return;
    }

    const now = new Date().toISOString();
    const wasCreate = v2Route.name === "new-project";
    let project = null;

    if (v2Route.name === "edit-project") {
      const existing =
        typeof getProjectById === "function" ? getProjectById(v2Route.projectId) : null;
      if (!existing) return;
      project = persistProject({
        ...existing,
        title: draft.name,
        code: draft.code,
        description: draft.description,
        updatedAt: now,
      });
    } else {
      project = persistProject({
        id: `p${Date.now()}`,
        title: draft.name,
        code: draft.code,
        description: draft.description,
        files: [],
        plots: [],
        processTasks: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!project?.id) return;
    projectFormDraft = {
      code: project.code || "",
      name: project.title || "",
      description: project.description || "",
    };
    v2Route = { name: "edit-project", projectId: String(project.id), tab: "project" };
    mountV2();
    if (wasCreate) showV2Toast("Utworzono projekt");
  }

  function leaveDocFormContext() {
    if (typeof unbindFormSaveChrome === "function") unbindFormSaveChrome();
  }

  function goBackFromProjectForm() {
    if (v2Route.name === "new-project") {
      projectFormDraft = { code: "", name: "", description: "" };
    }
    goBackV2();
  }

  function isBuildingProjectDoc(doc) {
    return String(doc?.id || "") === "building-project";
  }

  function v2SectionShell(num, title, subtitle, sectionKey, bodyHtml, extraAttrs = "") {
    const assist =
      typeof assistButtonHtml === "function"
        ? assistButtonHtml("assist-section", sectionKey, `Wypełnij całą sekcję: ${title}`)
        : "";
    return `
      <details class="v2-doc-section doc-form-section form-section" data-section="${esc(sectionKey)}" ${extraAttrs}>
        <summary>
          <span class="v2-doc-section-num">${esc(num)}</span>
          <span class="v2-doc-section-copy">
            <strong>${esc(title)}</strong>
            <em>${esc(subtitle || "")}</em>
          </span>
          ${assist}
        </summary>
        <div class="v2-doc-section-body section-body">${bodyHtml}</div>
      </details>`;
  }

  function v2DocFieldHtml(docId, field, value = "") {
    const fullName =
      typeof docFieldKey === "function" ? docFieldKey(docId, field.name) : `${docId}__${field.name}`;
    const assist =
      typeof assistButtonHtml === "function"
        ? assistButtonHtml("assist-field", fullName, `Pomoc asystenta: ${field.label}`)
        : "";
    const control =
      field.type === "textarea"
        ? `<textarea name="${esc(fullName)}" rows="3" placeholder="${esc(field.label)}">${esc(value)}</textarea>`
        : `<input name="${esc(fullName)}" type="text" value="${esc(value)}" placeholder="${esc(field.label)}" />`;
    return `
      <label class="v2-doc-field">
        <span class="v2-doc-field-label">${esc(field.label)}</span>
        <div class="v2-doc-field-control${field.type === "textarea" ? " is-textarea" : ""}">
          ${control}
          ${assist}
        </div>
      </label>`;
  }

  function v2DocSectionsHtml(project, doc) {
    if (typeof resolveDocFormTemplate !== "function") {
      return `<p class="v2-docs-empty">Brak szablonu formularza dla tego dokumentu.</p>`;
    }
    const saved = project.docForms?.[doc.id] || {};
    const template = resolveDocFormTemplate(doc.id);
    return (template.sections || [])
      .map((section, index) => {
        const num = String(index + 1).padStart(2, "0");
        const sectionKey = `doc:${doc.id}:${section.key}`;
        const body = (section.fields || [])
          .map((field) => v2DocFieldHtml(doc.id, field, saved[field.name] || ""))
          .join("");
        return v2SectionShell(num, section.title, section.subtitle, sectionKey, body, `data-doc-section="${esc(section.key)}" data-doc-id="${esc(doc.id)}"`);
      })
      .join("");
  }

  function countBuildingFormFill(project) {
    const d = project?.buildingForm || {};
    const keys =
      typeof SECTION_FIELD_MAP !== "undefined"
        ? Object.values(SECTION_FIELD_MAP).flat()
        : [];
    const total = keys.length || 1;
    const filled = keys.filter((key) => {
      const value = d[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "boolean") return value;
      return String(value || "").trim().length > 0;
    }).length;
    return {
      filled,
      total,
      percent: Math.round((filled / total) * 100),
    };
  }

  function v2BuildingSectionsHtml(project) {
    const d = project.buildingForm || {};
    const g = (key) => d[key] || "";
    const ga = (key) => {
      const value = d[key];
      return Array.isArray(value) ? value : value ? [value] : [];
    };
    const input = typeof fieldInput === "function" ? fieldInput : () => "";
    const textarea = typeof fieldTextarea === "function" ? fieldTextarea : () => "";
    const upload = typeof fieldUpload === "function" ? fieldUpload : () => "";
    const assist =
      typeof assistButtonHtml === "function"
        ? assistButtonHtml
        : () => "";

    const formalItems = [
      ["docOpdn", "Oświadczenie o prawie do dysponowania nieruchomością (OPDN)"],
      ["docWz", "Decyzja WZ (jeśli brak MPZP)"],
      ["docOpinions", "Opinie, uzgodnienia, pozwolenia (np. konserwator, ZUD)"],
      ["docRoad", "Oświadczenie zarządcy drogi o możliwości połączenia działki"],
      ["docBioz", "Informacja BIOZ (Bezpieczeństwo i Ochrona Zdrowia)"],
    ];

    return [
      v2SectionShell(
        "01",
        "Metryka inwestycji i strona tytułowa",
        "§ 7 ust. 2 — baza do data bindingu",
        "metryka",
        `
          ${input("intentName", "Nazwa zamierzenia budowlanego", g("intentName") || project.title, "np. Budynek mieszkalny jednorodzinny")}
          <div class="fields-row">
            ${input("investorName", "Inwestor (imię i nazwisko / nazwa firmy)", g("investorName"), "np. Jan Kowalski")}
            ${input("investorAddress", "Adres inwestora", g("investorAddress"), "ulica, kod, miejscowość")}
          </div>
          <div class="fields-row">
            ${input("siteAddress", "Lokalizacja inwestycji (adres)", g("siteAddress"), "adres inwestycji")}
            ${input("objectCategory", "Kategoria obiektu", g("objectCategory"), "np. budynek mieszkalny jednorodzinny")}
          </div>
          ${textarea("plotIds", "Identyfikatory działek ewidencyjnych", g("plotIds"), "nr działek, obręb, jednostka ewidencyjna — kluczowe do MPZP / WZ", 3)}
          ${textarea("designTeam", "Zespół projektowy", g("designTeam"), "Główny projektant, branżyści, sprawdzający — uprawnienia, specjalności, zakres opracowania", 4)}
        `
      ),
      v2SectionShell(
        "02",
        "Projekt zagospodarowania działki lub terenu (PZT)",
        "Tom do urzędu wraz z PAB",
        "pzt",
        `
          <p class="section-note">Część opisowa PZT</p>
          ${textarea("pztSubject", "Przedmiot inwestycji", g("pztSubject"))}
          ${textarea("pztExisting", "Istniejący stan zagospodarowania działki", g("pztExisting"))}
          ${textarea("pztProposed", "Projektowane zagospodarowanie", g("pztProposed"))}
          ${textarea("pztAreas", "Zestawienie powierzchni", g("pztAreas"), "pow. zabudowy, pow. biologicznie czynna, itd.")}
          <div class="fields-row">
            ${textarea("pztRoadAccess", "Dostęp do drogi publicznej", g("pztRoadAccess"), "", 2)}
            ${textarea("pztTraffic", "Układ komunikacyjny", g("pztTraffic"), "", 2)}
          </div>
          <p class="section-note">Część rysunkowa PZT</p>
          ${upload("pztDrawings", "Mapy do celów projektowych", "Mapy z układem budynków, przyłączami i strefami ochronnymi (skala min. 1:500)", project, ga("pztDrawingsSelected"))}
        `
      ),
      v2SectionShell(
        "03",
        "Projekt architektoniczno-budowlany (PAB)",
        "Tom zatwierdzany w decyzji o pozwoleniu",
        "pab",
        `
          <p class="section-note">Część opisowa PAB</p>
          ${textarea("pabSpatial", "Układ przestrzenny oraz forma architektoniczna", g("pabSpatial"))}
          ${textarea("pabUse", "Zamierzony sposób użytkowania obiektu", g("pabUse"))}
          ${textarea("pabParams", "Charakterystyczne parametry", g("pabParams"), "kubatura, powierzchnia użytkowa, wysokość, liczba kondygnacji")}
          ${textarea("pabGeo", "Opinia geotechniczna", g("pabGeo"))}
          ${textarea("pabAccessibility", "Dostępność dla osób niepełnosprawnych", g("pabAccessibility"))}
          ${input("pabFireCategory", "Kategoria zagrożenia ludzi (pożarowa)", g("pabFireCategory"), "np. ZL IV")}
          <p class="section-note">Część rysunkowa PAB</p>
          ${upload("pabDrawings", "Rzuty, przekroje, elewacje", "PDF/CAD — rzuty kondygnacji, dach, przekroje, elewacje z klasami odporności ogniowej (min. 1:100 / 1:200)", project, ga("pabDrawingsSelected"))}
        `
      ),
      v2SectionShell(
        "04",
        "Projekt techniczny (PT)",
        "Nie składany do urzędu przy wniosku — wymagany przed startem robót",
        "pt",
        `
          <div class="section-callout">
            Ten tom nie jest składany do urzędu przy wniosku o pozwolenie na budowę,
            ale musi być gotowy przed rozpoczęciem robót i przekazany kierownikowi budowy.
          </div>
          <p class="section-note">Część opisowa i obliczeniowa PT</p>
          ${textarea("ptStructure", "Rozwiązania konstrukcyjne", g("ptStructure"))}
          ${textarea("ptCalculations", "Wyniki obliczeń statyczno-wytrzymałościowych", g("ptCalculations"))}
          ${textarea("ptInstallations", "Rozwiązania instalacyjne", g("ptInstallations"), "sanitarne, elektryczne, wentylacyjne")}
          ${textarea("ptEnergy", "Charakterystyka energetyczna budynku", g("ptEnergy"))}
          <p class="section-note">Część rysunkowa PT</p>
          ${upload("ptDrawings", "Rysunki techniczne", "Szalunkowe, zbrojeniowe, detale konstrukcyjne, schematy instalacji", project, ga("ptDrawingsSelected"))}
        `
      ),
      v2SectionShell(
        "05",
        "Załączniki i dokumenty formalne",
        "§ 5 ust. 1 pkt 4 — checklista Upload and Verify",
        "formal",
        `<div class="checklist-grid">${formalItems
          .map(([name, label]) => {
            const done = g(`${name}Done`) === "on" || g(`${name}Done`) === true;
            return `
              <div class="check-upload">
                <div class="check-upload-top">
                  <span class="check-upload-label">${esc(label)}</span>
                  ${assist("assist-field", name, `Pomoc asystenta: ${label}`)}
                </div>
                <div class="check-upload-row">
                  <label class="check-verify">
                    <input type="checkbox" name="${esc(name)}Done" ${done ? "checked" : ""} />
                    <span>Zweryfikowano</span>
                  </label>
                  <div class="upload-actions upload-actions-compact">
                    <label class="upload-action" title="Dodaj z dysku">
                      <input type="file" name="${esc(name)}File" hidden />
                      <span>Z dysku</span>
                    </label>
                    <button type="button" class="upload-action" data-role="pick-project-files" data-field-name="${esc(name)}" title="Z projektu">
                      <span>Z projektu</span>
                    </button>
                    <button type="button" class="upload-action" data-role="pick-account-files" data-field-name="${esc(name)}" title="Z konta">
                      <span>Z konta</span>
                    </button>
                  </div>
                </div>
                ${typeof selectedChipsHtml === "function" ? selectedChipsHtml(name, ga(`${name}Selected`), project) : ""}
              </div>`;
          })
          .join("")}</div>`
      ),
    ].join("");
  }

  function docWorkPanelHtml(project, doc) {
    const isBuilding = isBuildingProjectDoc(doc);
    const fill = isBuilding
      ? countBuildingFormFill(project)
      : typeof countDocFormFill === "function"
        ? countDocFormFill(doc.id, project.docForms?.[doc.id] || {})
        : { filled: 0, total: 0, percent: 0 };
    const sourceLabel = isBuilding
      ? "Formularz formalny · projekt budowlany"
      : doc.source === "standard"
        ? "Dokument standardowy"
        : doc.source === "manual"
          ? "Dodany ręcznie"
          : "Dokument warunkowy";
    const saveBtn =
      typeof formSaveSubmitButtonHtml === "function"
        ? formSaveSubmitButtonHtml()
        : `<button type="submit" class="v2-section-btn">Zapisz</button>`;
    const wholeAssist = isBuilding
      ? ""
      : typeof assistButtonHtml === "function"
        ? assistButtonHtml(
            "assist-section",
            `doc:${doc.id}`,
            `Wypełnij cały dokument: ${doc.title}`
          )
        : "";
    const formAttrs = isBuilding
      ? `id="buildingProjectForm" class="v2-doc-form building-form" autocomplete="off"`
      : `class="v2-doc-form" data-role="doc-form" data-doc-id="${esc(doc.id)}" autocomplete="off"`;
    const sections = isBuilding ? v2BuildingSectionsHtml(project) : v2DocSectionsHtml(project, doc);
    const heading = isBuilding ? "Sekcje projektu budowlanego" : "Sekcje dokumentu";

    return `
      <div class="v2-doc-work" data-role="v2-doc-work" data-project-id="${esc(project.id)}" data-doc-id="${esc(doc.id)}" data-form-kind="${isBuilding ? "building" : "doc"}">
        <header class="v2-doc-work-head">
          <h2 class="v2-projects-title">${esc(doc.title || "Formularz")}</h2>
          <p class="v2-doc-work-meta">${esc(sourceLabel)} · ${fill.filled}/${fill.total} pól · ${fill.percent}%</p>
        </header>
        <section class="v2-doc-work-panel" aria-label="Formularz dokumentu">
          <header class="v2-doc-work-panel-head">
            <div>
              <h3>${esc(heading)}</h3>
              <p class="v2-doc-work-lead">Rozwiń sekcję, aby wypełnić pola. Asystent AI pomoże uzupełnić dane.</p>
            </div>
            <div class="v2-section-actions">
              ${wholeAssist}
            </div>
          </header>
          <form ${formAttrs}>
            ${sections}
            <div class="v2-doc-actions">
              ${saveBtn}
            </div>
          </form>
        </section>
      </div>`;
  }

  function bindDocWorkPanel(root, projectId, docId) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    const isBuilding = String(docId) === "building-project";
    const form = isBuilding
      ? root.querySelector("#buildingProjectForm")
      : root.querySelector(`[data-role="doc-form"][data-doc-id="${docId}"]`);
    if (!project || !form) return;

    form.querySelectorAll('[data-role="assist-field"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof runAssist === "function" && typeof fillFieldSample === "function") {
          runAssist(() => fillFieldSample(btn.dataset.fieldName, project));
        }
      });
    });

    form.querySelectorAll('[data-role="assist-section"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const section = btn.closest("details");
        if (section && !section.open) section.open = true;
        if (typeof runAssist === "function" && typeof fillSectionSample === "function") {
          runAssist(() => fillSectionSample(btn.dataset.section, project));
        }
        if (typeof updateFormSaveFabVisibility === "function") updateFormSaveFabVisibility();
      });
    });

    root.querySelectorAll('.v2-doc-work-panel-head [data-role="assist-section"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        form.querySelectorAll("details.v2-doc-section").forEach((block) => {
          block.open = true;
        });
        if (typeof runAssist === "function" && typeof fillSectionSample === "function") {
          runAssist(() => fillSectionSample(btn.dataset.section, project));
        }
        if (typeof updateFormSaveFabVisibility === "function") updateFormSaveFabVisibility();
      });
    });

    form.querySelectorAll('[data-role="pick-project-files"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        if (typeof openAttachmentPicker === "function") {
          openAttachmentPicker(projectId, btn.dataset.fieldName, "project");
        }
      });
    });
    form.querySelectorAll('[data-role="pick-account-files"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        if (typeof openAttachmentPicker === "function") {
          openAttachmentPicker(projectId, btn.dataset.fieldName, "account");
        }
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (typeof triggerActiveFormSave === "function") {
        triggerActiveFormSave();
      } else if (isBuilding && typeof persistBuildingFormFromDom === "function") {
        persistBuildingFormFromDom(projectId);
        showV2Toast("Zapisano formularz");
      } else if (typeof persistDocFormFromDom === "function") {
        persistDocFormFromDom(projectId, docId);
        showV2Toast("Zapisano formularz");
      }
    });

    form.querySelectorAll("details.v2-doc-section").forEach((section) => {
      section.addEventListener("toggle", () => {
        if (typeof updateFormSaveFabVisibility === "function") updateFormSaveFabVisibility();
      });
    });

    if (typeof bindFormSaveChrome === "function") {
      if (isBuilding) bindFormSaveChrome(projectId, "building");
      else bindFormSaveChrome(projectId, "doc", docId);
    }
  }

  function projectsTableInnerHtml(projects) {
    if (!projects.length) {
      return `<p class="v2-projects-empty">Brak projektów. Użyj „Nowy projekt”.</p>`;
    }

    const order = projectsTableState.order;
    const filtersOn = projectsTableState.filtersOn;
    const rows = projects
      .slice()
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .map(projectRowValues)
      .filter(rowMatchesFilters);

    const colgroup = order
      .map((key) => {
        const width = projectsTableState.widths[key] || PROJECT_COL_DEFS[key].defaultWidth;
        return `<col data-col="${esc(key)}" style="width:${width}px" />`;
      })
      .join("");

    const headCells = order
      .map((key) => {
        const def = PROJECT_COL_DEFS[key];
        return `<th class="${esc(def.cls)}" data-col="${esc(key)}" draggable="true" scope="col">
          <span class="v2-th-label">${esc(def.label)}</span>
          <span class="v2-col-resize" data-role="v2-col-resize" data-col="${esc(key)}" title="Zmień szerokość"></span>
        </th>`;
      })
      .join("");

    const filterCells = order
      .map((key) => {
        const def = PROJECT_COL_DEFS[key];
        if (!def.filterable) {
          return `<th class="${esc(def.cls)}" data-col="${esc(key)}"></th>`;
        }
        const value = projectsTableState.filters[key] || "";
        return `<th class="${esc(def.cls)}" data-col="${esc(key)}">
          <input
            type="search"
            class="v2-col-filter"
            data-role="v2-col-filter"
            data-col="${esc(key)}"
            value="${esc(value)}"
            placeholder="Filtr…"
            aria-label="Filtr: ${esc(def.label)}"
          />
        </th>`;
      })
      .join("");

    const bodyRows = rows
      .map((row) => {
        const filterAttrs = order
          .map((key) => {
            const raw = String(row.cells[key]?.filter || "").toLowerCase();
            return `data-filter-${esc(key)}="${esc(raw)}"`;
          })
          .join(" ");
        const cells = order
          .map((key) => {
            const def = PROJECT_COL_DEFS[key];
            return `<td class="${esc(def.cls)}" data-col="${esc(key)}">${renderProjectCell(key, row)}</td>`;
          })
          .join("");
        return `<tr data-project-id="${esc(row.id)}" ${filterAttrs}>${cells}</tr>`;
      })
      .join("");

    const emptyFiltered =
      !rows.length && projects.length
        ? `<tr class="v2-filter-empty-row"><td colspan="${order.length}">Brak projektów spełniających filtry.</td></tr>`
        : "";

    return `
      <div class="v2-excel-wrap">
        <table class="v2-excel${filtersOn ? " is-filtering" : ""}" data-role="v2-projects-table">
          <colgroup>${colgroup}</colgroup>
          <thead>
            <tr class="v2-head-row">${headCells}</tr>
            <tr class="v2-filter-row"${filtersOn ? "" : " hidden"}>${filterCells}</tr>
          </thead>
          <tbody>
            ${bodyRows || emptyFiltered}
          </tbody>
        </table>
      </div>`;
  }

  const HOME_TASKS_FILTERS_KEY = "snappoint.v2.home.tasksFilters";
  const HOME_DOCS_FILTERS_KEY = "snappoint.v2.home.docsFilters";

  function loadHomeTasksFilterState() {
    const defaults = {
      filtersOn: true,
      projectId: "",
      statusKey: "",
      query: "",
      dueFrom: "",
      dueTo: "",
      includeDone: false,
    };
    try {
      const raw = JSON.parse(localStorage.getItem(HOME_TASKS_FILTERS_KEY) || "null");
      if (raw && typeof raw === "object") return { ...defaults, ...raw };
    } catch (e) {
      /* ignore */
    }
    return defaults;
  }

  function saveHomeTasksFilterState() {
    try {
      localStorage.setItem(HOME_TASKS_FILTERS_KEY, JSON.stringify(homeTasksFilterState));
    } catch (e) {
      /* ignore */
    }
  }

  function loadHomeDocsFilterState() {
    const defaults = {
      filtersOn: true,
      projectId: "",
      docKind: "",
      query: "",
    };
    try {
      const raw = JSON.parse(localStorage.getItem(HOME_DOCS_FILTERS_KEY) || "null");
      if (raw && typeof raw === "object") return { ...defaults, ...raw };
    } catch (e) {
      /* ignore */
    }
    return defaults;
  }

  function saveHomeDocsFilterState() {
    try {
      localStorage.setItem(HOME_DOCS_FILTERS_KEY, JSON.stringify(homeDocsFilterState));
    } catch (e) {
      /* ignore */
    }
  }

  let homeTasksFilterState = loadHomeTasksFilterState();
  let homeDocsFilterState = loadHomeDocsFilterState();

  function homeTaskOwnerLabel(project, taskId) {
    if (typeof getTaskOwnerId !== "function") return "—";
    const ownerId = getTaskOwnerId(project, taskId);
    if (!ownerId || ownerId === "none") return "Brak właściciela";
    if (typeof getTaskOwnerOptions === "function") {
      const hit = getTaskOwnerOptions(project).find((item) => String(item.id) === String(ownerId));
      if (hit?.name) return hit.name;
    }
    return String(ownerId);
  }

  function collectV2HomeCurrentTasks() {
    const statuses =
      typeof getKanbanStatuses === "function" ? getKanbanStatuses() : [];
    const doneId =
      statuses.find((item) => item.autoCompleteAt100)?.id || "done";
    const f = homeTasksFilterState;
    const rows = [];
    if (typeof collectAllProjectTasks !== "function") return rows;
    collectAllProjectTasks().forEach(({ project, task }) => {
      if (!task || task.hasChildren) return;
      const statusKey = String(task.statusKey || "");
      const isDone = statusKey === String(doneId);
      if (isDone && !f.includeDone) return;
      if (f.projectId && String(project.id) !== String(f.projectId)) return;
      if (f.statusKey && statusKey !== String(f.statusKey)) return;
      const due = String(task.dueDate || "").slice(0, 10);
      if (f.dueFrom && (!due || due < f.dueFrom)) return;
      if (f.dueTo && (!due || due > f.dueTo)) return;
      const q = String(f.query || "").trim().toLowerCase();
      if (q) {
        const hay = [
          task.name,
          project.title,
          task.status,
          homeTaskOwnerLabel(project, task.id),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return;
      }
      rows.push({ project, task, isDone });
    });
    rows.sort((a, b) => {
      const da = String(a.task.dueDate || "9999");
      const db = String(b.task.dueDate || "9999");
      if (da !== db) return da.localeCompare(db);
      return String(a.task.name || "").localeCompare(String(b.task.name || ""), "pl");
    });
    return rows;
  }

  function homeTasksFilterBarHtml(projects) {
    const f = homeTasksFilterState;
    if (!f.filtersOn) return "";
    const statuses =
      typeof getKanbanStatuses === "function" ? getKanbanStatuses() : [];
    const projectOpts = [`<option value="">Wszystkie projekty</option>`]
      .concat(
        (projects || []).map(
          (p) =>
            `<option value="${esc(String(p.id))}"${
              String(f.projectId) === String(p.id) ? " selected" : ""
            }>${esc(p.title || "Projekt")}</option>`
        )
      )
      .join("");
    const statusOpts = [`<option value="">Wszystkie statusy</option>`]
      .concat(
        statuses.map(
          (s) =>
            `<option value="${esc(String(s.id))}"${
              String(f.statusKey) === String(s.id) ? " selected" : ""
            }>${esc(s.label || s.name || s.id)}</option>`
        )
      )
      .join("");
    return `
      <div class="v2-home-filters" data-role="v2-home-tasks-filters">
        <label class="v2-home-filter">
          <span>Projekt</span>
          <select data-role="v2-home-task-filter" data-filter="projectId">${projectOpts}</select>
        </label>
        <label class="v2-home-filter">
          <span>Status</span>
          <select data-role="v2-home-task-filter" data-filter="statusKey">${statusOpts}</select>
        </label>
        <label class="v2-home-filter is-grow">
          <span>Szukaj</span>
          <input type="search" data-role="v2-home-task-filter" data-filter="query"
            value="${esc(f.query || "")}" placeholder="Nazwa, projekt, właściciel…" />
        </label>
        <label class="v2-home-filter">
          <span>Termin od</span>
          <input type="date" data-role="v2-home-task-filter" data-filter="dueFrom"
            value="${esc(f.dueFrom || "")}" />
        </label>
        <label class="v2-home-filter">
          <span>Termin do</span>
          <input type="date" data-role="v2-home-task-filter" data-filter="dueTo"
            value="${esc(f.dueTo || "")}" />
        </label>
        <label class="v2-home-filter is-check">
          <input type="checkbox" data-role="v2-home-task-filter" data-filter="includeDone"
            ${f.includeDone ? "checked" : ""} />
          <span>Pokaż ukończone</span>
        </label>
        <button type="button" class="v2-back-btn" data-role="v2-home-tasks-clear">Wyczyść</button>
      </div>`;
  }

  function homeTasksInnerHtml() {
    const projects = typeof loadProjects === "function" ? loadProjects() : [];
    const rows = collectV2HomeCurrentTasks();
    const totalHint = rows.length
      ? `<p class="v2-home-filter-count">${rows.length} zadań</p>`
      : "";
    const empty = !rows.length
      ? `<p class="v2-projects-empty">Brak zadań spełniających filtry. Zmień kryteria lub utwórz projekt.</p>`
      : "";
    const body = rows
      .map(({ project, task }) => {
        const tone = v2StatusToneClass(task.statusKey);
        const start = task.startDate ? v2TaskDateLabel(task.startDate) : "—";
        const due = task.dueDate ? v2TaskDateLabel(task.dueDate) : "—";
        const progress = Number.isFinite(Number(task.progress))
          ? Math.round(Number(task.progress))
          : 0;
        const owner = homeTaskOwnerLabel(project, task.id);
        return `
          <tr>
            <td>
              <button
                type="button"
                class="v2-count-link"
                data-role="v2-home-open-task"
                data-project-id="${esc(project.id)}"
                data-task-id="${esc(task.id)}"
              >${esc(task.name || "Zadanie")}</button>
            </td>
            <td>
              <button
                type="button"
                class="v2-count-link"
                data-role="v2-home-open-project"
                data-project-id="${esc(project.id)}"
              >${esc(project.title || "Projekt")}</button>
            </td>
            <td>
              <span class="v2-task-status-pill ${esc(tone)}">${esc(task.status || "—")}</span>
            </td>
            <td>${esc(owner)}</td>
            <td>${esc(start)}</td>
            <td>${esc(due)}</td>
            <td class="v2-col-num">${progress}%</td>
          </tr>`;
      })
      .join("");
    return `
      ${homeTasksFilterBarHtml(projects)}
      ${totalHint}
      ${
        empty ||
        `<div class="v2-excel-wrap">
        <table class="v2-excel" data-role="v2-home-tasks-table" aria-label="Zadania">
          <colgroup>
            <col style="width:24%" />
            <col style="width:18%" />
            <col style="width:14%" />
            <col style="width:14%" />
            <col style="width:12%" />
            <col style="width:12%" />
            <col style="width:6%" />
          </colgroup>
          <thead>
            <tr class="v2-head-row">
              <th scope="col"><span class="v2-th-label">Zadanie</span></th>
              <th scope="col"><span class="v2-th-label">Projekt</span></th>
              <th scope="col"><span class="v2-th-label">Status</span></th>
              <th scope="col"><span class="v2-th-label">Właściciel</span></th>
              <th scope="col"><span class="v2-th-label">Start</span></th>
              <th scope="col"><span class="v2-th-label">Termin</span></th>
              <th scope="col"><span class="v2-th-label">Postęp</span></th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>`
      }`;
  }

  function collectV2HomeDocuments() {
    const projects = typeof loadProjects === "function" ? loadProjects() : [];
    const f = homeDocsFilterState;
    const rows = [];
    projects.forEach((project) => {
      if (f.projectId && String(project.id) !== String(f.projectId)) return;

      getProjectFormDocuments(project).forEach((doc) => {
        const isBuilding = String(doc.id) === "building-project";
        const kind = isBuilding ? "design" : "formal";
        const kindLabel = isBuilding
          ? "Dokumentacja projektowa"
          : "Dokumentacja formalna";
        if (f.docKind && f.docKind !== kind) return;
        const title = doc.title || "Dokument";
        const q = String(f.query || "").trim().toLowerCase();
        if (q) {
          const hay = `${title} ${project.title || ""} ${kindLabel}`.toLowerCase();
          if (!hay.includes(q)) return;
        }
        const fill = getFormalDocFill(project, doc);
        rows.push({
          rowId: `form:${project.id}:${doc.id}`,
          project,
          kind,
          kindLabel,
          title,
          docId: String(doc.id),
          fileId: "",
          fillPercent: Number(fill?.percent) || 0,
          meta: isBuilding ? "Formularz systemowy" : "Formularz formalny",
          updatedAt: project.updatedAt || project.createdAt || "",
          downloadable: true,
          openable: true,
        });
      });

      (Array.isArray(project.files) ? project.files : []).forEach((file) => {
        const kind = "design";
        const kindLabel = "Dokumentacja projektowa";
        if (f.docKind && f.docKind !== kind) return;
        const title = file.name || "Załącznik";
        const category =
          typeof findCategoryLabel === "function"
            ? findCategoryLabel(file.categoryId)
            : "";
        const q = String(f.query || "").trim().toLowerCase();
        if (q) {
          const hay = `${title} ${project.title || ""} ${kindLabel} ${category}`.toLowerCase();
          if (!hay.includes(q)) return;
        }
        rows.push({
          rowId: `file:${project.id}:${file.id}`,
          project,
          kind,
          kindLabel,
          title,
          docId: "",
          fileId: String(file.id || ""),
          fillPercent: null,
          meta: category && category !== "Wybierz typ…" ? category : "Załącznik",
          updatedAt: file.uploadedAt || project.updatedAt || project.createdAt || "",
          downloadable: true,
          openable: false,
          file,
        });
      });
    });
    rows.sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
    );
    return rows;
  }

  function homeDocsFilterBarHtml(projects) {
    const f = homeDocsFilterState;
    if (!f.filtersOn) return "";
    const projectOpts = [`<option value="">Wszystkie projekty</option>`]
      .concat(
        (projects || []).map(
          (p) =>
            `<option value="${esc(String(p.id))}"${
              String(f.projectId) === String(p.id) ? " selected" : ""
            }>${esc(p.title || "Projekt")}</option>`
        )
      )
      .join("");
    return `
      <div class="v2-home-filters" data-role="v2-home-docs-filters">
        <label class="v2-home-filter">
          <span>Projekt</span>
          <select data-role="v2-home-doc-filter" data-filter="projectId">${projectOpts}</select>
        </label>
        <label class="v2-home-filter">
          <span>Typ dokumentacji</span>
          <select data-role="v2-home-doc-filter" data-filter="docKind">
            <option value=""${f.docKind === "" ? " selected" : ""}>Wszystkie typy</option>
            <option value="formal"${f.docKind === "formal" ? " selected" : ""}>Dokumentacja formalna</option>
            <option value="design"${f.docKind === "design" ? " selected" : ""}>Dokumentacja projektowa</option>
          </select>
        </label>
        <label class="v2-home-filter is-grow">
          <span>Szukaj</span>
          <input type="search" data-role="v2-home-doc-filter" data-filter="query"
            value="${esc(f.query || "")}" placeholder="Nazwa, projekt, kategoria…" />
        </label>
        <button type="button" class="v2-back-btn" data-role="v2-home-docs-clear">Wyczyść</button>
      </div>`;
  }

  function downloadHomeDocMock(row) {
    if (row.file && typeof downloadAttachmentMock === "function") {
      downloadAttachmentMock(row.file);
      return;
    }
    const name = `${row.title || "dokument"}.txt`;
    const blob = new Blob(
      [
        `snapPoint — mock dokumentu\n\n` +
          `Nazwa: ${row.title || ""}\n` +
          `Projekt: ${row.project?.title || ""}\n` +
          `Typ: ${row.kindLabel || ""}\n` +
          `Źródło: ${row.meta || ""}\n`,
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name.replace(/[\\/:*?"<>|]+/g, "_");
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function homeDocsInnerHtml() {
    const projects = typeof loadProjects === "function" ? loadProjects() : [];
    const rows = collectV2HomeDocuments();
    const totalHint = rows.length
      ? `<p class="v2-home-filter-count">${rows.length} dokumentów</p>`
      : "";
    const empty = !rows.length
      ? `<p class="v2-projects-empty">Brak dokumentów spełniających filtry. Dodaj dokumenty formalne lub załączniki projektowe.</p>`
      : "";
    const body = rows
      .map((row) => {
        const fillCell =
          row.fillPercent == null
            ? "—"
            : `${Math.round(row.fillPercent)}%`;
        const openBtn = row.openable
          ? `<button
                type="button"
                class="v2-count-link"
                data-role="v2-home-open-doc"
                data-project-id="${esc(row.project.id)}"
                data-doc-id="${esc(row.docId)}"
              >${esc(row.title)}</button>`
          : `<span>${esc(row.title)}</span>`;
        return `
          <tr data-row-id="${esc(row.rowId)}">
            <td>${openBtn}</td>
            <td>
              <button
                type="button"
                class="v2-count-link"
                data-role="v2-home-open-project"
                data-project-id="${esc(row.project.id)}"
              >${esc(row.project.title || "Projekt")}</button>
            </td>
            <td>${esc(row.kindLabel)}</td>
            <td>${esc(row.meta || "—")}</td>
            <td class="v2-col-num">${esc(fillCell)}</td>
            <td>${esc(formatRegDate(row.updatedAt) || "—")}</td>
            <td class="v2-col-actions">
              <button
                type="button"
                class="v2-icon-btn"
                data-role="v2-home-download-doc"
                data-row-id="${esc(row.rowId)}"
                title="Pobierz dokument"
                aria-label="Pobierz: ${esc(row.title)}"
              >${iconDownload()}</button>
            </td>
          </tr>`;
      })
      .join("");
    return `
      ${homeDocsFilterBarHtml(projects)}
      ${totalHint}
      ${
        empty ||
        `<div class="v2-excel-wrap">
        <table class="v2-excel" data-role="v2-home-docs-table" aria-label="Baza dokumentów">
          <colgroup>
            <col style="width:24%" />
            <col style="width:18%" />
            <col style="width:16%" />
            <col style="width:14%" />
            <col style="width:8%" />
            <col style="width:12%" />
            <col style="width:8%" />
          </colgroup>
          <thead>
            <tr class="v2-head-row">
              <th scope="col"><span class="v2-th-label">Dokument</span></th>
              <th scope="col"><span class="v2-th-label">Projekt</span></th>
              <th scope="col"><span class="v2-th-label">Typ</span></th>
              <th scope="col"><span class="v2-th-label">Szczegóły</span></th>
              <th scope="col"><span class="v2-th-label">Wypełnienie</span></th>
              <th scope="col"><span class="v2-th-label">Aktualizacja</span></th>
              <th scope="col" class="v2-col-actions"><span class="v2-th-label">Akcje</span></th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>`
      }`;
  }

  function homeDashboardHtml(tab, projects) {
    const active = normalizeHomeTab(tab);
    const filtersOn =
      active === "projects"
        ? projectsTableState.filtersOn
        : active === "tasks"
          ? homeTasksFilterState.filtersOn
          : homeDocsFilterState.filtersOn;
    const filterToggle = `<button
            type="button"
            class="v2-filter-toggle${filtersOn ? " is-active" : ""}"
            data-role="v2-filter-toggle"
            title="${filtersOn ? "Ukryj filtry" : "Pokaż filtry"}"
            aria-pressed="${filtersOn ? "true" : "false"}"
            aria-label="Filtry"
          >${iconFilter()}</button>`;
    const body =
      active === "tasks"
        ? homeTasksInnerHtml()
        : active === "docs"
          ? homeDocsInnerHtml()
          : projectsTableInnerHtml(projects);
    return `
      <section class="v2-home v2-projects" data-role="v2-home" data-tab="${esc(active)}">
        <header class="v2-home-head">
          <div class="v2-home-tabs" role="tablist" aria-label="Pulpit">
            <button
              type="button"
              class="v2-home-tab${active === "projects" ? " is-active" : ""}"
              role="tab"
              aria-selected="${active === "projects" ? "true" : "false"}"
              data-role="v2-home-tab"
              data-tab="projects"
            >Projekty</button>
            <button
              type="button"
              class="v2-home-tab${active === "tasks" ? " is-active" : ""}"
              role="tab"
              aria-selected="${active === "tasks" ? "true" : "false"}"
              data-role="v2-home-tab"
              data-tab="tasks"
            >Zadania</button>
            <button
              type="button"
              class="v2-home-tab${active === "docs" ? " is-active" : ""}"
              role="tab"
              aria-selected="${active === "docs" ? "true" : "false"}"
              data-role="v2-home-tab"
              data-tab="docs"
            >Baza dokumentów</button>
          </div>
          ${filterToggle}
        </header>
        <div class="v2-home-body" data-role="v2-home-body">${body}</div>
      </section>`;
  }

  function projectsTableHtml(projects) {
    return homeDashboardHtml("projects", projects);
  }

  function copyProject(projectId) {
    if (typeof loadProjects !== "function" || typeof persistProject !== "function") return null;
    const source = typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!source) return null;
    const stamp = Date.now();
    const clone = JSON.parse(JSON.stringify(source));
    clone.id = `p${stamp}`;
    clone.title = `${source.title || "Projekt"} (kopia)`;
    clone.createdAt = new Date().toISOString();
    clone.updatedAt = clone.createdAt;
    return persistProject(clone);
  }

  function openProject(projectId) {
    const project =
      typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project) return;
    projectFormDraft = {
      code: project.code || "",
      name: project.title || "",
      description: project.description || "",
    };
    v2Route = { name: "edit-project", projectId: String(project.id), tab: "project" };
    mountV2();
  }

  async function deleteProjectRow(projectId) {
    const project = typeof getProjectById === "function" ? getProjectById(projectId) : null;
    if (!project) return;
    const ok = await confirmV2Dialog({
      title: "Usuń projekt",
      message: `Czy na pewno chcesz usunąć projekt „${project.title || "Projekt"}”?`,
      confirmLabel: "Usuń",
      cancelLabel: "Anuluj",
      danger: true,
    });
    if (!ok) return;
    if (typeof deleteProject === "function") deleteProject(projectId);
    v2Route = { name: "home", tab: "projects" };
    mountV2();
  }

  function applyLiveFilters(root) {
    const table = root.querySelector('[data-role="v2-projects-table"]');
    if (!table) return;
    const rows = table.querySelectorAll("tbody tr[data-project-id]");
    let visible = 0;
    rows.forEach((row) => {
      const ok = projectsTableState.order.every((key) => {
        const def = PROJECT_COL_DEFS[key];
        if (!def?.filterable) return true;
        const query = String(projectsTableState.filters[key] || "")
          .trim()
          .toLowerCase();
        if (!query) return true;
        const hay = String(row.getAttribute(`data-filter-${key}`) || "");
        return hay.includes(query);
      });
      row.hidden = !ok;
      if (ok) visible += 1;
    });
    let emptyRow = table.querySelector(".v2-filter-empty-row");
    if (!visible && rows.length) {
      if (!emptyRow) {
        emptyRow = document.createElement("tr");
        emptyRow.className = "v2-filter-empty-row";
        emptyRow.innerHTML = `<td colspan="${projectsTableState.order.length}">Brak projektów spełniających filtry.</td>`;
        table.querySelector("tbody")?.appendChild(emptyRow);
      }
      emptyRow.hidden = false;
    } else if (emptyRow) {
      emptyRow.hidden = true;
    }
  }

  function bindColumnResize(root) {
    root.querySelectorAll('[data-role="v2-col-resize"]').forEach((handle) => {
      handle.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const key = handle.dataset.col;
        const col = root.querySelector(`col[data-col="${key}"]`);
        const th = handle.closest("th");
        if (!col || !th || !key) return;
        const startX = event.clientX;
        const startWidth = th.getBoundingClientRect().width;

        const onMove = (moveEvent) => {
          const next = Math.max(64, Math.round(startWidth + (moveEvent.clientX - startX)));
          col.style.width = `${next}px`;
          projectsTableState.widths[key] = next;
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          document.body.classList.remove("v2-col-resizing");
          saveProjectsTableState();
        };
        document.body.classList.add("v2-col-resizing");
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    });
  }

  function bindColumnReorder(root) {
    const table = root.querySelector('[data-role="v2-projects-table"]');
    if (!table) return;
    let dragKey = null;

    table.querySelectorAll("thead tr.v2-head-row th[data-col]").forEach((th) => {
      th.addEventListener("dragstart", (event) => {
        if (event.target.closest('[data-role="v2-col-resize"]')) {
          event.preventDefault();
          return;
        }
        dragKey = th.dataset.col;
        th.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", dragKey || "");
      });
      th.addEventListener("dragend", () => {
        th.classList.remove("is-dragging");
        table.querySelectorAll("th.is-drop-target").forEach((el) => el.classList.remove("is-drop-target"));
        dragKey = null;
      });
      th.addEventListener("dragover", (event) => {
        if (!dragKey || dragKey === th.dataset.col) return;
        event.preventDefault();
        th.classList.add("is-drop-target");
      });
      th.addEventListener("dragleave", () => {
        th.classList.remove("is-drop-target");
      });
      th.addEventListener("drop", (event) => {
        event.preventDefault();
        th.classList.remove("is-drop-target");
        const from = dragKey || event.dataTransfer.getData("text/plain");
        const to = th.dataset.col;
        if (!from || !to || from === to) return;
        const order = projectsTableState.order.slice();
        const fromIdx = order.indexOf(from);
        const toIdx = order.indexOf(to);
        if (fromIdx < 0 || toIdx < 0) return;
        order.splice(fromIdx, 1);
        order.splice(toIdx, 0, from);
        projectsTableState.order = order;
        saveProjectsTableState();
        mountV2();
      });
    });
  }

  function bindProjectsTable(root) {
    root.querySelector('[data-role="v2-filter-toggle"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      projectsTableState.filtersOn = !projectsTableState.filtersOn;
      if (!projectsTableState.filtersOn) {
        projectsTableState.filters = {};
      }
      saveProjectsTableState();
      mountV2();
    });

    root.querySelectorAll('[data-role="v2-col-filter"]').forEach((input) => {
      input.addEventListener("input", () => {
        const key = input.dataset.col;
        if (!key) return;
        projectsTableState.filters[key] = input.value;
        saveProjectsTableState();
        applyLiveFilters(root);
      });
    });

    bindColumnResize(root);
    bindColumnReorder(root);

    root.querySelectorAll('[data-role="v2-project-open"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        openProject(btn.dataset.projectId);
      });
    });
    root.querySelectorAll('[data-role="v2-project-copy"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const copied = copyProject(btn.dataset.projectId);
        if (copied) mountV2();
      });
    });
    root.querySelectorAll('[data-role="v2-project-delete"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        deleteProjectRow(btn.dataset.projectId);
      });
    });
    root.querySelectorAll('[data-role="v2-open-tasks"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        v2Route = { name: "tasks", projectId: String(link.dataset.projectId || "") };
        mountV2();
      });
    });
    root.querySelectorAll('[data-role="v2-open-docs"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        v2Route = {
          name: "project-docs",
          projectId: String(link.dataset.projectId || ""),
        };
        mountV2();
      });
    });
  }

  function bindHomeDashboard(root) {
    root.querySelectorAll('[data-role="v2-home-tab"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        goV2Home(btn.dataset.tab || "projects");
      });
    });

    const tab = normalizeHomeTab(v2Route.tab);

    if (tab === "projects") {
      bindProjectsTable(root);
      return;
    }

    root.querySelector('[data-role="v2-filter-toggle"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      if (tab === "tasks") {
        homeTasksFilterState.filtersOn = !homeTasksFilterState.filtersOn;
        saveHomeTasksFilterState();
      } else {
        homeDocsFilterState.filtersOn = !homeDocsFilterState.filtersOn;
        saveHomeDocsFilterState();
      }
      mountV2();
    });

    const remountHomeKeepingFilterFocus = (role, filterKey, caret) => {
      mountV2();
      if (!filterKey) return;
      const next = document.querySelector(
        `[data-role="${role}"][data-filter="${filterKey}"]`
      );
      if (!next) return;
      next.focus();
      if (
        typeof caret === "number" &&
        typeof next.setSelectionRange === "function" &&
        next.type !== "date"
      ) {
        try {
          next.setSelectionRange(caret, caret);
        } catch (e) {
          /* ignore */
        }
      }
    };

    if (tab === "tasks") {
      root.querySelectorAll('[data-role="v2-home-task-filter"]').forEach((el) => {
        const key = el.dataset.filter;
        if (!key) return;
        const evt = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
        let timer = null;
        el.addEventListener(evt, () => {
          const value =
            el.type === "checkbox" ? Boolean(el.checked) : String(el.value || "");
          const caret = el.selectionStart;
          const apply = () => {
            homeTasksFilterState[key] = value;
            saveHomeTasksFilterState();
            remountHomeKeepingFilterFocus("v2-home-task-filter", key, caret);
          };
          if (evt === "input") {
            clearTimeout(timer);
            timer = setTimeout(apply, 160);
            return;
          }
          apply();
        });
      });
      root.querySelector('[data-role="v2-home-tasks-clear"]')?.addEventListener("click", (event) => {
        event.preventDefault();
        homeTasksFilterState = {
          ...homeTasksFilterState,
          projectId: "",
          statusKey: "",
          query: "",
          dueFrom: "",
          dueTo: "",
          includeDone: false,
        };
        saveHomeTasksFilterState();
        mountV2();
      });
    }

    if (tab === "docs") {
      root.querySelectorAll('[data-role="v2-home-doc-filter"]').forEach((el) => {
        const key = el.dataset.filter;
        if (!key) return;
        const evt = el.tagName === "SELECT" ? "change" : "input";
        let timer = null;
        el.addEventListener(evt, () => {
          const value = String(el.value || "");
          const caret = el.selectionStart;
          const apply = () => {
            homeDocsFilterState[key] = value;
            saveHomeDocsFilterState();
            remountHomeKeepingFilterFocus("v2-home-doc-filter", key, caret);
          };
          if (evt === "input") {
            clearTimeout(timer);
            timer = setTimeout(apply, 160);
            return;
          }
          apply();
        });
      });
      root.querySelector('[data-role="v2-home-docs-clear"]')?.addEventListener("click", (event) => {
        event.preventDefault();
        homeDocsFilterState = {
          ...homeDocsFilterState,
          projectId: "",
          docKind: "",
          query: "",
        };
        saveHomeDocsFilterState();
        mountV2();
      });

      root.querySelectorAll('[data-role="v2-home-download-doc"]').forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.preventDefault();
          const rowId = String(btn.dataset.rowId || "");
          const row = collectV2HomeDocuments().find((item) => item.rowId === rowId);
          if (!row) return;
          downloadHomeDocMock(row);
          showV2Toast(`Pobrano: ${row.title}`);
        });
      });
    }

    root.querySelectorAll('[data-role="v2-home-open-project"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        openProject(btn.dataset.projectId);
      });
    });

    root.querySelectorAll('[data-role="v2-home-open-task"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const projectId = String(btn.dataset.projectId || "");
        const taskId = String(btn.dataset.taskId || "");
        if (!projectId || !taskId) return;
        v2Route = {
          name: "edit-project",
          projectId,
          tab: "tasks",
          taskId,
        };
        mountV2();
      });
    });

    root.querySelectorAll('[data-role="v2-home-open-doc"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const projectId = String(btn.dataset.projectId || "");
        const docId = String(btn.dataset.docId || "");
        if (!projectId || !docId) return;
        if (docId === "building-project") {
          openProject(projectId);
          return;
        }
        v2Route = { name: "doc-detail", projectId, docId };
        mountV2();
      });
    });
  }

  function bindEmptyPanel(root, { backToEdit = false } = {}) {
    root.querySelector('[data-role="v2-back-home"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      void backToEdit;
      goBackV2();
    });
  }

  function ensureV2GlobalWorkflowRuntime() {
    if (typeof setWorkflowRuntime === "function") {
      setWorkflowRuntime({ mode: "global" });
    }
  }

  function syncV2SidebarNav() {
    if (getUiVersion() !== "v2") return;
    let activeView = "dashboard";
    if (v2Route.name === "workflow" || v2Route.name === "workflow-path") {
      activeView = "workflow";
    } else if (v2Route.name === "configuration") {
      activeView = "configuration";
    }
    if (typeof setActiveNav === "function") {
      setActiveNav(activeView);
      return;
    }
    document.querySelectorAll(".sidebar .nav-item").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.view === activeView);
    });
  }

  function goV2Home(tab = "projects") {
    leaveDocFormContext();
    if (document.querySelector('[data-role="v2-task-sheet-root"]')) {
      closeV2TaskSidePanel({ save: true });
    }
    clearV2TaskFocusMode();
    v2TasksViewBeforeFocus = null;
    v2SkipHistoryPush = false;
    v2Route = { name: "home", tab: normalizeHomeTab(tab) };
    mountV2();
  }

  function goV2Workflow() {
    leaveDocFormContext();
    if (document.querySelector('[data-role="v2-task-sheet-root"]')) {
      closeV2TaskSidePanel({ save: true });
    }
    clearV2TaskFocusMode();
    v2TasksViewBeforeFocus = null;
    v2SkipHistoryPush = false;
    ensureV2GlobalWorkflowRuntime();
    v2Route = { name: "workflow" };
    mountV2();
  }

  function goV2Configuration(tab = "statuses") {
    try {
      leaveDocFormContext();
      // Zamknij sheet bez remountu zadań (closeV2TaskSidePanel potrafi przeładować edit-project)
      const sheet = document.querySelector('[data-role="v2-task-sheet-root"]');
      if (sheet) {
        try {
          saveV2TaskDetailForm({ silent: true });
        } catch (e) {
          /* ignore */
        }
        sheet.remove();
        document.removeEventListener("keydown", onV2TaskSheetKeydown, true);
      }
      clearV2TaskFocusMode();
      v2TasksViewBeforeFocus = null;
      v2SkipHistoryPush = false;
      v2Route = {
        name: "configuration",
        tab: tab === "statuses" ? "statuses" : "statuses",
      };
      persistV2Route(v2Route);
      mountV2();
    } catch (err) {
      console.error("[v2] configuration", err);
      showV2Toast("Nie udało się otworzyć konfiguracji", { tone: "error" });
    }
  }

  // Wystaw jak najwcześniej — handler z app.js może odpalić zanim dobiegnie init na dole pliku
  window.snappointV2GoConfiguration = (tab) => {
    goV2Configuration(tab || "statuses");
  };

  function getV2StatusColorPalette() {
    if (typeof STATUS_COLOR_PALETTE !== "undefined" && Array.isArray(STATUS_COLOR_PALETTE)) {
      return STATUS_COLOR_PALETTE;
    }
    return [
      { id: "gray", label: "Szary" },
      { id: "slate", label: "Grafit" },
      { id: "blue", label: "Niebieski" },
      { id: "teal", label: "Teal" },
      { id: "green", label: "Zielony" },
      { id: "amber", label: "Bursztyn" },
      { id: "orange", label: "Pomarańcz" },
      { id: "rose", label: "Róż" },
      { id: "red", label: "Czerwony" },
      { id: "violet", label: "Fiolet" },
    ];
  }

  function readV2ConfigStatusesFromDom(root) {
    const rows = [...(root?.querySelectorAll('[data-role="v2-status-row"]') || [])];
    return rows.map((row, index) => {
      const selected =
        row.querySelector('[data-role="v2-status-color"].is-selected')?.dataset.color ||
        row.dataset.color ||
        "gray";
      const color =
        typeof normalizeStatusColor === "function"
          ? normalizeStatusColor(selected, "gray")
          : String(selected || "gray");
      return {
        id: String(row.dataset.statusId || `status-${index + 1}`),
        label:
          String(row.querySelector('[data-role="v2-status-label"]')?.value || "").trim() ||
          `Status ${index + 1}`,
        color,
        order: index,
        autoCompleteAt100: Boolean(
          row.querySelector('[data-role="v2-status-auto"]')?.checked
        ),
      };
    });
  }

  function saveV2ConfigStatuses(root, { toast = true } = {}) {
    if (typeof loadAppConfig !== "function" || typeof saveAppConfig !== "function") {
      return false;
    }
    const statuses = readV2ConfigStatusesFromDom(root);
    if (!statuses.length) {
      showV2Toast("Dodaj co najmniej jeden status", { tone: "error" });
      return false;
    }
    const autoCount = statuses.filter((item) => item.autoCompleteAt100).length;
    if (autoCount > 1) {
      showV2Toast("Tylko jeden status może być ustawiany po 100%", { tone: "error" });
      return false;
    }
    const current = loadAppConfig();
    saveAppConfig({
      ...current,
      statuses,
      taskTypes: current.taskTypes || [],
    });
    if (toast) showV2Toast("Zapisano statusy");
    return true;
  }

  function v2ConfigStatusesTableHtml(statuses) {
    const palette = getV2StatusColorPalette();
    const rows = (statuses || [])
      .map((status, index) => {
        const color = String(status.color || "gray");
        return `
        <tr
          class="v2-config-status-row"
          data-role="v2-status-row"
          data-status-id="${esc(status.id)}"
          data-color="${esc(color)}"
        >
          <td class="v2-config-status-order">${index + 1}</td>
          <td>
            <input
              type="text"
              class="v2-config-input"
              data-role="v2-status-label"
              value="${esc(status.label || "")}"
              maxlength="60"
              aria-label="Nazwa statusu"
            />
          </td>
          <td>
            <div class="v2-config-color-palette" role="group" aria-label="Kolor statusu">
              ${palette
                .map(
                  (swatch) => `
                <button
                  type="button"
                  class="v2-config-color-swatch is-color-${esc(swatch.id)}${
                    color === swatch.id ? " is-selected" : ""
                  }"
                  data-role="v2-status-color"
                  data-color="${esc(swatch.id)}"
                  title="${esc(swatch.label)}"
                  aria-label="${esc(swatch.label)}"
                  aria-pressed="${color === swatch.id ? "true" : "false"}"
                ></button>`
                )
                .join("")}
            </div>
          </td>
          <td>
            <label class="v2-config-check">
              <input
                type="checkbox"
                data-role="v2-status-auto"
                ${status.autoCompleteAt100 ? "checked" : ""}
              />
              <span>Po 100%</span>
            </label>
          </td>
          <td class="v2-config-status-actions">
            <button
              type="button"
              class="v2-section-btn"
              data-role="v2-status-move-up"
              ${index === 0 ? "disabled" : ""}
              title="Przenieś w górę"
              aria-label="Przenieś w górę"
            >↑</button>
            <button
              type="button"
              class="v2-section-btn"
              data-role="v2-status-move-down"
              ${index >= (statuses || []).length - 1 ? "disabled" : ""}
              title="Przenieś w dół"
              aria-label="Przenieś w dół"
            >↓</button>
            <button
              type="button"
              class="v2-section-btn"
              data-role="v2-status-remove"
              ${ (statuses || []).length <= 1 ? "disabled" : ""}
              title="Usuń status"
              aria-label="Usuń status"
            >Usuń</button>
          </td>
        </tr>`;
      })
      .join("");

    return `
      <div class="v2-config-panel" data-role="v2-config-statuses">
        <div class="v2-config-panel-head">
          <p class="v2-config-panel-lead">
            Statusy tablicy Kanban — nazwa, kolor i automatyczne ustawienie po 100%.
          </p>
          <div class="v2-config-panel-actions">
            <button type="button" class="v2-section-btn" data-role="v2-status-add">+ Status</button>
            <button type="button" class="v2-section-btn" data-role="v2-config-save-statuses">Zapisz</button>
          </div>
        </div>
        <div class="v2-config-table-wrap">
          <table class="v2-config-table" aria-label="Statusy zadań">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Nazwa</th>
                <th scope="col">Kolor</th>
                <th scope="col">Auto</th>
                <th scope="col">Akcje</th>
              </tr>
            </thead>
            <tbody data-role="v2-status-tbody">${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  function v2ConfigurationPageHtml(tab = "statuses") {
    const activeTab = tab === "statuses" ? "statuses" : "statuses";
    const config =
      typeof loadAppConfig === "function" ? loadAppConfig() : { statuses: [] };
    return `
      <section class="v2-config" data-role="v2-config" data-tab="${esc(activeTab)}">
        <header class="v2-config-head">
          <h2 class="v2-projects-title">Konfiguracja</h2>
          <div class="v2-config-tabs" role="tablist" aria-label="Sekcje konfiguracji">
            <button
              type="button"
              class="v2-config-tab is-active"
              role="tab"
              aria-selected="true"
              data-role="v2-config-tab"
              data-tab="statuses"
            >Statusy</button>
          </div>
        </header>
        <div class="v2-config-body" data-role="v2-config-body">
          ${v2ConfigStatusesTableHtml(config.statuses || [])}
        </div>
      </section>`;
  }

  function remountV2Configuration() {
    if (v2Route.name !== "configuration") return;
    mountV2();
  }

  function bindV2Configuration(root) {
    const panel = root.querySelector('[data-role="v2-config"]');
    if (!panel) return;

    root.querySelectorAll('[data-role="v2-config-tab"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        goV2Configuration(btn.dataset.tab || "statuses");
      });
    });

    root.querySelectorAll('[data-role="v2-status-color"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const row = btn.closest('[data-role="v2-status-row"]');
        if (!row) return;
        const color = String(btn.dataset.color || "gray");
        row.dataset.color = color;
        row.querySelectorAll('[data-role="v2-status-color"]').forEach((swatch) => {
          const on = String(swatch.dataset.color) === color;
          swatch.classList.toggle("is-selected", on);
          swatch.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
    });

    root.querySelectorAll('[data-role="v2-status-auto"]').forEach((box) => {
      box.addEventListener("change", () => {
        if (!box.checked) return;
        root.querySelectorAll('[data-role="v2-status-auto"]').forEach((other) => {
          if (other !== box) other.checked = false;
        });
      });
    });

    root.querySelector('[data-role="v2-status-add"]')?.addEventListener("click", () => {
      const statuses = readV2ConfigStatusesFromDom(root);
      statuses.push({
        id: `status-${Date.now()}`,
        label: `Nowy status ${statuses.length + 1}`,
        color:
          typeof defaultStatusColorForIndex === "function"
            ? defaultStatusColorForIndex(statuses.length)
            : "gray",
        order: statuses.length,
        autoCompleteAt100: false,
      });
      if (typeof loadAppConfig === "function" && typeof saveAppConfig === "function") {
        const current = loadAppConfig();
        saveAppConfig({ ...current, statuses });
      }
      remountV2Configuration();
    });

    root.querySelectorAll('[data-role="v2-status-move-up"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest('[data-role="v2-status-row"]');
        const statuses = readV2ConfigStatusesFromDom(root);
        const index = statuses.findIndex((item) => item.id === row?.dataset.statusId);
        if (index <= 0) return;
        const swap = statuses[index - 1];
        statuses[index - 1] = statuses[index];
        statuses[index] = swap;
        if (typeof loadAppConfig === "function" && typeof saveAppConfig === "function") {
          const current = loadAppConfig();
          saveAppConfig({
            ...current,
            statuses: statuses.map((item, order) => ({ ...item, order })),
          });
        }
        remountV2Configuration();
      });
    });

    root.querySelectorAll('[data-role="v2-status-move-down"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest('[data-role="v2-status-row"]');
        const statuses = readV2ConfigStatusesFromDom(root);
        const index = statuses.findIndex((item) => item.id === row?.dataset.statusId);
        if (index < 0 || index >= statuses.length - 1) return;
        const swap = statuses[index + 1];
        statuses[index + 1] = statuses[index];
        statuses[index] = swap;
        if (typeof loadAppConfig === "function" && typeof saveAppConfig === "function") {
          const current = loadAppConfig();
          saveAppConfig({
            ...current,
            statuses: statuses.map((item, order) => ({ ...item, order })),
          });
        }
        remountV2Configuration();
      });
    });

    root.querySelectorAll('[data-role="v2-status-remove"]').forEach((btn) => {
      btn.addEventListener("click", async () => {
        const row = btn.closest('[data-role="v2-status-row"]');
        const statuses = readV2ConfigStatusesFromDom(root);
        if (statuses.length <= 1) return;
        const label =
          row?.querySelector('[data-role="v2-status-label"]')?.value || "ten status";
        const ok = await confirmV2Dialog({
          title: "Usuń status",
          message: `Czy na pewno chcesz usunąć status „${label}”?`,
          confirmLabel: "Usuń",
          cancelLabel: "Anuluj",
          danger: true,
        });
        if (!ok) return;
        const next = statuses
          .filter((item) => item.id !== row?.dataset.statusId)
          .map((item, order) => ({ ...item, order }));
        if (typeof loadAppConfig === "function" && typeof saveAppConfig === "function") {
          const current = loadAppConfig();
          saveAppConfig({ ...current, statuses: next });
        }
        remountV2Configuration();
      });
    });

    root
      .querySelector('[data-role="v2-config-save-statuses"]')
      ?.addEventListener("click", () => {
        if (!saveV2ConfigStatuses(root)) return;
        remountV2Configuration();
      });
  }

  function openV2WorkflowPath(pathId, tab = "tasks") {
    ensureV2GlobalWorkflowRuntime();
    if (typeof setActiveWorkflowPathId === "function") {
      setActiveWorkflowPathId(String(pathId));
    }
    v2SkipHistoryPush = false;
    v2Route = {
      name: "workflow-path",
      pathId: String(pathId),
      tab: tab === "docs" ? "docs" : "tasks",
    };
    mountV2();
  }

  function promptV2Text({ title, label, placeholder = "", initial = "", confirmLabel = "Zapisz" }) {
    return new Promise((resolve) => {
      const existing = document.querySelector('[data-role="v2-text-prompt"]');
      existing?.remove();
      const modal = document.createElement("div");
      modal.className = "v2-modal";
      modal.dataset.role = "v2-text-prompt";
      modal.innerHTML = `
        <div class="v2-modal-backdrop" data-role="v2-text-prompt-close"></div>
        <div class="v2-modal-dialog" role="dialog" aria-modal="true">
          <header class="v2-modal-head">
            <div>
              <p class="v2-modal-kicker">Workflow</p>
              <h2 class="v2-projects-title">${esc(title)}</h2>
            </div>
            <button type="button" class="v2-modal-close" data-role="v2-text-prompt-close" aria-label="Zamknij">×</button>
          </header>
          <div class="v2-modal-body">
            <label class="v2-field">
              <span class="v2-field-label">${esc(label)}</span>
              <input type="text" data-role="v2-text-prompt-input" maxlength="120" value="${esc(
                initial
              )}" placeholder="${esc(placeholder)}" autocomplete="off" />
            </label>
          </div>
          <footer class="v2-modal-foot">
            <button type="button" class="v2-section-btn" data-role="v2-text-prompt-close">Anuluj</button>
            <button type="button" class="v2-section-btn" data-role="v2-text-prompt-save">${esc(
              confirmLabel
            )}</button>
          </footer>
        </div>`;
      document.body.appendChild(modal);
      const input = modal.querySelector('[data-role="v2-text-prompt-input"]');
      const close = (value) => {
        modal.remove();
        resolve(value);
      };
      modal.querySelectorAll('[data-role="v2-text-prompt-close"]').forEach((el) => {
        el.addEventListener("click", () => close(null));
      });
      modal.querySelector('[data-role="v2-text-prompt-save"]')?.addEventListener("click", () => {
        const value = String(input?.value || "").trim();
        if (!value) {
          input?.focus();
          showV2Toast("Podaj nazwę");
          return;
        }
        close(value);
      });
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          modal.querySelector('[data-role="v2-text-prompt-save"]')?.click();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          close(null);
        }
      });
      requestAnimationFrame(() => {
        input?.focus();
        input?.select();
      });
    });
  }

  function openV2PickerModal({ title, lead = "", bodyHtml, confirmLabel = "Zapisz", onSave }) {
    const existing = document.querySelector('[data-role="v2-picker-modal"]');
    existing?.remove();
    const modal = document.createElement("div");
    modal.className = "v2-modal";
    modal.dataset.role = "v2-picker-modal";
    modal.innerHTML = `
      <div class="v2-modal-backdrop" data-role="v2-picker-close"></div>
      <div class="v2-modal-dialog" role="dialog" aria-modal="true">
        <header class="v2-modal-head">
          <div>
            <p class="v2-modal-kicker">Workflow</p>
            <h2 class="v2-projects-title">${esc(title)}</h2>
            ${lead ? `<p class="v2-doc-work-meta">${esc(lead)}</p>` : ""}
          </div>
          <button type="button" class="v2-modal-close" data-role="v2-picker-close" aria-label="Zamknij">×</button>
        </header>
        <div class="v2-modal-body v2-picker-body">${bodyHtml}</div>
        <footer class="v2-modal-foot">
          <button type="button" class="v2-section-btn" data-role="v2-picker-close">Anuluj</button>
          <button type="button" class="v2-section-btn" data-role="v2-picker-save">${esc(
            confirmLabel
          )}</button>
        </footer>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelectorAll('[data-role="v2-picker-close"]').forEach((el) => {
      el.addEventListener("click", close);
    });
    modal.querySelector('[data-role="v2-picker-save"]')?.addEventListener("click", () => {
      const ok = onSave?.(modal);
      if (ok !== false) close();
    });
    return modal;
  }

  function openV2WorkflowDocPicker(path, taskId) {
    ensureV2GlobalWorkflowRuntime();
    if (typeof setActiveWorkflowPathId === "function") setActiveWorkflowPathId(path.id);
    const current =
      typeof getActiveWorkflowPath === "function" ? getActiveWorkflowPath() : path;
    const task = (current?.tasks || []).find((item) => String(item.id) === String(taskId));
    if (!task) return;
    const docs =
      typeof listAllPotentialWorkflowDocuments === "function"
        ? listAllPotentialWorkflowDocuments()
        : typeof workflowDocCatalog === "function"
          ? workflowDocCatalog()
          : [];
    const linkedElsewhere = new Map();
    (current.tasks || []).forEach((item) => {
      if (item.linkedDocId && String(item.id) !== String(taskId)) {
        linkedElsewhere.set(String(item.linkedDocId), item.name);
      }
    });
    const options = [
      `<label class="v2-picker-option"><input type="radio" name="v2-wf-doc" value="" ${
        task.linkedDocId ? "" : "checked"
      } /><span>Bez dokumentu</span></label>`,
      ...docs.map((doc) => {
        const other = linkedElsewhere.get(String(doc.id));
        return `<label class="v2-picker-option">
          <input type="radio" name="v2-wf-doc" value="${esc(doc.id)}" ${
            String(task.linkedDocId) === String(doc.id) ? "checked" : ""
          } />
          <span>${esc(doc.title || doc.id)}${
            other ? `<em> · obecnie: ${esc(other)}</em>` : ""
          }</span>
        </label>`;
      }),
    ].join("");
    openV2PickerModal({
      title: "Powiąż dokument formalny",
      lead: `Zadanie „${task.name}”`,
      confirmLabel: "Zapisz",
      bodyHtml: `<div class="v2-picker-list">${options}</div>`,
      onSave: (modal) => {
        const selected =
          modal.querySelector('input[name="v2-wf-doc"]:checked')?.value || "";
        if (typeof linkWorkflowTaskDocument !== "function") return false;
        linkWorkflowTaskDocument(taskId, selected || null);
        showV2Toast(selected ? "Powiązano dokument" : "Usunięto powiązanie dokumentu");
        remountV2WorkflowPath();
        return true;
      },
    });
  }

  function openV2WorkflowBlocksPicker(path, taskId) {
    ensureV2GlobalWorkflowRuntime();
    if (typeof setActiveWorkflowPathId === "function") setActiveWorkflowPathId(path.id);
    const current =
      typeof getActiveWorkflowPath === "function" ? getActiveWorkflowPath() : path;
    const source = (current?.tasks || []).find((item) => String(item.id) === String(taskId));
    if (!source) return;
    const options = (
      typeof sortWorkflowTasksTree === "function"
        ? sortWorkflowTasksTree(current.tasks || [])
        : current.tasks || []
    ).filter(
      (task) =>
        String(task.id) !== String(taskId) &&
        (typeof workflowTasksSameLevel !== "function" ||
          workflowTasksSameLevel(source, task))
    );
    if (!options.length) {
      showV2Toast("Brak zadań równorzędnych do powiązania");
      return;
    }
    const selected = new Set((source.blockedBy || []).map(String));
    const body = options
      .map(
        (task) => `<label class="v2-picker-option">
          <input type="checkbox" value="${esc(task.id)}" ${
            selected.has(String(task.id)) ? "checked" : ""
          } />
          <span>${esc(task.name || "Zadanie")}</span>
        </label>`
      )
      .join("");
    openV2PickerModal({
      title: "Wymaga wykonania",
      lead: `Zadanie „${source.name}” — tylko równorzędne (bloczki zależności).`,
      confirmLabel: "Zapisz",
      bodyHtml: `<div class="v2-picker-list">${body}</div>`,
      onSave: (modal) => {
        const ids = [
          ...modal.querySelectorAll('.v2-picker-list input[type="checkbox"]:checked'),
        ].map((input) => input.value);
        if (typeof setWorkflowTaskDependencies !== "function") return false;
        setWorkflowTaskDependencies(taskId, ids, "blockedBy");
        showV2Toast("Zapisano zależności");
        remountV2WorkflowPath();
        return true;
      },
    });
  }

  function exportV2ProjectFlowAsTemplate(project) {
    ensureV2GlobalWorkflowRuntime();
    const rawTasks = Array.isArray(project?.flowInstance?.tasks)
      ? project.flowInstance.tasks
      : [];
    if (!rawTasks.length) {
      showV2Toast("Brak zadań flow do eksportu");
      return;
    }
    void promptV2Text({
      title: "Eksportuj flow",
      label: "Nazwa szablonu",
      placeholder: project?.title ? `Flow: ${project.title}` : "np. Standard PnB",
      initial: project?.title ? `Flow: ${project.title}` : "",
      confirmLabel: "Eksportuj",
    }).then((name) => {
      if (!name || typeof createWorkflowPath !== "function") return;
      const path = createWorkflowPath(name);
      if (!path) return;
      const copied =
        typeof buildWorkflowTemplateTasksFromProject === "function"
          ? buildWorkflowTemplateTasksFromProject(project)
          : rawTasks.map((task, index) =>
              typeof normalizeWorkflowTask === "function"
                ? normalizeWorkflowTask({ ...task, startDate: null }, index)
                : { ...task, startDate: null }
            );
      const leafWithDuration = copied.filter(
        (task) =>
          !(copied.some((other) => String(other.parentId) === String(task.id))) &&
          task.durationDays > 0
      ).length;
      const state =
        typeof loadWorkflowState === "function"
          ? loadWorkflowState()
          : { paths: [], activePathId: path.id };
      const nextPath =
        typeof normalizeWorkflowPath === "function"
          ? normalizeWorkflowPath({ ...path, tasks: copied })
          : { ...path, tasks: copied };
      const paths = (state.paths || []).map((item) =>
        item.id === path.id ? nextPath : item
      );
      if (typeof saveWorkflowState === "function") {
        saveWorkflowState({ paths, activePathId: path.id });
      }
      showV2Toast(
        `Zapisano szablon: ${nextPath.name} (${copied.length} zadań, ${leafWithDuration} z czasem trwania)`
      );
    });
  }

  function openV2ImportFlowPicker(project) {
    ensureV2GlobalWorkflowRuntime();
    const paths =
      typeof getWorkflowPaths === "function" ? getWorkflowPaths() : [];
    if (!paths.length) {
      showV2Toast("Brak szablonów Workflow — najpierw zdefiniuj flow");
      return;
    }
    const todayIso =
      typeof toIsoDateOnly === "function"
        ? toIsoDateOnly(v2GanttNoon(new Date()))
        : new Date().toISOString().slice(0, 10);
    const body = `
      <label class="v2-field" style="margin-bottom:0.85rem">
        <span class="v2-field-label">Data startu flow (korzenie)</span>
        <input type="date" data-role="v2-import-flow-start" value="${esc(todayIso)}" />
        <span class="v2-doc-work-meta" style="display:block;margin-top:0.35rem">
          Po imporcie daty zadań wyliczą się z czasów trwania szablonu.
        </span>
      </label>
      <div class="v2-picker-list">${paths
        .map(
          (path, index) => `<label class="v2-picker-option">
          <input type="radio" name="v2-import-flow" value="${esc(path.id)}" ${
            index === 0 ? "checked" : ""
          } />
          <span>${esc(path.name)} <em>· ${(path.tasks || []).length} zadań</em></span>
        </label>`
        )
        .join("")}</div>`;
    openV2PickerModal({
      title: "Importuj flow",
      lead: "Scali zadania ze szablonu i ustawi harmonogram od podanej daty.",
      confirmLabel: "Importuj",
      bodyHtml: body,
      onSave: (modal) => {
        const pathId = modal.querySelector('input[name="v2-import-flow"]:checked')?.value;
        const startIso = String(
          modal.querySelector('[data-role="v2-import-flow-start"]')?.value || ""
        ).trim();
        const template = paths.find((item) => item.id === pathId);
        if (!template || typeof applyWorkflowPathToProject !== "function") return false;
        const result = applyWorkflowPathToProject(project, template);
        let next = result.project;
        if (startIso && typeof applyProjectFlowStartAnchor === "function") {
          next = applyProjectFlowStartAnchor(next, startIso, {
            forceRecompute: true,
          });
        } else if (
          typeof projectFlowHasRootStart === "function" &&
          typeof applyFlowScheduleDatesToProject === "function" &&
          projectFlowHasRootStart(next?.flowInstance?.tasks)
        ) {
          next = {
            ...next,
            autoScheduleDates: true,
          };
          next = applyFlowScheduleDatesToProject(next);
        }
        if (typeof persistProject === "function") persistProject(next);
        showV2Toast(
          result.addedTasks > 0
            ? `Zaimportowano ${result.addedTasks} zadań${
                startIso ? ` · start ${startIso}` : ""
              }`
            : startIso
              ? `Flow scalony · harmonogram od ${startIso}`
              : "Flow scalony — ustaw datę startu korzenia, aby wyliczyć terminy"
        );
        remountTasksTab();
        return true;
      },
    });
  }

  function setV2ProjectFlowRootStart(projectId, _taskId, startIso) {
    const pid = String(projectId || "");
    if (!pid || typeof getProjectById !== "function") return false;
    if (typeof setWorkflowRuntime === "function") {
      setWorkflowRuntime({ mode: "project", projectId: pid });
    }
    const project = getProjectById(pid);
    if (!project) return false;
    if (!startIso) return false;
    if (typeof applyProjectFlowStartAnchor !== "function") return false;
    // Start projektu = przesunięcie względem najwcześniejszego zadania
    const next = applyProjectFlowStartAnchor(project, startIso);
    if (!next || typeof persistProject !== "function") return false;
    persistProject(next);
    return true;
  }

  function workflowListHtml() {
    ensureV2GlobalWorkflowRuntime();
    const paths =
      typeof getWorkflowPaths === "function" ? getWorkflowPaths() : [];
    const rows = paths
      .slice()
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .map((path) => {
        const tasksCount = Array.isArray(path.tasks) ? path.tasks.length : 0;
        const linkedCount =
          typeof getLinkedDocIdsForPath === "function"
            ? getLinkedDocIdsForPath(path).size
            : 0;
        return `
          <tr data-path-id="${esc(path.id)}">
            <td>
              <button
                type="button"
                class="v2-wf-path-name"
                data-role="v2-open-workflow-path"
                data-path-id="${esc(path.id)}"
              >${esc(path.name || "Ścieżka")}</button>
            </td>
            <td>${tasksCount}</td>
            <td>${linkedCount}</td>
            <td class="v2-col-date">${esc(formatRegDate(path.createdAt || ""))}</td>
            <td class="v2-col-actions">
              <button
                type="button"
                class="v2-icon-btn is-danger"
                data-role="v2-workflow-delete-path"
                data-path-id="${esc(path.id)}"
                data-path-name="${esc(path.name || "Ścieżka")}"
                title="Usuń szablon"
                aria-label="Usuń szablon: ${esc(path.name || "Ścieżka")}"
              >${iconTrash()}</button>
            </td>
          </tr>`;
      })
      .join("");

    return `
      <section class="v2-projects" data-role="v2-workflow-list">
        <header class="v2-projects-head">
          <h2 class="v2-projects-title">Workflow</h2>
          <button
            type="button"
            class="v2-section-btn"
            data-role="v2-workflow-add-path"
            title="Nowa ścieżka"
          >+ Ścieżka</button>
        </header>
        ${
          paths.length
            ? `<div class="v2-excel-wrap">
                <table class="v2-excel" data-role="v2-workflow-table">
                  <colgroup>
                    <col style="width:38%" />
                    <col style="width:12%" />
                    <col style="width:16%" />
                    <col style="width:22%" />
                    <col style="width:12%" />
                  </colgroup>
                  <thead>
                    <tr class="v2-head-row">
                      <th scope="col"><span class="v2-th-label">Nazwa</span></th>
                      <th scope="col"><span class="v2-th-label">Zadania</span></th>
                      <th scope="col"><span class="v2-th-label">Dokumenty</span></th>
                      <th scope="col"><span class="v2-th-label">Utworzono</span></th>
                      <th scope="col"><span class="v2-th-label">Akcje</span></th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>`
            : `<p class="v2-projects-empty">Brak ścieżek workflow. Użyj „+ Ścieżka”.</p>`
        }
      </section>`;
  }

  function bindWorkflowList(root) {
    root
      .querySelector('[data-role="v2-workflow-add-path"]')
      ?.addEventListener("click", async (event) => {
        event.preventDefault();
        ensureV2GlobalWorkflowRuntime();
        const name = await promptV2Text({
          title: "Nowa ścieżka",
          label: "Nazwa ścieżki",
          placeholder: "np. Standardowy wniosek o PnB",
          confirmLabel: "Utwórz",
        });
        if (!name || typeof createWorkflowPath !== "function") return;
        const path = createWorkflowPath(name);
        if (!path) return;
        showV2Toast(`Utworzono ścieżkę: ${path.name}`);
        openV2WorkflowPath(path.id, "tasks");
      });

    root.querySelectorAll('[data-role="v2-open-workflow-path"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        openV2WorkflowPath(btn.dataset.pathId || "", "tasks");
      });
    });

    root.querySelectorAll('[data-role="v2-workflow-delete-path"]').forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        ensureV2GlobalWorkflowRuntime();
        const pathId = String(btn.dataset.pathId || "");
        const pathName = String(btn.dataset.pathName || "Ścieżka");
        if (!pathId) return;
        const ok = await confirmV2Dialog({
          title: "Usuń szablon",
          message: `Czy na pewno chcesz usunąć szablon workflow „${pathName}”?`,
          confirmLabel: "Usuń",
          cancelLabel: "Anuluj",
          danger: true,
        });
        if (!ok) return;
        if (typeof deleteWorkflowPath !== "function" || !deleteWorkflowPath(pathId)) {
          showV2Toast("Nie udało się usunąć szablonu", { tone: "error" });
          return;
        }
        showV2Toast(`Usunięto szablon: ${pathName}`);
        if (v2Route.name === "workflow-path" && String(v2Route.pathId) === pathId) {
          goV2Workflow();
          return;
        }
        mountV2();
      });
    });
  }

  function workflowTaskRowHtml(path, task, rollMemo) {
    const depth = Math.max(0, Number(task.depth) || 0);
    const expanded = Boolean(task.expanded);
    const toggle = task.hasChildren
      ? `<button
          type="button"
          class="v2-task-toggle${expanded ? " is-open" : ""}"
          data-role="v2-wf-task-toggle"
          data-task-id="${esc(task.id)}"
          aria-expanded="${expanded ? "true" : "false"}"
          title="${expanded ? "Zwiń" : "Rozwiń"}"
        >${expanded ? "−" : "+"}</button>`
      : `<span class="v2-task-toggle-spacer" aria-hidden="true"></span>`;
    const linkedTitle =
      task.linkedDocId && typeof workflowDocTitleById === "function"
        ? workflowDocTitleById(task.linkedDocId)
        : "Dokument formalny";
    const linked = task.linkedDocId
      ? `<span class="v2-task-icons">
          <span
            class="v2-task-linked-doc"
            title="${esc(linkedTitle)}"
            aria-label="Dokument formalny: ${esc(linkedTitle)}"
          >${iconFormalDocLink()}</span>
        </span>`
      : "";
    const rolled = workflowRolledDurationDays(path.tasks || [], task.id, rollMemo);
    const durationCell = task.hasChildren
      ? `<span class="v2-task-readonly" title="Suma czasów podzadań">${
          rolled > 0 ? `${rolled} dni` : "—"
        }</span>`
      : `<input
          type="number"
          class="v2-task-date-input v2-wf-duration-input"
          data-role="v2-wf-duration"
          data-task-id="${esc(task.id)}"
          min="1"
          max="999"
          step="1"
          value="${task.durationDays != null ? esc(String(task.durationDays)) : ""}"
          placeholder="dni"
          title="Czas trwania (dni)"
          aria-label="Czas trwania w dniach"
        />`;
    return `
      <tr class="v2-task-row" data-task-id="${esc(task.id)}" data-depth="${depth}">
        <td class="v2-task-col-name" data-col="name">
          <div class="v2-task-name" style="--v2-task-depth:${depth}">
            ${toggle}
            <span class="v2-task-kind-icon" aria-hidden="true">${v2TaskLevelIcon(depth)}</span>
            <button
              type="button"
              class="v2-task-title-link"
              data-role="v2-wf-rename-task"
              data-task-id="${esc(task.id)}"
              title="Zmień nazwę"
            >${esc(task.name || "Zadanie")}</button>
            <button
              type="button"
              class="v2-task-add-child"
              data-role="v2-wf-add-child"
              data-task-id="${esc(task.id)}"
              title="Dodaj podzadanie"
              aria-label="Dodaj podzadanie"
            >+</button>
            <button
              type="button"
              class="v2-icon-btn v2-wf-task-action"
              data-role="v2-wf-link-doc"
              data-task-id="${esc(task.id)}"
              title="Powiąż dokument formalny"
              aria-label="Powiąż dokument formalny"
            >${iconWfLinkDoc()}</button>
            <button
              type="button"
              class="v2-icon-btn v2-wf-task-action"
              data-role="v2-wf-set-blocks"
              data-task-id="${esc(task.id)}"
              title="Wymaga wykonania (bloczki / zależności)"
              aria-label="Ustaw zależności"
            >${iconWfBlocks()}</button>
            <button
              type="button"
              class="v2-icon-btn is-danger v2-wf-task-delete"
              data-role="v2-wf-delete-task"
              data-task-id="${esc(task.id)}"
              title="Usuń zadanie"
              aria-label="Usuń zadanie: ${esc(task.name || "Zadanie")}"
            >${iconTrash()}</button>
          </div>
        </td>
        <td class="v2-task-col-duration" data-col="duration">${durationCell}</td>
        <td class="v2-task-col-icons" data-col="icons">${linked}</td>
      </tr>`;
  }

  /** Suma dni liści pod zadaniem (nadrzędne = suma dzieci, nie max równoległych). */
  function workflowRolledDurationDays(tasks, taskId, memo = new Map()) {
    const id = String(taskId || "");
    if (!id) return 0;
    if (memo.has(id)) return memo.get(id);
    const list = Array.isArray(tasks) ? tasks : [];
    const childIds =
      typeof getWorkflowChildIds === "function"
        ? getWorkflowChildIds(list).get(id) || []
        : list.filter((t) => String(t.parentId || "") === id).map((t) => t.id);
    let days = 0;
    if (childIds.length) {
      days = childIds.reduce(
        (sum, childId) => sum + workflowRolledDurationDays(list, childId, memo),
        0
      );
    } else {
      const leaf = list.find((t) => String(t.id) === id);
      const raw = Number(leaf?.durationDays);
      days = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
    }
    memo.set(id, days);
    return days;
  }

  /**
   * Układ Gantta szablonu workflow w dniach kalendarzowych:
   * - liść: durationDays (min. 1 do edycji, jeśli brak — 1)
   * - rodzic: suma dzieci, belka obejmuje dzieci
   * - rodzeństwo: jedno po drugim (suma, nie nakładanie)
   */
  function workflowDisplaySpans(path) {
    const list = Array.isArray(path?.tasks) ? path.tasks : [];
    const spans = new Map();
    if (!list.length) return spans;

    const childIds =
      typeof getWorkflowChildIds === "function"
        ? getWorkflowChildIds(list)
        : new Map();
    const taskMap =
      typeof getWorkflowTaskMap === "function"
        ? getWorkflowTaskMap(list)
        : new Map(list.map((t) => [t.id, t]));
    const rollMemo = new Map();
    const anchor = v2GanttNoon(new Date());
    const addDays =
      typeof addDaysIso === "function"
        ? (date, n) => v2GanttNoon(addDaysIso(date, n))
        : (date, n) =>
            v2GanttNoon(
              new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
            );

    const placeGroup = (parentId, floorStart) => {
      const siblings =
        typeof getWorkflowSiblingIds === "function"
          ? getWorkflowSiblingIds(list, parentId)
          : childIds.get(parentId || "") || [];
      let cursor = floorStart;
      siblings.forEach((sid) => {
        const task = taskMap.get(sid);
        if (!task) return;
        const kids = childIds.get(sid) || [];
        const rolled = workflowRolledDurationDays(list, sid, rollMemo);
        const start = cursor;
        if (kids.length) {
          placeGroup(sid, start);
          const childSpans = kids.map((id) => spans.get(id)).filter(Boolean);
          if (childSpans.length) {
            const minStart = new Date(
              Math.min(...childSpans.map((s) => s.start.getTime()))
            );
            const maxEnd = new Date(
              Math.max(...childSpans.map((s) => s.end.getTime()))
            );
            const coverDays = Math.max(1, v2GanttDayDiff(minStart, maxEnd) + 1);
            spans.set(sid, {
              start: v2GanttNoon(minStart),
              end: v2GanttNoon(maxEnd),
              duration: rolled,
              displayDays: coverDays,
              summary: true,
            });
            cursor = addDays(maxEnd, 1);
          } else {
            const dayCount = Math.max(rolled, 1);
            const end = addDays(start, dayCount - 1);
            spans.set(sid, {
              start,
              end,
              duration: rolled,
              displayDays: dayCount,
              summary: true,
            });
            cursor = addDays(end, 1);
          }
        } else {
          const dayCount = Math.max(rolled || 1, 1);
          const end = addDays(start, dayCount - 1);
          spans.set(sid, {
            start,
            end,
            duration: rolled,
            displayDays: dayCount,
            summary: false,
          });
          cursor = addDays(end, 1);
        }
      });
    };

    placeGroup(null, anchor);
    return spans;
  }

  async function confirmDeleteV2WorkflowTask(path, taskId) {
    const tasks = path?.tasks || [];
    const task = tasks.find((item) => String(item.id) === String(taskId));
    if (!task) return false;
    const removeIds =
      typeof collectDescendantTaskIds === "function"
        ? collectDescendantTaskIds(tasks, taskId)
        : new Set([String(taskId)]);
    const kids = Math.max(0, removeIds.size - 1);
    const ok = await confirmV2Dialog({
      title: "Usuń zadanie",
      message: `Czy na pewno chcesz usunąć to zadanie i wszystkie podrzędne zadania?\n\n„${
        task.name || "Zadanie"
      }”`,
      confirmLabel: "Usuń",
      cancelLabel: "Anuluj",
      danger: true,
    });
    if (!ok) return false;
    ensureV2GlobalWorkflowRuntime();
    if (typeof setActiveWorkflowPathId === "function") {
      setActiveWorkflowPathId(path.id);
    }
    if (typeof deleteWorkflowTask !== "function") return false;
    deleteWorkflowTask(taskId);
    showV2Toast(kids > 0 ? `Usunięto zadanie i ${kids} podzadań` : "Usunięto zadanie");
    return true;
  }

  function workflowTasksListHtml(path) {
    const tasks =
      typeof getVisibleWorkflowTasks === "function"
        ? getVisibleWorkflowTasks(path.id, path.tasks || [])
        : [];
    if (!(path.tasks || []).length) {
      return `<p class="v2-docs-empty">Brak zadań. Dodaj pierwsze zadanie przyciskiem „+ Zadanie”.</p>`;
    }
    const rollMemo = new Map();
    const rows = tasks.map((task) => workflowTaskRowHtml(path, task, rollMemo)).join("");
    return `
      <div class="v2-tasks-table-wrap" data-role="v2-wf-tasks-table-wrap">
        <table class="v2-tasks-table" data-role="v2-wf-tasks-table">
          <colgroup>
            <col style="width:72%" />
            <col style="width:16%" />
            <col style="width:12%" />
          </colgroup>
          <thead>
            <tr class="v2-tasks-head-row">
              <th class="v2-task-col-name" scope="col"><span class="v2-th-label">Zadanie</span></th>
              <th class="v2-task-col-duration" scope="col"><span class="v2-th-label">Czas (dni)</span></th>
              <th class="v2-task-col-icons" scope="col"><span class="v2-th-label">Dok.</span></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function workflowGanttViewHtml(path) {
    const all =
      typeof getWorkflowTasksForRender === "function"
        ? getWorkflowTasksForRender(path.id, path.tasks || [])
        : [];
    if (!all.length) {
      return `<p class="v2-docs-empty">Brak zadań. Dodaj pierwsze zadanie przyciskiem „+ Zadanie”.</p>`;
    }

    const spanMap = workflowDisplaySpans(path);
    const scale =
      typeof getGanttScale === "function" && getGanttScale() === "week" ? "week" : "month";

    const rows = all.map((task) => {
      const span = spanMap.get(task.id) || null;
      return {
        task,
        span,
        treeHidden: Boolean(task.collapsedAway),
        expanded: Boolean(task.expanded),
      };
    });

    const scheduled = rows.filter((row) => row.span);
    const padPast = 14;
    const padFuture = 90;
    let rangeStart;
    let rangeEnd;
    if (scheduled.length) {
      rangeStart = v2GanttNoon(
        new Date(Math.min(...scheduled.map((row) => row.span.start.getTime())))
      );
      rangeEnd = v2GanttNoon(
        new Date(Math.max(...scheduled.map((row) => row.span.end.getTime())))
      );
    } else {
      const today = new Date();
      rangeStart = v2GanttNoon(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() - padPast)
      );
      rangeEnd = v2GanttNoon(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() + padFuture)
      );
    }
    rangeStart = v2GanttNoon(
      new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() - padPast)
    );
    rangeEnd = v2GanttNoon(
      new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() + padFuture)
    );

    const totalDays = Math.max(1, v2GanttDayDiff(rangeStart, rangeEnd) + 1);
    const dayWidth = scale === "week" ? 32 : 12;
    const timelineWidth = totalDays * dayWidth;
    const ticks =
      scale === "week" && typeof ganttWeekTicks === "function"
        ? ganttWeekTicks(rangeStart, rangeEnd)
        : typeof ganttMonthTicks === "function"
          ? ganttMonthTicks(rangeStart, rangeEnd)
          : [];
    const todayNoon = v2GanttNoon(new Date());
    const todayOffset = v2GanttDayDiff(rangeStart, todayNoon);
    const showToday = todayOffset >= 0 && todayOffset < totalDays;
    const rangeStartIso =
      typeof toIsoDateOnly === "function" ? toIsoDateOnly(rangeStart) : "";
    const rangeEndIso =
      typeof toIsoDateOnly === "function" ? toIsoDateOnly(rangeEnd) : "";

    const tickHead = ticks
      .map((tick) => {
        const left = v2GanttDayDiff(rangeStart, tick.start) * dayWidth;
        const width = (v2GanttDayDiff(tick.start, tick.end) + 1) * dayWidth;
        return `<div class="v2-gantt-tick" style="left:${left}px;width:${width}px">${esc(
          tick.label
        )}</div>`;
      })
      .join("");

    const bodyRows = rows
      .map(({ task, span, treeHidden, expanded }) => {
        const depth = Math.max(0, Number(task.depth) || 0);
        const depthTone = Math.min(3, depth);
        const isSummary = Boolean(task.hasChildren || span?.summary);
        const rolledDays = Number(span?.duration) || 0;
        const displayDays = span
          ? Math.max(
              1,
              Number(span.displayDays) || v2GanttDayDiff(span.start, span.end) + 1
            )
          : 0;
        const startIso =
          span && typeof toIsoDateOnly === "function" ? toIsoDateOnly(span.start) : "";
        const endIso =
          span && typeof toIsoDateOnly === "function" ? toIsoDateOnly(span.end) : "";
        const dateLine = span
          ? isSummary
            ? `Suma: ${rolledDays} dni`
            : `${rolledDays > 0 ? rolledDays : displayDays} dni`
          : "Brak czasu";
        const left = span ? v2GanttDayDiff(rangeStart, span.start) * dayWidth : 0;
        const width = span
          ? Math.max(dayWidth, displayDays * dayWidth)
          : 0;
        const expandBtn = task.hasChildren
          ? `<button
              type="button"
              class="v2-gantt-toggle${expanded ? " is-open" : ""}"
              data-role="v2-wf-task-toggle"
              data-task-id="${esc(task.id)}"
              aria-expanded="${expanded ? "true" : "false"}"
              title="${expanded ? "Zwiń" : "Rozwiń"}"
            >${expanded ? "−" : "+"}</button>`
          : `<span class="v2-gantt-toggle-spacer" aria-hidden="true"></span>`;
        const barHtml = span
          ? `<div
              class="v2-gantt-bar is-depth-${depthTone}${isSummary ? " is-summary" : ""}"
              data-role="v2-wf-gantt-bar"
              data-task-id="${esc(task.id)}"
              data-path-id="${esc(path.id)}"
              data-summary="${isSummary ? "1" : "0"}"
              data-start="${esc(startIso)}"
              data-end="${esc(endIso)}"
              data-duration="${isSummary ? rolledDays : Math.max(rolledDays || displayDays, 1)}"
              style="left:${left}px;width:${width}px"
              title="${esc(`${task.name || "Zadanie"} · ${dateLine}`)}"
            >
              ${
                isSummary
                  ? ""
                  : `<span class="v2-gantt-handle is-start" data-role="v2-wf-gantt-resize" data-edge="start"></span>`
              }
              <span class="v2-gantt-bar-label">${esc(task.name || "Zadanie")}</span>
              <span class="v2-gantt-bar-pct">${
                isSummary ? rolledDays : Math.max(rolledDays || displayDays, 1)
              }d</span>
              ${
                isSummary
                  ? ""
                  : `<span class="v2-gantt-handle is-end" data-role="v2-wf-gantt-resize" data-edge="end"></span>`
              }
            </div>`
          : `<div class="v2-gantt-unscheduled" title="Ustaw czas trwania">Bez czasu</div>`;

        return `
          <div
            class="v2-gantt-row${task.hasChildren ? " has-children" : ""}${
              treeHidden ? " is-tree-hidden" : ""
            }"
            data-role="v2-gantt-row"
            data-task-id="${esc(task.id)}"
            data-depth="${depth}"
            style="--v2-gantt-depth:${depth}"
            ${treeHidden ? "hidden" : ""}
          >
            <div class="v2-gantt-label" style="--v2-gantt-depth:${depth}">
              ${expandBtn}
              <button
                type="button"
                class="v2-gantt-label-btn"
                data-role="v2-wf-rename-task"
                data-task-id="${esc(task.id)}"
                title="Zmień nazwę"
              >
                <strong>${esc(task.name || "Zadanie")}</strong>
                <span>${esc(dateLine)}</span>
              </button>
              <button
                type="button"
                class="v2-task-add-child"
                data-role="v2-wf-add-child"
                data-task-id="${esc(task.id)}"
                title="Dodaj podzadanie"
                aria-label="Dodaj podzadanie"
              >+</button>
              <button
                type="button"
                class="v2-icon-btn v2-wf-task-action"
                data-role="v2-wf-set-blocks"
                data-task-id="${esc(task.id)}"
                title="Wymaga wykonania (bloczki)"
                aria-label="Ustaw zależności"
              >${iconWfBlocks()}</button>
              <button
                type="button"
                class="v2-icon-btn v2-wf-task-action"
                data-role="v2-wf-link-doc"
                data-task-id="${esc(task.id)}"
                title="Powiąż dokument formalny"
                aria-label="Powiąż dokument formalny"
              >${iconWfLinkDoc()}</button>
              <button
                type="button"
                class="v2-icon-btn is-danger v2-wf-task-delete"
                data-role="v2-wf-delete-task"
                data-task-id="${esc(task.id)}"
                title="Usuń zadanie"
                aria-label="Usuń zadanie: ${esc(task.name || "Zadanie")}"
              >${iconTrash()}</button>
            </div>
            <div
              class="v2-gantt-track"
              style="width:${timelineWidth}px;background-size:${dayWidth}px 100%"
            >${barHtml}</div>
          </div>`;
      })
      .join("");

    return `
      <div
        class="v2-gantt"
        data-role="v2-wf-gantt-view"
        data-path-id="${esc(path.id)}"
        data-range-start="${esc(rangeStartIso)}"
        data-day-width="${dayWidth}"
        data-timeline-width="${timelineWidth}"
      >
        <div class="v2-gantt-toolbar">
          <p class="v2-gantt-range">
            ${esc(v2TaskDateLabel(rangeStartIso))} – ${esc(v2TaskDateLabel(rangeEndIso))}
            · krawędź belki = czas · + = podzadanie · bloczki / dokument przy nazwie
          </p>
          <div class="v2-gantt-scale" role="group" aria-label="Skala czasu">
            <button
              type="button"
              class="v2-gantt-scale-btn${scale === "week" ? " is-active" : ""}"
              data-role="v2-wf-gantt-scale"
              data-scale="week"
              aria-pressed="${scale === "week" ? "true" : "false"}"
            >Tydzień</button>
            <button
              type="button"
              class="v2-gantt-scale-btn${scale === "month" ? " is-active" : ""}"
              data-role="v2-wf-gantt-scale"
              data-scale="month"
              aria-pressed="${scale === "month" ? "true" : "false"}"
            >Miesiąc</button>
          </div>
        </div>
        <div class="v2-gantt-scroll" data-role="v2-gantt-pan">
          <div
            class="v2-gantt-chart"
            style="--v2-gantt-label-width:15rem;--v2-gantt-day-width:${dayWidth}px;--v2-gantt-timeline-width:${timelineWidth}px"
          >
            <div class="v2-gantt-head">
              <div class="v2-gantt-label-head">Zadanie</div>
              <div
                class="v2-gantt-timeline-head"
                style="width:${timelineWidth}px;background-size:${dayWidth}px 100%"
              >
                <div class="v2-gantt-ticks">${tickHead}</div>
                ${
                  showToday
                    ? `<div class="v2-gantt-today" style="left:${
                        todayOffset * dayWidth + dayWidth / 2
                      }px" title="Dziś"></div>`
                    : ""
                }
              </div>
            </div>
            <div class="v2-gantt-body" data-role="v2-gantt-body">${bodyRows}</div>
          </div>
        </div>
      </div>`;
  }

  function workflowTasksPanelHtml(path) {
    const viewMode = getV2WorkflowViewMode();
    return viewMode === "gantt" ? workflowGanttViewHtml(path) : workflowTasksListHtml(path);
  }

  function workflowDocsTabHtml(path) {
    const docs =
      typeof listAllPotentialWorkflowDocuments === "function"
        ? listAllPotentialWorkflowDocuments()
        : [];
    const linked =
      typeof getLinkedDocIdsForPath === "function"
        ? getLinkedDocIdsForPath(path)
        : new Set();
    if (!docs.length) {
      return `<p class="v2-docs-empty">Brak katalogu dokumentów formalnych.</p>`;
    }
    const groups = new Map();
    docs.forEach((doc) => {
      const group = String(doc.group || "Inne");
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(doc);
    });
    const sections = [...groups.entries()]
      .map(([group, items]) => {
        const rows = items
          .map((doc) => {
            const isLinked = linked.has(String(doc.id));
            const task =
              typeof findWorkflowTaskByDocId === "function"
                ? findWorkflowTaskByDocId(path, doc.id)
                : null;
            return `
              <tr data-doc-id="${esc(doc.id)}">
                <td class="v2-wf-doc-check-cell">
                  <label class="v2-wf-doc-check">
                    <input
                      type="checkbox"
                      data-role="v2-wf-doc-link"
                      data-doc-id="${esc(doc.id)}"
                      ${isLinked ? "checked" : ""}
                      title="${
                        isLinked
                          ? "Odznacz, aby odpiąć dokument od zadania"
                          : "Zaznacz, aby utworzyć zadanie produkcyjne i powiązać dokument"
                      }"
                    />
                    <span class="v2-wf-doc-check-mark" aria-hidden="true"></span>
                  </label>
                </td>
                <td>
                  <div class="v2-wf-doc-title">${esc(doc.title || doc.id)}</div>
                  ${
                    task
                      ? `<div class="v2-wf-doc-meta">Powiązane z: ${esc(task.name || "Zadanie")}</div>`
                      : doc.ruleHint
                        ? `<div class="v2-wf-doc-meta">${esc(doc.ruleHint)}</div>`
                        : ""
                  }
                </td>
              </tr>`;
          })
          .join("");
        return `
          <section class="v2-wf-doc-group">
            <h3 class="v2-wf-doc-group-title">${esc(group)}</h3>
            <table class="v2-excel v2-wf-docs-table">
              <colgroup>
                <col style="width:3rem" />
                <col />
              </colgroup>
              <tbody>${rows}</tbody>
            </table>
          </section>`;
      })
      .join("");
    return `<div class="v2-wf-docs" data-role="v2-wf-docs">${sections}</div>`;
  }

  function workflowPathDetailHtml(path, tab) {
    const activeTab = tab === "docs" ? "docs" : "tasks";
    const viewMode = getV2WorkflowViewMode();
    return `
      <div class="v2-doc-work" data-role="v2-workflow-path" data-path-id="${esc(path.id)}">
        <header class="v2-doc-work-head v2-tasks-head">
          <div class="v2-tasks-head-copy">
            <button type="button" class="v2-back-btn" data-role="v2-wf-back">← Workflow</button>
            <h2 class="v2-projects-title">${esc(path.name || "Ścieżka")}</h2>
            <p class="v2-doc-work-meta">${
              activeTab === "docs"
                ? "Wszystkie dokumenty formalne — zaznaczone są powiązane z zadaniem"
                : viewMode === "gantt"
                  ? "Gantt — przeciągnij krawędź belki, aby ustawić czas trwania"
                  : "Hierarchia zadań ścieżki workflow"
            }</p>
          </div>
          <div class="v2-tasks-head-actions">
            <div class="v2-building-tabs" role="tablist" aria-label="Zakładki ścieżki">
              <button
                type="button"
                class="v2-building-tab${activeTab === "tasks" ? " is-active" : ""}"
                data-role="v2-wf-tab"
                data-tab="tasks"
                aria-selected="${activeTab === "tasks" ? "true" : "false"}"
              >Zadania</button>
              <button
                type="button"
                class="v2-building-tab${activeTab === "docs" ? " is-active" : ""}"
                data-role="v2-wf-tab"
                data-tab="docs"
                aria-selected="${activeTab === "docs" ? "true" : "false"}"
              >Dokumentacja formalna</button>
            </div>
            ${activeTab === "tasks" ? v2WorkflowViewSwitcherHtml(viewMode) : ""}
            ${
              activeTab === "tasks"
                ? `<button
                    type="button"
                    class="v2-section-btn"
                    data-role="v2-wf-add-root"
                    title="Dodaj zadanie główne"
                  >+ Zadanie</button>`
                : ""
            }
          </div>
        </header>
        <section class="v2-doc-work-panel v2-tasks-panel" data-role="v2-wf-panel">
          ${
            activeTab === "docs"
              ? workflowDocsTabHtml(path)
              : workflowTasksPanelHtml(path)
          }
        </section>
      </div>`;
  }

  function remountV2WorkflowPath() {
    if (v2Route.name !== "workflow-path") return;
    const pathId = String(v2Route.pathId || "");
    ensureV2GlobalWorkflowRuntime();
    if (typeof setActiveWorkflowPathId === "function") setActiveWorkflowPathId(pathId);
    const path =
      typeof getActiveWorkflowPath === "function" ? getActiveWorkflowPath() : null;
    if (!path || String(path.id) !== pathId) {
      v2Route = { name: "workflow" };
      mountV2();
      return;
    }
    const root = document.querySelector('[data-role="v2-root"]');
    if (!root) return;
    root.innerHTML = workflowPathDetailHtml(path, v2Route.tab || "tasks");
    bindWorkflowPathDetail(root, path);
    syncV2Topbar();
  }

  function bindWorkflowGanttBoard(root, path) {
    const gantt = root.querySelector('[data-role="v2-wf-gantt-view"]');
    if (!gantt) return;
    const dayWidth = Number(gantt.dataset.dayWidth) || 16;
    const timelineWidth = Number(gantt.dataset.timelineWidth) || 0;

    root.querySelectorAll('[data-role="v2-wf-gantt-scale"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const scale = btn.dataset.scale === "week" ? "week" : "month";
        if (typeof getGanttScale === "function" && getGanttScale() === scale) return;
        if (typeof setGanttScale === "function") setGanttScale(scale);
        remountV2WorkflowPath();
      });
    });

    const applyBarGeometry = (bar, leftPx, widthPx) => {
      let left = Math.round(leftPx / dayWidth) * dayWidth;
      let width = Math.max(dayWidth, Math.round(widthPx / dayWidth) * dayWidth);
      if (left < 0) left = 0;
      if (timelineWidth > 0 && left + width > timelineWidth) {
        width = Math.max(dayWidth, timelineWidth - left);
      }
      bar.style.left = `${left}px`;
      bar.style.width = `${width}px`;
      const dayCount = Math.max(1, Math.round(width / dayWidth));
      bar.dataset.duration = String(dayCount);
      const pct = bar.querySelector(".v2-gantt-bar-pct");
      if (pct) pct.textContent = `${dayCount}d`;
      const row = bar.closest('[data-role="v2-gantt-row"]');
      const datesEl = row?.querySelector(".v2-gantt-label-btn span");
      if (datesEl) {
        const label = datesEl.textContent || "";
        const rest = label.includes("·") ? label.split("·").slice(1).join("·").trim() : "";
        datesEl.textContent = rest ? `${dayCount} dni · ${rest}` : `${dayCount} dni`;
      }
      return dayCount;
    };

    gantt.querySelectorAll('[data-role="v2-wf-gantt-bar"]').forEach((bar) => {
      bar.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        if (bar.dataset.summary === "1" || bar.classList.contains("is-summary")) return;
        event.preventDefault();
        event.stopPropagation();

        const handle = event.target.closest('[data-role="v2-wf-gantt-resize"]');
        const mode = handle?.dataset.edge === "start" ? "resize-start" : "resize-end";
        const originX = event.clientX;
        const originLeft = parseFloat(bar.style.left) || 0;
        const originWidth = parseFloat(bar.style.width) || dayWidth;
        const originDuration =
          Number(bar.dataset.duration) || Math.round(originWidth / dayWidth) || 1;
        bar.classList.add("is-dragging");

        const onMove = (moveEvent) => {
          const dx = moveEvent.clientX - originX;
          if (mode === "resize-start") {
            const nextLeft = originLeft + dx;
            const nextWidth = originWidth - dx;
            if (nextWidth >= dayWidth) applyBarGeometry(bar, nextLeft, nextWidth);
          } else {
            applyBarGeometry(bar, originLeft, originWidth + dx);
          }
        };

        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          bar.classList.remove("is-dragging");
          const taskId = String(bar.dataset.taskId || "");
          const dayCount = Math.max(
            1,
            Number(bar.dataset.duration) ||
              Math.round((parseFloat(bar.style.width) || dayWidth) / dayWidth)
          );
          if (!taskId || dayCount === originDuration) return;
          ensureV2GlobalWorkflowRuntime();
          if (typeof setActiveWorkflowPathId === "function") {
            setActiveWorkflowPathId(path.id);
          }
          if (typeof setWorkflowTaskDuration !== "function") return;
          setWorkflowTaskDuration(taskId, dayCount);
          showV2Toast(`Czas trwania: ${dayCount} dni`);
          remountV2WorkflowPath();
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });
    });

    // Pan scroll jak w projekcie
    const scroller = gantt.querySelector('[data-role="v2-gantt-pan"]');
    if (scroller && scroller.dataset.v2WfPanBound !== "1") {
      scroller.dataset.v2WfPanBound = "1";
      let panning = false;
      let panX = 0;
      let panLeft = 0;
      scroller.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        if (event.target.closest('[data-role="v2-wf-gantt-bar"]')) return;
        if (event.target.closest("button")) return;
        panning = true;
        panX = event.clientX;
        panLeft = scroller.scrollLeft;
        scroller.classList.add("is-panning");
        event.preventDefault();
      });
      window.addEventListener("mousemove", (event) => {
        if (!panning) return;
        scroller.scrollLeft = panLeft - (event.clientX - panX);
      });
      window.addEventListener("mouseup", () => {
        if (!panning) return;
        panning = false;
        scroller.classList.remove("is-panning");
      });
    }
  }

  function bindWorkflowPathDetail(root, path) {
    root.querySelector('[data-role="v2-wf-back"]')?.addEventListener("click", (event) => {
      event.preventDefault();
      goV2Workflow();
    });

    root.querySelectorAll('[data-role="v2-wf-tab"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        openV2WorkflowPath(path.id, btn.dataset.tab === "docs" ? "docs" : "tasks");
      });
    });

    root.querySelectorAll('[data-role="v2-wf-view"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        setV2WorkflowViewMode(btn.dataset.view === "gantt" ? "gantt" : "list");
        remountV2WorkflowPath();
      });
    });

    root.querySelectorAll('[data-role="v2-wf-task-toggle"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const taskId = String(btn.dataset.taskId || "");
        if (!taskId || typeof setWorkflowTaskExpanded !== "function") return;
        const next = !(
          typeof isWorkflowTaskExpanded === "function" &&
          isWorkflowTaskExpanded(path.id, taskId)
        );
        setWorkflowTaskExpanded(path.id, taskId, next);
        remountV2WorkflowPath();
      });
    });

    root.querySelectorAll('[data-role="v2-wf-duration"]').forEach((input) => {
      const commit = () => {
        const taskId = String(input.dataset.taskId || "");
        if (!taskId || typeof setWorkflowTaskDuration !== "function") return;
        ensureV2GlobalWorkflowRuntime();
        if (typeof setActiveWorkflowPathId === "function") {
          setActiveWorkflowPathId(path.id);
        }
        const raw = String(input.value || "").trim();
        const days = raw === "" ? null : Number(raw);
        setWorkflowTaskDuration(taskId, days);
        showV2Toast(
          days && days > 0 ? `Czas trwania: ${Math.round(days)} dni` : "Wyczyszczono czas trwania"
        );
        remountV2WorkflowPath();
      };
      input.addEventListener("change", commit);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          input.blur();
        }
      });
    });

    root.querySelectorAll('[data-role="v2-wf-delete-task"]').forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const taskId = String(btn.dataset.taskId || "");
        if (!taskId) return;
        const removed = await confirmDeleteV2WorkflowTask(path, taskId);
        if (!removed) return;
        remountV2WorkflowPath();
      });
    });

    root.querySelectorAll('[data-role="v2-wf-link-doc"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const taskId = String(btn.dataset.taskId || "");
        if (!taskId) return;
        openV2WorkflowDocPicker(path, taskId);
      });
    });

    root.querySelectorAll('[data-role="v2-wf-set-blocks"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const taskId = String(btn.dataset.taskId || "");
        if (!taskId) return;
        openV2WorkflowBlocksPicker(path, taskId);
      });
    });

    bindWorkflowGanttBoard(root, path);

    root
      .querySelector('[data-role="v2-wf-add-root"]')
      ?.addEventListener("click", async (event) => {
        event.preventDefault();
        ensureV2GlobalWorkflowRuntime();
        if (typeof setActiveWorkflowPathId === "function") {
          setActiveWorkflowPathId(path.id);
        }
        const name = await promptV2Text({
          title: "Nowe zadanie",
          label: "Nazwa zadania",
          placeholder: "np. Przygotowanie wniosku",
          confirmLabel: "Dodaj",
        });
        if (!name || typeof createWorkflowTask !== "function") return;
        const created = createWorkflowTask(name, null);
        if (!created) return;
        showV2Toast(`Dodano zadanie: ${created.name}`);
        remountV2WorkflowPath();
      });

    root.querySelectorAll('[data-role="v2-wf-add-child"]').forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const parentId = String(btn.dataset.taskId || "");
        ensureV2GlobalWorkflowRuntime();
        if (typeof setActiveWorkflowPathId === "function") {
          setActiveWorkflowPathId(path.id);
        }
        const name = await promptV2Text({
          title: "Nowe podzadanie",
          label: "Nazwa podzadania",
          placeholder: "np. Załączniki",
          confirmLabel: "Dodaj",
        });
        if (!name || typeof createWorkflowTask !== "function") return;
        if (typeof setWorkflowTaskExpanded === "function") {
          setWorkflowTaskExpanded(path.id, parentId, true);
        }
        const created = createWorkflowTask(name, parentId);
        if (!created) return;
        showV2Toast(`Dodano podzadanie: ${created.name}`);
        remountV2WorkflowPath();
      });
    });

    root.querySelectorAll('[data-role="v2-wf-rename-task"]').forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        const taskId = String(btn.dataset.taskId || "");
        const current = String(btn.textContent || "").trim();
        ensureV2GlobalWorkflowRuntime();
        if (typeof setActiveWorkflowPathId === "function") {
          setActiveWorkflowPathId(path.id);
        }
        const name = await promptV2Text({
          title: "Zmień nazwę zadania",
          label: "Nazwa",
          initial: current,
          confirmLabel: "Zapisz",
        });
        if (!name || typeof renameWorkflowTask !== "function") return;
        renameWorkflowTask(taskId, name);
        showV2Toast("Zapisano nazwę");
        remountV2WorkflowPath();
      });
    });

    root.querySelectorAll('[data-role="v2-wf-doc-link"]').forEach((input) => {
      input.addEventListener("change", (event) => {
        event.preventDefault();
        const docId = String(input.dataset.docId || "");
        if (!docId) return;
        ensureV2GlobalWorkflowRuntime();
        if (typeof setActiveWorkflowPathId === "function") {
          setActiveWorkflowPathId(path.id);
        }
        const current =
          typeof getActiveWorkflowPath === "function" ? getActiveWorkflowPath() : path;
        const existing =
          typeof findWorkflowTaskByDocId === "function"
            ? findWorkflowTaskByDocId(current, docId)
            : null;

        if (!input.checked) {
          if (existing && typeof linkWorkflowTaskDocument === "function") {
            linkWorkflowTaskDocument(existing.id, null);
            showV2Toast("Odpięto dokument od zadania");
          }
          remountV2WorkflowPath();
          return;
        }

        if (existing) {
          remountV2WorkflowPath();
          return;
        }

        const docs =
          typeof listAllPotentialWorkflowDocuments === "function"
            ? listAllPotentialWorkflowDocuments()
            : [];
        const doc = docs.find((item) => String(item.id) === docId);
        const title = doc?.title || docId;
        const taskName =
          typeof workflowProductionTaskName === "function"
            ? workflowProductionTaskName(title)
            : `Produkcja: ${title}`;
        if (typeof createWorkflowTask !== "function") return;
        const created = createWorkflowTask(taskName, null);
        if (created && typeof linkWorkflowTaskDocument === "function") {
          linkWorkflowTaskDocument(created.id, docId);
        }
        showV2Toast(`Powiązano dokument: ${title}`);
        remountV2WorkflowPath();
      });
    });
  }

  function mountV2() {
    const root = document.querySelector('[data-role="v2-root"]');
    if (!root) return;

    document.removeEventListener("keydown", onV2TaskSheetKeydown, true);
    if (!(v2Route.name === "edit-project" && v2Route.taskId)) {
      clearV2TaskFocusMode();
      document.querySelector('[data-role="v2-task-sheet-root"]')?.remove();
    }

    if (
      !v2SkipHistoryPush &&
      v2LastMountedRoute &&
      !routesEqual(v2LastMountedRoute, v2Route)
    ) {
      rememberV2History(v2LastMountedRoute);
    }
    v2SkipHistoryPush = false;
    v2LastMountedRoute = cloneV2Route(v2Route);
    persistV2Route(v2Route);
    syncV2SidebarNav();

    if (v2Route.name === "configuration") {
      const tab = v2Route.tab === "statuses" ? "statuses" : "statuses";
      v2Route = { name: "configuration", tab };
      try {
        root.innerHTML = v2ConfigurationPageHtml(tab);
        bindV2Configuration(root);
      } catch (err) {
        console.error("[v2] configuration mount", err);
        root.innerHTML = `
          <section class="v2-config" data-role="v2-config">
            <header class="v2-config-head">
              <h2 class="v2-projects-title">Konfiguracja</h2>
            </header>
            <p class="v2-docs-empty">Nie udało się załadować ustawień. Odśwież stronę.</p>
          </section>`;
      }
      syncV2Topbar();
      return;
    }

    if (v2Route.name === "workflow") {
      ensureV2GlobalWorkflowRuntime();
      root.innerHTML = workflowListHtml();
      bindWorkflowList(root);
      syncV2Topbar();
      return;
    }

    if (v2Route.name === "workflow-path") {
      ensureV2GlobalWorkflowRuntime();
      const pathId = String(v2Route.pathId || "");
      if (typeof setActiveWorkflowPathId === "function") setActiveWorkflowPathId(pathId);
      const path =
        typeof getActiveWorkflowPath === "function" ? getActiveWorkflowPath() : null;
      if (!path || String(path.id) !== pathId) {
        v2Route = { name: "workflow" };
        mountV2();
        return;
      }
      v2Route = {
        name: "workflow-path",
        pathId,
        tab: v2Route.tab === "docs" ? "docs" : "tasks",
      };
      root.innerHTML = workflowPathDetailHtml(path, v2Route.tab);
      bindWorkflowPathDetail(root, path);
      syncV2Topbar();
      return;
    }

    if (v2Route.name === "new-project") {
      root.innerHTML = projectFormHtml({ mode: "new" });
      bindProjectForm(root);
      syncV2Topbar();
      return;
    }

    if (v2Route.name === "edit-project") {
      const project =
        typeof getProjectById === "function" ? getProjectById(v2Route.projectId) : null;
      if (!project) {
        v2Route = { name: "home" };
        mountV2();
        return;
      }
      const editTab = v2Route.tab || "project";
      if (editTab !== "tasks" && v2Route.taskId) {
        const cleared = { ...v2Route, tab: editTab };
        delete cleared.taskId;
        v2Route = cleared;
      } else {
        v2Route = { ...v2Route, tab: editTab };
      }

      if (editTab === "tasks") {
        root.innerHTML = projectTasksExplorerHtml(project);
        bindProjectTasksExplorer(root, project.id);
        mountV2TaskSidePanelIfNeeded(project);
        syncV2Topbar();
        return;
      }

      if (editTab === "permissions") {
        root.innerHTML = `
          <div class="v2-doc-work" data-role="v2-project-permissions-tab">
            <header class="v2-doc-work-head">
              <h2 class="v2-projects-title">Uprawnienia</h2>
              <p class="v2-doc-work-meta">${esc(project.title || "Projekt")}</p>
            </header>
            <section class="v2-doc-work-panel">
              <p class="v2-docs-empty">Uprawnienia — przestrzeń na razie pusta.</p>
            </section>
          </div>`;
        syncV2Topbar();
        return;
      }

      projectFormDraft = {
        code: project.code || "",
        name: project.title || "",
        description: project.description || "",
      };
      root.innerHTML = projectFormHtml({
        mode: "edit",
        project,
      });
      bindProjectForm(root);
      syncV2Topbar();
      return;
    }

    if (v2Route.name === "task-detail") {
      v2Route = {
        name: "edit-project",
        projectId: String(v2Route.projectId || ""),
        tab: "tasks",
        taskId: String(v2Route.taskId || ""),
      };
      mountV2();
      return;
    }

    if (v2Route.name === "plot-detail") {
      const project =
        typeof getProjectById === "function" ? getProjectById(v2Route.projectId) : null;
      let plot = (project?.plots || []).find(
        (item) => String(item.id) === String(v2Route.plotId)
      );
      if (!project || !plot) {
        v2Route = project
          ? { name: "edit-project", projectId: String(project.id), tab: "project" }
          : { name: "home" };
        mountV2();
        return;
      }
      plot = ensurePlotMeta(String(project.id), plot);
      root.innerHTML = plotDetailHtml(project, plot);
      bindPlotDetail(root, String(project.id), String(plot.id));
      syncV2Topbar();
      return;
    }

    if (v2Route.name === "doc-detail") {
      leaveDocFormContext();
      const project =
        typeof getProjectById === "function" ? getProjectById(v2Route.projectId) : null;
      const doc = getProjectFormDocuments(project || {}).find(
        (item) => String(item.id) === String(v2Route.docId)
      );
      if (!project || !doc) {
        v2Route = project
          ? { name: "edit-project", projectId: String(project.id), tab: "project" }
          : { name: "home" };
        mountV2();
        return;
      }
      root.innerHTML = docWorkPanelHtml(project, doc);
      bindDocWorkPanel(root, project.id, doc.id);
      syncV2Topbar();
      return;
    }

    if (v2Route.name === "tasks") {
      const project =
        typeof getProjectById === "function" ? getProjectById(v2Route.projectId) : null;
      if (!project) {
        v2Route = { name: "home" };
        mountV2();
        return;
      }
      v2Route = {
        name: "edit-project",
        projectId: String(project.id),
        tab: "tasks",
      };
      mountV2();
      return;
    }

    if (isProjectDocsRoute()) {
      const project =
        typeof getProjectById === "function" ? getProjectById(v2Route.projectId) : null;
      if (!project) {
        v2Route = { name: "home" };
        mountV2();
        return;
      }
      v2Route = { name: "project-docs", projectId: String(project.id) };
      root.innerHTML = projectDocsPageHtml(project);
      bindProjectDocs(root);
      syncV2Topbar();
      return;
    }

    const homeTab = normalizeHomeTab(v2Route.name === "home" ? v2Route.tab : "projects");
    v2Route = { name: "home", tab: homeTab };
    const projects = typeof loadProjects === "function" ? loadProjects() : [];
    root.innerHTML = homeDashboardHtml(homeTab, projects);
    bindHomeDashboard(root);
    syncV2Topbar();
  }

  function isV2UiActive() {
    return (
      getUiVersion() === "v2" ||
      document.documentElement.getAttribute("data-ui-version") === "v2"
    );
  }

  function bindV2SidebarNav() {
    // Bezpośrednio na linkach — nadpisuje onclick, działa nawet przy cache/starym handlerze
    const bindNav = (view, open) => {
      document.querySelectorAll(`.nav-item[data-view="${view}"]`).forEach((item) => {
        item.onclick = (event) => {
          if (!isV2UiActive()) return;
          event.preventDefault();
          event.stopPropagation();
          open();
        };
      });
    };
    bindNav("configuration", () => goV2Configuration("statuses"));
    bindNav("workflow", () => goV2Workflow());
    bindNav("dashboard", () => goV2Home());
  }

  function bindV2Chrome() {
    bindV2SidebarNav();

    const newBtn = document.querySelector('[data-role="v2-new-project"]');
    if (newBtn && newBtn.dataset.v2Bound !== "1") {
      newBtn.dataset.v2Bound = "1";
      newBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isV2UiActive()) return;
        projectFormDraft = { code: "", name: "", description: "" };
        v2Route = { name: "new-project" };
        mountV2();
      });
    }

    const backBtn = document.querySelector('[data-role="v2-form-back"]');
    if (backBtn && backBtn.dataset.v2Bound !== "1") {
      backBtn.dataset.v2Bound = "1";
      backBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        goBackFromProjectForm();
      });
    }

    const saveBtn = document.querySelector('[data-role="v2-form-save"]');
    if (saveBtn && saveBtn.dataset.v2Bound !== "1") {
      saveBtn.dataset.v2Bound = "1";
      saveBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        saveCurrentProjectForm();
      });
    }

    document.querySelectorAll('[data-role="v2-building-tab"]').forEach((btn) => {
      if (btn.dataset.v2Bound === "1") return;
      btn.dataset.v2Bound = "1";
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (v2Route.name !== "edit-project") return;
        const raw = btn.dataset.tab;
        const tab =
          raw === "tasks" || raw === "permissions" ? raw : "project";
        v2Route = {
          name: "edit-project",
          projectId: String(v2Route.projectId || ""),
          tab,
        };
        mountV2();
      });
    });

    bindV2AiChat();
    syncV2Topbar();
  }

  function syncTopbarAiActive() {
    const btn = document.querySelector('[data-role="topbar-ai-btn"]');
    const chat = document.querySelector('[data-role="v2-ai-chat"]');
    if (!btn) return;
    const open = getUiVersion() === "v2" && chat && !chat.hidden;
    btn.classList.toggle("is-active", Boolean(open));
  }

  function setV2AiOpen(open) {
    const fab = document.querySelector('[data-role="v2-ai-fab"]');
    const chat = document.querySelector('[data-role="v2-ai-chat"]');
    if (!chat) return;

    if (chat._v2AiCloseTimer) {
      clearTimeout(chat._v2AiCloseTimer);
      chat._v2AiCloseTimer = null;
    }

    if (open) {
      if (fab) fab.hidden = true;
      chat.hidden = false;
      chat.classList.remove("is-closing", "is-opening");
      void chat.offsetWidth;
      chat.classList.add("is-opening");
      syncTopbarAiActive();
      const input = chat.querySelector('[data-role="v2-ai-input"]');
      if (input) {
        requestAnimationFrame(() => input.focus());
      }
      return;
    }

    if (chat.hidden || chat.classList.contains("is-closing")) return;

    chat.classList.remove("is-opening");
    void chat.offsetWidth;
    chat.classList.add("is-closing");

    const finishClose = () => {
      chat.classList.remove("is-closing");
      chat.hidden = true;
      chat._v2AiCloseTimer = null;
      if (fab) fab.hidden = true;
      syncTopbarAiActive();
    };

    chat._v2AiCloseTimer = setTimeout(finishClose, 150);
  }

  function syncV2AiVisibility() {
    const fab = document.querySelector('[data-role="v2-ai-fab"]');
    const chat = document.querySelector('[data-role="v2-ai-chat"]');
    if (fab) fab.hidden = true;
    if (!chat) {
      syncTopbarAiActive();
      return;
    }
    if (getUiVersion() !== "v2") {
      chat.hidden = true;
      chat.classList.remove("is-opening", "is-closing");
    }
    syncTopbarAiActive();
  }

  function bindV2AiChat() {
    const fab = document.querySelector('[data-role="v2-ai-fab"]');
    const chat = document.querySelector('[data-role="v2-ai-chat"]');
    const topbarBtn = document.querySelector('[data-role="topbar-ai-btn"]');
    if (!chat) {
      syncV2AiVisibility();
      return;
    }
    if (chat.dataset.v2Bound === "1") {
      syncV2AiVisibility();
      return;
    }
    chat.dataset.v2Bound = "1";
    if (fab) fab.hidden = true;

    const openFromTopbar = (event) => {
      event.preventDefault();
      if (getUiVersion() !== "v2") return;
      if (!chat.hidden) setV2AiOpen(false);
      else setV2AiOpen(true);
    };

    if (topbarBtn && topbarBtn.dataset.v2Bound !== "1") {
      topbarBtn.dataset.v2Bound = "1";
      topbarBtn.addEventListener("click", openFromTopbar);
    }

    if (fab) {
      fab.addEventListener("click", (event) => {
        event.preventDefault();
        setV2AiOpen(true);
      });
    }

    const minimize = chat.querySelector('[data-role="v2-ai-minimize"]');
    if (minimize) {
      minimize.addEventListener("click", (event) => {
        event.preventDefault();
        setV2AiOpen(false);
      });
    }

    const form = chat.querySelector('[data-role="v2-ai-form"]');
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = form.querySelector('[data-role="v2-ai-input"]');
        if (!input || !String(input.value || "").trim()) return;
        input.value = "";
      });
    }

    syncV2AiVisibility();
  }

  function onVersionChange() {
    leaveDocFormContext();
    const deepLink = parseV2DeepLink();
    if (deepLink) {
      try {
        localStorage.setItem("snappoint.uiVersion", "v2");
      } catch (e) {
        /* ignore */
      }
      document.documentElement.setAttribute("data-ui-version", "v2");
    }
    bindV2Chrome();
    syncV2AiVisibility();
    if (getUiVersion() !== "v2") {
      syncV2Topbar();
      return;
    }
    v2NavHistory = [];
    v2LastMountedRoute = null;
    v2SkipHistoryPush = true;
    v2Route = deepLink || loadV2Route() || { name: "home" };
    mountV2();
  }

  window.addEventListener("snappoint:ui-version", onVersionChange);

  window.addEventListener("snappoint:v2-home", () => {
    if (getUiVersion() !== "v2") return;
    goV2Home();
  });

  window.addEventListener("snappoint:v2-workflow", () => {
    if (getUiVersion() !== "v2") return;
    goV2Workflow();
  });

  window.addEventListener("snappoint:v2-configuration", () => {
    if (!isV2UiActive()) return;
    goV2Configuration("statuses");
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onVersionChange);
  } else {
    onVersionChange();
  }
})();
