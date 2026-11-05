const titles = {
  dashboard: "Pulpit",
  "new-project": "Nowy projekt",
  "project-detail": "Projekt",
  projects: "Projekty",
  "building-projects": "Dokument projektu bud.",
  "docs-to-submit": "Dokumenty do złożenia",
  zalaczniki: "Załączniki",
  "tasks-calendar": "Kalendarz zadań",
  users: "Użytkownicy",
  permissions: "Uprawnienia",
  configuration: "Konfiguracja",
  workflow: "Workflow",
  account: "Zarządzanie kontem",
  checklist: "Checklista formalna",
};

const descriptions = {
  dashboard: null,
  projects: "Lista projektów inwestycyjnych pojawi się w kolejnym kroku mockupu.",
  "docs-to-submit": "Dokumenty urzędowe wygenerowane z ankiet formalnych projektów.",
  zalaczniki: "Załączniki ze wszystkich projektów na tym koncie.",
  "tasks-calendar": "Lista wszystkich zadań z projektów — z filtrowaniem.",
  users: "Zarządzanie użytkownikami konta — wkrótce.",
  permissions: "Role i uprawnienia dostępu — wkrótce.",
  configuration: "Statusy Kanban i typy zadań.",
  workflow: "Rozdzielne ścieżki procesów wokół dokumentów systemu.",
  account: "Plan, płatności, zużycie tokenów AI i przestrzeni na załączniki.",
  checklist: "Checklista kompletności dokumentów — wyłączona w tej wersji mockupu.",
};

/** 3 kategorie × 3 typy — wstępna propozycja, do doprecyzowania z architektem */
const attachmentCategories = [
  {
    group: "Rzuty",
    types: [
      {
        id: "rzut-parter",
        label: "Rzut parteru",
        hint: "Układ pomieszczeń kondygnacji zerowej / wejściowej",
      },
      {
        id: "rzut-pietro",
        label: "Rzut kondygnacji powtarzalnej",
        hint: "Piętra typowe, użytkowe lub mieszkalne",
      },
      {
        id: "rzut-dach",
        label: "Rzut dachu / stropodachu",
        hint: "Kształt dachu, spadki, wyłazy, instalacje dachowe",
      },
    ],
  },
  {
    group: "Elewacje i przekroje",
    types: [
      {
        id: "elewacje",
        label: "Elewacje budynku",
        hint: "Widoki zewnętrzne ścian i materiałów elewacyjnych",
      },
      {
        id: "przekroj",
        label: "Przekrój pionowy",
        hint: "Wysokości kondygnacji, warstwy, poziomy użytkowe",
      },
      {
        id: "detal",
        label: "Detal architektoniczny",
        hint: "Węzeł konstrukcyjny, balustrada, obróbka, złącze",
      },
    ],
  },
  {
    group: "Teren i formalności",
    types: [
      {
        id: "pzt",
        label: "Projekt zagospodarowania terenu",
        hint: "Usytuowanie obiektu, dojścia, zieleń, parkingi",
      },
      {
        id: "mapa",
        label: "Mapa do celów projektowych",
        hint: "Podkład geodezyjny działki i sąsiedztwa",
      },
      {
        id: "opis",
        label: "Opis techniczny / oświadczenia",
        hint: "Opis, uzgodnienia branżowe, oświadczenia projektanta",
      },
    ],
  },
];

const PROJECTS_STORAGE_KEY = "snappoint.projects";

const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");
const dashboardShellHtml = content.innerHTML;
const appShell = document.querySelector(".app-shell");
const sidebar = document.querySelector(".sidebar");
const backdrop = document.getElementById("sidebarBackdrop");
const menuToggle = document.getElementById("menuToggle");

const SIDEBAR_COLLAPSED_KEY = "snappoint.sidebarCollapsed";
const AI_CHAT_MINIMIZED_KEY = "snappoint.aiChatMinimized";

function isMobileNav() {
  return window.matchMedia("(max-width: 860px)").matches;
}

function isSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function setSidebarCollapsed(collapsed) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
  applySidebarCollapsedState();
}

function applySidebarCollapsedState() {
  const collapsed = isSidebarCollapsed();
  const desktopCollapsed = collapsed && !isMobileNav();
  appShell?.classList.toggle("is-sidebar-collapsed", desktopCollapsed);
  const label = collapsed ? "Rozwiń menu" : "Zwiń menu";
  if (menuToggle) {
    menuToggle.setAttribute("aria-label", isMobileNav() ? "Otwórz menu" : label);
    menuToggle.setAttribute("title", isMobileNav() ? "Menu" : label);
    menuToggle.setAttribute("aria-expanded", String(!desktopCollapsed));
  }
  document.querySelectorAll('[data-role="toggle-sidebar-rail"]').forEach((btn) => {
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
    btn.setAttribute("aria-expanded", String(!desktopCollapsed));
  });
}

function isAiChatMinimized() {
  try {
    return localStorage.getItem(AI_CHAT_MINIMIZED_KEY) === "1";
  } catch {
    return false;
  }
}

function setAiChatMinimized(minimized) {
  try {
    localStorage.setItem(AI_CHAT_MINIMIZED_KEY, minimized ? "1" : "0");
  } catch {
    /* ignore */
  }
  applyAiChatMinimizedState();
}

function applyAiChatMinimizedState() {
  const minimized = isAiChatMinimized();
  const chats = document.querySelectorAll(".ai-chat");
  chats.forEach((chat) => {
    chat.classList.toggle("is-minimized", minimized);
    const btn = chat.querySelector('[data-role="toggle-ai-chat"]');
    if (!btn) return;
    btn.setAttribute("aria-expanded", String(!minimized));
    btn.setAttribute("title", "Minimalizuj czat");
    btn.setAttribute("aria-label", "Minimalizuj czat AI");
  });
  const fab = document.getElementById("aiChatFab");
  // FAB zastąpiony przyciskiem robota w topbarze — zawsze ukryty
  if (fab) fab.hidden = true;
}

/** @type {{ id: string, name: string, size: number, categoryId: string }[]} */
let projectFiles = [];
let fileIdSeq = 1;
/** @type {string | null} */
let editingProjectId = null;

const DEMO_AUTOFILL = {
  title: "Budynek mieszkalny jednorodzinny — działka nr 12/3, obręb Lipki",
  code: "P-2026-001",
  description:
    "Projekt budowlany domu jednorodzinnego z garażem w zabudowie wolnostojącej. Zakres: architektura, zagospodarowanie terenu oraz komplet załączników formalnych do wniosku o pozwolenie na budowę.",
};

/** @type {string | null} */
let categoryModalFileId = null;
/** @type {string} */
let categoryModalDraftId = "";
/** @type {"new-project" | "project-file" | "pending-attach"} */
let categoryModalMode = "new-project";
/** @type {string} */
let categoryModalProjectId = "";
/** @type {{ name: string, size: number }[]} */
let pendingAttachQueue = [];
let toastTimer = null;

/** Użytkownicy konta — mock do przypisań w projekcie */
const ACCOUNT_USERS = [
  { id: "u-ak", name: "Anna Kowalska", role: "Architekt" },
  { id: "u-jw", name: "Jan Wiśniewski", role: "Konstruktor" },
  { id: "u-mk", name: "Marta Kamińska", role: "Asystent" },
];

const NO_OWNER = { id: "none", name: "Brak właściciela", role: "" };
const CLIENT_OWNER = { id: "client", name: "Klient", role: "Inwestor" };

function getProjectMembers(project) {
  const ids =
    Array.isArray(project?.memberIds) && project.memberIds.length
      ? project.memberIds
      : ACCOUNT_USERS.map((user) => user.id);
  return ACCOUNT_USERS.filter((user) => ids.includes(user.id));
}

function getTaskOwnerOptions(project) {
  return [NO_OWNER, ...getProjectMembers(project), CLIENT_OWNER];
}

function getDefaultTaskOwnerId() {
  return NO_OWNER.id;
}

function getTaskOwnerId(project, taskId, seen = null) {
  const saved = project?.taskOwners?.[taskId];
  if (saved === "" || saved === NO_OWNER.id) return NO_OWNER.id;
  if (saved && getTaskOwnerOptions(project).some((opt) => opt.id === saved)) {
    return saved;
  }
  const visited = seen || new Set();
  if (visited.has(String(taskId))) return getDefaultTaskOwnerId();
  visited.add(String(taskId));
  const parentId = typeof getTaskParentId === "function" ? getTaskParentId(project, taskId) : null;
  if (parentId) return getTaskOwnerId(project, parentId, visited);
  return getDefaultTaskOwnerId();
}

function getTaskDueDate(project, taskId) {
  const id = String(taskId ?? "");
  if (!id) return "";
  const map = project?.taskDueDates || {};
  const value = map[id] ?? map[taskId];
  return typeof value === "string" ? value : "";
}

function getTaskStartDate(project, taskId) {
  const id = String(taskId ?? "");
  if (!id) return "";
  const map = project?.taskStartDates || {};
  const value = map[id] ?? map[taskId];
  return typeof value === "string" ? value : "";
}

/** Automatyczne wyliczanie dat (domyślnie wyłączone — użytkownik ustawia na Gancie). */
function isProjectAutoScheduleEnabled(project) {
  return Boolean(project?.autoScheduleDates);
}

function setProjectAutoScheduleDates(projectId, enabled) {
  const project = getProjectById(projectId);
  if (!project) return null;
  return persistProject({
    ...project,
    autoScheduleDates: Boolean(enabled),
    updatedAt: new Date().toISOString(),
  });
}

function getTaskDescription(project, taskId) {
  const saved = project?.taskDescriptions?.[taskId];
  if (typeof saved === "string") return saved;
  const custom = (project?.customTasks || []).find((item) => String(item.id) === String(taskId));
  return typeof custom?.description === "string" ? custom.description : "";
}

function getTaskNotes(project, taskId) {
  const bag = project?.taskNotes || {};
  const key = String(taskId ?? "");
  const saved = bag[key] ?? bag[taskId];
  return typeof saved === "string" ? saved : "";
}

function persistTaskNotes(projectId, taskId, notes) {
  const project = getProjectById(projectId);
  if (!project || !taskId) return null;
  return persistProject({
    ...project,
    taskNotes: {
      ...(project.taskNotes || {}),
      [String(taskId)]: String(notes || ""),
    },
    updatedAt: new Date().toISOString(),
  });
}

function persistTaskDescription(projectId, taskId, description) {
  const project = getProjectById(projectId);
  if (!project || !taskId) return null;
  const nextDescription = String(description || "").trim();
  const customTasks = (project.customTasks || []).map((task) =>
    String(task.id) === String(taskId) ? { ...task, description: nextDescription } : task
  );
  return persistProject({
    ...project,
    customTasks,
    taskDescriptions: {
      ...(project.taskDescriptions || {}),
      [taskId]: nextDescription,
    },
    updatedAt: new Date().toISOString(),
  });
}

function formatDateOnly(value) {
  if (!value) return "—";
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
    return new Intl.DateTimeFormat("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return value;
  }
}

function taskOwnerOptionsHtml(project, selectedId) {
  return getTaskOwnerOptions(project)
    .map(
      (opt) =>
        `<option value="${escapeHtml(opt.id)}" ${
          selectedId === opt.id ? "selected" : ""
        }>${escapeHtml(opt.name)}</option>`
    )
    .join("");
}

function taskStatusOptionsHtml(selectedId) {
  return getKanbanStatuses()
    .map(
      (opt) =>
        `<option value="${escapeHtml(opt.id)}" ${
          String(selectedId) === String(opt.id) ? "selected" : ""
        }>${escapeHtml(opt.label)}</option>`
    )
    .join("");
}

function persistTaskBoardStatus(projectId, taskId, statusId) {
  const project = getProjectById(projectId);
  if (!project || !taskId) return null;
  const valid = new Set(getKanbanStatuses().map((item) => item.id));
  if (!valid.has(statusId)) return null;

  const flowTasks = project.flowInstance?.tasks || [];
  const customTasks = project.customTasks || [];
  const all = [...flowTasks, ...customTasks];
  let ids = collectDescendantTaskIds(all, taskId);
  if (!all.some((task) => String(task.id) === String(taskId))) {
    ids = collectDescendantTaskIds(collectProjectTasks(project), taskId);
  }

  const board = { ...(project.taskBoardStatus || {}) };
  ids.forEach((id) => {
    board[id] = statusId;
  });

  const next = persistProject({
    ...project,
    taskBoardStatus: board,
    updatedAt: new Date().toISOString(),
  });
  return next ? { project: next, taskIds: [...ids], statusId } : null;
}

function syncTaskStatusDom(projectId, taskIds, statusId) {
  const meta = boardStatusMeta(statusId);
  const idSet = new Set((taskIds || []).map(String));
  content.querySelectorAll('[data-role="task-status"]').forEach((select) => {
    const tid = String(select.dataset.taskId || "");
    if (!idSet.has(tid)) return;
    if (String(select.dataset.projectId || "") && String(select.dataset.projectId) !== String(projectId)) {
      return;
    }
    select.value = statusId;
    const row = select.closest("tr, .tasks-card-item, .task-subtree-item, .kanban-card");
    if (row) {
      if (row.dataset) {
        row.dataset.filterStatusKey = statusId;
        row.dataset.filterStatus = String(meta.label || "").toLowerCase();
        row.dataset.status = statusId;
        row.dataset.statusKey = statusId;
      }
    }
    const subtreeItem = select.closest(".task-subtree-item");
    const statusLabel = subtreeItem?.querySelector(".task-subtree-status");
    if (statusLabel) statusLabel.textContent = meta.label || statusId;
  });

  content.querySelectorAll('[data-role="kanban-card"]').forEach((card) => {
    const tid = String(card.dataset.taskId || "");
    if (!idSet.has(tid)) return;
    if (
      card.dataset.projectId &&
      String(card.dataset.projectId) !== String(projectId)
    ) {
      return;
    }
    card.dataset.status = statusId;
    card.dataset.statusKey = statusId;
    card.classList.remove("is-dragging");
    const zone = content.querySelector(
      `[data-role="kanban-drop"][data-status="${CSS.escape(statusId)}"]`
    );
    if (zone && card.parentElement !== zone) zone.appendChild(card);
  });
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

function persistProject(project) {
  const projects = loadProjects();
  const projectId = String(project?.id ?? "");
  const index = projects.findIndex((item) => String(item.id) === projectId);
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.unshift(project);
  }
  saveProjects(projects);
  return project;
}

function deleteProject(projectId) {
  if (!projectId) return false;
  const next = loadProjects().filter((item) => String(item.id) !== String(projectId));
  saveProjects(next);
  return true;
}

function confirmAndDeleteProject(projectId, { afterView = "building-projects" } = {}) {
  const project = getProjectById(projectId);
  if (!project) return;
  const ok = window.confirm(
    `Usunąć projekt „${project.title}”? Tej operacji nie można cofnąć.`
  );
  if (!ok) return;
  deleteProject(projectId);
  showTypeToast("Usunięto projekt");
  if (afterView === "building-projects") {
    renderView("building-projects");
  } else {
    renderView(afterView);
  }
}

function getProjectById(id) {
  const projectId = String(id ?? "");
  if (!projectId) return null;
  return loadProjects().find((project) => String(project.id) === projectId) || null;
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function setActiveNav(view) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    if (item.classList.contains("is-disabled")) {
      item.classList.remove("is-active");
      return;
    }
    item.classList.toggle("is-active", item.dataset.view === view);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function findCategoryLabel(categoryId) {
  if (!categoryId) return "Wybierz typ…";
  for (const group of attachmentCategories) {
    const type = group.types.find((item) => item.id === categoryId);
    if (type) return type.label;
  }
  return "Wybierz typ…";
}

function filesListHtml() {
  if (projectFiles.length === 0) {
    return `
      <div class="files-empty">
        <p>Brak plików. Dodaj rysunki, mapy lub dokumenty formalne.</p>
      </div>`;
  }

  return `
    <ul class="files-list">
      ${projectFiles
        .map((file) => {
          const hasType = Boolean(file.categoryId);
          return `
        <li class="file-row" data-file-id="${file.id}">
          <div class="file-meta">
            <span class="file-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M8 4h7l3 3v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
                <path d="M15 4v3h3" />
              </svg>
            </span>
            <div>
              <strong class="file-name">${escapeHtml(file.name)}</strong>
              <span class="file-size">${formatBytes(file.size)}</span>
            </div>
          </div>
          <button
            type="button"
            class="type-chip ${hasType ? "is-set" : ""}"
            data-role="open-category"
            data-file-id="${file.id}"
          >
            ${
              hasType
                ? `<span class="type-chip-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  </span>`
                : ""
            }
            <span class="type-chip-text">${findCategoryLabel(file.categoryId)}</span>
          </button>
          <button class="icon-btn file-remove" type="button" data-role="remove" data-file-id="${file.id}" aria-label="Usuń plik">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M6 7h12M10 7V5h4v2M9 7l.6 12h4.8L15 7" />
            </svg>
          </button>
        </li>`;
        })
        .join("")}
    </ul>`;
}

function categoryModalOptionsHtml(selectedId) {
  return attachmentCategories
    .map(
      (group) => `
      <div class="modal-group">
        <p class="modal-group-label">${group.group}</p>
        <div class="modal-options">
          ${group.types
            .map(
              (type) => `
            <button
              type="button"
              class="modal-option ${selectedId === type.id ? "is-selected" : ""}"
              data-role="draft-category"
              data-category-id="${type.id}"
            >
              <strong>${type.label}</strong>
              <span>${type.hint}</span>
            </button>`
            )
            .join("")}
        </div>
      </div>`
    )
    .join("");
}

function ensureCategoryModal() {
  let modal = document.getElementById("categoryModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "categoryModal";
  modal.className = "category-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-category-modal"></div>
    <div class="category-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="categoryModalTitle">
      <header class="category-modal-head">
        <div>
          <p class="eyebrow">Typ załącznika</p>
          <h2 id="categoryModalTitle">Wybierz kategorię pliku</h2>
          <p class="category-modal-file" id="categoryModalFileName"></p>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-category-modal" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body" id="categoryModalBody"></div>
      <footer class="category-modal-foot">
        <button type="button" class="ghost-btn" data-role="close-category-modal">Anuluj</button>
        <button type="button" class="primary-btn" id="categoryModalSave">Zapisz typ</button>
      </footer>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    const target = event.target.closest("[data-role]");
    if (!target) return;
    const role = target.dataset.role;

    if (role === "close-category-modal") {
      closeCategoryModal();
      return;
    }

    if (role === "draft-category") {
      categoryModalDraftId = target.dataset.categoryId || "";
      modal.querySelectorAll(".modal-option").forEach((el) => {
        el.classList.toggle("is-selected", el.dataset.categoryId === categoryModalDraftId);
      });
    }
  });

  modal.querySelector("#categoryModalSave")?.addEventListener("click", () => {
    if (!categoryModalDraftId) return;

    if (categoryModalMode === "pending-attach") {
      commitPendingAttachWithCategory(categoryModalDraftId);
      return;
    }

    if (categoryModalMode === "project-file") {
      const project = getProjectById(categoryModalProjectId);
      const file = project?.files?.find((item) => String(item.id) === String(categoryModalFileId));
      if (!file || !project) return;
      file.categoryId = categoryModalDraftId;
      const label = findCategoryLabel(file.categoryId);
      persistProject({
        ...project,
        files: [...project.files],
        updatedAt: new Date().toISOString(),
      });
      closeCategoryModal();
      showTypeToast(label);
      setProjectListTab("attachments");
      renderView("project-detail", projectOverviewNav(project.id, { listTab: "attachments" }));
      return;
    }

    if (!categoryModalFileId) return;
    const file = projectFiles.find((item) => item.id === categoryModalFileId);
    if (!file) return;
    file.categoryId = categoryModalDraftId;
    const label = findCategoryLabel(file.categoryId);
    closeCategoryModal();
    updateFilesUi();
    showTypeToast(label);
    if (typeof notifyTutorial === "function") notifyTutorial("category");
  });

  return modal;
}

function openCategoryModal(fileId) {
  const file = projectFiles.find((item) => item.id === fileId);
  if (!file) return;

  categoryModalMode = "new-project";
  categoryModalProjectId = "";
  categoryModalFileId = fileId;
  categoryModalDraftId = file.categoryId || "";
  showCategoryModal(file.name);
}

function openProjectFileCategoryModal(projectId, fileId) {
  const project = getProjectById(projectId);
  const file = project?.files?.find((item) => String(item.id) === String(fileId));
  if (!file) return;

  categoryModalMode = "project-file";
  categoryModalProjectId = projectId;
  categoryModalFileId = fileId;
  categoryModalDraftId = file.categoryId || "";
  showCategoryModal(file.name);
}

function openPendingAttachCategoryModal() {
  const next = pendingAttachQueue[0];
  if (!next) {
    closeCategoryModal();
    return;
  }
  categoryModalMode = "pending-attach";
  categoryModalFileId = null;
  categoryModalDraftId = "";
  showCategoryModal(
    pendingAttachQueue.length > 1
      ? `${next.name} (${pendingAttachQueue.length} plików)`
      : next.name
  );
}

function showCategoryModal(fileName) {
  const modal = ensureCategoryModal();
  const body = modal.querySelector("#categoryModalBody");
  const nameEl = modal.querySelector("#categoryModalFileName");
  const saveBtn = modal.querySelector("#categoryModalSave");
  if (body) body.innerHTML = categoryModalOptionsHtml(categoryModalDraftId);
  if (nameEl) nameEl.textContent = fileName;
  if (saveBtn) {
    saveBtn.textContent =
      categoryModalMode === "pending-attach" ? "Dodaj z kategorią" : "Zapisz typ";
  }
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function commitPendingAttachWithCategory(categoryId) {
  const next = pendingAttachQueue.shift();
  const project = getProjectById(categoryModalProjectId);
  if (!next || !project) {
    pendingAttachQueue = [];
    closeCategoryModal();
    return;
  }

  const file = {
    id: `f${Date.now()}`,
    name: next.name,
    size: next.size,
    categoryId,
    addedAt: new Date().toISOString(),
    addedById: getCurrentAccountUser().id,
    addedByName: getCurrentAccountUser().name,
  };
  persistProject({
    ...project,
    files: [...(project.files || []), file],
    updatedAt: new Date().toISOString(),
  });
  showTypeToast(`${file.name} · ${findCategoryLabel(categoryId)}`);

  if (pendingAttachQueue.length) {
    openPendingAttachCategoryModal();
    return;
  }

  closeCategoryModal();
}

function closeCategoryModal() {
  const refreshProjectId =
    categoryModalMode === "pending-attach" ? categoryModalProjectId : "";
  const modal = document.getElementById("categoryModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("modal-open");
  categoryModalFileId = null;
  categoryModalDraftId = "";
  categoryModalMode = "new-project";
  categoryModalProjectId = "";
  pendingAttachQueue = [];
  if (refreshProjectId && getProjectById(refreshProjectId)) {
    setProjectListTab("attachments");
    renderView(
      "project-detail",
      projectOverviewNav(refreshProjectId, { listTab: "attachments" })
    );
  }
}

function showTypeToast(label) {
  let toast = document.getElementById("typeToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "typeToast";
    toast.className = "type-toast";
    document.body.appendChild(toast);
  }

  toast.classList.remove("is-save-success");
  toast.innerHTML = `
    <span class="type-toast-check" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
        <path d="m5 12 5 5L20 7" />
      </svg>
    </span>
    <span>${escapeHtml(label)}</span>
  `;
  toast.classList.add("is-visible");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function showFormSavedToast(message = "Zapisano zmiany") {
  let toast = document.getElementById("typeToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "typeToast";
    toast.className = "type-toast";
    document.body.appendChild(toast);
  }

  toast.classList.remove("is-visible", "is-save-success", "is-check-anim");
  // Force reflow so the check animation can replay
  void toast.offsetWidth;
  toast.classList.add("is-save-success");
  toast.innerHTML = `
    <span class="type-toast-check" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
        <path class="type-toast-check-path" d="m5 12 5 5L20 7" />
      </svg>
    </span>
    <span><strong>${escapeHtml(message)}</strong></span>
  `;
  toast.classList.add("is-visible", "is-check-anim");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible", "is-save-success", "is-check-anim");
  }, 2800);
}

/** @type {{ projectId: string, kind: "building" | "doc", docId?: string } | null} */
let formSaveContext = null;
/** @type {((event: KeyboardEvent) => void) | null} */
let formSaveKeyHandler = null;
/** @type {IntersectionObserver | null} */
let formSaveInlineObserver = null;
/** @type {boolean} */
let formSaveInlineInView = false;

function floppyDiskIconSvg() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
      <path d="M5.5 4.5h10.2L18.5 7.3V19.5a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
      <path d="M8 4.5v4.2h7.2V4.5" stroke-linejoin="round" />
      <rect x="8.2" y="13.2" width="7.6" height="5.3" rx="0.6" />
    </svg>`;
}

function formSaveSubmitButtonHtml() {
  return `
    <button
      type="submit"
      class="form-save-inline-btn"
      data-role="form-save-inline"
      title="Zapisz formularz"
      aria-label="Zapisz formularz"
    >
      ${floppyDiskIconSvg()}
    </button>`;
}

function ensureFormSaveFab() {
  let fab = document.getElementById("formSaveFab");
  if (fab) return fab;
  fab = document.createElement("button");
  fab.id = "formSaveFab";
  fab.type = "button";
  fab.className = "form-save-fab";
  fab.hidden = true;
  fab.setAttribute("aria-label", "Zapisz formularz");
  fab.title = "Zapisz formularz";
  fab.innerHTML = floppyDiskIconSvg();
  fab.addEventListener("click", (event) => {
    event.preventDefault();
    triggerActiveFormSave();
  });
  document.body.appendChild(fab);
  return fab;
}

function getActiveFormRoot() {
  if (!formSaveContext) return null;
  const v2Root = document.querySelector('[data-role="v2-root"]');
  if (formSaveContext.kind === "building") {
    return (
      document.getElementById("buildingProjectForm") ||
      v2Root?.querySelector("#buildingProjectForm") ||
      null
    );
  }
  if (formSaveContext.docId) {
    const selector = `[data-role="doc-form"][data-doc-id="${formSaveContext.docId}"]`;
    return (
      v2Root?.querySelector(selector) ||
      content.querySelector(selector) ||
      v2Root?.querySelector('[data-role="doc-form"]') ||
      content.querySelector('[data-role="doc-form"]') ||
      null
    );
  }
  return (
    v2Root?.querySelector('[data-role="doc-form"]') ||
    content.querySelector('[data-role="doc-form"]') ||
    null
  );
}

function countOpenFormSections(root) {
  if (!root) return 0;
  return root.querySelectorAll(
    "details.form-section[open], details.doc-form-section[open]"
  ).length;
}

function getInlineFormSaveButton(root = getActiveFormRoot()) {
  return root?.querySelector('[data-role="form-save-inline"]') || null;
}

function updateFormSaveFabVisibility() {
  const fab = document.getElementById("formSaveFab");
  if (!fab) return;
  if (!formSaveContext) {
    fab.hidden = true;
    return;
  }
  const hasOpenSection = countOpenFormSections(getActiveFormRoot()) > 0;
  // Ukryj zakotwiczoną dyskietkę, gdy widać już przycisk zapisu na dole formularza
  fab.hidden = !hasOpenSection || formSaveInlineInView;
}

function disconnectFormSaveInlineObserver() {
  if (formSaveInlineObserver) {
    formSaveInlineObserver.disconnect();
    formSaveInlineObserver = null;
  }
  formSaveInlineInView = false;
}

function observeInlineFormSaveButton(root) {
  disconnectFormSaveInlineObserver();
  const inlineBtn = getInlineFormSaveButton(root);
  if (!inlineBtn || typeof IntersectionObserver === "undefined") {
    formSaveInlineInView = false;
    return;
  }

  formSaveInlineObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      formSaveInlineInView = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0);
      updateFormSaveFabVisibility();
    },
    {
      root: null,
      threshold: [0, 0.15, 0.5, 1],
      rootMargin: "0px",
    }
  );
  formSaveInlineObserver.observe(inlineBtn);
}

function unbindFormSaveChrome() {
  formSaveContext = null;
  disconnectFormSaveInlineObserver();
  const fab = document.getElementById("formSaveFab");
  if (fab) fab.hidden = true;
  if (formSaveKeyHandler) {
    document.removeEventListener("keydown", formSaveKeyHandler);
    formSaveKeyHandler = null;
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function captureActiveFormSnapshot() {
  if (!formSaveContext) return "";
  const root = getActiveFormRoot();
  if (!root) return "";
  const meta = content.querySelector('[data-role="doc-task-meta"]');
  const payload = {
    form:
      formSaveContext.kind === "building"
        ? collectBuildingFormData(root)
        : collectDocFormData(root),
    description: String(
      content.querySelector('[data-role="task-description-input"]')?.value || ""
    ),
    owner: String(meta?.querySelector('[data-role="task-owner"]')?.value || ""),
    status: String(meta?.querySelector('[data-role="task-status"]')?.value || ""),
    start: String(meta?.querySelector('[data-role="task-start"]')?.value || ""),
    due: String(meta?.querySelector('[data-role="task-due"]')?.value || ""),
  };
  return stableStringify(payload);
}

function markActiveFormClean() {
  if (!formSaveContext) return;
  formSaveContext.baseline = captureActiveFormSnapshot();
}

function isActiveFormDirty() {
  if (!formSaveContext?.baseline) return false;
  return captureActiveFormSnapshot() !== formSaveContext.baseline;
}

function isLeavingFormContext(view, options = {}) {
  if (!formSaveContext) return false;
  if (view !== "project-detail") return true;
  const projectId = String(options.projectId || "");
  if (projectId && projectId !== String(formSaveContext.projectId)) return true;
  if (formSaveContext.kind === "building") {
    return options.panel !== "building-form";
  }
  if (formSaveContext.kind === "doc") {
    return (
      options.panel !== "doc-form" ||
      String(options.focusDocId || "") !== String(formSaveContext.docId || "")
    );
  }
  return true;
}

function persistActiveTaskMetaFromDom() {
  if (!formSaveContext) return false;
  const project = getProjectById(formSaveContext.projectId);
  if (!project) return false;
  const meta = content.querySelector('[data-role="doc-task-meta"]');
  const taskId = String(
    meta?.querySelector('[data-role="task-start"]')?.dataset.taskId ||
      meta?.querySelector('[data-role="task-due"]')?.dataset.taskId ||
      meta?.querySelector('[data-role="task-owner"]')?.dataset.taskId ||
      meta?.querySelector('[data-role="task-status"]')?.dataset.taskId ||
      content.querySelector('[data-role="task-description-input"]')?.dataset.taskId ||
      (formSaveContext.kind === "building"
        ? resolveDocumentTask(project, "building", "building-project").id
        : formSaveContext.docId
          ? resolveDocumentTask(project, "survey-doc", formSaveContext.docId).id
          : "") ||
      ""
  );
  if (!taskId) return false;
  const description = String(
    content.querySelector('[data-role="task-description-input"]')?.value || ""
  ).trim();
  const ownerId = String(meta?.querySelector('[data-role="task-owner"]')?.value || NO_OWNER.id);
  const statusId = String(meta?.querySelector('[data-role="task-status"]')?.value || "");
  const startDate = String(meta?.querySelector('[data-role="task-start"]')?.value || "");
  const dueDate = String(meta?.querySelector('[data-role="task-due"]')?.value || "");
  const customTasks = (project.customTasks || []).map((task) =>
    String(task.id) === String(taskId) ? { ...task, description } : task
  );
  const next = {
    ...project,
    customTasks,
    taskDescriptions: { ...(project.taskDescriptions || {}), [taskId]: description },
    taskOwners: { ...(project.taskOwners || {}), [taskId]: ownerId },
    taskStartDates: { ...(project.taskStartDates || {}), [taskId]: startDate },
    taskDueDates: { ...(project.taskDueDates || {}), [taskId]: dueDate },
    updatedAt: new Date().toISOString(),
  };
  if (statusId) {
    const flowTasks = project.flowInstance?.tasks || [];
    const custom = project.customTasks || [];
    const all = [...flowTasks, ...custom];
    let ids = collectDescendantTaskIds(all, taskId);
    if (!all.some((task) => String(task.id) === String(taskId))) {
      ids = collectDescendantTaskIds(collectProjectTasks(project), taskId);
    }
    const board = { ...(project.taskBoardStatus || {}) };
    ids.forEach((id) => {
      board[id] = statusId;
    });
    next.taskBoardStatus = board;
  }
  persistProject(next);
  return true;
}

function persistBuildingFormFromDom(projectId) {
  const form = document.getElementById("buildingProjectForm");
  const current = getProjectById(projectId);
  if (!form || !current) return false;
  current.buildingForm = collectBuildingFormData(form);
  current.updatedAt = new Date().toISOString();
  persistProject(current);
  return true;
}

function persistDocFormFromDom(projectId, docId) {
  const v2Root = document.querySelector('[data-role="v2-root"]');
  const form =
    (docId &&
      (v2Root?.querySelector(`[data-role="doc-form"][data-doc-id="${docId}"]`) ||
        content.querySelector(`[data-role="doc-form"][data-doc-id="${docId}"]`))) ||
    v2Root?.querySelector('[data-role="doc-form"]') ||
    content.querySelector('[data-role="doc-form"]');
  const current = getProjectById(projectId);
  const resolvedDocId = docId || form?.dataset.docId;
  if (!form || !current || !resolvedDocId) return false;
  current.docForms = {
    ...(current.docForms || {}),
    [resolvedDocId]: collectDocFormData(form),
  };
  current.updatedAt = new Date().toISOString();
  persistProject(current);
  return true;
}

function triggerActiveFormSave() {
  if (!formSaveContext) return false;
  const { projectId, kind, docId } = formSaveContext;
  const ok =
    kind === "building"
      ? persistBuildingFormFromDom(projectId)
      : persistDocFormFromDom(projectId, docId);
  if (!ok) {
    showTypeToast("Nie udało się zapisać formularza");
    return false;
  }
  persistActiveTaskMetaFromDom();
  markActiveFormClean();
  showFormSavedToast("Zapisano zmiany");
  return true;
}

/** @type {boolean} */
let bypassFormDirtyGuard = false;

function ensureUnsavedChangesModal() {
  let modal = document.getElementById("unsavedChangesModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "unsavedChangesModal";
  modal.className = "category-modal unsaved-changes-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="unsaved-cancel"></div>
    <div class="category-modal-dialog unsaved-changes-dialog" role="dialog" aria-modal="true" aria-labelledby="unsavedChangesTitle">
      <header class="category-modal-head">
        <div>
          <p class="eyebrow">Niezapisane zmiany</p>
          <h2 id="unsavedChangesTitle">Nie zapisałeś zmian</h2>
          <p class="category-modal-file">Czy na pewno chcesz wyjść?</p>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="unsaved-cancel" aria-label="Anuluj">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body">
        <p class="unsaved-changes-copy">
          Masz niezapisane zmiany w formularzu zadania. Możesz je zapisać przed wyjściem albo odrzucić.
        </p>
      </div>
      <footer class="category-modal-foot unsaved-changes-foot">
        <button type="button" class="ghost-btn" data-role="unsaved-cancel">Anuluj</button>
        <button type="button" class="danger-btn" data-role="unsaved-discard">Nie zapisuj</button>
        <button type="button" class="primary-btn" data-role="unsaved-save-exit">Zapisz i wyjdź</button>
      </footer>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

function closeUnsavedChangesModal() {
  const modal = document.getElementById("unsavedChangesModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  modal.onclick = null;
}

function openUnsavedChangesModal({ onSaveExit, onDiscard, onCancel }) {
  const modal = ensureUnsavedChangesModal();
  modal.hidden = false;
  document.body.classList.add("modal-open");
  modal.onclick = (event) => {
    if (event.target.closest('[data-role="unsaved-cancel"]')) {
      event.preventDefault();
      closeUnsavedChangesModal();
      onCancel?.();
      return;
    }
    if (event.target.closest('[data-role="unsaved-discard"]')) {
      event.preventDefault();
      closeUnsavedChangesModal();
      onDiscard?.();
      return;
    }
    if (event.target.closest('[data-role="unsaved-save-exit"]')) {
      event.preventDefault();
      if (!triggerActiveFormSave()) return;
      closeUnsavedChangesModal();
      onSaveExit?.();
    }
  };
}

function bindFormSaveChrome(projectId, kind, docId = "") {
  unbindFormSaveChrome();
  formSaveContext = {
    projectId,
    kind,
    ...(kind === "doc" ? { docId: String(docId || "") } : {}),
    baseline: "",
  };
  ensureFormSaveFab();

  const root = getActiveFormRoot();
  root
    ?.querySelectorAll("details.form-section, details.doc-form-section")
    .forEach((section) => {
      section.addEventListener("toggle", updateFormSaveFabVisibility);
    });
  observeInlineFormSaveButton(root);
  updateFormSaveFabVisibility();
  markActiveFormClean();

  // F5 = odświeżenie przeglądarki — nie przejmujemy pod zapis formularza
  formSaveKeyHandler = null;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function newProjectHtml() {
  return `
    <section class="project-form">
      <header class="form-intro">
        <div class="form-intro-copy">
          <p class="eyebrow">Nowy projekt budowlany</p>
          <h1>Dane projektu i załączniki</h1>
          <p class="lede form-lede">
            Podaj tytuł oraz opis, a następnie dodaj pliki i przypisz każdemu kategorię.
          </p>
        </div>
        <button class="autofill-btn" id="autofillBtn" type="button" title="Autowypełnij tytuł, kod i opis">
          <span>Autowypełnij</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M5 12h12" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </header>

      <div class="form-layout">
        <form id="projectForm" class="form-main" autocomplete="off">
          <label class="field">
            <span class="field-label">Tytuł projektu</span>
            <input
              id="projectTitle"
              name="title"
              type="text"
              required
              placeholder="np. Budynek mieszkalny jednorodzinny — działka 12/3"
            />
          </label>

          <label class="field">
            <span class="field-label">Kod</span>
            <input
              id="projectCode"
              name="code"
              type="text"
              placeholder="np. P-2026-001"
              autocomplete="off"
            />
          </label>

          <label class="field">
            <span class="field-label">Opis</span>
            <textarea
              id="projectDescription"
              name="description"
              rows="5"
              placeholder="Krótki opis inwestycji, lokalizacji i zakresu opracowania…"
            ></textarea>
          </label>

          <div class="field">
            <span class="field-label">Załączniki</span>
            <label class="dropzone" id="dropzone" for="fileInput">
              <input id="fileInput" type="file" multiple hidden />
              <span class="dropzone-plus" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span class="dropzone-title">Dodaj pliki projektu</span>
              <span class="dropzone-hint">Kliknij lub upuść wiele plików naraz (PDF, DWG, DXF, PNG, JPG…)</span>
            </label>
          </div>

          <div class="field">
            <div class="field-label-row">
              <span class="field-label">Lista plików</span>
              <span class="field-count" id="fileCount">0 plików</span>
            </div>
            <div id="filesList">${filesListHtml()}</div>
          </div>

          <div class="form-actions">
            <button class="ghost-btn" type="button" data-view="dashboard">Anuluj</button>
            <button class="primary-btn" type="submit">Zapisz projekt</button>
          </div>
        </form>

        ${aiChatHtml()}
      </div>
    </section>
  `;
}

function aiChatHtml() {
  const minimized = isAiChatMinimized();
  return `
    <aside class="ai-chat${minimized ? " is-minimized" : ""}" aria-label="Asystent AI">
      <header class="ai-chat-head">
        <div>
          <p class="ai-chat-kicker">Asystent</p>
          <h2>snapPoint AI</h2>
        </div>
        <div class="ai-chat-head-actions">
          <span class="ai-chat-badge">Demo</span>
          <button
            type="button"
            class="icon-btn ai-chat-toggle"
            data-role="toggle-ai-chat"
            title="Minimalizuj czat"
            aria-label="Minimalizuj czat AI"
            aria-expanded="${minimized ? "false" : "true"}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </header>
      <div class="ai-chat-messages" id="aiChatMessages"></div>
      <form class="ai-chat-composer" id="aiChatForm">
        <input
          id="aiChatInput"
          type="text"
          placeholder="Zapytaj asystenta o projekt…"
          autocomplete="off"
        />
        <button class="primary-btn ai-send" type="submit">Wyślij</button>
      </form>
    </aside>`;
}

const AI_DEMO_REPLY =
  'Cześć snappoint. jest narazie w wersji demonstracyjnej i prawdziwe AI jeszcze nie jest zaimplementowane! Miłego oglądania aplikacji i pamiętaj, aby dać feedback Bartkowi i Piotrowi (531 222 215) :D';

const AI_SECOND_REPLY =
  "Tak jak wyżej mówiłem — nie odpowiem Ci dzisiaj.";

const AI_JOKE_REPLIES = [
  "Przeliczam metry kwadratowe… nadal wychodzi, że jestem tylko makietą.",
  "Chciałbym pomóc z rzutem, ale mój wewnętrzny cyrkiel jest jeszcze w pudełku.",
  "Sprawdziłem w dokumentacji urzędowej: sekcja „prawdziwe AI” — status: w budowie.",
  "Gdybym miał pozwolenie na budowę odpowiedzi, już bym je wydał. Na razie mam tylko pieczątkę DEMO.",
  "Analizuję Twój prompt… wykryto entuzjazm użytkownika i brak modelu językowego.",
  "Wersja demo mówi: „nie dziś”. Wersja premium powie to samo, tylko ładniej.",
  "Mogę narysować Ci uśmiechnięty plusik. Zresztą — już go masz w formularzu.",
  "Konsultuję z wirtualnym architektem… odpisał: „wróć po kawie i z prawdziwym AI”.",
  "To nie jest cisza radiowa — to spokój makiety przed feedbackiem do Bartka i Piotra.",
  "Znowu to samo pytanie? Dobrze — mam 10 wersji „nie umiem”, losuję kolejną.",
];

let aiUserMessageCount = 0;

function appendChatBubble(text, role) {
  const box = document.getElementById("aiChatMessages");
  if (!box) return;
  const bubble = document.createElement("div");
  bubble.className = `ai-bubble ai-bubble-${role}`;
  bubble.textContent = text;
  box.appendChild(bubble);
  box.scrollTop = box.scrollHeight;
}

function nextAiReply() {
  aiUserMessageCount += 1;

  if (aiUserMessageCount === 1) return AI_DEMO_REPLY;
  if (aiUserMessageCount === 2) return AI_SECOND_REPLY;

  const index = Math.floor(Math.random() * AI_JOKE_REPLIES.length);
  return AI_JOKE_REPLIES[index];
}

function bindAiChat() {
  aiUserMessageCount = 0;
  applyAiChatMinimizedState();

  const form = document.getElementById("aiChatForm");
  const input = document.getElementById("aiChatInput");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input?.value.trim();
    if (!text) return;
    appendChatBubble(text, "user");
    input.value = "";
    const reply = nextAiReply();
    window.setTimeout(() => {
      appendChatBubble(reply, "bot");
    }, 350);
  });

  content.querySelectorAll('[data-role="toggle-ai-chat"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setAiChatMinimized(true);
    });
  });
}

function updateFilesUi() {
  const list = document.getElementById("filesList");
  const count = document.getElementById("fileCount");
  if (!list || !count) return;

  list.innerHTML = filesListHtml();
  const n = projectFiles.length;
  count.textContent = n === 1 ? "1 plik" : n < 5 && n > 0 ? `${n} pliki` : `${n} plików`;
  bindFileListEvents();
}

function bindFileListEvents() {
  document.querySelectorAll('[data-role="open-category"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      openCategoryModal(btn.dataset.fileId);
    });
  });

  document.querySelectorAll('[data-role="remove"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      projectFiles = projectFiles.filter((f) => f.id !== btn.dataset.fileId);
      updateFilesUi();
    });
  });
}

function addFiles(fileList) {
  const incoming = Array.from(fileList || []);
  const user = getCurrentAccountUser();
  incoming.forEach((file) => {
    projectFiles.push({
      id: `f${fileIdSeq++}`,
      name: file.name,
      size: file.size,
      categoryId: "",
      addedAt: new Date().toISOString(),
      addedById: user.id,
      addedByName: user.name,
    });
  });
  updateFilesUi();
  if (typeof notifyTutorial === "function") notifyTutorial("files");
}

function autofillProjectForm() {
  const title = document.getElementById("projectTitle");
  const code = document.getElementById("projectCode");
  const description = document.getElementById("projectDescription");
  if (title) title.value = DEMO_AUTOFILL.title;
  if (code) code.value = DEMO_AUTOFILL.code;
  if (description) description.value = DEMO_AUTOFILL.description;
}

function bindNewProjectForm() {
  const form = document.getElementById("projectForm");
  const fileInput = document.getElementById("fileInput");
  const dropzone = document.getElementById("dropzone");
  const autofillBtn = document.getElementById("autofillBtn");

  autofillBtn?.addEventListener("click", () => {
    autofillProjectForm();
    autofillBtn.classList.add("is-used");
    if (typeof notifyTutorial === "function") notifyTutorial("autofill");
  });

  form?.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      renderView(el.dataset.view);
    });
  });

  fileInput?.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone?.addEventListener("drop", (event) => {
    addFiles(event.dataTransfer?.files);
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (typeof isTutorialBlockingSave === "function" && isTutorialBlockingSave()) {
      showTypeToast("W tutorialu zapis jest na razie wyłączony");
      return;
    }
    const title = document.getElementById("projectTitle")?.value.trim();
    const code = document.getElementById("projectCode")?.value.trim() || "";
    const description = document.getElementById("projectDescription")?.value.trim() || "";
    if (!title) return;

    const existing = editingProjectId ? getProjectById(editingProjectId) : null;
    const base = {
      ...(existing || {}),
      id: existing?.id || `p${Date.now()}`,
      title,
      code,
      description,
      files: projectFiles.map((file) => {
        const user = getCurrentAccountUser();
        return {
          ...file,
          addedById: file.addedById || user.id,
          addedByName: file.addedByName || user.name,
        };
      }),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!existing) {
      base.processTasks = Array.isArray(base.processTasks) ? base.processTasks : [];
    }
    const project = persistProject(base);

    editingProjectId = null;
    renderView("project-detail", { projectId: project.id, justSaved: true });
  });

  bindFileListEvents();
}

function pdfIconSvg(size = 18) {
  return `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" aria-hidden="true">
      <path d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V8.5L14 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
      <path d="M14 3v5.5h5.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
      <path d="M9 13.2h6M9 16.5h4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    </svg>`;
}

function sortArrowHtml(active, dir) {
  if (!active) return `<span class="sort-indicator" aria-hidden="true">↕</span>`;
  return `<span class="sort-indicator is-active" aria-hidden="true">${dir === "asc" ? "↑" : "↓"}</span>`;
}

function isBuildingFormFieldFilled(form, key, project) {
  const uploadKeys = new Set([
    "pztDrawings",
    "pabDrawings",
    "ptDrawings",
    "docOpdn",
    "docWz",
    "docOpinions",
    "docRoad",
    "docBioz",
  ]);
  if (uploadKeys.has(key)) {
    const selected = form[`${key}Selected`];
    if (Array.isArray(selected) && selected.length) return true;
    if (form[`${key}File`]) return true;
    if (form[`${key}Done`] === true || form[`${key}Done`] === "on") return true;
    return false;
  }
  const value = form[key];
  if (key === "intentName" && !(typeof value === "string" && value.trim()) && project.title) {
    return true;
  }
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function getBuildingFormFillPercent(project) {
  const form = project.buildingForm || {};
  const fields = Object.values(SECTION_FIELD_MAP).flat();
  if (!fields.length) return 0;
  const filled = fields.filter((key) => isBuildingFormFieldFilled(form, key, project)).length;
  return Math.round((filled / fields.length) * 100);
}

function compareSortValues(a, b, dir) {
  if (a < b) return dir === "asc" ? -1 : 1;
  if (a > b) return dir === "asc" ? 1 : -1;
  return 0;
}

let buildingProjectsSort = { key: "title", dir: "asc" };
let attachmentsSort = { key: "project", dir: "asc" };
/** @type {Record<string, string>} */
let buildingProjectsFilters = {};

function getDocFormsAverageFill(project) {
  const docs = project.formalSurvey?.documents || [];
  if (!docs.length) return 0;
  const total = docs.reduce((sum, doc) => {
    const saved = project.docForms?.[doc.id] || {};
    return sum + countDocFormFill(doc.id, saved).percent;
  }, 0);
  return Math.round(total / docs.length);
}

function getBuildingProjectRowData(project) {
  const form = project.buildingForm || {};
  const files = project.files || [];
  const docs = project.formalSurvey?.documents || [];
  const categorized = files.filter((file) => file.categoryId).length;
  const fill = getBuildingFormFillPercent(project);
  const hasSurvey = Boolean(project.formalSurvey);
  return {
    id: project.id,
    title: project.title || "Bez tytułu",
    description: project.description || "",
    intent: form.intentName || project.title || "",
    investor: form.investorName || "",
    site: form.siteAddress || "",
    category: form.objectCategory || "",
    plots: form.plotIds || "",
    createdAt: project.createdAt || "",
    updatedAt: project.updatedAt || project.createdAt || "",
    fill,
    files: files.length,
    categorized,
    docs: docs.length,
    survey: hasSurvey ? "tak" : "nie",
    surveyLabel: hasSurvey ? `Tak · ${docs.length}` : "Nie",
    docFill: getDocFormsAverageFill(project),
  };
}

function getCurrentAccountUser() {
  return ACCOUNT_USERS[0] || { id: "u-ak", name: "Anna Kowalska", role: "Architekt" };
}

function fileAddedByLabel(file) {
  if (file?.addedByName) return String(file.addedByName);
  if (file?.addedById) {
    return (
      ACCOUNT_USERS.find((user) => user.id === file.addedById)?.name ||
      String(file.addedById)
    );
  }
  return "—";
}

function collectAllProjectTasks() {
  const rows = [];
  loadProjects().forEach((project) => {
    collectProjectTasks(project).forEach((task) => {
      rows.push({ project, task });
    });
  });
  return rows;
}

function collectAttachmentRows() {
  const rows = [];
  loadProjects().forEach((project) => {
    (project.files || []).forEach((file) => {
      rows.push({
        id: `${project.id}:${file.id}`,
        projectId: project.id,
        projectTitle: project.title || "Bez tytułu",
        name: file.name || "bez-nazwy",
        categoryId: file.categoryId || "",
        categoryLabel: findCategoryLabel(file.categoryId),
        size: typeof file.size === "number" ? file.size : 0,
        addedAt: file.addedAt || "",
        addedById: file.addedById || "",
        addedByName: fileAddedByLabel(file),
        file,
      });
    });
  });
  return rows;
}

function sortAttachmentRows(rows) {
  const { key, dir } = attachmentsSort;
  return [...rows].sort((a, b) => {
    if (key === "name") return compareSortValues(a.name.toLowerCase(), b.name.toLowerCase(), dir);
    if (key === "category")
      return compareSortValues(a.categoryLabel.toLowerCase(), b.categoryLabel.toLowerCase(), dir);
    if (key === "size") return compareSortValues(a.size, b.size, dir);
    if (key === "owner")
      return compareSortValues(a.addedByName.toLowerCase(), b.addedByName.toLowerCase(), dir);
    if (key === "added") return compareSortValues(a.addedAt || "", b.addedAt || "", dir);
    return compareSortValues(a.projectTitle.toLowerCase(), b.projectTitle.toLowerCase(), dir);
  });
}

function sortBuildingProjects(projects) {
  const { key, dir } = buildingProjectsSort;
  return [...projects].sort((a, b) => {
    const ra = getBuildingProjectRowData(a);
    const rb = getBuildingProjectRowData(b);
    if (key === "updated") {
      return compareSortValues(
        new Date(ra.updatedAt || 0).getTime(),
        new Date(rb.updatedAt || 0).getTime(),
        dir
      );
    }
    if (key === "created") {
      return compareSortValues(
        new Date(ra.createdAt || 0).getTime(),
        new Date(rb.createdAt || 0).getTime(),
        dir
      );
    }
    if (key === "fill") return compareSortValues(ra.fill, rb.fill, dir);
    if (key === "files") return compareSortValues(ra.files, rb.files, dir);
    if (key === "docs") return compareSortValues(ra.docs, rb.docs, dir);
    if (key === "docFill") return compareSortValues(ra.docFill, rb.docFill, dir);
    if (key === "investor")
      return compareSortValues(ra.investor.toLowerCase(), rb.investor.toLowerCase(), dir);
    if (key === "category")
      return compareSortValues(ra.category.toLowerCase(), rb.category.toLowerCase(), dir);
    if (key === "site") return compareSortValues(ra.site.toLowerCase(), rb.site.toLowerCase(), dir);
    if (key === "survey") return compareSortValues(ra.survey, rb.survey, dir);
    return compareSortValues(ra.title.toLowerCase(), rb.title.toLowerCase(), dir);
  });
}

function downloadAttachmentMock(file) {
  const name = file?.name || "zalacznik.txt";
  const blob = new Blob(
    [`snapPoint — mock załącznika\n\nNazwa: ${name}\n`],
    { type: "application/octet-stream" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function buildingProjectsFilterValue(key) {
  return buildingProjectsFilters[key] || "";
}

function buildingProjectsViewHtml() {
  const projects = sortBuildingProjects(loadProjects());
  const sort = buildingProjectsSort;

  if (projects.length === 0) {
    return `
      <section class="projects-view">
        <div class="projects-empty panel">
          <p>Brak projektów budowlanych na tym koncie. Utwórz pierwszy projekt.</p>
          <button class="primary-btn" type="button" data-view="new-project">Nowy projekt</button>
        </div>
      </section>`;
  }

  const filterInput = (key, placeholder) => `
    <input
      type="search"
      class="column-filter"
      data-role="filter-building-col"
      data-filter-key="${key}"
      value="${escapeHtml(buildingProjectsFilterValue(key))}"
      placeholder="${escapeHtml(placeholder)}"
      autocomplete="off"
    />`;

  return `
    <section class="projects-view building-projects-view">
      <header class="form-intro form-intro-row">
        <div class="form-intro-copy">
          <p class="eyebrow">Workspace</p>
          <h1>Projekty budowlane</h1>
          <p class="lede form-lede">Pełna lista projektów z filtracją po kolumnach — jak na pulpicie, tylko w tabeli.</p>
        </div>
        <button class="primary-btn" type="button" data-view="new-project">Nowy projekt</button>
      </header>

      <div class="attachments-panel" data-role="building-projects-table">
        <div class="table-toolbar">
          <p class="table-filter-meta" data-role="building-filter-count">${projects.length} projektów</p>
          <button type="button" class="ghost-btn table-action-btn" data-role="clear-building-filters">
            Wyczyść filtry
          </button>
        </div>
        <div class="data-table-wrap data-table-lined-wrap panel">
          <table class="data-table data-table-lined data-table-wide" data-table="building-projects">
            <thead>
              <tr>
                <th>
                  <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="title">
                    Projekt ${sortArrowHtml(sort.key === "title", sort.dir)}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="investor">
                    Inwestor ${sortArrowHtml(sort.key === "investor", sort.dir)}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="site">
                    Lokalizacja ${sortArrowHtml(sort.key === "site", sort.dir)}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="category">
                    Kategoria ${sortArrowHtml(sort.key === "category", sort.dir)}
                  </button>
                </th>
                <th>Działki</th>
                <th>
                  <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="created">
                    Utworzono ${sortArrowHtml(sort.key === "created", sort.dir)}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="updated">
                    Aktualizacja ${sortArrowHtml(sort.key === "updated", sort.dir)}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="fill">
                    Formularz ${sortArrowHtml(sort.key === "fill", sort.dir)}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="files">
                    Załączniki ${sortArrowHtml(sort.key === "files", sort.dir)}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="survey">
                    Ankieta ${sortArrowHtml(sort.key === "survey", sort.dir)}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="docs">
                    Dok. do złożenia ${sortArrowHtml(sort.key === "docs", sort.dir)}
                  </button>
                </th>
                <th>
                  <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="docFill">
                    Wypełn. dok. ${sortArrowHtml(sort.key === "docFill", sort.dir)}
                  </button>
                </th>
                <th class="col-actions">Akcje</th>
              </tr>
              <tr class="filter-row">
                <th>${filterInput("title", "Filtr nazwy / opisu…")}</th>
                <th>${filterInput("investor", "Inwestor…")}</th>
                <th>${filterInput("site", "Adres…")}</th>
                <th>${filterInput("category", "Kategoria…")}</th>
                <th>${filterInput("plots", "Działki…")}</th>
                <th>${filterInput("created", "Data…")}</th>
                <th>${filterInput("updated", "Data…")}</th>
                <th>${filterInput("fill", "np. >=50")}</th>
                <th>${filterInput("files", "np. >=1")}</th>
                <th>
                  <select class="column-filter" data-role="filter-building-col" data-filter-key="survey">
                    <option value="">Wszystkie</option>
                    <option value="tak" ${
                      buildingProjectsFilterValue("survey") === "tak" ? "selected" : ""
                    }>Tak</option>
                    <option value="nie" ${
                      buildingProjectsFilterValue("survey") === "nie" ? "selected" : ""
                    }>Nie</option>
                  </select>
                </th>
                <th>${filterInput("docs", "np. >=3")}</th>
                <th>${filterInput("docFill", "np. >=20")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${projects
                .map((project) => {
                  const row = getBuildingProjectRowData(project);
                  return `
              <tr
                class="is-row-clickable"
                data-project-id="${project.id}"
                data-filter-title="${escapeHtml(
                  `${row.title} ${row.description} ${row.intent}`.toLowerCase()
                )}"
                data-filter-investor="${escapeHtml(row.investor.toLowerCase())}"
                data-filter-site="${escapeHtml(row.site.toLowerCase())}"
                data-filter-category="${escapeHtml(row.category.toLowerCase())}"
                data-filter-plots="${escapeHtml(row.plots.toLowerCase())}"
                data-filter-created="${escapeHtml(formatDate(row.createdAt).toLowerCase())}"
                data-filter-updated="${escapeHtml(formatDate(row.updatedAt).toLowerCase())}"
                data-filter-fill="${row.fill}"
                data-filter-files="${row.files}"
                data-filter-survey="${row.survey}"
                data-filter-docs="${row.docs}"
                data-filter-doc-fill="${row.docFill}"
                tabindex="0"
              >
                <td>
                  <div class="table-primary">
                    <button type="button" class="table-link" data-project-id="${project.id}">
                      ${escapeHtml(row.title)}
                    </button>
                    <span>${escapeHtml((row.description || "Bez opisu").slice(0, 90))}${
                    (row.description || "").length > 90 ? "…" : ""
                  }</span>
                  </div>
                </td>
                <td>${row.investor ? escapeHtml(row.investor) : "—"}</td>
                <td>${row.site ? escapeHtml(row.site) : "—"}</td>
                <td>${
                  row.category
                    ? `<span class="table-pill">${escapeHtml(row.category)}</span>`
                    : `<span class="table-pill muted">Brak</span>`
                }</td>
                <td><span class="table-cell-clip">${
                  row.plots ? escapeHtml(row.plots) : "—"
                }</span></td>
                <td>${formatDate(row.createdAt)}</td>
                <td>${formatDate(row.updatedAt)}</td>
                <td>
                  <div class="fill-cell">
                    <div class="fill-bar" aria-hidden="true"><span style="width:${row.fill}%"></span></div>
                    <strong>${row.fill}%</strong>
                  </div>
                </td>
                <td>
                  <strong>${row.files}</strong>
                  <span class="table-sub">${row.categorized} skategor.</span>
                </td>
                <td>
                  <span class="table-pill ${row.survey === "tak" ? "" : "muted"}">${escapeHtml(
                    row.surveyLabel
                  )}</span>
                </td>
                <td>${row.docs}</td>
                <td>
                  <div class="fill-cell">
                    <div class="fill-bar" aria-hidden="true"><span style="width:${row.docFill}%"></span></div>
                    <strong>${row.docFill}%</strong>
                  </div>
                </td>
                <td class="col-actions">
                  <div class="table-actions">
                    <button
                      type="button"
                      class="ghost-btn table-action-btn"
                      data-role="preview-building-form"
                      data-project-id="${project.id}"
                    >
                      Formularz
                    </button>
                    <button
                      type="button"
                      class="ghost-btn table-action-btn is-danger"
                      data-role="delete-project"
                      data-project-id="${project.id}"
                      title="Usuń projekt"
                    >
                      Usuń
                    </button>
                    <button
                      type="button"
                      class="icon-action-btn"
                      data-role="generate-building-project"
                      data-project-id="${project.id}"
                      title="Generuj PDF"
                      aria-label="Generuj PDF projektu budowlanego"
                    >
                      ${pdfIconSvg(17)}
                    </button>
                  </div>
                </td>
              </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        <p class="files-empty-inline attachment-filter-empty" data-role="building-filter-empty" hidden>
          Brak projektów pasujących do filtrów.
        </p>
      </div>
    </section>`;
}

function docsToSubmitViewHtml() {
  const groups = loadProjects()
    .map((project) => {
      const surveyDocs = project.formalSurvey?.documents || [];
      const flowDocs = project.flowDocuments || [];
      const seen = new Set(surveyDocs.map((doc) => doc.id));
      const documents = [
        ...surveyDocs,
        ...flowDocs.filter((doc) => doc?.id && !seen.has(doc.id)),
      ];
      return { project, documents };
    })
    .filter((group) => group.documents.length > 0);

  if (groups.length === 0) {
    return `
      <section class="projects-view">
        <div class="projects-empty panel">
          <p>Brak dokumentów do złożenia. Wypełnij ankietę formalną lub wygeneruj Flow w projekcie.</p>
          <button class="primary-btn" type="button" data-view="building-projects">Projekty budowlane</button>
        </div>
      </section>`;
  }

  return `
    <section class="projects-view">
      <div class="data-table-wrap panel">
        <table class="data-table" data-table="docs-to-submit">
          <thead>
            <tr>
              <th>Dokument</th>
              <th>Projekt</th>
              <th>Źródło</th>
              <th>Wygenerowano</th>
              <th class="col-actions">Akcje</th>
            </tr>
          </thead>
          <tbody>
            ${groups
              .flatMap(({ project, documents }) =>
                documents.map(
                  (doc) => `
              <tr>
                <td><strong>${escapeHtml(doc.title)}</strong></td>
                <td>
                  <button type="button" class="table-link" data-project-id="${project.id}">
                    ${escapeHtml(project.title)}
                  </button>
                </td>
                <td>
                  <span class="table-pill ${doc.source === "standard" ? "" : "muted"}">
                    ${doc.source === "standard" ? "Standardowy" : "Warunkowy"}
                  </span>
                </td>
                <td>${formatDate(project.formalSurvey?.completedAt || project.formalSurvey?.updatedAt || project.updatedAt)}</td>
                <td class="col-actions">
                  <button
                    type="button"
                    class="ghost-btn table-action-btn"
                    data-role="open-doc-form"
                    data-project-id="${project.id}"
                    data-doc-id="${escapeHtml(doc.id)}"
                  >
                    Wypełnij
                  </button>
                  <button
                    type="button"
                    class="ghost-btn table-action-btn"
                    data-role="download-doc-pdf"
                    data-project-id="${project.id}"
                    data-doc-id="${escapeHtml(doc.id)}"
                  >
                    PDF
                  </button>
                </td>
              </tr>`
                )
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>`;
}

function documentsChecklistHtml(documents, { emptyText = "Brak dokumentów — odpowiedz na pytania ankiety." } = {}) {
  if (!documents.length) {
    return `<p class="docs-checklist-empty">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="docs-checklist">
      ${documents
        .map(
          (doc) => `
        <li class="docs-checklist-item">
          <span class="docs-check-mark" aria-hidden="true"></span>
          <div>
            <strong>${escapeHtml(doc.title)}</strong>
            <span>${doc.source === "standard" ? "Dokument standardowy" : "Dokument warunkowy"}</span>
          </div>
        </li>`
        )
        .join("")}
    </ul>`;
}

function attachmentCategoryOptionsHtml(selected = "") {
  const options = attachmentCategories
    .flatMap((group) =>
      group.types.map(
        (type) =>
          `<option value="${escapeHtml(type.id)}" ${
            selected === type.id ? "selected" : ""
          }>${escapeHtml(type.label)}</option>`
      )
    )
    .join("");
  return `<option value="">Wszystkie typy</option>${options}`;
}

function projectAttachmentsTableHtml(project) {
  const files = project.files || [];
  if (!files.length) {
    return `<p class="files-empty-inline">Brak załączników w tym projekcie.</p>`;
  }

  return `
    <div class="attachments-panel" data-role="project-attachments">
      <div class="table-toolbar">
        <label class="table-filter">
          <span class="sr-only">Filtruj po nazwie</span>
          <input
            type="search"
            data-role="filter-attachment-name"
            placeholder="Filtruj po nazwie pliku…"
            autocomplete="off"
          />
        </label>
        <label class="table-filter">
          <span class="sr-only">Filtruj po typie</span>
          <select data-role="filter-attachment-category">
            ${attachmentCategoryOptionsHtml()}
          </select>
        </label>
        <p class="table-filter-meta" data-role="attachment-filter-count">${files.length} plików</p>
      </div>
      <div class="data-table-wrap data-table-lined-wrap">
        <table class="data-table data-table-lined" data-table="project-attachments">
          <thead>
            <tr>
              <th>Nazwa pliku</th>
              <th>Typ</th>
              <th>Rozmiar</th>
            </tr>
          </thead>
          <tbody>
            ${files
              .map(
                (file) => `
              <tr
                data-file-name="${escapeHtml((file.name || "").toLowerCase())}"
                data-file-category="${escapeHtml(file.categoryId || "")}"
              >
                <td><strong>${escapeHtml(file.name)}</strong></td>
                <td><span class="table-pill ${file.categoryId ? "" : "muted"}">${escapeHtml(
                  findCategoryLabel(file.categoryId)
                )}</span></td>
                <td>${file.size ? formatBytes(file.size) : "—"}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <p class="files-empty-inline attachment-filter-empty" data-role="attachment-filter-empty" hidden>
        Brak załączników pasujących do filtra.
      </p>
    </div>`;
}

function docFormFieldHtml(docId, field, value = "") {
  const fullName = docFieldKey(docId, field.name);
  const control =
    field.type === "textarea"
      ? `<textarea name="${fullName}" rows="3" placeholder="${escapeHtml(
          field.label
        )}">${escapeHtml(value)}</textarea>`
      : `<input name="${fullName}" type="text" value="${escapeHtml(value)}" placeholder="${escapeHtml(
          field.label
        )}" />`;

  return `
    <div class="field">
      <span class="field-label">${escapeHtml(field.label)}</span>
      <div class="field-control ${field.type === "textarea" ? "field-control-textarea" : ""}">
        ${control}
        ${assistButtonHtml("assist-field", fullName, `Pomoc asystenta: ${field.label}`)}
      </div>
    </div>`;
}

function docFormSectionsHtml(project, doc) {
  const saved = project.docForms?.[doc.id] || {};
  const template = resolveDocFormTemplate(doc.id);
  return template.sections
    .map(
      (section, index) => `
            <details class="form-section doc-form-section" data-doc-section="${escapeHtml(
              section.key
            )}" data-doc-id="${escapeHtml(doc.id)}">
              ${sectionSummaryHtml(
                String(index + 1).padStart(2, "0"),
                section.title,
                section.subtitle,
                `doc:${doc.id}:${section.key}`
              )}
              <div class="section-body">
                ${section.fields
                  .map((field) => docFormFieldHtml(doc.id, field, saved[field.name] || ""))
                  .join("")}
              </div>
            </details>`
    )
    .join("");
}

function docFormActionsHtml(project, doc) {
  return `
          <div class="form-actions doc-form-actions">
            <button
              type="button"
              class="ghost-btn"
              data-role="download-doc-pdf"
              data-project-id="${project.id}"
              data-doc-id="${escapeHtml(doc.id)}"
            >
              Pobierz PDF
            </button>
            ${formSaveSubmitButtonHtml()}
          </div>`;
}

function docFormItemHtml(project, doc, { open = false, showTaskMeta = true } = {}) {
  const saved = project.docForms?.[doc.id] || {};
  const fill = countDocFormFill(doc.id, saved);

  return `
    <details class="form-section doc-form-item" data-doc-id="${escapeHtml(doc.id)}" ${
      open ? "open" : ""
    }>
      <summary>
        <span class="section-num">${fill.percent}%</span>
        <span class="section-summary-copy">
          <strong>${escapeHtml(doc.title)}</strong>
          <em>${
            doc.source === "standard" ? "Dokument standardowy" : "Dokument warunkowy"
          } · ${fill.filled}/${fill.total} pól</em>
        </span>
        <span class="doc-form-summary-actions">
          <button
            type="button"
            class="icon-action-btn doc-download-btn"
            data-role="download-doc-pdf"
            data-project-id="${project.id}"
            data-doc-id="${escapeHtml(doc.id)}"
            title="Pobierz PDF (mock)"
            aria-label="Pobierz PDF: ${escapeHtml(doc.title)}"
          >
            ${pdfIconSvg(16)}
            <span>PDF</span>
          </button>
          ${assistButtonHtml(
            "assist-section",
            `doc:${doc.id}`,
            `Wypełnij cały dokument: ${doc.title}`
          )}
        </span>
      </summary>
      <div class="section-body doc-form-body">
        ${showTaskMeta ? documentTaskMetaHtml(project, "survey-doc", doc.id) : ""}
        <form class="doc-mini-form" data-role="doc-form" data-doc-id="${escapeHtml(doc.id)}" autocomplete="off">
          ${docFormSectionsHtml(project, doc)}
          ${docFormActionsHtml(project, doc)}
        </form>
      </div>
    </details>`;
}

function projectFoldHtml({
  role,
  title,
  subtitle,
  bodyHtml,
  actionsHtml = "",
  open = false,
  extraClass = "",
}) {
  return `
    <details class="panel project-fold ${extraClass}" data-role="${role}" ${open ? "open" : ""}>
      <summary class="project-fold-summary">
        <div class="project-fold-copy">
          <h2>${escapeHtml(title)}</h2>
          <p>${subtitle}</p>
        </div>
        <div class="project-fold-actions">
          ${actionsHtml}
          <span class="project-fold-chevron" aria-hidden="true"></span>
        </div>
      </summary>
      <div class="project-fold-body">
        ${bodyHtml}
      </div>
    </details>`;
}

function buildingProjectFoldHtml(project) {
  return projectFoldHtml({
    role: "building-fold",
    title: "Projekt budowlany",
    subtitle: "Metryka, PZT, PAB, PT i załączniki urzędowe",
    actionsHtml: `
      <button
        type="button"
        class="icon-action-btn"
        data-role="generate-building-project"
        data-project-id="${project.id}"
        title="Generuj projekt budowlany (PDF)"
        aria-label="Generuj projekt budowlany PDF"
      >
        ${pdfIconSvg(16)}
      </button>`,
    bodyHtml: `
      <div class="project-fold-cta">
        <p>Wypełnij tomy projektu budowlanego i generuj zestawienie PDF.</p>
        <div class="project-fold-cta-actions">
          <button type="button" class="primary-btn" data-role="open-building-form" data-project-id="${project.id}">
            Otwórz formularz
          </button>
          <button type="button" class="ghost-btn" data-role="generate-building-project" data-project-id="${project.id}">
            Pobierz PDF
          </button>
        </div>
      </div>`,
  });
}

function formalSurveyFoldHtml(project) {
  const count = project.formalSurvey?.documents?.length || 0;
  return projectFoldHtml({
    role: "survey-fold",
    title: "Ankieta formalna",
    subtitle: count
      ? `Uzupełniona · ${count} dokumentów na liście`
      : "Silnik reguł — wygeneruj listę dokumentów",
    bodyHtml: `
      <div class="project-fold-cta">
        <p>${
          count
            ? "Możesz ponownie przejść ankietę — istniejące dokumenty zostaną zachowane, nowe zostaną dodane."
            : "Odpowiedz na pytania, aby wygenerować listę wymaganych dokumentów urzędowych."
        }</p>
        <div class="project-fold-cta-actions">
          <button type="button" class="primary-btn" data-role="open-formal-survey" data-project-id="${project.id}">
            ${count ? "Edytuj ankietę" : "Uruchom ankietę"}
          </button>
        </div>
      </div>`,
  });
}

function documentsToSubmitPanelHtml(project, { focusDocId = null } = {}) {
  const surveyDocs = project.formalSurvey?.documents || [];
  const count = surveyDocs.length;
  const foldOpen = Boolean(focusDocId);

  return projectFoldHtml({
    role: "docs-fold",
    title: "Dokumenty do złożenia",
    subtitle: count
      ? `${count} dokumentów — rozwiń, wypełnij i pobierz PDF`
      : "Brak listy — uruchom ankietę formalną",
    open: foldOpen,
    extraClass: "docs-fold",
    actionsHtml: count
      ? `<button type="button" class="ghost-btn table-action-btn" data-role="open-formal-survey" data-project-id="${project.id}">Ankieta</button>`
      : "",
    bodyHtml: count
      ? `<div class="docs-forms-list">
          ${surveyDocs
            .map((doc) => docFormItemHtml(project, doc, { open: doc.id === focusDocId }))
            .join("")}
        </div>`
      : `<p class="files-empty-inline">Brak listy — uruchom ankietę formalną, aby wygenerować dokumenty urzędowe.</p>`,
  });
}

function attachmentsFoldHtml(project) {
  const filesCount = project.files?.length || 0;
  return projectFoldHtml({
    role: "attachments-fold",
    title: "Załączniki",
    subtitle: filesCount
      ? `${filesCount} plików — filtruj i przeglądaj listę`
      : "Brak załączników w tym projekcie",
    bodyHtml: projectAttachmentsTableHtml(project),
  });
}

function formalSurveyPanelHtml(project, answers, stepIndex) {
  const questions = SURVEY_QUESTIONS;
  const totalSteps = questions.length;
  const step = Math.min(Math.max(stepIndex, 0), totalSteps - 1);
  const question = questions[step];
  const documents = evaluateFormalSurveyDocuments(answers);
  const progress = Math.round(((step + 1) / totalSteps) * 100);
  const currentValue = answers[question.id];
  const savedCount = project.formalSurvey?.documents?.length || 0;

  const optionsHtml =
    question.type === "multi"
      ? `<div class="survey-options survey-options-multi">
          ${question.options
            .map((option) => {
              const checked = Array.isArray(currentValue) && currentValue.includes(option.value);
              return `
              <label class="survey-option ${checked ? "is-selected" : ""}">
                <input type="checkbox" name="survey-${question.id}" value="${option.value}" ${
                checked ? "checked" : ""
              } />
                <span>${escapeHtml(option.label)}</span>
              </label>`;
            })
            .join("")}
        </div>`
      : `<div class="survey-options">
          ${question.options
            .map((option) => {
              const selected = currentValue === option.value;
              return `
              <label class="survey-option ${selected ? "is-selected" : ""}">
                <input type="radio" name="survey-${question.id}" value="${option.value}" ${
                selected ? "checked" : ""
              } />
                <span>${escapeHtml(option.label)}</span>
              </label>`;
            })
            .join("")}
        </div>`;

  return `
    <div class="survey-wrap" data-project-id="${project.id}" data-survey-step="${step}">
      <header class="survey-head">
        <div>
          <p class="eyebrow">Ankieta formalna</p>
          <h2>Kreator dokumentów urzędowych</h2>
          <p class="survey-lead">
            Odpowiedzi zasilają listę dokumentów do złożenia dla tego projektu.
            Ponowny zapis nie usuwa istniejących dokumentów — może tylko dodać nowe.
            ${savedCount ? ` Obecnie na liście: ${savedCount}.` : ""}
          </p>
        </div>
        <button type="button" class="ghost-btn" data-role="close-formal-survey" data-project-id="${project.id}">
          Wróć do projektu
        </button>
      </header>

      <div class="survey-layout">
        <div class="survey-main panel">
          <div class="survey-progress">
            <div class="survey-progress-meta">
              <span>Pytanie ${step + 1} z ${totalSteps}</span>
              <strong>${progress}%</strong>
            </div>
            <div class="survey-progress-bar" aria-hidden="true"><span style="width:${progress}%"></span></div>
          </div>

          <div class="survey-question" data-question-id="${question.id}" data-question-type="${question.type}">
            <h3>${escapeHtml(question.title)}</h3>
            ${question.help ? `<p class="survey-help">${escapeHtml(question.help)}</p>` : ""}
            ${optionsHtml}
          </div>

          <div class="survey-nav">
            <button type="button" class="ghost-btn" data-role="survey-prev" ${step === 0 ? "disabled" : ""}>
              Wstecz
            </button>
            <div class="survey-nav-right">
              ${
                step < totalSteps - 1
                  ? `<button type="button" class="primary-btn" data-role="survey-next">Dalej</button>`
                  : `<button type="button" class="primary-btn" data-role="survey-save">Zapisz listę dokumentów</button>`
              }
            </div>
          </div>
        </div>

        <aside class="survey-results panel" aria-live="polite">
          <div class="panel-head">
            <h2>Lista kontrolna</h2>
            <span class="table-pill">${documents.length}</span>
          </div>
          <p class="survey-results-lead">Aktualizowana na bieżąco na podstawie odpowiedzi.</p>
          ${documentsChecklistHtml(documents)}
        </aside>
      </div>
    </div>`;
}

function projectOverviewHtml(project, options = {}) {
  const allowedTabs = new Set(["tasks", "attachments", "geoportal"]);
  const listTab = allowedTabs.has(options.listTab) ? options.listTab : getProjectListTab();
  const tasks = collectProjectTasks(project);
  const fileCount = (project.files || []).length;

  return `
    <div class="detail-grid project-overview-v2">
      <article class="panel detail-desc-panel">
        <div class="panel-head"><h2>Opis</h2></div>
        <p class="project-desc detail-desc">${escapeHtml(
          project.description || "Bez opisu"
        )}</p>
      </article>

      <div class="project-list-switch" data-role="project-list-switch">
        <div class="project-list-tabs" role="tablist" aria-label="Sekcje projektu">
          <button
            type="button"
            class="project-list-tab ${listTab === "tasks" ? "is-active" : ""}"
            role="tab"
            data-role="project-list-tab"
            data-tab="tasks"
            data-project-id="${project.id}"
            aria-selected="${listTab === "tasks" ? "true" : "false"}"
          >
            <span class="tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-linecap="round" />
              </svg>
            </span>
            <span class="tab-text">Zadania</span>
            <span class="tab-count">${tasks.length}</span>
          </button>
          <button
            type="button"
            class="project-list-tab ${listTab === "attachments" ? "is-active" : ""}"
            role="tab"
            data-role="project-list-tab"
            data-tab="attachments"
            data-project-id="${project.id}"
            aria-selected="${listTab === "attachments" ? "true" : "false"}"
          >
            <span class="tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                <path d="M8 4h7l3 3v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
                <path d="M15 4v3h3" />
              </svg>
            </span>
            <span class="tab-text">Załączniki</span>
            <span class="tab-count">${fileCount}</span>
          </button>
          <button
            type="button"
            class="project-list-tab ${listTab === "geoportal" ? "is-active" : ""}"
            role="tab"
            data-role="project-list-tab"
            data-tab="geoportal"
            data-project-id="${project.id}"
            aria-selected="${listTab === "geoportal" ? "true" : "false"}"
          >
            <span class="tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                <path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9Z" />
                <path d="M12 4v16M4 7.5l8 3.5 8-3.5" />
              </svg>
            </span>
            <span class="tab-text">Geoportal</span>
          </button>
        </div>
        <div class="project-list-tabpanels">
          ${
            listTab === "attachments"
              ? projectAttachmentsOverviewHtml(project)
              : listTab === "geoportal"
                ? projectGeoportalPanelHtml(project)
                : projectTasksPanelHtml(project)
          }
        </div>
      </div>
    </div>`;
}

function projectGeoportalPanelHtml() {
  return `
    <article class="panel project-geoportal-panel">
      <div class="panel-head"><h2>Geoportal</h2></div>
      <div class="geoportal-empty">
        <p class="files-empty-inline">Widok geoportalu pojawi się w kolejnym kroku.</p>
      </div>
    </article>`;
}

function taskStatusFromPercent(percent) {
  if (percent >= 100) return { key: "done", label: "Gotowe" };
  if (percent > 0) return { key: "progress", label: "W toku" };
  return { key: "todo", label: "Do zrobienia" };
}

const CONFIG_STORAGE_KEY = "snappoint.config";
const WORKFLOW_STORAGE_KEY = "snappoint.workflow";

/** @type {{ mode: "global" } | { mode: "project", projectId: string }} */
let workflowRuntime = { mode: "global" };

function setWorkflowRuntime(next) {
  workflowRuntime = next && next.mode === "project" && next.projectId
    ? { mode: "project", projectId: String(next.projectId) }
    : { mode: "global" };
}

function isProjectWorkflowRuntime() {
  return workflowRuntime.mode === "project";
}

function workflowTaskAllowsManualStart(task) {
  if (!task || task.parentId) return false;
  return !(task.blockedBy || []).length;
}

const STATUS_COLOR_PALETTE = [
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

const STATUS_COLOR_IDS = new Set(STATUS_COLOR_PALETTE.map((item) => item.id));

function normalizeStatusColor(value, fallback = "gray") {
  const color = String(value || "").trim().toLowerCase();
  return STATUS_COLOR_IDS.has(color) ? color : fallback;
}

const DEFAULT_KANBAN_STATUSES = [
  { id: "todo", label: "Do zrobienia", color: "gray", autoCompleteAt100: false },
  { id: "progress", label: "W toku", color: "blue", autoCompleteAt100: false },
  { id: "done", label: "Gotowe", color: "green", autoCompleteAt100: true },
];

const DEFAULT_TASK_TYPES = [
  { id: "document", label: "Dokument", autoFromDocs: true },
];

function defaultStatusColorForIndex(index) {
  const defaults = ["gray", "blue", "green", "amber", "violet", "teal", "orange", "rose", "slate", "red"];
  return defaults[Math.max(0, index) % defaults.length];
}

function defaultAppConfig() {
  return {
    statuses: DEFAULT_KANBAN_STATUSES.map((item, index) => ({ ...item, order: index })),
    taskTypes: DEFAULT_TASK_TYPES.map((item) => ({ ...item })),
  };
}

function loadAppConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return defaultAppConfig();
    const statuses = Array.isArray(parsed.statuses) ? parsed.statuses : [];
    const taskTypes = Array.isArray(parsed.taskTypes) ? parsed.taskTypes : [];
    const normalizedStatuses = (statuses.length ? statuses : DEFAULT_KANBAN_STATUSES)
      .map((item, index) => ({
        id: String(item.id || `status-${index + 1}`),
        label: String(item.label || `Status ${index + 1}`).trim() || `Status ${index + 1}`,
        color: normalizeStatusColor(
          item.color,
          DEFAULT_KANBAN_STATUSES.find((row) => row.id === item.id)?.color ||
            defaultStatusColorForIndex(index)
        ),
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
        autoCompleteAt100: Boolean(item.autoCompleteAt100),
      }))
      .sort((a, b) => a.order - b.order)
      .map((item, index) => ({ ...item, order: index }));
    const normalizedTypes = (taskTypes.length ? taskTypes : DEFAULT_TASK_TYPES).map(
      (item, index) => ({
        id: String(item.id || `type-${index + 1}`),
        label: String(item.label || `Typ ${index + 1}`).trim() || `Typ ${index + 1}`,
        autoFromDocs: Boolean(item.autoFromDocs) || item.id === "document",
      })
    );
    if (!normalizedTypes.some((item) => item.id === "document")) {
      normalizedTypes.unshift({ ...DEFAULT_TASK_TYPES[0] });
    }
    return { statuses: normalizedStatuses, taskTypes: normalizedTypes };
  } catch {
    return defaultAppConfig();
  }
}

function saveAppConfig(config) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

function defaultWorkflowState() {
  return {
    paths: [],
    activePathId: null,
  };
}

function normalizeWorkflowTask(item, index = 0) {
  const durationRaw = Number(item?.durationDays);
  const durationDays =
    Number.isFinite(durationRaw) && durationRaw > 0 ? Math.min(999, Math.round(durationRaw)) : null;
  const startDate =
    typeof item?.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.startDate)
      ? item.startDate
      : null;
  const linkedDocIds = (() => {
    const fromArr = Array.isArray(item?.linkedDocIds)
      ? item.linkedDocIds.map(String).filter(Boolean)
      : [];
    if (fromArr.length) return [...new Set(fromArr)];
    if (item?.linkedDocId) return [String(item.linkedDocId)];
    return [];
  })();
  return {
    id: String(item?.id || `wft-${index + 1}`),
    name: String(item?.name || "").trim() || `Zadanie ${index + 1}`,
    parentId: item?.parentId ? String(item.parentId) : null,
    blocks: Array.isArray(item?.blocks) ? [...new Set(item.blocks.map(String))] : [],
    blockedBy: Array.isArray(item?.blockedBy) ? [...new Set(item.blockedBy.map(String))] : [],
    linkedDocIds,
    linkedDocId: linkedDocIds[0] || null,
    sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index,
    durationDays,
    startDate,
    parallel: Boolean(item?.parallel),
  };
}

function normalizeWorkflowPath(item, index = 0) {
  const tasks = Array.isArray(item?.tasks)
    ? item.tasks.map((task, taskIndex) => normalizeWorkflowTask(task, taskIndex))
    : [];
  const taskIds = new Set(tasks.map((task) => task.id));
  const withParents = tasks.map((task) => ({
    ...task,
    parentId: task.parentId && taskIds.has(task.parentId) ? task.parentId : null,
    blocks: task.blocks.filter((id) => taskIds.has(id) && id !== task.id),
    blockedBy: task.blockedBy.filter((id) => taskIds.has(id) && id !== task.id),
  }));
  const sameLevel = sanitizeWorkflowSameLevelDependencies(withParents);
  const childIds = getWorkflowChildIds(sameLevel);
  const cleanedTasks = sameLevel.map((task) => {
    const hasChildren = (childIds.get(task.id) || []).length > 0;
    const isRoot = !task.parentId;
    const hasBlockedBy = (task.blockedBy || []).length > 0;
    return {
      ...task,
      durationDays: hasChildren ? null : task.durationDays,
      startDate: isRoot && !hasBlockedBy ? task.startDate : null,
    };
  });
  return {
    id: String(item?.id || `wf-${index + 1}`),
    name: String(item?.name || "").trim() || `Ścieżka ${index + 1}`,
    createdAt: String(item?.createdAt || "") || new Date().toISOString(),
    tasks: cleanedTasks,
  };
}

function workflowTasksSameLevel(a, b) {
  return (a?.parentId || null) === (b?.parentId || null);
}

/** Bez strzałek zależności zadanie jest równoległe względem rodzeństwa. */
function workflowTaskIsParallel(task) {
  return !(
    (task?.blocks || []).length ||
    (task?.blockedBy || []).length
  );
}

/** Keep dependency edges only between siblings (same parent / root level). */
function sanitizeWorkflowSameLevelDependencies(tasks) {
  const taskMap = getWorkflowTaskMap(tasks);
  const levelFiltered = tasks.map((task) => {
    const blocks = (task.blocks || []).filter((id) => {
      const other = taskMap.get(id);
      return other && workflowTasksSameLevel(task, other);
    });
    const blockedBy = (task.blockedBy || []).filter((id) => {
      const other = taskMap.get(id);
      return other && workflowTasksSameLevel(task, other);
    });
    return { ...task, blocks, blockedBy };
  });

  // Flaga parallel wynika z braku strzałek — nie utrzymujemy osobnego stanu =
  return levelFiltered.map((task) => ({
    ...task,
    parallel: workflowTaskIsParallel(task),
  }));
}

function loadWorkflowState() {
  if (workflowRuntime.mode === "project") {
    const project = getProjectById(workflowRuntime.projectId);
    const inst = project?.flowInstance;
    const rawTasks = Array.isArray(inst?.tasks) ? inst.tasks : [];
    return {
      paths: [
        {
          id: "project-flow",
          name: inst?.sourcePathName || "Flow projektu",
          createdAt: inst?.generatedAt || new Date().toISOString(),
          tasks: rawTasks.map((task, index) => normalizeWorkflowTask(task, index)),
        },
      ],
      activePathId: "project-flow",
    };
  }
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return defaultWorkflowState();
    const paths = Array.isArray(parsed.paths)
      ? parsed.paths.map((item, index) => normalizeWorkflowPath(item, index)).filter((item) => item.id)
      : [];
    const activePathId = paths.some((item) => item.id === parsed.activePathId)
      ? parsed.activePathId
      : paths[0]?.id || null;
    return { paths, activePathId };
  } catch {
    return defaultWorkflowState();
  }
}

function saveWorkflowState(state) {
  if (workflowRuntime.mode === "project") {
    const project = getProjectById(workflowRuntime.projectId);
    if (!project) return;
    const path =
      (state?.paths || []).find((item) => item.id === state.activePathId) ||
      state?.paths?.[0];
    const tasks = (path?.tasks || []).map((task, index) => normalizeWorkflowTask(task, index));
    const flowDocuments =
      typeof collectFlowExtraDocuments === "function"
        ? collectFlowExtraDocuments(tasks, project)
        : project.flowDocuments || [];
    const prevHadStart = projectFlowHasRootStart(project.flowInstance?.tasks);
    const nextHadStart = projectFlowHasRootStart(tasks);
    let nextProject = {
      ...project,
      flowInstance: {
        sourcePathId: project.flowInstance?.sourcePathId || null,
        sourcePathName: path?.name || project.flowInstance?.sourcePathName || "Flow",
        generatedAt: project.flowInstance?.generatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks,
      },
      flowDocuments,
      processTasks: [],
      updatedAt: new Date().toISOString(),
    };
    // Po wyznaczeniu (lub zmianie/wyczyszczeniu) daty startu — daty tabeli = harmonogram flow
    if (nextHadStart || prevHadStart) {
      nextProject = applyFlowScheduleDatesToProject(nextProject);
    }
    persistProject(nextProject);
    return;
  }
  try {
    localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function getWorkflowPaths() {
  return loadWorkflowState().paths;
}

function getActiveWorkflowPath() {
  const state = loadWorkflowState();
  return state.paths.find((item) => item.id === state.activePathId) || null;
}

function setActiveWorkflowPathId(pathId) {
  const state = loadWorkflowState();
  if (!state.paths.some((item) => item.id === pathId)) return state;
  const next = { ...state, activePathId: pathId };
  saveWorkflowState(next);
  return next;
}

function createWorkflowPath(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;
  const state = loadWorkflowState();
  const path = {
    id: `wf-${Date.now()}`,
    name: trimmed,
    createdAt: new Date().toISOString(),
    tasks: [],
  };
  const next = {
    paths: [...state.paths, path],
    activePathId: path.id,
  };
  saveWorkflowState(next);
  return path;
}

function deleteWorkflowPath(pathId) {
  const id = String(pathId || "");
  if (!id) return false;
  const state = loadWorkflowState();
  const paths = (state.paths || []).filter((path) => String(path.id) !== id);
  if (paths.length === (state.paths || []).length) return false;
  const activePathId =
    String(state.activePathId || "") === id
      ? paths[0]?.id || null
      : state.activePathId || null;
  saveWorkflowState({ paths, activePathId });
  return true;
}

function updateActiveWorkflowPath(mutator) {
  const state = loadWorkflowState();
  if (!state.activePathId) return null;
  let updated = null;
  const paths = state.paths.map((path) => {
    if (path.id !== state.activePathId) return path;
    updated = normalizeWorkflowPath(mutator({ ...path, tasks: [...(path.tasks || [])] }));
    return updated;
  });
  if (!updated) return null;
  saveWorkflowState({ ...state, paths });
  return updated;
}

function getWorkflowTaskMap(tasks) {
  return new Map((tasks || []).map((task) => [task.id, task]));
}

function sortWorkflowTasksTree(tasks) {
  const list = [...(tasks || [])].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, "pl");
  });
  const byParent = new Map();
  list.forEach((task) => {
    const key = task.parentId || "";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(task);
  });
  const ordered = [];
  const walk = (parentId, depth) => {
    (byParent.get(parentId || "") || []).forEach((task) => {
      ordered.push({ ...task, depth });
      walk(task.id, depth + 1);
    });
  };
  walk(null, 0);
  return ordered;
}

const WORKFLOW_EXPAND_KEY = "snappoint.workflowExpand";
/** @type {string | null} */
let workflowHighlightTaskId = null;

function loadWorkflowExpandState() {
  try {
    const raw = localStorage.getItem(WORKFLOW_EXPAND_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveWorkflowExpandState(state) {
  try {
    localStorage.setItem(WORKFLOW_EXPAND_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function isWorkflowTaskExpanded(pathId, taskId) {
  const state = loadWorkflowExpandState();
  const pathState = state[pathId];
  // Domyślnie zwinięte — rozwijamy ręcznie
  if (!pathState || typeof pathState !== "object") return false;
  if (!Object.prototype.hasOwnProperty.call(pathState, taskId)) return false;
  return Boolean(pathState[taskId]);
}

function setWorkflowTaskExpanded(pathId, taskId, expanded) {
  const state = loadWorkflowExpandState();
  const pathState = { ...(state[pathId] || {}), [taskId]: Boolean(expanded) };
  saveWorkflowExpandState({ ...state, [pathId]: pathState });
}

function collapseAllWorkflowTasks(pathId, tasks) {
  if (!pathId) return;
  const pathState = {};
  (tasks || []).forEach((task) => {
    pathState[task.id] = false;
  });
  const state = loadWorkflowExpandState();
  saveWorkflowExpandState({ ...state, [pathId]: pathState });
}

function expandWorkflowTaskAncestors(pathId, taskId, tasks) {
  const taskMap = getWorkflowTaskMap(tasks);
  let current = taskMap.get(taskId)?.parentId || null;
  while (current) {
    setWorkflowTaskExpanded(pathId, current, true);
    current = taskMap.get(current)?.parentId || null;
  }
}

function getWorkflowChildIds(tasks) {
  const children = new Map();
  const sorted = [...(tasks || [])].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, "pl");
  });
  sorted.forEach((task) => {
    const key = task.parentId || "";
    if (!children.has(key)) children.set(key, []);
    children.get(key).push(task.id);
  });
  return children;
}

function getWorkflowSiblingIds(tasks, parentId) {
  return getWorkflowChildIds(tasks).get(parentId || "") || [];
}

function getVisibleWorkflowTasks(pathId, tasks) {
  const ordered = sortWorkflowTasksTree(tasks);
  const taskMap = getWorkflowTaskMap(tasks);
  const childIds = getWorkflowChildIds(tasks);
  return ordered
    .filter((task) => {
      let parentId = task.parentId;
      while (parentId) {
        if (!isWorkflowTaskExpanded(pathId, parentId)) return false;
        parentId = taskMap.get(parentId)?.parentId || null;
      }
      return true;
    })
    .map((task) => ({
      ...task,
      hasChildren: (childIds.get(task.id) || []).length > 0,
      expanded: isWorkflowTaskExpanded(pathId, task.id),
    }));
}

function getWorkflowTasksForRender(pathId, tasks) {
  const ordered = sortWorkflowTasksTree(tasks);
  const taskMap = getWorkflowTaskMap(tasks);
  const childIds = getWorkflowChildIds(tasks);
  return ordered.map((task) => {
    let collapsedAway = false;
    let parentId = task.parentId;
    while (parentId) {
      if (!isWorkflowTaskExpanded(pathId, parentId)) {
        collapsedAway = true;
        break;
      }
      parentId = taskMap.get(parentId)?.parentId || null;
    }
    const hasChildren = (childIds.get(task.id) || []).length > 0;
    return {
      ...task,
      hasChildren,
      expanded: isWorkflowTaskExpanded(pathId, task.id),
      collapsedAway,
      isRoot: !task.parentId,
      isLeaf: !hasChildren,
    };
  });
}

function findWorkflowTaskByDocId(path, docId) {
  const did = String(docId || "");
  return (
    (path?.tasks || []).find((task) =>
      normalizeTaskLinkedDocIds(task).includes(did)
    ) || null
  );
}

function renameWorkflowTask(taskId, name) {
  const trimmed = String(name || "").trim();
  if (!trimmed || !taskId) return null;
  return updateActiveWorkflowPath((path) => ({
    ...path,
    tasks: (path.tasks || []).map((task) =>
      task.id === taskId ? { ...task, name: trimmed } : task
    ),
  }));
}

function deleteWorkflowTask(taskId) {
  if (!taskId) return null;
  if (workflowRuntime.mode === "project" && workflowRuntime.projectId) {
    return deleteProjectTaskCascade(workflowRuntime.projectId, taskId);
  }
  return updateActiveWorkflowPath((path) => {
    const tasks = path.tasks || [];
    const removeIds = collectDescendantTaskIds(tasks, taskId);
    const nextTasks = tasks
      .filter((task) => !removeIds.has(String(task.id)))
      .map((task) => ({
        ...task,
        blocks: (task.blocks || []).filter((id) => !removeIds.has(String(id))),
        blockedBy: (task.blockedBy || []).filter((id) => !removeIds.has(String(id))),
      }));
    return { ...path, tasks: nextTasks };
  });
}

function collectDescendantTaskIds(tasks, rootId) {
  const removeIds = new Set([String(rootId)]);
  let changed = true;
  while (changed) {
    changed = false;
    (tasks || []).forEach((task) => {
      const id = String(task.id);
      const parent = task.parentId != null ? String(task.parentId) : "";
      if (parent && removeIds.has(parent) && !removeIds.has(id)) {
        removeIds.add(id);
        changed = true;
      }
    });
  }
  return removeIds;
}

function deleteProjectTaskCascade(projectId, taskId) {
  const project = getProjectById(projectId);
  if (!project || !taskId) return null;
  const flowTasks = project.flowInstance?.tasks || [];
  const customTasks = project.customTasks || [];
  const all = [...flowTasks, ...customTasks];
  const removeIds = collectDescendantTaskIds(all, taskId);
  if (!all.some((task) => String(task.id) === String(taskId))) return null;

  const cleanTask = (task) => ({
    ...task,
    blocks: (task.blocks || []).filter((id) => !removeIds.has(String(id))),
    blockedBy: (task.blockedBy || []).filter((id) => !removeIds.has(String(id))),
    dependsOn: (task.dependsOn || []).filter((id) => !removeIds.has(String(id))),
  });

  const scrubMap = (map) => {
    const next = { ...(map || {}) };
    removeIds.forEach((id) => {
      delete next[id];
    });
    return next;
  };

  return persistProject({
    ...project,
    flowInstance: project.flowInstance
      ? {
          ...project.flowInstance,
          tasks: flowTasks
            .filter((task) => !removeIds.has(String(task.id)))
            .map(cleanTask),
          updatedAt: new Date().toISOString(),
        }
      : project.flowInstance,
    customTasks: customTasks
      .filter((task) => !removeIds.has(String(task.id)))
      .map(cleanTask),
    taskDueDates: scrubMap(project.taskDueDates),
    taskStartDates: scrubMap(project.taskStartDates),
    taskOwners: scrubMap(project.taskOwners),
    taskDescriptions: scrubMap(project.taskDescriptions),
    taskNotes: scrubMap(project.taskNotes),
    taskAttachments: scrubMap(project.taskAttachments),
    taskChecklists: scrubMap(project.taskChecklists),
    taskBoardStatuses: scrubMap(project.taskBoardStatuses),
    updatedAt: new Date().toISOString(),
  });
}

function confirmAndDeleteProjectTask(projectId, taskId) {
  const project = getProjectById(projectId);
  if (!project || !taskId) return false;
  const all = [
    ...(project.flowInstance?.tasks || []),
    ...(project.customTasks || []),
  ];
  const task = all.find((item) => String(item.id) === String(taskId));
  if (!task) return false;
  const removeIds = collectDescendantTaskIds(all, taskId);
  const kids = removeIds.size - 1;
  const ok = window.confirm(
    kids > 0
      ? `Usunąć zadanie „${task.name}” wraz z ${kids} podzadaniami?`
      : `Usunąć zadanie „${task.name}”?`
  );
  if (!ok) return false;
  if (!deleteProjectTaskCascade(projectId, taskId)) return false;
  showTypeToast(kids > 0 ? `Usunięto zadanie i ${kids} podzadań` : "Usunięto zadanie");
  return true;
}

function setWorkflowTaskDuration(taskId, days) {
  const value = Number(days);
  const durationDays =
    Number.isFinite(value) && value > 0 ? Math.min(999, Math.round(value)) : null;
  return updateActiveWorkflowPath((path) => {
    const childIds = getWorkflowChildIds(path.tasks || []);
    if ((childIds.get(taskId) || []).length > 0) return path;
    return {
      ...path,
      tasks: (path.tasks || []).map((task) =>
        task.id === taskId ? { ...task, durationDays } : task
      ),
    };
  });
}

function setWorkflowTaskStartDate(taskId, dateValue) {
  const startDate =
    typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : null;
  return updateActiveWorkflowPath((path) => {
    const task = (path.tasks || []).find((item) => item.id === taskId);
    if (!task || !workflowTaskAllowsManualStart(task)) return path;
    return {
      ...path,
      tasks: (path.tasks || []).map((item) =>
        item.id === taskId ? { ...item, startDate } : item
      ),
    };
  });
}

function setWorkflowTaskParallel(taskId, parallel) {
  // Zachowane dla kompatybilności — równoległość wynika z braku strzałek
  void taskId;
  void parallel;
  return getActiveWorkflowPath();
}

function createWorkflowTask(name, parentId = null) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;
  let created = null;
  updateActiveWorkflowPath((path) => {
    const siblings = (path.tasks || []).filter(
      (task) => (task.parentId || null) === (parentId || null)
    );
    created = normalizeWorkflowTask(
      {
        id: `wft-${Date.now()}`,
        name: trimmed,
        parentId: parentId || null,
        blocks: [],
        blockedBy: [],
        linkedDocId: null,
        sortOrder: siblings.length,
        durationDays: null,
        startDate: null,
        parallel: false,
      },
      siblings.length
    );
    return { ...path, tasks: [...(path.tasks || []), created] };
  });
  return created;
}

function workflowProductionTaskName(docTitle) {
  const title = String(docTitle || "").trim() || "dokument";
  return `Produkcja: ${title}`;
}

/** Rootowe zadania „Produkcja: …” dla dokumentów bez powiązanego zadania. */
function createWorkflowTasksForUnassignedDocuments() {
  let createdCount = 0;
  updateActiveWorkflowPath((path) => {
    const linked = getLinkedDocIdsForPath(path);
    const unassigned = workflowDocCatalog().filter((doc) => doc?.id && !linked.has(doc.id));
    if (!unassigned.length) return path;
    const rootCount = (path.tasks || []).filter((task) => !task.parentId).length;
    const stamp = Date.now();
    const added = unassigned.map((doc, index) =>
      normalizeWorkflowTask(
        {
          id: `wft-${stamp}-${index}`,
          name: workflowProductionTaskName(doc.title || doc.id),
          parentId: null,
          blocks: [],
          blockedBy: [],
          linkedDocId: doc.id,
          sortOrder: rootCount + index,
          durationDays: null,
          startDate: null,
          parallel: false,
        },
        rootCount + index
      )
    );
    createdCount = added.length;
    return { ...path, tasks: [...(path.tasks || []), ...added] };
  });
  return createdCount;
}

function renameWorkflowTaskFromLinkedDocument(taskId) {
  if (!taskId) return null;
  return updateActiveWorkflowPath((path) => {
    const task = (path.tasks || []).find((item) => item.id === taskId);
    if (!task?.linkedDocId) return path;
    const title = workflowDocTitleById(task.linkedDocId);
    const name = workflowProductionTaskName(title);
    return {
      ...path,
      tasks: (path.tasks || []).map((item) =>
        item.id === taskId ? { ...item, name } : item
      ),
    };
  });
}

function workflowCreateUnassignedDocsButtonHtml(unassignedCount) {
  const disabled = unassignedCount <= 0;
  return `
    <div class="workflow-docs-unassigned">
      <button
        type="button"
        class="ghost-btn workflow-docs-unassigned-btn"
        data-role="workflow-create-unassigned"
        ${disabled ? "disabled" : ""}
        title="${
          disabled
            ? "Wszystkie dokumenty mają już przypisane zadania"
            : `Utwórz ${unassignedCount} zadań root dla nieprzypisanych dokumentów`
        }"
      >Utwórz zadania dla nieprzypisanych dokumentów${
        disabled ? "" : ` (${unassignedCount})`
      }</button>
    </div>`;
}

function syncWorkflowDependencyEdges(tasks, taskId, relatedIds, mode) {
  const taskMap = getWorkflowTaskMap(tasks);
  const source = taskMap.get(taskId);
  const related = new Set(
    (relatedIds || []).filter((id) => {
      if (!id || id === taskId) return false;
      const other = taskMap.get(id);
      return other && source && workflowTasksSameLevel(source, other);
    })
  );
  const next = tasks.map((task) => {
    if (task.id === taskId) {
      if (mode === "blocks") {
        return { ...task, blocks: [...related] };
      }
      return { ...task, blockedBy: [...related] };
    }
    if (mode === "blocks") {
      const has = related.has(task.id);
      const blockedBy = new Set(task.blockedBy || []);
      if (has) blockedBy.add(taskId);
      else blockedBy.delete(taskId);
      return {
        ...task,
        blockedBy: [...blockedBy],
      };
    }
    const has = related.has(task.id);
    const blocks = new Set(task.blocks || []);
    if (has) blocks.add(taskId);
    else blocks.delete(taskId);
    return {
      ...task,
      blocks: [...blocks],
    };
  });
  return sanitizeWorkflowSameLevelDependencies(next);
}

function setWorkflowTaskDependencies(taskId, relatedIds, mode) {
  return updateActiveWorkflowPath((path) => ({
    ...path,
    tasks: syncWorkflowDependencyEdges(path.tasks || [], taskId, relatedIds, mode),
  }));
}

function normalizeTaskLinkedDocIds(task) {
  if (!task) return [];
  if (Array.isArray(task.linkedDocIds) && task.linkedDocIds.length) {
    return [...new Set(task.linkedDocIds.map(String).filter(Boolean))];
  }
  if (task.linkedDocId) return [String(task.linkedDocId)];
  return [];
}

/** Dodaje dokument do zadania (wiele dok. → jedno zadanie). docId=null czyści wszystkie. */
function linkWorkflowTaskDocument(taskId, docId) {
  const tid = String(taskId || "");
  const did = docId ? String(docId) : null;
  return updateActiveWorkflowPath((path) => ({
    ...path,
    tasks: (path.tasks || []).map((task) => {
      const current = normalizeTaskLinkedDocIds(task);
      if (String(task.id) === tid) {
        if (!did) {
          return { ...task, linkedDocIds: [], linkedDocId: null };
        }
        const nextIds = current.includes(did) ? current : [...current, did];
        return { ...task, linkedDocIds: nextIds, linkedDocId: nextIds[0] || null };
      }
      if (did && current.includes(did)) {
        const nextIds = current.filter((id) => id !== did);
        return { ...task, linkedDocIds: nextIds, linkedDocId: nextIds[0] || null };
      }
      return task;
    }),
  }));
}

function unlinkWorkflowTaskDocument(taskId, docId) {
  const tid = String(taskId || "");
  const did = String(docId || "");
  if (!tid || !did) return null;
  return updateActiveWorkflowPath((path) => ({
    ...path,
    tasks: (path.tasks || []).map((task) => {
      if (String(task.id) !== tid) return task;
      const nextIds = normalizeTaskLinkedDocIds(task).filter((id) => id !== did);
      return { ...task, linkedDocIds: nextIds, linkedDocId: nextIds[0] || null };
    }),
  }));
}

function canAssignWorkflowDocToTask(taskId, docId) {
  const path = getActiveWorkflowPath();
  const task = path?.tasks?.find((item) => item.id === taskId);
  if (!task || !docId) return false;
  // Wiele dokumentów na jednym zadaniu jest dozwolone
  return true;
}

function removeWorkflowDependency(fromId, toId) {
  const path = getActiveWorkflowPath();
  const task = path?.tasks?.find((item) => item.id === fromId);
  if (!task) return null;
  const nextBlocks = (task.blocks || []).filter((id) => id !== toId);
  return setWorkflowTaskDependencies(fromId, nextBlocks, "blocks");
}

function getLinkedDocIdsForPath(path) {
  const set = new Set();
  (path?.tasks || []).forEach((task) => {
    normalizeTaskLinkedDocIds(task).forEach((id) => set.add(id));
  });
  return set;
}

/** ——— Workflow working calendar (PL: no Sat/Sun/holidays) ——— */

function workflowEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function workflowPadDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function workflowAddCalendarDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return next;
}

function workflowPolishHolidaySet(year) {
  const set = new Set([
    workflowPadDate(year, 1, 1),
    workflowPadDate(year, 1, 6),
    workflowPadDate(year, 5, 1),
    workflowPadDate(year, 5, 3),
    workflowPadDate(year, 8, 15),
    workflowPadDate(year, 11, 1),
    workflowPadDate(year, 11, 11),
    workflowPadDate(year, 12, 25),
    workflowPadDate(year, 12, 26),
  ]);
  if (year >= 2025) set.add(workflowPadDate(year, 12, 24));
  const easter = workflowEasterSunday(year);
  const easterIso = workflowPadDate(
    easter.getFullYear(),
    easter.getMonth() + 1,
    easter.getDate()
  );
  set.add(easterIso);
  const easterMon = workflowAddCalendarDays(easter, 1);
  set.add(
    workflowPadDate(easterMon.getFullYear(), easterMon.getMonth() + 1, easterMon.getDate())
  );
  const pentecost = workflowAddCalendarDays(easter, 49);
  set.add(
    workflowPadDate(pentecost.getFullYear(), pentecost.getMonth() + 1, pentecost.getDate())
  );
  const corpus = workflowAddCalendarDays(easter, 60);
  set.add(workflowPadDate(corpus.getFullYear(), corpus.getMonth() + 1, corpus.getDate()));
  return set;
}

const workflowHolidayCache = new Map();

function workflowHolidaysForYear(year) {
  if (!workflowHolidayCache.has(year)) {
    workflowHolidayCache.set(year, workflowPolishHolidaySet(year));
  }
  return workflowHolidayCache.get(year);
}

function workflowParseIsoDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function workflowFormatIsoDate(date) {
  return workflowPadDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function workflowIsWorkingDay(date) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  const iso = workflowFormatIsoDate(date);
  return !workflowHolidaysForYear(date.getFullYear()).has(iso);
}

function workflowNextWorkingDay(date) {
  let cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  while (!workflowIsWorkingDay(cursor)) {
    cursor = workflowAddCalendarDays(cursor, 1);
  }
  return cursor;
}

function workflowAddWorkingDays(startDate, workingDays) {
  if (!startDate || !(workingDays > 0)) return startDate ? new Date(startDate) : null;
  let cursor = workflowNextWorkingDay(startDate);
  let remaining = workingDays - 1;
  while (remaining > 0) {
    cursor = workflowAddCalendarDays(cursor, 1);
    if (workflowIsWorkingDay(cursor)) remaining -= 1;
  }
  return cursor;
}

function workflowDayAfter(date) {
  return workflowNextWorkingDay(workflowAddCalendarDays(date, 1));
}

function workflowMaxDate(dates) {
  const valid = dates.filter(Boolean);
  if (!valid.length) return null;
  return valid.reduce((max, item) => (item > max ? item : max));
}

function workflowMinDate(dates) {
  const valid = dates.filter(Boolean);
  if (!valid.length) return null;
  return valid.reduce((min, item) => (item < min ? item : min));
}

/**
 * Roll up durations and compute start/end for all tasks.
 * - Leaves: durationDays (user)
 * - Parents: sum of sequential (linked) children + max(parallel children without arrows)
 * - Start: only roots set manually; nested/remaining dates are derived
 * - Parallel (default): siblings without dependency arrows share one time window
 * - Sequential: siblings with arrows chain by deps / sortOrder
 */
function computeWorkflowSchedule(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const taskMap = getWorkflowTaskMap(list);
  const childIds = getWorkflowChildIds(list);
  const schedule = new Map();

  const getDuration = (taskId) => schedule.get(taskId)?.duration || 0;

  const effectiveDuration = (taskId, visiting = new Set()) => {
    if (schedule.has(taskId) && schedule.get(taskId).duration != null) {
      return schedule.get(taskId).duration;
    }
    if (visiting.has(taskId)) return 0;
    visiting.add(taskId);
    const kids = childIds.get(taskId) || [];
    let duration = 0;
    if (kids.length) {
      const parallelDurs = [];
      let sequentialSum = 0;
      kids.forEach((id) => {
        const childDur = effectiveDuration(id, visiting);
        if (workflowTaskIsParallel(taskMap.get(id))) parallelDurs.push(childDur);
        else sequentialSum += childDur;
      });
      duration = sequentialSum + (parallelDurs.length ? Math.max(...parallelDurs) : 0);
    } else {
      const leaf = taskMap.get(taskId);
      duration = leaf?.durationDays > 0 ? leaf.durationDays : 0;
    }
    visiting.delete(taskId);
    const prev = schedule.get(taskId) || {};
    schedule.set(taskId, { ...prev, duration });
    return duration;
  };

  list.forEach((task) => effectiveDuration(task.id));

  const buildSiblingPhases = (siblingTaskIds) => {
    const siblings = siblingTaskIds.map((id) => taskMap.get(id)).filter(Boolean);
    const phases = [];
    const parallelTasks = siblings.filter((task) => workflowTaskIsParallel(task));
    if (parallelTasks.length) {
      phases.push({
        parallel: true,
        tasks: parallelTasks,
        order: Math.min(...parallelTasks.map((task) => task.sortOrder)),
      });
    }
    siblings
      .filter((task) => !workflowTaskIsParallel(task))
      .forEach((task) => {
        phases.push({ parallel: false, tasks: [task], order: task.sortOrder });
      });
    phases.sort((a, b) => a.order - b.order || a.tasks[0].name.localeCompare(b.tasks[0].name, "pl"));
    return phases;
  };

  const blockerFloor = (task) => {
    const dates = [];
    (task.blockedBy || []).forEach((predId) => {
      const predEnd = workflowParseIsoDate(schedule.get(predId)?.endDate);
      if (predEnd) dates.push(workflowDayAfter(predEnd));
    });
    return workflowMaxDate(dates);
  };

  const applyTaskDates = (task, floorStart) => {
    const duration = getDuration(task.id);
    const candidates = [];
    if (floorStart) candidates.push(floorStart);
    const fromBlockers = blockerFloor(task);
    if (fromBlockers) candidates.push(fromBlockers);

    if (!task.parentId && task.startDate && !(task.blockedBy || []).length) {
      const explicit = workflowParseIsoDate(task.startDate);
      if (explicit) candidates.push(workflowNextWorkingDay(explicit));
    }

    let startDate = workflowMaxDate(candidates);
    if (startDate) startDate = workflowNextWorkingDay(startDate);

    let endDate = null;
    if (startDate && duration > 0) {
      endDate = workflowAddWorkingDays(startDate, duration);
    } else if (startDate) {
      endDate = startDate;
    }

    schedule.set(task.id, {
      duration,
      startDate: startDate ? workflowFormatIsoDate(startDate) : null,
      endDate: endDate ? workflowFormatIsoDate(endDate) : null,
      startIsManual: Boolean(!task.parentId && task.startDate),
      parallel: workflowTaskIsParallel(task),
    });
    return endDate;
  };

  const scheduleGroup = (parentId, inheritedFloor) => {
    const siblingIds = getWorkflowSiblingIds(list, parentId);
    if (!siblingIds.length) return;

    // Roots: each has own start date — no sibling chaining between roots
    if (!parentId) {
      siblingIds.forEach((id) => {
        const task = taskMap.get(id);
        if (!task) return;
        applyTaskDates(task, null);
        scheduleGroup(task.id, workflowParseIsoDate(schedule.get(task.id)?.startDate));
      });
      return;
    }

    const phases = buildSiblingPhases(siblingIds);
    let cursor = inheritedFloor ? workflowNextWorkingDay(inheritedFloor) : null;

    phases.forEach((phase) => {
      const ends = [];
      phase.tasks.forEach((task) => {
        const end = applyTaskDates(task, cursor);
        if (end) ends.push(end);
        scheduleGroup(task.id, workflowParseIsoDate(schedule.get(task.id)?.startDate));
      });
      const phaseEnd = workflowMaxDate(ends);
      if (phaseEnd) cursor = workflowDayAfter(phaseEnd);
    });
  };

  scheduleGroup(null, null);

  // Pull starts forward when "wymaga wykonania" resolves after first tree pass
  for (let pass = 0; pass < list.length + 2; pass += 1) {
    let changed = false;
    list.forEach((task) => {
      const prev = schedule.get(task.id);
      if (!prev) return;
      const candidates = [];
      const currentStart = workflowParseIsoDate(prev.startDate);
      if (currentStart) candidates.push(currentStart);
      if (!task.parentId && task.startDate && !(task.blockedBy || []).length) {
        const explicit = workflowParseIsoDate(task.startDate);
        if (explicit) candidates.push(workflowNextWorkingDay(explicit));
      }
      const fromBlockers = blockerFloor(task);
      if (fromBlockers) candidates.push(fromBlockers);
      let startDate = workflowMaxDate(candidates);
      if (!startDate) return;
      startDate = workflowNextWorkingDay(startDate);
      const startIso = workflowFormatIsoDate(startDate);
      if (startIso === prev.startDate) return;
      const duration = prev.duration || 0;
      const endDate =
        duration > 0 ? workflowAddWorkingDays(startDate, duration) : startDate;
      schedule.set(task.id, {
        ...prev,
        startDate: startIso,
        endDate: endDate ? workflowFormatIsoDate(endDate) : null,
      });
      changed = true;
    });
    if (!changed) break;
  }

  // Parents: span dates from children; keep rolled duration
  const depthMap = new Map(sortWorkflowTasksTree(list).map((task) => [task.id, task.depth || 0]));
  [...list]
    .sort((a, b) => (depthMap.get(b.id) || 0) - (depthMap.get(a.id) || 0))
    .forEach((task) => {
      const kids = childIds.get(task.id) || [];
      if (!kids.length) return;
      const childStarts = kids.map((id) => workflowParseIsoDate(schedule.get(id)?.startDate));
      const childEnds = kids.map((id) => workflowParseIsoDate(schedule.get(id)?.endDate));
      const minStart = workflowMinDate(childStarts);
      const maxEnd = workflowMaxDate(childEnds);
      const prev = schedule.get(task.id) || { duration: 0 };
      schedule.set(task.id, {
        ...prev,
        duration: prev.duration || 0,
        startDate: minStart ? workflowFormatIsoDate(minStart) : prev.startDate || null,
        endDate: maxEnd ? workflowFormatIsoDate(maxEnd) : prev.endDate || null,
        startIsManual: Boolean(!task.parentId && task.startDate),
        parallel: workflowTaskIsParallel(task),
      });
    });

  return schedule;
}

/** Czy którykolwiek korzeń flow ma ręczną datę startu (kotwica harmonogramu). */
function projectFlowHasRootStart(tasks) {
  return (tasks || []).some(
    (task) =>
      !task.parentId &&
      !(task.blockedBy || []).length &&
      typeof task.startDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(task.startDate)
  );
}

/** Liczba dni roboczych włącznie od–do (do eksportu durationDays). */
function workflowCountWorkingDaysInclusive(startIso, endIso) {
  let start = workflowParseIsoDate(startIso);
  const end = workflowParseIsoDate(endIso);
  if (!start || !end || end < start) return null;
  start = workflowNextWorkingDay(start);
  if (start > end) return null;
  let count = 0;
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor <= end) {
    if (workflowIsWorkingDay(cursor)) count += 1;
    cursor = workflowAddCalendarDays(cursor, 1);
  }
  return count > 0 ? count : null;
}

/**
 * Przygotuj zadania flow projektu do szablonu Workflow:
 * zachowaj durationDays (uzupełnij z dat projektu, jeśli brak), wyczyść kotwice startu.
 */
function buildWorkflowTemplateTasksFromProject(project) {
  const tasks = Array.isArray(project?.flowInstance?.tasks)
    ? project.flowInstance.tasks
    : [];
  const childIds = getWorkflowChildIds(tasks);
  return tasks.map((task, index) => {
    const id = String(task.id);
    const hasChildren = (childIds.get(id) || []).length > 0;
    let durationDays = task.durationDays;
    if (!hasChildren && !(durationDays > 0)) {
      const start =
        typeof getTaskStartDate === "function"
          ? getTaskStartDate(project, id)
          : project?.taskStartDates?.[id] || task.startDate || "";
      const due =
        typeof getTaskDueDate === "function"
          ? getTaskDueDate(project, id)
          : project?.taskDueDates?.[id] || task.dueDate || "";
      const fromDates = workflowCountWorkingDaysInclusive(start, due);
      if (fromDates) durationDays = fromDates;
      else if (start && due && typeof ganttDayDiff === "function") {
        const a = parseTaskDateOnly?.(start) || workflowParseIsoDate(start);
        const b = parseTaskDateOnly?.(due) || workflowParseIsoDate(due);
        if (a && b && b >= a) durationDays = ganttDayDiff(a, b) + 1;
      }
    }
    return normalizeWorkflowTask(
      {
        ...task,
        durationDays: hasChildren ? null : durationDays,
        startDate: null,
      },
      index
    );
  });
}

/** parentId zadania w flow lub customTasks. */
function resolveProjectTaskParentId(project, taskId) {
  const tid = String(taskId || "");
  if (!tid || !project) return null;
  const flow = (project.flowInstance?.tasks || []).find(
    (task) => String(task.id) === tid
  );
  if (flow) return flow.parentId ? String(flow.parentId) : null;
  const custom = (project.customTasks || []).find((task) => String(task.id) === tid);
  return custom?.parentId ? String(custom.parentId) : null;
}

/** Zakres Od–Do zadania z map projektu (z fallbackiem pól zadania). */
function getProjectTaskScheduleBounds(project, taskId) {
  const tid = String(taskId || "");
  if (!tid || !project) return { start: null, due: null };
  let start = String(getTaskStartDate(project, tid) || "").slice(0, 10);
  let due = String(getTaskDueDate(project, tid) || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    const flow = (project.flowInstance?.tasks || []).find(
      (task) => String(task.id) === tid
    );
    const custom = (project.customTasks || []).find((task) => String(task.id) === tid);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      start = String(flow?.startDate || custom?.startDate || "").slice(0, 10);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      due = String(flow?.dueDate || custom?.dueDate || "").slice(0, 10);
    }
  }
  return {
    start: /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : null,
    due: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
  };
}

/**
 * Wepchnij zakres [start,end] w ramy [boundStart,boundEnd], zachowując długość gdy się da.
 */
function clampTaskRangeToBounds(startIso, endIso, boundStart, boundEnd) {
  const rawStart = String(startIso || "").slice(0, 10);
  const rawEnd = String(endIso || "").slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(rawStart) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(rawEnd) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(boundStart || "")) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(boundEnd || ""))
  ) {
    return { start: rawStart, end: rawEnd, clamped: false };
  }
  const bS = parseTaskDateOnly(boundStart);
  const bE = parseTaskDateOnly(boundEnd);
  let s = parseTaskDateOnly(rawStart);
  let e = parseTaskDateOnly(rawEnd);
  if (!bS || !bE || !s || !e) {
    return { start: rawStart, end: rawEnd, clamped: false };
  }
  if (bE < bS) {
    return { start: rawStart, end: rawEnd, clamped: false };
  }
  if (e < s) {
    const tmp = s;
    s = e;
    e = tmp;
  }

  const boundDays = ganttDayDiff(bS, bE);
  let dur = ganttDayDiff(s, e);
  let clamped = false;

  if (dur > boundDays) {
    return {
      start: toIsoDateOnly(bS),
      end: toIsoDateOnly(bE),
      clamped: true,
    };
  }

  if (s < bS) {
    const shift = ganttDayDiff(s, bS);
    s = addDaysIso(s, shift);
    e = addDaysIso(e, shift);
    clamped = true;
  }
  if (e > bE) {
    const shift = ganttDayDiff(bE, e);
    s = addDaysIso(s, -shift);
    e = addDaysIso(e, -shift);
    clamped = true;
  }
  if (s < bS) {
    s = new Date(bS.getFullYear(), bS.getMonth(), bS.getDate());
    e = addDaysIso(s, dur);
    if (e > bE) e = new Date(bE.getFullYear(), bE.getMonth(), bE.getDate());
    clamped = true;
  }

  return {
    start: toIsoDateOnly(s),
    end: toIsoDateOnly(e),
    clamped,
  };
}

/** Ogranicz daty zadania do ram bezpośredniego nadrzędnego. */
function clampTaskRangeToParent(project, taskId, startIso, endIso) {
  const parentId = resolveProjectTaskParentId(project, taskId);
  if (!parentId) {
    return {
      start: String(startIso || "").slice(0, 10),
      end: String(endIso || "").slice(0, 10),
      clamped: false,
      parentId: null,
    };
  }
  const bounds = getProjectTaskScheduleBounds(project, parentId);
  if (!bounds.start || !bounds.due) {
    return {
      start: String(startIso || "").slice(0, 10),
      end: String(endIso || "").slice(0, 10),
      clamped: false,
      parentId,
    };
  }
  const result = clampTaskRangeToBounds(
    startIso,
    endIso,
    bounds.start,
    bounds.due
  );
  return { ...result, parentId };
}

/**
 * Wepchnij wszystkie potomne zadania w ramy nadrzędnego (po zmianie ram rodzica).
 */
function clampProjectSubtreeToParentBounds(project, parentId) {
  if (!project || !parentId) return project;
  const bounds = getProjectTaskScheduleBounds(project, parentId);
  if (!bounds.start || !bounds.due) return project;

  const childIds = [];
  const walk = (pid) => {
    (project.flowInstance?.tasks || []).forEach((task) => {
      if (String(task.parentId || "") === String(pid)) {
        childIds.push(String(task.id));
        walk(task.id);
      }
    });
    (project.customTasks || []).forEach((task) => {
      if (String(task.parentId || "") === String(pid)) {
        childIds.push(String(task.id));
        walk(task.id);
      }
    });
  };
  walk(parentId);

  if (!childIds.length) return project;

  let nextStarts = { ...(project.taskStartDates || {}) };
  let nextDues = { ...(project.taskDueDates || {}) };
  let nextCustom = (project.customTasks || []).map((item) => ({ ...item }));
  let changed = false;

  childIds.forEach((id) => {
    const curStart =
      String(nextStarts[id] || getTaskStartDate(project, id) || "").slice(0, 10);
    const curDue =
      String(nextDues[id] || getTaskDueDate(project, id) || "").slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(curStart) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(curDue)
    ) {
      return;
    }
    const clamped = clampTaskRangeToBounds(
      curStart,
      curDue,
      bounds.start,
      bounds.due
    );
    if (!clamped.clamped && clamped.start === curStart && clamped.end === curDue) {
      return;
    }
    changed = true;
    nextStarts[id] = clamped.start;
    nextDues[id] = clamped.end;
    nextCustom = nextCustom.map((item) =>
      String(item.id) === id
        ? { ...item, startDate: clamped.start, dueDate: clamped.end }
        : item
    );
  });

  if (!changed) return project;
  return {
    ...project,
    taskStartDates: nextStarts,
    taskDueDates: nextDues,
    customTasks: nextCustom,
    updatedAt: new Date().toISOString(),
  };
}

/** Przesuń ISO datę o N dni kalendarzowych. */
function shiftIsoDateByDays(iso, dayDelta) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso)) || !dayDelta) {
    return iso || null;
  }
  const parsed =
    typeof parseTaskDateOnly === "function"
      ? parseTaskDateOnly(iso)
      : workflowParseIsoDate(iso);
  if (!parsed) return iso;
  const next =
    typeof addDaysIso === "function"
      ? addDaysIso(parsed, dayDelta)
      : workflowAddCalendarDays(parsed, dayDelta);
  return typeof toIsoDateOnly === "function"
    ? toIsoDateOnly(next)
    : workflowFormatIsoDate(next);
}

/**
 * Start projektu = zawsze data najwcześniejszego zadania (Od).
 */
function getProjectFlowScheduleAnchor(project) {
  const starts = [];
  const push = (value) => {
    const iso = String(value || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) starts.push(iso);
  };
  Object.values(project?.taskStartDates || {}).forEach(push);
  (project?.customTasks || []).forEach((task) => push(task.startDate));
  (project?.flowInstance?.tasks || []).forEach((task) => push(task.startDate));
  if (!starts.length) return null;
  starts.sort();
  return starts[0];
}

function projectHasScheduledTaskDates(project) {
  const maps = [project?.taskStartDates, project?.taskDueDates];
  return maps.some(
    (map) =>
      map &&
      Object.values(map).some((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")))
  );
}

/**
 * Przesuń wszystkie daty projektu (mapy + custom + startDate korzeni flow) o N dni.
 */
function shiftProjectScheduleByDays(project, dayDelta, options = {}) {
  if (!project || !dayDelta) return project;
  const onlyIds = options.onlyIds ? new Set([...options.onlyIds].map(String)) : null;
  const shiftValue = (iso) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return iso;
    return shiftIsoDateByDays(iso, dayDelta);
  };
  const shiftMap = (map) => {
    const next = { ...(map || {}) };
    Object.keys(next).forEach((id) => {
      if (onlyIds && !onlyIds.has(String(id))) return;
      next[id] = shiftValue(next[id]);
    });
    return next;
  };

  const nextCustom = (project.customTasks || []).map((item) => {
    if (onlyIds && !onlyIds.has(String(item.id))) return item;
    return {
      ...item,
      startDate: shiftValue(item.startDate) || item.startDate,
      dueDate: shiftValue(item.dueDate) || item.dueDate,
    };
  });

  const nextFlowTasks = (project.flowInstance?.tasks || []).map((task) => {
    if (onlyIds && !onlyIds.has(String(task.id))) return task;
    if (!task.startDate) return task;
    return { ...task, startDate: shiftValue(task.startDate) };
  });

  return {
    ...project,
    taskStartDates: shiftMap(project.taskStartDates),
    taskDueDates: shiftMap(project.taskDueDates),
    customTasks: nextCustom,
    flowInstance: project.flowInstance
      ? {
          ...project.flowInstance,
          tasks: nextFlowTasks,
          updatedAt: new Date().toISOString(),
        }
      : project.flowInstance,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Ustaw start projektu (= data najwcześniejszego zadania).
 * - Pierwszy raz (brak dat): wylicz harmonogram z durationDays od podanej daty.
 * - Gdy daty już są: przesuń CAŁY harmonogram o deltę względem obecnego najwcześniejszego.
 * @returns {object | null} zaktualizowany projekt
 */
function applyProjectFlowStartAnchor(project, startIso, options = {}) {
  if (!project) return null;
  const startDate =
    typeof startIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startIso)
      ? startIso
      : null;
  if (!startDate) return project;

  const forceRecompute = Boolean(options.forceRecompute);
  const oldAnchor = getProjectFlowScheduleAnchor(project);
  const canShift =
    !forceRecompute &&
    oldAnchor &&
    /^\d{4}-\d{2}-\d{2}$/.test(oldAnchor) &&
    projectHasScheduledTaskDates(project);

  if (canShift) {
    const oldDate =
      typeof parseTaskDateOnly === "function"
        ? parseTaskDateOnly(oldAnchor)
        : workflowParseIsoDate(oldAnchor);
    const newDate =
      typeof parseTaskDateOnly === "function"
        ? parseTaskDateOnly(startDate)
        : workflowParseIsoDate(startDate);
    if (!oldDate || !newDate) return project;
    const dayDelta =
      typeof ganttDayDiff === "function"
        ? ganttDayDiff(oldDate, newDate)
        : Math.round((newDate - oldDate) / 86400000);
    if (!dayDelta) return project;

    // Względem najwcześniejszego (np. cofniętego) zadania — całość jedzie razem
    let next = shiftProjectScheduleByDays(project, dayDelta);
    next = { ...next, autoScheduleDates: false };
    return next;
  }

  // Pierwszy start / pusty harmonogram — wylicz z czasów trwania szablonu
  const tasks = Array.isArray(project.flowInstance?.tasks)
    ? project.flowInstance.tasks
    : [];
  if (!tasks.length) return project;

  const nextTasks = tasks.map((task) => {
    if (!workflowTaskAllowsManualStart(task)) return task;
    return { ...task, startDate };
  });

  let next = {
    ...project,
    autoScheduleDates: true,
    flowInstance: {
      ...(project.flowInstance || {}),
      tasks: nextTasks,
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
  next = applyFlowScheduleDatesToProject(next);
  return next;
}

/**
 * Przenieś Od/Do z harmonogramu flow do dat tabeli projektu (taskStartDates / taskDueDates).
 * Wywoływane gdy wyznaczona jest data startu korzenia (i przy kolejnych zapisach flow z kotwicą).
 */
function applyFlowScheduleDatesToProject(project) {
  const tasks = project?.flowInstance?.tasks || [];
  if (!project || !tasks.length) return project;
  if (!isProjectAutoScheduleEnabled(project)) return project;

  const schedule = computeWorkflowSchedule(tasks);
  const nextStarts = { ...(project.taskStartDates || {}) };
  const nextDues = { ...(project.taskDueDates || {}) };

  tasks.forEach((task) => {
    const sched = schedule.get(task.id) || {};
    if (sched.startDate) nextStarts[task.id] = sched.startDate;
    else delete nextStarts[task.id];
    if (sched.endDate) nextDues[task.id] = sched.endDate;
    else delete nextDues[task.id];
  });

  return {
    ...project,
    taskStartDates: nextStarts,
    taskDueDates: nextDues,
  };
}

const WORKFLOW_DOCS_COLLAPSED_KEY = "snappoint.workflowDocsCollapsed";

function isWorkflowDocsCollapsed() {
  try {
    return localStorage.getItem(WORKFLOW_DOCS_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function setWorkflowDocsCollapsed(collapsed) {
  try {
    localStorage.setItem(WORKFLOW_DOCS_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function isWorkflowDescendant(tasks, ancestorId, nodeId) {
  const taskMap = getWorkflowTaskMap(tasks);
  let current = taskMap.get(nodeId)?.parentId || null;
  while (current) {
    if (current === ancestorId) return true;
    current = taskMap.get(current)?.parentId || null;
  }
  return false;
}

function renumberWorkflowSiblingOrders(tasks, parentId) {
  const siblings = tasks
    .filter((task) => (task.parentId || null) === (parentId || null))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name, "pl");
    });
  const orderMap = new Map(siblings.map((task, index) => [task.id, index]));
  return tasks.map((task) =>
    orderMap.has(task.id) ? { ...task, sortOrder: orderMap.get(task.id) } : task
  );
}

function taskHasDependencyLinks(task) {
  return Boolean(
    (task?.blocks || []).length ||
      (task?.blockedBy || []).length ||
      (task?.dependsOn || []).length
  );
}

function parentChangeDependencyBlockReason(moving, newParentId) {
  if ((moving?.parentId || null) === (newParentId || null)) return null;
  if (!taskHasDependencyLinks(moving)) return null;
  return "Najpierw usuń powiązania — działają tylko na tym samym poziomie.";
}

/** Roll up Data Do for every parent from the latest child due (all levels). */
function recomputeProjectParentDueDates(project) {
  if (!project || !isProjectAutoScheduleEnabled(project)) return project;
  const seen = new Set();
  const nodes = [];
  (project.flowInstance?.tasks || []).forEach((task) => {
    if (!task?.id || seen.has(task.id)) return;
    seen.add(task.id);
    nodes.push({ id: task.id, parentId: task.parentId || null });
  });
  (project.customTasks || []).forEach((task) => {
    if (!task?.id || seen.has(task.id)) return;
    seen.add(task.id);
    nodes.push({ id: task.id, parentId: task.parentId || null });
  });

  const childrenOf = new Map();
  nodes.forEach((node) => {
    if (!node.parentId) return;
    if (!childrenOf.has(node.parentId)) childrenOf.set(node.parentId, []);
    childrenOf.get(node.parentId).push(node.id);
  });

  const dues = { ...(project.taskDueDates || {}) };
  const memo = new Map();
  const resolveDue = (id) => {
    if (memo.has(id)) return memo.get(id);
    const kids = childrenOf.get(id) || [];
    let due = "";
    if (!kids.length) {
      due = dues[id] || "";
    } else {
      const childDues = kids
        .map((childId) => resolveDue(childId))
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
      due = childDues.length ? childDues.reduce((a, b) => (a > b ? a : b)) : "";
      if (due) dues[id] = due;
      else delete dues[id];
    }
    memo.set(id, due);
    return due;
  };
  nodes.forEach((node) => resolveDue(node.id));
  return { ...project, taskDueDates: dues };
}

/**
 * Create or remove FS dependency: fromId blocks toId (same parent level only).
 */
function setProjectTaskDependency(projectId, fromId, toId, { remove = false } = {}) {
  const project = getProjectById(projectId);
  if (!project || !fromId || !toId || fromId === toId) return null;

  const flowTasks = [...(project.flowInstance?.tasks || [])];
  const customTasks = [...(project.customTasks || [])];
  const fromFlow = flowTasks.find((task) => String(task.id) === String(fromId));
  const toFlow = flowTasks.find((task) => String(task.id) === String(toId));
  const fromCustom = customTasks.find((task) => String(task.id) === String(fromId));
  const toCustom = customTasks.find((task) => String(task.id) === String(toId));

  if (fromFlow && toFlow) {
    if (!workflowTasksSameLevel(fromFlow, toFlow)) {
      showTypeToast("Powiązania tylko na tym samym poziomie");
      return null;
    }
    let related = [...(fromFlow.blocks || [])];
    if (remove) related = related.filter((id) => id !== toId);
    else if (!related.includes(toId)) related.push(toId);
    const tasks = syncWorkflowDependencyEdges(flowTasks, fromId, related, "blocks");
    let next = {
      ...project,
      flowInstance: {
        ...project.flowInstance,
        tasks,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    next = applyFlowScheduleDatesToProject(next);
    next = recomputeProjectParentDueDates(next);
    return persistProject(next);
  }

  if (fromCustom && toCustom) {
    if (!workflowTasksSameLevel(fromCustom, toCustom)) {
      showTypeToast("Powiązania tylko na tym samym poziomie");
      return null;
    }
    const nextCustom = customTasks.map((task) => {
      if (String(task.id) !== String(toId)) return task;
      const deps = new Set(task.dependsOn || []);
      if (remove) deps.delete(fromId);
      else deps.add(fromId);
      return { ...task, dependsOn: [...deps], updatedAt: new Date().toISOString() };
    });
    let next = {
      ...project,
      customTasks: nextCustom,
      updatedAt: new Date().toISOString(),
    };
    next = recomputeProjectParentDueDates(next);
    return persistProject(next);
  }

  showTypeToast("Powiązania Gantta działają w obrębie tego samego typu zadań");
  return null;
}

function collectProjectDependencyEdges(project) {
  const edges = [];
  const flowTasks = project?.flowInstance?.tasks || [];
  const flowMap = getWorkflowTaskMap(flowTasks);
  flowTasks.forEach((task) => {
    (task.blocks || []).forEach((toId) => {
      const target = flowMap.get(toId);
      if (!target || !workflowTasksSameLevel(task, target)) return;
      edges.push({ from: task.id, to: toId, projectId: project.id });
    });
  });
  const customTasks = project?.customTasks || [];
  const customMap = new Map(customTasks.map((task) => [task.id, task]));
  customTasks.forEach((task) => {
    (task.dependsOn || []).forEach((fromId) => {
      const pred = customMap.get(fromId);
      if (!pred || !workflowTasksSameLevel(pred, task)) return;
      edges.push({ from: fromId, to: task.id, projectId: project.id });
    });
  });
  return edges;
}

/**
 * Move task within active path.
 * @param {string} taskId
 * @param {{ mode: "before"|"after"|"nest", targetId: string }} placement
 */
function applyMoveOnTaskList(tasks, taskId, placement) {
  const { mode, targetId } = placement || {};
  if (!taskId || !targetId || taskId === targetId) return null;
  let list = [...(tasks || [])];
  const moving = list.find((task) => task.id === taskId);
  const target = list.find((task) => task.id === targetId);
  if (!moving || !target) return null;
  if (isWorkflowDescendant(list, taskId, targetId)) return null;

  const nextParentId = mode === "nest" ? targetId : target.parentId || null;
  const depBlock = parentChangeDependencyBlockReason(moving, nextParentId);
  if (depBlock) {
    applyMoveOnTaskList.lastError = depBlock;
    return null;
  }
  applyMoveOnTaskList.lastError = "";

  if (mode === "nest") {
    const oldParent = moving.parentId || null;
    const newParent = targetId;
    list = list.map((task) =>
      task.id === taskId ? { ...task, parentId: newParent } : task
    );
    const siblings = list
      .filter((task) => (task.parentId || null) === newParent && task.id !== taskId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const orderedIds = [...siblings.map((task) => task.id), taskId];
    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
    list = list.map((task) =>
      orderMap.has(task.id)
        ? { ...task, parentId: newParent, sortOrder: orderMap.get(task.id) }
        : task
    );
    if (typeof renumberWorkflowSiblingOrders === "function") {
      list = renumberWorkflowSiblingOrders(list, oldParent);
    }
    return list;
  }

  const newParent = target.parentId || null;
  const oldParent = moving.parentId || null;
  list = list.map((task) =>
    task.id === taskId ? { ...task, parentId: newParent } : task
  );
  const siblings = list
    .filter((task) => (task.parentId || null) === newParent && task.id !== taskId)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const targetIndex = siblings.findIndex((task) => task.id === targetId);
  const insertAt = mode === "after" ? targetIndex + 1 : Math.max(0, targetIndex);
  const orderedIds = siblings.map((task) => task.id);
  orderedIds.splice(insertAt, 0, taskId);
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
  list = list.map((task) =>
    orderMap.has(task.id)
      ? { ...task, parentId: newParent, sortOrder: orderMap.get(task.id) }
      : task
  );
  if (oldParent !== newParent && typeof renumberWorkflowSiblingOrders === "function") {
    list = renumberWorkflowSiblingOrders(list, oldParent);
  }
  return list;
}

function moveProjectTask(projectId, taskId, placement) {
  moveProjectTask.lastError = "";
  const project = getProjectById(projectId);
  if (!project || !taskId || !placement?.targetId) return null;
  const flowTasks = project.flowInstance?.tasks || [];
  const customTasks = project.customTasks || [];
  const inFlow = flowTasks.some((task) => String(task.id) === String(taskId));
  const targetInFlow = flowTasks.some(
    (task) => String(task.id) === String(placement.targetId)
  );
  const inCustom = customTasks.some((task) => String(task.id) === String(taskId));
  const targetInCustom = customTasks.some(
    (task) => String(task.id) === String(placement.targetId)
  );

  const movingTask =
    flowTasks.find((task) => String(task.id) === String(taskId)) ||
    customTasks.find((task) => String(task.id) === String(taskId));
  const targetTask =
    flowTasks.find((task) => String(task.id) === String(placement.targetId)) ||
    customTasks.find((task) => String(task.id) === String(placement.targetId));
  if (movingTask && targetTask) {
    const nextParentId =
      placement.mode === "nest" ? targetTask.id : targetTask.parentId || null;
    const depBlock = parentChangeDependencyBlockReason(movingTask, nextParentId);
    if (depBlock) {
      moveProjectTask.lastError = depBlock;
      showTypeToast(depBlock);
      return null;
    }
  }

  let next = { ...project, updatedAt: new Date().toISOString() };

  if (inFlow && targetInFlow) {
    applyMoveOnTaskList.lastError = "";
    const moved = applyMoveOnTaskList(flowTasks, taskId, placement);
    if (!moved) {
      if (applyMoveOnTaskList.lastError) {
        moveProjectTask.lastError = applyMoveOnTaskList.lastError;
        showTypeToast(applyMoveOnTaskList.lastError);
      }
      return null;
    }
    next = {
      ...next,
      flowInstance: {
        ...project.flowInstance,
        tasks: moved,
        updatedAt: new Date().toISOString(),
      },
    };
  } else if (inCustom) {
    // Cel może być custom lub flow (parentId wskazuje na dowolne zadanie)
    let working = [...customTasks];
    if (targetInFlow && !targetInCustom) {
      // tymczasowo dołącz cel flow, żeby nest/before działał względem parentId
      const flowTarget = flowTasks.find(
        (task) => String(task.id) === String(placement.targetId)
      );
      if (!flowTarget) return null;
      if (placement.mode === "nest") {
        working = working.map((task) =>
          String(task.id) === String(taskId)
            ? { ...task, parentId: flowTarget.id }
            : task
        );
        const siblings = working
          .filter(
            (task) =>
              String(task.parentId || "") === String(flowTarget.id) &&
              String(task.id) !== String(taskId)
          )
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        const orderedIds = [...siblings.map((t) => t.id), taskId];
        const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
        working = working.map((task) =>
          orderMap.has(task.id)
            ? { ...task, parentId: flowTarget.id, sortOrder: orderMap.get(task.id) }
            : task
        );
      } else {
        // before/after względem zadania flow → ten sam parent co cel flow
        const newParent = flowTarget.parentId || null;
        working = working.map((task) =>
          String(task.id) === String(taskId) ? { ...task, parentId: newParent } : task
        );
        const siblings = working
          .filter(
            (task) =>
              String(task.parentId || "") === String(newParent || "") &&
              String(task.id) !== String(taskId)
          )
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        const orderedIds = siblings.map((t) => t.id);
        orderedIds.push(taskId);
        const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
        working = working.map((task) =>
          orderMap.has(task.id)
            ? { ...task, parentId: newParent, sortOrder: orderMap.get(task.id) }
            : task
        );
      }
    } else if (targetInCustom) {
      applyMoveOnTaskList.lastError = "";
      const moved = applyMoveOnTaskList(working, taskId, placement);
      if (!moved) {
        if (applyMoveOnTaskList.lastError) {
          moveProjectTask.lastError = applyMoveOnTaskList.lastError;
          showTypeToast(applyMoveOnTaskList.lastError);
        }
        return null;
      }
      working = moved;
    } else {
      return null;
    }
    next = { ...next, customTasks: working };
  } else {
    return null;
  }

  if (placement.mode === "nest") {
    const map = loadTaskExpandState(projectId);
    map[placement.targetId] = true;
    saveTaskExpandState(projectId, map);
  }

  next = recomputeProjectParentDueDates(next);
  return persistProject(next);
}

function moveWorkflowTask(taskId, placement) {
  const { mode, targetId } = placement || {};
  if (!taskId || !targetId || taskId === targetId) return null;
  moveWorkflowTask.lastError = "";

  let blocked = false;
  const result = updateActiveWorkflowPath((path) => {
    applyMoveOnTaskList.lastError = "";
    const moved = applyMoveOnTaskList(path.tasks || [], taskId, placement);
    if (!moved) {
      blocked = true;
      if (applyMoveOnTaskList.lastError) {
        moveWorkflowTask.lastError = applyMoveOnTaskList.lastError;
        showTypeToast(applyMoveOnTaskList.lastError);
      }
      return path;
    }
    if (mode === "nest") {
      setWorkflowTaskExpanded(path.id, targetId, true);
    }
    return { ...path, tasks: moved };
  });
  if (blocked) return null;
  return result;
}

function getKanbanStatuses() {
  return loadAppConfig().statuses;
}

function getTaskTypes() {
  return loadAppConfig().taskTypes;
}

function getDocumentTaskType() {
  return getTaskTypes().find((item) => item.autoFromDocs || item.id === "document") || {
    id: "document",
    label: "Dokument",
    autoFromDocs: true,
  };
}

/** @deprecated — używaj getKanbanStatuses() */
const KANBAN_COLUMNS = DEFAULT_KANBAN_STATUSES.map((item) => ({
  key: item.id,
  label: item.label,
}));

const PROJECT_LIST_TAB_KEY = "snappoint.projectListTab";
const TASKS_VIEW_KEY = "snappoint.tasksView";
const GANTT_SCALE_KEY = "snappoint.ganttScale";
const NAV_STATE_KEY = "snappoint.navState";
const NAV_SCROLL_KEY = "snappoint.navScroll";

/** @type {boolean} */
let navBootstrapActive = false;

const RESTORABLE_VIEWS = new Set([
  "dashboard",
  "new-project",
  "projects",
  "building-projects",
  "docs-to-submit",
  "zalaczniki",
  "tasks-calendar",
  "users",
  "permissions",
  "configuration",
  "workflow",
  "account",
  "project-detail",
]);

function cleanNavOptions(options = {}) {
  const clean = {};
  if (options.projectId) clean.projectId = String(options.projectId);
  if (options.panel && options.panel !== "overview") clean.panel = String(options.panel);
  if (options.listTab) clean.listTab = String(options.listTab);
  if (options.focusDocId) clean.focusDocId = String(options.focusDocId);
  return clean;
}

function navStateFingerprint(view, options = {}) {
  const clean = cleanNavOptions(options);
  return [
    view,
    clean.projectId || "",
    clean.panel || "overview",
    clean.listTab || "",
    getTasksViewMode(),
  ].join("|");
}

function persistNavigation(view, options = {}) {
  if (!RESTORABLE_VIEWS.has(view)) return;
  const clean = cleanNavOptions(options);
  if (view === "project-detail") {
    if (!clean.projectId) return;
    if (!clean.listTab) clean.listTab = getProjectListTab();
  }
  try {
    const payload = { view, options: clean, savedAt: Date.now() };
    sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(payload));
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    params.set("view", view);
    if (clean.projectId) params.set("projectId", clean.projectId);
    if (clean.panel) params.set("panel", clean.panel);
    if (clean.listTab) params.set("listTab", clean.listTab);
    if (clean.focusDocId) params.set("docId", clean.focusDocId);
    url.search = params.toString();
    window.history.replaceState(payload, "", url);
  } catch {
    /* ignore */
  }
}

function readNavFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (!view || !RESTORABLE_VIEWS.has(view)) return null;
    const options = cleanNavOptions({
      projectId: params.get("projectId") || undefined,
      panel: params.get("panel") || undefined,
      listTab: params.get("listTab") || undefined,
      focusDocId: params.get("docId") || undefined,
    });
    if (view === "project-detail" && !options.projectId) return null;
    return { view, options, fileId: params.get("fileId") || null };
  } catch {
    return null;
  }
}

function readNavFromSession() {
  try {
    const raw = sessionStorage.getItem(NAV_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !RESTORABLE_VIEWS.has(parsed.view)) return null;
    const options = cleanNavOptions(parsed.options || {});
    if (parsed.view === "project-detail" && !options.projectId) return null;
    return { view: parsed.view, options };
  } catch {
    return null;
  }
}

function captureNavScroll() {
  const gantt = document.querySelector('[data-role="gantt-pan"]');
  return {
    y: window.scrollY || document.documentElement.scrollTop || 0,
    ganttLeft: gantt ? gantt.scrollLeft : 0,
  };
}

function saveNavScroll(view, options, scroll = captureNavScroll()) {
  try {
    sessionStorage.setItem(
      NAV_SCROLL_KEY,
      JSON.stringify({
        key: navStateFingerprint(view, options),
        ...scroll,
        savedAt: Date.now(),
      })
    );
  } catch {
    /* ignore */
  }
}

function restoreNavScroll(view, options) {
  try {
    const raw = sessionStorage.getItem(NAV_SCROLL_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || saved.key !== navStateFingerprint(view, options)) return;
    window.scrollTo(0, Number(saved.y) || 0);
    const gantt = document.querySelector('[data-role="gantt-pan"]');
    if (gantt) {
      gantt.scrollLeft = Number(saved.ganttLeft) || 0;
    }
  } catch {
    /* ignore */
  }
}

function scheduleNavScrollRestore(view, options) {
  const run = () => restoreNavScroll(view, options);
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
    window.setTimeout(run, 50);
    window.setTimeout(run, 200);
  });
}

/** @type {{ view: string, options: object } | null} */
let currentNavRef = null;

function bindNavScrollPersistence() {
  let timer = 0;
  const queueSave = () => {
    if (!currentNavRef) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!currentNavRef) return;
      saveNavScroll(currentNavRef.view, currentNavRef.options);
    }, 120);
  };
  window.addEventListener("scroll", queueSave, { passive: true });
  document.addEventListener(
    "scroll",
    (event) => {
      const target = event.target;
      if (target instanceof Element && target.getAttribute("data-role") === "gantt-pan") {
        queueSave();
      }
    },
    true
  );
  window.addEventListener("pagehide", () => {
    if (!currentNavRef) return;
    saveNavScroll(currentNavRef.view, currentNavRef.options);
  });
}

function getGanttScale() {
  try {
    return sessionStorage.getItem(GANTT_SCALE_KEY) === "week" ? "week" : "month";
  } catch {
    return "month";
  }
}

function setGanttScale(scale) {
  try {
    sessionStorage.setItem(GANTT_SCALE_KEY, scale === "week" ? "week" : "month");
  } catch {
    /* ignore */
  }
}

function getProjectListTab() {
  try {
    const raw = sessionStorage.getItem(PROJECT_LIST_TAB_KEY);
    if (raw === "attachments" || raw === "documents") return "attachments";
    if (raw === "geoportal") return "geoportal";
    return "tasks";
  } catch {
    return "tasks";
  }
}

function setProjectListTab(tab) {
  const next =
    tab === "attachments" || tab === "documents"
      ? "attachments"
      : tab === "geoportal"
        ? "geoportal"
        : "tasks";
  try {
    sessionStorage.setItem(PROJECT_LIST_TAB_KEY, next);
  } catch {
    /* ignore */
  }
}

function getTasksViewMode() {
  try {
    const mode = sessionStorage.getItem(TASKS_VIEW_KEY);
    if (
      mode === "kanban" ||
      mode === "gantt" ||
      mode === "table" ||
      mode === "cards" ||
      mode === "flow"
    ) {
      return mode;
    }
  } catch {
    /* ignore */
  }
  return "table";
}

function setTasksViewMode(mode) {
  const next =
    mode === "kanban" || mode === "gantt" || mode === "flow" || mode === "cards"
      ? mode
      : "table";
  try {
    sessionStorage.setItem(TASKS_VIEW_KEY, next);
  } catch {
    /* ignore */
  }
}

function projectOverviewNav(projectId, extra = {}) {
  return {
    projectId,
    panel: "overview",
    listTab: getProjectListTab(),
    ...extra,
  };
}

const TABLE_LAYOUT_KEY = "snappoint.tableLayout";

const PROJECT_DOC_COLUMNS = [
  { id: "name", label: "Nazwa", min: 120, defaultWidth: 180 },
  { id: "owner", label: "Właściciel", min: 120, defaultWidth: 150 },
  { id: "start", label: "Data rozpoczęcia", min: 120, defaultWidth: 140 },
  { id: "due", label: "Data zakończenia prac", min: 130, defaultWidth: 150 },
  { id: "status", label: "Status", min: 90, defaultWidth: 110 },
  { id: "progress", label: "Postęp", min: 110, defaultWidth: 140 },
  { id: "updated", label: "Aktualizacja", min: 110, defaultWidth: 130 },
];

const PROJECT_TASK_COLUMNS = PROJECT_DOC_COLUMNS;

/** Kolumna zaznaczania w tabeli zadań — pinned, tylko resize */
const TASK_SELECT_COL = { id: "_select", label: "Zaznaczanie", min: 40, defaultWidth: 44 };

const PROJECT_ATTACHMENT_COLUMNS = [
  { id: "name", label: "Nazwa pliku", min: 120, defaultWidth: 180 },
  { id: "category", label: "Kategoria", min: 110, defaultWidth: 150 },
  { id: "size", label: "Rozmiar", min: 70, defaultWidth: 90 },
  { id: "added", label: "Dodano", min: 110, defaultWidth: 130 },
  { id: "actions", label: "Akcje", min: 48, defaultWidth: 56, srOnly: true },
];

function loadTableLayouts() {
  try {
    const raw = localStorage.getItem(TABLE_LAYOUT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveTableLayout(tableId, layout) {
  const all = loadTableLayouts();
  all[tableId] = layout;
  try {
    localStorage.setItem(TABLE_LAYOUT_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function resolveColumnOrder(tableId, columns) {
  const saved = loadTableLayouts()[tableId]?.order;
  const ids = columns.map((col) => col.id);
  if (!Array.isArray(saved) || !saved.length) return [...ids];
  const next = [];
  const seen = new Set();
  saved.forEach((id) => {
    if (!ids.includes(id) || seen.has(id)) return;
    seen.add(id);
    next.push(id);
  });
  ids.forEach((id) => {
    if (!seen.has(id)) next.push(id);
  });
  return next;
}

function resolveColumnWidths(tableId, columns) {
  const saved = loadTableLayouts()[tableId]?.widths || {};
  const widths = {};
  columns.forEach((col) => {
    const value = Number(saved[col.id]);
    widths[col.id] =
      Number.isFinite(value) && value >= col.min ? value : col.defaultWidth;
  });
  return widths;
}

function resolveSelectColumnWidth(tableId) {
  const saved = Number(loadTableLayouts()[tableId]?.widths?.[TASK_SELECT_COL.id]);
  if (Number.isFinite(saved) && saved >= TASK_SELECT_COL.min) return saved;
  return TASK_SELECT_COL.defaultWidth;
}

function orderedColumns(tableId, columns) {
  const order = resolveColumnOrder(tableId, columns);
  return order.map((id) => columns.find((col) => col.id === id)).filter(Boolean);
}

function tableColgroupHtml(tableId, columns) {
  const widths = resolveColumnWidths(tableId, columns);
  const ordered = orderedColumns(tableId, columns);
  return `<colgroup>${ordered
    .map(
      (col) =>
        `<col data-col="${escapeHtml(col.id)}" style="width:${widths[col.id]}px" />`
    )
    .join("")}</colgroup>`;
}

function tableHeadCellsHtml(tableId, columns) {
  return orderedColumns(tableId, columns)
    .map((col) => {
      const label = col.srOnly
        ? `<span class="sr-only">${escapeHtml(col.label)}</span>`
        : escapeHtml(col.label);
      return `<th data-col="${escapeHtml(col.id)}" class="${
        col.id === "actions" ? "col-actions" : ""
      }" draggable="true" scope="col">
        <span class="th-label">${label}</span>
        <span class="col-resize" data-role="col-resize" aria-hidden="true"></span>
      </th>`;
    })
    .join("");
}

function joinCellsInOrder(tableId, columns, cellsById) {
  return orderedColumns(tableId, columns)
    .map((col) => cellsById[col.id] || `<td data-col="${escapeHtml(col.id)}"></td>`)
    .join("");
}

function resolveTaskBoardStatus(project, taskId, fillPercent) {
  const statuses = getKanbanStatuses();
  const statusIds = new Set(statuses.map((item) => item.id));
  const fillStatus = taskStatusFromPercent(fillPercent);
  const board = project?.taskBoardStatus || {};
  const tid = String(taskId ?? "");
  const saved = board[tid] ?? board[taskId];

  if (fillPercent >= 100) {
    const auto = statuses.find((item) => item.autoCompleteAt100);
    if (auto) return auto.id;
  }

  if (saved && statusIds.has(String(saved))) return String(saved);

  if (statusIds.has(fillStatus.key)) return fillStatus.key;
  return statuses[0]?.id || "todo";
}

function boardStatusMeta(key) {
  const statuses = getKanbanStatuses();
  const col = statuses.find((item) => item.id === key);
  return { key: col?.id || key, label: col?.label || "Status" };
}

function collectLinkedDocumentOptions(project) {
  const options = [
    {
      value: "building:building-project",
      kind: "building",
      id: "building-project",
      name: "Projekt budowlany",
    },
  ];
  const seen = new Set(["building-project"]);
  (project.formalSurvey?.documents || []).forEach((doc) => {
    if (!doc?.id || seen.has(doc.id)) return;
    seen.add(doc.id);
    options.push({
      value: `survey-doc:${doc.id}`,
      kind: "survey-doc",
      id: doc.id,
      name: doc.title || "Dokument",
    });
  });
  (project.flowDocuments || []).forEach((doc) => {
    if (!doc?.id || seen.has(doc.id)) return;
    seen.add(doc.id);
    options.push({
      value: `survey-doc:${doc.id}`,
      kind: "survey-doc",
      id: doc.id,
      name: doc.title || "Dokument",
    });
  });
  (project.files || []).forEach((file) => {
    options.push({
      value: `attachment:${file.id}`,
      kind: "attachment",
      id: String(file.id),
      name: file.name || "Załącznik",
    });
  });
  return options;
}

function parseLinkedDocValue(value) {
  if (!value || !value.includes(":")) return null;
  const index = value.indexOf(":");
  const kind = value.slice(0, index);
  const id = value.slice(index + 1);
  if (!kind || !id) return null;
  return { kind, id };
}

function resolveLinkedDocLabel(project, linked) {
  if (!linked?.kind || !linked?.id) return "";
  if (linked.kind === "building") return "Projekt budowlany";
  if (linked.kind === "survey-doc") {
    const doc =
      (project.formalSurvey?.documents || []).find(
        (item) => String(item.id) === String(linked.id)
      ) ||
      (project.flowDocuments || []).find((item) => String(item.id) === String(linked.id));
    return doc?.title || linked.name || "Dokument";
  }
  if (linked.kind === "attachment") {
    const file = (project.files || []).find((item) => String(item.id) === String(linked.id));
    return file?.name || linked.name || "Załącznik";
  }
  return linked.name || "Dokument";
}

const TASK_EXPAND_KEY = "snappoint.taskExpand";

function loadTaskExpandState(projectId) {
  try {
    const raw = localStorage.getItem(TASK_EXPAND_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const map = all?.[projectId];
    return map && typeof map === "object" ? map : {};
  } catch {
    return {};
  }
}

function saveTaskExpandState(projectId, map) {
  try {
    const raw = localStorage.getItem(TASK_EXPAND_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[projectId] = map;
    localStorage.setItem(TASK_EXPAND_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function isTaskNodeExpanded(projectId, task, expandMap) {
  if (expandMap[task.id] !== undefined) return Boolean(expandMap[task.id]);
  return (task.depth || 0) < 1;
}

function filterTasksByExpandState(projectId, tasks) {
  const expandMap = loadTaskExpandState(projectId);
  return tasks.filter((task) => {
    if (!task.parentId) return true;
    const byId = new Map(tasks.map((item) => [item.id, item]));
    let parentId = task.parentId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) return true;
      if (!isTaskNodeExpanded(projectId, parent, expandMap)) return false;
      parentId = parent.parentId;
    }
    return true;
  });
}

function setAllTaskExpandState(projectId, tasks, expanded) {
  const map = loadTaskExpandState(projectId);
  tasks.forEach((task) => {
    if (task.hasChildren) map[task.id] = expanded;
  });
  saveTaskExpandState(projectId, map);
}

/** Zwiń drzewo do najwyższego poziomu (widać tylko zadania główne). */
function collapseTasksToRootLevel(projectId, tasks) {
  setAllTaskExpandState(projectId, tasks, false);
}

function toggleTaskExpandState(projectId, taskId) {
  const map = loadTaskExpandState(projectId);
  const tasks = collectProjectTasks(getProjectById(projectId) || {});
  const task = tasks.find((item) => String(item.id) === String(taskId));
  const current =
    map[taskId] !== undefined ? Boolean(map[taskId]) : (task?.depth || 0) < 1;
  map[taskId] = !current;
  saveTaskExpandState(projectId, map);
  return map[taskId];
}

function syncProjectProcessTasks(project, { persist = true } = {}) {
  // Stary generator processTasks usunięty — źródłem jest project.flowInstance.
  if (!project) return project;
  if (!Array.isArray(project.processTasks)) {
    const next = { ...project, processTasks: [] };
    if (persist && project.id) {
      return persistProject({
        ...next,
        updatedAt: project.updatedAt || new Date().toISOString(),
      });
    }
    project.processTasks = [];
    return next;
  }
  return project;
}

function flowInstanceTasksAsNodes(project) {
  const tasks = project?.flowInstance?.tasks || [];
  if (!tasks.length) return [];
  const titleById = new Map();
  if (typeof listAllPotentialWorkflowDocuments === "function") {
    listAllPotentialWorkflowDocuments().forEach((doc) => titleById.set(doc.id, doc.title));
  }
  (project.formalSurvey?.documents || []).forEach((doc) => {
    if (doc?.id) titleById.set(doc.id, doc.title || titleById.get(doc.id) || doc.id);
  });
  (project.flowDocuments || []).forEach((doc) => {
    if (doc?.id) titleById.set(doc.id, doc.title || titleById.get(doc.id) || doc.id);
  });

  const schedule =
    typeof computeWorkflowSchedule === "function"
      ? computeWorkflowSchedule(tasks)
      : new Map();
  const ordered =
    typeof sortWorkflowTasksTree === "function" ? sortWorkflowTasksTree(tasks) : tasks;

  return ordered.map((task) => {
    const sched = schedule.get(task.id) || {};
    const linkedDocIds = normalizeTaskLinkedDocIds(task);
    const linkedDocs = linkedDocIds.map((id) => ({
      kind: id === "building-project" ? "building" : "survey-doc",
      id,
      name: titleById.get(id) || id,
    }));
    const linkedDoc = linkedDocs[0] || null;
    return {
      id: task.id,
      name: task.name || "Zadanie",
      parentId: task.parentId || null,
      kind: linkedDocs.length ? "doc-create" : "flow",
      source: "flow",
      linkedDoc,
      linkedDocs,
      linkedDocIds,
      dependsOn: Array.isArray(task.blockedBy) ? [...task.blockedBy] : [],
      pathKey: null,
      stepKey: null,
      sortOrder: typeof task.sortOrder === "number" ? task.sortOrder : 0,
      docId: linkedDocIds[0] || null,
      depth: task.depth || 0,
      durationDays: task.durationDays,
      flowStartDate: sched.startDate || null,
      flowEndDate: sched.endDate || null,
      updatedAt: project.flowInstance?.updatedAt || project.updatedAt || "",
      description: "",
    };
  });
}

function leafTaskFillPercent(project, task) {
  const docs =
    Array.isArray(task?.linkedDocs) && task.linkedDocs.length
      ? task.linkedDocs
      : task?.linkedDoc
        ? [task.linkedDoc]
        : [];
  if (!docs.length) return 0;
  const percents = docs.map((linked) => {
    if (linked.kind === "building" || linked.id === "building-project") {
      return getBuildingFormFillPercent(project);
    }
    if (typeof countDocFormFill === "function") {
      return countDocFormFill(linked.id, project.docForms?.[linked.id] || {}).percent;
    }
    return 0;
  });
  return Math.round(percents.reduce((sum, n) => sum + n, 0) / percents.length);
}

function collectProjectTasks(project) {
  const synced = syncProjectProcessTasks(project, { persist: true }) || project;
  const firstStatus = getKanbanStatuses()[0]?.id || "todo";
  const doneStatus =
    getKanbanStatuses().find((item) => item.autoCompleteAt100)?.id || "done";
  const docType = getDocumentTaskType();

  const flowNodes = flowInstanceTasksAsNodes(synced);
  const customRaw = synced.customTasks || [];
  const customAsNodes = customRaw.map((task) => {
    const linkedDocs = Array.isArray(task.linkedDocs)
      ? task.linkedDocs.filter((doc) => doc && doc.id)
      : task.linkedDoc
        ? [task.linkedDoc]
        : [];
    return {
    id: task.id,
    name: task.name || "Zadanie",
    parentId: task.parentId || null,
    kind: linkedDocs.length ? "doc-create" : "custom",
    source: "custom",
    linkedDoc: linkedDocs[0] || null,
    linkedDocs,
    linkedDocIds: linkedDocs.map((doc) => String(doc.id)),
    dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn : [],
    pathKey: null,
    stepKey: null,
    sortOrder: typeof task.sortOrder === "number" ? task.sortOrder : 1000,
    docId: linkedDocs[0]?.id || null,
    typeId: task.typeId || "",
    updatedAt: task.updatedAt || "",
    description: task.description || "",
    flowStartDate: null,
    flowEndDate: null,
  };
  });

  const flowIds = new Set(flowNodes.map((t) => t.id));
  const mergedNodes = [
    ...flowNodes.map((t) => ({ ...t, typeId: docType?.id || "" })),
    ...customAsNodes.filter((t) => !flowIds.has(t.id)),
  ];

  const ordered =
    typeof sortProcessTasksTree === "function"
      ? sortProcessTasksTree(mergedNodes)
      : typeof sortWorkflowTasksTree === "function"
        ? sortWorkflowTasksTree(mergedNodes)
        : mergedNodes;

  const childCount = new Map();
  ordered.forEach((node) => {
    if (!node.parentId) return;
    childCount.set(node.parentId, (childCount.get(node.parentId) || 0) + 1);
  });

  const draft = ordered.map((node) => {
    const fill = leafTaskFillPercent(synced, node);
    const hasChildren = (childCount.get(node.id) || 0) > 0;
    let statusKey;
    if (hasChildren) {
      statusKey = resolveTaskBoardStatus(synced, node.id, 0);
    } else if (node.kind === "doc-create") {
      statusKey = resolveTaskBoardStatus(synced, node.id, fill);
    } else {
      statusKey = resolveTaskBoardStatus(synced, node.id, 0);
    }
    const meta = boardStatusMeta(statusKey);
    const type =
      node.kind === "custom"
        ? getTaskTypes().find((item) => item.id === node.typeId)
        : null;
    const linkedDocs = (
      Array.isArray(node.linkedDocs) && node.linkedDocs.length
        ? node.linkedDocs
        : node.linkedDoc
          ? [node.linkedDoc]
          : []
    ).map((doc) => ({
      ...doc,
      name: resolveLinkedDocLabel(synced, doc) || doc.name || doc.id,
    }));
    const linked = linkedDocs[0] || null;

    return {
      id: node.id,
      kind: node.kind,
      source: node.source || (node.kind === "custom" ? "custom" : "system"),
      typeId: node.typeId || docType?.id || "",
      typeLabel:
        type?.label ||
        (typeof typeLabelForProcessKind === "function"
          ? typeLabelForProcessKind(node.kind)
          : "Zadanie"),
      name: node.name || "Zadanie",
      parentId: node.parentId || null,
      depth: node.depth || 0,
      hasChildren,
      dependsOn: Array.isArray(node.dependsOn) ? node.dependsOn : [],
      pathKey: node.pathKey || null,
      stepKey: node.stepKey || null,
      docId: linkedDocs[0]?.id || node.docId || null,
      ownerId: getTaskOwnerId(synced, node.id),
      startDate:
        getTaskStartDate(synced, node.id) || node.flowStartDate || "",
      dueDate: getTaskDueDate(synced, node.id) || node.flowEndDate || "",
      startDateLocked:
        isProjectAutoScheduleEnabled(synced) &&
        Array.isArray(node.dependsOn) &&
        node.dependsOn.length > 0,
      description: getTaskDescription(synced, node.id) || node.description || "",
      status: meta.label,
      statusKey: meta.key,
      progress:
        linkedDocs.length
          ? fill
          : meta.key === doneStatus
            ? 100
            : 0,
      linkedDoc: linked,
      linkedDocs,
      linkedDocIds: linkedDocs.map((doc) => String(doc.id)),
      updatedAt: node.updatedAt || synced.updatedAt || synced.createdAt || "",
    };
  });

  const byId = new Map(draft.map((t) => [t.id, t]));
  const childrenOf = new Map();
  draft.forEach((t) => {
    if (!t.parentId) return;
    if (!childrenOf.has(t.parentId)) childrenOf.set(t.parentId, []);
    childrenOf.get(t.parentId).push(t.id);
  });

  const rollupMemo = new Map();
  const rollup = (taskId) => {
    if (rollupMemo.has(taskId)) return rollupMemo.get(taskId);
    const task = byId.get(taskId);
    const kids = childrenOf.get(taskId) || [];
    if (!task || !kids.length) {
      const leaf = {
        statusKey: task?.statusKey || firstStatus,
        progress: task?.progress || 0,
      };
      rollupMemo.set(taskId, leaf);
      return leaf;
    }
    const childStats = kids.map((id) => rollup(id));
    const progress = Math.round(
      childStats.reduce((sum, item) => sum + (item.progress || 0), 0) / childStats.length
    );
    const childKeys = childStats.map((item) => item.statusKey);
    const unanimous =
      childKeys.length > 0 && childKeys.every((key) => key === childKeys[0]);
    const allDone = childStats.every((item) => item.statusKey === doneStatus);
    const anyProgress = childStats.some(
      (item) => item.statusKey !== firstStatus || (item.progress || 0) > 0
    );
    const mixedProgressId =
      getKanbanStatuses().find((item) => item.id === "progress")?.id ||
      childKeys.find((key) => key !== firstStatus && key !== doneStatus) ||
      firstStatus;
    const statusKey = unanimous
      ? childKeys[0]
      : allDone
        ? doneStatus
        : anyProgress
          ? mixedProgressId
          : firstStatus;
    const result = { statusKey, progress: allDone ? 100 : progress };
    rollupMemo.set(taskId, result);
    return result;
  };

  draft.forEach((task) => {
    if (!task.hasChildren) return;
    const stats = rollup(task.id);
    const meta = boardStatusMeta(stats.statusKey);
    task.statusKey = meta.key;
    task.status = meta.label;
    task.progress = stats.progress;
  });

  // Data Do nadrzędnego = najpóźniejsza data Do wśród podrzędnych (tylko przy auto)
  const autoSchedule = isProjectAutoScheduleEnabled(synced);
  const dueMemo = new Map();
  const resolveRolledDue = (taskId) => {
    if (dueMemo.has(taskId)) return dueMemo.get(taskId);
    const kids = childrenOf.get(taskId) || [];
    let due = "";
    if (!kids.length) {
      due = byId.get(taskId)?.dueDate || "";
    } else {
      const childDues = kids
        .map((id) => resolveRolledDue(id))
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
      due = childDues.length ? childDues.reduce((a, b) => (a > b ? a : b)) : "";
    }
    dueMemo.set(taskId, due);
    return due;
  };
  draft.forEach((task) => {
    if (autoSchedule && task.hasChildren) {
      const rolled = resolveRolledDue(task.id);
      if (rolled) task.dueDate = rolled;
      task.dueDateLocked = true;
    } else {
      task.dueDateLocked = false;
    }
  });

  return draft;
}

/** Alias wsteczny — dokumenty = liście z formularzem */
function collectProjectDocuments(project) {
  return collectProjectTasks(project).filter((task) => task.kind === "doc-create");
}

function taskDateControlHtml(project, task, { value, inputRole, openRole, label }) {
  const hasDate = Boolean(value);
  return `
    <div class="due-date-field ${hasDate ? "has-value" : "is-empty"}" data-role="due-date-field">
      <input
        type="date"
        class="due-date-input"
        data-role="${escapeHtml(inputRole)}"
        data-task-id="${escapeHtml(task.id)}"
        data-project-id="${project.id}"
        value="${escapeHtml(value || "")}"
        aria-label="${escapeHtml(label)}"
      />
      <button
        type="button"
        class="due-date-icon-btn"
        data-role="${escapeHtml(openRole)}"
        title="${escapeHtml(label)}"
        aria-label="${escapeHtml(label)}"
        tabindex="${hasDate ? "-1" : "0"}"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" stroke-linecap="round" />
        </svg>
      </button>
    </div>`;
}

function taskDateFieldHtml(project, task, { colId, value, inputRole, openRole, label }) {
  return `<td data-col="${escapeHtml(colId)}">${taskDateControlHtml(project, task, {
    value,
    inputRole,
    openRole,
    label,
  })}</td>`;
}

function dueDateFieldHtml(project, task) {
  if (task.dueDateLocked) {
    return `<td data-col="due"><span class="task-date-readonly" title="Data zakończenia wynika z ostatniego podzadania">${
      task.dueDate ? escapeHtml(formatDateOnly(task.dueDate)) : "—"
    }</span></td>`;
  }
  return taskDateFieldHtml(project, task, {
    colId: "due",
    value: task.dueDate,
    inputRole: "task-due",
    openRole: "open-task-due",
    label: "Data zakończenia prac",
  });
}

function startDateFieldHtml(project, task) {
  if (task.startDateLocked) {
    return `<span class="task-date-readonly" title="Start wyliczany po zakończeniu wymaganych zadań">${
      task.startDate ? escapeHtml(formatDateOnly(task.startDate)) : "—"
    }</span>`;
  }
  return taskDateFieldHtml(project, task, {
    colId: "start",
    value: task.startDate,
    inputRole: "task-start",
    openRole: "open-task-start",
    label: "Data rozpoczęcia",
  });
}

function openNativeDatePicker(input) {
  if (!input) return;
  input.focus();
  try {
    if (typeof input.showPicker === "function") input.showPicker();
  } catch {
    /* ignore — browser may block without direct gesture */
  }
}

function ownerLabel(project, ownerId) {
  return (
    getTaskOwnerOptions(project).find((opt) => opt.id === ownerId)?.name || "Brak właściciela"
  );
}

function documentPrimaryTaskId(kind, linkId) {
  if (typeof documentCreateTaskId === "function") {
    return documentCreateTaskId(kind, linkId);
  }
  return kind === "building" ? "building-project" : String(linkId);
}

/** Zadanie powiązane z dokumentem (flow/custom) albo legacy id dokumentu. */
function resolveDocumentTask(project, kind, linkId) {
  const legacyId = documentPrimaryTaskId(kind, linkId);
  const tasks = collectProjectTasks(project);
  let task = null;

  if (kind === "building") {
    task = tasks.find((item) => item.linkedDoc?.kind === "building") || null;
  } else if (kind === "survey-doc") {
    task =
      tasks.find(
        (item) =>
          item.linkedDoc?.kind === "survey-doc" &&
          String(item.linkedDoc.id) === String(linkId)
      ) || null;
  } else if (
    kind === "task" ||
    kind === "process" ||
    kind === "step" ||
    kind === "milestone" ||
    kind === "flow" ||
    kind === "custom"
  ) {
    task = tasks.find((item) => String(item.id) === String(linkId)) || null;
  }

  if (!task) {
    task = tasks.find((item) => String(item.id) === String(legacyId)) || null;
  }

  if (task) {
    const startDate =
      task.startDate || getTaskStartDate(project, legacyId) || getTaskStartDate(project, task.id) || "";
    const dueDate =
      task.dueDate || getTaskDueDate(project, legacyId) || getTaskDueDate(project, task.id) || "";
    return { ...task, startDate, dueDate };
  }

  return {
    id: legacyId,
    dueDate: getTaskDueDate(project, legacyId),
    startDate: getTaskStartDate(project, legacyId),
    statusKey: resolveTaskBoardStatus(project, legacyId, 0),
    dueDateLocked: false,
  };
}

/** Klucz Discord / dyskusji — stabilny per dokument, nie per liść procesu */
function discussionThreadKey(kind, linkId) {
  return kind === "building" ? "building-project" : String(linkId);
}

function collectDocumentRelatedTasks(project, kind, linkId) {
  const link = String(linkId);
  const primary = resolveDocumentTask(project, kind, linkId);
  const primaryId = String(primary.id);
  const tasks = collectProjectTasks(project);
  return tasks.filter((task) => {
    if (String(task.id) === primaryId) return false;
    if (kind === "task" || kind === "process" || kind === "step" || kind === "milestone") {
      if (primary?.parentId && String(task.parentId || "") === String(primary.parentId)) {
        return true;
      }
      if (primary && String(task.parentId) === String(primary.id)) return true;
      return false;
    }
    if (primary?.parentId && String(task.parentId || "") === String(primary.parentId)) {
      return true;
    }
    if (kind === "building") {
      return task.linkedDoc?.kind === "building";
    }
    if (kind === "survey-doc") {
      return (
        task.linkedDoc?.kind === "survey-doc" && String(task.linkedDoc.id) === link
      );
    }
    return false;
  });
}

function taskStateIconsHtml(project, task) {
  const deps = Array.isArray(task.dependsOn) ? task.dependsOn : [];
  if (!deps.length) return "";
  const names = deps
    .map((id) => {
      const found =
        (typeof findAnyStoredTask === "function" && findAnyStoredTask(project, id)) ||
        (project?.customTasks || []).find((item) => String(item.id) === String(id));
      return found?.name || id;
    })
    .filter(Boolean);
  const title = names.length ? `Wymaga wcześniej: ${names.join(", ")}` : "Ma zależności";
  return `<span class="task-dep-badge" title="${escapeHtml(title)}" aria-label="${escapeHtml(
    title
  )}">⛓ ${deps.length}</span>`;
}

function taskOwnerSelectHtml(project, taskId, { className = "owner-select" } = {}) {
  const current = getTaskOwnerId(project, taskId);
  return `
    <select
      class="${escapeHtml(className)}"
      data-role="task-owner"
      data-task-id="${escapeHtml(String(taskId))}"
      data-project-id="${project.id}"
      title="Przypisz osobę"
      aria-label="Właściciel zadania"
    >
      ${getTaskOwnerOptions(project)
        .map(
          (opt) => `
        <option value="${escapeHtml(opt.id)}" ${opt.id === current ? "selected" : ""}>
          ${escapeHtml(opt.name)}
        </option>`
        )
        .join("")}
    </select>`;
}

function getTaskDiscussionNotes(project, kind, linkId) {
  const key = discussionThreadKey(kind, linkId);
  const list = project?.taskDiscussions?.[key];
  return Array.isArray(list)
    ? [...list].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    : [];
}

function persistTaskDiscussionNotes(projectId, kind, linkId, notes) {
  const project = getProjectById(projectId);
  if (!project) return null;
  const key = discussionThreadKey(kind, linkId);
  return persistProject({
    ...project,
    taskDiscussions: {
      ...(project.taskDiscussions || {}),
      [key]: notes,
    },
    updatedAt: new Date().toISOString(),
  });
}

function refreshDiscussionTriggerCount(projectId, kind, linkId) {
  const project = getProjectById(projectId);
  if (!project) return;
  const count = getTaskDiscussionNotes(project, kind, linkId).length;
  content.querySelectorAll('[data-role="discussion-trigger"]').forEach((row) => {
    if (
      row.dataset.projectId !== String(projectId) ||
      row.dataset.linkKind !== String(kind) ||
      row.dataset.linkId !== String(linkId)
    ) {
      return;
    }
    const countEl = row.querySelector('[data-role="discussion-count"]');
    if (countEl) countEl.textContent = String(count);
    const viewBtn = row.querySelector('[data-role="open-discussion-view"]');
    if (viewBtn) {
      const disabled = count === 0;
      viewBtn.disabled = disabled;
      viewBtn.classList.toggle("is-disabled", disabled);
      viewBtn.setAttribute("aria-disabled", disabled ? "true" : "false");
      viewBtn.title = disabled ? "Brak wpisów w Discord" : "Pokaż Discord";
      viewBtn.setAttribute(
        "aria-label",
        disabled ? "Brak wpisów w Discord" : `Pokaż Discord (${count})`
      );
    }
  });
}

function documentDiscussionTriggerHtml(project, kind, linkId) {
  const notes = getTaskDiscussionNotes(project, kind, linkId);
  const count = notes.length;
  const disabled = count === 0;
  return `
    <div
      class="doc-related-tasks-trigger doc-discussion-trigger"
      data-role="discussion-trigger"
      data-project-id="${escapeHtml(project.id)}"
      data-link-kind="${escapeHtml(kind)}"
      data-link-id="${escapeHtml(String(linkId))}"
    >
      <div class="doc-related-tasks-copy">
        <span class="doc-task-meta-label">Discord</span>
        <strong class="doc-related-tasks-count" data-role="discussion-count">${count}</strong>
      </div>
      <div class="doc-related-tasks-actions">
        <button
          type="button"
          class="doc-related-search-btn${disabled ? " is-disabled" : ""}"
          data-role="open-discussion-view"
          data-project-id="${escapeHtml(project.id)}"
          data-link-kind="${escapeHtml(kind)}"
          data-link-id="${escapeHtml(String(linkId))}"
          ${disabled ? "disabled" : ""}
          aria-disabled="${disabled ? "true" : "false"}"
          aria-label="${disabled ? "Brak wpisów w Discord" : `Pokaż Discord (${count})`}"
          title="${disabled ? "Brak wpisów w Discord" : "Pokaż Discord"}"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" stroke-linecap="round" />
          </svg>
        </button>
        <button
          type="button"
          class="doc-related-search-btn doc-related-add-btn"
          data-role="open-discussion-add"
          data-project-id="${escapeHtml(project.id)}"
          data-link-kind="${escapeHtml(kind)}"
          data-link-id="${escapeHtml(String(linkId))}"
          aria-label="Dodaj uwagę do Discord"
          title="Dodaj uwagę"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>`;
}

function ensureDiscussionModal() {
  let modal = document.getElementById("discussionModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "discussionModal";
  modal.className = "category-modal discussion-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-discussion-modal"></div>
    <div class="category-modal-dialog discussion-dialog" role="dialog" aria-modal="true" aria-labelledby="discussionModalTitle">
      <header class="category-modal-head">
        <div>
          <h2 id="discussionModalTitle">Discord</h2>
          <p class="category-modal-file" id="discussionModalMeta"></p>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-discussion-modal" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body" id="discussionModalBody"></div>
      <footer class="category-modal-foot" id="discussionModalFoot"></footer>
    </div>`;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target.closest('[data-role="close-discussion-modal"]')) {
      closeDiscussionModal();
    }
  });
  return modal;
}

function closeDiscussionModal() {
  const modal = document.getElementById("discussionModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function openDiscussionAddModal(projectId, kind, linkId) {
  const project = getProjectById(projectId);
  if (!project) return;
  const user = getCurrentAccountUser();
  const modal = ensureDiscussionModal();
  const title = modal.querySelector("#discussionModalTitle");
  const meta = modal.querySelector("#discussionModalMeta");
  const body = modal.querySelector("#discussionModalBody");
  const foot = modal.querySelector("#discussionModalFoot");
  if (title) title.textContent = "Nowa uwaga";
  if (meta) meta.textContent = `Autor: ${user.name}`;
  if (body) {
    body.innerHTML = `
      <label class="field">
        <span class="field-label">Treść uwagi</span>
        <textarea
          id="discussionNoteText"
          rows="5"
          placeholder="Napisz uwagę do tego zadania…"
        ></textarea>
      </label>`;
  }
  if (foot) {
    foot.innerHTML = `
      <button type="button" class="ghost-btn" data-role="close-discussion-modal">Anuluj</button>
      <button
        type="button"
        class="primary-btn"
        data-role="save-discussion-note"
        data-project-id="${escapeHtml(projectId)}"
        data-link-kind="${escapeHtml(kind)}"
        data-link-id="${escapeHtml(String(linkId))}"
      >Dodaj</button>`;
    foot.querySelector('[data-role="save-discussion-note"]')?.addEventListener("click", () => {
      const text = String(modal.querySelector("#discussionNoteText")?.value || "").trim();
      if (!text) {
        showTypeToast("Wpisz treść uwagi");
        return;
      }
      const notes = getTaskDiscussionNotes(project, kind, linkId);
      notes.unshift({
        id: `note-${Date.now()}`,
        text,
        authorId: user.id,
        authorName: user.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      persistTaskDiscussionNotes(projectId, kind, linkId, notes);
      closeDiscussionModal();
      refreshDiscussionTriggerCount(projectId, kind, linkId);
      showFormSavedToast("Dodano uwagę");
    });
  }
  modal.hidden = false;
  document.body.classList.add("modal-open");
  window.setTimeout(() => modal.querySelector("#discussionNoteText")?.focus(), 30);
}

function openDiscussionViewModal(projectId, kind, linkId) {
  const project = getProjectById(projectId);
  if (!project) return;
  const user = getCurrentAccountUser();
  const notes = getTaskDiscussionNotes(project, kind, linkId);
  if (!notes.length) return;

  const modal = ensureDiscussionModal();
  const title = modal.querySelector("#discussionModalTitle");
  const meta = modal.querySelector("#discussionModalMeta");
  const body = modal.querySelector("#discussionModalBody");
  const foot = modal.querySelector("#discussionModalFoot");
  if (title) title.textContent = "Discord";
  if (meta) {
    meta.textContent = `${notes.length} ${
      notes.length === 1 ? "uwaga" : notes.length < 5 ? "uwagi" : "uwag"
    }`;
  }
  if (body) {
    body.innerHTML = `
      <ul class="discussion-notes-list">
        ${notes
          .map((note) => {
            const mine = String(note.authorId) === String(user.id);
            const when = note.updatedAt || note.createdAt
              ? formatDate(note.updatedAt || note.createdAt)
              : "";
            return `
          <li class="discussion-note" data-note-id="${escapeHtml(note.id)}">
            <div class="discussion-note-head">
              <strong>${escapeHtml(note.authorName || "Użytkownik")}</strong>
              <span class="muted">${escapeHtml(when)}</span>
            </div>
            <p class="discussion-note-text" data-role="discussion-note-text">${escapeHtml(
              note.text
            )}</p>
            ${
              mine
                ? `<div class="discussion-note-actions">
                     <button type="button" class="ghost-btn table-action-btn" data-role="edit-discussion-note" data-note-id="${escapeHtml(
                       note.id
                     )}">Edytuj</button>
                     <button type="button" class="ghost-btn table-action-btn" data-role="delete-discussion-note" data-note-id="${escapeHtml(
                       note.id
                     )}">Usuń</button>
                   </div>`
                : ""
            }
          </li>`;
          })
          .join("")}
      </ul>`;

    body.querySelectorAll('[data-role="delete-discussion-note"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const noteId = btn.dataset.noteId;
        const next = getTaskDiscussionNotes(
          getProjectById(projectId),
          kind,
          linkId
        ).filter((item) => String(item.id) !== String(noteId));
        persistTaskDiscussionNotes(projectId, kind, linkId, next);
        refreshDiscussionTriggerCount(projectId, kind, linkId);
        if (!next.length) {
          closeDiscussionModal();
          showFormSavedToast("Usunięto uwagę");
          return;
        }
        openDiscussionViewModal(projectId, kind, linkId);
        showFormSavedToast("Usunięto uwagę");
      });
    });

    body.querySelectorAll('[data-role="edit-discussion-note"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const noteId = btn.dataset.noteId;
        const item = btn.closest(".discussion-note");
        const textEl = item?.querySelector('[data-role="discussion-note-text"]');
        if (!item || !textEl || item.querySelector("textarea")) return;
        const current = textEl.textContent || "";
        textEl.hidden = true;
        const actions = item.querySelector(".discussion-note-actions");
        if (actions) actions.hidden = true;
        const editor = document.createElement("div");
        editor.className = "discussion-note-editor";
        editor.innerHTML = `
          <textarea rows="4">${escapeHtml(current)}</textarea>
          <div class="discussion-note-edit-actions">
            <button type="button" class="ghost-btn" data-role="cancel-edit-discussion">Anuluj</button>
            <button type="button" class="primary-btn" data-role="save-edit-discussion">Zapisz</button>
          </div>`;
        item.appendChild(editor);
        editor.querySelector('[data-role="cancel-edit-discussion"]')?.addEventListener("click", () => {
          openDiscussionViewModal(projectId, kind, linkId);
        });
        editor.querySelector('[data-role="save-edit-discussion"]')?.addEventListener("click", () => {
          const nextText = String(editor.querySelector("textarea")?.value || "").trim();
          if (!nextText) {
            showTypeToast("Treść nie może być pusta");
            return;
          }
          const next = getTaskDiscussionNotes(getProjectById(projectId), kind, linkId).map(
            (note) =>
              String(note.id) === String(noteId) && String(note.authorId) === String(user.id)
                ? { ...note, text: nextText, updatedAt: new Date().toISOString() }
                : note
          );
          persistTaskDiscussionNotes(projectId, kind, linkId, next);
          openDiscussionViewModal(projectId, kind, linkId);
          showFormSavedToast("Zapisano uwagę");
        });
      });
    });
  }
  if (foot) {
    foot.innerHTML = `
      <button type="button" class="ghost-btn" data-role="close-discussion-modal">Zamknij</button>
      <button
        type="button"
        class="primary-btn"
        data-role="discussion-add-from-view"
        data-project-id="${escapeHtml(projectId)}"
        data-link-kind="${escapeHtml(kind)}"
        data-link-id="${escapeHtml(String(linkId))}"
      >Dodaj uwagę</button>`;
    foot.querySelector('[data-role="discussion-add-from-view"]')?.addEventListener("click", () => {
      openDiscussionAddModal(projectId, kind, linkId);
    });
  }
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function documentRelatedTasksTriggerHtml(project, kind, linkId, related) {
  const count = related.length;
  const disabled = count === 0;
  return `
    <div class="doc-related-tasks-trigger">
      <div class="doc-related-tasks-copy">
        <span class="doc-task-meta-label">Zadania powiązane</span>
        <strong class="doc-related-tasks-count">${count}</strong>
      </div>
      <div class="doc-related-tasks-actions">
        <button
          type="button"
          class="doc-related-search-btn${disabled ? " is-disabled" : ""}"
          data-role="open-related-tasks"
          data-project-id="${escapeHtml(project.id)}"
          data-link-kind="${escapeHtml(kind)}"
          data-link-id="${escapeHtml(String(linkId))}"
          ${disabled ? "disabled" : ""}
          aria-disabled="${disabled ? "true" : "false"}"
          aria-label="${
            disabled
              ? "Brak zadań powiązanych"
              : `Pokaż zadania powiązane (${count})`
          }"
          title="${disabled ? "Brak zadań powiązanych" : "Pokaż zadania powiązane"}"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" stroke-linecap="round" />
          </svg>
        </button>
        <button
          type="button"
          class="doc-related-search-btn doc-related-add-btn"
          data-role="open-related-add-task"
          data-project-id="${escapeHtml(project.id)}"
          data-link-kind="${escapeHtml(kind)}"
          data-link-id="${escapeHtml(String(linkId))}"
          aria-label="Dodaj zadanie powiązane"
          title="Dodaj zadanie powiązane"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>`;
}

function ensureRelatedTasksModal() {
  let modal = document.getElementById("relatedTasksModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "relatedTasksModal";
  modal.className = "category-modal related-tasks-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-related-tasks-modal"></div>
    <div class="category-modal-dialog related-tasks-dialog" role="dialog" aria-modal="true" aria-labelledby="relatedTasksModalTitle">
      <header class="category-modal-head">
        <div>
          <h2 id="relatedTasksModalTitle">Zadania powiązane</h2>
          <p class="category-modal-file" id="relatedTasksModalMeta"></p>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-related-tasks-modal" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body" id="relatedTasksModalBody"></div>
      <footer class="category-modal-foot">
        <button type="button" class="ghost-btn" data-role="close-related-tasks-modal">Zamknij</button>
      </footer>
    </div>`;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target.closest('[data-role="close-related-tasks-modal"]')) {
      closeRelatedTasksModal();
    }
  });
  return modal;
}

function closeRelatedTasksModal() {
  const modal = document.getElementById("relatedTasksModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function projectDetailPageTitle(project, panel, options = {}) {
  if (panel === "building-form") return `${project.title} · Projekt budowlany`;
  if (panel === "formal-survey") return `${project.title} · Ankieta formalna`;
  if (panel === "kpa") return `${project.title} · KPA`;
  if (panel === "doc-form") {
    const entity = resolveProjectDetailEntityTitle(project, panel, options);
    return entity ? `${entity} · ${project.title}` : `${project.title} · Dokument`;
  }
  if (panel === "task-detail") {
    const entity = resolveProjectDetailEntityTitle(project, panel, options);
    return entity ? `${entity} · ${project.title}` : `${project.title} · Zadanie`;
  }
  return project.title;
}

function resolveProjectDetailEntityTitle(project, panel, options = {}) {
  if (panel === "task-detail" && options.focusTaskId) {
    const task = collectProjectTasks(project).find(
      (item) => String(item.id) === String(options.focusTaskId)
    );
    return task?.name || "";
  }
  if (panel === "doc-form" && options.focusDocId) {
    const linked = resolveDocumentTask(project, "survey-doc", options.focusDocId);
    if (linked?.name) return linked.name;
    const doc =
      (project.formalSurvey?.documents || []).find(
        (item) => String(item.id) === String(options.focusDocId)
      ) ||
      (project.flowDocuments || []).find(
        (item) => String(item.id) === String(options.focusDocId)
      );
    return doc?.title || "";
  }
  if (panel === "building-form") {
    const linked = resolveDocumentTask(project, "building", "building-project");
    return linked?.name || "Projekt budowlany";
  }
  return "";
}

function bindProjectDetailPanel(projectId, panel) {
  const project = getProjectById(projectId);
  if (!project) return;
  content.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      renderView(el.dataset.view);
    });
  });
  content.querySelectorAll('[data-role="edit-project"]').forEach((btn) => {
    btn.addEventListener("click", () => openProjectForEdit(btn.dataset.projectId));
  });
  bindProjectDetailActions(projectId);
  if (panel === "building-form") bindBuildingForm(projectId);
  if (panel === "formal-survey") bindFormalSurvey(projectId);
  if (panel === "kpa") bindKpaPanel(projectId);
  if (panel === "doc-form") {
    bindProjectDocForms(projectId);
    bindDocumentPdfDownloads();
  }
  if (panel === "task-detail") {
    bindTaskDescriptionEditors(projectId);
    bindContextFlowWidget();
  }
  if (panel !== "formal-survey" && panel !== "doc-form" && panel !== "kpa" && panel !== "task-detail" && panel !== "building-form") {
    bindAiChat();
  }
}

function navigateProjectPanel(projectId, options = {}) {
  const project = getProjectById(projectId);
  if (!project) return;

  const nextOptions = {
    projectId,
    panel: options.panel || "overview",
    focusDocId: options.focusDocId || null,
    focusTaskId: options.focusTaskId || null,
    listTab: options.listTab || getProjectListTab(),
  };

  if (
    !bypassFormDirtyGuard &&
    isActiveFormDirty() &&
    isLeavingFormContext("project-detail", nextOptions)
  ) {
    openUnsavedChangesModal({
      onSaveExit: () => {
        bypassFormDirtyGuard = true;
        navigateProjectPanel(projectId, options);
        bypassFormDirtyGuard = false;
      },
      onDiscard: () => {
        bypassFormDirtyGuard = true;
        navigateProjectPanel(projectId, options);
        bypassFormDirtyGuard = false;
      },
      onCancel: () => {},
    });
    return;
  }

  const shell = content.querySelector("section.project-detail");
  const sameProject = shell && String(shell.dataset.projectId || "") === String(projectId);

  if (!sameProject) {
    renderView("project-detail", nextOptions);
    return;
  }

  closeCategoryModal();
  closeUnsavedChangesModal();
  unbindFormSaveChrome();

  const panel = nextOptions.panel;
  if (panel === "formal-survey") initSurveyDraft(project);

  const temp = document.createElement("div");
  temp.innerHTML = projectDetailHtml(project, panel, {
    focusDocId: nextOptions.focusDocId,
    focusTaskId: nextOptions.focusTaskId,
    listTab: nextOptions.listTab,
  });
  const nextSection = temp.querySelector("section.project-detail");
  if (!nextSection) {
    renderView("project-detail", nextOptions);
    return;
  }

  pageTitle.textContent = projectDetailPageTitle(project, panel, {
    focusDocId: nextOptions.focusDocId,
    focusTaskId: nextOptions.focusTaskId,
  });
  setActiveNav("project-detail");

  const navToken = (navigateProjectPanel._token = (navigateProjectPanel._token || 0) + 1);

  const finish = () => {
    if (navToken !== navigateProjectPanel._token) return;
    shell.replaceWith(nextSection);
    nextSection.classList.add("is-panel-enter");
    bindProjectDetailPanel(projectId, panel);
    persistNavigation(
      "project-detail",
      cleanNavOptions({
        projectId,
        panel,
        focusDocId: nextOptions.focusDocId,
        focusTaskId: nextOptions.focusTaskId,
        listTab: nextOptions.listTab,
      })
    );
    requestAnimationFrame(() => {
      requestAnimationFrame(() => nextSection.classList.remove("is-panel-enter"));
    });
  };

  shell.classList.add("is-panel-leave");
  window.setTimeout(finish, 170);
}

function openProjectTaskById(projectId, taskId, taskKindHint = "") {
  const project = getProjectById(projectId);
  if (!project) return;
  const task =
    collectProjectTasks(project).find((item) => String(item.id) === String(taskId)) || null;

  if (task?.kind === "doc-create" && task.linkedDoc) {
    openLinkedDocument(projectId, task.linkedDoc.kind, task.linkedDoc.id);
    return;
  }
  if (taskKindHint === "building" || task?.kind === "building" || taskId === "building-project") {
    navigateProjectPanel(projectId, { panel: "building-form" });
    return;
  }
  if (taskKindHint === "survey-doc" || task?.kind === "survey-doc") {
    navigateProjectPanel(projectId, {
      panel: "doc-form",
      focusDocId: taskId,
    });
    return;
  }
  if (task?.kind === "custom" && task.linkedDoc?.kind && task.linkedDoc.kind !== "attachment") {
    openLinkedDocument(projectId, task.linkedDoc.kind, task.linkedDoc.id);
    return;
  }
  navigateProjectPanel(projectId, {
    panel: "task-detail",
    focusTaskId: taskId,
  });
}

function openRelatedTaskFromMeta(projectId, taskKind, taskId) {
  closeRelatedTasksModal();
  openProjectTaskById(projectId, taskId, taskKind);
}

function openRelatedTasksModal(projectId, kind, linkId) {
  const project = getProjectById(projectId);
  if (!project) return;
  const related = collectDocumentRelatedTasks(project, kind, linkId);
  if (!related.length) return;

  const modal = ensureRelatedTasksModal();
  const meta = modal.querySelector("#relatedTasksModalMeta");
  const body = modal.querySelector("#relatedTasksModalBody");
  if (meta) {
    meta.textContent = `${related.length} ${
      related.length === 1 ? "zadanie" : related.length < 5 ? "zadania" : "zadań"
    }`;
  }
  if (body) {
    body.innerHTML = `
      <ul class="related-tasks-modal-list">
        ${related
          .map(
            (task) => `
          <li>
            <button
              type="button"
              class="related-tasks-modal-item"
              data-role="open-related-task"
              data-project-id="${escapeHtml(project.id)}"
              data-task-kind="${escapeHtml(task.kind || "")}"
              data-task-id="${escapeHtml(String(task.id))}"
            >
              <span class="related-tasks-modal-main">
                <strong>${escapeHtml(task.name)}</strong>
                <em>${escapeHtml(task.typeLabel || task.kind || "Zadanie")} · ${escapeHtml(
              ownerLabel(project, task.ownerId)
            )}</em>
              </span>
              <span class="related-tasks-modal-go" aria-hidden="true">→</span>
            </button>
          </li>`
          )
          .join("")}
      </ul>`;

    body.querySelectorAll('[data-role="open-related-task"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        openRelatedTaskFromMeta(
          btn.dataset.projectId || projectId,
          btn.dataset.taskKind,
          btn.dataset.taskId
        );
      });
    });
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");
}

/** Góra widoku zadania: 1) tytuł+opis | 2) właściciel+terminy+powiązane */
function documentTaskSplitHtml(
  project,
  kind,
  linkId,
  { title = "", eyebrow = "Dokument / zadanie", showTitle = true } = {}
) {
  const primaryTask = resolveDocumentTask(project, kind, linkId);
  const primaryTaskId = primaryTask.id;
  const related = collectDocumentRelatedTasks(project, kind, linkId);
  const description = getTaskDescription(project, primaryTaskId);
  const displayTitle =
    title || (kind === "building" ? "Projekt budowlany" : "Zadanie");

  return `
    <div class="doc-task-split" data-role="doc-task-meta">
      <section class="doc-task-card doc-task-identity" aria-label="Tytuł i opis">
        ${
          showTitle
            ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>
               <h2 class="doc-task-title">${escapeHtml(displayTitle)}</h2>`
            : `<p class="doc-task-meta-label">Opis zadania</p>`
        }
        <label class="field doc-task-desc-field">
          ${showTitle ? `<span class="field-label">Opis</span>` : ""}
          <textarea
            class="task-description-input"
            data-role="task-description-input"
            data-task-id="${escapeHtml(String(primaryTaskId))}"
            data-project-id="${project.id}"
            rows="4"
            placeholder="Dodaj opis zadania…"
          >${escapeHtml(description)}</textarea>
        </label>
      </section>

      <section class="doc-task-card doc-task-assignment" aria-label="Właściciel, terminy i zadania powiązane">
        <div class="doc-task-owner-block">
          <span class="doc-task-meta-label">Przypisany właściciel</span>
          ${taskOwnerSelectHtml(project, primaryTaskId, {
            className: "owner-select doc-task-owner-select",
          })}
          <p class="doc-task-owner-hint">Możesz zmienić osobę odpowiedzialną za to zadanie.</p>
        </div>

        <div class="doc-task-schedule-block">
          <div class="doc-task-schedule-field">
            <span class="doc-task-meta-label">Data rozpoczęcia</span>
            ${taskDateControlHtml(project, primaryTask, {
              value: primaryTask.startDate,
              inputRole: "task-start",
              openRole: "open-task-start",
              label: "Data rozpoczęcia",
            })}
          </div>
          <div class="doc-task-schedule-field">
            <span class="doc-task-meta-label">Data zakończenia</span>
            ${
              primaryTask.dueDateLocked
                ? `<span class="task-date-readonly" title="Data zakończenia wynika z ostatniego podzadania">${
                    primaryTask.dueDate
                      ? escapeHtml(formatDateOnly(primaryTask.dueDate))
                      : "—"
                  }</span>`
                : taskDateControlHtml(project, primaryTask, {
                    value: primaryTask.dueDate,
                    inputRole: "task-due",
                    openRole: "open-task-due",
                    label: "Data zakończenia prac",
                  })
            }
          </div>
          <div class="doc-task-schedule-field doc-task-status-field">
            <span class="doc-task-meta-label">Status</span>
            <select
              class="owner-select status-select doc-task-owner-select"
              data-role="task-status"
              data-task-id="${escapeHtml(String(primaryTaskId))}"
              data-project-id="${project.id}"
              aria-label="Status zadania"
            >
              ${taskStatusOptionsHtml(primaryTask.statusKey)}
            </select>
          </div>
        </div>

        ${documentRelatedTasksTriggerHtml(project, kind, linkId, related)}
        ${documentDiscussionTriggerHtml(project, kind, linkId)}
      </section>
    </div>`;
}

function documentTaskMetaHtml(project, kind, linkId) {
  return documentTaskSplitHtml(project, kind, linkId, { showTitle: false });
}

function kanbanLinkedDocIconHtml(project, task) {
  if (!task?.linkedDoc) return "";
  if (task.kind !== "doc-create") return "";
  const label = resolveLinkedDocLabel(project, task.linkedDoc);
  return `
    <button
      type="button"
      class="kanban-doc-icon task-meta-icon"
      data-role="open-linked-doc"
      data-open-new-tab="1"
      data-project-id="${project.id}"
      data-link-kind="${escapeHtml(task.linkedDoc.kind)}"
      data-link-id="${escapeHtml(String(task.linkedDoc.id))}"
      aria-label="Otwórz dokument: ${escapeHtml(label)}"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
        <path d="M8 4h7l3 3v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        <path d="M15 4v3h3M10 12h4M10 16h4" stroke-linecap="round" />
      </svg>
      <span class="kanban-doc-tooltip" role="tooltip">${escapeHtml(label)}</span>
    </button>`;
}

function taskDescriptionIconHtml(task) {
  const description = String(task?.description || "").trim();
  if (!description) return "";
  return `
    <span
      class="task-desc-icon task-meta-icon"
      tabindex="0"
      aria-label="Opis zadania"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
        <path d="M7 5.5h10a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 17V7A1.5 1.5 0 0 1 7 5.5Z" />
        <path d="M9 9.5h6M9 12.5h6M9 15.5h4" stroke-linecap="round" />
      </svg>
      <span class="kanban-doc-tooltip task-desc-tooltip" role="tooltip">${escapeHtml(
        description
      )}</span>
    </span>`;
}

function taskNameIconsHtml(project, task) {
  const docIcon = kanbanLinkedDocIconHtml(project, task);
  const descIcon = taskDescriptionIconHtml(task);
  const depIcon = taskStateIconsHtml(project, task);
  if (!docIcon && !descIcon && !depIcon) return "";
  return `<span class="task-name-icons">${docIcon}${descIcon}${depIcon}</span>`;
}

function getTaskTreeHiddenIdSet(projectId, tasks) {
  const expandMap = loadTaskExpandState(projectId);
  const byId = new Map(tasks.map((item) => [String(item.id), item]));
  const hidden = new Set();
  tasks.forEach((task) => {
    let parentId = task.parentId;
    while (parentId) {
      const parent = byId.get(String(parentId));
      if (!parent) break;
      if (!isTaskNodeExpanded(projectId, parent, expandMap)) {
        hidden.add(String(task.id));
        break;
      }
      parentId = parent.parentId;
    }
  });
  return hidden;
}

function syncTaskTreeDom(panel) {
  if (!panel) return;
  const projectId = panel.dataset.projectId;
  const project = getProjectById(projectId);
  if (!project) return;
  const tasks = collectProjectTasks(project);
  const treeHidden = getTaskTreeHiddenIdSet(projectId, tasks);
  const expandMap = loadTaskExpandState(projectId);

  panel.querySelectorAll('tr[data-role="open-task"]').forEach((row) => {
    const id = String(row.dataset.taskId || "");
    row.classList.toggle("is-tree-hidden", treeHidden.has(id));
  });

  panel.querySelectorAll('.tasks-card-item[data-role="open-task"]').forEach((item) => {
    const id = String(item.dataset.taskId || "");
    item.classList.toggle("is-collapsed-hidden", treeHidden.has(id));
  });

  panel.querySelectorAll('[data-role="toggle-task-expand"]').forEach((btn) => {
    const task = tasks.find((item) => String(item.id) === String(btn.dataset.taskId));
    if (!task) return;
    const expanded = isTaskNodeExpanded(projectId, task, expandMap);
    btn.classList.toggle("is-expanded", expanded);
    btn.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (!btn.querySelector("svg")) {
      btn.textContent = expanded ? "▼" : "▶";
    }
    btn.title = expanded ? "Zwiń" : "Rozwiń";
    btn.setAttribute("aria-label", expanded ? "Zwiń podzadania" : "Rozwiń podzadania");
  });

  if (typeof panel._applyTaskFilters === "function") {
    panel._applyTaskFilters();
  }
}

function kanbanCardHtml(project, task, { hidden = false } = {}) {
  const dueLabel = task.dueDate ? formatDateOnly(task.dueDate) : "Bez terminu";
  const startLabel = task.startDate ? formatDateOnly(task.startDate) : "";
  return `
    <article
      class="kanban-card"
      draggable="true"
      data-role="kanban-card"
      data-task-id="${escapeHtml(task.id)}"
      data-task-kind="${escapeHtml(task.kind)}"
      data-project-id="${escapeHtml(project.id)}"
      data-owner-id="${escapeHtml(String(task.ownerId || ""))}"
      data-status="${escapeHtml(task.statusKey)}"
      data-status-key="${escapeHtml(task.statusKey || "")}"
      ${hidden ? "hidden" : ""}
    >
      <div class="kanban-card-top">
        <strong class="kanban-card-title">${escapeHtml(task.name)}</strong>
        ${taskNameIconsHtml(project, task)}
      </div>
      <p class="kanban-card-type">${escapeHtml(task.typeLabel || "Zadanie")}</p>
      <div class="kanban-card-meta">
        <span class="kanban-card-due${!task.dueDate ? " is-empty" : ""}" title="${
          startLabel
            ? `Od ${startLabel} · Do ${dueLabel}`
            : "Data zakończenia prac"
        }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15" rx="2" />
            <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" stroke-linecap="round" />
          </svg>
          <span>${escapeHtml(
            startLabel && task.dueDate
              ? `${startLabel} – ${dueLabel}`
              : dueLabel
          )}</span>
        </span>
        <label class="kanban-owner-field">
          <span class="sr-only">Osoba</span>
          <select
            class="owner-select kanban-owner-select"
            data-role="task-owner"
            data-task-id="${escapeHtml(task.id)}"
            data-project-id="${project.id}"
            title="Przypisz osobę"
            aria-label="Właściciel zadania"
          >
            ${taskOwnerOptionsHtml(project, task.ownerId)}
          </select>
        </label>
      </div>
      <div class="fill-cell kanban-card-progress">
        <div class="fill-bar" aria-hidden="true"><span style="width:${task.progress}%"></span></div>
        <strong>${task.progress}%</strong>
      </div>
    </article>`;
}

function projectTasksKanbanHtml(project, options = {}) {
  const columns = getKanbanStatuses();
  const projects = loadProjects();
  const focusId = String(project.id);
  const projectFilterAll = Boolean(options.projectFilterAll);
  const statusOptions = columns.map((item) => ({ id: item.id, label: item.label }));
  const ownerMap = new Map();
  getTaskOwnerOptions(project).forEach((opt) => ownerMap.set(opt.id, opt.name));
  projects.forEach((p) => {
    getTaskOwnerOptions(p).forEach((opt) => ownerMap.set(opt.id, opt.name));
  });
  const ownerOptions = [...ownerMap.entries()].map(([id, label]) => ({ id, label }));
  const projectOptions = projects.map((p) => ({
    id: p.id,
    label: p.title || p.name || "Projekt",
  }));

  const flat = [];
  projects.forEach((p) => {
    collectProjectTasks(p).forEach((task) => {
      // Kanban: liście + kamienie milowe bez dzieci
      if (task.hasChildren) return;
      flat.push({ task, project: p });
    });
  });

  const filtersHtml = `
    <div class="gantt-filters kanban-filters">
      ${ganttMultiFilterHtml(
        "project",
        "Projekt",
        projectOptions,
        projectFilterAll
          ? { allChecked: true }
          : { preselectedIds: [focusId], allChecked: false }
      )}
      ${ganttMultiFilterHtml("owner", "Właściciel", ownerOptions, { allChecked: true })}
      ${ganttMultiFilterHtml("status", "Status", statusOptions, { allChecked: true })}
    </div>`;

  return `
    <div class="tasks-kanban" data-role="tasks-kanban-view" data-project-id="${project.id}">
      <div class="kanban-toolbar">
        <div>
          <p class="eyebrow">Widok Kanban</p>
          <p class="gantt-range-meta">Filtruj po projekcie, właścicielu i statusie</p>
        </div>
        ${filtersHtml}
      </div>
      <div class="kanban-board" data-role="kanban-board" data-project-id="${project.id}">
        ${columns
          .map((column) => {
            const columnTasks = flat.filter(({ task }) => task.statusKey === column.id);
            const visibleCount = columnTasks.filter(({ project: p }) =>
              projectFilterAll ? true : String(p.id) === focusId
            ).length;
            return `
        <section class="kanban-column" data-status="${escapeHtml(column.id)}">
          <header class="kanban-column-head">
            <h3>${escapeHtml(column.label)}</h3>
            <span class="tab-count" data-role="kanban-column-count">${visibleCount}</span>
          </header>
          <div
            class="kanban-column-body"
            data-role="kanban-drop"
            data-status="${escapeHtml(column.id)}"
          >
            ${
              columnTasks.length
                ? columnTasks
                    .map(({ task, project: p }) =>
                      kanbanCardHtml(p, task, {
                        hidden: projectFilterAll ? false : String(p.id) !== focusId,
                      })
                    )
                    .join("")
                : `<p class="kanban-empty" data-role="kanban-empty">Przeciągnij zadanie tutaj</p>`
            }
            ${
              columnTasks.length
                ? `<p class="kanban-empty" data-role="kanban-empty" hidden>Przeciągnij zadanie tutaj</p>`
                : ""
            }
          </div>
        </section>`;
          })
          .join("")}
      </div>
    </div>`;
}

function projectTasksTableBodyHtml(project, tasks, tableId) {
  const expandMap = loadTaskExpandState(project.id);
  const treeHidden = getTaskTreeHiddenIdSet(project.id, tasks);
  const filterPlaceholders = {
    name: "Nazwa / typ…",
    progress: "np. >=50",
  };
  const ownerOptions = getTaskOwnerOptions(project);
  const statusOptions = getKanbanStatuses();
  const filterCells = orderedColumns(tableId, PROJECT_TASK_COLUMNS)
    .map((col) => {
      if (col.id === "owner") {
        return `
              <th data-col="${escapeHtml(col.id)}">
                <select
                  class="column-filter"
                  data-role="filter-task-col"
                  data-filter-key="owner"
                  aria-label="Filtr właściciela"
                >
                  <option value="">Wszyscy</option>
                  ${ownerOptions
                    .map(
                      (opt) =>
                        `<option value="${escapeHtml(opt.id)}">${escapeHtml(opt.name)}</option>`
                    )
                    .join("")}
                </select>
              </th>`;
      }
      if (col.id === "status") {
        return `
              <th data-col="${escapeHtml(col.id)}">
                <select
                  class="column-filter"
                  data-role="filter-task-col"
                  data-filter-key="status"
                  aria-label="Filtr statusu"
                >
                  <option value="">Wszystkie</option>
                  ${statusOptions
                    .map(
                      (opt) =>
                        `<option value="${escapeHtml(opt.id)}">${escapeHtml(opt.label)}</option>`
                    )
                    .join("")}
                </select>
              </th>`;
      }
      if (col.id === "start" || col.id === "due" || col.id === "updated") {
        const labels = {
          start: "Data rozpoczęcia",
          due: "Data zakończenia",
          updated: "Data aktualizacji",
        };
        return `
              <th data-col="${escapeHtml(col.id)}">
                <input
                  type="date"
                  class="column-filter column-filter-date"
                  data-role="filter-task-col"
                  data-filter-key="${escapeHtml(col.id)}"
                  aria-label="${escapeHtml(labels[col.id])}"
                />
              </th>`;
      }
      return `
              <th data-col="${escapeHtml(col.id)}">
                <input
                  type="search"
                  class="column-filter"
                  data-role="filter-task-col"
                  data-filter-key="${escapeHtml(col.id)}"
                  placeholder="${escapeHtml(filterPlaceholders[col.id] || "Filtr…")}"
                  autocomplete="off"
                />
              </th>`;
    })
    .join("");

  return `
    <div class="tasks-table-view" data-role="tasks-table-view" data-project-id="${escapeHtml(
      project.id
    )}">
      <div class="tasks-table-toolbar table-toolbar">
        <label class="tasks-search search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" stroke-linecap="round" />
          </svg>
          <input
            type="search"
            data-role="filter-task-search"
            placeholder="Szukaj po słowach kluczowych…"
            aria-label="Wyszukaj zadania"
            autocomplete="off"
          />
        </label>
        <p class="table-filter-meta" data-role="task-filter-count">${tasks.length} zadań</p>
        <button
          type="button"
          class="ghost-btn table-action-btn"
          data-role="tasks-table-add-root"
          data-project-id="${escapeHtml(project.id)}"
          title="Dodaj zadanie główne do Flow projektu"
        >+ Zadanie główne</button>
        <button type="button" class="ghost-btn table-action-btn" data-role="tasks-expand-all" data-project-id="${project.id}">
          Rozwiń wszystko
        </button>
        <button type="button" class="ghost-btn table-action-btn" data-role="tasks-collapse-roots" data-project-id="${project.id}">
          Zwiń wszystko
        </button>
        <button type="button" class="ghost-btn table-action-btn" data-role="clear-task-filters">
          Wyczyść filtry
        </button>
      </div>
      <div class="workflow-layout tasks-table-layout${
        isWorkflowDocsCollapsed() ? " is-docs-collapsed" : ""
      }" data-role="workflow-layout">
        <div class="tasks-table-main" data-role="tasks-table-main">
      <div class="data-table-wrap data-table-lined-wrap">
        <table class="data-table data-table-lined is-col-customizable" data-table="${tableId}" data-role="tasks-table">
          <colgroup>
            <col data-col="${TASK_SELECT_COL.id}" style="width:${resolveSelectColumnWidth(tableId)}px" />
            ${orderedColumns(tableId, PROJECT_TASK_COLUMNS)
              .map((col) => {
                const widths = resolveColumnWidths(tableId, PROJECT_TASK_COLUMNS);
                return `<col data-col="${escapeHtml(col.id)}" style="width:${widths[col.id]}px" />`;
              })
              .join("")}
          </colgroup>
          <thead>
            <tr>
              <th class="col-select" data-col="${TASK_SELECT_COL.id}" scope="col" draggable="false">
                <div class="task-select-tools">
                  <button
                    type="button"
                    class="task-select-quick task-select-all-btn"
                    data-role="task-select-all"
                    title="Zaznacz wszystkie"
                    aria-label="Zaznacz wszystkie zadania"
                    aria-pressed="false"
                  >
                    <span class="task-select-all-label" aria-hidden="true">ALL</span>
                  </button>
                  <button
                    type="button"
                    class="task-select-quick"
                    data-role="task-select-no-dates"
                    title="Zaznacz zadania bez dat"
                    aria-label="Zaznacz zadania bez dat"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                      <rect x="3.5" y="5" width="17" height="15" rx="2" />
                      <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" stroke-linecap="round" />
                      <path d="M5 19 19 5" stroke-linecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="task-select-quick"
                    data-role="task-select-no-owners"
                    title="Zaznacz zadania bez właścicieli"
                    aria-label="Zaznacz zadania bez właścicieli"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                      <circle cx="12" cy="8" r="3" />
                      <path d="M5.5 18.5c1.2-2.8 3.2-4.2 6.5-4.2s5.3 1.4 6.5 4.2" stroke-linecap="round" />
                      <path d="M5 19 19 5" stroke-linecap="round" />
                    </svg>
                  </button>
                </div>
                <span class="col-resize" data-role="col-resize" aria-hidden="true"></span>
              </th>
              ${tableHeadCellsHtml(tableId, PROJECT_TASK_COLUMNS)}
            </tr>
            <tr class="filter-row">
              <th class="col-select" data-col="${TASK_SELECT_COL.id}" scope="col"></th>
              ${filterCells}
            </tr>
          </thead>
          <tbody>
            ${tasks
              .map((task) => {
                const ownerName = ownerLabel(project, task.ownerId);
                const linkedLabel = task.linkedDoc
                  ? resolveLinkedDocLabel(project, task.linkedDoc)
                  : "";
                const startLabel = task.startDate ? formatDateOnly(task.startDate) : "";
                const dueLabel = task.dueDate ? formatDateOnly(task.dueDate) : "";
                const updatedLabel = task.updatedAt ? formatDate(task.updatedAt) : "";
                let updatedIso = "";
                if (task.updatedAt) {
                  if (/^\d{4}-\d{2}-\d{2}/.test(task.updatedAt)) {
                    updatedIso = task.updatedAt.slice(0, 10);
                  } else {
                    try {
                      updatedIso = new Date(task.updatedAt).toISOString().slice(0, 10);
                    } catch {
                      updatedIso = "";
                    }
                  }
                }
                const searchBlob = [
                  task.name,
                  task.typeLabel,
                  ownerName,
                  startLabel,
                  dueLabel,
                  task.status,
                  `${task.progress}%`,
                  updatedLabel,
                  linkedLabel,
                  task.description || "",
                ]
                  .join(" ")
                  .toLowerCase();
                const depth = task.depth || 0;
                const expanded = isTaskNodeExpanded(project.id, task, expandMap);
                const expandBtn = task.hasChildren
                  ? `<button type="button" class="task-tree-toggle ${
                      expanded ? "is-expanded" : ""
                    }" data-role="toggle-task-expand" data-project-id="${
                      project.id
                    }" data-task-id="${escapeHtml(task.id)}" aria-expanded="${
                      expanded ? "true" : "false"
                    }" title="${expanded ? "Zwiń" : "Rozwiń"}" aria-label="${
                      expanded ? "Zwiń podzadania" : "Rozwiń podzadania"
                    }">${expanded ? "▼" : "▶"}</button>`
                  : `<span class="task-tree-toggle-spacer" aria-hidden="true"></span>`;
                const cells = {
                  name: `<td data-col="name">
                    <div class="task-name-cell" style="--task-depth:${depth}">
                      <div class="task-name-row">
                        ${expandBtn}
                        <button
                          type="button"
                          class="task-title-btn"
                          data-role="open-task-title"
                          data-project-id="${project.id}"
                          data-task-id="${escapeHtml(task.id)}"
                          data-task-kind="${escapeHtml(task.kind)}"
                        >${escapeHtml(task.name)}</button>
                        ${taskNameIconsHtml(project, task)}
                      </div>
                      <span class="task-type-pill">${escapeHtml(task.typeLabel || "Zadanie")}</span>
                      <div class="task-row-actions">
                        <button
                          type="button"
                          class="ghost-btn tasks-card-mini-btn"
                          data-role="${
                            (project.flowInstance?.tasks || []).some(
                              (item) => String(item.id) === String(task.id)
                            )
                              ? "workflow-add-child"
                              : "open-add-task"
                          }"
                          data-task-id="${escapeHtml(task.id)}"
                          data-project-id="${escapeHtml(project.id)}"
                          data-parent-task-id="${escapeHtml(task.id)}"
                          title="Dodaj zadanie podrzędne"
                        >+ Podrzędne</button>
                        <button
                          type="button"
                          class="ghost-btn tasks-card-mini-btn is-danger"
                          data-role="delete-project-task"
                          data-task-id="${escapeHtml(task.id)}"
                          data-project-id="${escapeHtml(project.id)}"
                          title="Usuń zadanie"
                        >Usuń</button>
                      </div>
                    </div>
                  </td>`,
                  owner: `<td data-col="owner">
                  <select
                    class="owner-select"
                    data-role="task-owner"
                    data-task-id="${escapeHtml(task.id)}"
                    data-project-id="${project.id}"
                    aria-label="Właściciel zadania"
                  >
                    ${taskOwnerOptionsHtml(project, task.ownerId)}
                  </select>
                </td>`,
                  start: startDateFieldHtml(project, task),
                  due: dueDateFieldHtml(project, task),
                  status: `<td data-col="status">
                  <select
                    class="owner-select status-select"
                    data-role="task-status"
                    data-task-id="${escapeHtml(task.id)}"
                    data-project-id="${project.id}"
                    aria-label="Status zadania"
                  >
                    ${taskStatusOptionsHtml(task.statusKey)}
                  </select>
                </td>`,
                  progress: `<td data-col="progress">
                  <div class="fill-cell">
                    <div class="fill-bar" aria-hidden="true"><span style="width:${task.progress}%"></span></div>
                    <strong>${task.progress}%</strong>
                  </div>
                </td>`,
                  updated: `<td data-col="updated">${
                    task.updatedAt ? formatDate(task.updatedAt) : "—"
                  }</td>`,
                };
                return `
              <tr
                class="is-row-clickable task-tree-row${task.hasChildren ? " has-children" : ""}${
                  treeHidden.has(String(task.id)) ? " is-tree-hidden" : ""
                }"
                data-role="open-task"
                data-task-kind="${escapeHtml(task.kind)}"
                data-task-id="${escapeHtml(task.id)}"
                data-project-id="${project.id}"
                data-parent-id="${escapeHtml(task.parentId || "")}"
                data-task-depth="${depth}"
                data-filter-name="${escapeHtml(
                  `${task.name} ${task.typeLabel || ""} ${linkedLabel} ${task.description || ""}`.toLowerCase()
                )}"
                data-filter-owner="${escapeHtml(ownerName.toLowerCase())}"
                data-filter-owner-id="${escapeHtml(String(task.ownerId || ""))}"
                data-filter-start="${escapeHtml(startLabel.toLowerCase())}"
                data-filter-start-iso="${escapeHtml(task.startDate || "")}"
                data-filter-due="${escapeHtml(dueLabel.toLowerCase())}"
                data-filter-due-iso="${escapeHtml(task.dueDate || "")}"
                data-filter-status="${escapeHtml(task.status.toLowerCase())}"
                data-filter-status-key="${escapeHtml(task.statusKey || "")}"
                data-filter-progress="${task.progress}"
                data-filter-updated="${escapeHtml(updatedLabel.toLowerCase())}"
                data-filter-updated-iso="${escapeHtml(updatedIso)}"
                data-filter-search="${escapeHtml(searchBlob)}"
                tabindex="0"
              >
                <td class="col-select" data-col="${TASK_SELECT_COL.id}">
                  <input
                    type="checkbox"
                    data-role="task-select"
                    data-task-id="${escapeHtml(task.id)}"
                    aria-label="Zaznacz zadanie ${escapeHtml(task.name)}"
                  />
                </td>
                ${joinCellsInOrder(tableId, PROJECT_TASK_COLUMNS, cells)}
              </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      <p class="files-empty-inline attachment-filter-empty" data-role="task-filter-empty" hidden>
        Brak zadań pasujących do filtrów.
      </p>
        </div>
        ${projectInstanceDocsPanelHtml(project)}
      </div>
    </div>`;
}

function parseTaskDateOnly(value) {
  if (!value || typeof value !== "string") return null;
  const iso = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ganttDayDiff(from, to) {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function ganttMonthTicks(rangeStart, rangeEnd) {
  const ticks = [];
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cursor <= rangeEnd) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const clipStart = cursor < rangeStart ? rangeStart : new Date(cursor);
    const clipEnd = next > rangeEnd ? rangeEnd : new Date(next.getTime() - 86400000);
    ticks.push({
      label: cursor.toLocaleDateString("pl-PL", { month: "short", year: "numeric" }),
      start: clipStart,
      end: clipEnd,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

function ganttWeekStart(date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function ganttWeekTicks(rangeStart, rangeEnd) {
  const ticks = [];
  const cursor = ganttWeekStart(rangeStart);
  while (cursor <= rangeEnd) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const clipStart = cursor < rangeStart ? rangeStart : new Date(cursor);
    const clipEnd = weekEnd > rangeEnd ? rangeEnd : weekEnd;
    ticks.push({
      label: `${clipStart.toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "short",
      })}`,
      start: clipStart,
      end: clipEnd,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return ticks;
}

function toIsoDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysIso(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function persistTaskSchedule(projectId, taskId, startIso, endIso) {
  const project = getProjectById(projectId);
  if (!project || !taskId) return null;
  const tasks = collectProjectTasks(project);
  const task = tasks.find((item) => String(item.id) === String(taskId));
  if (task?.dueDateLocked) {
    showTypeToast("Data zakończenia nadrzędnego wynika z ostatniego podzadania");
    return null;
  }
  const start = startIso || "";
  const end = endIso || "";
  const customTasks = (project.customTasks || []).map((item) =>
    String(item.id) === String(taskId)
      ? { ...item, startDate: start, dueDate: end, updatedAt: new Date().toISOString() }
      : item
  );
  let next = {
    ...project,
    customTasks,
    taskStartDates: { ...(project.taskStartDates || {}), [taskId]: start },
    taskDueDates: { ...(project.taskDueDates || {}), [taskId]: end },
    updatedAt: new Date().toISOString(),
  };
  next = recomputeProjectParentDueDates(next);
  return persistProject(next);
}

function resolveGanttSpan(task) {
  let start = parseTaskDateOnly(task.startDate);
  let end = parseTaskDateOnly(task.dueDate);
  if (!start && !end) return null;
  if (start && !end) end = new Date(start);
  if (!start && end) start = new Date(end);
  if (end < start) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  return { start, end };
}

function sortTasksForGantt(tasks, project) {
  // Kolejność = Flow / drzewo projektu (collectProjectTasks), nie ręczny drag
  void project;
  return Array.isArray(tasks) ? [...tasks] : [];
}

function persistGanttTaskOrder(projectId, orderedIds) {
  // Zachowane dla kompatybilności — kolejność Gantta wynika z Flow
  void projectId;
  void orderedIds;
  return getProjectById(projectId) || null;
}

function ganttTaskTreeHidden(projectId, task, tasksById, expandMap) {
  let parentId = task.parentId;
  while (parentId) {
    const parent = tasksById.get(String(parentId));
    if (!parent) break;
    if (!isTaskNodeExpanded(projectId, parent, expandMap)) return true;
    parentId = parent.parentId;
  }
  return false;
}

function buildGanttFlatRows(focusProject) {
  const projects = loadProjects();
  const focusId = String(focusProject.id);
  const orderedProjects = [
    ...projects.filter((p) => String(p.id) === focusId),
    ...projects
      .filter((p) => String(p.id) !== focusId)
      .sort((a, b) =>
        String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""), "pl")
      ),
  ];

  const flat = [];
  orderedProjects.forEach((p) => {
    const tasks = collectProjectTasks(p);
    const expandMap = loadTaskExpandState(p.id);
    const byId = new Map(tasks.map((task) => [String(task.id), task]));
    tasks.forEach((task) => {
      flat.push({
        task,
        span: resolveGanttSpan(task),
        projectId: p.id,
        projectTitle: p.title || p.name || "Projekt",
        treeHidden: ganttTaskTreeHidden(p.id, task, byId, expandMap),
        expanded: isTaskNodeExpanded(p.id, task, expandMap),
      });
    });
  });
  return flat;
}

function ganttMultiFilterHtml(key, label, options, { preselectedIds = null, allChecked = true } = {}) {
  const selected = preselectedIds ? new Set(preselectedIds.map(String)) : null;
  const useAll = allChecked && !selected;
  return `
    <details class="gantt-multi-filter" data-role="gantt-multi-filter" data-filter-key="${escapeHtml(key)}">
      <summary>
        <span data-role="gantt-multi-summary">${escapeHtml(label)}</span>
      </summary>
      <div class="gantt-multi-menu" role="group" aria-label="${escapeHtml(label)}">
        <label class="gantt-multi-option">
          <input type="checkbox" data-role="gantt-multi-all" ${useAll ? "checked" : ""} />
          <span>Wszystkie</span>
        </label>
        ${options
          .map((opt) => {
            const id = String(opt.id);
            const checked = selected ? selected.has(id) : false;
            return `
          <label class="gantt-multi-option">
            <input
              type="checkbox"
              data-role="gantt-multi-option"
              value="${escapeHtml(id)}"
              ${checked ? "checked" : ""}
            />
            <span>${escapeHtml(opt.label)}</span>
          </label>`;
          })
          .join("")}
      </div>
    </details>`;
}

function readGanttMultiFilter(root, key) {
  const wrap = root.querySelector(
    `[data-role="gantt-multi-filter"][data-filter-key="${key}"]`
  );
  if (!wrap) return null;
  const all = wrap.querySelector('[data-role="gantt-multi-all"]');
  if (all?.checked) return null;
  const values = [...wrap.querySelectorAll('[data-role="gantt-multi-option"]:checked')].map(
    (input) => input.value
  );
  return values.length ? new Set(values) : null;
}

function syncGanttMultiSummary(wrap, fallbackLabel) {
  if (!wrap) return;
  const summary = wrap.querySelector('[data-role="gantt-multi-summary"]');
  if (!summary) return;
  const all = wrap.querySelector('[data-role="gantt-multi-all"]');
  if (all?.checked) {
    summary.textContent = fallbackLabel;
    return;
  }
  const checked = [...wrap.querySelectorAll('[data-role="gantt-multi-option"]:checked')];
  if (!checked.length) {
    summary.textContent = fallbackLabel;
    return;
  }
  if (checked.length === 1) {
    summary.textContent =
      checked[0].closest("label")?.querySelector("span")?.textContent?.trim() || fallbackLabel;
    return;
  }
  summary.textContent = `${fallbackLabel} (${checked.length})`;
}

function projectTasksGanttHtml(project, options = {}) {
  const scale = getGanttScale();
  const projects = loadProjects();
  const focusId = String(project.id);
  const projectFilterAll = Boolean(options.projectFilterAll);
  const statusOptions = getKanbanStatuses().map((item) => ({ id: item.id, label: item.label }));
  const ownerMap = new Map();
  getTaskOwnerOptions(project).forEach((opt) => ownerMap.set(opt.id, opt.name));
  projects.forEach((p) => {
    getTaskOwnerOptions(p).forEach((opt) => ownerMap.set(opt.id, opt.name));
  });
  const ownerOptions = [...ownerMap.entries()].map(([id, label]) => ({ id, label }));
  const projectOptions = projects.map((p) => ({
    id: p.id,
    label: p.title || p.name || "Projekt",
  }));

  const flat = buildGanttFlatRows(project);
  const scheduled = flat.filter((row) => row.span);

  const scaleToggle = `
    <div class="gantt-scale" role="group" aria-label="Skala czasu">
      <button type="button" class="gantt-scale-btn${scale === "week" ? " is-active" : ""}" data-role="gantt-scale" data-scale="week" aria-pressed="${scale === "week" ? "true" : "false"}">Tydzień</button>
      <button type="button" class="gantt-scale-btn${scale === "month" ? " is-active" : ""}" data-role="gantt-scale" data-scale="month" aria-pressed="${scale === "month" ? "true" : "false"}">Miesiąc</button>
    </div>`;

  const filtersHtml = `
    <div class="gantt-filters">
      ${ganttMultiFilterHtml(
        "project",
        "Projekt",
        projectOptions,
        projectFilterAll
          ? { allChecked: true }
          : { preselectedIds: [focusId], allChecked: false }
      )}
      ${ganttMultiFilterHtml("owner", "Właściciel", ownerOptions, { allChecked: true })}
      ${ganttMultiFilterHtml("status", "Status", statusOptions, { allChecked: true })}
    </div>`;

  const padPast = scale === "week" ? 21 : 45;
  const padFuture = scale === "week" ? 180 : 400;
  let rangeStart;
  let rangeEnd;
  if (scheduled.length) {
    rangeStart = new Date(Math.min(...scheduled.map((row) => row.span.start.getTime())));
    rangeEnd = new Date(Math.max(...scheduled.map((row) => row.span.end.getTime())));
  } else {
    const today = new Date();
    rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - padPast);
    rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + padFuture);
  }
  rangeStart = new Date(
    rangeStart.getFullYear(),
    rangeStart.getMonth(),
    rangeStart.getDate() - padPast
  );
  rangeEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() + padFuture);

  if (!flat.length) {
    return `
      <div class="tasks-gantt" data-role="tasks-gantt-view" data-project-id="${project.id}">
        <div class="gantt-toolbar">
          <div>
            <p class="eyebrow">Widok Gantta</p>
            <h3 class="gantt-empty-title">Brak zadań</h3>
            <p class="muted">Wygeneruj Flow projektu, aby zobaczyć harmonogram.</p>
          </div>
          <div class="gantt-toolbar-actions">
            ${filtersHtml}
            ${scaleToggle}
          </div>
        </div>
      </div>`;
  }

  const totalDays = Math.max(1, ganttDayDiff(rangeStart, rangeEnd) + 1);
  const dayWidth = scale === "week" ? 40 : Math.max(10, Math.min(16, Math.floor(1400 / totalDays)));
  const timelineWidth = totalDays * dayWidth;
  const ticks = scale === "week" ? ganttWeekTicks(rangeStart, rangeEnd) : ganttMonthTicks(rangeStart, rangeEnd);
  const today = new Date();
  const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const todayOffset = ganttDayDiff(rangeStart, todayNoon);
  const showToday = todayOffset >= 0 && todayOffset < totalDays;

  const tickHead = ticks
    .map((tick) => {
      const left = ganttDayDiff(rangeStart, tick.start) * dayWidth;
      const width = (ganttDayDiff(tick.start, tick.end) + 1) * dayWidth;
      return `<div class="gantt-month" style="left:${left}px;width:${width}px">${escapeHtml(
        tick.label
      )}</div>`;
    })
    .join("");

  const bodyRows = flat
    .map(({ task, span, projectId, projectTitle, treeHidden, expanded }) => {
      const owner = ownerLabel(
        projects.find((p) => p.id === projectId) || project,
        task.ownerId
      );
      const progress = Number.isFinite(Number(task.progress))
        ? Math.round(Number(task.progress))
        : 0;
      const depth = task.depth || 0;
      const startIso = span ? toIsoDateOnly(span.start) : "";
      const endIso = span ? toIsoDateOnly(span.end) : "";
      const dateLine = span
        ? `${formatDateOnly(startIso)} – ${formatDateOnly(endIso)}`
        : "Bez dat";
      const tip = [task.name, dateLine, projectTitle, owner, task.status, `${progress}%`].join(
        " · "
      );
      const defaultHidden =
        treeHidden || (!projectFilterAll && String(projectId) !== focusId);
      const left = span ? ganttDayDiff(rangeStart, span.start) * dayWidth : 0;
      const width = span
        ? Math.max(dayWidth, (ganttDayDiff(span.start, span.end) + 1) * dayWidth)
        : 0;
      const expandBtn = task.hasChildren
        ? `<button
            type="button"
            class="gantt-tree-toggle${expanded ? " is-expanded" : ""}"
            data-role="gantt-toggle-expand"
            data-project-id="${escapeHtml(projectId)}"
            data-task-id="${escapeHtml(task.id)}"
            aria-expanded="${expanded ? "true" : "false"}"
            title="${expanded ? "Zwiń" : "Rozwiń"}"
            aria-label="${expanded ? "Zwiń podzadania" : "Rozwiń podzadania"}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>`
        : `<span class="gantt-tree-toggle-spacer" aria-hidden="true"></span>`;
      const autoOn = isProjectAutoScheduleEnabled(
        projects.find((p) => String(p.id) === String(projectId)) || project
      );
      const scheduleLocked = Boolean(task.hasChildren && autoOn);
      const barHtml = span
        ? `<div
              class="gantt-bar gantt-bar-${escapeHtml(task.statusKey || "todo")}${
                scheduleLocked ? " is-summary" : ""
              }"
              data-role="gantt-bar"
              data-task-id="${escapeHtml(task.id)}"
              data-project-id="${escapeHtml(projectId)}"
              data-parent-id="${escapeHtml(task.parentId || "")}"
              data-summary="${scheduleLocked ? "1" : "0"}"
              data-due-locked="${task.dueDateLocked ? "1" : "0"}"
              data-start="${escapeHtml(startIso)}"
              data-end="${escapeHtml(endIso)}"
              style="left:${left}px;width:${width}px"
              title="${escapeHtml(tip)}"
            >
              <button
                type="button"
                class="gantt-bar-link-plus"
                data-role="gantt-dep-port"
                data-edge="out"
                title="Połącz z innym zadaniem"
                aria-label="Narysuj powiązanie"
              >+</button>
              ${
                scheduleLocked
                  ? ""
                  : `<span class="gantt-bar-handle is-start" data-role="gantt-resize" data-edge="start" title="Rozciągnij początek"></span>`
              }
              <span class="gantt-bar-label">${escapeHtml(task.name)}</span>
              <span class="gantt-bar-pct">${progress}%</span>
              ${
                scheduleLocked
                  ? ""
                  : `<span class="gantt-bar-handle is-end" data-role="gantt-resize" data-edge="end" title="Rozciągnij koniec"></span>`
              }
            </div>`
        : "";
      return `
        <div
          class="gantt-row${task.hasChildren ? " has-children" : ""}${
            treeHidden ? " is-tree-hidden" : ""
          }"
          data-role="gantt-row"
          data-task-id="${escapeHtml(task.id)}"
          data-project-id="${escapeHtml(projectId)}"
          data-parent-id="${escapeHtml(task.parentId || "")}"
          data-depth="${depth}"
          data-owner-id="${escapeHtml(String(task.ownerId || ""))}"
          data-status-key="${escapeHtml(task.statusKey || "")}"
          data-tree-hidden="${treeHidden ? "1" : "0"}"
          style="--gantt-depth:${depth}"
          ${defaultHidden ? "hidden" : ""}
        >
          <div class="gantt-label">
            ${expandBtn}
            <div class="gantt-label-copy">
              <strong>${escapeHtml(task.name)}</strong>
              <span class="gantt-label-dates">${escapeHtml(dateLine)}</span>
            </div>
          </div>
          <div class="gantt-track" style="width:${timelineWidth}px;background-size:${dayWidth}px 100%">
            ${barHtml}
          </div>
        </div>`;
    })
    .join("");

  return `
    <div
      class="tasks-gantt"
      data-role="tasks-gantt-view"
      data-project-id="${project.id}"
      data-gantt-scale="${scale}"
      data-range-start="${escapeHtml(toIsoDateOnly(rangeStart))}"
      data-day-width="${dayWidth}"
      data-timeline-width="${timelineWidth}"
    >
      <div class="gantt-toolbar">
        <div>
          <p class="eyebrow">Widok Gantta</p>
          <p class="gantt-range-meta">
            ${escapeHtml(formatDateOnly(toIsoDateOnly(rangeStart)))}
            –
            ${escapeHtml(formatDateOnly(toIsoDateOnly(rangeEnd)))}
            · kolejność i drzewo jak we Flow
          </p>
        </div>
        <div class="gantt-toolbar-actions">
          ${filtersHtml}
          ${scaleToggle}
        </div>
      </div>
      <div class="gantt-scroll" data-role="gantt-pan" title="Przeciągnij w poziomie, aby przesunąć oś czasu">
        <div class="gantt-chart" style="--gantt-label-width:18rem;--gantt-day-width:${dayWidth}px;--gantt-timeline-width:${timelineWidth}px">
          <div class="gantt-head">
            <div class="gantt-label-head">Zadanie</div>
            <div class="gantt-timeline-head" style="width:${timelineWidth}px;background-size:${dayWidth}px 100%">
              <div class="gantt-months">${tickHead}</div>
              ${
                showToday
                  ? `<div class="gantt-today-line" style="left:${todayOffset * dayWidth + dayWidth / 2}px" title="Dziś"></div>`
                  : ""
              }
            </div>
          </div>
          <div class="gantt-body" data-role="gantt-body">
            <svg class="gantt-dep-svg" data-role="gantt-dep-svg" aria-hidden="true"></svg>
            ${bodyRows}
          </div>
          ${
            showToday
              ? `<div class="gantt-today-line gantt-today-overlay" style="left:calc(var(--gantt-label-width) + ${
                  todayOffset * dayWidth + dayWidth / 2
                }px)"></div>`
              : ""
          }
        </div>
      </div>
    </div>`;
}

function formatTaskDaysCount(days) {
  const n = Math.max(0, Math.round(Number(days) || 0));
  if (n === 1) return "1 dzień";
  return `${n} dni`;
}

function taskDisplaySpanDays(task) {
  if (task?.startDate && task?.dueDate) {
    const start = parseTaskDateOnly(task.startDate);
    const end = parseTaskDateOnly(task.dueDate);
    if (start && end && end >= start) return ganttDayDiff(start, end) + 1;
  }
  if (task?.durationDays > 0) return Number(task.durationDays);
  return null;
}

function projectInstanceDocsPanelHtml(project) {
  const path = {
    id: "project-flow",
    name: project.flowInstance?.sourcePathName || "Flow projektu",
    tasks: project.flowInstance?.tasks || [],
  };
  const linkedDocIds = getLinkedDocIdsForPath(path);
  const docs = projectFlowDocCatalog(project);
  const groups = [];
  const byGroup = new Map();
  docs.forEach((doc) => {
    const key = doc.group || "Inne";
    if (!byGroup.has(key)) {
      byGroup.set(key, []);
      groups.push(key);
    }
    byGroup.get(key).push(doc);
  });

  return `
    <button
      type="button"
      class="workflow-docs-reopen"
      data-role="workflow-docs-toggle"
      aria-label="Pokaż dokumenty"
      title="Pokaż dokumenty"
      ${isWorkflowDocsCollapsed() ? "" : "hidden"}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>Dokumenty</span>
    </button>
    <article class="panel workflow-docs-panel" data-role="workflow-documents" ${
      isWorkflowDocsCollapsed() ? "hidden" : ""
    }>
      <div class="panel-head panel-head-actions">
        <h2>Dokumenty</h2>
        <div class="workflow-docs-head-tools">
          <span class="workflow-docs-count">${docs.length}</span>
          <button
            type="button"
            class="workflow-docs-collapse"
            data-role="workflow-docs-toggle"
            aria-label="Ukryj dokumenty"
            title="Ukryj dokumenty"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <p class="config-lead">
        Przeciągnij dokument na zadanie, aby powiązać. Zmiany dotyczą instancji projektu (nie wzorca Workflow).
      </p>
      <div class="workflow-docs-scroll" data-role="workflow-docs-drop">
        ${groups
          .map((group) => {
            const items = byGroup.get(group) || [];
            return `
            <section class="workflow-doc-group">
              <h3 class="workflow-doc-group-title">${escapeHtml(group)}</h3>
              <ul class="workflow-doc-list">
                ${items
                  .map((doc) => {
                    const linked = linkedDocIds.has(doc.id);
                    return `
                  <li
                    class="workflow-doc-item${linked ? " is-linked" : ""}"
                    data-doc-id="${escapeHtml(doc.id)}"
                    data-doc-source="${escapeHtml(
                      doc.source === "system"
                        ? "system"
                        : doc.source === "standard"
                          ? "standard"
                          : doc.source === "flow"
                            ? "flow"
                            : "warunkowy"
                    )}"
                    draggable="true"
                    data-role="workflow-doc-item"
                    title="Przeciągnij na zadanie, aby powiązać"
                  >
                    <div class="workflow-doc-main">
                      <span class="workflow-doc-title">${escapeHtml(doc.title)}</span>
                      ${
                        doc.ruleHint
                          ? `<span class="workflow-doc-hint">${escapeHtml(doc.ruleHint)}</span>`
                          : ""
                      }
                    </div>
                    <div class="workflow-doc-side">
                      ${
                        linked
                          ? `<div class="workflow-doc-linked-actions">
                              <span class="workflow-doc-check" title="Powiązany" aria-label="Powiązany">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                                  <path d="M5 12.5 10 17.5 19 7.5" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                              </span>
                              <button
                                type="button"
                                class="workflow-doc-locate"
                                data-role="workflow-locate-task"
                                data-doc-id="${escapeHtml(doc.id)}"
                                title="Pokaż zadanie"
                                aria-label="Pokaż zadanie"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                                  <circle cx="12" cy="12" r="3.2" />
                                  <path d="M12 3.5v2.8M12 17.7v2.8M3.5 12h2.8M17.7 12h2.8" stroke-linecap="round" />
                                </svg>
                              </button>
                            </div>`
                          : `<span class="workflow-doc-meta">${escapeHtml(
                              doc.source === "system"
                                ? "system"
                                : doc.source === "standard"
                                  ? "standard"
                                  : doc.source === "flow"
                                    ? "flow"
                                    : "warunkowy"
                            )}</span>`
                      }
                    </div>
                  </li>`;
                  })
                  .join("")}
              </ul>
            </section>`;
          })
          .join("")}
      </div>
      ${workflowCreateUnassignedDocsButtonHtml(
        docs.filter((doc) => !linkedDocIds.has(doc.id)).length
      )}
    </article>`;
}

function projectTasksCardsHtml(project) {
  const tasks = collectProjectTasks(project);
  const expandMap = loadTaskExpandState(project.id);
  const treeHidden = getTaskTreeHiddenIdSet(project.id, tasks);
  const flowTasks = project.flowInstance?.tasks || [];
  const flowMap = new Map(flowTasks.map((task) => [String(task.id), task]));
  const taskMap = new Map(tasks.map((task) => [String(task.id), task]));

  const items = tasks
    .map((task) => {
      const depth = task.depth || 0;
      const expanded = isTaskNodeExpanded(project.id, task, expandMap);
      const hidden = treeHidden.has(String(task.id));
      const ownerName = ownerLabel(project, task.ownerId);
      const startLabel = task.startDate ? formatDateOnly(task.startDate) : "—";
      const dueLabel = task.dueDate ? formatDateOnly(task.dueDate) : "—";
      const spanDays = taskDisplaySpanDays(task);
      const linkedLabel = task.linkedDoc
        ? resolveLinkedDocLabel(project, task.linkedDoc)
        : "";
      const flowTask = flowMap.get(String(task.id));
      const blockedBy = (flowTask?.blockedBy || task.dependsOn || [])
        .map((id) => ({ id, name: taskMap.get(String(id))?.name || flowMap.get(String(id))?.name }))
        .filter((item) => item.name);
      const flowControls = flowTask
        ? `<div class="tasks-card-flow-controls">
            <button
              type="button"
              class="ghost-btn tasks-card-mini-btn"
              data-role="workflow-add-child"
              data-task-id="${escapeHtml(task.id)}"
            >+ Podrzędne</button>
            <button
              type="button"
              class="ghost-btn tasks-card-mini-btn"
              data-role="workflow-set-blocks"
              data-task-id="${escapeHtml(task.id)}"
            >Wymaga</button>
            <button
              type="button"
              class="ghost-btn tasks-card-mini-btn is-danger"
              data-role="delete-project-task"
              data-task-id="${escapeHtml(task.id)}"
              data-project-id="${escapeHtml(project.id)}"
            >Usuń</button>
          </div>`
        : `<div class="tasks-card-flow-controls">
            <button
              type="button"
              class="ghost-btn tasks-card-mini-btn"
              data-role="open-add-task"
              data-project-id="${escapeHtml(project.id)}"
              data-parent-task-id="${escapeHtml(task.id)}"
            >+ Podrzędne</button>
            <button
              type="button"
              class="ghost-btn tasks-card-mini-btn is-danger"
              data-role="delete-project-task"
              data-task-id="${escapeHtml(task.id)}"
              data-project-id="${escapeHtml(project.id)}"
            >Usuń</button>
          </div>`;
      const expandBtn = task.hasChildren
        ? `<button
            type="button"
            class="workflow-task-toggle${expanded ? " is-expanded" : ""}"
            data-role="toggle-task-expand"
            data-project-id="${escapeHtml(project.id)}"
            data-task-id="${escapeHtml(task.id)}"
            aria-expanded="${expanded ? "true" : "false"}"
            title="${expanded ? "Zwiń" : "Rozwiń"}"
            aria-label="${expanded ? "Zwiń podzadania" : "Rozwiń podzadania"}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>`
        : `<span class="workflow-task-toggle-spacer" aria-hidden="true"></span>`;

      return `
        <li
          class="workflow-task-item tasks-card-item${hidden ? " is-collapsed-hidden" : ""}${
            task.hasChildren ? " has-children" : ""
          }"
          style="--wf-depth:${depth}"
          data-role="open-task"
          data-task-kind="${escapeHtml(task.kind)}"
          data-task-id="${escapeHtml(task.id)}"
          data-project-id="${escapeHtml(project.id)}"
          data-parent-id="${escapeHtml(task.parentId || "")}"
          data-depth="${depth}"
          data-filter-search="${escapeHtml(
            [
              task.name,
              task.typeLabel,
              ownerName,
              startLabel,
              dueLabel,
              task.status,
              `${task.progress}%`,
              linkedLabel,
              task.description || "",
            ]
              .join(" ")
              .toLowerCase()
          )}"
          draggable="true"
        >
          <div class="workflow-task-card tasks-card-tile" data-task-depth="${depth}">
            <span class="workflow-nest-hint" aria-hidden="true">Upuść, aby zagnieździć</span>
            <div class="workflow-link-doc-hint" data-role="workflow-link-doc-hint">
              Upuść, aby powiązać dokument
            </div>
            <div class="workflow-task-top tasks-card-top">
              <button
                type="button"
                class="workflow-task-drag"
                data-role="tasks-card-drag-handle"
                title="Przeciągnij, aby zmienić kolejność"
                aria-label="Przeciągnij zadanie"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M8 7h8M8 12h8M8 17h8" stroke-linecap="round" />
                </svg>
              </button>
              ${expandBtn}
              <div class="workflow-task-main tasks-card-main">
                <div class="tasks-card-headline">
                  <button
                    type="button"
                    class="tasks-card-title"
                    data-role="open-task-title"
                    data-project-id="${escapeHtml(project.id)}"
                    data-task-id="${escapeHtml(task.id)}"
                    data-task-kind="${escapeHtml(task.kind)}"
                  >${escapeHtml(task.name)}</button>
                  <div class="tasks-card-schedule-readout" title="Harmonogram (tylko podgląd)">
                    <span class="tasks-card-range-big">
                      <em>Od</em> <strong>${escapeHtml(startLabel)}</strong>
                      <span class="tasks-card-range-sep">→</span>
                      <em>Do</em> <strong>${escapeHtml(dueLabel)}</strong>
                    </span>
                    <span class="tasks-card-days-big">${
                      spanDays != null ? escapeHtml(formatTaskDaysCount(spanDays)) : "—"
                    }</span>
                  </div>
                </div>
                <div class="tasks-card-meta-row">
                  <span class="task-type-pill">${escapeHtml(task.typeLabel || "Zadanie")}</span>
                  ${taskNameIconsHtml(project, task)}
                  <span class="tasks-card-progress-inline">
                    <span class="fill-bar" aria-hidden="true"><span style="width:${task.progress}%"></span></span>
                    <strong>${task.progress}%</strong>
                  </span>
                </div>
                ${
                  linkedLabel
                    ? `<span
                        class="workflow-task-doc"
                        draggable="true"
                        data-role="workflow-task-doc"
                        data-doc-id="${escapeHtml(task.linkedDoc?.id || task.docId || "")}"
                        data-task-id="${escapeHtml(task.id)}"
                        title="Przeciągnij na listę dokumentów, aby odpiąć"
                      >${escapeHtml(linkedLabel)}</span>`
                    : ""
                }
                ${
                  blockedBy.length
                    ? `<div class="workflow-dep-chips">
                        ${blockedBy
                          .map(
                            (item) => `
                          <span class="workflow-dep-chip">
                            <span>Wymaga: ${escapeHtml(item.name)}</span>
                            <button
                              type="button"
                              class="workflow-dep-chip-remove"
                              data-role="workflow-remove-dep"
                              data-from="${escapeHtml(item.id)}"
                              data-to="${escapeHtml(task.id)}"
                              title="Usuń powiązanie"
                              aria-label="Usuń powiązanie"
                            >×</button>
                          </span>`
                          )
                          .join("")}
                      </div>`
                    : ""
                }
                ${flowControls}
              </div>
              <div class="tasks-card-side">
                <label class="tasks-card-field" title="Właściciel">
                  <span class="tasks-card-field-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                      <circle cx="12" cy="8" r="3" />
                      <path d="M5.5 18.5c1.2-2.8 3.2-4.2 6.5-4.2s5.3 1.4 6.5 4.2" stroke-linecap="round" />
                    </svg>
                  </span>
                  <select
                    class="owner-select"
                    data-role="task-owner"
                    data-task-id="${escapeHtml(task.id)}"
                    data-project-id="${escapeHtml(project.id)}"
                    aria-label="Właściciel zadania"
                  >
                    ${taskOwnerOptionsHtml(project, task.ownerId)}
                  </select>
                </label>
                <label class="tasks-card-field" title="Status">
                  <span class="tasks-card-field-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                      <circle cx="12" cy="12" r="8.25" />
                      <path d="M8.5 12.2 11 14.7 15.5 9.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                  <select
                    class="owner-select status-select"
                    data-role="task-status"
                    data-task-id="${escapeHtml(task.id)}"
                    data-project-id="${escapeHtml(project.id)}"
                    aria-label="Status zadania"
                  >
                    ${taskStatusOptionsHtml(task.statusKey)}
                  </select>
                </label>
                <div class="tasks-card-date" data-col="start" title="Edycja daty rozpoczęcia">
                  <span class="tasks-card-date-label">Od</span>
                  ${
                    task.startDateLocked
                      ? `<span class="task-date-readonly">${
                          task.startDate
                            ? escapeHtml(formatDateOnly(task.startDate))
                            : "—"
                        }</span>`
                      : taskDateControlHtml(project, task, {
                          value: task.startDate,
                          inputRole: "task-start",
                          openRole: "open-task-start",
                          label: "Data rozpoczęcia",
                        })
                  }
                </div>
                <div class="tasks-card-date" data-col="due" title="Edycja daty zakończenia">
                  <span class="tasks-card-date-label">Do</span>
                  ${
                    task.dueDateLocked
                      ? `<span class="task-date-readonly" title="Data zakończenia wynika z ostatniego podzadania">${
                          task.dueDate
                            ? escapeHtml(formatDateOnly(task.dueDate))
                            : "—"
                        }</span>`
                      : taskDateControlHtml(project, task, {
                          value: task.dueDate,
                          inputRole: "task-due",
                          openRole: "open-task-due",
                          label: "Data zakończenia prac",
                        })
                  }
                </div>
              </div>
            </div>
          </div>
        </li>`;
    })
    .join("");

  return `
    <div class="tasks-cards" data-role="tasks-cards-view" data-project-id="${escapeHtml(
      project.id
    )}">
      <div class="tasks-cards-toolbar">
        <label class="tasks-search search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" stroke-linecap="round" />
          </svg>
          <input
            type="search"
            data-role="filter-task-search"
            placeholder="Szukaj zadań…"
            aria-label="Wyszukaj zadania"
            autocomplete="off"
          />
        </label>
        <p class="table-filter-meta" data-role="task-filter-count">${tasks.length} zadań</p>
        <button
          type="button"
          class="ghost-btn table-action-btn"
          data-role="tasks-cards-add-root"
          data-project-id="${escapeHtml(project.id)}"
          title="Dodaj zadanie główne do Flow projektu"
        >+ Zadanie główne</button>
        <button type="button" class="ghost-btn table-action-btn" data-role="tasks-expand-all" data-project-id="${escapeHtml(
          project.id
        )}">
          Rozwiń wszystko
        </button>
        <button type="button" class="ghost-btn table-action-btn" data-role="tasks-collapse-roots" data-project-id="${escapeHtml(
          project.id
        )}">
          Zwiń wszystko
        </button>
      </div>
      <div class="workflow-layout tasks-cards-layout${
        isWorkflowDocsCollapsed() ? " is-docs-collapsed" : ""
      }" data-role="workflow-layout">
        <aside class="panel workflow-tasks-panel tasks-cards-tasks-panel" data-role="workflow-tasks">
          ${
            tasks.length
              ? `<div class="workflow-task-canvas" data-role="workflow-task-canvas">
                  <svg class="workflow-dep-svg" data-role="workflow-dep-svg" aria-hidden="true"></svg>
                  <ul class="workflow-task-list tasks-cards-list" data-role="workflow-task-list">
                    ${items}
                  </ul>
                </div>`
              : `<p class="tasks-cards-empty muted">Brak zadań — wygeneruj Flow lub dodaj zadanie.</p>`
          }
        </aside>
        ${projectInstanceDocsPanelHtml(project)}
      </div>
    </div>`;
}

function projectTasksPanelHtml(project, options = {}) {
  const global = Boolean(options.global);
  const tasks = collectProjectTasks(project);
  const viewMode = global ? "table" : getTasksViewMode();
  const surveyCount = project.formalSurvey?.documents?.length || 0;
  const surveyTooltip = surveyCount
    ? "Edytuj ankietę formalną — zaktualizuj listę dokumentów"
    : "Uruchom ankietę formalną — wygeneruj dokumenty do złożenia";
  const tableId = "project-tasks";
  const body = global
    ? globalTasksTableHtml()
    : viewMode === "flow"
      ? projectFlowViewHtml(project)
      : viewMode === "kanban"
        ? projectTasksKanbanHtml(project)
        : viewMode === "gantt"
          ? projectTasksGanttHtml(project)
          : viewMode === "cards"
            ? projectTasksCardsHtml(project)
            : projectTasksTableBodyHtml(project, tasks, tableId);

  return `
    <article
      class="panel project-tasks-panel"
      data-role="project-tasks-panel"
      data-project-id="${project.id}"
      data-view-mode="${viewMode}"
      ${global ? 'data-global="1"' : ""}
    >
      <div class="panel-head panel-head-actions">
        <h2>${global ? "Zadania (wszystkie projekty)" : "Zadania"}</h2>
        <div class="panel-head-tools">
          ${
            global
              ? ""
              : `<button
            type="button"
            class="tool-btn tool-btn-muted add-task-btn"
            data-role="open-add-task"
            data-project-id="${project.id}"
            title="Dodaj zadanie"
            aria-label="Dodaj zadanie"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke-linecap="round" />
            </svg>
          </button>
          <button
            type="button"
            class="tool-btn tool-btn-muted survey-launch-btn"
            data-role="open-formal-survey"
            data-project-id="${project.id}"
            title="${escapeHtml(surveyTooltip)}"
            aria-label="${escapeHtml(surveyTooltip)}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path d="M8 4h8a1 1 0 0 1 1 1v15l-5-2.5L7 20V5a1 1 0 0 1 1-1Z" />
              <path d="M10 9h4M10 13h4" stroke-linecap="round" />
            </svg>
          </button>
          <button
            type="button"
            class="tool-btn tool-btn-muted view-mode-btn ${viewMode === "flow" ? "is-active" : ""}"
            data-role="tasks-flow"
            data-project-id="${project.id}"
            title="Widok Flow"
            aria-label="Widok Flow"
            aria-pressed="${viewMode === "flow" ? "true" : "false"}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path d="M5 7h6M13 7h6M8 7v10M16 7v4M8 17h4M16 11h3" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="8" cy="7" r="1.4" fill="currentColor" stroke="none" />
              <circle cx="16" cy="7" r="1.4" fill="currentColor" stroke="none" />
              <circle cx="12" cy="17" r="1.4" fill="currentColor" stroke="none" />
              <circle cx="19" cy="11" r="1.4" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button
            type="button"
            class="tool-btn tool-btn-muted view-mode-btn ${viewMode === "table" ? "is-active" : ""}"
            data-role="tasks-table"
            data-project-id="${project.id}"
            title="Widok tabeli"
            aria-label="Widok tabeli"
            aria-pressed="${viewMode === "table" ? "true" : "false"}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
              <path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v15M15 4.5v15" stroke-linecap="round" />
            </svg>
          </button>
          <button
            type="button"
            class="tool-btn tool-btn-muted view-mode-btn ${viewMode === "cards" ? "is-active" : ""}"
            data-role="tasks-cards"
            data-project-id="${project.id}"
            title="Widok listy (kafelki)"
            aria-label="Widok listy (kafelki)"
            aria-pressed="${viewMode === "cards" ? "true" : "false"}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <rect x="4" y="4.5" width="16" height="4.5" rx="1.2" />
              <rect x="4" y="10.75" width="16" height="4.5" rx="1.2" />
              <rect x="4" y="17" width="16" height="3.5" rx="1.2" />
            </svg>
          </button>
          <button
            type="button"
            class="tool-btn tool-btn-muted view-mode-btn ${viewMode === "gantt" ? "is-active" : ""}"
            data-role="tasks-gantt"
            data-project-id="${project.id}"
            title="Widok Gantta"
            aria-label="Widok Gantta"
            aria-pressed="${viewMode === "gantt" ? "true" : "false"}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <path d="M4 5h4M4 5v14M8 9h7M8 13h10M8 17h5" stroke-linecap="round" />
            </svg>
          </button>
          <button
            type="button"
            class="tool-btn tool-btn-muted view-mode-btn ${viewMode === "kanban" ? "is-active" : ""}"
            data-role="tasks-kanban"
            data-project-id="${project.id}"
            title="Widok Kanban"
            aria-label="Widok Kanban"
            aria-pressed="${viewMode === "kanban" ? "true" : "false"}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <rect x="3.5" y="4" width="5" height="16" rx="1" />
              <rect x="9.5" y="4" width="5" height="10" rx="1" />
              <rect x="15.5" y="4" width="5" height="13" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            class="tool-btn tool-btn-muted kpa-btn"
            data-role="open-kpa"
            data-project-id="${project.id}"
            title="KPA — diagramy zadań"
            aria-label="KPA — diagramy zadań"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <circle cx="12" cy="12" r="8.25" />
              <path d="M12 3.75v8.25h8.25" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M12 12 6.2 18.4" stroke-linecap="round" />
            </svg>
          </button>`
          }
        </div>
      </div>
      ${body}
    </article>`;
}

function projectFlowViewHtml(project) {
  const inst = project.flowInstance;
  const hasTasks = Array.isArray(inst?.tasks) && inst.tasks.length > 0;
  if (!hasTasks) {
    return `
      <div class="project-flow-empty" data-role="project-flow-empty">
        <p class="eyebrow">Flow projektu</p>
        <h3>Wybierz predefiniowany flow</h3>
        <p>
          Ankieta wskazuje dokumenty do obsługi. Flow opisuje kroki wokół tych dokumentów.
          Bez ankiety wystarczy gałąź wokół <strong>Projektu budowlanego</strong>.
          Z ankietą generujemy także zadania dla jej dokumentów — Projekt budowlany zawsze wchodzi w skład.
        </p>
        <button
          type="button"
          class="primary-btn"
          data-role="project-flow-pick"
          data-project-id="${escapeHtml(project.id)}"
        >Wybierz flow i generuj</button>
      </div>`;
  }

  const path = {
    id: "project-flow",
    name: inst.sourcePathName || "Flow projektu",
    createdAt: inst.generatedAt || "",
    tasks: inst.tasks,
  };
  const linkedDocIds = getLinkedDocIdsForPath(path);
  const docs = projectFlowDocCatalog(project);
  const groups = [];
  const byGroup = new Map();
  docs.forEach((doc) => {
    const key = doc.group || "Inne";
    if (!byGroup.has(key)) {
      byGroup.set(key, []);
      groups.push(key);
    }
    byGroup.get(key).push(doc);
  });

  return `
    <div class="project-flow-view" data-role="project-flow-view" data-project-id="${escapeHtml(
      project.id
    )}">
      <div class="project-flow-toolbar">
        <p class="project-flow-source">
          Wzorzec: <strong>${escapeHtml(inst.sourcePathName || "Flow")}</strong>
        </p>
        <button
          type="button"
          class="ghost-btn"
          data-role="project-flow-pick"
          data-project-id="${escapeHtml(project.id)}"
        >Generuj ponownie / scal</button>
      </div>
      <div class="workflow-layout${isWorkflowDocsCollapsed() ? " is-docs-collapsed" : ""}" data-role="workflow-layout">
        ${workflowTasksPanelHtml(path)}
        <button
          type="button"
          class="workflow-docs-reopen"
          data-role="workflow-docs-toggle"
          aria-label="Pokaż dokumenty"
          title="Pokaż dokumenty"
          ${isWorkflowDocsCollapsed() ? "" : "hidden"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>Dokumenty</span>
        </button>
        <article class="panel workflow-docs-panel" data-role="workflow-documents" ${
          isWorkflowDocsCollapsed() ? "hidden" : ""
        }>
          <div class="panel-head panel-head-actions">
            <h2>Dokumenty</h2>
            <div class="workflow-docs-head-tools">
              <span class="workflow-docs-count">${docs.length}</span>
              <button
                type="button"
                class="workflow-docs-collapse"
                data-role="workflow-docs-toggle"
                aria-label="Ukryj dokumenty"
                title="Ukryj dokumenty"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          <p class="config-lead">
            Dokumenty z ankiety oraz Projekt budowlany. Pełny katalog jest w zakładce Workflow (schemat).
          </p>
          <div class="workflow-docs-scroll" data-role="workflow-docs-drop">
            ${groups
              .map((group) => {
                const items = byGroup.get(group) || [];
                return `
                <section class="workflow-doc-group">
                  <h3 class="workflow-doc-group-title">${escapeHtml(group)}</h3>
                  <ul class="workflow-doc-list">
                    ${items
                      .map((doc) => {
                        const linked = linkedDocIds.has(doc.id);
                        return `
                      <li
                        class="workflow-doc-item${linked ? " is-linked" : ""}"
                        data-doc-id="${escapeHtml(doc.id)}"
                        data-doc-source="${escapeHtml(
                          doc.source === "system"
                            ? "system"
                            : doc.source === "standard"
                              ? "standard"
                              : doc.source === "flow"
                                ? "flow"
                                : "warunkowy"
                        )}"
                        draggable="true"
                        data-role="workflow-doc-item"
                        title="Przeciągnij na zadanie, aby powiązać"
                      >
                        <div class="workflow-doc-main">
                          <span class="workflow-doc-title">${escapeHtml(doc.title)}</span>
                          ${
                            doc.ruleHint
                              ? `<span class="workflow-doc-hint">${escapeHtml(doc.ruleHint)}</span>`
                              : ""
                          }
                        </div>
                        <div class="workflow-doc-side">
                          ${
                            linked
                              ? `<div class="workflow-doc-linked-actions">
                                  <span class="workflow-doc-check" title="Powiązany" aria-label="Powiązany">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                                      <path d="M5 12.5 10 17.5 19 7.5" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                  </span>
                                  <button
                                    type="button"
                                    class="workflow-doc-locate"
                                    data-role="workflow-locate-task"
                                    data-doc-id="${escapeHtml(doc.id)}"
                                    title="Pokaż zadanie"
                                    aria-label="Pokaż zadanie"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                                      <circle cx="12" cy="12" r="3.2" />
                                      <path d="M12 3.5v2.8M12 17.7v2.8M3.5 12h2.8M17.7 12h2.8" stroke-linecap="round" />
                                    </svg>
                                  </button>
                                </div>`
                              : `<span class="workflow-doc-meta">${escapeHtml(
                                  doc.source === "system"
                                    ? "system"
                                    : doc.source === "standard"
                                      ? "standard"
                                      : doc.source === "flow"
                                        ? "flow"
                                        : "warunkowy"
                                )}</span>`
                          }
                        </div>
                      </li>`;
                      })
                      .join("")}
                  </ul>
                </section>`;
              })
              .join("")}
          </div>
          ${workflowCreateUnassignedDocsButtonHtml(
            docs.filter((doc) => !linkedDocIds.has(doc.id)).length
          )}
        </article>
      </div>
    </div>`;
}

function projectAttachmentsOverviewHtml(project) {
  const files = project.files || [];
  const tableId = "project-attachments";
  return `
    <article class="panel project-files-panel" data-role="project-attachments">
      <div class="panel-head panel-head-actions">
        <h2>Załączniki</h2>
        <label class="attach-add-btn" title="Dodaj załączniki" aria-label="Dodaj załączniki">
          <input
            type="file"
            multiple
            hidden
            data-role="project-attach-input"
            data-project-id="${project.id}"
          />
          <span class="attach-add-plus" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </label>
      </div>
      ${
        files.length === 0
          ? `<p class="files-empty-inline">Brak załączników — użyj plusa, aby dodać pliki.</p>`
          : `
      <div class="data-table-wrap data-table-lined-wrap">
        <table class="data-table data-table-lined is-col-customizable" data-table="${tableId}">
          ${tableColgroupHtml(tableId, PROJECT_ATTACHMENT_COLUMNS)}
          <thead>
            <tr>
              ${tableHeadCellsHtml(tableId, PROJECT_ATTACHMENT_COLUMNS)}
            </tr>
          </thead>
          <tbody>
            ${files
              .map((file) => {
                const cells = {
                  name: `<td data-col="name"><strong>${escapeHtml(file.name)}</strong></td>`,
                  category: `<td data-col="category">
                  <button
                    type="button"
                    class="type-chip table-type-chip ${file.categoryId ? "is-set" : ""}"
                    data-role="edit-attachment-category"
                    data-project-id="${project.id}"
                    data-file-id="${escapeHtml(String(file.id))}"
                    title="Zmień kategorię"
                  >
                    <span class="type-chip-text">${escapeHtml(
                      findCategoryLabel(file.categoryId)
                    )}</span>
                  </button>
                </td>`,
                  size: `<td data-col="size">${
                    file.size ? formatBytes(file.size) : "—"
                  }</td>`,
                  added: `<td data-col="added">${
                    file.addedAt
                      ? formatDate(file.addedAt)
                      : project.createdAt
                        ? formatDate(project.createdAt)
                        : "—"
                  }</td>`,
                  actions: `<td data-col="actions" class="col-actions">
                  <button
                    type="button"
                    class="icon-btn file-remove table-file-remove"
                    data-role="remove-attachment"
                    data-project-id="${project.id}"
                    data-file-id="${escapeHtml(String(file.id))}"
                    aria-label="Usuń załącznik ${escapeHtml(file.name || "")}"
                    title="Usuń załącznik"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                      <path d="M6 7h12M10 7V5h4v2M9 7l.6 12h4.8L15 7" />
                    </svg>
                  </button>
                </td>`,
                };
                return `
              <tr
                class="is-row-clickable"
                data-role="open-attachment-row"
                data-project-id="${project.id}"
                data-file-id="${escapeHtml(String(file.id))}"
                data-file-name="${escapeHtml((file.name || "").toLowerCase())}"
                data-file-category="${escapeHtml(file.categoryId || "")}"
                tabindex="0"
              >
                ${joinCellsInOrder(tableId, PROJECT_ATTACHMENT_COLUMNS, cells)}
              </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>`
      }
    </article>`;
}

function docFormPanelHtml(project, doc) {
  if (!doc) {
    return `
      <div class="panel">
        <p>Nie znaleziono dokumentu.</p>
        <button type="button" class="ghost-btn" data-role="close-doc-form" data-project-id="${project.id}">
          Wróć do projektu
        </button>
      </div>`;
  }

  const fill = countDocFormFill(doc.id, project.docForms?.[doc.id] || {});

  return `
    <div class="doc-form-panel doc-task-view" data-project-id="${project.id}">
      <div class="doc-task-toolbar">
        <button type="button" class="ghost-btn" data-role="close-doc-form" data-project-id="${project.id}">
          Wróć do projektu
        </button>
        <p class="doc-task-toolbar-meta muted">
          ${
            doc.source === "standard" ? "Dokument standardowy" : "Dokument warunkowy"
          }
          · ${fill.filled}/${fill.total} pól · ${fill.percent}%
        </p>
      </div>

      ${documentTaskSplitHtml(project, "survey-doc", doc.id, {
        title: doc.title,
        eyebrow: "Dokument / zadanie",
        showTitle: false,
      })}

      ${taskSubtreeManageHtml(project, resolveDocumentTask(project, "survey-doc", doc.id).id, {
        returnTo: { panel: "doc-form", focusDocId: doc.id },
      })}

      <section class="doc-task-form-region" aria-label="Formularz dokumentu">
        <header class="doc-task-form-region-head">
          <div>
            <p class="eyebrow">Formularz</p>
            <h3>Sekcje dokumentu</h3>
            <p class="muted">Domyślnie zwinięte — rozwiń sekcję, aby wypełnić pola.</p>
          </div>
          <div class="doc-task-form-region-actions">
            ${assistButtonHtml(
              "assist-section",
              `doc:${doc.id}`,
              `Wypełnij cały dokument: ${doc.title}`
            )}
            <button
              type="button"
              class="icon-action-btn doc-download-btn"
              data-role="download-doc-pdf"
              data-project-id="${project.id}"
              data-doc-id="${escapeHtml(doc.id)}"
              title="Pobierz PDF (mock)"
              aria-label="Pobierz PDF: ${escapeHtml(doc.title)}"
            >
              ${pdfIconSvg(16)}
              <span>PDF</span>
            </button>
          </div>
        </header>
        <form class="doc-mini-form doc-task-form" data-role="doc-form" data-doc-id="${escapeHtml(
          doc.id
        )}" autocomplete="off">
          ${docFormSectionsHtml(project, doc)}
          ${docFormActionsHtml(project, doc)}
        </form>
      </section>
    </div>`;
}

function attachmentsViewHtml() {
  const rows = sortAttachmentRows(collectAttachmentRows());
  const projects = loadProjects();
  const totalBytes = rows.reduce((sum, row) => sum + (Number(row.size) || 0), 0);
  const owners = [
    ...new Map(
      rows
        .filter((row) => row.addedByName && row.addedByName !== "—")
        .map((row) => [row.addedById || row.addedByName, row.addedByName])
    ).entries(),
  ].map(([id, name]) => ({ id, name }));

  if (rows.length === 0) {
    return `
      <section class="projects-view">
        <header class="form-intro form-intro-row">
          <div class="form-intro-copy">
            <p class="eyebrow">Workspace</p>
            <h1>Załączniki</h1>
            <p class="lede form-lede">Wszystkie pliki z projektów na tym koncie.</p>
          </div>
          <button class="ghost-btn" type="button" data-view="dashboard">Wróć do pulpitu</button>
        </header>
        <div class="projects-empty panel">
          <p>Brak załączników we wszystkich projektach. Dodaj pliki w projektach.</p>
          <button class="primary-btn" type="button" data-view="building-projects">Przejdź do projektów</button>
        </div>
      </section>`;
  }

  return `
    <section class="projects-view" data-role="global-attachments-view">
      <header class="form-intro form-intro-row">
        <div class="form-intro-copy">
          <p class="eyebrow">Workspace</p>
          <h1>Załączniki</h1>
          <p class="lede form-lede">
            Pliki ze wszystkich projektów — filtruj, pobieraj i sprawdzaj, kto je dodał.
          </p>
        </div>
        <button class="ghost-btn" type="button" data-view="dashboard">Wróć do pulpitu</button>
      </header>

      <div class="attachments-summary panel">
        <div>
          <p class="eyebrow">Zajętość</p>
          <p class="attachments-summary-value">${formatBytes(totalBytes)}</p>
          <p class="muted">${rows.length} plików · ${projects.length} projektów</p>
        </div>
      </div>

      <div class="attachments-panel panel" data-role="global-attachments-table">
        <div class="table-toolbar attachments-toolbar">
          <label class="tasks-search search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" stroke-linecap="round" />
            </svg>
            <input
              type="search"
              data-role="filter-attachment-search"
              placeholder="Szukaj załącznika…"
              aria-label="Szukaj załącznika"
              autocomplete="off"
            />
          </label>
          <select class="column-filter" data-role="filter-attachment-project" aria-label="Filtr projektu">
            <option value="">Wszystkie projekty</option>
            ${projects
              .map(
                (p) =>
                  `<option value="${escapeHtml(p.id)}">${escapeHtml(
                    p.title || "Projekt"
                  )}</option>`
              )
              .join("")}
          </select>
          <select class="column-filter" data-role="filter-attachment-owner" aria-label="Filtr właściciela">
            <option value="">Wszyscy właściciele</option>
            ${owners
              .map(
                (opt) =>
                  `<option value="${escapeHtml(opt.id)}">${escapeHtml(opt.name)}</option>`
              )
              .join("")}
          </select>
          <p class="table-filter-meta" data-role="attachment-filter-count">${rows.length} plików</p>
          <button type="button" class="ghost-btn table-action-btn" data-role="clear-attachment-filters">
            Wyczyść filtry
          </button>
        </div>
        <div class="data-table-wrap">
          <table class="data-table data-table-lined" data-table="attachments">
            <thead>
              <tr>
                <th>Nazwa pliku</th>
                <th>Projekt</th>
                <th>Typ</th>
                <th>Właściciel</th>
                <th>Rozmiar</th>
                <th>Dodano</th>
                <th class="col-actions">Pobierz</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map((row) => {
                  const ownerKey = row.addedById || row.addedByName;
                  return `
              <tr
                data-role="attachment-row"
                data-filter-search="${escapeHtml(
                  `${row.name} ${row.projectTitle} ${row.categoryLabel} ${row.addedByName}`.toLowerCase()
                )}"
                data-filter-project="${escapeHtml(row.projectId)}"
                data-filter-owner="${escapeHtml(ownerKey)}"
                data-filter-size="${row.size}"
              >
                <td><strong>${escapeHtml(row.name)}</strong></td>
                <td>
                  <button type="button" class="table-link" data-project-id="${row.projectId}">
                    ${escapeHtml(row.projectTitle)}
                  </button>
                </td>
                <td><span class="table-pill muted">${escapeHtml(row.categoryLabel)}</span></td>
                <td>${escapeHtml(row.addedByName)}</td>
                <td>${row.size ? formatBytes(row.size) : "—"}</td>
                <td>${row.addedAt ? formatDate(row.addedAt) : "—"}</td>
                <td class="col-actions">
                  <button
                    type="button"
                    class="ghost-btn table-action-btn"
                    data-role="download-attachment"
                    data-project-id="${row.projectId}"
                    data-file-id="${escapeHtml(row.file.id)}"
                  >
                    Pobierz
                  </button>
                </td>
              </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        <p class="files-empty-inline attachment-filter-empty" data-role="attachment-filter-empty" hidden>
          Brak załączników pasujących do filtrów.
        </p>
      </div>
    </section>`;
}

function bindGlobalAttachmentsFilters() {
  const root = content.querySelector('[data-role="global-attachments-view"]');
  if (!root) return;
  const searchInput = root.querySelector('[data-role="filter-attachment-search"]');
  const projectFilter = root.querySelector('[data-role="filter-attachment-project"]');
  const ownerFilter = root.querySelector('[data-role="filter-attachment-owner"]');
  const countEl = root.querySelector('[data-role="attachment-filter-count"]');
  const emptyEl = root.querySelector('[data-role="attachment-filter-empty"]');
  const rows = [...root.querySelectorAll('[data-role="attachment-row"]')];

  const apply = () => {
    const words = String(searchInput?.value || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const projectId = projectFilter?.value || "";
    const ownerId = ownerFilter?.value || "";
    let visible = 0;
    let visibleBytes = 0;
    rows.forEach((row) => {
      const searchOk = words.every((word) => (row.dataset.filterSearch || "").includes(word));
      const projectOk = !projectId || row.dataset.filterProject === projectId;
      const ownerOk = !ownerId || row.dataset.filterOwner === ownerId;
      const show = searchOk && projectOk && ownerOk;
      row.hidden = !show;
      if (show) {
        visible += 1;
        visibleBytes += Number(row.dataset.filterSize || 0);
      }
    });
    if (countEl) {
      countEl.textContent =
        visible === rows.length
          ? `${rows.length} plików · ${formatBytes(
              rows.reduce((s, r) => s + Number(r.dataset.filterSize || 0), 0)
            )}`
          : `${visible} z ${rows.length} · ${formatBytes(visibleBytes)}`;
    }
    if (emptyEl) emptyEl.hidden = visible > 0;
  };

  searchInput?.addEventListener("input", apply);
  projectFilter?.addEventListener("change", apply);
  ownerFilter?.addEventListener("change", apply);
  root.querySelector('[data-role="clear-attachment-filters"]')?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (projectFilter) projectFilter.value = "";
    if (ownerFilter) ownerFilter.value = "";
    apply();
  });
  apply();
}

function projectsViewHtml(justSavedId = null) {
  const projects = loadProjects();

  if (projects.length === 0) {
    return `
      <section class="projects-view">
        <header class="form-intro">
          <p class="eyebrow">Workspace</p>
          <h1>Projekty</h1>
          <p class="lede form-lede">Brak zapisanych projektów. Stwórz pierwszy formularzem.</p>
        </header>
        <div class="projects-empty panel">
          <p>Lista jest pusta — przejdź do tworzenia projektu budowlanego.</p>
          <button class="primary-btn" type="button" data-view="new-project">Nowy projekt</button>
        </div>
      </section>`;
  }

  return `
    <section class="projects-view">
      <header class="form-intro form-intro-row">
        <div class="form-intro-copy">
          <p class="eyebrow">Workspace</p>
          <h1>Projekty</h1>
          <p class="lede form-lede">Zapisane w tej przeglądarce (mock localStorage).</p>
        </div>
        <button class="primary-btn" type="button" data-view="new-project">Nowy projekt</button>
      </header>
      ${
        justSavedId
          ? `<p class="save-toast">Projekt zapisany — widać go na liście poniżej.</p>`
          : ""
      }
      <ul class="projects-list">
        ${projects
          .map((project) => {
            const filesCount = project.files?.length || 0;
            const categorized =
              project.files?.filter((file) => file.categoryId).length || 0;
            return `
          <button type="button" class="project-card panel ${
            project.id === justSavedId ? "is-just-saved" : ""
          }" data-project-id="${project.id}">
            <div class="project-card-top">
              <div>
                <h2>${escapeHtml(project.title)}</h2>
                <p class="project-meta">${formatDate(project.createdAt)} · ${filesCount} załączników · ${categorized} skategoryzowanych</p>
              </div>
            </div>
            <p class="project-desc">${escapeHtml(
              project.description || "Bez opisu"
            )}</p>
            <ul class="project-files">
              ${(project.files || [])
                .map(
                  (file) => `
                <li>
                  <strong>${escapeHtml(file.name)}</strong>
                  <span>${findCategoryLabel(file.categoryId)}</span>
                </li>`
                )
                .join("")}
            </ul>
          </button>`;
          })
          .join("")}
      </ul>
    </section>`;
}

const ASSISTANT_FILL_SAMPLES = {
  intentName:
    "Budowa budynku mieszkalnego jednorodzinnego z garażem wbudowanym",
  investorName: "Anna i Michal Zielinscy",
  investorAddress: "ul. Lesna 14, 05-510 Konstancin-Jeziorna",
  siteAddress: "ul. Brzozowa 7, 05-510 Konstancin-Jeziorna",
  objectCategory: "Budynek mieszkalny jednorodzinny",
  plotIds: "dz. ew. 12/3, 12/4, obreb 0012 Lipki, jedn. ew. Konstancin-Jeziorna",
  designTeam:
    "Projektant glowny: mgr inz. arch. Marta Nowak, upr. MA/112/2020, architektura.\nKonstrukcja: mgr inz. Piotr Kaleta, upr. K/44/2019.\nSanitarna i elektryczna: projektanci branzowi wg zakresu opracowania.",
  pztSubject:
    "Budowa wolnostojacego budynku mieszkalnego jednorodzinnego wraz z niezbedna infrastruktura techniczna i ukladem dojsc oraz dojazdu.",
  pztExisting:
    "Dzialka niezabudowana, czesciowo porosnieta trawnikiem i pojedynczymi nasadzeniami. Teren z dostepem do drogi gminnej od strony poludniowej.",
  pztProposed:
    "Projektuje sie budynek mieszkalny jednorodzinny, utwardzony dojazd, dojscia piesze, miejsce gromadzenia odpadow oraz przylacza zgodnie z warunkami technicznymi.",
  pztAreas:
    "Powierzchnia zabudowy: 186,4 m2\nPowierzchnia biologicznie czynna: 62,1%\nPowierzchnia utwardzona: 214,8 m2",
  pztRoadAccess:
    "Obsluga komunikacyjna poprzez istniejacy zjazd z drogi gminnej ul. Brzozowej.",
  pztTraffic:
    "Projektowany wjazd na posesje, dojscie glowne do budynku oraz dwa miejsca postojowe na terenie dzialki.",
  pabSpatial:
    "Budynek o zwartej bryle, dwoch kondygnacjach nadziemnych i dachu dwuspadowym. Uklad funkcjonalny dostosowany do potrzeb 4-osobowej rodziny.",
  pabUse:
    "Obiekt przeznaczony na cele mieszkaniowe jednorodzinne z pomieszczeniami technicznymi i garazem wbudowanym.",
  pabParams:
    "Kubatura: 985 m3\nPowierzchnia uzytkowa: 242 m2\nWysokosc: 8,7 m\nLiczba kondygnacji: 2 nadziemne",
  pabGeo:
    "Przyjeto proste warunki gruntowe, pierwsza kategoria geotechniczna, poziom posadowienia zgodnie z opinia geotechniczna.",
  pabAccessibility:
    "Zapewniono bezprogowe wejscie glowne oraz mozliwosc korzystania z parteru przez osoby o ograniczonej mobilnosci.",
  pabFireCategory: "ZL IV",
  ptStructure:
    "Konstrukcja tradycyjna murowana, stropy zelbetowe monolityczne, dach drewniany krokwiowo-jętkowy.",
  ptCalculations:
    "Obliczenia statyczno-wytrzymalosciowe wykonano dla ukladu scian nosnych i stropow zelbetowych z uwzglednieniem obciazen stalych, uzytkowych i klimatycznych.",
  ptInstallations:
    "Instalacje: wod-kan, c.o. z pompa ciepla, wentylacja mechaniczna z rekuperacja, instalacja elektryczna i teletechniczna.",
  ptEnergy:
    "Charakterystyka energetyczna spelnia aktualne wymagania WT, z uwzglednieniem pompy ciepla, wentylacji mechanicznej oraz stolarki o podwyzszonej izolacyjnosci.",
};

const SECTION_FIELD_MAP = {
  metryka: [
    "intentName",
    "investorName",
    "investorAddress",
    "siteAddress",
    "objectCategory",
    "plotIds",
    "designTeam",
  ],
  pzt: [
    "pztSubject",
    "pztExisting",
    "pztProposed",
    "pztAreas",
    "pztRoadAccess",
    "pztTraffic",
    "pztDrawings",
  ],
  pab: [
    "pabSpatial",
    "pabUse",
    "pabParams",
    "pabGeo",
    "pabAccessibility",
    "pabFireCategory",
    "pabDrawings",
  ],
  pt: ["ptStructure", "ptCalculations", "ptInstallations", "ptEnergy", "ptDrawings"],
  formal: ["docOpdn", "docWz", "docOpinions", "docRoad", "docBioz"],
};

const ACCOUNT_LIBRARY_FILES = [
  { id: "acc-mapa-1", name: "Biblioteka_Mapa_do_celow.pdf", categoryId: "mapa" },
  { id: "acc-pzt-1", name: "Biblioteka_PZT_wzor.pdf", categoryId: "pzt" },
  { id: "acc-rzut-1", name: "Biblioteka_Rzut_parteru.dwg", categoryId: "rzut-parter" },
  { id: "acc-elew-1", name: "Biblioteka_Elewacje.pdf", categoryId: "elewacje" },
  { id: "acc-opis-1", name: "Biblioteka_OPDN.pdf", categoryId: "opis" },
  { id: "acc-bioz-1", name: "Biblioteka_BIOZ.pdf", categoryId: "opis" },
];

function aiRobotIconSvg(size = 18) {
  return `
    <svg class="ai-robot-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v2.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      <circle cx="12" cy="2.4" r="1.1" fill="currentColor"/>
      <rect x="5" y="6.5" width="14" height="11.5" rx="4" stroke="currentColor" stroke-width="1.7"/>
      <circle cx="9.2" cy="11.2" r="1.35" fill="currentColor"/>
      <circle cx="14.8" cy="11.2" r="1.35" fill="currentColor"/>
      <path d="M9.4 15.1h5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M3.8 11.2h1.4M18.8 11.2h1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    </svg>`;
}

function diskIconSvg() {
  return `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 4v10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="m8.2 10.2 3.8 3.8 3.8-3.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 18.2h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
}

function folderIconSvg() {
  return `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M3.8 8.2A1.8 1.8 0 0 1 5.6 6.4h4l1.5 1.6h7.1A1.8 1.8 0 0 1 20 9.8v7a1.8 1.8 0 0 1-1.8 1.8H5.6A1.8 1.8 0 0 1 3.8 16.8v-8.6Z" stroke="currentColor" stroke-width="1.7"/>
    </svg>`;
}

function libraryIconSvg() {
  return `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M4.5 7.2 12 4l7.5 3.2v2.2L12 6.2 4.5 9.4V7.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
      <path d="M4.5 11.2 12 8l7.5 3.2v2.2L12 10.2 4.5 13.4v-2.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
      <path d="M4.5 15.2 12 12l7.5 3.2v2.2L12 14.2 4.5 17.4v-2.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
    </svg>`;
}

function assistButtonHtml(role, target, label) {
  return `
    <button
      type="button"
      class="field-assist"
      data-role="${role}"
      data-${role === "assist-section" ? "section" : "field-name"}="${target}"
      aria-label="${escapeHtml(label)}"
      title="${escapeHtml(label)}"
    >
      ${aiRobotIconSvg()}
    </button>`;
}

function fieldInput(name, label, value = "", placeholder = "", type = "text") {
  return `
    <div class="field">
      <span class="field-label">${label}</span>
      <div class="field-control">
        <input name="${name}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
        ${assistButtonHtml("assist-field", name, `Pomoc asystenta: ${label}`)}
      </div>
    </div>`;
}

function fieldTextarea(name, label, value = "", placeholder = "", rows = 3) {
  return `
    <div class="field">
      <span class="field-label">${label}</span>
      <div class="field-control field-control-textarea">
        <textarea name="${name}" rows="${rows}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>
        ${assistButtonHtml("assist-field", name, `Pomoc asystenta: ${label}`)}
      </div>
    </div>`;
}

function selectedChipsHtml(fieldName, selectedIds, project) {
  const projectFilesMap = new Map((project.files || []).map((f) => [f.id, f]));
  const accountMap = new Map(ACCOUNT_LIBRARY_FILES.map((f) => [f.id, f]));
  const chips = (selectedIds || [])
    .map((id) => {
      const file = projectFilesMap.get(id) || accountMap.get(id);
      if (!file) return "";
      return `<span class="upload-chip">${escapeHtml(file.name)}</span>`;
    })
    .filter(Boolean)
    .join("");

  return `
    <div class="upload-selected" data-selected-for="${fieldName}">
      ${
        chips ||
        `<span class="upload-selected-empty">Brak wybranych plików z projektu / konta</span>`
      }
      ${(selectedIds || [])
        .map(
          (id) =>
            `<input type="hidden" name="${fieldName}Selected" value="${escapeHtml(id)}" />`
        )
        .join("")}
    </div>`;
}

function fieldUpload(name, label, hint, project, selected = []) {
  return `
    <div class="field">
      <span class="field-label">${label}</span>
      <div class="upload-panel">
        <p class="upload-hint">${hint}</p>
        <div class="upload-actions">
          <label class="upload-action" title="Dodaj z dysku">
            <input type="file" name="${name}" multiple hidden />
            ${diskIconSvg()}
            <span>Z dysku</span>
          </label>
          <button
            type="button"
            class="upload-action"
            data-role="pick-project-files"
            data-field-name="${name}"
            title="Dodaj z plików lokalnych projektu"
          >
            ${folderIconSvg()}
            <span>Z projektu</span>
          </button>
          <button
            type="button"
            class="upload-action"
            data-role="pick-account-files"
            data-field-name="${name}"
            title="Dodaj ze wszystkich załączników konta"
          >
            ${libraryIconSvg()}
            <span>Z konta</span>
          </button>
          ${assistButtonHtml("assist-field", name, `Pomoc asystenta: ${label}`)}
        </div>
        ${selectedChipsHtml(name, selected, project)}
      </div>
    </div>`;
}

function sectionSummaryHtml(num, title, subtitle, sectionKey) {
  return `
    <summary>
      <span class="section-num">${num}</span>
      <span class="section-summary-copy">
        <strong>${title}</strong>
        <em>${subtitle}</em>
      </span>
      ${assistButtonHtml("assist-section", sectionKey, `Wypełnij całą sekcję: ${title}`)}
    </summary>`;
}

function buildingProjectFormHtml(project) {
  const d = project.buildingForm || {};
  const g = (key) => d[key] || "";
  const ga = (key) => {
    const value = d[key];
    return Array.isArray(value) ? value : value ? [value] : [];
  };

  return `
    <div class="building-form-wrap doc-task-view" data-project-id="${project.id}">
      <div class="doc-task-toolbar">
        <button type="button" class="ghost-btn" data-role="close-building-form" data-project-id="${project.id}">
          Wróć do projektu
        </button>
        <p class="doc-task-toolbar-meta muted">Formularz formalny · projekt budowlany</p>
      </div>

      ${documentTaskSplitHtml(project, "building", "building-project", {
        title: "Projekt budowlany",
        eyebrow: "Dokument / zadanie",
        showTitle: false,
      })}

      ${taskSubtreeManageHtml(project, resolveDocumentTask(project, "building", "building-project").id, {
        returnTo: { panel: "building-form" },
      })}

      <section class="doc-task-form-region" aria-label="Formularz projektu budowlanego">
        <header class="doc-task-form-region-head">
          <div>
            <p class="eyebrow">Formularz</p>
            <h3>Sekcje projektu budowlanego</h3>
            <p class="muted">Domyślnie zwinięte — rozwiń sekcję, aby wypełnić pola.</p>
          </div>
        </header>

      <form id="buildingProjectForm" class="building-form doc-task-form" autocomplete="off">
        <details class="form-section" data-section="metryka">
          ${sectionSummaryHtml(
            "01",
            "Metryka inwestycji i strona tytułowa",
            "§ 7 ust. 2 — baza do data bindingu",
            "metryka"
          )}
          <div class="section-body">
            ${fieldInput("intentName", "Nazwa zamierzenia budowlanego", g("intentName") || project.title, "np. Budynek mieszkalny jednorodzinny")}
            <div class="fields-row">
              ${fieldInput("investorName", "Inwestor (imię i nazwisko / nazwa firmy)", g("investorName"), "np. Jan Kowalski")}
              ${fieldInput("investorAddress", "Adres inwestora", g("investorAddress"), "ulica, kod, miejscowość")}
            </div>
            <div class="fields-row">
              ${fieldInput("siteAddress", "Lokalizacja inwestycji (adres)", g("siteAddress"), "adres inwestycji")}
              ${fieldInput("objectCategory", "Kategoria obiektu", g("objectCategory"), "np. budynek mieszkalny jednorodzinny")}
            </div>
            ${fieldTextarea("plotIds", "Identyfikatory działek ewidencyjnych", g("plotIds"), "nr działek, obręb, jednostka ewidencyjna — kluczowe do MPZP / WZ", 3)}
            ${fieldTextarea(
              "designTeam",
              "Zespół projektowy",
              g("designTeam"),
              "Główny projektant, branżyści, sprawdzający — uprawnienia, specjalności, zakres opracowania",
              4
            )}
          </div>
        </details>

        <details class="form-section" data-section="pzt">
          ${sectionSummaryHtml(
            "02",
            "Projekt zagospodarowania działki lub terenu (PZT)",
            "Tom do urzędu wraz z PAB",
            "pzt"
          )}
          <div class="section-body">
            <p class="section-note">Część opisowa PZT</p>
            ${fieldTextarea("pztSubject", "Przedmiot inwestycji", g("pztSubject"))}
            ${fieldTextarea("pztExisting", "Istniejący stan zagospodarowania działki", g("pztExisting"))}
            ${fieldTextarea("pztProposed", "Projektowane zagospodarowanie", g("pztProposed"))}
            ${fieldTextarea(
              "pztAreas",
              "Zestawienie powierzchni",
              g("pztAreas"),
              "pow. zabudowy, pow. biologicznie czynna, itd."
            )}
            <div class="fields-row">
              ${fieldTextarea("pztRoadAccess", "Dostęp do drogi publicznej", g("pztRoadAccess"), "", 2)}
              ${fieldTextarea("pztTraffic", "Układ komunikacyjny", g("pztTraffic"), "", 2)}
            </div>
            <p class="section-note">Część rysunkowa PZT</p>
            ${fieldUpload(
              "pztDrawings",
              "Mapy do celów projektowych",
              "Mapy z układem budynków, przyłączami i strefami ochronnymi (skala min. 1:500)",
              project,
              ga("pztDrawingsSelected")
            )}
          </div>
        </details>

        <details class="form-section" data-section="pab">
          ${sectionSummaryHtml(
            "03",
            "Projekt architektoniczno-budowlany (PAB)",
            "Tom zatwierdzany w decyzji o pozwoleniu",
            "pab"
          )}
          <div class="section-body">
            <p class="section-note">Część opisowa PAB</p>
            ${fieldTextarea("pabSpatial", "Układ przestrzenny oraz forma architektoniczna", g("pabSpatial"))}
            ${fieldTextarea("pabUse", "Zamierzony sposób użytkowania obiektu", g("pabUse"))}
            ${fieldTextarea(
              "pabParams",
              "Charakterystyczne parametry",
              g("pabParams"),
              "kubatura, powierzchnia użytkowa, wysokość, liczba kondygnacji"
            )}
            ${fieldTextarea("pabGeo", "Opinia geotechniczna", g("pabGeo"))}
            ${fieldTextarea(
              "pabAccessibility",
              "Dostępność dla osób niepełnosprawnych",
              g("pabAccessibility")
            )}
            ${fieldInput(
              "pabFireCategory",
              "Kategoria zagrożenia ludzi (pożarowa)",
              g("pabFireCategory"),
              "np. ZL IV"
            )}
            <p class="section-note">Część rysunkowa PAB</p>
            ${fieldUpload(
              "pabDrawings",
              "Rzuty, przekroje, elewacje",
              "PDF/CAD — rzuty kondygnacji, dach, przekroje, elewacje z klasami odporności ogniowej (min. 1:100 / 1:200)",
              project,
              ga("pabDrawingsSelected")
            )}
          </div>
        </details>

        <details class="form-section" data-section="pt">
          ${sectionSummaryHtml(
            "04",
            "Projekt techniczny (PT)",
            "Nie składany do urzędu przy wniosku — wymagany przed startem robót",
            "pt"
          )}
          <div class="section-body">
            <div class="section-callout">
              Ten tom nie jest składany do urzędu przy wniosku o pozwolenie na budowę,
              ale musi być gotowy przed rozpoczęciem robót i przekazany kierownikowi budowy.
            </div>
            <p class="section-note">Część opisowa i obliczeniowa PT</p>
            ${fieldTextarea("ptStructure", "Rozwiązania konstrukcyjne", g("ptStructure"))}
            ${fieldTextarea(
              "ptCalculations",
              "Wyniki obliczeń statyczno-wytrzymałościowych",
              g("ptCalculations")
            )}
            ${fieldTextarea(
              "ptInstallations",
              "Rozwiązania instalacyjne",
              g("ptInstallations"),
              "sanitarne, elektryczne, wentylacyjne"
            )}
            ${fieldTextarea("ptEnergy", "Charakterystyka energetyczna budynku", g("ptEnergy"))}
            <p class="section-note">Część rysunkowa PT</p>
            ${fieldUpload(
              "ptDrawings",
              "Rysunki techniczne",
              "Szalunkowe, zbrojeniowe, detale konstrukcyjne, schematy instalacji",
              project,
              ga("ptDrawingsSelected")
            )}
          </div>
        </details>

        <details class="form-section" data-section="formal">
          ${sectionSummaryHtml(
            "05",
            "Załączniki i dokumenty formalne",
            "§ 5 ust. 1 pkt 4 — checklista Upload and Verify",
            "formal"
          )}
          <div class="section-body checklist-grid">
            ${[
              ["docOpdn", "Oświadczenie o prawie do dysponowania nieruchomością (OPDN)"],
              ["docWz", "Decyzja WZ (jeśli brak MPZP)"],
              ["docOpinions", "Opinie, uzgodnienia, pozwolenia (np. konserwator, ZUD)"],
              ["docRoad", "Oświadczenie zarządcy drogi o możliwości połączenia działki"],
              ["docBioz", "Informacja BIOZ (Bezpieczeństwo i Ochrona Zdrowia)"],
            ]
              .map(
                ([name, label]) => `
              <div class="check-upload">
                <div class="check-upload-top">
                  <span class="check-upload-label">${label}</span>
                  ${assistButtonHtml("assist-field", name, `Pomoc asystenta: ${label}`)}
                </div>
                <div class="check-upload-row">
                  <label class="check-verify">
                    <input type="checkbox" name="${name}Done" ${g(name + "Done") === "on" || g(name + "Done") === true ? "checked" : ""} />
                    <span>Zweryfikowano</span>
                  </label>
                  <div class="upload-actions upload-actions-compact">
                    <label class="upload-action" title="Dodaj z dysku">
                      <input type="file" name="${name}File" hidden />
                      ${diskIconSvg()}
                      <span>Z dysku</span>
                    </label>
                    <button type="button" class="upload-action" data-role="pick-project-files" data-field-name="${name}" title="Z projektu">
                      ${folderIconSvg()}
                      <span>Z projektu</span>
                    </button>
                    <button type="button" class="upload-action" data-role="pick-account-files" data-field-name="${name}" title="Z konta">
                      ${libraryIconSvg()}
                      <span>Z konta</span>
                    </button>
                  </div>
                </div>
                ${selectedChipsHtml(name, ga(name + "Selected"), project)}
              </div>`
              )
              .join("")}
          </div>
        </details>

        <div class="form-actions building-form-actions">
          <button type="button" class="ghost-btn" data-role="close-building-form" data-project-id="${project.id}">Anuluj</button>
          <button
            type="button"
            class="icon-action-btn generate-form-icon"
            data-role="generate-building-project"
            data-project-id="${project.id}"
            title="Generuj projekt budowlany (PDF)"
            aria-label="Generuj projekt budowlany PDF"
          >
            ${pdfIconSvg(17)}
            <span>Generuj PDF</span>
          </button>
          ${formSaveSubmitButtonHtml()}
        </div>
      </form>
      </section>
    </div>`;
}

function collectTaskFamilyRows(tasks, focusTaskId) {
  const focus = tasks.find((item) => String(item.id) === String(focusTaskId));
  if (!focus) return { focus: null, rows: [], addParentId: null };

  const byParent = new Map();
  tasks.forEach((task) => {
    const key = task.parentId ? String(task.parentId) : "";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(task);
  });
  byParent.forEach((list) => {
    list.sort(
      (a, b) =>
        (a.sortOrder || 0) - (b.sortOrder || 0) ||
        String(a.name || "").localeCompare(String(b.name || ""), "pl")
    );
  });

  const rows = [];

  // Najwyższa gałąź: rodzeństwo poziomu 1 + dzieci tylko aktywnego
  if (!focus.parentId) {
    const roots = byParent.get("") || [];
    roots.forEach((task) => {
      rows.push({
        task,
        depth: 0,
        role: String(task.id) === String(focus.id) ? "current" : "sibling",
      });
      if (String(task.id) === String(focus.id)) {
        (byParent.get(String(focus.id)) || []).forEach((child) => {
          rows.push({ task: child, depth: 1, role: "child" });
        });
      }
    });
    return { focus, rows, addParentId: focus.id };
  }

  // Niższe poziomy: rodzic + rodzeństwo + dzieci tylko aktywnego
  const parent = tasks.find((item) => String(item.id) === String(focus.parentId));
  if (parent) {
    rows.push({ task: parent, depth: 0, role: "parent" });
  }
  const siblings = byParent.get(String(focus.parentId)) || [];
  siblings.forEach((task) => {
    const isCurrent = String(task.id) === String(focus.id);
    rows.push({
      task,
      depth: 1,
      role: isCurrent ? "current" : "sibling",
    });
    if (isCurrent) {
      (byParent.get(String(focus.id)) || []).forEach((child) => {
        rows.push({ task: child, depth: 2, role: "child" });
      });
    }
  });
  return { focus, rows, addParentId: focus.id };
}

function taskSubtreeManageHtml(project, rootTaskId, { returnTo = null } = {}) {
  const tasks = collectProjectTasks(project);
  const { focus, rows, addParentId } = collectTaskFamilyRows(tasks, rootTaskId);
  if (!focus) return "";

  const returnAttrs = returnTo
    ? ` data-return-panel="${escapeHtml(returnTo.panel || "")}" data-return-doc-id="${escapeHtml(
        String(returnTo.focusDocId || "")
      )}" data-return-task-id="${escapeHtml(String(returnTo.focusTaskId || focus.id))}"`
    : "";

  return `
    <section class="doc-task-form-region task-subtree-region" aria-label="Zadania i podzadania">
      <header class="doc-task-form-region-head">
        <div>
          <p class="eyebrow">Struktura</p>
          <h3>Zadania i podzadania</h3>
          <p class="muted">Rodzic, rodzeństwo i dzieci aktywnego — bez dzieci pozostałych.</p>
        </div>
        <button
          type="button"
          class="ghost-btn"
          data-role="open-add-task"
          data-project-id="${project.id}"
          data-parent-task-id="${escapeHtml(String(addParentId || ""))}"
          ${returnAttrs}
        >
          ${addParentId ? "Dodaj podzadanie" : "Dodaj zadanie poziomu 1"}
        </button>
      </header>
      ${
        rows.length
          ? `<ul class="task-subtree-list">
              ${rows
                .map(({ task, depth, role }) => {
                  const ownerName = ownerLabel(project, task.ownerId);
                  const roleHint =
                    role === "parent"
                      ? "Rodzic"
                      : role === "current"
                        ? "Bieżące"
                        : role === "sibling"
                          ? "Rodzeństwo"
                          : "Podzadanie";
                  return `
                <li class="task-subtree-item ${
                  role === "current" ? "is-current" : ""
                } ${role === "parent" ? "is-parent" : ""}" style="--sub-depth:${depth}" data-sub-depth="${depth}" data-task-depth="${
                    task.depth || 0
                  }">
                  <button
                    type="button"
                    class="task-subtree-main"
                    data-role="open-subtree-task"
                    data-project-id="${project.id}"
                    data-task-id="${escapeHtml(String(task.id))}"
                    data-task-kind="${escapeHtml(task.kind || "")}"
                    ${role === "current" ? "disabled aria-current=\"page\"" : ""}
                  >
                    <span class="task-subtree-copy">
                      <strong>${escapeHtml(task.name)}</strong>
                      <em>${escapeHtml(roleHint)} · ${escapeHtml(
                    task.typeLabel || "Zadanie"
                  )} · ${escapeHtml(ownerName)}</em>
                    </span>
                    <span class="task-subtree-status">${escapeHtml(task.status || "—")}</span>
                  </button>
                  <div class="task-subtree-actions">
                    <select
                      class="owner-select status-select task-subtree-status-select"
                      data-role="task-status"
                      data-task-id="${escapeHtml(String(task.id))}"
                      data-project-id="${project.id}"
                      aria-label="Status: ${escapeHtml(task.name)}"
                    >
                      ${taskStatusOptionsHtml(task.statusKey)}
                    </select>
                    <button
                      type="button"
                      class="tool-btn tool-btn-muted task-subtree-add"
                      data-role="open-add-task"
                      data-project-id="${project.id}"
                      data-parent-task-id="${escapeHtml(String(task.id))}"
                      title="Dodaj podzadanie"
                      aria-label="Dodaj podzadanie do: ${escapeHtml(task.name)}"
                      ${returnAttrs}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" stroke-linecap="round" />
                      </svg>
                    </button>
                  </div>
                </li>`;
                })
                .join("")}
            </ul>`
          : `<p class="muted task-subtree-empty">Brak zadań w tej gałęzi.</p>`
      }
    </section>`;
}

function collectContextFlowTasks(tasks, focusTaskId) {
  const byId = new Map(tasks.map((task) => [String(task.id), task]));
  const focus = byId.get(String(focusTaskId));
  if (!focus) return [];

  const selected = new Map();
  let cursor = focus;
  while (cursor) {
    selected.set(String(cursor.id), cursor);
    cursor = cursor.parentId ? byId.get(String(cursor.parentId)) : null;
  }

  const siblingParentKey = focus.parentId ? String(focus.parentId) : "";
  tasks.forEach((task) => {
    const key = task.parentId ? String(task.parentId) : "";
    if (key === siblingParentKey) selected.set(String(task.id), task);
  });

  return [...selected.values()];
}

function contextFlowColumnMap(nodes) {
  const ids = new Set(nodes.map((task) => String(task.id)));
  const memo = new Map();

  const columnOf = (taskId, stack = new Set()) => {
    const key = String(taskId);
    if (memo.has(key)) return memo.get(key);
    if (stack.has(key)) return 0;
    stack.add(key);
    const task = nodes.find((item) => String(item.id) === key);
    const preds = (task?.dependsOn || []).map(String).filter((id) => ids.has(id));
    const col = preds.length
      ? Math.max(...preds.map((id) => columnOf(id, stack))) + 1
      : 0;
    memo.set(key, col);
    stack.delete(key);
    return col;
  };

  nodes.forEach((task) => columnOf(task.id));
  return memo;
}

function contextFlowBarSpan(taskId, nodes, columns) {
  const cols = [];
  const walk = (id) => {
    const key = String(id);
    if (columns.has(key)) cols.push(columns.get(key));
    nodes
      .filter((item) => String(item.parentId || "") === key)
      .forEach((child) => walk(child.id));
  };
  walk(taskId);
  if (!cols.length) {
    const fallback = columns.get(String(taskId)) || 0;
    return { start: fallback + 1, span: 1, isSummary: false };
  }
  const min = Math.min(...cols);
  const max = Math.max(...cols);
  const hasVisibleChildren = nodes.some(
    (item) => String(item.parentId || "") === String(taskId)
  );
  return {
    start: min + 1,
    span: Math.max(1, max - min + 1),
    isSummary: hasVisibleChildren,
  };
}

function contextFlowWidgetHtml(project, focusTaskId) {
  const tasks = collectProjectTasks(project);
  const nodes = collectContextFlowTasks(tasks, focusTaskId);
  if (!nodes.length) {
    return `<p class="muted">Brak zadań do pokazania w przepływie.</p>`;
  }

  const columns = contextFlowColumnMap(nodes);
  const spans = new Map();
  nodes.forEach((task) => {
    spans.set(String(task.id), contextFlowBarSpan(task.id, nodes, columns));
  });
  const maxCol = Math.max(
    0,
    ...[...spans.values()].map((item) => item.start + item.span - 2)
  );
  const colCount = Math.max(1, maxCol + 1);
  const hasDates = nodes.some((task) => task.startDate || task.dueDate);

  const ordered = [...nodes].sort((a, b) => {
    const sa = spans.get(String(a.id)) || { start: 1 };
    const sb = spans.get(String(b.id)) || { start: 1 };
    return (
      (a.depth || 0) - (b.depth || 0) ||
      sa.start - sb.start ||
      String(a.name || "").localeCompare(String(b.name || ""), "pl")
    );
  });

  const edges = [];
  nodes.forEach((task) => {
    (task.dependsOn || []).forEach((predId) => {
      if (!columns.has(String(predId))) return;
      if (!columns.has(String(task.id))) return;
      // Nie łącz linią rodzica-summary z dzieckiem — pasek i tak obejmuje potomków
      const predSpan = spans.get(String(predId));
      if (predSpan?.isSummary && String(task.parentId || "") === String(predId)) return;
      edges.push({ from: String(predId), to: String(task.id) });
    });
  });

  return `
    <div
      class="ctx-flow ${hasDates ? "has-dates" : "no-dates"}"
      data-role="context-flow"
      data-project-id="${project.id}"
      data-focus-task-id="${escapeHtml(String(focusTaskId))}"
    >
      <div class="ctx-gantt" data-role="context-flow-board" style="--ctx-cols:${colCount}">
        <svg class="ctx-flow-links" data-role="context-flow-links" aria-hidden="true"></svg>
        <div class="ctx-gantt-body">
          ${ordered
            .map((task) => {
              const depth = task.depth || 0;
              const spanInfo = spans.get(String(task.id)) || { start: 1, span: 1, isSummary: false };
              const isCurrent = String(task.id) === String(focusTaskId);
              const dateBits = [];
              if (hasDates) {
                if (task.startDate) dateBits.push(formatDateOnly(task.startDate));
                if (task.dueDate) dateBits.push(formatDateOnly(task.dueDate));
              }
              return `
              <div class="ctx-gantt-row${isCurrent ? " is-current" : ""}${
                spanInfo.isSummary ? " is-summary" : ""
              }" data-task-depth="${depth}">
                <button
                  type="button"
                  class="ctx-gantt-label"
                  data-role="open-context-flow-task"
                  data-project-id="${project.id}"
                  data-task-id="${escapeHtml(String(task.id))}"
                  data-task-kind="${escapeHtml(task.kind || "")}"
                  title="${escapeHtml(task.name)}"
                >
                  <strong>${escapeHtml(task.name)}</strong>
                  <em>${escapeHtml(task.typeLabel || "Zadanie")}</em>
                </button>
                <div class="ctx-gantt-track">
                  <button
                    type="button"
                    class="ctx-gantt-bar${spanInfo.isSummary ? " is-summary" : ""}"
                    data-role="open-context-flow-task"
                    data-project-id="${project.id}"
                    data-task-id="${escapeHtml(String(task.id))}"
                    data-task-kind="${escapeHtml(task.kind || "")}"
                    data-task-depth="${depth}"
                    data-flow-id="${escapeHtml(String(task.id))}"
                    style="grid-column: ${spanInfo.start} / span ${spanInfo.span}"
                    title="${escapeHtml(task.name)}"
                  >
                    <span>${
                      dateBits.length
                        ? escapeHtml(dateBits.join(" – "))
                        : escapeHtml(task.name)
                    }</span>
                  </button>
                </div>
              </div>`;
            })
            .join("")}
        </div>
      </div>
      <script type="application/json" data-role="context-flow-edges">${escapeHtml(
        JSON.stringify(edges)
      )}</script>
    </div>`;
}

function paintContextFlowLinks(root) {
  const board = root?.querySelector('[data-role="context-flow-board"]');
  const svg = root?.querySelector('[data-role="context-flow-links"]');
  const edgesEl = root?.querySelector('[data-role="context-flow-edges"]');
  if (!board || !svg || !edgesEl) return;

  let edges = [];
  try {
    edges = JSON.parse(edgesEl.textContent || "[]");
  } catch {
    edges = [];
  }

  const boardRect = board.getBoundingClientRect();
  const w = board.scrollWidth;
  const h = board.scrollHeight;
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = "";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", `ctx-arrow-${root.dataset.focusTaskId || "x"}`);
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "6");
  marker.setAttribute("markerHeight", "6");
  marker.setAttribute("orient", "auto-start-reverse");
  const tip = document.createElementNS("http://www.w3.org/2000/svg", "path");
  tip.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  tip.setAttribute("class", "ctx-flow-arrow");
  marker.appendChild(tip);
  defs.appendChild(marker);
  svg.appendChild(defs);
  const markerUrl = `url(#ctx-arrow-${root.dataset.focusTaskId || "x"})`;

  edges.forEach((edge) => {
    const fromEl = board.querySelector(`[data-flow-id="${CSS.escape(edge.from)}"]`);
    const toEl = board.querySelector(`[data-flow-id="${CSS.escape(edge.to)}"]`);
    if (!fromEl || !toEl) return;
    const from = fromEl.getBoundingClientRect();
    const to = toEl.getBoundingClientRect();
    const x1 = from.right - boardRect.left + board.scrollLeft;
    const y1 = from.top + from.height / 2 - boardRect.top + board.scrollTop;
    const x2 = to.left - boardRect.left + board.scrollLeft;
    const y2 = to.top + to.height / 2 - boardRect.top + board.scrollTop;
    const midX = x1 + Math.max(18, (x2 - x1) * 0.5);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`
    );
    path.setAttribute("class", "ctx-flow-link");
    path.setAttribute("marker-end", markerUrl);
    svg.appendChild(path);
  });
}

function bindContextFlowWidget(root = content) {
  root.querySelectorAll('[data-role="context-flow"]').forEach((widget) => {
    const draw = () => paintContextFlowLinks(widget);
    draw();
    requestAnimationFrame(draw);
    if (!widget._ctxFlowBound) {
      widget._ctxFlowBound = true;
      window.addEventListener("resize", draw);
    }
    widget.querySelectorAll('[data-role="open-context-flow-task"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openProjectTaskById(
          btn.dataset.projectId,
          btn.dataset.taskId,
          btn.dataset.taskKind
        );
      });
    });
  });
}

function processTaskDetailHtml(project, taskId) {
  const tasks = collectProjectTasks(project);
  const task = tasks.find((item) => String(item.id) === String(taskId));
  if (!task) {
    return `
      <div class="panel">
        <p>Nie znaleziono zadania.</p>
        <button type="button" class="ghost-btn" data-role="close-task-detail" data-project-id="${project.id}">
          Wróć do projektu
        </button>
      </div>`;
  }

  const branchDocs = [];
  const seen = new Set();
  const pushDoc = (linked) => {
    if (!linked?.kind || !linked?.id) return;
    const key = `${linked.kind}:${linked.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    branchDocs.push(linked);
  };
  pushDoc(task.linkedDoc);
  tasks
    .filter((item) => item.parentId && String(item.parentId) === String(task.parentId || task.id))
    .forEach((item) => pushDoc(item.linkedDoc));
  if (task.hasChildren) {
    tasks
      .filter((item) => String(item.parentId) === String(task.id))
      .forEach((item) => pushDoc(item.linkedDoc));
  }

  const kindLabel =
    typeof typeLabelForProcessKind === "function"
      ? typeLabelForProcessKind(task.kind)
      : task.typeLabel || "Zadanie";

  return `
    <div class="doc-task-view process-task-view" data-project-id="${project.id}" data-task-id="${escapeHtml(
      String(task.id)
    )}">
      <div class="doc-task-toolbar">
        <button type="button" class="ghost-btn" data-role="close-task-detail" data-project-id="${project.id}">
          Wróć do projektu
        </button>
        <p class="doc-task-toolbar-meta muted">${escapeHtml(kindLabel)} · bez formularza dokumentu</p>
      </div>

      ${documentTaskSplitHtml(project, "task", task.id, {
        title: task.name,
        eyebrow: kindLabel,
        showTitle: false,
      })}

      <div class="task-side-panels">
      ${taskSubtreeManageHtml(project, task.id, {
        returnTo: { panel: "task-detail", focusTaskId: task.id },
      })}

      <section class="doc-task-form-region task-context-region" aria-label="Dokumenty i zależności">
        <header class="doc-task-form-region-head">
          <div>
            <p class="eyebrow">Kontekst</p>
            <h3>Przepływ zależności</h3>
            <p class="muted">Układ jak Gantt: paski od lewej do prawej, linie pokazują kolejność.</p>
          </div>
        </header>
        ${contextFlowWidgetHtml(project, task.id)}
        ${
          branchDocs.length
            ? `<div class="task-context-docs">
                <p class="doc-task-meta-label">Dokumenty w gałęzi</p>
                <ul class="task-branch-docs">
                ${branchDocs
                  .map(
                    (doc) => `
                  <li>
                    <button
                      type="button"
                      class="ghost-btn"
                      data-role="open-linked-doc"
                      data-project-id="${project.id}"
                      data-link-kind="${escapeHtml(doc.kind)}"
                      data-link-id="${escapeHtml(String(doc.id))}"
                    >
                      ${escapeHtml(resolveLinkedDocLabel(project, doc) || doc.name || "Dokument")}
                    </button>
                  </li>`
                  )
                  .join("")}
                </ul>
              </div>`
            : ""
        }
      </section>
      </div>
    </div>`;
}

function projectDetailHtml(project, panel = "overview", options = {}) {
  const filesCount = project.files?.length || 0;
  const isForm = panel === "building-form";
  const isSurvey = panel === "formal-survey";
  const isDocForm = panel === "doc-form";
  const isKpa = panel === "kpa";
  const isTaskDetail = panel === "task-detail";
  const entityTitle = resolveProjectDetailEntityTitle(project, panel, options);
  const showEntityAsHero = Boolean(entityTitle) && (isTaskDetail || isDocForm || isForm);

  let mainHtml = projectOverviewHtml(project, options);
  if (isForm) mainHtml = buildingProjectFormHtml(project);
  if (isSurvey) {
    mainHtml = formalSurveyPanelHtml(project, surveyDraft.answers, surveyDraft.step);
  }
  if (isDocForm) {
    const doc =
      (project.formalSurvey?.documents || []).find(
        (item) => String(item.id) === String(options.focusDocId)
      ) ||
      (project.flowDocuments || []).find(
        (item) => String(item.id) === String(options.focusDocId)
      ) ||
      (String(options.focusDocId) === "building-project"
        ? {
            id: "building-project",
            title: "Projekt budowlany",
            source: "system",
          }
        : null);
    mainHtml = doc
      ? docFormPanelHtml(project, doc)
      : `<section class="panel"><p>Nie znaleziono dokumentu.</p></section>`;
  }
  if (isKpa) mainHtml = projectKpaPanelHtml(project);
  if (isTaskDetail) mainHtml = processTaskDetailHtml(project, options.focusTaskId);

  const fullWidth = isSurvey || isDocForm || isKpa || isForm || isTaskDetail;
  const heroTitle = showEntityAsHero ? entityTitle : project.title;
  const heroEyebrow = isSurvey
    ? "Ankieta w projekcie"
    : isForm
      ? "Formularz w projekcie"
      : isDocForm
        ? "Dokument"
        : isTaskDetail
          ? "Zadanie"
          : isKpa
            ? "Analityka projektu"
            : "Projekt";
  const heroLede = showEntityAsHero
    ? `Projekt: ${escapeHtml(project.title)}${
        project.code ? ` · <span class="project-code">${escapeHtml(project.code)}</span>` : ""
      }`
    : `${formatDate(project.createdAt)}${
        project.code ? ` · <span class="project-code">${escapeHtml(project.code)}</span>` : ""
      } · ${filesCount} załączników${
        isForm
          ? " · Projekt budowlany"
          : isSurvey
            ? " · Ankieta formalna"
            : isDocForm
              ? " · Dokument"
              : isTaskDetail
                ? " · Zadanie"
                : isKpa
                  ? " · KPA"
                  : ""
      }`;

  return `
    <section class="project-detail" data-project-id="${project.id}" data-panel="${escapeHtml(
      panel
    )}">
      <header class="form-intro form-intro-row">
        <div class="form-intro-copy">
          <p class="eyebrow">${heroEyebrow}</p>
          <h1>${escapeHtml(heroTitle)}</h1>
          <p class="lede form-lede">${heroLede}</p>
        </div>
        <div class="detail-actions">
          ${
            isForm || isSurvey || isDocForm || isKpa || isTaskDetail
              ? ""
              : `<button
                   type="button"
                   class="ghost-btn detail-auto-schedule-btn${
                     isProjectAutoScheduleEnabled(project) ? " is-on" : ""
                   }"
                   data-role="toggle-auto-schedule"
                   data-project-id="${escapeHtml(project.id)}"
                   aria-pressed="${isProjectAutoScheduleEnabled(project) ? "true" : "false"}"
                   title="Automatyczne wyliczanie dat z zależności i podzadań"
                 >
                   <span class="detail-auto-schedule-label">Daty auto</span>
                   <span class="detail-auto-schedule-state">${
                     isProjectAutoScheduleEnabled(project) ? "ON" : "OFF"
                   }</span>
                 </button>
                 <button class="primary-btn" type="button" data-role="edit-project" data-project-id="${project.id}">Edytuj</button>
                 <button class="ghost-btn detail-delete-btn" type="button" data-role="delete-project" data-project-id="${project.id}">Usuń projekt</button>`
          }
        </div>
      </header>

      <div class="detail-layout ${fullWidth ? "detail-layout-survey" : ""}">
        <div class="detail-main">
          ${mainHtml}
        </div>
        ${fullWidth ? "" : aiChatHtml()}
      </div>
    </section>`;
}

function collectBuildingFormData(form) {
  const data = {};
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    if (key.endsWith("Selected")) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(value);
      continue;
    }
    if (value instanceof File) {
      if (!value.name) continue;
      data[key] = value.name;
      continue;
    }
    data[key] = value;
  }
  form.querySelectorAll('input[type="checkbox"]').forEach((box) => {
    data[box.name] = box.checked;
  });
  return data;
}

function ensureAssistOverlay() {
  let overlay = document.getElementById("assistOverlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "assistOverlay";
  overlay.className = "assist-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="assist-overlay-card">
      <div class="assist-spinner" aria-hidden="true"></div>
      <div class="assist-overlay-copy">
        <p class="assist-overlay-title">Asystent pomaga wypełnić dane.</p>
        <p class="assist-overlay-warn">Pamiętaj aby zawsze samodzielnie zweryfikować pracę wykonaną przez AI!</p>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function ensureAttachmentPickerModal() {
  let modal = document.getElementById("attachmentPickerModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "attachmentPickerModal";
  modal.className = "category-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-attachment-picker"></div>
    <div class="category-modal-dialog" role="dialog" aria-modal="true">
      <header class="category-modal-head">
        <div>
          <p class="eyebrow">Załączniki</p>
          <h2 id="attachmentPickerTitle">Wybierz pliki</h2>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-attachment-picker" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body" id="attachmentPickerBody"></div>
      <footer class="category-modal-foot">
        <button type="button" class="ghost-btn" data-role="close-attachment-picker">Anuluj</button>
        <button type="button" class="primary-btn" id="attachmentPickerSave">Dodaj wybrane</button>
      </footer>
    </div>`;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target.closest('[data-role="close-attachment-picker"]')) {
      closeAttachmentPicker();
    }
  });

  return modal;
}

let attachmentPickerField = "";
let attachmentPickerProjectId = "";

function closeAttachmentPicker() {
  const modal = document.getElementById("attachmentPickerModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("modal-open");
  attachmentPickerField = "";
}

function openAttachmentPicker(projectId, fieldName, source) {
  const project = getProjectById(projectId);
  if (!project) return;

  attachmentPickerField = fieldName;
  attachmentPickerProjectId = projectId;

  const files =
    source === "account"
      ? ACCOUNT_LIBRARY_FILES
      : project.files || [];

  const selected = new Set(
    Array.from(
      document.querySelectorAll(`input[name="${fieldName}Selected"]`)
    ).map((el) => el.value)
  );

  const modal = ensureAttachmentPickerModal();
  const title = modal.querySelector("#attachmentPickerTitle");
  const body = modal.querySelector("#attachmentPickerBody");
  if (title) {
    title.textContent =
      source === "account"
        ? "Załączniki z konta"
        : "Załączniki lokalne projektu";
  }

  if (body) {
    body.innerHTML =
      files.length === 0
        ? `<p class="picker-empty">Brak plików do wyboru.</p>`
        : `<div class="project-picker-list">
            ${files
              .map(
                (file) => `
              <label class="project-picker-item">
                <input type="checkbox" value="${file.id}" ${
                  selected.has(file.id) ? "checked" : ""
                } />
                <span class="project-picker-copy">
                  <strong>${escapeHtml(file.name)}</strong>
                  <em>${findCategoryLabel(file.categoryId)}</em>
                </span>
              </label>`
              )
              .join("")}
          </div>`;
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");

  const saveBtn = modal.querySelector("#attachmentPickerSave");
  saveBtn.onclick = () => {
    const ids = Array.from(
      modal.querySelectorAll('.project-picker-item input[type="checkbox"]:checked')
    ).map((el) => el.value);
    applySelectedAttachments(fieldName, ids, project);
    closeAttachmentPicker();
  };
}

function applySelectedAttachments(fieldName, ids, project) {
  const box = document.querySelector(`[data-selected-for="${fieldName}"]`);
  if (!box) return;
  box.outerHTML = selectedChipsHtml(fieldName, ids, project);
}

function fillUploadSample(fieldName, project) {
  const pickerMap = {
    pztDrawings: ["pzt", "mapa"],
    pabDrawings: ["rzut-parter", "rzut-pietro", "rzut-dach", "elewacje", "przekroj"],
    ptDrawings: ["detal"],
    docOpdn: ["opis"],
    docWz: ["opis"],
    docOpinions: ["opis"],
    docRoad: ["opis"],
    docBioz: ["opis"],
  };
  const allowed = pickerMap[fieldName] || [];
  const pool = [...(project.files || []), ...ACCOUNT_LIBRARY_FILES];
  const ids = pool
    .filter((file) => allowed.includes(file.categoryId))
    .slice(0, 2)
    .map((file) => file.id);
  if (ids.length) applySelectedAttachments(fieldName, ids, project);

  const done = document.querySelector(`[name="${fieldName}Done"]`);
  if (done) done.checked = true;
}

function fillFieldSample(fieldName, project) {
  if (
    [
      "pztDrawings",
      "pabDrawings",
      "ptDrawings",
      "docOpdn",
      "docWz",
      "docOpinions",
      "docRoad",
      "docBioz",
    ].includes(fieldName)
  ) {
    fillUploadSample(fieldName, project);
    return;
  }

  const field = document.querySelector(`[name="${fieldName}"]`);
  if (!field) return;

  if (fieldName.includes("__")) {
    const [docId, shortName] = fieldName.split("__");
    const sample = getDocFormSample(docId, shortName);
    if (!sample) return;
    field.value = sample;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  const sample = ASSISTANT_FILL_SAMPLES[fieldName];
  if (!sample) return;
  field.value = sample;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function fillSectionSample(sectionKey, project) {
  if (String(sectionKey || "").startsWith("doc:")) {
    const parts = sectionKey.split(":");
    const docId = parts[1];
    const sectionId = parts[2];
    if (!docId) return;

    if (sectionId) {
      listDocFormFields(docId)
        .filter((field) => field.sectionKey === sectionId)
        .forEach((field) => fillFieldSample(field.fullName, project));
      return;
    }

    listDocFormFields(docId).forEach((field) => fillFieldSample(field.fullName, project));
    return;
  }

  const fields = SECTION_FIELD_MAP[sectionKey] || [];
  fields.forEach((name) => fillFieldSample(name, project));
}

function runAssist(action) {
  const overlay = ensureAssistOverlay();
  overlay.hidden = false;
  document.body.classList.add("modal-open");

  window.setTimeout(() => {
    action();
    overlay.hidden = true;
    document.body.classList.remove("modal-open");
    updateFormSaveFabVisibility();
  }, 1100);
}

function bindBuildingForm(projectId) {
  const form = document.getElementById("buildingProjectForm");
  const project = getProjectById(projectId);
  if (!form || !project) return;

  form.querySelectorAll('[data-role="assist-field"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      runAssist(() => fillFieldSample(btn.dataset.fieldName, project));
    });
  });

  form.querySelectorAll('[data-role="assist-section"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const section = btn.closest("details");
      if (section && !section.open) section.open = true;
      runAssist(() => fillSectionSample(btn.dataset.section, project));
      updateFormSaveFabVisibility();
    });
  });

  form.querySelectorAll('[data-role="pick-project-files"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      openAttachmentPicker(projectId, btn.dataset.fieldName, "project");
    });
  });

  form.querySelectorAll('[data-role="pick-account-files"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      openAttachmentPicker(projectId, btn.dataset.fieldName, "account");
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (persistBuildingFormFromDom(projectId)) {
      showFormSavedToast("Zapisano zmiany");
    }
  });

  bindTaskDescriptionEditors(projectId);
  bindFormSaveChrome(projectId, "building");
}

function pdfEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function buildSimplePdfBlob(lines) {
  const safeLines = (lines || [])
    .map((line) => pdfEscape(String(line || "").slice(0, 110)))
    .filter(Boolean)
    .slice(0, 28);

  const streamParts = ["BT", "/F1 14 Tf", "50 760 Td"];
  safeLines.forEach((line, index) => {
    if (index === 0) {
      streamParts.push(`(${line}) Tj`);
    } else {
      streamParts.push("0 -18 Td", `(${line}) Tj`);
    }
  });
  streamParts.push("ET");
  const stream = streamParts.join("\n");

  const objects = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  objects.push(
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
  );
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function buildProjectPdfBlob(project) {
  return buildSimplePdfBlob([
    "snapPoint — Projekt budowlany",
    project.title || "Projekt budowlany",
    (project.description || "Bez opisu").slice(0, 180),
    `snapPoint · ${formatDate(project.updatedAt || project.createdAt)} · zalacznikow: ${
      project.files?.length || 0
    }`,
  ]);
}

function buildDocumentPdfBlob(project, doc) {
  const saved = project.docForms?.[doc.id] || {};
  const fields = listDocFormFields(doc.id);
  const lines = [
    "snapPoint — Dokument do zlozenia",
    doc.title || "Dokument",
    `Projekt: ${project.title || "—"}`,
    `Zrodlo: ${doc.source === "standard" ? "standardowy" : "warunkowy"}`,
    `Wygenerowano: ${formatDate(new Date().toISOString())}`,
    "---",
  ];

  fields.forEach((field) => {
    const value = String(saved[field.name] || "").trim();
    lines.push(`${field.label}:`);
    lines.push(value || "(brak danych — wypelnij formularz)");
  });

  return buildSimplePdfBlob(lines);
}

function downloadBlobAsFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function safeDownloadName(value, fallback) {
  return (
    String(value || fallback || "dokument")
      .replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ\- ]+/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 48) || fallback || "dokument"
  );
}

function downloadProjectPdf(project) {
  downloadBlobAsFile(
    buildProjectPdfBlob(project),
    `${safeDownloadName(project.title, "projekt-budowlany")}.pdf`
  );
}

function downloadDocumentPdf(project, doc) {
  if (!project || !doc) return;
  downloadBlobAsFile(
    buildDocumentPdfBlob(project, doc),
    `${safeDownloadName(doc.title || doc.id, "dokument")}.pdf`
  );
  showTypeToast("Pobrano PDF dokumentu (mock)");
}

function ensureGenerateModal() {
  let modal = document.getElementById("generateProjectModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "generateProjectModal";
  modal.className = "generate-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="generate-modal-backdrop"></div>
    <div class="generate-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="generateModalTitle">
      <div class="generate-spinner" aria-hidden="true"></div>
      <h2 id="generateModalTitle">Generowanie projektu…</h2>
      <p>Projekt budowlany jest przygotowywany. PDF pobierze się za chwilę.</p>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

let generateTimer = null;

function closeGenerateModal() {
  const modal = document.getElementById("generateProjectModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("modal-open");
  if (generateTimer) {
    clearTimeout(generateTimer);
    generateTimer = null;
  }
}

function startGenerateProject(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;

  const modal = ensureGenerateModal();
  modal.hidden = false;
  document.body.classList.add("modal-open");

  if (generateTimer) clearTimeout(generateTimer);
  generateTimer = setTimeout(() => {
    downloadProjectPdf(project);
    closeGenerateModal();
    showTypeToast("Pobrano PDF projektu budowlanego");
  }, 2200);
}

function bindProjectDetailActions(projectId) {
  content.querySelectorAll('[data-role="open-building-form"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateProjectPanel(btn.dataset.projectId || projectId, {
        panel: "building-form",
      });
    });
  });

  content.querySelectorAll('[data-role="delete-project"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      confirmAndDeleteProject(btn.dataset.projectId || projectId);
    });
  });

  content.querySelectorAll('[data-role="toggle-auto-schedule"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = btn.dataset.projectId || projectId;
      const project = getProjectById(id);
      if (!project) return;
      const nextOn = !isProjectAutoScheduleEnabled(project);
      setProjectAutoScheduleDates(id, nextOn);
      showTypeToast(
        nextOn
          ? "Daty auto: ON — przeliczanie (pełny silnik wkrótce)"
          : "Daty auto: OFF — daty ustawiasz ręcznie (np. na Gancie)"
      );
      renderView("project-detail", projectOverviewNav(id));
    });
  });

  content.querySelectorAll('[data-role="project-list-tab"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const raw = btn.dataset.tab;
      const tab =
        raw === "attachments" ? "attachments" : raw === "geoportal" ? "geoportal" : "tasks";
      setProjectListTab(tab);
      navigateProjectPanel(btn.dataset.projectId || projectId, { listTab: tab });
    });
  });

  content.querySelectorAll('[data-role="close-building-form"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      setProjectListTab("tasks");
      navigateProjectPanel(btn.dataset.projectId || projectId, { listTab: "tasks" });
    });
  });

  content.querySelectorAll('[data-role="open-formal-survey"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setProjectListTab("tasks");
      navigateProjectPanel(btn.dataset.projectId || projectId, {
        panel: "formal-survey",
      });
    });
  });

  const switchTasksView = (mode, projectIdForView) => {
    setTasksViewMode(mode);
    const panel = content.querySelector('[data-role="project-tasks-panel"]');
    if (panel?.dataset.global === "1") {
      renderView("tasks-calendar");
      return;
    }
    setProjectListTab("tasks");
    renderView(
      "project-detail",
      projectOverviewNav(projectIdForView || projectId, { listTab: "tasks" })
    );
  };

  content.querySelectorAll('[data-role="tasks-table"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      switchTasksView("table", btn.dataset.projectId);
    });
  });

  content.querySelectorAll('[data-role="tasks-cards"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      switchTasksView("cards", btn.dataset.projectId);
    });
  });

  content.querySelectorAll('[data-role="tasks-flow"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      switchTasksView("flow", btn.dataset.projectId);
    });
  });

  content.querySelectorAll('[data-role="project-flow-pick"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openProjectFlowGenerateModal(btn.dataset.projectId || projectId);
    });
  });

  content.querySelectorAll('[data-role="tasks-gantt"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      switchTasksView("gantt", btn.dataset.projectId);
    });
  });

  content.querySelectorAll('[data-role="tasks-kanban"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      switchTasksView("kanban", btn.dataset.projectId);
    });
  });

  content.querySelectorAll('[data-role="open-add-task"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const parentTaskId = btn.dataset.parentTaskId || "";
      const returnPanel = btn.dataset.returnPanel || "";
      let returnTo = null;
      if (returnPanel === "task-detail") {
        returnTo = {
          panel: "task-detail",
          focusTaskId: btn.dataset.returnTaskId || parentTaskId,
        };
      } else if (returnPanel === "doc-form") {
        returnTo = { panel: "doc-form", focusDocId: btn.dataset.returnDocId || "" };
      } else if (returnPanel === "building-form") {
        returnTo = { panel: "building-form" };
      } else if (parentTaskId) {
        returnTo = { panel: "task-detail", focusTaskId: parentTaskId };
      }
      openAddTaskModal(btn.dataset.projectId || projectId, {
        parentTaskId,
        returnTo,
      });
    });
  });

  content.querySelectorAll('[data-role="open-subtree-task"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openProjectTaskById(
        btn.dataset.projectId || projectId,
        btn.dataset.taskId,
        btn.dataset.taskKind
      );
    });
  });

  content.querySelectorAll('[data-role="close-task-detail"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      setProjectListTab("tasks");
      navigateProjectPanel(btn.dataset.projectId || projectId, { listTab: "tasks" });
    });
  });

  content.querySelectorAll('[data-role="open-kpa"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateProjectPanel(btn.dataset.projectId || projectId, {
        panel: "kpa",
      });
    });
  });

  content.querySelectorAll('[data-role="open-linked-doc"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openLinkedDocument(
        btn.dataset.projectId || projectId,
        btn.dataset.linkKind,
        btn.dataset.linkId,
        { newTab: btn.dataset.openNewTab === "1" }
      );
    });
  });

  content.querySelectorAll('[data-role="open-related-tasks"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (btn.disabled) return;
      openRelatedTasksModal(
        btn.dataset.projectId || projectId,
        btn.dataset.linkKind,
        btn.dataset.linkId
      );
    });
  });

  content.querySelectorAll('[data-role="open-related-add-task"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const kind = btn.dataset.linkKind;
      const linkId = btn.dataset.linkId;
      const parentFromTask =
        kind === "task" || kind === "process" || kind === "step" || kind === "milestone"
          ? linkId
          : "";
      openAddTaskModal(btn.dataset.projectId || projectId, {
        linkedKind: parentFromTask ? "" : kind,
        linkedId: parentFromTask ? "" : linkId,
        parentTaskId: parentFromTask || "",
        returnTo:
          kind === "building"
            ? { panel: "building-form" }
            : kind === "survey-doc"
              ? { panel: "doc-form", focusDocId: linkId }
              : parentFromTask
                ? { panel: "task-detail", focusTaskId: parentFromTask }
                : null,
      });
    });
  });

  content.querySelectorAll('[data-role="open-discussion-add"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openDiscussionAddModal(
        btn.dataset.projectId || projectId,
        btn.dataset.linkKind,
        btn.dataset.linkId
      );
    });
  });

  content.querySelectorAll('[data-role="open-discussion-view"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (btn.disabled) return;
      openDiscussionViewModal(
        btn.dataset.projectId || projectId,
        btn.dataset.linkKind,
        btn.dataset.linkId
      );
    });
  });

  content.querySelectorAll('[data-role="close-formal-survey"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      setProjectListTab("tasks");
      renderView("project-detail", projectOverviewNav(btn.dataset.projectId || projectId, { listTab: "tasks" }));
    });
  });

  content.querySelectorAll('[data-role="close-doc-form"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      setProjectListTab("tasks");
      navigateProjectPanel(btn.dataset.projectId || projectId, { listTab: "tasks" });
    });
  });

  content.querySelectorAll('[data-role="open-task"]').forEach((row) => {
    const openTask = () => {
      openProjectTaskById(
        row.dataset.projectId || projectId,
        row.dataset.taskId,
        row.dataset.taskKind
      );
    };
    row.addEventListener("click", (event) => {
      if (
        event.target.closest('[data-role="task-owner"]') ||
        event.target.closest('[data-role="task-status"]') ||
        event.target.closest('[data-role="task-due"]') ||
        event.target.closest('[data-role="open-task-due"]') ||
        event.target.closest('[data-role="task-start"]') ||
        event.target.closest('[data-role="open-task-start"]') ||
        event.target.closest('[data-role="due-date-field"]') ||
        event.target.closest('[data-role="filter-task-col"]') ||
        event.target.closest('[data-role="filter-task-search"]') ||
        event.target.closest('[data-role="task-select"]') ||
        event.target.closest('[data-role="open-linked-doc"]') ||
        event.target.closest('[data-role="toggle-task-expand"]') ||
        event.target.closest('[data-role="tasks-card-drag-handle"]') ||
        event.target.closest('[data-role="workflow-set-blocks"]') ||
        event.target.closest('[data-role="workflow-remove-dep"]') ||
        event.target.closest('[data-role="workflow-task-doc"]') ||
        event.target.closest('[data-role="workflow-duration"]') ||
        event.target.closest('[data-role="workflow-add-child"]') ||
        event.target.closest('[data-role="delete-project-task"]') ||
        event.target.closest('[data-role="tasks-cards-add-root"]') ||
        event.target.closest('[data-role="tasks-table-add-root"]') ||
        event.target.closest(".col-select")
      ) {
        return;
      }
      event.preventDefault();
      openTask();
    });
    row.querySelectorAll('[data-role="open-task-title"]').forEach((titleBtn) => {
      titleBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openProjectTaskById(
          titleBtn.dataset.projectId || row.dataset.projectId || projectId,
          titleBtn.dataset.taskId || row.dataset.taskId,
          titleBtn.dataset.taskKind || row.dataset.taskKind
        );
      });
    });
    row.addEventListener("keydown", (event) => {
      if (
        event.target.closest('[data-role="task-owner"]') ||
        event.target.closest('[data-role="task-status"]') ||
        event.target.closest('[data-role="task-due"]') ||
        event.target.closest('[data-role="open-task-due"]') ||
        event.target.closest('[data-role="task-start"]') ||
        event.target.closest('[data-role="open-task-start"]') ||
        event.target.closest('[data-role="task-select"]') ||
        event.target.closest('[data-role="toggle-task-expand"]')
      ) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTask();
      }
    });
  });

  content.querySelectorAll('[data-role="task-owner"]').forEach((select) => {
    select.addEventListener("click", (event) => event.stopPropagation());
    select.addEventListener("mousedown", (event) => {
      const panel = content.querySelector('[data-role="project-tasks-panel"]');
      if (!panel || panel.dataset.viewMode !== "table") return;
      const taskId = select.dataset.taskId;
      const selected = getSelectedTaskIds(panel);
      if (selected.length <= 1 || !selected.includes(String(taskId))) return;
      event.preventDefault();
      event.stopPropagation();
      select.blur();
      openBulkTaskModal({
        mode: "owner",
        projectId: select.dataset.projectId || projectId,
        taskIds: selected,
      });
    });
    select.addEventListener("change", () => {
      const panel = content.querySelector('[data-role="project-tasks-panel"]');
      const taskId = select.dataset.taskId;
      const selected =
        panel?.dataset.viewMode === "table" ? getSelectedTaskIds(panel) : [];
      if (selected.length > 1 && selected.includes(String(taskId))) {
        const project = getProjectById(select.dataset.projectId || projectId);
        const previous = project ? getTaskOwnerId(project, taskId) : NO_OWNER.id;
        select.value = previous;
        openBulkTaskModal({
          mode: "owner",
          projectId: select.dataset.projectId || projectId,
          taskIds: selected,
        });
        return;
      }
      const id = select.dataset.projectId || projectId;
      const project = getProjectById(id);
      if (!project || !taskId) return;
      persistProject({
        ...project,
        taskOwners: {
          ...(project.taskOwners || {}),
          [taskId]: select.value || NO_OWNER.id,
        },
        updatedAt: new Date().toISOString(),
      });
      const label =
        getTaskOwnerOptions(project).find((opt) => opt.id === select.value)?.name ||
        "Brak właściciela";
      showTypeToast(`Właściciel: ${label}`);
    });
  });

  content.querySelectorAll('[data-role="task-status"]').forEach((select) => {
    select.addEventListener("click", (event) => event.stopPropagation());
    select.addEventListener("mousedown", (event) => event.stopPropagation());
    select.addEventListener("change", () => {
      const id = select.dataset.projectId || projectId;
      const taskId = select.dataset.taskId;
      const statusId = select.value;
      if (!taskId || !statusId) return;
      const saved = persistTaskBoardStatus(id, taskId, statusId);
      if (!saved) return;
      syncTaskStatusDom(id, saved.taskIds, statusId);
      const meta = boardStatusMeta(statusId);
      showFormSavedToast(`Zmieniono status: ${meta.label}`);
    });
  });

  const bindTaskDateInput = (inputRole, openRole, storageKey, setLabel, clearLabel) => {
    content.querySelectorAll(`[data-role="${inputRole}"]`).forEach((input) => {
      const field = input.closest('[data-role="due-date-field"]');
      const syncEmptyState = () => {
        const hasValue = Boolean(input.value);
        field?.classList.toggle("has-value", hasValue);
        field?.classList.toggle("is-empty", !hasValue);
        const iconBtn = field?.querySelector(`[data-role="${openRole}"]`);
        if (iconBtn) iconBtn.tabIndex = hasValue ? -1 : 0;
      };

      const openBulkDatesIfNeeded = (event) => {
        const panel = content.querySelector('[data-role="project-tasks-panel"]');
        if (!panel || panel.dataset.viewMode !== "table") return false;
        const taskId = input.dataset.taskId;
        const selected = getSelectedTaskIds(panel);
        if (selected.length <= 1 || !selected.includes(String(taskId))) return false;
        event?.preventDefault?.();
        event?.stopPropagation?.();
        openBulkTaskModal({
          mode: "due",
          projectId: input.dataset.projectId || projectId,
          taskIds: selected,
        });
        return true;
      };

      input.addEventListener("click", (event) => {
        event.stopPropagation();
        if (openBulkDatesIfNeeded(event)) return;
        openNativeDatePicker(input);
      });
      input.addEventListener("change", () => {
        const panel = content.querySelector('[data-role="project-tasks-panel"]');
        const taskId = input.dataset.taskId;
        const selected =
          panel?.dataset.viewMode === "table" ? getSelectedTaskIds(panel) : [];
        if (selected.length > 1 && selected.includes(String(taskId))) {
          const project = getProjectById(input.dataset.projectId || projectId);
          const previous =
            storageKey === "taskStartDates"
              ? getTaskStartDate(project, taskId)
              : getTaskDueDate(project, taskId);
          input.value = previous || "";
          syncEmptyState();
          openBulkTaskModal({
            mode: "due",
            projectId: input.dataset.projectId || projectId,
            taskIds: selected,
          });
          return;
        }
        const id = input.dataset.projectId || projectId;
        const project = getProjectById(id);
        if (!project || !taskId) return;
        if (storageKey === "taskStartDates") {
          const autoOn = isProjectAutoScheduleEnabled(project);
          const flowTask = (project.flowInstance?.tasks || []).find(
            (item) => item.id === taskId
          );
          if (autoOn && flowTask && (flowTask.blockedBy || []).length) {
            input.value = "";
            showTypeToast("Start tego zadania wynika z wymaganych poprzedników");
            return;
          }
          if (autoOn && flowTask) {
            const startDate =
              typeof input.value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.value)
                ? input.value
                : null;
            if (flowTask.parentId) {
              showTypeToast("Datę startu ustawiasz na zadaniu najwyższego poziomu");
              input.value = getTaskStartDate(project, taskId) || "";
              syncEmptyState();
              return;
            }
            let nextProject = {
              ...project,
              flowInstance: {
                ...project.flowInstance,
                tasks: (project.flowInstance.tasks || []).map((item) =>
                  item.id === taskId ? { ...item, startDate } : item
                ),
                updatedAt: new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            };
            nextProject = applyFlowScheduleDatesToProject(nextProject);
            persistProject(nextProject);
            showTypeToast(
              input.value
                ? `Daty z flow przeniesione do tabeli (start: ${formatDateOnly(input.value)})`
                : clearLabel
            );
            renderView(
              "project-detail",
              projectOverviewNav(id, { listTab: "tasks" })
            );
            return;
          }
        }
        if (storageKey === "taskDueDates" && isProjectAutoScheduleEnabled(project)) {
          const collected = collectProjectTasks(project);
          const currentTask = collected.find((item) => String(item.id) === String(taskId));
          if (currentTask?.dueDateLocked) {
            input.value = currentTask.dueDate || "";
            syncEmptyState();
            showTypeToast("Data zakończenia nadrzędnego wynika z ostatniego podzadania");
            return;
          }
        }
        let nextProject = {
          ...project,
          [storageKey]: {
            ...(project[storageKey] || {}),
            [taskId]: input.value || "",
          },
          updatedAt: new Date().toISOString(),
        };
        if (storageKey === "taskDueDates") {
          nextProject = recomputeProjectParentDueDates(nextProject);
        }
        persistProject(nextProject);
        syncEmptyState();
        showTypeToast(input.value ? `${setLabel}: ${formatDateOnly(input.value)}` : clearLabel);
        if (panel?.dataset.viewMode === "cards" || storageKey === "taskDueDates") {
          renderView(
            "project-detail",
            projectOverviewNav(id, { listTab: "tasks" })
          );
        }
      });
    });

    content.querySelectorAll(`[data-role="${openRole}"]`).forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const field = btn.closest('[data-role="due-date-field"]');
        const input = field?.querySelector(`[data-role="${inputRole}"]`);
        if (!input) return;
        const panel = content.querySelector('[data-role="project-tasks-panel"]');
        if (panel?.dataset.viewMode === "table") {
          const selected = getSelectedTaskIds(panel);
          const taskId = input.dataset.taskId;
          if (selected.length > 1 && selected.includes(String(taskId))) {
            openBulkTaskModal({
              mode: "due",
              projectId: input.dataset.projectId || projectId,
              taskIds: selected,
            });
            return;
          }
        }
        openNativeDatePicker(input);
      });
    });
  };

  bindTaskDateInput(
    "task-start",
    "open-task-start",
    "taskStartDates",
    "Rozpoczęcie",
    "Usunięto datę rozpoczęcia"
  );
  bindTaskDateInput(
    "task-due",
    "open-task-due",
    "taskDueDates",
    "Zakończenie prac",
    "Usunięto datę zakończenia prac"
  );

  bindTaskSelection(projectId);
  bindTaskTableFilters();
  bindTasksCardsView(projectId);
  bindProjectTasksSharedControls(projectId);
  bindKanbanBoard(projectId);
  bindGanttBoard(projectId);

  content.querySelectorAll('[data-role="open-attachment-row"]').forEach((row) => {
    row.addEventListener("click", (event) => {
      if (
        event.target.closest('[data-role="remove-attachment"]') ||
        event.target.closest('[data-role="edit-attachment-category"]')
      ) {
        return;
      }
      event.preventDefault();
      const project = getProjectById(row.dataset.projectId || projectId);
      const file = project?.files?.find((item) => String(item.id) === String(row.dataset.fileId));
      if (!file) return;
      downloadAttachmentMock(file);
      showTypeToast(`Pobrano: ${file.name}`);
    });
  });

  content.querySelectorAll('[data-role="edit-attachment-category"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openProjectFileCategoryModal(
        btn.dataset.projectId || projectId,
        btn.dataset.fileId
      );
    });
  });

  content.querySelectorAll('[data-role="remove-attachment"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = btn.dataset.projectId || projectId;
      const project = getProjectById(id);
      if (!project) return;
      const fileId = String(btn.dataset.fileId || "");
      const removed = project.files?.find((item) => String(item.id) === fileId);
      persistProject({
        ...project,
        files: (project.files || []).filter((item) => String(item.id) !== fileId),
        updatedAt: new Date().toISOString(),
      });
      showTypeToast(removed ? `Usunięto: ${removed.name}` : "Usunięto załącznik");
      setProjectListTab("attachments");
      renderView("project-detail", projectOverviewNav(id, { listTab: "attachments" }));
    });
  });

  content.querySelectorAll('[data-role="project-attach-input"]').forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.dataset.projectId || projectId;
      const project = getProjectById(id);
      if (!project || !input.files?.length) return;

      pendingAttachQueue = Array.from(input.files).map((file) => ({
        name: file.name,
        size: file.size,
      }));
      categoryModalProjectId = id;
      input.value = "";
      openPendingAttachCategoryModal();
    });
  });

  content.querySelectorAll('[data-role="generate-building-project"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startGenerateProject(btn.dataset.projectId || projectId);
    });
  });

  bindProjectAttachmentsFilter();
  bindProjectDocForms(projectId);
  bindDocumentPdfDownloads();
  bindProjectTableColumns();
}

function getSelectedTaskIds(panel) {
  return [...panel.querySelectorAll('[data-role="task-select"]:checked')].map(
    (input) => input.dataset.taskId
  );
}

function syncTaskBulkUi(panel) {
  if (!panel) return;
  const selected = getSelectedTaskIds(panel);
  const bulk = panel.querySelector('[data-role="task-bulk-actions"]');
  const selectAll = panel.querySelector('[data-role="task-select-all"]');
  const boxes = [...panel.querySelectorAll('[data-role="task-select"]')].filter((box) => {
    const row = box.closest("tr");
    return row && !row.hidden;
  });
  const checkedVisible = boxes.filter((box) => box.checked).length;
  if (bulk) bulk.hidden = selected.length === 0;
  if (selectAll) {
    const allOn = boxes.length > 0 && checkedVisible === boxes.length;
    const partial = checkedVisible > 0 && checkedVisible < boxes.length;
    selectAll.classList.toggle("is-active", allOn);
    selectAll.classList.toggle("is-partial", partial);
    selectAll.setAttribute("aria-pressed", allOn ? "true" : "false");
  }
  panel.querySelectorAll('[data-role="task-select"]').forEach((box) => {
    box.closest("tr")?.classList.toggle("is-task-selected", box.checked);
  });
}

function bindTasksCardsView(projectId) {
  const panel = content.querySelector('[data-role="project-tasks-panel"]');
  const root = panel?.querySelector('[data-role="tasks-cards-view"]');
  if (!panel || !root || panel.dataset.viewMode !== "cards") return;

  setWorkflowRuntime({ mode: "project", projectId: root.dataset.projectId || projectId });

  const list = root.querySelector('[data-role="workflow-task-list"]');
  const searchInput = root.querySelector('[data-role="filter-task-search"]');
  const countEl = root.querySelector('[data-role="task-filter-count"]');
  const items = () =>
    Array.from(root.querySelectorAll('.tasks-card-item[data-role="open-task"]'));

  const applyFilter = () => {
    const searchWords = String(searchInput?.value || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    let visible = 0;
    let totalShownTree = 0;
    items().forEach((item) => {
      const treeHidden = item.classList.contains("is-collapsed-hidden");
      const searchBlob = item.dataset.filterSearch || "";
      const searchMatch = searchWords.every((word) => searchBlob.includes(word));
      const match = searchMatch && !treeHidden;
      item.hidden = !match;
      if (!treeHidden) totalShownTree += 1;
      if (match) visible += 1;
    });
    if (countEl) {
      countEl.textContent =
        !searchWords.length || visible === totalShownTree
          ? `${visible} zadań`
          : `${visible} z ${totalShownTree} zadań`;
    }
    requestAnimationFrame(() => drawWorkflowDependencyLinks());
  };

  panel._applyTaskFilters = applyFilter;
  searchInput?.addEventListener("input", applyFilter);
  searchInput?.addEventListener("click", (event) => event.stopPropagation());

  const afterExpand = () => {
    syncTaskTreeDom(panel);
    requestAnimationFrame(() => {
      drawWorkflowDependencyLinks();
      requestAnimationFrame(() => drawWorkflowDependencyLinks());
    });
  };

  root.querySelectorAll('[data-role="toggle-task-expand"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const pid = btn.dataset.projectId || projectId;
      const tid = btn.dataset.taskId;
      if (!pid || !tid) return;
      toggleTaskExpandState(pid, tid);
      afterExpand();
    });
  });

  root.querySelector('[data-role="tasks-expand-all"]')?.addEventListener("click", () => {
    const pid = root.dataset.projectId || projectId;
    const project = getProjectById(pid);
    if (!project) return;
    setAllTaskExpandState(pid, collectProjectTasks(project), true);
    afterExpand();
  });

  root.querySelector('[data-role="tasks-collapse-roots"]')?.addEventListener("click", () => {
    const pid = root.dataset.projectId || projectId;
    const project = getProjectById(pid);
    if (!project) return;
    collapseTasksToRootLevel(pid, collectProjectTasks(project));
    afterExpand();
  });

  root.querySelectorAll('[data-role="workflow-set-blocks"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const taskId = btn.dataset.taskId;
      const active = getActiveWorkflowPath();
      const task = active?.tasks?.find((item) => item.id === taskId);
      if (!task) return;
      openWorkflowTaskPickerModal({
        title: "Wymaga wykonania",
        lead: `Wybierz zadania, które muszą być wykonane, zanim ruszy „${task.name}”.`,
        taskId,
        selectedIds: task.blockedBy || [],
        onSave: (ids) => {
          setWorkflowTaskDependencies(taskId, ids, "blockedBy");
          showTypeToast("Zapisano powiązania (instancja projektu)");
          renderView(
            "project-detail",
            projectOverviewNav(root.dataset.projectId || projectId, { listTab: "tasks" })
          );
        },
      });
    });
  });

  root.querySelectorAll('[data-role="workflow-remove-dep"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeWorkflowDependency(btn.dataset.from, btn.dataset.to);
      showTypeToast("Usunięto powiązanie");
      renderView(
        "project-detail",
        projectOverviewNav(root.dataset.projectId || projectId, { listTab: "tasks" })
      );
    });
  });

  const refreshCardsView = () => {
    renderView(
      "project-detail",
      projectOverviewNav(root.dataset.projectId || projectId, { listTab: "tasks" })
    );
  };

  root.querySelectorAll('[data-role="workflow-duration"]').forEach((input) => {
    const commit = () => {
      const taskId = input.dataset.taskId;
      if (!taskId) return;
      setWorkflowTaskDuration(taskId, input.value);
      refreshCardsView();
    };
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("change", commit);
  });

  applyFilter();
  bindWorkflowUnassignedDocsAction();
  bindWorkflowDependencyRedraw();
  requestAnimationFrame(() => drawWorkflowDependencyLinks());
  applyWorkflowTaskHighlight();

  if (!list) return;

  const clearDropMarkers = () => {
    list.querySelectorAll(".tasks-card-item").forEach((item) => {
      item.classList.remove(
        "drop-before",
        "drop-after",
        "drop-nest",
        "drop-link-doc",
        "drop-link-blocked"
      );
    });
  };

  let dragTaskId = null;
  list.querySelectorAll(".tasks-card-item").forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      if (event.target.closest('[data-role="workflow-task-doc"]')) return;
      const interactive = event.target.closest(
        "button, a, input, textarea, select, label, .due-date-field"
      );
      if (
        interactive &&
        !interactive.matches('[data-role="tasks-card-drag-handle"]')
      ) {
        event.preventDefault();
        return;
      }
      dragTaskId = item.dataset.taskId || null;
      if (!dragTaskId) {
        event.preventDefault();
        return;
      }
      item.classList.add("is-dragging");
      list.classList.add("is-dragging-tasks");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragTaskId);
    });

    item.addEventListener("dragend", () => {
      dragTaskId = null;
      item.classList.remove("is-dragging");
      list.classList.remove("is-dragging-tasks");
      clearDropMarkers();
      requestAnimationFrame(() => drawWorkflowDependencyLinks());
    });

    item.addEventListener("dragover", (event) => {
      if (workflowDocDragState && !list.classList.contains("is-dragging-tasks")) {
        event.preventDefault();
        clearDropMarkers();
        const targetId = item.dataset.taskId;
        const docId = workflowDocDragState.docId;
        if (workflowDocDragState.sourceTaskId && workflowDocDragState.sourceTaskId === targetId) {
          event.dataTransfer.dropEffect = "none";
          return;
        }
        if (!canAssignWorkflowDocToTask(targetId, docId)) {
          item.classList.add("drop-link-blocked");
          event.dataTransfer.dropEffect = "none";
          return;
        }
        item.classList.add("drop-link-doc");
        event.dataTransfer.dropEffect = workflowDocDragState.sourceTaskId ? "move" : "copy";
        return;
      }

      if (!dragTaskId || dragTaskId === item.dataset.taskId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const project = getProjectById(root.dataset.projectId || projectId);
      const allTasks = [
        ...(project?.flowInstance?.tasks || []),
        ...(project?.customTasks || []),
      ];
      if (isWorkflowDescendant(allTasks, dragTaskId, item.dataset.taskId)) {
        clearDropMarkers();
        return;
      }
      const card = item.querySelector(".tasks-card-tile");
      const rect = (card || item).getBoundingClientRect();
      const ratio = (event.clientY - rect.top) / Math.max(1, rect.height);
      clearDropMarkers();
      if (ratio < 0.28) item.classList.add("drop-before");
      else if (ratio > 0.72) item.classList.add("drop-after");
      else item.classList.add("drop-nest");
    });

    item.addEventListener("dragleave", (event) => {
      if (!item.contains(event.relatedTarget)) {
        item.classList.remove(
          "drop-before",
          "drop-after",
          "drop-nest",
          "drop-link-doc",
          "drop-link-blocked"
        );
      }
    });

    item.addEventListener("drop", (event) => {
      if (event.target.closest('[data-role="workflow-task-doc"]')) return;
      event.preventDefault();
      event.stopPropagation();
      const docId =
        event.dataTransfer.getData("text/workflow-doc") || workflowDocDragState?.docId || "";
      const sourceTaskId =
        event.dataTransfer.getData("text/workflow-doc-source-task") ||
        workflowDocDragState?.sourceTaskId ||
        "";
      const targetId = item.dataset.taskId;

      if (docId && targetId) {
        clearDropMarkers();
        if (sourceTaskId && sourceTaskId === targetId) return;
        if (!canAssignWorkflowDocToTask(targetId, docId)) {
          showTypeToast("To zadanie ma już powiązany dokument");
          return;
        }
        linkWorkflowTaskDocument(targetId, docId);
        workflowDocDragState = null;
        showTypeToast(
          sourceTaskId ? "Przepięto dokument na inne zadanie" : "Powiązano dokument z zadaniem"
        );
        renderView(
          "project-detail",
          projectOverviewNav(root.dataset.projectId || projectId, { listTab: "tasks" })
        );
        return;
      }

      const sourceId = event.dataTransfer.getData("text/plain") || dragTaskId;
      let mode = "after";
      if (item.classList.contains("drop-before")) mode = "before";
      else if (item.classList.contains("drop-nest")) mode = "nest";
      clearDropMarkers();
      if (!sourceId || !targetId || sourceId === targetId) return;
      const moved = moveProjectTask(root.dataset.projectId || projectId, sourceId, {
        mode,
        targetId,
      });
      if (!moved) {
        if (!moveProjectTask.lastError) {
          showTypeToast("Nie można przenieść tego zadania");
        }
        return;
      }
      showTypeToast(
        mode === "nest" ? "Zagnieżdżono zadanie" : "Zmieniono kolejność zadań"
      );
      renderView(
        "project-detail",
        projectOverviewNav(root.dataset.projectId || projectId, { listTab: "tasks" })
      );
    });
  });
}

function bindProjectTasksSharedControls(projectId) {
  const panel = content.querySelector('[data-role="project-tasks-panel"]');
  if (!panel) return;
  const pid = panel.dataset.projectId || projectId;
  const viewMode = panel.dataset.viewMode || "";
  if (viewMode !== "cards" && viewMode !== "table") return;

  setWorkflowRuntime({ mode: "project", projectId: pid });

  const refresh = () => {
    renderView("project-detail", projectOverviewNav(pid, { listTab: "tasks" }));
  };

  const ensureProjectRuntime = () => {
    setWorkflowRuntime({ mode: "project", projectId: pid });
    const project = getProjectById(pid);
    if (!project) return null;
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
  };

  panel.querySelectorAll('[data-role="workflow-docs-toggle"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const layout = panel.querySelector('[data-role="workflow-layout"]');
      const docsPanel = panel.querySelector('[data-role="workflow-documents"]');
      const reopen = panel.querySelector(".workflow-docs-reopen");
      const next = !isWorkflowDocsCollapsed();
      setWorkflowDocsCollapsed(next);
      layout?.classList.toggle("is-docs-collapsed", next);
      if (docsPanel) docsPanel.hidden = next;
      if (reopen) reopen.hidden = !next;
      if (viewMode === "cards") {
        requestAnimationFrame(() => drawWorkflowDependencyLinks());
      }
    });
  });

  panel.querySelectorAll('[data-role="workflow-locate-task"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      focusWorkflowTaskFromDoc(btn.dataset.docId);
    });
  });

  panel
    .querySelectorAll('[data-role="tasks-cards-add-root"], [data-role="tasks-table-add-root"]')
    .forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        ensureProjectRuntime();
        openWorkflowNameModal({
          title: "Zadanie główne",
          eyebrow: getProjectById(pid)?.title || "Projekt",
          placeholder: "np. Projekt budowlany",
          onSave: (name) => {
            ensureProjectRuntime();
            const task = createWorkflowTask(name, null);
            if (!task) {
              showTypeToast("Nie udało się dodać zadania");
              return;
            }
            showTypeToast(`Dodano zadanie: ${task.name}`);
            refresh();
          },
        });
      });
    });

  panel.querySelectorAll('[data-role="workflow-add-child"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      ensureProjectRuntime();
      const parentId = btn.dataset.taskId;
      const active = getActiveWorkflowPath();
      const parent = active?.tasks?.find((task) => task.id === parentId);
      if (active && parentId) {
        setWorkflowTaskExpanded(active.id, parentId, true);
        const map = loadTaskExpandState(pid);
        map[parentId] = true;
        saveTaskExpandState(pid, map);
      }
      openWorkflowNameModal({
        title: "Podzadanie",
        eyebrow: parent?.name || active?.name || "Flow",
        placeholder: "np. Korekty dokumentacji",
        onSave: (name) => {
          ensureProjectRuntime();
          const task = createWorkflowTask(name, parentId);
          if (!task) {
            showTypeToast("Nie udało się dodać podzadania");
            return;
          }
          showTypeToast(`Dodano podzadanie: ${task.name}`);
          refresh();
        },
      });
    });
  });

  panel.querySelectorAll('[data-role="delete-project-task"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const taskId = btn.dataset.taskId;
      if (!confirmAndDeleteProjectTask(btn.dataset.projectId || pid, taskId)) return;
      refresh();
    });
  });

  bindWorkflowDocDrag();

  if (viewMode === "table") {
    const rows = panel.querySelectorAll('tbody tr[data-role="open-task"]');
    rows.forEach((row) => {
      row.addEventListener("dragover", (event) => {
        if (!workflowDocDragState) return;
        event.preventDefault();
        event.stopPropagation();
        rows.forEach((other) => other.classList.remove("drop-link-doc", "drop-link-blocked"));
        const targetId = row.dataset.taskId;
        const docId = workflowDocDragState.docId;
        if (workflowDocDragState.sourceTaskId && workflowDocDragState.sourceTaskId === targetId) {
          event.dataTransfer.dropEffect = "none";
          return;
        }
        if (!canAssignWorkflowDocToTask(targetId, docId)) {
          row.classList.add("drop-link-blocked");
          event.dataTransfer.dropEffect = "none";
          return;
        }
        row.classList.add("drop-link-doc");
        event.dataTransfer.dropEffect = workflowDocDragState.sourceTaskId ? "move" : "copy";
      });
      row.addEventListener("dragleave", (event) => {
        if (!row.contains(event.relatedTarget)) {
          row.classList.remove("drop-link-doc", "drop-link-blocked");
        }
      });
      row.addEventListener("drop", (event) => {
        if (!workflowDocDragState && !event.dataTransfer.getData("text/workflow-doc")) return;
        event.preventDefault();
        event.stopPropagation();
        const docId =
          event.dataTransfer.getData("text/workflow-doc") || workflowDocDragState?.docId || "";
        const sourceTaskId =
          event.dataTransfer.getData("text/workflow-doc-source-task") ||
          workflowDocDragState?.sourceTaskId ||
          "";
        const targetId = row.dataset.taskId;
        row.classList.remove("drop-link-doc", "drop-link-blocked");
        if (!docId || !targetId) return;
        if (sourceTaskId && sourceTaskId === targetId) return;
        if (!canAssignWorkflowDocToTask(targetId, docId)) {
          showTypeToast("To zadanie ma już powiązany dokument");
          return;
        }
        linkWorkflowTaskDocument(targetId, docId);
        workflowDocDragState = null;
        showTypeToast(
          sourceTaskId ? "Przepięto dokument na inne zadanie" : "Powiązano dokument z zadaniem"
        );
        refresh();
      });
    });
  }

  applyWorkflowTaskHighlight();
}

function bindTaskTableFilters() {
  const panel = content.querySelector('[data-role="project-tasks-panel"]');
  if (!panel || panel.dataset.viewMode !== "table") return;

  const countEl = panel.querySelector('[data-role="task-filter-count"]');
  const emptyEl = panel.querySelector('[data-role="task-filter-empty"]');
  const searchInput = panel.querySelector('[data-role="filter-task-search"]');
  const rows = Array.from(panel.querySelectorAll('tbody tr[data-role="open-task"]'));

  const matchNumberFilter = (raw, value) => {
    const query = String(raw || "").trim().toLowerCase();
    if (!query) return true;
    if (/^\d+$/.test(query)) return value === Number(query);
    if (/^>=\d+$/.test(query)) return value >= Number(query.slice(2));
    if (/^<=\d+$/.test(query)) return value <= Number(query.slice(2));
    if (/^>\d+$/.test(query)) return value > Number(query.slice(1));
    if (/^<\d+$/.test(query)) return value < Number(query.slice(1));
    return String(value).includes(query);
  };

  const applyFilter = () => {
    const filters = {};
    panel.querySelectorAll('[data-role="filter-task-col"]').forEach((el) => {
      const key = el.dataset.filterKey;
      if (!key) return;
      filters[key] = String(el.value || "").trim();
    });
    const searchWords = String(searchInput?.value || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    let visible = 0;
    rows.forEach((row) => {
      const colMatch = Object.entries(filters).every(([key, raw]) => {
        if (!raw) return true;
        if (key === "progress") {
          return matchNumberFilter(raw, Number(row.dataset.filterProgress || 0));
        }
        if (key === "owner") {
          return String(row.dataset.filterOwnerId || "") === raw;
        }
        if (key === "status") {
          return String(row.dataset.filterStatusKey || "") === raw;
        }
        if (key === "start") {
          return String(row.dataset.filterStartIso || "") === raw;
        }
        if (key === "due") {
          return String(row.dataset.filterDueIso || "") === raw;
        }
        if (key === "updated") {
          return String(row.dataset.filterUpdatedIso || "") === raw;
        }
        const query = raw.toLowerCase();
        const map = {
          name: row.dataset.filterName || "",
        };
        return (map[key] || "").includes(query);
      });
      const searchBlob = row.dataset.filterSearch || "";
      const searchMatch = searchWords.every((word) => searchBlob.includes(word));
      const match = colMatch && searchMatch;
      const treeHidden = row.classList.contains("is-tree-hidden");
      row.hidden = !match || treeHidden;
      if (match && !treeHidden) visible += 1;
    });

    if (countEl) {
      countEl.textContent =
        visible === rows.filter((r) => !r.classList.contains("is-tree-hidden")).length
          ? `${visible} zadań`
          : `${visible} z ${rows.length} zadań`;
    }
    if (emptyEl) emptyEl.hidden = visible > 0;
  };

  panel._applyTaskFilters = applyFilter;

  panel.querySelectorAll('[data-role="filter-task-col"]').forEach((el) => {
    el.addEventListener("input", applyFilter);
    el.addEventListener("change", applyFilter);
    el.addEventListener("click", (event) => event.stopPropagation());
  });
  searchInput?.addEventListener("input", applyFilter);
  searchInput?.addEventListener("click", (event) => event.stopPropagation());

  panel.querySelector('[data-role="clear-task-filters"]')?.addEventListener("click", () => {
    panel.querySelectorAll('[data-role="filter-task-col"]').forEach((el) => {
      el.value = "";
    });
    if (searchInput) searchInput.value = "";
    applyFilter();
  });

  panel.querySelectorAll('[data-role="toggle-task-expand"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const pid = btn.dataset.projectId;
      const tid = btn.dataset.taskId;
      if (!pid || !tid) return;
      toggleTaskExpandState(pid, tid);
      syncTaskTreeDom(panel);
    });
  });

  panel.querySelector('[data-role="tasks-expand-all"]')?.addEventListener("click", () => {
    const pid = panel.dataset.projectId;
    const project = getProjectById(pid);
    if (!project) return;
    setAllTaskExpandState(pid, collectProjectTasks(project), true);
    syncTaskTreeDom(panel);
  });

  panel.querySelector('[data-role="tasks-collapse-roots"]')?.addEventListener("click", () => {
    const pid = panel.dataset.projectId;
    const project = getProjectById(pid);
    if (!project) return;
    collapseTasksToRootLevel(pid, collectProjectTasks(project));
    syncTaskTreeDom(panel);
  });

  applyFilter();
}

function bindTaskSelection(projectId) {
  const panel = content.querySelector('[data-role="project-tasks-panel"]');
  if (!panel) return;

  const visibleSelectBoxes = () =>
    [...panel.querySelectorAll('[data-role="task-select"]')].filter((box) => {
      const row = box.closest("tr");
      return row && !row.hidden;
    });

  const applySelection = (predicate) => {
    panel.querySelectorAll('[data-role="task-select"]').forEach((box) => {
      const row = box.closest("tr");
      if (!row || row.hidden) {
        box.checked = false;
        return;
      }
      box.checked = predicate(box, row);
    });
    syncTaskBulkUi(panel);
  };

  const selectAll = panel.querySelector('[data-role="task-select-all"]');
  selectAll?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const visible = visibleSelectBoxes();
    const allChecked = visible.length > 0 && visible.every((box) => box.checked);
    visible.forEach((box) => {
      box.checked = !allChecked;
    });
    panel.querySelectorAll('[data-role="task-select"]').forEach((box) => {
      const row = box.closest("tr");
      if (row?.hidden) box.checked = false;
    });
    syncTaskBulkUi(panel);
  });

  panel.querySelector('[data-role="task-select-no-dates"]')?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    applySelection((_box, row) => {
      const start = String(row.dataset.filterStartIso || "").trim();
      const due = String(row.dataset.filterDueIso || "").trim();
      return !start && !due;
    });
    const count = getSelectedTaskIds(panel).length;
    showTypeToast(
      count ? `Zaznaczono bez dat: ${count}` : "Brak widocznych zadań bez dat"
    );
  });

  panel.querySelector('[data-role="task-select-no-owners"]')?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    applySelection((_box, row) => {
      const ownerId = String(row.dataset.filterOwnerId || "");
      return !ownerId || ownerId === NO_OWNER.id;
    });
    const count = getSelectedTaskIds(panel).length;
    showTypeToast(
      count
        ? `Zaznaczono bez właścicieli: ${count}`
        : "Brak widocznych zadań bez właścicieli"
    );
  });

  panel.querySelectorAll('[data-role="task-select"]').forEach((box) => {
    box.addEventListener("click", (event) => event.stopPropagation());
    box.addEventListener("change", () => syncTaskBulkUi(panel));
  });

  panel.querySelectorAll('[data-role="bulk-task-due"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openBulkTaskModal({
        mode: "due",
        projectId: btn.dataset.projectId || projectId,
        taskIds: getSelectedTaskIds(panel),
      });
    });
  });

  panel.querySelectorAll('[data-role="bulk-task-owner"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openBulkTaskModal({
        mode: "owner",
        projectId: btn.dataset.projectId || projectId,
        taskIds: getSelectedTaskIds(panel),
      });
    });
  });

  syncTaskBulkUi(panel);
}

/** @type {{ mode: "due" | "owner", projectId: string, taskIds: string[] } | null} */
let bulkTaskContext = null;

function ganttBarAnchorPoints(bar, bodyRect) {
  const rect = bar.getBoundingClientRect();
  const left = rect.left - bodyRect.left;
  const right = rect.right - bodyRect.left;
  const top = rect.top - bodyRect.top;
  const bottom = rect.bottom - bodyRect.top;
  const midY = top + rect.height / 2;
  return {
    left,
    right,
    top,
    bottom,
    midY,
    cx: left + rect.width / 2,
    width: rect.width,
    height: rect.height,
  };
}

/** FS: wyjście z dołu/góry źródła → wejście z boku celu (bez grotu). */
function buildGanttDependencyPath(from, to) {
  const exitBottom = to.midY >= from.midY;
  const x1 = from.cx;
  const y1 = exitBottom ? from.bottom : from.top;
  const stub = 11;
  const yStub = exitBottom ? y1 + stub : y1 - stub;

  const enterFromLeft = to.cx >= from.cx;
  const x2 = enterFromLeft ? to.left : to.right;
  const y2 = to.midY;
  const laneX = enterFromLeft ? x2 - 12 : x2 + 12;

  if (Math.abs(yStub - y2) < 1.5) {
    return `M ${x1} ${y1} L ${x1} ${yStub} L ${x2} ${y2}`;
  }
  return `M ${x1} ${y1} L ${x1} ${yStub} L ${laneX} ${yStub} L ${laneX} ${y2} L ${x2} ${y2}`;
}

function drawGanttDependencyLinks(root) {
  const body = root?.querySelector('[data-role="gantt-body"]');
  const svg = body?.querySelector('[data-role="gantt-dep-svg"]');
  if (!body || !svg) return;

  const width = Math.max(1, body.scrollWidth || body.clientWidth);
  const height = Math.max(1, body.scrollHeight || body.clientHeight);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;

  const bodyRect = body.getBoundingClientRect();
  const barMap = new Map();
  body.querySelectorAll('[data-role="gantt-bar"]').forEach((bar) => {
    const row = bar.closest('[data-role="gantt-row"]');
    if (!row || row.hidden || row.classList.contains("is-tree-hidden")) return;
    const taskId = bar.dataset.taskId;
    const projectId = bar.dataset.projectId;
    if (!taskId || !projectId) return;
    barMap.set(`${projectId}::${taskId}`, {
      bar,
      ...ganttBarAnchorPoints(bar, bodyRect),
      parentId: bar.dataset.parentId || "",
      projectId,
      taskId,
    });
  });

  const projectsCache = new Map();
  const getEdges = (projectId) => {
    if (!projectsCache.has(projectId)) {
      const project = getProjectById(projectId);
      projectsCache.set(projectId, project ? collectProjectDependencyEdges(project) : []);
    }
    return projectsCache.get(projectId);
  };

  const laneEdges = [];
  barMap.forEach((fromMeta) => {
    getEdges(fromMeta.projectId).forEach((edge) => {
      if (String(edge.from) !== String(fromMeta.taskId)) return;
      const toMeta = barMap.get(`${fromMeta.projectId}::${edge.to}`);
      if (!toMeta) return;
      if ((fromMeta.parentId || "") !== (toMeta.parentId || "")) return;
      laneEdges.push({
        id: `${fromMeta.taskId}__${toMeta.taskId}`,
        from: fromMeta.taskId,
        to: toMeta.taskId,
        projectId: fromMeta.projectId,
        d: buildGanttDependencyPath(fromMeta, toMeta),
      });
    });
  });

  const groups = laneEdges
    .map(
      (edge) => `
      <g class="gantt-dep-edge" data-edge-id="${escapeHtml(edge.id)}" data-from="${escapeHtml(
        edge.from
      )}" data-to="${escapeHtml(edge.to)}" data-project-id="${escapeHtml(edge.projectId)}">
        <path class="gantt-dep-hit" d="${edge.d}" />
        <path class="gantt-dep-line" d="${edge.d}" />
      </g>`
    )
    .join("");

  svg.innerHTML = `
    ${groups}
    <path class="gantt-dep-preview" data-role="gantt-dep-preview" hidden d="" />
  `;

  const clearEdgeHover = () => {
    svg.classList.remove("is-hovering");
    svg.querySelectorAll(".gantt-dep-edge").forEach((other) => {
      other.classList.remove("is-hot");
    });
  };

  svg.classList.remove("is-hovering");
  svg.querySelectorAll(".gantt-dep-edge").forEach((group) => {
    group.addEventListener("pointerenter", () => {
      svg.classList.add("is-hovering");
      svg.querySelectorAll(".gantt-dep-edge").forEach((other) => {
        other.classList.toggle("is-hot", other === group);
      });
    });
    group.addEventListener("pointerleave", clearEdgeHover);
    group.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const fromId = group.dataset.from;
      const toId = group.dataset.to;
      const projectId = group.dataset.projectId;
      if (!fromId || !toId || !projectId) return;
      if (!setProjectTaskDependency(projectId, fromId, toId, { remove: true })) return;
      showTypeToast("Usunięto powiązanie");
      renderView("project-detail", projectOverviewNav(projectId, { listTab: "tasks" }));
    });
  });

  barMap.forEach((meta) => {
    if (meta.bar._ganttDepHoverBound) return;
    meta.bar._ganttDepHoverBound = true;
    meta.bar.addEventListener("pointerenter", () => {
      const liveSvg = body.querySelector('[data-role="gantt-dep-svg"]');
      if (!liveSvg) return;
      const taskId = meta.bar.dataset.taskId;
      let any = false;
      liveSvg.querySelectorAll(".gantt-dep-edge").forEach((group) => {
        const hot =
          String(group.dataset.from) === String(taskId) ||
          String(group.dataset.to) === String(taskId);
        group.classList.toggle("is-hot", hot);
        if (hot) any = true;
      });
      liveSvg.classList.toggle("is-hovering", any);
    });
    meta.bar.addEventListener("pointerleave", (event) => {
      const next = event.relatedTarget?.closest?.('[data-role="gantt-bar"]');
      if (next) return;
      const liveSvg = body.querySelector('[data-role="gantt-dep-svg"]');
      if (!liveSvg) return;
      liveSvg.classList.remove("is-hovering");
      liveSvg.querySelectorAll(".gantt-dep-edge").forEach((group) => {
        group.classList.remove("is-hot");
      });
    });
  });
}

function bindGanttBoard(projectId) {
  const root = content.querySelector('[data-role="tasks-gantt-view"]');
  if (!root) return;
  const id = root.dataset.projectId || projectId;

  root.querySelectorAll('[data-role="gantt-scale"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const scale = btn.dataset.scale === "week" ? "week" : "month";
      if (getGanttScale() === scale) return;
      setGanttScale(scale);
      renderView("project-detail", projectOverviewNav(id, { listTab: "tasks" }));
    });
  });

  const filterLabels = { project: "Projekt", owner: "Właściciel", status: "Status" };
  const rowFilterMatch = (el) => {
    const projects = readGanttMultiFilter(root, "project");
    const owners = readGanttMultiFilter(root, "owner");
    const statuses = readGanttMultiFilter(root, "status");
    const projectOk = !projects || projects.has(String(el.dataset.projectId || ""));
    const ownerOk = !owners || owners.has(String(el.dataset.ownerId || ""));
    const statusOk = !statuses || statuses.has(String(el.dataset.statusKey || ""));
    return projectOk && ownerOk && statusOk;
  };

  const syncGanttTreeDom = () => {
    const rows = [...root.querySelectorAll('[data-role="gantt-row"]')];
    const byProject = new Map();
    rows.forEach((row) => {
      const pid = String(row.dataset.projectId || "");
      if (!byProject.has(pid)) byProject.set(pid, []);
      byProject.get(pid).push(row);
    });

    byProject.forEach((projectRows, pid) => {
      const expandMap = loadTaskExpandState(pid);
      const byId = new Map(
        projectRows.map((row) => [
          String(row.dataset.taskId || ""),
          {
            id: row.dataset.taskId,
            parentId: row.dataset.parentId || null,
            depth: Number(row.dataset.depth) || 0,
            hasChildren: row.classList.contains("has-children"),
          },
        ])
      );
      projectRows.forEach((row) => {
        const task = byId.get(String(row.dataset.taskId || ""));
        const treeHidden = task
          ? ganttTaskTreeHidden(pid, task, byId, expandMap)
          : false;
        row.dataset.treeHidden = treeHidden ? "1" : "0";
        row.classList.toggle("is-tree-hidden", treeHidden);
        const toggle = row.querySelector('[data-role="gantt-toggle-expand"]');
        if (toggle && task) {
          const expanded = isTaskNodeExpanded(pid, task, expandMap);
          toggle.classList.toggle("is-expanded", expanded);
          toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
          toggle.title = expanded ? "Zwiń" : "Rozwiń";
          toggle.setAttribute(
            "aria-label",
            expanded ? "Zwiń podzadania" : "Rozwiń podzadania"
          );
        }
      });
    });
  };

  const applyGanttFilters = () => {
    root.querySelectorAll('[data-role="gantt-row"]').forEach((row) => {
      const treeHidden = row.dataset.treeHidden === "1";
      row.hidden = treeHidden || !rowFilterMatch(row);
    });
    drawGanttDependencyLinks(root);
  };

  root.querySelectorAll('[data-role="gantt-multi-filter"]').forEach((wrap) => {
    const key = wrap.dataset.filterKey || "";
    const allInput = wrap.querySelector('[data-role="gantt-multi-all"]');
    const optionInputs = [...wrap.querySelectorAll('[data-role="gantt-multi-option"]')];
    syncGanttMultiSummary(wrap, filterLabels[key] || "Filtr");

    allInput?.addEventListener("change", () => {
      if (allInput.checked) {
        optionInputs.forEach((input) => {
          input.checked = false;
        });
      }
      syncGanttMultiSummary(wrap, filterLabels[key] || "Filtr");
      applyGanttFilters();
    });
    optionInputs.forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked && allInput) allInput.checked = false;
        if (!optionInputs.some((opt) => opt.checked) && allInput) allInput.checked = true;
        syncGanttMultiSummary(wrap, filterLabels[key] || "Filtr");
        applyGanttFilters();
      });
    });
  });

  root.querySelectorAll('[data-role="gantt-toggle-expand"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const pid = btn.dataset.projectId;
      const tid = btn.dataset.taskId;
      if (!pid || !tid) return;
      toggleTaskExpandState(pid, tid);
      syncGanttTreeDom();
      applyGanttFilters();
    });
  });

  syncGanttTreeDom();
  applyGanttFilters();

  const dayWidth = Number(root.dataset.dayWidth) || 16;
  const timelineWidth = Number(root.dataset.timelineWidth) || 0;
  const rangeStart = parseTaskDateOnly(root.dataset.rangeStart);
  const body = root.querySelector('[data-role="gantt-body"]');

  const applyBarGeometry = (bar, leftPx, widthPx) => {
    let left = Math.round(leftPx / dayWidth) * dayWidth;
    let width = Math.max(dayWidth, Math.round(widthPx / dayWidth) * dayWidth);
    if (left < 0) left = 0;
    if (timelineWidth > 0 && left >= timelineWidth) {
      left = Math.max(0, timelineWidth - dayWidth);
    }
    if (timelineWidth > 0 && left + width > timelineWidth) {
      width = Math.max(dayWidth, timelineWidth - left);
    }
    bar.style.left = `${left}px`;
    bar.style.width = `${width}px`;
    if (!rangeStart) return { startIso: bar.dataset.start, endIso: bar.dataset.end };
    const startOffset = Math.round(left / dayWidth);
    const dayCount = Math.max(1, Math.round(width / dayWidth));
    const start = addDaysIso(rangeStart, startOffset);
    const end = addDaysIso(start, dayCount - 1);
    const startIso = toIsoDateOnly(start);
    const endIso = toIsoDateOnly(end);
    bar.dataset.start = startIso;
    bar.dataset.end = endIso;
    const dateLine = `${formatDateOnly(startIso)} – ${formatDateOnly(endIso)}`;
    const row = bar.closest('[data-role="gantt-row"]');
    const datesEl = row?.querySelector(".gantt-label-dates");
    if (datesEl) datesEl.textContent = dateLine;
    const label = bar.querySelector(".gantt-bar-label")?.textContent || "";
    const progress = bar.querySelector(".gantt-bar-pct")?.textContent || "";
    bar.title = `${label} · ${dateLine}${progress ? ` · ${progress}` : ""}`;
    return { startIso, endIso };
  };

  root.querySelectorAll('[data-role="gantt-bar"]').forEach((bar) => {
    bar.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest('[data-role="gantt-dep-port"]')) return;
      if (bar.dataset.summary === "1" || bar.classList.contains("is-summary")) return;
      event.preventDefault();
      event.stopPropagation();

      const handle = event.target.closest('[data-role="gantt-resize"]');
      const mode = handle ? `resize-${handle.dataset.edge}` : "move";
      const originX = event.clientX;
      const originLeft = parseFloat(bar.style.left) || 0;
      const originWidth = parseFloat(bar.style.width) || dayWidth;
      bar.classList.add("is-dragging");
      root.classList.add("is-bar-editing");

      const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - originX;
        if (mode === "move") {
          applyBarGeometry(bar, originLeft + dx, originWidth);
        } else if (mode === "resize-start") {
          const nextLeft = originLeft + dx;
          const nextWidth = originWidth - dx;
          if (nextWidth >= dayWidth) applyBarGeometry(bar, nextLeft, nextWidth);
        } else if (mode === "resize-end") {
          applyBarGeometry(bar, originLeft, originWidth + dx);
        }
        drawGanttDependencyLinks(root);
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        bar.classList.remove("is-dragging");
        root.classList.remove("is-bar-editing");
        const taskId = bar.dataset.taskId;
        const taskProjectId = bar.dataset.projectId || id;
        const startIso = bar.dataset.start || "";
        const endIso = bar.dataset.end || "";
        if (!taskId || !startIso || !endIso) {
          drawGanttDependencyLinks(root);
          return;
        }
        if (!persistTaskSchedule(taskProjectId, taskId, startIso, endIso)) {
          applyBarGeometry(bar, originLeft, originWidth);
          drawGanttDependencyLinks(root);
          return;
        }
        showTypeToast(`Termin: ${formatDateOnly(startIso)} – ${formatDateOnly(endIso)}`);
        drawGanttDependencyLinks(root);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  });

  root.querySelectorAll('[data-role="gantt-dep-port"]').forEach((port) => {
    port.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const fromBar = port.closest('[data-role="gantt-bar"]');
      if (!fromBar || !body) return;
      const fromId = fromBar.dataset.taskId;
      const fromProjectId = fromBar.dataset.projectId || id;
      const fromParentId = fromBar.dataset.parentId || "";
      if (!fromId) return;

      drawGanttDependencyLinks(root);
      root.classList.add("is-dep-linking");
      fromBar.classList.add("is-link-source");
      const preview = body.querySelector('[data-role="gantt-dep-preview"]');

      const updatePreview = (clientX, clientY) => {
        if (!preview) return;
        const pts = ganttBarAnchorPoints(fromBar, body.getBoundingClientRect());
        const x1 = pts.cx;
        const y1 = pts.bottom;
        const rect = body.getBoundingClientRect();
        const x2 = clientX - rect.left;
        const y2 = clientY - rect.top;
        preview.removeAttribute("hidden");
        preview.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
      };

      const clearLinkUi = () => {
        root.classList.remove("is-dep-linking");
        fromBar.classList.remove("is-link-source");
        root.querySelectorAll(".gantt-bar.is-link-target").forEach((el) => {
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
        root.querySelectorAll(".gantt-bar.is-link-target").forEach((el) => {
          el.classList.remove("is-link-target", "is-link-invalid");
        });
        const targetBar = moveEvent.target.closest?.('[data-role="gantt-bar"]');
        if (!targetBar || targetBar === fromBar) return;
        const sameProject = String(targetBar.dataset.projectId || "") === String(fromProjectId);
        const sameLevel = String(targetBar.dataset.parentId || "") === String(fromParentId);
        targetBar.classList.add("is-link-target");
        if (!sameProject || !sameLevel) targetBar.classList.add("is-link-invalid");
      };

      const onUp = (upEvent) => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        const targetBar =
          upEvent.target.closest?.('[data-role="gantt-bar"]') ||
          document
            .elementFromPoint(upEvent.clientX, upEvent.clientY)
            ?.closest?.('[data-role="gantt-bar"]');
        clearLinkUi();
        if (!targetBar || targetBar === fromBar) {
          drawGanttDependencyLinks(root);
          return;
        }
        const toId = targetBar.dataset.taskId;
        const toProjectId = targetBar.dataset.projectId || id;
        if (!toId || String(toProjectId) !== String(fromProjectId)) {
          showTypeToast("Powiązania tylko w obrębie tego samego projektu");
          drawGanttDependencyLinks(root);
          return;
        }
        if (String(targetBar.dataset.parentId || "") !== String(fromParentId)) {
          showTypeToast("Powiązania tylko na tym samym poziomie");
          drawGanttDependencyLinks(root);
          return;
        }
        const predecessorId = fromId;
        const successorId = toId;
        if (
          !setProjectTaskDependency(fromProjectId, predecessorId, successorId, {
            remove: false,
          })
        ) {
          drawGanttDependencyLinks(root);
          return;
        }
        showTypeToast("Dodano powiązanie");
        renderView("project-detail", projectOverviewNav(id, { listTab: "tasks" }));
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  });

  requestAnimationFrame(() => drawGanttDependencyLinks(root));
  if (typeof ResizeObserver !== "undefined" && body) {
    root._ganttDepResizeObserver?.disconnect?.();
    const observer = new ResizeObserver(() => drawGanttDependencyLinks(root));
    observer.observe(body);
    root._ganttDepResizeObserver = observer;
  }

  const scroller = root.querySelector('[data-role="gantt-pan"]');
  if (!scroller) return;

  scroller.addEventListener("scroll", () => drawGanttDependencyLinks(root), {
    passive: true,
  });

  scroller.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (
      event.target.closest(
        ".gantt-bar, .gantt-label, .gantt-label-head, .gantt-tree-toggle, .gantt-scale, .gantt-filters, .gantt-multi-filter, .gantt-dep-edge, button, summary, a, input, select, textarea, label"
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
      drawGanttDependencyLinks(root);
    };
    const onUp = () => {
      scroller.classList.remove("is-panning");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      drawGanttDependencyLinks(root);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
}

function bindKanbanBoard(projectId) {
  const root = content.querySelector('[data-role="tasks-kanban-view"]');
  const board = root?.querySelector('[data-role="kanban-board"]') || content.querySelector('[data-role="kanban-board"]');
  if (!board) return;
  const filterRoot = root || board;

  const filterLabels = { project: "Projekt", owner: "Właściciel", status: "Status" };
  const syncKanbanColumnMeta = () => {
    board.querySelectorAll(".kanban-column").forEach((column) => {
      const cards = [...column.querySelectorAll('[data-role="kanban-card"]')];
      const visible = cards.filter((card) => !card.hidden).length;
      const countEl = column.querySelector('[data-role="kanban-column-count"]');
      if (countEl) countEl.textContent = String(visible);
      const emptyEl = column.querySelector('[data-role="kanban-empty"]');
      if (emptyEl) emptyEl.hidden = visible > 0;
    });
  };
  const applyKanbanFilters = () => {
    const projects = readGanttMultiFilter(filterRoot, "project");
    const owners = readGanttMultiFilter(filterRoot, "owner");
    const statuses = readGanttMultiFilter(filterRoot, "status");
    board.querySelectorAll('[data-role="kanban-card"]').forEach((card) => {
      const projectOk = !projects || projects.has(String(card.dataset.projectId || ""));
      const ownerOk = !owners || owners.has(String(card.dataset.ownerId || ""));
      const statusOk = !statuses || statuses.has(String(card.dataset.statusKey || ""));
      card.hidden = !(projectOk && ownerOk && statusOk);
    });
    syncKanbanColumnMeta();
  };

  filterRoot.querySelectorAll('[data-role="gantt-multi-filter"]').forEach((wrap) => {
    const key = wrap.dataset.filterKey || "";
    const allInput = wrap.querySelector('[data-role="gantt-multi-all"]');
    const optionInputs = [...wrap.querySelectorAll('[data-role="gantt-multi-option"]')];
    syncGanttMultiSummary(wrap, filterLabels[key] || "Filtr");

    allInput?.addEventListener("change", () => {
      if (allInput.checked) {
        optionInputs.forEach((input) => {
          input.checked = false;
        });
      }
      syncGanttMultiSummary(wrap, filterLabels[key] || "Filtr");
      applyKanbanFilters();
    });
    optionInputs.forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked && allInput) allInput.checked = false;
        if (!optionInputs.some((opt) => opt.checked) && allInput) allInput.checked = true;
        syncGanttMultiSummary(wrap, filterLabels[key] || "Filtr");
        applyKanbanFilters();
      });
    });
  });
  applyKanbanFilters();

  let dragTaskId = "";
  let dragProjectId = "";

  board.querySelectorAll('[data-role="kanban-card"]').forEach((card) => {
    card.addEventListener("mousedown", (event) => {
      const interactive = event.target.closest("select, button, input, label, a, .task-desc-icon, .task-meta-icon");
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
      dragTaskId = card.dataset.taskId || "";
      dragProjectId = card.dataset.projectId || "";
      card.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `${dragProjectId}::${dragTaskId}`);
    });
    card.addEventListener("dragend", () => {
      card.draggable = true;
      card.classList.remove("is-dragging");
      board.querySelectorAll('[data-role="kanban-drop"]').forEach((zone) => {
        zone.classList.remove("is-drop-target");
      });
      dragTaskId = "";
      dragProjectId = "";
    });
  });

  board.querySelectorAll('[data-role="task-owner"]').forEach((select) => {
    select.addEventListener("mousedown", (event) => event.stopPropagation());
    select.addEventListener("click", (event) => event.stopPropagation());
  });

  board.querySelectorAll('[data-role="open-linked-doc"]').forEach((btn) => {
    btn.addEventListener("mousedown", (event) => event.stopPropagation());
  });

  board.querySelectorAll('[data-role="kanban-drop"]').forEach((zone) => {
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
      const raw = event.dataTransfer.getData("text/plain") || `${dragProjectId}::${dragTaskId}`;
      const parts = raw.includes("::") ? raw.split("::") : ["", raw];
      const taskProjectId = parts[0] || dragProjectId || board.dataset.projectId || projectId;
      const taskId = parts[1] || dragTaskId;
      const status = zone.dataset.status;
      const validStatuses = new Set(getKanbanStatuses().map((item) => item.id));
      if (!taskId || !validStatuses.has(status)) return;

      const saved = persistTaskBoardStatus(taskProjectId, taskId, status);
      if (!saved) return;

      syncTaskStatusDom(taskProjectId, saved.taskIds, status);
      applyKanbanFilters();
      const meta = boardStatusMeta(status);
      showFormSavedToast(`Zmieniono status: ${meta.label}`);
    });
  });
}

function ensureBulkTaskModal() {
  let modal = document.getElementById("bulkTaskModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "bulkTaskModal";
  modal.className = "category-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-bulk-task-modal"></div>
    <div class="category-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="bulkTaskModalTitle">
      <header class="category-modal-head">
        <div>
          <p class="eyebrow">Masowa edycja</p>
          <h2 id="bulkTaskModalTitle">Ustaw dla zaznaczonych</h2>
          <p class="category-modal-file" id="bulkTaskModalMeta"></p>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-bulk-task-modal" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body" id="bulkTaskModalBody"></div>
      <footer class="category-modal-foot">
        <button type="button" class="ghost-btn" data-role="close-bulk-task-modal">Anuluj</button>
        <button type="button" class="primary-btn" id="bulkTaskModalSave">Zapisz</button>
      </footer>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target.closest('[data-role="close-bulk-task-modal"]')) {
      closeBulkTaskModal();
    }
  });

  modal.querySelector("#bulkTaskModalSave")?.addEventListener("click", () => {
    if (!bulkTaskContext?.taskIds?.length) return;
    const project = getProjectById(bulkTaskContext.projectId);
    if (!project) return;

    if (bulkTaskContext.mode === "owner") {
      const ownerId = modal.querySelector("#bulkTaskOwner")?.value || NO_OWNER.id;
      const count = bulkTaskContext.taskIds.length;
      const nextOwners = { ...(project.taskOwners || {}) };
      bulkTaskContext.taskIds.forEach((taskId) => {
        nextOwners[taskId] = ownerId;
      });
      persistProject({
        ...project,
        taskOwners: nextOwners,
        updatedAt: new Date().toISOString(),
      });
      const label =
        getTaskOwnerOptions(project).find((opt) => opt.id === ownerId)?.name ||
        "Brak właściciela";
      const id = project.id;
      closeBulkTaskModal();
      showTypeToast(`Właściciel (${count}): ${label}`);
      renderView("project-detail", projectOverviewNav(id, { listTab: "tasks" }));
      return;
    }

    const startDate = modal.querySelector("#bulkTaskStart")?.value || "";
    const dueDate = modal.querySelector("#bulkTaskDue")?.value || "";
    const count = bulkTaskContext.taskIds.length;
    const nextStarts = { ...(project.taskStartDates || {}) };
    const nextDues = { ...(project.taskDueDates || {}) };
    const idSet = new Set(bulkTaskContext.taskIds.map(String));
    const customTasks = (project.customTasks || []).map((task) =>
      idSet.has(String(task.id))
        ? {
            ...task,
            startDate,
            dueDate,
            updatedAt: new Date().toISOString(),
          }
        : task
    );
    bulkTaskContext.taskIds.forEach((taskId) => {
      nextStarts[taskId] = startDate;
      nextDues[taskId] = dueDate;
    });
    persistProject({
      ...project,
      customTasks,
      taskStartDates: nextStarts,
      taskDueDates: nextDues,
      updatedAt: new Date().toISOString(),
    });
    const id = project.id;
    closeBulkTaskModal();
    const parts = [];
    if (startDate) parts.push(`od ${formatDateOnly(startDate)}`);
    else parts.push("bez daty od");
    if (dueDate) parts.push(`do ${formatDateOnly(dueDate)}`);
    else parts.push("bez daty do");
    showTypeToast(`Daty (${count}): ${parts.join(" · ")}`);
    renderView("project-detail", projectOverviewNav(id, { listTab: "tasks" }));
  });

  return modal;
}

function openBulkTaskModal({ mode, projectId, taskIds }) {
  if (!taskIds?.length) {
    showTypeToast("Zaznacz co najmniej jedno zadanie");
    return;
  }
  const project = getProjectById(projectId);
  if (!project) return;

  bulkTaskContext = { mode, projectId, taskIds };
  const modal = ensureBulkTaskModal();
  const title = modal.querySelector("#bulkTaskModalTitle");
  const meta = modal.querySelector("#bulkTaskModalMeta");
  const body = modal.querySelector("#bulkTaskModalBody");
  if (title) {
    title.textContent =
      mode === "owner" ? "Właściciel zaznaczonych zadań" : "Daty zaznaczonych zadań";
  }
  if (meta) {
    meta.textContent = `Zaznaczono: ${taskIds.length}`;
  }
  if (body) {
    body.innerHTML =
      mode === "owner"
        ? `<label class="field">
            <span class="field-label">Właściciel</span>
            <select id="bulkTaskOwner" class="owner-select owner-select-block">
              ${taskOwnerOptionsHtml(project, NO_OWNER.id)}
            </select>
          </label>`
        : `<div class="fields-row">
            <label class="field">
              <span class="field-label">Data rozpoczęcia</span>
              <input id="bulkTaskStart" type="date" class="due-date-input due-date-input-block" />
            </label>
            <label class="field">
              <span class="field-label">Data zakończenia prac</span>
              <input id="bulkTaskDue" type="date" class="due-date-input due-date-input-block" />
            </label>
          </div>
          <p class="muted" style="margin:0.35rem 0 0;font-size:0.82rem">
            Puste pole czyści datę dla zaznaczonych zadań.
          </p>`;
  }
  modal.hidden = false;
  document.body.classList.add("modal-open");
  if (mode === "due") {
    openNativeDatePicker(modal.querySelector("#bulkTaskStart"));
  }
}

function closeBulkTaskModal() {
  const modal = document.getElementById("bulkTaskModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("modal-open");
  bulkTaskContext = null;
}

function columnsDefForTable(tableId) {
  if (tableId === "project-tasks" || tableId === "project-documents") {
    return PROJECT_TASK_COLUMNS;
  }
  if (tableId === "project-attachments") return PROJECT_ATTACHMENT_COLUMNS;
  return null;
}

function persistTableDomLayout(table) {
  const tableId = table.dataset.table;
  const columns = columnsDefForTable(tableId);
  if (!tableId || !columns) return;
  const headerRow = table.querySelector("thead tr:not(.filter-row)");
  const seen = new Set();
  const order = [];
  (headerRow ? headerRow.querySelectorAll("th[data-col]") : table.querySelectorAll("thead th[data-col]")).forEach(
    (th) => {
      const id = th.dataset.col;
      if (!id || seen.has(id) || id === TASK_SELECT_COL.id) return;
      seen.add(id);
      order.push(id);
    }
  );
  const widths = {};
  table.querySelectorAll("colgroup col[data-col]").forEach((col) => {
    const id = col.dataset.col;
    if (!id || widths[id] != null) return;
    const width = parseFloat(col.style.width);
    const def =
      columns.find((item) => item.id === id) ||
      (id === TASK_SELECT_COL.id ? TASK_SELECT_COL : null);
    widths[id] = Number.isFinite(width) ? width : def?.defaultWidth || 120;
  });
  saveTableLayout(tableId, { order, widths });
}

function moveTableColumn(table, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
  const moveInRow = (row, selector) => {
    const cells = [...row.querySelectorAll(selector)];
    if (!cells[fromIndex] || !cells[toIndex]) return;
    const cell = cells[fromIndex];
    const target = cells[toIndex];
    if (fromIndex < toIndex) {
      target.after(cell);
    } else {
      target.before(cell);
    }
  };
  const colgroup = table.querySelector("colgroup");
  if (colgroup) moveInRow(colgroup, "col[data-col]");
  table.querySelectorAll("thead tr").forEach((row) => moveInRow(row, "th[data-col]"));
  table.querySelectorAll("tbody tr").forEach((row) => moveInRow(row, "td[data-col]"));
}

function bindProjectTableColumns(root = content) {
  root.querySelectorAll("table.is-col-customizable[data-table]").forEach((table) => {
    const tableId = table.dataset.table;
    const columns = columnsDefForTable(tableId);
    if (!columns) return;

    let dragFromIndex = -1;

    table.querySelectorAll("thead tr:not(.filter-row) th[data-col]").forEach((th) => {
      const pinnedSelect = th.dataset.col === TASK_SELECT_COL.id;
      if (pinnedSelect) th.draggable = false;

      th.addEventListener("dragstart", (event) => {
        if (pinnedSelect || event.target.closest('[data-role="col-resize"]')) {
          event.preventDefault();
          return;
        }
        dragFromIndex = [...th.parentElement.querySelectorAll("th[data-col]")].indexOf(th);
        th.classList.add("is-col-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", th.dataset.col || "");
      });

      th.addEventListener("dragend", () => {
        th.classList.remove("is-col-dragging");
        table.querySelectorAll("thead th").forEach((item) => item.classList.remove("is-col-drop"));
        dragFromIndex = -1;
      });

      th.addEventListener("dragover", (event) => {
        if (pinnedSelect) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        th.classList.add("is-col-drop");
      });

      th.addEventListener("dragleave", () => {
        th.classList.remove("is-col-drop");
      });

      th.addEventListener("drop", (event) => {
        event.preventDefault();
        th.classList.remove("is-col-drop");
        if (pinnedSelect) return;
        const fromCol = event.dataTransfer.getData("text/plain") || "";
        if (fromCol === TASK_SELECT_COL.id) return;
        const headers = [...th.parentElement.querySelectorAll("th[data-col]")];
        const fromIndex =
          dragFromIndex >= 0
            ? dragFromIndex
            : headers.findIndex((item) => item.dataset.col === fromCol);
        const toIndex = headers.indexOf(th);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
        if (headers[fromIndex]?.dataset.col === TASK_SELECT_COL.id) return;
        moveTableColumn(table, fromIndex, toIndex);
        persistTableDomLayout(table);
        dragFromIndex = -1;
      });

      const handle = th.querySelector('[data-role="col-resize"]');
      if (!handle) return;

      handle.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        th.draggable = false;

        const colId = th.dataset.col;
        const colEl = table.querySelector(`colgroup col[data-col="${colId}"]`);
        const def =
          columns.find((item) => item.id === colId) ||
          (colId === TASK_SELECT_COL.id ? TASK_SELECT_COL : null);
        const startX = event.clientX;
        const startWidth = colEl
          ? parseFloat(colEl.style.width) || th.getBoundingClientRect().width
          : th.getBoundingClientRect().width;
        const min = def?.min || 60;

        const onMove = (moveEvent) => {
          const next = Math.max(min, startWidth + (moveEvent.clientX - startX));
          if (colEl) colEl.style.width = `${next}px`;
          th.style.width = `${next}px`;
        };

        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          document.body.classList.remove("is-col-resizing");
          th.draggable = !pinnedSelect;
          persistTableDomLayout(table);
        };

        document.body.classList.add("is-col-resizing");
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    });
  });
}

function bindDocumentPdfDownloads(root = content) {
  root.querySelectorAll('[data-role="download-doc-pdf"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const project = getProjectById(btn.dataset.projectId);
      if (!project) return;
      const doc = (project.formalSurvey?.documents || []).find(
        (item) => item.id === btn.dataset.docId
      );
      if (!doc) {
        showTypeToast("Nie znaleziono dokumentu do pobrania");
        return;
      }
      downloadDocumentPdf(project, doc);
    });
  });
}

function bindProjectAttachmentsFilter() {
  const panel = content.querySelector('[data-role="project-attachments"]');
  if (!panel) return;

  const nameInput = panel.querySelector('[data-role="filter-attachment-name"]');
  const categorySelect = panel.querySelector('[data-role="filter-attachment-category"]');
  const countEl = panel.querySelector('[data-role="attachment-filter-count"]');
  const emptyEl = panel.querySelector('[data-role="attachment-filter-empty"]');
  const rows = Array.from(panel.querySelectorAll("tbody tr"));

  const applyFilter = () => {
    const query = (nameInput?.value || "").trim().toLowerCase();
    const category = categorySelect?.value || "";
    let visible = 0;

    rows.forEach((row) => {
      const name = row.dataset.fileName || "";
      const rowCategory = row.dataset.fileCategory || "";
      const matchName = !query || name.includes(query);
      const matchCategory = !category || rowCategory === category;
      const show = matchName && matchCategory;
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (countEl) {
      countEl.textContent =
        visible === rows.length ? `${rows.length} plików` : `${visible} z ${rows.length} plików`;
    }
    if (emptyEl) emptyEl.hidden = visible > 0;
  };

  nameInput?.addEventListener("input", applyFilter);
  categorySelect?.addEventListener("change", applyFilter);
}

function collectDocFormData(form) {
  const data = {};
  const docId = form.dataset.docId;
  if (!docId) return data;
  const prefix = `${docId}__`;
  new FormData(form).forEach((value, key) => {
    if (!key.startsWith(prefix)) return;
    data[key.slice(prefix.length)] = String(value || "");
  });
  return data;
}

function bindTaskDescriptionEditors(projectId) {
  content.querySelectorAll('[data-role="task-description-input"]').forEach((input) => {
    const save = () => {
      const id = input.dataset.projectId || projectId;
      const taskId = input.dataset.taskId;
      if (!id || !taskId) return;
      const previous = getTaskDescription(getProjectById(id), taskId);
      const next = String(input.value || "").trim();
      if (previous === next) return;
      persistTaskDescription(id, taskId, next);
      input.value = next;
      showTypeToast(next ? "Zapisano opis zadania" : "Usunięto opis zadania");
    };
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("blur", save);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        input.blur();
      }
    });
  });
}

function bindProjectDocForms(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;

  content.querySelectorAll(".project-fold-summary .ghost-btn, .project-fold-summary .icon-action-btn, .doc-form-summary-actions button").forEach((btn) => {
    btn.addEventListener("click", (event) => event.stopPropagation());
  });

  content.querySelectorAll('[data-role="doc-form"]').forEach((form) => {
    form.querySelectorAll('[data-role="assist-field"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        runAssist(() => fillFieldSample(btn.dataset.fieldName, project));
      });
    });

    form.querySelectorAll('[data-role="assist-section"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const section = btn.closest("details");
        if (section && !section.open) section.open = true;
        const parentDoc = form.closest("details.doc-form-item");
        if (parentDoc && !parentDoc.open) parentDoc.open = true;
        runAssist(() => fillSectionSample(btn.dataset.section, project));
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const docId = form.dataset.docId;
      if (!docId) return;
      if (persistDocFormFromDom(projectId, docId)) {
        showFormSavedToast("Zapisano zmiany");
      }
    });
  });

  // Whole-document assist on doc item summary or task form region header
  content
    .querySelectorAll(
      "details.doc-form-item > summary [data-role='assist-section'], .doc-task-form-region-head [data-role='assist-section']"
    )
    .forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const section = btn.closest("details");
        if (section && !section.open) section.open = true;
        const key = String(btn.dataset.section || "");
        const docId = key.startsWith("doc:") ? key.slice(4).split(":")[0] : "";
        const form = docId
          ? content.querySelector(`[data-role="doc-form"][data-doc-id="${docId}"]`)
          : null;
        form?.querySelectorAll("details.doc-form-section, details.form-section").forEach((block) => {
          block.open = true;
        });
        updateFormSaveFabVisibility();
        runAssist(() => fillSectionSample(btn.dataset.section, project));
      });
    });

  bindTaskDescriptionEditors(projectId);

  const dedicatedDocPanel = content.querySelector(".doc-form-panel.doc-task-view");
  if (dedicatedDocPanel) {
    const form = dedicatedDocPanel.querySelector('[data-role="doc-form"]');
    bindFormSaveChrome(projectId, "doc", form?.dataset.docId || "");
  }
}

/** @type {{ projectId: string | null, answers: Record<string, string | string[]>, step: number }} */
let surveyDraft = {
  projectId: null,
  answers: createEmptySurveyAnswers(),
  step: 0,
};

function initSurveyDraft(project) {
  const saved = project.formalSurvey?.answers || {};
  surveyDraft = {
    projectId: project.id,
    answers: {
      ...createEmptySurveyAnswers(),
      ...saved,
      media: Array.isArray(saved.media) ? [...saved.media] : [],
    },
    step: 0,
  };
}

function refreshSurveyPanel(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;
  const main = content.querySelector(".detail-main");
  if (!main) return;
  main.innerHTML = formalSurveyPanelHtml(project, surveyDraft.answers, surveyDraft.step);
  bindFormalSurvey(projectId);
}

function bindFormalSurvey(projectId) {
  const wrap = content.querySelector(".survey-wrap");
  if (!wrap) return;

  wrap.querySelectorAll('.survey-question input[type="radio"]').forEach((input) => {
    input.addEventListener("change", () => {
      const questionId = wrap.querySelector(".survey-question")?.dataset.questionId;
      if (!questionId) return;
      surveyDraft.answers[questionId] = input.value;
      refreshSurveyPanel(projectId);
    });
  });

  wrap.querySelectorAll('.survey-question input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", () => {
      const questionId = wrap.querySelector(".survey-question")?.dataset.questionId;
      if (!questionId) return;
      const checked = [...wrap.querySelectorAll(`input[name="survey-${questionId}"]:checked`)].map(
        (el) => el.value
      );
      surveyDraft.answers[questionId] = checked;
      refreshSurveyPanel(projectId);
    });
  });

  wrap.querySelector('[data-role="survey-prev"]')?.addEventListener("click", () => {
    surveyDraft.step = Math.max(0, surveyDraft.step - 1);
    refreshSurveyPanel(projectId);
  });

  wrap.querySelector('[data-role="survey-next"]')?.addEventListener("click", () => {
    const question = SURVEY_QUESTIONS[surveyDraft.step];
    if (!question) return;
    const value = surveyDraft.answers[question.id];
    if (question.type === "single" && !value) {
      showTypeToast("Wybierz odpowiedź, aby przejść dalej");
      return;
    }
    surveyDraft.step = Math.min(SURVEY_QUESTIONS.length - 1, surveyDraft.step + 1);
    refreshSurveyPanel(projectId);
  });

  wrap.querySelector('[data-role="survey-save"]')?.addEventListener("click", () => {
    const unanswered = SURVEY_QUESTIONS.find((question) => {
      if (question.type === "multi") return false;
      return !surveyDraft.answers[question.id];
    });
    if (unanswered) {
      showTypeToast("Uzupełnij wszystkie pytania jednokrotnego wyboru");
      return;
    }

    const project = getProjectById(projectId);
    if (!project) return;
    const documents = evaluateFormalSurveyDocuments(surveyDraft.answers);
    const now = new Date().toISOString();
    const mergedDocs =
      typeof mergeSurveyDocumentsAddOnly === "function"
        ? mergeSurveyDocumentsAddOnly(project.formalSurvey?.documents || [], documents)
        : documents;
    const nextProject = {
      ...project,
      formalSurvey: {
        answers: {
          ...surveyDraft.answers,
          media: Array.isArray(surveyDraft.answers.media) ? [...surveyDraft.answers.media] : [],
        },
        documents: mergedDocs,
        completedAt: project.formalSurvey?.completedAt || now,
        updatedAt: now,
      },
      updatedAt: now,
    };
    persistProject(nextProject);
    const added = mergedDocs.length - (project.formalSurvey?.documents?.length || 0);
    showTypeToast(
      added > 0
        ? `Zapisano ankietę — dodano ${added} dokumentów (łącznie ${mergedDocs.length})`
        : `Zapisano ankietę — ${mergedDocs.length} dokumentów`
    );
    setProjectListTab("tasks");
    renderView("project-detail", {
      ...projectOverviewNav(projectId, { listTab: "tasks" }),
      justSavedSurvey: true,
    });
  });

  wrap.querySelector('[data-role="close-formal-survey"]')?.addEventListener("click", () => {
    setProjectListTab("tasks");
    renderView("project-detail", projectOverviewNav(projectId, { listTab: "tasks" }));
  });
}

function bindBuildingProjectsFilters() {
  const panel = content.querySelector('[data-role="building-projects-table"]');
  if (!panel) return;

  const countEl = panel.querySelector('[data-role="building-filter-count"]');
  const emptyEl = panel.querySelector('[data-role="building-filter-empty"]');
  const rows = Array.from(panel.querySelectorAll("tbody tr"));

  const readFilters = () => {
    const next = {};
    panel.querySelectorAll('[data-role="filter-building-col"]').forEach((el) => {
      const key = el.dataset.filterKey;
      if (!key) return;
      next[key] = String(el.value || "").trim();
    });
    buildingProjectsFilters = next;
  };

  const applyFilter = () => {
    readFilters();
    let visible = 0;
    rows.forEach((row) => {
      const match = Object.entries(buildingProjectsFilters).every(([key, raw]) => {
        if (!raw) return true;
        const query = raw.toLowerCase();
        if (["fill", "files", "docs", "docFill"].includes(key)) {
          const value = Number(
            row.dataset[
              key === "docFill"
                ? "filterDocFill"
                : key === "fill"
                  ? "filterFill"
                  : key === "files"
                    ? "filterFiles"
                    : "filterDocs"
            ] || 0
          );
          if (/^\d+$/.test(query)) return value === Number(query);
          if (/^>=\d+$/.test(query)) return value >= Number(query.slice(2));
          if (/^<=\d+$/.test(query)) return value <= Number(query.slice(2));
          if (/^>\d+$/.test(query)) return value > Number(query.slice(1));
          if (/^<\d+$/.test(query)) return value < Number(query.slice(1));
          return String(value).includes(query);
        }
        if (key === "survey") {
          return (row.dataset.filterSurvey || "") === query;
        }
        const map = {
          title: row.dataset.filterTitle || "",
          investor: row.dataset.filterInvestor || "",
          site: row.dataset.filterSite || "",
          category: row.dataset.filterCategory || "",
          plots: row.dataset.filterPlots || "",
          created: row.dataset.filterCreated || "",
          updated: row.dataset.filterUpdated || "",
        };
        return (map[key] || "").includes(query);
      });
      row.hidden = !match;
      if (match) visible += 1;
    });

    if (countEl) {
      countEl.textContent =
        visible === rows.length
          ? `${rows.length} projektów`
          : `${visible} z ${rows.length} projektów`;
    }
    if (emptyEl) emptyEl.hidden = visible > 0;
  };

  panel.querySelectorAll('[data-role="filter-building-col"]').forEach((el) => {
    el.addEventListener("input", applyFilter);
    el.addEventListener("change", applyFilter);
  });

  panel.querySelector('[data-role="clear-building-filters"]')?.addEventListener("click", () => {
    buildingProjectsFilters = {};
    panel.querySelectorAll('[data-role="filter-building-col"]').forEach((el) => {
      el.value = "";
    });
    applyFilter();
  });

  applyFilter();
}

function bindFormsTables(view) {
  content.querySelectorAll('[data-role="sort-table"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.sortKey;
      const state = view === "building-projects" ? buildingProjectsSort : attachmentsSort;
      if (state.key === key) {
        state.dir = state.dir === "asc" ? "desc" : "asc";
      } else {
        state.key = key;
        state.dir = "asc";
      }
      renderView(view);
    });
  });

  content.querySelectorAll('[data-role="preview-building-form"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      renderView("project-detail", {
        projectId: btn.dataset.projectId,
        panel: "building-form",
      });
    });
  });

  content.querySelectorAll('[data-role="delete-project"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      confirmAndDeleteProject(btn.dataset.projectId);
    });
  });

  content.querySelectorAll('[data-role="generate-building-project"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startGenerateProject(btn.dataset.projectId);
    });
  });

  content.querySelectorAll('[data-role="download-attachment"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      const project = getProjectById(btn.dataset.projectId);
      const file = project?.files?.find((item) => String(item.id) === String(btn.dataset.fileId));
      if (!file) return;
      downloadAttachmentMock(file);
      showTypeToast(`Pobrano: ${file.name}`);
    });
  });

  if (view === "building-projects") bindBuildingProjectsFilters();
  bindProjectOpeners();
}

function bindProjectOpeners(root = content) {
  root.querySelectorAll("[data-project-id]").forEach((el) => {
    if (
      el.dataset.role === "edit-project" ||
      el.dataset.role === "open-building-form" ||
      el.dataset.role === "close-building-form" ||
      el.dataset.role === "project-list-tab" ||
      el.dataset.role === "open-formal-survey" ||
      el.dataset.role === "open-add-task" ||
      el.dataset.role === "open-kpa" ||
      el.dataset.role === "close-kpa" ||
      el.dataset.role === "open-linked-doc" ||
      el.dataset.role === "tasks-table" ||
      el.dataset.role === "tasks-cards" ||
      el.dataset.role === "tasks-flow" ||
      el.dataset.role === "tasks-gantt" ||
      el.dataset.role === "gantt-scale" ||
      el.dataset.role === "tasks-kanban" ||
      el.dataset.role === "close-formal-survey" ||
      el.dataset.role === "close-doc-form" ||
      el.dataset.role === "open-task" ||
      el.dataset.role === "open-attachment-row" ||
      el.dataset.role === "remove-attachment" ||
      el.dataset.role === "edit-attachment-category" ||
      el.dataset.role === "task-owner" ||
      el.dataset.role === "task-status" ||
      el.dataset.role === "task-due" ||
      el.dataset.role === "open-task-due" ||
      el.dataset.role === "task-start" ||
      el.dataset.role === "open-task-start" ||
      el.dataset.role === "task-select" ||
      el.dataset.role === "task-select-all" ||
      el.dataset.role === "task-select-no-dates" ||
      el.dataset.role === "task-select-no-owners" ||
      el.dataset.role === "bulk-task-due" ||
      el.dataset.role === "bulk-task-owner" ||
      el.dataset.role === "filter-task-col" ||
      el.dataset.role === "filter-task-search" ||
      el.dataset.role === "clear-task-filters" ||
      el.dataset.role === "project-attach-input" ||
      el.dataset.role === "generate-building-project" ||
      el.dataset.role === "preview-building-form" ||
      el.dataset.role === "delete-project" ||
      el.dataset.role === "toggle-auto-schedule" ||
      el.dataset.role === "download-attachment" ||
      el.dataset.role === "sort-table" ||
      el.dataset.role === "filter-building-col" ||
      el.dataset.role === "clear-building-filters" ||
      el.dataset.role === "survey-prev" ||
      el.dataset.role === "survey-next" ||
      el.dataset.role === "survey-save"
    ) {
      return;
    }
    el.addEventListener("click", (event) => {
      if (el.matches("tr") && event.target.closest("button, a, input, select, textarea")) {
        return;
      }
      event.preventDefault();
      const id = el.dataset.projectId;
      if (id) renderView("project-detail", { projectId: id });
    });
    if (el.matches("tr.is-row-clickable[data-project-id]")) {
      el.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (event.target.closest("button, a, input, select, textarea")) return;
        event.preventDefault();
        const id = el.dataset.projectId;
        if (id) renderView("project-detail", { projectId: id });
      });
    }
  });
}

function openProjectForEdit(projectId) {
  const project = getProjectById(projectId);
  if (!project) {
    renderView("building-projects");
    return;
  }

  editingProjectId = project.id;
  projectFiles = (project.files || []).map((file) => ({ ...file }));
  fileIdSeq =
    projectFiles.reduce((max, file) => {
      const num = Number(String(file.id).replace(/\D/g, "")) || 0;
      return Math.max(max, num + 1);
    }, 1) || 1;

  pageTitle.textContent = "Edycja projektu";
  setActiveNav("new-project");
  content.innerHTML = newProjectHtml();
  bindNewProjectForm();
  bindAiChat();

  const title = document.getElementById("projectTitle");
  const description = document.getElementById("projectDescription");
  const submitBtn = content.querySelector('#projectForm button[type="submit"]');
  const heading = content.querySelector(".form-intro h1");
  const eyebrow = content.querySelector(".form-intro .eyebrow");

  if (title) title.value = project.title || "";
  const code = document.getElementById("projectCode");
  if (code) code.value = project.code || "";
  if (description) description.value = project.description || "";
  if (submitBtn) submitBtn.textContent = "Zapisz zmiany";
  if (heading) heading.textContent = "Edycja projektu";
  if (eyebrow) eyebrow.textContent = "Zapisany projekt";
  updateFilesUi();
  if (typeof notifyTutorial === "function") notifyTutorial("edit");
}

function recentProjectsWatermarkHtml() {
  return `
    <div class="projects-watermark">
      <div class="watermark-visual" aria-hidden="true">
        <div class="orb orb-a"></div>
        <div class="orb orb-b"></div>
        <div class="doc-stack">
          <div class="doc-sheet s1"></div>
          <div class="doc-sheet s2"></div>
          <div class="doc-sheet s3">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
      <p class="watermark-title">Brak zapisanych projektów</p>
      <p class="watermark-hint">Użyj „Dodaj nowy projekt”, aby zacząć</p>
    </div>`;
}

function recentTasksWatermarkHtml() {
  return `
    <div class="projects-watermark tasks-watermark">
      <div class="watermark-visual" aria-hidden="true">
        <div class="orb orb-a"></div>
        <div class="orb orb-b"></div>
        <div class="doc-stack">
          <div class="doc-sheet s1"></div>
          <div class="doc-sheet s2"></div>
          <div class="doc-sheet s3">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
      <p class="watermark-title">Brak zadań</p>
      <p class="watermark-hint">Tu pojawią się zadania — system zadań wkrótce</p>
    </div>`;
}

function ensureRecentProjectsBody() {
  let panel =
    content.querySelector(".recent-projects-panel") ||
    content.querySelector(".dashboard-split > .panel");

  if (!panel) return null;
  panel.classList.add("recent-projects-panel");

  let body =
    panel.querySelector("#recentProjectsBody") ||
    panel.querySelector(".recent-projects-body");

  if (!body) {
    const strayList = panel.querySelector(":scope > .doc-list");
    body = document.createElement("div");
    body.id = "recentProjectsBody";
    body.className = "recent-projects-body";
    if (strayList) strayList.replaceWith(body);
    else panel.appendChild(body);
  }

  return body;
}

function globalTasksTableHtml() {
  const rows = collectAllProjectTasks();
  const projects = loadProjects();
  if (!rows.length) {
    return `<p class="files-empty-inline">Brak zadań we wszystkich projektach.</p>`;
  }

  const ownerById = new Map();
  rows.forEach(({ project, task }) => {
    const id = String(task.ownerId || NO_OWNER.id);
    if (ownerById.has(id)) return;
    ownerById.set(id, ownerLabel(project, task.ownerId));
  });
  const ownerOptions = [...ownerById.entries()].sort((a, b) =>
    String(a[1]).localeCompare(String(b[1]), "pl")
  );
  const statusOptions = getKanbanStatuses();

  return `
    <div class="tasks-table-toolbar table-toolbar">
      <label class="tasks-search search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" stroke-linecap="round" />
        </svg>
        <input
          type="search"
          data-role="filter-global-task-search"
          placeholder="Szukaj zadań…"
          aria-label="Szukaj zadań"
          autocomplete="off"
        />
      </label>
      <p class="table-filter-meta" data-role="global-task-filter-count">${rows.length} zadań</p>
      <button type="button" class="ghost-btn table-action-btn" data-role="clear-global-task-filters">
        Wyczyść filtry
      </button>
    </div>
    <div class="data-table-wrap data-table-lined-wrap">
      <table class="data-table data-table-lined" data-role="global-tasks-table">
        <thead>
          <tr>
            <th>Projekt</th>
            <th>Nazwa</th>
            <th>Właściciel</th>
            <th>Status</th>
            <th>Wykonano</th>
            <th>Data do</th>
          </tr>
          <tr class="filter-row">
            <th>
              <select
                class="column-filter"
                data-role="filter-global-task-col"
                data-filter-key="project"
                aria-label="Filtr projektu"
              >
                <option value="">Wszystkie</option>
                ${projects
                  .map(
                    (p) =>
                      `<option value="${escapeHtml(p.id)}">${escapeHtml(p.title || "Projekt")}</option>`
                  )
                  .join("")}
              </select>
            </th>
            <th>
              <input
                type="search"
                class="column-filter"
                data-role="filter-global-task-col"
                data-filter-key="name"
                placeholder="Nazwa…"
                aria-label="Filtr nazwy"
                autocomplete="off"
              />
            </th>
            <th>
              <select
                class="column-filter"
                data-role="filter-global-task-col"
                data-filter-key="owner"
                aria-label="Filtr właściciela"
              >
                <option value="">Wszyscy</option>
                ${ownerOptions
                  .map(
                    ([id, label]) =>
                      `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`
                  )
                  .join("")}
              </select>
            </th>
            <th>
              <select
                class="column-filter"
                data-role="filter-global-task-col"
                data-filter-key="status"
                aria-label="Filtr statusu"
              >
                <option value="">Wszystkie</option>
                ${statusOptions
                  .map(
                    (item) =>
                      `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`
                  )
                  .join("")}
              </select>
            </th>
            <th>
              <input
                type="search"
                class="column-filter"
                data-role="filter-global-task-col"
                data-filter-key="progress"
                placeholder="np. >=50"
                aria-label="Filtr postępu"
                autocomplete="off"
              />
            </th>
            <th>
              <input
                type="date"
                class="column-filter column-filter-date"
                data-role="filter-global-task-col"
                data-filter-key="due"
                aria-label="Filtr daty zakończenia"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(({ project, task }) => {
              const dueLabel = task.dueDate ? formatDateOnly(task.dueDate) : "—";
              const ownerName = ownerLabel(project, task.ownerId);
              return `
            <tr
              class="is-row-clickable"
              data-role="open-task"
              data-task-kind="${escapeHtml(task.kind)}"
              data-task-id="${escapeHtml(task.id)}"
              data-project-id="${escapeHtml(project.id)}"
              data-filter-project="${escapeHtml(project.id)}"
              data-filter-name="${escapeHtml(
                `${task.name} ${task.typeLabel || ""}`.toLowerCase()
              )}"
              data-filter-owner="${escapeHtml(String(task.ownerId || NO_OWNER.id))}"
              data-filter-status-key="${escapeHtml(task.statusKey || "")}"
              data-filter-progress="${task.progress || 0}"
              data-filter-due-iso="${escapeHtml(task.dueDate || "")}"
              data-filter-search="${escapeHtml(
                `${project.title} ${task.name} ${task.status} ${ownerName} ${dueLabel}`.toLowerCase()
              )}"
              tabindex="0"
            >
              <td>${escapeHtml(project.title || "Projekt")}</td>
              <td>
                <div class="task-name-cell">
                  <div class="task-name-row">
                    <strong>${escapeHtml(task.name)}</strong>
                    ${taskNameIconsHtml(project, task)}
                  </div>
                </div>
              </td>
              <td>${escapeHtml(ownerName)}</td>
              <td>
                <select
                  class="owner-select status-select"
                  data-role="task-status"
                  data-task-id="${escapeHtml(task.id)}"
                  data-project-id="${escapeHtml(project.id)}"
                  aria-label="Status zadania"
                >
                  ${taskStatusOptionsHtml(task.statusKey)}
                </select>
              </td>
              <td>
                <div class="fill-cell">
                  <div class="fill-bar" aria-hidden="true"><span style="width:${task.progress}%"></span></div>
                  <strong>${task.progress}%</strong>
                </div>
              </td>
              <td>${escapeHtml(dueLabel)}</td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
    <p class="files-empty-inline attachment-filter-empty" data-role="global-task-filter-empty" hidden>
      Brak zadań pasujących do filtrów.
    </p>`;
}

function bindGlobalTasksTableFilters() {
  const panel = content.querySelector('[data-role="project-tasks-panel"][data-global="1"]');
  if (!panel) return;
  const searchInput = panel.querySelector('[data-role="filter-global-task-search"]');
  const countEl = panel.querySelector('[data-role="global-task-filter-count"]');
  const emptyEl = panel.querySelector('[data-role="global-task-filter-empty"]');
  const rows = [...panel.querySelectorAll('tbody tr[data-role="open-task"]')];

  const matchNumberFilter = (raw, value) => {
    const query = String(raw || "").trim().toLowerCase();
    if (!query) return true;
    if (/^\d+$/.test(query)) return value === Number(query);
    if (/^>=\d+$/.test(query)) return value >= Number(query.slice(2));
    if (/^<=\d+$/.test(query)) return value <= Number(query.slice(2));
    if (/^>\d+$/.test(query)) return value > Number(query.slice(1));
    if (/^<\d+$/.test(query)) return value < Number(query.slice(1));
    return String(value).includes(query);
  };

  const apply = () => {
    const filters = {};
    panel.querySelectorAll('[data-role="filter-global-task-col"]').forEach((el) => {
      const key = el.dataset.filterKey;
      if (!key) return;
      filters[key] = String(el.value || "").trim();
    });
    const words = String(searchInput?.value || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    let visible = 0;
    rows.forEach((row) => {
      const colMatch = Object.entries(filters).every(([key, raw]) => {
        if (!raw) return true;
        if (key === "project") return row.dataset.filterProject === raw;
        if (key === "owner") return row.dataset.filterOwner === raw;
        if (key === "status") return row.dataset.filterStatusKey === raw;
        if (key === "due") return row.dataset.filterDueIso === raw;
        if (key === "progress") {
          return matchNumberFilter(raw, Number(row.dataset.filterProgress || 0));
        }
        if (key === "name") {
          return (row.dataset.filterName || "").includes(raw.toLowerCase());
        }
        return true;
      });
      const searchOk = words.every((word) => (row.dataset.filterSearch || "").includes(word));
      const show = colMatch && searchOk;
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (countEl) {
      countEl.textContent =
        visible === rows.length ? `${rows.length} zadań` : `${visible} z ${rows.length} zadań`;
    }
    if (emptyEl) emptyEl.hidden = visible > 0;
  };

  panel.querySelectorAll('[data-role="filter-global-task-col"]').forEach((el) => {
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
    el.addEventListener("click", (event) => event.stopPropagation());
  });
  searchInput?.addEventListener("input", apply);
  panel.querySelector('[data-role="clear-global-task-filters"]')?.addEventListener("click", () => {
    panel.querySelectorAll('[data-role="filter-global-task-col"]').forEach((el) => {
      el.value = "";
    });
    if (searchInput) searchInput.value = "";
    apply();
  });
  apply();
}

function tasksCalendarViewHtml() {
  const projects = loadProjects();
  if (!projects.length) {
    return `
      <section class="projects-view">
        <header class="form-intro form-intro-row">
          <div class="form-intro-copy">
            <p class="eyebrow">Workspace</p>
            <h1>Kalendarz zadań</h1>
            <p class="lede form-lede">Zadania ze wszystkich projektów w jednym miejscu.</p>
          </div>
          <button class="ghost-btn" type="button" data-view="dashboard">Wróć do pulpitu</button>
        </header>
        <div class="projects-empty panel">
          <p>Brak projektów — utwórz pierwszy, aby zobaczyć zadania.</p>
          <button class="primary-btn" type="button" data-view="new-project">Nowy projekt</button>
        </div>
      </section>`;
  }
  const focus = projects[0];
  return `
    <section class="projects-view tasks-calendar-view">
      <header class="form-intro form-intro-row">
        <div class="form-intro-copy">
          <p class="eyebrow">Workspace</p>
          <h1>Kalendarz zadań</h1>
          <p class="lede form-lede">
            Lista wszystkich zadań z projektów — filtruj po projekcie, właścicielu i statusie.
          </p>
        </div>
        <button class="ghost-btn" type="button" data-view="dashboard">Wróć do pulpitu</button>
      </header>
      ${projectTasksPanelHtml(focus, { global: true })}
    </section>`;
}

function placeholderViewHtml(title, description) {
  return `
    <section class="projects-view">
      <header class="form-intro">
        <div class="form-intro-copy">
          <p class="eyebrow">Workspace</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="lede form-lede">${escapeHtml(description)}</p>
        </div>
      </header>
      <div class="projects-empty panel">
        <p>${escapeHtml(description)}</p>
        <button class="primary-btn" type="button" data-view="dashboard">Wróć do pulpitu</button>
      </div>
    </section>`;
}

function clearMockData() {
  const confirmed = window.confirm(
    "Wyczyścić wszystkie dane mockupu (projekty, ankiety, załączniki) z tej przeglądarki?"
  );
  if (!confirmed) return;

  localStorage.removeItem(PROJECTS_STORAGE_KEY);
  projectFiles = [];
  fileIdSeq = 1;
  editingProjectId = null;
  surveyDraft = {
    projectId: null,
    answers: createEmptySurveyAnswers(),
    step: 0,
  };
  showTypeToast("Dane mockupu zostały wyczyszczone");
  renderView("dashboard");
}

function hydrateDashboard() {
  const projects = loadProjects();

  content.querySelectorAll('[data-role="clear-mock-data"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      clearMockData();
    });
  });

  const panelHead = content.querySelector(".recent-projects-panel .panel-head h2");
  if (panelHead) panelHead.textContent = "Projekty";

  const link = content.querySelector(".recent-projects-panel .panel-head .text-link");
  if (link) {
    link.setAttribute("data-view", "building-projects");
    link.onclick = (event) => {
      event.preventDefault();
      renderView("building-projects");
    };
  }

  const body = ensureRecentProjectsBody();
  if (body) {
    if (projects.length === 0) {
      body.innerHTML = recentProjectsWatermarkHtml();
    } else {
      body.innerHTML = `
    <ul class="doc-list">
      ${projects
        .slice(0, 5)
        .map(
          (project) => `
      <li>
        <button type="button" class="doc-open" data-project-id="${project.id}">
          <div>
            <strong>${escapeHtml(project.title)}</strong>
            <span>${formatDate(project.createdAt)} · ${
            project.files?.length || 0
          } załączników</span>
          </div>
        </button>
      </li>`
        )
        .join("")}
    </ul>`;
      bindProjectOpeners(body);
    }
  }
}

function buildDocumentDeepLink(projectId, kind, linkId) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("view", "project-detail");
  url.searchParams.set("projectId", projectId);
  if (kind === "building") {
    url.searchParams.set("panel", "building-form");
  } else if (kind === "survey-doc") {
    url.searchParams.set("panel", "doc-form");
    url.searchParams.set("docId", String(linkId));
  } else if (kind === "attachment") {
    url.searchParams.set("panel", "overview");
    url.searchParams.set("listTab", "attachments");
    url.searchParams.set("fileId", String(linkId));
  }
  return url.toString();
}

function openLinkedDocument(projectId, kind, linkId, { newTab = false } = {}) {
  if (newTab) {
    window.open(buildDocumentDeepLink(projectId, kind, linkId), "_blank", "noopener,noreferrer");
    return;
  }
  const project = getProjectById(projectId);
  if (!project) return;
  if (kind === "building") {
    navigateProjectPanel(projectId, { panel: "building-form" });
    return;
  }
  if (kind === "survey-doc") {
    navigateProjectPanel(projectId, {
      panel: "doc-form",
      focusDocId: linkId,
    });
    return;
  }
  if (kind === "attachment") {
    const file = (project.files || []).find((item) => String(item.id) === String(linkId));
    if (!file) {
      showTypeToast("Nie znaleziono załącznika");
      return;
    }
    downloadAttachmentMock(file);
    showTypeToast(`Pobrano: ${file.name}`);
  }
}

function applyUrlBootstrap() {
  const fromUrl = readNavFromUrl();
  const fromSession = readNavFromSession();
  const state = fromUrl || fromSession;
  if (!state?.view) {
    hydrateDashboard();
    return;
  }

  if (state.options?.listTab) setProjectListTab(state.options.listTab);

  navBootstrapActive = true;
  renderView(state.view, {
    ...state.options,
    panel: state.options?.panel || "overview",
  });

  if (fromUrl?.fileId && state.view === "project-detail" && state.options?.projectId) {
    const project = getProjectById(state.options.projectId);
    const file = (project?.files || []).find(
      (item) => String(item.id) === String(fromUrl.fileId)
    );
    if (file) {
      window.setTimeout(() => {
        downloadAttachmentMock(file);
        showTypeToast(`Pobrano: ${file.name}`);
      }, 250);
    }
  }
}

const KPA_CONFIG_KEY = "snappoint.kpaConfig";
const KPA_OWNER_COLORS = [
  "#2563eb",
  "#0d9488",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#0891b2",
  "#4f46e5",
  "#65a30d",
];

function defaultKpaConfig() {
  return {
    showStatus: true,
    showOwners: true,
    showTypes: false,
  };
}

function loadKpaConfig() {
  try {
    const raw = localStorage.getItem(KPA_CONFIG_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return defaultKpaConfig();
    return {
      showStatus: parsed.showStatus !== false,
      showOwners: parsed.showOwners !== false,
      showTypes: Boolean(parsed.showTypes),
    };
  } catch {
    return defaultKpaConfig();
  }
}

function saveKpaConfig(config) {
  try {
    localStorage.setItem(KPA_CONFIG_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

function kpaStatusColor(statusId) {
  const map = {
    todo: "#64748b",
    pending: "#64748b",
    progress: "#2563eb",
    in_progress: "#2563eb",
    doing: "#2563eb",
    review: "#0d9488",
    waiting: "#0d9488",
    done: "#15803d",
    complete: "#15803d",
    completed: "#15803d",
  };
  if (map[statusId]) return map[statusId];
  let hash = 0;
  const key = String(statusId || "");
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return KPA_OWNER_COLORS[hash % KPA_OWNER_COLORS.length];
}

function kpaOwnerColor(ownerId, index) {
  if (ownerId === NO_OWNER.id || !ownerId) return "#94a3b8";
  if (ownerId === CLIENT_OWNER.id) return "#c2410c";
  return KPA_OWNER_COLORS[index % KPA_OWNER_COLORS.length];
}

function buildKpaSegments(counts, colorFn) {
  return counts
    .filter((item) => item.value > 0)
    .map((item, index) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      color: colorFn(item, index),
    }));
}

function kpaPolar(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function kpaDonutSvg(segments, { size = 168, hole = 0.58, centerLabel = "" } = {}) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 2;
  const inner = outer * hole;
  if (!total) {
    return `
      <svg class="kpa-donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
        <circle cx="${cx}" cy="${cy}" r="${outer}" fill="none" stroke="rgba(127,127,127,0.25)" stroke-width="${
          outer - inner
        }" />
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" class="kpa-donut-center">0</text>
      </svg>`;
  }
  if (segments.length === 1) {
    const only = segments[0];
    return `
      <svg class="kpa-donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${escapeHtml(
        centerLabel || String(total)
      )}">
        <circle cx="${cx}" cy="${cy}" r="${(outer + inner) / 2}" fill="none" stroke="${escapeHtml(
          only.color
        )}" stroke-width="${outer - inner}" />
        <circle cx="${cx}" cy="${cy}" r="${inner}" fill="var(--surface-deep, #04141a)" />
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="kpa-donut-center">${total}</text>
        <text x="${cx}" y="${cy + 12}" text-anchor="middle" class="kpa-donut-sub">łącznie</text>
      </svg>`;
  }

  let angle = 0;
  const paths = segments
    .map((seg) => {
      const sweep = (seg.value / total) * 360;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      const large = sweep > 180 ? 1 : 0;
      const p1 = kpaPolar(cx, cy, outer, start);
      const p2 = kpaPolar(cx, cy, outer, end);
      const p3 = kpaPolar(cx, cy, inner, end);
      const p4 = kpaPolar(cx, cy, inner, start);
      const d = [
        `M ${p1.x} ${p1.y}`,
        `A ${outer} ${outer} 0 ${large} 1 ${p2.x} ${p2.y}`,
        `L ${p3.x} ${p3.y}`,
        `A ${inner} ${inner} 0 ${large} 0 ${p4.x} ${p4.y}`,
        "Z",
      ].join(" ");
      return `<path d="${d}" fill="${escapeHtml(seg.color)}" title="${escapeHtml(
        `${seg.label}: ${seg.value}`
      )}"><title>${escapeHtml(seg.label)}: ${seg.value}</title></path>`;
    })
    .join("");

  return `
    <svg class="kpa-donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${escapeHtml(
      centerLabel || String(total)
    )}">
      ${paths}
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="kpa-donut-center">${total}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" class="kpa-donut-sub">łącznie</text>
    </svg>`;
}

function kpaLegendHtml(segments, total) {
  if (!segments.length) {
    return `<p class="kpa-empty-hint">Brak danych do wyświetlenia</p>`;
  }
  return `
    <ul class="kpa-legend">
      ${segments
        .map((seg) => {
          const pct = total ? Math.round((seg.value / total) * 100) : 0;
          return `
        <li>
          <span class="kpa-swatch" style="background:${escapeHtml(seg.color)}"></span>
          <span class="kpa-legend-label">${escapeHtml(seg.label)}</span>
          <span class="kpa-legend-value">${seg.value}</span>
          <span class="kpa-legend-pct">${pct}%</span>
        </li>`;
        })
        .join("")}
    </ul>`;
}

function kpaChartCardHtml(title, segments) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  return `
    <article class="kpa-card">
      <header class="kpa-card-head">
        <h3>${escapeHtml(title)}</h3>
        <span class="kpa-card-count">${total} zadań</span>
      </header>
      <div class="kpa-card-body">
        ${kpaDonutSvg(segments, { centerLabel: title })}
        ${kpaLegendHtml(segments, total)}
      </div>
    </article>`;
}

function buildProjectKpaData(project) {
  const tasks = collectProjectTasks(project);
  const statuses = getKanbanStatuses();
  const statusCounts = statuses.map((status) => ({
    id: status.id,
    label: status.label,
    value: tasks.filter((task) => task.statusKey === status.id).length,
  }));
  const unknownStatus = tasks.filter(
    (task) => !statuses.some((status) => status.id === task.statusKey)
  ).length;
  if (unknownStatus) {
    statusCounts.push({ id: "other", label: "Inne", value: unknownStatus });
  }

  const ownerMap = new Map();
  getTaskOwnerOptions(project).forEach((opt) => {
    ownerMap.set(opt.id, { id: opt.id, label: opt.name, value: 0 });
  });
  tasks.forEach((task) => {
    const id = String(task.ownerId || NO_OWNER.id);
    if (!ownerMap.has(id)) {
      ownerMap.set(id, { id, label: ownerLabel(project, id), value: 0 });
    }
    ownerMap.get(id).value += 1;
  });
  const ownerCounts = [...ownerMap.values()];

  const typeMap = new Map();
  getTaskTypes().forEach((type) => {
    typeMap.set(type.id, { id: type.id, label: type.label, value: 0 });
  });
  tasks.forEach((task) => {
    const id = String(task.typeId || task.taskTypeId || "document");
    const label =
      getTaskTypes().find((type) => type.id === id)?.label ||
      task.typeLabel ||
      task.type ||
      id;
    if (!typeMap.has(id)) typeMap.set(id, { id, label, value: 0 });
    typeMap.get(id).value += 1;
  });

  return {
    total: tasks.length,
    statusSegments: buildKpaSegments(statusCounts, (item) => kpaStatusColor(item.id)),
    ownerSegments: buildKpaSegments(ownerCounts, (item, index) =>
      kpaOwnerColor(item.id, index)
    ),
    typeSegments: buildKpaSegments([...typeMap.values()], (item, index) =>
      KPA_OWNER_COLORS[(index + 2) % KPA_OWNER_COLORS.length]
    ),
  };
}

function kpaChartsHtml(project, config) {
  const data = buildProjectKpaData(project);
  const cards = [];
  if (config.showStatus) cards.push(kpaChartCardHtml("Statusy", data.statusSegments));
  if (config.showOwners) cards.push(kpaChartCardHtml("Użytkownicy", data.ownerSegments));
  if (config.showTypes) cards.push(kpaChartCardHtml("Typy zadań", data.typeSegments));
  if (!cards.length) {
    return `<p class="kpa-empty-hint">Włącz co najmniej jedną kategorię w konfiguracji po lewej stronie.</p>`;
  }
  return `<div class="kpa-charts">${cards.join("")}</div>`;
}

function projectKpaPanelHtml(project) {
  const config = loadKpaConfig();
  const data = buildProjectKpaData(project);
  return `
    <div class="kpa-page" data-role="kpa-page" data-project-id="${escapeHtml(project.id)}">
      <header class="kpa-page-head">
        <div class="kpa-page-intro">
          <p class="eyebrow">KPA</p>
          <h2>Kluczowe parametry zadań</h2>
          <p class="kpa-page-lead">
            Przegląd obciążenia projektu w formie diagramów kołowych: rozkład zadań według
            statusów, użytkowników oraz typów. Wybierz po lewej, które zestawienia chcesz widzieć —
            ustawienia zapisują się w tej przeglądarce.
          </p>
          <p class="kpa-page-meta">
            <strong>${data.total}</strong> zadań w projekcie
            · ${escapeHtml(project.title || "Projekt")}
          </p>
        </div>
        <button
          type="button"
          class="ghost-btn"
          data-role="close-kpa"
          data-project-id="${escapeHtml(project.id)}"
        >
          Wróć do zadań
        </button>
      </header>

      <div class="kpa-page-layout">
        <aside class="kpa-config" aria-label="Konfiguracja widoku KPA">
          <p class="kpa-config-title">Co widzieć</p>
          <p class="kpa-config-desc">Zaznacz kategorie diagramów wyświetlanych na stronie.</p>
          <label class="kpa-config-option">
            <input type="checkbox" data-role="kpa-toggle" data-key="showStatus" ${
              config.showStatus ? "checked" : ""
            } />
            <span>
              <strong>Statusy zadań</strong>
              <em>Kolory odpowiadają statusom Kanban / Gantt</em>
            </span>
          </label>
          <label class="kpa-config-option">
            <input type="checkbox" data-role="kpa-toggle" data-key="showOwners" ${
              config.showOwners ? "checked" : ""
            } />
            <span>
              <strong>Użytkownicy i ilości</strong>
              <em>Ile zadań ma przypisany każdy właściciel</em>
            </span>
          </label>
          <label class="kpa-config-option">
            <input type="checkbox" data-role="kpa-toggle" data-key="showTypes" ${
              config.showTypes ? "checked" : ""
            } />
            <span>
              <strong>Typy zadań</strong>
              <em>Dokumenty i pozostałe typy z konfiguracji</em>
            </span>
          </label>
        </aside>
        <div class="kpa-charts-wrap" data-role="kpa-charts">
          ${kpaChartsHtml(project, config)}
        </div>
      </div>
    </div>`;
}

function bindKpaPanel(projectId) {
  const root = content.querySelector('[data-role="kpa-page"]');
  if (!root) return;
  const project = getProjectById(projectId || root.dataset.projectId);
  if (!project) return;

  root.querySelectorAll('[data-role="close-kpa"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      setProjectListTab("tasks");
      navigateProjectPanel(btn.dataset.projectId || project.id, { listTab: "tasks" });
    });
  });

  root.querySelectorAll('[data-role="kpa-toggle"]').forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.key;
      if (!key) return;
      const config = { ...loadKpaConfig(), [key]: input.checked };
      saveKpaConfig(config);
      const wrap = root.querySelector('[data-role="kpa-charts"]');
      if (wrap) wrap.innerHTML = kpaChartsHtml(project, config);
    });
  });
}

function openAddTaskModal(projectId, options = {}) {
  const project = getProjectById(projectId);
  if (!project) return;
  const types = getTaskTypes();
  const docOptions = collectLinkedDocumentOptions(project);
  const presetKind = options.linkedKind || "";
  const presetId = options.linkedId || "";
  const parentTaskId = options.parentTaskId || "";
  const parentTask = parentTaskId
    ? collectProjectTasks(project).find((item) => String(item.id) === String(parentTaskId))
    : null;
  const presetValue =
    presetKind && presetId ? `${presetKind}:${presetId}` : "";
  const presetLabel = presetValue
    ? docOptions.find((item) => item.value === presetValue)?.name ||
      resolveLinkedDocLabel(project, { kind: presetKind, id: presetId }) ||
      "Dokument"
    : "";

  let modal = document.getElementById("addTaskModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "addTaskModal";
    modal.className = "category-modal";
    modal.hidden = true;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-add-task-modal"></div>
    <div class="category-modal-dialog add-task-dialog" role="dialog" aria-modal="true" aria-labelledby="addTaskModalTitle">
      <header class="category-modal-head">
        <div>
          <p class="eyebrow">${parentTask ? "Podzadanie" : "Nowe zadanie"}</p>
          <h2 id="addTaskModalTitle">${
            parentTask
              ? `Dodaj do: ${escapeHtml(parentTask.name)}`
              : presetValue
                ? "Dodaj zadanie powiązane"
                : "Dodaj zadanie"
          }</h2>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-add-task-modal" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body add-task-form">
        <label class="field">
          <span class="field-label">Nazwa zadania</span>
          <input id="addTaskName" type="text" required placeholder="np. Uzgodnienie instalacji" />
        </label>
        <label class="field">
          <span class="field-label">Opis</span>
          <textarea
            id="addTaskDescription"
            rows="3"
            placeholder="Opcjonalny opis zadania…"
          ></textarea>
        </label>
        <div class="fields-row">
          <label class="field">
            <span class="field-label">Data rozpoczęcia</span>
            <input id="addTaskStart" type="date" class="due-date-input due-date-input-block" />
          </label>
          <label class="field">
            <span class="field-label">Data zakończenia prac</span>
            <input id="addTaskDue" type="date" class="due-date-input due-date-input-block" />
          </label>
        </div>
        <label class="field">
          <span class="field-label">Wykonawca</span>
          <select id="addTaskOwner" class="owner-select owner-select-block">
            ${taskOwnerOptionsHtml(project, NO_OWNER.id)}
          </select>
        </label>
        <label class="field">
          <span class="field-label">Typ zadania</span>
          <select id="addTaskType" class="owner-select owner-select-block">
            ${types
              .map(
                (type) =>
                  `<option value="${escapeHtml(type.id)}">${escapeHtml(type.label)}</option>`
              )
              .join("")}
          </select>
        </label>
        <div class="field">
          <span class="field-label">Dokument powiązany (opcjonalnie)</span>
          <div class="linked-doc-picker-field">
            <input type="hidden" id="addTaskLinkedDoc" value="" />
            <div class="linked-doc-selected" data-role="linked-doc-selected">
              <span data-role="linked-doc-label">Brak dokumentu</span>
              <button
                type="button"
                class="linked-doc-clear"
                data-role="clear-linked-doc"
                title="Usuń powiązanie"
                aria-label="Usuń powiązanie"
                hidden
              >
                ×
              </button>
            </div>
            <button
              type="button"
              class="tool-btn tool-btn-green linked-doc-add-btn"
              data-role="open-linked-doc-picker"
              title="Wybierz dokument"
              aria-label="Wybierz dokument powiązany"
            >
              <span class="tool-btn-plus" aria-hidden="true">+</span>
            </button>
          </div>
        </div>
      </div>
      <footer class="category-modal-foot">
        <button type="button" class="ghost-btn" data-role="close-add-task-modal">Anuluj</button>
        <button type="button" class="primary-btn" data-role="save-add-task" data-project-id="${project.id}">
          Dodaj zadanie
        </button>
      </footer>
    </div>
  `;

  modal.hidden = false;
  document.body.classList.add("modal-open");

  const setLinkedDocSelection = (value, label) => {
    const hidden = modal.querySelector("#addTaskLinkedDoc");
    const labelEl = modal.querySelector('[data-role="linked-doc-label"]');
    const clearBtn = modal.querySelector('[data-role="clear-linked-doc"]');
    if (hidden) hidden.value = value || "";
    if (labelEl) labelEl.textContent = value ? label : "Brak dokumentu";
    if (clearBtn) clearBtn.hidden = !value;
    modal.querySelector('[data-role="linked-doc-selected"]')?.classList.toggle("has-value", Boolean(value));
  };

  if (presetValue) {
    setLinkedDocSelection(presetValue, presetLabel);
  }

  modal.onclick = (event) => {
    if (event.target.closest('[data-role="close-add-task-modal"]')) {
      closeAddTaskModal();
      return;
    }
    if (event.target.closest('[data-role="open-linked-doc-picker"]')) {
      event.preventDefault();
      openLinkedDocPicker(project.id, (opt) => {
        setLinkedDocSelection(opt.value, opt.name);
      });
      return;
    }
    if (event.target.closest('[data-role="clear-linked-doc"]')) {
      event.preventDefault();
      setLinkedDocSelection("", "");
      return;
    }
    if (event.target.closest('[data-role="save-add-task"]')) {
      const name = modal.querySelector("#addTaskName")?.value.trim();
      if (!name) {
        showTypeToast("Podaj nazwę zadania");
        return;
      }
      const startDate = modal.querySelector("#addTaskStart")?.value || "";
      const dueDate = modal.querySelector("#addTaskDue")?.value || "";
      const description = modal.querySelector("#addTaskDescription")?.value.trim() || "";
      const ownerId = modal.querySelector("#addTaskOwner")?.value || NO_OWNER.id;
      const typeId = modal.querySelector("#addTaskType")?.value || types[0]?.id || "";
      const linkedRaw = modal.querySelector("#addTaskLinkedDoc")?.value || "";
      const linkedParsed = parseLinkedDocValue(linkedRaw);
      const linkedDoc = linkedParsed
        ? {
            ...linkedParsed,
            name:
              docOptions.find((item) => item.value === linkedRaw)?.name ||
              resolveLinkedDocLabel(project, linkedParsed),
          }
        : null;
      const taskId = `task-${Date.now()}`;
      const firstStatus = getKanbanStatuses()[0]?.id || "todo";
      const latest = getProjectById(project.id) || project;
      persistProject({
        ...latest,
        customTasks: [
          ...(latest.customTasks || []),
          {
            id: taskId,
            name,
            typeId,
            description,
            startDate,
            dueDate,
            ownerId,
            linkedDoc,
            parentId: parentTaskId || null,
            updatedAt: new Date().toISOString(),
          },
        ],
        taskOwners: { ...(latest.taskOwners || {}), [taskId]: ownerId },
        taskDescriptions: { ...(latest.taskDescriptions || {}), [taskId]: description },
        taskStartDates: { ...(latest.taskStartDates || {}), [taskId]: startDate },
        taskDueDates: { ...(latest.taskDueDates || {}), [taskId]: dueDate },
        taskBoardStatus: {
          ...(latest.taskBoardStatus || {}),
          [taskId]: firstStatus,
        },
        updatedAt: new Date().toISOString(),
      });
      closeAddTaskModal();
      showTypeToast(`Dodano zadanie: ${name}`);
      if (options.returnTo?.panel === "building-form") {
        navigateProjectPanel(project.id, { panel: "building-form" });
        return;
      }
      if (options.returnTo?.panel === "doc-form") {
        navigateProjectPanel(project.id, {
          panel: "doc-form",
          focusDocId: options.returnTo.focusDocId,
        });
        return;
      }
      if (options.returnTo?.panel === "task-detail") {
        navigateProjectPanel(project.id, {
          panel: "task-detail",
          focusTaskId: options.returnTo.focusTaskId || parentTaskId,
        });
        return;
      }
      setProjectListTab("tasks");
      navigateProjectPanel(project.id, { listTab: "tasks" });
    }
  };
}

function linkedDocKindLabel(kind) {
  if (kind === "building" || kind === "survey-doc") return "Dokument";
  if (kind === "attachment") return "Załącznik";
  return "Pozycja";
}

function ensureLinkedDocPickerModal() {
  let modal = document.getElementById("linkedDocPickerModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "linkedDocPickerModal";
  modal.className = "category-modal linked-doc-picker-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-linked-doc-picker"></div>
    <div class="category-modal-dialog linked-doc-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="linkedDocPickerTitle">
      <header class="category-modal-head">
        <div>
          <p class="eyebrow">Powiązanie</p>
          <h2 id="linkedDocPickerTitle">Wybierz dokument</h2>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-linked-doc-picker" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body">
        <label class="tasks-search search linked-doc-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" stroke-linecap="round" />
          </svg>
          <input
            type="search"
            data-role="linked-doc-search"
            placeholder="Szukaj po nazwie…"
            aria-label="Szukaj dokumentu"
            autocomplete="off"
          />
        </label>
        <p class="table-filter-meta" data-role="linked-doc-count"></p>
        <div class="project-picker-list" data-role="linked-doc-list"></div>
        <p class="picker-empty" data-role="linked-doc-empty" hidden>Brak wyników.</p>
      </div>
      <footer class="category-modal-foot">
        <button type="button" class="ghost-btn" data-role="close-linked-doc-picker">Anuluj</button>
      </footer>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

function closeLinkedDocPicker() {
  const modal = document.getElementById("linkedDocPickerModal");
  if (modal) modal.hidden = true;
}

function openLinkedDocPicker(projectId, onSelect) {
  const project = getProjectById(projectId);
  if (!project) return;
  const options = collectLinkedDocumentOptions(project);
  const modal = ensureLinkedDocPickerModal();
  const list = modal.querySelector('[data-role="linked-doc-list"]');
  const empty = modal.querySelector('[data-role="linked-doc-empty"]');
  const countEl = modal.querySelector('[data-role="linked-doc-count"]');
  const searchInput = modal.querySelector('[data-role="linked-doc-search"]');

  const renderList = (query = "") => {
    const q = String(query || "").trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const filtered = options.filter((opt) => {
      if (!words.length) return true;
      const blob = `${opt.name} ${linkedDocKindLabel(opt.kind)}`.toLowerCase();
      return words.every((word) => blob.includes(word));
    });
    if (countEl) {
      countEl.textContent =
        filtered.length === options.length
          ? `${options.length} pozycji`
          : `${filtered.length} z ${options.length} pozycji`;
    }
    if (empty) empty.hidden = filtered.length > 0;
    if (!list) return;
    list.innerHTML = filtered.length
      ? filtered
          .map(
            (opt) => `
          <button
            type="button"
            class="project-picker-item linked-doc-option"
            data-role="pick-linked-doc"
            data-value="${escapeHtml(opt.value)}"
            data-name="${escapeHtml(opt.name)}"
          >
            <span class="project-picker-copy">
              <strong>${escapeHtml(opt.name)}</strong>
              <em>${escapeHtml(linkedDocKindLabel(opt.kind))}</em>
            </span>
          </button>`
          )
          .join("")
      : "";
  };

  if (searchInput) {
    searchInput.value = "";
    searchInput.oninput = () => renderList(searchInput.value);
  }
  renderList("");
  modal.hidden = false;

  modal.onclick = (event) => {
    if (event.target.closest('[data-role="close-linked-doc-picker"]')) {
      closeLinkedDocPicker();
      return;
    }
    const pick = event.target.closest('[data-role="pick-linked-doc"]');
    if (pick) {
      onSelect?.({
        value: pick.dataset.value || "",
        name: pick.dataset.name || "",
      });
      closeLinkedDocPicker();
    }
  };

  window.setTimeout(() => searchInput?.focus(), 0);
}

function closeAddTaskModal() {
  closeLinkedDocPicker();
  const modal = document.getElementById("addTaskModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("modal-open");
}

const ACCOUNT_PLAN = {
  name: "Studio",
  pricePln: 349,
  cycle: "miesiąc",
  renewsAt: "2026-09-29",
  seats: 10,
  storageBytes: 10 * 1024 * 1024 * 1024,
  aiTokens: 500_000,
};

/** Mock zużycia AI — w produkcji z API rozliczeniowego */
const ACCOUNT_AI_USED = 124_800;

function accountUsageBarHtml(label, usedLabel, pct, hint) {
  const clamped = Math.max(0, Math.min(100, pct));
  const tone =
    clamped >= 90 ? "is-critical" : clamped >= 70 ? "is-warn" : "is-ok";
  return `
    <div class="account-meter ${tone}">
      <div class="account-meter-head">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(usedLabel)}</strong>
      </div>
      <div class="account-meter-track" role="progressbar" aria-valuenow="${clamped}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(
    label
  )}">
        <span class="account-meter-fill" style="width:${clamped}%"></span>
      </div>
      ${hint ? `<p class="account-meter-hint">${escapeHtml(hint)}</p>` : ""}
    </div>`;
}

function accountViewHtml() {
  const user = getCurrentAccountUser();
  const projects = loadProjects();
  const attachmentRows = collectAttachmentRows();
  const storageUsed = attachmentRows.reduce(
    (sum, row) => sum + (typeof row.size === "number" ? row.size : 0),
    0
  );
  const seatsUsed = ACCOUNT_USERS.length;
  const aiPct = Math.round((ACCOUNT_AI_USED / ACCOUNT_PLAN.aiTokens) * 100);
  const storagePct = Math.round((storageUsed / ACCOUNT_PLAN.storageBytes) * 100);
  const seatsPct = Math.round((seatsUsed / ACCOUNT_PLAN.seats) * 100);
  const renewLabel = new Date(`${ACCOUNT_PLAN.renewsAt}T12:00:00`).toLocaleDateString(
    "pl-PL",
    { day: "numeric", month: "long", year: "numeric" }
  );
  const invoices = [
    { id: "FV/2026/08/014", date: "2026-08-01", amount: "349,00 zł", status: "Opłacona" },
    { id: "FV/2026/07/011", date: "2026-07-01", amount: "349,00 zł", status: "Opłacona" },
    { id: "FV/2026/06/009", date: "2026-06-01", amount: "349,00 zł", status: "Opłacona" },
  ];

  return `
    <section class="account-view">
      <header class="form-intro form-intro-row">
        <div class="form-intro-copy">
          <p class="eyebrow">Konto</p>
          <h1>Zarządzanie kontem</h1>
          <p class="lede form-lede">
            Plan, płatności oraz zużycie tokenów AI i przestrzeni na załączniki.
          </p>
        </div>
        <button class="ghost-btn" type="button" data-view="dashboard">Wróć do pulpitu</button>
      </header>

      <div class="account-hero panel">
        <div class="account-hero-main">
          <p class="eyebrow">Aktualny plan</p>
          <h2 class="account-plan-name">${escapeHtml(ACCOUNT_PLAN.name)}</h2>
          <p class="account-plan-price">
            <strong>${ACCOUNT_PLAN.pricePln}&nbsp;zł</strong>
            <span>/ ${escapeHtml(ACCOUNT_PLAN.cycle)}</span>
          </p>
          <p class="muted">Odnowienie ${escapeHtml(renewLabel)} · właściciel: ${escapeHtml(
            user.name
          )}</p>
        </div>
        <div class="account-hero-actions">
          <button type="button" class="primary-btn" data-role="account-upgrade">Zmień plan</button>
          <button type="button" class="ghost-btn" data-role="account-portal">Portal płatności</button>
        </div>
      </div>

      <div class="account-grid">
        <article class="panel account-panel">
          <div class="panel-head">
            <h2>Zużycie w tym cyklu</h2>
          </div>
          ${accountUsageBarHtml(
            "Tokeny AI",
            `${ACCOUNT_AI_USED.toLocaleString("pl-PL")} / ${ACCOUNT_PLAN.aiTokens.toLocaleString(
              "pl-PL"
            )}`,
            aiPct,
            "Asystent na pulpicie, podsumowania dokumentów i sugestie w ankietach."
          )}
          ${accountUsageBarHtml(
            "Załączniki",
            `${formatBytes(storageUsed)} / ${formatBytes(ACCOUNT_PLAN.storageBytes)}`,
            storagePct,
            `${attachmentRows.length} plików w ${projects.length} projektach.`
          )}
          ${accountUsageBarHtml(
            "Miejsca użytkowników",
            `${seatsUsed} / ${ACCOUNT_PLAN.seats}`,
            seatsPct,
            "Aktywne konta z dostępem do workspace."
          )}
        </article>

        <article class="panel account-panel">
          <div class="panel-head panel-head-actions">
            <h2>Płatność</h2>
            <button type="button" class="ghost-btn" data-role="account-edit-payment">Zmień kartę</button>
          </div>
          <div class="account-payment">
            <div class="account-card-chip" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3.5" y="6.5" width="17" height="12" rx="2" />
                <path d="M3.5 10.5h17" />
              </svg>
            </div>
            <div>
              <p class="account-payment-brand">Visa ·••• 4242</p>
              <p class="muted">Wygasa 08/28 · ${escapeHtml(user.name.toLowerCase().replace(/\s+/g, "."))}@studio.pl</p>
            </div>
          </div>
          <dl class="account-facts">
            <div>
              <dt>Firma</dt>
              <dd>Studio Architektoniczne Kowalska</dd>
            </div>
            <div>
              <dt>NIP</dt>
              <dd>525-000-00-00</dd>
            </div>
            <div>
              <dt>Adres faktury</dt>
              <dd>ul. Projektowa 12, 00-001 Warszawa</dd>
            </div>
          </dl>
        </article>
      </div>

      <article class="panel account-panel">
        <div class="panel-head panel-head-actions">
          <h2>Faktury</h2>
          <button type="button" class="ghost-btn" data-role="account-download-all">Pobierz zestawienie</button>
        </div>
        <div class="data-table-wrap">
          <table class="data-table account-invoices">
            <thead>
              <tr>
                <th>Numer</th>
                <th>Data</th>
                <th>Kwota</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${invoices
                .map(
                  (inv) => `
                <tr>
                  <td>${escapeHtml(inv.id)}</td>
                  <td>${escapeHtml(
                    new Date(`${inv.date}T12:00:00`).toLocaleDateString("pl-PL")
                  )}</td>
                  <td>${escapeHtml(inv.amount)}</td>
                  <td><span class="account-status">${escapeHtml(inv.status)}</span></td>
                  <td class="account-invoice-actions">
                    <button type="button" class="ghost-btn" data-role="account-download-invoice" data-invoice="${escapeHtml(
                      inv.id
                    )}">PDF</button>
                  </td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel account-panel account-ai-note">
        <div class="panel-head">
          <h2>Co liczą tokeny AI?</h2>
        </div>
        <ul class="account-bullets">
          <li>Wiadomości w czacie na pulpicie</li>
          <li>Automatyczne streszczenia i checklisty dokumentów</li>
          <li>Sugestie uzupełnień w ankietach formalnych</li>
        </ul>
        <p class="muted">Limity resetują się wraz z cyklem rozliczeniowym. Przy 90% zużycia wyślemy powiadomienie na e-mail właściciela.</p>
      </article>
    </section>`;
}

function bindAccountView() {
  content.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      renderView(el.dataset.view);
    });
  });

  content.querySelector('[data-role="account-upgrade"]')?.addEventListener("click", () => {
    showTypeToast("Wybór planu — wkrótce w mockupu");
  });
  content.querySelector('[data-role="account-portal"]')?.addEventListener("click", () => {
    showTypeToast("Portal płatności — wkrótce");
  });
  content.querySelector('[data-role="account-edit-payment"]')?.addEventListener("click", () => {
    showTypeToast("Zmiana karty — wkrótce");
  });
  content.querySelector('[data-role="account-download-all"]')?.addEventListener("click", () => {
    showTypeToast("Zestawienie faktur — mock");
  });
  content.querySelectorAll('[data-role="account-download-invoice"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      showTypeToast(`Faktura ${btn.dataset.invoice || ""}`);
    });
  });
}

function configurationViewHtml() {
  const config = loadAppConfig();
  return `
    <section class="config-view">
      <header class="form-intro">
        <div class="form-intro-copy">
          <p class="eyebrow">Ustawienia konta</p>
          <h1>Konfiguracja</h1>
          <p class="lede form-lede">
            Statusy tablicy Kanban oraz typy zadań używane w projektach.
          </p>
        </div>
      </header>

      <div class="config-grid">
        <article class="panel config-panel" data-role="config-statuses">
          <div class="panel-head panel-head-actions">
            <h2>Statusy Kanban</h2>
            <button type="button" class="primary-btn" data-role="config-add-status">Dodaj status</button>
          </div>
          <p class="config-lead">
            Ustal kolejność kolumn. Zaznacz status ustawiany automatycznie, gdy dokument osiągnie 100%.
          </p>
          <ul class="config-list" data-role="status-list">
            ${config.statuses
              .map(
                (status, index) => `
              <li class="config-row" data-status-id="${escapeHtml(status.id)}" data-status-color="${escapeHtml(
                  status.color || "gray"
                )}">
                <span class="config-order" aria-hidden="true">${index + 1}</span>
                <input
                  type="text"
                  class="config-input"
                  data-role="status-label"
                  value="${escapeHtml(status.label)}"
                  aria-label="Nazwa statusu"
                />
                <select
                  class="config-input config-color-select"
                  data-role="status-color"
                  aria-label="Kolor statusu"
                >
                  ${STATUS_COLOR_PALETTE.map(
                    (swatch) => `
                    <option value="${escapeHtml(swatch.id)}" ${
                      String(status.color) === swatch.id ? "selected" : ""
                    }>${escapeHtml(swatch.label)}</option>`
                  ).join("")}
                </select>
                <label class="config-check">
                  <input
                    type="checkbox"
                    data-role="status-auto-100"
                    ${status.autoCompleteAt100 ? "checked" : ""}
                  />
                  <span>Po 100% dokumentów</span>
                </label>
                <div class="config-row-actions">
                  <button type="button" class="ghost-btn" data-role="status-move-up" ${
                    index === 0 ? "disabled" : ""
                  }>↑</button>
                  <button type="button" class="ghost-btn" data-role="status-move-down" ${
                    index === config.statuses.length - 1 ? "disabled" : ""
                  }>↓</button>
                  <button type="button" class="ghost-btn" data-role="status-remove" ${
                    config.statuses.length <= 1 ? "disabled" : ""
                  }>Usuń</button>
                </div>
              </li>`
              )
              .join("")}
          </ul>
        </article>

        <article class="panel config-panel" data-role="config-types">
          <div class="panel-head panel-head-actions">
            <h2>Typy zadań</h2>
            <button type="button" class="primary-btn" data-role="config-add-type">Dodaj typ</button>
          </div>
          <p class="config-lead">
            Typ „Dokument” automatycznie tworzy zadania z projektu budowlanego i dokumentów ankiety.
          </p>
          <ul class="config-list" data-role="type-list">
            ${config.taskTypes
              .map(
                (type) => `
              <li class="config-row" data-type-id="${escapeHtml(type.id)}">
                <input
                  type="text"
                  class="config-input"
                  data-role="type-label"
                  value="${escapeHtml(type.label)}"
                  aria-label="Nazwa typu"
                  ${type.id === "document" ? "readonly" : ""}
                />
                <label class="config-check">
                  <input
                    type="checkbox"
                    data-role="type-auto-docs"
                    ${type.autoFromDocs || type.id === "document" ? "checked" : ""}
                    ${type.id === "document" ? "disabled" : ""}
                  />
                  <span>Auto z dokumentów</span>
                </label>
                <div class="config-row-actions">
                  <button
                    type="button"
                    class="ghost-btn"
                    data-role="type-remove"
                    ${type.id === "document" ? "disabled" : ""}
                  >Usuń</button>
                </div>
              </li>`
              )
              .join("")}
          </ul>
        </article>
      </div>

      <div class="form-actions config-actions">
        <button type="button" class="primary-btn" data-role="config-save">Zapisz konfigurację</button>
      </div>
    </section>`;
}

function workflowDocCatalog() {
  if (isProjectWorkflowRuntime()) {
    return projectFlowDocCatalog(getProjectById(workflowRuntime.projectId));
  }
  return typeof listAllPotentialWorkflowDocuments === "function"
    ? listAllPotentialWorkflowDocuments()
    : [];
}

/** Dokumenty w Flow projektu: tylko ankieta + Projekt budowlany. */
function projectFlowDocCatalog(project) {
  const docs = [
    {
      id: "building-project",
      title: "Projekt budowlany",
      source: "system",
      group: "Zawsze w projekcie",
      ruleHint: "Dokument bazowy projektu",
    },
  ];
  const seen = new Set(["building-project"]);
  (project?.formalSurvey?.documents || []).forEach((doc) => {
    if (!doc?.id || seen.has(doc.id)) return;
    seen.add(doc.id);
    docs.push({
      id: doc.id,
      title: doc.title || doc.id,
      source: doc.source || "standard",
      group:
        doc.source === "conditional" ? "Warunkowe z ankiety" : "Pakiet pozwolenia na budowę",
      ruleHint: "Dokument z ankiety formalnej",
    });
  });
  return docs;
}

function workflowDocTitleById(docId) {
  if (!docId) return "";
  if (typeof listAllPotentialWorkflowDocuments === "function") {
    const hit = listAllPotentialWorkflowDocuments().find((doc) => doc.id === docId);
    if (hit?.title) return hit.title;
  }
  if (isProjectWorkflowRuntime()) {
    const project = getProjectById(workflowRuntime.projectId);
    const hit = projectFlowDocCatalog(project).find((doc) => doc.id === docId);
    if (hit?.title) return hit.title;
  }
  return docId;
}

function workflowTaskCardHtml(task, taskMap, highlightId, schedule = null) {
  const docLabel = task.linkedDocId ? workflowDocTitleById(task.linkedDocId) : "";
  const isHighlight = highlightId && highlightId === task.id;
  const blockedBy = (task.blockedBy || [])
    .map((id) => ({ id, name: taskMap.get(id)?.name }))
    .filter((item) => item.name);
  const sched = schedule?.get(task.id) || {};
  const computedStart = sched.startDate || null;
  const computedEnd = sched.endDate || null;
  const rolledDuration = typeof sched.duration === "number" ? sched.duration : null;

  return `
    <li
      class="workflow-task-item${isHighlight ? " is-highlighted" : ""}${
        task.depth ? " is-nested" : ""
      }${task.collapsedAway ? " is-collapsed-hidden" : ""}"
      style="--wf-depth:${task.depth || 0}"
      data-task-id="${escapeHtml(task.id)}"
      data-parent-id="${escapeHtml(task.parentId || "")}"
      data-depth="${task.depth || 0}"
      draggable="true"
    >
      <div class="workflow-task-card">
        <div class="workflow-task-top">
          <button
            type="button"
            class="workflow-task-drag"
            data-role="workflow-drag-handle"
            title="Przeciągnij, aby zmienić kolejność"
            aria-label="Przeciągnij zadanie"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M8 7h8M8 12h8M8 17h8" stroke-linecap="round" />
            </svg>
          </button>
          ${
            task.hasChildren
              ? `<button
                  type="button"
                  class="workflow-task-toggle${task.expanded ? " is-expanded" : ""}"
                  data-role="workflow-toggle-task"
                  data-task-id="${escapeHtml(task.id)}"
                  aria-expanded="${task.expanded ? "true" : "false"}"
                  aria-label="${task.expanded ? "Zwiń podzadania" : "Rozwiń podzadania"}"
                  title="${task.expanded ? "Zwiń" : "Rozwiń"}"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>`
              : `<span class="workflow-task-toggle-spacer" aria-hidden="true"></span>`
          }
          <div class="workflow-task-main">
            <span class="workflow-task-name" data-role="workflow-task-name">${escapeHtml(
              task.name
            )}</span>
            ${
              docLabel
                ? `<span class="workflow-task-doc-row">
                    <span
                      class="workflow-task-doc"
                      draggable="true"
                      data-role="workflow-task-doc"
                      data-doc-id="${escapeHtml(task.linkedDocId)}"
                      data-task-id="${escapeHtml(task.id)}"
                      title="Przeciągnij na inne zadanie (przepięcie) lub na listę dokumentów (odpięcie)"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path d="M8 4.5h5.5L17.5 8v11.5H8A1.5 1.5 0 0 1 6.5 18V6A1.5 1.5 0 0 1 8 4.5Z" stroke-linejoin="round"/>
                        <path d="M13.5 4.5V8H17.5" stroke-linejoin="round"/>
                      </svg>
                      ${escapeHtml(docLabel)}
                    </span>
                    <button
                      type="button"
                      class="workflow-task-auto-name"
                      data-role="workflow-auto-name-from-doc"
                      data-task-id="${escapeHtml(task.id)}"
                      title="Ustaw nazwę: ${escapeHtml(workflowProductionTaskName(docLabel))}"
                      aria-label="Wygeneruj nazwę Produkcja z dokumentu"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke-linejoin="round" />
                        <path d="M13.5 6.5l3 3" stroke-linecap="round" />
                        <path d="M18.5 4.5l1 1M20 8h.01M16 3h.01" stroke-linecap="round" />
                      </svg>
                    </button>
                  </span>`
                : ""
            }
            <div class="workflow-schedule-meta">
              <span title="${
                task.isRoot && task.startDate
                  ? "Data od (ustawiona na zadaniu najwyższym)"
                  : "Data od (wyliczona)"
              }">
                Od: <strong>${escapeHtml(computedStart || "—")}</strong>
              </span>
              <span title="Data do (wyliczona, dni robocze PL)">
                Do: <strong>${escapeHtml(computedEnd || "—")}</strong>
              </span>
            </div>
          </div>
          <div class="workflow-task-side-controls">
            ${
              blockedBy.length
                ? `<div class="workflow-dep-chips">
                ${blockedBy
                  .map(
                    (item) => `
                  <span class="workflow-dep-chip">
                    <span>Wymaga wykonania: ${escapeHtml(item.name)}</span>
                    <button
                      type="button"
                      class="workflow-dep-chip-remove"
                      data-role="workflow-remove-dep"
                      data-from="${escapeHtml(item.id)}"
                      data-to="${escapeHtml(task.id)}"
                      title="Usuń powiązanie"
                      aria-label="Usuń powiązanie"
                    >×</button>
                  </span>`
                  )
                  .join("")}
              </div>`
                : ""
            }
            <div class="workflow-task-metrics">
            ${
              workflowTaskAllowsManualStart(task)
                ? `<label class="workflow-start-date">
                    <span>Start</span>
                    <input
                      type="date"
                      data-role="workflow-start-date"
                      data-task-id="${escapeHtml(task.id)}"
                      value="${escapeHtml(task.startDate || "")}"
                    />
                  </label>`
                : blockedBy.length
                  ? `<span class="workflow-start-date is-derived" title="Start wyliczany po zakończeniu wymaganych zadań">Start: auto</span>`
                  : ""
            }
            ${
              task.isLeaf
                ? `<label class="workflow-duration">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      inputmode="numeric"
                      data-role="workflow-duration"
                      data-task-id="${escapeHtml(task.id)}"
                      value="${task.durationDays != null ? escapeHtml(String(task.durationDays)) : ""}"
                      placeholder="—"
                      aria-label="Czas trwania w dniach"
                    />
                    <span>dni</span>
                  </label>`
                : `<div class="workflow-duration is-readonly" title="Suma dni w ciągu + max z równoległych (bez strzałek)">
                    <span class="workflow-duration-value">${
                      rolledDuration != null ? escapeHtml(String(rolledDuration)) : "—"
                    }</span>
                    <span>dni</span>
                  </div>`
            }
            </div>
          </div>
        </div>
        <div class="workflow-task-actions">
          <button type="button" class="ghost-btn workflow-task-action" data-role="workflow-add-child" data-task-id="${escapeHtml(
            task.id
          )}">Dodaj podrzędne</button>
          <button type="button" class="ghost-btn workflow-task-action" data-role="workflow-set-blocks" data-task-id="${escapeHtml(
            task.id
          )}">Wymaga wykonania</button>
          <button type="button" class="ghost-btn workflow-task-action" data-role="workflow-link-doc" data-task-id="${escapeHtml(
            task.id
          )}">${task.linkedDocId ? "Zmień dokument" : "Powiąż z dokumentem"}</button>
          <button type="button" class="ghost-btn workflow-task-action" data-role="workflow-edit-task" data-task-id="${escapeHtml(
            task.id
          )}">Edytuj</button>
          <button type="button" class="ghost-btn workflow-task-action is-danger" data-role="workflow-delete-task" data-task-id="${escapeHtml(
            task.id
          )}">Usuń</button>
        </div>
        <div class="workflow-nest-hint" data-role="workflow-nest-hint">
          Upuść tutaj, aby ustawić jako podzadanie
        </div>
        <div class="workflow-link-doc-hint" data-role="workflow-link-doc-hint">
          Upuść, aby powiązać dokument z tym zadaniem
        </div>
      </div>
    </li>`;
}

function workflowTasksPanelHtml(activePath) {
  if (!activePath) {
    return `
      <aside class="panel workflow-tasks-panel workflow-tasks-panel-empty">
        <p>Wybierz lub utwórz ścieżkę, aby dodać zadania.</p>
      </aside>`;
  }

  const tasks = getWorkflowTasksForRender(activePath.id, activePath.tasks || []);
  const taskMap = getWorkflowTaskMap(activePath.tasks || []);
  const schedule = computeWorkflowSchedule(activePath.tasks || []);
  const highlightId = workflowHighlightTaskId;

  return `
    <aside class="panel workflow-tasks-panel" data-role="workflow-tasks" data-path-id="${escapeHtml(
      activePath.id
    )}">
      <div class="panel-head panel-head-actions">
        <div class="workflow-tasks-heading">
          <h2>Zadania ścieżki</h2>
          <p class="workflow-active-badge">
            Pracujesz nad: <strong>${escapeHtml(activePath.name)}</strong>
          </p>
        </div>
        <div class="workflow-tasks-head-tools">
          <button
            type="button"
            class="ghost-btn workflow-collapse-all-btn"
            data-role="workflow-collapse-all"
            title="Zwiń wszystkie podzadania"
          >Zwiń wszystko</button>
          <button
            type="button"
            class="workflow-path-add"
            data-role="workflow-add-task"
            aria-label="Dodaj zadanie"
            title="Dodaj zadanie"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <p class="workflow-dep-legend">
        Daty w dniach roboczych (PL). Data od — tylko na najwyższych zadaniach; reszta i data do są wyliczane.
        Zadania bez strzałek są równoległe (max dni). Strzałki tylko między równorzędnymi — ustawiają kolejność.
      </p>
      ${
        tasks.length
          ? `<div class="workflow-task-canvas" data-role="workflow-task-canvas">
              <svg class="workflow-dep-svg" data-role="workflow-dep-svg" aria-hidden="true"></svg>
              <ul class="workflow-task-list" data-role="workflow-task-list">
              ${tasks
                .map((task) => workflowTaskCardHtml(task, taskMap, highlightId, schedule))
                .join("")}
              </ul>
            </div>`
          : `<p class="workflow-paths-empty">Brak zadań — kliknij + i nadaj nazwę pierwszemu krokowi.</p>`
      }
    </aside>`;
}

function workflowViewHtml() {
  const state = loadWorkflowState();
  const activePath = state.paths.find((item) => item.id === state.activePathId) || null;
  const linkedDocIds = getLinkedDocIdsForPath(activePath);
  const docs = workflowDocCatalog();
  const groups = [];
  const byGroup = new Map();
  docs.forEach((doc) => {
    const key = doc.group || "Inne";
    if (!byGroup.has(key)) {
      byGroup.set(key, []);
      groups.push(key);
    }
    byGroup.get(key).push(doc);
  });

  return `
    <section class="workflow-view">
      <header class="form-intro">
        <div class="form-intro-copy">
          <p class="eyebrow">Procesy</p>
          <h1>Definiowanie workflow</h1>
          <p class="lede form-lede">
            Ścieżki są rozdzielne — ten sam dokument możesz obrabiać inaczej w każdej z nich.
            Wybierz ścieżkę, dodaj zadania i powiąż je z dokumentami katalogu.
          </p>
        </div>
      </header>

      <div class="panel workflow-paths-panel">
        <div class="panel-head panel-head-actions">
          <h2>Ścieżki workflow</h2>
          <button
            type="button"
            class="workflow-path-add"
            data-role="workflow-add-path"
            aria-label="Dodaj ścieżkę"
            title="Dodaj ścieżkę"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <p class="config-lead">
          Każda ścieżka ma własną definicję procesu wokół dokumentów systemu.
          ${
            activePath
              ? `Aktywna ścieżka: <strong>${escapeHtml(activePath.name)}</strong>.`
              : ""
          }
        </p>
        ${
          state.paths.length
            ? `<ul class="workflow-path-list" data-role="workflow-path-list">
                ${state.paths
                  .map(
                    (path) => `
                  <li>
                    <button
                      type="button"
                      class="workflow-path-item${
                        path.id === state.activePathId ? " is-active" : ""
                      }"
                      data-role="workflow-select-path"
                      data-path-id="${escapeHtml(path.id)}"
                    >
                      <span class="workflow-path-item-name">${escapeHtml(path.name)}</span>
                    </button>
                  </li>`
                  )
                  .join("")}
              </ul>`
            : `<p class="workflow-paths-empty">Brak ścieżek — kliknij + i nadaj nazwę pierwszej.</p>`
        }
      </div>

      <div class="workflow-layout${isWorkflowDocsCollapsed() ? " is-docs-collapsed" : ""}" data-role="workflow-layout">
        ${workflowTasksPanelHtml(activePath)}
        <button
          type="button"
          class="workflow-docs-reopen"
          data-role="workflow-docs-toggle"
          aria-label="Pokaż dokumenty"
          title="Pokaż dokumenty"
          ${isWorkflowDocsCollapsed() ? "" : "hidden"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>Dokumenty</span>
        </button>
        <article class="panel workflow-docs-panel" data-role="workflow-documents" ${
          isWorkflowDocsCollapsed() ? "hidden" : ""
        }>
          <div class="panel-head panel-head-actions">
            <h2>Dokumenty w systemie</h2>
            <div class="workflow-docs-head-tools">
              <span class="workflow-docs-count">${docs.length}</span>
              <button
                type="button"
                class="workflow-docs-collapse"
                data-role="workflow-docs-toggle"
                aria-label="Ukryj dokumenty"
                title="Ukryj dokumenty"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          <p class="config-lead">
            Przeciągnij dokument na zadanie, aby powiązać. Zielony check = powiązany; celownik = znajdź zadanie.
          </p>
          <div class="workflow-docs-scroll" data-role="workflow-docs-drop">
            ${groups
              .map((group) => {
                const items = byGroup.get(group) || [];
                return `
                <section class="workflow-doc-group">
                  <h3 class="workflow-doc-group-title">${escapeHtml(group)}</h3>
                  <ul class="workflow-doc-list">
                    ${items
                      .map((doc) => {
                        const linked = linkedDocIds.has(doc.id);
                        return `
                      <li
                        class="workflow-doc-item${linked ? " is-linked" : ""}"
                        data-doc-id="${escapeHtml(doc.id)}"
                        data-doc-source="${escapeHtml(
                          doc.source === "system"
                            ? "system"
                            : doc.source === "standard"
                              ? "standard"
                              : "warunkowy"
                        )}"
                        draggable="true"
                        data-role="workflow-doc-item"
                        title="Przeciągnij na zadanie, aby powiązać"
                      >
                        <div class="workflow-doc-main">
                          <span class="workflow-doc-title">${escapeHtml(doc.title)}</span>
                          ${
                            doc.ruleHint
                              ? `<span class="workflow-doc-hint">${escapeHtml(doc.ruleHint)}</span>`
                              : ""
                          }
                        </div>
                        <div class="workflow-doc-side">
                          ${
                            linked
                              ? `<div class="workflow-doc-linked-actions">
                                  <span class="workflow-doc-check" title="Powiązany w aktywnej ścieżce" aria-label="Powiązany">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                                      <path d="M5 12.5 10 17.5 19 7.5" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                  </span>
                                  <button
                                    type="button"
                                    class="workflow-doc-locate"
                                    data-role="workflow-locate-task"
                                    data-doc-id="${escapeHtml(doc.id)}"
                                    title="Pokaż zadanie w ścieżce"
                                    aria-label="Pokaż zadanie w ścieżce"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                                      <circle cx="12" cy="12" r="3.2" />
                                      <path d="M12 3.5v2.8M12 17.7v2.8M3.5 12h2.8M17.7 12h2.8" stroke-linecap="round" />
                                    </svg>
                                  </button>
                                </div>`
                              : `<span class="workflow-doc-meta">${escapeHtml(
                                  doc.source === "system"
                                    ? "system"
                                    : doc.source === "standard"
                                      ? "standard"
                                      : "warunkowy"
                                )}</span>`
                          }
                        </div>
                      </li>`;
                      })
                      .join("")}
                  </ul>
                </section>`;
              })
              .join("")}
          </div>
          ${workflowCreateUnassignedDocsButtonHtml(
            docs.filter((doc) => !linkedDocIds.has(doc.id)).length
          )}
        </article>
      </div>
    </section>`;
}

function ensureWorkflowModal() {
  let modal = document.getElementById("workflowModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "workflowModal";
    modal.className = "category-modal";
    modal.hidden = true;
    document.body.appendChild(modal);
  }
  return modal;
}

function closeWorkflowModal() {
  const modal = document.getElementById("workflowModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function openWorkflowNameModal({ title, eyebrow, placeholder, fieldLabel, onSave }) {
  const modal = ensureWorkflowModal();
  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-workflow-modal"></div>
    <div class="category-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="workflowModalTitle">
      <header class="category-modal-head">
        <div>
          <p class="eyebrow">${escapeHtml(eyebrow || "Workflow")}</p>
          <h2 id="workflowModalTitle">${escapeHtml(title)}</h2>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-workflow-modal" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body">
        <label class="field">
          <span class="field-label">${escapeHtml(fieldLabel || "Nazwa zadania")}</span>
          <input
            id="workflowModalName"
            type="text"
            required
            maxlength="160"
            placeholder="${escapeHtml(placeholder || "np. Wytworzenie dokumentacji")}"
            autocomplete="off"
          />
        </label>
      </div>
      <footer class="category-modal-foot">
        <button type="button" class="ghost-btn" data-role="close-workflow-modal">Anuluj</button>
        <button type="button" class="primary-btn" data-role="save-workflow-modal">Zapisz</button>
      </footer>
    </div>
  `;

  const save = () => {
    const input = modal.querySelector("#workflowModalName");
    const name = input?.value.trim() || "";
    if (!name) {
      input?.focus();
      showTypeToast("Podaj nazwę");
      return;
    }
    onSave(name);
    closeWorkflowModal();
  };

  modal.querySelectorAll('[data-role="close-workflow-modal"]').forEach((el) => {
    el.addEventListener("click", closeWorkflowModal);
  });
  modal.querySelector('[data-role="save-workflow-modal"]')?.addEventListener("click", save);
  modal.querySelector("#workflowModalName")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeWorkflowModal();
    }
  });

  modal.hidden = false;
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => modal.querySelector("#workflowModalName")?.focus());
}

function openWorkflowPathCreateModal() {
  const modal = ensureWorkflowModal();
  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-workflow-modal"></div>
    <div class="category-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="workflowModalTitle">
      <header class="category-modal-head">
        <div>
          <p class="eyebrow">Workflow</p>
          <h2 id="workflowModalTitle">Nowa ścieżka</h2>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-workflow-modal" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body">
        <label class="field">
          <span class="field-label">Nazwa ścieżki</span>
          <input
            id="workflowModalName"
            type="text"
            required
            maxlength="120"
            placeholder="np. Standardowy wniosek o PnB"
            autocomplete="off"
          />
        </label>
      </div>
      <footer class="category-modal-foot">
        <button type="button" class="ghost-btn" data-role="close-workflow-modal">Anuluj</button>
        <button type="button" class="primary-btn" data-role="save-workflow-modal">Zapisz</button>
      </footer>
    </div>
  `;

  const save = () => {
    const input = modal.querySelector("#workflowModalName");
    const name = input?.value.trim() || "";
    if (!name) {
      input?.focus();
      showTypeToast("Podaj nazwę ścieżki");
      return;
    }
    const path = createWorkflowPath(name);
    if (!path) return;
    closeWorkflowModal();
    showTypeToast(`Utworzono ścieżkę: ${path.name}`);
    renderView("workflow");
  };

  modal.querySelectorAll('[data-role="close-workflow-modal"]').forEach((el) => {
    el.addEventListener("click", closeWorkflowModal);
  });
  modal.querySelector('[data-role="save-workflow-modal"]')?.addEventListener("click", save);
  modal.querySelector("#workflowModalName")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeWorkflowModal();
    }
  });

  modal.hidden = false;
  requestAnimationFrame(() => modal.querySelector("#workflowModalName")?.focus());
}

function openWorkflowTaskPickerModal({ title, lead, taskId, selectedIds, onSave }) {
  const path = getActiveWorkflowPath();
  if (!path) return;
  const source = (path.tasks || []).find((task) => task.id === taskId);
  if (!source) return;
  // Powiązania tylko w ramach tego samego poziomu (to samo parentId)
  const options = sortWorkflowTasksTree(path.tasks || []).filter(
    (task) => task.id !== taskId && workflowTasksSameLevel(source, task)
  );
  const selected = new Set(
    (selectedIds || []).filter((id) => options.some((task) => task.id === id))
  );
  const modal = ensureWorkflowModal();

  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-workflow-modal"></div>
    <div class="category-modal-dialog workflow-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="workflowModalTitle">
      <header class="category-modal-head">
        <div>
          <p class="eyebrow">${escapeHtml(path.name)}</p>
          <h2 id="workflowModalTitle">${escapeHtml(title)}</h2>
          ${
            lead
              ? `<p class="workflow-modal-lead">${escapeHtml(lead)}</p>`
              : ""
          }
          <p class="workflow-modal-lead">Tylko zadania z tego samego poziomu (równorzędne).</p>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-workflow-modal" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body">
        ${
          options.length
            ? `<ul class="workflow-picker-list">
                ${options
                  .map(
                    (task) => `
                  <li>
                    <label class="workflow-picker-option" style="--wf-depth:${task.depth || 0}">
                      <input
                        type="checkbox"
                        value="${escapeHtml(task.id)}"
                        ${selected.has(task.id) ? "checked" : ""}
                      />
                      <span>${escapeHtml(task.name)}</span>
                    </label>
                  </li>`
                  )
                  .join("")}
              </ul>`
            : `<p class="workflow-paths-empty">Brak innych zadań na tym samym poziomie.</p>`
        }
      </div>
      <footer class="category-modal-foot">
        <button type="button" class="ghost-btn" data-role="close-workflow-modal">Anuluj</button>
        <button type="button" class="primary-btn" data-role="save-workflow-modal" ${
          options.length ? "" : "disabled"
        }>Zapisz</button>
      </footer>
    </div>
  `;

  const save = () => {
    const ids = [...modal.querySelectorAll('.workflow-picker-list input[type="checkbox"]:checked')].map(
      (input) => input.value
    );
    onSave(ids);
    closeWorkflowModal();
  };

  modal.querySelectorAll('[data-role="close-workflow-modal"]').forEach((el) => {
    el.addEventListener("click", closeWorkflowModal);
  });
  modal.querySelector('[data-role="save-workflow-modal"]')?.addEventListener("click", save);
  modal.hidden = false;
}

function openWorkflowDocPickerModal(taskId) {
  const path = getActiveWorkflowPath();
  if (!path) return;
  const task = (path.tasks || []).find((item) => item.id === taskId);
  if (!task) return;
  const docs = workflowDocCatalog();
  const linkedElsewhere = new Map();
  (path.tasks || []).forEach((item) => {
    if (item.linkedDocId && item.id !== taskId) {
      linkedElsewhere.set(item.linkedDocId, item.name);
    }
  });
  const modal = ensureWorkflowModal();

  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-workflow-modal"></div>
    <div class="category-modal-dialog workflow-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="workflowModalTitle">
      <header class="category-modal-head">
        <div>
          <p class="eyebrow">${escapeHtml(path.name)}</p>
          <h2 id="workflowModalTitle">Powiąż z dokumentem</h2>
          <p class="workflow-modal-lead">
            Zadanie „${escapeHtml(task.name)}” stanie się krokiem wytworzenia wybranego dokumentu.
          </p>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-workflow-modal" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body">
        <ul class="workflow-picker-list">
          <li>
            <label class="workflow-picker-option">
              <input type="radio" name="workflow-doc" value="" ${task.linkedDocId ? "" : "checked"} />
              <span>Bez dokumentu</span>
            </label>
          </li>
          ${docs
            .map((doc) => {
              const other = linkedElsewhere.get(doc.id);
              return `
              <li>
                <label class="workflow-picker-option">
                  <input
                    type="radio"
                    name="workflow-doc"
                    value="${escapeHtml(doc.id)}"
                    ${task.linkedDocId === doc.id ? "checked" : ""}
                  />
                  <span>
                    <strong>${escapeHtml(doc.title)}</strong>
                    ${
                      other
                        ? `<em class="workflow-picker-note">obecnie: ${escapeHtml(other)}</em>`
                        : ""
                    }
                  </span>
                </label>
              </li>`;
            })
            .join("")}
        </ul>
      </div>
      <footer class="category-modal-foot">
        <button type="button" class="ghost-btn" data-role="close-workflow-modal">Anuluj</button>
        <button type="button" class="primary-btn" data-role="save-workflow-modal">Zapisz</button>
      </footer>
    </div>
  `;

  const save = () => {
    const selected = modal.querySelector('input[name="workflow-doc"]:checked')?.value || "";
    linkWorkflowTaskDocument(taskId, selected || null);
    closeWorkflowModal();
    showTypeToast(selected ? "Powiązano dokument z zadaniem" : "Usunięto powiązanie dokumentu");
    softRefreshWorkflowTasks();
  };

  modal.querySelectorAll('[data-role="close-workflow-modal"]').forEach((el) => {
    el.addEventListener("click", closeWorkflowModal);
  });
  modal.querySelector('[data-role="save-workflow-modal"]')?.addEventListener("click", save);
  modal.hidden = false;
}

function assignWorkflowDependencyLanes(edges) {
  const MAX_LANES = 4;
  const sorted = [...edges].sort((a, b) => {
    const aMin = Math.min(a.y1, a.y2);
    const bMin = Math.min(b.y1, b.y2);
    if (aMin !== bMin) return aMin - bMin;
    return Math.abs(a.y2 - a.y1) - Math.abs(b.y2 - b.y1);
  });

  const laneMembers = Array.from({ length: MAX_LANES }, () => []);
  sorted.forEach((edge) => {
    const ymin = Math.min(edge.y1, edge.y2) - 6;
    const ymax = Math.max(edge.y1, edge.y2) + 6;
    let bestLane = 0;
    let bestCount = Infinity;
    for (let lane = 0; lane < MAX_LANES; lane += 1) {
      const conflict = laneMembers[lane].some((other) => {
        const otherMin = Math.min(other.y1, other.y2) - 6;
        const otherMax = Math.max(other.y1, other.y2) + 6;
        return !(ymax < otherMin || ymin > otherMax);
      });
      if (!conflict) {
        bestLane = lane;
        bestCount = -1;
        break;
      }
      if (laneMembers[lane].length < bestCount) {
        bestCount = laneMembers[lane].length;
        bestLane = lane;
      }
    }
    edge.lane = bestLane;
    laneMembers[bestLane].push(edge);
  });

  const used = Math.max(
    1,
    sorted.reduce((max, edge) => Math.max(max, (edge.lane || 0) + 1), 1)
  );
  return { edges: sorted, usedLanes: Math.min(used, MAX_LANES), maxLanes: MAX_LANES };
}

function drawWorkflowDependencyLinks() {
  const panel = content.querySelector('[data-role="workflow-tasks"]');
  const canvas = panel?.querySelector('[data-role="workflow-task-canvas"]');
  const svg = canvas?.querySelector('[data-role="workflow-dep-svg"]');
  const list = canvas?.querySelector('[data-role="workflow-task-list"]');
  if (!panel || !canvas || !svg || !list) return;

  const path = getActiveWorkflowPath();
  if (!path) {
    svg.innerHTML = "";
    return;
  }

  const canvasRect = canvas.getBoundingClientRect();
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.scrollHeight || canvas.clientHeight);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.style.height = `${height}px`;
  svg.style.width = `${width}px`;

  const itemEls = [...list.querySelectorAll(".workflow-task-item:not(.is-collapsed-hidden)")].filter(
    (el) => !el.hidden
  );
  const centers = new Map();
  const EXIT_NUDGE = 8; // wyjście strzałki — nieco niżej od środka
  const ENTER_NUDGE = 8; // wejście strzałki — nieco wyżej od środka
  itemEls.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const midY = rect.top - canvasRect.top + canvas.scrollTop + rect.height / 2;
    const depth = Number(el.dataset.depth || 0);
    const parentId = el.dataset.parentId || "";
    centers.set(el.dataset.taskId, {
      yExit: midY + EXIT_NUDGE,
      yEnter: midY - ENTER_NUDGE,
      depth,
      parentId,
      el,
    });
  });

  const taskMap = getWorkflowTaskMap(path.tasks || []);
  const rawEdges = [];
  (path.tasks || []).forEach((task) => {
    (task.blocks || []).forEach((targetId) => {
      const target = taskMap.get(targetId);
      if (!target || !workflowTasksSameLevel(task, target)) return;
      if (!centers.has(task.id) || !centers.has(targetId)) return;
      const from = centers.get(task.id);
      const to = centers.get(targetId);
      rawEdges.push({
        id: `${task.id}__${targetId}`,
        from: task.id,
        to: targetId,
        y1: from.yExit,
        y2: to.yEnter,
        depthFrom: from.depth,
        depthTo: to.depth,
      });
    });
  });

  const { edges, usedLanes, maxLanes } = assignWorkflowDependencyLanes(rawEdges);
  const gutterStart = 5;
  const gutterEnd = 22;
  const laneSpan = gutterEnd - gutterStart;
  const step =
    usedLanes <= 1 ? 0 : laneSpan / Math.max(1, Math.min(usedLanes, maxLanes) - 1);

  const groups = edges
    .map((edge) => {
      const laneX =
        usedLanes <= 1 ? gutterEnd - 2 : gutterStart + edge.lane * step;
      const startX = 26 + edge.depthFrom * 12;
      const endX = 26 + edge.depthTo * 12;
      const d = `M ${startX} ${edge.y1} L ${laneX} ${edge.y1} L ${laneX} ${edge.y2} L ${endX} ${edge.y2}`;
      return `
        <g class="workflow-dep-edge" data-edge-id="${escapeHtml(edge.id)}" data-from="${escapeHtml(
          edge.from
        )}" data-to="${escapeHtml(edge.to)}">
          <path class="workflow-dep-hit" d="${d}" />
          <path class="workflow-dep-line" d="${d}" marker-end="url(#workflowDepArrow)" />
          <circle class="workflow-dep-dot" cx="${startX}" cy="${edge.y1}" r="1.6" />
        </g>`;
    })
    .join("");

  svg.innerHTML = `
    <defs>
      <marker id="workflowDepArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"></path>
      </marker>
      <marker id="workflowDepArrowHot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316"></path>
      </marker>
    </defs>
    ${groups}
  `;

  const trashLayer = canvas.querySelector('[data-role="workflow-dep-trash-layer"]');
  if (trashLayer) trashLayer.remove();

  svg.classList.remove("is-hovering");
  svg.querySelectorAll(".workflow-dep-edge").forEach((group) => {
    const activate = () => {
      svg.classList.add("is-hovering");
      svg.querySelectorAll(".workflow-dep-edge").forEach((other) => {
        const hot = other === group;
        other.classList.toggle("is-hot", hot);
        other.querySelector(".workflow-dep-line")?.setAttribute(
          "marker-end",
          hot ? "url(#workflowDepArrowHot)" : "url(#workflowDepArrow)"
        );
      });
    };
    const clear = () => {
      svg.classList.remove("is-hovering");
      svg.querySelectorAll(".workflow-dep-edge").forEach((other) => {
        other.classList.remove("is-hot");
        other.querySelector(".workflow-dep-line")?.setAttribute(
          "marker-end",
          "url(#workflowDepArrow)"
        );
      });
    };
    group.addEventListener("pointerenter", activate);
    group.addEventListener("pointerleave", clear);
  });
}

function applyWorkflowCollapseVisibility() {
  const path = getActiveWorkflowPath();
  const list = content.querySelector('[data-role="workflow-task-list"]');
  if (!path || !list) return;
  const rendered = getWorkflowTasksForRender(path.id, path.tasks || []);
  rendered.forEach((task) => {
    const item = list.querySelector(`.workflow-task-item[data-task-id="${task.id}"]`);
    if (!item) return;
    item.classList.toggle("is-collapsed-hidden", Boolean(task.collapsedAway));
    const toggle = item.querySelector('[data-role="workflow-toggle-task"]');
    if (toggle) {
      toggle.classList.toggle("is-expanded", Boolean(task.expanded));
      toggle.setAttribute("aria-expanded", task.expanded ? "true" : "false");
      toggle.title = task.expanded ? "Zwiń" : "Rozwiń";
    }
  });
  // Po zmianie widoczności przelicz strzałki w dwóch klatkach — layout musi się ustabilizować
  requestAnimationFrame(() => {
    drawWorkflowDependencyLinks();
    requestAnimationFrame(() => drawWorkflowDependencyLinks());
  });
}

function refreshWorkflowDocsLinkedMarks() {
  const path = getActiveWorkflowPath();
  const linked = getLinkedDocIdsForPath(path);
  content.querySelectorAll('[data-role="workflow-doc-item"]').forEach((item) => {
    const docId = item.dataset.docId;
    const isLinked = linked.has(docId);
    item.classList.toggle("is-linked", isLinked);
    const side = item.querySelector(".workflow-doc-side");
    if (!side) return;
    if (isLinked) {
      side.innerHTML = `
        <div class="workflow-doc-linked-actions">
          <span class="workflow-doc-check" title="Powiązany w aktywnej ścieżce" aria-label="Powiązany">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
              <path d="M5 12.5 10 17.5 19 7.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <button
            type="button"
            class="workflow-doc-locate"
            data-role="workflow-locate-task"
            data-doc-id="${escapeHtml(docId)}"
            title="Pokaż zadanie w ścieżce"
            aria-label="Pokaż zadanie w ścieżce"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 3.5v2.8M12 17.7v2.8M3.5 12h2.8M17.7 12h2.8" stroke-linecap="round" />
            </svg>
          </button>
        </div>`;
      side.querySelector('[data-role="workflow-locate-task"]')?.addEventListener("click", () => {
        focusWorkflowTaskFromDoc(docId);
      });
    } else {
      const source = item.dataset.docSource || "warunkowy";
      side.innerHTML = `<span class="workflow-doc-meta">${escapeHtml(source)}</span>`;
    }
  });
}

function refreshWorkflowUnassignedButton() {
  const path = getActiveWorkflowPath();
  const host = content.querySelector(".workflow-docs-unassigned");
  if (!host) return;
  const linked = getLinkedDocIdsForPath(path);
  const count = workflowDocCatalog().filter((doc) => doc?.id && !linked.has(doc.id)).length;
  const wrap = document.createElement("div");
  wrap.innerHTML = workflowCreateUnassignedDocsButtonHtml(count);
  const next = wrap.firstElementChild;
  if (!next) return;
  host.replaceWith(next);
  bindWorkflowUnassignedDocsAction();
}

function softRefreshWorkflowTasks() {
  if (
    isProjectWorkflowRuntime() &&
    (getTasksViewMode() === "cards" || getTasksViewMode() === "table")
  ) {
    renderView(
      "project-detail",
      projectOverviewNav(workflowRuntime.projectId, { listTab: "tasks" })
    );
    return;
  }
  const path = getActiveWorkflowPath();
  const host = content.querySelector(".workflow-layout");
  const current = content.querySelector('[data-role="workflow-tasks"]');
  if (!path || !host || !current) {
    if (isProjectWorkflowRuntime()) {
      setTasksViewMode("flow");
      renderView(
        "project-detail",
        projectOverviewNav(workflowRuntime.projectId, { listTab: "tasks" })
      );
    } else {
      renderView("workflow");
    }
    return;
  }
  const wrap = document.createElement("div");
  wrap.innerHTML = workflowTasksPanelHtml(path);
  const next = wrap.firstElementChild;
  current.replaceWith(next);
  refreshWorkflowDocsLinkedMarks();
  refreshWorkflowUnassignedButton();
  bindWorkflowTasksInteractions();
  bindWorkflowDocDrag();
  bindWorkflowDependencyRedraw();
  applyWorkflowTaskHighlight();
}

function focusWorkflowTaskFromDoc(docId) {
  const path = getActiveWorkflowPath();
  if (!path) return;
  const task = findWorkflowTaskByDocId(path, docId);
  if (!task) {
    showTypeToast("Brak powiązanego zadania w tej ścieżce");
    return;
  }
  if (isProjectWorkflowRuntime()) {
    const viewMode = getTasksViewMode();
    if (viewMode === "cards" || viewMode === "table") {
      const projectId = workflowRuntime.projectId;
      const map = loadTaskExpandState(projectId);
      const byId = new Map((path.tasks || []).map((item) => [item.id, item]));
      let current = task.parentId || null;
      while (current) {
        map[current] = true;
        current = byId.get(current)?.parentId || null;
      }
      saveTaskExpandState(projectId, map);
      workflowHighlightTaskId = task.id;
      softRefreshWorkflowTasks();
      return;
    }
  }
  expandWorkflowTaskAncestors(path.id, task.id, path.tasks || []);
  workflowHighlightTaskId = task.id;
  softRefreshWorkflowTasks();
}

function bindWorkflowDependencyRedraw() {
  const canvas = content.querySelector('[data-role="workflow-task-canvas"]');
  if (!canvas) return;
  const redraw = () => drawWorkflowDependencyLinks();
  requestAnimationFrame(() => requestAnimationFrame(redraw));
  if (typeof ResizeObserver !== "undefined") {
    canvas._workflowResizeObserver?.disconnect?.();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    canvas._workflowResizeObserver = observer;
  }
  canvas.addEventListener("scroll", redraw, { passive: true });
}

function applyWorkflowTaskHighlight() {
  if (!workflowHighlightTaskId) return;
  const id = String(workflowHighlightTaskId).replace(/"/g, "");
  const item =
    content.querySelector(`.workflow-task-item[data-task-id="${id}"]`) ||
    content.querySelector(`.task-tree-row[data-task-id="${id}"]`);
  if (!item) {
    workflowHighlightTaskId = null;
    return;
  }
  item.classList.add("is-highlighted");
  item.scrollIntoView({ behavior: "smooth", block: "nearest" });
  window.setTimeout(() => {
    if (workflowHighlightTaskId === item.dataset.taskId) {
      workflowHighlightTaskId = null;
      item.classList.remove("is-highlighted");
    }
  }, 2600);
}

function clearWorkflowDropMarkers(list) {
  list?.querySelectorAll(".workflow-task-item").forEach((item) => {
    item.classList.remove("drop-before", "drop-after", "drop-nest", "drop-link-doc", "drop-link-blocked");
  });
}

/** @type {{ docId: string, sourceTaskId: string | null } | null} */
let workflowDocDragState = null;

function bindWorkflowDocDrag() {
  const docsPanel = content.querySelector('[data-role="workflow-documents"]');
  const docsDrop = content.querySelector('[data-role="workflow-docs-drop"]');
  const list = content.querySelector('[data-role="workflow-task-list"]');

  content.querySelectorAll('[data-role="workflow-doc-item"]').forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      if (event.target.closest('[data-role="workflow-locate-task"]')) {
        event.preventDefault();
        return;
      }
      const docId = item.dataset.docId;
      if (!docId) {
        event.preventDefault();
        return;
      }
      workflowDocDragState = { docId, sourceTaskId: null };
      item.classList.add("is-dragging-doc");
      docsPanel?.classList.add("is-dragging-doc-from-list");
      event.dataTransfer.effectAllowed = "copyMove";
      event.dataTransfer.setData("text/workflow-doc", docId);
      event.dataTransfer.setData("text/plain", docId);
    });
    item.addEventListener("dragend", () => {
      workflowDocDragState = null;
      item.classList.remove("is-dragging-doc");
      docsPanel?.classList.remove("is-dragging-doc-from-list");
      clearWorkflowDropMarkers(list);
    });
  });

  content.querySelectorAll('[data-role="workflow-task-doc"]').forEach((chip) => {
    chip.addEventListener("dragstart", (event) => {
      event.stopPropagation();
      const docId = chip.dataset.docId;
      const taskId = chip.dataset.taskId;
      if (!docId || !taskId) {
        event.preventDefault();
        return;
      }
      workflowDocDragState = { docId, sourceTaskId: taskId };
      chip.classList.add("is-dragging-doc");
      list?.classList.add("is-dragging-doc-chip");
      docsPanel?.classList.add("is-doc-unlink-target");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/workflow-doc", docId);
      event.dataTransfer.setData("text/workflow-doc-source-task", taskId);
      event.dataTransfer.setData("text/plain", docId);
    });
    chip.addEventListener("dragend", () => {
      workflowDocDragState = null;
      chip.classList.remove("is-dragging-doc");
      list?.classList.remove("is-dragging-doc-chip");
      docsPanel?.classList.remove("is-doc-unlink-target", "is-doc-unlink-hover");
      clearWorkflowDropMarkers(list);
    });
  });

  if (docsDrop) {
    docsDrop.addEventListener("dragover", (event) => {
      if (!workflowDocDragState?.sourceTaskId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      docsPanel?.classList.add("is-doc-unlink-hover");
    });
    docsDrop.addEventListener("dragleave", (event) => {
      if (!docsDrop.contains(event.relatedTarget)) {
        docsPanel?.classList.remove("is-doc-unlink-hover");
      }
    });
    docsDrop.addEventListener("drop", (event) => {
      event.preventDefault();
      docsPanel?.classList.remove("is-doc-unlink-hover", "is-doc-unlink-target");
      const sourceTaskId =
        event.dataTransfer.getData("text/workflow-doc-source-task") ||
        workflowDocDragState?.sourceTaskId ||
        "";
      if (!sourceTaskId) return;
      linkWorkflowTaskDocument(sourceTaskId, null);
      workflowDocDragState = null;
      showTypeToast("Odpięto dokument od zadania");
      softRefreshWorkflowTasks();
    });
  }
}

function bindWorkflowTaskDrag() {
  const list = content.querySelector('[data-role="workflow-task-list"]');
  if (!list) return;

  let dragTaskId = null;

  list.querySelectorAll(".workflow-task-item").forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      if (event.target.closest('[data-role="workflow-task-doc"]')) {
        return;
      }
      const interactive = event.target.closest(
        "button, a, input, textarea, select, label, .workflow-task-action"
      );
      if (interactive && !interactive.matches('[data-role="workflow-drag-handle"]')) {
        event.preventDefault();
        return;
      }
      dragTaskId = item.dataset.taskId || null;
      if (!dragTaskId) {
        event.preventDefault();
        return;
      }
      item.classList.add("is-dragging");
      list.classList.add("is-dragging-tasks");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/workflow-task", dragTaskId);
      event.dataTransfer.setData("text/plain", dragTaskId);
    });

    item.addEventListener("dragend", () => {
      dragTaskId = null;
      item.classList.remove("is-dragging");
      list.classList.remove("is-dragging-tasks");
      clearWorkflowDropMarkers(list);
      requestAnimationFrame(() => drawWorkflowDependencyLinks());
    });

    item.addEventListener("dragover", (event) => {
      if (workflowDocDragState && !list.classList.contains("is-dragging-tasks")) {
        event.preventDefault();
        clearWorkflowDropMarkers(list);
        const targetId = item.dataset.taskId;
        const docId = workflowDocDragState.docId;
        if (workflowDocDragState.sourceTaskId && workflowDocDragState.sourceTaskId === targetId) {
          event.dataTransfer.dropEffect = "none";
          return;
        }
        if (!canAssignWorkflowDocToTask(targetId, docId)) {
          item.classList.add("drop-link-blocked");
          event.dataTransfer.dropEffect = "none";
          return;
        }
        item.classList.add("drop-link-doc");
        event.dataTransfer.dropEffect = workflowDocDragState.sourceTaskId ? "move" : "copy";
        return;
      }

      if (!dragTaskId || dragTaskId === item.dataset.taskId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";

      const path = getActiveWorkflowPath();
      if (path && isWorkflowDescendant(path.tasks || [], dragTaskId, item.dataset.taskId)) {
        clearWorkflowDropMarkers(list);
        return;
      }

      const card = item.querySelector(".workflow-task-card");
      const rect = (card || item).getBoundingClientRect();
      const ratio = (event.clientY - rect.top) / Math.max(1, rect.height);
      clearWorkflowDropMarkers(list);

      if (ratio < 0.28) {
        item.classList.add("drop-before");
      } else if (ratio > 0.72) {
        item.classList.add("drop-after");
      } else {
        item.classList.add("drop-nest");
        if (path?.id && item.dataset.taskId) {
          setWorkflowTaskExpanded(path.id, item.dataset.taskId, true);
          applyWorkflowCollapseVisibility();
        }
      }
    });

    item.addEventListener("dragleave", (event) => {
      if (!item.contains(event.relatedTarget)) {
        item.classList.remove(
          "drop-before",
          "drop-after",
          "drop-nest",
          "drop-link-doc",
          "drop-link-blocked"
        );
      }
    });

    item.addEventListener("drop", (event) => {
      event.preventDefault();
      const docId =
        event.dataTransfer.getData("text/workflow-doc") || workflowDocDragState?.docId || "";
      const sourceTaskId =
        event.dataTransfer.getData("text/workflow-doc-source-task") ||
        workflowDocDragState?.sourceTaskId ||
        "";
      const targetId = item.dataset.taskId;

      if (docId && targetId) {
        clearWorkflowDropMarkers(list);
        if (sourceTaskId && sourceTaskId === targetId) return;
        if (!canAssignWorkflowDocToTask(targetId, docId)) {
          showTypeToast("To zadanie ma już powiązany dokument");
          return;
        }
        linkWorkflowTaskDocument(targetId, docId);
        workflowDocDragState = null;
        showTypeToast(
          sourceTaskId ? "Przepięto dokument na inne zadanie" : "Powiązano dokument z zadaniem"
        );
        softRefreshWorkflowTasks();
        return;
      }

      const sourceId =
        dragTaskId ||
        event.dataTransfer.getData("text/workflow-task") ||
        event.dataTransfer.getData("text/plain");
      const mode = item.classList.contains("drop-nest")
        ? "nest"
        : item.classList.contains("drop-after")
          ? "after"
          : "before";
      clearWorkflowDropMarkers(list);
      list.classList.remove("is-dragging-tasks");
      if (!sourceId || !targetId || sourceId === targetId) return;

      const moved = moveWorkflowTask(sourceId, { mode, targetId });
      if (!moved) {
        if (!moveWorkflowTask.lastError) {
          showTypeToast("Nie można przenieść zadania w to miejsce");
        }
        return;
      }
      showTypeToast(
        mode === "nest" ? "Ustawiono jako podzadanie" : "Zmieniono kolejność zadań"
      );
      softRefreshWorkflowTasks();
    });
  });
}

function bindWorkflowTasksInteractions() {
  content.querySelector('[data-role="workflow-add-task"]')?.addEventListener("click", () => {
    if (!getActiveWorkflowPath()) {
      showTypeToast("Najpierw wybierz ścieżkę");
      return;
    }
    openWorkflowNameModal({
      title: "Nowe zadanie",
      eyebrow: getActiveWorkflowPath()?.name || "Workflow",
      placeholder: "np. Wytworzenie projektu budowlanego",
      onSave: (name) => {
        const task = createWorkflowTask(name, null);
        if (!task) return;
        showTypeToast(`Dodano zadanie: ${task.name}`);
        softRefreshWorkflowTasks();
      },
    });
  });

  content.querySelector('[data-role="workflow-collapse-all"]')?.addEventListener("click", () => {
    const active = getActiveWorkflowPath();
    if (!active) return;
    collapseAllWorkflowTasks(active.id, active.tasks || []);
    applyWorkflowCollapseVisibility();
    showTypeToast("Zwinięto do najwyższego poziomu");
  });

  content.querySelectorAll('[data-role="workflow-toggle-task"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const active = getActiveWorkflowPath();
      const taskId = btn.dataset.taskId;
      if (!active || !taskId) return;
      const next = !isWorkflowTaskExpanded(active.id, taskId);
      setWorkflowTaskExpanded(active.id, taskId, next);
      applyWorkflowCollapseVisibility();
    });
  });

  content.querySelectorAll('[data-role="workflow-remove-dep"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const fromId = btn.dataset.from;
      const toId = btn.dataset.to;
      if (!fromId || !toId) return;
      removeWorkflowDependency(fromId, toId);
      showTypeToast("Usunięto powiązanie");
      softRefreshWorkflowTasks();
    });
  });

  content.querySelectorAll('[data-role="workflow-auto-name-from-doc"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const taskId = btn.dataset.taskId;
      if (!taskId) return;
      const updated = renameWorkflowTaskFromLinkedDocument(taskId);
      if (!updated) return;
      const task = updated.tasks?.find((item) => item.id === taskId);
      showTypeToast(task ? `Nazwa: ${task.name}` : "Zaktualizowano nazwę");
      softRefreshWorkflowTasks();
    });
  });

  content.querySelectorAll('[data-role="workflow-edit-task"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const taskId = btn.dataset.taskId;
      const task = getActiveWorkflowPath()?.tasks?.find((item) => item.id === taskId);
      if (!task) return;
      openWorkflowNameModal({
        title: "Edytuj zadanie",
        eyebrow: getActiveWorkflowPath()?.name || "Workflow",
        fieldLabel: "Nazwa zadania",
        placeholder: task.name,
        onSave: (name) => {
          renameWorkflowTask(taskId, name);
          showTypeToast("Zaktualizowano nazwę");
          softRefreshWorkflowTasks();
        },
      });
      const input = document.querySelector("#workflowModalName");
      if (input) input.value = task.name;
    });
  });

  content.querySelectorAll('[data-role="workflow-delete-task"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const taskId = btn.dataset.taskId;
      if (workflowRuntime.mode === "project" && workflowRuntime.projectId) {
        if (!confirmAndDeleteProjectTask(workflowRuntime.projectId, taskId)) return;
        softRefreshWorkflowTasks();
        return;
      }
      const task = getActiveWorkflowPath()?.tasks?.find((item) => item.id === taskId);
      if (!task) return;
      const hasKids =
        (getWorkflowChildIds(getActiveWorkflowPath()?.tasks || []).get(taskId) || []).length > 0;
      const ok = window.confirm(
        `Usunąć zadanie „${task.name}”${hasKids ? " wraz z podzadaniami" : ""}?`
      );
      if (!ok) return;
      deleteWorkflowTask(taskId);
      showTypeToast("Usunięto zadanie");
      softRefreshWorkflowTasks();
    });
  });

  content.querySelectorAll('[data-role="workflow-duration"]').forEach((input) => {
    const commit = () => {
      const taskId = input.dataset.taskId;
      if (!taskId) return;
      setWorkflowTaskDuration(taskId, input.value);
      softRefreshWorkflowTasks();
    };
    input.addEventListener("change", commit);
  });

  content.querySelectorAll('[data-role="workflow-start-date"]').forEach((input) => {
    input.addEventListener("change", () => {
      const taskId = input.dataset.taskId;
      if (!taskId) return;
      setWorkflowTaskStartDate(taskId, input.value || null);
      softRefreshWorkflowTasks();
    });
  });

  content.querySelectorAll('[data-role="workflow-add-child"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const parentId = btn.dataset.taskId;
      const active = getActiveWorkflowPath();
      const parent = active?.tasks?.find((task) => task.id === parentId);
      if (active && parentId) {
        setWorkflowTaskExpanded(active.id, parentId, true);
      }
      openWorkflowNameModal({
        title: "Podzadanie",
        eyebrow: parent?.name || active?.name || "Workflow",
        placeholder: "np. Korekty dokumentacji",
        onSave: (name) => {
          const task = createWorkflowTask(name, parentId);
          if (!task) return;
          showTypeToast(`Dodano podzadanie: ${task.name}`);
          softRefreshWorkflowTasks();
        },
      });
    });
  });

  content.querySelectorAll('[data-role="workflow-set-blocks"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const taskId = btn.dataset.taskId;
      const active = getActiveWorkflowPath();
      const task = active?.tasks?.find((item) => item.id === taskId);
      if (!task) return;
      openWorkflowTaskPickerModal({
        title: "Wymaga wykonania",
        lead: `Wybierz zadania z tej ścieżki, które muszą być wykonane, zanim ruszy „${task.name}”.`,
        taskId,
        selectedIds: task.blockedBy || [],
        onSave: (ids) => {
          setWorkflowTaskDependencies(taskId, ids, "blockedBy");
          showTypeToast("Zapisano: wymaga wykonania");
          softRefreshWorkflowTasks();
        },
      });
    });
  });

  content.querySelectorAll('[data-role="workflow-link-doc"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      openWorkflowDocPickerModal(btn.dataset.taskId);
    });
  });

  bindWorkflowTaskDrag();
}

function bindWorkflowUnassignedDocsAction() {
  content.querySelector('[data-role="workflow-create-unassigned"]')?.addEventListener("click", () => {
    if (!getActiveWorkflowPath()) {
      showTypeToast("Najpierw wybierz ścieżkę");
      return;
    }
    const count = createWorkflowTasksForUnassignedDocuments();
    if (!count) {
      showTypeToast("Brak nieprzypisanych dokumentów");
      return;
    }
    showTypeToast(
      count === 1
        ? "Utworzono 1 zadanie Produkcja dla dokumentu"
        : `Utworzono ${count} zadań Produkcja dla dokumentów`
    );
    softRefreshWorkflowTasks();
  });
}

function bindWorkflowView() {
  setWorkflowRuntime({ mode: "global" });
  content.querySelector('[data-role="workflow-add-path"]')?.addEventListener("click", () => {
    openWorkflowPathCreateModal();
  });

  content.querySelectorAll('[data-role="workflow-select-path"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const pathId = btn.dataset.pathId;
      if (!pathId) return;
      setActiveWorkflowPathId(pathId);
      renderView("workflow");
    });
  });

  content.querySelectorAll('[data-role="workflow-locate-task"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      focusWorkflowTaskFromDoc(btn.dataset.docId);
    });
  });

  content.querySelectorAll('[data-role="workflow-docs-toggle"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const layout = content.querySelector('[data-role="workflow-layout"]');
      const docsPanel = content.querySelector('[data-role="workflow-documents"]');
      const reopen = content.querySelector(".workflow-docs-reopen");
      const next = !isWorkflowDocsCollapsed();
      setWorkflowDocsCollapsed(next);
      layout?.classList.toggle("is-docs-collapsed", next);
      if (docsPanel) docsPanel.hidden = next;
      if (reopen) reopen.hidden = !next;
      requestAnimationFrame(() => drawWorkflowDependencyLinks());
    });
  });

  bindWorkflowUnassignedDocsAction();
  bindWorkflowTasksInteractions();
  bindWorkflowDocDrag();
  bindWorkflowDependencyRedraw();
  applyWorkflowTaskHighlight();
}

function bindProjectFlowView(projectId) {
  setWorkflowRuntime({ mode: "project", projectId });
  content.querySelectorAll('[data-role="workflow-locate-task"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      focusWorkflowTaskFromDoc(btn.dataset.docId);
    });
  });
  content.querySelectorAll('[data-role="workflow-docs-toggle"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const layout = content.querySelector('[data-role="workflow-layout"]');
      const docsPanel = content.querySelector('[data-role="workflow-documents"]');
      const reopen = content.querySelector(".workflow-docs-reopen");
      const next = !isWorkflowDocsCollapsed();
      setWorkflowDocsCollapsed(next);
      layout?.classList.toggle("is-docs-collapsed", next);
      if (docsPanel) docsPanel.hidden = next;
      if (reopen) reopen.hidden = !next;
      requestAnimationFrame(() => drawWorkflowDependencyLinks());
    });
  });
  if (content.querySelector('[data-role="workflow-layout"]')) {
    bindWorkflowUnassignedDocsAction();
    bindWorkflowTasksInteractions();
    bindWorkflowDocDrag();
    bindWorkflowDependencyRedraw();
    applyWorkflowTaskHighlight();
  }
}

function openProjectFlowGenerateModal(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;
  let paths = [];
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    paths = Array.isArray(parsed?.paths)
      ? parsed.paths
          .map((item, index) => normalizeWorkflowPath(item, index))
          .filter((item) => item.id)
      : [];
  } catch {
    paths = [];
  }
  const modal = ensureWorkflowModal();
  const seedCount = (project.formalSurvey?.documents || []).length;
  modal.innerHTML = `
    <div class="category-modal-backdrop" data-role="close-workflow-modal"></div>
    <div class="category-modal-dialog workflow-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="workflowModalTitle">
      <header class="category-modal-head">
        <div>
          <p class="eyebrow">${escapeHtml(project.title)}</p>
          <h2 id="workflowModalTitle">Generuj Flow</h2>
          <p class="workflow-modal-lead">
            ${
              seedCount
                ? `Źródło: Projekt budowlany + ankieta (${seedCount} dok.).`
                : "Źródło: Projekt budowlany (brak ankiety)."
            }
            Ponowne generowanie scala z istniejącymi zadaniami Flow.
          </p>
        </div>
        <button type="button" class="icon-btn modal-close" data-role="close-workflow-modal" aria-label="Zamknij">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div class="category-modal-body">
        ${
          paths.length
            ? `<ul class="workflow-picker-list">
                ${paths
                  .map(
                    (path, index) => `
                  <li>
                    <label class="workflow-picker-option">
                      <input type="radio" name="project-flow-path" value="${escapeHtml(
                        path.id
                      )}" ${index === 0 ? "checked" : ""} />
                      <span>${escapeHtml(path.name)}
                        <em class="workflow-picker-note">${
                          (path.tasks || []).length
                        } zadań we wzorcu</em>
                      </span>
                    </label>
                  </li>`
                  )
                  .join("")}
              </ul>`
            : `<p class="workflow-paths-empty">Brak ścieżek we wzorcu Workflow — najpierw zdefiniuj flow w zakładce Workflow.</p>`
        }
      </div>
      <footer class="category-modal-foot">
        <button type="button" class="ghost-btn" data-role="close-workflow-modal">Anuluj</button>
        <button type="button" class="primary-btn" data-role="save-workflow-modal" ${
          paths.length ? "" : "disabled"
        }>Generuj</button>
      </footer>
    </div>
  `;

  const save = () => {
    const pathId = modal.querySelector('input[name="project-flow-path"]:checked')?.value;
    const templatePath = paths.find((item) => item.id === pathId);
    if (!templatePath || typeof applyWorkflowPathToProject !== "function") return;
    const result = applyWorkflowPathToProject(project, templatePath);
    const withDates = projectFlowHasRootStart(result.project?.flowInstance?.tasks)
      ? applyFlowScheduleDatesToProject(result.project)
      : result.project;
    persistProject(withDates);
    closeWorkflowModal();
    setTasksViewMode("flow");
    showTypeToast(
      result.addedTasks > 0
        ? `Flow scalony — dodano ${result.addedTasks} zadań`
        : "Flow scalony — bez nowych zadań"
    );
    renderView("project-detail", projectOverviewNav(projectId, { listTab: "tasks" }));
  };

  modal.querySelectorAll('[data-role="close-workflow-modal"]').forEach((el) => {
    el.addEventListener("click", closeWorkflowModal);
  });
  modal.querySelector('[data-role="save-workflow-modal"]')?.addEventListener("click", save);
  modal.hidden = false;
}

function readConfigFromDom() {
  const statusRows = [...content.querySelectorAll('[data-role="status-list"] .config-row')];
  const typeRows = [...content.querySelectorAll('[data-role="type-list"] .config-row')];
  const statuses = statusRows.map((row, index) => ({
    id: row.dataset.statusId || `status-${index + 1}`,
    label: row.querySelector('[data-role="status-label"]')?.value.trim() || `Status ${index + 1}`,
    color: normalizeStatusColor(
      row.querySelector('[data-role="status-color"]')?.value || row.dataset.statusColor,
      defaultStatusColorForIndex(index)
    ),
    order: index,
    autoCompleteAt100: Boolean(row.querySelector('[data-role="status-auto-100"]')?.checked),
  }));
  const taskTypes = typeRows.map((row, index) => {
    const id = row.dataset.typeId || `type-${index + 1}`;
    return {
      id,
      label: row.querySelector('[data-role="type-label"]')?.value.trim() || `Typ ${index + 1}`,
      autoFromDocs:
        id === "document" || Boolean(row.querySelector('[data-role="type-auto-docs"]')?.checked),
    };
  });
  return { statuses, taskTypes };
}

function refreshConfigurationView() {
  content.innerHTML = configurationViewHtml();
  bindConfigurationView();
}

function bindConfigurationView() {
  content.querySelector('[data-role="config-add-status"]')?.addEventListener("click", () => {
    const config = readConfigFromDom();
    config.statuses.push({
      id: `status-${Date.now()}`,
      label: `Nowy status ${config.statuses.length + 1}`,
      color: defaultStatusColorForIndex(config.statuses.length),
      order: config.statuses.length,
      autoCompleteAt100: false,
    });
    saveAppConfig(config);
    refreshConfigurationView();
  });

  content.querySelector('[data-role="config-add-type"]')?.addEventListener("click", () => {
    const config = readConfigFromDom();
    config.taskTypes.push({
      id: `type-${Date.now()}`,
      label: `Nowy typ ${config.taskTypes.length + 1}`,
      autoFromDocs: false,
    });
    saveAppConfig(config);
    refreshConfigurationView();
  });

  content.querySelectorAll('[data-role="status-move-up"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".config-row");
      const config = readConfigFromDom();
      const index = config.statuses.findIndex((item) => item.id === row?.dataset.statusId);
      if (index <= 0) return;
      const swap = config.statuses[index - 1];
      config.statuses[index - 1] = config.statuses[index];
      config.statuses[index] = swap;
      config.statuses = config.statuses.map((item, order) => ({ ...item, order }));
      saveAppConfig(config);
      refreshConfigurationView();
    });
  });

  content.querySelectorAll('[data-role="status-move-down"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".config-row");
      const config = readConfigFromDom();
      const index = config.statuses.findIndex((item) => item.id === row?.dataset.statusId);
      if (index < 0 || index >= config.statuses.length - 1) return;
      const swap = config.statuses[index + 1];
      config.statuses[index + 1] = config.statuses[index];
      config.statuses[index] = swap;
      config.statuses = config.statuses.map((item, order) => ({ ...item, order }));
      saveAppConfig(config);
      refreshConfigurationView();
    });
  });

  content.querySelectorAll('[data-role="status-remove"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".config-row");
      const config = readConfigFromDom();
      if (config.statuses.length <= 1) return;
      config.statuses = config.statuses
        .filter((item) => item.id !== row?.dataset.statusId)
        .map((item, order) => ({ ...item, order }));
      saveAppConfig(config);
      refreshConfigurationView();
    });
  });

  content.querySelectorAll('[data-role="type-remove"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".config-row");
      if (row?.dataset.typeId === "document") return;
      const config = readConfigFromDom();
      config.taskTypes = config.taskTypes.filter((item) => item.id !== row?.dataset.typeId);
      saveAppConfig(config);
      refreshConfigurationView();
    });
  });

  content.querySelectorAll('[data-role="status-auto-100"]').forEach((box) => {
    box.addEventListener("change", () => {
      if (!box.checked) return;
      content.querySelectorAll('[data-role="status-auto-100"]').forEach((other) => {
        if (other !== box) other.checked = false;
      });
    });
  });

  content.querySelector('[data-role="config-save"]')?.addEventListener("click", () => {
    const config = readConfigFromDom();
    if (!config.statuses.length) {
      showTypeToast("Dodaj co najmniej jeden status");
      return;
    }
    if (!config.taskTypes.some((item) => item.id === "document")) {
      config.taskTypes.unshift({ id: "document", label: "Dokument", autoFromDocs: true });
    }
    const autoCount = config.statuses.filter((item) => item.autoCompleteAt100).length;
    if (autoCount > 1) {
      showTypeToast("Tylko jeden status może być ustawiany po 100%");
      return;
    }
    saveAppConfig(config);
    showTypeToast("Zapisano konfigurację");
    refreshConfigurationView();
  });
}

function renderView(view, options = {}) {
  if (
    !bypassFormDirtyGuard &&
    isActiveFormDirty() &&
    isLeavingFormContext(view, options)
  ) {
    openUnsavedChangesModal({
      onSaveExit: () => {
        bypassFormDirtyGuard = true;
        renderView(view, options);
        bypassFormDirtyGuard = false;
      },
      onDiscard: () => {
        bypassFormDirtyGuard = true;
        renderView(view, options);
        bypassFormDirtyGuard = false;
      },
      onCancel: () => {},
    });
    return;
  }

  closeCategoryModal();
  closeUnsavedChangesModal();
  unbindFormSaveChrome();
  const title = titles[view] || "Pulpit";
  pageTitle.textContent = title;
  setActiveNav(view);

  if (view === "dashboard") {
    content.innerHTML = dashboardShellHtml;
    hydrateDashboard();
    bindAiChat();
    content.querySelectorAll("[data-view]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        renderView(el.dataset.view);
        closeMenu();
      });
    });
  } else if (view === "new-project") {
    editingProjectId = null;
    projectFiles = [];
    fileIdSeq = 1;
    content.innerHTML = newProjectHtml();
    bindNewProjectForm();
    bindAiChat();
  } else if (view === "projects") {
    content.innerHTML = projectsViewHtml(options.justSavedId || null);
    content.querySelectorAll("[data-view]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        renderView(el.dataset.view);
      });
    });
    bindProjectOpeners();
  } else if (view === "building-projects") {
    content.innerHTML = buildingProjectsViewHtml();
    content.querySelectorAll("[data-view]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        renderView(el.dataset.view);
      });
    });
    bindFormsTables("building-projects");
  } else if (view === "docs-to-submit") {
    content.innerHTML = docsToSubmitViewHtml();
    content.querySelectorAll("[data-view]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        renderView(el.dataset.view);
      });
    });
    content.querySelectorAll('[data-role="open-doc-form"]').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        renderView("project-detail", {
          projectId: btn.dataset.projectId,
          panel: "doc-form",
          focusDocId: btn.dataset.docId,
        });
      });
    });
    bindDocumentPdfDownloads();
    bindProjectOpeners();
  } else if (view === "zalaczniki") {
    content.innerHTML = attachmentsViewHtml();
    content.querySelectorAll("[data-view]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        renderView(el.dataset.view);
      });
    });
    bindFormsTables("zalaczniki");
    bindGlobalAttachmentsFilters();
  } else if (view === "tasks-calendar") {
    content.innerHTML = tasksCalendarViewHtml();
    content.querySelectorAll("[data-view]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        renderView(el.dataset.view);
      });
    });
    const panel = content.querySelector('[data-role="project-tasks-panel"]');
    const focusId = panel?.dataset.projectId || loadProjects()[0]?.id;
    if (focusId) bindProjectDetailActions(focusId);
    bindGlobalTasksTableFilters();
  } else if (view === "project-detail") {
    const project = getProjectById(options.projectId);
    if (!project) {
      renderView("building-projects");
      return;
    }
    const panel = options.panel || "overview";
    pageTitle.textContent = projectDetailPageTitle(project, panel, options);
    if (panel === "formal-survey") initSurveyDraft(project);
    content.innerHTML = `
      ${
        options.justSaved
          ? `<p class="save-toast">Projekt zapisany — możesz go przeglądać i edytować.</p>`
          : ""
      }
      ${
        options.justSavedForm
          ? `<p class="save-toast">Formularz projektu budowlanego zapisany w projekcie.</p>`
          : ""
      }
      ${
        options.justSavedSurvey
          ? `<p class="save-toast">Ankieta zapisana — dokumenty są na liście. Wygeneruj Flow, aby dodać zadania.</p>`
          : ""
      }
      ${projectDetailHtml(project, panel, {
        focusDocId: options.focusDocId || null,
        focusTaskId: options.focusTaskId || null,
        listTab: options.listTab || getProjectListTab(),
      })}
    `;
    content.querySelectorAll("[data-view]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        renderView(el.dataset.view);
      });
    });
    content.querySelectorAll('[data-role="edit-project"]').forEach((btn) => {
      btn.addEventListener("click", () => openProjectForEdit(btn.dataset.projectId));
    });
    bindProjectDetailActions(project.id);
    if (
      (getTasksViewMode() === "flow" ||
        getTasksViewMode() === "cards" ||
        getTasksViewMode() === "table") &&
      (options.listTab || getProjectListTab()) === "tasks" &&
      (!options.panel || options.panel === "overview")
    ) {
      if (getTasksViewMode() === "flow") {
        bindProjectFlowView(project.id);
      } else {
        setWorkflowRuntime({ mode: "project", projectId: project.id });
      }
    } else {
      setWorkflowRuntime({ mode: "global" });
    }
    if (panel === "building-form") bindBuildingForm(project.id);
    if (panel === "formal-survey") bindFormalSurvey(project.id);
    if (panel === "kpa") bindKpaPanel(project.id);
    if (panel === "doc-form") {
      bindProjectDocForms(project.id);
      bindDocumentPdfDownloads();
    }
    if (panel === "task-detail") {
      bindTaskDescriptionEditors(project.id);
      bindContextFlowWidget();
    }
    if (
      panel !== "formal-survey" &&
      panel !== "doc-form" &&
      panel !== "kpa" &&
      panel !== "task-detail" &&
      panel !== "building-form"
    ) {
      bindAiChat();
    }
    if (options.focusDocId && panel === "overview") {
      const target = content.querySelector(
        `details.doc-form-item[data-doc-id="${options.focusDocId}"]`
      );
      target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  } else if (view === "users" || view === "permissions") {
    content.innerHTML = placeholderViewHtml(
      titles[view] || title,
      descriptions[view] || "Widok w przygotowaniu."
    );
    content.querySelectorAll("[data-view]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        renderView(el.dataset.view);
      });
    });
  } else if (view === "account") {
    content.innerHTML = accountViewHtml();
    bindAccountView();
  } else if (view === "configuration") {
    content.innerHTML = configurationViewHtml();
    bindConfigurationView();
  } else if (view === "workflow") {
    content.innerHTML = workflowViewHtml();
    bindWorkflowView();
  } else {
    content.innerHTML = `
      <section class="placeholder-view">
        <p class="eyebrow">snapPoint</p>
        <h1>${title}</h1>
        <p>${descriptions[view] || ""}</p>
      </section>
    `;
  }

  content.style.animation = "none";
  void content.offsetWidth;
  content.style.animation = "";
  closeMenu();

  const navOptions =
    view === "project-detail"
      ? cleanNavOptions({
          projectId: options.projectId,
          panel: options.panel || "overview",
          listTab: options.listTab || getProjectListTab(),
          focusDocId: options.focusDocId || null,
        })
      : cleanNavOptions(options);
  persistNavigation(view, navOptions);
  currentNavRef = { view, options: navOptions };
  if (navBootstrapActive) {
    navBootstrapActive = false;
    scheduleNavScrollRestore(view, navOptions);
  } else {
    window.scrollTo(0, 0);
    saveNavScroll(view, navOptions, { y: 0, ganttLeft: 0, ganttTop: 0 });
  }

  if (typeof notifyTutorial === "function") {
    notifyTutorial("view", view);
    notifyTutorial("view-rendered", view);
  }
}

function openMenu() {
  sidebar.classList.add("is-open");
  backdrop.hidden = false;
}

function closeMenu() {
  sidebar.classList.remove("is-open");
  backdrop.hidden = true;
}

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (event) => {
    if (item.classList.contains("is-disabled") || item.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      return;
    }
    const view = item.dataset.view;
    if (getUiVersion() === "v2") {
      if (view === "dashboard") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("snappoint:v2-home"));
        return;
      }
      if (view === "workflow") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("snappoint:v2-workflow"));
        return;
      }
      if (view === "configuration") {
        if (typeof window.snappointV2GoConfiguration === "function") {
          event.preventDefault();
          try {
            window.snappointV2GoConfiguration("statuses");
          } catch (err) {
            console.error("[v2] open configuration", err);
            if (typeof showTypeToast === "function") {
              showTypeToast("Nie udało się otworzyć konfiguracji");
            }
          }
          return;
        }
        // Brak API V2 — pozwól na pełne przejście ?v2=configuration
        return;
      }
      if (item.dataset.soon === "1" || item.classList.contains("is-soon")) {
        event.preventDefault();
        if (typeof showTypeToast === "function") {
          showTypeToast("W przygotowaniu");
        } else {
          window.alert("W przygotowaniu");
        }
        return;
      }
      event.preventDefault();
      return;
    }
    event.preventDefault();
    renderView(view);
  });
});

document.querySelectorAll(".brand-mark").forEach((brand) => {
  brand.addEventListener("click", (event) => {
    event.preventDefault();
    if (getUiVersion() === "v2") {
      window.dispatchEvent(new CustomEvent("snappoint:v2-home"));
      return;
    }
    renderView("dashboard");
  });
});

content.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", (event) => {
    event.preventDefault();
    renderView(el.dataset.view);
  });
});

applyUrlBootstrap();
bindAiChat();
applySidebarCollapsedState();
bindNavScrollPersistence();

document.querySelectorAll('[data-role="toggle-sidebar-rail"]').forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isMobileNav()) return;
    setSidebarCollapsed(!isSidebarCollapsed());
  });
});

document.getElementById("aiChatFab")?.addEventListener("click", () => {
  setAiChatMinimized(false);
});

document.querySelector('[data-role="topbar-ai-btn"]')?.addEventListener("click", (event) => {
  // New (V2): obsługuje listener w v2/app.js
  if (typeof getUiVersion === "function" && getUiVersion() === "v2") return;
  event.preventDefault();
  setAiChatMinimized(false);
});

menuToggle?.addEventListener("click", () => {
  if (isMobileNav()) {
    if (sidebar.classList.contains("is-open")) closeMenu();
    else openMenu();
    return;
  }
  setSidebarCollapsed(!isSidebarCollapsed());
});

backdrop?.addEventListener("click", closeMenu);

window.addEventListener("resize", () => {
  applySidebarCollapsedState();
  if (!isMobileNav()) closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!document.getElementById("unsavedChangesModal")?.hidden) {
      closeUnsavedChangesModal();
      return;
    }
    if (document.querySelector('[data-role="ui-gen-switch"]')?.classList.contains("is-open")) {
      closeUiGenMenu();
      return;
    }
    if (document.querySelector('[data-role="ui-version-switch"]')?.classList.contains("is-open")) {
      closeUiVersionMenu();
      return;
    }
    if (document.querySelector('[data-role="theme-menu"]')?.classList.contains("is-open")) {
      closeThemeMenu();
      return;
    }
    if (!document.getElementById("discussionModal")?.hidden) {
      closeDiscussionModal();
      return;
    }
    if (!document.getElementById("relatedTasksModal")?.hidden) {
      closeRelatedTasksModal();
      return;
    }
    if (!document.getElementById("generateProjectModal")?.hidden) {
      return;
    }
    if (!document.getElementById("attachmentPickerModal")?.hidden) {
      closeAttachmentPicker();
      return;
    }
    if (!document.getElementById("addTaskModal")?.hidden) {
      closeAddTaskModal();
      return;
    }
    if (!document.getElementById("bulkTaskModal")?.hidden) {
      closeBulkTaskModal();
      return;
    }
    if (!document.getElementById("categoryModal")?.hidden) {
      closeCategoryModal();
      return;
    }
    closeMenu();
  }
});

const THEME_STORAGE_KEY = "snappoint.theme";
const UI_VERSION_STORAGE_KEY = "snappoint.uiVersion";
// New = silnik V2. Kolorystyka New: V2 (bazowa) + V3/V4/V5 (data-ui-skin).
// Old = wyłącznie stary system V1.
const UI_SKIN_STORAGE_KEY = "snappoint.uiSkin";
const UI_SKINS = ["v3", "v4", "v5"];
const UI_COLOR_IDS = ["v2", "v3", "v4", "v5"];

function getUiVersion() {
  try {
    return localStorage.getItem(UI_VERSION_STORAGE_KEY) === "v2" ? "v2" : "v1";
  } catch {
    return "v1";
  }
}

function getUiGeneration() {
  return getUiVersion() === "v2" ? "new" : "old";
}

/** Aktywna kolorystyka New: v2 | v3 | v4 | v5 (null w Old). */
function getUiColorId() {
  try {
    if (getUiVersion() !== "v2") return null;
    const skin = localStorage.getItem(UI_SKIN_STORAGE_KEY);
    if (UI_SKINS.includes(skin)) return skin;
    return "v2";
  } catch {
    return "v2";
  }
}

function getUiSkin() {
  const color = getUiColorId();
  return UI_SKINS.includes(color) ? color : null;
}

function syncUiChrome() {
  const gen = getUiGeneration();
  const isNew = gen === "new";
  const colorId = getUiColorId() || "v2";

  document.querySelectorAll('[data-role="ui-gen"]').forEach((btn) => {
    const active = btn.dataset.uiGen === gen;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-checked", active ? "true" : "false");
  });
  const genLabel = document.querySelector('[data-role="ui-gen-label"]');
  if (genLabel) genLabel.textContent = isNew ? "New" : "Old";

  const colorSwitch = document.querySelector('[data-role="ui-version-switch"]');
  if (colorSwitch) colorSwitch.hidden = !isNew;

  document.querySelectorAll('[data-role="ui-version"]').forEach((btn) => {
    const active = isNew && btn.dataset.uiVersion === colorId;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-checked", active ? "true" : "false");
  });
  const versionLabel = document.querySelector('[data-role="ui-version-label"]');
  if (versionLabel) versionLabel.textContent = String(colorId).toUpperCase();
}

function applyUiVersion(version) {
  let next;
  let colorId = null;

  if (version === "v1" || version === "old") {
    next = "v1";
  } else if (UI_COLOR_IDS.includes(version) || version === "new") {
    next = "v2";
    if (version === "new") {
      try {
        const saved = localStorage.getItem(UI_SKIN_STORAGE_KEY);
        colorId = UI_COLOR_IDS.includes(saved) ? saved : "v2";
      } catch {
        colorId = "v2";
      }
    } else {
      colorId = version;
    }
  } else {
    next = "v1";
  }

  const skin = UI_SKINS.includes(colorId) ? colorId : null;
  document.documentElement.setAttribute("data-ui-version", next);
  if (skin) document.documentElement.setAttribute("data-ui-skin", skin);
  else document.documentElement.removeAttribute("data-ui-skin");

  try {
    localStorage.setItem(UI_VERSION_STORAGE_KEY, next);
    // Zachowaj ostatnią kolorystykę New także przy Old — wraca po przełączeniu
    if (colorId) localStorage.setItem(UI_SKIN_STORAGE_KEY, colorId);
  } catch {
    /* ignore */
  }

  // Paleta „Kolorystyka” tylko w Old; New ma wyłącznie V2–V5
  try {
    if (next === "v2") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || "snappoint");
    }
  } catch {
    /* ignore */
  }

  const v2Shell = document.querySelector('[data-role="v2-shell"]');
  if (v2Shell) v2Shell.hidden = next !== "v2";

  syncUiChrome();

  // V2/New: wszystkie pozycje klikalne; niedokończone mają oznaczenie „w przygotowaniu”
  const sidebar = document.getElementById("appSidebar");
  if (sidebar) {
    sidebar.querySelectorAll(".nav-item").forEach((el) => {
      el.removeAttribute("aria-disabled");
      el.removeAttribute("tabindex");
    });
    sidebar.querySelectorAll(".brand-mark").forEach((el) => {
      el.removeAttribute("aria-disabled");
      el.removeAttribute("tabindex");
      if (next === "v2") {
        el.setAttribute("aria-label", "snapPoint — lista projektów");
      } else {
        el.setAttribute("aria-label", "snapPoint — Pulpit");
      }
    });
  }

  window.dispatchEvent(
    new CustomEvent("snappoint:ui-version", { detail: { version: next } })
  );
}

function closeUiGenMenu() {
  const menu = document.querySelector('[data-role="ui-gen-switch"]');
  const toggle = menu?.querySelector('[data-role="ui-gen-toggle"]');
  const panel = menu?.querySelector('[data-role="ui-gen-panel"]');
  if (!menu || !toggle || !panel) return;
  menu.classList.remove("is-open");
  panel.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
}

function openUiGenMenu() {
  const menu = document.querySelector('[data-role="ui-gen-switch"]');
  const toggle = menu?.querySelector('[data-role="ui-gen-toggle"]');
  const panel = menu?.querySelector('[data-role="ui-gen-panel"]');
  if (!menu || !toggle || !panel) return;
  closeUiVersionMenu();
  closeThemeMenu();
  menu.classList.add("is-open");
  panel.hidden = false;
  toggle.setAttribute("aria-expanded", "true");
}

function closeUiVersionMenu() {
  const menu = document.querySelector('[data-role="ui-version-switch"]');
  const toggle = menu?.querySelector('[data-role="ui-version-toggle"]');
  const panel = menu?.querySelector('[data-role="ui-version-panel"]');
  if (!menu || !toggle || !panel) return;
  menu.classList.remove("is-open");
  panel.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
}

function openUiVersionMenu() {
  const menu = document.querySelector('[data-role="ui-version-switch"]');
  const toggle = menu?.querySelector('[data-role="ui-version-toggle"]');
  const panel = menu?.querySelector('[data-role="ui-version-panel"]');
  if (!menu || !toggle || !panel || menu.hidden) return;
  closeUiGenMenu();
  closeThemeMenu();
  menu.classList.add("is-open");
  panel.hidden = false;
  toggle.setAttribute("aria-expanded", "true");
}

function initUiGenSwitcher() {
  const menu = document.querySelector('[data-role="ui-gen-switch"]');
  const toggle = menu?.querySelector('[data-role="ui-gen-toggle"]');
  if (!menu || !toggle) return;

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (menu.classList.contains("is-open")) closeUiGenMenu();
    else openUiGenMenu();
  });

  menu.querySelectorAll('[data-role="ui-gen"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      applyUiVersion(btn.dataset.uiGen === "new" ? "new" : "old");
      closeUiGenMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!menu.classList.contains("is-open")) return;
    if (event.target.closest('[data-role="ui-gen-switch"]')) return;
    closeUiGenMenu();
  });
}

function initUiVersionSwitcher() {
  const savedColor = (() => {
    try {
      const skin = localStorage.getItem(UI_SKIN_STORAGE_KEY);
      if (UI_COLOR_IDS.includes(skin)) return skin;
    } catch {
      /* ignore */
    }
    return null;
  })();
  if (getUiVersion() === "v2") {
    applyUiVersion(savedColor || "v2");
  } else {
    applyUiVersion("v1");
  }

  initUiGenSwitcher();

  const menu = document.querySelector('[data-role="ui-version-switch"]');
  const toggle = menu?.querySelector('[data-role="ui-version-toggle"]');
  if (!menu || !toggle) return;

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (menu.hidden) return;
    if (menu.classList.contains("is-open")) closeUiVersionMenu();
    else openUiVersionMenu();
  });

  menu.querySelectorAll('[data-role="ui-version"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      applyUiVersion(btn.dataset.uiVersion);
      closeUiVersionMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!menu.classList.contains("is-open")) return;
    if (event.target.closest('[data-role="ui-version-switch"]')) return;
    closeUiVersionMenu();
  });
}

function closeThemeMenu() {
  const menu = document.querySelector('[data-role="theme-menu"]');
  const toggle = menu?.querySelector('[data-role="theme-menu-toggle"]');
  const panel = menu?.querySelector('[data-role="theme-menu-panel"]');
  if (!menu || !toggle || !panel) return;
  menu.classList.remove("is-open");
  panel.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
}

function openThemeMenu() {
  const menu = document.querySelector('[data-role="theme-menu"]');
  const toggle = menu?.querySelector('[data-role="theme-menu-toggle"]');
  const panel = menu?.querySelector('[data-role="theme-menu-panel"]');
  if (!menu || !toggle || !panel) return;
  menu.classList.add("is-open");
  panel.hidden = false;
  toggle.setAttribute("aria-expanded", "true");
}

function applyTheme(themeId) {
  const allowed = new Set([
    "snappoint",
    "homeguide",
    "bluemint",
    "navyelectric",
    "royalgold",
    "brownbeige",
    "classic",
    "noir",
  ]);
  const id = allowed.has(themeId) ? themeId : "snappoint";
  if (id === "snappoint" || document.documentElement.hasAttribute("data-ui-skin")) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", id);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch (e) {}
  document.querySelectorAll(".theme-menu-item[data-theme-id]").forEach((btn) => {
    const active = btn.dataset.themeId === id;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-checked", active ? "true" : "false");
  });
}

function initThemeSwitcher() {
  let saved = "snappoint";
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY) || "snappoint";
  } catch (e) {}
  applyTheme(saved);

  const menu = document.querySelector('[data-role="theme-menu"]');
  const toggle = menu?.querySelector('[data-role="theme-menu-toggle"]');
  if (!menu || !toggle) return;

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (menu.classList.contains("is-open")) closeThemeMenu();
    else {
      closeUiGenMenu();
      closeUiVersionMenu();
      openThemeMenu();
    }
  });

  menu.querySelectorAll(".theme-menu-item[data-theme-id]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      applyTheme(btn.dataset.themeId);
      closeThemeMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!menu.classList.contains("is-open")) return;
    if (event.target.closest('[data-role="theme-menu"]')) return;
    closeThemeMenu();
  });
}

window.addEventListener("beforeunload", (event) => {
  if (!isActiveFormDirty()) return;
  event.preventDefault();
  event.returnValue = "";
});

initThemeSwitcher();
initUiVersionSwitcher();
