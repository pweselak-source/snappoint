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
  account: "Zarządzanie kontem",
  checklist: "Checklista formalna",
};

const descriptions = {
  dashboard: null,
  projects: "Lista projektów inwestycyjnych pojawi się w kolejnym kroku mockupu.",
  "docs-to-submit": "Dokumenty urzędowe wygenerowane z ankiet formalnych projektów.",
  zalaczniki: "Załączniki ze wszystkich projektów na tym koncie.",
  "tasks-calendar": "Wszystkie zadania z projektów — tabela, Gantt i Kanban z filtrami.",
  users: "Zarządzanie użytkownikami konta — wkrótce.",
  permissions: "Role i uprawnienia dostępu — wkrótce.",
  configuration: "Statusy Kanban i typy zadań.",
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
  if (fab) {
    fab.hidden = !(minimized && chats.length > 0);
  }
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

function getTaskOwnerId(project, taskId) {
  const saved = project?.taskOwners?.[taskId];
  if (saved === "" || saved === NO_OWNER.id) return NO_OWNER.id;
  if (saved && getTaskOwnerOptions(project).some((opt) => opt.id === saved)) {
    return saved;
  }
  return getDefaultTaskOwnerId();
}

function getTaskDueDate(project, taskId) {
  const value = project?.taskDueDates?.[taskId];
  return typeof value === "string" ? value : "";
}

function getTaskStartDate(project, taskId) {
  const value = project?.taskStartDates?.[taskId];
  return typeof value === "string" ? value : "";
}

function getTaskDescription(project, taskId) {
  const saved = project?.taskDescriptions?.[taskId];
  if (typeof saved === "string") return saved;
  const custom = (project?.customTasks || []).find((item) => String(item.id) === String(taskId));
  return typeof custom?.description === "string" ? custom.description : "";
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
  return persistProject({
    ...project,
    taskBoardStatus: {
      ...(project.taskBoardStatus || {}),
      [taskId]: statusId,
    },
    updatedAt: new Date().toISOString(),
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
  const index = projects.findIndex((item) => item.id === project.id);
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.unshift(project);
  }
  saveProjects(projects);
  return project;
}

function getProjectById(id) {
  return loadProjects().find((project) => project.id === id) || null;
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
    <span>Dodano typ: <strong>${escapeHtml(label)}</strong></span>
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

  toast.classList.add("is-save-success");
  toast.innerHTML = `
    <span class="type-toast-check" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
        <path d="m5 12 5 5L20 7" />
      </svg>
    </span>
    <span><strong>${escapeHtml(message)}</strong></span>
  `;
  toast.classList.add("is-visible");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.classList.remove("is-save-success");
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
      title="Zapisz formularz (F5)"
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
  fab.title = "Zapisz formularz (F5)";
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
  if (formSaveContext.kind === "building") {
    return document.getElementById("buildingProjectForm");
  }
  if (formSaveContext.docId) {
    return (
      content.querySelector(
        `[data-role="doc-form"][data-doc-id="${formSaveContext.docId}"]`
      ) || content.querySelector('[data-role="doc-form"]')
    );
  }
  return content.querySelector('[data-role="doc-form"]');
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
  const taskId =
    formSaveContext.kind === "building"
      ? "building-project"
      : String(formSaveContext.docId || "");
  if (!taskId) return false;
  const meta = content.querySelector('[data-role="doc-task-meta"]');
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
    next.taskBoardStatus = { ...(project.taskBoardStatus || {}), [taskId]: statusId };
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
  const form =
    (docId &&
      content.querySelector(`[data-role="doc-form"][data-doc-id="${docId}"]`)) ||
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

  formSaveKeyHandler = (event) => {
    if (event.key !== "F5") return;
    if (!formSaveContext) return;
    event.preventDefault();
    event.stopPropagation();
    triggerActiveFormSave();
  };
  document.addEventListener("keydown", formSaveKeyHandler);
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
    const project = persistProject({
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
    });

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
    .map((project) => ({
      project,
      documents: project.formalSurvey?.documents || [],
    }))
    .filter((group) => group.documents.length > 0);

  if (groups.length === 0) {
    return `
      <section class="projects-view">
        <div class="projects-empty panel">
          <p>Brak dokumentów do złożenia. Wypełnij ankietę formalną w projekcie, aby wygenerować listę.</p>
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
            ? "Możesz ponownie przejść ankietę i zaktualizować listę dokumentów do złożenia."
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
            ${savedCount ? ` Ostatnio zapisano ${savedCount} pozycji.` : ""}
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

const DEFAULT_KANBAN_STATUSES = [
  { id: "todo", label: "Do zrobienia", autoCompleteAt100: false },
  { id: "progress", label: "W toku", autoCompleteAt100: false },
  { id: "done", label: "Gotowe", autoCompleteAt100: true },
];

const DEFAULT_TASK_TYPES = [
  { id: "document", label: "Dokument", autoFromDocs: true },
];

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
    ganttTop: gantt ? gantt.scrollTop : 0,
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
      gantt.scrollTop = Number(saved.ganttTop) || 0;
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
    if (mode === "kanban" || mode === "gantt" || mode === "table") return mode;
  } catch {
    /* ignore */
  }
  return "table";
}

function setTasksViewMode(mode) {
  const next = mode === "kanban" || mode === "gantt" ? mode : "table";
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
  const saved = project?.taskBoardStatus?.[taskId];

  if (fillPercent >= 100) {
    const auto = statuses.find((item) => item.autoCompleteAt100);
    if (auto) return auto.id;
  }

  if (saved && statusIds.has(saved)) return saved;

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
  (project.formalSurvey?.documents || []).forEach((doc) => {
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
    const doc = (project.formalSurvey?.documents || []).find(
      (item) => String(item.id) === String(linked.id)
    );
    return doc?.title || linked.name || "Dokument";
  }
  if (linked.kind === "attachment") {
    const file = (project.files || []).find((item) => String(item.id) === String(linked.id));
    return file?.name || linked.name || "Załącznik";
  }
  return linked.name || "Dokument";
}

function collectProjectTasks(project) {
  const tasks = [];
  const docType = getDocumentTaskType();
  const firstStatus = getKanbanStatuses()[0]?.id || "todo";

  if (docType) {
    const buildingFill = getBuildingFormFillPercent(project);
    const buildingStatusKey = resolveTaskBoardStatus(project, "building-project", buildingFill);
    const buildingMeta = boardStatusMeta(buildingStatusKey);
    tasks.push({
      id: "building-project",
      kind: "building",
      source: "auto-doc",
      typeId: docType.id,
      typeLabel: docType.label,
      name: "Projekt budowlany",
      ownerId: getTaskOwnerId(project, "building-project"),
      startDate: getTaskStartDate(project, "building-project"),
      dueDate: getTaskDueDate(project, "building-project"),
      description: getTaskDescription(project, "building-project"),
      status: buildingMeta.label,
      statusKey: buildingMeta.key,
      progress: buildingFill,
      linkedDoc: { kind: "building", id: "building-project", name: "Projekt budowlany" },
      updatedAt: project.updatedAt || project.createdAt || "",
    });

    (project.formalSurvey?.documents || []).forEach((doc) => {
      const fill = countDocFormFill(doc.id, project.docForms?.[doc.id] || {}).percent;
      const statusKey = resolveTaskBoardStatus(project, doc.id, fill);
      const meta = boardStatusMeta(statusKey);
      tasks.push({
        id: doc.id,
        kind: "survey-doc",
        source: "auto-doc",
        typeId: docType.id,
        typeLabel: docType.label,
        name: doc.title || "Dokument",
        ownerId: getTaskOwnerId(project, doc.id),
        startDate: getTaskStartDate(project, doc.id),
        dueDate: getTaskDueDate(project, doc.id),
        description: getTaskDescription(project, doc.id),
        status: meta.label,
        statusKey: meta.key,
        progress: fill,
        linkedDoc: {
          kind: "survey-doc",
          id: doc.id,
          name: doc.title || "Dokument",
        },
        updatedAt:
          project.formalSurvey?.completedAt || project.updatedAt || project.createdAt || "",
      });
    });
  }

  (project.customTasks || []).forEach((task) => {
    const type = getTaskTypes().find((item) => item.id === task.typeId);
    const statusKey = resolveTaskBoardStatus(project, task.id, 0);
    const meta = boardStatusMeta(statusKey || firstStatus);
    const linked = task.linkedDoc
      ? {
          ...task.linkedDoc,
          name: resolveLinkedDocLabel(project, task.linkedDoc),
        }
      : null;
    tasks.push({
      id: task.id,
      kind: "custom",
      source: "custom",
      typeId: task.typeId || "",
      typeLabel: type?.label || "Zadanie",
      name: task.name || "Zadanie",
      ownerId: getTaskOwnerId(project, task.id) || task.ownerId || NO_OWNER.id,
      startDate: getTaskStartDate(project, task.id) || task.startDate || "",
      dueDate: getTaskDueDate(project, task.id) || task.dueDate || "",
      description: getTaskDescription(project, task.id) || task.description || "",
      status: meta.label,
      statusKey: meta.key,
      progress: meta.key === getKanbanStatuses().find((s) => s.autoCompleteAt100)?.id ? 100 : 0,
      linkedDoc: linked,
      updatedAt: task.updatedAt || project.updatedAt || "",
    });
  });

  return tasks;
}

/** Alias wsteczny */
function collectProjectDocuments(project) {
  return collectProjectTasks(project).filter((task) => task.source === "auto-doc");
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
  return taskDateFieldHtml(project, task, {
    colId: "due",
    value: task.dueDate,
    inputRole: "task-due",
    openRole: "open-task-due",
    label: "Data zakończenia prac",
  });
}

function startDateFieldHtml(project, task) {
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
  return kind === "building" ? "building-project" : String(linkId);
}

function collectDocumentRelatedTasks(project, kind, linkId) {
  const link = String(linkId);
  const primaryId = documentPrimaryTaskId(kind, linkId);
  return collectProjectTasks(project).filter((task) => {
    if (String(task.id) === String(primaryId)) return false;
    if (kind === "building") {
      if (task.kind === "building" || task.id === "building-project") return true;
      return task.linkedDoc?.kind === "building";
    }
    if (kind === "survey-doc") {
      if (task.kind === "survey-doc" && String(task.id) === link) return true;
      return (
        task.linkedDoc?.kind === "survey-doc" && String(task.linkedDoc.id) === link
      );
    }
    return false;
  });
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

function discussionThreadKey(kind, linkId) {
  return documentPrimaryTaskId(kind, linkId);
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

function openRelatedTaskFromMeta(projectId, taskKind, taskId) {
  const id = projectId;
  if (taskKind === "building") {
    closeRelatedTasksModal();
    renderView("project-detail", { projectId: id, panel: "building-form" });
    return;
  }
  if (taskKind === "survey-doc") {
    closeRelatedTasksModal();
    renderView("project-detail", {
      projectId: id,
      panel: "doc-form",
      focusDocId: taskId,
    });
    return;
  }
  if (taskKind === "custom") {
    const project = getProjectById(id);
    const task = (project?.customTasks || []).find(
      (item) => String(item.id) === String(taskId)
    );
    closeRelatedTasksModal();
    if (task?.linkedDoc) {
      openLinkedDocument(id, task.linkedDoc.kind, task.linkedDoc.id);
      return;
    }
    showTypeToast("To zadanie nie ma powiązanego dokumentu");
  }
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
  const primaryTaskId = documentPrimaryTaskId(kind, linkId);
  const related = collectDocumentRelatedTasks(project, kind, linkId);
  const description = getTaskDescription(project, primaryTaskId);
  const displayTitle =
    title || (kind === "building" ? "Projekt budowlany" : "Zadanie");
  const primaryTask =
    collectProjectTasks(project).find((task) => String(task.id) === String(primaryTaskId)) || {
      id: primaryTaskId,
      dueDate: getTaskDueDate(project, primaryTaskId),
      startDate: getTaskStartDate(project, primaryTaskId),
      statusKey: resolveTaskBoardStatus(project, primaryTaskId, 0),
    };

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
            ${taskDateControlHtml(project, primaryTask, {
              value: primaryTask.dueDate,
              inputRole: "task-due",
              openRole: "open-task-due",
              label: "Data zakończenia prac",
            })}
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
  if (!task.linkedDoc) return "";
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
  if (!docIcon && !descIcon) return "";
  return `<span class="task-name-icons">${docIcon}${descIcon}</span>`;
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
        <button type="button" class="ghost-btn table-action-btn" data-role="clear-task-filters">
          Wyczyść filtry
        </button>
      </div>
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
                const cells = {
                  name: `<td data-col="name">
                    <div class="task-name-cell">
                      <div class="task-name-row">
                        <strong>${escapeHtml(task.name)}</strong>
                        ${taskNameIconsHtml(project, task)}
                      </div>
                      <span class="task-type-pill">${escapeHtml(task.typeLabel || "Zadanie")}</span>
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
                class="is-row-clickable"
                data-role="open-task"
                data-task-kind="${escapeHtml(task.kind)}"
                data-task-id="${escapeHtml(task.id)}"
                data-project-id="${project.id}"
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
      </p>`;
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
  const start = startIso || "";
  const end = endIso || "";
  const customTasks = (project.customTasks || []).map((task) =>
    String(task.id) === String(taskId)
      ? { ...task, startDate: start, dueDate: end, updatedAt: new Date().toISOString() }
      : task
  );
  return persistProject({
    ...project,
    customTasks,
    taskStartDates: { ...(project.taskStartDates || {}), [taskId]: start },
    taskDueDates: { ...(project.taskDueDates || {}), [taskId]: end },
    updatedAt: new Date().toISOString(),
  });
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
  const order = Array.isArray(project?.taskGanttOrder) ? project.taskGanttOrder : [];
  const rank = new Map(order.map((id, index) => [String(id), index]));
  return [...tasks].sort((a, b) => {
    const ai = rank.has(String(a.id)) ? rank.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
    const bi = rank.has(String(b.id)) ? rank.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return String(a.name || "").localeCompare(String(b.name || ""), "pl");
  });
}

function persistGanttTaskOrder(projectId, orderedIds) {
  const project = getProjectById(projectId);
  if (!project) return null;
  return persistProject({
    ...project,
    taskGanttOrder: orderedIds.map(String),
    updatedAt: new Date().toISOString(),
  });
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

  const flat = [];
  projects.forEach((p) => {
    sortTasksForGantt(collectProjectTasks(p), p).forEach((task) => {
      flat.push({
        task,
        span: resolveGanttSpan(task),
        projectId: p.id,
        projectTitle: p.title || p.name || "Projekt",
      });
    });
  });

  const orderKeys = Array.isArray(project.taskGanttOrder) ? project.taskGanttOrder : [];
  const rank = new Map(orderKeys.map((key, index) => [String(key), index]));
  flat.sort((a, b) => {
    const ak = `${a.projectId}::${a.task.id}`;
    const bk = `${b.projectId}::${b.task.id}`;
    const ai = rank.has(ak) ? rank.get(ak) : Number.MAX_SAFE_INTEGER;
    const bi = rank.has(bk) ? rank.get(bk) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    if (a.projectId === focusId && b.projectId !== focusId) return -1;
    if (b.projectId === focusId && a.projectId !== focusId) return 1;
    return String(a.task.name || "").localeCompare(String(b.task.name || ""), "pl");
  });

  const scheduled = flat.filter((row) => row.span);
  const unscheduled = flat.filter((row) => !row.span);

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

  if (!scheduled.length) {
    return `
      <div class="tasks-gantt" data-role="tasks-gantt-view" data-project-id="${project.id}">
        <div class="gantt-toolbar">
          <div>
            <p class="eyebrow">Widok Gantta</p>
            <h3 class="gantt-empty-title">Brak dat do harmonogramu</h3>
            <p class="muted">Uzupełnij datę rozpoczęcia lub zakończenia prac, aby zobaczyć paski na osi czasu.</p>
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

  const bodyRows = scheduled
    .map(({ task, span, projectId, projectTitle }) => {
      const left = ganttDayDiff(rangeStart, span.start) * dayWidth;
      const width = Math.max(dayWidth, (ganttDayDiff(span.start, span.end) + 1) * dayWidth);
      const owner = ownerLabel(
        projects.find((p) => p.id === projectId) || project,
        task.ownerId
      );
      const startIso = toIsoDateOnly(span.start);
      const endIso = toIsoDateOnly(span.end);
      const progress = Number.isFinite(Number(task.progress)) ? Math.round(Number(task.progress)) : 0;
      const dateLine = `${formatDateOnly(startIso)} – ${formatDateOnly(endIso)}`;
      const tip = [task.name, dateLine, projectTitle, owner, task.status, `${progress}%`].join(" · ");
      const defaultHidden =
        !projectFilterAll && String(projectId) !== focusId ? " hidden" : "";
      return `
        <div
          class="gantt-row"
          data-role="gantt-row"
          data-task-id="${escapeHtml(task.id)}"
          data-project-id="${escapeHtml(projectId)}"
          data-owner-id="${escapeHtml(String(task.ownerId || ""))}"
          data-status-key="${escapeHtml(task.statusKey || "")}"
          ${defaultHidden}
        >
          <div
            class="gantt-label"
            data-role="gantt-reorder"
            data-task-id="${escapeHtml(task.id)}"
            data-project-id="${escapeHtml(projectId)}"
            draggable="true"
            title="Przeciągnij, aby zmienić kolejność"
          >
            <strong>${escapeHtml(task.name)}</strong>
            <span class="gantt-label-dates">${escapeHtml(dateLine)}</span>
          </div>
          <div class="gantt-track" style="width:${timelineWidth}px;background-size:${dayWidth}px 100%">
            <div
              class="gantt-bar gantt-bar-${escapeHtml(task.statusKey || "todo")}"
              data-role="gantt-bar"
              data-task-id="${escapeHtml(task.id)}"
              data-project-id="${escapeHtml(projectId)}"
              data-start="${escapeHtml(startIso)}"
              data-end="${escapeHtml(endIso)}"
              style="left:${left}px;width:${width}px"
              title="${escapeHtml(tip)}"
            >
              <span class="gantt-bar-handle is-start" data-role="gantt-resize" data-edge="start" title="Rozciągnij początek"></span>
              <span class="gantt-bar-label">${escapeHtml(task.name)}</span>
              <span class="gantt-bar-pct">${progress}%</span>
              <span class="gantt-bar-handle is-end" data-role="gantt-resize" data-edge="end" title="Rozciągnij koniec"></span>
            </div>
          </div>
        </div>`;
    })
    .join("");

  const unscheduledHtml = unscheduled.length
    ? `<details class="gantt-unscheduled-fold">
        <summary>Bez dat (<span data-role="gantt-unscheduled-count">${
          projectFilterAll
            ? unscheduled.length
            : unscheduled.filter((r) => String(r.projectId) === focusId).length
        }</span>)</summary>
        <ul class="gantt-unscheduled">
          ${unscheduled
            .map((row) => {
              const defaultHidden =
                !projectFilterAll && String(row.projectId) !== focusId ? " hidden" : "";
              return `<li
                data-role="gantt-unscheduled-item"
                data-project-id="${escapeHtml(row.projectId)}"
                data-owner-id="${escapeHtml(String(row.task.ownerId || ""))}"
                data-status-key="${escapeHtml(row.task.statusKey || "")}"
                ${defaultHidden}
              ><strong>${escapeHtml(row.task.name)}</strong><span>${escapeHtml(
                row.projectTitle
              )}</span></li>`;
            })
            .join("")}
        </ul>
      </details>`
    : "";

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
            · przeciągnij paski i kolejność w kolumnie Zadanie
          </p>
        </div>
        <div class="gantt-toolbar-actions">
          ${filtersHtml}
          ${scaleToggle}
        </div>
      </div>
      <div class="gantt-scroll" data-role="gantt-pan" title="Chwyć i przeciągnij, aby przesunąć oś czasu">
        <div class="gantt-chart" style="--gantt-label-width:16.5rem;--gantt-day-width:${dayWidth}px;--gantt-timeline-width:${timelineWidth}px">
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
      ${unscheduledHtml}
    </div>`;
}

function projectTasksPanelHtml(project, options = {}) {
  const global = Boolean(options.global);
  const tasks = collectProjectTasks(project);
  const viewMode = getTasksViewMode();
  const surveyCount = project.formalSurvey?.documents?.length || 0;
  const surveyTooltip = surveyCount
    ? "Edytuj ankietę formalną — zaktualizuj listę zadań / dokumentów"
    : "Uruchom ankietę formalną — wygeneruj dokumenty (zadania) do złożenia";
  const tableId = "project-tasks";
  const body =
    viewMode === "kanban"
      ? projectTasksKanbanHtml(project, { projectFilterAll: global })
      : viewMode === "gantt"
        ? projectTasksGanttHtml(project, { projectFilterAll: global })
        : global
          ? globalTasksTableHtml()
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
          <button
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
          ${
            global
              ? ""
              : `<button
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
          </button>`
          }
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
          </button>
        </div>
      </div>
      ${body}
    </article>`;
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
        showTitle: true,
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
        showTitle: true,
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

function projectDetailHtml(project, panel = "overview", options = {}) {
  const filesCount = project.files?.length || 0;
  const isForm = panel === "building-form";
  const isSurvey = panel === "formal-survey";
  const isDocForm = panel === "doc-form";
  const isKpa = panel === "kpa";

  let mainHtml = projectOverviewHtml(project, options);
  if (isForm) mainHtml = buildingProjectFormHtml(project);
  if (isSurvey) {
    mainHtml = formalSurveyPanelHtml(project, surveyDraft.answers, surveyDraft.step);
  }
  if (isDocForm) {
    const doc = (project.formalSurvey?.documents || []).find(
      (item) => String(item.id) === String(options.focusDocId)
    );
    mainHtml = docFormPanelHtml(project, doc);
  }
  if (isKpa) mainHtml = projectKpaPanelHtml(project);

  const fullWidth = isSurvey || isDocForm || isKpa || isForm;

  return `
    <section class="project-detail">
      <header class="form-intro form-intro-row">
        <div class="form-intro-copy">
          <p class="eyebrow">${
            isSurvey
              ? "Ankieta w projekcie"
              : isForm
                ? "Formularz w projekcie"
                : isDocForm
                  ? "Dokument w projekcie"
                  : isKpa
                    ? "Analityka projektu"
                    : "Projekt"
          }</p>
          <h1>${escapeHtml(project.title)}</h1>
          <p class="lede form-lede">${formatDate(project.createdAt)}${
            project.code ? ` · <span class="project-code">${escapeHtml(project.code)}</span>` : ""
          } · ${filesCount} załączników${
    isForm
      ? " · Projekt budowlany"
      : isSurvey
        ? " · Ankieta formalna"
        : isDocForm
          ? " · Dokument"
          : isKpa
            ? " · KPA"
            : ""
  }</p>
        </div>
        <div class="detail-actions">
          ${
            isForm || isSurvey || isDocForm || isKpa
              ? ""
              : `<button class="primary-btn" type="button" data-role="edit-project" data-project-id="${project.id}">Edytuj</button>`
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
      renderView("project-detail", {
        projectId: btn.dataset.projectId || projectId,
        panel: "building-form",
      });
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
      renderView("project-detail", projectOverviewNav(btn.dataset.projectId || projectId, { listTab: tab }));
    });
  });

  content.querySelectorAll('[data-role="close-building-form"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      setProjectListTab("tasks");
      renderView("project-detail", projectOverviewNav(btn.dataset.projectId || projectId, { listTab: "tasks" }));
    });
  });

  content.querySelectorAll('[data-role="open-formal-survey"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setProjectListTab("tasks");
      renderView("project-detail", {
        projectId: btn.dataset.projectId || projectId,
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
      openAddTaskModal(btn.dataset.projectId || projectId);
    });
  });

  content.querySelectorAll('[data-role="open-kpa"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      renderView("project-detail", {
        projectId: btn.dataset.projectId || projectId,
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
      openAddTaskModal(btn.dataset.projectId || projectId, {
        linkedKind: kind,
        linkedId: linkId,
        returnTo:
          kind === "building"
            ? { panel: "building-form" }
            : { panel: "doc-form", focusDocId: linkId },
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
      renderView("project-detail", projectOverviewNav(btn.dataset.projectId || projectId, { listTab: "tasks" }));
    });
  });

  content.querySelectorAll('[data-role="open-task"]').forEach((row) => {
    const openTask = () => {
      const kind = row.dataset.taskKind;
      const id = row.dataset.projectId || projectId;
      if (kind === "building") {
        renderView("project-detail", { projectId: id, panel: "building-form" });
        return;
      }
      if (kind === "survey-doc") {
        renderView("project-detail", {
          projectId: id,
          panel: "doc-form",
          focusDocId: row.dataset.taskId,
        });
        return;
      }
      if (kind === "custom") {
        const project = getProjectById(id);
        const task = (project?.customTasks || []).find(
          (item) => String(item.id) === String(row.dataset.taskId)
        );
        if (task?.linkedDoc) {
          openLinkedDocument(id, task.linkedDoc.kind, task.linkedDoc.id);
        }
      }
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
        event.target.closest(".col-select")
      ) {
        return;
      }
      event.preventDefault();
      openTask();
    });
    row.addEventListener("keydown", (event) => {
      if (
        event.target.closest('[data-role="task-owner"]') ||
        event.target.closest('[data-role="task-status"]') ||
        event.target.closest('[data-role="task-due"]') ||
        event.target.closest('[data-role="open-task-due"]') ||
        event.target.closest('[data-role="task-start"]') ||
        event.target.closest('[data-role="open-task-start"]') ||
        event.target.closest('[data-role="task-select"]')
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
      if (!persistTaskBoardStatus(id, taskId, statusId)) return;
      const meta = boardStatusMeta(statusId);
      const row = select.closest("tr");
      if (row) {
        row.dataset.filterStatusKey = statusId;
        row.dataset.filterStatus = String(meta.label || "").toLowerCase();
      }
      showTypeToast(`Status: ${meta.label}`);
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
        persistProject({
          ...project,
          [storageKey]: {
            ...(project[storageKey] || {}),
            [taskId]: input.value || "",
          },
          updatedAt: new Date().toISOString(),
        });
        syncEmptyState();
        showTypeToast(input.value ? `${setLabel}: ${formatDateOnly(input.value)}` : clearLabel);
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
      row.hidden = !match;
      if (match) visible += 1;
    });

    if (countEl) {
      countEl.textContent =
        visible === rows.length ? `${rows.length} zadań` : `${visible} z ${rows.length} zadań`;
    }
    if (emptyEl) emptyEl.hidden = visible > 0;
  };

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
  const applyGanttFilters = () => {
    const projects = readGanttMultiFilter(root, "project");
    const owners = readGanttMultiFilter(root, "owner");
    const statuses = readGanttMultiFilter(root, "status");
    const matches = (el) => {
      const projectOk = !projects || projects.has(String(el.dataset.projectId || ""));
      const ownerOk = !owners || owners.has(String(el.dataset.ownerId || ""));
      const statusOk = !statuses || statuses.has(String(el.dataset.statusKey || ""));
      return projectOk && ownerOk && statusOk;
    };
    root.querySelectorAll('[data-role="gantt-row"]').forEach((row) => {
      row.hidden = !matches(row);
    });
    let unscheduledVisible = 0;
    root.querySelectorAll('[data-role="gantt-unscheduled-item"]').forEach((item) => {
      const show = matches(item);
      item.hidden = !show;
      if (show) unscheduledVisible += 1;
    });
    const countEl = root.querySelector('[data-role="gantt-unscheduled-count"]');
    if (countEl) countEl.textContent = String(unscheduledVisible);
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
  applyGanttFilters();

  const body = root.querySelector('[data-role="gantt-body"]');
  let dragKey = "";
  root.querySelectorAll('[data-role="gantt-reorder"]').forEach((label) => {
    label.addEventListener("dragstart", (event) => {
      dragKey = `${label.dataset.projectId || ""}::${label.dataset.taskId || ""}`;
      label.classList.add("is-dragging");
      label.closest(".gantt-row")?.classList.add("is-reordering");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragKey);
      event.stopPropagation();
    });
    label.addEventListener("dragend", () => {
      label.classList.remove("is-dragging");
      root.querySelectorAll(".gantt-row").forEach((row) => {
        row.classList.remove("is-reordering", "is-drop-before", "is-drop-after");
      });
      dragKey = "";
    });
  });

  root.querySelectorAll('[data-role="gantt-row"]').forEach((row) => {
    row.addEventListener("dragover", (event) => {
      if (!dragKey) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const rect = row.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      row.classList.toggle("is-drop-before", before);
      row.classList.toggle("is-drop-after", !before);
    });
    row.addEventListener("dragleave", () => {
      row.classList.remove("is-drop-before", "is-drop-after");
    });
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const fromKey = event.dataTransfer.getData("text/plain") || dragKey;
      const toKey = `${row.dataset.projectId || ""}::${row.dataset.taskId || ""}`;
      row.classList.remove("is-drop-before", "is-drop-after");
      if (!body || !fromKey || !toKey || fromKey === toKey) return;
      const [fromProjectId, fromTaskId] = fromKey.split("::");
      if (!fromProjectId || !fromTaskId) return;
      const fromRow = body.querySelector(
        `[data-role="gantt-row"][data-project-id="${CSS.escape(fromProjectId)}"][data-task-id="${CSS.escape(fromTaskId)}"]`
      );
      if (!fromRow || fromRow === row) return;
      const rect = row.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      if (before) body.insertBefore(fromRow, row);
      else row.after(fromRow);
      const orderedIds = [...body.querySelectorAll('[data-role="gantt-row"]')].map(
        (item) => `${item.dataset.projectId || ""}::${item.dataset.taskId || ""}`
      );
      persistGanttTaskOrder(id, orderedIds);
      showTypeToast("Zmieniono kolejność zadań");
    });
  });

  const dayWidth = Number(root.dataset.dayWidth) || 16;
  const timelineWidth = Number(root.dataset.timelineWidth) || 0;
  const rangeStart = parseTaskDateOnly(root.dataset.rangeStart);

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
        if (!taskId || !startIso || !endIso) return;
        persistTaskSchedule(taskProjectId, taskId, startIso, endIso);
        showTypeToast(`Termin: ${formatDateOnly(startIso)} – ${formatDateOnly(endIso)}`);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  });

  const scroller = root.querySelector('[data-role="gantt-pan"]');
  if (!scroller) return;

  scroller.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (
      event.target.closest(
        ".gantt-bar, .gantt-label, .gantt-label-head, .gantt-scale, .gantt-filters, .gantt-multi-filter, button, summary, a, input, select, textarea, label"
      )
    ) {
      return;
    }
    const startX = event.clientX;
    const startY = event.clientY;
    const originLeft = scroller.scrollLeft;
    const originTop = scroller.scrollTop;
    scroller.classList.add("is-panning");
    event.preventDefault();

    const onMove = (moveEvent) => {
      scroller.scrollLeft = originLeft - (moveEvent.clientX - startX);
      scroller.scrollTop = originTop - (moveEvent.clientY - startY);
    };
    const onUp = () => {
      scroller.classList.remove("is-panning");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
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

      if (!persistTaskBoardStatus(taskProjectId, taskId, status)) return;

      const card =
        board.querySelector(
          `[data-role="kanban-card"][data-project-id="${CSS.escape(
            String(taskProjectId)
          )}"][data-task-id="${CSS.escape(String(taskId))}"]`
        ) ||
        board.querySelector(
          `[data-role="kanban-card"][data-task-id="${CSS.escape(String(taskId))}"]`
        );
      if (card) {
        card.dataset.status = status;
        card.dataset.statusKey = status;
        zone.appendChild(card);
        card.classList.remove("is-dragging");
      }
      applyKanbanFilters();
      showTypeToast(`Status: ${boardStatusMeta(status).label}`);
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
    project.formalSurvey = {
      answers: {
        ...surveyDraft.answers,
        media: Array.isArray(surveyDraft.answers.media) ? [...surveyDraft.answers.media] : [],
      },
      documents,
      completedAt: now,
      updatedAt: now,
    };
    project.updatedAt = now;
    persistProject(project);
    showTypeToast(`Zapisano ${documents.length} dokumentów do złożenia`);
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
      <select class="column-filter" data-role="filter-global-task-project" aria-label="Filtr projektu">
        <option value="">Wszystkie projekty</option>
        ${projects
          .map(
            (p) =>
              `<option value="${escapeHtml(p.id)}">${escapeHtml(p.title || "Projekt")}</option>`
          )
          .join("")}
      </select>
      <p class="table-filter-meta" data-role="global-task-filter-count">${rows.length} zadań</p>
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
        </thead>
        <tbody>
          ${rows
            .map(({ project, task }) => {
              const dueLabel = task.dueDate ? formatDateOnly(task.dueDate) : "—";
              return `
            <tr
              class="is-row-clickable"
              data-role="open-task"
              data-task-kind="${escapeHtml(task.kind)}"
              data-task-id="${escapeHtml(task.id)}"
              data-project-id="${escapeHtml(project.id)}"
              data-filter-project="${escapeHtml(project.id)}"
              data-filter-search="${escapeHtml(
                `${project.title} ${task.name} ${task.status} ${ownerLabel(project, task.ownerId)}`.toLowerCase()
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
              <td>${escapeHtml(ownerLabel(project, task.ownerId))}</td>
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
    </div>`;
}

function bindGlobalTasksTableFilters() {
  const panel = content.querySelector('[data-role="project-tasks-panel"][data-global="1"]');
  if (!panel) return;
  const searchInput = panel.querySelector('[data-role="filter-global-task-search"]');
  const projectFilter = panel.querySelector('[data-role="filter-global-task-project"]');
  const countEl = panel.querySelector('[data-role="global-task-filter-count"]');
  const rows = [...panel.querySelectorAll('tbody tr[data-role="open-task"]')];
  const apply = () => {
    const words = String(searchInput?.value || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const projectId = projectFilter?.value || "";
    let visible = 0;
    rows.forEach((row) => {
      const searchOk = words.every((word) => (row.dataset.filterSearch || "").includes(word));
      const projectOk = !projectId || row.dataset.filterProject === projectId;
      const show = searchOk && projectOk;
      row.hidden = !show;
      if (show) visible += 1;
    });
    if (countEl) {
      countEl.textContent =
        visible === rows.length ? `${rows.length} zadań` : `${visible} z ${rows.length} zadań`;
    }
  };
  searchInput?.addEventListener("input", apply);
  projectFilter?.addEventListener("change", apply);
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
            Ten sam widok zadań co w projekcie (tabela, Gantt, Kanban) — z filtrowaniem po projektach.
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
    renderView("project-detail", { projectId, panel: "building-form" });
    return;
  }
  if (kind === "survey-doc") {
    renderView("project-detail", {
      projectId,
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
      renderView(
        "project-detail",
        projectOverviewNav(btn.dataset.projectId || project.id, { listTab: "tasks" })
      );
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
          <p class="eyebrow">Nowe zadanie</p>
          <h2 id="addTaskModalTitle">${
            presetValue ? "Dodaj zadanie powiązane" : "Dodaj zadanie"
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
        renderView("project-detail", { projectId: project.id, panel: "building-form" });
        return;
      }
      if (options.returnTo?.panel === "doc-form") {
        renderView("project-detail", {
          projectId: project.id,
          panel: "doc-form",
          focusDocId: options.returnTo.focusDocId,
        });
        return;
      }
      setProjectListTab("tasks");
      renderView("project-detail", projectOverviewNav(project.id, { listTab: "tasks" }));
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
              <li class="config-row" data-status-id="${escapeHtml(status.id)}">
                <span class="config-order" aria-hidden="true">${index + 1}</span>
                <input
                  type="text"
                  class="config-input"
                  data-role="status-label"
                  value="${escapeHtml(status.label)}"
                  aria-label="Nazwa statusu"
                />
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

function readConfigFromDom() {
  const statusRows = [...content.querySelectorAll('[data-role="status-list"] .config-row')];
  const typeRows = [...content.querySelectorAll('[data-role="type-list"] .config-row')];
  const statuses = statusRows.map((row, index) => ({
    id: row.dataset.statusId || `status-${index + 1}`,
    label: row.querySelector('[data-role="status-label"]')?.value.trim() || `Status ${index + 1}`,
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
    pageTitle.textContent =
      panel === "building-form"
        ? `${project.title} · Projekt budowlany`
        : panel === "formal-survey"
          ? `${project.title} · Ankieta formalna`
          : panel === "doc-form"
            ? `${project.title} · Dokument`
            : panel === "kpa"
              ? `${project.title} · KPA`
              : project.title;
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
          ? `<p class="save-toast">Ankieta zapisana — nowe zadania są na liście w projekcie.</p>`
          : ""
      }
      ${projectDetailHtml(project, panel, {
        focusDocId: options.focusDocId || null,
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
    if (panel === "building-form") bindBuildingForm(project.id);
    if (panel === "formal-survey") bindFormalSurvey(project.id);
    if (panel === "kpa") bindKpaPanel(project.id);
    if (panel === "doc-form") {
      bindProjectDocForms(project.id);
      bindDocumentPdfDownloads();
    }
    if (panel !== "formal-survey" && panel !== "doc-form" && panel !== "kpa") bindAiChat();
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
    event.preventDefault();
    if (item.classList.contains("is-disabled") || item.getAttribute("aria-disabled") === "true") {
      return;
    }
    renderView(item.dataset.view);
  });
});

document.querySelectorAll(".brand-mark").forEach((brand) => {
  brand.addEventListener("click", (event) => {
    event.preventDefault();
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
  if (id === "snappoint") {
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
    else openThemeMenu();
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
