(function () {
  "use strict";

  /* ================= Helpers ================= */
  var SVGNS = "http://www.w3.org/2000/svg";
  function $(sel, root) { return (root || document).querySelector(sel); }
  function h(tag, props) {
    var n = document.createElement(tag), value;
    if (props) {
      for (var k in props) {
        var v = props[k];
        if (v == null || v === false) continue;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k === "value") value = v;
        else if (k === "checked") n.checked = !!v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") n.addEventListener(k.slice(2), v);
        else if (v === true) n.setAttribute(k, "");
        else n.setAttribute(k, String(v));
      }
    }
    appendKids(n, Array.prototype.slice.call(arguments, 2));
    if (value !== undefined) n.value = String(value);
    return n;
  }
  function appendKids(n, kids) {
    for (var i = 0; i < kids.length; i++) {
      var kid = kids[i];
      if (kid == null || kid === false) continue;
      if (Array.isArray(kid)) { appendKids(n, kid); continue; }
      n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
  }
  function sv(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) { if (attrs[k] != null) n.setAttribute(k, String(attrs[k])); }
    appendKids(n, Array.prototype.slice.call(arguments, 2));
    return n;
  }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function rid(p) { return p + Math.random().toString(36).slice(2, 10); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function cut(t, n) { t = String(t == null ? "" : t).trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function toNum(v) { if (v == null || v === "") return null; var n = Number(v); return isFinite(n) ? n : null; }
  var MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  var MONTHS_LONG = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  var DAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  function pad(n) { return String(n).padStart(2, "0"); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseYmd(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ""));
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function mondayOf(d) { return addDays(d, -((d.getDay() + 6) % 7)); }
  function isoWeek(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return { year: d.getUTCFullYear(), week: Math.ceil(((d - y0) / 86400000 + 1) / 7) };
  }
  function weekKey(mon) { var w = isoWeek(mon); return w.year + "-W" + pad(w.week); }
  function shortDate(d) { return d.getDate() + " " + MONTHS[d.getMonth()]; }
  function longDate(d) { return d ? d.getDate() + " " + MONTHS_LONG[d.getMonth()] + " " + d.getFullYear() : ""; }
  function rangeLabel(mon) {
    var sun = addDays(mon, 6);
    var yr = sun.getFullYear() !== new Date().getFullYear() ? " " + sun.getFullYear() : "";
    return shortDate(mon) + " – " + shortDate(sun) + yr;
  }
  function dateOnly(iso) { var d = new Date(iso); return isNaN(d.getTime()) ? "" : d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  var eur0 = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var eurC = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });
  var num1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
  function pct(v) { return v == null || !isFinite(v) ? "–" : Math.round(v) + "%"; }

  function icon(kind) {
    var svg = sv("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", fill: "none" });
    if (kind === "good") {
      svg.append(sv("circle", { cx: 8, cy: 8, r: 7, fill: "currentColor" }), sv("path", { d: "M4.8 8.3l2.1 2.1 4.3-4.6", stroke: "#ffffff", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    } else if (kind === "warn") {
      svg.append(sv("path", { d: "M8 1.5l6.8 12.3H1.2z", fill: "currentColor", "stroke-linejoin": "round" }), sv("path", { d: "M8 6v3.6", stroke: "#1b1a14", "stroke-width": 1.7, "stroke-linecap": "round" }), sv("circle", { cx: 8, cy: 11.7, r: 0.95, fill: "#1b1a14" }));
    } else if (kind === "crit") {
      svg.append(sv("circle", { cx: 8, cy: 8, r: 7, fill: "currentColor" }), sv("path", { d: "M8 4.3v5.2M5.7 7.4L8 9.7l2.3-2.3", stroke: "#ffffff", "stroke-width": 1.7, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    } else {
      svg.append(sv("circle", { cx: 8, cy: 8, r: 6.2, stroke: "currentColor", "stroke-width": 1.6 }), sv("path", { d: "M8 4.8V8l2.1 1.4", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round" }));
    }
    return svg;
  }
  function checkSvg() {
    return sv("svg", { viewBox: "0 0 16 16", "aria-hidden": "true" }, sv("path", { d: "M3.5 8.5l3 3 6-7", fill: "none", stroke: "currentColor", "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  }
  function chip(kind, text) { return h("span", { class: "chip chip-" + kind }, icon(kind), h("span", { text: text })); }
  function emptyBox(text, btn) { return h("div", { class: "empty" }, h("p", { text: text }), btn || null); }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }
  function showBanner(msg) { $("#banner-text").textContent = msg; $("#banner").hidden = false; }

  function delBtn(fn, label, confirmFirst) {
    var b = h("button", { type: "button", class: "del", "aria-label": label, title: label, text: "×" });
    var armed = false, t;
    b.addEventListener("click", function () {
      if (confirmFirst && !armed) {
        armed = true; b.classList.add("armed"); b.textContent = "Zeker?"; b.setAttribute("aria-label", label + ": klik nogmaals om te bevestigen");
        t = setTimeout(function () { armed = false; b.classList.remove("armed"); b.textContent = "×"; b.setAttribute("aria-label", label); }, 2800);
        return;
      }
      clearTimeout(t); fn();
    });
    return b;
  }

  /* ================= Staat ================= */
  var S = {
    db: null, user: null, owner: null, sparOn: false,
    status: "loading",
    settings: {}, goals: {}, weeks: {}, notes: [], invest: {},
    dirty: new Set(), deleted: new Set(),
    loaded: { doelen: false, weken: false, notities: false, invest: false, instellingen: false },
    view: "overzicht", selMon: null,
    editing: null, draft: null,
    pfEdit: false, pfDraft: null, routeEdit: false,
    toolsOk: false,
    chat: { turns: [], busy: false, ctl: null },
  };
  function canWrite() { return !!S.db && S.owner !== false; }

  /* ---------- Schrijfwachtrij: één schrijfactie tegelijk per document ---------- */
  var W = { timers: {}, pending: {}, running: {} };
  function queueWrite(path, body, delay) {
    if (!S.db) return;
    W.pending[path] = body; S.dirty.add(path);
    clearTimeout(W.timers[path]);
    W.timers[path] = setTimeout(function () { flush(path); }, delay == null ? 350 : delay);
  }
  function flush(path) {
    if (W.running[path]) return;
    W.running[path] = true;
    (async function () {
      try {
        while (W.pending[path]) {
          var body = W.pending[path]; delete W.pending[path];
          try { await S.db.doc(path).set(body); }
          catch (e) { writeError(e); }
        }
      } finally {
        W.running[path] = false;
        if (!W.pending[path]) S.dirty.delete(path);
      }
    })();
  }
  async function removeDoc(path) {
    var parts = path.split("/");
    S.deleted.add(path); S.dirty.delete(path);
    delete W.pending[path]; clearTimeout(W.timers[path]);
    try { await S.db.doc(path).delete(); } catch (e) { writeError(e); }
    return parts;
  }
  function writeError(e) {
    var code = e && e.code;
    if (code === "auth") return;
    if (code === "db") toast("De database is even niet bereikbaar. Je wijziging is niet opgeslagen; probeer het zo opnieuw.");
    else if (code === "netwerk") toast("Geen verbinding. Je wijziging is niet opgeslagen; probeer het opnieuw.");
    else if (code === "invalid_argument") toast("Opslaan geweigerd.");
    else if (code === "quota_exceeded") toast("De opslag van dit dashboard is vol. Verwijder oude notities.");
    else if (code === "revoked") toast("Toegang tot je gegevens is ingetrokken voor deze weergave.");
    else toast("Opslaan mislukt. Controleer je verbinding en probeer het opnieuw.");
  }

  /* ================= Jaar en weken ================= */
  function thisMonday() { return mondayOf(new Date()); }
  function yearStart() { var s = parseYmd(S.settings.startMaandag); return s ? mondayOf(s) : thisMonday(); }
  function yearWeeks() { var st = yearStart(), out = []; for (var i = 0; i < 52; i++) out.push(addDays(st, 7 * i)); return out; }
  function weekState(mon) { var c = thisMonday().getTime(), t = mon.getTime(); return t === c ? "current" : t < c ? "past" : "future"; }
  function paceNow() { var n = new Date(), di = (n.getDay() + 6) % 7; return (di + (n.getHours() + n.getMinutes() / 60) / 24) / 7; }

  function goalsSorted() {
    return Object.keys(S.goals).map(function (id) { return Object.assign({ id: id }, S.goals[id]); })
      .sort(function (a, b) { return ((a.volgorde || 0) - (b.volgorde || 0)) || String(a.titel || "").localeCompare(String(b.titel || "")); });
  }
  function nextOrder() { var m = 0; Object.keys(S.goals).forEach(function (id) { m = Math.max(m, Number(S.goals[id].volgorde) || 0); }); return m + 1; }
  function activeActions() {
    var out = [];
    goalsSorted().forEach(function (g) {
      (g.acties || []).forEach(function (a) {
        var n = Math.round(Number(a.perWeek));
        if (a && a.id && n > 0) out.push({ g: g, a: a, n: Math.min(n, 14) });
      });
    });
    return out;
  }
  function itemsFor(mon) {
    var doc = S.weeks[weekKey(mon)];
    var stored = doc && doc.items && typeof doc.items === "object" ? doc.items : null;
    if (stored && weekState(mon) === "past") return stored;
    var out = {};
    activeActions().forEach(function (x) {
      var prev = stored && stored[x.a.id];
      out[x.a.id] = { doel: x.g.id, doelTitel: String(x.g.titel || ""), tekst: String(x.a.tekst || ""), target: x.n, gedaan: prev ? clamp(Math.round(Number(prev.gedaan) || 0), 0, 99) : 0 };
    });
    return out;
  }
  function scoreItems(items) {
    var per = {};
    Object.keys(items || {}).forEach(function (k) {
      var it = items[k], t = Number(it.target) || 0;
      if (t <= 0) return;
      var g = per[it.doel] || (per[it.doel] = { d: 0, t: 0, titel: it.doelTitel });
      g.d += Math.min(Number(it.gedaan) || 0, t); g.t += t;
    });
    var ids = Object.keys(per);
    if (!ids.length) return { score: null, per: per };
    var sum = 0; ids.forEach(function (id) { sum += per[id].d / per[id].t; });
    return { score: 100 * sum / ids.length, per: per };
  }
  function weekScore(mon) {
    var st = weekState(mon);
    if (st === "future") return { state: st, score: null, per: {}, tracked: false };
    var doc = S.weeks[weekKey(mon)];
    if (st === "past" && !doc) return { state: st, score: null, per: {}, tracked: false };
    var r = scoreItems(itemsFor(mon));
    return { state: st, score: r.score, per: r.per, tracked: !!doc };
  }
  function band(v) {
    if (v == null) return null;
    if (v >= 80) return { k: "good", t: "Sterke week" };
    if (v >= 60) return { k: "good", t: "Op koers" };
    if (v >= 40) return { k: "warn", t: "Bijsturen" };
    return { k: "crit", t: "Achter" };
  }
  function yearBand(v) {
    if (v >= 80) return { k: "good", t: "Sterk op koers" };
    if (v >= 60) return { k: "good", t: "Op koers" };
    if (v >= 40) return { k: "warn", t: "Bijsturen" };
    return { k: "crit", t: "Achter op je plan" };
  }
  function bin(v) { return v >= 80 ? 4 : v >= 60 ? 3 : v >= 40 ? 2 : v >= 20 ? 1 : 0; }
  function completedWeeks() {
    return yearWeeks().filter(function (m) { return weekState(m) === "past"; }).map(function (m) { var r = weekScore(m); r.mon = m; return r; });
  }
  function yearStats() {
    var done = completedWeeks();
    var tracked = done.filter(function (w) { return w.score != null; });
    function avg(a) { return a.length ? a.reduce(function (s, w) { return s + w.score; }, 0) / a.length : null; }
    var last4 = tracked.slice(-4), prev4 = tracked.slice(-8, -4);
    var trend = null, trendLabel = "";
    if (tracked.length >= 8) { trend = avg(last4) - avg(prev4); trendLabel = "vs de 4 weken daarvoor"; }
    else if (tracked.length >= 2) { trend = tracked[tracked.length - 1].score - tracked[tracked.length - 2].score; trendLabel = "vs de week ervoor"; }
    return { done: done, tracked: tracked, avgAll: avg(tracked), avg4: avg(last4), n4: last4.length, trend: trend, trendLabel: trendLabel };
  }
  function goalAvg4(gid) {
    var tracked = completedWeeks().filter(function (w) { return w.score != null; }).slice(-4);
    var vals = tracked.map(function (w) { var p = w.per && w.per[gid]; return p ? p.d / p.t : null; }).filter(function (v) { return v != null; });
    return vals.length ? 100 * vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
  }
  function greeting() {
    var hr = new Date().getHours();
    var g = hr < 6 ? "Goedenacht" : hr < 12 ? "Goedemorgen" : hr < 18 ? "Goedemiddag" : "Goedenavond";
    var naam = String(S.settings.naam || "").trim();
    var d = new Date();
    return g + (naam ? ", " + naam : "") + ". Het is " + DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS_LONG[d.getMonth()] + ".";
  }

  /* ================= Render: kop ================= */
  function renderHeader() {
    var ws = yearWeeks(), a = ws[0], b = addDays(ws[51], 6);
    $("#brand-year").textContent = MONTHS[a.getMonth()] + " " + a.getFullYear() + " – " + MONTHS[b.getMonth()] + " " + b.getFullYear();
    $("#y-range").textContent = "52 weken, van " + longDate(a) + " tot en met " + longDate(b) + ". Elke week krijgt een score: hoeveel van je geplande acties je hebt afgevinkt, gemiddeld over je doelen.";
  }

  /* ================= Render: overzicht ================= */
  function buildRuler() {
    ["ruler-track", "ruler-fill"].forEach(function (cls) {
      var layer = $(".ruler ." + cls);
      layer.append(h("div", { class: "ruler-ticks" }));
      var nums = h("div", { class: "ruler-nums", "aria-hidden": "true" });
      for (var v = 10; v <= 90; v += 10) nums.append(h("span", { style: "left:" + v + "%", text: String(v) }));
      layer.append(nums);
      for (var j = 20; j <= 80; j += 20) layer.append(h("span", { class: "seam", style: "left:" + j + "%" }));
    });
  }
  function setRuler(score, pace) {
    var r = $("#ov-ruler"), v = score == null ? 0 : clamp(score, 0, 100);
    r.style.setProperty("--v", v.toFixed(2) + "%");
    r.setAttribute("aria-label", score == null ? "Nog geen weekscore" : "Weekscore " + Math.round(v) + " procent");
    var pm = $("#ov-pace");
    if (pace == null || pace < 1 / 7) { pm.hidden = true; return; }
    pm.hidden = false; pm.style.left = (clamp(pace, 0, 1) * 100).toFixed(2) + "%";
    pm.classList.toggle("flip", pace > 0.84);
  }
  function renderOverview() {
    var mon = S.selMon || thisMonday();
    var st = weekState(mon), key = weekKey(mon), doc = S.weeks[key];
    $("#ov-greet").textContent = greeting();
    $("#ov-wk").textContent = "Week " + isoWeek(mon).week;
    $("#ov-dates").textContent = rangeLabel(mon);
    var minMon = Math.min(yearStart().getTime(), thisMonday().getTime());
    $("#ov-prev").disabled = mon.getTime() <= minMon;
    $("#ov-next").disabled = st !== "past";
    $("#ov-today").hidden = st === "current";
    $(".hero-cap").textContent = st === "current" ? "Effectiviteit deze week" : st === "past" ? "Effectiviteit die week" : "Effectiviteit";

    var items = itemsFor(mon), r = scoreItems(items), score = r.score;
    var chipBox = $("#ov-chip"); chipBox.replaceChildren();
    var note = "";
    if (!S.db) note = S.status === "loading" ? "Gegevens laden…" : "Je gegevens konden niet worden geladen.";
    else if (!S.loaded.doelen) note = "Gegevens laden…";
    else if (score == null) note = Object.keys(S.goals).length ? "Er staan geen wekelijkse acties gepland. Voeg ze toe bij Doelen." : "Voeg doelen met wekelijkse acties toe om je score te zien.";
    else if (st === "current") {
      var p = paceNow();
      if (score === 0) { chipBox.append(chip("neutral", "Nog niets afgevinkt")); note = "Vink af wat je deze week al deed. Je score loopt mee."; }
      else if (p < 1 / 7) { chipBox.append(chip("neutral", "Week net begonnen")); note = "Je score loopt op naarmate je afvinkt."; }
      else {
        var proj = Math.min(100, score / p), b = band(proj);
        chipBox.append(chip(b.k, b.t));
        note = score >= 99.5 ? "Alles van deze week staat afgevinkt." : "Bij dit tempo eindig je rond " + Math.round(proj) + "%.";
      }
    } else if (!doc) { chipBox.append(chip("neutral", "Niet ingevuld")); note = "Deze week is niet bijgehouden. Vink alsnog af wat je die week deed."; }
    else { var b2 = band(score); chipBox.append(chip(b2.k, b2.t)); note = "Afgesloten week."; }
    $("#ov-score").textContent = score == null ? "–" : String(Math.round(score));
    $("#ov-note").textContent = note;

    var ys = yearStats(), subs = [];
    var prevMon = addDays(mon, -7), prev = weekScore(prevMon);
    if (prevMon.getTime() >= yearStart().getTime() && prev.score != null) subs.push("Vorige week " + pct(prev.score));
    if (ys.avg4 != null) subs.push("Gemiddeld laatste " + (ys.n4 === 1 ? "week" : ys.n4 + " weken") + " " + pct(ys.avg4));
    if (!subs.length && S.loaded.weken && st === "current") subs.push("Je eerste weekscore staat na zondag vast.");
    $("#ov-sub").textContent = subs.join(" · ");

    setRuler(score, st === "current" && score != null ? paceNow() : null);
    renderOvList(mon, items, r.per);
    var ta = $("#ov-reflect");
    if (document.activeElement !== ta) ta.value = (doc && doc.reflectie) || "";
    ta.disabled = !canWrite();
  }
  function renderOvList(mon, items, per) {
    var box = $("#ov-list");
    var active = document.activeElement, focusKey = active && active.dataset ? active.dataset.k : null;
    box.replaceChildren();
    if (!S.db || !S.loaded.doelen) { box.append(emptyBox(S.db || S.status === "loading" ? "Je doelen worden geladen…" : "Je doelen konden niet worden geladen.")); return; }
    var order = goalsSorted().map(function (g) { return g.id; });
    var groups = {}, ids = [];
    Object.keys(items).forEach(function (aid) {
      var it = items[aid];
      if (!groups[it.doel]) { groups[it.doel] = { titel: it.doelTitel, items: [] }; ids.push(it.doel); }
      groups[it.doel].items.push([aid, it]);
    });
    ids.sort(function (a, b) { var ia = order.indexOf(a), ib = order.indexOf(b); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
    if (!ids.length) {
      box.append(emptyBox("Nog geen wekelijkse acties. Geef je doelen acties die je elke week kunt afvinken.", h("a", { class: "btn ghost sm", href: "#doelen", text: "Naar Doelen" })));
      return;
    }
    var writable = canWrite();
    ids.forEach(function (gid) {
      var grp = groups[gid], g = S.goals[gid], titel = (g && g.titel) || grp.titel || "Doel";
      var p = per[gid], ratio = p ? p.d / p.t : 0;
      var sec = h("div", { class: "og" },
        h("div", { class: "og-head" }, h("h3", { class: "og-title", text: titel }), h("span", { class: "og-pct", text: pct(ratio * 100) })),
        h("div", { class: "meter", "aria-hidden": "true" }, h("span", { style: "width:" + (ratio * 100).toFixed(1) + "%" })));
      grp.items.forEach(function (pair) {
        var aid = pair[0], it = pair[1], n = clamp(Number(it.target) || 0, 0, 14), done = Math.min(Number(it.gedaan) || 0, n);
        var boxes = h("div", { class: "boxes", role: "group", "aria-label": it.tekst + ": " + done + " van " + n });
        for (var i = 0; i < n; i++) {
          (function (i) {
            var on = i < done;
            boxes.append(h("button", {
              type: "button", class: "box" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false",
              "aria-label": it.tekst + ", " + (i + 1) + " van " + n, "data-k": aid + ":" + i, disabled: !writable,
              onclick: function () { tick(mon, aid, i); }
            }, checkSvg()));
          })(i);
        }
        sec.append(h("div", { class: "oa" }, h("div", { class: "oa-text" }, h("span", { text: it.tekst }), h("span", { class: "oa-count", text: done + "/" + n })), boxes));
      });
      box.append(sec);
    });
    if (focusKey) { var f = box.querySelector('[data-k="' + focusKey.replace(/"/g, "") + '"]'); if (f) f.focus(); }
  }
  function tick(mon, aid, i) {
    if (!canWrite()) return;
    var key = weekKey(mon), items = clone(itemsFor(mon)), it = items[aid];
    if (!it) return;
    var cur = Math.min(Number(it.gedaan) || 0, Number(it.target) || 0);
    it.gedaan = i < cur ? i : i + 1;
    var prev = S.weeks[key] || {};
    var doc = { maandag: ymd(mon), items: items, reflectie: prev.reflectie || "", bijgewerkt: new Date().toISOString() };
    S.weeks[key] = doc;
    queueWrite("weken/" + key, doc, 300);
    renderOverview();
    if (S.view === "jaar") renderYear();
  }
  var reflTimer;
  function saveReflection(mon, val) {
    if (!canWrite()) return;
    var key = weekKey(mon);
    var doc = { maandag: ymd(mon), items: clone(itemsFor(mon)), reflectie: String(val).slice(0, 4000), bijgewerkt: new Date().toISOString() };
    S.weeks[key] = doc;
    queueWrite("weken/" + key, doc, 0);
    $("#ov-reflect-state").textContent = "Opgeslagen";
  }

  /* ================= Render: doelen ================= */
  var CATS = ["Werk", "Focus", "Sport", "Geld", "Project", "Vrije tijd", "Persoonlijk"];
  function renderGoals(force) {
    var gs = goalsSorted();
    $("#g-concept").hidden = !gs.some(function (g) { return g.concept; });
    renderNoteSelect();
    if (S.editing && !force) return;
    var list = $("#g-list");
    list.replaceChildren();
    $("#g-add").hidden = !!S.editing || !canWrite() || !S.loaded.doelen;
    if (!S.db) { list.append(emptyBox(S.status === "loading" ? "Doelen laden…" : "Je doelen konden niet worden geladen.")); return; }
    if (!S.loaded.doelen) { list.append(emptyBox("Doelen laden…")); return; }
    if (!gs.length && S.editing !== "__new") list.append(emptyBox("Nog geen doelen. Begin met het doel dat dit jaar het meeste verschil maakt."));
    gs.forEach(function (g) { list.append(S.editing === g.id ? goalForm() : goalCard(g)); });
    if (S.editing === "__new") list.append(goalForm());
  }
  function goalCard(g) {
    var ms = g.mijlpalen || [], done = ms.filter(function (m) { return m.klaar; }).length;
    var a4 = goalAvg4(g.id), writable = canWrite();
    var acts = (g.acties || []).filter(function (a) { return a && a.tekst; });
    return h("article", { class: "g-card", id: "goal-" + g.id },
      h("div", { class: "g-top" },
        h("span", { class: "cat", text: g.categorie || "Doel" }),
        g.concept ? h("span", { class: "tag-concept", text: "startversie" }) : null,
        a4 != null ? h("span", { class: "g-avg", title: "Gemiddelde afvinkscore over je laatste 4 afgeronde weken", text: pct(a4) + " · laatste 4 wk" }) : null),
      h("h3", { class: "g-title", text: g.titel || "Naamloos doel" }),
      g.waarom ? h("div", { class: "g-why" }, h("span", { class: "label", text: "Waarom dit je verder brengt" }), h("p", { text: g.waarom })) : null,
      h("dl", { class: "g-meta" },
        h("div", null, h("dt", { text: "Resultaat" }), h("dd", { text: g.resultaat || "Nog niet vastgelegd" })),
        h("div", null, h("dt", { text: "Deadline" }), h("dd", { text: g.deadline ? longDate(parseYmd(g.deadline)) : "Geen" }))),
      acts.length ? h("div", { class: "g-acts" }, h("span", { class: "label", text: "Elke week" }),
        h("ul", { class: "g-list-ul" }, acts.map(function (a) { return h("li", null, h("span", { text: a.tekst }), h("span", { class: "x", text: (Number(a.perWeek) || 0) + "× per week" })); }))) : null,
      ms.length ? h("div", { class: "g-ms" }, h("span", { class: "label", text: "Mijlpalen " + done + "/" + ms.length }),
        h("ul", { class: "g-list-ul" }, ms.map(function (m) {
          return h("li", null, h("label", null,
            h("input", { type: "checkbox", id: "ms-" + g.id + "-" + m.id, checked: !!m.klaar, disabled: !writable, onchange: function (e) { toggleMs(g.id, m.id, e.target.checked); } }),
            h("span", { text: m.tekst })));
        }))) : null,
      h("div", { class: "g-foot" },
        writable ? h("button", { class: "btn ghost sm", type: "button", text: "Bewerken", onclick: function () { startEdit(g.id); } }) : null,
        S.sparOn ? h("button", { class: "link-btn", type: "button", text: "Spar over dit doel", onclick: function () { sparAbout('Help me met mijn doel "' + (g.titel || "") + '". '); } }) : null));
  }
  function startEdit(id) {
    var g = S.goals[id]; if (!g) return;
    S.editing = id; S.draft = Object.assign({ id: id }, clone(g));
    S.draft.acties = (S.draft.acties || []).map(function (a) { return Object.assign({}, a); });
    S.draft.mijlpalen = (S.draft.mijlpalen || []).map(function (m) { return Object.assign({}, m); });
    renderGoals(true);
    var el = document.getElementById("ge-" + id + "-titel"); if (el) el.focus();
  }
  function newGoal() {
    var id = rid("d");
    S.editing = "__new";
    S.draft = { id: id, isNew: true, titel: "", categorie: "", waarom: "", resultaat: "", deadline: "", acties: [{ id: rid("a"), tekst: "", perWeek: 1 }], mijlpalen: [] };
    renderGoals(true);
    var el = document.getElementById("ge-" + id + "-titel"); if (el) { el.focus(); el.scrollIntoView({ block: "center" }); }
  }
  function cancelEdit() { var id = S.draft && S.draft.id; S.editing = null; S.draft = null; renderGoals(true); var c = id && document.getElementById("goal-" + id); if (c) c.scrollIntoView({ block: "nearest" }); }
  function goalForm() {
    var d = S.draft, id = d.id;
    function fid(f) { return "ge-" + id + "-" + f; }
    var form = h("form", { class: "g-card editing", id: "goal-" + id, onsubmit: function (e) { e.preventDefault(); saveDraft(); } });
    form.append(h("h3", { text: d.isNew ? "Nieuw doel" : "Doel bewerken" }));
    var dl = h("datalist", { id: fid("cats") }, CATS.map(function (c) { return h("option", { value: c }); }));
    form.append(h("div", { class: "g-form-grid" },
      h("div", { class: "field" }, h("label", { for: fid("titel"), text: "Titel" }),
        h("input", { id: fid("titel"), type: "text", maxlength: 120, required: true, value: d.titel || "", placeholder: "Wat wil je bereiken?", oninput: function (e) { d.titel = e.target.value; } }))));
    form.append(h("div", { class: "g-form-grid two" },
      h("div", { class: "field" }, h("label", { for: fid("cat"), text: "Categorie" }),
        h("input", { id: fid("cat"), type: "text", list: fid("cats"), maxlength: 30, value: d.categorie || "", oninput: function (e) { d.categorie = e.target.value; } }), dl),
      h("div", { class: "field" }, h("label", { for: fid("deadline"), text: "Deadline (optioneel)" }),
        h("input", { id: fid("deadline"), type: "date", value: d.deadline || "", oninput: function (e) { d.deadline = e.target.value; } }))));
    form.append(h("div", { class: "field" }, h("label", { for: fid("waarom"), text: "Waarom dit je verder brengt" }),
      h("textarea", { id: fid("waarom"), rows: 3, maxlength: 1200, value: d.waarom || "", placeholder: "Hoe beïnvloedt dit je positief en maakt het je klaar voor de toekomst?", oninput: function (e) { d.waarom = e.target.value; } })));
    form.append(h("div", { class: "field" }, h("label", { for: fid("res"), text: "Meetbaar resultaat" }),
      h("textarea", { id: fid("res"), rows: 2, maxlength: 600, value: d.resultaat || "", placeholder: "Wanneer heb je dit doel gehaald?", oninput: function (e) { d.resultaat = e.target.value; } })));

    var actRows = h("div", { class: "rows" });
    d.acties.forEach(function (a, idx) {
      actRows.append(h("div", { class: "row-edit" },
        h("input", { id: fid("a-" + a.id), type: "text", maxlength: 120, "aria-label": "Wekelijkse actie", value: a.tekst || "", placeholder: "Actie, bijv. 90 minuten focus", oninput: function (e) { a.tekst = e.target.value; } }),
        h("div", { class: "per" }, h("input", { id: fid("n-" + a.id), type: "number", min: 0, max: 14, step: 1, inputmode: "numeric", "aria-label": "Aantal keer per week", value: a.perWeek == null ? 1 : a.perWeek, oninput: function (e) { a.perWeek = e.target.value; } }), h("span", { text: "×/wk" })),
        delBtn(function () { d.acties.splice(idx, 1); renderGoals(true); }, "Verwijder actie", false)));
    });
    form.append(h("div", { class: "field" }, h("span", { class: "label", text: "Wekelijkse acties (die vink je af)" }), actRows,
      h("div", null, h("button", { type: "button", class: "link-btn", text: "Actie toevoegen", onclick: function () { var na = { id: rid("a"), tekst: "", perWeek: 1 }; d.acties.push(na); renderGoals(true); var el = document.getElementById(fid("a-" + na.id)); if (el) el.focus(); } }))));

    var msRows = h("div", { class: "rows" });
    d.mijlpalen.forEach(function (m, idx) {
      msRows.append(h("div", { class: "row-edit ms" },
        h("input", { id: fid("m-" + m.id), type: "text", maxlength: 160, "aria-label": "Mijlpaal", value: m.tekst || "", placeholder: "Mijlpaal", oninput: function (e) { m.tekst = e.target.value; } }),
        delBtn(function () { d.mijlpalen.splice(idx, 1); renderGoals(true); }, "Verwijder mijlpaal", false)));
    });
    form.append(h("div", { class: "field" }, h("span", { class: "label", text: "Mijlpalen" }), msRows,
      h("div", null, h("button", { type: "button", class: "link-btn", text: "Mijlpaal toevoegen", onclick: function () { var nm = { id: rid("m"), tekst: "", klaar: false }; d.mijlpalen.push(nm); renderGoals(true); var el = document.getElementById(fid("m-" + nm.id)); if (el) el.focus(); } }))));

    form.append(h("div", { class: "form-actions" },
      h("button", { type: "submit", class: "btn", text: "Opslaan" }),
      h("button", { type: "button", class: "btn ghost", text: "Annuleren", onclick: cancelEdit }),
      h("span", { class: "spacer" }),
      d.isNew ? null : (function () {
        var b = h("button", { type: "button", class: "link-btn", style: "color:var(--down)", text: "Doel verwijderen" });
        var armed = false, t;
        b.addEventListener("click", function () {
          if (!armed) { armed = true; b.textContent = "Klik nogmaals om te verwijderen"; t = setTimeout(function () { armed = false; b.textContent = "Doel verwijderen"; }, 3000); return; }
          clearTimeout(t); deleteGoal(id);
        });
        return b;
      })()));
    return form;
  }
  function saveDraft() {
    var d = S.draft; if (!d) return;
    var titel = String(d.titel || "").trim();
    if (!titel) { toast("Geef je doel een titel."); var el = document.getElementById("ge-" + d.id + "-titel"); if (el) el.focus(); return; }
    var old = S.goals[d.id] || {};
    var body = {
      titel: titel.slice(0, 120),
      categorie: String(d.categorie || "").trim().slice(0, 30),
      waarom: String(d.waarom || "").trim().slice(0, 1200),
      resultaat: String(d.resultaat || "").trim().slice(0, 600),
      deadline: parseYmd(d.deadline) ? d.deadline : "",
      acties: (d.acties || []).filter(function (a) { return String(a.tekst || "").trim(); }).map(function (a) {
        return { id: a.id || rid("a"), tekst: String(a.tekst).trim().slice(0, 120), perWeek: clamp(Math.round(Number(a.perWeek) || 0), 0, 14) };
      }),
      mijlpalen: (d.mijlpalen || []).filter(function (m) { return String(m.tekst || "").trim(); }).map(function (m) {
        return { id: m.id || rid("m"), tekst: String(m.tekst).trim().slice(0, 160), klaar: !!m.klaar };
      }),
      volgorde: old.volgorde != null ? old.volgorde : nextOrder(),
      concept: false,
      bijgewerkt: new Date().toISOString()
    };
    S.goals[d.id] = body;
    queueWrite("doelen/" + d.id, body, 0);
    var id = d.id;
    S.editing = null; S.draft = null;
    renderAll(true);
    toast("Doel opgeslagen.");
    var c = document.getElementById("goal-" + id); if (c) c.scrollIntoView({ block: "nearest" });
  }
  function deleteGoal(id) {
    delete S.goals[id];
    removeDoc("doelen/" + id);
    S.editing = null; S.draft = null;
    renderAll(true);
    toast("Doel verwijderd.");
  }
  function toggleMs(gid, mid, val) {
    var g = S.goals[gid]; if (!g || !canWrite()) return;
    var b = clone(g);
    (b.mijlpalen || []).forEach(function (m) { if (m.id === mid) m.klaar = !!val; });
    S.goals[gid] = b;
    queueWrite("doelen/" + gid, b, 200);
    renderGoals();
  }

  /* ---------- Logboek ---------- */
  function renderNoteSelect() {
    var sel = $("#note-goal"), cur = sel.value;
    sel.replaceChildren(h("option", { value: "", text: "Algemeen" }), goalsSorted().map(function (g) { return h("option", { value: g.id, text: cut(g.titel, 40) }); }));
    sel.value = cur && S.goals[cur] ? cur : "";
  }
  function renderNotes() {
    var ul = $("#note-list"); ul.replaceChildren();
    var notes = S.notes.filter(function (n) { return n.soort !== "markt"; });
    if (!notes.length) { ul.append(h("li", { class: "hint", text: S.loaded.notities ? "Nog niets vastgelegd. Notities en opgeslagen inzichten uit het sparren komen hier." : "Logboek laden…" })); return; }
    notes.slice(0, 60).forEach(function (n) {
      var g = n.doel && S.goals[n.doel];
      ul.append(h("li", null,
        h("div", { class: "note-meta" },
          h("span", { text: dateOnly(n.datum) }),
          n.soort === "inzicht" ? h("span", { class: "note-tag", text: "inzicht" }) : null,
          g ? h("span", { class: "note-tag", text: cut(g.titel, 32) }) : null,
          canWrite() ? delBtn(function () { deleteNote(n.id); }, "Verwijder notitie", true) : null),
        h("p", { class: "note-text", text: n.tekst })));
    });
  }
  async function addNote(text, soort, doel) {
    if (!canWrite()) { toast("Opslaan kan alleen als eigenaar."); return; }
    text = String(text || "").trim(); if (!text) return;
    var id = rid("n"), body = { tekst: text.slice(0, 4000), soort: soort || "notitie", doel: doel || null, datum: new Date().toISOString() };
    S.notes.unshift(Object.assign({ id: id }, body));
    renderNotes(); renderMarketLog();
    try { await S.db.doc("notities/" + id).set(body); } catch (e) { writeError(e); }
  }
  function deleteNote(id) {
    S.notes = S.notes.filter(function (n) { return n.id !== id; });
    removeDoc("notities/" + id);
    renderNotes(); renderMarketLog();
  }

  /* ================= Sparren met Claude ================= */
  var SUGS = [
    "Waar moet ik deze week voorrang aan geven?",
    "Zijn mijn doelen realistisch voor één jaar?",
    "Welk doel is nog niet meetbaar genoeg?",
    "Ik loop achter. Wat stuur ik bij?"
  ];
  function sparOff(msg) {
    $("#spar-form").hidden = true; $("#spar-sugs").hidden = true;
    var p = $("#spar-off"); p.hidden = false; p.textContent = msg;
  }
  function setupSpar() {
    if (!S.sparOn) { sparOff("Sparren met Claude zet je aan door ANTHROPIC_API_KEY in te stellen bij Variables in Railway. Zie de README in je repo."); return; }
    $("#spar-form").hidden = false; $("#spar-sugs").hidden = false; $("#spar-off").hidden = true;
    var box = $("#spar-sugs"); box.replaceChildren();
    SUGS.forEach(function (q) { box.append(h("button", { type: "button", class: "sug", text: q, onclick: function () { sendChat(q); } })); });
  }
  function sparAbout(prefill) {
    if (location.hash !== "#doelen") location.hash = "#doelen";
    setTimeout(function () {
      var inp = $("#spar-input"); if (!inp || $("#spar-form").hidden) return;
      inp.value = prefill; $("#spar").scrollIntoView({ block: "start", behavior: "smooth" });
      inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
    }, 60);
  }
  function sparRules() {
    var naam = String(S.settings.naam || "").trim() || "de gebruiker";
    return [
      "Je bent de sparringpartner van " + naam + " in zijn persoonlijke dashboard Koersplan. Hij gebruikt het om te zien of hij op koers ligt met zijn doelen voor het komende jaar en om bij te sturen.",
      "Antwoord in het Nederlands, direct en concreet, als een eerlijke coach die meedenkt. Geen algemene motivatieteksten en geen lange lijsten met tips. Houd het kort, meestal onder de 150 woorden, tenzij hij om meer vraagt. Stel hooguit één vraag terug.",
      "Baseer je op de gegevens hieronder. Zeg eerlijk als iets onrealistisch is, als hij te veel tegelijk wil, of als een doel niet meetbaar is.",
      "Over beleggen: help hem zijn eigen route, regels en scenario's helder en consequent te maken. Geef geen persoonlijk koop- of verkoopadvies en geen koersvoorspellingen. Je ziet geen actuele koersen; zeg dat als hij ernaar vraagt.",
      S.toolsOk
        ? "Als een concrete wijziging helpt (een doel scherper formuleren, een wekelijkse actie aanpassen, een nieuw doel, of iets vastleggen in het logboek), stel die dan voor met de tools, hooguit drie per antwoord. Hij beslist zelf of hij ze toepast. Noem in je tekst kort wat je voorstelt. Gebruik de doel_id's en actie_id's uit de gegevens."
        : "Als een concrete wijziging helpt, beschrijf die precies; hij past het zelf aan op de pagina."
    ].join("\n");
  }
  function buildContext() {
    var now = new Date(), curMon = thisMonday(), ws = yearWeeks();
    var L = [sparRules(), "", "=== GEGEVENS UIT HET DASHBOARD ==="];
    L.push("Vandaag: " + DAYS[now.getDay()] + " " + now.getDate() + " " + MONTHS_LONG[now.getMonth()] + " " + now.getFullYear() + ", week " + isoWeek(curMon).week + ".");
    L.push("Het dashboardjaar loopt van " + longDate(ws[0]) + " tot en met " + longDate(addDays(ws[51], 6)) + ". Score per week = gemiddeld percentage afgevinkte acties over de doelen; 60% of meer telt als op koers.");
    var idx = -1; ws.forEach(function (m, i) { if (m.getTime() === curMon.getTime()) idx = i; });
    var end = idx < 0 ? (curMon.getTime() > ws[51].getTime() ? 52 : 0) : idx + 1;
    var recent = ws.slice(Math.max(0, end - 8), end);
    L.push("", "WEEKSCORES:");
    if (!recent.length) L.push("- nog geen weken");
    recent.forEach(function (mon) {
      var r = weekScore(mon), w = isoWeek(mon).week;
      if (r.state === "current") L.push("- week " + w + " (lopend): " + pct(r.score) + " tot nu toe; op dit moment van de week zou " + Math.round(paceNow() * 100) + "% op schema zijn");
      else L.push("- week " + w + ": " + (r.score == null ? "niet ingevuld" : pct(r.score)));
    });
    var curItems = itemsFor(curMon);
    L.push("", "DOELEN:");
    var gs = goalsSorted();
    if (!gs.length) L.push("(nog geen doelen)");
    gs.forEach(function (g) {
      L.push("## " + (g.titel || "Naamloos") + " [doel_id: " + g.id + "]" + (g.categorie ? " · " + g.categorie : ""));
      if (g.waarom) L.push("Waarom: " + cut(g.waarom, 400));
      L.push("Resultaat: " + (g.resultaat ? cut(g.resultaat, 300) : "nog niet vastgelegd"));
      L.push("Deadline: " + (g.deadline || "geen"));
      var acts = (g.acties || []).map(function (a) {
        var it = curItems[a.id];
        return a.tekst + ", " + a.perWeek + "× per week [actie_id: " + a.id + "]" + (it ? " (deze week " + Math.min(it.gedaan, it.target) + "/" + it.target + ")" : "");
      });
      L.push("Wekelijkse acties: " + (acts.length ? acts.join("; ") : "geen"));
      var ms = g.mijlpalen || [];
      if (ms.length) L.push("Mijlpalen: " + ms.map(function (m) { return (m.klaar ? "[klaar] " : "[open] ") + m.tekst; }).join("; "));
      var a4 = goalAvg4(g.id);
      L.push("Gemiddeld laatste 4 afgeronde weken: " + (a4 == null ? "nog geen data" : pct(a4)));
    });
    var refl = recent.map(function (mon) { return { w: isoWeek(mon).week, t: String(((S.weeks[weekKey(mon)] || {}).reflectie) || "").trim() }; }).filter(function (x) { return x.t; }).slice(-4);
    if (refl.length) { L.push("", "WEEKREFLECTIES:"); refl.forEach(function (r) { L.push("- week " + r.w + ": " + cut(r.t, 400)); }); }
    var notes = S.notes.filter(function (n) { return n.soort !== "markt"; }).slice(0, 12);
    if (notes.length) {
      L.push("", "LOGBOEK (nieuwste eerst):");
      notes.forEach(function (n) { var g = n.doel && S.goals[n.doel]; L.push("- " + dateOnly(n.datum) + (g ? " [" + g.titel + "]" : "") + ": " + cut(n.tekst, 350)); });
    }
    var plan = S.invest.plan || {}, pf = S.invest.portfolio || {};
    L.push("", "BELEGGEN (eigen plan; geen live koersen beschikbaar):");
    if (plan.route) L.push("Route: " + cut(plan.route, 500));
    if ((plan.regels || []).length) L.push("Regels: " + plan.regels.map(function (r) { return r.tekst; }).join("; "));
    if (plan.maxPositie) L.push("Maximaal per positie: " + plan.maxPositie + "%");
    if ((plan.scenarios || []).length) L.push("Scenario's: " + plan.scenarios.map(function (x) { return "als " + x.als + " dan " + x.dan + " (" + (x.status === "geraakt" ? "geraakt" : "actief") + ")"; }).join("; "));
    if ((plan.volg || []).length) L.push("Volgt: " + plan.volg.map(function (v) { return v.tekst; }).join(", "));
    var pos = pf.posities || [], tot = pos.reduce(function (a, p) { return a + (Number(p.waarde) || 0); }, 0);
    if (pos.length) L.push("Posities: " + pos.map(function (p) { return tot > 0 && Number(p.waarde) > 0 ? p.naam + " " + Math.round(100 * Number(p.waarde) / tot) + "%" : p.naam; }).join(", ") + (tot > 0 ? "" : " (nog geen waardes ingevuld)"));
    var inl = (S.invest.inleg || {}).maanden || {}, dk = Object.keys(inl).filter(function (k) { return inl[k]; }).sort();
    if (dk.length) L.push("Maandelijkse inleg gedaan in: " + dk.join(", "));
    var ml = S.notes.filter(function (n) { return n.soort === "markt"; }).slice(0, 5);
    if (ml.length) { L.push("Marktnotities:"); ml.forEach(function (n) { L.push("- " + dateOnly(n.datum) + ": " + cut(n.tekst, 300)); }); }
    return L.join("\n");
  }

  /* ---------- Markdown light (veilig, zonder innerHTML) ---------- */
  function inline(el, text) {
    var parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    parts.forEach(function (p) {
      if (!p) return;
      if (/^\*\*[^*]+\*\*$/.test(p)) el.append(h("strong", { text: p.slice(2, -2) }));
      else if (/^`[^`]+`$/.test(p)) el.append(h("code", { text: p.slice(1, -1) }));
      else el.append(document.createTextNode(p));
    });
  }
  function renderMd(el, text) {
    el.replaceChildren();
    var lines = String(text || "").replace(/\r/g, "").split("\n");
    var list = null, listType = "", para = [];
    function flushPara() { if (para.length) { var p = h("p"); inline(p, para.join(" ")); el.append(p); para = []; } }
    function flushList() { if (list) { el.append(list); list = null; listType = ""; } }
    lines.forEach(function (raw) {
      var line = raw.trim();
      var ul = /^[-*•]\s+(.*)$/.exec(line), ol = /^\d+[.)]\s+(.*)$/.exec(line), hd = /^#{1,4}\s+(.*)$/.exec(line);
      if (!line) { flushPara(); flushList(); return; }
      if (ul || ol) {
        flushPara();
        var t = ul ? "ul" : "ol";
        if (!list || listType !== t) { flushList(); list = h(t); listType = t; }
        var li = h("li"); inline(li, (ul || ol)[1]); list.append(li); return;
      }
      flushList();
      if (hd) { flushPara(); var p2 = h("p"); p2.append(h("strong", { text: hd[1].replace(/\*\*/g, "") })); el.append(p2); return; }
      para.push(line);
    });
    flushPara(); flushList();
  }

  function scrollLog() { var log = $("#spar-log"); log.scrollTop = log.scrollHeight; }
  function addMsg(role, text) {
    var body = h("div", { class: "msg-body" });
    var props = h("div", { class: "props" });
    var tools = h("div", { class: "msg-tools" });
    var m = h("div", { class: "msg msg-" + role }, h("span", { class: "msg-who", text: role === "user" ? "Jij" : "Claude" }), body, props, tools);
    $("#spar-log").append(m);
    if (text) { if (role === "user") body.textContent = text; else renderMd(body, text); }
    else body.append(h("span", { class: "thinking", text: "Denkt na…" }));
    scrollLog();
    return { el: m, body: body, props: props, tools: tools };
  }
  function setBusy(b) {
    S.chat.busy = b;
    $("#spar-send").disabled = b; $("#spar-stop").hidden = !b;
    Array.prototype.forEach.call(document.querySelectorAll(".sug"), function (x) { x.disabled = b; });
  }
  function proposalText(p) {
    var F = { titel: "Titel", waarom: "Waarom", resultaat: "Resultaat", deadline: "Deadline" };
    var g = p.doel && S.goals[p.doel];
    if (p.type === "doel") return { title: F[p.veld] + " aanpassen", sub: g ? g.titel : "", body: p.waarde || "(leeg)" };
    if (p.type === "actie") {
      var t = p.perWeek === 0 ? "Actie verwijderen" : p.actie ? "Actie aanpassen" : "Actie toevoegen";
      return { title: t, sub: g ? g.titel : "", body: p.perWeek === 0 ? (p.tekst || "") : (p.tekst || "") + " · " + p.perWeek + "× per week" };
    }
    if (p.type === "nieuw") return { title: "Nieuw doel", sub: p.categorie || "", body: p.titel + (p.acties && p.acties.length ? "\nElke week: " + p.acties.map(function (a) { return a.tekst + " (" + a.perWeek + "×)"; }).join(", ") : "") };
    return { title: "Vastleggen in logboek", sub: g ? g.titel : "", body: p.tekst };
  }
  function renderProposal(target, p) {
    var t = proposalText(p);
    var actions = h("div", { class: "prop-actions" });
    var card = h("div", { class: "prop" },
      h("div", { class: "prop-head" }, h("span", { class: "label", text: "Voorstel" }), h("strong", { text: t.title })),
      t.sub ? h("div", { class: "prop-sub", text: t.sub }) : null,
      h("p", { class: "prop-body", text: t.body }),
      p.reden ? h("p", { class: "prop-why", text: p.reden }) : null,
      actions);
    actions.append(
      h("button", { class: "btn sm", type: "button", text: "Toepassen", onclick: function () { if (applyProposal(p)) { card.classList.add("done"); actions.replaceChildren(h("span", { class: "prop-state", text: "Toegepast" })); } } }),
      h("button", { class: "link-btn", type: "button", text: "Negeren", onclick: function () { actions.replaceChildren(h("span", { class: "prop-state", text: "Genegeerd" })); } }));
    target.props.append(card);
    scrollLog();
  }
  function applyProposal(p) {
    if (!canWrite()) { toast("Opslaan kan alleen als eigenaar."); return false; }
    var g, b, id;
    if (p.type === "doel" || p.type === "actie") {
      g = S.goals[p.doel];
      if (!g) { toast("Dit doel bestaat niet meer."); return false; }
      b = clone(g); b.acties = b.acties || [];
      if (p.type === "doel") b[p.veld] = p.waarde;
      else if (p.actie) {
        var i = -1; b.acties.forEach(function (a, j) { if (a.id === p.actie) i = j; });
        if (i < 0) { toast("Deze actie bestaat niet meer."); return false; }
        if (p.perWeek === 0) b.acties.splice(i, 1);
        else b.acties[i] = Object.assign({}, b.acties[i], { tekst: p.tekst || b.acties[i].tekst, perWeek: p.perWeek });
      } else b.acties.push({ id: rid("a"), tekst: p.tekst, perWeek: p.perWeek });
      b.concept = false; b.bijgewerkt = new Date().toISOString();
      S.goals[p.doel] = b; queueWrite("doelen/" + p.doel, b, 0);
    } else if (p.type === "nieuw") {
      id = rid("d");
      b = { titel: p.titel, categorie: p.categorie || "", waarom: p.waarom || "", resultaat: p.resultaat || "", deadline: "", acties: (p.acties || []).map(function (a) { return { id: rid("a"), tekst: a.tekst, perWeek: a.perWeek }; }), mijlpalen: [], volgorde: nextOrder(), concept: false, bijgewerkt: new Date().toISOString() };
      S.goals[id] = b; queueWrite("doelen/" + id, b, 0);
    } else if (p.type === "notitie") {
      addNote(p.tekst, "inzicht", p.doel && S.goals[p.doel] ? p.doel : null);
    }
    renderAll(true);
    toast("Toegepast.");
    return true;
  }
  function makeTools(target) {
    var count = 0;
    function push(p) {
      if (count >= 4) throw new Error("Maximaal vier voorstellen per antwoord.");
      count++; renderProposal(target, p);
      return "Voorstel getoond. De gebruiker beslist zelf of hij het toepast.";
    }
    function goalOf(id) { var g = S.goals[String(id || "")]; if (!g) throw new Error("Onbekend doel_id. Gebruik een doel_id uit de gegevens."); return g; }
    function txt(v, n) { return String(v == null ? "" : v).trim().slice(0, n); }
    function perW(v) { var n = Math.round(Number(v)); if (!isFinite(n) || n < 0 || n > 14) throw new Error("per_week moet een geheel getal van 0 tot 14 zijn."); return n; }
    return [
      {
        name: "doel_wijzigen",
        description: "Stel voor om één veld van een bestaand doel te wijzigen: titel, waarom, resultaat of deadline (JJJJ-MM-DD, leeg voor geen). De gebruiker ziet het voorstel en beslist zelf. Geeft een bevestiging terug.",
        inputSchema: { type: "object", properties: { doel_id: { type: "string" }, veld: { type: "string", enum: ["titel", "waarom", "resultaat", "deadline"] }, nieuwe_waarde: { type: "string" }, reden: { type: "string", description: "Eén korte zin waarom." } }, required: ["doel_id", "veld", "nieuwe_waarde"] },
        execute: function (inp) {
          goalOf(inp.doel_id);
          var veld = txt(inp.veld, 20);
          if (["titel", "waarom", "resultaat", "deadline"].indexOf(veld) < 0) throw new Error("veld moet titel, waarom, resultaat of deadline zijn.");
          var val = txt(inp.nieuwe_waarde, veld === "titel" ? 120 : 1200);
          if (veld === "titel" && !val) throw new Error("Een titel mag niet leeg zijn.");
          if (veld === "deadline" && val && !parseYmd(val)) throw new Error("Een deadline schrijf je als JJJJ-MM-DD.");
          return push({ type: "doel", doel: String(inp.doel_id), veld: veld, waarde: val, reden: txt(inp.reden, 300) });
        }
      },
      {
        name: "actie_wijzigen",
        description: "Stel voor om een wekelijkse actie van een doel toe te voegen (laat actie_id weg), aan te passen (met actie_id) of te verwijderen (per_week 0). per_week is hoe vaak per week, 0 tot 14. De gebruiker beslist zelf.",
        inputSchema: { type: "object", properties: { doel_id: { type: "string" }, actie_id: { type: "string" }, tekst: { type: "string" }, per_week: { type: "integer", minimum: 0, maximum: 14 }, reden: { type: "string" } }, required: ["doel_id", "per_week"] },
        execute: function (inp) {
          var g = goalOf(inp.doel_id), aid = txt(inp.actie_id, 40), n = perW(inp.per_week), tekst = txt(inp.tekst, 120), a = null;
          if (aid) { (g.acties || []).forEach(function (x) { if (x.id === aid) a = x; }); if (!a) throw new Error("Onbekend actie_id voor dit doel."); }
          else if (!tekst || n === 0) throw new Error("Een nieuwe actie heeft tekst en per_week van minstens 1 nodig.");
          return push({ type: "actie", doel: String(inp.doel_id), actie: aid || null, tekst: tekst || (a && a.tekst) || "", perWeek: n, reden: txt(inp.reden, 300) });
        }
      },
      {
        name: "doel_toevoegen",
        description: "Stel een nieuw doel voor met titel, categorie, waarom, meetbaar resultaat en wekelijkse acties. Alleen als het echt ontbreekt. De gebruiker beslist zelf.",
        inputSchema: { type: "object", properties: { titel: { type: "string" }, categorie: { type: "string" }, waarom: { type: "string" }, resultaat: { type: "string" }, acties: { type: "array", items: { type: "object", properties: { tekst: { type: "string" }, per_week: { type: "integer", minimum: 1, maximum: 14 } }, required: ["tekst", "per_week"] } }, reden: { type: "string" } }, required: ["titel"] },
        execute: function (inp) {
          var titel = txt(inp.titel, 120); if (!titel) throw new Error("Een doel heeft een titel nodig.");
          var acties = (Array.isArray(inp.acties) ? inp.acties : []).slice(0, 4).map(function (a) { return { tekst: txt(a && a.tekst, 120), perWeek: Math.max(1, perW(a && a.per_week)) }; }).filter(function (a) { return a.tekst; });
          return push({ type: "nieuw", titel: titel, categorie: txt(inp.categorie, 30), waarom: txt(inp.waarom, 1200), resultaat: txt(inp.resultaat, 600), acties: acties, reden: txt(inp.reden, 300) });
        }
      },
      {
        name: "logboek_notitie",
        description: "Stel voor om een kort inzicht, besluit of afspraak uit dit gesprek vast te leggen in het logboek, eventueel bij een doel. De gebruiker beslist zelf.",
        inputSchema: { type: "object", properties: { tekst: { type: "string" }, doel_id: { type: "string" } }, required: ["tekst"] },
        execute: function (inp) {
          var t = txt(inp.tekst, 1000); if (!t) throw new Error("Lege notitie.");
          var did = txt(inp.doel_id, 40);
          return push({ type: "notitie", tekst: t, doel: did && S.goals[did] ? did : null });
        }
      }
    ];
  }
  var SPAR_ERR = {
    geen_sleutel: "Sparren staat uit: zet ANTHROPIC_API_KEY bij Variables in Railway.",
    te_vaak: "Je hebt dit uur al veel gevraagd. Probeer het later opnieuw.",
    sleutel: "Je ANTHROPIC_API_KEY werkt niet. Controleer de sleutel in Railway.",
    limiet: "De limiet van je Anthropic-account is bereikt. Probeer het later opnieuw.",
    druk: "Claude is even overbelast. Probeer het zo opnieuw.",
    verzoek: "Claude kon de vraag niet verwerken. Controleer ANTHROPIC_MODEL in Railway, of begin een nieuw gesprek.",
    netwerk: "Geen verbinding met de server. Probeer het opnieuw."
  };
  async function sendChat(text) {
    text = String(text || "").trim();
    if (!text || !S.sparOn || S.chat.busy) return;
    $("#spar-input").value = "";
    S.chat.turns.push({ role: "user", content: text });
    addMsg("user", text);
    var out = addMsg("assistant", "");
    setBusy(true);
    var ctl = new AbortController(); S.chat.ctl = ctl;
    try {
      var res = await api("POST", "/api/spar", { system: buildContext(), messages: S.chat.turns.slice(-16) }, ctl.signal);
      var byName = {};
      makeTools(out).forEach(function (t) { byName[t.name] = t.execute; });
      (res.toolCalls || []).forEach(function (tc) {
        var fn = tc && byName[tc.name];
        if (!fn) return;
        try { fn(tc.input || {}); } catch (e) { /* ongeldig voorstel: overslaan */ }
      });
      var txt = String(res.text || "").trim();
      if (!txt) txt = out.props.childElementCount ? "Zie mijn voorstel hieronder." : "Ik kreeg geen antwoord. Stel je vraag anders.";
      renderMd(out.body, txt);
      S.chat.turns.push({ role: "assistant", content: txt });
      addSaveLink(out, txt);
    } catch (e) {
      if (e && (e.name === "AbortError" || e.code === "auth")) out.el.remove();
      else out.body.replaceChildren(h("p", { class: "msg-err", text: SPAR_ERR[e && e.code] || "Er ging iets mis bij het sparren. Probeer het opnieuw." }));
    } finally {
      S.chat.ctl = null; setBusy(false); scrollLog();
    }
  }
  function addSaveLink(out, text) {
    if (!canWrite()) return;
    var b = h("button", { type: "button", class: "link-btn", text: "Bewaar in logboek" });
    b.addEventListener("click", function () { addNote(cut(text, 2000), "inzicht", null); b.replaceWith(h("span", { class: "prop-state", text: "Bewaard in logboek" })); });
    out.tools.append(b);
  }
  /* ================= Render: investeren ================= */
  var SOORTEN = ["", "Aandeel", "ETF", "Goud", "Crypto", "Stablecoin", "Cash", "Obligaties", "Overig"];
  function savePlan(patch) {
    if (!canWrite()) return;
    var body = Object.assign({}, clone(S.invest.plan || {}), patch);
    S.invest.plan = body; queueWrite("invest/plan", body, 0); renderInvest();
  }
  function renderInvest() {
    renderPortfolio(); renderPlan(); renderDca(); renderScen(); renderWatch(); renderMarketLog();
    if (S.view === "investeren") renderHistChart();
    var w = canWrite();
    ["#rule-form", "#scen-form", "#watch-form", "#mlog-form"].forEach(function (sel) { $(sel).hidden = !w; });
    $("#pf-edit").hidden = !w; $("#route-edit").hidden = !w || S.routeEdit;
    $("#max-input").disabled = !w;
    $("#inv-spar").hidden = !S.sparOn;
  }
  function renderPortfolio() {
    var body = $("#pf-body");
    if (S.pfEdit) { if (!body.querySelector(".pf-form")) body.replaceChildren(pfForm()); return; }
    body.replaceChildren();
    if (!S.db || !S.loaded.invest) { body.append(emptyBox(S.db || S.status === "loading" ? "Laden…" : "Je portfolio kon niet worden geladen.")); return; }
    var pf = S.invest.portfolio || {}, plan = S.invest.plan || {};
    var pos = (pf.posities || []).map(function (p) { return Object.assign({}, p, { w: toNum(p.waarde), i: toNum(p.inleg) }); });
    $("#pf-edit").textContent = pos.length ? "Waardes bijwerken" : "Posities toevoegen";
    if (!pos.length) { body.append(emptyBox("Nog geen posities. Voeg je beleggingen toe om je verdeling te zien.")); return; }
    var total = pos.reduce(function (a, p) { return a + (p.w || 0); }, 0);
    var both = pos.filter(function (p) { return p.w != null && p.i != null && p.i > 0; });
    var sw = both.reduce(function (a, p) { return a + p.w; }, 0), si = both.reduce(function (a, p) { return a + p.i; }, 0);
    var up = sw >= si;
    body.append(h("div", { class: "pf-head" },
      h("div", { class: "stat" }, h("span", { class: "label", text: "Totale waarde" }), h("span", { class: "stat-v", text: total > 0 ? eur0.format(total) : "–" }),
        h("span", { class: "sub-d", text: pf.bijgewerkt && parseYmd(pf.bijgewerkt) ? "Bijgewerkt " + longDate(parseYmd(pf.bijgewerkt)) : "Nog niet bijgewerkt" })),
      si > 0 ? h("div", { class: "stat" }, h("span", { class: "label", text: "Rendement op inleg" }),
        h("span", { class: "stat-v " + (up ? "up" : "down"), text: (up ? "+" : "−") + num1.format(Math.abs(100 * (sw - si) / si)) + "%" }),
        h("span", { class: "sub-d", text: (up ? "+" : "−") + eur0.format(Math.abs(sw - si)) + " over " + both.length + (both.length === 1 ? " positie" : " posities") })) : null));
    if (total <= 0) {
      body.append(h("p", { class: "hint", style: "margin-top:12px", text: "Vul je huidige waardes in om je verdeling te zien. Posities: " + pos.map(function (p) { return p.naam; }).join(", ") + "." }));
      return;
    }
    var max = Number(plan.maxPositie) || null;
    var rows = h("div", { class: "alloc", role: "list", "aria-label": "Verdeling per positie" });
    pos.slice().sort(function (a, b) { return (b.w || 0) - (a.w || 0); }).forEach(function (p) {
      var share = (p.w || 0) / total, over = max && share * 100 > max;
      rows.append(h("div", { class: "alloc-row", role: "listitem" },
        h("div", { class: "alloc-name" }, h("span", { text: p.naam || "Positie" }), p.soort ? h("span", { class: "alloc-type", text: p.soort }) : null),
        h("div", { class: "alloc-track", "aria-hidden": "true" }, h("i", { style: "width:" + Math.max(0.6, share * 100).toFixed(2) + "%" })),
        h("span", { class: "alloc-val", text: (p.w != null ? eur0.format(p.w) : "–") + " · " + Math.round(share * 100) + "%" }),
        over ? h("div", { class: "alloc-flag" }, chip("warn", "Boven je maximum van " + max + "%")) : null));
    });
    body.append(rows);
  }
  function pfForm() {
    var pf = S.invest.portfolio || {};
    if (!S.pfDraft) S.pfDraft = (clone(pf.posities) || []).map(function (p) { return { id: p.id || rid("p"), naam: p.naam || "", ticker: p.ticker || "", soort: p.soort || "", waarde: p.waarde == null ? "" : p.waarde, inleg: p.inleg == null ? "" : p.inleg }; });
    var d = S.pfDraft;
    var form = h("form", { class: "pf-form", onsubmit: function (e) { e.preventDefault(); savePortfolio(); } });
    form.append(h("div", { class: "pf-row pf-hdr", "aria-hidden": "true" }, h("span", { text: "Naam" }), h("span", { text: "Soort" }), h("span", { text: "Waarde €" }), h("span", { text: "Ingelegd €" }), h("span")));
    d.forEach(function (p, idx) {
      var opts = SOORTEN.slice(); if (p.soort && opts.indexOf(p.soort) < 0) opts.push(p.soort);
      form.append(h("div", { class: "pf-row" },
        h("input", { id: "pf-" + p.id + "-naam", type: "text", maxlength: 60, "aria-label": "Naam", placeholder: "Naam", value: p.naam, oninput: function (e) { p.naam = e.target.value; } }),
        h("select", { id: "pf-" + p.id + "-soort", "aria-label": "Soort", value: p.soort, onchange: function (e) { p.soort = e.target.value; } }, opts.map(function (x) { return h("option", { value: x, text: x || "Soort" }); })),
        h("input", { id: "pf-" + p.id + "-waarde", type: "number", min: 0, step: "any", inputmode: "decimal", "aria-label": "Huidige waarde in euro", placeholder: "Waarde €", value: p.waarde, oninput: function (e) { p.waarde = e.target.value; } }),
        h("input", { id: "pf-" + p.id + "-inleg", type: "number", min: 0, step: "any", inputmode: "decimal", "aria-label": "Ingelegd bedrag in euro, optioneel", placeholder: "Ingelegd €", value: p.inleg, oninput: function (e) { p.inleg = e.target.value; } }),
        delBtn(function () { d.splice(idx, 1); $("#pf-body").replaceChildren(pfForm()); }, "Verwijder positie", false)));
    });
    form.append(h("div", { class: "form-actions" },
      h("button", { type: "button", class: "btn ghost sm", text: "Positie toevoegen", onclick: function () { var np = { id: rid("p"), naam: "", ticker: "", soort: "", waarde: "", inleg: "" }; d.push(np); $("#pf-body").replaceChildren(pfForm()); var el = document.getElementById("pf-" + np.id + "-naam"); if (el) el.focus(); } }),
      h("span", { class: "spacer" }),
      h("button", { type: "button", class: "link-btn", text: "Annuleren", onclick: function () { S.pfEdit = false; S.pfDraft = null; renderInvest(); } }),
      h("button", { type: "submit", class: "btn sm", text: "Opslaan" })));
    form.append(h("p", { class: "hint", text: "Bij opslaan komt je totale waarde van vandaag in het verloop. Ingelegd bedrag is optioneel en nodig voor je rendement." }));
    return form;
  }
  function savePortfolio() {
    var d = (S.pfDraft || []).filter(function (p) { return String(p.naam || "").trim(); });
    var posities = d.map(function (p) { return { id: p.id, naam: String(p.naam).trim().slice(0, 60), ticker: String(p.ticker || "").trim().slice(0, 12), soort: p.soort || "", waarde: toNum(p.waarde), inleg: toNum(p.inleg) }; });
    var today = ymd(new Date());
    var body = { posities: posities, bijgewerkt: today };
    S.invest.portfolio = body; queueWrite("invest/portfolio", body, 0);
    var total = posities.reduce(function (a, p) { return a + (p.waarde || 0); }, 0);
    if (total > 0) {
      var pts = ((S.invest.historie || {}).punten || []).filter(function (p) { return p.datum !== today; });
      pts.push({ datum: today, totaal: Math.round(total * 100) / 100 });
      pts.sort(function (a, b) { return a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0; });
      var hb = { punten: pts.slice(-400) };
      S.invest.historie = hb; queueWrite("invest/historie", hb, 0);
    }
    S.pfEdit = false; S.pfDraft = null;
    renderInvest(); toast("Portfolio opgeslagen.");
  }
  function renderPlan() {
    var plan = S.invest.plan || {}, rb = $("#route-body");
    if (S.routeEdit) {
      if (!rb.querySelector("textarea")) {
        var ta = h("textarea", { id: "route-input", rows: 6, maxlength: 2000, "aria-label": "Mijn route", value: plan.route || "" });
        rb.replaceChildren(ta, h("div", { class: "form-actions", style: "margin-top:8px;justify-content:flex-end" },
          h("button", { class: "link-btn", type: "button", text: "Annuleren", onclick: function () { S.routeEdit = false; renderInvest(); } }),
          h("button", { class: "btn sm", type: "button", text: "Opslaan", onclick: function () { S.routeEdit = false; savePlan({ route: ta.value.trim() }); } })));
        ta.focus();
      }
    } else {
      rb.replaceChildren(plan.route ? h("p", { class: "route", text: plan.route }) : h("p", { class: "hint", text: "Beschrijf in een paar zinnen hoe je belegt en waarom." }));
    }
    var ul = $("#rules"); ul.replaceChildren();
    var regels = plan.regels || [];
    if (!regels.length) ul.append(h("li", { class: "hint", text: "Nog geen regels." }));
    regels.forEach(function (r) {
      ul.append(h("li", null, h("span", { text: r.tekst }), canWrite() ? delBtn(function () { savePlan({ regels: ((S.invest.plan || {}).regels || []).filter(function (x) { return x.id !== r.id; }) }); }, "Verwijder regel", true) : null));
    });
    var mi = $("#max-input"); if (document.activeElement !== mi) mi.value = plan.maxPositie ? String(plan.maxPositie) : "";
  }
  function yearMonths() {
    var ws = yearWeeks(), a = ws[0], b = addDays(ws[51], 6), out = [];
    var y = a.getFullYear(), m = a.getMonth();
    while (y < b.getFullYear() || (y === b.getFullYear() && m <= b.getMonth())) {
      out.push({ key: y + "-" + pad(m + 1), y: y, m: m });
      m++; if (m > 11) { m = 0; y++; }
    }
    return out;
  }
  function renderDca() {
    var box = $("#months"); box.replaceChildren();
    var inl = (S.invest.inleg || {}).maanden || {}, now = new Date(), nowK = now.getFullYear() + "-" + pad(now.getMonth() + 1);
    var months = yearMonths(), n = 0, w = canWrite();
    months.forEach(function (mk) {
      var on = !!inl[mk.key]; if (on) n++;
      box.append(h("button", {
        type: "button", class: "mon" + (on ? " on" : "") + (mk.key === nowK ? " now" : ""), "aria-pressed": on ? "true" : "false", disabled: !w,
        "aria-label": MONTHS_LONG[mk.m] + " " + mk.y + ": " + (on ? "ingelegd" : "nog niet ingelegd"), onclick: function () { toggleMonth(mk.key); }
      }, h("span", { text: MONTHS[mk.m] }), h("span", { class: "mon-y", text: "'" + String(mk.y).slice(2) })));
    });
    $("#dca-sum").textContent = n + " van " + months.length + " maanden";
  }
  function toggleMonth(k) {
    if (!canWrite()) return;
    var cur = clone(S.invest.inleg || {}) || {}; cur.maanden = cur.maanden || {};
    if (cur.maanden[k]) delete cur.maanden[k]; else cur.maanden[k] = true;
    S.invest.inleg = cur; queueWrite("invest/inleg", cur, 300); renderDca();
  }
  function setScen(id, patch) {
    var list = ((S.invest.plan || {}).scenarios || []).slice();
    if (patch === null) list = list.filter(function (x) { return x.id !== id; });
    else list = list.map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; });
    savePlan({ scenarios: list });
  }
  function renderScen() {
    var ul = $("#scen-list"); ul.replaceChildren();
    var list = (S.invest.plan || {}).scenarios || [], w = canWrite();
    if (!list.length) { ul.append(h("li", { class: "hint", style: "border:0;padding:0", text: "Nog geen scenario's." })); return; }
    list.forEach(function (x) {
      var hit = x.status === "geraakt";
      ul.append(h("li", { class: hit ? "hit" : null },
        h("div", null, h("p", null, h("span", { class: "k", text: "Als" }), h("span", { text: x.als })), h("p", null, h("span", { class: "k", text: "Dan" }), h("span", { text: x.dan }))),
        h("div", { class: "scen-act" },
          w ? h("button", { type: "button", class: "btn ghost sm", "aria-pressed": hit ? "true" : "false", title: "Wissel tussen actief en geraakt", text: hit ? "Geraakt" : "Actief", onclick: function () { setScen(x.id, { status: hit ? "actief" : "geraakt" }); } }) : h("span", { class: "hint", text: hit ? "Geraakt" : "Actief" }),
          w ? delBtn(function () { setScen(x.id, null); }, "Verwijder scenario", true) : null)));
    });
  }
  function renderWatch() {
    var box = $("#watch-list"); box.replaceChildren();
    var list = (S.invest.plan || {}).volg || [], w = canWrite();
    if (!list.length) { box.append(h("span", { class: "hint", text: "Nog niets. Voeg toe wat je in de gaten houdt." })); return; }
    list.forEach(function (v) {
      box.append(h("span", { class: "wchip" }, h("span", { text: v.tekst }),
        w ? delBtn(function () { savePlan({ volg: ((S.invest.plan || {}).volg || []).filter(function (x) { return x.id !== v.id; }) }); }, "Verwijder " + v.tekst, true) : null));
    });
  }
  function renderMarketLog() {
    var ul = $("#mlog-list"); ul.replaceChildren();
    var list = S.notes.filter(function (n) { return n.soort === "markt"; });
    if (!list.length) { ul.append(h("li", { class: "hint", style: "border:0", text: "Nog geen marktnotities." })); return; }
    list.slice(0, 40).forEach(function (n) {
      ul.append(h("li", null, h("div", { class: "note-meta" }, h("span", { text: dateOnly(n.datum) }), canWrite() ? delBtn(function () { deleteNote(n.id); }, "Verwijder marktnotitie", true) : null), h("p", { class: "note-text", text: n.tekst })));
    });
  }

  /* ================= Grafieken ================= */
  function topRounded(x, y, w, hgt, r) {
    r = Math.max(0, Math.min(r, w / 2, hgt));
    return "M" + x + "," + (y + hgt) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + hgt) + "Z";
  }
  function showTip(x, y, rows) {
    var t = $("#tip"); t.replaceChildren.apply(t, rows); t.hidden = false;
    var r = t.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    var left = x + 14, top = y + 14;
    if (left + r.width > vw - 8) left = x - r.width - 14;
    if (top + r.height > vh - 8) top = y - r.height - 14;
    t.style.left = Math.max(8, left) + "px"; t.style.top = Math.max(8, top) + "px";
  }
  function hideTip() { $("#tip").hidden = true; }
  function tipRow(kind, color, value, label) {
    return h("div", { class: "tip-r" }, h("span", { class: kind, style: "background:" + color }), h("strong", { text: value }), h("span", { text: label }));
  }
  function weekTipRows(d) {
    var rows = [h("div", { class: "tip-h", text: "Week " + isoWeek(d.mon).week + " · " + rangeLabel(d.mon) })];
    if (d.state === "future") rows.push(h("div", { text: "Nog te gaan" }));
    else {
      rows.push(tipRow("kb", "var(--s1)", d.score == null ? "–" : pct(d.score), d.state === "current" ? "weekscore, lopend" : d.score == null ? "niet ingevuld" : "weekscore"));
      if (d.avg != null) rows.push(tipRow("k", "var(--s2)", pct(d.avg), "gemiddelde 4 weken"));
    }
    return rows;
  }
  function yearSeries() {
    var data = yearWeeks().map(function (mon, i) { var r = weekScore(mon); r.mon = mon; r.i = i; return r; });
    data.forEach(function (d) {
      d.avg = null;
      if (d.state !== "past") return;
      var win = data.slice(Math.max(0, d.i - 3), d.i + 1).filter(function (x) { return x.state === "past" && x.score != null; });
      if (win.length) d.avg = win.reduce(function (a, x) { return a + x.score; }, 0) / win.length;
    });
    return data;
  }
  function renderYearChart(data) {
    var box = $("#y-chart"); if (!box || !box.clientWidth) return;
    box.replaceChildren();
    var W = Math.max(280, Math.floor(box.clientWidth)), H = 236;
    var m = { l: 38, r: 8, t: 14, b: 26 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var n = data.length, slot = pw / n, bw = clamp(slot - 2, 2, 24);
    function y(v) { return m.t + ph * (1 - v / 100); }
    function cx(i) { return m.l + slot * i + slot / 2; }
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Weekscore per week en het gemiddelde van vier weken. De tabel eronder toont dezelfde waarden." });
    [0, 50, 100].forEach(function (v) {
      svg.append(sv("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: v === 0 ? "c-base" : "c-grid" }));
      svg.append(sv("text", { x: m.l - 6, y: y(v) + 3.5, class: "c-tick", "text-anchor": "end" }, v + "%"));
    });
    svg.append(sv("line", { x1: m.l, x2: W - m.r, y1: y(60), y2: y(60), class: "c-thr" }));
    svg.append(sv("text", { x: m.l - 6, y: y(60) + 3.5, class: "c-tick", "text-anchor": "end" }, "60%"));
    data.forEach(function (d) {
      var x = cx(d.i) - bw / 2;
      if (d.score != null) {
        var v = clamp(d.score, 0, 100), top = y(v), hgt = y(0) - top;
        if (hgt >= 1) svg.append(sv("path", { d: topRounded(x, top, bw, hgt, 4), class: "c-bar" + (d.state === "current" ? " cur" : "") }));
        else svg.append(sv("rect", { x: x, y: y(0) - 1.5, width: bw, height: 1.5, class: "c-bar" + (d.state === "current" ? " cur" : "") }));
      } else if (d.state === "past") svg.append(sv("rect", { x: x, y: y(0) - 3, width: bw, height: 3, class: "c-none" }));
    });
    var pts = data.filter(function (d) { return d.avg != null; }).map(function (d) { return [cx(d.i), y(d.avg)]; });
    if (pts.length >= 2) svg.append(sv("path", { d: "M" + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join("L"), class: "c-line" }));
    if (pts.length) { var last = pts[pts.length - 1]; svg.append(sv("circle", { cx: last[0], cy: last[1], r: 4.5, class: "c-dot" })); }
    var lastM = -1, lastX = -99;
    data.forEach(function (d) {
      var thu = addDays(d.mon, 3);
      if (thu.getMonth() !== lastM) {
        lastM = thu.getMonth();
        var x = cx(d.i);
        if (x - lastX >= 30 && x <= W - m.r - 8) { svg.append(sv("text", { x: x, y: H - 8, class: "c-tick", "text-anchor": "middle" }, MONTHS[thu.getMonth()])); lastX = x; }
      }
    });
    var cross = sv("line", { x1: 0, x2: 0, y1: m.t, y2: y(0), class: "c-cross", visibility: "hidden" });
    svg.append(cross);
    var hit = sv("rect", { x: m.l, y: 0, width: pw, height: H, fill: "transparent" });
    function at(ev) {
      var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width);
      var i = clamp(Math.floor((px - m.l) / slot), 0, n - 1), d = data[i];
      cross.setAttribute("x1", cx(i)); cross.setAttribute("x2", cx(i)); cross.setAttribute("visibility", "visible");
      showTip(ev.clientX, ev.clientY, weekTipRows(d));
    }
    hit.addEventListener("pointermove", at);
    hit.addEventListener("pointerdown", at);
    hit.addEventListener("pointerleave", function () { cross.setAttribute("visibility", "hidden"); hideTip(); });
    svg.append(hit);
    box.append(svg);
  }
  function renderHistChart() {
    var box = $("#h-chart"); if (!box) return;
    var pts = ((S.invest.historie || {}).punten || []).map(function (p) { return { d: parseYmd(p.datum), v: Number(p.totaal) }; }).filter(function (p) { return p.d && isFinite(p.v); });
    $("#hist-note").textContent = pts.length ? pts.length + (pts.length === 1 ? " meting" : " metingen") : "";
    if (pts.length < 2) {
      box.replaceChildren(emptyBox(pts.length ? "Je eerste meting staat erin. Na je volgende update zie je hier het verloop." : "Elke keer dat je je waardes bijwerkt, komt hier een punt bij."));
      return;
    }
    if (!box.clientWidth) return;
    box.replaceChildren();
    var W = Math.max(280, Math.floor(box.clientWidth)), H = 220, m = { l: 58, r: 14, t: 16, b: 26 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var t0 = pts[0].d.getTime(), t1 = pts[pts.length - 1].d.getTime(), span = Math.max(1, t1 - t0);
    var lo = Math.min.apply(null, pts.map(function (p) { return p.v; })), hi = Math.max.apply(null, pts.map(function (p) { return p.v; }));
    if (hi === lo) { hi = hi * 1.05 + 1; lo = Math.max(0, lo * 0.95 - 1); }
    var padV = (hi - lo) * 0.12; lo = Math.max(0, lo - padV); hi = hi + padV;
    function x(t) { return m.l + pw * (t - t0) / span; }
    function y(v) { return m.t + ph * (1 - (v - lo) / (hi - lo)); }
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Totale portfoliowaarde per meting" });
    [lo, (lo + hi) / 2, hi].forEach(function (v, k) {
      svg.append(sv("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: k === 0 ? "c-base" : "c-grid" }));
      svg.append(sv("text", { x: m.l - 6, y: y(v) + 3.5, class: "c-tick", "text-anchor": "end" }, eurC.format(v)));
    });
    var xy = pts.map(function (p) { return [x(p.d.getTime()), y(p.v)]; });
    svg.append(sv("path", { d: "M" + xy[0][0].toFixed(1) + "," + y(lo).toFixed(1) + "L" + xy.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join("L") + "L" + xy[xy.length - 1][0].toFixed(1) + "," + y(lo).toFixed(1) + "Z", class: "c-area" }));
    svg.append(sv("path", { d: "M" + xy.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join("L"), class: "c-line s1" }));
    var lastP = xy[xy.length - 1];
    svg.append(sv("circle", { cx: lastP[0], cy: lastP[1], r: 4.5, class: "c-dot s1" }));
    svg.append(sv("text", { x: m.l, y: H - 8, class: "c-tick" }, shortDate(pts[0].d) + " " + pts[0].d.getFullYear()));
    svg.append(sv("text", { x: W - m.r, y: H - 8, class: "c-tick", "text-anchor": "end" }, shortDate(pts[pts.length - 1].d) + " " + pts[pts.length - 1].d.getFullYear()));
    var cross = sv("line", { x1: 0, x2: 0, y1: m.t, y2: m.t + ph, class: "c-cross", visibility: "hidden" });
    svg.append(cross);
    var hit = sv("rect", { x: m.l - 6, y: 0, width: pw + 12, height: H, fill: "transparent" });
    function at(ev) {
      var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width), best = 0;
      xy.forEach(function (p, i) { if (Math.abs(p[0] - px) < Math.abs(xy[best][0] - px)) best = i; });
      cross.setAttribute("x1", xy[best][0]); cross.setAttribute("x2", xy[best][0]); cross.setAttribute("visibility", "visible");
      showTip(ev.clientX, ev.clientY, [h("div", { class: "tip-h", text: longDate(pts[best].d) }), tipRow("k", "var(--s1)", eur0.format(pts[best].v), "totale waarde")]);
    }
    hit.addEventListener("pointermove", at);
    hit.addEventListener("pointerdown", at);
    hit.addEventListener("pointerleave", function () { cross.setAttribute("visibility", "hidden"); hideTip(); });
    svg.append(hit);
    box.append(svg);
  }

  /* ================= Render: jaar ================= */
  function tile(label, valueNode, note) {
    return h("div", { class: "tile" }, h("span", { class: "label", text: label }), valueNode, note ? h("span", { class: "tile-d", text: note }) : null);
  }
  function renderYear() {
    renderHeader();
    var st = yearStats(), box = $("#y-stats"); box.replaceChildren();
    if (st.avg4 != null) {
      var b = yearBand(st.avg4);
      box.append(tile("Status", chip(b.k, b.t), "Op basis van je laatste " + (st.n4 === 1 ? "week" : st.n4 + " weken")));
    } else box.append(tile("Status", chip("neutral", "Eerste week loopt"), "Na je eerste afgeronde week zie je hier of je op koers ligt."));
    box.append(tile("Laatste 4 weken", h("span", { class: "tile-v", text: pct(st.avg4) }), st.avgAll != null ? "Heel het jaar tot nu: " + pct(st.avgAll) : "Nog geen afgeronde weken"));
    var tr = st.trend == null ? null : Math.round(st.trend);
    var tv = tr == null ? h("span", { class: "tile-v", text: "–" })
      : tr === 0 ? h("span", { class: "tile-v", text: "0 pt" })
      : h("span", { class: "tile-v " + (tr > 0 ? "up" : "down"), text: (tr > 0 ? "+" : "−") + Math.abs(tr) + " pt" });
    box.append(tile("Trend", tv, st.trend == null ? "Zichtbaar na twee afgeronde weken" : st.trendLabel));
    box.append(tile("Bijgehouden", h("span", { class: "tile-v", text: st.done.length ? st.tracked.length + "/" + st.done.length : "–" }), st.done.length ? "afgeronde weken ingevuld" : "Je eerste week loopt nog"));

    var data = yearSeries();
    var grid = $("#y-grid"); grid.replaceChildren();
    var rows = [], map = {};
    data.forEach(function (d) {
      var thu = addDays(d.mon, 3), k = thu.getFullYear() + "-" + thu.getMonth();
      if (!map[k]) { map[k] = { y: thu.getFullYear(), m: thu.getMonth(), weeks: [] }; rows.push(map[k]); }
      map[k].weeks.push(d);
    });
    rows.forEach(function (r, ri) {
      var cells = h("div", { class: "ycells" });
      r.weeks.forEach(function (d) {
        var cls = "ycell", wk = isoWeek(d.mon).week;
        if (d.state === "future") cls += " fut"; else if (d.score == null) cls += " none"; else cls += " b" + bin(d.score);
        if (d.state === "current") cls += " cur";
        var label = "Week " + wk + ", " + rangeLabel(d.mon) + ": " + (d.state === "future" ? "nog te gaan" : d.score == null ? "niet ingevuld" : pct(d.score) + (d.state === "current" ? ", lopend" : ""));
        var cell = h("button", { type: "button", class: cls, "aria-label": label, disabled: d.state === "future" },
          h("span", { class: "yw", text: "wk " + wk }), h("span", { class: "yv", text: d.state === "future" ? "" : d.score == null ? "–" : Math.round(d.score) + "%" }));
        if (d.state !== "future") {
          cell.addEventListener("click", function () { hideTip(); S.selMon = d.mon; location.hash = "#overzicht"; });
          cell.addEventListener("pointerenter", function (ev) { showTip(ev.clientX, ev.clientY, weekTipRows(d)); });
          cell.addEventListener("pointermove", function (ev) { showTip(ev.clientX, ev.clientY, weekTipRows(d)); });
          cell.addEventListener("pointerleave", hideTip);
          cell.addEventListener("focus", function () { var rc = cell.getBoundingClientRect(); showTip(rc.left + rc.width / 2, rc.bottom, weekTipRows(d)); });
          cell.addEventListener("blur", hideTip);
        }
        cells.append(cell);
      });
      var lab = MONTHS[r.m] + (ri === 0 || r.m === 0 ? " '" + String(r.y).slice(2) : "");
      grid.append(h("div", { class: "yrow" }, h("span", { class: "ymonth", text: lab }), cells));
    });

    renderYearChart(data);

    var shown = data.filter(function (d) { return d.state !== "future"; });
    var tb = $("#y-table"); tb.replaceChildren();
    if (!shown.length) tb.append(h("p", { class: "hint", text: "Nog geen weken." }));
    else tb.append(h("table", null,
      h("thead", null, h("tr", null, h("th", { text: "Week" }), h("th", { text: "Datum" }), h("th", { text: "Score" }), h("th", { text: "Gem. 4 wk" }))),
      h("tbody", null, shown.map(function (d) {
        return h("tr", null, h("td", { text: String(isoWeek(d.mon).week) }), h("td", { text: rangeLabel(d.mon) }),
          h("td", { class: "n", text: d.score == null ? "niet ingevuld" : pct(d.score) + (d.state === "current" ? " (lopend)" : "") }), h("td", { class: "n", text: pct(d.avg) }));
      }))));

    var pg = $("#y-goals"); pg.replaceChildren();
    var gs = goalsSorted(), any = false;
    gs.forEach(function (g) {
      var a = goalAvg4(g.id); if (a != null) any = true;
      pg.append(h("div", { class: "pg-row" },
        h("span", { class: "pg-name", text: g.titel || "Doel" }),
        h("div", { class: "alloc-track", "aria-hidden": "true" }, a != null ? h("i", { style: "width:" + Math.max(0.6, a).toFixed(1) + "%" }) : null),
        h("span", { class: "alloc-val", text: pct(a) })));
    });
    if (!gs.length) pg.append(h("p", { class: "hint", text: "Nog geen doelen." }));
    else if (!any) pg.prepend(h("p", { class: "hint", text: "Per doel zie je hier je gemiddelde zodra je eerste week is afgerond." }));

    var si = $("#start-input"); if (document.activeElement !== si) si.value = ymd(yearStart());
    $("#start-form").hidden = !canWrite();
  }

  /* ================= Alles renderen en routeren ================= */
  function renderAll(force) {
    renderHeader();
    renderOverview();
    renderGoals(force);
    renderNotes();
    renderInvest();
    if (S.view === "jaar") renderYear();
  }
  var VIEWS = ["overzicht", "doelen", "investeren", "jaar"];
  function route() {
    var v = String(location.hash || "").replace(/^#/, "");
    if (VIEWS.indexOf(v) < 0) v = "overzicht";
    var changed = v !== S.view;
    S.view = v;
    VIEWS.forEach(function (name) {
      $("#v-" + name).hidden = name !== v;
      var t = $("#tab-" + name);
      if (name === v) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    });
    hideTip();
    if (v === "overzicht") renderOverview();
    if (v === "jaar") renderYear();
    if (v === "investeren") renderHistChart();
    if (changed) window.scrollTo(0, 0);
  }

  function mergeDocs(coll, snap, target) {
    var seen = {};
    snap.docs.forEach(function (d) {
      if (!d.exists) return;
      var path = coll + "/" + d.id;
      seen[d.id] = true;
      if (S.dirty.has(path) || S.deleted.has(path)) return;
      target[d.id] = clone(d.data());
    });
    Object.keys(target).forEach(function (id) { var path = coll + "/" + id; if (!seen[id] && !S.dirty.has(path)) delete target[id]; });
  }
  function subscribe() {
    function err(e) {
      if (e && e.code === "revoked") showBanner("Toegang tot je gegevens is ingetrokken voor deze weergave.");
      else showBanner("Je gegevens konden niet worden geladen. Herlaad de pagina om het opnieuw te proberen.");
    }
    S.db.collection("doelen").onSnapshot(function (snap) { mergeDocs("doelen", snap, S.goals); S.loaded.doelen = true; renderAll(); }, err);
    S.db.collection("weken").onSnapshot(function (snap) { mergeDocs("weken", snap, S.weeks); S.loaded.weken = true; renderOverview(); if (S.view === "jaar") renderYear(); else renderGoals(); }, err);
    S.db.collection("notities").orderBy("datum", "desc").limit(300).onSnapshot(function (snap) {
      S.notes = snap.docs.filter(function (d) { return d.exists && !S.deleted.has("notities/" + d.id); }).map(function (d) { return Object.assign({ id: d.id }, clone(d.data())); });
      S.loaded.notities = true; renderNotes(); renderMarketLog();
    }, err);
    S.db.collection("invest").onSnapshot(function (snap) { mergeDocs("invest", snap, S.invest); S.loaded.invest = true; renderInvest(); }, err);
    S.db.doc("instellingen/algemeen").onSnapshot(function (d) {
      if (!S.dirty.has("instellingen/algemeen")) S.settings = d.exists ? clone(d.data()) || {} : {};
      S.loaded.instellingen = true; renderAll();
    }, err);
  }

  function bindStatic() {
    $("#ov-prev").addEventListener("click", function () { S.selMon = addDays(S.selMon || thisMonday(), -7); renderOverview(); });
    $("#ov-next").addEventListener("click", function () { var n = addDays(S.selMon || thisMonday(), 7); if (n.getTime() <= thisMonday().getTime()) { S.selMon = n.getTime() === thisMonday().getTime() ? null : n; renderOverview(); } });
    $("#ov-today").addEventListener("click", function () { S.selMon = null; renderOverview(); });
    $("#ov-reflect").addEventListener("input", function (e) {
      var mon = S.selMon || thisMonday(), val = e.target.value;
      $("#ov-reflect-state").textContent = "Bezig met opslaan…";
      clearTimeout(reflTimer); reflTimer = setTimeout(function () { saveReflection(mon, val); }, 800);
    });
    $("#g-add").addEventListener("click", newGoal);
    $("#note-form").addEventListener("submit", function (e) {
      e.preventDefault(); var ta = $("#note-text"), t = ta.value.trim(); if (!t) { ta.focus(); return; }
      addNote(t, "notitie", $("#note-goal").value || null); ta.value = "";
    });
    $("#spar-form").addEventListener("submit", function (e) { e.preventDefault(); sendChat($("#spar-input").value); });
    $("#spar-input").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendChat(e.target.value); } });
    $("#spar-stop").addEventListener("click", function () { if (S.chat.ctl) S.chat.ctl.abort(); });
    $("#spar-new").addEventListener("click", function () { if (S.chat.ctl) S.chat.ctl.abort(); S.chat.turns = []; $("#spar-log").replaceChildren(); $("#spar-input").focus(); });
    $("#pf-edit").addEventListener("click", function () { S.pfEdit = true; S.pfDraft = null; renderPortfolio(); var f = $("#pf-body input"); if (f) f.focus(); });
    $("#route-edit").addEventListener("click", function () { S.routeEdit = true; renderInvest(); });
    $("#rule-form").addEventListener("submit", function (e) {
      e.preventDefault(); var i = $("#rule-input"), t = i.value.trim(); if (!t) return;
      savePlan({ regels: ((S.invest.plan || {}).regels || []).concat([{ id: rid("r"), tekst: t.slice(0, 160) }]) }); i.value = ""; i.focus();
    });
    $("#max-input").addEventListener("change", function (e) { var v = Math.round(Number(e.target.value)); savePlan({ maxPositie: isFinite(v) && v > 0 && v <= 100 ? v : null }); });
    $("#scen-form").addEventListener("submit", function (e) {
      e.preventDefault(); var a = $("#scen-als"), d = $("#scen-dan");
      if (!a.value.trim() || !d.value.trim()) { toast("Vul zowel 'als' als 'dan' in."); return; }
      savePlan({ scenarios: ((S.invest.plan || {}).scenarios || []).concat([{ id: rid("s"), als: a.value.trim().slice(0, 200), dan: d.value.trim().slice(0, 200), status: "actief" }]) });
      a.value = ""; d.value = ""; a.focus();
    });
    $("#watch-form").addEventListener("submit", function (e) {
      e.preventDefault(); var i = $("#watch-input"), t = i.value.trim(); if (!t) return;
      savePlan({ volg: ((S.invest.plan || {}).volg || []).concat([{ id: rid("v"), tekst: t.slice(0, 60) }]) }); i.value = ""; i.focus();
    });
    $("#mlog-form").addEventListener("submit", function (e) {
      e.preventDefault(); var ta = $("#mlog-text"), t = ta.value.trim(); if (!t) { ta.focus(); return; }
      addNote(t, "markt", null); ta.value = "";
    });
    $("#inv-spar").addEventListener("click", function () { sparAbout("Kijk naar mijn investeringsroute, regels en scenario's. Wat is onduidelijk, wat ontbreekt, en waar handel ik niet volgens mijn eigen plan? "); });
    $("#start-form").addEventListener("submit", function (e) {
      e.preventDefault(); var d = parseYmd($("#start-input").value);
      if (!d) { toast("Kies een geldige datum."); return; }
      if (!canWrite()) return;
      var body = Object.assign({}, clone(S.settings) || {}, { startMaandag: ymd(mondayOf(d)) });
      S.settings = body; queueWrite("instellingen/algemeen", body, 0);
      renderAll(); toast("Je jaar start nu in week " + isoWeek(mondayOf(d)).week + " van " + isoWeek(mondayOf(d)).year + ".");
    });
    window.addEventListener("hashchange", route);
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt); rt = setTimeout(function () { if (S.view === "jaar") renderYearChart(yearSeries()); if (S.view === "investeren") renderHistChart(); }, 150);
    });
    window.addEventListener("scroll", hideTip, { passive: true });
  }

  /* ================= Verbinding met de server ================= */
  var COLLS = ["doelen", "weken", "notities", "invest", "instellingen"];
  async function api(method, url, body, signal) {
    var opts = { method: method, credentials: "same-origin", headers: { "X-Koersplan": "1" }, signal: signal };
    if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    var r;
    try { r = await fetch(url, opts); }
    catch (e) { if (e && e.name === "AbortError") throw e; throw { code: "netwerk", message: "Geen verbinding" }; }
    if (r.status === 401) { location.href = "/login"; throw { code: "auth", message: "Niet ingelogd" }; }
    var j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    if (!r.ok) throw { code: (j && j.error) || "http", status: r.status, message: (j && j.message) || ("HTTP " + r.status) };
    return j || {};
  }
  function createApiDb() {
    var store = {}, listeners = [], loaded = false;
    COLLS.forEach(function (c) { store[c] = {}; });
    function snapDoc(coll, id) {
      var d = store[coll] ? store[coll][id] : undefined;
      return { id: id, exists: d !== undefined, data: function () { return d === undefined ? undefined : clone(d); } };
    }
    function snapColl(coll, o) {
      var docs = Object.keys(store[coll] || {}).map(function (id) { return snapDoc(coll, id); });
      if (o.orderBy) {
        var f = o.orderBy[0], dir = o.orderBy[1] === "desc" ? -1 : 1;
        docs.sort(function (a, b) { var av = (store[coll][a.id] || {})[f], bv = (store[coll][b.id] || {})[f]; return (av < bv ? -1 : av > bv ? 1 : 0) * dir; });
      }
      if (o.limit) docs = docs.slice(0, o.limit);
      return { docs: docs, size: docs.length, empty: !docs.length };
    }
    function deliver(l) {
      try { l.cb(l.id != null ? snapDoc(l.coll, l.id) : snapColl(l.coll, l.o)); } catch (e) { console.error(e); }
    }
    function listen(l) {
      listeners.push(l);
      if (loaded) setTimeout(function () { deliver(l); }, 0);
      return function () { var i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); };
    }
    function query(coll, o) {
      return {
        orderBy: function (f, dir) { return query(coll, Object.assign({}, o, { orderBy: [f, dir || "asc"] })); },
        limit: function (n) { return query(coll, Object.assign({}, o, { limit: n })); },
        onSnapshot: function (cb, err) { return listen({ coll: coll, o: o, cb: cb, err: err }); }
      };
    }
    function url(coll, id) { return "/api/data/" + encodeURIComponent(coll) + "/" + encodeURIComponent(id); }
    function doc(path) {
      var p = String(path).split("/"), coll = p[0], id = p[1];
      return {
        id: id, path: path,
        set: function (body) { store[coll][id] = clone(body); return api("PUT", url(coll, id), body); },
        delete: function () { delete store[coll][id]; return api("DELETE", url(coll, id)); },
        onSnapshot: function (cb, err) { return listen({ coll: coll, id: id, cb: cb, err: err }); }
      };
    }
    async function refresh() {
      var j = await api("GET", "/api/data");
      COLLS.forEach(function (c) {
        var m = {};
        (j[c] || []).forEach(function (row) { m[row.id] = row.data; });
        store[c] = m;
      });
      loaded = true;
      listeners.slice().forEach(deliver);
    }
    return { doc: doc, collection: function (c) { return query(c, {}); }, refresh: refresh };
  }
  var refreshing = false, retryTimer = null;
  async function refreshData() {
    if (refreshing || !S.db) return;
    refreshing = true;
    try {
      await S.db.refresh();
      S.status = "ready";
      $("#banner").hidden = true;
    } catch (e) {
      if (e && e.code === "auth") return;
      S.status = "error";
      if (e && e.code === "db") showBanner("De database is nog niet bereikbaar. Controleer DATABASE_URL in Railway. De pagina probeert het vanzelf opnieuw.");
      else showBanner("Je gegevens konden niet worden geladen. Controleer je verbinding. De pagina probeert het vanzelf opnieuw.");
      clearTimeout(retryTimer);
      retryTimer = setTimeout(refreshData, 10000);
    } finally {
      refreshing = false;
    }
  }

  async function init() {
    buildRuler();
    bindStatic();
    route();
    renderAll(true);
    S.db = createApiDb();
    S.owner = true;
    subscribe();
    try {
      var cfg = await api("GET", "/api/config");
      S.sparOn = !!cfg.spar;
      S.toolsOk = S.sparOn;
    } catch (e) {
      if (e && e.code === "auth") return;
    }
    await refreshData();
    renderAll(true);
    setupSpar();
    setInterval(function () { if (document.visibilityState === "visible") refreshData(); }, 60000);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") refreshData(); });
  }
  init();
})();
