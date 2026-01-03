require('dotenv').config();

const express = require('express');
const path = require('path');
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

if (!BOT_TOKEN) console.error('❌ BOT_TOKEN vazio');
if (!BASE_URL) console.error('❌ BASE_URL vazio');

// ================= BOT =================
const bot = new TelegramBot(
  BOT_TOKEN,
  USE_WEBHOOK ? { webHook: true } : { polling: true }
);

process.on('unhandledRejection', err => {
  console.error('UnhandledRejection:', err);
});

function isAbsoluteHttpUrl(u) {
  return /^https?:\/\/[^/]+/i.test(u);
}

// ================= DATABASE =================
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT UNIQUE,
      points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price_ton REAL,
      points_per_day INTEGER,
      active INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT,
      item_id INTEGER,
      quantity INTEGER DEFAULT 1,
      UNIQUE(tg_id, item_id)
    )
  `);

  db.get(`SELECT COUNT(*) AS c FROM items`, (e, r) => {
    if (!e && r && r.c === 0) {
      const st = db.prepare(
        `INSERT INTO items (name, price_ton, points_per_day) VALUES (?,?,?)`
      );
      st.run('Miner Basic', 0.05, 10);
      st.run('Miner Pro', 0.2, 50);
      st.run('Miner Elite', 0.5, 150);
      st.finalize();
      console.log('✅ Seed de itens criado');
    }
  });
});

// ================= BOT COMMAND =================
bot.onText(/\/start/, msg => {
  const tgId = String(msg.from.id);

  db.run(`INSERT OR IGNORE INTO users (tg_id) VALUES (?)`, [tgId]);

  const webAppUrl = `${BASE_URL}/webapp/index.html?tg_id=${encodeURIComponent(tgId)}`;

  if (!isAbsoluteHttpUrl(webAppUrl)) {
    bot.sendMessage(tgId, '❌ Erro: BASE_URL inválido no servidor.');
    return;
  }

  bot.sendMessage(
    tgId,
    `🎮 Bem-vindo ao TON Game!

✅ Compre itens
⭐ Gere pontos
💰 Recompensas dependem do pool

Clique abaixo para abrir:`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '▶️ Abrir Jogo', web_app: { url: webAppUrl } }
        ]]
      }
    }
  );
});

// ================= API =================
app.get('/api/items', (req, res) => {
  db.all(
    `SELECT id,name,price_ton,points_per_day FROM items WHERE active=1 ORDER BY id ASC`,
    (e, rows) => {
      if (e) return res.status(500).json({ ok: false, error: 'db_error' });
      res.json({ ok: true, items: rows });
    }
  );
});

// ✅ Perfil: agora cria usuário automaticamente se não existir
app.get('/api/me', (req, res) => {
  const tg_id = String(req.query.tg_id || '');
  if (!tg_id) return res.status(400).json({ ok: false, error: 'missing_tg_id' });

  // garante user
  db.run(`INSERT OR IGNORE INTO users (tg_id) VALUES (?)`, [tg_id], (insErr) => {
    if (insErr) return res.status(500).json({ ok: false, error: 'db_error' });

    db.get(`SELECT tg_id, points FROM users WHERE tg_id=?`, [tg_id], (e, user) => {
      if (e || !user) return res.status(500).json({ ok: false, error: 'db_error' });

      db.all(
        `SELECT i.id, i.name, inv.quantity, i.points_per_day
         FROM inventory inv
         JOIN items i ON i.id = inv.item_id
         WHERE inv.tg_id=?
         ORDER BY i.id ASC`,
        [tg_id],
        (e2, inv) => {
          if (e2) return res.status(500).json({ ok: false, error: 'db_error' });
          res.json({ ok: true, user, inventory: inv });
        }
      );
    });
  });
});

// ================= STATIC =================
app.use('/webapp', express.static(path.join(__dirname, 'webapp')));

// ================= DEBUG =================
app.get('/health', (req, res) => res.send('ok'));

app.get('/debug/webhook', async (req, res) => {
  try {
    const info = await bot.getWebhookInfo();
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ================= WEBHOOK =================
if (USE_WEBHOOK) {
  const secretPath = `/telegram-webhook/${BOT_TOKEN}`;

  // (GET só para teste visual)
  app.get(secretPath, (req, res) => {
    res.status(200).send('Webhook endpoint OK (use POST).');
  });

  app.post(secretPath, (req, res) => {
    console.log('📩 Update recebido:', JSON.stringify(req.body).slice(0, 300));
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  (async () => {
    const webhookUrl = `${BASE_URL}${secretPath}`;
    console.log('✅ Setting webhook:', webhookUrl);

    await bot.deleteWebHook({ drop_pending_updates: true });
    await bot.setWebHook(webhookUrl);

    const info = await bot.getWebhookInfo();
    console.log('WebhookInfo:', info);
  })().catch(console.error);
}

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor rodando na porta', PORT);
  console.log('BASE_URL:', BASE_URL);
  console.log('MODE:', USE_WEBHOOK ? 'WEBHOOK' : 'POLLING');
});
