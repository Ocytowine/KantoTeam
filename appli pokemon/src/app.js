const STORAGE_KEY = "kantoTeamState:v1";

const defaultState = {
  selectedSlot: 0,
  activeView: "slots",
  teams: [null, null, null],
  customPokemon: [],
  sharedTeams: []
};

let state = loadState();
let draftTeam = createEmptyTeam(0);
let sharedTeam = loadSharedTeamFromUrl();
let simulationDraft = {
  editingIndex: null,
  enemies: [],
  showResults: false,
  autoOpponent: false
};
let versusApplyModalOpen = false;
let versusSharedModalOpen = false;
let pokemonEditContext = null;
let pokemonEditEvolution = { status: "idle", items: [] };
let teamSettingsOpen = false;
let teamAddPanelOpen = false;
let teamAddMode = null;
let teamAddSelectedPokemon = null;
let teamAddSlotIndex = null;
let teamAddAttackMode = null;
let teamAddListFilters = {
  query: "",
  typeOne: "",
  typeTwo: ""
};
let helperThreatAnalysisOpen = false;
let helperOpenGroup = null;
let helperSelectedTypes = null;
let pokemonSearchFilters = {
  source: "all",
  query: "",
  typeOne: "",
  typeTwo: ""
};

const mobileVersusMedia = window.matchMedia("(max-width: 920px)");
const spriteUrls = new Map();
const pokemonInfoCache = new Map();
const SPRITE_NAME_ALIASES = {
  "nœunœuf": 102,
  carmarche: 444,
  mamochon: 473,
  boguerise: 651,
  feunec: 653,
  bagguiguane: 559
};
let spritesEnabled = false;
let spritesLoading = false;

const el = {
  intro: document.querySelector("#app-intro"),
  slots: document.querySelector("#team-slots"),
  backToSlots: document.querySelector("#back-to-slots"),
  openTypeHelper: document.querySelector("#open-type-helper"),
  manageSavedPokemon: document.querySelector("#manage-saved-pokemon"),
  openPokemonSearch: document.querySelector("#open-pokemon-search"),
  openSharedTeams: document.querySelector("#open-shared-teams"),
  typeHelperPanel: document.querySelector("#type-helper-panel"),
  typeHelperCount: document.querySelector("#type-helper-count"),
  helperTypeOne: document.querySelector("#helper-type-one"),
  helperTypeTwo: document.querySelector("#helper-type-two"),
  helperMode: Array.from(document.querySelectorAll("[name='helper-mode']")),
  helperThreatSearchToggle: document.querySelector("#helper-threat-search-toggle"),
  helperThreatSearchField: document.querySelector("#helper-threat-search-field"),
  helperThreatPokemon: document.querySelector("#helper-threat-pokemon"),
  helperThreatOptions: document.querySelector("#helper-threat-options"),
  helperSource: document.querySelector("#helper-source"),
  helperTargetBase: document.querySelector("#helper-target-base"),
  helperDefense: document.querySelector("#helper-defense"),
  helperOffense: document.querySelector("#helper-offense"),
  helperThreatAnalysisToggle: document.querySelector("#helper-threat-analysis-toggle"),
  helperThreatAnalysis: document.querySelector("#helper-threat-analysis"),
  helperFilterStep: document.querySelector("#helper-filter-step"),
  helperFilterSummary: document.querySelector("#helper-filter-summary"),
  helperResponseJump: document.querySelector("#helper-response-jump"),
  helperGridTitle: document.querySelector("#helper-grid-title"),
  helperMatchupGrid: document.querySelector("#helper-matchup-grid"),
  helperPokemonHeading: document.querySelector("#helper-pokemon-heading"),
  helperPokemonTitle: document.querySelector("#helper-pokemon-title"),
  helperPokemonList: document.querySelector("#helper-pokemon-list"),
  savedManagerPanel: document.querySelector("#saved-manager-panel"),
  savedPokemonList: document.querySelector("#saved-pokemon-list"),
  savedPokemonEditPanel: document.querySelector("#saved-pokemon-edit-panel"),
  pokemonSearchPanel: document.querySelector("#pokemon-search-panel"),
  pokemonSearchSource: document.querySelector("#pokemon-search-source"),
  pokemonSearchQuery: document.querySelector("#pokemon-search-query"),
  pokemonSearchTypeOne: document.querySelector("#pokemon-search-type-one"),
  pokemonSearchTypeTwo: document.querySelector("#pokemon-search-type-two"),
  pokemonSearchCount: document.querySelector("#pokemon-search-count"),
  pokemonSearchResults: document.querySelector("#pokemon-search-results"),
  sharedTeamsPanel: document.querySelector("#shared-teams-panel"),
  sharedTeamsList: document.querySelector("#shared-teams-list"),
  sharedTeamsCount: document.querySelector("#shared-teams-count"),
  compositionPanel: document.querySelector("#composition-panel"),
  compositionTitle: document.querySelector("#composition-title"),
  compositionCount: document.querySelector("#composition-count"),
  compositionList: document.querySelector("#composition-list"),
  teamSettingsToggle: document.querySelector("#team-settings-toggle"),
  teamSettingsPanel: document.querySelector("#team-settings-panel"),
  compositionTeamName: document.querySelector("#composition-team-name"),
  compositionTeamSource: document.querySelector("#composition-team-source"),
  compositionAddPanel: document.querySelector("#composition-add-panel"),
  compositionToAnalysis: document.querySelector("#composition-to-analysis"),
  pokemonEditPanel: document.querySelector("#pokemon-edit-panel"),
  simulationPanel: document.querySelector("#simulation-panel"),
  simulationTitle: document.querySelector("#simulation-title"),
  simulationCount: document.querySelector("#simulation-count"),
  versusAutoOpponent: document.querySelector("#versus-auto-opponent"),
  versusApplyTeam: document.querySelector("#versus-apply-team"),
  versusSharedLoader: document.querySelector("#versus-shared-loader"),
  versusSharedModal: document.querySelector("#versus-shared-modal"),
  versusApplyModal: document.querySelector("#versus-apply-modal"),
  pokemonEditModal: document.querySelector("#pokemon-edit-modal"),
  simulationEnemies: document.querySelector("#simulation-enemies"),
  simulationEnemyEditor: document.querySelector("#simulation-enemy-editor"),
  simulationConfirm: document.querySelector("#simulation-confirm"),
  simulationResults: document.querySelector("#simulation-results"),
  simulationMobile: document.querySelector("#mobile-versus-list"),
  editorPanel: document.querySelector("#editor-panel"),
  analysisPanel: document.querySelector("#analysis-panel"),
  slotLabel: document.querySelector("#slot-label"),
  editorTitle: document.querySelector("#editor-title"),
  teamName: document.querySelector("#team-name"),
  addMode: document.querySelector("#add-mode"),
  modeFields: Array.from(document.querySelectorAll(".mode-field")),
  officialSearch: document.querySelector("#official-search"),
  officialSelect: document.querySelector("#official-select"),
  reforgedSearch: document.querySelector("#reforged-search"),
  reforgedSelect: document.querySelector("#reforged-select"),
  savedCustomSelect: document.querySelector("#saved-custom-select"),
  customName: document.querySelector("#custom-name"),
  customTypeOne: document.querySelector("#custom-type-one"),
  customTypeTwo: document.querySelector("#custom-type-two"),
  usePokemonTypes: document.querySelector("#use-pokemon-types"),
  librarySaveOption: document.querySelector("#library-save-option"),
  saveToLibrary: document.querySelector("#save-to-library"),
  attackCount: document.querySelector("#attack-count"),
  attackTypes: document.querySelector("#attack-types"),
  preview: document.querySelector("#pokemon-preview"),
  addPokemon: document.querySelector("#add-pokemon"),
  teamForm: document.querySelector("#team-form"),
  teamList: document.querySelector("#team-list"),
  analysisTitle: document.querySelector("#analysis-title"),
  analysisToComposition: document.querySelector("#analysis-to-composition"),
  teamCount: document.querySelector("#team-count"),
  shareActions: document.querySelector("#share-actions"),
  shareMenuToggle: document.querySelector("#share-menu-toggle"),
  shareMenu: document.querySelector("#share-menu"),
  shareTeam: document.querySelector("#share-team"),
  copyShareLink: document.querySelector("#copy-share-link"),
  shareWhatsapp: document.querySelector("#share-whatsapp"),
  shareSms: document.querySelector("#share-sms"),
  sharedImportActions: document.querySelector("#shared-import-actions"),
  saveSharedTeam: document.querySelector("#save-shared-team"),
  analysisEmpty: document.querySelector("#analysis-empty"),
  analysisContent: document.querySelector("#analysis-content"),
  threatTable: document.querySelector("#threat-table"),
  threatDetail: document.querySelector("#threat-detail"),
  advantageTable: document.querySelector("#advantage-table"),
  advantageDetail: document.querySelector("#advantage-detail"),
  offenseSummary: document.querySelector("#offense-summary"),
  offenseDetail: document.querySelector("#offense-detail"),
  typeMatchupOne: document.querySelector("#type-matchup-one"),
  typeMatchupTwo: document.querySelector("#type-matchup-two"),
  typeMatchupSubmit: document.querySelector("#type-matchup-submit"),
  typeMatchupResults: document.querySelector("#type-matchup-results"),
  adviceList: document.querySelector("#advice-list")
};

init();

function init() {
  state.activeView = sharedTeam ? "composition" : "slots";
  if (!sharedTeam) saveState();
  fillTypeSelect(el.customTypeOne, false);
  fillTypeSelect(el.customTypeTwo, true);
  fillTypeSelect(el.typeMatchupOne, false);
  fillTypeSelect(el.typeMatchupTwo, true);
  fillTypeSelect(el.helperTypeOne, false);
  fillTypeSelect(el.helperTypeTwo, true);
  fillTypeSelect(el.pokemonSearchTypeOne, true);
  fillTypeSelect(el.pokemonSearchTypeTwo, true);
  fillTypeSelect(el.helperTargetBase, true);
  enhanceTypeSelects(document);
  renderAttackChecks();
  renderOfficialOptions();
  renderReforgedOptions();
  renderSavedCustomOptions();
  syncAttackChecksFromCurrentSelection();
  bindEvents();
  draftTeam = state.teams[state.selectedSlot] ? structuredClone(state.teams[state.selectedSlot]) : createEmptyTeam(state.selectedSlot || 0);
  el.teamName.value = draftTeam.name || "";
  el.addMode.value = getTeamPreferredSource(draftTeam);
  syncAttackChecksFromCurrentSelection();
  renderAll();
  startIntro();
  void syncAppSprites(sharedTeam?.pokemon || []).then(renderAll);
}

function startIntro() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const displayDuration = reducedMotion ? 200 : 1450;
  const fadeDuration = reducedMotion ? 100 : 520;

  window.setTimeout(() => {
    el.intro.classList.add("leaving");
    window.setTimeout(() => {
      el.intro.classList.add("hidden");
      document.body.classList.remove("intro-active");
    }, fadeDuration);
  }, displayDuration);
}

