require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.json());

// ================= ENV =================
const BOT_TOKEN = (process.env.BOT_TOKEN || "").trim();
const USE_WEBHOOK = (process.env.USE_WEBHOOK || "").trim() === "1";

const BASE_URL = (
  (process.env.BASE_URL && process.env.BASE_URL.trim()) ||
  (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.trim()) ||
  ""
).replace(/\/$/, "");

// Admin (recomendado por ENV, mas você pediu senha fixa)
const ADMIN_USER = (process.env.ADMIN_USER || "admin").trim();
const ADMIN_PASS = (process.env.ADMIN_PASS || "Valdenir1994#").trim();

if (!BOT_TOKEN) console.error("❌ BOT_TOKEN vazio");
if (!BASE_URL) console.error("❌ BASE_URL vazio");

// ================= BOT =================
const bot = new TelegramBot(
  BOT_TOKEN,
  USE_WEBHOOK ? { webHook: true } : { polling: true }
);

process.on("unhandledRejection", (err) => console.error("UnhandledRejection:", err));

function isAbsoluteHttpUrl(u) {
  return /^https?:\/\/[^/]+/i.test(u);
}

// ================= DATABASE =================
const db = new sqlite3.Database("./database.db");

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function ensureColumn(table, col, typeSql) {
  const cols = await dbAll(`PRAGMA table_info(${table})`);
  const exists = cols.some((c) => c.name === col);
  if (!exists) await dbRun(`ALTER TABLE ${table} ADD COLUMN ${col} ${typeSql}`);
}

function todayKeyUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

