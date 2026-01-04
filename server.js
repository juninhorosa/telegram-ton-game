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

// Wallet do jogo (recebe compras da loja)
const SHOP_WALLET = (process.env.SHOP_WALLET || "UQCO5ujJsobYdfFjQQ9DGFZThUFXty21_14HkDnPHOMgM79P").trim();

// Admin basic auth
const ADMIN_USER = (process.env.ADMIN_USER || "admin").trim();
const ADMIN_PASS = (process.env.ADMIN_PASS || "Valdenir1994#").trim();

if (!BOT_TOKEN) console.error("❌ BOT_TOKEN vazio");
if (!BASE_URL) console.error("❌ BASE_URL vazio");

const bot = new TelegramBot(BOT_TOKEN, USE_WEBHOOK ? { webHook: true } : { polling: true });
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
  return new Date().toISOString().slice(0, 10);
}

function genReferralCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

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

  await dbRun(`
    CREATE TABLE IF NOT EXISTS admin_config (
      id INTEGER PRIMARY KEY CHECK (id=1),
      referrals_enabled INTEGER DEFAULT 1,
      promo_enabled INTEGER DEFAULT 1
    )
  `);
  await dbRun(`INSERT OR IGNORE INTO admin_config (id) VALUES (1)`);

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

  await dbRun(`
    CREATE TABLE IF NOT EXISTS promo_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      tg_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(code, tg_id)
    )
  `);

  // Trial miner: precisa 5 anúncios para ativar e dura 1 dia
  await dbRun(`
    CREATE TABLE IF NOT EXISTS trial_progress (
      tg_id TEXT PRIMARY KEY,
      progress INTEGER DEFAULT 0,
      required INTEGER DEFAULT 5,
      active_until TEXT DEFAULT NULL
    )
  `);

  // Compras TON (confirmadas manualmente no admin)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      amount_ton REAL NOT NULL,
      comment TEXT NOT NULL,
      status TEXT DEFAULT 'created', -- created | paid | delivered
      created_at TEXT DEFAULT (datetime('now')),
      paid_at TEXT DEFAULT NULL,
      delivered_at TEXT DEFAULT NULL
    )
  `);

  await ensureColumn("users", "referral_code", "TEXT UNIQUE");
  await ensureColumn("users", "referrer_tg_id", "TEXT DEFAULT NULL");

  // Seed itens (AGORA COM PREÇO TON)
  const c = await dbGet(`SELECT COUNT(*) AS c FROM items`);
  if ((c?.c || 0) === 0) {
    const seed = [
      ["TRIAL_MINER", "Trial Miner (ativar com 5 anúncios, dura 1 dia)", 0.0, 15, 0, 10],
      ["PACK_1", "Miner Bronze", 0.05, 10, 0, 10],
      ["PACK_2", "Miner Silver", 0.15, 30, 0, 12],
      ["PACK_3", "Miner Gold", 0.35, 70, 0, 14],
      ["PACK_4", "Miner Diamond", 0.75, 160, 0, 16],
      ["PACK_5", "Miner Elite", 1.50, 350, 0, 20],
    ];
    for (const it of seed) {
      await dbRun(
        `INSERT INTO items (sku,name,price_ton,points_per_day,ad_boost_pct,max_ads_per_day) VALUES (?,?,?,?,?,?)`,
        it
      );
    }
    console.log("✅ Seed itens criado");
  }

  console.log("✅ Migrate OK");
}

async function ensureUser(tg_id) {
  const uid = String(tg_id || "");
  if (!uid) return null;

  const u = await dbGet(`SELECT tg_id FROM users WHERE tg_id=?`, [uid]);
  if (!u) {
    let code = genReferralCode();
    while (await dbGet(`SELECT 1 FROM users WHERE referral_code=?`, [code])) code = genReferralCode();
    await dbRun(`INSERT INTO users (tg_id, referral_code) VALUES (?, ?)`, [uid, code]);
  }

  await dbRun(`INSERT OR IGNORE INTO trial_progress (tg_id, progress, required) VALUES (?, 0, 5)`, [uid]);

  return await dbGet(`SELECT * FROM users WHERE tg_id=?`, [uid]);
}

async function applyReferralIfEnabled(newUserId, referralCode) {
  const cfg = await dbGet(`SELECT referrals_enabled FROM admin_config WHERE id=1`);
  if (!cfg || Number(cfg.referrals_enabled) !== 1) return;

  const code = String(referralCode || "").trim().toUpperCase();
  if (!code) return;

  const ref = await dbGet(`SELECT tg_id FROM users WHERE referral_code=? LIMIT 1`, [code]);
  if (!ref) return;
  if (String(ref.tg_id) === String(newUserId)) return;

  const u = await dbGet(`SELECT referrer_tg_id FROM users WHERE tg_id=?`, [newUserId]);
  if (u?.referrer_tg_id) return;

  await dbRun(`UPDATE users SET referrer_tg_id=? WHERE tg_id=?`, [ref.tg_id, newUserId]);
}

// ================= DAILY POOL DISTRIBUTION =================
async function distributePoolForDay(dayKey) {
  await dbRun(
    `INSERT OR IGNORE INTO pool_days (day_key, pool_points, distributed) VALUES (?, 0, 0)`,
    [dayKey]
  );
  const day = await dbGet(`SELECT * FROM pool_days WHERE day_key=?`, [dayKey]);
  if (!day || Number(day.distributed) === 1) return;

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

  const perTicket = Math.floor(poolPoints / totalTickets);
  let remainder = poolPoints - perTicket * totalTickets;

  for (const r of rows) {
    const t = Number(r.count || 0);
    let gain = perTicket * t;

    if (remainder > 0) {
      const extra = Math.min(remainder, t);
      gain += extra;
      remainder -= extra;
    }

    if (gain > 0) await dbRun(`UPDATE users SET points=points + ? WHERE tg_id=?`, [gain, r.tg_id]);
  }

  await dbRun(`UPDATE pool_days SET distributed=1, distributed_at=datetime('now') WHERE day_key=?`, [dayKey]);
  console.log(`✅ Pool distribuído: ${dayKey} = ${poolPoints} pts`);
}

let lastDistributedKey = null;
setInterval(async () => {
  try {
    const now = new Date();
    const hh = now.getUTCHours();
    const mm = now.getUTCMinutes();
    const key = todayKeyUTC();

    if (hh === 0 && mm === 0 && lastDistributedKey !== key) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      await distributePoolForDay(yesterday);
      lastDistributedKey = key;
    }
  } catch (e) {
    console.error("distribution loop error:", e);
  }
}, 30000);

// ================= TELEGRAM =================
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

  const u = await dbGet(`SELECT referral_code FROM users WHERE tg_id=?`, [tgId]);

  bot.sendMessage(
    tgId,
    `🎮 TON GAME
