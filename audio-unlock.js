// [AUDIO_INIT] cria/reusa AudioContext + master gain (compat iOS/Android/Desktop)
(function(){
  if (window.__paclupuloAudio) return;

  const DEBUG_AUDIO = !!window.DEBUG_AUDIO;
  const Ctx = window.AudioContext || window.webkitAudioContext;

  function dlog(){ if (DEBUG_AUDIO) try{ console.log('[AUDIO]', ...arguments); }catch(e){} }
  function dwarn(){ if (DEBUG_AUDIO) try{ console.warn('[AUDIO]', ...arguments); }catch(e){} }

  let ctx = null;
  let masterGain = null;
  let unlocked = false;
  let unlocking = false;

  // mantém referência para não coletar
  let _silentBuf = null;

  function ensureCtx(){
    if (!ctx && Ctx){
      ctx = new Ctx();
      masterGain = ctx.createGain();
      masterGain.gain.value = 1.0;
      masterGain.connect(ctx.destination);
      dlog('AudioContext criado.', ctx.state);
    }
    return ctx;
  }

  // Cria um buffer silencioso curtíssimo (prime de iOS)
  function createSilentBuffer(){
    try{
      const c = ensureCtx();
      if (!c) return null;
      const buf = c.createBuffer(1, 1, c.sampleRate);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(masterGain);
      _silentBuf = { src, when: c.currentTime };
      return _silentBuf;
    }catch(e){
      dwarn('Falha ao criar silent buffer', e);
      return null;
    }
  }

  async function resumeCtx(){
    try{
      const c = ensureCtx();
      if (!c) return false;
      if (c.state === 'suspended' || c.state === 'interrupted'){
        dlog('Tentando resume()...');
        await c.resume();
      }
      dlog('Estado do contexto:', c.state);
      return c.state === 'running';
    }catch(e){
      dwarn('resume falhou', e);
      return false;
    }
  }

  // [AUDIO_UNLOCK] rotina de desbloqueio por gesto
  async function unlockOnce(){
    if (unlocked || unlocking) return unlocked;
    unlocking = true;
    try{
      const ok = await resumeCtx();
      // toca 1 frame silencioso para "fixar" o pipeline no iOS
      const sb = createSilentBuffer();
      if (sb && sb.src.start){
        try{ sb.src.start(0); }catch(e){}
      }
      unlocked = ok || true; // mesmo se resume reportar 'running' diferente, já criamos nós e tocamos silêncio
      dlog('Audio desbloqueado?', unlocked);
      window.dispatchEvent(new Event('audio:unlocked'));
      return unlocked;
    } catch(e){
      dwarn('unlockOnce erro', e);
      return false;
    } finally {
      unlocking = false;
    }
  }

  // [AUDIO_PLAY] utilitários centralizados para SFX/BGM baseados em elementos <audio> existentes
  // Mantemos compatibilidade: se o projeto usa <audio id="...">, apenas garante play() confiável.
  async function playElementAudioById(id, {loop=false, volume=1.0}={}){
    try{
      const el = document.getElementById(id);
      if (!el) return;
      el.loop = !!loop;
      el.volume = Math.max(0, Math.min(1, volume));
      if (el.muted) el.muted = false;
      // alguns navegadores exigem load() antes do play após unlock
      if (el.readyState < 2){
        try{ el.load(); }catch(_){}
      }
      await el.play().catch(err => { if (DEBUG_AUDIO) console.warn('[AUDIO] play() catch', id, err); });
    }catch(e){ dwarn('playElementAudioById', id, e); }
  }

  async function pauseElementAudioById(id){
    try{
      const el = document.getElementById(id);
      if (!el) return;
      el.pause();
    }catch(e){ dwarn('pauseElementAudioById', id, e); }
  }

  // [AUDIO_VISIBILITY] retoma em visibilitychange/pageshow/focus
  function attachVisibilityHandlers(){
    function tryResume(){ unlockOnce(); }
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'visible'){ tryResume(); }
    }, { capture: true });
    window.addEventListener('pageshow', tryResume, { capture: true });
    window.addEventListener('focus', tryResume, { capture: true });
  }

  // Anexa listeners de primeiro gesto (pointerdown/touchstart/click)
  function attachUnlockers(){
    const handler = function(){
      unlockOnce();
      // remove após primeiro gesto
      document.removeEventListener('pointerdown', handler, true);
      document.removeEventListener('touchstart', handler, true);
      document.removeEventListener('click', handler, true);
    };
    document.addEventListener('pointerdown', handler, { passive: true, capture: true });
    document.addEventListener('touchstart', handler, { passive: true, capture: true });
    document.addEventListener('click', handler, { passive: true, capture: true });
    attachVisibilityHandlers();
  }

  // API pública mínima
  window.__paclupuloAudio = {
    ensureCtx,
    unlock: unlockOnce,
    playElementAudioById,
    pauseElementAudioById
  };

  // Exporta atalho esperado por outros scripts
  window.primeGameAudio = unlockOnce;

  // inicia listeners
  attachUnlockers();

  dlog('Audio manager carregado.');
})();
