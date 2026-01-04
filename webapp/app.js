const API = "";
let tgId = "";

const AD_LINKS = [
  "https://www.effectivegatecpm.com/uxsrj9n2h?key=48b82410e36175baaf64291fbcb2f0ce"
];

const $ = (id) => document.getElementById(id);
const setText = (id, txt) => { const el = $(id); if (el) el.textContent = String(txt ?? ""); };

function setStatus(type, text){
  const el = $("statusBar");
  if (!el) return;
  el.dataset.type = type || "ok";
  el.textContent = text || "";
}

function showToast(title, msg){
  const t = $("toast");
  const tt = $("toastTitle");
  const tm = $("toastMsg");
  if (!t || !tt || !tm) return alert(`${title}\n${msg}`);
  tt.textContent = title;
  tm.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>t.classList.remove("show"), 4000);
}

async function fetchJson(url, opts={}, timeoutMs=12000){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), timeoutMs);
  try{
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const txt = await r.text();
    let j; try{ j = JSON.parse(txt); } catch { j = { ok:false, error:"invalid_json", raw:txt }; }
    return j;
  } finally { clearTimeout(t); }
}
async function apiGet(path){ return fetchJson(`${API}${path}`, { method:"GET" }); }
async function apiPost(path, body){
  return fetchJson(`${API}${path}`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body||{})
  });
}
function fmtInt(n){ return Number(n||0).toLocaleString("pt-PT"); }
function pickAd(){ return AD_LINKS[Math.floor(Math.random()*AD_LINKS.length)]; }

function openExternal(url){
  try{
    if (window.Telegram?.WebApp?.openLink){
      Telegram.WebApp.openLink(url, { try_instant_view:false });
      return;
    }
  } catch {}
  window.open(url, "_blank");
}

// ---------- Tabs ----------
function setupTabs(){
  document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.getAttribute("data-tab");
      document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
      const panel = document.getElementById(`tab-${key}`);
      if (panel) panel.classList.add("active");
    });
  });
}

// ---------- Render ----------
function renderInventory(inv){
  const wrap = $("inventoryList");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (!inv?.length){
    wrap.innerHTML = `<div class="muted">Sem mineiros ainda.</div>`;
    return;
  }
  inv.forEach(it=>{
    const d = document.createElement("div");
    d.className = "miniCard";
    d.innerHTML = `
      <div class="row">
        <div class="title">${it.name}</div>
        <div class="pill">x${fmtInt(it.quantity)}</div>
      </div>
      <div class="muted">+${fmtInt(it.points_per_day)} pts/dia</div>
      <div class="muted">${it.expires_at ? "Expira: " + it.expires_at : "Sem expiração"}</div>
    `;
    wrap.appendChild(d);
  });
}

function renderShop(items){
  const wrap = $("shopList");
  if (!wrap) return;
  wrap.innerHTML = "";

  items.forEach(it=>{
    const d = document.createElement("div");
    d.className = "miniCard";
    const isTrial = it.sku === "TRIAL_MINER";
    d.innerHTML = `
      <div class="row">
        <div class="title">${it.name}</div>
        <div class="pill">${isTrial ? "Ativação por anúncios" : `${it.price_ton} TON`}</div>
      </div>
      <div class="muted">+${fmtInt(it.points_per_day)} pts/dia</div>
      ${isTrial ? `<div class="muted">Veja 5 anúncios para ativar (dura 1 dia).</div>` : `<button class="btn" data-buy="${it.id}">💎 Comprar com TON</button>`}
    `;
    wrap.appendChild(d);
  });

  wrap.querySelectorAll("[data-buy]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const itemId = Number(btn.getAttribute("data-buy"));
      await buyWithTon(itemId);
    });
  });
}

function renderMe(me){
  setText("pointsValue", fmtInt(me.user.points));
  setText("tgidValue", me.user.tg_id);
  setText("refCodeValue", me.user.referral_code || "—");

  setText("poolTodayValue", fmtInt(me.today.pool_points_today));
  setText("myPartValue", fmtInt(me.today.my_participation));

  setText("prodDay", fmtInt(me.stats.production_per_day || 0));
  setText("shopWallet", me.shop_wallet || "—");

  // Trial
  setText("trialProg", `${me.trial.progress || 0}`);
  setText("trialStatus", me.trial.active ? `ATIVO até ${me.trial.active_until}` : "Bloqueado");
}