// ================= MIGRATE =================
async function migrate() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      tg_id TEXT PRIMARY KEY,
      points INTEGER DEFAULT 0,
      referral_code TEXT UNIQUE,
      referrer_tg_id TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE,
      name TEXT,
      price_ton REAL DEFAULT 0,
      points_per_day INTEGER DEFAULT 0,
      ad_boost_pct INTEGER DEFAULT 0,
      max_ads_per_day INTEGER DEFAULT 10,
      active INTEGER DEFAULT 1
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT,
      item_id INTEGER,
      quantity INTEGER DEFAULT 1,
      expires_at TEXT DEFAULT NULL,
      UNIQUE(tg_id, item_id)
    )
  `);

  // Anúncios: 1 ponto pro user + 1 pro pool por view
  await dbRun(`
    CREATE TABLE IF NOT EXISTS ad_sessions (
      nonce TEXT PRIMARY KEY,
      tg_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      opened INTEGER DEFAULT 0,
      opened_at TEXT DEFAULT NULL,
      claimed INTEGER DEFAULT 0,
      claimed_at TEXT DEFAULT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS ad_participation (
      day_key TEXT NOT NULL,
      tg_id TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      PRIMARY KEY(day_key, tg_id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS pool_days (
      day_key TEXT PRIMARY KEY,
      pool_points INTEGER DEFAULT 0,
      distributed INTEGER DEFAULT 0,
      distributed_at TEXT DEFAULT NULL
    )
  `);

  // Config admin
  await dbRun(`
    CREATE TABLE IF NOT EXISTS admin_config (
      id INTEGER PRIMARY KEY CHECK (id=1),
      referrals_enabled INTEGER DEFAULT 1,
      promo_enabled INTEGER DEFAULT 1
    )
  `);
  await dbRun(`INSERT OR IGNORE INTO admin_config (id) VALUES (1)`);

  // Promo codes
  await dbRun(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      code TEXT PRIMARY KEY,
      points INTEGER NOT NULL,
      max_uses INTEGER NOT NULL,
      uses INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Promo redemptions
  await dbRun(`
    CREATE TABLE IF NOT EXISTS promo_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      tg_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(code, tg_id)
    )
  `);

  // Seed itens (mantém loja de pontos – sem TON)
  const c = await dbGet(`SELECT COUNT(*) AS c FROM items`);
  if (c?.c === 0) {
    const items = [
      ["TRIAL_MINER", "Trial Miner (Grátis 3 dias)", 0, 5, 0, 10],
      ["PACK_A", "Pack Starter", 0, 10, 0, 10],
      ["PACK_B", "Pack Growth", 0, 25, 0, 12],
      ["PACK_C", "Pack Builder", 0, 60, 0, 14],
      ["PACK_D", "Pack Pro", 0, 120, 0, 16],
      ["PACK_E", "Pack Elite", 0, 250, 0, 20],
    ];
    for (const it of items) {
      await dbRun(
        `INSERT INTO items (sku,name,price_ton,points_per_day,ad_boost_pct,max_ads_per_day) VALUES (?,?,?,?,?,?)`,
        it
      );
    }
    console.log("✅ Seed itens criado");
  }

  // colunas antigas (caso existam)
  await ensureColumn("users", "referral_code", "TEXT UNIQUE");
  await ensureColumn("users", "referrer_tg_id", "TEXT DEFAULT NULL");

  console.log("✅ Migrate OK");
}

// ================= BUSINESS =================
function genReferralCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 chars
}

async function ensureUser(tg_id) {
  const uid = String(tg_id || "");
  if (!uid) return null;

  const u = await dbGet(`SELECT tg_id FROM users WHERE tg_id=?`, [uid]);
  if (!u) {
    // cria com referral_code único
    let code = genReferralCode();
    while (await dbGet(`SELECT 1 FROM users WHERE referral_code=?`, [code])) {
      code = genReferralCode();
    }
    await dbRun(`INSERT INTO users (tg_id, referral_code) VALUES (?, ?)`, [uid, code]);

    // trial
    const trial = await dbGet(`SELECT id FROM items WHERE sku='TRIAL_MINER' LIMIT 1`);
    if (trial) {
      await dbRun(
        `INSERT INTO inventory (tg_id,item_id,quantity,expires_at)
         VALUES (?, ?, 1, datetime('now', '+3 days'))
         ON CONFLICT(tg_id, item_id) DO NOTHING`,
        [uid, trial.id]
      );
    }
  }
  return await dbGet(`SELECT * FROM users WHERE tg_id=?`, [uid]);
}

async function applyReferralIfEnabled(newUserId, referralCode) {
  const cfg = await dbGet(`SELECT referrals_enabled FROM admin_config WHERE id=1`);
  if (!cfg || Number(cfg.referrals_enabled) !== 1) return;

  const code = String(referralCode || "").trim().toUpperCase();
  if (!code) return;

  const ref = await dbGet(`SELECT tg_id FROM users WHERE referral_code=? LIMIT 1`, [code]);
  if (!ref) return;

  // não auto-refer
  if (String(ref.tg_id) === String(newUserId)) return;

  const u = await dbGet(`SELECT referrer_tg_id FROM users WHERE tg_id=?`, [newUserId]);
  if (u?.referrer_tg_id) return; // já setado

  await dbRun(`UPDATE users SET referrer_tg_id=? WHERE tg_id=?`, [ref.tg_id, newUserId]);
}

// ================= DAILY DISTRIBUTION (00:00 UTC) =================
async function distributePoolForDay(dayKey) {
  // garante registro do dia
  await dbRun(
    `INSERT OR IGNORE INTO pool_days (day_key, pool_points, distributed) VALUES (?, 0, 0)`,
    [dayKey]
  );

  const day = await dbGet(`SELECT * FROM pool_days WHERE day_key=?`, [dayKey]);
  if (!day) return;
  if (Number(day.distributed) === 1) return; // já distribuiu

  const poolPoints = Number(day.pool_points || 0);
  if (poolPoints <= 0) {
    await dbRun(`UPDATE pool_days SET distributed=1, distributed_at=datetime('now') WHERE day_key=?`, [dayKey]);
    return;
  }

  const rows = await dbAll(`SELECT tg_id, count FROM ad_participation WHERE day_key=? AND count>0`, [dayKey]);
  const totalTickets = rows.reduce((a, r) => a + Number(r.count || 0), 0);
  if (totalTickets <= 0) {
    await dbRun(`UPDATE pool_days SET distributed=1, distributed_at=datetime('now') WHERE day_key=?`, [dayKey]);
    return;
  }

  // distribuição proporcional por participação (1 anúncio = 1 ticket)
  // pontos por ticket (inteiro)
  const perTicket = Math.floor(poolPoints / totalTickets);
  let remainder = poolPoints - perTicket * totalTickets;

  for (const r of rows) {
    const t = Number(r.count || 0);
    let gain = perTicket * t;

    // distribui resto 1 por 1
    if (remainder > 0) {
      const extra = Math.min(remainder, t);
      gain += extra;
      remainder -= extra;
    }

    if (gain > 0) {
      await dbRun(`UPDATE users SET points=points + ? WHERE tg_id=?`, [gain, r.tg_id]);
    }
  }

  await dbRun(`UPDATE pool_days SET distributed=1, distributed_at=datetime('now') WHERE day_key=?`, [dayKey]);
  console.log(`✅ Pool distribuído para ${dayKey}: ${poolPoints} pts`);
}

// scheduler simples: checa a cada 30s se virou 00:00 UTC
let lastDistributedKey = null;
setInterval(async () => {
  try {
    const now = new Date();
    const hh = now.getUTCHours();
    const mm = now.getUTCMinutes();
    const key = todayKeyUTC();

    // Distribui sempre o DIA ANTERIOR ao virar 00:00
    // Ex: 00:00 do dia 2026-01-04 distribui 2026-01-03
    if (hh === 0 && mm === 0 && lastDistributedKey !== key) {
      const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
      await distributePoolForDay(yesterday);
      lastDistributedKey = key;
    }
  } catch (e) {
    console.error("distribution loop error:", e);
  }
}, 30000);

// ================= TELEGRAM /start =================
bot.onText(/\/start(?:\s+(\S+))?/, async (msg, match) => {
  const tgId = String(msg.from.id);
  const refCode = match?.[1] || "";
  await ensureUser(tgId);
  if (refCode) await applyReferralIfEnabled(tgId, refCode);

  const webAppUrl = `${BASE_URL}/webapp/index.html?tg_id=${encodeURIComponent(tgId)}`;
  if (!isAbsoluteHttpUrl(webAppUrl)) {
    bot.sendMessage(tgId, "❌ Erro: BASE_URL inválido no servidor.");
    return;
  }

  bot.sendMessage(
    tgId,
    `🎮 TON GAME (Pontos)
📺 Anúncio = +1 ponto +1 pool
🕛 00:00 UTC pool distribui por participação
🎁 Use /promo CODIGO para resgatar (se ativo)
👥 Seu referral: /start ${((await dbGet(`SELECT referral_code FROM users WHERE tg_id=?`, [tgId]))?.referral_code) || ""}

`,
    { reply_markup: { inline_keyboard: [[{ text: "▶️ Abrir Jogo", web_app: { url: webAppUrl } }]] } }
  );
});

// ================= PROMO command =================
bot.onText(/\/promo\s+(\S+)/, async (msg, match) => {
  const tgId = String(msg.from.id);
  const code = String(match?.[1] || "").trim().toUpperCase();
  await ensureUser(tgId);

  const cfg = await dbGet(`SELECT promo_enabled FROM admin_config WHERE id=1`);
  if (!cfg || Number(cfg.promo_enabled) !== 1) {
    bot.sendMessage(tgId, "❌ Promo codes estão desativados no momento.");
    return;
  }

  const promo = await dbGet(`SELECT * FROM promo_codes WHERE code=? AND active=1`, [code]);
  if (!promo) {
    bot.sendMessage(tgId, "❌ Código inválido.");
    return;
  }
  if (Number(promo.uses) >= Number(promo.max_uses)) {
    bot.sendMessage(tgId, "❌ Código esgotado.");
    return;
  }

  const already = await dbGet(`SELECT 1 FROM promo_redemptions WHERE code=? AND tg_id=?`, [code, tgId]);
  if (already) {
    bot.sendMessage(tgId, "⚠️ Você já usou esse código.");
    return;
  }

  await dbRun(`INSERT INTO promo_redemptions (code, tg_id) VALUES (?, ?)`, [code, tgId]);
  await dbRun(`UPDATE promo_codes SET uses = uses + 1 WHERE code=?`, [code]);
  await dbRun(`UPDATE users SET points = points + ? WHERE tg_id=?`, [Number(promo.points), tgId]);

  bot.sendMessage(tgId, `✅ Promo resgatado! +${promo.points} pontos`);
});

// ================= API =================
app.get("/api/me", async (req, res) => {
  try {
    const tg_id = String(req.query.tg_id || "");
    if (!tg_id) return res.status(400).json({ ok: false, error: "missing_tg_id" });

    const u = await ensureUser(tg_id);
    const inv = await dbAll(
      `SELECT i.id, i.sku, i.name, inv.quantity, inv.expires_at, i.points_per_day
       FROM inventory inv JOIN items i ON i.id=inv.item_id
       WHERE inv.tg_id=? ORDER BY i.id ASC`,
      [tg_id]
    );

    const dayKey = todayKeyUTC();
    const myTickets = await dbGet(
      `SELECT count FROM ad_participation WHERE day_key=? AND tg_id=?`,
      [dayKey, tg_id]
    );

    const dayPool = await dbGet(`SELECT pool_points, distributed FROM pool_days WHERE day_key=?`, [dayKey]);

    res.json({
      ok: true,
      user: u,
      inventory: inv,
      today: {
        day_key: dayKey,
        my_participation: Number(myTickets?.count || 0),
        pool_points_today: Number(dayPool?.pool_points || 0),
        distributed: Number(dayPool?.distributed || 0)
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: "server_error", details: String(e.message || e) });
  }
});

app.get("/api/items", async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, sku, name, price_ton, points_per_day, active
       FROM items WHERE active=1 ORDER BY id ASC`
    );
    res.json({ ok: true, items: rows });
  } catch {
    res.status(500).json({ ok: false, error: "db_error" });
  }
});