function bindEvents() {
  el.backToSlots.addEventListener("click", () => {
    openView("slots");
  });

  el.manageSavedPokemon.addEventListener("click", () => openView("savedManager"));
  el.openTypeHelper.addEventListener("click", () => openView("typeHelper"));
  el.openPokemonSearch.addEventListener("click", () => openView("pokemonSearch"));
  el.openSharedTeams.addEventListener("click", () => openView("sharedTeams"));
  el.pokemonSearchSource.addEventListener("change", () => {
    pokemonSearchFilters.source = el.pokemonSearchSource.value;
    renderPokemonSearch();
  });
  el.pokemonSearchQuery.addEventListener("input", () => {
    pokemonSearchFilters.query = el.pokemonSearchQuery.value;
    renderPokemonSearch();
  });
  [el.pokemonSearchTypeOne, el.pokemonSearchTypeTwo].forEach((field) => {
    field.addEventListener("change", () => {
      pokemonSearchFilters.typeOne = el.pokemonSearchTypeOne.value;
      pokemonSearchFilters.typeTwo = el.pokemonSearchTypeTwo.value;
      renderPokemonSearch();
    });
  });
  [el.helperTypeOne, el.helperTypeTwo, el.helperSource, el.helperTargetBase].forEach((field) => {
    field.addEventListener("change", () => {
      resetHelperResultSelection();
      renderTypeHelper();
    });
  });
  el.helperMode.forEach((field) => field.addEventListener("change", () => {
    resetHelperResultSelection();
    renderTypeHelper();
  }));
  el.helperThreatAnalysisToggle.addEventListener("click", () => {
    helperThreatAnalysisOpen = !helperThreatAnalysisOpen;
    renderTypeHelper();
  });
  el.helperFilterSummary.addEventListener("click", () => scrollToHelperAnchor(el.helperFilterStep));
  el.helperFilterSummary.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    scrollToHelperAnchor(el.helperFilterStep);
  });
  el.helperResponseJump.addEventListener("click", () => scrollToHelperAnchor(el.helperMatchupGrid));
  el.helperResponseJump.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    scrollToHelperAnchor(el.helperMatchupGrid);
  });
  el.helperThreatSearchToggle.addEventListener("click", toggleHelperThreatSearch);
  el.helperThreatPokemon.addEventListener("input", applyHelperThreatPokemon);
  el.shareMenuToggle.addEventListener("click", toggleShareMenu);
  el.shareTeam.addEventListener("click", shareActiveTeam);
  el.copyShareLink.addEventListener("click", copyActiveTeamLink);
  el.shareWhatsapp.addEventListener("click", () => openMessageShare("whatsapp"));
  el.shareSms.addEventListener("click", () => openMessageShare("sms"));
  el.saveSharedTeam.addEventListener("click", saveCurrentSharedTeam);
  document.addEventListener("click", (event) => {
    if (el.shareActions.classList.contains("hidden")) return;
    if (el.shareActions.contains(event.target)) return;
    closeShareMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".type-wheel.open").forEach(closeTypeWheel);
    if (pokemonEditContext) closePokemonEditModal();
    if (versusSharedModalOpen) closeVersusSharedModal();
  });
  window.addEventListener("online", () => {
    void syncAppSprites().then(renderAll);
  });
  window.addEventListener("offline", () => {
    spritesEnabled = false;
    spriteUrls.clear();
    renderAll();
  });
  el.compositionToAnalysis.addEventListener("click", () => openView("analysis"));
  el.teamSettingsToggle.addEventListener("click", toggleTeamSettings);
  el.compositionTeamName.addEventListener("input", updateCurrentTeamSettings);
  el.compositionTeamSource.addEventListener("change", updateCurrentTeamSettings);
  el.analysisToComposition.addEventListener("click", () => openView("composition"));
  el.simulationConfirm.addEventListener("click", renderSimulationResults);
  el.versusApplyTeam.addEventListener("click", () => {
    versusApplyModalOpen = true;
    renderVersusApplyModal();
  });
  el.versusAutoOpponent.addEventListener("change", toggleAutomaticOpponent);
  mobileVersusMedia.addEventListener("change", () => {
    if (state.activeView === "simulation") renderSimulation(state.teams[state.selectedSlot]);
  });
  el.typeMatchupSubmit.addEventListener("click", () => renderTypeMatchupAnalysis());
  el.usePokemonTypes.addEventListener("click", selectCurrentPokemonTypesAsAttacks);

  el.addMode.addEventListener("change", () => {
    if (el.addMode.value === "official" || el.addMode.value === "reforged") {
      draftTeam.preferredSource = el.addMode.value;
    }
    updateModeFields();
    syncAttackChecksFromCurrentSelection();
    renderPreview();
  });

  el.officialSearch.addEventListener("input", () => {
    renderOfficialOptions();
    syncAttackChecksFromCurrentSelection();
    renderPreview();
  });

  el.reforgedSearch.addEventListener("input", () => {
    renderReforgedOptions();
    syncAttackChecksFromCurrentSelection();
    renderPreview();
  });

  [el.officialSelect, el.reforgedSelect, el.savedCustomSelect, el.customName, el.customTypeOne, el.customTypeTwo].forEach((field) => {
    field.addEventListener("input", renderPreview);
    field.addEventListener("change", renderPreview);
  });

  el.savedCustomSelect.addEventListener("change", () => {
    syncAttackChecksFromCurrentSelection();
    renderPreview();
  });

  el.officialSelect.addEventListener("change", () => {
    if (el.addMode.value === "official") {
      syncAttackChecksFromCurrentSelection();
      renderPreview();
    }
  });

  el.reforgedSelect.addEventListener("change", () => {
    if (el.addMode.value === "reforged") {
      syncAttackChecksFromCurrentSelection();
      renderPreview();
    }
  });

  el.attackTypes.addEventListener("change", (event) => {
    const checked = getSelectedAttackTypes();
    if (checked.length > 4) {
      event.target.checked = false;
      alert("Un Pokemon peut avoir au maximum 4 types d'attaque.");
    }
    updateAttackCount();
    renderPreview();
  });

  el.addPokemon.addEventListener("click", addCurrentPokemon);

  el.teamForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.activeView === "composition") return;
    confirmTeam();
  });
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored) return structuredClone(defaultState);
    return {
      selectedSlot: stored.selectedSlot ?? 0,
      activeView: stored.activeView || "slots",
      teams: Array.isArray(stored.teams)
        ? [stored.teams[0] || null, stored.teams[1] || null, stored.teams[2] || null].map(normalizeStoredTeam)
        : [null, null, null],
      customPokemon: Array.isArray(stored.customPokemon) ? stored.customPokemon : [],
      sharedTeams: Array.isArray(stored.sharedTeams) ? stored.sharedTeams.map(normalizeStoredSharedTeam).filter(Boolean).slice(0, 3) : []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeStoredTeam(team) {
  if (!team) return null;
  return {
    ...team,
    pokemon: Array.isArray(team.pokemon) ? team.pokemon : [],
    reservePokemonIds: Array.isArray(team.reservePokemonIds) ? team.reservePokemonIds : []
  };
}

function normalizeStoredSharedTeam(team) {
  const normalized = normalizeSharedTeam(team);
  if (!normalized) return null;
  return {
    ...normalized,
    id: team.id || `shared-saved-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    savedName: String(team.savedName || normalized.name || "Equipe partagee").slice(0, 32),
    savedAt: team.savedAt || new Date().toISOString()
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadSharedTeamFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("team");
  if (!encoded) return null;

  try {
    const payload = JSON.parse(decodeSharePayload(encoded));
    if (payload?.v === 2 && payload?.t === "t") return normalizeSharedTeam(expandCompactSharePayload(payload));
    if (payload?.v === 1 && payload?.type === "team") return normalizeSharedTeam(payload.team);
    return null;
  } catch {
    return null;
  }
}

function normalizeSharedTeam(team) {
  if (!team || !Array.isArray(team.pokemon)) return null;
  const pokemon = team.pokemon
    .slice(0, 6)
    .map((item, index) => {
      const types = Array.isArray(item.types)
        ? item.types.filter((type) => KANTO_TYPES.includes(type)).slice(0, 2)
        : [];
      if (!types.length) return null;
      const attacks = Array.isArray(item.attacks)
        ? item.attacks.filter((type) => KANTO_TYPES.includes(type)).slice(0, 4)
        : [];
      return {
        instanceId: `shared-${Date.now()}-${index}`,
        sourceId: item.sourceId || item.officialId || item.reforgedId || `shared-${index}`,
        name: String(item.name || `Pokemon ${index + 1}`).slice(0, 32),
        types,
        attacks,
        nationalId: Number.isInteger(item.nationalId)
          ? item.nationalId
          : Number.isInteger(item.officialId)
            ? item.officialId
            : null,
        officialId: Number.isInteger(item.officialId) ? item.officialId : null,
        reforgedId: item.reforgedId || null
      };
    })
    .filter(Boolean);

  if (!pokemon.length) return null;
  return {
    id: "shared-team",
    name: String(team.name || "Equipe partagee").slice(0, 32),
    preferredSource: team.preferredSource === "reforged" ? "reforged" : "official",
    shared: true,
    pokemon
  };
}

function buildSharePayload(team) {
  return {
    v: 2,
    t: "t",
    n: team.name,
    s: getTeamPreferredSource(team) === "reforged" ? "r" : "o",
    p: team.pokemon.map(compactSharePokemon)
  };
}

function compactSharePokemon(pokemon) {
  const source = state.customPokemon.find((item) => String(item.id) === String(pokemon.sourceId)) || pokemon;
  const attacks = encodeShareTypes(pokemon.attacks || source.attacks || []);
  let officialId = null;
  if (Number.isInteger(source.officialId)) officialId = source.officialId;
  else if (Number.isInteger(source.sourceId)) officialId = source.sourceId;
  else if (Number.isInteger(source.id)) officialId = source.id;
  else if (Number.isInteger(pokemon.sourceId)) officialId = pokemon.sourceId;

  if (officialId && KANTO_POKEMON.some((item) => item.id === officialId && item.name === pokemon.name)) {
    return { o: officialId, a: attacks };
  }

  if (source.reforgedId || String(source.sourceId || source.id || pokemon.sourceId || "").startsWith("reforged-")) {
    return { r: source.reforgedId || source.sourceId || source.id || pokemon.sourceId, a: attacks };
  }

  return {
    n: pokemon.name,
    y: encodeShareTypes(pokemon.types),
    a: attacks,
    id: pokemon.nationalId || source.nationalId || null
  };
}

function encodeShareTypes(types) {
  return types.map((type) => KANTO_TYPES.indexOf(type)).filter((index) => index >= 0);
}

function decodeShareTypes(types) {
  return Array.isArray(types)
    ? types.map((value) => Number.isInteger(value) ? KANTO_TYPES[value] : value).filter((type) => KANTO_TYPES.includes(type))
    : [];
}

function expandCompactSharePayload(payload) {
  return {
    name: payload.n,
    preferredSource: payload.s === "r" ? "reforged" : "official",
    pokemon: Array.isArray(payload.p) ? payload.p.map(expandCompactSharePokemon).filter(Boolean) : []
  };
}

function expandCompactSharePokemon(item) {
  if (Number.isInteger(item.o)) {
    const pokemon = KANTO_POKEMON.find((entry) => entry.id === item.o);
    if (!pokemon) return null;
    return {
      name: pokemon.name,
      types: pokemon.types,
      attacks: decodeShareTypes(item.a),
      officialId: pokemon.id,
      nationalId: pokemon.id,
      sourceId: pokemon.id
    };
  }

  if (item.r) {
    const pokemon = KANTO_REFORGED_POKEMON.find((entry) => entry.id === item.r);
    if (!pokemon) return null;
    return {
      name: pokemon.name,
      types: pokemon.types,
      attacks: decodeShareTypes(item.a),
      reforgedId: pokemon.id,
      sourceId: pokemon.id
    };
  }

  return {
    name: item.n,
    types: decodeShareTypes(item.y),
    attacks: decodeShareTypes(item.a),
    nationalId: Number.isInteger(item.id) ? item.id : null
  };
}

function encodeSharePayload(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeSharePayload(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function createTeamShareLink(team) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("team", encodeSharePayload(JSON.stringify(buildSharePayload(team))));
  return url.toString();
}

function createEmptyTeam(slot) {
  return {
    id: `team-${Date.now()}-${slot}`,
    name: "",
    preferredSource: "official",
    pokemon: [],
    reservePokemonIds: []
  };
}

function selectSlot(slot, view, preferredSource) {
  sharedTeam = null;
  teamSettingsOpen = false;
  teamAddPanelOpen = false;
  teamAddSlotIndex = null;
  if (simulationDraft.autoOpponent) {
    simulationDraft.autoOpponent = false;
    simulationDraft.showResults = false;
    el.versusAutoOpponent.checked = false;
  }
  state.selectedSlot = slot;
  state.activeView = view || "composition";
  saveState();
  draftTeam = state.teams[slot] ? structuredClone(state.teams[slot]) : createEmptyTeam(slot);
  if (!state.teams[slot] && preferredSource) draftTeam.preferredSource = preferredSource;
  el.teamName.value = draftTeam.name || "";
  el.addMode.value = getTeamPreferredSource(draftTeam);
  syncAttackChecksFromCurrentSelection();
  renderAll();
}

function getTeamPreferredSource(team) {
  return team?.preferredSource === "reforged" ? "reforged" : "official";
}

function preferredSourceLabel(source) {
  return source === "reforged" ? "Kanto Reforged" : "Kanto classique";
}

function getTeamReservePokemon(team) {
  if (!team) return [];
  const ids = Array.isArray(team.reservePokemonIds) ? team.reservePokemonIds : [];
  return ids
    .map((id) => state.customPokemon.find((pokemon) => String(pokemon.id) === String(id)))
    .filter(Boolean);
}

function pokemonIdentityKey(pokemon) {
  return [
    normalize(pokemon?.name),
    (pokemon?.types || []).join("|"),
    getPokemonNationalId(pokemon) || pokemon?.sourceId || pokemon?.id || ""
  ].join("::");
}

function isSamePokemon(a, b) {
  return pokemonIdentityKey(a) === pokemonIdentityKey(b);
}

function openView(view) {
  if (view === "slots") sharedTeam = null;
  if (view !== "composition") {
    teamSettingsOpen = false;
    teamAddPanelOpen = false;
    teamAddSlotIndex = null;
  }
  state.activeView = view;
  if (!sharedTeam) saveState();
  renderAll();
}

function renderAll() {
  const activeTeam = getActiveTeam();
  renderSlots();
  renderActiveView();
  renderSavedPokemonManager();
  renderSharedTeamsManager();
  renderPokemonSearch();
  renderSavedCustomOptions();
  updateModeFields();
  renderDraftTeam();
  renderManagedComposition(activeTeam);
  if (!sharedTeam) renderSimulation(state.teams[state.selectedSlot]);
  renderTypeHelper();
  renderPreview();
  renderAnalysis(activeTeam);
  syncTypeWheels(document);
}

function getActiveTeam() {
  return sharedTeam || state.teams[state.selectedSlot];
}

function renderSlots() {
  el.slots.innerHTML = "";
  state.teams.forEach((team, index) => {
    const card = document.createElement("article");
    card.className = `slot-card ${team ? "" : "empty"} ${index === state.selectedSlot ? "active" : ""}`;
    const reserveCount = team ? getTeamReservePokemon(team).length : 0;
    const status = team ? `${team.pokemon.length}/6 Pokemon · ${reserveCount} reserve · ${preferredSourceLabel(getTeamPreferredSource(team))}` : "Slot vide";
    card.innerHTML = team ? `
      <span class="eyebrow">Slot ${index + 1}</span>
      <strong>${escapeHtml(team.name || `Equipe ${index + 1}`)}</strong>
      <span class="slot-meta">${status}</span>
      <div class="slot-actions">
        <button class="small-button" type="button" data-action="analysis" data-slot="${index}">Analyser</button>
        <button class="small-button" type="button" data-action="composition" data-slot="${index}">Gestion d'equipe</button>
        <button class="small-button" type="button" data-action="simulation" data-slot="${index}">Versus</button>
        <button class="small-button danger" type="button" data-action="delete" data-slot="${index}">Supprimer</button>
      </div>
    ` : `
      <div class="empty-team-slot">
        <img class="empty-team-logo" src="assets/add-pokeball.svg" alt="" aria-hidden="true">
        <span>
          <span class="eyebrow">Slot ${index + 1}</span>
          <strong>Creer une equipe</strong>
          <small>Choisis la liste utilisee pour les recherches.</small>
          <span class="empty-team-versions">
            <button class="small-button" type="button" data-action="composition" data-slot="${index}" data-version="official">Kanto</button>
            <button class="small-button" type="button" data-action="composition" data-slot="${index}" data-version="reforged">Reforged</button>
          </span>
        </span>
      </div>
    `;
    el.slots.append(card);
  });

  el.slots.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const slot = Number(button.dataset.slot);
      if (button.dataset.action === "delete") {
        if (!confirm("Supprimer cette equipe ?")) return;
        state.teams[slot] = null;
        state.activeView = "slots";
        state.selectedSlot = slot;
        draftTeam = createEmptyTeam(slot);
        saveState();
        renderAll();
        return;
      }
      const actionToView = {
        analysis: "analysis",
        composition: "composition",
        simulation: "simulation"
      };
      selectSlot(slot, actionToView[button.dataset.action] || "composition", button.dataset.version);
    });
  });
}

function renderActiveView() {
  const hasTeam = Boolean(getActiveTeam());
  const view = ["slots", "savedManager", "typeHelper", "pokemonSearch", "sharedTeams"].includes(state.activeView) ? state.activeView : hasTeam ? state.activeView : "composition";
  el.slots.classList.toggle("hidden", view !== "slots");
  el.backToSlots.classList.toggle("hidden", view === "slots");
  el.manageSavedPokemon.classList.toggle("hidden", view !== "slots");
  el.openTypeHelper.classList.toggle("hidden", view !== "slots");
  el.openPokemonSearch.classList.toggle("hidden", view !== "slots");
  el.openSharedTeams.classList.toggle("hidden", view !== "slots");
  el.savedManagerPanel.classList.toggle("hidden", view !== "savedManager");
  el.sharedTeamsPanel.classList.toggle("hidden", view !== "sharedTeams");
  el.pokemonSearchPanel.classList.toggle("hidden", view !== "pokemonSearch");
  el.typeHelperPanel.classList.toggle("hidden", view !== "typeHelper");
  el.compositionPanel.classList.toggle("hidden", view !== "composition");
  el.simulationPanel.classList.toggle("hidden", view !== "simulation" || Boolean(sharedTeam));
  el.editorPanel.classList.add("hidden");
  el.analysisPanel.classList.toggle("hidden", view !== "analysis");
}

async function syncAppSprites(extraPokemon = []) {
  if (!navigator.onLine || spritesLoading) return;
  const extraList = Array.isArray(extraPokemon) ? extraPokemon : [extraPokemon];
  const pokemon = [
    ...state.teams.filter(Boolean).flatMap((team) => team.pokemon),
    ...state.teams.filter(Boolean).flatMap((team) => getTeamReservePokemon(team)),
    ...state.customPokemon,
    ...state.sharedTeams.flatMap((team) => team.pokemon),
    ...simulationDraft.enemies.filter(Boolean),
    ...extraList.filter(Boolean)
  ];
  spritesLoading = true;
  await syncPokemonSprites(pokemon);
  spritesLoading = false;
}

async function syncPokemonSprites(pokemon) {
  if (!navigator.onLine) return;
  const list = Array.isArray(pokemon) ? pokemon : [pokemon];
  const ids = Array.from(new Set(list.map(getPokemonNationalId).filter(Boolean)))
    .filter((id) => !spriteUrls.has(id));
  await Promise.allSettled(ids.map(async (id) => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      if (!response.ok) return;
      const data = await response.json();
      const sprite = data.sprites?.front_default;
      if (sprite) spriteUrls.set(id, sprite);
    } catch {
      // Une image indisponible reste simplement masquee.
    }
  }));
  spritesEnabled = navigator.onLine && spriteUrls.size > 0;
}

function getPokemonNationalId(pokemon) {
  if (Number.isInteger(pokemon?.nationalId)) return pokemon.nationalId;
  if (Number.isInteger(pokemon?.officialId)) return pokemon.officialId;
  if (Number.isInteger(pokemon?.id)) return pokemon.id;
  if (Number.isInteger(pokemon.sourceId)) return pokemon.sourceId;
  const saved = state.customPokemon.find((item) => String(item.id) === String(pokemon.sourceId));
  if (Number.isInteger(saved?.officialId)) return saved.officialId;
  const name = normalize(saved?.name || pokemon.name);
  return SPRITE_NAME_ALIASES[name] || POKEMON_SPRITE_IDS[name] || null;
}

function renderPokemonSprite(pokemon) {
  if (!spritesEnabled || !navigator.onLine) return "";
  const nationalId = getPokemonNationalId(pokemon);
  const url = nationalId ? spriteUrls.get(nationalId) : null;
  if (!url) return "";
  return `<img class="pokemon-sprite" src="${escapeHtml(url)}" alt="${escapeHtml(pokemon.name)}" loading="lazy" onerror="this.remove()">`;
}

function renderPokemonInfoButton(pokemon, enabled) {
  const nationalId = getPokemonNationalId(pokemon);
  const hasReforgedGuide = isReforgedGuidePokemon(pokemon) && Boolean(getReforgedGuideInfo(pokemon.name));
  if (!enabled || (!nationalId && !hasReforgedGuide)) return "";
  return `
    <button class="pokemon-info-toggle" type="button"
      aria-label="Voir les infos de ${escapeHtml(pokemon.name)}"
      aria-expanded="false"
      data-pokemon-info-name="${escapeHtml(pokemon.name)}"
      data-pokemon-info-id="${nationalId || ""}"
      data-pokemon-info-reforged="${hasReforgedGuide ? "true" : "false"}">
      ${searchIconSvg()}
    </button>
  `;
}

function searchIconSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M10.8 5.5a5.3 5.3 0 1 0 0 10.6 5.3 5.3 0 0 0 0-10.6Z"></path>
      <path d="m15 15 4 4"></path>
    </svg>
  `;
}

function renderVersusSprite(pokemon, side) {
  if (!spritesEnabled || !navigator.onLine || !pokemon) return "";
  const nationalId = getPokemonNationalId(pokemon);
  const url = nationalId ? spriteUrls.get(nationalId) : null;
  if (!url) return "";
  return `<img class="versus-pokemon-sprite ${side}" src="${escapeHtml(url)}" alt="${escapeHtml(pokemon.name)}" onerror="this.remove()">`;
}

function renderVersusSpriteFaceoff(enemy, choice) {
  const enemySprite = renderVersusSprite(enemy, "enemy");
  const choiceSprite = renderVersusSprite(choice, "choice");
  if (!enemySprite && !choiceSprite) return "";
  return `<div class="versus-sprite-faceoff">${enemySprite}<span>VS</span>${choiceSprite}</div>`;
}

function renderOfficialOptions() {
  const query = normalize(el.officialSearch.value);
  const matches = KANTO_POKEMON.filter((pokemon) => normalize(pokemon.name).includes(query));
  el.officialSelect.innerHTML = matches
    .map((pokemon) => `<option value="${pokemon.id}">#${pokemon.id} ${pokemon.name} - ${pokemon.types.join("/")}</option>`)
    .join("");
}

function renderReforgedOptions() {
  const selectedId = el.reforgedSelect.value;
  const query = normalize(el.reforgedSearch.value);
  const matches = KANTO_REFORGED_POKEMON.filter((pokemon) => normalize(pokemon.name).includes(query));
  el.reforgedSelect.innerHTML = matches
    .map((pokemon) => `<option value="${pokemon.id}">${escapeHtml(pokemon.name)} - ${pokemon.types.join("/")}</option>`)
    .join("");
  if (matches.some((pokemon) => pokemon.id === selectedId)) el.reforgedSelect.value = selectedId;
}

function renderSavedCustomOptions() {
  const selectedId = el.savedCustomSelect.value;
  if (!state.customPokemon.length) {
    el.savedCustomSelect.innerHTML = `<option value="">Bibliotheque vide</option>`;
    return;
  }

  el.savedCustomSelect.innerHTML = state.customPokemon
    .map((pokemon) => {
      const attacks = pokemon.attacks?.length ? ` · ${pokemon.attacks.join("/")}` : " · sans attaque";
      return `<option value="${pokemon.id}">[${savedPokemonOriginLabel(pokemon)}] ${escapeHtml(pokemon.name)} - ${pokemon.types.join("/")}${attacks}</option>`;
    })
    .join("");
  if (state.customPokemon.some((pokemon) => String(pokemon.id) === String(selectedId))) {
    el.savedCustomSelect.value = selectedId;
  }
}

function fillTypeSelect(select, optional) {
  select.innerHTML = [
    optional ? `<option value="">Aucun</option>` : "",
    ...KANTO_TYPES.map((type) => `<option value="${type}">${type}</option>`)
  ].join("");
}

function enhanceTypeSelects(root = document) {
  root.querySelectorAll("select").forEach((select) => {
    if (select.dataset.typeWheelReady || !isTypeSelect(select)) return;
    select.dataset.typeWheelReady = "true";
    select.classList.add("native-type-select");
    const wheel = document.createElement("div");
    wheel.className = "type-wheel";
    wheel.dataset.typeWheelFor = select.id || "";
    wheel.innerHTML = renderTypeWheelMarkup(select);
    select.insertAdjacentElement("afterend", wheel);

    wheel.querySelectorAll("[data-type-wheel-value]").forEach((button) => {
      button.addEventListener("mouseenter", () => previewTypeWheelValue(select, button.dataset.typeWheelValue));
      button.addEventListener("mouseleave", () => syncTypeWheel(select));
      button.addEventListener("click", () => {
        const value = button.dataset.typeWheelValue;
        select.value = value;
        syncTypeWheel(select);
        closeTypeWheel(wheel);
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
    wheel.querySelector("[data-type-wheel-open]").addEventListener("click", () => openTypeWheel(wheel, select));
    wheel.querySelector("[data-type-wheel-backdrop]").addEventListener("click", () => closeTypeWheel(wheel));

    select.addEventListener("change", () => syncTypeWheel(select));
    syncTypeWheel(select);
  });
}

function isTypeSelect(select) {
  const values = Array.from(select.options).map((option) => option.value);
  const typeValues = values.filter(Boolean);
  return typeValues.length >= KANTO_TYPES.length
    && typeValues.every((value) => KANTO_TYPES.includes(value))
    && values.every((value) => value === "" || KANTO_TYPES.includes(value));
}

function renderTypeWheelMarkup(select) {
  const optional = Array.from(select.options).some((option) => option.value === "");
  const buttons = KANTO_TYPES.map((type, index) => {
    const angle = (360 / KANTO_TYPES.length) * index;
    return `
      <button class="type-wheel-item" type="button" style="--wheel-angle:${angle}deg;--wheel-angle-back:${-angle}deg;--type-color:${TYPE_COLORS[type] || "#a9b3c3"}" data-type-wheel-value="${type}" aria-label="${type}">
        ${typeLogo(type)}
      </button>
    `;
  }).join("");

  return `
    <button class="type-wheel-trigger" type="button" data-type-wheel-open aria-label="Choisir un type" aria-expanded="false">
      <span data-type-wheel-trigger-icon></span>
    </button>
    <div class="type-wheel-overlay hidden">
      <div class="type-wheel-backdrop" data-type-wheel-backdrop></div>
      <div class="type-wheel-stage" role="dialog" aria-label="Choisir un type">
        ${buttons}
        <button class="type-wheel-center ${optional ? "optional" : ""}" type="button" data-type-wheel-value="${optional ? "" : select.value}">
          <span data-type-wheel-label></span>
        </button>
      </div>
    </div>
  `;
}

function openTypeWheel(wheel, select) {
  syncTypeWheel(select);
  wheel.classList.add("open");
  wheel.querySelector(".type-wheel-overlay")?.classList.remove("hidden");
  wheel.querySelector("[data-type-wheel-open]")?.setAttribute("aria-expanded", "true");
}

function closeTypeWheel(wheel) {
  wheel.classList.remove("open");
  wheel.querySelector(".type-wheel-overlay")?.classList.add("hidden");
  wheel.querySelector("[data-type-wheel-open]")?.setAttribute("aria-expanded", "false");
}

function previewTypeWheelValue(select, value) {
  const wheel = select.nextElementSibling;
  if (!wheel?.classList.contains("type-wheel")) return;
  updateTypeWheelLabel(wheel, value);
}

function syncTypeWheel(select) {
  const wheel = select.nextElementSibling;
  if (!wheel?.classList.contains("type-wheel")) return;
  const value = select.value;
  wheel.querySelectorAll("[data-type-wheel-value]").forEach((button) => {
    button.classList.toggle("active", button.dataset.typeWheelValue === value);
  });
  const center = wheel.querySelector(".type-wheel-center");
  if (center) center.dataset.typeWheelValue = Array.from(select.options).some((option) => option.value === "") ? "" : value;
  const triggerIcon = wheel.querySelector("[data-type-wheel-trigger-icon]");
  if (triggerIcon) {
    triggerIcon.innerHTML = value ? typeLogo(value) : typeLogo("Inconnue");
    triggerIcon.setAttribute("title", value || "Inconnue");
  }
  const trigger = wheel.querySelector("[data-type-wheel-open]");
  if (trigger) trigger.style.setProperty("--type-color", value ? TYPE_COLORS[value] || "#a9b3c3" : "#a9b3c3");
  updateTypeWheelLabel(wheel, value);
}

function syncTypeWheels(root = document) {
  enhanceTypeSelects(root);
  root.querySelectorAll("select[data-type-wheel-ready]").forEach(syncTypeWheel);
}

function updateTypeWheelLabel(wheel, value) {
  const label = wheel.querySelector("[data-type-wheel-label]");
  if (!label) return;
  const text = value || "Aucun";
  label.textContent = text;
  wheel.style.setProperty("--wheel-active-color", value ? TYPE_COLORS[value] || "#a9b3c3" : "rgba(169, 179, 195, 0.48)");
}

function renderAttackChecks() {
  el.attackTypes.innerHTML = KANTO_TYPES.map((type) => `
    <label class="type-check">
      <input type="checkbox" value="${type}">
      ${typeBadge(type)}
    </label>
  `).join("");
  updateAttackCount();
}

function updateModeFields() {
  const preferredSource = getTeamPreferredSource(draftTeam);
  Array.from(el.addMode.options).forEach((option) => {
    if (!["official", "reforged"].includes(option.value)) return;
    option.hidden = option.value !== preferredSource;
    option.disabled = option.value !== preferredSource;
  });
  if (["official", "reforged"].includes(el.addMode.value) && el.addMode.value !== preferredSource) {
    el.addMode.value = preferredSource;
  }
  el.modeFields.forEach((field) => {
    field.classList.toggle("hidden", field.dataset.mode !== el.addMode.value);
  });
  el.librarySaveOption.classList.toggle("hidden", el.addMode.value === "saved");
}

function renderPreview() {
  updateAttackCount();
  const pokemon = getCurrentPokemon(false);
  if (!pokemon) {
    el.preview.innerHTML = `<div class="empty-state">Choisis ou cree un Pokemon pour afficher ses chiffres.</div>`;
    return;
  }

  const defensive = analyzePokemonDefense(pokemon.types);
  const weaknesses = defensive.filter((item) => item.multiplier > 1);
  const resistances = defensive.filter((item) => item.multiplier > 0 && item.multiplier < 1);
  const immunities = defensive.filter((item) => item.multiplier === 0);
  const attacks = getSelectedAttackTypes();

  el.preview.innerHTML = `
    <div class="mini-analysis">
      <div class="mini-line"><strong>${escapeHtml(pokemon.name)}</strong>${pokemon.types.map(typeBadge).join("")}</div>
      <div class="mini-line"><span class="slot-meta">Faiblesses</span>${renderMultiplierList(weaknesses)}</div>
      <div class="mini-line"><span class="slot-meta">Resistances</span>${renderMultiplierList(resistances)}</div>
      <div class="mini-line"><span class="slot-meta">Immunites</span>${renderMultiplierList(immunities)}</div>
      <div class="mini-line"><span class="slot-meta">Attaques</span>${attacks.length ? attacks.map(typeBadge).join("") : `<span class="slot-meta">Aucune</span>`}</div>
    </div>
  `;
}

function getCurrentPokemon(validate) {
  const mode = el.addMode.value;

  if (mode === "official") {
    const id = Number(el.officialSelect.value);
    const pokemon = KANTO_POKEMON.find((item) => item.id === id);
    return pokemon ? structuredClone(pokemon) : null;
  }

  if (mode === "reforged") {
    const pokemon = KANTO_REFORGED_POKEMON.find((item) => item.id === el.reforgedSelect.value);
    return pokemon ? structuredClone(pokemon) : null;
  }

  if (mode === "saved") {
    const id = el.savedCustomSelect.value;
    const pokemon = state.customPokemon.find((item) => item.id === id);
    return pokemon ? structuredClone(pokemon) : null;
  }

  const name = el.customName.value.trim();
  const typeOne = el.customTypeOne.value;
  const typeTwo = el.customTypeTwo.value;

  if (validate && !name) {
    alert("Donne un nom au Pokemon personnalise.");
    return null;
  }

  if (!name && !validate) return null;

  return {
    id: `custom-${Date.now()}`,
    name,
    types: [typeOne, typeTwo].filter(Boolean).filter((type, index, all) => all.indexOf(type) === index),
    custom: true
  };
}

function getSelectedAttackTypes() {
  return Array.from(el.attackTypes.querySelectorAll("input:checked")).map((input) => input.value);
}

function clearAttackTypes() {
  el.attackTypes.querySelectorAll("input").forEach((input) => {
    input.checked = false;
  });
  updateAttackCount();
}

function selectCurrentPokemonTypesAsAttacks() {
  const pokemon = getCurrentPokemon(false);
  if (!pokemon) {
    alert("Choisis d'abord un Pokemon.");
    return;
  }

  el.attackTypes.querySelectorAll("input").forEach((input) => {
    input.checked = pokemon.types.includes(input.value);
  });
  updateAttackCount();
  renderPreview();
}

function updateAttackCount() {
  el.attackCount.textContent = `${getSelectedAttackTypes().length}/4`;
}

function addCurrentPokemon() {
  if (draftTeam.pokemon.length >= 6) {
    alert("Une equipe peut contenir au maximum 6 Pokemon.");
    return;
  }

  const pokemon = getCurrentPokemon(true);
  if (!pokemon) return;

  const attacks = getSelectedAttackTypes();
  if (attacks.length > 4) {
    alert("Un Pokemon peut avoir au maximum 4 types d'attaque.");
    return;
  }

  const shouldSave = el.addMode.value !== "saved" && el.saveToLibrary.checked;
  const matchingSavedPokemon = shouldSave
    ? state.customPokemon.find((item) => (
        (el.addMode.value === "official"
          ? Number(item.officialId) === Number(pokemon.id)
          : el.addMode.value === "reforged"
            ? item.reforgedId === pokemon.id
            : normalize(item.name) === normalize(pokemon.name))
        && item.types.join("|") === pokemon.types.join("|")
        && (item.attacks || []).join("|") === attacks.join("|")
      ))
    : null;
  const savedPokemon = shouldSave
    ? matchingSavedPokemon || {
        ...structuredClone(pokemon),
        id: `saved-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        officialId: el.addMode.value === "official" ? pokemon.id : null,
        reforgedId: el.addMode.value === "reforged" ? pokemon.id : null,
        origin: el.addMode.value,
        custom: el.addMode.value === "custom",
        attacks
      }
    : null;

  if (savedPokemon && !matchingSavedPokemon) state.customPokemon.push(savedPokemon);

  const teamMember = {
    instanceId: `member-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceId: savedPokemon?.id ?? pokemon.id,
    name: pokemon.name,
    types: pokemon.types,
    attacks
  };
  draftTeam.pokemon.push(teamMember);

  if (state.activeView === "composition") {
    if (!draftTeam.name) draftTeam.name = el.compositionTeamName.value.trim() || `Equipe ${state.selectedSlot + 1}`;
    persistDraftTeam();
  } else {
    saveState();
  }
  renderSavedCustomOptions();
  renderDraftTeam();
  clearAttackTypes();
  if (el.addMode.value === "custom") el.customName.value = "";
  syncAttackChecksFromCurrentSelection();
  renderPreview();
  if (state.activeView === "composition") renderAll();
  void syncPokemonSprites(savedPokemon || teamMember).then(() => {
    renderDraftTeam();
    renderPreview();
    if (state.activeView === "composition") renderAll();
  });
}

function renderDraftTeam() {
  const slotNumber = state.selectedSlot + 1;
  el.slotLabel.textContent = `Slot ${slotNumber} · ${preferredSourceLabel(getTeamPreferredSource(draftTeam))}`;
  el.editorTitle.textContent = state.teams[state.selectedSlot] ? "Editer l'equipe" : "Nouvelle equipe";
  el.teamList.innerHTML = "";

  if (!draftTeam.pokemon.length) {
    el.teamList.innerHTML = `<div class="empty-state">Ajoute au moins 1 Pokemon. Tu peux confirmer jusqu'a 6 Pokemon.</div>`;
    return;
  }

  draftTeam.pokemon.forEach((pokemon, index) => {
    const card = document.createElement("article");
    card.className = "pokemon-card collapsible";
    card.setAttribute("style", pokemonCardStyle(pokemon));
    card.innerHTML = renderPokemonCard(pokemon, { index, removable: true, showSprite: true });
    el.teamList.append(card);
  });
  bindPokemonCardToggles(el.teamList);

  el.teamList.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      draftTeam.pokemon = draftTeam.pokemon.filter((pokemon) => pokemon.instanceId !== button.dataset.remove);
      renderDraftTeam();
    });
  });
}

function renderComposition(team) {
  el.compositionTitle.textContent = team ? `${team.name}${sharedTeam ? " · lien partage" : ""}` : "Aucune equipe";
  el.compositionCount.textContent = team ? `${team.pokemon.length}/6` : "0/6";
  el.shareActions.classList.toggle("hidden", !team);
  if (!team) closeShareMenu();
  el.compositionList.innerHTML = "";
  el.pokemonEditPanel.classList.add("hidden");
  el.pokemonEditPanel.innerHTML = "";

  if (!team) {
    el.compositionList.innerHTML = `<div class="empty-state">Retourne aux equipes et cree un slot pour afficher sa composition.</div>`;
    return;
  }

  team.pokemon.forEach((pokemon, index) => {
    const card = document.createElement("article");
    card.className = "pokemon-card collapsible";
    card.setAttribute("style", pokemonCardStyle(pokemon));
    card.innerHTML = renderPokemonCard(pokemon, { index, editable: !sharedTeam, showSprite: true });
    el.compositionList.append(card);
  });
  bindPokemonCardToggles(el.compositionList);

  el.compositionList.querySelectorAll("[data-remove-from-team]").forEach((button) => {
    button.addEventListener("click", () => removePokemonFromCurrentTeam(button.dataset.removeFromTeam));
  });

  el.compositionList.querySelectorAll("[data-edit-pokemon]").forEach((button) => {
    button.addEventListener("click", () => {
      const pokemon = team.pokemon.find((item) => item.instanceId === button.dataset.editPokemon);
      if (pokemon) openPokemonEditModal(pokemon, { mode: "linked", sourceId: pokemon.sourceId ?? pokemon.id });
    });
  });
}

function renderManagedComposition(team) {
  const editable = !sharedTeam;
  const displayTeam = editable && state.activeView === "composition" ? draftTeam : team;
  if (displayTeam?.pokemon.length >= 6) teamAddPanelOpen = false;
  el.compositionTitle.textContent = displayTeam ? `${displayTeam.name || `Equipe ${state.selectedSlot + 1}`}${sharedTeam ? " · lien partage" : ""}` : "Aucune equipe";
  el.compositionCount.textContent = displayTeam ? `${displayTeam.pokemon.length}/6` : "0/6";
  el.teamSettingsToggle.classList.toggle("hidden", !displayTeam || !editable);
  el.teamSettingsPanel.classList.toggle("hidden", !displayTeam || !editable || !teamSettingsOpen);
  el.compositionAddPanel.classList.add("hidden");
  el.shareActions.classList.toggle("hidden", !team);
  el.sharedImportActions.classList.toggle("hidden", !sharedTeam);
  if (!team) closeShareMenu();
  el.compositionList.innerHTML = "";
  el.pokemonEditPanel.classList.add("hidden");
  el.pokemonEditPanel.innerHTML = "";

  if (!displayTeam) {
    el.compositionList.innerHTML = `<div class="empty-state">Retourne aux equipes et cree un slot pour afficher sa composition.</div>`;
    return;
  }

  syncTeamSettingsInputs(displayTeam);

  displayTeam.pokemon.forEach((pokemon, index) => {
    const card = document.createElement("article");
    card.className = "pokemon-card collapsible";
    card.setAttribute("style", pokemonCardStyle(pokemon));
    card.innerHTML = renderPokemonCard(pokemon, { index, editable, showSprite: true });
    el.compositionList.append(card);
  });

  if (editable) {
    for (let index = displayTeam.pokemon.length; index < 6; index += 1) {
      const emptySlot = document.createElement("button");
      emptySlot.className = "composition-add-slot";
      emptySlot.type = "button";
      emptySlot.dataset.openTeamAdd = "true";
      emptySlot.dataset.slotIndex = String(index);
      emptySlot.innerHTML = `
        <img class="add-pokeball-icon large" src="assets/add-pokeball.svg" alt="" aria-hidden="true">
        <span>Ajouter un Pokemon</span>
      `;
      el.compositionList.append(emptySlot);
      if (teamAddPanelOpen && teamAddSlotIndex === index) {
        el.compositionAddPanel.classList.remove("hidden");
        el.compositionList.append(el.compositionAddPanel);
        renderTeamAddPanel();
      }
    }
    renderTeamReserveSection(displayTeam);
  }

  bindPokemonCardToggles(el.compositionList);

  el.compositionList.querySelectorAll("[data-remove-from-team]").forEach((button) => {
    button.addEventListener("click", () => removePokemonFromCurrentTeam(button.dataset.removeFromTeam));
  });

  el.compositionList.querySelectorAll("[data-edit-pokemon]").forEach((button) => {
    button.addEventListener("click", () => {
      const pokemon = displayTeam.pokemon.find((item) => item.instanceId === button.dataset.editPokemon);
      if (pokemon) openPokemonEditModal(pokemon, { mode: "linked", sourceId: pokemon.sourceId ?? pokemon.id });
    });
  });

  el.compositionList.querySelectorAll("[data-open-team-add]").forEach((button) => {
    button.addEventListener("click", () => {
      teamAddPanelOpen = true;
      teamAddMode = null;
      teamAddSelectedPokemon = null;
      teamAddAttackMode = null;
      teamAddSlotIndex = Number(button.dataset.slotIndex);
      renderAll();
      el.compositionAddPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  el.compositionList.querySelectorAll("[data-add-reserve-pokemon]").forEach((button) => {
    button.addEventListener("click", () => addPokemonToTeamReserve(button.dataset.addReservePokemon));
  });

  el.compositionList.querySelector("[data-add-selected-reserve]")?.addEventListener("click", () => {
    const selectedId = el.compositionList.querySelector("#reserve-pokemon-select")?.value;
    if (selectedId) addPokemonToTeamReserve(selectedId);
  });

  el.compositionList.querySelectorAll("[data-remove-reserve-pokemon]").forEach((button) => {
    button.addEventListener("click", () => removePokemonFromTeamReserve(button.dataset.removeReservePokemon));
  });
}

function renderTeamReserveSection(team) {
  const reserve = getTeamReservePokemon(team);
  const reserveIds = new Set((team.reservePokemonIds || []).map(String));
  const available = state.customPokemon.filter((pokemon) => !reserveIds.has(String(pokemon.id)));
  const section = document.createElement("section");
  section.className = "reserve-section";
  section.innerHTML = `
    <div class="reserve-heading">
      <div>
        <p class="eyebrow">Reserve</p>
        <h3>Options de banc</h3>
      </div>
      <span class="pill">${reserve.length} reserve</span>
    </div>
    <div class="reserve-list ${reserve.length ? "" : "empty"}">
      ${reserve.length
        ? reserve.map((pokemon) => `
          <span class="reserve-chip" style="${pokemonCardStyle(pokemon)}">
            <strong>${escapeHtml(pokemon.name)}</strong>
            <span class="name-type-logos">${pokemon.types.map(typeLogoOnly).join("")}</span>
            <button type="button" data-remove-reserve-pokemon="${escapeHtml(pokemon.id)}" aria-label="Retirer ${escapeHtml(pokemon.name)} de la reserve">&times;</button>
          </span>
        `).join("")
        : `<span class="slot-meta">Aucun Pokemon en reserve.</span>`}
    </div>
    <div class="reserve-add-row">
      ${available.length
        ? `
          <label class="field">
            <span>Ajouter depuis la bibliotheque</span>
            <select id="reserve-pokemon-select">
              ${available.map((pokemon) => `<option value="${escapeHtml(pokemon.id)}">${escapeHtml(pokemonOptionLabel(pokemon))}</option>`).join("")}
            </select>
          </label>
          <button class="small-button" type="button" data-add-selected-reserve>Ajouter</button>
        `
        : `<span class="slot-meta">Bibliotheque vide ou deja entierement en reserve.</span>`}
    </div>
  `;
  el.compositionList.append(section);
}

function addPokemonToTeamReserve(savedId) {
  const team = state.teams[state.selectedSlot];
  if (!team) return;
  team.reservePokemonIds = Array.isArray(team.reservePokemonIds) ? team.reservePokemonIds : [];
  if (!state.customPokemon.some((pokemon) => String(pokemon.id) === String(savedId))) return;
  if (!team.reservePokemonIds.some((id) => String(id) === String(savedId))) team.reservePokemonIds.push(savedId);
  state.teams[state.selectedSlot] = team;
  draftTeam = structuredClone(team);
  saveState();
  renderAll();
}

function removePokemonFromTeamReserve(savedId) {
  const team = state.teams[state.selectedSlot];
  if (!team) return;
  team.reservePokemonIds = (team.reservePokemonIds || []).filter((id) => String(id) !== String(savedId));
  state.teams[state.selectedSlot] = team;
  draftTeam = structuredClone(team);
  saveState();
  renderAll();
}

function syncTeamSettingsInputs(team) {
  if (document.activeElement !== el.compositionTeamName) {
    el.compositionTeamName.value = team.name || "";
  }
  if (document.activeElement !== el.compositionTeamSource) {
    el.compositionTeamSource.value = getTeamPreferredSource(team);
  }
}

function toggleTeamSettings() {
  teamSettingsOpen = !teamSettingsOpen;
  renderAll();
}

function updateCurrentTeamSettings() {
  if (sharedTeam) return;
  draftTeam.name = el.compositionTeamName.value.trim();
  draftTeam.preferredSource = el.compositionTeamSource.value;
  el.teamName.value = draftTeam.name;
  el.addMode.value = draftTeam.preferredSource;
  persistDraftTeam();
  updateModeFields();
  syncAttackChecksFromCurrentSelection();
  renderAll();
}

function persistDraftTeam() {
  draftTeam.updatedAt = new Date().toISOString();
  state.teams[state.selectedSlot] = structuredClone(draftTeam);
  saveState();
}

function renderTeamAddPanel() {
  el.compositionAddPanel.innerHTML = `
    <div class="team-add-heading">
      <div>
        <p class="eyebrow">Ajouter un Pokemon</p>
        <h3>${teamAddMode ? teamAddModeLabel(teamAddMode) : "Choisis une methode"}</h3>
      </div>
      ${teamAddMode ? `<button class="small-button" type="button" data-team-add-back>Retour</button>` : ""}
    </div>
    ${teamAddMode ? renderTeamAddMode() : renderTeamAddChoices()}
  `;
  enhanceTypeSelects(el.compositionAddPanel);
  bindTeamAddPanel();
}

function teamAddModeLabel(mode) {
  if (mode === "library") return "Depuis la bibliotheque";
  if (mode === "list") return `Depuis la liste ${preferredSourceLabel(getTeamPreferredSource(draftTeam))}`;
  return "Creation complete";
}

function renderTeamAddChoices() {
  return `
    <div class="team-add-choice-grid">
      <button class="team-add-choice" type="button" data-team-add-mode="library">
        <strong>Bibliotheque</strong>
        <span>Ajouter directement un Pokemon sauvegarde.</span>
      </button>
      <button class="team-add-choice" type="button" data-team-add-mode="list">
        <strong>Liste Pokemon</strong>
        <span>Rechercher, filtrer par type, puis choisir les attaques.</span>
      </button>
      <button class="team-add-choice" type="button" data-team-add-mode="custom">
        <strong>Creer un Pokemon</strong>
        <span>Nom, sprite optionnel, types defensifs et attaques.</span>
      </button>
    </div>
  `;
}

function renderTeamAddMode() {
  if (teamAddMode === "library") return renderTeamAddLibrary();
  if (teamAddMode === "list") return renderTeamAddList();
  return renderTeamAddCustom();
}

function renderTeamAddLibrary() {
  if (!state.customPokemon.length) return `<div class="empty-state">Aucun Pokemon sauvegarde pour l'instant.</div>`;
  if (needsSpriteSync(state.customPokemon)) {
    void syncPokemonSprites(state.customPokemon).then(() => {
      if (state.activeView === "composition" && teamAddPanelOpen && teamAddMode === "library") renderTeamAddPanel();
    });
  }
  return `
    <div class="team-add-mini-grid">
      ${state.customPokemon.map((pokemon) => renderTeamAddMiniCard(pokemon, "saved")).join("")}
    </div>
  `;
}

function renderTeamAddMiniCard(pokemon, source) {
  return `
    <button class="team-add-mini-card" type="button" data-team-add-pokemon="${escapeHtml(pokemonOptionLabel(pokemon))}" data-team-add-source="${source}">
      <span class="team-add-mini-sprite">${renderPokemonSprite(pokemon) || `<span>${escapeHtml(pokemon.name.slice(0, 1))}</span>`}</span>
      <strong>${escapeHtml(pokemon.name)}</strong>
      <span class="team-add-type-icons" aria-label="Types defensifs">${pokemon.types.map(typeLogoOnly).join("")}</span>
    </button>
  `;
}

function renderTeamAddList() {
  if (teamAddSelectedPokemon) return renderTeamAddAttackChoice(teamAddSelectedPokemon);

  const source = getTeamPreferredSource(draftTeam);
  const pokemonList = getTeamAddSourcePokemon(source);
  const query = normalize(teamAddListFilters.query);
  const typeOne = teamAddListFilters.typeOne;
  const typeTwo = teamAddListFilters.typeTwo;
  const canShowResults = query.length >= 3 || Boolean(typeOne);
  const matches = canShowResults
    ? pokemonList.filter((pokemon) => (
        (!query || normalize(pokemon.name).includes(query))
        && (!typeOne || pokemon.types.includes(typeOne))
        && (!typeTwo || pokemon.types.includes(typeTwo))
      ))
    : [];
  const selected = teamAddSelectedPokemon;
  if (matches.length && needsSpriteSync(matches)) {
    void syncPokemonSprites(matches).then(() => {
      if (state.activeView === "composition" && teamAddPanelOpen && teamAddMode === "list") renderTeamAddPanel();
    });
  }
  return `
    <div class="team-add-filters">
      <label class="field">
        <span>Recherche par nom</span>
        <input id="team-add-search" type="search" placeholder="Nom du Pokemon" value="${escapeHtml(teamAddListFilters.query)}">
      </label>
      <label class="field">
        <span>Filtre type 1</span>
        <select id="team-add-filter-one">${typeOptions(typeOne, true)}</select>
      </label>
      <label class="field">
        <span>Filtre type 2</span>
        <select id="team-add-filter-two">${typeOptions(typeTwo, true)}</select>
      </label>
    </div>
    <div class="team-add-mini-grid">
      ${canShowResults
        ? matches.map((pokemon) => renderTeamAddMiniCard(pokemon, source)).join("") || `<div class="empty-state">Aucun Pokemon ne correspond aux filtres.</div>`
        : `<div class="empty-state">Tape au moins 3 lettres ou choisis un premier type pour afficher les Pokemon.</div>`}
    </div>
    ${selected ? renderTeamAddAttackChoice(selected) : ""}
  `;
}

function renderTeamAddAttackChoice(pokemon) {
  return `
    <div class="team-add-attack-panel">
      <div class="team-add-selected-summary">
        <span class="team-add-mini-sprite">${renderPokemonSprite(pokemon) || `<span>${escapeHtml(pokemon.name.slice(0, 1))}</span>`}</span>
        <div>
          <p class="eyebrow">Pokemon choisi</p>
          <h4>${escapeHtml(pokemon.name)}</h4>
          <span class="team-add-type-icons" aria-label="Types defensifs">${pokemon.types.map(typeLogoOnly).join("")}</span>
        </div>
        <button class="small-button" type="button" data-team-add-change-pokemon>Changer de Pokemon</button>
      </div>
      <div class="team-add-attack-choice">
        <button class="team-add-choice compact" type="button" data-team-add-use-defensive>
          <strong>Types defensifs</strong>
        </button>
        <button class="team-add-choice compact ${teamAddAttackMode === "custom" ? "active" : ""}" type="button" data-team-add-custom-attacks>
          <strong>Personnaliser</strong>
        </button>
      </div>
      ${teamAddAttackMode === "custom" ? `
        <div class="team-add-attack-slots">
          ${[0, 1, 2, 3].map((index) => `
            <label class="field">
              <span>Attaque ${index + 1}</span>
              <select class="team-add-attack-select">${typeOptions("", true)}</select>
            </label>
          `).join("")}
        </div>
        <button class="primary-button" type="button" data-team-add-confirm-list>Ajouter avec ces attaques</button>
      ` : ""}
    </div>
  `;
}

function renderTeamAddCustom() {
  const allPokemon = [...KANTO_POKEMON, ...KANTO_REFORGED_POKEMON];
  return `
    <div class="team-add-custom-grid">
      <label class="field">
        <span>Nom</span>
        <input id="team-add-custom-name" type="text" maxlength="32" placeholder="Nom du Pokemon">
      </label>
      <label class="field">
        <span>Sprite optionnel</span>
        <input id="team-add-custom-sprite" list="team-add-custom-sprites" type="search" placeholder="Nom du sprite">
        <datalist id="team-add-custom-sprites">
          ${allPokemon.map((pokemon) => `<option value="${escapeHtml(pokemon.name)}"></option>`).join("")}
        </datalist>
      </label>
      <label class="field">
        <span>Type defensif 1</span>
        <select id="team-add-custom-type-one">${typeOptions("", false)}</select>
      </label>
      <label class="field">
        <span>Type defensif 2</span>
        <select id="team-add-custom-type-two">${typeOptions("", true)}</select>
      </label>
    </div>
    <div class="team-add-attack-slots">
      ${[0, 1, 2, 3].map((index) => `
        <label class="field">
          <span>Attaque ${index + 1}</span>
          <select class="team-add-custom-attack">${typeOptions("", true)}</select>
        </label>
      `).join("")}
    </div>
    <button class="primary-button" type="button" data-team-add-confirm-custom>Creer et ajouter</button>
  `;
}

function bindTeamAddPanel() {
  el.compositionAddPanel.querySelector("[data-team-add-back]")?.addEventListener("click", () => {
    teamAddMode = null;
    teamAddSelectedPokemon = null;
    teamAddAttackMode = null;
    teamAddListFilters = { query: "", typeOne: "", typeTwo: "" };
    renderAll();
  });
  el.compositionAddPanel.querySelectorAll("[data-team-add-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      teamAddMode = button.dataset.teamAddMode;
      teamAddSelectedPokemon = null;
      teamAddAttackMode = null;
      teamAddListFilters = { query: "", typeOne: "", typeTwo: "" };
      renderAll();
    });
  });
  el.compositionAddPanel.querySelectorAll("#team-add-search, #team-add-filter-one, #team-add-filter-two").forEach((field) => {
    field.addEventListener("input", updateTeamAddListFilters);
    field.addEventListener("change", updateTeamAddListFilters);
  });
  el.compositionAddPanel.querySelectorAll("[data-team-add-pokemon]").forEach((button) => {
    button.addEventListener("click", () => handleTeamAddPokemonClick(button));
  });
  el.compositionAddPanel.querySelector("[data-team-add-change-pokemon]")?.addEventListener("click", () => {
    teamAddSelectedPokemon = null;
    renderAll();
  });
  el.compositionAddPanel.querySelector("[data-team-add-use-defensive]")?.addEventListener("click", () => {
    if (teamAddSelectedPokemon) addPokemonToManagedTeam(teamAddSelectedPokemon, teamAddSelectedPokemon.types, getTeamPreferredSource(draftTeam));
  });
  el.compositionAddPanel.querySelector("[data-team-add-custom-attacks]")?.addEventListener("click", () => {
    teamAddAttackMode = "custom";
    renderAll();
  });
  el.compositionAddPanel.querySelector("[data-team-add-confirm-list]")?.addEventListener("click", () => {
    if (!teamAddSelectedPokemon) return;
    const attacks = getTypeValuesFromSelects(".team-add-attack-select");
    if (!attacks.length) {
      alert("Choisis au moins un type d'attaque.");
      return;
    }
    addPokemonToManagedTeam(teamAddSelectedPokemon, attacks, getTeamPreferredSource(draftTeam));
  });
  el.compositionAddPanel.querySelector("[data-team-add-confirm-custom]")?.addEventListener("click", addCustomPokemonFromManagedForm);
}

function updateTeamAddListFilters() {
  const activeId = document.activeElement?.id || "";
  const cursor = document.activeElement?.selectionStart ?? null;
  teamAddListFilters = {
    query: el.compositionAddPanel.querySelector("#team-add-search")?.value || "",
    typeOne: el.compositionAddPanel.querySelector("#team-add-filter-one")?.value || "",
    typeTwo: el.compositionAddPanel.querySelector("#team-add-filter-two")?.value || ""
  };
  teamAddSelectedPokemon = null;
  teamAddAttackMode = null;
  renderTeamAddPanel();
  if (activeId) {
    const nextActive = el.compositionAddPanel.querySelector(`#${activeId}`);
    nextActive?.focus();
    if (nextActive?.setSelectionRange && cursor !== null) nextActive.setSelectionRange(cursor, cursor);
  }
}

function handleTeamAddPokemonClick(button) {
  const pokemon = findTeamAddPokemon(button.dataset.teamAddSource, button.dataset.teamAddPokemon);
  if (!pokemon) return;
  if (teamAddMode === "library") {
    addPokemonToManagedTeam(pokemon, pokemon.attacks || pokemon.types, "saved");
    return;
  }
  teamAddSelectedPokemon = pokemon;
  teamAddAttackMode = null;
  renderAll();
}

function findTeamAddPokemon(source, label) {
  const list = source === "saved" ? state.customPokemon : getTeamAddSourcePokemon(source);
  return list.find((pokemon) => pokemonOptionLabel(pokemon) === label);
}

function getTeamAddSourcePokemon(source) {
  return source === "reforged" ? KANTO_REFORGED_POKEMON : KANTO_POKEMON;
}

function needsSpriteSync(pokemonList) {
  return pokemonList.some((pokemon) => {
    const id = getPokemonNationalId(pokemon);
    return id && !spriteUrls.has(id);
  });
}

function getTypeValuesFromSelects(selector) {
  return Array.from(el.compositionAddPanel.querySelectorAll(selector))
    .map((select) => select.value)
    .filter(Boolean)
    .filter((type, index, all) => all.indexOf(type) === index)
    .slice(0, 4);
}

function addCustomPokemonFromManagedForm() {
  const name = el.compositionAddPanel.querySelector("#team-add-custom-name").value.trim();
  const typeOne = el.compositionAddPanel.querySelector("#team-add-custom-type-one").value;
  const typeTwo = el.compositionAddPanel.querySelector("#team-add-custom-type-two").value;
  if (!name) {
    alert("Donne un nom au Pokemon.");
    return;
  }
  const types = [typeOne, typeTwo].filter(Boolean).filter((type, index, all) => all.indexOf(type) === index);
  const attacks = getTypeValuesFromSelects(".team-add-custom-attack");
  if (!attacks.length) {
    alert("Choisis au moins un type d'attaque.");
    return;
  }
  const spriteName = el.compositionAddPanel.querySelector("#team-add-custom-sprite").value.trim();
  const spriteSource = findSpriteSourcePokemon(spriteName);
  const pokemon = {
    id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    types,
    attacks,
    custom: true,
    origin: "custom",
    nationalId: getPokemonNationalId(spriteSource) || null
  };
  addPokemonToManagedTeam(pokemon, attacks, "custom", true);
}

function findSpriteSourcePokemon(name) {
  if (!name) return null;
  const normalized = normalize(name);
  return [...KANTO_POKEMON, ...KANTO_REFORGED_POKEMON].find((pokemon) => normalize(pokemon.name) === normalized) || null;
}

function addPokemonToManagedTeam(pokemon, attacks, source, forceSave = false) {
  if (draftTeam.pokemon.length >= 6) {
    alert("Une equipe peut contenir au maximum 6 Pokemon.");
    return;
  }
  const cleanAttacks = (attacks?.length ? attacks : pokemon.types).filter(Boolean).slice(0, 4);
  const shouldSave = forceSave || source !== "saved";
  const savedPokemon = shouldSave ? saveManagedPokemonToLibrary(pokemon, cleanAttacks, source) : pokemon;
  const teamMember = {
    instanceId: `member-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceId: savedPokemon?.id ?? pokemon.id,
    name: pokemon.name,
    types: [...pokemon.types],
    attacks: cleanAttacks
  };
  if (Number.isInteger(getPokemonNationalId(savedPokemon || pokemon))) {
    teamMember.nationalId = getPokemonNationalId(savedPokemon || pokemon);
  }
  draftTeam.pokemon.push(teamMember);
  if (!draftTeam.name) draftTeam.name = el.compositionTeamName.value.trim() || `Equipe ${state.selectedSlot + 1}`;
  persistDraftTeam();
  renderSavedCustomOptions();
  teamAddPanelOpen = false;
  teamAddSlotIndex = null;
  teamAddMode = null;
  teamAddSelectedPokemon = null;
  teamAddListFilters = { query: "", typeOne: "", typeTwo: "" };
  renderAll();
  void syncPokemonSprites(savedPokemon || teamMember).then(renderAll);
}

function saveManagedPokemonToLibrary(pokemon, attacks, source) {
  const existing = state.customPokemon.find((item) => (
    normalize(item.name) === normalize(pokemon.name)
    && item.types.join("|") === pokemon.types.join("|")
    && (item.attacks || []).join("|") === attacks.join("|")
  ));
  if (existing) return existing;
  const savedPokemon = {
    ...structuredClone(pokemon),
    id: `saved-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    officialId: source === "official" ? pokemon.id : pokemon.officialId || null,
    reforgedId: source === "reforged" ? pokemon.id : pokemon.reforgedId || null,
    origin: source,
    custom: source === "custom" || pokemon.custom === true,
    attacks
  };
  state.customPokemon.push(savedPokemon);
  return savedPokemon;
}

function savedPokemonOriginLabel(pokemon) {
  if (pokemon.origin === "reforged" || pokemon.reforgedId) return "Reforged";
  if (pokemon.origin === "official" || pokemon.officialId || pokemon.custom === false) return "Kanto";
  return "Personnalise";
}

function renderTypeHelper(selectedTypes = null) {
  const threatTypes = getHelperProfileTypes();
  const mode = getHelperMode();
  const source = el.helperSource.value;
  const requiredType = el.helperTargetBase.value;
  const pokemonList = getHelperPokemonSource(source);
  const responseRows = getHelperResponseRows(threatTypes, pokemonList, mode, requiredType);
  const exactTypes = selectedTypes || helperSelectedTypes || [];
  const filteredPokemon = exactTypes.length ? filterPokemonByTypes(pokemonList, exactTypes) : [];

  el.typeHelperCount.textContent = `${pokemonList.length} Pokemon`;
  renderHelperThreatOptions(pokemonList);
  renderHelperThreatAnalysisState();
  el.helperFilterSummary.innerHTML = renderHelperFilterSummary(mode, threatTypes, requiredType);
  el.helperDefense.innerHTML = renderHelperDefense(threatTypes);
  el.helperOffense.innerHTML = renderHelperOffense(threatTypes);
  el.helperGridTitle.textContent = helperGridTitle(mode, threatTypes, requiredType);
  el.helperMatchupGrid.innerHTML = renderHelperMatchupGrid(responseRows, mode, exactTypes);
  el.helperPokemonHeading.classList.toggle("hidden", !exactTypes.length);
  el.helperResponseJump.classList.toggle("hidden", !exactTypes.length);
  el.helperPokemonTitle.textContent = exactTypes.length
    ? `Pokemon disponibles : ${exactTypes.join(" / ")}`
    : "Pokemon disponibles";
  el.helperPokemonList.innerHTML = exactTypes.length ? renderHelperPokemonList(filteredPokemon, exactTypes) : "";
  bindTypeHelperGrid(pokemonList);
  bindTypeHelperPokemonActions();
}

function resetHelperResultSelection() {
  helperOpenGroup = null;
  helperSelectedTypes = null;
}

function renderHelperThreatAnalysisState() {
  el.helperThreatAnalysisToggle.setAttribute("aria-expanded", String(helperThreatAnalysisOpen));
  el.helperThreatAnalysisToggle.textContent = helperThreatAnalysisOpen ? "Masquer l'analyse" : "Analyse de la menace";
  el.helperThreatAnalysis.classList.toggle("hidden", !helperThreatAnalysisOpen);
}

function renderHelperFilterSummary(mode, threatTypes, requiredType) {
  const modeLabel = mode === "defense" ? "Je veux me defendre contre" : "Je veux attaquer efficacement";
  const target = threatTypes.map(typeLogoOnly).join("");
  const required = requiredType
    ? `<span class="slot-meta">avec</span>${typeLogoOnly(requiredType)}`
    : `<span class="slot-meta">reponse libre</span>`;
  return `
    <span class="helper-summary-intent">${modeLabel}</span>
    <span class="team-add-type-icons">${target}</span>
    <span class="helper-summary-required">${required}</span>
  `;
}

function getHelperMode() {
  return el.helperMode.find((field) => field.checked)?.value || "attack";
}

function renderHelperThreatOptions(pokemonList) {
  const threatTypes = getHelperProfileTypes();
  const options = getHelperThreatPokemonOptions(pokemonList, threatTypes);
  el.helperThreatPokemon.placeholder = threatTypes.length
    ? `Pokemon ${threatTypes.join(" / ")}`
    : "Ex: Florizarre";
  el.helperThreatOptions.innerHTML = options
    .map((pokemon) => `<option value="${escapeHtml(pokemonOptionLabel(pokemon))}"></option>`)
    .join("");
}

function getHelperThreatPokemonOptions(pokemonList, threatTypes) {
  if (!threatTypes.length) return pokemonList;
  return pokemonList.filter((pokemon) => threatTypes.every((type) => pokemon.types.includes(type)));
}

function toggleHelperThreatSearch() {
  el.helperThreatSearchField.classList.toggle("hidden");
  if (!el.helperThreatSearchField.classList.contains("hidden")) {
    el.helperThreatPokemon.focus();
  }
}

function applyHelperThreatPokemon() {
  const value = normalize(el.helperThreatPokemon.value);
  if (!value) return;
  const threatTypes = getHelperProfileTypes();
  const pokemonList = getHelperPokemonSource(el.helperSource.value);
  const options = getHelperThreatPokemonOptions(pokemonList, threatTypes);
  const pokemon = options.find((item) => (
    normalize(pokemonOptionLabel(item)) === value || normalize(item.name) === value
  ));
  if (!pokemon) return;
  if (!threatTypes.length) {
    el.helperTypeOne.value = pokemon.types[0] || "";
    el.helperTypeTwo.value = pokemon.types[1] || "";
    syncTypeWheels(el.typeHelperPanel);
  }
  resetHelperResultSelection();
  renderTypeHelper();
}

function getHelperProfileTypes() {
  return [el.helperTypeOne.value, el.helperTypeTwo.value]
    .filter(Boolean)
    .filter((type, index, all) => all.indexOf(type) === index);
}

function renderHelperDefense(types) {
  const rows = analyzePokemonDefense(types);
  const weak = rows.filter((item) => item.multiplier > 1);
  const resist = rows.filter((item) => item.multiplier > 0 && item.multiplier < 1);
  const immune = rows.filter((item) => item.multiplier === 0);
  return `
    <div class="helper-summary-row"><span class="slot-meta">Faible face a</span>${renderMultiplierList(weak)}</div>
    <div class="helper-summary-row"><span class="slot-meta">Resiste a</span>${renderMultiplierList(resist)}</div>
    <div class="helper-summary-row"><span class="slot-meta">Ignore</span>${renderMultiplierList(immune)}</div>
  `;
}

function renderHelperOffense(types) {
  const rows = KANTO_TYPES
    .map((defenderType) => ({
      type: defenderType,
      multiplier: Math.max(...types.map((attackType) => getEffectiveness(attackType, defenderType)))
    }))
    .filter((item) => item.multiplier !== 1)
    .sort((a, b) => b.multiplier - a.multiplier || KANTO_TYPES.indexOf(a.type) - KANTO_TYPES.indexOf(b.type));
  const strong = rows.filter((item) => item.multiplier > 1);
  const poor = rows.filter((item) => item.multiplier < 1);
  return `
    <div class="helper-summary-row"><span class="slot-meta">Fort contre</span>${renderMultiplierList(strong)}</div>
    <div class="helper-summary-row"><span class="slot-meta">Faible contre</span>${renderMultiplierList(poor)}</div>
  `;
}

function getHelperResponseRows(threatTypes, pokemonList, mode, requiredType) {
  const combos = getAllTypeCombos()
    .filter((types) => !requiredType || types.includes(requiredType));

  return combos.map((types) => {
    const multiplier = mode === "defense"
      ? Math.max(...threatTypes.map((attackType) => getTypeComboDefenseMultiplier(attackType, types)))
      : Math.max(...types.map((attackType) => getTypeComboAttackMultiplier(attackType, threatTypes)));
    return {
      types,
      multiplier,
      matches: filterPokemonByTypes(pokemonList, types).length
    };
  }).filter((row) => row.matches > 0).sort((a, b) => compareTypeCombos(a.types, b.types));
}

function compareTypeCombos(left, right) {
  const first = KANTO_TYPES.indexOf(left[0]) - KANTO_TYPES.indexOf(right[0]);
  if (first) return first;
  const leftSecond = left[1] ? KANTO_TYPES.indexOf(left[1]) : -1;
  const rightSecond = right[1] ? KANTO_TYPES.indexOf(right[1]) : -1;
  return leftSecond - rightSecond;
}

function getAllTypeCombos() {
  const combos = KANTO_TYPES.map((type) => [type]);
  KANTO_TYPES.forEach((type, index) => {
    KANTO_TYPES.slice(index + 1).forEach((secondType) => combos.push([type, secondType]));
  });
  return combos;
}

function getTypeComboAttackMultiplier(attackType, defenderTypes) {
  return defenderTypes.reduce((value, defenderType) => value * getEffectiveness(attackType, defenderType), 1);
}

function getTypeComboDefenseMultiplier(attackType, defenderTypes) {
  return defenderTypes.reduce((value, defenderType) => value * getEffectiveness(attackType, defenderType), 1);
}

function helperMultiplierSortValue(multiplier, mode) {
  if (mode === "defense") return multiplier;
  if (multiplier === 0) return 999;
  return -multiplier;
}

function helperGridTitle(mode, threatTypes, requiredType) {
  const target = threatTypes.join(" / ");
  const suffix = requiredType ? ` avec ${requiredType}` : "";
  return mode === "defense"
    ? `Reponses defensives contre ${target}${suffix}`
    : `Reponses offensives contre ${target}${suffix}`;
}

function renderHelperMatchupGrid(rows, mode, selectedTypes) {
  if (!rows.length) {
    return `<div class="empty-state">Aucune association ne correspond a cette source et a ce filtre.</div>`;
  }
  if (selectedTypes.length) {
    const selectedRow = rows.find((row) => typesMatch(row.types, selectedTypes));
    return `
      <section class="type-helper-selected-result" data-helper-selected-result>
        <div class="type-helper-subheading compact">
          <h4>Reponse selectionnee</h4>
          <button class="small-button" type="button" data-helper-clear-selection>Changer</button>
        </div>
        ${selectedRow ? renderHelperRow(selectedRow, mode, selectedTypes) : ""}
      </section>
    `;
  }
  const groups = groupHelperRows(rows, mode);
  return groups.map((group) => `
    <section class="type-helper-group">
      <button class="type-helper-group-heading ${helperOpenGroup === group.key ? "active" : ""}" type="button" data-helper-group="${group.key}" aria-expanded="${helperOpenGroup === group.key}">
        <span>${group.label}</span>
        <span class="slot-meta">${group.rows.length} associations</span>
      </button>
      <div class="type-helper-group-list ${helperOpenGroup === group.key ? "" : "hidden"}">
        ${group.rows.map((row) => renderHelperRow(row, mode, selectedTypes)).join("")}
      </div>
    </section>
  `).join("");
}

function groupHelperRows(rows, mode) {
  const groupDefs = mode === "defense"
    ? [
      { key: "immune", label: "Immunise", test: (value) => value === 0 },
      { key: "resist", label: "Resiste", test: (value) => value > 0 && value < 1 },
      { key: "neutral", label: "Neutre", test: (value) => value === 1 },
      { key: "weak", label: "Fragile", test: (value) => value > 1 }
    ]
    : [
      { key: "strong", label: "Efficace", test: (value) => value > 1 },
      { key: "neutral", label: "Neutre", test: (value) => value === 1 },
      { key: "poor", label: "Peu efficace", test: (value) => value > 0 && value < 1 },
      { key: "useless", label: "Inutile", test: (value) => value === 0 }
    ];

  return groupDefs
    .map((group) => ({
      ...group,
      rows: rows.filter((row) => group.test(row.multiplier))
    }))
    .filter((group) => group.rows.length);
}

function renderHelperRow(row, mode, selectedTypes) {
  const kind = helperMultiplierKind(row.multiplier, mode);
  const label = mode === "defense"
    ? helperDefenseResultLabel(row.multiplier)
    : formatMultiplierLabel(row.multiplier);
  const active = typesMatch(row.types, selectedTypes) ? " active" : "";
  return `
    <button class="type-helper-row${active}" type="button" data-helper-types="${row.types.join("|")}">
      <span class="team-add-type-icons">${row.types.map(typeLogoOnly).join("")}</span>
      <span class="multiplier ${kind}">${label}</span>
      <span class="slot-meta">${row.matches} Pokemon</span>
    </button>
  `;
}

function helperMultiplierKind(multiplier, mode) {
  if (mode === "defense") {
    if (multiplier === 0) return "helper-good";
    if (multiplier < 1) return "helper-good";
    if (multiplier > 1) return "helper-bad";
    return "helper-neutral";
  }
  if (multiplier === 0) return "helper-bad";
  if (multiplier > 1) return "helper-good";
  if (multiplier < 1) return "helper-bad";
  return "helper-neutral";
}

function helperDefenseResultLabel(multiplier) {
  if (multiplier === 0) return "immunise";
  return `recoit x${formatMultiplier(multiplier)}`;
}

function typesMatch(left, right) {
  if (!left?.length || !right?.length) return false;
  return [...left].sort().join("|") === [...right].sort().join("|");
}

function scrollToHelperAnchor(target) {
  if (!target || target.classList.contains("hidden")) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  target.classList.add("helper-scroll-focus");
  window.setTimeout(() => target.classList.remove("helper-scroll-focus"), 900);
}

function bindTypeHelperGrid(pokemonList) {
  el.helperMatchupGrid.querySelector("[data-helper-selected-result]")?.addEventListener("click", (event) => {
    if (event.target.closest("[data-helper-clear-selection]")) return;
    scrollToHelperAnchor(el.helperPokemonHeading);
  });

  el.helperMatchupGrid.querySelector("[data-helper-clear-selection]")?.addEventListener("click", () => {
    helperSelectedTypes = null;
    renderTypeHelper();
  });

  el.helperMatchupGrid.querySelectorAll("[data-helper-group]").forEach((button) => {
    button.addEventListener("click", () => {
      helperOpenGroup = helperOpenGroup === button.dataset.helperGroup ? null : button.dataset.helperGroup;
      helperSelectedTypes = null;
      renderTypeHelper();
    });
  });

  el.helperMatchupGrid.querySelectorAll("[data-helper-types]").forEach((button) => {
    button.addEventListener("click", () => {
      const types = button.dataset.helperTypes.split("|").filter(Boolean);
      if (typesMatch(helperSelectedTypes, types)) {
        scrollToHelperAnchor(el.helperPokemonHeading);
        return;
      }
      helperSelectedTypes = types;
      const filtered = filterPokemonByTypes(pokemonList, types);
      renderTypeHelper(types);
      if (needsSpriteSync(filtered)) {
        void syncPokemonSprites(filtered).then(() => {
          if (state.activeView === "typeHelper" && typesMatch(helperSelectedTypes, types)) renderTypeHelper(types);
        });
      }
    });
  });
}

function getHelperPokemonSource(source) {
  const official = KANTO_POKEMON.map((pokemon) => ({ ...pokemon, helperSource: "official" }));
  const reforged = KANTO_REFORGED_POKEMON.map((pokemon) => ({ ...pokemon, helperSource: "reforged" }));
  const saved = state.customPokemon.map((pokemon) => ({ ...pokemon, helperSource: "saved" }));
  if (source === "official") return official;
  if (source === "reforged") return reforged;
  if (source === "saved") return saved;
  return [...official, ...reforged, ...saved];
}

function filterPokemonByTypes(pokemonList, types) {
  const expected = [...types].sort().join("|");
  return pokemonList.filter((pokemon) => [...pokemon.types].sort().join("|") === expected);
}

function renderHelperPokemonList(pokemonList, types) {
  if (!types.length) {
    return `<div class="empty-state">Aucune reponse disponible avec cette source et ce filtre.</div>`;
  }
  if (!pokemonList.length) {
    return `<div class="empty-state">Aucun Pokemon ${types.join(" / ")} dans cette source.</div>`;
  }

  return pokemonList.map((pokemon, index) => `
    <article class="pokemon-card helper-pokemon-card collapsible" style="${pokemonCardStyle(pokemon)}">
      ${renderPokemonCard({
        ...pokemon,
        attacks: pokemon.attacks || pokemon.types
      }, {
        index,
        showSprite: true,
        includePokeball: false,
        originLabel: helperSourceLabel(pokemon.helperSource),
        toggleable: true
      })}
      <div class="helper-card-actions">
        <button class="small-button" type="button" data-save-helper-pokemon="${escapeHtml(pokemonOptionLabel(pokemon))}" data-helper-source="${pokemon.helperSource}">Ajouter aux sauvegardes</button>
      </div>
    </article>
  `).join("");
}

function isReforgedGuidePokemon(pokemon) {
  return pokemon.helperSource === "reforged" || pokemon.origin === "reforged" || Boolean(pokemon.reforgedId);
}

function getReforgedGuideInfo(name) {
  if (typeof KANTO_REFORGED_GUIDE === "undefined") return null;
  return KANTO_REFORGED_GUIDE[normalize(name)] || null;
}

function helperSourceLabel(source) {
  if (source === "reforged") return "Reforged";
  if (source === "saved") return "Sauvegarde";
  return "Kanto";
}

function bindTypeHelperPokemonActions() {
  bindPokemonCardToggles(el.helperPokemonList);
  el.helperPokemonList.querySelectorAll("[data-save-helper-pokemon]").forEach((button) => {
    button.addEventListener("click", () => {
      const pokemon = findHelperPokemon(button.dataset.helperSource, button.dataset.saveHelperPokemon);
      if (!pokemon) return;
      const added = saveHelperPokemon(pokemon, button.dataset.helperSource);
      setTemporaryButtonText(button, added ? "Ajoute" : "Deja present");
    });
  });
}

function findHelperPokemon(source, label) {
  return getHelperPokemonSource(source).find((pokemon) => pokemonOptionLabel(pokemon) === label);
}

function saveHelperPokemon(pokemon, source) {
  const attacks = pokemon.attacks?.length ? pokemon.attacks : pokemon.types;
  const exists = state.customPokemon.some((item) => (
    normalize(item.name) === normalize(pokemon.name)
    && item.types.join("|") === pokemon.types.join("|")
    && (item.attacks || []).join("|") === attacks.join("|")
  ));
  if (exists) return false;

  const savedPokemon = {
    ...structuredClone(pokemon),
    id: `saved-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    officialId: source === "official" ? pokemon.id : null,
    reforgedId: source === "reforged" ? pokemon.id : null,
    origin: source,
    custom: source === "saved" ? pokemon.custom : false,
    attacks
  };
  delete savedPokemon.helperSource;
  state.customPokemon.push(savedPokemon);
  saveState();
  renderSavedCustomOptions();
  void syncPokemonSprites(pokemon);
  return true;
}

function renderPokemonSearch() {
  const query = normalize(pokemonSearchFilters.query);
  const typeOne = pokemonSearchFilters.typeOne;
  const typeTwo = pokemonSearchFilters.typeTwo;
  const canShowResults = query.length >= 3 || Boolean(typeOne);
  el.pokemonSearchSource.value = pokemonSearchFilters.source;
  el.pokemonSearchQuery.value = pokemonSearchFilters.query;
  el.pokemonSearchTypeOne.value = typeOne;
  el.pokemonSearchTypeTwo.value = typeTwo;

  if (!canShowResults) {
    el.pokemonSearchCount.textContent = "0 resultat";
    el.pokemonSearchResults.innerHTML = `<div class="empty-state">Tape au moins 3 lettres ou choisis un premier type pour afficher les Pokemon.</div>`;
    return;
  }

  const matches = getHelperPokemonSource(pokemonSearchFilters.source)
    .filter((pokemon) => (
      (!query || normalize(pokemon.name).includes(query))
      && (!typeOne || pokemon.types.includes(typeOne))
      && (!typeTwo || pokemon.types.includes(typeTwo))
    ))
    .slice(0, 36);
  el.pokemonSearchCount.textContent = `${matches.length} resultat${matches.length > 1 ? "s" : ""}`;

  if (matches.length && needsSpriteSync(matches)) {
    void syncPokemonSprites(matches).then(() => {
      if (state.activeView === "pokemonSearch") renderPokemonSearch();
    });
  }

  if (!matches.length) {
    el.pokemonSearchResults.innerHTML = `<div class="empty-state">Aucun Pokemon ne correspond a cette recherche.</div>`;
    return;
  }

  el.pokemonSearchResults.innerHTML = matches.map((pokemon, index) => `
    <article class="pokemon-card pokemon-search-card collapsible" style="${pokemonCardStyle(pokemon)}">
      ${renderPokemonCard({
        ...pokemon,
        attacks: pokemon.attacks || pokemon.types
      }, {
        index,
        showSprite: true,
        includePokeball: false,
        originLabel: helperSourceLabel(pokemon.helperSource),
        toggleable: true
      })}
      <div class="helper-card-actions">
        <button class="small-button" type="button" data-save-search-pokemon="${escapeHtml(pokemonOptionLabel(pokemon))}" data-search-source="${pokemon.helperSource}">Ajouter aux sauvegardes</button>
      </div>
    </article>
  `).join("");

  bindPokemonCardToggles(el.pokemonSearchResults);
  el.pokemonSearchResults.querySelectorAll("[data-save-search-pokemon]").forEach((button) => {
    button.addEventListener("click", () => {
      const pokemon = findHelperPokemon(button.dataset.searchSource, button.dataset.saveSearchPokemon);
      if (!pokemon) return;
      const added = saveHelperPokemon(pokemon, button.dataset.searchSource);
      setTemporaryButtonText(button, added ? "Ajoute" : "Deja present");
      renderSavedCustomOptions();
    });
  });
}

function renderSavedPokemonManager() {
  el.savedPokemonList.innerHTML = "";
  el.savedPokemonEditPanel.classList.add("hidden");
  el.savedPokemonEditPanel.innerHTML = "";

  if (!state.customPokemon.length) {
    el.savedPokemonList.innerHTML = `<div class="empty-state">Aucun Pokemon sauvegarde pour le moment.</div>`;
    return;
  }

  state.customPokemon.forEach((pokemon, index) => {
    const card = document.createElement("article");
    card.className = "pokemon-card collapsible";
    card.setAttribute("style", pokemonCardStyle(pokemon));
    card.innerHTML = renderPokemonCard(pokemon, {
      index,
      showSprite: true,
      originLabel: savedPokemonOriginLabel(pokemon),
      savedId: pokemon.id
    });
    el.savedPokemonList.append(card);
  });
  bindPokemonCardToggles(el.savedPokemonList);

  el.savedPokemonList.querySelectorAll("[data-edit-saved-pokemon]").forEach((button) => {
    button.addEventListener("click", () => {
      const pokemon = state.customPokemon.find((item) => String(item.id) === String(button.dataset.editSavedPokemon));
      if (pokemon) openPokemonEditModal(pokemon, { mode: "linked", sourceId: pokemon.id });
    });
  });

  el.savedPokemonList.querySelectorAll("[data-delete-saved-pokemon]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!confirm("Supprimer ce Pokemon de la bibliotheque ? Les equipes existantes ne seront pas modifiees.")) return;
      state.customPokemon = state.customPokemon.filter((pokemon) => String(pokemon.id) !== String(button.dataset.deleteSavedPokemon));
      saveState();
      renderAll();
    });
  });
}

function removePokemonFromCurrentTeam(instanceId) {
  const team = state.teams[state.selectedSlot];
  if (!team) return;
  team.pokemon = team.pokemon.filter((pokemon) => pokemon.instanceId !== instanceId);
  state.teams[state.selectedSlot] = team;
  draftTeam = structuredClone(team);
  saveState();
  renderAll();
}

function renderSharedTeamsManager() {
  el.sharedTeamsCount.textContent = `${state.sharedTeams.length}/3`;
  el.sharedTeamsList.innerHTML = "";

  if (!state.sharedTeams.length) {
    el.sharedTeamsList.innerHTML = `<div class="empty-state">Aucune equipe partagee sauvegardee.</div>`;
    return;
  }

  state.sharedTeams.forEach((team, index) => {
    const card = document.createElement("article");
    card.className = "shared-team-card";
    card.innerHTML = `
      <div class="shared-team-header">
        <div class="shared-team-title">
          <img src="assets/partage.png" alt="" aria-hidden="true" onerror="this.style.display='none'">
          <div>
          <p class="eyebrow">Liste ${index + 1}</p>
          <h3>${escapeHtml(team.savedName || team.name)}</h3>
          <span class="slot-meta">${team.pokemon.length}/6 Pokemon · ${preferredSourceLabel(getTeamPreferredSource(team))}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="small-button" type="button" data-load-shared-versus="${escapeHtml(team.id)}">Charger en versus</button>
          <button class="small-button" type="button" data-rename-shared="${escapeHtml(team.id)}">Renommer</button>
          ${sharedTeam ? `<button class="small-button" type="button" data-replace-shared="${escapeHtml(team.id)}">Remplacer</button>` : ""}
          <button class="small-button danger" type="button" data-delete-shared="${escapeHtml(team.id)}">Supprimer</button>
        </div>
      </div>
      <div class="shared-team-pokemon">
        ${team.pokemon.map((pokemon) => `
          <span class="shared-team-chip">${escapeHtml(pokemon.name)} <span class="name-type-logos">${pokemon.types.map(typeLogoOnly).join("")}</span></span>
        `).join("")}
      </div>
    `;
    el.sharedTeamsList.append(card);
  });

  el.sharedTeamsList.querySelectorAll("[data-load-shared-versus]").forEach((button) => {
    button.addEventListener("click", () => {
      const team = state.sharedTeams.find((item) => String(item.id) === String(button.dataset.loadSharedVersus));
      if (!team) return;
      simulationDraft.enemies = team.pokemon.map((pokemon) => ({
        name: pokemon.name,
        types: [...pokemon.types],
        attacks: [...(pokemon.attacks || [])],
        nationalId: getPokemonNationalId(pokemon) || null
      })).slice(0, 6);
      simulationDraft.editingIndex = null;
      simulationDraft.showResults = false;
      sharedTeam = null;
      state.activeView = "simulation";
      saveState();
      renderAll();
    });
  });

  el.sharedTeamsList.querySelectorAll("[data-rename-shared]").forEach((button) => {
    button.addEventListener("click", () => renameSharedTeam(button.dataset.renameShared));
  });
  el.sharedTeamsList.querySelectorAll("[data-replace-shared]").forEach((button) => {
    button.addEventListener("click", () => replaceSharedTeam(button.dataset.replaceShared));
  });
  el.sharedTeamsList.querySelectorAll("[data-delete-shared]").forEach((button) => {
    button.addEventListener("click", () => deleteSharedTeam(button.dataset.deleteShared));
  });
}

function saveCurrentSharedTeam() {
  if (!sharedTeam) return;
  if (state.sharedTeams.length >= 3) {
    const choice = prompt(`Tu peux sauvegarder 3 equipes partagees maximum. Indique 1, 2 ou 3 pour remplacer une liste :\n${state.sharedTeams.map((team, index) => `${index + 1}. ${team.savedName || team.name}`).join("\n")}`);
    const index = Number(choice) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= state.sharedTeams.length) return;
    state.sharedTeams[index] = {
      ...createSavedSharedTeam(sharedTeam),
      id: state.sharedTeams[index].id
    };
    saveState();
    alert("Equipe partagee remplacee.");
    renderAll();
    return;
  }
  const saved = createSavedSharedTeam(sharedTeam);
  state.sharedTeams.push(saved);
  saveState();
  alert("Equipe partagee sauvegardee.");
  renderAll();
}

function createSavedSharedTeam(team) {
  return {
    ...structuredClone(team),
    id: `shared-saved-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    savedName: team.name || "Equipe partagee",
    savedAt: new Date().toISOString(),
    shared: true
  };
}

function renameSharedTeam(id) {
  const team = state.sharedTeams.find((item) => String(item.id) === String(id));
  if (!team) return;
  const name = prompt("Nouveau nom de cette liste partagee :", team.savedName || team.name);
  if (!name?.trim()) return;
  team.savedName = name.trim().slice(0, 32);
  saveState();
  renderAll();
}

function replaceSharedTeam(id) {
  if (!sharedTeam) return;
  const index = state.sharedTeams.findIndex((item) => String(item.id) === String(id));
  if (index < 0) return;
  if (!confirm("Remplacer cette liste partagee par l'equipe partagee ouverte ?")) return;
  state.sharedTeams[index] = {
    ...createSavedSharedTeam(sharedTeam),
    id
  };
  saveState();
  renderAll();
}

function deleteSharedTeam(id) {
  if (!confirm("Supprimer cette equipe partagee sauvegardee ?")) return;
  state.sharedTeams = state.sharedTeams.filter((team) => String(team.id) !== String(id));
  saveState();
  renderAll();
}

function renderSavedPokemonModernEditPanel(pokemon) {
  const panel = el.savedPokemonEditPanel;
  const attacks = pokemon.attacks || [];
  const allPokemon = [...KANTO_POKEMON, ...KANTO_REFORGED_POKEMON];
  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Edition bibliotheque</p>
        <h2>${escapeHtml(pokemon.name)}</h2>
      </div>
      <button class="small-button" type="button" data-cancel-saved-edit>Fermer</button>
    </div>
    <div class="team-add-custom-grid">
      <label class="field">
        <span>Nom</span>
        <input id="saved-edit-name" type="text" maxlength="32" value="${escapeHtml(pokemon.name)}">
      </label>
      <label class="field">
        <span>Sprite optionnel</span>
        <input id="saved-edit-sprite" list="saved-edit-sprites" type="search" placeholder="Nom du sprite">
        <datalist id="saved-edit-sprites">
          ${allPokemon.map((item) => `<option value="${escapeHtml(item.name)}"></option>`).join("")}
        </datalist>
      </label>
      <label class="field">
        <span>Type defensif 1</span>
        <select id="saved-edit-type-one">${typeOptions(pokemon.types[0], false)}</select>
      </label>
      <label class="field">
        <span>Type defensif 2</span>
        <select id="saved-edit-type-two">${typeOptions(pokemon.types[1], true)}</select>
      </label>
    </div>
    <div class="team-add-attack-slots">
      ${[0, 1, 2, 3].map((index) => `
        <label class="field">
          <span>Attaque ${index + 1}</span>
          <select class="saved-edit-attack">${typeOptions(attacks[index] || "", true)}</select>
        </label>
      `).join("")}
    </div>
    <div class="form-actions">
      <button class="primary-button confirm" type="button" data-save-modern-saved-pokemon="${pokemon.id}">Mettre a jour partout</button>
    </div>
  `;
  enhanceTypeSelects(panel);
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  panel.querySelector("[data-cancel-saved-edit]").addEventListener("click", () => {
    panel.classList.add("hidden");
    panel.innerHTML = "";
  });
  panel.querySelector("[data-save-modern-saved-pokemon]").addEventListener("click", () => saveModernSavedPokemonEdit(pokemon.id));
}

function saveModernSavedPokemonEdit(id) {
  const panel = el.savedPokemonEditPanel;
  const name = panel.querySelector("#saved-edit-name").value.trim();
  const typeOne = panel.querySelector("#saved-edit-type-one").value;
  const typeTwo = panel.querySelector("#saved-edit-type-two").value;
  const spriteName = panel.querySelector("#saved-edit-sprite").value.trim();
  const attacks = Array.from(panel.querySelectorAll(".saved-edit-attack"))
    .map((select) => select.value)
    .filter(Boolean)
    .filter((type, index, all) => all.indexOf(type) === index)
    .slice(0, 4);
  if (!name) {
    alert("Donne un nom au Pokemon.");
    return;
  }
  if (!attacks.length) {
    alert("Choisis au moins un type d'attaque.");
    return;
  }
  const types = [typeOne, typeTwo].filter(Boolean).filter((type, index, all) => all.indexOf(type) === index);
  const spriteSource = findSpriteSourcePokemon(spriteName);
  const nationalId = spriteName ? getPokemonNationalId(spriteSource) : undefined;
  updatePokemonEverywhere(id, {
    name,
    types,
    attacks,
    nationalId
  });
  saveState();
  renderAll();
  const updated = state.customPokemon.find((pokemon) => String(pokemon.id) === String(id));
  if (updated) void syncPokemonSprites(updated);
}

function renderPokemonSummary(pokemon, index, removable, editable = false) {
  return renderPokemonCard(pokemon, { index, removable, editable, showSprite: editable });
}

function renderPokemonCard(pokemon, options = {}) {
  const {
    index = null,
    removable = false,
    editable = false,
    showSprite = false,
    originLabel = "",
    savedId = null,
    compact = false,
    includePokeball = true,
    toggleable = true,
    infoLookup = showSprite
  } = options;
  const defensive = analyzePokemonDefense(pokemon.types);
  const weaknesses = defensive.filter((item) => item.multiplier > 1);
  const resistances = defensive.filter((item) => item.multiplier > 0 && item.multiplier < 1);
  const immunities = defensive.filter((item) => item.multiplier === 0);
  const titlePrefix = index === null || index === undefined ? "" : `${index + 1}. `;
  const sourceId = pokemon.instanceId || pokemon.id || pokemon.sourceId || "";
  const attacks = pokemon.attacks || [];
  const sprite = showSprite ? renderPokemonSprite(pokemon) : "";
  const infoButton = renderPokemonInfoButton(pokemon, Boolean(sprite) && infoLookup);
  const actions = [
    savedId ? `<button class="small-button" type="button" data-edit-saved-pokemon="${savedId}">Editer</button>` : "",
    savedId ? `<button class="small-button danger" type="button" data-delete-saved-pokemon="${savedId}">Supprimer</button>` : "",
    editable ? `<button class="small-button" type="button" data-edit-pokemon="${pokemon.instanceId}">Editer</button>` : "",
    editable ? `<button class="small-button danger" type="button" data-remove-from-team="${pokemon.instanceId}">Enlever</button>` : "",
    removable ? `<button class="small-button danger" type="button" data-remove="${pokemon.instanceId}">Retirer</button>` : ""
  ].filter(Boolean).join("");

  const headingContent = `
    <span class="pokemon-heading-with-sprite">
      ${sprite}
      <span class="pokemon-title">
        <span>${titlePrefix}${escapeHtml(pokemon.name)} ${originLabel ? `<span class="library-kind">${originLabel}</span>` : ""}<span class="name-type-logos">${pokemon.types.map(typeLogoOnly).join("")}</span></span>
      </span>
    </span>
    <span class="pokemon-reveal-hint">Details</span>
  `;
  const heading = toggleable
    ? `<button class="pokemon-card-toggle" type="button" data-pokemon-card-toggle="${escapeHtml(sourceId)}" aria-expanded="false">${headingContent}</button>`
    : `<div class="pokemon-card-toggle static">${headingContent}</div>`;

  return `
    ${includePokeball ? `<img class="team-pokeball-icon" src="assets/team-pokeball.svg" alt="" aria-hidden="true">` : ""}
    <div class="pokemon-card-header">
      <div class="pokemon-card-main">
        ${heading}
        ${infoButton}
      </div>
      ${actions ? `<div class="card-actions">${actions}</div>` : ""}
    </div>
    <div class="pokemon-card-body stacked ${compact ? "compact-body" : ""}">
      <div class="mini-line summary-line weakness-line"><span class="slot-meta">Faiblesses</span>${renderMultiplierList(weaknesses)}</div>
      <div class="mini-line summary-line resistance-line"><span class="slot-meta">Resistances</span>${renderMultiplierList(resistances)}</div>
      <div class="mini-line summary-line immunity-line"><span class="slot-meta">Immunites</span>${renderMultiplierList(immunities)}</div>
      <div class="mini-line summary-line attack-line"><span class="slot-meta">Attaques</span>${attacks.length ? attacks.map(typeBadge).join("") : `<span class="multiplier">Aucune</span>`}</div>
    </div>
  `;
}

function bindPokemonCardToggles(container) {
  container.querySelectorAll("[data-pokemon-card-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".pokemon-card");
      if (!card) return;
      const expanded = card.classList.toggle("expanded");
      button.setAttribute("aria-expanded", String(expanded));
    });
  });
  container.querySelectorAll("[data-pokemon-info-name]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      void togglePokemonInfoPanel(button);
    });
  });
}

async function togglePokemonInfoPanel(button) {
  const card = button.closest(".pokemon-card");
  if (!card) return;
  const existing = card.querySelector(".pokemon-info-panel");
  if (existing && !existing.hidden) {
    existing.hidden = true;
    button.setAttribute("aria-expanded", "false");
    return;
  }

  const panel = existing || document.createElement("div");
  if (!existing) {
    panel.className = "pokemon-info-panel";
    const header = card.querySelector(".pokemon-card-header");
    header?.insertAdjacentElement("afterend", panel);
  }

  panel.hidden = false;
  button.setAttribute("aria-expanded", "true");
  panel.innerHTML = `<div class="pokemon-info-loading">Chargement...</div>`;

  try {
    const data = await getPokemonInfoData({
      id: Number(button.dataset.pokemonInfoId) || null,
      name: button.dataset.pokemonInfoName || "",
      reforged: button.dataset.pokemonInfoReforged === "true"
    });
    panel.innerHTML = renderPokemonInfoPanel(data);
  } catch {
    panel.innerHTML = `<div class="pokemon-info-empty">Infos indisponibles pour ce Pokemon.</div>`;
  }
}

async function getPokemonInfoData({ id, name, reforged }) {
  const cacheKey = `${id || normalize(name)}:${reforged ? "reforged" : "standard"}`;
  if (pokemonInfoCache.has(cacheKey)) return pokemonInfoCache.get(cacheKey);

  const guide = reforged ? getReforgedGuideInfo(name) : null;
  let evolution = null;
  if (id && navigator.onLine) {
    try {
      evolution = await getPokemonEvolutionData(id, { reforged });
    } catch {
      evolution = null;
    }
  }
  if (!evolution && guide) evolution = buildLocalReforgedInfo(name, guide);

  const speciesToSync = evolution ? getEvolutionChainItems(evolution.tree)
    .filter((item) => item.id)
    .map((item) => ({ nationalId: item.id, name: item.name })) : [];
  if (speciesToSync.length) await syncPokemonSprites(speciesToSync);

  const data = {
    name,
    reforged,
    evolution
  };
  pokemonInfoCache.set(cacheKey, data);
  return data;
}

function buildLocalReforgedInfo(name, guide) {
  return {
    currentId: null,
    sourceLabel: "Donnees Reforged locales",
    tree: {
      id: null,
      name,
      current: true,
      requirement: "",
      locations: dedupeGuideLabels(guide.locations || []),
      reforgedEvolution: guide.evolution || "",
      children: []
    }
  };
}

async function getPokemonEvolutionData(id, options = {}) {
  const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  if (!speciesResponse.ok) return null;
  const species = await speciesResponse.json();
  const chainUrl = species.evolution_chain?.url;
  if (!chainUrl) return null;

  const chainResponse = await fetch(chainUrl);
  if (!chainResponse.ok) return null;
  const chain = await chainResponse.json();

  return {
    currentId: id,
    sourceLabel: options.reforged ? "Arborescence officielle, annotations Reforged" : "Arborescence officielle",
    tree: buildEvolutionTree(chain.chain, {
      currentId: id,
      reforged: Boolean(options.reforged),
      incomingDetails: []
    })
  };
}

function buildEvolutionTree(node, context) {
  const id = extractSpeciesId(node.species?.url);
  const fallbackName = formatApiName(node.species?.name || "");
  const name = pokemonDisplayNameByNationalId(id, fallbackName);
  const guide = context.reforged ? getReforgedGuideInfo(name) : null;
  return {
    id,
    name,
    current: id === context.currentId,
    requirement: formatEvolutionRequirement(context.incomingDetails),
    locations: guide ? dedupeGuideLabels(guide.locations || []) : [],
    reforgedEvolution: guide?.evolution || "",
    children: (node.evolves_to || []).map((child) => buildEvolutionTree(child, {
      currentId: context.currentId,
      reforged: context.reforged,
      incomingDetails: child.evolution_details || []
    }))
  };
}

function getEvolutionChainItems(tree) {
  if (!tree) return [];
  return [tree, ...tree.children.flatMap(getEvolutionChainItems)];
}

function extractSpeciesId(url) {
  const match = String(url || "").match(/\/pokemon-species\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

function pokemonDisplayNameByNationalId(id, fallback) {
  if (!id) return fallback;
  const official = KANTO_POKEMON.find((pokemon) => getPokemonNationalId(pokemon) === id);
  if (official) return official.name;
  const reforged = KANTO_REFORGED_POKEMON.find((pokemon) => getPokemonNationalId(pokemon) === id);
  return reforged?.name || fallback;
}

function formatApiName(value) {
  return String(value || "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatEvolutionRequirement(details = []) {
  const detail = details[0] || {};
  const parts = [];
  if (detail.min_level) parts.push(`Niv. ${detail.min_level}`);
  if (detail.item?.name) parts.push(formatApiName(detail.item.name));
  if (detail.held_item?.name) parts.push(`Tenu: ${formatApiName(detail.held_item.name)}`);
  if (detail.known_move?.name) parts.push(`Cap.: ${formatApiName(detail.known_move.name)}`);
  if (detail.min_happiness) parts.push(`Bonheur ${detail.min_happiness}`);
  if (detail.time_of_day) parts.push(formatApiName(detail.time_of_day));
  if (!parts.length && detail.trigger?.name === "trade") parts.push("Echange");
  if (!parts.length && detail.trigger?.name) parts.push(formatApiName(detail.trigger.name));
  return parts.join(" - ") || "Condition speciale";
}

function dedupeGuideLabels(locations) {
  const seen = new Set();
  return locations
    .map((item) => item.label || item.area || "")
    .filter(Boolean)
    .filter((label) => {
      const key = normalize(label);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function renderPokemonInfoPanel(data) {
  const evolutionMarkup = renderEvolutionLookup(data.evolution, data.reforged);
  if (!evolutionMarkup) {
    return `<div class="pokemon-info-empty">Aucune evolution ou localisation connue.</div>`;
  }
  return `
    ${evolutionMarkup}
  `;
}

function renderEvolutionLookup(evolution, reforged) {
  if (!evolution?.tree) return "";
  return `
    <div class="pokemon-info-section">
      <div class="pokemon-info-section-heading">
        <span class="slot-meta">Evolution</span>
        <span>${escapeHtml(evolution.sourceLabel)}</span>
      </div>
      <div class="pokemon-evolution-tree">
        ${renderEvolutionTreeNode(evolution.tree, { reforged, root: true })}
      </div>
    </div>
  `;
}

function renderEvolutionTreeNode(node, options = {}) {
  const childCount = node.children.length;
  return `
    <div class="pokemon-evolution-node-wrap ${options.root ? "root" : ""}">
      ${options.root ? "" : `<span class="pokemon-evolution-link">${escapeHtml(node.requirement)}</span>`}
      ${renderEvolutionMiniCard(node, options.reforged)}
      ${childCount ? `
        <div class="pokemon-evolution-children ${childCount > 1 ? "branched" : ""}">
          ${node.children.map((child) => renderEvolutionTreeNode(child, { reforged: options.reforged })).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderEvolutionMiniCard(evolution, reforged) {
  const sprite = evolution.id ? spriteUrls.get(evolution.id) : null;
  return `
    <div class="pokemon-evolution-card ${evolution.current ? "current" : ""}">
      ${sprite ? `<img class="pokemon-info-sprite" src="${escapeHtml(sprite)}" alt="${escapeHtml(evolution.name)}" loading="lazy" onerror="this.remove()">` : ""}
      <strong>${escapeHtml(evolution.name)}</strong>
      ${reforged ? renderEvolutionCaptureInfo(evolution) : ""}
    </div>
  `;
}

function renderEvolutionCaptureInfo(evolution) {
  return `
    <div class="pokemon-capture-block ${evolution.locations.length ? "available" : "missing"}">
      <span>${evolution.locations.length ? "Capture directe" : "Pas de capture directe connue"}</span>
      ${evolution.locations.length ? `
        <div class="pokemon-info-tags">
          ${evolution.locations.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
        </div>
      ` : ""}
      ${evolution.reforgedEvolution ? `<p class="pokemon-info-note">Reforged: ${escapeHtml(evolution.reforgedEvolution)}</p>` : ""}
    </div>
  `;
}

function renderSimulation(team) {
  el.simulationTitle.textContent = team ? team.name : "Aucune equipe";
  const enemyCount = simulationDraft.enemies.filter(Boolean).length;
  const slotCount = 6;
  el.versusAutoOpponent.checked = simulationDraft.autoOpponent;
  el.versusAutoOpponent.disabled = !getTeamReservePokemon(team).length;
  el.versusApplyTeam.classList.toggle("hidden", !team || !simulationDraft.showResults);
  el.simulationCount.textContent = `${enemyCount}/6 adversaire${enemyCount > 1 ? "s" : ""}`;
  renderVersusSharedLoader();
  renderVersusApplyModal();
  el.simulationEnemies.innerHTML = "";
  el.simulationMobile.innerHTML = "";
  const isMobile = mobileVersusMedia.matches;
  const enemyContainer = el.simulationMobile;

  for (let index = 0; index < slotCount; index += 1) {
    const enemy = simulationDraft.enemies[index];
    const card = document.createElement("article");
    if (isMobile) {
      card.className = "mobile-duel";
      if (enemy) {
        card.innerHTML = `
          <div class="mobile-duel-label"><span>Duel ${index + 1}</span><span>${simulationDraft.showResults ? "Analyse terminee" : "Pret"}</span></div>
          <div class="mobile-opponent">
            <div class="mobile-opponent-identity">
              ${simulationDraft.showResults ? "" : renderVersusSprite(enemy, "enemy confirmed-enemy-sprite")}
              <div>
                <span class="choice-kicker">Adversaire</span>
                <h3>${escapeHtml(enemy.name || `Adversaire ${index + 1}`)} <span class="name-type-logos">${enemy.types.map(typeLogoOnly).join("")}</span></h3>
              </div>
            </div>
            <div class="card-actions">
              <button class="small-button" type="button" data-edit-enemy="${index}">Editer</button>
              <button class="small-button danger" type="button" data-delete-enemy="${index}">Enlever</button>
            </div>
          </div>
          <div class="mobile-duel-divider"><span>VS</span></div>
          ${renderMobileDuelResult(team, enemy, index)}
        `;
      } else {
        card.classList.add("empty");
        card.innerHTML = `<button class="mobile-duel-add" type="button" data-add-enemy="${index}"><img class="add-pokeball-icon" src="assets/add-pokeball.svg" alt="" aria-hidden="true"> Ajouter l'adversaire ${index + 1}</button>`;
      }
    } else {
      card.className = "mobile-duel desktop-duel";
      if (enemy) {
        card.innerHTML = renderDesktopDuel(team, enemy, index);
      } else {
        card.classList.add("empty");
        card.innerHTML = `<button class="mobile-duel-add" type="button" data-add-enemy="${index}"><img class="add-pokeball-icon" src="assets/add-pokeball.svg" alt="" aria-hidden="true"> Ajouter l'adversaire ${index + 1}</button>`;
      }
    }

    enemyContainer.append(card);
  }

  enhanceTypeSelects(enemyContainer);

  enemyContainer.querySelectorAll("[data-add-enemy], [data-edit-enemy]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.addEnemy ?? button.dataset.editEnemy);
      renderSimulationEnemyEditor(index);
    });
  });

  enemyContainer.querySelectorAll("[data-cancel-enemy-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      simulationDraft.editingIndex = null;
      renderSimulation(team);
    });
  });

  enemyContainer.querySelectorAll(".enemy-attack-input").forEach((input) => {
    input.addEventListener("change", () => {
      const editor = input.closest("[data-enemy-editor]");
      const attacks = getEnemyAttackTypes(editor);
      if (attacks.length > 4) {
        input.checked = false;
        alert("Un adversaire peut avoir au maximum 4 types d'attaque.");
      }
      updateEnemyAttackCount(editor);
    });
  });

  enemyContainer.querySelectorAll("[data-save-enemy]").forEach((button) => {
    button.addEventListener("click", () => saveSimulationEnemy(button.closest("[data-enemy-editor]")));
  });

  enemyContainer.querySelectorAll(".enemy-pick-source").forEach((select) => {
    select.addEventListener("change", () => {
      const editor = select.closest("[data-enemy-editor]");
      const datalist = editor.querySelector("datalist");
      const query = editor.querySelector(".enemy-pick-query");
      datalist.innerHTML = enemyPokemonOptions(select.value);
      query.value = "";
    });
  });

  enemyContainer.querySelectorAll("[data-apply-enemy-pokemon]").forEach((button) => {
    button.addEventListener("click", () => {
      const editor = button.closest("[data-enemy-editor]");
      const source = editor.querySelector(".enemy-pick-source").value;
      const query = editor.querySelector(".enemy-pick-query").value;
      const pokemon = findEnemyPick(source, query);
      if (!pokemon) {
        alert("Pokemon introuvable dans cette source.");
        return;
      }
      editor.querySelector("#enemy-type-one").value = pokemon.types[0] || "Normal";
      editor.querySelector("#enemy-type-two").value = pokemon.types[1] || "";
      syncTypeWheels(editor);
      editor.dataset.enemyName = pokemon.name;
      editor.dataset.enemyNationalId = getPokemonNationalId(pokemon) || "";
      const attacks = pokemon.attacks?.length ? pokemon.attacks : pokemon.types;
      editor.querySelectorAll(".enemy-attack-input").forEach((input) => {
        input.checked = attacks.includes(input.value);
      });
      updateEnemyAttackCount(editor);
    });
  });

  enemyContainer.querySelectorAll("[data-delete-enemy]").forEach((button) => {
    button.addEventListener("click", () => {
      simulationDraft.enemies.splice(Number(button.dataset.deleteEnemy), 1);
      simulationDraft.editingIndex = null;
      simulationDraft.showResults = false;
      el.simulationResults.className = "simulation-results empty-state";
      el.simulationResults.innerHTML = "Versus modifie. Relance-le pour mettre les conseils a jour.";
      renderSimulation(team);
    });
  });

  bindInteractiveResults(el.simulationMobile);
}

