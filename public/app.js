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
  function avgOf(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : null; }

  /* ---------- Tijd tot een datum en korte teksten ---------- */
  function dayNum(d) { return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
  function today0() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function monthYear(d) { return MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function dateShortY(d) { return shortDate(d) + (d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : ""); }
  function countdown(d) {
    var n = dayNum(d) - dayNum(new Date()), a = Math.abs(n), t;
    if (n === 0) return { text: "vandaag", n: 0, over: false };
    if (a >= 61) t = Math.round(a / 30.44) + " mnd";
    else if (a >= 14) t = Math.round(a / 7) + " wk";
    else t = a + (a === 1 ? " dag" : " dagen");
    return n > 0 ? { text: "nog " + t, n: n, over: false } : { text: t + " over tijd", n: n, over: true };
  }
  function firstSentence(t, n) {
    t = String(t || "").trim().replace(/\s+/g, " ");
    if (!t) return "";
    var m = /^(.+?[.!?])(\s|$)/.exec(t);
    return cut(m ? m[1] : t, n || 140);
  }
  // Waarom in één zin: eigen korte zin, anders de eerste zin van het langere waarom.
  function goalWhy(g) { return String((g && g.kort) || "").trim() || firstSentence(g && g.waarom, 140); }
  function unitOf(a) { return String((a && a.eenheid) || "").trim().slice(0, 12); }
  function parseAmount(v) {
    var s = String(v == null ? "" : v).trim().replace(/\s/g, "");
    if (!s) return null;
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return NaN;
    var n = Number(s);
    return isFinite(n) && n >= 0 && n <= 100000 ? Math.round(n * 100) / 100 : NaN;
  }
  function fmtAmount(v) { return v == null || !isFinite(v) ? "" : num1.format(v); }
  // Hoeveel keer je een actie per week mag aantikken: het plan plus ruimte voor extra keren.
  function maxDone(target) { return Math.min(21, Math.max(target + 7, target * 2)); }
  function extraOf(it) { var t = Number(it && it.target) || 0, d = Math.round(Number(it && it.gedaan) || 0); return t > 0 ? Math.max(0, d - t) : 0; }

  function icon(kind) {
    var svg = sv("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", fill: "none" });
    if (kind === "good") {
      svg.append(sv("circle", { cx: 8, cy: 8, r: 7, fill: "currentColor" }), sv("path", { d: "M4.8 8.3l2.1 2.1 4.3-4.6", stroke: "#ffffff", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    } else if (kind === "warn") {
      svg.append(sv("path", { d: "M8 1.5l6.8 12.3H1.2z", fill: "currentColor", "stroke-linejoin": "round" }), sv("path", { d: "M8 6v3.6", stroke: "#1b1a14", "stroke-width": 1.7, "stroke-linecap": "round" }), sv("circle", { cx: 8, cy: 11.7, r: 0.95, fill: "#1b1a14" }));
    } else if (kind === "crit") {
      svg.append(sv("circle", { cx: 8, cy: 8, r: 7, fill: "currentColor" }), sv("path", { d: "M8 4.3v5.2M5.7 7.4L8 9.7l2.3-2.3", stroke: "#ffffff", "stroke-width": 1.7, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    } else if (kind === "up" || kind === "down" || kind === "flat") {
      var d = kind === "up" ? "M8 11.5V4.7M5.3 7.3 8 4.6l2.7 2.7" : kind === "down" ? "M8 4.5v6.8M5.3 8.7 8 11.4l2.7-2.7" : "M4.5 8h6.8M8.7 5.3 11.4 8l-2.7 2.7";
      svg.append(sv("circle", { cx: 8, cy: 8, r: 7, fill: "currentColor" }), sv("path", { d: d, class: "ic-fg", "stroke-width": 1.7, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    } else if (kind === "plus") {
      svg.append(sv("path", { d: "M8 3.6v8.8M3.6 8h8.8", stroke: "currentColor", "stroke-width": 1.9, "stroke-linecap": "round" }));
    } else if (kind === "flag") {
      svg.append(sv("path", { d: "M4 14.5V2.2M4 2.6h8.3l-1.9 2.9 1.9 2.9H4", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    } else if (kind === "step") {
      svg.append(sv("path", { d: "M8 1.8 14.2 8 8 14.2 1.8 8z", stroke: "currentColor", "stroke-width": 1.6, "stroke-linejoin": "round" }));
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
    settings: {}, goals: {}, weeks: {}, notes: [], invest: {}, hp: {}, hpCfg: {},
    dirty: new Set(), deleted: new Set(),
    loaded: { doelen: false, weken: false, notities: false, invest: false, instellingen: false, handelsplan: false },
    view: "overzicht", selMon: null,
    editing: null, draft: null,
    pfEdit: false, pfDraft: null,
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
      var prev = stored && stored[x.a.id], unit = unitOf(x.a);
      var it = { doel: x.g.id, doelTitel: String(x.g.titel || ""), tekst: String(x.a.tekst || ""), target: x.n, gedaan: prev ? clamp(Math.round(Number(prev.gedaan) || 0), 0, 99) : 0 };
      if (unit) it.eenheid = unit;
      if (prev && prev.hoeveel != null && isFinite(Number(prev.hoeveel))) it.hoeveel = Number(prev.hoeveel);
      out[x.a.id] = it;
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

  /* ================= Opbouw (progressive overload) ================= */
  // Per actie: wat je per week echt deed, inclusief extra keren boven je plan.
  // Een week die je niet invulde is onbekend (null), geen nul.
  function actionDefs() {
    var out = {};
    goalsSorted().forEach(function (g) { (g.acties || []).forEach(function (a) { if (a && a.id) out[a.id] = { g: g, a: a }; }); });
    return out;
  }
  function weekItem(mon, aid) {
    var st = weekState(mon), doc = S.weeks[weekKey(mon)];
    if (st === "future") return { state: st, tracked: false, it: null };
    if (st === "current") return { state: st, tracked: !!doc, it: itemsFor(mon)[aid] || null };
    if (!doc || !doc.items) return { state: st, tracked: false, it: null };
    return { state: st, tracked: !!doc.items[aid], it: doc.items[aid] || null };
  }
  // De eerste week die je bijhield (of de start van je jaar): weken daarvoor bestonden nog niet in Koersplan.
  function trackStart() {
    var m = yearStart().getTime();
    Object.keys(S.weeks).forEach(function (k) { var d = parseYmd(S.weeks[k] && S.weeks[k].maandag); if (d) m = Math.min(m, mondayOf(d).getTime()); });
    return m;
  }
  // De eerste week waarin deze actie voorkomt. Daarvoor bestond de actie nog niet: geen 'niet ingevuld'.
  function firstSeen(aid) {
    var best = thisMonday().getTime();
    Object.keys(S.weeks).forEach(function (k) {
      var d = S.weeks[k], m = d && d.items && d.items[aid] ? parseYmd(d.maandag) : null;
      if (m) best = Math.min(best, mondayOf(m).getTime());
    });
    return best;
  }
  function actionSeries(aid, n, unit) {
    var cur = thisMonday(), out = [], t0 = firstSeen(aid);
    for (var i = n - 1; i >= 0; i--) {
      var mon = addDays(cur, -7 * i);
      if (mon.getTime() < t0) { out.push({ mon: mon, state: "pre", v: null, gedaan: null, target: null, hoeveel: null }); continue; }
      var w = weekItem(mon, aid), it = w.it;
      var gedaan = it ? Math.max(0, Math.round(Number(it.gedaan) || 0)) : null;
      var target = it ? Math.max(0, Math.round(Number(it.target) || 0)) : null;
      var amt = it && it.hoeveel != null && isFinite(Number(it.hoeveel)) ? Number(it.hoeveel) : null;
      var known = !!it && (w.state === "current" || w.tracked);
      out.push({ mon: mon, state: w.state, v: !known ? null : unit ? amt : gedaan, gedaan: known ? gedaan : null, target: target, hoeveel: known ? amt : null });
    }
    return out;
  }
  // Per doel: het totaal aantal keren over alle acties van dat doel.
  function goalSeries(g, n) {
    var acts = (g.acties || []).filter(function (a) { return a && a.id && Number(a.perWeek) > 0; });
    var per = acts.map(function (a) { return actionSeries(a.id, n, ""); });
    var out = [];
    for (var i = 0; i < n; i++) {
      var st = i === n - 1 ? "current" : per.some(function (s) { return s[i].state === "past"; }) ? "past" : "pre";
      var p = { mon: addDays(thisMonday(), -7 * (n - 1 - i)), state: st, v: null, target: 0 };
      per.forEach(function (s) { var x = s[i]; if (x.v != null) { p.v = (p.v || 0) + x.v; p.target += x.target || 0; } });
      out.push(p);
    }
    return out;
  }
  // Opbouw = de trendlijn door je laatste (max 8) afgeronde weken, extra keren meegeteld.
  // Bij keren: omhoog of omlaag als dat over 4 weken minstens een halve keer per week scheelt (of 10% van je plan).
  // Bij hoeveelheden (km, min): als het over 4 weken minstens 10% scheelt.
  function trendOf(series, opts) {
    opts = opts || {};
    var pts = [];
    series.forEach(function (p, i) { if (p.state === "past" && p.v != null) pts.push([i, p.v]); });
    pts = pts.slice(-8);
    if (pts.length < 3) return { st: "nieuw", n: pts.length, delta: null };
    var mx = avgOf(pts.map(function (p) { return p[0]; })), my = avgOf(pts.map(function (p) { return p[1]; }));
    if (my === 0) return { st: "stil", n: pts.length, delta: null };
    var cov = 0, vr = 0;
    pts.forEach(function (p) { cov += (p[0] - mx) * (p[1] - my); vr += (p[0] - mx) * (p[0] - mx); });
    var slope = vr ? cov / vr : 0, xa = pts[0][0], xb = pts[pts.length - 1][0];
    var from = Math.max(0, my + slope * (xa - mx)), to = Math.max(0, my + slope * (xb - mx)), per4 = slope * 4, st;
    if (opts.unit) st = per4 / my >= 0.1 ? "op" : per4 / my <= -0.1 ? "af" : "gelijk";
    else { var thr = Math.max(0.5, 0.1 * (opts.plan || 0)); st = per4 >= thr ? "op" : per4 <= -thr ? "af" : "gelijk"; }
    return { st: st, n: pts.length, from: from, to: to, weeks: xb - xa + 1, unit: opts.unit || "", delta: opts.unit && from > 0 ? (to - from) / from : null };
  }
  // Altijd over dezelfde 8 afgeronde weken, zodat je overal hetzelfde oordeel ziet.
  function actionTrend(aid, unit, plan) { return trendOf(actionSeries(aid, 9, unit), { unit: unit, plan: plan }); }
  var TREND = {
    op: { k: "good", i: "up", t: "Opbouw" },
    gelijk: { k: "neutral", i: "flat", t: "Stabiel" },
    af: { k: "warn", i: "down", t: "Terugval" },
    stil: { k: "neutral", i: "flat", t: "Nog niet gestart" },
    nieuw: { k: "neutral", i: "neutral", t: "Opbouw zichtbaar na 3 weken" }
  };
  function trendText(tr) {
    var T = TREND[tr.st];
    return T.t + (tr.delta != null && tr.st !== "gelijk" ? " " + (tr.delta > 0 ? "+" : "−") + Math.round(Math.abs(tr.delta) * 100) + "%" : "");
  }
  function trendDetail(tr) {
    if (tr.from == null) return tr.st === "nieuw" ? "Na drie ingevulde weken zie je of je opbouwt." : "";
    var u = tr.unit ? " " + tr.unit : "× per week";
    return "Trendlijn over je laatste " + tr.weeks + " afgeronde weken: van ongeveer " + fmtAmount(tr.from) + u + " naar " + fmtAmount(tr.to) + u + ", extra keren meegeteld.";
  }
  function trendChip(tr) {
    var T = TREND[tr.st];
    return h("span", { class: "chip sm chip-" + T.k, title: trendDetail(tr) || null }, icon(T.i), h("span", { text: trendText(tr) }));
  }

  /* Suggesties om de lat bij te stellen, op basis van de laatste drie afgeronde weken. */
  function nudgeKey(aid) { return "koersplan.lat." + aid; }
  function nudgeHidden(aid) { try { return localStorage.getItem(nudgeKey(aid)) === weekKey(thisMonday()); } catch (e) { return false; } }
  function hideNudge(aid) { try { localStorage.setItem(nudgeKey(aid), weekKey(thisMonday())); } catch (e) { /* geen opslag: alleen nu verbergen */ } }
  function nudgeFor(a) {
    var n = Math.round(Number(a && a.perWeek) || 0);
    if (n <= 0 || !a.id || nudgeHidden(a.id)) return null;
    var cur = thisMonday(), last = [1, 2, 3].map(function (i) { return weekItem(addDays(cur, -7 * i), a.id); });
    if (last.some(function (w) { return !w.tracked || !w.it; })) return null;
    var done = last.map(function (w) { return Math.max(0, Math.round(Number(w.it.gedaan) || 0)); });
    var more = done.filter(function (d) { return d > n; }).length;
    if (!unitOf(a) && n < 14 && more >= 2 && done.every(function (d) { return d >= n; })) return { kind: "op", to: n + 1, more: more };
    if (n >= 2 && done.every(function (d) { return d < n / 2; })) return { kind: "af", to: clamp(Math.round(avgOf(done)), 1, n - 1) };
    return null;
  }
  // Bij een actie met een eenheid (km, min): kleine stap omhoog ten opzichte van vorige week.
  function amountGuide(a) {
    var w = weekItem(addDays(thisMonday(), -7), a.id), v = w.it && Number(w.it.hoeveel);
    if (!w.tracked || !isFinite(v) || v <= 0) return null;
    var next = v * 1.1;
    return { last: v, next: next >= 20 ? Math.round(next) : Math.round(next * 10) / 10 };
  }

  /* Mijlpalen: open eerst op datum, dan in je eigen volgorde. */
  function openMilestones(g) {
    return (g.mijlpalen || []).filter(function (m) { return m && m.tekst && !m.klaar; })
      .map(function (m, i) { return { m: m, i: i, d: parseYmd(m.datum) }; })
      .sort(function (a, b) { if (a.d && b.d) return a.d - b.d; if (a.d) return -1; if (b.d) return 1; return a.i - b.i; });
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
    var ex = 0; Object.keys(items).forEach(function (k) { ex += extraOf(items[k]); });
    if (ex) subs.push("+" + ex + " extra " + (st === "current" ? "deze week" : "die week"));
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
    // Niet opnieuw opbouwen terwijl je een hoeveelheid typt; dat gebeurt zodra je het veld verlaat.
    if (active && active.classList && active.classList.contains("amt-in") && box.contains(active)) { S.ovDeferred = true; return; }
    S.ovDeferred = false;
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
    var writable = canWrite(), defs = actionDefs(), isCur = weekState(mon) === "current";
    ids.forEach(function (gid) {
      var grp = groups[gid], g = S.goals[gid] ? Object.assign({ id: gid }, S.goals[gid]) : null;
      var p = per[gid], ratio = p ? p.d / p.t : 0;
      var sec = h("section", { class: "og", "aria-label": (g && g.titel) || grp.titel || "Doel" });
      appendKids(sec, [ovGoalHead(g, grp.titel, ratio, writable)]);
      grp.items.forEach(function (pair) { sec.append(ovAction(mon, pair[0], pair[1], defs[pair[0]], writable, isCur)); });
      var foot = ovGoalFoot(g, isCur, writable);
      if (foot) sec.append(foot);
      box.append(sec);
    });
    if (focusKey) { var f = box.querySelector('[data-k="' + focusKey.replace(/"/g, "") + '"]'); if (f) f.focus(); }
  }
  // Kop van een doel bij het afvinken: waarom je het doet en waar het naartoe gaat, in één oogopslag.
  function ovGoalHead(g, fallbackTitel, ratio, writable) {
    var titel = (g && g.titel) || fallbackTitel || "Doel";
    var why = g ? goalWhy(g) : "", res = g ? String(g.resultaat || "").trim() : "";
    var dl = g && parseYmd(g.deadline), cd = dl ? countdown(dl) : null;
    var whyNode = why ? h("p", { class: "og-why", text: why })
      : g && writable ? h("p", { class: "og-why og-why-empty" }, h("button", { type: "button", class: "link-btn", text: "Waarom doe je dit? Leg het vast in één zin", onclick: function () { editGoalField(g.id, "kort"); } }))
      : null;
    return [
      h("div", { class: "og-top" },
        h("div", { class: "og-eyebrow" },
          h("span", { class: "cat", text: (g && g.categorie) || "Doel" }),
          cd ? h("span", { class: "og-hz" + (cd.over ? " over" : ""), title: "Streefdatum " + longDate(dl) }, icon("flag"), h("span", { text: monthYear(dl) + " · " + cd.text })) : null),
        h("span", { class: "og-pct", text: pct(ratio * 100) })),
      h("h3", { class: "og-title", text: titel }),
      whyNode,
      res ? h("p", { class: "og-res" }, h("span", { class: "og-res-k", text: "Waar het naartoe gaat" }), h("span", { text: cut(res, 150) })) : null,
      h("div", { class: "meter", "aria-hidden": "true" }, h("span", { style: "width:" + (ratio * 100).toFixed(1) + "%" }))
    ];
  }
  function ovAction(mon, aid, it, def, writable, isCur) {
    var n = clamp(Number(it.target) || 0, 0, 14), done = clamp(Math.round(Number(it.gedaan) || 0), 0, 99);
    var unit = unitOf(it) || (def ? unitOf(def.a) : ""), extra = Math.max(0, done - n), cap = maxDone(n);
    var boxes = h("div", { class: "boxes", role: "group", "aria-label": it.tekst + ": " + done + " van " + n + (extra ? ", waarvan " + extra + " extra" : "") });
    for (var i = 0; i < Math.max(n, done); i++) {
      (function (i) {
        var on = i < done, isExtra = i >= n;
        if (isExtra && i === n) boxes.append(h("span", { class: "box-sep", "aria-hidden": "true" }));
        boxes.append(h("button", {
          type: "button", class: "box" + (on ? " on" : "") + (isExtra ? " extra" : ""), "aria-pressed": on ? "true" : "false",
          "aria-label": isExtra ? it.tekst + ", extra keer " + (i - n + 1) + ", tik om weg te halen" : it.tekst + ", " + (i + 1) + " van " + n,
          title: isExtra ? "Extra boven je plan. Tik om weg te halen." : null,
          "data-k": aid + ":" + i, disabled: !writable,
          onclick: function () { tick(mon, aid, i); }
        }, checkSvg()));
      })(i);
    }
    // De plus verschijnt zodra je plan vol is: dan log je wat je méér deed.
    if (writable && done >= n && n > 0 && done < cap) {
      if (done === n) boxes.append(h("span", { class: "box-sep", "aria-hidden": "true" }));
      boxes.append(h("button", {
        type: "button", class: "box plus", "data-k": aid + ":plus",
        "aria-label": it.tekst + ": nog een keer gedaan, extra boven je plan",
        title: "Meer gedaan dan gepland? Tik voor een extra keer.",
        onclick: function () { tick(mon, aid, done); }
      }, icon("plus")));
    }
    var ser = actionSeries(aid, 8, unit), tr = actionTrend(aid, unit, n);
    var main = h("div", { class: "oa-main" },
      h("div", { class: "oa-text" },
        h("span", { class: "oa-name", text: it.tekst }),
        h("span", { class: "oa-count", text: done + "/" + n }),
        extra ? h("span", { class: "xtra", text: "+" + extra + " extra" }) : null),
      h("div", { class: "oa-trend" }, sparkSvg(ser, unit, it.tekst), trendChip(tr), unit ? amountNote(def && def.a, ser, isCur, unit) : null));
    var ctl = h("div", { class: "oa-ctl" }, boxes);
    if (unit) ctl.append(amountField(mon, aid, it, unit, writable));
    return h("div", { class: "oa" }, main, ctl);
  }
  function amountNote(a, ser, isCur, unit) {
    var prev = ser.length > 1 ? ser[ser.length - 2] : null, g = isCur && a ? amountGuide(a) : null, parts = [];
    if (prev && prev.v != null) parts.push("vorige week " + fmtAmount(prev.v) + " " + unit);
    if (g) parts.push("richting ~" + fmtAmount(g.next) + " " + unit + " (+10%)");
    return parts.length ? h("span", { class: "oa-note", text: parts.join(" · ") }) : null;
  }
  function amountField(mon, aid, it, unit, writable) {
    var inp = h("input", {
      class: "amt-in", type: "text", inputmode: "decimal", autocomplete: "off", maxlength: 9, "data-k": aid + ":amt",
      id: "amt-" + aid, value: it.hoeveel != null ? fmtAmount(Number(it.hoeveel)) : "", placeholder: "0", disabled: !writable,
      oninput: function (e) {
        var v = parseAmount(e.target.value);
        e.target.setAttribute("aria-invalid", isNaN(v) ? "true" : "false");
        if (!isNaN(v)) setAmount(mon, aid, v);
      },
      onblur: function () { if (S.ovDeferred) setTimeout(renderOverview, 0); }
    });
    return h("div", { class: "amt" }, h("label", { class: "sr", for: "amt-" + aid, text: "Totaal deze week voor " + it.tekst + ", in " + unit }), inp, h("span", { class: "amt-u", "aria-hidden": "true", text: unit }));
  }
  function ovGoalFoot(g, isCur, writable) {
    if (!g) return null;
    var ms = (g.mijlpalen || []).filter(function (m) { return m && m.tekst; }), open = openMilestones(g), parts = [];
    if (open.length) {
      var nx = open[0], cd = nx.d ? countdown(nx.d) : null;
      parts.push(h("p", { class: "og-ms" },
        icon("step"),
        h("span", { class: "og-ms-k", text: "Volgende mijlpaal" + (ms.length > 1 ? " · " + (ms.length - open.length) + "/" + ms.length + " gehaald" : "") }),
        h("span", { class: "og-ms-t", text: nx.m.tekst }),
        cd ? h("span", { class: "og-ms-d" + (cd.over ? " over" : ""), text: dateShortY(nx.d) + " · " + cd.text }) : null));
    } else if (ms.length) parts.push(h("p", { class: "og-ms done" }, icon("step"), h("span", { class: "og-ms-t", text: ms.length === 1 ? "Je mijlpaal is gehaald." : "Alle " + ms.length + " mijlpalen gehaald." })));
    if (isCur && writable) {
      var nds = (g.acties || []).map(function (a) { return { a: a, nd: nudgeFor(a) }; }).filter(function (x) { return x.nd; });
      if (nds.length) parts.push(nudgeBox(g, nds[0].a, nds[0].nd));
    }
    return parts.length ? h("div", { class: "og-foot" }, parts) : null;
  }
  function nudgeBox(g, a, nd) {
    var text = nd.kind === "op"
      ? (nd.more === 3 ? "Drie weken op rij deed je meer dan gepland." : "Twee van de laatste drie weken deed je meer dan gepland.") + " Maak het je nieuwe lat: " + nd.to + "× per week?"
      : "Drie weken op rij onder de helft van je plan. Een lat van " + nd.to + "× per week die je haalt, bouwt meer op dan een lat die je mist.";
    var wrap = h("div", { class: "nudge nudge-" + nd.kind });
    wrap.append(icon(nd.kind === "op" ? "up" : "down"),
      h("p", { class: "nudge-t" }, h("strong", { text: cut(a.tekst, 60) + ". " }), text),
      h("div", { class: "nudge-act" },
        h("button", { type: "button", class: "btn primary sm", text: "Lat naar " + nd.to + "×", onclick: function () { setPerWeek(g.id, a.id, nd.to); } }),
        h("button", { type: "button", class: "link-btn", text: "Nu niet", onclick: function () { hideNudge(a.id); renderOverview(); renderGoals(); } })));
    return wrap;
  }
  function setPerWeek(gid, aid, to) {
    var g = S.goals[gid]; if (!g || !canWrite()) return;
    var b = clone(g), hit = false;
    (b.acties || []).forEach(function (a) { if (a.id === aid) { a.perWeek = clamp(Math.round(to), 1, 14); hit = true; } });
    if (!hit) return;
    b.concept = false; b.bijgewerkt = new Date().toISOString();
    S.goals[gid] = b; queueWrite("doelen/" + gid, b, 0);
    renderAll();
    toast("Lat staat op " + to + "× per week. Deze week telt dat als 100%.");
  }
  function editGoalField(gid, field) {
    if (location.hash !== "#doelen") location.hash = "#doelen";
    setTimeout(function () {
      if (S.editing && S.editing !== gid) return;
      if (!S.editing) startEdit(gid);
      var el = document.getElementById("ge-" + gid + "-" + field);
      if (el) { el.scrollIntoView({ block: "center" }); el.focus(); }
    }, 60);
  }
  function tick(mon, aid, i) {
    if (!canWrite()) return;
    var items = clone(itemsFor(mon)), it = items[aid];
    if (!it) return;
    var t = Number(it.target) || 0, cur = clamp(Math.round(Number(it.gedaan) || 0), 0, 99);
    // Vakje i aantikken vult t/m i; een gevuld vakje aantikken haalt het en alles erna weg. Extra keren werken hetzelfde.
    it.gedaan = clamp(i < cur ? i : i + 1, 0, maxDone(t));
    saveWeekItems(mon, items, 300);
    renderOverview();
    if (S.view === "jaar") renderYear();
    if (S.view === "doelen") renderGoals();
  }
  function setAmount(mon, aid, v) {
    if (!canWrite()) return;
    var items = clone(itemsFor(mon)), it = items[aid];
    if (!it) return;
    var def = actionDefs()[aid], unit = unitOf(it) || (def ? unitOf(def.a) : "");
    if (v == null) delete it.hoeveel; else it.hoeveel = v;
    if (unit) it.eenheid = unit;
    saveWeekItems(mon, items, 700);
  }
  function saveWeekItems(mon, items, delay) {
    var key = weekKey(mon), prev = S.weeks[key] || {};
    var doc = { maandag: ymd(mon), items: items, reflectie: prev.reflectie || "", bijgewerkt: new Date().toISOString() };
    S.weeks[key] = doc;
    queueWrite("weken/" + key, doc, delay);
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
  var UNITS = ["km", "min", "uur", "kg", "pagina's"];
  var KORT_PH = "Bijv. meer verantwoordelijkheid en keuzevrijheid in mijn werk";
  function renderGoals(force) {
    var gs = goalsSorted();
    $("#g-concept").hidden = !gs.some(function (g) { return g.concept; });
    renderNoteSelect();
    if (S.view === "doelen") renderKoers();
    if (S.editing && !force) return;
    var list = $("#g-list");
    list.replaceChildren();
    $("#g-add").hidden = !!S.editing || !canWrite() || !S.loaded.doelen;
    if (!S.db) { list.append(emptyBox(S.status === "loading" ? "Doelen laden…" : "Je doelen konden niet worden geladen.")); return; }
    if (!S.loaded.doelen) { list.append(emptyBox("Doelen laden…")); return; }
    if (!gs.length && S.editing !== "__new") list.append(emptyBox("Nog geen doelen. Begin met het doel dat dit jaar het meeste verschil maakt."));
    gs.forEach(function (g) { list.append(S.editing === g.id ? goalForm() : goalCard(g)); });
    if (S.editing === "__new") list.append(goalForm());
    if (S.view === "doelen") drawObCharts();
  }
  function goalCard(g) {
    var ms = (g.mijlpalen || []).filter(function (m) { return m && m.tekst; }), done = ms.filter(function (m) { return m.klaar; }).length;
    var a4 = goalAvg4(g.id), writable = canWrite();
    var acts = (g.acties || []).filter(function (a) { return a && a.tekst; });
    var dl = parseYmd(g.deadline), cd = dl ? countdown(dl) : null;
    var kort = String(g.kort || "").trim();
    var obWeeks = clamp(Math.round((thisMonday().getTime() - trackStart()) / (7 * 864e5)) + 1, 6, 12);
    return h("article", { class: "g-card", id: "goal-" + g.id },
      h("div", { class: "g-top" },
        h("span", { class: "cat", text: g.categorie || "Doel" }),
        g.concept ? h("span", { class: "tag-concept", text: "startversie" }) : null,
        cd ? h("span", { class: "og-hz" + (cd.over ? " over" : ""), title: "Streefdatum " + longDate(dl) }, icon("flag"), h("span", { text: monthYear(dl) + " · " + cd.text })) : null,
        a4 != null ? h("span", { class: "g-avg", title: "Gemiddelde uitvoering over je laatste 4 afgeronde weken, maximaal 100% per week", text: pct(a4) + " · laatste 4 wk" }) : null),
      h("h3", { class: "g-title", text: g.titel || "Naamloos doel" }),
      kort ? h("p", { class: "og-why g-kort", text: kort }) : null,
      g.waarom ? h("div", { class: "g-why" }, h("span", { class: "label", text: "Waarom dit je verder brengt" }), h("p", { text: g.waarom })) : null,
      h("dl", { class: "g-meta" },
        h("div", null, h("dt", { text: "Resultaat" }), h("dd", { text: g.resultaat || "Nog niet vastgelegd" })),
        h("div", null, h("dt", { text: "Streefdatum" }), h("dd", null, dl ? longDate(dl) : "Geen", cd ? h("span", { class: "dd-sub" + (cd.over ? " over" : ""), text: cd.text }) : null))),
      acts.length ? h("div", { class: "g-acts" },
        h("div", { class: "g-acts-head" }, h("span", { class: "label", text: "Elke week · opbouw per week" }),
          h("div", { class: "legend", "aria-hidden": "true" },
            h("span", null, h("i", { class: "sw", style: "background:var(--s1)" }), "gedaan"),
            acts.some(function (a) { return !unitOf(a); }) ? h("span", null, h("i", { class: "ln", style: "background:var(--ink)" }), "plan") : null)),
        h("ul", { class: "g-list-ul g-act-list" }, acts.map(function (a) {
          var unit = unitOf(a), tr = actionTrend(a.id, unit, Number(a.perWeek) || 0), nd = writable ? nudgeFor(a) : null, guide = unit ? amountGuide(a) : null;
          return h("li", { class: "g-act" },
            h("div", { class: "g-act-top" }, h("span", { class: "g-act-t", text: a.tekst }), h("span", { class: "x", text: (Number(a.perWeek) || 0) + "× per week" + (unit ? " · in " + unit : "") })),
            h("div", { class: "ob" },
              h("div", { class: "ob-chart", "data-aid": a.id, "data-unit": unit, "data-label": a.tekst, "data-weeks": obWeeks }),
              h("div", { class: "ob-side" }, trendChip(tr),
                tr.from != null ? h("span", { class: "oa-note", text: "trend ~" + fmtAmount(tr.from) + " → ~" + fmtAmount(tr.to) + (unit ? " " + unit : "× per week") }) : null,
                guide ? h("span", { class: "oa-note", text: "vorige week " + fmtAmount(guide.last) + " " + unit + ", volgende stap ~" + fmtAmount(guide.next) + " " + unit + " (+10%)" }) : null)),
            nd ? nudgeBox(g, a, nd) : null);
        })),
        obTable(acts, obWeeks)) : null,
      ms.length ? h("div", { class: "g-ms" }, h("span", { class: "label", text: "Mijlpalen " + done + "/" + ms.length }),
        h("ul", { class: "g-list-ul" }, ms.map(function (m) {
          var md = parseYmd(m.datum), mc = md && !m.klaar ? countdown(md) : null;
          return h("li", null, h("label", null,
            h("input", { type: "checkbox", id: "ms-" + g.id + "-" + m.id, checked: !!m.klaar, disabled: !writable, onchange: function (e) { toggleMs(g.id, m.id, e.target.checked); } }),
            h("span", { class: "ms-t", text: m.tekst }),
            md ? h("span", { class: "ms-d" + (mc && mc.over ? " over" : ""), text: dateShortY(md) + (mc ? " · " + mc.text : "") }) : null));
        }))) : null,
      h("div", { class: "g-foot" },
        writable ? h("button", { class: "btn ghost sm", type: "button", text: "Bewerken", onclick: function () { startEdit(g.id); } }) : null,
        S.sparOn ? h("button", { class: "link-btn", type: "button", text: "Spar over dit doel", onclick: function () { sparAbout('Help me met mijn doel "' + (g.titel || "") + '". '); } }) : null));
  }
  function obTable(acts, n) {
    var cols = acts.map(function (a) { return { a: a, unit: unitOf(a), ser: actionSeries(a.id, n, unitOf(a)) }; });
    var rows = [];
    for (var i = n - 1; i >= 0; i--) {
      var mon = cols[0].ser[i].mon;
      if (cols.every(function (c) { return c.ser[i].state === "pre"; })) continue;
      rows.push(h("tr", null, h("td", { text: "wk " + isoWeek(mon).week + (cols[0].ser[i].state === "current" ? " (nu)" : "") }), h("td", { text: rangeLabel(mon) }),
        cols.map(function (c) {
          var p = c.ser[i];
          return h("td", { class: "n", text: p.v == null ? "–" : c.unit ? fmtAmount(p.v) + " " + c.unit + (p.gedaan != null ? " (" + p.gedaan + "×)" : "") : p.v + "/" + (p.target || 0) });
        })));
    }
    return h("details", { class: "tbl" }, h("summary", { text: "Toon opbouw als tabel" }),
      h("div", { class: "tbl-wrap" }, h("table", null,
        h("thead", null, h("tr", null, h("th", { text: "Week" }), h("th", { text: "Datum" }), cols.map(function (c) { return h("th", { text: cut(c.a.tekst, 28) }); }))),
        h("tbody", null, rows))));
  }
  // Grotere opbouwgrafiek op de doelkaart; wordt getekend zodra de kaart in de pagina staat en zijn breedte kent.
  function drawObCharts() {
    Array.prototype.forEach.call(document.querySelectorAll("#g-list .ob-chart"), function (box) {
      var W = Math.floor(box.clientWidth); if (!W) return;
      var unit = box.dataset.unit || "", label = box.dataset.label || "", n = Number(box.dataset.weeks) || 12;
      box.replaceChildren(obChart(actionSeries(box.dataset.aid, n, unit), unit, label, Math.max(220, W)));
    });
  }
  function obChart(ser, unit, label, W) {
    var H = 92, m = { l: 30, r: 4, t: 10, b: 20 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var n = ser.length, slot = pw / n, bw = clamp(slot - 6, 3, 24);
    var max = 0;
    ser.forEach(function (p) { if (p.v != null) max = Math.max(max, p.v); if (!unit && p.target) max = Math.max(max, p.target); });
    var top = max <= 0 ? 1 : max <= 4 ? Math.ceil(max) : max <= 10 ? Math.ceil(max / 2) * 2 : Math.ceil(max / 5) * 5;
    function y(v) { return m.t + ph * (1 - v / top); }
    function cx(i) { return m.l + slot * i + slot / 2; }
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": label + ", opbouw per week. " + seriesLabel(ser, unit) + ". De tabel onder de kaart toont dezelfde waarden." });
    [0, top].forEach(function (v, k) {
      svg.append(sv("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: k === 0 ? "c-base" : "c-grid" }));
      svg.append(sv("text", { x: m.l - 6, y: y(v) + 3.5, class: "c-tick", "text-anchor": "end" }, unit ? fmtAmount(v) : String(v)));
    });
    ser.forEach(function (p, i) {
      var x = cx(i) - bw / 2, cls = "c-bar" + (p.state === "current" ? " cur" : "");
      if (p.v == null) { if (p.state === "past") svg.append(sv("rect", { x: x, y: y(0) - 3, width: bw, height: 3, class: "c-none" })); }
      else if (p.v <= 0) svg.append(sv("rect", { x: x, y: y(0) - 1.5, width: bw, height: 1.5, class: cls }));
      else svg.append(sv("path", { d: topRounded(x, y(Math.min(p.v, top)), bw, y(0) - y(Math.min(p.v, top)), 4), class: cls }));
      if (!unit && p.target && p.v != null) svg.append(sv("line", { x1: x - 3, x2: x + bw + 3, y1: y(p.target), y2: y(p.target), class: "c-tgt" }));
    });
    svg.append(sv("text", { x: cx(0), y: H - 5, class: "c-tick", "text-anchor": "middle" }, "wk " + isoWeek(ser[0].mon).week));
    var mid = Math.floor(n / 2);
    if (slot * mid > 60) svg.append(sv("text", { x: cx(mid), y: H - 5, class: "c-tick", "text-anchor": "middle" }, "wk " + isoWeek(ser[mid].mon).week));
    svg.append(sv("text", { x: cx(n - 1), y: H - 5, class: "c-tick", "text-anchor": "middle" }, "nu"));
    ser.forEach(function (p, i) {
      var hit = sv("rect", { x: m.l + slot * i, y: 0, width: slot, height: H, fill: "transparent" });
      bindTip(hit, function () { return actTipRows(p, unit, ""); });
      svg.append(hit);
    });
    return svg;
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
    S.draft = { id: id, isNew: true, titel: "", categorie: "", waarom: "", kort: "", resultaat: "", deadline: "", acties: [{ id: rid("a"), tekst: "", perWeek: 1 }], mijlpalen: [] };
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
      h("div", { class: "field" }, h("label", { for: fid("deadline"), text: "Streefdatum (optioneel)" }),
        h("input", { id: fid("deadline"), type: "date", value: d.deadline || "", oninput: function (e) { d.deadline = e.target.value; } }))));
    form.append(h("div", { class: "field" }, h("label", { for: fid("waarom"), text: "Waarom dit je verder brengt" }),
      h("textarea", { id: fid("waarom"), rows: 3, maxlength: 1200, value: d.waarom || "", placeholder: "Hoe beïnvloedt dit je positief en maakt het je klaar voor de toekomst?", oninput: function (e) { d.waarom = e.target.value; var k = document.getElementById(fid("kort")); if (k) k.placeholder = firstSentence(d.waarom, 140) || KORT_PH; } })));
    form.append(h("div", { class: "field" }, h("label", { for: fid("kort"), text: "Waarom in één zin (zie je elke week bij het afvinken)" }),
      h("input", { id: fid("kort"), type: "text", maxlength: 140, value: d.kort || "", placeholder: firstSentence(d.waarom, 140) || KORT_PH, oninput: function (e) { d.kort = e.target.value; } }),
      h("span", { class: "hint", text: "Laat je dit leeg, dan zie je de eerste zin van je waarom." })));
    form.append(h("div", { class: "field" }, h("label", { for: fid("res"), text: "Meetbaar resultaat" }),
      h("textarea", { id: fid("res"), rows: 2, maxlength: 600, value: d.resultaat || "", placeholder: "Wanneer heb je dit doel gehaald?", oninput: function (e) { d.resultaat = e.target.value; } })));

    var actRows = h("div", { class: "rows" });
    actRows.append(h("datalist", { id: fid("units") }, UNITS.map(function (u) { return h("option", { value: u }); })));
    d.acties.forEach(function (a, idx) {
      actRows.append(h("div", { class: "row-edit act" },
        h("input", { id: fid("a-" + a.id), type: "text", maxlength: 120, "aria-label": "Wekelijkse actie", value: a.tekst || "", placeholder: "Actie, bijv. 90 minuten focus", oninput: function (e) { a.tekst = e.target.value; } }),
        h("div", { class: "per" }, h("input", { id: fid("n-" + a.id), type: "number", min: 0, max: 14, step: 1, inputmode: "numeric", "aria-label": "Aantal keer per week", value: a.perWeek == null ? 1 : a.perWeek, oninput: function (e) { a.perWeek = e.target.value; } }), h("span", { text: "×/wk" })),
        h("input", { id: fid("u-" + a.id), class: "unit-in", type: "text", maxlength: 12, list: fid("units"), "aria-label": "Eenheid, optioneel, bijvoorbeeld km", value: a.eenheid || "", placeholder: "eenheid", oninput: function (e) { a.eenheid = e.target.value; } }),
        delBtn(function () { d.acties.splice(idx, 1); renderGoals(true); }, "Verwijder actie", false)));
    });
    form.append(h("div", { class: "field" }, h("span", { class: "label", text: "Wekelijkse acties (die vink je af)" }), actRows,
      h("span", { class: "hint", text: "Eenheid is optioneel. Kies bijvoorbeeld km of min, dan vul je elke week ook de hoeveelheid in en zie je of je opbouwt." }),
      h("div", null, h("button", { type: "button", class: "link-btn", text: "Actie toevoegen", onclick: function () { var na = { id: rid("a"), tekst: "", perWeek: 1 }; d.acties.push(na); renderGoals(true); var el = document.getElementById(fid("a-" + na.id)); if (el) el.focus(); } }))));

    var msRows = h("div", { class: "rows" });
    d.mijlpalen.forEach(function (m, idx) {
      msRows.append(h("div", { class: "row-edit ms" },
        h("input", { id: fid("m-" + m.id), type: "text", maxlength: 160, "aria-label": "Mijlpaal", value: m.tekst || "", placeholder: "Mijlpaal", oninput: function (e) { m.tekst = e.target.value; } }),
        h("input", { id: fid("md-" + m.id), type: "date", "aria-label": "Datum van de mijlpaal, optioneel", value: m.datum || "", oninput: function (e) { m.datum = e.target.value; } }),
        delBtn(function () { d.mijlpalen.splice(idx, 1); renderGoals(true); }, "Verwijder mijlpaal", false)));
    });
    form.append(h("div", { class: "field" }, h("span", { class: "label", text: "Mijlpalen, met een datum als je die weet" }), msRows,
      h("div", null, h("button", { type: "button", class: "link-btn", text: "Mijlpaal toevoegen", onclick: function () { var nm = { id: rid("m"), tekst: "", klaar: false }; d.mijlpalen.push(nm); renderGoals(true); var el = document.getElementById(fid("m-" + nm.id)); if (el) el.focus(); } }))));

    form.append(h("div", { class: "form-actions" },
      h("button", { type: "submit", class: "btn primary", text: "Opslaan" }),
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
      kort: String(d.kort || "").trim().slice(0, 140),
      resultaat: String(d.resultaat || "").trim().slice(0, 600),
      deadline: parseYmd(d.deadline) ? d.deadline : "",
      acties: (d.acties || []).filter(function (a) { return String(a.tekst || "").trim(); }).map(function (a) {
        var out = { id: a.id || rid("a"), tekst: String(a.tekst).trim().slice(0, 120), perWeek: clamp(Math.round(Number(a.perWeek) || 0), 0, 14) };
        var u = unitOf(a); if (u) out.eenheid = u;
        return out;
      }),
      mijlpalen: (d.mijlpalen || []).filter(function (m) { return String(m.tekst || "").trim(); }).map(function (m) {
        var out = { id: m.id || rid("m"), tekst: String(m.tekst).trim().slice(0, 160), klaar: !!m.klaar };
        if (parseYmd(m.datum)) out.datum = m.datum;
        if (m.klaar && m.klaarOp) out.klaarOp = m.klaarOp;
        return out;
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
    (b.mijlpalen || []).forEach(function (m) {
      if (m.id !== mid) return;
      m.klaar = !!val;
      if (val) m.klaarOp = ymd(new Date()); else delete m.klaarOp;
    });
    S.goals[gid] = b;
    queueWrite("doelen/" + gid, b, 200);
    renderGoals();
    renderOverview();
    renderOvKoers();
  }

  /* ---------- Koers: je doelen op een tijdlijn naar de toekomst ---------- */
  function koersRows() {
    return goalsSorted().map(function (g) {
      return {
        g: g, dl: parseYmd(g.deadline),
        ms: (g.mijlpalen || []).filter(function (m) { return m && m.tekst; }).map(function (m) { return { m: m, d: parseYmd(m.datum) }; })
      };
    }).sort(function (a, b) {
      if (a.dl && b.dl) return a.dl - b.dl;
      if (a.dl) return -1;
      if (b.dl) return 1;
      return 0;
    });
  }
  function koersTicks(tStart, tEnd, plotW) {
    var days = (tEnd - tStart) / 864e5, steps = [1, 3, 6, 12], step = 12;
    for (var i = 0; i < steps.length; i++) { if (plotW / (days / (30.44 * steps[i])) >= 56) { step = steps[i]; break; } }
    var s = new Date(tStart), m = new Date(s.getFullYear(), s.getMonth() + 1, 1), out = [];
    while (m.getMonth() % step !== 0) m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    for (; m.getTime() <= tEnd; m = new Date(m.getFullYear(), m.getMonth() + step, 1)) out.push(m);
    return { ticks: out, step: step };
  }
  function koersTip(r, x) {
    var rows = [h("div", { class: "tip-h", text: cut(r.g.titel || "Doel", 48) })];
    if (x === "dl") {
      var cd = countdown(r.dl);
      rows.push(h("div", { class: "tip-r" }, h("strong", { text: "Streefdatum " + longDate(r.dl) })), h("div", { class: "tip-sub", text: cd.text }));
      if (r.g.resultaat) rows.push(h("div", { text: cut(r.g.resultaat, 140) }));
    } else {
      var c2 = x.d ? countdown(x.d) : null;
      rows.push(h("div", { class: "tip-r" }, h("strong", { text: x.m.tekst })),
        h("div", { class: "tip-sub", text: (x.d ? longDate(x.d) + " · " : "") + (x.m.klaar ? "gehaald" + (x.m.klaarOp && parseYmd(x.m.klaarOp) ? " op " + longDate(parseYmd(x.m.klaarOp)) : "") : c2 ? c2.text : "") }));
    }
    return rows;
  }
  function renderKoers() {
    var box = $("#koers-chart"), list = $("#koers-list"), note = $("#koers-note");
    if (!box) return;
    if (!S.db || !S.loaded.doelen) { box.replaceChildren(emptyBox(S.status === "error" ? "Je doelen konden niet worden geladen." : "Laden…")); list.replaceChildren(); note.hidden = true; return; }
    var rows = koersRows();
    if (!rows.length) { box.replaceChildren(emptyBox("Nog geen doelen. Voeg er een toe en geef het een streefdatum.")); list.replaceChildren(); note.hidden = true; return; }
    var dated = rows.filter(function (r) { return r.dl; }).length, msDated = 0;
    rows.forEach(function (r) { r.ms.forEach(function (x) { if (x.d) msDated++; }); });
    note.hidden = dated > 0 && msDated > 0;
    note.textContent = !dated ? "Geef je doelen een streefdatum en je mijlpalen een datum. Dan zie je hier je route naar de toekomst."
      : !msDated ? "Geef je mijlpalen een datum. Dan zie je per doel de tussenstappen op weg naar je streefdatum." : "";
    renderKoersList(rows, list);
    var W = Math.floor(box.clientWidth);
    if (!W) return;
    W = Math.max(300, W);
    var narrow = W < 640, now = today0(), t0 = now.getTime();
    var tMax = t0 + 182 * 864e5;
    rows.forEach(function (r) { if (r.dl) tMax = Math.max(tMax, r.dl.getTime()); r.ms.forEach(function (x) { if (x.d) tMax = Math.max(tMax, x.d.getTime()); }); });
    var span = tMax - t0, tStart = t0 - span * 0.045, tEnd = tMax + span * 0.01;
    var labelW = narrow ? 0 : Math.min(250, Math.round(W * 0.27)), x0 = narrow ? 6 : labelW + 18, x1 = W - (narrow ? 64 : 76);
    function X(t) { return x0 + (x1 - x0) * (clamp(t, tStart, tEnd) - tStart) / (tEnd - tStart); }
    var axisH = 28, laneH = narrow ? 62 : 52, H = axisH + rows.length * laneH + 4;
    var svg = sv("svg", { viewBox: "0 0 " + W + " " + H, class: "koers-svg", role: "group", "aria-label": "Tijdlijn van je doelen, van nu tot " + monthYear(new Date(tMax)) + ". De lijst eronder toont dezelfde data." });
    var tk = koersTicks(tStart, tEnd, x1 - x0), xNow = X(t0);
    tk.ticks.forEach(function (d) {
      var x = X(d.getTime());
      svg.append(sv("line", { x1: x, x2: x, y1: axisH - 8, y2: H - 2, class: "k-grid" }));
      var lab = tk.step === 12 || d.getMonth() === 0 ? String(d.getFullYear()) : MONTHS[d.getMonth()];
      var lw = lab.length * 7 + 4;
      if ((x + 4 < xNow + 14 && x + 4 + lw > xNow - 14) || x + lw > W) return;
      svg.append(sv("text", { x: x + 4, y: 15, class: "k-axis" + (d.getMonth() === 0 ? " yr" : "") }, lab));
    });
    rows.forEach(function (r, i) { if (i > 0) svg.append(sv("line", { x1: 0, x2: W, y1: axisH + i * laneH, y2: axisH + i * laneH, class: "k-sep" })); });
    svg.append(sv("line", { x1: xNow, x2: xNow, y1: axisH - 10, y2: H - 2, class: "k-now" }));
    svg.append(sv("text", { x: xNow, y: 15, class: "k-now-t", "text-anchor": "middle" }, "nu"));
    rows.forEach(function (r, i) {
      var top = axisH + i * laneH, cy = narrow ? top + 42 : top + laneH / 2 + 1;
      var cd = r.dl ? countdown(r.dl) : null;
      var maxChars = narrow ? Math.floor((W - 90) / 7.2) : Math.floor(labelW / 7.4);
      if (narrow) {
        svg.append(sv("text", { x: 0, y: top + 19, class: "k-lbl" }, cut(r.g.titel || "Doel", maxChars)));
      } else {
        svg.append(sv("text", { x: 0, y: cy - 4, class: "k-lbl" }, cut(r.g.titel || "Doel", maxChars)));
        svg.append(sv("text", { x: 0, y: cy + 13, class: "k-sub" + (cd && cd.over ? " over" : "") }, cd ? cd.text : "geen streefdatum"));
      }
      if (r.dl) {
        var xd = X(r.dl.getTime());
        svg.append(sv("line", { x1: Math.min(xNow, xd), x2: Math.max(xNow, xd), y1: cy, y2: cy, class: "k-track" }));
      } else {
        svg.append(sv("text", { x: xNow + 10, y: cy + 4, class: "k-sub" }, narrow ? "geen streefdatum" : "zet een streefdatum bij Bewerken"));
      }
      r.ms.forEach(function (x) {
        if (!x.d) return;
        var mx = X(x.d.getTime()), over = !x.m.klaar && dayNum(x.d) < dayNum(now), s = 6;
        var cls = "k-ms" + (x.m.klaar ? " done" : "") + (over ? " over" : "");
        svg.append(sv("path", { d: "M" + mx + "," + (cy - s - 2) + "L" + (mx + s + 2) + "," + cy + "L" + mx + "," + (cy + s + 2) + "L" + (mx - s - 2) + "," + cy + "Z", class: "k-ring" }));
        svg.append(sv("path", { d: "M" + mx + "," + (cy - s) + "L" + (mx + s) + "," + cy + "L" + mx + "," + (cy + s) + "L" + (mx - s) + "," + cy + "Z", class: cls }));
        var hit = sv("circle", { cx: mx, cy: cy, r: 13, class: "k-hit", tabindex: "0", role: "img",
          "aria-label": "Mijlpaal " + x.m.tekst + ", " + longDate(x.d) + (x.m.klaar ? ", gehaald" : over ? ", over tijd" : "") });
        bindTip(hit, function () { return koersTip(r, x); });
        svg.append(hit);
      });
      if (r.dl) {
        var xd2 = X(r.dl.getTime()), lab = monthYear(r.dl), right = xd2 + 12 + lab.length * 6.8 <= W;
        svg.append(sv("circle", { cx: xd2, cy: cy, r: 8, class: "k-ring" }));
        svg.append(sv("circle", { cx: xd2, cy: cy, r: 6, class: "k-dl" + (cd && cd.over ? " over" : "") }));
        svg.append(sv("text", { x: right ? xd2 + 12 : xd2 - 12, y: cy + 4, class: "k-dlt", "text-anchor": right ? "start" : "end" }, lab));
        var hitD = sv("circle", { cx: xd2, cy: cy, r: 13, class: "k-hit", tabindex: "0", role: "img", "aria-label": "Streefdatum " + (r.g.titel || "") + ": " + longDate(r.dl) + ", " + cd.text });
        bindTip(hitD, function () { return koersTip(r, "dl"); });
        svg.append(hitD);
      }
    });
    box.replaceChildren(svg);
  }
  function renderKoersList(rows, list) {
    list.replaceChildren(h("ul", { class: "koers-ul" }, rows.map(function (r) {
      var cd = r.dl ? countdown(r.dl) : null;
      return h("li", null,
        h("div", { class: "koers-li-top" }, h("strong", { text: r.g.titel || "Doel" }), h("span", { class: "dd-sub" + (cd && cd.over ? " over" : ""), text: r.dl ? longDate(r.dl) + " · " + cd.text : "Geen streefdatum" })),
        r.ms.length ? h("ul", { class: "koers-ms" }, r.ms.map(function (x) {
          var c = x.d && !x.m.klaar ? countdown(x.d) : null;
          return h("li", null, h("span", { text: (x.m.klaar ? "Gehaald: " : "") + x.m.tekst }), h("span", { class: "dd-sub" + (c && c.over ? " over" : ""), text: x.d ? dateShortY(x.d) + (c ? " · " + c.text : "") : "geen datum" }));
        })) : null);
    })));
  }
  // Overzicht: wat eraan komt (mijlpalen met een datum en streefdata), zodat je weekwerk een richting heeft.
  function upcomingKoers(n) {
    var out = [], t = dayNum(new Date());
    goalsSorted().forEach(function (g) {
      openMilestones(g).forEach(function (x) { if (x.d) out.push({ d: x.d, text: x.m.tekst, g: g, kind: "ms" }); });
      var dl = parseYmd(g.deadline);
      if (dl && dayNum(dl) >= t - 31) out.push({ d: dl, text: g.resultaat ? cut(g.resultaat, 90) : g.titel, g: g, kind: "dl" });
    });
    out.sort(function (a, b) { return a.d - b.d; });
    return out.slice(0, n);
  }
  function renderOvKoers() {
    var box = $("#ov-koers"); if (!box) return;
    box.replaceChildren(h("div", { class: "panel-head" }, h("h2", { text: "Wat eraan komt" }), h("a", { class: "link-btn", href: "#doelen", text: "Je koers" })));
    if (!S.loaded.doelen) { box.append(h("p", { class: "hint", text: "Laden…" })); return; }
    var list = upcomingKoers(4);
    if (!list.length) {
      box.append(h("p", { class: "hint", text: "Geef je doelen een streefdatum en je mijlpalen een datum. Dan zie je hier wat er de komende maanden aankomt." }));
      return;
    }
    box.append(h("ul", { class: "cal-list" }, list.map(function (x) {
      var cd = countdown(x.d);
      return h("li", { class: "cal" + (cd.over ? " over" : "") },
        h("div", { class: "cal-date", "aria-hidden": "true" }, h("span", { class: "cal-day", text: String(x.d.getDate()) }), h("span", { class: "cal-mon", text: MONTHS[x.d.getMonth()] + (x.d.getFullYear() !== new Date().getFullYear() ? " '" + String(x.d.getFullYear()).slice(2) : "") })),
        h("div", { class: "cal-body" },
          h("div", { class: "cal-top" }, h("span", { class: "cal-kind", text: x.kind === "dl" ? "Streefdatum" : "Mijlpaal" }), h("span", { class: "cal-cd" + (cd.over ? " over" : ""), text: cd.text })),
          h("strong", { class: "cal-what", text: x.text }),
          h("span", { class: "cal-meta", text: x.g.titel || "" })));
    })));
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
    "Wat betekent mijn handelsplan voor deze week?",
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
      "Hij wil progressief opbouwen (progressive overload): geleidelijk meer doen. Extra keren boven zijn plan tellen niet mee in de weekscore (die is per doel maximaal 100%) maar wel in zijn opbouw. Help hem met kleine stappen: één keer per week erbij als hij de lat een paar weken haalt of overschrijdt, en bij hoeveelheden (km, minuten) ongeveer 10% per week. Koppel wat hij elke week doet aan waarom hij het doet en aan zijn streefdata.",
      "Over beleggen: zijn handelsplan komt uit zijn eigen Handelsplan-site en staat hieronder samengevat. Help hem consequent volgens zijn eigen plan, niveaus en spelregels te handelen. Geef geen persoonlijk koop- of verkoopadvies en geen koersvoorspellingen. De marktcijfers zijn momentopnames met een datum, geen live koersen; zeg dat als hij ernaar vraagt.",
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
      if (g.kort) L.push("Waarom in één zin: " + cut(g.kort, 160));
      if (g.waarom) L.push("Waarom: " + cut(g.waarom, 400));
      L.push("Resultaat: " + (g.resultaat ? cut(g.resultaat, 300) : "nog niet vastgelegd"));
      var dlx = parseYmd(g.deadline);
      L.push("Streefdatum: " + (dlx ? g.deadline + " (" + countdown(dlx).text + ")" : "geen"));
      var acts = (g.acties || []).map(function (a) {
        var it = curItems[a.id], unit = unitOf(a), tr = actionTrend(a.id, unit, Number(a.perWeek) || 0);
        var ser = actionSeries(a.id, 9, unit).filter(function (p) { return p.state === "past" && p.v != null; });
        var now = it ? " (deze week " + it.gedaan + "/" + it.target + (extraOf(it) ? ", waarvan " + extraOf(it) + " extra" : "") + (unit && it.hoeveel != null ? ", " + fmtAmount(Number(it.hoeveel)) + " " + unit : "") + ")" : "";
        return a.tekst + ", " + a.perWeek + "× per week" + (unit ? ", eenheid " + unit : "") + " [actie_id: " + a.id + "]" + now +
          "; opbouw: " + trendText(tr).toLowerCase() + (ser.length ? " (afgelopen weken: " + ser.map(function (p) { return fmtAmount(p.v); }).join(", ") + (unit ? " " + unit : "") + ")" : "");
      });
      L.push("Wekelijkse acties: " + (acts.length ? acts.join("; ") : "geen"));
      var ms = g.mijlpalen || [];
      if (ms.length) L.push("Mijlpalen: " + ms.map(function (m) { return (m.klaar ? "[klaar] " : m.datum ? "[open, voor " + m.datum + "] " : "[open] ") + m.tekst; }).join("; "));
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
    var hpd = hpData();
    if (hpd.plan) {
      var P = hpd.plan, hit = hpItems(), PM = P.meta || {}, PX = P.macro || {};
      L.push("", "HANDELSPLAN (uit zijn Handelsplan-site, versie " + (PM.version != null ? PM.version : "?") + ", stand " + (PM.asOf || "") + "; geen advies, zijn eigen plan):");
      if (PX.regime || PX.headline) L.push("Regime: " + [PX.regime, PX.riskMode].filter(Boolean).join(", ") + ". " + (PX.headline || ""));
      if ((P.simple || {}).headline) L.push("Kern: " + P.simple.headline);
      (P.positions || []).forEach(function (p) { L.push("- " + (p.short || p.name) + ": " + (p.doLabel || p.stance || "") + ". " + cut(p.doNow || "", 220)); });
      var sigs = (P.triggers || []).map(function (t) { return Object.assign({ t: t }, trigState(t, hit)); }).filter(function (r) { return r.st === "alarm" || r.st === "letop"; });
      if (sigs.length) L.push("Signalen: " + sigs.map(function (r) { return r.t.label + " " + fmtUnit(r.v, r.t.unit, r.it) + " (" + TRIG[r.st].t.toLowerCase() + ")"; }).join("; "));
      var nxt = upcoming(P, 4);
      if (nxt.length) L.push("Komende momenten: " + nxt.map(function (c) { return c.date + " " + c.event; }).join("; "));
    }
    var plan = S.invest.plan || {}, pf = S.invest.portfolio || {};
    L.push("", "EIGEN PORTFOLIO EN INLEG (in Koersplan; geen live koersen):");
    if (plan.maxPositie) L.push("Maximaal per positie: " + plan.maxPositie + "%");
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
    var F = { titel: "Titel", waarom: "Waarom", kort: "Waarom in één zin", resultaat: "Resultaat", deadline: "Streefdatum" };
    var g = p.doel && S.goals[p.doel];
    if (p.type === "doel") return { title: F[p.veld] + " aanpassen", sub: g ? g.titel : "", body: p.waarde || "(leeg)" };
    if (p.type === "actie") {
      var t = p.perWeek === 0 ? "Actie verwijderen" : p.actie ? "Actie aanpassen" : "Actie toevoegen";
      return { title: t, sub: g ? g.titel : "", body: p.perWeek === 0 ? (p.tekst || "") : (p.tekst || "") + " · " + p.perWeek + "× per week" + (p.eenheid ? " · in " + p.eenheid : "") };
    }
    if (p.type === "nieuw") return { title: "Nieuw doel", sub: p.categorie || "", body: p.titel + (p.kort ? "\nWaarom: " + p.kort : "") + (p.acties && p.acties.length ? "\nElke week: " + p.acties.map(function (a) { return a.tekst + " (" + a.perWeek + "×" + (a.eenheid ? ", " + a.eenheid : "") + ")"; }).join(", ") : "") };
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
      h("button", { class: "btn primary sm", type: "button", text: "Toepassen", onclick: function () { if (applyProposal(p)) { card.classList.add("done"); actions.replaceChildren(h("span", { class: "prop-state", text: "Toegepast" })); } } }),
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
        else {
          b.acties[i] = Object.assign({}, b.acties[i], { tekst: p.tekst || b.acties[i].tekst, perWeek: p.perWeek });
          if (p.eenheid != null) { if (p.eenheid) b.acties[i].eenheid = p.eenheid; else delete b.acties[i].eenheid; }
        }
      } else b.acties.push(Object.assign({ id: rid("a"), tekst: p.tekst, perWeek: p.perWeek }, p.eenheid ? { eenheid: p.eenheid } : {}));
      b.concept = false; b.bijgewerkt = new Date().toISOString();
      S.goals[p.doel] = b; queueWrite("doelen/" + p.doel, b, 0);
    } else if (p.type === "nieuw") {
      id = rid("d");
      b = { titel: p.titel, categorie: p.categorie || "", waarom: p.waarom || "", kort: p.kort || "", resultaat: p.resultaat || "", deadline: "", acties: (p.acties || []).map(function (a) { return Object.assign({ id: rid("a"), tekst: a.tekst, perWeek: a.perWeek }, a.eenheid ? { eenheid: a.eenheid } : {}); }), mijlpalen: [], volgorde: nextOrder(), concept: false, bijgewerkt: new Date().toISOString() };
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
        description: "Stel voor om één veld van een bestaand doel te wijzigen: titel, waarom, kort (waarom in één zin, die hij elke week ziet), resultaat of deadline (streefdatum JJJJ-MM-DD, leeg voor geen). De gebruiker ziet het voorstel en beslist zelf. Geeft een bevestiging terug.",
        inputSchema: { type: "object", properties: { doel_id: { type: "string" }, veld: { type: "string", enum: ["titel", "waarom", "kort", "resultaat", "deadline"] }, nieuwe_waarde: { type: "string" }, reden: { type: "string", description: "Eén korte zin waarom." } }, required: ["doel_id", "veld", "nieuwe_waarde"] },
        execute: function (inp) {
          goalOf(inp.doel_id);
          var veld = txt(inp.veld, 20);
          if (["titel", "waarom", "kort", "resultaat", "deadline"].indexOf(veld) < 0) throw new Error("veld moet titel, waarom, kort, resultaat of deadline zijn.");
          var val = txt(inp.nieuwe_waarde, veld === "titel" ? 120 : veld === "kort" ? 140 : 1200);
          if (veld === "titel" && !val) throw new Error("Een titel mag niet leeg zijn.");
          if (veld === "deadline" && val && !parseYmd(val)) throw new Error("Een deadline schrijf je als JJJJ-MM-DD.");
          return push({ type: "doel", doel: String(inp.doel_id), veld: veld, waarde: val, reden: txt(inp.reden, 300) });
        }
      },
      {
        name: "actie_wijzigen",
        description: "Stel voor om een wekelijkse actie van een doel toe te voegen (laat actie_id weg), aan te passen (met actie_id) of te verwijderen (per_week 0). per_week is hoe vaak per week, 0 tot 14. eenheid is optioneel (bijv. km of min); dan vult hij per week ook de hoeveelheid in. De gebruiker beslist zelf.",
        inputSchema: { type: "object", properties: { doel_id: { type: "string" }, actie_id: { type: "string" }, tekst: { type: "string" }, per_week: { type: "integer", minimum: 0, maximum: 14 }, eenheid: { type: "string" }, reden: { type: "string" } }, required: ["doel_id", "per_week"] },
        execute: function (inp) {
          var g = goalOf(inp.doel_id), aid = txt(inp.actie_id, 40), n = perW(inp.per_week), tekst = txt(inp.tekst, 120), a = null;
          if (aid) { (g.acties || []).forEach(function (x) { if (x.id === aid) a = x; }); if (!a) throw new Error("Onbekend actie_id voor dit doel."); }
          else if (!tekst || n === 0) throw new Error("Een nieuwe actie heeft tekst en per_week van minstens 1 nodig.");
          return push({ type: "actie", doel: String(inp.doel_id), actie: aid || null, tekst: tekst || (a && a.tekst) || "", perWeek: n, eenheid: inp.eenheid == null ? null : txt(inp.eenheid, 12), reden: txt(inp.reden, 300) });
        }
      },
      {
        name: "doel_toevoegen",
        description: "Stel een nieuw doel voor met titel, categorie, waarom, kort (waarom in één zin), meetbaar resultaat en wekelijkse acties (eventueel met eenheid). Alleen als het echt ontbreekt. De gebruiker beslist zelf.",
        inputSchema: { type: "object", properties: { titel: { type: "string" }, categorie: { type: "string" }, waarom: { type: "string" }, kort: { type: "string" }, resultaat: { type: "string" }, acties: { type: "array", items: { type: "object", properties: { tekst: { type: "string" }, per_week: { type: "integer", minimum: 1, maximum: 14 }, eenheid: { type: "string" } }, required: ["tekst", "per_week"] } }, reden: { type: "string" } }, required: ["titel"] },
        execute: function (inp) {
          var titel = txt(inp.titel, 120); if (!titel) throw new Error("Een doel heeft een titel nodig.");
          var acties = (Array.isArray(inp.acties) ? inp.acties : []).slice(0, 4).map(function (a) { return { tekst: txt(a && a.tekst, 120), perWeek: Math.max(1, perW(a && a.per_week)), eenheid: txt(a && a.eenheid, 12) }; }).filter(function (a) { return a.tekst; });
          return push({ type: "nieuw", titel: titel, categorie: txt(inp.categorie, 30), waarom: txt(inp.waarom, 1200), kort: txt(inp.kort, 140), resultaat: txt(inp.resultaat, 600), acties: acties, reden: txt(inp.reden, 300) });
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
    renderHp(); renderPortfolio(); renderMaxInput(); renderDca(); renderMarketLog();
    if (S.view === "investeren") renderHistChart();
    var w = canWrite();
    $("#mlog-form").hidden = !w;
    $("#pf-edit").hidden = !w;
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
      h("button", { type: "submit", class: "btn primary sm", text: "Opslaan" })));
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
  function renderMaxInput() {
    var plan = S.invest.plan || {};
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
  function renderMarketLog() {
    var ul = $("#mlog-list"); ul.replaceChildren();
    var list = S.notes.filter(function (n) { return n.soort === "markt"; });
    if (!list.length) { ul.append(h("li", { class: "hint", style: "border:0", text: "Nog geen marktnotities." })); return; }
    list.slice(0, 40).forEach(function (n) {
      ul.append(h("li", null, h("div", { class: "note-meta" }, h("span", { text: dateOnly(n.datum) }), canWrite() ? delBtn(function () { deleteNote(n.id); }, "Verwijder marktnotitie", true) : null), h("p", { class: "note-text", text: n.tekst })));
    });
  }

  /* ================= Handelsplan ================= */
  var HP = { busy: false };
  var DAYS_SHORT = ["zo", "ma", "di", "wo", "do", "vr", "za"];
  var TRIG = {
    alarm: { k: "crit", t: "Alarm", rank: 0 },
    letop: { k: "warn", t: "Let op", rank: 1 },
    rustig: { k: "good", t: "Rustig", rank: 2 },
    geen: { k: "neutral", t: "Geen cijfer", rank: 3 }
  };
  var CHECK_RANK = { geraakt: 0, dichtbij: 1, nognie: 2, geen: 3 };
  var CHECK_LABEL = { geraakt: "Geraakt", dichtbij: "Dichtbij", nognie: "Nog niet", geen: "Geen cijfer" };
  var MKT_KEYS = ["vwce", "smh", "crcl", "gold", "btc", "us10y", "realYield10", "brent", "spx", "vix", "dxy", "cpiYoY"];
  var nfCache = {};
  function fmtNum(v, dec) {
    var k = String(dec);
    if (!nfCache[k]) nfCache[k] = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return nfCache[k].format(v);
  }
  function guessDec(v) { var a = Math.abs(v); return a >= 1000 ? 0 : a >= 100 ? 1 : 2; }
  function fmtItem(it, v) {
    if (it && it.display && v === it.value) return String(it.display);
    if (v == null || !isFinite(v)) return "–";
    var dec = it && it.decimals != null ? Number(it.decimals) : guessDec(v);
    return (v < 0 ? "−" : "") + ((it && it.prefix) || "") + fmtNum(Math.abs(v), dec) + ((it && it.suffix) || "");
  }
  function fmtUnit(v, unit, it) {
    if (it) return fmtItem(it, v);
    if (v == null || !isFinite(v)) return "–";
    var s = fmtNum(Math.abs(v), guessDec(v)), neg = v < 0 ? "−" : "";
    if (unit === "%") return neg + s + "%";
    if (unit === "$") return neg + "$" + s;
    if (unit === "k" || unit === "Δk") return neg + s + "k";
    if (unit === "Δ$mld") return neg + "$" + s + " mld";
    return neg + s;
  }
  function fmtStamp(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function hpData() { var x = S.hp || {}; return { plan: x.plan || null, markt: x.markt || null, status: x.status || null }; }
  function hpItems() {
    var out = {}, m = (S.hp && S.hp.markt) || {};
    (m.items || []).forEach(function (it) { if (it && it.key) out[it.key] = it; });
    return out;
  }
  function trigState(t, items) {
    var it = t.marketKey ? items[t.marketKey] : null;
    var v = it && typeof it.value === "number" ? it.value : (typeof t.current === "number" ? t.current : null);
    var st = "geen";
    if (v != null) {
      var up = t.dir !== "down";
      if (t.danger != null && (up ? v >= t.danger : v <= t.danger)) st = "alarm";
      else if (t.warn != null && (up ? v >= t.warn : v <= t.warn)) st = "letop";
      else st = "rustig";
    }
    return { v: v, it: it, asOf: (it && it.asOf) || t.asOf || "", st: st };
  }
  function checkState(c, items) {
    var it = items[c.key], v = it && typeof it.value === "number" ? it.value : null;
    if (v == null) return { v: null, it: it, st: "geen" };
    var lt = c.op === "lt", hit = lt ? v < c.level : v > c.level;
    var near = !hit && c.near != null && (lt ? v <= c.near : v >= c.near);
    return { v: v, it: it, st: hit ? "geraakt" : near ? "dichtbij" : "nognie" };
  }
  function stanceTone(s) {
    s = String(s || "").toLowerCase();
    if (/verklein|afbouw|verkoop|verlaag/.test(s)) return "crit";
    if (/voorzicht|afwacht|niet (extra )?bijkop|niet kopen/.test(s)) return "warn";
    if (/bijkop|opbouw|kopen|instap/.test(s)) return "good";
    return "neutral";
  }
  function riskTone(s) {
    s = String(s || "").toLowerCase();
    if (/crisis|zeer/.test(s)) return "crit";
    if (/defensief|voorzicht|verhoogd/.test(s)) return "warn";
    if (/aanval|offensief|risk-on|laag/.test(s)) return "good";
    return "neutral";
  }
  function pillarTone(s) {
    s = String(s || "").toLowerCase();
    if (/stress|crisis|alarm/.test(s)) return "crit";
    if (/gespannen|let op|zwak/.test(s)) return "warn";
    if (/rustig|ok|goed|steun|gezond/.test(s)) return "good";
    return "neutral";
  }
  function pill(tone, text) { return h("span", { class: "pill pill-" + tone, text: text }); }
  function posShort(plan, id) {
    var p = (plan.positions || []).filter(function (x) { return x.id === id; })[0];
    return p ? (p.short || p.name) : id;
  }
  function upcoming(plan, n) {
    var t = new Date(), today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    return (plan.calendar || []).map(function (c) { return Object.assign({ d: parseYmd(c.date) }, c); })
      .filter(function (c) { return c.d && c.d.getTime() >= today.getTime(); })
      .sort(function (a, b) { return a.d - b.d; }).slice(0, n);
  }
  async function hpSyncNow() {
    if (HP.busy) return;
    HP.busy = true; renderHp();
    try {
      await api("POST", "/api/handelsplan/sync");
      toast("Handelsplan bijgewerkt.");
    } catch (e) {
      if (!e || e.code !== "auth") toast(e && e.code === "te_vaak" ? "Even wachten voor je opnieuw bijwerkt." : ((e && e.message) || "Bijwerken mislukt."));
    } finally {
      HP.busy = false;
      await refreshData();
      renderHp(); renderOvHp();
    }
  }

  function hpConnectCard(cfg, st) {
    var steps = [];
    if (!cfg.url) steps.push("Open in Railway de service koersplan en zet bij Variables HANDELSPLAN_URL op het adres van je Handelsplan-site.");
    steps.push((cfg.url ? "Open in Railway de service koersplan en zet bij Variables " : "Zet daar ook ") + "HANDELSPLAN_PASSWORD op het wachtwoord waarmee je bij Handelsplan inlogt.");
    steps.push("Klik op Deploy als Railway daarom vraagt. Binnen een minuut staat je plan hier, daarna ververst het elke " + (cfg.minuten || 30) + " minuten.");
    var card = h("section", { class: "panel hp-connect" },
      h("div", { class: "panel-head" }, h("h2", { text: "Koppel je Handelsplan" })),
      h("p", { text: "Koersplan haalt je regime, posities met niveaus, signalen, scenario's en agenda op uit Handelsplan. Je hoeft niets over te typen." }),
      h("ol", { class: "steps" }, steps.map(function (s) { return h("li", { text: s }); })));
    if (cfg.gekoppeld && st && st.fout) {
      card.append(h("p", { class: "msg-err", text: st.fout }),
        h("div", { class: "form-actions" }, h("button", { class: "btn primary sm", type: "button", text: HP.busy ? "Bezig…" : "Opnieuw proberen", disabled: HP.busy, onclick: hpSyncNow })));
    } else if (cfg.gekoppeld) {
      card.append(h("p", { class: "hint", text: "De koppeling staat ingesteld. Je plan wordt opgehaald…" }));
    }
    return card;
  }
  function hpStatusRow(plan, st, cfg) {
    var meta = plan.meta || {}, parts = [];
    parts.push("versie " + (meta.version != null ? meta.version : "?"));
    if (meta.updatedAt) parts.push("plan bijgewerkt " + fmtStamp(meta.updatedAt));
    if (st && st.opgehaald) parts.push("opgehaald " + fmtStamp(st.opgehaald));
    var bad = st && st.ok === false;
    var row = h("div", { class: "hp-status" },
      h("div", { class: "hp-src" },
        chip(bad ? "warn" : "good", bad ? "Laatste ophaalpoging mislukt" : "Uit Handelsplan"),
        h("span", { class: "hint", text: parts.join(" · ") })),
      h("div", { class: "hp-actions" },
        h("button", { class: "btn ghost sm", type: "button", text: HP.busy ? "Bezig…" : "Nu bijwerken", disabled: HP.busy || !cfg.gekoppeld, onclick: hpSyncNow }),
        cfg.url ? h("a", { class: "btn ghost sm", href: cfg.url, target: "_blank", rel: "noopener", text: "Open Handelsplan" }) : null));
    if (bad && st.fout) row.append(h("p", { class: "msg-err hp-err", text: st.fout + " Je ziet de laatst opgehaalde versie." }));
    return row;
  }
  function hpRegime(plan) {
    var mac = plan.macro || {}, reg = plan.regime || {}, risk = mac.riskMode || reg.riskLevel || "";
    var pillars = (mac.pillars || []).filter(function (p) { return p && p.name; });
    return h("section", { class: "hp-regime" },
      h("div", { class: "hp-regime-top" },
        h("span", { class: "eyebrow", text: "Regime" }),
        h("span", { class: "hp-regime-name", text: mac.regime || reg.name || "" }),
        risk ? pill(riskTone(risk), "Houding: " + risk) : null,
        reg.phase ? pill("neutral", reg.phase) : null),
      h("h2", { class: "hp-headline", text: mac.headline || reg.name || "Je handelsplan" }),
      mac.summary ? h("p", { class: "hp-summary", text: mac.summary }) : (reg.thesis ? h("p", { class: "hp-summary", text: reg.thesis }) : null),
      reg.masterVariable && reg.masterVariable.name ? h("p", { class: "hp-master" }, h("strong", { text: "Kijk eerst naar: " + reg.masterVariable.name + ". " }), h("span", { text: reg.masterVariable.why || "" })) : null,
      pillars.length ? h("div", { class: "hp-pillars", role: "list", "aria-label": "Pijlers" }, pillars.map(function (p) {
        return h("span", { class: "pillar pillar-" + pillarTone(p.status), role: "listitem", title: p.reading || "" },
          h("span", { class: "pillar-dot", "aria-hidden": "true" }), h("span", { class: "pillar-name", text: p.name }), h("span", { class: "pillar-st", text: p.status || "" }));
      })) : null);
  }
  function hpDo(plan, items) {
    var simple = plan.simple || {};
    var card = h("section", { class: "panel hp-do" }, h("div", { class: "panel-head" }, h("h2", { text: "Wat moet ik doen" })));
    if (simple.headline) card.append(h("p", { class: "hp-do-head", text: simple.headline }));
    var list = h("div", { class: "pos-list" });
    (plan.positions || []).forEach(function (p) {
      var it = p.priceKey ? items[p.priceKey] : null;
      var checks = (p.checks || []).map(function (c) { return Object.assign({ c: c }, checkState(c, items)); });
      checks.sort(function (a, b) { return CHECK_RANK[a.st] - CHECK_RANK[b.st]; });
      list.append(h("article", { class: "pos" },
        h("div", { class: "pos-head" },
          h("span", { class: "pos-name", text: p.short || p.name }),
          pill(stanceTone(p.stance + " " + (p.doLabel || "")), p.doLabel || p.stance || "–"),
          it ? h("span", { class: "pos-price", text: fmtItem(it, it.value) + (it.asOf ? " · " + it.asOf : "") }) : null),
        p.doNow ? h("p", { class: "pos-do", text: p.doNow }) : null,
        checks.length ? h("ul", { class: "checks" }, checks.map(function (x) {
          return h("li", { class: "check check-" + x.st + " tone-" + (x.c.tone || "warn"), title: x.c.then || "" },
            h("span", { class: "check-dot", "aria-hidden": "true" }),
            h("span", { class: "check-txt" },
              h("span", { class: "check-label", text: x.c.label || "" }),
              h("span", { class: "check-act", text: (x.st === "geraakt" ? "Nu: " : "Dan: ") + (x.c.action || "") })),
            h("span", { class: "check-side" },
              h("span", { class: "check-st", text: CHECK_LABEL[x.st] }),
              h("span", { class: "check-now", text: x.v == null ? "" : "nu " + fmtItem(x.it, x.v) })));
        })) : null));
    });
    card.append(list);
    return card;
  }
  function sigRow(r) {
    var t = r.t, up = t.dir !== "down", cmp = up ? "≥ " : "≤ ", th = [];
    if (t.warn != null) th.push("let op " + cmp + fmtUnit(t.warn, t.unit, r.it));
    if (t.danger != null) th.push("alarm " + cmp + fmtUnit(t.danger, t.unit, r.it));
    var thText = th.concat(r.asOf ? [r.asOf] : []).join(" · ");
    return h("li", { class: "sig sig-" + r.st },
      h("div", { class: "sig-main" },
        h("span", { class: "sig-label", text: t.label }),
        t.meaning ? h("span", { class: "sig-meaning", text: t.meaning }) : null,
        thText ? h("span", { class: "sig-th", text: thText }) : null),
      h("div", { class: "sig-side" },
        h("strong", { class: "sig-val", text: fmtUnit(r.v, t.unit, r.it) }),
        chip(TRIG[r.st].k, TRIG[r.st].t)));
  }
  function hpSignals(plan, items) {
    var rows = (plan.triggers || []).map(function (t) { return Object.assign({ t: t }, trigState(t, items)); });
    rows.sort(function (a, b) { return TRIG[a.st].rank - TRIG[b.st].rank; });
    var hot = rows.filter(function (r) { return r.st === "alarm" || r.st === "letop"; });
    var calm = rows.filter(function (r) { return r.st === "rustig" || r.st === "geen"; });
    var count = function (s) { return rows.filter(function (r) { return r.st === s; }).length; };
    var card = h("section", { class: "panel hp-signals" },
      h("div", { class: "panel-head" }, h("h2", { text: "Signalen" }),
        h("span", { class: "hint", text: count("alarm") + " alarm · " + count("letop") + " let op · " + count("rustig") + " rustig" })));
    if (hot.length) card.append(h("ul", { class: "sigs" }, hot.map(sigRow)));
    else card.append(h("p", { class: "hint", text: "Geen signalen op alarm of let op." }));
    if (calm.length) card.append(h("details", { class: "more" }, h("summary", { text: "Rustige signalen (" + calm.length + ")" }), h("ul", { class: "sigs" }, calm.map(sigRow))));
    return card;
  }
  function hpCalendar(plan) {
    var list = upcoming(plan, 6), t = new Date(), todayKey = ymd(t);
    var card = h("section", { class: "panel hp-cal" }, h("div", { class: "panel-head" }, h("h2", { text: "Komende momenten" })));
    if (!list.length) { card.append(h("p", { class: "hint", text: "Geen momenten gepland." })); return card; }
    card.append(h("ul", { class: "cal-list" }, list.map(function (c) {
      var isToday = c.date === todayKey;
      return h("li", { class: "cal" + (isToday ? " today" : "") },
        h("div", { class: "cal-date", "aria-hidden": "true" }, h("span", { class: "cal-day", text: String(c.d.getDate()) }), h("span", { class: "cal-mon", text: MONTHS[c.d.getMonth()] })),
        h("div", { class: "cal-body" },
          h("div", { class: "cal-top" }, h("strong", { text: c.event || "" }), isToday ? pill("warn", "Vandaag") : null),
          h("span", { class: "cal-meta", text: DAYS[c.d.getDay()] + " " + c.d.getDate() + " " + MONTHS_LONG[c.d.getMonth()] + (c.time ? " · " + c.time : "") }),
          c.why ? h("p", { class: "cal-why", text: c.why }) : null,
          (c.affects || []).length ? h("div", { class: "tags" }, c.affects.map(function (a) { return h("span", { class: "tag", text: posShort(plan, a) }); })) : null));
    })));
    return card;
  }
  function hpScenarios(plan) {
    var list = (plan.scenarios || []).slice().sort(function (a, b) { return (b.prob || 0) - (a.prob || 0); });
    var card = h("section", { class: "panel hp-scen" }, h("div", { class: "panel-head" }, h("h2", { text: "Scenario's" }), h("span", { class: "hint", text: "kansen zijn inschattingen" })));
    card.append(h("ul", { class: "scen-list" }, list.map(function (s, i) {
      var pr = clamp(Number(s.prob) || 0, 0, 100);
      return h("li", { class: "scen" + (i === 0 ? " scen-first" : "") },
        h("div", { class: "scen-top" }, h("strong", { text: s.name || "" }), h("span", { class: "scen-prob", text: pr + "%" })),
        h("div", { class: "bar", role: "img", "aria-label": "Kans " + pr + " procent" }, h("i", { style: "width:" + pr + "%" })),
        s.horizon ? h("span", { class: "scen-h", text: s.horizon }) : null,
        h("details", { class: "more" }, h("summary", { text: "Wat gebeurt er en wat doe je" }),
          s.desc ? h("p", { text: s.desc }) : null,
          (s.actions || []).length ? h("ul", { class: "bullets" }, s.actions.map(function (a) { return h("li", { text: a }); })) : null));
    })));
    return card;
  }
  function hpRules(plan) {
    var rules = ((plan.simple || {}).rules || []);
    if (!rules.length) return null;
    return h("section", { class: "panel hp-rules" }, h("div", { class: "panel-head" }, h("h2", { text: "Spelregels" })),
      h("ol", { class: "rules-list" }, rules.map(function (r) { return h("li", { text: r }); })));
  }
  function mktTile(it) {
    return h("div", { class: "mkt" },
      h("span", { class: "mkt-label", text: it.label || it.key }),
      h("strong", { class: "mkt-val", text: fmtItem(it, it.value) }),
      it.change ? h("span", { class: "mkt-chg", text: it.change }) : null,
      h("span", { class: "mkt-asof", text: [it.asOf, it.src].filter(Boolean).join(" · ") }));
  }
  function hpMarket(markt, items) {
    if (!markt || !(markt.items || []).length) return null;
    var top = MKT_KEYS.map(function (k) { return items[k]; }).filter(Boolean);
    var card = h("section", { class: "panel hp-market" },
      h("div", { class: "panel-head" }, h("h2", { text: "Markt" }),
        h("span", { class: "hint", text: markt.updatedAt ? "bijgewerkt " + fmtStamp(markt.updatedAt) + (markt.updatedBy ? " · " + markt.updatedBy : "") : "" })));
    if (markt.note) card.append(h("p", { class: "hint", style: "margin:-6px 0 12px", text: markt.note }));
    card.append(h("div", { class: "mkt-grid" }, top.map(mktTile)));
    var groups = {}, order = [];
    markt.items.forEach(function (it) { var g = it.group || "Overig"; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(it); });
    card.append(h("details", { class: "more" }, h("summary", { text: "Alle cijfers (" + markt.items.length + ")" }),
      h("div", { class: "tbl-wrap" }, h("table", { class: "mkt-table" },
        h("thead", null, h("tr", null, h("th", { text: "Cijfer" }), h("th", { text: "Waarde" }), h("th", { text: "Toelichting" }), h("th", { text: "Stand" }))),
        h("tbody", null, order.map(function (g) {
          return [h("tr", { class: "grp" }, h("th", { colspan: "4", text: g }))].concat(groups[g].map(function (it) {
            return h("tr", null, h("td", { text: it.label || it.key }), h("td", { class: "n", text: fmtItem(it, it.value) }), h("td", { text: it.change || "" }), h("td", { text: it.asOf || "" }));
          }));
        }))))));
    return card;
  }
  function renderHp() {
    var box = $("#hp"); if (!box) return;
    box.replaceChildren();
    var d = hpData(), cfg = S.hpCfg || {};
    if (!S.loaded.handelsplan) { box.append(emptyBox(S.status === "error" ? "Je gegevens konden niet worden geladen." : "Handelsplan laden…")); return; }
    if (!d.plan) { box.append(hpConnectCard(cfg, d.status || {})); return; }
    var plan = d.plan, items = hpItems();
    box.append(hpStatusRow(plan, d.status || {}, cfg), hpRegime(plan));
    box.append(h("div", { class: "hp-grid" },
      h("div", { class: "hp-col" }, hpDo(plan, items), hpSignals(plan, items)),
      h("div", { class: "hp-col" }, hpCalendar(plan), hpScenarios(plan), hpRules(plan))));
    var mk = hpMarket(d.markt, items); if (mk) box.append(mk);
    if (plan.meta && plan.meta.disclaimer) box.append(h("p", { class: "hp-disclaimer", text: plan.meta.disclaimer }));
  }
  function renderOvHp() {
    var box = $("#ov-hp"); if (!box) return;
    box.replaceChildren();
    var d = hpData(), cfg = S.hpCfg || {};
    var plan = d.plan, mac = (plan && plan.macro) || {}, risk = plan ? (mac.riskMode || (plan.regime || {}).riskLevel || "") : "";
    box.append(h("div", { class: "panel-head" }, h("h2", { text: "Handelsplan" }), risk ? pill(riskTone(risk), risk) : null));
    if (!S.loaded.handelsplan) { box.append(h("p", { class: "hint", text: "Laden…" })); return; }
    if (!plan) {
      var fout = cfg.gekoppeld && d.status && d.status.fout;
      box.append(h("p", { class: "hint", text: fout ? "Ophalen lukt nog niet. Bij Beleggen zie je wat er mis is." : cfg.gekoppeld ? "Je plan wordt opgehaald." : "Nog niet gekoppeld. De stappen staan bij Beleggen." }),
        h("a", { class: "link-btn", href: "#investeren", text: "Naar Beleggen" }));
      return;
    }
    var items = hpItems(), simple = plan.simple || {};
    if (mac.regime) box.append(h("span", { class: "eyebrow", text: mac.regime }));
    if (simple.headline || mac.headline) box.append(h("p", { class: "hp-mini-head", text: simple.headline || mac.headline }));
    var flags = [];
    (plan.positions || []).forEach(function (p) {
      (p.checks || []).forEach(function (c) {
        var s = checkState(c, items);
        if (s.st === "geraakt" || s.st === "dichtbij") flags.push({ rank: s.st === "geraakt" ? 0 : 1, tone: s.st === "geraakt" ? (c.tone === "bad" ? "crit" : c.tone || "warn") : "warn", text: (p.short || p.name) + ": " + (c.label || ""), side: CHECK_LABEL[s.st] });
      });
    });
    (plan.triggers || []).forEach(function (t) {
      var s = trigState(t, items);
      if (s.st === "alarm") flags.push({ rank: 2, tone: "crit", text: t.label + " " + fmtUnit(s.v, t.unit, s.it), side: "Alarm" });
    });
    flags.sort(function (a, b) { return a.rank - b.rank; });
    if (flags.length) box.append(h("ul", { class: "mini-flags" }, flags.slice(0, 4).map(function (f) {
      return h("li", { class: "mini-flag tone-" + f.tone }, h("span", { class: "check-dot", "aria-hidden": "true" }), h("span", { text: f.text }), h("span", { class: "mini-side", text: f.side }));
    })));
    var next = upcoming(plan, 1)[0];
    if (next) box.append(h("p", { class: "mini-next" }, h("span", { class: "label", text: "Volgende moment" }), h("span", { text: DAYS_SHORT[next.d.getDay()] + " " + next.d.getDate() + " " + MONTHS[next.d.getMonth()] + " · " + next.event })));
    box.append(h("a", { class: "link-btn", href: "#investeren", text: "Naar je plan" }));
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
  function actTipRows(p, unit, label) {
    var rows = [h("div", { class: "tip-h", text: (label ? cut(label, 40) + " · " : "") + "week " + isoWeek(p.mon).week + " · " + rangeLabel(p.mon) })];
    if (p.v == null) { rows.push(h("div", { text: p.state === "pre" ? "Voor je eerste week in Koersplan" : p.state === "current" ? "Nog niets ingevuld" : "Niet ingevuld" })); return rows; }
    var lopend = p.state === "current" ? ", lopend" : "";
    if (unit) {
      rows.push(tipRow("kb", "var(--s1)", fmtAmount(p.v) + " " + unit, "totaal" + lopend));
      if (p.gedaan != null) rows.push(h("div", { class: "tip-sub", text: p.gedaan + "× gedaan" + (p.target ? ", plan " + p.target + "×" : "") }));
    } else {
      rows.push(tipRow("kb", "var(--s1)", p.v + "×", "gedaan" + lopend));
      if (p.target) rows.push(tipRow("k", "var(--ink)", p.target + "×", "plan"));
      if (p.target && p.v > p.target) rows.push(h("div", { class: "tip-sub", text: "+" + (p.v - p.target) + " extra boven je plan" }));
    }
    return rows;
  }
  function bindTip(el, rowsFn) {
    function show(ev) { showTip(ev.clientX, ev.clientY, rowsFn()); }
    el.addEventListener("pointerenter", show);
    el.addEventListener("pointermove", show);
    el.addEventListener("pointerleave", hideTip);
    el.addEventListener("focus", function () { var rc = el.getBoundingClientRect(); showTip(rc.left + rc.width / 2, rc.bottom, rowsFn()); });
    el.addEventListener("blur", hideTip);
  }
  function seriesLabel(ser, unit) {
    var vals = ser.filter(function (p) { return p.state !== "pre"; }).map(function (p) { return p.v == null ? "niet ingevuld" : fmtAmount(p.v) + (unit ? " " + unit : "×"); });
    var last = vals.pop();
    return "Laatste weken: " + (vals.length ? vals.join(", ") + "; " : "") + "deze week " + last;
  }
  // Kleine kolommengrafiek per actie: elke staaf is een week, het streepje je plan voor die week.
  function sparkSvg(ser, unit, label) {
    var n = ser.length, bw = 7, gap = 3, H = 28, top = 3, W = n * (bw + gap) - gap;
    var max = 0;
    ser.forEach(function (p) { if (p.v != null) max = Math.max(max, p.v); if (!unit && p.target) max = Math.max(max, p.target); });
    if (max <= 0) max = 1;
    function y(v) { return H - (H - top) * v / max; }
    var svg = sv("svg", { class: "spark", viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": label + ". " + seriesLabel(ser, unit) });
    ser.forEach(function (p, i) {
      var x = i * (bw + gap);
      if (p.v == null) { if (p.state === "past") svg.append(sv("rect", { x: x, y: H - 2, width: bw, height: 2, rx: 1, class: "sp-none" })); }
      else if (p.v <= 0) svg.append(sv("rect", { x: x, y: H - 1.5, width: bw, height: 1.5, class: "sp-bar" + (p.state === "current" ? " cur" : "") }));
      else svg.append(sv("path", { d: topRounded(x, y(p.v), bw, H - y(p.v), 2), class: "sp-bar" + (p.state === "current" ? " cur" : "") }));
      if (!unit && p.target && p.v != null) svg.append(sv("line", { x1: x - 1, x2: x + bw + 1, y1: y(p.target), y2: y(p.target), class: "sp-tgt" }));
      var hit = sv("rect", { x: x - gap / 2, y: 0, width: bw + gap, height: H, fill: "transparent" });
      bindTip(hit, function () { return actTipRows(p, unit, label); });
      svg.append(hit);
    });
    return svg;
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
      var ser = goalSeries(g, 9), ex = 0;
      ser.slice(-5, -1).forEach(function (p) { if (p.v != null && p.target) ex += Math.max(0, p.v - p.target); });
      pg.append(h("div", { class: "pg-row" },
        h("span", { class: "pg-name", text: g.titel || "Doel" }),
        h("div", { class: "alloc-track", "aria-hidden": "true" }, a != null ? h("i", { style: "width:" + Math.max(0.6, a).toFixed(1) + "%" }) : null),
        h("span", { class: "alloc-val", text: pct(a) }),
        h("span", { class: "pg-trend" }, trendChip(trendOf(ser, { plan: (g.acties || []).reduce(function (t, a) { return t + (Number(a && a.perWeek) || 0); }, 0) })), ex ? h("span", { class: "xtra", title: "Extra keren boven je plan in de laatste 4 afgeronde weken", text: "+" + ex + " extra" }) : null)));
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
    renderOvKoers();
    renderOvHp();
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
    if (v === "doelen") { renderKoers(); drawObCharts(); }
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
    S.db.collection("handelsplan").onSnapshot(function (snap) { mergeDocs("handelsplan", snap, S.hp); S.loaded.handelsplan = true; renderHp(); renderOvHp(); }, err);
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
    $("#max-input").addEventListener("change", function (e) { var v = Math.round(Number(e.target.value)); savePlan({ maxPositie: isFinite(v) && v > 0 && v <= 100 ? v : null }); });
    $("#mlog-form").addEventListener("submit", function (e) {
      e.preventDefault(); var ta = $("#mlog-text"), t = ta.value.trim(); if (!t) { ta.focus(); return; }
      addNote(t, "markt", null); ta.value = "";
    });
    $("#inv-spar").addEventListener("click", function () { sparAbout("Kijk naar mijn handelsplan en mijn eigen portfolio. Past mijn verdeling bij wat mijn plan zegt, en waar handel ik niet volgens mijn eigen spelregels? "); });
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
      clearTimeout(rt); rt = setTimeout(function () { if (S.view === "jaar") renderYearChart(yearSeries()); if (S.view === "investeren") renderHistChart(); if (S.view === "doelen") { renderKoers(); drawObCharts(); } }, 150);
    });
    window.addEventListener("scroll", hideTip, { passive: true });
  }

  /* ================= Verbinding met de server ================= */
  var COLLS = ["doelen", "weken", "notities", "invest", "instellingen", "handelsplan"];
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
      S.hpCfg = cfg.handelsplan || {};
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
