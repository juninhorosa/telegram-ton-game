require('dotenv').config();

const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

// ---------- ENV ----------
const BOT_TOKEN = process.env.BOT_TOKEN;
const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');
const TON_API = process.env.TON_API;
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || '';
const TON_RECEIVER_ADDRESS = process.env.TON_RECEIVER_ADDRESS || '';

// ---------- BOT ----------
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ---------- DB ----------
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT UNIQUE,
      wallet TEXT DEFAULT '',
      points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price_ton REAL NOT NULL,
      points_per_day INTEGER NOT NULL DEFAULT 10,
      active INTEGER NOT NULL DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      ton_amount REAL NOT NULL,
      receiver TEXT NOT NULL,
      tx_hash TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      confirmed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(tg_id, item_id)
    )
  `);

  // Seed de itens (só se não existir nada)
  db.get(`SELECT COUNT(*) AS c FROM items`, (err, row) => {
    if (!err && row && row.c === 0) {
      const st = db.prepare(`INSERT INTO items (name, price_ton, points_per_day) VALUES (?, ?, ?)`);
      st.run('Miner Basic', 0.05, 10);
      st.run('Miner Pro', 0.20, 50);
      st.run('Miner Elite', 0.50, 150);
      st.finalize();
    }
  });
});

// ---------- Helpers ----------
function h(s) {
  return String(s || '');
}

function fetchJson(url) {
  return fetch(url, {
    headers: TONCENTER_API_KEY ? { 'X-API-Key': TONCENTER_API_KEY } : {}
  }).then(r => r.json());
}

// Pega detalhes da transação por hash usando toncenter
async function getTxByHash(txHash) {
  // endpoint: /getTransactions?address=... é mais comum, mas dá trabalho buscar.
  // Usaremos "getTransactions" e filtramos por hash. Precisamos do address receiver.
  if (!TON_RECEIVER_ADDRESS) throw new Error('TON_RECEIVER_ADDRESS não configurado');

  const limit = 15; // busca as últimas 15 transações do receiver
  const url = `${TON_API}/getTransactions?address=${encodeURIComponent(TON_RECEIVER_ADDRESS)}&limit=${limit}`;
  const data = await fetchJson(url);

  if (!data || !data.ok || !Array.isArray(data.result)) {
    throw new Error('Falha ao buscar transações no toncenter');
  }

  // Toncenter retorna hash em campos diferentes dependendo do formato.
  // Tentamos casar por "transaction_id.hash" ou "transaction_id.lt+hash"
  const found = data.result.find(tx => {
    const hash = tx?.transaction_id?.hash;
    return hash && hash.toLowerCase() === txHash.toLowerCase();
  });

  return found || null;
}

// Converte nanoTON => TON
function nanoToTon(nano) {
  const n = Number(nano);
  if (!Number.isFinite(n)) return 0;
  return n / 1e9;
}

// ---------- BOT /start ----------
bot.onText(/\/start/, (msg) => {
  const tgId = String(msg.from.id);

  db.run(`INSERT OR IGNORE INTO users (tg_id) VALUES (?)`, [tgId]);

  bot.sendMessage(
    tgId,
    `🎮 Bem-vindo ao Jogo TON!

✅ Compre itens (TON)
🏆 Ganhe pontos por tempo (sem promessa de retorno fixo)
💰 Resgates/benefícios podem depender do pool do jogo

