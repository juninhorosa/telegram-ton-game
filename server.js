require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

// ================= ENV =================
const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
const USE_WEBHOOK = (process.env.USE_WEBHOOK || '').trim() === '1';

const BASE_URL = (
  (process.env.BASE_URL && process.env.BASE_URL.trim()) ||
  (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.trim()) ||
  ''
).replace(/\/$/, '');

const TON_RECEIVER_ADDRESS = (process.env.TON_RECEIVER_ADDRESS || '').trim();

// Ads settings
const AD_ESTIMATED_VALUE_USD = Number(process.env.AD_ESTIMATED_VALUE_USD || '0.01');
const AD_COOLDOWN_SECONDS = Number(process.env.AD_COOLDOWN_SECONDS || '60');
const AD_MIN_WATCH_SECONDS = Number(process.env.AD_MIN_WATCH_SECONDS || '20'); // ✅ recomendo 20+

if (!BOT_TOKEN) console.error('❌ BOT_TOKEN vazio');
if (!BASE_URL) console.error('❌ BASE_URL vazio');
if (!TON_RECEIVER_ADDRESS) console.warn('⚠️ TON_RECEIVER_ADDRESS vazio (configure no Render)');

// ================= BOT =================
const bot = new TelegramBot(
  BOT_TOKEN,
  USE_WEBHOOK ? { webHook: true } : { polling: true }
);

process.on('unhandledRejection', err => console.error('UnhandledRejection:', err));

function isAbsoluteHttpUrl(u) {
  return /^https?:\/\/[^/]+/i.test(u);
}

// ================= DATABASE =================
const db = new sqlite3.Database('./database.db');

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
  const exists = cols.some(c => c.name === col);
  if (!exists) {
    await dbRun(`ALTER TABLE ${table} ADD COLUMN ${col} ${typeSql}`);
  }
}

