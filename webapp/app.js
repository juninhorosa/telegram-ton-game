const $ = (id) => document.getElementById(id);

const statusDot = $("statusDot");
const statusText = $("statusText");

const pointsValue = $("pointsValue");
const userIdMini = $("userIdMini");
const invCount = $("invCount");
const walletStatus = $("walletStatus");

const shopArea = $("shopArea");
const profileArea = $("profileArea");
const inventoryArea = $("inventoryArea");

const btnConnect = $("btnConnect");
const btnRefresh = $("btnRefresh");
const btnOpenHelp = $("btnOpenHelp");

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

try {
  if (window.Telegram?.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
  }
} catch {}

const params = new URLSearchParams(location.search);
const tgId = params.get("tg_id");
const API = location.origin;

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
    setStatus("good", "Online • Carteira conectada");
  } else {
    walletStatus.textContent = "Não conectada";
    btnConnect.textContent = "🔗 Conectar carteira";
    btnConnect.className = "btn primary";
    setStatus("warn", tgId ? "Online • Conecte sua carteira" : "Abra pelo bot (/start)");
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
  showToast("Como funciona", "Você compra itens que geram pontos. Sem promessa de retorno fixo. Regras e resgates dependem do pool.");
};

async function apiGet(url) {
  const r = await fetch(url);
  return await r.json();
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
    profileArea.innerHTML = `<span style="color:#ff6b6b"><b>Não foi possível carregar o perfil.</b></span>`;
    return;
  }

  pointsValue.textContent = String(j.user.points ?? 0);
  userIdMini.textContent = `ID: ${j.user.tg_id}`;

  const inv = j.inventory || [];
  const total = inv.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
  invCount.textContent = String(total);

  profileArea.innerHTML = `<b>Seu progresso</b><br><span style="opacity:.8">Itens ativos geram pontos diariamente.</span>`;

  if (!inv.length) {
    inventoryArea.innerHTML = `<span style="opacity:.8">Você ainda não tem itens. Compre na loja para começar.</span>`;
  } else {
    inventoryArea.innerHTML = inv.map(it => `
      <div class="invrow">
        <div>
          <div class="nm">${escapeHtml(it.name)}</div>
          <div class="ds">+${it.points_per_day}/dia • Ativo</div>
        </div>
        <div class="qty">x${it.quantity}</div>
      </div>
    `).join("");
  }
}

async function loadItems() {
  const j = await apiGet(`${API}/api/items`);
  if (!j.ok) {
    shopArea.innerHTML = `<span style="color:#ff6b6b"><b>Erro ao carregar a loja.</b></span>`;
    return;
  }

  const items = j.items || [];
  shopArea.innerHTML = `
    <div class="shop">
      ${items.map(item => `
        <div class="item">
          <div class="name">${escapeHtml(item.name)}</div>
          <div class="meta">
            <span class="badge">💎 ${item.price_ton} TON</span>
            <span class="badge">⭐ +${item.points_per_day}/dia</span>
          </div>
          <div style="margin-top:10px">
            <button class="btn primary full" disabled>Comprar (próxima etapa)</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadAll() {
  setStatus("warn", "Carregando…");
  await refreshWalletUI();
  await loadMe();
  await loadItems();
  setStatus("good", "Online");
}

(async function init(){
  await loadAll();
})();
