const $ = (id) => document.getElementById(id);

const statusDot = $("statusDot");
const statusText = $("statusText");

const pointsValue = $("pointsValue");
const userIdMini = $("userIdMini");
const invCount = $("invCount");
const walletStatus = $("walletStatus");

const btnConnect = $("btnConnect");
const btnRefresh = $("btnRefresh");
const btnOpenHelp = $("btnOpenHelp");

const shopArea = $("shopArea");
const profileArea = $("profileArea");
const inventoryArea = $("inventoryArea");

const poolTotal = $("poolTotal");
const poolDistributed = $("poolDistributed");
const adsUsed = $("adsUsed");
const adsLimit = $("adsLimit");
const cooldownText = $("cooldownText");
const adsBar = $("adsBar");
const btnWatchAd = $("btnWatchAd");

const toast = $("toast");
const toastTitle = $("toastTitle");
const toastMsg = $("toastMsg");
const toastClose = $("toastClose");

function setStatus(kind, text) {
  statusText.textContent = text;
  statusDot.className = "dot " + (kind || "warn");
}
function showToast(title, msg) {
  toastTitle.textContent = title;
  toastMsg.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 3500);
}
toastClose.onclick = () => toast.classList.remove("show");

// Telegram
try {
  if (window.Telegram?.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
  }
} catch {}

function getTgIdSafe() {
  // 1) query
  const p = new URLSearchParams(location.search);
  const fromQuery = p.get("tg_id");
  if (fromQuery) return fromQuery;

  // 2) Telegram initDataUnsafe
  try {
    const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (u?.id) return String(u.id);
  } catch {}

  // 3) localStorage
  const ls = localStorage.getItem("tg_id");
  if (ls) return ls;

  return "";
}

const tgId = getTgIdSafe();
if (tgId) localStorage.setItem("tg_id", tgId);

const API = location.origin;

// TON Connect
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: "https://raw.githubusercontent.com/ton-community/tutorials/main/tonconnect-manifest.json"
});

function shortAddr(a) {
  if (!a) return "";
  return a.slice(0, 4) + "…" + a.slice(-4);
}
async function refreshWalletUI() {
  const w = tonConnectUI.wallet;
  if (w?.account?.address) {
    walletStatus.textContent = shortAddr(w.account.address);
    btnConnect.textContent = "✅ Carteira conectada";
    btnConnect.className = "btn ghost";
  } else {
    walletStatus.textContent = "Não conectada";
    btnConnect.textContent = "🔗 Conectar carteira";
    btnConnect.className = "btn primary";
  }
}

btnConnect.onclick = async () => {
  try {
    await tonConnectUI.connectWallet();
    await refreshWalletUI();
    showToast("Carteira", "Conectada com sucesso.");
  } catch {
    showToast("Carteira", "Conexão cancelada.");
  }
};

btnRefresh.onclick = async () => {
  await loadAll();
  showToast("Atualizado", "Dados sincronizados.");
};

btnOpenHelp.onclick = () => {
  showToast(
    "Como funciona",
    "Você ganha Trial no início. Itens geram pontos. Anúncio só libera reward após tempo mínimo + token (anti-burla)."
  );
};

function apiGet(url) {
  return fetch(url).then(r => r.json());
}
function apiPost(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(r => r.json());
}

function formatNum(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "0";
  return x.toLocaleString("pt-PT");
}
function setAdsBar(used, limit) {
  const pct = limit > 0 ? Math.max(0, Math.min(100, Math.round((used / limit) * 100))) : 0;
  adsBar.style.width = pct + "%";
}

let adsState = { watched_today: 0, daily_limit: 10, cooldown_seconds: 60, min_watch_seconds: 15, last_watch_at: null };
let cooldownTimer = null;

function startCooldownTicker() {
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    const last = adsState.last_watch_at ? Date.parse(adsState.last_watch_at) : 0;
    const cd = Number(adsState.cooldown_seconds || 60) * 1000;
    if (!last) return (cooldownText.textContent = "Pronto");
    const left = cd - (Date.now() - last);
    if (left <= 0) return (cooldownText.textContent = "Pronto");
    cooldownText.textContent = Math.ceil(left / 1000) + "s";
  }, 500);
}

async function loadPool() {
  const j = await apiGet(`${API}/api/pool`);
  if (!j.ok) {
    poolTotal.textContent = "—";
    poolDistributed.textContent = "—";
    return;
  }
  poolTotal.textContent = `${formatNum(j.pool.pool_points_total)} pts`;
  poolDistributed.textContent = `${formatNum(j.pool.pool_points_distributed)} pts`;
}