📺 Anúncio: +1 ponto pra você +1 ponto no pool
🕛 00:00 UTC: pool distribui por participação
🎁 Trial Miner: ativa com 5 anúncios (dura 1 dia)
👥 Seu referral: /start ${u?.referral_code || ""}`,
    { reply_markup: { inline_keyboard: [[{ text: "▶️ Abrir Jogo", web_app: { url: webAppUrl } }]] } }
  );
});

bot.onText(/\/promo\s+(\S+)/, async (msg, match) => {
  const tgId = String(msg.from.id);
  const code = String(match?.[1] || "").trim().toUpperCase();
  await ensureUser(tgId);

  const cfg = await dbGet(`SELECT promo_enabled FROM admin_config WHERE id=1`);
  if (!cfg || Number(cfg.promo_enabled) !== 1) {
    bot.sendMessage(tgId, "❌ Promo codes desativados.");
    return;
  }

  const promo = await dbGet(`SELECT * FROM promo_codes WHERE code=? AND active=1`, [code]);
  if (!promo) return bot.sendMessage(tgId, "❌ Código inválido.");
  if (Number(promo.uses) >= Number(promo.max_uses)) return bot.sendMessage(tgId, "❌ Código esgotado.");

  const already = await dbGet(`SELECT 1 FROM promo_redemptions WHERE code=? AND tg_id=?`, [code, tgId]);
  if (already) return bot.sendMessage(tgId, "⚠️ Você já usou esse código.");

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

    const prodDay = inv.reduce((a, it) => a + Number(it.points_per_day || 0) * Number(it.quantity || 1), 0);

    const dayKey = todayKeyUTC();
    const myTickets = await dbGet(`SELECT count FROM ad_participation WHERE day_key=? AND tg_id=?`, [dayKey, tg_id]);
    await dbRun(`INSERT OR IGNORE INTO pool_days (day_key, pool_points, distributed) VALUES (?,0,0)`, [dayKey]);
    const dayPool = await dbGet(`SELECT pool_points, distributed FROM pool_days WHERE day_key=?`, [dayKey]);

    const trial = await dbGet(`SELECT progress, required, active_until FROM trial_progress WHERE tg_id=?`, [tg_id]);
    const trialActive = trial?.active_until ? (Date.parse(trial.active_until) > Date.now()) : false;

    res.json({
      ok: true,
      user: u,
      inventory: inv,
      stats: { production_per_day: prodDay },
      today: {
        day_key: dayKey,
        my_participation: Number(myTickets?.count || 0),
        pool_points_today: Number(dayPool?.pool_points || 0),
        distributed: Number(dayPool?.distributed || 0),
      },
      trial: {
        progress: Number(trial?.progress || 0),
        required: Number(trial?.required || 5),
        active: trialActive,
        active_until: trial?.active_until || null,
      },
      shop_wallet: SHOP_WALLET,
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
  } catch (e) {
    res.status(500).json({ ok: false, error: "db_error", details: String(e.message || e) });
  }
});

app.get("/api/pool", async (req, res) => {
  try {
    const dayKey = todayKeyUTC();
    await dbRun(`INSERT OR IGNORE INTO pool_days (day_key, pool_points, distributed) VALUES (?,0,0)`, [dayKey]);
    const day = await dbGet(`SELECT * FROM pool_days WHERE day_key=?`, [dayKey]);
    res.json({ ok: true, day });
  } catch (e) {
    res.status(500).json({ ok: false, error: "db_error", details: String(e.message || e) });
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

async function tryActivateTrial(tg_id) {
  // ativa trial quando progress >= required e ainda não ativo
  const trial = await dbGet(`SELECT progress, required, active_until FROM trial_progress WHERE tg_id=?`, [tg_id]);
  const required = Number(trial?.required || 5);
  const progress = Number(trial?.progress || 0);
  const activeUntil = trial?.active_until ? Date.parse(trial.active_until) : 0;
  const active = activeUntil > Date.now();

  if (active) return { activated: false, alreadyActive: true };

  if (progress >= required) {
    // entrega Trial Miner por 1 dia
    const trialItem = await dbGet(`SELECT id FROM items WHERE sku='TRIAL_MINER' LIMIT 1`);
    if (trialItem) {
      await dbRun(
        `INSERT INTO inventory (tg_id, item_id, quantity, expires_at)
         VALUES (?, ?, 1, datetime('now', '+1 day'))
         ON CONFLICT(tg_id, item_id) DO UPDATE SET expires_at=datetime('now','+1 day')`,
        [tg_id, trialItem.id]
      );
    }
    await dbRun(`UPDATE trial_progress SET progress=0, active_until=datetime('now', '+1 day') WHERE tg_id=?`, [tg_id]);
    return { activated: true, expires_in: "1 day" };
  }

  return { activated: false, alreadyActive: false };
}

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

    const openedMs = Date.parse(s.opened_at);
    const elapsed = (Date.now() - openedMs) / 1000;
    if (elapsed < 20) return res.json({ ok: false, error: "too_fast", need: 20, elapsed: Math.floor(elapsed) });

    // ✅ recompensa
    await dbRun(`UPDATE users SET points=points + 1 WHERE tg_id=?`, [tg_id]);

    const dayKey = todayKeyUTC();
    await dbRun(`INSERT OR IGNORE INTO pool_days (day_key, pool_points, distributed) VALUES (?,0,0)`, [dayKey]);
    await dbRun(`UPDATE pool_days SET pool_points = pool_points + 1 WHERE day_key=?`, [dayKey]);

    await dbRun(
      `INSERT INTO ad_participation (day_key, tg_id, count) VALUES (?, ?, 1)
       ON CONFLICT(day_key, tg_id) DO UPDATE SET count = count + 1`,
      [dayKey, tg_id]
    );

    // progresso trial (só se não estiver ativo)
    await dbRun(`INSERT OR IGNORE INTO trial_progress (tg_id, progress, required) VALUES (?, 0, 5)`, [tg_id]);
    const trial = await dbGet(`SELECT active_until FROM trial_progress WHERE tg_id=?`, [tg_id]);
    const active = trial?.active_until ? (Date.parse(trial.active_until) > Date.now()) : false;
    if (!active) {
      await dbRun(`UPDATE trial_progress SET progress = progress + 1 WHERE tg_id=?`, [tg_id]);
    }

    const activation = await tryActivateTrial(tg_id);

    await dbRun(`UPDATE ad_sessions SET claimed=1, claimed_at=datetime('now') WHERE nonce=?`, [nonce]);

    res.json({
      ok: true,
      user_points_added: 1,
      pool_points_added: 1,
      trial_activated: activation.activated || false
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: "server_error", details: String(e.message || e) });
  }
});

// ===== Store TON purchase (manual confirm) =====
app.post("/api/purchase/create", async (req, res) => {
  try {
    const tg_id = String(req.body?.tg_id || "");
    const item_id = Number(req.body?.item_id || 0);
    if (!tg_id || !item_id) return res.status(400).json({ ok: false, error: "missing_fields" });

    await ensureUser(tg_id);
    const item = await dbGet(`SELECT * FROM items WHERE id=? AND active=1`, [item_id]);
    if (!item) return res.json({ ok: false, error: "item_not_found" });

    const amount = Number(item.price_ton || 0);
    if (amount <= 0) return res.json({ ok: false, error: "item_not_payable" });

    const comment = `TON_GAME_${tg_id}_${crypto.randomBytes(6).toString("hex")}`;
    const ins = await dbRun(
      `INSERT INTO purchases (tg_id, item_id, amount_ton, comment, status) VALUES (?, ?, ?, ?, 'created')`,
      [tg_id, item_id, amount, comment]
    );

    // Ton deep link
    const tonUrl = `ton://transfer/${encodeURIComponent(SHOP_WALLET)}?amount=${encodeURIComponent(String(amount))}&text=${encodeURIComponent(comment)}`;

    res.json({
      ok: true,
      purchase_id: ins.lastID,
      receiver: SHOP_WALLET,
      amount_ton: amount,
      comment,
      ton_url: tonUrl,
      note: "Após pagar, o admin precisa confirmar no painel."
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: "server_error", details: String(e.message || e) });
  }
});

