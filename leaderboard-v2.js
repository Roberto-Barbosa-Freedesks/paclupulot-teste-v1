// [LEADERBOARD_QUERY] & [LEADERBOARD_RENDER] Top 99 with scroll and robust detection
(function(){
  const DEBUG = !!window.DEBUG_LEADERBOARD;

  function log(){ if (DEBUG) try{ console.log.apply(console, ["[LEADERBOARD]", ...arguments]); }catch(e){} }
  function warn(){ if (DEBUG) try{ console.warn.apply(console, ["[LEADERBOARD]", ...arguments]); }catch(e){} }

  function detectBackend(){
    try {
      if (window.firebase){
        if (typeof firebase.firestore === "function" && firebase.firestore()) return "firestore";
        if (typeof firebase.database === "function" && firebase.database()) return "realtime";
      }
    } catch(e){}
    return "unknown";
  }

  async function fetchTop99(){
    const backend = detectBackend();
    log("Backend detected:", backend);
    if (backend === "firestore") return fetchTop99Firestore();
    if (backend === "realtime")  return fetchTop99Realtime();
    throw new Error("Firebase backend não detectado.");
  }

  function normalizePlayer(docId, data){
    let score = 0;
    if (data.playersAvatares && typeof data.playersAvatares === "object"){
      score = data.playersAvatares.pontuacaoMaxima || 0;
    } else {
      score = data.pontuacaoMaxima || data.maxScore || data.highScore || data.bestScore || data.score || 0;
    }
    const createdAt = data.createdAt && typeof data.createdAt.toMillis === "function"
        ? data.createdAt.toMillis()
        : (data.createdAt ? (new Date(data.createdAt).getTime() || 0) : 0);

    const name = (data.nome || data.name || data.displayName || "Jogador").toString().trim();
    return { id: docId, name, score: Number(score)||0, createdAt: Number(createdAt)||0 };
  }

  async function fetchTop99Firestore(){
    const db = firebase.firestore();
    // Prefer server-side ordering + limit
    try {
      let q = db.collection("players").orderBy("pontuacaoMaxima", "desc");
      // Secondary tie-breaker if available
      try { q = q.orderBy("createdAt", "desc"); } catch(_e){ /* composed index may be missing; continue */ }
      q = q.limit(99);
      const snap = await q.get();
      const out = [];
      snap.forEach(doc => {
        const d = doc.data() || {};
        out.push(normalizePlayer(doc.id, d));
      });
      return out;
    } catch (e){
      warn("Firestore ordered query failed, falling back to client-side sort.", e);
      // Fallback: fetch all and sort client-side (may be slower)
      const snap = await db.collection("players").get();
      const out = [];
      snap.forEach(doc => out.push(normalizePlayer(doc.id, doc.data()||{})));
      out.sort((a,b)=> (b.score - a.score) || (b.createdAt - a.createdAt) || (a.id<b.id?-1:1));
      return out.slice(0, 99);
    }
  }

  async function fetchTop99Realtime(){
    const db = firebase.database();
    // Try common score fields
    const paths = [
      { key: "pontuacaoMaxima" },
      { key: "score" }
    ];
    let data = null;
    for (const p of paths){
      try {
        const ref = db.ref("players").orderByChild(p.key).limitToLast(99);
        const snap = await ref.once("value");
        data = snap.val();
        if (data){ break; }
      } catch(e){ warn("Realtime try failed for", p.key, e); }
    }
    const out = [];
    if (data){
      Object.keys(data).forEach(id => out.push(normalizePlayer(id, data[id]||{})));
      out.sort((a,b)=> (b.score - a.score) || (b.createdAt - a.createdAt) || (a.id<b.id?-1:1));
      return out.slice(0,99);
    }
    return out;
  }

  function render(list){
    const container = document.getElementById("ranking-list");
    if (!container){ warn("ranking-list container not found"); return; }
    if (!Array.isArray(list) || list.length === 0){
      container.innerHTML = "<p style='font-size:12px'>Sem dados de ranking no momento.</p>";
      return;
    }
    // Deduplicate by id/name+score combo to avoid duplicates
    const seen = new Set();
    const items = [];
    for (const p of list){
      const key = p.id + "|" + p.name + "|" + p.score;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(p);
      if (items.length >= 99) break;
    }
    let html = "<ol style='list-style:none; margin:0; padding:0;'>";
    let pos = 1;
    for (const p of items){
      const readableDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "";
      html += `
        <li style="display:flex;align-items:center;justify-content:space-between;
                   padding:8px 10px;border-bottom:1px solid #222;font-size:14px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="width:28px;text-align:right;color:#888;">${pos}.</span>
            <span style="font-weight:bold;color:#f5d922;">${(p.name||"Jogador").replace(/[<>]/g, "")}</span>
          </div>
          <div>
            <span style="font-weight:bold;color:#FFD700;">${p.score} pts</span>
            ${readableDate ? `<span style="color:#999;font-size:11px;margin-left:8px;">${readableDate}</span>` : ""}
          </div>
        </li>`;
      pos++;
    }
    html += "</ol>";
    container.innerHTML = html;
    log("Rendered", items.length, "players.");
  }

  function ensureStyles(){
    // [LEADERBOARD_STYLES] minimal safety if inline styles are missing
    const css = `#ranking-list{max-height:300px;overflow-y:auto;scrollbar-width:thin}`;
    const el = document.createElement("style");
    el.setAttribute("data-leaderboard-styles","1");
    el.textContent = css;
    document.head.appendChild(el);
  }

  function attach(){
    ensureStyles();
    const btn = document.getElementById("pontos-button");
    const back = document.getElementById("back-to-game-button");
    const screen = document.getElementById("pontos-screen");

    async function openV2(e){
      if (e){ try{ e.preventDefault(); e.stopImmediatePropagation(); }catch(_e){} }
      try{
        if (screen) screen.style.display = "flex";
        // prioritize our rendering
        render([]);
        const list = await fetchTop99();
        render(list);
      }catch(err){
        warn("openV2 failed", err);
        const container = document.getElementById("ranking-list");
        if (container) container.innerHTML = "<p style='font-size:12px'>Ranking temporariamente indisponível.</p>";
      }
    }
    if (btn){
      // Capture-phase handler to override earlier listeners
      btn.addEventListener("click", openV2, { capture: true });
      btn.addEventListener("touchstart", openV2, { capture: true });
    }
    if (back){
      back.addEventListener("click", function(){ if (screen) screen.style.display = "none"; }, { capture: true });
      back.addEventListener("touchstart", function(){ if (screen) screen.style.display = "none"; }, { capture: true });
    }
    log("Leaderboard v2 attached.");
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();