async function migrate() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT UNIQUE,
      points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE,
      name TEXT,
      price_ton REAL,
      points_per_day INTEGER,
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
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      ton_amount REAL NOT NULL,
      receiver TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      tx_hash TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      confirmed_at TEXT DEFAULT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS ad_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      estimated_value_usd REAL DEFAULT 0,
      user_share_points INTEGER DEFAULT 0,
      pool_added_points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS user_ad_state (
      tg_id TEXT PRIMARY KEY,
      last_watch_at TEXT DEFAULT NULL,
      watched_today INTEGER DEFAULT 0,
      day_key TEXT DEFAULT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS pool_state (
      id INTEGER PRIMARY KEY CHECK (id=1),
      pool_points_total INTEGER DEFAULT 0,
      pool_points_distributed INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await dbRun(`INSERT OR IGNORE INTO pool_state (id) VALUES (1)`);

  // ✅ ad_sessions
  await dbRun(`
    CREATE TABLE IF NOT EXISTS ad_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT NOT NULL,
      nonce TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      claimed_at TEXT DEFAULT NULL,
      claimed INTEGER DEFAULT 0
    )
  `);

  // ✅ adiciona colunas caso já exista tabela antiga
  await ensureColumn('ad_sessions', 'opened', 'INTEGER DEFAULT 0');
  await ensureColumn('ad_sessions', 'opened_at', 'TEXT DEFAULT NULL');

  // seed itens
  const c = await dbGet(`SELECT COUNT(*) AS c FROM items`);
  if (c && c.c === 0) {
    const items = [
      ['TRIAL_MINER', 'Trial Miner (Grátis 3 dias)', 0, 5, 20, 10],
      ['PACK_45', 'Pack Starter', 0.05, 10, 10, 10],
      ['PACK_30', 'Pack Growth',  0.12, 28, 12, 12],
      ['PACK_21', 'Pack Builder', 0.25, 70, 15, 14],
      ['PACK_14', 'Pack Pro',     0.45, 160, 18, 16],
      ['PACK_7',  'Pack Elite',   0.90, 420, 22, 20],
    ];
    for (const it of items) {
      await dbRun(
        `INSERT INTO items (sku, name, price_ton, points_per_day, ad_boost_pct, max_ads_per_day)
         VALUES (?,?,?,?,?,?)`,
        it
      );
    }
    console.log('✅ Seed: trial + 5 packs criado');
  }
}

async function grantTrialIfNew(tg_id) {
  await dbRun(`INSERT OR IGNORE INTO users (tg_id) VALUES (?)`, [tg_id]);

  const hasTrial = await dbGet(
    `SELECT inv.id FROM inventory inv
     JOIN items i ON i.id=inv.item_id
     WHERE inv.tg_id=? AND i.sku='TRIAL_MINER' LIMIT 1`,
    [tg_id]
  );
  if (hasTrial) return { granted: false };

  const trial = await dbGet(`SELECT id FROM items WHERE sku='TRIAL_MINER' LIMIT 1`);
  if (!trial) return { granted: false };

  await dbRun(
    `INSERT INTO inventory (tg_id, item_id, quantity, expires_at)
     VALUES (?, ?, 1, datetime('now', '+3 days'))
     ON CONFLICT(tg_id, item_id) DO NOTHING`,
    [tg_id, trial.id]
  );
  return { granted: true };
}

// ================= BOT /start =================
bot.onText(/\/start/, async (msg) => {
  const tgId = String(msg.from.id);
  await grantTrialIfNew(tgId);

  const webAppUrl = `${BASE_URL}/webapp/index.html?tg_id=${encodeURIComponent(tgId)}`;

  if (!isAbsoluteHttpUrl(webAppUrl)) {
    bot.sendMessage(tgId, '❌ Erro: BASE_URL inválido no servidor.');
    return;
  }

  bot.sendMessage(
    tgId,
    `🎮 TON Game

✅ Trial (3 dias)
📺 Anúncio externo + reward ao voltar ao Telegram
🛒 Packs compráveis ilimitado`,
    { reply_markup: { inline_keyboard: [[{ text: '▶️ Abrir Jogo', web_app: { url: webAppUrl } }]] } }
  );
});

// ================= API =================
app.get('/api/items', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, sku, name, price_ton, points_per_day, ad_boost_pct, max_ads_per_day
       FROM items WHERE active=1 ORDER BY id ASC`
    );
    res.json({ ok: true, items: rows });
  } catch {
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

app.get('/api/me', async (req, res) => {
  try {
    const tg_id = String(req.query.tg_id || '');
    if (!tg_id) return res.status(400).json({ ok: false, error: 'missing_tg_id' });

    await grantTrialIfNew(tg_id);

    const user = await dbGet(`SELECT tg_id, points FROM users WHERE tg_id=?`, [tg_id]);
    if (!user) return res.status(500).json({ ok: false, error: 'db_error' });

    const inv = await dbAll(
      `SELECT i.id, i.sku, i.name, inv.quantity, inv.expires_at, i.points_per_day, i.ad_boost_pct, i.max_ads_per_day
       FROM inventory inv
       JOIN items i ON i.id = inv.item_id
       WHERE inv.tg_id=?
       ORDER BY i.id ASC`,
      [tg_id]
    );

    const st = await dbGet(`SELECT * FROM user_ad_state WHERE tg_id=?`, [tg_id]);
    const todayKey = new Date().toISOString().slice(0, 10);
    const watchedToday = (st && st.day_key === todayKey) ? Number(st.watched_today || 0) : 0;

    const limRow = await dbGet(
      `SELECT COALESCE(MAX(i.max_ads_per_day), 10) AS lim
       FROM inventory inv
       JOIN items i ON i.id = inv.item_id
       WHERE inv.tg_id=?`,
      [tg_id]
    );

    res.json({
      ok: true,
      user,
      inventory: inv,
      ads: {
        watched_today: watchedToday,
        daily_limit: Number(limRow?.lim || 10),
        cooldown_seconds: AD_COOLDOWN_SECONDS,
        min_watch_seconds: AD_MIN_WATCH_SECONDS,
        last_watch_at: st?.last_watch_at || null
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error', details: String(e.message || e) });
  }
});

app.get('/api/pool', async (req, res) => {
  try {
    const row = await dbGet(`SELECT pool_points_total, pool_points_distributed, updated_at FROM pool_state WHERE id=1`);
    res.json({ ok: true, pool: row });
  } catch {
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

// ================= ADS: START =================
app.post('/api/ad/start', async (req, res) => {
  try {
    const { tg_id } = req.body || {};
    const uid = String(tg_id || '');
    if (!uid) return res.status(400).json({ ok: false, error: 'missing_tg_id' });

    await dbRun(`INSERT OR IGNORE INTO users (tg_id) VALUES (?)`, [uid]);

    const todayKey = new Date().toISOString().slice(0, 10);
    const st = await dbGet(`SELECT * FROM user_ad_state WHERE tg_id=?`, [uid]);

    const now = Date.now();
    const lastMs = st?.last_watch_at ? Date.parse(st.last_watch_at) : 0;
    const cooldownMs = AD_COOLDOWN_SECONDS * 1000;
    const watchedToday = (st && st.day_key === todayKey) ? Number(st.watched_today || 0) : 0;

    if (lastMs && (now - lastMs) < cooldownMs) {
      const wait = Math.ceil((cooldownMs - (now - lastMs)) / 1000);
      return res.json({ ok: false, error: 'cooldown', wait_seconds: wait });
    }

    const limRow = await dbGet(
      `SELECT COALESCE(MAX(i.max_ads_per_day), 10) AS lim
       FROM inventory inv
       JOIN items i ON i.id = inv.item_id
       WHERE inv.tg_id=?`,
      [uid]
    );
    const lim = Number(limRow?.lim || 10);

    if (watchedToday >= lim) {
      return res.json({ ok: false, error: 'daily_limit', limit: lim });
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    await dbRun(`INSERT INTO ad_sessions (tg_id, nonce, opened, opened_at) VALUES (?, ?, 0, NULL)`, [uid, nonce]);

    res.json({
      ok: true,
      nonce,
      min_watch_seconds: AD_MIN_WATCH_SECONDS,
      cooldown_seconds: AD_COOLDOWN_SECONDS,
      daily_limit: lim,
      watched_today: watchedToday
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error', details: String(e.message || e) });
  }
});

// ✅ ADS: OPENED (marca que o usuário realmente abriu o anúncio)
app.post('/api/ad/opened', async (req, res) => {
  try {
    const { tg_id, nonce } = req.body || {};
    const uid = String(tg_id || '');
    const n = String(nonce || '');
    if (!uid || !n) return res.status(400).json({ ok: false, error: 'missing_fields' });

    const sess = await dbGet(`SELECT * FROM ad_sessions WHERE nonce=? LIMIT 1`, [n]);
    if (!sess) return res.json({ ok: false, error: 'invalid_nonce' });
    if (String(sess.tg_id) !== uid) return res.json({ ok: false, error: 'nonce_not_owner' });
    if (Number(sess.claimed || 0) === 1) return res.json({ ok: false, error: 'already_claimed' });

    // marca aberto somente uma vez
    if (Number(sess.opened || 0) === 0) {
      await dbRun(`UPDATE ad_sessions SET opened=1, opened_at=datetime('now') WHERE nonce=?`, [n]);
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error', details: String(e.message || e) });
  }
});

// ================= ADS: CLAIM =================
app.post('/api/ad/claim', async (req, res) => {
  try {
    const { tg_id, nonce } = req.body || {};
    const uid = String(tg_id || '');
    const n = String(nonce || '');
    if (!uid || !n) return res.status(400).json({ ok: false, error: 'missing_fields' });

    const sess = await dbGet(`SELECT * FROM ad_sessions WHERE nonce=? LIMIT 1`, [n]);
    if (!sess) return res.json({ ok: false, error: 'invalid_nonce' });
    if (String(sess.tg_id) !== uid) return res.json({ ok: false, error: 'nonce_not_owner' });
    if (Number(sess.claimed || 0) === 1) return res.json({ ok: false, error: 'already_claimed' });

    // ✅ só libera se realmente abriu
    if (Number(sess.opened || 0) !== 1 || !sess.opened_at) {
      return res.json({ ok: false, error: 'not_opened' });
    }

    // ✅ valida tempo mínimo desde opened_at
    const openedMs = Date.parse(sess.opened_at);
    const elapsed = (Date.now() - openedMs) / 1000;
    if (elapsed < AD_MIN_WATCH_SECONDS) {
      return res.json({
        ok: false,
        error: 'too_fast',
        need_seconds: AD_MIN_WATCH_SECONDS,
        elapsed_seconds: Math.floor(elapsed)
      });
    }

    // limite diário/cooldown
    const todayKey = new Date().toISOString().slice(0, 10);
    const st = await dbGet(`SELECT * FROM user_ad_state WHERE tg_id=?`, [uid]);
    const watchedToday = (st && st.day_key === todayKey) ? Number(st.watched_today || 0) : 0;

    const limRow = await dbGet(
      `SELECT COALESCE(MAX(i.max_ads_per_day), 10) AS lim
       FROM inventory inv
       JOIN items i ON i.id = inv.item_id
       WHERE inv.tg_id=?`,
      [uid]
    );
    const lim = Number(limRow?.lim || 10);
    if (watchedToday >= lim) return res.json({ ok: false, error: 'daily_limit', limit: lim });

    const boostRow = await dbGet(
      `SELECT COALESCE(MAX(i.ad_boost_pct), 0) AS b
       FROM inventory inv
       JOIN items i ON i.id = inv.item_id
       WHERE inv.tg_id=?`,
      [uid]
    );
    const boostPct = Number(boostRow?.b || 0);

    // calcula pontos
    const basePointsPerUsd = 100;
    const estUsd = AD_ESTIMATED_VALUE_USD;
    const poolAddedPoints = Math.max(1, Math.floor(estUsd * basePointsPerUsd));
    const userBase = estUsd * basePointsPerUsd * 0.10;
    const userSharePoints = Math.max(1, Math.floor(userBase * (1 + boostPct / 100)));

    await dbRun(`UPDATE users SET points = points + ? WHERE tg_id=?`, [userSharePoints, uid]);

    await dbRun(
      `INSERT INTO ad_events (tg_id, event_type, estimated_value_usd, user_share_points, pool_added_points)
       VALUES (?, 'watch', ?, ?, ?)`,
      [uid, estUsd, userSharePoints, poolAddedPoints]
    );

    await dbRun(
      `UPDATE pool_state
       SET pool_points_total = pool_points_total + ?,
           pool_points_distributed = pool_points_distributed + ?,
           updated_at = datetime('now')
       WHERE id=1`,
      [poolAddedPoints, userSharePoints]
    );

    await dbRun(
      `INSERT INTO user_ad_state (tg_id, last_watch_at, watched_today, day_key)
       VALUES (?, datetime('now'), ?, ?)
       ON CONFLICT(tg_id) DO UPDATE SET
         last_watch_at=excluded.last_watch_at,
         watched_today=excluded.watched_today,
         day_key=excluded.day_key`,
      [uid, watchedToday + 1, todayKey]
    );

    await dbRun(`UPDATE ad_sessions SET claimed=1, claimed_at=datetime('now') WHERE nonce=?`, [n]);

    res.json({
      ok: true,
      user_share_points: userSharePoints,
      pool_added_points: poolAddedPoints,
      boost_pct: boostPct,
      watched_today: watchedToday + 1,
      daily_limit: lim
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error', details: String(e.message || e) });
  }
});

// ===== Compra create (TON) =====
app.post('/api/purchase/create', async (req, res) => {
  try {
    const { tg_id, item_id } = req.body || {};
    const uid = String(tg_id || '');
    const itemId = Number(item_id || 0);

    if (!uid || !itemId) return res.status(400).json({ ok: false, error: 'missing_fields' });
    if (!TON_RECEIVER_ADDRESS) return res.status(500).json({ ok: false, error: 'receiver_not_set' });

    const item = await dbGet(`SELECT id, sku, name, price_ton FROM items WHERE id=? AND active=1`, [itemId]);
    if (!item) return res.status(404).json({ ok: false, error: 'item_not_found' });
    if (Number(item.price_ton) <= 0) return res.status(400).json({ ok: false, error: 'not_purchasable' });

    await dbRun(`INSERT OR IGNORE INTO users (tg_id) VALUES (?)`, [uid]);

    const ins = await dbRun(
      `INSERT INTO purchases (tg_id, item_id, ton_amount, receiver, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [uid, itemId, Number(item.price_ton), TON_RECEIVER_ADDRESS]
    );

    res.json({
      ok: true,
      purchase_id: ins.lastID,
      receiver: TON_RECEIVER_ADDRESS,
      amount_ton: Number(item.price_ton),
      sku: item.sku,
      name: item.name
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error', details: String(e.message || e) });
  }
});

// ================= STATIC =================
app.use('/webapp', express.static(path.join(__dirname, 'webapp')));

// ================= DEBUG =================
app.get('/health', (req, res) => res.send('ok'));

if (USE_WEBHOOK) {
  const secretPath = `/telegram-webhook/${BOT_TOKEN}`;

  app.get(secretPath, (req, res) => res.status(200).send('Webhook endpoint OK (use POST).'));

  app.post(secretPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  (async () => {
    const webhookUrl = `${BASE_URL}${secretPath}`;
    console.log('✅ Setting webhook:', webhookUrl);
    await bot.deleteWebHook({ drop_pending_updates: true });
    await bot.setWebHook(webhookUrl);
  })().catch(console.error);
}

const PORT = process.env.PORT || 3000;
migrate().then(() => {
  app.listen(PORT, () => {
    console.log('Servidor rodando na porta', PORT);
    console.log('BASE_URL:', BASE_URL);
    console.log('MODE:', USE_WEBHOOK ? 'WEBHOOK' : 'POLLING');
  });
});
