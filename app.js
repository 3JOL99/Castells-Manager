
"use strict";

const SAVE_KEY = "castellsManagerSaveV2";

const CASTLES = [
  { id: "p4", name: "Pilar de 4", people: 4, practice: 3, difficulty: 12, group: "Pilars", type: "pilar" },
  { id: "pd4", name: "Pilar de 4 amb folre", people: 12, practice: 8, difficulty: 40, group: "Pilars", type: "pilar" },
  { id: "3d6", name: "3 de 6", people: 18, practice: 5, difficulty: 20, group: "Castells bàsics", type: "castell" },
  { id: "4d6", name: "4 de 6", people: 20, practice: 5, difficulty: 18, group: "Castells bàsics", type: "castell" },
  { id: "5d6", name: "5 de 6", people: 28, practice: 9, difficulty: 36, group: "Castells bàsics", type: "castell" },
  { id: "3d6a", name: "3 de 6 amb agulla", people: 27, practice: 10, difficulty: 39, group: "Amb agulla", type: "castell" },
  { id: "4d6a", name: "4 de 6 amb agulla", people: 30, practice: 12, difficulty: 44, group: "Amb agulla", type: "castell" },
  { id: "3d7", name: "3 de 7", people: 45, practice: 18, difficulty: 55, group: "Castells de 7", type: "castell" },
  { id: "4d7", name: "4 de 7", people: 48, practice: 18, difficulty: 52, group: "Castells de 7", type: "castell" },
  { id: "5d7", name: "5 de 7", people: 65, practice: 25, difficulty: 68, group: "Castells de 7", type: "castell" },
  { id: "3d8", name: "3 de 8", people: 85, practice: 40, difficulty: 82, group: "Castells de 8", type: "castell" }
];

const RECRUITMENT = {
  flyers: { name: "Fullets i cartells", cost: 100, min: 1, max: 4, motivation: 1 },
  social: { name: "Campanya a les xarxes", cost: 180, min: 2, max: 6, motivation: 2 },
  open: { name: "Jornada de portes obertes", cost: 250, min: 3, max: 8, motivation: 4 }
};

const DEFAULT_STATE = {
  name: "La meva colla",
  town: "El teu poble",
  color: "#167DAD",
  shieldStyle: "split",
  shieldSymbol: "star",
  money: 1000,
  motivation: 60,
  reputation: 5,
  season: 1,
  day: 15,
  month: 5,
  practices: 0,
  seasonPractices: 0,
  seasonDiades: 0,
  people: 24,
  attendance: 24,
  pinya: 15,
  tronc: 6,
  canalla: 3,
  experience: 0,
  localLevel: 1,
  grantSeason: 0,
  workshopSeason: 0,
  castlesPracticed: {},
  castleResults: {},
  log: [],
  nextActivity: "practice",
  lastEvent: "La colla comença una nova etapa."
};

let state = loadState();
let selectedCastle = null;
let toastTimer = null;

function loadState() {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(saved);
    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  } catch (error) {
    console.warn("No s'ha pogut carregar la partida.", error);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("No s'ha pogut desar la partida.", error);
    toast("No s'ha pogut desar la partida en aquest navegador.");
  }
}

