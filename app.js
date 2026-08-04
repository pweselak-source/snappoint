const titles = {
  dashboard: "Pulpit",
  "new-project": "Nowy projekt",
  "project-detail": "Projekt",
  projects: "Projekty",
  "building-projects": "Dokument projektu bud.",
  "docs-to-submit": "Dokumenty do złożenia",
  zalaczniki: "Załączniki",
  checklist: "Checklista formalna",
};

const descriptions = {
  dashboard: null,
  projects: "Lista projektów inwestycyjnych pojawi się w kolejnym kroku mockupu.",
  "docs-to-submit": "Dokumenty urzędowe wygenerowane z ankiet formalnych projektów.",
  zalaczniki: "Załączniki ze wszystkich projektów na tym koncie.",
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
  description:
    "Projekt budowlany domu jednorodzinnego z garażem w zabudowie wolnostojącej. Zakres: architektura, zagospodarowanie terenu oraz komplet załączników formalnych do wniosku o pozwolenie na budowę.",
};

/** @type {string | null} */
let categoryModalFileId = null;
/** @type {string} */
let categoryModalDraftId = "";
let toastTimer = null;

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
    const active =
      item.dataset.view === view ||
      ((view === "new-project" || view === "project-detail" || view === "projects") &&
        item.dataset.view === "building-projects");
    item.classList.toggle("is-active", active);
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
    if (!categoryModalFileId || !categoryModalDraftId) return;
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

  categoryModalFileId = fileId;
  categoryModalDraftId = file.categoryId || "";

  const modal = ensureCategoryModal();
  const body = modal.querySelector("#categoryModalBody");
  const nameEl = modal.querySelector("#categoryModalFileName");
  if (body) body.innerHTML = categoryModalOptionsHtml(categoryModalDraftId);
  if (nameEl) nameEl.textContent = file.name;
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeCategoryModal() {
  const modal = document.getElementById("categoryModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("modal-open");
  categoryModalFileId = null;
  categoryModalDraftId = "";
}

function showTypeToast(label) {
  let toast = document.getElementById("typeToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "typeToast";
    toast.className = "type-toast";
    document.body.appendChild(toast);
  }

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
        <button class="autofill-btn" id="autofillBtn" type="button" title="Autowypełnij tytuł i opis">
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
  incoming.forEach((file) => {
    projectFiles.push({
      id: `f${fileIdSeq++}`,
      name: file.name,
      size: file.size,
      categoryId: "",
    });
  });
  updateFilesUi();
  if (typeof notifyTutorial === "function") notifyTutorial("files");
}

function autofillProjectForm() {
  const title = document.getElementById("projectTitle");
  const description = document.getElementById("projectDescription");
  if (title) title.value = DEMO_AUTOFILL.title;
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
    const description = document.getElementById("projectDescription")?.value.trim() || "";
    if (!title) return;

    const existing = editingProjectId ? getProjectById(editingProjectId) : null;
    const project = persistProject({
      ...(existing || {}),
      id: existing?.id || `p${Date.now()}`,
      title,
      description,
      files: projectFiles.map((file) => ({ ...file })),
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
                      data-project-id="${project.id}"
                    >
                      Otwórz
                    </button>
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

function docFormItemHtml(project, doc, { open = false } = {}) {
  const saved = project.docForms?.[doc.id] || {};
  const template = resolveDocFormTemplate(doc.id);
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
        <form class="doc-mini-form" data-role="doc-form" data-doc-id="${escapeHtml(doc.id)}" autocomplete="off">
          ${template.sections
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
            .join("")}
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
            <button type="submit" class="primary-btn">Zapisz dokument</button>
          </div>
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
  return `
    <div class="detail-grid">
      <article class="panel detail-desc-panel">
        <div class="panel-head"><h2>Opis</h2></div>
        <p class="project-desc detail-desc">${escapeHtml(
          project.description || "Bez opisu"
        )}</p>
      </article>

      <div class="project-sections-grid">
        ${buildingProjectFoldHtml(project)}
        ${formalSurveyFoldHtml(project)}
        ${documentsToSubmitPanelHtml(project, options)}
        ${attachmentsFoldHtml(project)}
      </div>
    </div>`;
}

function attachmentsViewHtml() {
  const rows = sortAttachmentRows(collectAttachmentRows());
  const sort = attachmentsSort;

  if (rows.length === 0) {
    return `
      <section class="projects-view">
        <div class="projects-empty panel">
          <p>Brak załączników we wszystkich projektach. Dodaj pliki w projektach.</p>
          <button class="primary-btn" type="button" data-view="building-projects">Przejdź do projektów</button>
        </div>
      </section>`;
  }

  return `
    <section class="projects-view">
      <div class="data-table-wrap panel">
        <table class="data-table" data-table="attachments">
          <thead>
            <tr>
              <th>
                <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="name">
                  Nazwa pliku ${sortArrowHtml(sort.key === "name", sort.dir)}
                </button>
              </th>
              <th>
                <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="project">
                  Projekt ${sortArrowHtml(sort.key === "project", sort.dir)}
                </button>
              </th>
              <th>
                <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="category">
                  Typ ${sortArrowHtml(sort.key === "category", sort.dir)}
                </button>
              </th>
              <th>
                <button type="button" class="sort-btn" data-role="sort-table" data-sort-key="size">
                  Rozmiar ${sortArrowHtml(sort.key === "size", sort.dir)}
                </button>
              </th>
              <th class="col-actions">Pobierz</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>
                <td><strong>${escapeHtml(row.name)}</strong></td>
                <td>
                  <button type="button" class="table-link" data-project-id="${row.projectId}">
                    ${escapeHtml(row.projectTitle)}
                  </button>
                </td>
                <td><span class="table-pill muted">${escapeHtml(row.categoryLabel)}</span></td>
                <td>${row.size ? formatBytes(row.size) : "—"}</td>
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
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>`;
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
              <em class="badge ok">Otwórz</em>
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
    <div class="building-form-wrap" data-project-id="${project.id}">
      <header class="building-form-head">
        <div>
          <p class="eyebrow">Formularz formalny</p>
          <h2>Projekt budowlany</h2>
          <p class="building-form-lead">
            Dane z metryki będą bazą do tomów, rysunków i oświadczeń (§ 7 ust. 2).
          </p>
        </div>
        <button type="button" class="ghost-btn" data-role="close-building-form" data-project-id="${project.id}">
          Wróć do projektu
        </button>
      </header>

      <form id="buildingProjectForm" class="building-form" autocomplete="off">
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
          <button type="submit" class="primary-btn">Zapisz formularz</button>
        </div>
      </form>
    </div>`;
}

function projectDetailHtml(project, panel = "overview", options = {}) {
  const filesCount = project.files?.length || 0;
  const isForm = panel === "building-form";
  const isSurvey = panel === "formal-survey";

  let mainHtml = projectOverviewHtml(project, options);
  if (isForm) mainHtml = buildingProjectFormHtml(project);
  if (isSurvey) {
    mainHtml = formalSurveyPanelHtml(project, surveyDraft.answers, surveyDraft.step);
  }

  return `
    <section class="project-detail">
      <header class="form-intro form-intro-row">
        <div class="form-intro-copy">
          <p class="eyebrow">${
            isSurvey ? "Ankieta w projekcie" : isForm ? "Formularz w projekcie" : "Projekt"
          }</p>
          <h1>${escapeHtml(project.title)}</h1>
          <p class="lede form-lede">${formatDate(project.createdAt)} · ${filesCount} załączników${
    isForm ? " · Projekt budowlany" : isSurvey ? " · Ankieta formalna" : ""
  }</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-view="building-projects">Wróć do listy</button>
          ${
            isForm || isSurvey
              ? `<button class="ghost-btn" type="button" data-role="${
                  isSurvey ? "close-formal-survey" : "close-building-form"
                }" data-project-id="${project.id}">Podgląd projektu</button>`
              : `<button class="primary-btn" type="button" data-role="edit-project" data-project-id="${project.id}">Edytuj</button>`
          }
        </div>
      </header>

      <div class="detail-layout ${isSurvey ? "detail-layout-survey" : ""}">
        <div class="detail-main">
          ${mainHtml}
        </div>
        ${isSurvey ? "" : aiChatHtml()}
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
    const current = getProjectById(projectId);
    if (!current) return;
    current.buildingForm = collectBuildingFormData(form);
    current.updatedAt = new Date().toISOString();
    persistProject(current);
    showTypeToast("Zapisano formularz projektu budowlanego");
    renderView("project-detail", { projectId, panel: "building-form", justSavedForm: true });
  });
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

  content.querySelectorAll('[data-role="close-building-form"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      renderView("project-detail", {
        projectId: btn.dataset.projectId || projectId,
        panel: "overview",
      });
    });
  });

  content.querySelectorAll('[data-role="open-formal-survey"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      renderView("project-detail", {
        projectId: btn.dataset.projectId || projectId,
        panel: "formal-survey",
      });
    });
  });

  content.querySelectorAll('[data-role="close-formal-survey"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      renderView("project-detail", {
        projectId: btn.dataset.projectId || projectId,
        panel: "overview",
      });
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
      const current = getProjectById(projectId);
      if (!current) return;
      const docId = form.dataset.docId;
      if (!docId) return;
      current.docForms = {
        ...(current.docForms || {}),
        [docId]: collectDocFormData(form),
      };
      current.updatedAt = new Date().toISOString();
      persistProject(current);
      showTypeToast("Zapisano formularz dokumentu");
      renderView("project-detail", { projectId, panel: "overview", focusDocId: docId });
    });
  });

  // Whole-document assist on doc item summary
  content.querySelectorAll("details.doc-form-item > summary [data-role='assist-section']").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const section = btn.closest("details");
      if (section && !section.open) section.open = true;
      runAssist(() => fillSectionSample(btn.dataset.section, project));
    });
  });
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
    renderView("project-detail", {
      projectId,
      panel: "overview",
      justSavedSurvey: true,
    });
  });

  wrap.querySelector('[data-role="close-formal-survey"]')?.addEventListener("click", () => {
    renderView("project-detail", { projectId, panel: "overview" });
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
      el.dataset.role === "open-formal-survey" ||
      el.dataset.role === "close-formal-survey" ||
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
      event.preventDefault();
      const id = el.dataset.projectId;
      if (id) renderView("project-detail", { projectId: id });
    });
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
      <p class="watermark-hint">Użyj przycisku +, aby zacząć</p>
    </div>`;
}

function ensureRecentProjectsBody() {
  let panel =
    content.querySelector(".recent-projects-panel") ||
    content.querySelector(".grid-two > .panel");

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
  const stats = content.querySelectorAll(".stat-value");
  if (stats[0]) stats[0].textContent = String(projects.length);
  if (stats[1]) {
    const files = projects.reduce((sum, p) => sum + (p.files?.length || 0), 0);
    stats[1].textContent = String(files);
  }
  if (stats[2]) {
    const totalFiles = projects.reduce((sum, p) => sum + (p.files?.length || 0), 0);
    const categorized = projects.reduce(
      (sum, p) => sum + (p.files?.filter((f) => f.categoryId).length || 0),
      0
    );
    stats[2].textContent =
      totalFiles === 0 ? "—" : `${Math.round((categorized / totalFiles) * 100)}%`;
  }
  if (stats[3]) stats[3].textContent = String(Math.min(projects.length, 2));

  content.querySelectorAll('[data-role="clear-mock-data"]').forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      clearMockData();
    });
  });

  const panelHead =
    content.querySelector(".recent-projects-panel .panel-head h2") ||
    content.querySelector(".grid-two .panel-head h2");
  if (panelHead) panelHead.textContent = "Projekty";

  const link =
    content.querySelector(".recent-projects-panel .panel-head .text-link") ||
    content.querySelector(".grid-two .panel-head .text-link");
  if (link) {
    link.setAttribute("data-view", "building-projects");
    link.onclick = (event) => {
      event.preventDefault();
      renderView("building-projects");
    };
  }

  const body = ensureRecentProjectsBody();
  if (!body) return;

  if (projects.length === 0) {
    body.innerHTML = recentProjectsWatermarkHtml();
    return;
  }

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
          <em class="badge ok">Otwórz</em>
        </button>
      </li>`
        )
        .join("")}
    </ul>`;

  bindProjectOpeners(body);
}

function renderView(view, options = {}) {
  closeCategoryModal();
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
          panel: "overview",
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
          ? `<p class="save-toast">Ankieta zapisana — dokumenty do złożenia są widoczne w projekcie i w menu.</p>`
          : ""
      }
      ${projectDetailHtml(project, panel, {
        focusDocId: options.focusDocId || null,
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
    if (panel !== "formal-survey") bindAiChat();
    if (options.focusDocId) {
      const target = content.querySelector(
        `details.doc-form-item[data-doc-id="${options.focusDocId}"]`
      );
      target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  } else {
    content.innerHTML = `
      <section class="placeholder-view">
        <p class="eyebrow">snapPoint</p>
        <h1>${title}</h1>
        <p>${descriptions[view]}</p>
      </section>
    `;
  }

  content.style.animation = "none";
  void content.offsetWidth;
  content.style.animation = "";
  closeMenu();
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
    renderView(brand.dataset.view || "dashboard");
  });
});

content.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", (event) => {
    event.preventDefault();
    renderView(el.dataset.view);
  });
});

hydrateDashboard();
bindAiChat();
applySidebarCollapsedState();

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
    if (!document.getElementById("generateProjectModal")?.hidden) {
      return;
    }
    if (!document.getElementById("attachmentPickerModal")?.hidden) {
      closeAttachmentPicker();
      return;
    }
    if (categoryModalFileId) {
      closeCategoryModal();
      return;
    }
    closeMenu();
  }
});

const THEME_STORAGE_KEY = "snappoint.theme";

function applyTheme(themeId) {
  const allowed = new Set([
    "snappoint",
    "homeguide",
    "bluemint",
    "navyelectric",
    "royalgold",
    "brownbeige",
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
  document.querySelectorAll(".theme-swatch[data-theme-id]").forEach((btn) => {
    if (btn.disabled) return;
    btn.classList.toggle("is-active", btn.dataset.themeId === id);
  });
}

function initThemeSwitcher() {
  let saved = "snappoint";
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY) || "snappoint";
  } catch (e) {}
  applyTheme(saved);

  document.querySelectorAll(".theme-swatch[data-theme-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      applyTheme(btn.dataset.themeId);
    });
  });
}

initThemeSwitcher();
