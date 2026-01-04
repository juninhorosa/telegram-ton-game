// webapp/app.js
// UI + API do jogo + anúncio externo com recompensa ao voltar pro Telegram

const API = ""; // mesmo domínio (Render). Mantém vazio.

let tgId = "";
let state = {
  user: { tg_id: "", points: 0 },
  inventory: [],
  pool: { pool_points_total: 0, pool_points_distributed: 0, updated_at: null },
  ads: {
    watched_today: 0,
    daily_limit: 10,
    cooldown_seconds: 60,
    min_watch_seconds: 20,
    last_watch_at: null
  },
  items: []
};

// ----------------- Helpers -----------------
const $ = (id) => document.getElementById(id);

function fmtInt(n) {
  const x = Number(n || 0);
  return x.toLocaleString("pt-PT");
}

function setStatus(type, text) {
  const el = $("statusBar");
  if (!el) return;
  el.textContent = text || "";
  el.dataset.type = type || "ok";
}

function showToast(title, msg) {
  const t = $("toast");
  const tt = $("toastTitle");
  const tm = $("toastMsg");
  if (!t || !tt || !tm) return alert(`${title}\n${msg}`);
  tt.textContent = title || "";
  tm.textContent = msg || "";
  t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("show"), 3200);
}

async function apiGet(path) {
  const r = await fetch(`${API}${path}`, { method: "GET" });
  return r.json();
}
async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  return r.json();
}

// ----------------- Render UI -----------------
function renderHeader() {
  $("pointsValue").textContent = fmtInt(state.user.points);
  $("tgidValue").textContent = state.user.tg_id;

  $("adsTodayValue").textContent = `${state.ads.watched_today}/${state.ads.daily_limit}`;
  $("poolTotalValue").textContent = fmtInt(state.pool.pool_points_total);
  $("poolDistValue").textContent = fmtInt(state.pool.pool_points_distributed);
}

