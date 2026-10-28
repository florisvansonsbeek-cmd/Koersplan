"use strict";

/*
 * Koersplan: een persoonlijk dashboard met een wachtwoord, opgeslagen in Postgres.
 *
 * Instellingen via omgevingsvariabelen (in Railway: service → Variables):
 *   APP_PASSWORD       verplicht: het wachtwoord waarmee je inlogt
 *   DATABASE_URL       verplicht: verbinding met Postgres, in Railway ${{Postgres.DATABASE_URL}}
 *   ANTHROPIC_API_KEY  optioneel: zet het sparren met Claude aan
 *   ANTHROPIC_MODEL    optioneel: standaard claude-sonnet-5-5
 *   SESSION_SECRET     optioneel: anders maakt de app zelf een geheim aan in de database
 *   PGSSL              optioneel: "true" als je database SSL vereist
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT) || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const DATABASE_URL = process.env.DATABASE_URL || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const ANTHROPIC_BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");
const PUBLIC_DIR = path.join(__dirname, "public");
const SEED_FILE = path.join(__dirname, "seed", "startdata.json");

const COLLECTIONS = ["doelen", "weken", "notities", "invest", "instellingen"];
const ID_RE = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const COOKIE = "koersplan_sessie";
const SESSION_DAYS = 30;
const MAX_BODY = 512 * 1024;

let pool = null;
let dbReady = false;
let dbError = "";
let dbInit = null;
let sessionKey = null;

function log(...args) { console.log(new Date().toISOString(), ...args); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* ---------------- Database ---------------- */

async function migrate() {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const t of COLLECTIONS) {
      await c.query(
        `CREATE TABLE IF NOT EXISTS ${t} (
           id text PRIMARY KEY,
           data jsonb NOT NULL,
           bijgewerkt timestamptz NOT NULL DEFAULT now()
         )`
      );
    }
    await c.query("CREATE TABLE IF NOT EXISTS app_meta (sleutel text PRIMARY KEY, waarde text NOT NULL)");
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

async function loadSessionKey() {
  let secret = process.env.SESSION_SECRET || "";
  if (!secret) {
    const fresh = crypto.randomBytes(32).toString("hex");
    await pool.query("INSERT INTO app_meta (sleutel, waarde) VALUES ('sessie_geheim', $1) ON CONFLICT (sleutel) DO NOTHING", [fresh]);
    const r = await pool.query("SELECT waarde FROM app_meta WHERE sleutel = 'sessie_geheim'");
    secret = r.rows[0].waarde;
  }
  // Het wachtwoord zit in de sleutel: wijzig je APP_PASSWORD, dan zijn alle oude sessies ongeldig.
  sessionKey = crypto.createHash("sha256").update(secret + "\u0000" + APP_PASSWORD).digest();
}

