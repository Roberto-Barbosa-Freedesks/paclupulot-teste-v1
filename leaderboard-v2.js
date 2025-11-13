// [LEADERBOARD_QUERY] & [LEADERBOARD_RENDER] – Top 99 com rolagem e auto-detecção Firebase
(function(){
  const DEBUG = !!window.DEBUG_LEADERBOARD;
  const state = { inflight: null, lastData: [] };

  function log(){ if (DEBUG) try{ console.log('[LEADERBOARD]', ...arguments); }catch(e){} }
  function warn(){ if (DEBUG) try{ console.warn('[LEADERBOARD]', ...arguments); }catch(e){} }

  // [LEADERBOARD_STYLES] aplica CSS mínimo se não existir
  (function ensureStyles(){
    if (document.getElementById('leaderboard-styles')) return;
    const css = `
      #ranking-list{
        max-height: min(420px, 60vh);
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        scrollbar-width: thin;
      }
      #ranking-list::-webkit-scrollbar{ width: 8px; }
      #ranking-list::-webkit-scrollbar-thumb{ background: #f5d922; border-radius: 6px; }
      #ranking-list::-webkit-scrollbar-track{ background: #333; }
      #ranking-list .leaderboard-status{
        padding: 12px;
        font-size: 12px;
        color: #f5d922;
        text-align: center;
      }
    `;
    const st = document.createElement('style');
    st.id = 'leaderboard-styles';
    st.textContent = css;
    document.head.appendChild(st);
  })();

  function getContainer(){
    return document.getElementById('ranking-list');
  }

  function setStatus(message){
    const container = getContainer();
    if (!container) return;
    container.innerHTML = `<div class="leaderboard-status">${escapeHtml(message || 'Carregando ranking...')}</div>`;
  }

  function detectBackend(){
    try{
      if (window.firebase){
        if (typeof firebase.firestore === 'function') return 'firestore';
        if (typeof firebase.database  === 'function') return 'realtime';
      }
    }catch(e){}
    return 'unknown';
  }

  function toDate(input){
    if (!input) return null;
    if (input instanceof Date) return input;
    if (typeof input.toDate === 'function') return input.toDate();
    if (typeof input === 'number'){
      const d = new Date(input);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function sanitizeName(name){
    const safe = String(name || 'Jogador').replace(/\s+/g, ' ').trim();
    return safe || 'Jogador';
  }

  function pickScore(){
    const keys = ['pontuacaoMaxima','pontuacao','maxScore','highScore','bestScore','score','totalScore'];
    for (let i=0;i<arguments.length;i++){
      const source = arguments[i];
      if (!source || typeof source !== 'object') continue;
      for (const key of keys){
        const val = source[key];
        if (typeof val === 'number' && !Number.isNaN(val)){
          return val;
        }
      }
    }
    return 0;
  }

  function normalizeDoc(id, raw){
    const scope = raw && typeof raw === 'object' && raw.playersAvatares && typeof raw.playersAvatares === 'object'
      ? raw.playersAvatares
      : raw;
    const score = pickScore(scope, raw);
    const created = toDate(scope && scope.createdAt) || toDate(raw && raw.createdAt) ||
      toDate(scope && scope.dataUltimoPlay) || toDate(raw && raw.dataUltimoPlay) ||
      toDate(scope && scope.updatedAt) || toDate(raw && raw.updatedAt);
    return {
      id: id || (raw && raw.uid) || Math.random().toString(36).slice(2),
      name: sanitizeName(raw && (raw.nome || raw.name || raw.displayName || raw.nickname)),
      score: Number.isFinite(score) ? score : 0,
      createdAt: created
    };
  }

  function finalizeList(list){
    const seen = new Set();
    const filtered = list.filter(item=>{
      if (!item || !Number.isFinite(item.score)) return false;
      const key = item.id || `${item.name}-${item.score}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    filtered.sort((a,b)=>{
      if (b.score !== a.score) return b.score - a.score;
      const at = a.createdAt ? a.createdAt.getTime() : 0;
      const bt = b.createdAt ? b.createdAt.getTime() : 0;
      if (bt !== at) return bt - at;
      return String(a.id||'').localeCompare(String(b.id||''));
    });
    return filtered.slice(0,99);
  }

  // Consulta Firestore (namespaced compat)
  async function queryFirestoreTop99(){
    const db = firebase.firestore();
    const attempts = [
      { collection: 'players', field: 'pontuacaoMaxima' },
      { collection: 'players', field: 'score' },
      { collection: 'scores', field: 'score' }
    ];
    let lastError = null;
    for (const attempt of attempts){
      try{
        let ref = db.collection(attempt.collection);
        if (!ref) continue;
        let query = ref;
        if (attempt.field){
          query = ref.orderBy(attempt.field, 'desc').limit(120);
        } else {
          query = ref.limit(120);
        }
        const snap = await query.get();
        const list = [];
        snap.forEach(doc=>{ list.push(normalizeDoc(doc.id, doc.data())); });
        return finalizeList(list);
      }catch(err){
        lastError = err;
        warn('Firestore leaderboard fallback', attempt, err);
      }
    }
    if (lastError) throw lastError;
    return [];
  }

  // Consulta Realtime DB
  async function queryRealtimeTop99(){
    const db = firebase.database();
    const paths = ['players','scores'];
    for (const path of paths){
      const ref = db.ref(path);
      const snap = await ref.orderByChild('pontuacaoMaxima').limitToLast(120).once('value');
      if (!snap || !snap.exists()) continue;
      const arr = [];
      snap.forEach(child=>{
        arr.push(normalizeDoc(child.key, child.val()));
      });
      if (arr.length) return finalizeList(arr);
    }
    return [];
  }

  async function fetchTop99(){
    const backend = detectBackend();
    log('Backend detectado:', backend);
    if (backend === 'firestore') return queryFirestoreTop99();
    if (backend === 'realtime')  return queryRealtimeTop99();
    throw new Error('Firebase não detectado.');
  }

  // [LEADERBOARD_RENDER]
  function render(list){
    const container = getContainer();
    if (!container) return;
    if (!Array.isArray(list) || !list.length){
      container.innerHTML = `<div class="leaderboard-status">Sem pontuações registradas ainda. Jogue para aparecer aqui! 🏆</div>`;
      return;
    }
    container.innerHTML = '';
    const ul = document.createElement('ul');
    ul.setAttribute('role','list');
    ul.style.listStyle = 'none';
    ul.style.margin = '0';
    ul.style.padding = '0';
    const frag = document.createDocumentFragment();
    list.forEach((item, idx)=>{
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.padding = '8px 10px';
      li.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
      const dateLabel = item.createdAt ? fmt(item.createdAt) : '';
      li.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="width:30px;text-align:right;">${idx+1}º</span>
          <span style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.name)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-weight:700;">${item.score}</span>
          ${dateLabel ? `<span style="opacity:.7;font-size:11px;">${dateLabel}</span>` : ''}
        </div>`;
      frag.appendChild(li);
    });
    ul.appendChild(frag);
    container.appendChild(ul);
  }

  function escapeHtml(str){
    return String(str||'').replace(/[&<>"']/g, s=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'
    })[s]);
  }

  // helper para formatar data/hora simples
  function fmt(ts){
    try{
      const d = ts instanceof Date ? ts : new Date(ts);
      const pad = n => String(n).padStart(2,'0');
      return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }catch(e){ return ''; }
  }

  async function loadAndRender(){
    if (state.inflight) return state.inflight;
    setStatus('Carregando ranking...');
    state.inflight = (async ()=>{
      try{
        const data = await fetchTop99();
        log('Itens carregados:', data.length);
        state.lastData = data;
        render(data);
        return data;
      }catch(err){
        warn('Falha ao carregar leaderboard', err);
        setStatus('Ranking temporariamente indisponível. Tente novamente em instantes.');
        throw err;
      }finally{
        state.inflight = null;
      }
    })();
    return state.inflight;
  }

  function attachOpeners(){
    const ids = ['pontos-button','open-ranking-btn'];
    ids.forEach(id=>{
      const btn = document.getElementById(id);
      if (!btn || btn.__leaderboardAttached) return;
      const handler = ()=>{ try{ loadAndRender(); }catch(_e){} };
      btn.addEventListener('click', handler, {capture:false});
      btn.__leaderboardAttached = true;
    });
  }

  function init(){
    attachOpeners();
    window.addEventListener('leaderboard:refresh', ()=>{ try{ loadAndRender(); }catch(_e){} });
    // carrega uma vez em background (não bloqueia overlay)
    setTimeout(()=>{ try{ loadAndRender(); }catch(_e){} }, 0);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__paclupuloLeaderboard = {
    refresh: ()=> loadAndRender(),
    setLoading: ()=> setStatus('Carregando ranking...'),
    getCached: ()=> state.lastData ? state.lastData.slice() : []
  };
})();