function renderInventory() {
  const wrap = $("inventoryList");
  if (!wrap) return;
  wrap.innerHTML = "";

  if (!state.inventory || state.inventory.length === 0) {
    wrap.innerHTML = `<div class="empty">Sem itens ainda.</div>`;
    return;
  }

  for (const it of state.inventory) {
    const exp = it.expires_at ? new Date(it.expires_at.replace(" ", "T") + "Z") : null;
    const expText = exp ? `Expira: ${exp.toLocaleString("pt-PT")}` : "Sem expiração";

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="row">
        <div class="title">${it.name}</div>
        <div class="pill">x${fmtInt(it.quantity)}</div>
      </div>
      <div class="sub">
        <div>+${fmtInt(it.points_per_day)} pts/dia</div>
        <div>Boost Ads: +${fmtInt(it.ad_boost_pct)}%</div>
      </div>
      <div class="muted">${expText}</div>
    `;
    wrap.appendChild(card);
  }
}

function renderShop() {
  const wrap = $("shopList");
  if (!wrap) return;
  wrap.innerHTML = "";

  const items = state.items || [];
  if (items.length === 0) {
    wrap.innerHTML = `<div class="empty">Sem packs disponíveis.</div>`;
    return;
  }

  for (const it of items) {
    const isFree = Number(it.price_ton) <= 0;
    const card = document.createElement("div");
    card.className = "card shop";

    card.innerHTML = `
      <div class="row">
        <div class="title">${it.name}</div>
        <div class="pill">${isFree ? "GRÁTIS" : `${it.price_ton} TON`}</div>
      </div>
      <div class="sub">
        <div>+${fmtInt(it.points_per_day)} pts/dia</div>
        <div>Boost Ads: +${fmtInt(it.ad_boost_pct)}%</div>
      </div>
      <button class="btn ${isFree ? "btnDisabled" : ""}" ${isFree ? "disabled" : ""} data-buy="${it.id}">
        ${isFree ? "Já incluso (Trial)" : "Comprar com TON"}
      </button>
      <div class="muted">Limite Ads/dia (máx pelo seu inventário): ${fmtInt(it.max_ads_per_day)}</div>
    `;

    wrap.appendChild(card);
  }

  // handlers
  wrap.querySelectorAll("[data-buy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-buy"));
      await buyItem(id);
    });
  });
}

// ----------------- Load all -----------------
async function loadAll() {
  setStatus("warn", "Carregando…");

  const [me, items, pool] = await Promise.all([
    apiGet(`/api/me?tg_id=${encodeURIComponent(tgId)}`),
    apiGet(`/api/items`),
    apiGet(`/api/pool`)
  ]);

  if (!me.ok) {
    setStatus("bad", "Erro ao carregar usuário");
    showToast("Erro", me.error || "Falha");
    return;
  }

  state.user = me.user;
  state.inventory = me.inventory || [];
  state.ads = me.ads || state.ads;

  state.items = items.ok ? (items.items || []) : [];
  state.pool = pool.ok ? (pool.pool || state.pool) : state.pool;

  renderHeader();
  renderInventory();
  renderShop();

  setStatus("ok", "Pronto ✅");
}

// ----------------- Ad pending claim (fix principal) -----------------
async function checkPendingAd() {
  try {
    const raw = localStorage.getItem("ad_pending");
    if (!raw) return;

    const p = JSON.parse(raw);
    if (!p?.nonce || !p?.tg_id) return;

    // Só tenta se for o mesmo usuário
    if (String(p.tg_id) !== String(tgId)) return;

    const min = Number(p.min || state.ads.min_watch_seconds || 20);
    const openedAt = Number(p.openedAt || 0);
    if (!openedAt) return;

    const elapsed = (Date.now() - openedAt) / 1000;
    const left = Math.ceil(min - elapsed);

    if (left > 0) {
      setStatus("warn", `Aguarde ${left}s para liberar o prêmio do anúncio…`);
      clearTimeout(checkPendingAd._t);
      checkPendingAd._t = setTimeout(() => checkPendingAd(), Math.min(2000, left * 1000));
      return;
    }

    setStatus("warn", "Confirmando prêmio do anúncio…");
    const r = await apiPost(`/api/ad/claim`, { tg_id: tgId, nonce: p.nonce });

    if (!r.ok) {
      // too_fast: aguarda e tenta de novo
      if (r.error === "too_fast") {
        setStatus("warn", "Aguarde mais alguns segundos…");
        clearTimeout(checkPendingAd._t);
        checkPendingAd._t = setTimeout(() => checkPendingAd(), 2000);
        return;
      }

      // not_opened ou erro => limpa
      localStorage.removeItem("ad_pending");
      setStatus("bad", "Não foi possível liberar o prêmio");
      showToast("Anúncio", "Falhou: " + (r.error || "erro"));
      return;
    }

    localStorage.removeItem("ad_pending");
    showToast("✅ Prêmio liberado", `+${fmtInt(r.user_share_points)} pts`);
    await loadAll();
  } catch (e) {
    console.log("checkPendingAd error:", e);
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") checkPendingAd();
});
window.addEventListener("focus", () => checkPendingAd());

// ----------------- Watch Ad flow -----------------
async function startAd() {
  setStatus("warn", "Preparando anúncio…");

  const s = await apiPost(`/api/ad/start`, { tg_id: tgId });

  if (!s.ok) {
    if (s.error === "cooldown") return showToast("Aguarde", `Cooldown: ${s.wait_seconds}s`);
    if (s.error === "daily_limit") return showToast("Limite diário", `Limite: ${s.limit}`);
    return showToast("Erro", s.error || "Falha ao iniciar anúncio");
  }

  // abre a tela de anúncio (ela salva ad_pending no localStorage e o GAME faz claim quando voltar)
  const url = `/webapp/ad.html?tg_id=${encodeURIComponent(tgId)}&nonce=${encodeURIComponent(s.nonce)}&min=${encodeURIComponent(s.min_watch_seconds)}`;
  location.href = url;
}

// ----------------- Buy flow (TON) -----------------
async function buyItem(itemId) {
  try {
    setStatus("warn", "Gerando pagamento TON…");
    const r = await apiPost(`/api/purchase/create`, { tg_id: tgId, item_id: itemId });

    if (!r.ok) {
      setStatus("bad", "Falha no pagamento");
      return showToast("Pagamento", r.error || "Erro ao criar compra");
    }

    // Aqui você integra seu TonConnect / TON deep link.
    // Por enquanto, só mostra dados para o usuário.
    setStatus("ok", "Pagamento criado");
    showToast("TON", `Enviar ${r.amount_ton} TON para:\n${r.receiver}\n\nDepois confirme no sistema.`);
  } catch (e) {
    setStatus("bad", "Erro");
    showToast("Erro", String(e?.message || e));
  }
}

// ----------------- Init -----------------
function init() {
  // pega tg_id da URL
  const params = new URLSearchParams(location.search);
  tgId = params.get("tg_id") || "";

  if (!tgId) {
    setStatus("bad", "Abra pelo bot do Telegram");
    showToast("Erro", "tg_id ausente. Use /start e abra pelo botão do bot.");
    return;
  }

  // botão watch ad
  const btnWatch = $("btnWatchAd");
  if (btnWatch) btnWatch.addEventListener("click", startAd);

  // fechar toast
  const toastClose = $("toastClose");
  if (toastClose) toastClose.addEventListener("click", () => $("toast").classList.remove("show"));

  loadAll().then(() => checkPendingAd());
}

init();