function renderDesktopDuel(team, enemy, index) {
  const matchup = simulationDraft.showResults
    ? bestTeamMatchups(getVersusCandidateTeam(team), enemy)[0]
    : null;
  const enemySprite = renderVersusSprite(enemy, "enemy");
  const choiceSprite = renderVersusSprite(matchup?.pokemon, "choice");

  return `
    <div class="mobile-duel-label"><span>Duel ${index + 1}</span><span>${simulationDraft.showResults ? "Analyse terminee" : "Pret a lancer"}</span></div>
    <div class="desktop-duel-grid">
      <section class="desktop-duel-recap opponent-recap">
        <div class="desktop-duel-pane-heading">
          <span class="choice-kicker">Adversaire</span>
          <div class="card-actions">
            <button class="small-button" type="button" data-edit-enemy="${index}">Editer</button>
            <button class="small-button danger" type="button" data-delete-enemy="${index}">Enlever</button>
          </div>
        </div>
        <h3>${escapeHtml(enemy.name || `Adversaire ${index + 1}`)} <span class="name-type-logos">${enemy.types.map(typeLogoOnly).join("")}</span></h3>
        <div class="desktop-duel-lines">
          <div class="mini-line"><span class="slot-meta">Types</span>${enemy.types.map(typeBadge).join("")}</div>
          <div class="mini-line"><span class="slot-meta">Attaques</span>${enemy.attacks.length ? enemy.attacks.map(typeBadge).join("") : `<span class="multiplier">Aucune</span>`}</div>
        </div>
      </section>

      <div class="desktop-duel-stage" aria-hidden="true">
        <div class="desktop-duel-sprite-slot">${enemySprite}</div>
        <span>VS</span>
        <div class="desktop-duel-sprite-slot">${choiceSprite}</div>
      </div>

      ${matchup ? `
        <section class="desktop-duel-recap desktop-duel-choice interactive-result" tabindex="0" role="button" aria-expanded="false" aria-label="Afficher la justification du choix ${index + 1}">
          <div class="desktop-duel-pane-heading">
            <span class="choice-kicker">${simulationDraft.autoOpponent ? "Choix reserve" : "Choix de l'equipe"}</span>
            <span class="detail-hint">Pourquoi ?</span>
          </div>
          ${renderMatchupChoice(matchup)}
          ${renderVersusExplanation(matchup, enemy)}
        </section>
      ` : `
        <section class="desktop-duel-recap desktop-duel-pending">
          <span class="choice-kicker">Recommandation</span>
          <strong>En attente du VS</strong>
          <span class="slot-meta">Le meilleur choix apparaitra ici sans modifier l'adversaire.</span>
        </section>
      `}
    </div>
  `;
}