Clique para abrir:`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: "▶️ Abrir Jogo", web_app: { url: `${BASE_URL}/webapp/index.html?tg_id=${encodeURIComponent(tgId)}` } }
        ]]
      }
    }
  );
});

// ---------- API ----------

// Lista itens da loja
app.get('/api/items', (req, res) => {
  db.all(`SELECT id, name, price_ton, points_per_day FROM items WHERE active=1 ORDER BY id ASC`, (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: 'db_error' });
    res.json({ ok: true, items: rows });
  });
});

// Cria compra "pending" (retorna receiver + amount + purchase_id)
// O usuário paga via TON Connect e depois chama /confirm
app.post('/api/purchase/create', (req, res) => {
  const { tg_id, item_id } = req.body || {};
  if (!tg_id || !item_id) return res.status(400).json({ ok: false, error: 'missing_fields' });
  if (!TON_RECEIVER_ADDRESS) return res.status(500).json({ ok: false, error: 'receiver_not_set' });

  db.get(`SELECT id, name, price_ton FROM items WHERE id=? AND active=1`, [item_id], (err, item) => {
    if (err || !item) return res.status(404).json({ ok: false, error: 'item_not_found' });

    db.run(
      `INSERT INTO purchases (tg_id, item_id, ton_amount, receiver, status) VALUES (?, ?, ?, ?, 'pending')`,
      [String(tg_id), Number(item_id), Number(item.price_ton), TON_RECEIVER_ADDRESS],
      function (e2) {
        if (e2) return res.status(500).json({ ok: false, error: 'db_error' });

        res.json({
          ok: true,
          purchase_id: this.lastID,
          receiver: TON_RECEIVER_ADDRESS,
          amount_ton: Number(item.price_ton),
          comment: `BUY_ITEM_${item.id}_${this.lastID}` // opcional p/ payload
        });
      }
    );
  });
});

// Confirma compra: recebe purchase_id + tx_hash e valida no toncenter
app.post('/api/purchase/confirm', async (req, res) => {
  try {
    const { tg_id, purchase_id, tx_hash } = req.body || {};
    if (!tg_id || !purchase_id || !tx_hash) return res.status(400).json({ ok: false, error: 'missing_fields' });

    db.get(`SELECT * FROM purchases WHERE id=? AND tg_id=?`, [Number(purchase_id), String(tg_id)], async (err, p) => {
      if (err || !p) return res.status(404).json({ ok: false, error: 'purchase_not_found' });
      if (p.status === 'confirmed') return res.json({ ok: true, status: 'confirmed' });

      const tx = await getTxByHash(String(tx_hash));
      if (!tx) return res.status(400).json({ ok: false, error: 'tx_not_found_yet' });

      // Verificações básicas:
      // 1) transação deve ter "in_msg" e destino receiver
      const toAddr = tx?.in_msg?.destination;
      const valueNano = tx?.in_msg?.value;
      const valueTon = nanoToTon(valueNano);

      if (!toAddr || String(toAddr) !== String(TON_RECEIVER_ADDRESS)) {
        return res.status(400).json({ ok: false, error: 'wrong_receiver' });
      }

      // 2) valor deve ser >= esperado (evita subpagamento)
      if (Number(valueTon) + 1e-9 < Number(p.ton_amount)) {
        return res.status(400).json({ ok: false, error: 'insufficient_amount', paid: valueTon, expected: p.ton_amount });
      }

      // 3) marca purchase confirmada + dá item no inventário
      db.serialize(() => {
        db.run(
          `UPDATE purchases SET status='confirmed', tx_hash=?, confirmed_at=datetime('now') WHERE id=?`,
          [String(tx_hash), Number(purchase_id)]
        );

        db.run(
          `INSERT INTO inventory (tg_id, item_id, quantity) VALUES (?, ?, 1)
           ON CONFLICT(tg_id, item_id) DO UPDATE SET quantity = quantity + 1`,
          [String(tg_id), Number(p.item_id)]
        );

        // Notifica no Telegram
        bot.sendMessage(String(tg_id), `✅ Pagamento confirmado!\nItem liberado no teu inventário. 🎁`);

        res.json({ ok: true, status: 'confirmed', paid_ton: valueTon });
      });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error', details: String(e.message || e) });
  }
});

// Perfil do usuário (pontos + inventário)
app.get('/api/me', (req, res) => {
  const tg_id = String(req.query.tg_id || '');
  if (!tg_id) return res.status(400).json({ ok: false, error: 'missing_tg_id' });

  db.get(`SELECT tg_id, points FROM users WHERE tg_id=?`, [tg_id], (err, user) => {
    if (err || !user) return res.status(404).json({ ok: false, error: 'user_not_found' });

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

// ---------- Static ----------
app.use('/webapp', express.static(path.join(__dirname, 'webapp')));

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