app.get("/api/pool", async (req, res) => {
  try {
    const dayKey = todayKeyUTC();
    await dbRun(`INSERT OR IGNORE INTO pool_days (day_key, pool_points, distributed) VALUES (?,0,0)`, [dayKey]);
    const day = await dbGet(`SELECT * FROM pool_days WHERE day_key=?`, [dayKey]);
    res.json({ ok: true, day });
  } catch {
    res.status(500).json({ ok: false, error: "db_error" });
  }
});

// ===== Ads flow: start/opened/claim =====
app.post("/api/ad/start", async (req, res) => {
  try {
    const tg_id = String(req.body?.tg_id || "");
    if (!tg_id) return res.status(400).json({ ok: false, error: "missing_tg_id" });

    await ensureUser(tg_id);
    const nonce = crypto.randomBytes(16).toString("hex");
    await dbRun(`INSERT INTO ad_sessions (nonce, tg_id) VALUES (?, ?)`, [nonce, tg_id]);
    res.json({ ok: true, nonce, min_watch_seconds: 20 });
  } catch (e) {
    res.status(500).json({ ok: false, error: "server_error", details: String(e.message || e) });
  }
});

app.post("/api/ad/opened", async (req, res) => {
  try {
    const tg_id = String(req.body?.tg_id || "");
    const nonce = String(req.body?.nonce || "");
    if (!tg_id || !nonce) return res.status(400).json({ ok: false, error: "missing_fields" });

    const s = await dbGet(`SELECT * FROM ad_sessions WHERE nonce=?`, [nonce]);
    if (!s) return res.json({ ok: false, error: "invalid_nonce" });
    if (String(s.tg_id) !== tg_id) return res.json({ ok: false, error: "nonce_not_owner" });
    if (Number(s.opened) === 0) {
      await dbRun(`UPDATE ad_sessions SET opened=1, opened_at=datetime('now') WHERE nonce=?`, [nonce]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: "server_error", details: String(e.message || e) });
  }
});

