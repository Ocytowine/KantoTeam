const STORAGE_KEY = "kantoTeamState:v1";

const defaultState = {
  selectedSlot: 0,
  activeView: "slots",
  teams: [null, null, null],
  customPokemon: []
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

const mobileVersusMedia = window.matchMedia("(max-width: 920px)");
const spriteUrls = new Map();
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
  typeHelperPanel: document.querySelector("#type-helper-panel"),
  typeHelperCount: document.querySelector("#type-helper-count"),
  helperTypeOne: document.querySelector("#helper-type-one"),
  helperTypeTwo: document.querySelector("#helper-type-two"),
  helperSource: document.querySelector("#helper-source"),
  helperTargetBase: document.querySelector("#helper-target-base"),
  helperDefense: document.querySelector("#helper-defense"),
  helperOffense: document.querySelector("#helper-offense"),
  helperGridTitle: document.querySelector("#helper-grid-title"),
  helperMatchupGrid: document.querySelector("#helper-matchup-grid"),
  helperPokemonTitle: document.querySelector("#helper-pokemon-title"),
  helperPokemonList: document.querySelector("#helper-pokemon-list"),
  savedManagerPanel: document.querySelector("#saved-manager-panel"),
  savedPokemonList: document.querySelector("#saved-pokemon-list"),
  savedPokemonEditPanel: document.querySelector("#saved-pokemon-edit-panel"),
  compositionPanel: document.querySelector("#composition-panel"),
  compositionTitle: document.querySelector("#composition-title"),
  compositionCount: document.querySelector("#composition-count"),
  compositionList: document.querySelector("#composition-list"),
  compositionToAnalysis: document.querySelector("#composition-to-analysis"),
  pokemonEditPanel: document.querySelector("#pokemon-edit-panel"),
  simulationPanel: document.querySelector("#simulation-panel"),
  simulationTitle: document.querySelector("#simulation-title"),
  simulationCount: document.querySelector("#simulation-count"),
  versusAutoOpponent: document.querySelector("#versus-auto-opponent"),
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
  fillTypeSelect(el.helperTargetBase, false);
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
  [el.helperTypeOne, el.helperTypeTwo, el.helperSource, el.helperTargetBase].forEach((field) => {
    field.addEventListener("change", () => renderTypeHelper());
  });
  el.shareMenuToggle.addEventListener("click", toggleShareMenu);
  el.shareTeam.addEventListener("click", shareActiveTeam);
  el.copyShareLink.addEventListener("click", copyActiveTeamLink);
  el.shareWhatsapp.addEventListener("click", () => openMessageShare("whatsapp"));
  el.shareSms.addEventListener("click", () => openMessageShare("sms"));
  document.addEventListener("click", (event) => {
    if (el.shareActions.classList.contains("hidden")) return;
    if (el.shareActions.contains(event.target)) return;
    closeShareMenu();
  });
  window.addEventListener("online", () => {
    void syncAppSprites().then(renderAll);
  });
  window.addEventListener("offline", () => {
    spritesEnabled = false;
    spriteUrls.clear();
    renderComposition(state.teams[state.selectedSlot]);
  });
  el.compositionToAnalysis.addEventListener("click", () => openView("analysis"));
  el.analysisToComposition.addEventListener("click", () => openView("composition"));
  el.simulationConfirm.addEventListener("click", renderSimulationResults);
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
      teams: Array.isArray(stored.teams) ? [stored.teams[0] || null, stored.teams[1] || null, stored.teams[2] || null] : [null, null, null],
      customPokemon: Array.isArray(stored.customPokemon) ? stored.customPokemon : []
    };
  } catch {
    return structuredClone(defaultState);
  }
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
    if (payload?.v !== 1 || payload?.type !== "team") return null;
    return normalizeSharedTeam(payload.team);
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
    v: 1,
    type: "team",
    team: {
      name: team.name,
      preferredSource: getTeamPreferredSource(team),
      pokemon: team.pokemon.map((pokemon) => ({
        name: pokemon.name,
        types: pokemon.types,
        attacks: pokemon.attacks || [],
        nationalId: pokemon.nationalId || null,
        officialId: pokemon.officialId || null,
        reforgedId: pokemon.reforgedId || null,
        sourceId: pokemon.sourceId || null
      }))
    }
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
    pokemon: []
  };
}

