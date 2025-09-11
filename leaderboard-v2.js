// [LEADERBOARD_QUERY] & [LEADERBOARD_RENDER] – Top 99 com rolagem e auto-detecção Firebase
(function(){
  const DEBUG = !!window.DEBUG_LEADERBOARD;

  function log(){ if (DEBUG) try{ console.log('[LEADERBOARD]', ...arguments); }catch(e){} }
  function warn(){ if (DEBUG) try{ console.warn('[LEADERBOARD]', ...arguments); }catch(e){} }

  // [LEADERBOARD_STYLES] aplica CSS mínimo se não existir
  (function ensureStyles(){
    if (document.getElementById('leaderboard-styles')) return;
    const css = `
      #ranking-list{
        max-height: 300px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      #ranking-list::-webkit-scrollbar{ width: 8px; }
      #ranking-list::-webkit-scrollbar-thumb{ background: #f5d922; border-radius: 6px; }
      #ranking-list::-webkit-scrollbar-track{ background: #333; }
    `;
    const st = document.createElement('style');
    st.id = 'leaderboard-styles';
    st.textContent = css;
    document.head.appendChild(st);
  })();

  function detectBackend(){
    try{
      if (window.firebase){
        // compat v9 fornece API namespaced v8
        if (typeof firebase.firestore === 'function' && firebase.firestore()) return 'firestore';
        if (typeof firebase.database  === 'function' && firebase.database())  return 'realtime';
      }
    }catch(e){}
    return 'unknown';
  }

  // helper para formatar data/hora simples
  function fmt(ts){
    try{
      const d = ts instanceof Date ? ts : new Date(ts);
      const pad = n => String(n).padStart(2,'0');
      return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }catch(e){ return ''; }
  }

  // Consulta Firestore (namespaced compat ou modular detectado via presence)
  async function queryFirestoreTop99(){
    const db = firebase.firestore();
    let q = db.collection('scores');
    // Ordena por score desc e createdAt desc (desempate)
    try{
      q = q.orderBy('score', 'desc').orderBy('createdAt','desc').limit(99);
    }catch(e){
      warn('orderBy composto requer índice. Tentando apenas score desc.', e);
      q = q.orderBy('score','desc').limit(99);
    }
    const snap = await q.get();
    const arr = [];
    snap.forEach(doc=>{
      const v = doc.data() || {};
      arr.push({
        id: doc.id,
        name: v.name || v.displayName || v.nickname || 'Jogador',
        score: Number(v.score||0),
        createdAt: v.createdAt && v.createdAt.toDate ? v.createdAt.toDate() : (v.createdAt || v.ts || v.timestamp || null)
      });
    });
    // caso índice não permita createdAt, ainda garantimos estabilidade usando id/score
    arr.sort((a,b)=>{
      if (b.score !== a.score) return b.score - a.score;
      const at = +new Date(a.createdAt||0), bt = +new Date(b.createdAt||0);
      if (bt !== at) return bt - at;
      return String(a.id).localeCompare(String(b.id));
    });
    return arr.slice(0,99);
  }

  // Consulta Realtime DB: pega os últimos 99 por score asc (limitToLast) e reordena desc
  async function queryRealtimeTop99(){
    const db = firebase.database();
    const ref = db.ref('scores'); // ajusta conforme sua estrutura
    const snap = await ref.orderByChild('score').limitToLast(99).once('value');
    const arr = [];
    snap.forEach(child=>{
      const v = child.val() || {};
      arr.push({
        id: child.key,
        name: v.name || v.displayName || v.nickname || 'Jogador',
        score: Number(v.score||0),
        createdAt: v.createdAt || v.ts || v.timestamp || null
      });
    });
    arr.sort((a,b)=>{
      if (b.score !== a.score) return b.score - a.score;
      const at = +new Date(a.createdAt||0), bt = +new Date(b.createdAt||0);
      if (bt !== at) return bt - at;
      return String(a.id).localeCompare(String(b.id));
    });
    return arr;
  }

  async function fetchTop99(){
    const backend = detectBackend();
    log('Backend detectado:', backend);
    try{
      if (backend === 'firestore') return await queryFirestoreTop99();
      if (backend === 'realtime')  return await queryRealtimeTop99();
      throw new Error('Firebase não detectado.');
    }catch(e){
      warn('Falha na consulta do leaderboard', e);
      throw e;
    }
  }

  // [LEADERBOARD_RENDER]
  function render(list){
    const container = document.getElementById('ranking-list');
    if (!container) return;
    if (!Array.isArray(list)) list = [];

    // remove duplicados por id
    const seen = new Set();
    list = list.filter(it=>{
      if (!it || !it.id) return false;
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });

    container.innerHTML = '';
    if (!list.length){
      container.innerHTML = `<div style="padding:12px;">Sem pontuações ainda. Jogue para entrar no ranking! 🏆</div>`;
      return;
    }

    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.margin = '0';
    ul.style.padding = '0';

    list.forEach((it, idx)=>{
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.padding = '8px 10px';
      li.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
      li.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="width:26px;text-align:right;">${idx+1}º</span>
          <span style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${escapeHtml(it.name)}
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-weight:700;">${it.score}</span>
          <span style="opacity:.7;font-size:11px;">${fmt(it.createdAt)}</span>
        </div>
      `;
      ul.appendChild(li);
    });

    container.appendChild(ul);
  }

  function escapeHtml(str){
    return String(str||'').replace(/[&<>"']/g, s=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[s]);
  }

  async function loadAndRender(){
    try{
      const data = await fetchTop99();
      log('Itens:', data.length);
      render(data);
    }catch(e){
      const container = document.getElementById('ranking-list');
      if (container){
        container.innerHTML = `<div style="padding:12px;color:#f5d922;">Não foi possível carregar o ranking agora. Tente novamente mais tarde.</div>`;
      }
    }
  }

  // Atualiza quando a tela de pontos abrir (se houver botão)
  function attachOpeners(){
    const btn = document.getElementById('open-ranking-btn'); // se existir
    if (btn){
      const open = ()=>{ try{ loadAndRender(); }catch(_e){} };
      btn.addEventListener('click', open, { capture:true });
      btn.addEventListener('touchstart', open, { capture:true });
    }
    // fallback: carrega uma vez após DOM pronto
    loadAndRender();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attachOpeners);
  } else {
    attachOpeners();
  }
})();