// ---------- Load ----------
async function loadAll(){
  setStatus("warn","Carregando…");
  const [me, items] = await Promise.all([
    apiGet(`/api/me?tg_id=${encodeURIComponent(tgId)}`),
    apiGet(`/api/items`)
  ]);

  if (!me.ok){
    setStatus("bad","Erro ao carregar");
    showToast("API /api/me", me.error || "falha");
    return;
  }

  renderMe(me);
  renderInventory(me.inventory || []);

  if (items.ok) renderShop(items.items || []);
  else showToast("API /api/items", items.error || "falha");

  setStatus("ok","Pronto ✅");
}

// ---------- Ad flow (SEM trocar tela) ----------
async function startAdDirect(){
  setStatus("warn","Preparando anúncio…");
  const s = await apiPost(`/api/ad/start`, { tg_id: tgId });
  if (!s.ok){
    setStatus("bad","Falha no anúncio");
    return showToast("Anúncio", s.error || "erro");
  }

  // marca opened imediatamente (pois vamos abrir o link agora)
  await apiPost(`/api/ad/opened`, { tg_id: tgId, nonce: s.nonce });

  localStorage.setItem("ad_pending", JSON.stringify({
    tg_id: tgId,
    nonce: s.nonce,
    min: Number(s.min_watch_seconds || 20),
    openedAt: Date.now()
  }));

  setStatus("ok","Anúncio aberto — volte depois ✅");
  openExternal(pickAd());
}

async function checkPendingAd(){
  try{
    const raw = localStorage.getItem("ad_pending");
    if (!raw) return;

    const p = JSON.parse(raw);
    if (!p?.nonce || String(p.tg_id)!==String(tgId)) return;

    const min = Math.max(10, Number(p.min||20));
    const openedAt = Number(p.openedAt||0);
    if (!openedAt) return;

    const elapsed = (Date.now()-openedAt)/1000;
    const left = Math.ceil(min - elapsed);

    if (left > 0){
      setStatus("warn", `Aguarde ${left}s para liberar o prêmio…`);
      clearTimeout(checkPendingAd._t);
      checkPendingAd._t = setTimeout(checkPendingAd, 1500);
      return;
    }

    setStatus("warn","Confirmando prêmio…");
    const r = await apiPost(`/api/ad/claim`, { tg_id: tgId, nonce: p.nonce });

    if (!r.ok){
      if (r.error === "too_fast"){
        clearTimeout(checkPendingAd._t);
        checkPendingAd._t = setTimeout(checkPendingAd, 2000);
        return;
      }
      localStorage.removeItem("ad_pending");
      setStatus("bad","Não liberou");
      showToast("Anúncio", "Falhou: "+(r.error||"erro"));
      return;
    }

    localStorage.removeItem("ad_pending");
    showToast("✅ Recompensa", r.trial_activated ? "Você ativou o Trial Miner (1 dia)!" : "+1 ponto e +1 no pool.");
    await loadAll();
  } catch(e){
    console.log(e);
  }
}

document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") checkPendingAd(); });
window.addEventListener("focus", ()=>checkPendingAd());

// ---------- TON purchase ----------
async function buyWithTon(itemId){
  setStatus("warn","Gerando pagamento TON…");
  const r = await apiPost(`/api/purchase/create`, { tg_id: tgId, item_id: itemId });
  if (!r.ok){
    setStatus("bad","Erro no pagamento");
    return showToast("Loja", r.error || "erro");
  }

  showToast("Pagar com TON", `Abrindo carteira…\nValor: ${r.amount_ton} TON\nComentário: ${r.comment}`);
  setStatus("ok","Abrindo TON…");

  // abre link ton://transfer
  openExternal(r.ton_url);

  // dica
  setTimeout(()=>showToast("Depois do pagamento", "O item será liberado após confirmação no painel admin."), 1200);
}

// ---------- Init ----------
(function init(){
  setupTabs();
  const params = new URLSearchParams(location.search);
  tgId = params.get("tg_id") || "";
  if (!tgId){
    setStatus("bad","Abra pelo bot");
    showToast("Erro","tg_id ausente");
    return;
  }

  const btn = $("btnWatchAd");
  if (btn) btn.addEventListener("click", startAdDirect);

  const close = $("toastClose");
  if (close) close.addEventListener("click", ()=>$("toast")?.classList.remove("show"));

  loadAll().then(checkPendingAd);
})();