// entregar item quando compra marcada como paga (admin)
async function deliverPurchase(purchaseId) {
  const p = await dbGet(`SELECT * FROM purchases WHERE id=?`, [purchaseId]);
  if (!p) return { ok: false, error: "purchase_not_found" };
  if (p.status === "delivered") return { ok: true, already: true };

  const item = await dbGet(`SELECT * FROM items WHERE id=?`, [p.item_id]);
  if (!item) return { ok: false, error: "item_missing" };

  // adiciona ao inventário (sem expiração)
  await dbRun(
    `INSERT INTO inventory (tg_id, item_id, quantity, expires_at)
     VALUES (?, ?, 1, NULL)
     ON CONFLICT(tg_id, item_id) DO UPDATE SET quantity = quantity + 1`,
    [p.tg_id, p.item_id]
  );

  await dbRun(`UPDATE purchases SET status='delivered', delivered_at=datetime('now') WHERE id=?`, [purchaseId]);
  return { ok: true };
}

// ================= ADMIN =================
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

app.get("/admin/api/overview", basicAuth, async (req, res) => {
  try {
    const dayKey = todayKeyUTC();
    await dbRun(`INSERT OR IGNORE INTO pool_days (day_key, pool_points, distributed) VALUES (?,0,0)`, [dayKey]);

    const totalUsers = await dbGet(`SELECT COUNT(*) AS c FROM users`);
    const totalPoints = await dbGet(`SELECT COALESCE(SUM(points),0) AS s FROM users`);
    const pool = await dbGet(`SELECT * FROM pool_days WHERE day_key=?`, [dayKey]);
    const purchasesOpen = await dbGet(`SELECT COUNT(*) AS c FROM purchases WHERE status IN ('created','paid')`);

    res.json({
      ok: true,
      day_key: dayKey,
      total_users: Number(totalUsers?.c || 0),
      total_points: Number(totalPoints?.s || 0),
      pool_today: pool,
      purchases_pending: Number(purchasesOpen?.c || 0)
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: "server_error", details: String(e.message || e) });
  }
});

