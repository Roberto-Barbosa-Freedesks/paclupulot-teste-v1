// audio-unlock.js — Desbloqueio de áudio no iOS/Safari e retomada por gesto
(function(){
  'use strict';
  function unlockOnce() {
    try {
      const el = document.getElementById('bg-music');
      if (el) {
        const p = el.play();
        if (p && typeof p.catch === 'function') p.catch(()=>{});
      }
    } catch(e){}
    document.removeEventListener('touchstart', unlockOnce, true);
    document.removeEventListener('click', unlockOnce, true);
    document.removeEventListener('keydown', unlockOnce, true);
  }
  window.addEventListener('load', function(){
    // Ouve o primeiro gesto do usuário para liberar o áudio
    document.addEventListener('touchstart', unlockOnce, { once:true, capture:true });
    document.addEventListener('click', unlockOnce, { once:true, capture:true });
    document.addEventListener('keydown', unlockOnce, { once:true, capture:true });
    // Retoma ao voltar para a aba/app
    document.addEventListener('visibilitychange', function(){
      try {
        if (!document.hidden) {
          const el = document.getElementById('bg-music');
          if (el && el.paused) { el.play().catch(()=>{}); }
        }
      } catch(e){}
    });
  });
})();