app.post("/api/ad/claim", async (req, res) => {
  try {
    const tg_id = String(req.body?.tg_id || "");
    const nonce = String(req.body?.nonce || "");
    if (!tg_id || !nonce) return res.status(400).json({ ok: false, error: "missing_fields" });

    const s = await dbGet(`SELECT * FROM ad_sessions WHERE nonce=?`, [nonce]);
    if (!s) return res.json({ ok: false, error: "invalid_nonce" });
    if (String(s.tg_id) !== tg_id) return res.json({ ok: false, error: "nonce_not_owner" });
    if (Number(s.claimed) === 1) return res.json({ ok: false, error: "already_claimed" });
    if (Number(s.opened) !== 1 || !s.opened_at) return res.json({ ok: false, error: "not_opened" });

    // tempo mínimo (20s)
    const openedMs = Date.parse(s.opened_at);
    const elapsed = (Date.now() - openedMs) / 1000;
    if (elapsed < 20) return res.json({ ok: false, error: "too_fast", need: 20, elapsed: Math.floor(elapsed) });

    // ✅ Recompensa fixa: +1 ponto user +1 ponto pool
    await dbRun(`UPDATE users SET points=points + 1 WHERE tg_id=?`, [tg_id]);

    const dayKey = todayKeyUTC();
    await dbRun(`INSERT OR IGNORE INTO pool_days (day_key, pool_points, distributed) VALUES (?,0,0)`, [dayKey]);
    await dbRun(`UPDATE pool_days SET pool_points = pool_points + 1 WHERE day_key=?`, [dayKey]);

    await dbRun(
      `INSERT INTO ad_participation (day_key, tg_id, count) VALUES (?, ?, 1)
       ON CONFLICT(day_key, tg_id) DO UPDATE SET count = count + 1`,
      [dayKey, tg_id]
    );

    await dbRun(`UPDATE ad_sessions SET claimed=1, claimed_at=datetime('now') WHERE nonce=?`, [nonce]);

    res.json({ ok: true, user_points_added: 1, pool_points_added: 1, day_key: dayKey });
  } catch (e) {
    res.status(500).json({ ok: false, error: "server_error", details: String(e.message || e) });
  }
});

