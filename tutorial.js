/**
 * Interactive onboarding tutorial — guided clicks, blocked UI, coach panel.
 * Depends on globals from app.js (renderView, clearMockSilent, etc.).
 */

const TUTORIAL_STEPS = [
  {
    id: "welcome",
    view: "dashboard",
    title: "Witaj w snapPoint",
    body: "System pomaga tworzyć dokumenty projektu budowlanego oraz określać i śledzić dokumenty formalne. Przejdziemy razem pierwsze kroki — jak w grze: klikaj tylko podświetlone miejsca.",
    target: null,
    nextLabel: "Zaczynamy",
  },
  {
    id: "create-project",
    view: "dashboard",
    title: "Załóż nowy projekt",
    body: "Najpierw utwórz projekt. Kliknij przycisk „Dodaj nowy projekt” na stronie głównej.",
    target: ".create-project",
    wait: "view:new-project",
  },
  {
    id: "autofill",
    view: "new-project",
    title: "Wypełnij dane projektu",
    body: "Możesz wpisać tytuł i opis ręcznie albo — na potrzeby mockupu — użyć autowypełnienia. Kliknij przycisk Autowypełnij. Zapisu jeszcze nie robimy (przycisk Zapisz jest wyłączony).",
    target: "#autofillBtn",
    wait: "autofill",
    blockSave: true,
  },
  {
    id: "attachments",
    view: "new-project",
    title: "Dodaj załączniki",
    body: "Dodaj dwa pliki z dysku. Kliknij strefę dodawania plików i wybierz dwa załączniki (PDF, DWG, obraz…).",
    target: "#dropzone",
    wait: "files:2",
    blockSave: true,
    allow: ["#fileInput", "#dropzone", "#filesList"],
  },
  {
    id: "category",
    view: "new-project",
    title: "Wybierz typ załącznika",
    body: "Każdy plik powinien mieć kategorię. Kliknij „Wybierz typ…” przy pierwszym pliku, wybierz kategorię i zatwierdź.",
    target: '[data-role="open-category"]',
    wait: "category",
    blockSave: true,
    allow: [
      "#categoryModal",
      "[data-role='open-category']",
      "[data-role='draft-category']",
      "[data-role='close-category-modal']",
      "#categoryModalSave",
      "#filesList",
    ],
  },
  {
    id: "edit-project",
    view: "project-detail",
    title: "Edycja projektu",
    body: "Zawsze możesz wrócić do edycji danych i załączników. Zapisałem projekt za Ciebie — kliknij przycisk Edytuj, aby zobaczyć ten powrót.",
    target: '[data-role="edit-project"]',
    wait: "edit",
  },
  {
    id: "done",
    view: null,
    title: "Świetnie!",
    body: "To koniec pierwszej części tutorialu. Dalej możesz swobodnie klikać po systemie. Przy kolejnym odświeżeniu strony zapytamy o tutorial ponownie.",
    target: null,
    nextLabel: "Zakończ tutorial",
  },
];

const tutorialState = {
  active: false,
  stepIndex: -1,
  projectId: null,
  offerOpen: false,
};

function isTutorialActive() {
  return tutorialState.active;
}

function isTutorialBlockingSave() {
  if (!tutorialState.active) return false;
  const step = TUTORIAL_STEPS[tutorialState.stepIndex];
  return Boolean(step?.blockSave);
}

function clearMockSilent() {
  localStorage.removeItem(PROJECTS_STORAGE_KEY);
  projectFiles = [];
  fileIdSeq = 1;
  editingProjectId = null;
  surveyDraft = {
    projectId: null,
    answers: createEmptySurveyAnswers(),
    step: 0,
  };
}

function ensureTutorialOfferModal() {
  let modal = document.getElementById("tutorialOfferModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "tutorialOfferModal";
  modal.className = "tutorial-offer";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="tutorial-offer-backdrop"></div>
    <div class="tutorial-offer-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorialOfferTitle">
      <p class="eyebrow">snapPoint</p>
      <h2 id="tutorialOfferTitle">Chcesz tutorial?</h2>
      <p>Prowadzimy Cię krok po kroku przez założenie projektu i pierwsze załączniki. Albo obejrzyj system samodzielnie.</p>
      <div class="tutorial-offer-actions">
        <button type="button" class="ghost-btn" data-tutorial-offer="skip">Sam obejrzę system</button>
        <button type="button" class="primary-btn" data-tutorial-offer="start">Tak, przeprowadź mnie</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-tutorial-offer]");
    if (!btn) return;
    if (btn.dataset.tutorialOffer === "skip") {
      closeTutorialOffer();
      return;
    }
    if (btn.dataset.tutorialOffer === "start") {
      closeTutorialOffer();
      beginTutorial();
    }
  });

  return modal;
}

