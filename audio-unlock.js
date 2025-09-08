// [AUDIO_INIT] Global Audio Manager for Mobile Unlock (iOS/Android/Safari/Chrome)
(function(){
  if (window.__paclupuloAudio) return; // don't recreate

  const DEBUG_AUDIO = !!window.DEBUG_AUDIO;

  function log(){ if (DEBUG_AUDIO) try{ console.log.apply(console, ["[AUDIO]", ...arguments]); }catch(e){} }
  function warn(){ if (DEBUG_AUDIO) try{ console.warn.apply(console, ["[AUDIO]", ...arguments]); }catch(e){} }

  const Ctx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let masterGain = null;
  let bgmSource = null;
  let unlocked = false;
  let htmlAudio = null; // Fallback unlock via <audio> for iOS HTMLAudio policies

  function ensureContext(){
    if (!Ctx) { warn("AudioContext not supported, relying on HTMLAudio unlock only."); return null; }
    if (!ctx){
      ctx = new Ctx({ latencyHint: "interactive" });
      masterGain = ctx.createGain();
      masterGain.gain.value = 1.0;
      masterGain.connect(ctx.destination);
      log("AudioContext created.");
    }
    return ctx;
  }

  async function silentPrimeWebAudio(){
    try {
      const ac = ensureContext();
      if (!ac) return true;
      if (ac.state === "suspended") { await ac.resume(); }
      // Play an ultra-short silent buffer to unlock
      const buf = ac.createBuffer(1, 1, ac.sampleRate);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(masterGain);
      src.start(0);
      log("Silent buffer played for unlock.");
      return true;
    } catch (e){
      warn("silentPrimeWebAudio error:", e);
      return false;
    }
  }

  async function silentPrimeHTMLAudio(){
    try {
      if (!htmlAudio){
        htmlAudio = document.createElement("audio");
        htmlAudio.setAttribute("preload", "auto");
        htmlAudio.src = "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQACcQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; // tiny silent mp3
      }
      await htmlAudio.play().catch(()=>{});
      if (!htmlAudio.paused) { htmlAudio.pause(); htmlAudio.currentTime = 0; }
      log("HTMLAudio silent prime attempted.");
      return true;
    } catch(e){
      warn("silentPrimeHTMLAudio error:", e);
      return false;
    }
  }

  async function unlockOnce(){
    if (unlocked) return;
    try{
      await silentPrimeWebAudio();
      await silentPrimeHTMLAudio();
      unlocked = true;
      window.removeEventListener("pointerdown", unlockOnce, true);
      window.removeEventListener("touchstart", unlockOnce, true);
      window.removeEventListener("click", unlockOnce, true);
      log("Audio unlocked.");
    }catch(e){ warn("unlockOnce failed", e); }
  }

  function attachUnlockers(){
    // Use capture:true so we run before other handlers on buttons like "Iniciar"
    window.addEventListener("pointerdown", unlockOnce, { passive: true, capture: true });
    window.addEventListener("touchstart", unlockOnce, { passive: true, capture: true });
    window.addEventListener("click", unlockOnce, { passive: true, capture: true });
    // Custom hooks used by the game code
    window.addEventListener("gameaudio-prime-request", unlockOnce, { capture: true });
    log("Unlock listeners attached.");
  }

  // [AUDIO_PLAY] Central helpers (non-invasive: some legacy code may keep using HTMLAudio)
  async function playSfx(buffer){
    try{
      const ac = ensureContext();
      if (!ac) return;
      if (ac.state === "suspended") await ac.resume();
      const src = ac.createBufferSource();
      src.buffer = buffer;
      src.connect(masterGain);
      src.start();
      return true;
    }catch(e){ warn("playSfx error:", e); return false; }
  }

  function setVolume(v){
    try{ if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v)); }catch(e){}
  }

  async function playBgm(url, options){
    try{
      const loop = options && options.loop === true;
      const ac = ensureContext();
      if (!ac) return;
      if (ac.state === "suspended") await ac.resume();
      if (bgmSource) { try{ bgmSource.stop(); }catch(_e){}; bgmSource.disconnect(); bgmSource = null; }
      const resp = await fetch(url);
      const arr = await resp.arrayBuffer();
      const buf = await ac.decodeAudioData(arr);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = loop;
      src.connect(masterGain);
      src.start(0);
      bgmSource = src;
      log("BGM started", url, "loop:", loop);
    }catch(e){ warn("playBgm error:", e); }
  }

  function stopBgm(){
    if (bgmSource){ try{ bgmSource.stop(); }catch(e){}; bgmSource.disconnect(); bgmSource = null; }
  }

  function silence(mute){
    if (masterGain) { masterGain.gain.value = mute ? 0 : 1; }
  }

  // [AUDIO_VISIBILITY] Resume on visibility/page events
  document.addEventListener("visibilitychange", async function(){
    try{
      if (!document.hidden){
        const ac = ensureContext();
        if (ac && ac.state === "suspended") await ac.resume();
        if (!unlocked) { await unlockOnce(); }
        log("Visibility change -> resumed");
      } else {
        // optional: lower volume when hidden
      }
    }catch(e){ warn("visibilitychange error:", e); }
  }, { capture: true });

  window.addEventListener("pageshow", async function(){
    try{
      const ac = ensureContext();
      if (ac && ac.state === "suspended") await ac.resume();
      if (!unlocked) await unlockOnce();
    }catch(e){ warn("pageshow resume error:", e); }
  }, { capture: true });

  // Expose minimal API
  window.__paclupuloAudio = {
    get context(){ return ensureContext(); },
    unlock: unlockOnce,
    playSfx,
    playBgm,
    stopBgm,
    silence,
    setVolume,
    _debugLog: log
  };

  // [AUDIO_UNLOCK] attach unlock routine
  attachUnlockers();

  // Export a convenience method the game already calls
  window.primeGameAudio = unlockOnce;
})();