function renderSimulationEnemyEditor(index) {
  simulationDraft.editingIndex = index;
  const enemy = simulationDraft.enemies[index] || { name: "", types: ["Normal"], attacks: [], nationalId: null };
  openPokemonEditModal(enemy, { mode: "enemy", enemyIndex: index });
}

function renderSimulationEnemyEditorMarkup(index, enemy) {
  const source = getTeamPreferredSource(state.teams[state.selectedSlot] || draftTeam);
  return `
    <div class="enemy-inline-editor" data-enemy-editor="${index}" data-enemy-name="${escapeHtml(enemy.name || "")}" data-enemy-national-id="${getPokemonNationalId(enemy) || ""}">
      <div class="pokemon-card-header">
        <h3>${escapeHtml(enemy.name || `Adversaire ${index + 1}`)}</h3>
        <button class="small-button" type="button" data-cancel-enemy-edit>Fermer</button>
      </div>
      <div class="enemy-quick-pick">
        <label class="field">
          <span>Source</span>
          <select class="enemy-pick-source">
            ${versusSourceOption()}
            <option value="saved">Ma bibliotheque</option>
          </select>
        </label>
        <label class="field">
          <span>Recherche</span>
          <input class="enemy-pick-query" type="search" list="enemy-pokemon-options-${index}" placeholder="Pikachu, Dracaufeu...">
          <datalist id="enemy-pokemon-options-${index}">${enemyPokemonOptions(source)}</datalist>
        </label>
        <button class="small-button" type="button" data-apply-enemy-pokemon>Charger</button>
      </div>
      <div class="picker-grid">
        <label class="field">
          <span>Type 1</span>
          <select id="enemy-type-one">${typeOptions(enemy.types[0])}</select>
        </label>
        <label class="field">
          <span>Type 2 optionnel</span>
          <select id="enemy-type-two">${typeOptions(enemy.types[1], true)}</select>
        </label>
      </div>
      <fieldset class="attack-picker">
        <legend>
          <span>Types d'attaque adverses</span>
          <strong id="enemy-attack-count">${enemy.attacks.length}/4</strong>
        </legend>
        <div class="type-checks">
          ${KANTO_TYPES.map((type) => `
            <label class="type-check">
              <input class="enemy-attack-input" type="checkbox" value="${type}" ${enemy.attacks.includes(type) ? "checked" : ""}>
              ${typeLogoOnly(type)}
            </label>
          `).join("")}
        </div>
      </fieldset>
      <div class="form-actions">
        <button class="primary-button confirm" type="button" data-save-enemy>Confirmer l'adversaire</button>
      </div>
    </div>
  `;
}

