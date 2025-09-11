// [AUDIO_INIT] Singleton de AudioContext + buses (master/sfx/bgm) com desbloqueio robusto para iOS/Android/Desktop
(function(){
  if (window.__paclupuloAudioV2) return; // evita recriar

  const DEBUG = !!window.DEBUG_AUDIO;
  const Ctx = window.AudioContext || window.webkitAudioContext;

  function log(){ if (DEBUG) try{ console.log('[AUDIO]', ...arguments); }catch(e){} }
  function warn(){ if (DEBUG) try{ console.warn('[AUDIO]', ...arguments); }catch(e){} }

  // Contexto e buses
  let ctx = null;
  let masterGain = null, sfxGain = null, bgmGain = null;
  const mediaMap = new Map(); // id -> {el,node,channel}
  let unlocked = false;
  let unlocking = false;
  let lastUnlockTs = 0;

  function ensureCtx(){
    if (!Ctx){ warn('AudioContext não disponível.'); return null; }
    if (!ctx){
      ctx = new Ctx({latencyHint:'interactive'});
      masterGain = ctx.createGain(); masterGain.gain.value = 1.0; masterGain.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 1.0; sfxGain.connect(masterGain);
      bgmGain = ctx.createGain(); bgmGain.gain.value = 1.0; bgmGain.connect(masterGain);
      ctx.onstatechange = ()=> log('state:', ctx.state);
      log('AudioContext criado.');
    }
    return ctx;
  }

  // desbloqueio
  async function unlockOnce(){
    const t = Date.now();
    if (unlocking || (t - lastUnlockTs) < 120) return unlocked;
    lastUnlockTs = t;
    unlocking = true;
    try{
      const c = ensureCtx();
      if (!c) return false;
      if (c.state === 'suspended' || c.state === 'interrupted'){
        log('Tentando resume()...');
        try{ await c.resume(); }catch(e){ warn('resume() falhou', e); }
      }
      // Prime: buffer silencioso
      try{
        const buf = c.createBuffer(1, 1, c.sampleRate);
        const src = c.createBufferSource(); src.buffer = buf;
        src.connect(masterGain);
        try{ src.start(0); }catch(_){}
      }catch(e){ warn('prime buffer falhou', e); }
      // Prime: oscillator
      try{
        const osc = c.createOscillator();
        const gn = c.createGain(); gn.gain.value = 0.00001;
        osc.frequency.value = 20; osc.connect(gn); gn.connect(masterGain);
        try{ osc.start(); osc.stop(c.currentTime + 0.02); }catch(_){}
      }catch(e){ /* ignore */ }
      unlocked = (c.state === 'running');
      if (!unlocked){ try{ await c.resume(); unlocked = (c.state === 'running'); }catch(_){} }
      log('Audio desbloqueado?', unlocked);
      window.dispatchEvent(new Event('audio:unlocked'));
      return unlocked;
    }finally{
      unlocking = false;
    }
  }

  // Lifecycle
  function attachLifecycle(){
    const tryResume = ()=> unlockOnce();
    document.addEventListener('visibilitychange', ()=>{
      if (document.visibilityState === 'visible') tryResume();
    }, {capture:true});
    window.addEventListener('pageshow', tryResume, {capture:true});
    window.addEventListener('focus', tryResume, {capture:true});
  }

  // Gestos (não removidos)
  function attachGestureUnlockers(){
    const handler = ()=> unlockOnce();
    ['pointerdown','touchstart','click','keydown'].forEach(evt=>{
      document.addEventListener(evt, handler, {capture:true, passive:true});
    });
  }

  // Registrar elemento <audio> no grafo
  function registerMediaElement(el, channel='sfx'){
    if (!el || !ensureCtx()) return;
    const id = el.id || el.src || Math.random().toString(36).slice(2);
    if (mediaMap.has(id)) return;
    try{
      const node = ctx.createMediaElementSource(el);
      const dest = (String(channel).toLowerCase()==='bgm') ? bgmGain : sfxGain;
      node.connect(dest);
      mediaMap.set(id, {el, node, channel});
      log('registrado', id, channel);
    }catch(e){ if (DEBUG) console.warn('[AUDIO] registerMediaElement erro/duplicado', e); }
  }

  // Auto-scan de <audio> tags para categorizar sfx vs bgm
  function autoRegisterAll(){
    const els = Array.from(document.querySelectorAll('audio'));
    els.forEach(el=>{
      const tag = (el.getAttribute('data-audio')||'').toLowerCase();
      let ch = null;
      if (tag==='bgm') ch = 'bgm';
      else if (tag==='sfx') ch = 'sfx';
      else {
        const id = (el.id||'').toLowerCase();
        ch = (id.includes('bgm')||id.includes('music')) ? 'bgm' : 'sfx';
      }
      registerMediaElement(el, ch);
    });
  }

  // Patching HTMLMediaElement.play()
  (function patchHTMLMediaElementPlay(){
    try{
      const proto = HTMLMediaElement.prototype;
      if (!proto.__paclupuloPatched){
        const original = proto.play;
        proto.play = function(...args){
          try{ unlockOnce(); }catch(_){}
          this.setAttribute('playsinline','');
          if (this.muted) this.muted = false;
          return original.apply(this, args).catch(err=>{
            if (DEBUG) console.warn('[AUDIO] native play() catch', this.id||this.src||this);
            throw err;
          });
        };
        proto.__paclupuloPatched = true;
        log('HTMLMediaElement.play patch aplicado');
      }
    }catch(e){ /* ignore */ }
  })();

  // API pública
  const api = {
    ensureCtx,
    unlock: unlockOnce,
    playElementAudioById: async function(id, {loop=false, volume=1.0, channel='sfx'}={}){
      try{
        await unlockOnce();
        const el = document.getElementById(id);
        if (!el) return;
        el.loop = !!loop;
        el.volume = Math.max(0, Math.min(1, volume));
        el.muted = false;
        el.setAttribute('playsinline','');
        el.preload = el.preload || 'auto';
        registerMediaElement(el, channel);
        try{ if (el.readyState < 2) el.load(); }catch(_){}
        await el.play().catch(err=>{ warn('play() catch', id, err); });
      }catch(e){ warn('playElementAudioById', id, e); }
    },
    pauseElementAudioById: async function(id){
      try{
        const el = document.getElementById(id);
        if (!el) return;
        el.pause();
      }catch(e){ warn('pauseElementAudioById', id, e); }
    },
    setMasterVolume(v){ try{ masterGain.gain.value = Math.max(0,Math.min(1,Number(v)||0)); }catch(_){} },
    setSfxVolume(v){ try{ sfxGain.gain.value = Math.max(0,Math.min(1,Number(v)||0)); }catch(_){}} ,
    setBgmVolume(v){ try{ bgmGain.gain.value = Math.max(0,Math.min(1,Number(v)||0)); }catch(_){}} ,
    // silencia todos os elementos registrados (e reinicia currentTime a menos que noResetTime)
    silence(noResetTime){
      try{
        for (const {el} of mediaMap.values()){
          try{
            el.pause();
            if (!noResetTime){ el.currentTime = 0; }
          }catch(_){ }
        }
      }catch(e){ warn('silence erro', e); }
    }
  };

  window.__paclupuloAudioV2 = api;
  // compat legado: mantém o primeiro que existir
  if (!window.__paclupuloAudio){
    window.__paclupuloAudio = api;
  }
  window.primeGameAudio = unlockOnce;

  // hook para audio legado (pacman-original)
  function hookLegacyAudio(){
    try{
      const legacy = window.__paclupuloAudio;
      if (!legacy || legacy.__legacyHooked) return;
      legacy.__legacyHooked = true;
      // registra cada track
      Object.keys(legacy).forEach(key=>{
        try{
          const track = legacy[key];
          if (track && track.audio && track.audio instanceof HTMLAudioElement){
            const ch = (key.toLowerCase().includes('music') || key.toLowerCase().includes('bgm')) ? 'bgm' : 'sfx';
            registerMediaElement(track.audio, ch);
          }
        }catch(_){}
      });
      // define silence se não existir
      if (typeof legacy.silence !== 'function'){
        legacy.silence = function(noResetTime){ api.silence(noResetTime); };
      }
      log('Legacy audio hook completo.');
    }catch(e){ warn('hookLegacyAudio erro', e); }
  }
  window.addEventListener('gameaudio-ready', hookLegacyAudio);
  // fallback: se legacy já existe, tenta hookar imediatamente
  if (typeof window.__paclupuloAudio !== 'undefined'){
    try{ hookLegacyAudio(); }catch(_e){}
  }

  // init
  ensureCtx();
  attachLifecycle();
  attachGestureUnlockers();
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', autoRegisterAll, {once:true});
  } else {
    autoRegisterAll();
  }
  log('audio-unlock V3 carregado.');
})();
