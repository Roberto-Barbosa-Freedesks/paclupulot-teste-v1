// audio-unlock.js — Desbloqueio robusto e NÃO intrusivo de áudio (iOS/Android/Desktop)
(function(){
  'use strict';

  var PRIMED = false;
  var PRIMING = false;

  function silentUnlock(){
    if (PRIMED || PRIMING) return;
    PRIMING = true;
    try {
      // Reproduz um áudio silencioso 1x para liberar a origem (iOS/Android)
      var a = document.createElement('audio');
      // data URI de 0.05s de silêncio PCM → mp3 (curta, inaudível)
      a.src = "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
      a.setAttribute('playsinline','');
      a.setAttribute('webkit-playsinline','');
      a.muted = true;
      a.volume = 0.0;
      var done = function(){
        try{ a.pause(); }catch(e){}
        PRIMED = true; PRIMING = false;
        try{ window.dispatchEvent(new Event('gameaudio-primed')); }catch(e){}
      };
      var p = a.play();
      if (p && typeof p.then === 'function') {
        p.then(done).catch(function(){ PRIMED = true; PRIMING = false; });
      } else {
        // navegadores antigos
        setTimeout(done, 50);
      }
    } catch(e){
      PRIMED = true; PRIMING = false;
    }
  }

  function bindOnce(){
    if (PRIMED) return;
    ['pointerdown','touchstart','mousedown','keydown'].forEach(function(ev){
      window.addEventListener(ev, silentUnlock, { once: true, capture: true, passive: true });
    });
    window.addEventListener('gameaudio-prime-request', silentUnlock, { capture: true });
    window.addEventListener('gameaudio-ready', silentUnlock, { capture: true });
    window.addEventListener('focus', silentUnlock, { capture: true });
    window.addEventListener('pageshow', silentUnlock, { capture: true });
    document.addEventListener('visibilitychange', function(){
      if (!document.hidden) silentUnlock();
    }, { capture: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindOnce, { once: true });
  } else {
    bindOnce();
  }
})();

// === Pac‑Lúpulo: priming dos sons reais do jogo (HTMLAudio) ===
(function(){
  var GAME_AUDIO_PRIMED = false;

  function primeGameAudio(){
    if (GAME_AUDIO_PRIMED) return;

    try {
      var mgr = (typeof window !== 'undefined') ? window.__paclupuloAudio : null;
      // Além disso, prime o <audio id="bg-music"> se existir
      var bg = (typeof document !== 'undefined') ? document.getElementById('bg-music') : null;

      // Se o gerenciador ainda não existe, tente novamente mais tarde
      if (!mgr && !bg) return;

      // Função para prime de um único elemento <audio>
      function primeElement(el){
        try {
          if (!el) return;
          // Play muted for unlock, then pause and reset
          var prevMuted = el.muted;
          el.muted = true;
          var p = el.play();
          if (p && p.catch) { p.catch(function(){}); }
          // pause logo após o frame atual
          setTimeout(function(){
            try { el.pause(); } catch(e){}
            try { el.currentTime = 0; } catch(e){}
            el.muted = prevMuted;
          }, 0);
        } catch (e) {}
      }

      // Prime todos os sons do gerenciador
      if (mgr && typeof mgr === 'object') {
        try {
          Object.keys(mgr).forEach(function(k){
            try {
              var t = mgr[k];
              if (!t || !t.audio) return;
              primeElement(t.audio);
            } catch(e){}
          });
        } catch(e){}
      }

      // Prime também a trilha de fundo do <audio id="bg-music">
      if (bg) primeElement(bg);

      GAME_AUDIO_PRIMED = true;
      try { window.__PAC_GAME_AUDIO_PRIMED__ = true; } catch(e){}
    } catch (err) {}
  }

  // Executa o prime quando:
  // 1) houver um gesto do usuário (disparado por pacman.js via 'gameaudio-prime-request')
  // 2) quando o gerenciador de áudio estiver pronto ('gameaudio-ready')
  // 3) ao voltar para a aba (pageshow/visibilitychange)
  function primingEntryPoint(){
    try { primeGameAudio(); } catch(e){}
  }

  window.addEventListener('gameaudio-prime-request', primingEntryPoint, { capture: true });
  window.addEventListener('gameaudio-ready', primingEntryPoint, { capture: true });
  window.addEventListener('pageshow', primingEntryPoint, { capture: true });
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) primingEntryPoint();
  }, { capture: true });
})();