async function seedIfNeeded() {
  const done = await pool.query("SELECT 1 FROM app_meta WHERE sleutel = 'startdata_geladen'");
  if (done.rowCount) return;
  let seed = {};
  try {
    seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  } catch (e) {
    log("Geen startdata ingelezen:", e.message);
  }
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    let n = 0;
    for (const [key, data] of Object.entries(seed)) {
      const [coll, id] = key.split("/");
      if (!COLLECTIONS.includes(coll) || !ID_RE.test(id || "") || !data || typeof data !== "object" || Array.isArray(data)) continue;
      const r = await c.query(`INSERT INTO ${coll} (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING`, [id, JSON.stringify(data)]);
      n += r.rowCount;
    }
    await c.query("INSERT INTO app_meta (sleutel, waarde) VALUES ('startdata_geladen', $1) ON CONFLICT (sleutel) DO NOTHING", [new Date().toISOString()]);
    await c.query("COMMIT");
    log(`Startdata geladen: ${n} documenten`);
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

function initDb() {
  if (dbReady) return Promise.resolve();
  if (dbInit) return dbInit;
  dbInit = (async () => {
    if (!DATABASE_URL) {
      if (!dbError) log("DATABASE_URL ontbreekt. Koppel in Railway een Postgres-database aan deze service.");
      dbError = "DATABASE_URL ontbreekt";
      return;
    }
    if (!pool) {
      const ssl = /^(1|true|require)$/i.test(process.env.PGSSL || "") ? { rejectUnauthorized: false } : undefined;
      pool = new Pool({ connectionString: DATABASE_URL, ssl, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
      pool.on("error", (e) => log("Postgres-fout:", e.message));
    }
    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        await migrate();
        await loadSessionKey();
        await seedIfNeeded();
        dbReady = true;
        dbError = "";
        log("Database klaar");
        return;
      } catch (e) {
        dbError = e.message;
        log(`Database nog niet bereikbaar (poging ${attempt}): ${e.message}`);
        await sleep(Math.min(20000, 1000 * 2 ** attempt));
      }
    }
    log("Database niet bereikbaar. De app probeert het opnieuw bij de volgende aanvraag.");
  })().finally(() => { dbInit = null; });
  return dbInit;
}

/* ---------------- Sessies en wachtwoord ---------------- */

function sign(payload) {
  return crypto.createHmac("sha256", sessionKey).update(payload).digest("base64url");
}
function makeSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 864e5, n: crypto.randomBytes(8).toString("hex") })).toString("base64url");
  return payload + "." + sign(payload);
}
function validSession(token) {
  if (!token || !sessionKey || !APP_PASSWORD) return false;
  const i = token.lastIndexOf(".");
  if (i < 1) return false;
  const payload = token.slice(0, i);
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(token.slice(i + 1));
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return false;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof p.exp === "number" && p.exp > Date.now();
  } catch {
    return false;
  }
}
function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 1) continue;
    try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ongeldige cookie overslaan */ }
  }
  return out;
}
function isAuthed(req) { return validSession(parseCookies(req)[COOKIE]); }
function isHttps(req) { return String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https"; }
function sessionCookie(req, value, maxAgeSeconds) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}` + (isHttps(req) ? "; Secure" : "");
}
function passwordOk(input) {
  if (!APP_PASSWORD) return false;
  const a = crypto.createHash("sha256").update(String(input || "")).digest();
  const b = crypto.createHash("sha256").update(APP_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

const attempts = new Map();
function clientIp(req) { return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?").split(",")[0].trim(); }
function blocked(ip) {
  const a = attempts.get(ip);
  return !!a && a.reset > Date.now() && a.n >= 8;
}
function noteFailure(ip) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || a.reset < now) attempts.set(ip, { n: 1, reset: now + 15 * 60e3 });
  else a.n++;
  if (attempts.size > 5000) attempts.clear();
}

/* ---------------- HTTP-hulpjes ---------------- */

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join("; ");

function headers(req, extra) {
  const h = {
    "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
  };
  if (isHttps(req)) h["Strict-Transport-Security"] = "max-age=31536000";
  return Object.assign(h, extra || {});
}
function send(req, res, status, body, type, extra) {
  res.writeHead(status, headers(req, Object.assign({ "Content-Type": type || "text/plain; charset=utf-8" }, extra)));
  res.end(body);
}
function sendJson(req, res, status, obj, extra) {
  send(req, res, status, JSON.stringify(obj), "application/json; charset=utf-8", extra);
}
function redirect(req, res, to, extra) {
  res.writeHead(303, headers(req, Object.assign({ Location: to }, extra)));
  res.end();
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error("Verzoek te groot"), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
async function readJson(req, limit) {
  const text = await readBody(req, limit || MAX_BODY);
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw Object.assign(new Error("Ongeldige JSON"), { status: 400 }); }
}

const STATIC = {
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/app.css": ["app.css", "text/css; charset=utf-8"],
  "/favicon.svg": ["favicon.svg", "image/svg+xml"],
};
function serveFile(req, res, file, type) {
  fs.readFile(path.join(PUBLIC_DIR, file), (err, buf) => {
    if (err) return send(req, res, 404, "Niet gevonden");
    send(req, res, 200, buf, type, { "Cache-Control": "no-cache" });
  });
}

/* ---------------- Inlogpagina ---------------- */

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function loginPage(message, disabled) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Inloggen · Koersplan</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>
:root { --paper:#f3f5f6; --sheet:#fff; --ink:#15212b; --ink-2:#475563; --ink-3:#5f6b77; --rule:#d7dee3; --ruler:#f4c20d; --down:#b42323; --accent:#1d5aa6; }
@media (prefers-color-scheme: dark) { :root { --paper:#0e1419; --sheet:#151d24; --ink:#e6ecf0; --ink-2:#a9b5bf; --ink-3:#8794a0; --rule:#27333d; --ruler:#e6b80e; --down:#ef7a7a; --accent:#72a8ec; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--paper); color: var(--ink);
  font: 15px/1.5 "Archivo", "Helvetica Neue", Arial, sans-serif; padding: 24px max(16px, env(safe-area-inset-left)); }
main { width: 100%; max-width: 380px; background: var(--sheet); border: 1px solid var(--rule); border-radius: 4px; padding: 28px 24px; }
.brand { font-stretch: 72%; font-weight: 850; font-size: 30px; letter-spacing: .03em; text-transform: uppercase; line-height: 1; margin: 0; }
.bar { height: 8px; margin: 14px 0 22px; border-radius: 2px; background: repeating-linear-gradient(90deg, rgba(0,0,0,.35) 0 1px, transparent 1px 10%), var(--ruler); }
label { display: block; font: 600 11px/1.2 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 6px; }
input { width: 100%; font: inherit; font-size: 16px; padding: 11px 12px; border: 1px solid var(--rule); border-radius: 4px; background: var(--sheet); color: var(--ink); }
input:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
button { margin-top: 14px; width: 100%; font-family: inherit; font-weight: 650; font-size: 15px; line-height: 1; padding: 12px; border: 1px solid var(--ink); border-radius: 4px; background: var(--ink); color: var(--paper); cursor: pointer; }
button:disabled { opacity: .45; cursor: default; }
.msg { margin: 0 0 14px; color: var(--down); font-size: 14px; }
.note { margin: 16px 0 0; color: var(--ink-2); font-size: 13px; }
</style>
</head>
<body>
<main>
  <h1 class="brand">Koersplan</h1>
  <div class="bar" aria-hidden="true"></div>
  ${message ? `<p class="msg" role="alert">${esc(message)}</p>` : ""}
  <form method="post" action="/login">
    <label for="wachtwoord">Wachtwoord</label>
    <input id="wachtwoord" name="wachtwoord" type="password" autocomplete="current-password" required ${disabled ? "disabled" : "autofocus"}>
    <button type="submit" ${disabled ? "disabled" : ""}>Inloggen</button>
  </form>
  <p class="note">Je blijft 30 dagen ingelogd op dit apparaat.</p>
</main>
</body>
</html>`;
}
function loginState(query) {
  if (!APP_PASSWORD) return ["Er is nog geen wachtwoord ingesteld. Zet APP_PASSWORD bij Variables van deze service in Railway.", true];
  if (!DATABASE_URL) return ["Er is nog geen database gekoppeld. Zet DATABASE_URL bij Variables in Railway.", true];
  if (query.get("fout") === "1") return ["Dat wachtwoord klopt niet.", false];
  if (query.get("fout") === "2") return ["Te veel pogingen. Probeer het over een kwartier opnieuw.", false];
  if (query.get("fout") === "3") return ["De database is nog niet bereikbaar. Probeer het zo opnieuw.", false];
  return ["", false];
}

