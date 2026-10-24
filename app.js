
(() => {
  const SAVE_KEY = "castells-manager-save-v1";

  const initialState = {
    started: false,
    colla: "",
    town: "",
    season: 1,
    members: 18,
    money: 1000,
    prestige: 0,
    xp: 0,
    practices: 0,
    events: 0,
    income: 0,
    expenses: 0,
    shirtColour: false,
    localUpgraded: false,
    grantSeason: 0,
    log: ["Benvinguts a la colla!"]
  };

  let state;

  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    state = saved
      ? { ...initialState, ...saved }
      : { ...initialState, log: [...initialState.log] };
  } catch {
    state = { ...initialState, log: [...initialState.log] };
  }

  const $ = id => document.getElementById(id);

  const moneyFormat = value =>
    new Intl.NumberFormat("ca-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(value);

  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    render();
  }

  function addLog(message) {
    state.log.unshift(`T${state.season}: ${message}`);
    state.log = state.log.slice(0, 7);
  }

  function notify(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  function spend(amount, description) {
    if (state.money < amount) {
      notify("No tens prou diners per fer aquesta acció.");
      return false;
    }

    state.money -= amount;
    state.expenses += amount;
    addLog(`${description}: −${moneyFormat(amount)}`);
    return true;
  }

  function earn(amount, description) {
    state.money += amount;
    state.income += amount;
    addLog(`${description}: +${moneyFormat(amount)}`);
  }

  function safeText(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function render() {
    $("setup").hidden = state.started;
    $("game").hidden = !state.started;
    $("season").textContent = `Temporada ${state.season}`;

    if (!state.started) return;

    $("colla-title").textContent = state.colla;
    $("town-title").textContent = `📍 ${state.town}, Catalunya`;

    $("members").textContent = state.members;
    $("money").textContent = moneyFormat(state.money);
    $("prestige").textContent = state.prestige;
    $("xp").textContent = state.xp;

    $("practice-count").textContent = state.practices;
    $("event-count").textContent = state.events;
    $("income").textContent = moneyFormat(state.income);
    $("expenses").textContent = moneyFormat(state.expenses);

    $("shirt").innerHTML = state.shirtColour
      ? "👕<small>DE COLOR</small>"
      : "👕<small>BLANCA</small>";

    $("shirt").classList.toggle("colour", state.shirtColour);

    const progress = Math.min(
      100,
      state.practices / 10 * 100,
      state.events / 4 * 100,
      state.money / 900 * 100
    );

    $("progress-bar").style.width = `${progress}%`;
    $("progress-text").textContent = `${Math.round(progress)}%`;

    $("level").textContent =
      state.prestige >= 100
        ? "Colla consolidada"
        : state.prestige >= 35
          ? "Colla en creixement"
          : "Nova colla";

    $("status").textContent = state.shirtColour
      ? "Enhorabona! Ja teniu camisa de color. Continueu creixent cap al Concurs."
      : "Feu créixer la colla amb assajos, actuacions i una bona gestió dels diners.";

    $("activity-log").innerHTML = state.log
      .map(item => `<li>${safeText(item)}</li>`)
      .join("");

    $("recruit").disabled = state.money < 120;
    $("practice").disabled = state.money < 40;
    $("local-event").disabled = state.money < 180;
    $("far-event").disabled = state.money < 420;
    $("upgrade").disabled = state.money < 600 || state.localUpgraded;

    checkShirtGoal();
  }

  function checkShirtGoal() {
    if (
      !state.shirtColour &&
      state.practices >= 10 &&
      state.events >= 4 &&
      state.money >= 900
    ) {
      state.shirtColour = true;
      addLog("Objectiu assolit: camisa de color desbloquejada!");
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      $("shirt").innerHTML = "👕<small>DE COLOR</small>";
      $("shirt").classList.add("colour");
      $("status").textContent =
        "Enhorabona! Heu aconseguit la camisa de color.";
      notify("Camisa de color desbloquejada!");
    }
  }

  // Crear la colla
  $("setup-form").addEventListener("submit", event => {
    event.preventDefault();

    state.colla = $("colla-name").value.trim();
    state.town = $("town").value.trim();

    if (!state.colla || !state.town) return;

    state.started = true;
    addLog(`Neix ${state.colla}, a ${state.town}.`);
    save();
    notify("La colla ja està creada!");
  });

  // Canviar de pantalla
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(tab => {
        tab.classList.toggle("active", tab === button);
      });

      document.querySelectorAll(".page").forEach(page => {
        page.hidden = page.id !== `page-${button.dataset.tab}`;
      });
    });
  });

  // Captar nous castellers
  $("recruit").addEventListener("click", () => {
    if (spend(120, "Captació de castellers")) {
      state.members += 6;
      state.prestige += 2;
      save();
      notify("S'han incorporat 6 castellers!");
    }
  });

  // Assaig
  $("practice").addEventListener("click", () => {
    if (spend(40, "Assaig general")) {
      state.practices++;
      state.xp += 8;
      state.prestige += 2;
      save();
      notify("Bon assaig! +8 experiència.");
    }
  });

  // Taller per a una empresa
  $("workshop").addEventListener("click", () => {
    earn(350, "Taller d'empresa");
    state.prestige += 3;
    save();
    notify("Taller completat! +350 €.");
  });

  // Diada propera
  $("local-event").addEventListener("click", () => {
    if (spend(180, "Diada propera")) {
      state.events++;
      state.prestige += 8;
      state.xp += 12;

      earn(80, "Ingressos de la diada");
      save();
      notify("Diada completada! +8 prestigi.");
    }
  });

  // Diada llunyana
  $("far-event").addEventListener("click", () => {
    if (spend(420, "Diada llunyana i autocar")) {
      state.events++;
      state.prestige += 14;
      state.xp += 18;

      earn(160, "Ingressos de la diada");
      save();
      notify("Diada llunyana completada!");
    }
  });

  // Ajut municipal simulat
  $("grant").addEventListener("click", () => {
    if (state.grantSeason === state.season) {
      notify("Ja heu demanat l'ajut aquesta temporada.");
      return;
    }

    state.grantSeason = state.season;
    earn(500, "Ajut municipal simulat");
    state.prestige += 2;
    save();
    notify("Ajut concedit dins del joc.");
  });

  // Millorar el local
  $("upgrade").addEventListener("click", () => {
    if (state.localUpgraded) {
      notify("El local ja està millorat.");
      return;
    }

    if (spend(600, "Millora del local")) {
      state.localUpgraded = true;
      state.prestige += 12;
      save();
      notify("Local millorat! +12 prestigi.");
    }
  });

  // Nova temporada
  $("next-season").addEventListener("click", () => {
    state.season++;
    state.members += Math.floor(state.prestige / 30);

    addLog(`Comença la temporada ${state.season}.`);

    if (state.season >= 3) {
      addLog("El Concurs de Castells entra als vostres objectius!");
    }

    save();
    notify(`Comença la temporada ${state.season}.`);
  });

  // Reiniciar partida
  $("reset").addEventListener("click", () => {
    if (!confirm("Segur que vols esborrar aquesta partida?")) return;

    localStorage.removeItem(SAVE_KEY);
    state = {
      ...initialState,
      log: [...initialState.log]
    };

    render();
    notify("Partida reiniciada.");
  });

  render();
})();