function selectSlot(slot, view, preferredSource) {
  sharedTeam = null;
  if (simulationDraft.autoOpponent) {
    simulationDraft.autoOpponent = false;
    simulationDraft.showResults = false;
    el.versusAutoOpponent.checked = false;
  }
  state.selectedSlot = slot;
  state.activeView = view || (state.teams[slot] ? "analysis" : "editor");
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

function openView(view) {
  if (view === "slots") sharedTeam = null;
  state.activeView = view;
  if (!sharedTeam) saveState();
  renderAll();
}

function renderAll() {
  const activeTeam = getActiveTeam();
  renderSlots();
  renderActiveView();
  renderSavedPokemonManager();
  renderSavedCustomOptions();
  updateModeFields();
  renderDraftTeam();
  renderComposition(activeTeam);
  if (!sharedTeam) renderSimulation(state.teams[state.selectedSlot]);
  renderTypeHelper();
  renderPreview();
  renderAnalysis(activeTeam);
}

function getActiveTeam() {
  return sharedTeam || state.teams[state.selectedSlot];
}

function renderSlots() {
  el.slots.innerHTML = "";
  state.teams.forEach((team, index) => {
    const card = document.createElement("article");
    card.className = `slot-card ${team ? "" : "empty"} ${index === state.selectedSlot ? "active" : ""}`;
    const status = team ? `${team.pokemon.length}/6 Pokemon · ${preferredSourceLabel(getTeamPreferredSource(team))}` : "Slot vide";
    card.innerHTML = team ? `
      <span class="eyebrow">Slot ${index + 1}</span>
      <strong>${escapeHtml(team.name || `Equipe ${index + 1}`)}</strong>
      <span class="slot-meta">${status}</span>
      <div class="slot-actions">
        <button class="small-button" type="button" data-action="analysis" data-slot="${index}">Analyser</button>
        <button class="small-button" type="button" data-action="composition" data-slot="${index}">Composition</button>
        <button class="small-button" type="button" data-action="simulation" data-slot="${index}">Versus</button>
        <button class="small-button" type="button" data-action="edit" data-slot="${index}">Editer</button>
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
            <button class="small-button" type="button" data-action="edit" data-slot="${index}" data-version="official">Kanto</button>
            <button class="small-button" type="button" data-action="edit" data-slot="${index}" data-version="reforged">Reforged</button>
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
        simulation: "simulation",
        edit: "editor"
      };
      selectSlot(slot, actionToView[button.dataset.action] || "editor", button.dataset.version);
    });
  });
}

function renderActiveView() {
  const hasTeam = Boolean(getActiveTeam());
  const view = ["slots", "savedManager", "typeHelper"].includes(state.activeView) ? state.activeView : hasTeam ? state.activeView : "editor";
  el.slots.classList.toggle("hidden", view !== "slots");
  el.backToSlots.classList.toggle("hidden", view === "slots");
  el.manageSavedPokemon.classList.toggle("hidden", view !== "slots");
  el.openTypeHelper.classList.toggle("hidden", view !== "slots");
  el.savedManagerPanel.classList.toggle("hidden", view !== "savedManager");
  el.typeHelperPanel.classList.toggle("hidden", view !== "typeHelper");
  el.compositionPanel.classList.toggle("hidden", view !== "composition");
  el.simulationPanel.classList.toggle("hidden", view !== "simulation" || Boolean(sharedTeam));
  el.editorPanel.classList.toggle("hidden", view !== "editor" || Boolean(sharedTeam));
  el.analysisPanel.classList.toggle("hidden", view !== "analysis");
}

async function syncAppSprites(extraPokemon = []) {
  if (!navigator.onLine || spritesLoading) return;
  const extraList = Array.isArray(extraPokemon) ? extraPokemon : [extraPokemon];
  const pokemon = [
    ...state.teams.filter(Boolean).flatMap((team) => team.pokemon),
    ...state.customPokemon,
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

  saveState();
  renderSavedCustomOptions();
  renderDraftTeam();
  clearAttackTypes();
  if (el.addMode.value === "custom") el.customName.value = "";
  syncAttackChecksFromCurrentSelection();
  renderPreview();
  void syncPokemonSprites(savedPokemon || teamMember).then(() => {
    renderDraftTeam();
    renderPreview();
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
      if (pokemon) renderPokemonEditPanel(pokemon, el.pokemonEditPanel, true);
    });
  });
}

function savedPokemonOriginLabel(pokemon) {
  if (pokemon.origin === "reforged" || pokemon.reforgedId) return "Reforged";
  if (pokemon.origin === "official" || pokemon.officialId || pokemon.custom === false) return "Kanto";
  return "Personnalise";
}

function renderTypeHelper(selectedTypes = null) {
  const profileTypes = getHelperProfileTypes();
  const targetBase = el.helperTargetBase.value || KANTO_TYPES[0];
  const source = el.helperSource.value;
  const pokemonList = getHelperPokemonSource(source);
  const exactTypes = selectedTypes || profileTypes;
  const filteredPokemon = filterPokemonByTypes(pokemonList, exactTypes);

  el.typeHelperCount.textContent = `${pokemonList.length} Pokemon`;
  el.helperDefense.innerHTML = renderHelperDefense(profileTypes);
  el.helperOffense.innerHTML = renderHelperOffense(profileTypes);
  el.helperGridTitle.textContent = `Double types ${targetBase} / ...`;
  el.helperMatchupGrid.innerHTML = renderHelperMatchupGrid(profileTypes, targetBase, pokemonList);
  el.helperPokemonTitle.textContent = `Pokemon ${exactTypes.join(" / ")}`;
  el.helperPokemonList.innerHTML = renderHelperPokemonList(filteredPokemon, exactTypes);
  bindTypeHelperGrid(pokemonList);
  bindTypeHelperPokemonActions();
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
    <div class="helper-summary-row"><span class="slot-meta">Faiblesses</span>${renderMultiplierList(weak)}</div>
    <div class="helper-summary-row"><span class="slot-meta">Resistances</span>${renderMultiplierList(resist)}</div>
    <div class="helper-summary-row"><span class="slot-meta">Immunites</span>${renderMultiplierList(immune)}</div>
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
    <div class="helper-summary-row"><span class="slot-meta">Attaque fort</span>${renderMultiplierList(strong)}</div>
    <div class="helper-summary-row"><span class="slot-meta">Peu efficace</span>${renderMultiplierList(poor)}</div>
  `;
}

function renderHelperMatchupGrid(profileTypes, baseType, pokemonList) {
  const combos = [
    [baseType],
    ...KANTO_TYPES
      .filter((type) => type !== baseType)
      .map((type) => [baseType, type])
  ];

  return combos.map((types) => {
    const bestAttack = Math.max(...profileTypes.map((attackType) => (
      types.reduce((value, defenderType) => value * getEffectiveness(attackType, defenderType), 1)
    )));
    const received = profileTypes.reduce((sum, attackType) => (
      sum + types.reduce((value, defenderType) => value * getEffectiveness(attackType, defenderType), 1)
    ), 0);
    const matches = filterPokemonByTypes(pokemonList, types).length;
    const kind = bestAttack > 1 ? "weak" : bestAttack === 0 ? "immune" : bestAttack < 1 ? "resist" : "";
    return `
      <button class="type-helper-row" type="button" data-helper-types="${types.join("|")}">
        <span class="helper-type-combo">${types.map(typeBadge).join("")}</span>
        <span class="multiplier ${kind}">${formatMultiplierLabel(bestAttack)}</span>
        <span class="slot-meta">${matches} Pokemon</span>
      </button>
    `;
  }).join("");
}

function bindTypeHelperGrid(pokemonList) {
  el.helperMatchupGrid.querySelectorAll("[data-helper-types]").forEach((button) => {
    button.addEventListener("click", () => {
      const types = button.dataset.helperTypes.split("|").filter(Boolean);
      el.helperMatchupGrid.querySelectorAll("[data-helper-types]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      el.helperPokemonTitle.textContent = `Pokemon ${types.join(" / ")}`;
      el.helperPokemonList.innerHTML = renderHelperPokemonList(filterPokemonByTypes(pokemonList, types), types);
      bindTypeHelperPokemonActions();
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
      if (pokemon) renderPokemonEditPanel(pokemon, el.savedPokemonEditPanel, true);
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
    toggleable = true
  } = options;
  const defensive = analyzePokemonDefense(pokemon.types);
  const weaknesses = defensive.filter((item) => item.multiplier > 1);
  const resistances = defensive.filter((item) => item.multiplier > 0 && item.multiplier < 1);
  const immunities = defensive.filter((item) => item.multiplier === 0);
  const titlePrefix = index === null || index === undefined ? "" : `${index + 1}. `;
  const sourceId = pokemon.instanceId || pokemon.id || pokemon.sourceId || "";
  const attacks = pokemon.attacks || [];
  const actions = [
    savedId ? `<button class="small-button" type="button" data-edit-saved-pokemon="${savedId}">Editer</button>` : "",
    savedId ? `<button class="small-button danger" type="button" data-delete-saved-pokemon="${savedId}">Supprimer</button>` : "",
    editable ? `<button class="small-button" type="button" data-edit-pokemon="${pokemon.instanceId}">Editer</button>` : "",
    editable ? `<button class="small-button danger" type="button" data-remove-from-team="${pokemon.instanceId}">Enlever</button>` : "",
    removable ? `<button class="small-button danger" type="button" data-remove="${pokemon.instanceId}">Retirer</button>` : ""
  ].filter(Boolean).join("");

  const headingContent = `
    <span class="pokemon-heading-with-sprite">
      ${showSprite ? renderPokemonSprite(pokemon) : ""}
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
      ${heading}
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
}

function renderSimulation(team) {
  el.simulationTitle.textContent = team ? team.name : "Aucune equipe";
  const enemyCount = simulationDraft.enemies.filter(Boolean).length;
  const slotCount = 6;
  el.versusAutoOpponent.checked = simulationDraft.autoOpponent;
  el.versusAutoOpponent.disabled = !state.customPokemon.length;
  el.simulationCount.textContent = `${enemyCount}/6 adversaire${enemyCount > 1 ? "s" : ""}`;
  el.simulationEnemies.innerHTML = "";
  el.simulationMobile.innerHTML = "";
  const isMobile = mobileVersusMedia.matches;
  const enemyContainer = el.simulationMobile;

  for (let index = 0; index < slotCount; index += 1) {
    const enemy = simulationDraft.enemies[index];
    const card = document.createElement("article");
    if (isMobile) {
      card.className = `mobile-duel ${simulationDraft.editingIndex === index ? "editing" : ""}`;
      if (simulationDraft.editingIndex === index) {
        card.innerHTML = `
          <div class="mobile-duel-label"><span>Duel ${index + 1}</span><span>Edition adversaire</span></div>
          ${renderSimulationEnemyEditorMarkup(index, enemy || { types: ["Normal"], attacks: [] })}
        `;
      } else if (enemy) {
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
      card.className = `mobile-duel desktop-duel ${simulationDraft.editingIndex === index ? "editing" : ""}`;
      if (simulationDraft.editingIndex === index) {
        card.innerHTML = `
          <div class="mobile-duel-label"><span>Duel ${index + 1}</span><span>Edition adversaire</span></div>
          ${renderSimulationEnemyEditorMarkup(index, enemy || { types: ["Normal"], attacks: [] })}
        `;
      } else if (enemy) {
        card.innerHTML = renderDesktopDuel(team, enemy, index);
      } else {
        card.classList.add("empty");
        card.innerHTML = `<button class="mobile-duel-add" type="button" data-add-enemy="${index}"><img class="add-pokeball-icon" src="assets/add-pokeball.svg" alt="" aria-hidden="true"> Ajouter l'adversaire ${index + 1}</button>`;
      }
    }

    enemyContainer.append(card);
  }

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
            <span class="choice-kicker">${simulationDraft.autoOpponent ? "Choix sauvegarde" : "Choix de l'equipe"}</span>
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
  el.simulationEnemyEditor.classList.add("hidden");
  renderSimulation(state.teams[state.selectedSlot]);
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
  if (el.versusAutoOpponent.checked && !state.customPokemon.length) {
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
  return {
    pokemon: state.customPokemon.map((pokemon) => ({
      ...structuredClone(pokemon),
      sourceId: pokemon.id,
      attacks: pokemon.attacks || []
    }))
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
        <span class="choice-kicker">${simulationDraft.autoOpponent ? "Choix sauvegarde" : "Choix recommande"}</span>
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
        toggleable: false
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
      await navigator.share({ title, text, url });
      return;
    } catch {
      // Annulation utilisateur ou partage indisponible : fallback copie.
    }
  }

  await copyText(url);
  setTemporaryButtonText(el.shareTeam, "Lien copie");
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
    sameSource(pokemon.id) ? { ...pokemon, name: updates.name, types: updates.types, attacks: updates.attacks ?? pokemon.attacks ?? [] } : pokemon
  ));

  state.teams = state.teams.map((team) => {
    if (!team) return team;
    return {
      ...team,
      pokemon: team.pokemon.map((pokemon) => (
        sameSource(pokemon.sourceId)
          ? { ...pokemon, name: updates.name, types: updates.types, attacks: updates.attacks ?? pokemon.attacks }
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