/* ---------------- Sparren met Claude ---------------- */

const SPAR_TOOLS = [
  {
    name: "doel_wijzigen",
    description: "Stel voor om één veld van een bestaand doel te wijzigen: titel, waarom, resultaat of deadline (JJJJ-MM-DD, leeg voor geen). De gebruiker ziet het voorstel en beslist zelf.",
    input_schema: {
      type: "object",
      properties: {
        doel_id: { type: "string" },
        veld: { type: "string", enum: ["titel", "waarom", "resultaat", "deadline"] },
        nieuwe_waarde: { type: "string" },
        reden: { type: "string", description: "Eén korte zin waarom." },
      },
      required: ["doel_id", "veld", "nieuwe_waarde"],
    },
  },
  {
    name: "actie_wijzigen",
    description: "Stel voor om een wekelijkse actie van een doel toe te voegen (laat actie_id weg), aan te passen (met actie_id) of te verwijderen (per_week 0). per_week is hoe vaak per week, 0 tot 14. De gebruiker beslist zelf.",
    input_schema: {
      type: "object",
      properties: {
        doel_id: { type: "string" },
        actie_id: { type: "string" },
        tekst: { type: "string" },
        per_week: { type: "integer", minimum: 0, maximum: 14 },
        reden: { type: "string" },
      },
      required: ["doel_id", "per_week"],
    },
  },
  {
    name: "doel_toevoegen",
    description: "Stel een nieuw doel voor met titel, categorie, waarom, meetbaar resultaat en wekelijkse acties. Alleen als het echt ontbreekt. De gebruiker beslist zelf.",
    input_schema: {
      type: "object",
      properties: {
        titel: { type: "string" },
        categorie: { type: "string" },
        waarom: { type: "string" },
        resultaat: { type: "string" },
        acties: {
          type: "array",
          items: {
            type: "object",
            properties: { tekst: { type: "string" }, per_week: { type: "integer", minimum: 1, maximum: 14 } },
            required: ["tekst", "per_week"],
          },
        },
        reden: { type: "string" },
      },
      required: ["titel"],
    },
  },
  {
    name: "logboek_notitie",
    description: "Stel voor om een kort inzicht, besluit of afspraak uit dit gesprek vast te leggen in het logboek, eventueel bij een doel. De gebruiker beslist zelf.",
    input_schema: {
      type: "object",
      properties: { tekst: { type: "string" }, doel_id: { type: "string" } },
      required: ["tekst"],
    },
  },
];

