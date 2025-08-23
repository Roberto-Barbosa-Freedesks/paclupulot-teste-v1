// audio-unlock.js — Desbloqueio de áudio no iOS/Safari e retomada por gesto
(function(){
  'use strict';

  var __primeRequested = false;
  var __primed = false;

  function primeGameSounds(){
    __primeRequested = true;
    try {
      const a = (typeof window !== 'undefined') ? (window.__paclupuloAudio || window.audio || null) : null;
      if (!a) return;
      for (var k in a) {
        if (!Object.prototype.hasOwnProperty.call(a,k)) continue;
        if (k === 'silence' || k === 'ghostReset') continue;
        const tr = a[k];
        if (tr && typeof tr.play === 'function') {
          try { tr.play(true); if (typeof tr.stopLoop === 'function') tr.stopLoop(true); } catch(e){}
        }
      }
      __primed = true;
    } catch(e){}
  }

  function isGameRunning(){ try { return !!window.__gameRunning; } catch(e){ return false; } }

  function unlockOnce() {
    try { primeGameSounds(); } catch(e){}
    document.removeEventListener('touchstart', unlockOnce, true);
    document.removeEventListener('click', unlockOnce, true);
    document.removeEventListener('keydown', unlockOnce, true);
  }

  try { window.primeGameAudio = primeGameSounds; } catch(e){}

  window.addEventListener('load', function(){
    window.addEventListener('gameaudio-ready', function(){
      if (__primeRequested && !__primed) { try{ primeGameSounds(); }catch(e){} }
    });
    document.addEventListener('touchstart', unlockOnce, { once:true, capture:true });
    document.addEventListener('click',      unlockOnce, { once:true, capture:true });
    document.addEventListener('keydown',    unlockOnce, { once:true, capture:true });
    document.addEventListener('visibilitychange', function(){
      try {
        if (!document.hidden && !isGameRunning()) {
          if (!__primed) primeGameSounds();
        }
      } catch(e){}
    });
  });
})();