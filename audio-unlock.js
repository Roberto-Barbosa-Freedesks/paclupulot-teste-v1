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