function ensureTutorialCoach() {
  let coach = document.getElementById("tutorialCoach");
  if (coach) return coach;

  coach = document.createElement("div");
  coach.id = "tutorialCoach";
  coach.className = "tutorial-coach";
  coach.hidden = true;
  coach.innerHTML = `
    <div class="tutorial-coach-card">
      <div class="tutorial-coach-meta">
        <span class="tutorial-step-badge" id="tutorialStepBadge">1 / 1</span>
        <button type="button" class="tutorial-skip-link" data-tutorial-action="abort">Przerwij</button>
      </div>
      <h3 id="tutorialCoachTitle">Tutorial</h3>
      <p id="tutorialCoachBody"></p>
      <div class="tutorial-coach-actions">
        <button type="button" class="primary-btn" id="tutorialNextBtn" data-tutorial-action="next" hidden>Dalej</button>
      </div>
    </div>`;
  document.body.appendChild(coach);

  coach.addEventListener("click", (event) => {
    const action = event.target.closest("[data-tutorial-action]")?.dataset.tutorialAction;
    if (action === "abort") {
      endTutorial(false);
      return;
    }
    if (action === "next") {
      advanceTutorial();
    }
  });

  return coach;
}

function ensureTutorialSpotlight() {
  let spot = document.getElementById("tutorialSpotlight");
  if (spot) return spot;
  spot = document.createElement("div");
  spot.id = "tutorialSpotlight";
  spot.className = "tutorial-spotlight";
  spot.hidden = true;
  spot.innerHTML = `<div class="tutorial-spotlight-ring"></div>`;
  document.body.appendChild(spot);
  return spot;
}

function showTutorialOffer() {
  tutorialState.offerOpen = true;
  const modal = ensureTutorialOfferModal();
  modal.hidden = false;
  document.body.classList.add("tutorial-offer-open");
}

