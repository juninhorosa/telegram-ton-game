// webapp/app.js (anti-trava + mostra erro real)

const API = ""; // mesmo domínio
let tgId = "";

let state = {
  user: { tg_id: "", points: 0 },
  inventory: [],
  pool: { pool_points_total: 0, pool_points_distributed: 0, updated_at: null },
  ads: { watched_today: 0, daily_limit: 10, cooldown_seconds: 60, min_watch_seconds: 20, last_watch_at: null },
  items: []
};

// ---------- Safe DOM ----------
const $ = (id) => document.getElementById(id);
const setText = (id, text) => { const el = $(id); if (el) el.textContent = String(text ?? ""); };
const setHTML = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };

function fmtInt(n) {
  const x = Number(n || 0);
  return x.toLocaleString("pt-PT");
}

function setStatus(type, text) {
  const el = $("statusBar");
  if (!el) return; // não trava se não existir
  el.textContent = text || "";
  el.dataset.type = type || "ok";
}

function showToast(title, msg) {
  const t = $("toast");
  const tt = $("toastTitle");
  const tm = $("toastMsg");
  if (!t || !tt || !tm) {
    alert(`${title}\n${msg}`);
    return;
  }
  tt.textContent = title || "";
  tm.textContent = msg || "";
  t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("show"), 3500);
}

// ---------- Fetch with timeout ----------
async function fetchJson(url, opts = {}, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const txt = await r.text();
    let json;
    try { json = JSON.parse(txt); } catch { json = { ok: false, error: "invalid_json", raw: txt }; }
    return { status: r.status, json };
  } finally {
    clearTimeout(t);
  }
}

async function apiGet(path) {
  const { status, json } = await fetchJson(`${API}${path}`, { method: "GET" });
  if (!json || typeof json !== "object") return { ok: false, error: "bad_response", status };
  return json;
}

async function apiPost(path, body) {
  const { status, json } = await fetchJson(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  if (!json || typeof json !== "object") return { ok: false, error: "bad_response", status };
  return json;
}

// ---------- Render ----------
function renderHeader() {
  setText("pointsValue", fmtInt(state.user.points));
  setText("tgidValue", state.user.tg_id);
  setText("adsTodayValue", `${state.ads.watched_today}/${state.ads.daily_limit}`);
  setText("poolTotalValue", fmtInt(state.pool.pool_points_total));
  setText("poolDistValue", fmtInt(state.pool.pool_points_distributed));
}

function renderInventory() {
  const wrap = $("inventoryList");
  if (!wrap) return;
  wrap.innerHTML = "";

  if (!state.inventory?.length) {
    wrap.innerHTML = `<div class="empty">Sem itens ainda.</div>`;
    return;
  }

  for (const it of state.inventory) {
    const card = document.createElement("div");
    card.className = "card";
    const expText = it.expires_at ? `Expira: ${it.expires_at}` : "Sem expiração";

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
  if (!items.length) {
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
    `;

    wrap.appendChild(card);
  }

  wrap.querySelectorAll("[data-buy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-buy"));
      await buyItem(id);
    });
  });
}

// ---------- Load all ----------
async function loadAll() {
  try {
    setStatus("warn", "Carregando…");

    const [me, items, pool] = await Promise.all([
      apiGet(`/api/me?tg_id=${encodeURIComponent(tgId)}`),
      apiGet(`/api/items`),
      apiGet(`/api/pool`)
    ]);

    if (!me?.ok) {
      setStatus("bad", "Erro ao carregar usuário");
      showToast("API /api/me", (me?.error || "falha") + (me?.details ? `\n${me.details}` : ""));
      return;
    }

    state.user = me.user;
    state.inventory = me.inventory || [];
    state.ads = me.ads || state.ads;

    if (!items?.ok) {
      showToast("API /api/items", items?.error || "falha");
    } else {
      state.items = items.items || [];
    }

    if (!pool?.ok) {
      showToast("API /api/pool", pool?.error || "falha");
    } else {
      state.pool = pool.pool || state.pool;
    }

    renderHeader();
    renderInventory();
    renderShop();

    setStatus("ok", "Pronto ✅");
  } catch (e) {
    setStatus("bad", "Falha ao carregar");
    showToast("Erro", e?.name === "AbortError" ? "Timeout na API (12s)" : String(e?.message || e));
  }
}

// ---------- Pending ad claim (ao voltar) ----------
async function checkPendingAd() {
  try {
    const raw = localStorage.getItem("ad_pending");
    if (!raw) return;

    const p = JSON.parse(raw);
    if (!p?.nonce || !p?.tg_id) return;
    if (String(p.tg_id) !== String(tgId)) return;

    const min = Number(p.min || state.ads.min_watch_seconds || 20);
    const openedAt = Number(p.openedAt || 0);
    if (!openedAt) return;

    const elapsed = (Date.now() - openedAt) / 1000;
    const left = Math.ceil(min - elapsed);

    if (left > 0) {
      setStatus("warn", `Aguarde ${left}s para liberar o prêmio do anúncio…`);
      clearTimeout(checkPendingAd._t);
      checkPendingAd._t = setTimeout(checkPendingAd, Math.min(2000, left * 1000));
      return;
    }

    setStatus("warn", "Confirmando prêmio do anúncio…");
    const r = await apiPost(`/api/ad/claim`, { tg_id: tgId, nonce: p.nonce });

    if (!r.ok) {
      if (r.error === "too_fast") {
        setStatus("warn", "Aguarde mais alguns segundos…");
        clearTimeout(checkPendingAd._t);
        checkPendingAd._t = setTimeout(checkPendingAd, 2000);
        return;
      }
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

// ---------- Start Ad ----------
async function startAd() {
  setStatus("warn", "Preparando anúncio…");
  const s = await apiPost(`/api/ad/start`, { tg_id: tgId });

  if (!s.ok) {
    if (s.error === "cooldown") return showToast("Aguarde", `Cooldown: ${s.wait_seconds}s`);
    if (s.error === "daily_limit") return showToast("Limite diário", `Limite: ${s.limit}`);
    return showToast("Erro", s.error || "Falha ao iniciar anúncio");
  }

  location.href = `/webapp/ad.html?tg_id=${encodeURIComponent(tgId)}&nonce=${encodeURIComponent(s.nonce)}&min=${encodeURIComponent(s.min_watch_seconds)}`;
}

// ---------- Buy (placeholder) ----------
async function buyItem(itemId) {
  setStatus("warn", "Gerando pagamento TON…");
  const r = await apiPost(`/api/purchase/create`, { tg_id: tgId, item_id: itemId });

  if (!r.ok) {
    setStatus("bad", "Falha no pagamento");
    return showToast("Pagamento", r.error || "Erro ao criar compra");
  }

  setStatus("ok", "Pagamento criado");
  showToast("TON", `Enviar ${r.amount_ton} TON para:\n${r.receiver}`);
}

// ---------- Init ----------
function init() {
  const params = new URLSearchParams(location.search);
  tgId = params.get("tg_id") || "";

  if (!tgId) {
    setStatus("bad", "Abra pelo bot do Telegram");
    showToast("Erro", "tg_id ausente. Use /start e abra pelo botão do bot.");
    return;
  }

  const btnWatch = $("btnWatchAd");
  if (btnWatch) btnWatch.addEventListener("click", startAd);

  const toastClose = $("toastClose");
  if (toastClose) toastClose.addEventListener("click", () => $("toast")?.classList.remove("show"));

  loadAll().then(checkPendingAd);
}

init();