function money(value) {
  return Math.round(value).toLocaleString("ca-ES") + " €";
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function toast(message) {
  const element = document.getElementById("toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 3000);
}

function record(message) {
  state.lastEvent = message;
  state.log.unshift({
    season: state.season,
    day: state.day,
    month: state.month,
    message
  });
  state.log = state.log.slice(0, 25);
}

function totalPeople() {
  return state.pinya + state.tronc + state.canalla;
}

function availablePeople() {
  return Math.min(state.attendance, totalPeople());
}

function recalculateGroups() {
  // Distribució inicial orientativa: aproximadament 62%, 25% i 13%.
  const total = state.people;
  state.pinya = Math.round(total * 0.625);
  state.canalla = Math.max(0, Math.round(total * 0.125));
  state.tronc = Math.max(0, total - state.pinya - state.canalla);
  state.attendance = Math.min(state.attendance, total);
}

function seasonProgress() {
  return clamp(Math.round(
    (state.seasonPractices * 4 + state.seasonDiades * 12)
  ), 0, 100);
}

function rankingScore() {
  return Math.round(
    state.reputation * 3 +
    state.experience * 0.6 +
    state.people * 0.15 +
    state.seasonDiades * 2
  );
}

function mockRanking() {
  return [
    { name: "Minyons de la Vall", score: 96 },
    { name: "Castellers del Montseny", score: 80 },
    { name: "Colla Jove del Riu", score: 67 },
    { name: state.name, score: rankingScore(), you: true },
    { name: "Xics de la Plana", score: 37 },
    { name: "Torreons del Nord", score: 24 }
  ].sort((a, b) => b.score - a.score);
}

function rankingPosition() {
  return mockRanking().findIndex(item => item.you) + 1;
}

function shieldSymbol() {
  return ({
    star: "✦",
    tower: "♜",
    cross: "✚",
    flame: "♨",
    diamond: "◆",
    none: ""
  })[state.shieldSymbol] ?? "✦";
}

function shieldMarkup(extraClass = "") {
  const symbol = escapeHTML(shieldSymbol());
  return `<div class="shield ${extraClass}" style="--accent:${state.color}" aria-label="Escut de ${escapeHTML(state.name)}">${symbol}</div>`;
}

function applyTheme() {
  document.documentElement.style.setProperty("--accent", state.color);

  // Enfosqueix el color triat per fer contrast als botons.
  const hex = state.color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  if ([r, g, b].every(Number.isFinite)) {
    const darken = channel => Math.round(channel * 0.72);
    const dark = "#" + [darken(r), darken(g), darken(b)]
      .map(channel => channel.toString(16).padStart(2, "0")).join("");
    document.documentElement.style.setProperty("--accent-dark", dark);
  }

  document.querySelectorAll(".shield").forEach(element => {
    element.style.background = state.color;
    element.textContent = shieldSymbol();
  });

  const banner = document.getElementById("hallBanner");
  if (banner) {
    banner.style.background = state.color;
    banner.textContent = state.name.toLocaleUpperCase("ca");
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setBar(id, value) {
  const element = document.getElementById(id);
  if (element) element.style.width = clamp(value) + "%";
}

function render() {
  recalculateGroups();
  applyTheme();

  setText("headerName", state.name);
  setText("headerTown", `${state.town} · Temporada ${state.season}`);
  setText("motivationTop", state.motivation);
  setText("reputationTop", state.reputation);
  setText("rankingTop", "#" + rankingPosition());
  setText("seasonBadge", "Temporada " + state.season);

  setText("availableHero", state.people);
  setText("moneyHero", money(state.money));
  setText("practiceHero", state.seasonPractices);

  setText("teamName", state.name);
  setText("teamSubtitle", `Colla de ${state.town} · Temporada ${state.season}`);
  setText("totalPeople", state.people);
  setText("pinyaCount", state.pinya);
  setText("troncCount", state.tronc);
  setText("canallaCount", state.canalla);

  const donut = document.getElementById("teamDonut");
  if (donut) {
    const total = Math.max(1, totalPeople());
    const pinyaEnd = state.pinya / total * 100;
    const troncEnd = pinyaEnd + state.tronc / total * 100;
    donut.style.background =
      `conic-gradient(var(--accent) 0 ${pinyaEnd}%, var(--grey) ${pinyaEnd}% ${troncEnd}%, var(--red) ${troncEnd}% 100%)`;
  }

  setText("motivationValue", state.motivation + "/100");
  setText("reputationValue", state.reputation + "/100");
  setText("teamMotivation", state.motivation);
  setText("teamReputation", state.reputation);
  setBar("motivationBar", state.motivation);
  setBar("reputationBar", state.reputation);
  setBar("teamMotivationBar", state.motivation);
  setBar("teamReputationBar", state.reputation);

  setText("seasonProgressValue", seasonProgress() + "%");
  setBar("seasonProgressBar", seasonProgress());

  setText("attendanceCount", availablePeople());
  setText("castleAttendance", availablePeople());
  setText("attendanceSliderValue", state.attendance);
  setText("attendanceSlider", state.attendance);

  const attendanceSlider = document.getElementById("attendanceSlider");
  if (attendanceSlider) {
    attendanceSlider.max = state.people;
    attendanceSlider.value = state.attendance;
  }

  const nextTitle = state.lastEvent || "Assaig general";
  setText("nextEventTitle", nextTitle);
  setText("nextEventDescription", `Temporada ${state.season} · ${state.town}`);
  setText("nextDay", state.day);
  setText("nextMonth", ["GEN", "FEB", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OCT", "NOV", "DES"][state.month] || "JUN");

  renderCastles();
  renderCalendar();
  renderRanking();
  renderIdentityPreview();
  updateDiadaPreview();
}

function switchTab(tab) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === "page-" + tab);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function doPractice() {
  const attendees = availablePeople();

  if (attendees < 4) {
    toast("Calen almenys 4 persones presents per fer un assaig.");
    return;
  }

  // Els assajos no tenen cap cost monetari.
  state.practices++;
  state.seasonPractices++;
  state.experience += Math.max(1, Math.floor(attendees / 10));
  state.motivation = clamp(state.motivation + 3);
  state.lastEvent = "Assaig completat";
  record(`Assaig completat amb ${attendees} castellers. Cost: 0 €.`);
  saveState();
  render();
  toast(`Assaig fet amb ${attendees} persones. No ha costat diners.`);
}

function recruit(method) {
  const option = RECRUITMENT[method];
  if (!option) return;

  if (state.money < option.cost) {
    toast("No tens prou diners per pagar aquesta campanya.");
    return;
  }

  state.money -= option.cost;
  const gained = option.min + Math.floor(Math.random() * (option.max - option.min + 1));
  state.people += gained;
  state.attendance += gained;
  state.motivation = clamp(state.motivation + option.motivation);
  recalculateGroups();

  record(`${option.name}: s'han incorporat ${gained} castellers.`);
  saveState();
  render();
  toast(`${option.name}: +${gained} castellers per ${money(option.cost)}.`);
}

function doWorkshop() {
  if (state.workshopSeason >= 3) {
    toast("Ja has fet el màxim de 3 tallers d'empresa aquesta temporada.");
    return;
  }

  const attendees = availablePeople();
  if (attendees < 8) {
    toast("Calen almenys 8 persones disponibles per oferir un taller.");
    return;
  }

  const revenue = 250 + Math.min(attendees, 100) * 12;
  state.money += revenue;
  state.workshopSeason++;
  state.experience += 2;
  state.motivation = clamp(state.motivation + 2);
  record(`Taller d'empresa: ingressos de ${money(revenue)}.`);
  saveState();
  render();
  toast(`Taller completat. Has ingressat ${money(revenue)}.`);
}

function doGrant() {
  if (state.grantSeason === state.season) {
    toast("Ja has sol·licitat la subvenció municipal aquesta temporada.");
    return;
  }

  const grant = 350 + state.people * 8 + state.localLevel * 100;
  state.money += grant;
  state.grantSeason = state.season;
  record(`Subvenció municipal concedida: ${money(grant)}.`);
  saveState();
  render();
  toast(`Subvenció municipal: +${money(grant)}.`);
}

function successChance(castle, attendees = availablePeople()) {
  if (attendees < castle.people) return 0;

  const extraPeople = Math.min(20, attendees - castle.people);
  const practice = state.castlesPracticed[castle.id] || 0;
  const base = 78 - castle.difficulty * 0.55;
  const trainingBonus = Math.min(25, practice * 2.2);
  const experienceBonus = Math.min(12, state.experience * 0.15);
  const motivationBonus = (state.motivation - 50) * 0.12;
  const peopleBonus = extraPeople * 0.35;

  return Math.round(clamp(
    base + trainingBonus + experienceBonus + motivationBonus + peopleBonus,
    5,
    95
  ));
}

function renderCastles() {
  const container = document.getElementById("castlesList");
  if (!container) return;

  const groups = [...new Set(CASTLES.map(castle => castle.group))];
  container.innerHTML = groups.map(group => {
    const cards = CASTLES.filter(castle => castle.group === group).map(castle => {
      const attendees = availablePeople();
      const enoughPeople = attendees >= castle.people;
      const practice = state.castlesPracticed[castle.id] || 0;
      const chance = successChance(castle, attendees);
      const result = state.castleResults[castle.id] || 0;

      return `
        <article class="castle-card">
          <span class="eyebrow">${escapeHTML(group)}</span>
          <h3>${escapeHTML(castle.name)}</h3>
          <div class="castle-icon" aria-hidden="true">▥ ▥ ▥</div>
          <p class="requirement">Mínim orientatiu: ${castle.people} persones</p>
          <p>Assajos específics: ${practice}</p>
          <p>Èxits acumulats: ${result}</p>
          <div class="success-rate">${enoughPeople ? chance + "%" : "—"}</div>
          <p>${enoughPeople ? "Probabilitat estimada d'èxit" : `Et falten ${castle.people - attendees} persones`}</p>
          <button data-castle="${castle.id}">${enoughPeople ? "Veure castell" : "Falta gent"}</button>
        </article>`;
    }).join("");

    return `<div class="castle-group"><div class="section-heading"><h2>${escapeHTML(group)}</h2></div><div class="castle-list">${cards}</div></div>`;
  }).join("");
}

function openCastle(castleId) {
  const castle = CASTLES.find(item => item.id === castleId);
  if (!castle) return;
  selectedCastle = castle;

  const attendees = availablePeople();
  const enough = attendees >= castle.people;
  const chance = successChance(castle, attendees);
  const practice = state.castlesPracticed[castle.id] || 0;

  setText("castleDialogTitle", castle.name);
  document.getElementById("castleDialogBody").innerHTML = `
    <div class="panel">
      <p><strong>Persones necessàries:</strong> ${castle.people}</p>
      <p><strong>Assistents disponibles:</strong> ${attendees}</p>
      <p><strong>Assajos específics:</strong> ${practice}</p>
      <p><strong>Probabilitat estimada:</strong> ${enough ? chance + "%" : "No disponible"}</p>
      <p class="muted">Els mínims i percentatges són regles de joc provisionals, no dades oficials.</p>
    </div>`;

  const attemptButton = document.getElementById("attemptCastleButton");
  attemptButton.textContent = enough ? "Intentar aquest castell" : "Falta gent per intentar-lo";
  attemptButton.disabled = !enough;

  document.getElementById("castleDialog").showModal();
}

function attemptCastle() {
  if (!selectedCastle) return;

  const castle = selectedCastle;
  const attendees = availablePeople();

  if (attendees < castle.people) {
    toast(`Aquest castell necessita ${castle.people} persones presents.`);
    return;
  }

  const chance = successChance(castle, attendees);
  const success = Math.random() * 100 < chance;

  if (success) {
    state.castleResults[castle.id] = (state.castleResults[castle.id] || 0) + 1;
    state.reputation = clamp(state.reputation + Math.max(1, Math.round(castle.difficulty / 18)));
    state.experience += Math.max(1, Math.round(castle.difficulty / 10));
    state.motivation = clamp(state.motivation + 5);
    state.lastEvent = `Èxit: ${castle.name}`;
    record(`Èxit a l'assaig: ${castle.name}.`);
    toast(`Molt bé! Heu completat ${castle.name}.`);
  } else {
    state.motivation = clamp(state.motivation - 4);
    state.lastEvent = `Intent fallit: ${castle.name}`;
    record(`Intent fallit de ${castle.name}.`);
    toast(`No ha pujat ${castle.name}. Cal continuar assajant.`);
  }

  state.castlesPracticed[castle.id] = (state.castlesPracticed[castle.id] || 0) + 1;
  state.experience += 1;
  saveState();
  render();

  document.getElementById("castleDialog").close();
  selectedCastle = null;
}

function travelCost(distance) {
  // Estimació simplificada: cost fix de sortida + cost per quilòmetre.
  return Math.round(35 + Math.max(0, distance) * 1.6);
}

function updateDiadaPreview() {
  const input = document.getElementById("diadaDistance");
  if (!input) return;
  const distance = clamp(Number(input.value) || 0, 0, 500);
  setText("diadaCostPreview", `Cost estimat del viatge: ${money(travelCost(distance))}`);
}

function performDiada() {
  if (availablePeople() < 8) {
    toast("Calen almenys 8 castellers disponibles per participar en una diada.");
    return;
  }

  const distance = clamp(Number(document.getElementById("diadaDistance").value) || 0, 0, 500);
  const type = document.getElementById("diadaType").value;
  const travel = travelCost(distance);
  const organisation = type === "far" ? 100 : type === "near" ? 50 : 20;
  const totalCost = travel + organisation;

  if (state.money < totalCost) {
    toast(`No tens prou diners. Necessites ${money(totalCost)}.`);
    return;
  }

  state.money -= totalCost;
  state.seasonDiades++;
  state.reputation = clamp(state.reputation + 4);
  state.experience += 5;
  state.motivation = clamp(state.motivation + 5);
  state.lastEvent = "Diada completada";
  record(`Diada completada. Desplaçament: ${money(travel)}; organització: ${money(organisation)}.`);
  saveState();
  render();
  toast(`Diada completada. Cost total: ${money(totalCost)}.`);
}

function renderCalendar() {
  const container = document.getElementById("calendarList");
  if (!container) return;

  const items = [
    { day: state.day, month: "JUN", name: "Assaig general", desc: "Preparació de la colla", cost: "0 €" },
    { day: Math.min(28, state.day + 4), month: "JUN", name: "Assaig de castells", desc: "Treball tècnic i coordinació", cost: "0 €" },
    { day: Math.min(30, state.day + 10), month: "JUN", name: "Diada castellera", desc: "Actuació i reputació", cost: "Cost de viatge" }
  ];

  container.innerHTML = items.map(item => `
    <div class="calendar-item">
      <div class="date-tile"><strong>${item.day}</strong><span>${item.month}</span></div>
      <div><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.desc)}</small></div>
      <b>${escapeHTML(item.cost)}</b>
    </div>`).join("");
}

function renderRanking() {
  const list = mockRanking();
  const position = list.findIndex(item => item.you) + 1;
  setText("rankingPosition", "#" + position);
  setText("rankingDescription", `Puntuació: ${rankingScore()} punts · Temporada ${state.season}`);

  const container = document.getElementById("rankingList");
  if (!container) return;

  container.innerHTML = list.map((item, index) => `
    <div class="ranking-item ${item.you ? "you" : ""}">
      <div class="rank-number">${index + 1}</div>
      <div><strong>${escapeHTML(item.name)}${item.you ? " (Tu)" : ""}</strong><small>${item.you ? state.people + " castellers" : "Colla fictícia"}</small></div>
      <strong>${item.score}</strong>
    </div>`).join("");
}

function renderIdentityPreview() {
  setText("previewName", state.name);
  setText("previewTown", state.town);

  const nameInput = document.getElementById("collaNameInput");
  const townInput = document.getElementById("townInput");
  const colorInput = document.getElementById("shirtColorInput");
  const styleInput = document.getElementById("shieldStyleInput");
  const symbolInput = document.getElementById("shieldSymbolInput");

  if (nameInput && document.activeElement !== nameInput) nameInput.value = state.name;
  if (townInput && document.activeElement !== townInput) townInput.value = state.town;
  if (colorInput) colorInput.value = state.color;
  if (styleInput) styleInput.value = state.shieldStyle;
  if (symbolInput) symbolInput.value = state.shieldSymbol;

  document.querySelectorAll(".color-choice").forEach(button => {
    button.classList.toggle("selected", button.dataset.color.toLowerCase() === state.color.toLowerCase());
  });

  ["headerShield", "teamShield", "previewShield"].forEach(id => {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = shieldSymbol();
    element.style.background = state.color;

    if (state.shieldStyle === "stripes") {
      element.style.background = `repeating-linear-gradient(90deg,${state.color} 0 15px,#fff 15px 23px)`;
    } else if (state.shieldStyle === "horizontal") {
      element.style.background = `linear-gradient(180deg,${state.color} 0 50%,#fff 50% 100%)`;
    } else if (state.shieldStyle === "solid") {
      element.style.background = state.color;
    } else {
      element.style.background = `linear-gradient(90deg,${state.color} 0 50%,#fff 50% 100%)`;
    }
  });
}

function saveIdentity() {
  const name = document.getElementById("collaNameInput").value.trim();
  const town = document.getElementById("townInput").value.trim();

  state.name = name || "La meva colla";
  state.town = town || "El teu poble";
  state.color = document.getElementById("shirtColorInput").value || "#167DAD";
  state.shieldStyle = document.getElementById("shieldStyleInput").value;
  state.shieldSymbol = document.getElementById("shieldSymbolInput").value;

  record("Identitat de la colla actualitzada.");
  saveState();
  render();
  toast("Identitat de la colla desada.");
  switchTab("local");
}

function nextSeason() {
  if (!confirm("Vols començar la temporada següent? Es conservaran la colla, els diners i l'experiència.")) return;

  state.season++;
  state.day = 15;
  state.month = 5;
  state.seasonPractices = 0;
  state.seasonDiades = 0;
  state.workshopSeason = 0;
  state.grantSeason = 0;
  state.motivation = clamp(state.motivation + 5);
  state.lastEvent = `Inici de la temporada ${state.season}`;
  record(`Ha començat la temporada ${state.season}.`);
  saveState();
  render();
  toast(`Benvinguts a la temporada ${state.season}!`);
  switchTab("local");
}

function exportSave() {
  const content = JSON.stringify(state, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "castells-manager-partida.json";
  link.click();
  URL.revokeObjectURL(url);
  toast("S'ha preparat l'exportació de la partida.");
}

function resetGame() {
  const confirmed = confirm("Segur que vols reiniciar la partida? Perdràs la colla i els progressos actuals.");
  if (!confirmed) return;

  state = structuredClone(DEFAULT_STATE);
  saveState();
  render();
  switchTab("local");
  toast("Partida reiniciada.");
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  document.getElementById("settingsButton").addEventListener("click", () => switchTab("config"));
  document.getElementById("editIdentityButton").addEventListener("click", () => switchTab("config"));

  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "practice") doPractice();
      if (action === "recruit") switchTab("colla");
      if (action === "workshop") doWorkshop();
      if (action === "grant") doGrant();
    });
  });

  document.querySelectorAll("[data-recruit]").forEach(button => {
    button.addEventListener("click", () => recruit(button.dataset.recruit));
  });

  document.getElementById("selectAllAttendance").addEventListener("click", () => {
    state.attendance = state.people;
    saveState();
    render();
    toast("Has seleccionat tots els castellers.");
  });

  document.getElementById("selectSomeAttendance").addEventListener("click", () => {
    const slider = document.getElementById("attendanceSlider");
    slider.value = state.attendance;
    setText("attendanceSliderValue", state.attendance);
    document.getElementById("attendanceDialog").showModal();
  });

  document.getElementById("attendanceSlider").addEventListener("input", event => {
    setText("attendanceSliderValue", event.target.value);
  });

  document.getElementById("saveAttendanceButton").addEventListener("click", () => {
    state.attendance = clamp(Number(document.getElementById("attendanceSlider").value), 0, state.people);
    saveState();
    render();
    document.getElementById("attendanceDialog").close();
    toast(`Assistència actualitzada: ${state.attendance} persones.`);
  });

  document.getElementById("castlesList").addEventListener("click", event => {
    const button = event.target.closest("[data-castle]");
    if (button) openCastle(button.dataset.castle);
  });

  document.getElementById("attemptCastleButton").addEventListener("click", attemptCastle);

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById(button.dataset.close);
      if (dialog) dialog.close();
    });
  });

  document.getElementById("diadaDistance").addEventListener("input", updateDiadaPreview);
  document.getElementById("diadaType").addEventListener("change", updateDiadaPreview);
  document.getElementById("performDiadaButton").addEventListener("click", performDiada);

  document.getElementById("saveIdentityButton").addEventListener("click", saveIdentity);
  document.getElementById("nextSeasonButton").addEventListener("click", nextSeason);
  document.getElementById("exportSaveButton").addEventListener("click", exportSave);
  document.getElementById("resetGameButton").addEventListener("click", resetGame);

  document.querySelectorAll(".color-choice").forEach(button => {
    button.addEventListener("click", () => {
      state.color = button.dataset.color;
      document.getElementById("shirtColorInput").value = state.color;
      renderIdentityPreview();
      applyTheme();
    });
  });

  document.getElementById("shirtColorInput").addEventListener("input", event => {
    state.color = event.target.value;
    renderIdentityPreview();
    applyTheme();
  });

  ["shieldStyleInput", "shieldSymbolInput"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      state.shieldStyle = document.getElementById("shieldStyleInput").value;
      state.shieldSymbol = document.getElementById("shieldSymbolInput").value;
      renderIdentityPreview();
    });
  });

  ["collaNameInput", "townInput"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
      setText("previewName", document.getElementById("collaNameInput").value || "La meva colla");
      setText("previewTown", document.getElementById("townInput").value || "El teu poble");
    });
  });

  document.getElementById("attendanceDialog").addEventListener("click", event => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });

  document.getElementById("castleDialog").addEventListener("click", event => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
}

bindEvents();
render();