// ================= ADMIN (BASIC AUTH) =================
function basicAuth(req, res, next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).send("Auth required");
  }
  const decoded = Buffer.from(h.slice(6), "base64").toString("utf8");
  const [u, p] = decoded.split(":");
  if (u === ADMIN_USER && p === ADMIN_PASS) return next();
  res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
  return res.status(401).send("Invalid credentials");
}

app.use("/admin", basicAuth, express.static(path.join(__dirname, "admin")));

app.get("/admin/api/users", basicAuth, async (req, res) => {
  try {
    const dayKey = todayKeyUTC();
    const rows = await dbAll(`
      SELECT u.tg_id, u.points, u.referral_code, u.referrer_tg_id,
             COALESCE(p.count,0) AS today_participation
      FROM users u
      LEFT JOIN ad_participation p ON p.tg_id=u.tg_id AND p.day_key=?
      ORDER BY u.points DESC
      LIMIT 1000
    `, [dayKey]);
    res.json({ ok: true, users: rows, day_key: dayKey });
  } catch (e) {
    res.status(500).json({ ok: false, error: "server_error", details: String(e.message || e) });
  }
});

app.get("/admin/api/config", basicAuth, async (req, res) => {
  const cfg = await dbGet(`SELECT * FROM admin_config WHERE id=1`);
  res.json({ ok: true, config: cfg });
});

app.post("/admin/api/config", basicAuth, async (req, res) => {
  const referrals_enabled = Number(req.body?.referrals_enabled ? 1 : 0);
  const promo_enabled = Number(req.body?.promo_enabled ? 1 : 0);
  await dbRun(`UPDATE admin_config SET referrals_enabled=?, promo_enabled=? WHERE id=1`, [referrals_enabled, promo_enabled]);
  res.json({ ok: true });
});

app.get("/admin/api/promos", basicAuth, async (req, res) => {
  const rows = await dbAll(`SELECT * FROM promo_codes ORDER BY created_at DESC LIMIT 200`);
  res.json({ ok: true, promos: rows });
});

app.post("/admin/api/promos/create", basicAuth, async (req, res) => {
  const code = String(req.body?.code || "").trim().toUpperCase();
  const points = Number(req.body?.points || 0);
  const max_uses = Number(req.body?.max_uses || 0);
  if (!code || points <= 0 || max_uses <= 0) return res.status(400).json({ ok: false, error: "invalid_fields" });

  await dbRun(`INSERT INTO promo_codes (code, points, max_uses, uses, active) VALUES (?, ?, ?, 0, 1)`, [code, points, max_uses]);
  res.json({ ok: true });
});

app.post("/admin/api/promos/toggle", basicAuth, async (req, res) => {
  const code = String(req.body?.code || "").trim().toUpperCase();
  const active = Number(req.body?.active ? 1 : 0);
  await dbRun(`UPDATE promo_codes SET active=? WHERE code=?`, [active, code]);
  res.json({ ok: true });
});

// ================= STATIC =================
app.use("/webapp", express.static(path.join(__dirname, "webapp")));
app.get("/health", (req, res) => res.send("ok"));

if (USE_WEBHOOK) {
  const secretPath = `/telegram-webhook/${BOT_TOKEN}`;

  app.post(secretPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  (async () => {
    const webhookUrl = `${BASE_URL}${secretPath}`;
    console.log("✅ Setting webhook to:", webhookUrl);
    await bot.deleteWebHook({ drop_pending_updates: true });
    await bot.setWebHook(webhookUrl);
  })().catch(console.error);
}

const PORT = process.env.PORT || 10000;
migrate().then(() => {
  app.listen(PORT, () => {
    console.log("Servidor rodando na porta", PORT);
    console.log("BASE_URL:", BASE_URL);
    console.log("MODE:", USE_WEBHOOK ? "WEBHOOK" : "POLLING");
    console.log("ADMIN URL:", `${BASE_URL}/admin/`);
  });
});