async function loadMe() {
  if (!tgId) {
    profileArea.innerHTML = `<b>Abra pelo bot</b><br><span style="opacity:.8">Use /start e abra pelo botão.</span>`;
    pointsValue.textContent = "—";
    userIdMini.textContent = "ID: —";
    invCount.textContent = "—";
    inventoryArea.innerHTML = "";
    return;
  }

  const j = await apiGet(`${API}/api/me?tg_id=${encodeURIComponent(tgId)}`);
  if (!j.ok) {
    profileArea.innerHTML = `<span style="color:#ff6b6b"><b>Falha ao carregar perfil.</b></span>`;
    return;
  }

  pointsValue.textContent = formatNum(j.user.points);
  userIdMini.textContent = `ID: ${j.user.tg_id}`;

  const inv = j.inventory || [];
  invCount.textContent = formatNum(inv.reduce((a, it) => a + Number(it.quantity || 0), 0));

  adsState = j.ads || adsState;
  adsUsed.textContent = String(adsState.watched_today ?? 0);
  adsLimit.textContent = String(adsState.daily_limit ?? 10);
  setAdsBar(Number(adsState.watched_today || 0), Number(adsState.daily_limit || 10));
  startCooldownTicker();

  profileArea.innerHTML = `<b>Seu progresso</b><br><span style="opacity:.8">Itens ativos aumentam pontos/dia e boost em anúncios.</span>`;

  if (!inv.length) {
    inventoryArea.innerHTML = `<span style="opacity:.8">Você ainda não tem itens. Compre na loja para começar.</span>`;
  } else {
    inventoryArea.innerHTML = inv.map(it => {
      const exp = it.expires_at ? ` • ⏳ ${it.expires_at}` : "";
      const boost = Number(it.ad_boost_pct || 0) > 0 ? ` • 📺 Boost +${it.ad_boost_pct}%` : "";
      return `
        <div class="invrow">
          <div>
            <div class="nm">${String(it.name)}</div>
            <div class="ds">⭐ +${it.points_per_day} pts/dia${boost}${exp}</div>
          </div>
          <div class="qty">x${it.quantity}</div>
        </div>
      `;
    }).join("");
  }
}

async function loadItems() {
  const j = await apiGet(`${API}/api/items`);
  if (!j.ok) {
    shopArea.innerHTML = `<span style="color:#ff6b6b"><b>Erro ao carregar a loja.</b></span>`;
    return;
  }

  const items = (j.items || []).filter(it => Number(it.price_ton || 0) > 0);
  shopArea.innerHTML = `
    <div class="shop">
      ${items.map(item => `
        <div class="item">
          <div class="name">${item.name}</div>
          <div class="meta">
            <span class="badge">💎 ${item.price_ton} TON</span>
            <span class="badge">⭐ +${item.points_per_day}/dia</span>
            <span class="badge">📺 Boost +${item.ad_boost_pct}%</span>
          </div>
          <div style="margin-top:10px">
            <button class="btn primary full" data-buy="${item.id}">Comprar agora</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  document.querySelectorAll("[data-buy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const itemId = Number(btn.getAttribute("data-buy"));
      await buyFlow(itemId);
    });
  });
}

async function buyFlow(itemId) {
  if (!tgId) return showToast("Abra pelo bot", "Use /start e abra pelo botão.");
  const w = tonConnectUI.wallet;
  if (!w?.account?.address) return showToast("Carteira", "Conecte sua carteira para comprar.");

  showToast("Compra", "Preparando pedido...");
  const j = await apiPost(`${API}/api/purchase/create`, { tg_id: tgId, item_id: itemId });
  if (!j.ok) return showToast("Erro", j.error || "Falha ao criar compra");

  const amountNano = String(Math.floor(Number(j.amount_ton) * 1e9));

  try {
    setStatus("warn", "Aguardando assinatura na carteira…");
    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [{ address: j.receiver, amount: amountNano }]
    });
    setStatus("good", "Transação enviada ✅");
    showToast("Pagamento", "Transação enviada.");
  } catch {
    setStatus("bad", "Transação cancelada");
    showToast("Cancelado", "Você cancelou na carteira.");
  } finally {
    await refreshWalletUI();
  }
}

// ✅ Anúncio: start -> abre ad.html com nonce
btnWatchAd.onclick = async () => {
  if (!tgId) return showToast("Abra pelo bot", "Use /start e abra pelo botão.");

  setStatus("warn", "Preparando anúncio…");
  const s = await apiPost(`${API}/api/ad/start`, { tg_id: tgId });

  if (!s.ok) {
    if (s.error === "cooldown") return showToast("Aguarde", `Cooldown: ${s.wait_seconds}s`);
    if (s.error === "daily_limit") return showToast("Limite", `Você já usou ${s.limit} anúncios hoje.`);
    return showToast("Erro", s.error || "Falha ao iniciar anúncio");
  }

  // abre full screen page
  const url = `/webapp/ad.html?tg_id=${encodeURIComponent(tgId)}&nonce=${encodeURIComponent(s.nonce)}&min=${encodeURIComponent(s.min_watch_seconds)}`;
  location.href = url;
};

async function loadAll() {
  setStatus("warn", "Carregando…");
  await refreshWalletUI();
  await loadPool();
  await loadMe();
  await loadItems();
  setStatus("good", "Online");
}

(async function init(){
  await loadAll();
})();