function getEnemyAttackTypes(editor) {
  return Array.from(editor.querySelectorAll(".enemy-attack-input:checked")).map((input) => input.value);
}

function enemyPokemonOptions(source) {
  const list = pokemonListForSource(source);
  return list.map((pokemon) => `<option value="${escapeHtml(pokemonOptionLabel(pokemon))}"></option>`).join("");
}

function findEnemyPick(source, query) {
  const list = pokemonListForSource(source);
  const normalized = normalize(query);
  return list.find((pokemon) => normalize(pokemonOptionLabel(pokemon)) === normalized)
    || list.find((pokemon) => normalize(pokemon.name) === normalized)
    || list.find((pokemon) => normalize(pokemon.name).includes(normalized));
}

function pokemonListForSource(source) {
  if (source === "saved") return state.customPokemon;
  if (source === "reforged") return KANTO_REFORGED_POKEMON;
  return KANTO_POKEMON;
}

function versusSourceOption() {
  const source = getTeamPreferredSource(state.teams[state.selectedSlot] || draftTeam);
  return `<option value="${source}">${preferredSourceLabel(source)}</option>`;
}

function pokemonOptionLabel(pokemon) {
  return `${pokemon.name} - ${pokemon.types.join("/")}`;
}

function updateEnemyAttackCount(editor) {
  const count = editor.querySelector("#enemy-attack-count");
  if (count) count.textContent = `${getEnemyAttackTypes(editor).length}/4`;
}