app.get("/admin/api/users", basicAuth, async (req, res) => {
  try {
    const dayKey = todayKeyUTC();
    const q = String(req.query.q || "").trim();
    const where = q ? `WHERE u.tg_id LIKE ?` : "";
    const params = q ? [`%${q}%`, dayKey] : [dayKey];

    const rows = await dbAll(`
      SELECT u.tg_id, u.points, u.referral_code, u.referrer_tg_id,
             COALESCE(p.count,0) AS today_participation
      FROM users u
      LEFT JOIN ad_participation p ON p.tg_id=u.tg_id AND p.day_key=?
      ${where}
      ORDER BY u.points DESC
      LIMIT 2000
    `, params);

    res.json({ ok: true, users: rows, day_key: dayKey });
  } catch (e) {
    res.status(500).json({ ok: false, error: "server_error", details: String(e.message || e) });
  }
});

app.post("/admin/api/users/points", basicAuth, async (req, res) => {
  const tg_id = String(req.body?.tg_id || "");
  const delta = Number(req.body?.delta || 0);
  if (!tg_id || !Number.isFinite(delta)) return res.status(400).json({ ok: false, error: "invalid_fields" });
  await ensureUser(tg_id);
  await dbRun(`UPDATE users SET points = points + ? WHERE tg_id=?`, [delta, tg_id]);
  res.json({ ok: true });
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

// compras pendentes
app.get("/admin/api/purchases", basicAuth, async (req, res) => {
  const rows = await dbAll(`
    SELECT p.id, p.tg_id, p.item_id, i.name AS item_name, p.amount_ton, p.comment, p.status, p.created_at, p.paid_at, p.delivered_at
    FROM purchases p
    JOIN items i ON i.id=p.item_id
    ORDER BY p.id DESC
    LIMIT 300
  `);
  res.json({ ok: true, purchases: rows });
});

app.post("/admin/api/purchases/markPaid", basicAuth, async (req, res) => {
  const id = Number(req.body?.id || 0);
  if (!id) return res.status(400).json({ ok: false, error: "missing_id" });

  await dbRun(`UPDATE purchases SET status='paid', paid_at=datetime('now') WHERE id=? AND status='created'`, [id]);
  const del = await deliverPurchase(id);
  res.json({ ok: true, delivered: del.ok });
});

// distribuir pool manual (essencial pra debug)
app.post("/admin/api/pool/distribute", basicAuth, async (req, res) => {
  const day = String(req.body?.day_key || "").trim();
  if (!day) return res.status(400).json({ ok: false, error: "missing_day_key" });
  await distributePoolForDay(day);
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
    console.log("SHOP_WALLET:", SHOP_WALLET);
  });
});
