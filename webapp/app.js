const params = new URLSearchParams(location.search);
const tgId = params.get('tg_id'); // vem do /start
const API_BASE = location.origin;

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  // manifest de exemplo. Depois podemos criar o seu próprio manifest.
  manifestUrl: 'https://raw.githubusercontent.com/ton-community/tutorials/main/tonconnect-manifest.json'
});

const elStatus = document.getElementById('status');
const elMe = document.getElementById('me');
const elInv = document.getElementById('inv');
const elItems = document.getElementById('items');

function setStatus(t){ elStatus.textContent = t; }

document.getElementById('connect').onclick = async () => {
  await tonConnectUI.connectWallet();
  setStatus('Carteira conectada ✅');
};

async function loadMe(){
  const r = await fetch(`${API_BASE}/api/me?tg_id=${encodeURIComponent(tgId)}`);
  const j = await r.json();
  if(!j.ok){ elMe.textContent = 'Erro ao carregar perfil'; return; }

  elMe.innerHTML = `🆔 ${j.user.tg_id}<br>⭐ Pontos: <b>${j.user.points}</b>`;

  if(!j.inventory.length){
    elInv.innerHTML = '<i>Sem itens ainda.</i>';
  } else {
    elInv.innerHTML = '<b>Inventário</b><br>' + j.inventory.map(it =>
      `• ${it.name} x${it.quantity} ( +${it.points_per_day}/dia )`
    ).join('<br>');
  }
}

async function loadItems(){
  const r = await fetch(`${API_BASE}/api/items`);
  const j = await r.json();
  if(!j.ok){ elItems.textContent = 'Erro ao carregar itens'; return; }

  elItems.innerHTML = '';
  j.items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <b>${item.name}</b><br>
      💎 Preço: <b>${item.price_ton} TON</b><br>
      ⭐ Pontos/dia: <b>${item.points_per_day}</b><br><br>
      <button data-buy="${item.id}">Comprar</button>
    `;
    elItems.appendChild(div);
  });

  document.querySelectorAll('[data-buy]').forEach(btn => {
    btn.onclick = () => buyItem(btn.getAttribute('data-buy'));
  });
}

async function buyItem(itemId){
  if(!tgId){ alert('Sem tg_id (abra pelo /start no bot)'); return; }

  // 1) cria purchase
  const r = await fetch(`${API_BASE}/api/purchase/create`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ tg_id: tgId, item_id: Number(itemId) })
  });
  const j = await r.json();
  if(!j.ok){ alert('Erro ao criar compra: ' + j.error); return; }

  // 2) envia transação via TON Connect
  setStatus('Enviando transação...');
  const amountNano = String(Math.floor(Number(j.amount_ton) * 1e9));

  const tx = {
    validUntil: Math.floor(Date.now()/1000) + 600,
    messages: [
      {
        address: j.receiver,
        amount: amountNano
        // Podemos adicionar payload depois (comentário), mas já funciona assim
      }
    ]
  };

  let result;
  try{
    result = await tonConnectUI.sendTransaction(tx);
  }catch(e){
    setStatus('Transação cancelada.');
    return;
  }

  // result tem o "boc" e não necessariamente hash direto.
  // Algumas carteiras devolvem info diferente. Vamos pedir o hash ao usuário se necessário.
  // Porém, geralmente o usuário consegue pegar o hash no histórico da carteira.
  setStatus('Transação enviada. Agora confirme...');

  const txHash = prompt('Cole aqui o TX HASH (da carteira TON) para confirmar:');
  if(!txHash){ setStatus('Sem hash, não deu para confirmar.'); return; }

  // 3) confirma no backend
  setStatus('Confirmando on-chain...');
  const r2 = await fetch(`${API_BASE}/api/purchase/confirm`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ tg_id: tgId, purchase_id: j.purchase_id, tx_hash: txHash })
  });
  const j2 = await r2.json();

  if(!j2.ok){
    setStatus('Falha: ' + j2.error);
    alert('Falha ao confirmar: ' + (j2.error || 'erro'));
    return;
  }

  setStatus('✅ Compra confirmada!');
  await loadMe();
}

(async function init(){
  if(!tgId){
    setStatus('Abra pelo bot (/start).');
  } else {
    setStatus('Pronto.');
  }
  await loadMe();
  await loadItems();
})();