function saveSimulationEnemy(editor) {
  const typeOne = editor.querySelector("#enemy-type-one").value;
  const typeTwo = editor.querySelector("#enemy-type-two").value;
  const attacks = getEnemyAttackTypes(editor);
  const name = editor.dataset.enemyName || `Adversaire ${simulationDraft.editingIndex + 1}`;
  const normalizedName = normalize(name);
  const nationalId = Number(editor.dataset.enemyNationalId)
    || SPRITE_NAME_ALIASES[normalizedName]
    || POKEMON_SPRITE_IDS[normalizedName]
    || null;

  if (attacks.length > 4) {
    alert("Un adversaire peut avoir au maximum 4 types d'attaque.");
    return;
  }

  const types = [typeOne, typeTwo].filter(Boolean).filter((type, index, all) => all.indexOf(type) === index);
  const enemy = { name, types, attacks, nationalId };
  simulationDraft.enemies[simulationDraft.editingIndex] = enemy;
  simulationDraft.editingIndex = null;
  simulationDraft.showResults = false;
  el.simulationEnemyEditor.classList.add("hidden");
  el.simulationResults.className = "simulation-results empty-state";
  el.simulationResults.innerHTML = "Versus modifie. Lance-le pour afficher les meilleurs choix.";
  renderSimulation(state.teams[state.selectedSlot]);
  void syncPokemonSprites(enemy).then(() => renderSimulation(state.teams[state.selectedSlot]));
}

function toggleAutomaticOpponent() {
  const team = state.teams[state.selectedSlot];
  if (el.versusAutoOpponent.checked && !getTeamReservePokemon(team).length) {
    el.versusAutoOpponent.checked = false;
    return;
  }
  simulationDraft.autoOpponent = el.versusAutoOpponent.checked;
  simulationDraft.showResults = false;
  el.simulationResults.className = "simulation-results empty-state";
  el.simulationResults.innerHTML = "Source de recommandation modifiee. Relance le VS pour recalculer.";
  renderSimulation(team);
}

function getVersusCandidateTeam(team) {
  if (!simulationDraft.autoOpponent) return team;
  const active = team?.pokemon || [];
  const reserve = getTeamReservePokemon(team).map((pokemon) => ({
    ...structuredClone(pokemon),
    sourceId: pokemon.id,
    attacks: pokemon.attacks || []
  }));
  const pokemon = [...active];
  reserve.forEach((candidate) => {
    if (!pokemon.some((member) => isSamePokemon(member, candidate))) pokemon.push(candidate);
  });
  return {
    pokemon
  };
}

async function renderSimulationResults() {
  const team = state.teams[state.selectedSlot];
  const hasEnemies = simulationDraft.enemies.some(Boolean);

  if (!team || !hasEnemies) {
    el.simulationResults.className = "simulation-results empty-state";
    el.simulationResults.innerHTML = "Ajoute au moins un adversaire avant de confirmer.";
    if (mobileVersusMedia.matches) alert("Ajoute au moins un adversaire avant de lancer le VS.");
    return;
  }

  simulationDraft.showResults = true;
  renderSimulation(team);
  const candidateTeam = getVersusCandidateTeam(team);
  const enemies = simulationDraft.enemies.filter(Boolean);
  const choices = enemies
    .map((enemy) => bestTeamMatchups(candidateTeam, enemy)[0]?.pokemon)
    .filter(Boolean);
  await syncPokemonSprites([...enemies, ...choices]);
  if (simulationDraft.showResults) renderSimulation(team);
}

function getVersusRecommendedPokemon() {
  const team = state.teams[state.selectedSlot];
  if (!team || !simulationDraft.showResults) return [];
  const candidateTeam = getVersusCandidateTeam(team);
  const unique = [];
  simulationDraft.enemies.filter(Boolean).forEach((enemy) => {
    const pokemon = bestTeamMatchups(candidateTeam, enemy)[0]?.pokemon;
    if (pokemon && !unique.some((item) => isSamePokemon(item, pokemon))) unique.push(pokemon);
  });
  return unique;
}

function renderVersusApplyModal() {
  if (!versusApplyModalOpen) {
    el.versusApplyModal.classList.add("hidden");
    el.versusApplyModal.innerHTML = "";
    return;
  }

  const team = state.teams[state.selectedSlot];
  const recommendations = getVersusRecommendedPokemon();
  const freeSlots = Math.max(0, 6 - (team?.pokemon.length || 0));
  el.versusApplyModal.classList.remove("hidden");
  el.versusApplyModal.innerHTML = `
    <div class="team-modal" role="dialog" aria-modal="true" aria-labelledby="versus-apply-title">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Versus</p>
          <h2 id="versus-apply-title">Modifier l'equipe actuelle</h2>
        </div>
        <button class="small-button" type="button" data-close-versus-apply>Fermer</button>
      </div>
      <p class="field-help">Les choix ci-dessous viennent du dernier VS. Les doublons sont ignores et les places libres sont remplies en priorite.</p>
      <div class="versus-apply-list">
        ${recommendations.length ? recommendations.map((pokemon, index) => renderVersusApplyRow(pokemon, index, team, freeSlots)).join("") : `<div class="empty-state">Aucune recommandation disponible. Lance un VS avant de modifier l'equipe.</div>`}
      </div>
      <div class="form-actions">
        <button class="primary-button confirm" type="button" data-confirm-versus-apply ${recommendations.length ? "" : "disabled"}>Appliquer les choix</button>
      </div>
    </div>
  `;
  el.versusApplyModal.querySelector("[data-close-versus-apply]").addEventListener("click", closeVersusApplyModal);
  el.versusApplyModal.onclick = (event) => {
    if (event.target === el.versusApplyModal) closeVersusApplyModal();
  };
  el.versusApplyModal.querySelector("[data-confirm-versus-apply]")?.addEventListener("click", applyVersusRecommendationsToTeam);
}

function renderVersusApplyRow(pokemon, index, team, freeSlots) {
  const duplicate = team.pokemon.some((member) => isSamePokemon(member, pokemon));
  const canUseFreeSlot = !duplicate && index < freeSlots;
  const disabled = duplicate ? "disabled" : "";
  const target = duplicate
    ? `<span class="slot-meta">Deja dans l'equipe</span>`
    : canUseFreeSlot
      ? `<span class="slot-meta">Ajout sur une place libre</span>`
      : `
        <label class="field">
          <span>Remplacer</span>
          <select data-versus-replace-target="${index}">
            ${team.pokemon.map((member, memberIndex) => `<option value="${escapeHtml(member.instanceId)}" ${memberIndex === index % team.pokemon.length ? "selected" : ""}>${escapeHtml(member.name)}</option>`).join("")}
          </select>
        </label>
      `;
  return `
    <label class="versus-apply-row ${duplicate ? "disabled" : ""}">
      <input type="checkbox" data-versus-apply-index="${index}" ${disabled} ${duplicate ? "" : "checked"}>
      <span class="team-add-mini-sprite">${renderPokemonSprite(pokemon) || `<span>${escapeHtml(pokemon.name.slice(0, 1))}</span>`}</span>
      <strong>${escapeHtml(pokemon.name)}</strong>
      <span class="name-type-logos">${pokemon.types.map(typeLogoOnly).join("")}</span>
      ${target}
    </label>
  `;
}

function closeVersusApplyModal() {
  versusApplyModalOpen = false;
  el.versusApplyModal.onclick = null;
  renderVersusApplyModal();
}

function applyVersusRecommendationsToTeam() {
  const team = state.teams[state.selectedSlot];
  if (!team) return;
  const recommendations = getVersusRecommendedPokemon();
  const checked = Array.from(el.versusApplyModal.querySelectorAll("[data-versus-apply-index]:checked"));
  checked.forEach((input) => {
    const index = Number(input.dataset.versusApplyIndex);
    const pokemon = recommendations[index];
    if (!pokemon || team.pokemon.some((member) => isSamePokemon(member, pokemon))) return;
    const member = clonePokemonAsTeamMember(pokemon);
    if (team.pokemon.length < 6) {
      team.pokemon.push(member);
      return;
    }
    const targetId = el.versusApplyModal.querySelector(`[data-versus-replace-target="${index}"]`)?.value;
    const targetIndex = team.pokemon.findIndex((item) => item.instanceId === targetId);
    if (targetIndex >= 0) team.pokemon[targetIndex] = member;
  });
  team.updatedAt = new Date().toISOString();
  state.teams[state.selectedSlot] = team;
  draftTeam = structuredClone(team);
  saveState();
  closeVersusApplyModal();
  renderAll();
}

