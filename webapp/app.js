// ========= Helpers UI =========
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

// ========= Telegram WebApp (opcional) =========
try {
  if (window.Telegram?.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
  }
} catch {}

// ========= App =========
const params = new URLSearchParams(location.search);
const tgId = params.get("tg_id");
const API = location.origin;

// TON Connect
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  // Manifest público de exemplo (depois criamos o seu)
  manifestUrl: "https://raw.githubusercontent.com/ton-community/tutorials/main/tonconnect-manifest.json"
});

function shortAddr(a) {
  if (!a) return "";
  return a.slice(0, 4) + "…" + a.slice(-4);
}

async function refreshWalletUI() {
  try {
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
      setStatus("warn", "Online • Conecte sua carteira");
    }
  } catch {
    walletStatus.textContent = "—";
  }
}

btnConnect.onclick = async () => {
  try {
    await tonConnectUI.connectWallet();
    await refreshWalletUI();
    showToast("Carteira", "Conectada com sucesso.");
  } catch (e) {
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

// ========= Data loaders =========
async function apiGet(url) {
  const r = await fetch(url);
  const j = await r.json();
  return j;
}

async function apiPost(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  return j;
}

async function loadMe() {
  if (!tgId) {
    profileArea.innerHTML = `<div style="color:rgba(234,240,255,.75);font-size:13px">
      Abra pelo bot (<b>/start</b>) para carregar seu perfil.
    </div>`;
    pointsValue.textContent = "—";
    userIdMini.textContent = "ID: —";
    invCount.textContent = "—";
    inventoryArea.innerHTML = "";
    return null;
  }

  const j = await apiGet(`${API}/api/me?tg_id=${encodeURIComponent(tgId)}`);
  if (!j.ok) {
    profileArea.innerHTML = `<div style="color:rgba(255,77,77,.9);font-size:13px">
      Não foi possível carregar o perfil.
    </div>`;
    return null;
  }

  pointsValue.textContent = String(j.user.points ?? 0);
  userIdMini.textContent = `ID: ${j.user.tg_id}`;

  // Inventory
  const inv = j.inventory || [];
  const total = inv.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
  invCount.textContent = String(total);

  profileArea.innerHTML = `
    <div style="font-weight:900;font-size:14px">Seu progresso</div>
    <div style="margin-top:6px;color:rgba(234,240,255,.75);font-size:12px;line-height:1.4">
      Pontos acumulam com base nos itens ativos no inventário.
    </div>
  `;

  if (!inv.length) {
    inventoryArea.innerHTML = `
      <div style="color:rgba(234,240,255,.75);font-size:12px">
        Você ainda não tem itens. Compre na loja para começar.
      </div>
    `;
  } else {
    inventoryArea.innerHTML = inv.map(it => `
      <div class="invrow">
        <div class="left">
          <div class="nm">${escapeHtml(it.name)}</div>
          <div class="ds">+${it.points_per_day}/dia • Quantidade ativa</div>
        </div>
        <div class="qty">x${it.quantity}</div>
      </div>
    `).join("");
  }

  return j;
}

async function loadItems() {
  const j = await apiGet(`${API}/api/items`);
  if (!j.ok) {
    shopArea.innerHTML = `<div style="color:rgba(255,77,77,.9);font-size:13px">
      Erro ao carregar a loja.
    </div>`;
    return [];
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
          <div class="actions">
            <button class="btn primary full" data-buy="${item.id}">
              Comprar agora
            </button>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  // Bind buy buttons (por enquanto só placeholder - conectamos pagamento na próxima etapa)
  document.querySelectorAll("[data-buy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const itemId = Number(btn.getAttribute("data-buy"));
      await buyFlow(itemId);
    });
  });

  return items;
}

// ====== Compra (placeholder UX) ======
// Se você quiser, já conecto com TON Connect e confirmação on-chain no próximo passo.
async function buyFlow(itemId) {
  if (!tgId) return showToast("Abra pelo bot", "Use /start e abra o app pelo botão.");

  const w = tonConnectUI.wallet;
  if (!w?.account?.address) {
    showToast("Carteira", "Conecte sua carteira para comprar.");
    return;
  }

  // Cria purchase no backend (vai retornar receiver + amount)
  showToast("Compra", "Preparando pedido...");
  const j = await apiPost(`${API}/api/purchase/create`, { tg_id: tgId, item_id: itemId });

  if (!j.ok) {
    showToast("Erro", "Não foi possível criar a compra.");
    return;
  }

  // Aqui envia transação TON (valor em nanoTON)
  const amountNano = String(Math.floor(Number(j.amount_ton) * 1e9));

  try {
    setStatus("warn", "Aguardando assinatura na carteira…");
    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [{ address: j.receiver, amount: amountNano }]
    });

    setStatus("warn", "Transação enviada. Confirme o TX hash…");
    const txHash = prompt("Cole o TX HASH da transação (na tua carteira TON) para confirmar:");
    if (!txHash) {
      setStatus("warn", "Sem hash para confirmar.");
      return;
    }

    setStatus("warn", "Confirmando on-chain…");
    const c = await apiPost(`${API}/api/purchase/confirm`, {
      tg_id: tgId,
      purchase_id: j.purchase_id,
      tx_hash: txHash
    });

    if (!c.ok) {
      setStatus("bad", "Falha na confirmação.");
      showToast("Falhou", `Erro: ${c.error || "confirmação"}`);
      return;
    }

    setStatus("good", "Compra confirmada ✅");
    showToast("Sucesso", "Item liberado no inventário!");
    await loadMe();

  } catch (e) {
    setStatus("bad", "Transação cancelada.");
    showToast("Cancelado", "Você cancelou na carteira.");
  } finally {
    await refreshWalletUI();
  }
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