const sparCalls = [];
function sparLimited() {
  const now = Date.now();
  while (sparCalls.length && sparCalls[0] < now - 3600e3) sparCalls.shift();
  if (sparCalls.length >= 40) return true;
  sparCalls.push(now);
  return false;
}

function cleanMessages(list) {
  const out = [];
  for (const m of Array.isArray(list) ? list : []) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    const content = String(m.content || "").trim().slice(0, 8000);
    if (!content) continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) prev.content += "\n\n" + content;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  while (out.length && out[out.length - 1].role !== "user") out.pop();
  return out.slice(-16).filter((m, i, arr) => i > 0 || m.role === "user");
}

async function callClaude(system, messages) {
  const r = await fetch(ANTHROPIC_BASE_URL + "/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1500, system, messages, tools: SPAR_TOOLS }),
    signal: AbortSignal.timeout(120000),
  });
  const text = await r.text();
  let j = null;
  try { j = JSON.parse(text); } catch { /* geen JSON */ }
  if (!r.ok) {
    const err = new Error((j && j.error && j.error.message) || `HTTP ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return j;
}

async function spar(req, res) {
  if (!ANTHROPIC_API_KEY) return sendJson(req, res, 503, { error: "geen_sleutel", message: "Zet ANTHROPIC_API_KEY in Railway om te sparren." });
  if (sparLimited()) return sendJson(req, res, 429, { error: "te_vaak", message: "Te veel vragen dit uur." });
  const body = await readJson(req, MAX_BODY);
  const system = String(body.system || "").slice(0, 60000);
  let messages = cleanMessages(body.messages);
  if (!messages.length) return sendJson(req, res, 400, { error: "leeg", message: "Geen vraag ontvangen." });
  const texts = [];
  const toolCalls = [];
  try {
    for (let round = 0; round < 4; round++) {
      const j = await callClaude(system, messages);
      const content = Array.isArray(j.content) ? j.content : [];
      for (const b of content) if (b.type === "text" && b.text) texts.push(b.text);
      const uses = content.filter((b) => b.type === "tool_use");
      for (const u of uses) toolCalls.push({ name: u.name, input: u.input || {} });
      if (j.stop_reason !== "tool_use" || !uses.length) break;
      messages = messages.concat([
        { role: "assistant", content },
        { role: "user", content: uses.map((u) => ({ type: "tool_result", tool_use_id: u.id, content: "Voorstel getoond. De gebruiker beslist zelf of hij het toepast." })) },
      ]);
    }
  } catch (e) {
    log("Fout bij Claude:", e.status || "", e.message);
    const code = e.status === 401 || e.status === 403 ? "sleutel" : e.status === 429 ? "limiet" : e.status === 529 || e.status === 503 ? "druk" : e.status === 400 || e.status === 404 ? "verzoek" : "fout";
    return sendJson(req, res, 502, { error: code, message: e.message });
  }
  sendJson(req, res, 200, { text: texts.join("\n\n").trim(), toolCalls: toolCalls.slice(0, 4) });
}

/* ---------------- API ---------------- */

async function readAll() {
  const out = {};
  for (const t of COLLECTIONS) {
    const r = await pool.query(`SELECT id, data, bijgewerkt FROM ${t} ORDER BY id`);
    out[t] = r.rows.map((row) => ({ id: row.id, data: row.data, bijgewerkt: row.bijgewerkt }));
  }
  return out;
}

async function api(req, res, url) {
  if (!isAuthed(req)) return sendJson(req, res, 401, { error: "auth", message: "Niet ingelogd" });
  const method = req.method;
  // Tegen cross-site verzoeken: wijzigingen vereisen deze header, die een andere site niet kan meesturen.
  if (method !== "GET" && req.headers["x-koersplan"] !== "1") return sendJson(req, res, 403, { error: "csrf", message: "Ontbrekende header" });
  const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]

  if (parts[1] === "config" && method === "GET") {
    return sendJson(req, res, 200, { spar: !!ANTHROPIC_API_KEY, model: ANTHROPIC_MODEL, db: dbReady });
  }
  if (parts[1] === "spar" && method === "POST") return spar(req, res);

  if (!dbReady) {
    initDb();
    return sendJson(req, res, 503, { error: "db", message: "Database niet bereikbaar: " + (dbError || "bezig met verbinden") });
  }

  if (parts[1] === "data" && parts.length === 2 && method === "GET") {
    return sendJson(req, res, 200, await readAll());
  }
  if (parts[1] === "export" && method === "GET") {
    const all = await readAll();
    const stamp = new Date().toISOString().slice(0, 10);
    return send(req, res, 200, JSON.stringify({ app: "koersplan", gemaakt: new Date().toISOString(), data: all }, null, 2), "application/json; charset=utf-8", {
      "Content-Disposition": `attachment; filename="koersplan-backup-${stamp}.json"`,
    });
  }
  if (parts[1] === "data" && parts.length === 4) {
    const coll = parts[2];
    let id = "";
    try { id = decodeURIComponent(parts[3]); } catch { id = ""; }
    if (!COLLECTIONS.includes(coll) || !ID_RE.test(id)) return sendJson(req, res, 400, { error: "pad", message: "Onbekende verzameling of ongeldig id" });
    if (method === "PUT") {
      const body = await readJson(req, 256 * 1024);
      if (!body || typeof body !== "object" || Array.isArray(body)) return sendJson(req, res, 400, { error: "body", message: "Verwacht een JSON-object" });
      await pool.query(
        `INSERT INTO ${coll} (id, data, bijgewerkt) VALUES ($1, $2::jsonb, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, bijgewerkt = now()`,
        [id, JSON.stringify(body)]
      );
      return sendJson(req, res, 200, { ok: true });
    }
    if (method === "DELETE") {
      await pool.query(`DELETE FROM ${coll} WHERE id = $1`, [id]);
      return sendJson(req, res, 200, { ok: true });
    }
  }
  return sendJson(req, res, 404, { error: "onbekend", message: "Onbekende route" });
}

/* ---------------- Router ---------------- */

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;

  if (p === "/healthz") return sendJson(req, res, 200, { ok: true, db: dbReady });

  if (p.startsWith("/api/")) return api(req, res, url);

  if (STATIC[p] && req.method === "GET") return serveFile(req, res, STATIC[p][0], STATIC[p][1]);

  if (p === "/login" && req.method === "GET") {
    if (isAuthed(req)) return redirect(req, res, "/");
    const [msg, disabled] = loginState(url.searchParams);
    return send(req, res, 200, loginPage(msg, disabled), "text/html; charset=utf-8");
  }

  if (p === "/login" && req.method === "POST") {
    const ip = clientIp(req);
    if (blocked(ip)) return redirect(req, res, "/login?fout=2");
    const form = new URLSearchParams(await readBody(req, 4096));
    if (!passwordOk(form.get("wachtwoord"))) {
      noteFailure(ip);
      await sleep(600);
      return redirect(req, res, "/login?fout=1");
    }
    attempts.delete(ip);
    if (!sessionKey) {
      initDb();
      return redirect(req, res, "/login?fout=3");
    }
    return redirect(req, res, "/", { "Set-Cookie": sessionCookie(req, makeSession(), SESSION_DAYS * 86400) });
  }

  if (p === "/logout" && req.method === "POST") {
    return redirect(req, res, "/login", { "Set-Cookie": sessionCookie(req, "", 0) });
  }

  if (p === "/" && req.method === "GET") {
    if (!isAuthed(req)) return redirect(req, res, "/login");
    return serveFile(req, res, "index.html", "text/html; charset=utf-8");
  }

  return send(req, res, 404, "Niet gevonden");
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    log("Fout:", e.message);
    if (!res.headersSent) sendJson(req, res, e.status || 500, { error: "server", message: e.status ? e.message : "Er ging iets mis op de server." });
    else res.end();
  });
});

server.listen(PORT, () => {
  log(`Koersplan luistert op poort ${PORT}`);
  if (!APP_PASSWORD) log("Let op: APP_PASSWORD is niet ingesteld. Inloggen kan pas als je die in Railway zet.");
  if (!ANTHROPIC_API_KEY) log("ANTHROPIC_API_KEY niet ingesteld: sparren met Claude staat uit.");
  initDb();
});

function shutdown() {
  log("Afsluiten…");
  server.close(() => { if (pool) pool.end().finally(() => process.exit(0)); else process.exit(0); });
  setTimeout(() => process.exit(0), 8000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