function clonePokemonAsTeamMember(pokemon) {
  const member = {
    instanceId: `member-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceId: pokemon.sourceId || pokemon.id || null,
    name: pokemon.name,
    types: [...pokemon.types],
    attacks: [...(pokemon.attacks || pokemon.types || [])].slice(0, 4)
  };
  const nationalId = getPokemonNationalId(pokemon);
  if (nationalId) member.nationalId = nationalId;
  return member;
}

function renderMobileDuelResult(team, enemy, index) {
  if (!simulationDraft.showResults) {
    return `<div class="mobile-result-pending"><span>?</span><p>Lance le VS pour afficher le meilleur choix.</p></div>`;
  }

  const matchup = bestTeamMatchups(getVersusCandidateTeam(team), enemy)[0];
  return renderSimulationResultCard(matchup, enemy, index, "mobile-result-card");
}

function renderDesktopSimulationResults(team) {
  el.simulationResults.className = "simulation-results";
  const resultCount = 6;
  const candidateTeam = getVersusCandidateTeam(team);
  el.simulationResults.innerHTML = Array.from({ length: resultCount }, (_, index) => {
    const enemy = simulationDraft.enemies[index];
    if (!enemy) {
      return `<article class="simulation-result-card muted-result"><span class="slot-meta">Aucun adversaire ${index + 1}</span></article>`;
    }

    const matchup = bestTeamMatchups(candidateTeam, enemy)[0];
    return renderSimulationResultCard(matchup, enemy, index);
  }).join("");

  bindInteractiveResults(el.simulationResults);
}

function renderSimulationResultCard(matchup, enemy, index, extraClass = "") {
  return `
    <article class="simulation-result-card interactive-result ${extraClass}" tabindex="0" role="button" aria-expanded="false" aria-label="Afficher la justification du choix ${index + 1}">
      <div class="pokemon-card-header">
        <span class="choice-kicker">${simulationDraft.autoOpponent ? "Choix reserve" : "Choix recommande"}</span>
        <span class="detail-hint">Pourquoi ?</span>
      </div>
      ${renderVersusSpriteFaceoff(enemy, matchup?.pokemon)}
      ${renderMatchupChoice(matchup)}
      ${renderVersusExplanation(matchup, enemy)}
    </article>
  `;
}

function bindInteractiveResults(container) {
  container.querySelectorAll(".interactive-result").forEach((card) => {
    const toggleDetail = () => {
      container.querySelectorAll(".interactive-result.show-details").forEach((otherCard) => {
        if (otherCard === card) return;
        otherCard.classList.remove("show-details");
        otherCard.setAttribute("aria-expanded", "false");
        otherCard.querySelector(".versus-explanation")?.setAttribute("aria-hidden", "true");
      });
      const expanded = card.classList.toggle("show-details");
      card.setAttribute("aria-expanded", String(expanded));
      card.querySelector(".versus-explanation")?.setAttribute("aria-hidden", String(!expanded));
    };

    card.addEventListener("click", toggleDetail);
    card.querySelector(".matchup-player-card")?.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleDetail();
    });
  });
}

function bestDefensiveTypes(enemy) {
  if (!enemy.attacks.length) return [];
  return KANTO_TYPES
    .map((type) => ({
      type,
      multiplier: Math.max(...enemy.attacks.map((attackType) => getEffectiveness(attackType, type)))
    }))
    .filter((item) => item.multiplier < 1)
    .sort((a, b) => a.multiplier - b.multiplier)
    .slice(0, 5);
}

function bestOffensiveTypes(enemy) {
  return KANTO_TYPES
    .map((type) => ({
      type,
      multiplier: enemy.types.reduce((value, enemyType) => value * getEffectiveness(type, enemyType), 1)
    }))
    .filter((item) => item.multiplier > 1)
    .sort((a, b) => b.multiplier - a.multiplier)
    .slice(0, 5);
}

function bestTeamMatchups(team, enemy) {
  const defenseKnown = enemy.attacks.length > 0;

  return team.pokemon
    .map((pokemon) => {
      const receivedMultipliers = defenseKnown
        ? enemy.attacks.map((attackType) => pokemon.types.reduce((value, pokemonType) => value * getEffectiveness(attackType, pokemonType), 1))
        : [1];
      const defensiveMultiplier = Math.max(...receivedMultipliers);
      const attacks = pokemon.attacks || [];
      const rankedAttacks = attacks
        .map((attackType) => ({
          type: attackType,
          multiplier: enemy.types.reduce((value, enemyType) => value * getEffectiveness(attackType, enemyType), 1)
        }))
        .sort((a, b) => b.multiplier - a.multiplier);

      return {
        pokemon,
        defenseKnown,
        defensiveMultiplier,
        defensiveTotal: receivedMultipliers.reduce((sum, multiplier) => sum + multiplier, 0),
        immunityCount: receivedMultipliers.filter((multiplier) => multiplier === 0).length,
        bestAttack: rankedAttacks[0] || null
      };
    })
    .sort((a, b) => (
      a.defensiveMultiplier - b.defensiveMultiplier
      || a.defensiveTotal - b.defensiveTotal
      || b.immunityCount - a.immunityCount
      || (b.bestAttack?.multiplier || 0) - (a.bestAttack?.multiplier || 0)
      || a.pokemon.name.localeCompare(b.pokemon.name)
    ));
}

function renderMatchupChoice(matchup) {
  if (!matchup) return `<div class="empty-state">Aucun Pokemon disponible dans ton equipe.</div>`;

  const attack = matchup.bestAttack;
  const warnings = [];
  if (!matchup.defenseKnown) {
    warnings.push("Defense non evaluee : attaques adverses inconnues.");
  } else if (matchup.defensiveMultiplier > 1) {
    warnings.push("Matchup risque : aucun choix plus resistant dans l'equipe.");
  } else if (matchup.defensiveMultiplier === 1 && (!attack || attack.multiplier <= 1)) {
    warnings.push("Matchup neutre : aucun avantage de type disponible.");
  }
  if (!attack) warnings.push("Attaques de ce Pokemon a renseigner.");
  if (attack && attack.multiplier < 1) warnings.push("Couverture offensive limitee pour ce duel.");

  return `
    <div class="matchup-choice">
      <div class="matchup-pokemon">
        <h3>${escapeHtml(matchup.pokemon.name)}</h3>
        <span class="name-type-logos">${matchup.pokemon.types.map(typeLogoOnly).join("")}</span>
      </div>
      <div class="matchup-metrics">
        <div>
          <span class="choice-kicker">Encaisse</span>
          <strong>${matchup.defenseKnown ? formatMultiplierLabel(matchup.defensiveMultiplier) : "?"}</strong>
        </div>
        <div>
          <span class="choice-kicker">Frappe</span>
          <strong>${attack ? `${typeLogo(attack.type)} ${formatMultiplierLabel(attack.multiplier)}` : "?"}</strong>
        </div>
      </div>
      ${warnings.length ? `<div class="matchup-alert">${warnings.join(" ")}</div>` : `<div class="matchup-positive">Choix favorable pour ce duel.</div>`}
    </div>
  `;
}

function renderVersusSharedLoader() {
  if (!state.sharedTeams.length) {
    el.versusSharedLoader.innerHTML = "";
    closeVersusSharedModal();
    return;
  }
  el.versusSharedLoader.innerHTML = `
    <button class="versus-shared-trigger" type="button" data-open-versus-shared>
      <span class="versus-shared-icon"><img src="assets/partage.png" alt="" aria-hidden="true" onerror="this.style.display='none'"></span>
      <span>Utiliser une equipe partagee</span>
    </button>
  `;
  el.versusSharedLoader.querySelector("[data-open-versus-shared]").addEventListener("click", () => {
    versusSharedModalOpen = true;
    renderVersusSharedModal();
  });
  renderVersusSharedModal();
}

function renderVersusSharedModal() {
  if (!versusSharedModalOpen || !state.sharedTeams.length) {
    el.versusSharedModal.classList.add("hidden");
    el.versusSharedModal.innerHTML = "";
    return;
  }
  el.versusSharedModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  el.versusSharedModal.innerHTML = `
    <div class="team-modal versus-shared-modal-card" role="dialog" aria-modal="true" aria-labelledby="versus-shared-title">
      <div class="pokemon-editor-heading">
        <div class="pokemon-editor-identity">
          <span class="versus-shared-icon"><img src="assets/partage.png" alt="" aria-hidden="true" onerror="this.style.display='none'"></span>
          <div>
            <p class="eyebrow">Versus</p>
            <h2 id="versus-shared-title">Equipe partagee</h2>
          </div>
        </div>
        <button class="modal-close-button" type="button" data-close-versus-shared aria-label="Fermer">&times;</button>
      </div>
      <div class="versus-shared-team-list">
        ${state.sharedTeams.map((team) => `
          <button class="versus-shared-team-option" type="button" data-use-versus-shared="${escapeHtml(team.id)}">
            <span>
              <strong>${escapeHtml(team.savedName || team.name)}</strong>
              <small>${team.pokemon.length}/6 Pokemon</small>
            </span>
            <span class="versus-shared-team-names">${team.pokemon.map((pokemon) => escapeHtml(pokemon.name)).join(" · ")}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
  el.versusSharedModal.querySelector("[data-close-versus-shared]").addEventListener("click", closeVersusSharedModal);
  el.versusSharedModal.onclick = (event) => {
    if (event.target === el.versusSharedModal) closeVersusSharedModal();
  };
  el.versusSharedModal.querySelectorAll("[data-use-versus-shared]").forEach((button) => {
    button.addEventListener("click", () => loadSharedTeamIntoVersus(button.dataset.useVersusShared));
  });
}

function closeVersusSharedModal() {
  versusSharedModalOpen = false;
  el.versusSharedModal.classList.add("hidden");
  el.versusSharedModal.innerHTML = "";
  if (!pokemonEditContext && !versusApplyModalOpen) document.body.classList.remove("modal-open");
}

function loadSharedTeamIntoVersus(id) {
  const team = state.sharedTeams.find((item) => String(item.id) === String(id));
  if (!team) return;
  simulationDraft.enemies = team.pokemon.map((pokemon) => ({
    name: pokemon.name,
    types: [...pokemon.types],
    attacks: [...(pokemon.attacks || [])],
    nationalId: getPokemonNationalId(pokemon) || null
  })).slice(0, 6);
  simulationDraft.editingIndex = null;
  simulationDraft.showResults = false;
  closeVersusSharedModal();
  el.simulationResults.className = "simulation-results empty-state";
  el.simulationResults.innerHTML = "Equipe partagee chargee. Lance le VS pour afficher les meilleurs choix.";
  renderSimulation(state.teams[state.selectedSlot]);
}

function renderVersusExplanation(matchup, enemy) {
  if (!matchup) {
    return `<div class="versus-explanation" aria-hidden="true"><p>Aucun Pokemon disponible dans ton equipe.</p></div>`;
  }

  const defenseText = !matchup.defenseKnown
    ? "Les attaques adverses doivent etre renseignees pour evaluer la defense."
    : `${escapeHtml(matchup.pokemon.name)} recoit au maximum ${formatMultiplierLabel(matchup.defensiveMultiplier)} face aux attaques de ${escapeHtml(enemy.name)}.`;
  const attackText = matchup.bestAttack
    ? `Sa meilleure option offensive est le type ${matchup.bestAttack.type} (${formatMultiplierLabel(matchup.bestAttack.multiplier)}).`
    : "Aucune attaque n'est renseignee pour ce Pokemon.";
  const playerCard = `
    <article class="pokemon-card matchup-player-card" style="${pokemonCardStyle(matchup.pokemon)}">
      ${renderPokemonCard(matchup.pokemon, {
        showSprite: true,
        compact: true,
        includePokeball: false,
        toggleable: false,
        infoLookup: false
      })}
    </article>
  `;

  return `
    <div class="versus-explanation" aria-hidden="true">
      <span class="choice-kicker">Justification</span>
      <p>${defenseText}</p>
      <p>${attackText}</p>
      ${playerCard}
      <span class="detail-hint">Cliquer pour revenir</span>
    </div>
  `;
}

function pokemonCardStyle(pokemon) {
  const first = TYPE_COLORS[pokemon.types[0]] || "#343d4b";
  const second = TYPE_COLORS[pokemon.types[1]] || first;
  return [
    `--card-type-one:${hexToRgba(first, 0.42)}`,
    `--card-type-two:${hexToRgba(second, 0.42)}`,
    `--card-border:${hexToRgba(first, 0.86)}`
  ].join(";");
}

function openPokemonEditModal(pokemon, options = {}) {
  const sourceId = options.sourceId ?? pokemon.sourceId ?? pokemon.id;
  const savedPokemon = options.mode === "linked"
    ? state.customPokemon.find((item) => String(item.id) === String(sourceId))
    : null;
  const source = savedPokemon || pokemon;
  const nationalId = getPokemonNationalId(source);
  pokemonEditContext = {
    mode: options.mode || "linked",
    sourceId,
    enemyIndex: options.enemyIndex ?? null,
    draft: {
      name: source.name || "",
      types: [...(source.types || ["Normal"])],
      attacks: [...(source.attacks || [])],
      nationalId: nationalId || null,
      spriteName: nationalId ? pokemonDisplayNameByNationalId(nationalId, source.name || "") : ""
    }
  };
  pokemonEditEvolution = { status: nationalId ? "loading" : "unavailable", items: [] };
  renderPokemonEditModal();
  if (nationalId) void loadPokemonEditEvolution(nationalId, source);
}

function closePokemonEditModal() {
  pokemonEditContext = null;
  pokemonEditEvolution = { status: "idle", items: [] };
  el.pokemonEditModal.classList.add("hidden");
  el.pokemonEditModal.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function renderPokemonEditModal() {
  if (!pokemonEditContext) {
    closePokemonEditModal();
    return;
  }
  const { draft, mode } = pokemonEditContext;
  const allPokemon = [...KANTO_POKEMON, ...KANTO_REFORGED_POKEMON];
  const isEnemy = mode === "enemy";
  el.pokemonEditModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  el.pokemonEditModal.innerHTML = `
    <div class="team-modal pokemon-editor-modal" role="dialog" aria-modal="true" aria-labelledby="pokemon-edit-title">
      <div class="pokemon-editor-heading">
        <div class="pokemon-editor-identity">
          ${renderPokemonEditorSprite(draft)}
          <div>
            <p class="eyebrow">${isEnemy ? "Adversaire" : "Edition Pokemon"}</p>
            <h2 id="pokemon-edit-title">${escapeHtml(draft.name || "Nouveau Pokemon")}</h2>
          </div>
        </div>
        <button class="modal-close-button" type="button" data-close-pokemon-edit aria-label="Fermer">&times;</button>
      </div>
      ${isEnemy ? renderPokemonEditorQuickPick() : ""}
      <div class="pokemon-editor-fields">
        <label class="field">
          <span>Nom</span>
          <input id="modal-edit-pokemon-name" type="text" maxlength="32" value="${escapeHtml(draft.name)}">
        </label>
        <label class="field">
          <span>Apparence</span>
          <input id="modal-edit-pokemon-sprite" list="modal-edit-sprites" type="search" value="${escapeHtml(draft.spriteName)}" placeholder="Nom du Pokemon">
          <datalist id="modal-edit-sprites">
            ${allPokemon.map((item) => `<option value="${escapeHtml(item.name)}"></option>`).join("")}
          </datalist>
        </label>
        <label class="field">
          <span>Type 1</span>
          <select id="modal-edit-pokemon-type-one">${typeOptions(draft.types[0])}</select>
        </label>
        <label class="field">
          <span>Type 2 optionnel</span>
          <select id="modal-edit-pokemon-type-two">${typeOptions(draft.types[1], true)}</select>
        </label>
      </div>
      <fieldset class="attack-picker pokemon-editor-attacks">
        <legend>
          <span>Types d'attaque</span>
          <strong id="modal-edit-attack-count">${draft.attacks.length}/4</strong>
        </legend>
        <div class="type-checks">
          ${KANTO_TYPES.map((type) => `
            <label class="type-check">
              <input class="modal-edit-attack-input" type="checkbox" value="${type}" ${draft.attacks.includes(type) ? "checked" : ""}>
              ${typeLogoOnly(type)}
            </label>
          `).join("")}
        </div>
      </fieldset>
      <section class="pokemon-editor-evolution" aria-labelledby="pokemon-editor-evolution-title">
        <div class="pokemon-editor-section-heading">
          <h3 id="pokemon-editor-evolution-title">Evolution</h3>
          ${pokemonEditEvolution.status === "loading" ? `<span class="slot-meta">Chargement...</span>` : ""}
        </div>
        ${renderPokemonEditEvolutionChoices()}
      </section>
      <div class="form-actions pokemon-editor-actions">
        <button class="small-button" type="button" data-close-pokemon-edit>Annuler</button>
        <button class="primary-button confirm" type="button" data-confirm-pokemon-edit>${isEnemy ? "Confirmer l'adversaire" : "Mettre a jour partout"}</button>
      </div>
    </div>
  `;
  enhanceTypeSelects(el.pokemonEditModal);
  bindPokemonEditModalEvents();
}

function renderPokemonEditorSprite(pokemon) {
  const id = getPokemonNationalId(pokemon);
  const url = id ? spriteUrls.get(id) : null;
  return url
    ? `<img class="pokemon-editor-sprite" src="${escapeHtml(url)}" alt="${escapeHtml(pokemon.name)}">`
    : `<span class="pokemon-editor-sprite-placeholder" aria-hidden="true"></span>`;
}

function renderPokemonEditorQuickPick() {
  const source = getTeamPreferredSource(state.teams[state.selectedSlot] || draftTeam);
  const index = pokemonEditContext.enemyIndex ?? 0;
  return `
    <div class="pokemon-editor-quick-pick">
      <label class="field">
        <span>Source</span>
        <select id="modal-edit-pick-source">
          ${versusSourceOption()}
          <option value="saved">Ma bibliotheque</option>
        </select>
      </label>
      <label class="field">
        <span>Pokemon</span>
        <input id="modal-edit-pick-query" type="search" list="modal-edit-pick-options-${index}" placeholder="Pikachu, Dracaufeu...">
        <datalist id="modal-edit-pick-options-${index}">${enemyPokemonOptions(source)}</datalist>
      </label>
      <button class="small-button" type="button" data-modal-apply-pokemon>Charger</button>
    </div>
  `;
}

function renderPokemonEditEvolutionChoices() {
  if (pokemonEditEvolution.status === "loading") {
    return `<div class="pokemon-evolution-choices loading" aria-hidden="true"></div>`;
  }
  if (!pokemonEditEvolution.items.length) {
    return `<p class="slot-meta">Aucune evolution disponible pour ce Pokemon.</p>`;
  }
  const currentId = pokemonEditContext.draft.nationalId;
  return `
    <div class="pokemon-evolution-choices">
      ${pokemonEditEvolution.items.map((pokemon, index) => {
        const url = pokemon.id ? spriteUrls.get(pokemon.id) : null;
        return `
          <button class="pokemon-evolution-choice ${pokemon.id === currentId ? "selected" : ""}" type="button" data-select-evolution="${pokemon.id || ""}" aria-label="${index === 0 ? "Forme de base, " : ""}${escapeHtml(pokemon.name)}">
            ${url ? `<img src="${escapeHtml(url)}" alt="" aria-hidden="true">` : `<span class="pokemon-evolution-choice-placeholder" aria-hidden="true"></span>`}
            <strong>${escapeHtml(pokemon.name)}</strong>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function bindPokemonEditModalEvents() {
  el.pokemonEditModal.querySelectorAll("[data-close-pokemon-edit]").forEach((button) => {
    button.addEventListener("click", closePokemonEditModal);
  });
  el.pokemonEditModal.onclick = (event) => {
    if (event.target === el.pokemonEditModal) closePokemonEditModal();
  };
  el.pokemonEditModal.querySelectorAll(".modal-edit-attack-input").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = getModalPokemonAttackTypes();
      if (selected.length > 4) {
        input.checked = false;
        alert("Un Pokemon peut avoir au maximum 4 types d'attaque.");
      }
      const count = el.pokemonEditModal.querySelector("#modal-edit-attack-count");
      if (count) count.textContent = `${getModalPokemonAttackTypes().length}/4`;
    });
  });
  el.pokemonEditModal.querySelector("#modal-edit-pick-source")?.addEventListener("change", (event) => {
    const options = el.pokemonEditModal.querySelector("#modal-edit-pick-options-" + (pokemonEditContext.enemyIndex ?? 0));
    if (options) options.innerHTML = enemyPokemonOptions(event.currentTarget.value);
    const query = el.pokemonEditModal.querySelector("#modal-edit-pick-query");
    if (query) query.value = "";
  });
  el.pokemonEditModal.querySelector("[data-modal-apply-pokemon]")?.addEventListener("click", applyPokemonEditorQuickPick);
  el.pokemonEditModal.querySelectorAll("[data-select-evolution]").forEach((button) => {
    button.addEventListener("click", () => selectPokemonEditEvolution(Number(button.dataset.selectEvolution)));
  });
  el.pokemonEditModal.querySelector("[data-confirm-pokemon-edit]").addEventListener("click", savePokemonEditModal);
}

function capturePokemonEditForm() {
  if (!pokemonEditContext) return;
  const modal = el.pokemonEditModal;
  pokemonEditContext.draft.name = modal.querySelector("#modal-edit-pokemon-name")?.value.trim() || "";
  pokemonEditContext.draft.spriteName = modal.querySelector("#modal-edit-pokemon-sprite")?.value.trim() || "";
  const typeOne = modal.querySelector("#modal-edit-pokemon-type-one")?.value || "Normal";
  const typeTwo = modal.querySelector("#modal-edit-pokemon-type-two")?.value || "";
  pokemonEditContext.draft.types = [typeOne, typeTwo].filter(Boolean).filter((type, index, all) => all.indexOf(type) === index);
  pokemonEditContext.draft.attacks = getModalPokemonAttackTypes();
}

function getModalPokemonAttackTypes() {
  return Array.from(el.pokemonEditModal.querySelectorAll(".modal-edit-attack-input:checked")).map((input) => input.value);
}

async function loadPokemonEditEvolution(nationalId, pokemon) {
  let evolution = null;
  try {
    evolution = await getPokemonEvolutionData(nationalId, { reforged: isReforgedGuidePokemon(pokemon) });
  } catch {
    evolution = null;
  }
  if (!pokemonEditContext || pokemonEditContext.draft.nationalId !== nationalId) return;
  const nodes = evolution?.tree ? getEvolutionChainItems(evolution.tree) : [];
  const items = await Promise.all(nodes.map((node) => resolveEvolutionChoice(node, pokemon)));
  if (!pokemonEditContext) return;
  pokemonEditEvolution = { status: items.length ? "ready" : "unavailable", items };
  await syncPokemonSprites(items.map((item) => ({ nationalId: item.id, name: item.name })));
  if (pokemonEditContext) renderPokemonEditModal();
}

async function resolveEvolutionChoice(node, fallbackPokemon) {
  const local = [...KANTO_POKEMON, ...KANTO_REFORGED_POKEMON]
    .find((pokemon) => getPokemonNationalId(pokemon) === node.id);
  if (local) return { id: node.id, name: node.name, types: [...local.types] };
  if (node.id && navigator.onLine) {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${node.id}`);
      if (response.ok) {
        const data = await response.json();
        const typeNames = data.types.map((item) => apiTypeToFrench(item.type.name)).filter(Boolean);
        return { id: node.id, name: node.name, types: typeNames.length ? typeNames : [...fallbackPokemon.types] };
      }
    } catch {
      // La chaine reste utilisable avec les types deja connus.
    }
  }
  return { id: node.id, name: node.name, types: [...fallbackPokemon.types] };
}

function apiTypeToFrench(type) {
  return {
    normal: "Normal", fire: "Feu", water: "Eau", electric: "Electrik", grass: "Plante",
    ice: "Glace", fighting: "Combat", poison: "Poison", ground: "Sol", flying: "Vol",
    psychic: "Psy", bug: "Insecte", rock: "Roche", ghost: "Spectre", dragon: "Dragon",
    dark: "Tenebres", steel: "Acier", fairy: "Fee"
  }[type] || "";
}

function selectPokemonEditEvolution(nationalId) {
  const selected = pokemonEditEvolution.items.find((pokemon) => pokemon.id === nationalId);
  if (!selected) return;
  capturePokemonEditForm();
  pokemonEditContext.draft.name = selected.name;
  pokemonEditContext.draft.types = [...selected.types];
  pokemonEditContext.draft.nationalId = selected.id;
  pokemonEditContext.draft.spriteName = selected.name;
  renderPokemonEditModal();
}

function applyPokemonEditorQuickPick() {
  const source = el.pokemonEditModal.querySelector("#modal-edit-pick-source").value;
  const query = el.pokemonEditModal.querySelector("#modal-edit-pick-query").value;
  const pokemon = findEnemyPick(source, query);
  if (!pokemon) {
    alert("Pokemon introuvable dans cette source.");
    return;
  }
  capturePokemonEditForm();
  const nationalId = getPokemonNationalId(pokemon);
  pokemonEditContext.draft = {
    name: pokemon.name,
    types: [...pokemon.types],
    attacks: [...(pokemon.attacks?.length ? pokemon.attacks : pokemon.types)],
    nationalId: nationalId || null,
    spriteName: nationalId ? pokemonDisplayNameByNationalId(nationalId, pokemon.name) : ""
  };
  pokemonEditEvolution = { status: nationalId ? "loading" : "unavailable", items: [] };
  renderPokemonEditModal();
  if (nationalId) void loadPokemonEditEvolution(nationalId, pokemon);
}

function savePokemonEditModal() {
  capturePokemonEditForm();
  const context = pokemonEditContext;
  const pokemon = context?.draft;
  if (!context || !pokemon) return;
  if (!pokemon.name) {
    alert("Donne un nom au Pokemon.");
    return;
  }
  if (pokemon.attacks.length > 4) {
    alert("Un Pokemon peut avoir au maximum 4 types d'attaque.");
    return;
  }
  const spriteSource = findSpriteSourcePokemon(pokemon.spriteName);
  const nationalId = getPokemonNationalId(spriteSource) || pokemon.nationalId || null;
  if (context.mode === "enemy") {
    const enemy = { name: pokemon.name, types: pokemon.types, attacks: pokemon.attacks, nationalId };
    simulationDraft.enemies[context.enemyIndex] = enemy;
    simulationDraft.editingIndex = null;
    simulationDraft.showResults = false;
    closePokemonEditModal();
    el.simulationResults.className = "simulation-results empty-state";
    el.simulationResults.innerHTML = "Versus modifie. Relance-le pour afficher les meilleurs choix.";
    renderSimulation(state.teams[state.selectedSlot]);
    void syncPokemonSprites(enemy).then(() => renderSimulation(state.teams[state.selectedSlot]));
    return;
  }
  updatePokemonEverywhere(context.sourceId, {
    name: pokemon.name,
    types: pokemon.types,
    attacks: pokemon.attacks,
    nationalId
  });
  saveState();
  closePokemonEditModal();
  renderAll();
  void syncPokemonSprites({ ...pokemon, nationalId }).then(renderAll);
}

function renderPokemonEditPanel(pokemon, panel = el.pokemonEditPanel, includeAttacks = true) {
  const attacks = pokemon.attacks || [];
  const sourceId = pokemon.sourceId ?? pokemon.id;
  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Edition Pokemon</p>
        <h2>${escapeHtml(pokemon.name)}</h2>
      </div>
      <button class="small-button" type="button" data-cancel-pokemon-edit>Fermer</button>
    </div>
    <div class="team-form">
      <label class="field">
        <span>Nom</span>
        <input id="edit-pokemon-name" type="text" maxlength="32" value="${escapeHtml(pokemon.name)}">
      </label>
      <div class="picker-grid">
        <label class="field">
          <span>Type 1</span>
          <select id="edit-pokemon-type-one">${typeOptions(pokemon.types[0])}</select>
        </label>
        <label class="field">
          <span>Type 2 optionnel</span>
          <select id="edit-pokemon-type-two">${typeOptions(pokemon.types[1], true)}</select>
        </label>
      </div>
      ${includeAttacks ? `<fieldset class="attack-picker">
        <legend>
          <span>Types d'attaque</span>
          <strong id="edit-attack-count">${attacks.length}/4</strong>
        </legend>
        <div class="type-checks">
          ${KANTO_TYPES.map((type) => `
            <label class="type-check">
              <input class="edit-attack-input" type="checkbox" value="${type}" ${attacks.includes(type) ? "checked" : ""}>
              ${typeBadge(type)}
            </label>
          `).join("")}
        </div>
      </fieldset>` : ""}
      <div class="form-actions">
        <button class="primary-button confirm" type="button" data-save-pokemon-edit="${sourceId}">Mettre a jour partout</button>
      </div>
    </div>
  `;

  enhanceTypeSelects(panel);

  panel.querySelector("[data-cancel-pokemon-edit]").addEventListener("click", () => {
    panel.classList.add("hidden");
    panel.innerHTML = "";
  });

  panel.querySelectorAll(".edit-attack-input").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = getEditAttackTypes(panel);
      if (selected.length > 4) {
        input.checked = false;
        alert("Un Pokemon peut avoir au maximum 4 types d'attaque.");
      }
      updateEditAttackCount(panel);
    });
  });

  panel.querySelector("[data-save-pokemon-edit]").addEventListener("click", (event) => {
    savePokemonEdit(event.currentTarget.dataset.savePokemonEdit, panel, includeAttacks);
  });
}

async function shareActiveTeam() {
  const team = getActiveTeam();
  if (!team) return;
  closeShareMenu();
  const url = createTeamShareLink(team);
  const title = `KantoTeam - ${team.name || "Equipe Pokemon"}`;
  const text = `Consulte mon equipe Pokemon sur KantoTeam : ${team.name || "Equipe Pokemon"}`;

  if (navigator.share) {
    try {
      const logo = await getShareLogoFile();
      const shareData = logo && navigator.canShare?.({ files: [logo] })
        ? { title, text, url, files: [logo] }
        : { title, text, url };
      await navigator.share(shareData);
      return;
    } catch {
      // Annulation utilisateur ou partage indisponible : fallback copie.
    }
  }

  await copyText(url);
  setTemporaryButtonText(el.shareTeam, "Lien copie");
}

async function getShareLogoFile() {
  try {
    const response = await fetch("assets/share-pokeball.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return new File([blob], "kantoteam-partage.png", { type: "image/png" });
  } catch {
    return null;
  }
}

async function copyActiveTeamLink() {
  const team = getActiveTeam();
  if (!team) return;
  closeShareMenu();
  await copyText(createTeamShareLink(team));
  setTemporaryButtonText(el.copyShareLink, "Copie");
}

function openMessageShare(target) {
  const team = getActiveTeam();
  if (!team) return;
  closeShareMenu();
  const url = createTeamShareLink(team);
  const message = `Consulte mon equipe Pokemon sur KantoTeam : ${team.name || "Equipe Pokemon"} ${url}`;
  const href = target === "whatsapp"
    ? `https://wa.me/?text=${encodeURIComponent(message)}`
    : `sms:?body=${encodeURIComponent(message)}`;
  window.open(href, "_blank", "noopener");
}

function toggleShareMenu(event) {
  event?.stopPropagation?.();
  const open = el.shareMenu.classList.toggle("hidden");
  el.shareMenuToggle.setAttribute("aria-expanded", String(!open));
}

function closeShareMenu() {
  el.shareMenu.classList.add("hidden");
  el.shareMenuToggle.setAttribute("aria-expanded", "false");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Le presse-papiers peut etre bloque en file:// ou hors contexte securise.
    }
  }
  window.prompt("Copie ce lien :", text);
}

function setTemporaryButtonText(button, text) {
  const previous = button.textContent;
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = previous;
  }, 1400);
}