function closeTutorialOffer() {
  tutorialState.offerOpen = false;
  const modal = document.getElementById("tutorialOfferModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("tutorial-offer-open");
}

function beginTutorial() {
  clearMockSilent();
  showTypeToast("Czyszczę dane w mockup i zaczynamy na czysto!");
  tutorialState.active = true;
  tutorialState.stepIndex = 0;
  tutorialState.projectId = null;
  document.body.classList.add("tutorial-active");
  renderView("dashboard");
  window.setTimeout(() => applyTutorialStep(), 80);
}

function endTutorial(completed) {
  tutorialState.active = false;
  tutorialState.stepIndex = -1;
  document.body.classList.remove("tutorial-active");
  clearTutorialHighlight();
  const coach = document.getElementById("tutorialCoach");
  if (coach) coach.hidden = true;
  if (completed) {
    showTypeToast("Tutorial zakończony — możesz korzystać z systemu swobodnie");
  } else {
    showTypeToast("Tutorial przerwany");
  }
}

function currentTutorialStep() {
  if (!tutorialState.active) return null;
  return TUTORIAL_STEPS[tutorialState.stepIndex] || null;
}

function advanceTutorial() {
  if (!tutorialState.active) return;
  const current = currentTutorialStep();
  if (current?.id === "category") {
    tutorialAutoSaveProject();
  }
  tutorialState.stepIndex += 1;
  if (tutorialState.stepIndex >= TUTORIAL_STEPS.length) {
    endTutorial(true);
    return;
  }
  const next = currentTutorialStep();
  if (next?.id === "done") {
    applyTutorialStep();
    return;
  }
  if (next?.id === "edit-project" && tutorialState.projectId) {
    renderView("project-detail", { projectId: tutorialState.projectId });
    window.setTimeout(() => applyTutorialStep(), 60);
    return;
  }
  if (next?.view && next.view !== getCurrentTutorialViewHint()) {
    // stay on page if already correct; otherwise navigate when needed
  }
  applyTutorialStep();
}

function getCurrentTutorialViewHint() {
  const title = document.getElementById("pageTitle")?.textContent || "";
  if (title === "Pulpit") return "dashboard";
  if (title === "Nowy projekt" || title === "Edycja projektu") return "new-project";
  return "other";
}

function tutorialAutoSaveProject() {
  const titleEl = document.getElementById("projectTitle");
  const descEl = document.getElementById("projectDescription");
  let title = titleEl?.value.trim() || "";
  let description = descEl?.value.trim() || "";
  if (!title) {
    title = DEMO_AUTOFILL.title;
    description = DEMO_AUTOFILL.description;
    if (titleEl) titleEl.value = title;
    if (descEl) descEl.value = description;
  }
  const project = persistProject({
    id: `p${Date.now()}`,
    title,
    description,
    files: projectFiles.map((file) => ({ ...file })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  tutorialState.projectId = project.id;
  editingProjectId = null;
}

function clearTutorialHighlight() {
  document.querySelectorAll(".tutorial-target").forEach((el) => {
    el.classList.remove("tutorial-target");
  });
  const spot = document.getElementById("tutorialSpotlight");
  if (spot) spot.hidden = true;
}

function positionSpotlight(target) {
  const spot = ensureTutorialSpotlight();
  const ring = spot.querySelector(".tutorial-spotlight-ring");
  if (!target || !ring) {
    spot.hidden = true;
    return;
  }
  const rect = target.getBoundingClientRect();
  const pad = 10;
  spot.hidden = false;
  ring.style.top = `${Math.max(8, rect.top - pad)}px`;
  ring.style.left = `${Math.max(8, rect.left - pad)}px`;
  ring.style.width = `${rect.width + pad * 2}px`;
  ring.style.height = `${rect.height + pad * 2}px`;
}

function applyTutorialStep() {
  if (!tutorialState.active) return;
  const step = currentTutorialStep();
  if (!step) {
    endTutorial(true);
    return;
  }

  const coach = ensureTutorialCoach();
  const nextBtn = coach.querySelector("#tutorialNextBtn");
  coach.hidden = false;
  coach.querySelector("#tutorialCoachTitle").textContent = step.title;
  coach.querySelector("#tutorialCoachBody").textContent = step.body;
  coach.querySelector("#tutorialStepBadge").textContent = `${tutorialState.stepIndex + 1} / ${
    TUTORIAL_STEPS.length
  }`;

  const showNext = !step.wait || step.id === "welcome" || step.id === "done";
  nextBtn.hidden = !showNext;
  nextBtn.textContent = step.nextLabel || "Dalej";

  clearTutorialHighlight();
  applyTutorialSaveLock(Boolean(step.blockSave));

  if (step.target) {
    const target = document.querySelector(step.target);
    if (target) {
      target.classList.add("tutorial-target");
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      positionSpotlight(target);
    } else {
      // retry shortly (DOM may still settle)
      window.setTimeout(() => {
        if (!tutorialState.active) return;
        if (currentTutorialStep()?.id !== step.id) return;
        const retry = document.querySelector(step.target);
        if (retry) {
          retry.classList.add("tutorial-target");
          positionSpotlight(retry);
        }
      }, 120);
    }
  } else {
    const spot = document.getElementById("tutorialSpotlight");
    if (spot) spot.hidden = true;
  }
}

function applyTutorialSaveLock(locked) {
  const submit = document.querySelector('#projectForm button[type="submit"]');
  if (!submit) return;
  submit.disabled = locked;
  submit.classList.toggle("is-tutorial-locked", locked);
  submit.title = locked ? "W tutorialu zapis jest na razie wyłączony" : "";
}

function isTutorialAllowedTarget(eventTarget) {
  if (!tutorialState.active) return true;
  if (!(eventTarget instanceof Element)) return true;
  if (eventTarget.closest("#tutorialCoach, #tutorialOfferModal, #tutorialSpotlight")) return true;

  const step = currentTutorialStep();
  if (!step) return true;

  if (step.target && eventTarget.closest(step.target)) return true;
  if (step.allow?.some((sel) => eventTarget.closest(sel))) return true;

  // Allow spotlight ring itself
  if (eventTarget.closest(".tutorial-spotlight-ring")) return true;

  return false;
}

function onTutorialClickCapture(event) {
  if (tutorialState.offerOpen) {
    if (event.target.closest("#tutorialOfferModal")) return;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (!tutorialState.active) return;
  if (isTutorialAllowedTarget(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  const coach = document.getElementById("tutorialCoach");
  coach?.classList.add("is-nudge");
  window.setTimeout(() => coach?.classList.remove("is-nudge"), 420);
}

function notifyTutorial(eventName, payload) {
  if (!tutorialState.active) return;
  const step = currentTutorialStep();
  if (!step) return;

  if (eventName === "view" && step.wait === `view:${payload}`) {
    advanceTutorial();
    return;
  }

  if (eventName === "autofill" && step.wait === "autofill") {
    advanceTutorial();
    return;
  }

  if (eventName === "files" && typeof step.wait === "string" && step.wait.startsWith("files:")) {
    const need = Number(step.wait.split(":")[1] || 0);
    if (projectFiles.length >= need) {
      advanceTutorial();
    } else {
      applyTutorialStep();
    }
    return;
  }

  if (eventName === "category" && step.wait === "category") {
    advanceTutorial();
    return;
  }

  if (eventName === "edit" && step.wait === "edit") {
    advanceTutorial();
    return;
  }

  if (eventName === "view-rendered") {
    window.setTimeout(() => applyTutorialStep(), 40);
  }
}

function initTutorial() {
  ensureTutorialOfferModal();
  ensureTutorialCoach();
  ensureTutorialSpotlight();
  document.addEventListener("click", onTutorialClickCapture, true);
  window.addEventListener("resize", () => {
    if (!tutorialState.active) return;
    const step = currentTutorialStep();
    if (!step?.target) return;
    const target = document.querySelector(step.target);
    if (target) positionSpotlight(target);
  });
  // Tutorial temporarily disabled
  // window.setTimeout(() => showTutorialOffer(), 350);
}

initTutorial();