function typeOptions(selected, optional = false) {
  return [
    optional ? `<option value="">Aucun</option>` : "",
    ...KANTO_TYPES.map((type) => `<option value="${type}" ${type === selected ? "selected" : ""}>${type}</option>`)
  ].join("");
}

function getEditAttackTypes(panel = el.pokemonEditPanel) {
  return Array.from(panel.querySelectorAll(".edit-attack-input:checked")).map((input) => input.value);
}

function updateEditAttackCount(panel = el.pokemonEditPanel) {
  const count = panel.querySelector("#edit-attack-count");
  if (count) count.textContent = `${getEditAttackTypes(panel).length}/4`;
}

function savePokemonEdit(sourceId, panel = el.pokemonEditPanel, includeAttacks = true) {
  const name = panel.querySelector("#edit-pokemon-name").value.trim();
  const typeOne = panel.querySelector("#edit-pokemon-type-one").value;
  const typeTwo = panel.querySelector("#edit-pokemon-type-two").value;
  const attacks = includeAttacks ? getEditAttackTypes(panel) : undefined;

  if (!name) {
    alert("Donne un nom au Pokemon.");
    return;
  }

  if (includeAttacks && attacks.length > 4) {
    alert("Un Pokemon peut avoir au maximum 4 types d'attaque.");
    return;
  }

  const types = [typeOne, typeTwo].filter(Boolean).filter((type, index, all) => all.indexOf(type) === index);
  updatePokemonEverywhere(sourceId, { name, types, attacks });
  saveState();
  renderAll();
  const updatedPokemon = state.customPokemon.find((pokemon) => String(pokemon.id) === String(sourceId))
    || state.teams.filter(Boolean).flatMap((team) => team.pokemon).find((pokemon) => String(pokemon.sourceId) === String(sourceId));
  if (updatedPokemon) void syncPokemonSprites(updatedPokemon);
}

function updatePokemonEverywhere(sourceId, updates) {
  const sameSource = (value) => String(value) === String(sourceId);

  state.customPokemon = state.customPokemon.map((pokemon) => (
    sameSource(pokemon.id)
      ? {
          ...pokemon,
          name: updates.name,
          types: updates.types,
          attacks: updates.attacks ?? pokemon.attacks ?? [],
          nationalId: updates.nationalId ?? pokemon.nationalId ?? null
        }
      : pokemon
  ));

  state.teams = state.teams.map((team) => {
    if (!team) return team;
    return {
      ...team,
      pokemon: team.pokemon.map((pokemon) => (
        sameSource(pokemon.sourceId)
          ? {
              ...pokemon,
              name: updates.name,
              types: updates.types,
              attacks: updates.attacks ?? pokemon.attacks,
              nationalId: updates.nationalId ?? pokemon.nationalId ?? null
            }
          : pokemon
      ))
    };
  });

  draftTeam = state.teams[state.selectedSlot] ? structuredClone(state.teams[state.selectedSlot]) : createEmptyTeam(state.selectedSlot);
  el.teamName.value = draftTeam.name || "";
}

function syncAttackChecksFromCurrentSelection() {
  if (el.addMode.value === "official") {
    const pokemon = KANTO_POKEMON.find((item) => item.id === Number(el.officialSelect.value));
    el.attackTypes.querySelectorAll("input").forEach((input) => {
      input.checked = pokemon?.types.includes(input.value) || false;
    });
    updateAttackCount();
    return;
  }

  if (el.addMode.value === "reforged") {
    const pokemon = KANTO_REFORGED_POKEMON.find((item) => item.id === el.reforgedSelect.value);
    el.attackTypes.querySelectorAll("input").forEach((input) => {
      input.checked = pokemon?.types.includes(input.value) || false;
    });
    updateAttackCount();
    return;
  }

  if (el.addMode.value !== "saved") {
    clearAttackTypes();
    return;
  }

  const saved = state.customPokemon.find((pokemon) => String(pokemon.id) === String(el.savedCustomSelect.value));
  const attacks = saved?.attacks || [];
  el.attackTypes.querySelectorAll("input").forEach((input) => {
    input.checked = attacks.includes(input.value);
  });
  updateAttackCount();
}

function confirmTeam() {
  const name = el.teamName.value.trim();
  if (!name) {
    alert("Donne un nom a l'equipe.");
    return;
  }

  if (!draftTeam.pokemon.length) {
    alert("Ajoute au moins un Pokemon avant de confirmer.");
    return;
  }

  draftTeam.name = name;
  draftTeam.preferredSource = (el.addMode.value === "official" || el.addMode.value === "reforged")
    ? el.addMode.value
    : getTeamPreferredSource(draftTeam);
  draftTeam.updatedAt = new Date().toISOString();
  state.teams[state.selectedSlot] = structuredClone(draftTeam);
  state.activeView = "analysis";
  saveState();
  renderAll();
  void syncAppSprites(draftTeam.pokemon).then(renderAll);
}

function renderAnalysis(team) {
  el.analysisTitle.textContent = team ? `${team.name}${sharedTeam ? " · lien partage" : ""}` : "Aucune equipe confirmee";
  el.teamCount.textContent = team ? `${team.pokemon.length}/6` : "0/6";
  el.analysisToComposition.disabled = !team;
  el.analysisEmpty.classList.toggle("hidden", Boolean(team));
  el.analysisContent.classList.toggle("hidden", !team);
  el.typeMatchupResults.className = "type-matchup-results empty-state";
  el.typeMatchupResults.innerHTML = "Choisis un ou deux types pour classer les attaquants et les resistances de ton equipe.";

  if (!team) return;

  const analysis = analyzeTeam(team);
  el.threatTable.innerHTML = renderScoreRows(analysis.threats, "threat", "Aucune menace majeure");
  el.advantageTable.innerHTML = renderScoreRows(analysis.advantages, "advantage", "Aucune resistance marquee");
  renderScoreDetail(analysis, "threat", analysis.threats[0]?.type);
  renderScoreDetail(analysis, "advantage", analysis.advantages[0]?.type);
  el.offenseSummary.innerHTML = analysis.coveredTypes.length
    ? analysis.coveredTypes.map((type, index) => typeButton(type, index === 0)).join("")
    : `<span class="slot-meta">Aucune attaque renseignee</span>`;
  renderOffenseDetail(analysis, analysis.coveredTypes[0]);
  el.adviceList.innerHTML = analysis.advice.map((text) => `<div class="advice">${text}</div>`).join("");

  bindScoreButtons(analysis, "threat");
  bindScoreButtons(analysis, "advantage");

  el.offenseSummary.querySelectorAll("[data-covered-type]").forEach((button) => {
    button.addEventListener("click", () => {
      el.offenseSummary.querySelectorAll("[data-covered-type]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderOffenseDetail(analysis, button.dataset.coveredType);
    });
  });
}

function analyzePokemonDefense(types) {
  return KANTO_TYPES.map((attackType) => ({
    type: attackType,
    multiplier: types.reduce((value, defenderType) => value * getEffectiveness(attackType, defenderType), 1)
  }));
}

function getEffectiveness(attackType, defenderType) {
  return ATTACK_CHART[attackType]?.[defenderType] ?? 1;
}

function analyzeTeam(team) {
  const defensiveRows = KANTO_TYPES.map((type) => {
    let score = 0;
    let weak = 0;
    let veryWeak = 0;
    let resist = 0;
    let immune = 0;

    const members = team.pokemon.map((pokemon) => {
      const multiplier = pokemon.types.reduce((value, defenderType) => value * getEffectiveness(type, defenderType), 1);
      if (multiplier >= 4) {
        score += 2;
        veryWeak += 1;
      } else if (multiplier > 1) {
        score += 1;
        weak += 1;
      } else if (multiplier === 0) {
        score -= 2;
        immune += 1;
      } else if (multiplier < 1) {
        score -= 1;
        resist += 1;
      }
      return { pokemon: pokemon.name, multiplier };
    });

    return { type, score, weak, veryWeak, resist, immune, members };
  });

  const threats = defensiveRows
    .filter((row) => row.score > 0 || row.veryWeak > 0)
    .sort((a, b) => b.score - a.score || b.veryWeak - a.veryWeak || b.weak - a.weak)
    .slice(0, 6);

  const advantages = defensiveRows
    .filter((row) => row.score < 0)
    .sort((a, b) => a.score - b.score || b.immune - a.immune || b.resist - a.resist)
    .slice(0, 6);

  const attackCounts = countAttacks(team);
  const offensiveDetails = getOffensiveDetails(team);
  const coveredTypes = Object.keys(offensiveDetails).sort((a, b) => KANTO_TYPES.indexOf(a) - KANTO_TYPES.indexOf(b));
  const uncoveredTypes = KANTO_TYPES.filter((type) => !coveredTypes.includes(type));
  const overusedAttacks = Object.entries(attackCounts).filter(([, count]) => count >= 3).map(([type]) => type);
  const advice = buildAdvice(threats, uncoveredTypes, overusedAttacks, team);

  return { threats, advantages, coveredTypes, uncoveredTypes, overusedAttacks, offensiveDetails, advice };
}

function countAttacks(team) {
  return team.pokemon.reduce((acc, pokemon) => {
    pokemon.attacks.forEach((type) => {
      acc[type] = (acc[type] || 0) + 1;
    });
    return acc;
  }, {});
}

function getCoveredDefenderTypes(attackTypes) {
  const covered = new Set();
  attackTypes.forEach((attackType) => {
    KANTO_TYPES.forEach((defenderType) => {
      if (getEffectiveness(attackType, defenderType) > 1) covered.add(defenderType);
    });
  });
  return Array.from(covered).sort((a, b) => KANTO_TYPES.indexOf(a) - KANTO_TYPES.indexOf(b));
}

function getOffensiveDetails(team) {
  return team.pokemon.reduce((details, pokemon) => {
    pokemon.attacks.forEach((attackType) => {
      KANTO_TYPES.forEach((defenderType) => {
        const multiplier = getEffectiveness(attackType, defenderType);
        if (multiplier <= 1) return;
        if (!details[defenderType]) details[defenderType] = [];
        const defensiveRisk = pokemon.types.reduce((value, pokemonType) => value * getEffectiveness(defenderType, pokemonType), 1);
        details[defenderType].push({
          pokemon: pokemon.name,
          attackType,
          multiplier,
          defensiveRisk
        });
      });
    });
    return details;
  }, {});
}

function renderOffenseDetail(analysis, defenderType) {
  if (!defenderType || !analysis.offensiveDetails[defenderType]) {
    el.offenseDetail.className = "offense-detail empty-state";
    el.offenseDetail.innerHTML = "Aucune attaque super efficace renseignee.";
    return;
  }

  const rows = analysis.offensiveDetails[defenderType]
    .sort((a, b) => b.multiplier - a.multiplier || a.pokemon.localeCompare(b.pokemon))
    .map((item) => `
      <div class="offense-row">
        <strong>${escapeHtml(item.pokemon)}</strong>
        <span class="offense-hit">
          ${typeBadge(item.attackType)}
          <span class="multiplier weak">${formatMultiplierLabel(item.multiplier)}</span>
          ${renderCoverageWarning(defenderType, item)}
        </span>
      </div>
    `).join("");

  el.offenseDetail.className = "offense-detail";
  el.offenseDetail.innerHTML = `
    <div class="offense-detail-heading">
      <span class="slot-meta">Contre</span>
      ${typeBadge(defenderType)}
    </div>
    <div class="offense-rows">${rows}</div>
  `;
}

function renderCoverageWarning(defenderType, item) {
  if (item.defensiveRisk <= 1) return "";
  return `<span class="risk-warning">Attention : ${escapeHtml(item.pokemon)} menace ${defenderType}, mais subit ${formatMultiplierLabel(item.defensiveRisk)} contre ${defenderType}.</span>`;
}

async function renderTypeMatchupAnalysis(loadSprites = true) {
  const team = state.teams[state.selectedSlot];
  if (!team?.pokemon.length) {
    el.typeMatchupResults.className = "type-matchup-results empty-state";
    el.typeMatchupResults.innerHTML = "Aucun Pokemon disponible dans cette equipe.";
    return;
  }

  const targetTypes = [el.typeMatchupOne.value, el.typeMatchupTwo.value]
    .filter(Boolean)
    .filter((type, index, all) => all.indexOf(type) === index);
  const defensiveRanking = team.pokemon
    .map((pokemon) => {
      const received = targetTypes.map((attackType) => ({
        type: attackType,
        multiplier: pokemon.types.reduce((value, pokemonType) => value * getEffectiveness(attackType, pokemonType), 1)
      }));
      return {
        pokemon,
        received,
        worstMultiplier: Math.max(...received.map((item) => item.multiplier)),
        totalMultiplier: received.reduce((sum, item) => sum + item.multiplier, 0),
        immunityCount: received.filter((item) => item.multiplier === 0).length,
        resistanceCount: received.filter((item) => item.multiplier > 0 && item.multiplier < 1).length
      };
    })
    .sort((a, b) => (
      a.worstMultiplier - b.worstMultiplier
      || a.totalMultiplier - b.totalMultiplier
      || b.immunityCount - a.immunityCount
      || b.resistanceCount - a.resistanceCount
      || a.pokemon.name.localeCompare(b.pokemon.name)
    ));
  const offensiveRanking = team.pokemon
    .map((pokemon) => {
      const attacks = (pokemon.attacks || [])
        .map((attackType) => ({
          type: attackType,
          multiplier: targetTypes.reduce((value, targetType) => value * getEffectiveness(attackType, targetType), 1)
        }))
        .sort((a, b) => b.multiplier - a.multiplier);
      return { pokemon, bestAttack: attacks[0] || null };
    })
    .sort((a, b) => (
      (b.bestAttack?.multiplier ?? -1) - (a.bestAttack?.multiplier ?? -1)
      || a.pokemon.name.localeCompare(b.pokemon.name)
    ));

  el.typeMatchupResults.className = "type-matchup-results";
  el.typeMatchupResults.innerHTML = `
    <div class="type-matchup-summary">
      <span class="slot-meta">Profil teste</span>
      <div class="mini-line">${targetTypes.map(typeBadge).join("")}</div>
    </div>
    <div class="type-ranking-grid">
      <section class="type-ranking-column">
        <div class="type-ranking-title">
          <span class="ranking-icon defense">D</span>
          <div><span class="choice-kicker">Defense</span><h3>Meilleurs resistants</h3></div>
        </div>
        <div class="type-ranking-list">
          ${defensiveRanking.map((item, index) => renderDefensiveRankingRow(item, index)).join("")}
        </div>
      </section>
      <section class="type-ranking-column">
        <div class="type-ranking-title">
          <span class="ranking-icon offense">A</span>
          <div><span class="choice-kicker">Attaque</span><h3>Meilleurs attaquants</h3></div>
        </div>
        <div class="type-ranking-list">
          ${offensiveRanking.map((item, index) => renderOffensiveRankingRow(item, index)).join("")}
        </div>
      </section>
    </div>
  `;

  if (loadSprites && navigator.onLine) {
    const previousSpriteCount = spriteUrls.size;
    await syncPokemonSprites(team.pokemon);
    if (spriteUrls.size > previousSpriteCount && state.teams[state.selectedSlot] === team) {
      await renderTypeMatchupAnalysis(false);
    }
  }
}

function renderRankingSprite(pokemon) {
  if (!spritesEnabled || !navigator.onLine) return "";
  const nationalId = getPokemonNationalId(pokemon);
  const url = nationalId ? spriteUrls.get(nationalId) : null;
  if (!url) return "";
  return `<img class="ranking-sprite" src="${escapeHtml(url)}" alt="${escapeHtml(pokemon.name)}" title="${escapeHtml(pokemon.name)}" onerror="this.parentElement.classList.remove('has-sprite');this.remove()">`;
}

function renderDefensiveRankingRow(item, index) {
  const kind = item.worstMultiplier === 0 ? "immune" : item.worstMultiplier < 1 ? "resist" : item.worstMultiplier > 1 ? "weak" : "";
  const sprite = renderRankingSprite(item.pokemon);
  return `
    <div class="type-ranking-row ${index === 0 ? "best" : ""}">
      <span class="ranking-position">${index + 1}</span>
      <div class="ranking-pokemon ${sprite ? "has-sprite" : ""}">
        ${sprite}
        <strong>${escapeHtml(item.pokemon.name)}</strong>
        <span class="ranking-detail">${item.received.map((entry) => `${typeLogo(entry.type)} ${formatMultiplierLabel(entry.multiplier)}`).join(" · ")}</span>
      </div>
      <span class="multiplier ${kind}">${formatMultiplierLabel(item.worstMultiplier)}</span>
    </div>
  `;
}

function renderOffensiveRankingRow(item, index) {
  const attack = item.bestAttack;
  const kind = attack?.multiplier > 1 ? "weak" : attack?.multiplier === 0 ? "immune" : "";
  const sprite = renderRankingSprite(item.pokemon);
  return `
    <div class="type-ranking-row ${index === 0 && attack ? "best" : ""} ${attack ? "" : "unavailable-choice"}">
      <span class="ranking-position">${index + 1}</span>
      <div class="ranking-pokemon ${sprite ? "has-sprite" : ""}">
        ${sprite}
        <strong>${escapeHtml(item.pokemon.name)}</strong>
        <span class="ranking-detail">${attack ? `${typeLogo(attack.type)} ${attack.type}` : "Aucune attaque renseignee"}</span>
      </div>
      <span class="multiplier ${kind}">${attack ? formatMultiplierLabel(attack.multiplier) : "?"}</span>
    </div>
  `;
}

function buildAdvice(threats, uncoveredTypes, overusedAttacks, team) {
  const advice = [];

  if (threats.length) {
    const main = threats[0];
    advice.push(`Defense : le type ${main.type} est la menace principale avec un score ${main.score}. ${main.veryWeak ? `${main.veryWeak} Pokemon prend x4.` : `${main.weak} Pokemon prend x2.`}`);
    const candidates = KANTO_TYPES.filter((type) => getEffectiveness(main.type, type) < 1);
    if (candidates.length) {
      advice.push(`Defense : cherche une resistance ou immunite contre ${main.type}. Types utiles : ${candidates.slice(0, 5).join(", ")}.`);
    }
  } else {
    advice.push("Defense : aucune faiblesse globale importante ne ressort pour le moment.");
  }

  if (uncoveredTypes.length) {
    advice.push(`Attaque : la couverture ne touche pas encore efficacement ${uncoveredTypes.slice(0, 6).join(", ")}${uncoveredTypes.length > 6 ? "..." : ""}.`);
  } else {
    advice.push("Attaque : les types d'attaque renseignes couvrent tous les types adverses au moins une fois.");
  }

  if (overusedAttacks.length) {
    advice.push(`Attaque : ${overusedAttacks.join(", ")} est tres present. Remplacer un doublon peut ameliorer la couverture.`);
  }

  if (team.pokemon.length < 6) {
    advice.push(`Equipe : il reste ${6 - team.pokemon.length} place(s), tu peux ajouter un Pokemon pour corriger les manques.`);
  }

  return advice;
}

function bindScoreButtons(analysis, kind) {
  const table = kind === "threat" ? el.threatTable : el.advantageTable;
  table.querySelectorAll("[data-score-type]").forEach((button) => {
    button.addEventListener("click", () => {
      table.querySelectorAll("[data-score-type]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderScoreDetail(analysis, kind, button.dataset.scoreType);
    });
  });
}

function renderScoreDetail(analysis, kind, type) {
  const detail = kind === "threat" ? el.threatDetail : el.advantageDetail;
  const source = kind === "threat" ? analysis.threats : analysis.advantages;
  const row = source.find((item) => item.type === type);

  if (!row) {
    detail.className = "score-detail empty-state";
    detail.innerHTML = kind === "threat" ? "Aucune menace majeure." : "Aucune resistance marquee.";
    return;
  }

  const members = row.members
    .filter((member) => kind === "threat" ? member.multiplier > 1 : member.multiplier < 1)
    .sort((a, b) => kind === "threat" ? b.multiplier - a.multiplier : a.multiplier - b.multiplier);

  detail.className = "score-detail";
  detail.innerHTML = `
    <div class="offense-detail-heading">
      <span class="slot-meta">${kind === "threat" ? "Menace" : "Resistance"}</span>
      ${typeBadge(row.type)}
    </div>
    <div class="offense-rows">
      ${members.map((member) => `
        <div class="offense-row">
          <strong>${escapeHtml(member.pokemon)}</strong>
          <span class="multiplier ${member.multiplier === 0 ? "immune" : member.multiplier > 1 ? "weak" : "resist"}">${formatMultiplierLabel(member.multiplier)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderScoreRows(rows, kind, emptyText) {
  if (!rows.length) return `<div class="empty-state">${emptyText}</div>`;
  return rows.map((row, index) => `
    <button class="score-row ${index === 0 ? "active" : ""} ${kind}" style="${scoreStyle(row, kind)}" type="button" data-score-kind="${kind}" data-score-type="${row.type}">
      ${typeLogoOnly(row.type)}
      <span class="score-value">${row.score > 0 ? "+" : ""}${row.score}</span>
    </button>
  `).join("");
}

function renderMultiplierList(items) {
  if (!items.length) return `<span class="slot-meta">Aucune</span>`;
  return items.map((item) => {
    const kind = item.multiplier === 0 ? "immune" : item.multiplier > 1 ? "weak" : "resist";
    return `<span class="multiplier ${kind}" title="${item.type}">${typeLogo(item.type)} ${formatMultiplierLabel(item.multiplier)}</span>`;
  }).join("");
}

function typeBadge(type) {
  const color = TYPE_COLORS[type] || "#a9b3c3";
  const icon = TYPE_ICONS[type] || "#";
  const logo = TYPE_LOGOS[type];
  const media = logo
    ? `<img class="type-logo" src="${logo}" alt="" aria-hidden="true">`
    : `<span aria-hidden="true">${icon}</span>`;
  return `<span class="type-badge" style="background:${color}">${media}<span>${type}</span></span>`;
}

function typeButton(type, active) {
  return `<button class="type-button ${active ? "active" : ""}" type="button" data-covered-type="${type}">${typeBadge(type)}</button>`;
}

function typeLogo(type) {
  const icon = TYPE_ICONS[type] || "#";
  const logo = TYPE_LOGOS[type];
  return logo
    ? `<img class="type-logo" src="${logo}" alt="${type}">`
    : `<span aria-label="${type}">${icon}</span>`;
}

function typeLogoOnly(type) {
  return `<span class="type-logo-only" title="${type}">${typeLogo(type)}</span>`;
}

function scoreStyle(row, kind) {
  const ratio = Math.min(1, Math.abs(row.score) / 6);
  if (kind === "threat") {
    const lightness = 88 - ratio * 54;
    const saturation = 82 + ratio * 18;
    const text = ratio > 0.34 ? "#ffffff" : "#16181d";
    return `--score-bg:hsl(0 ${saturation}% ${lightness}%);--score-fg:${text};`;
  }

  const hue = 135 + ratio * 90;
  const lightness = 78 - ratio * 42;
  const saturation = 72 + ratio * 22;
  const text = ratio > 0.42 ? "#ffffff" : "#101217";
  return `--score-bg:hsl(${hue} ${saturation}% ${lightness}%);--score-fg:${text};`;
}

function formatMultiplierLabel(value) {
  return value === 0 ? "immunisé" : `x${formatMultiplier(value)}`;
}

function formatMultiplier(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
