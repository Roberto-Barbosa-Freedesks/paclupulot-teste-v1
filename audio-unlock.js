(function(){
  'use strict';

  // CHATGPT PATCH: Prime de todos os sons do jogo (desbloqueio por gesto)
  function primeGameSounds(){
    try {
      const a = (typeof window !== 'undefined') ? window.audio : null; // 'audio' é global do pacman-original.js
      if (!a) return;
      for (var k in a) {
        if (!Object.prototype.hasOwnProperty.call(a,k)) continue;
        if (k === 'silence' || k === 'ghostReset') continue;
        const tr = a[k];
        if (tr && typeof tr.play === 'function') {
          try {
            // play/stop rápido apenas para "liberar" o elemento de áudio no iOS
            tr.play(true);
            if (typeof tr.stopLoop === 'function') tr.stopLoop(true);
          } catch(e){}
        }
      }
    } catch(e){}
  }

  function isGameRunning(){
    try { return !!window.__gameRunning; } catch(e){ return false; }
  }

  function unlockOnce() {
    try {
      const el = document.getElementById('bg-music');
      if (el && !isGameRunning()) {
        const p = el.play();
        if (p && typeof p.catch === 'function') p.catch(()=>{});
      }
      // Prime todas as trilhas do jogo
      primeGameSounds();
    } catch(e){}
    document.removeEventListener('touchstart', unlockOnce, true);
    document.removeEventListener('click', unlockOnce, true);
    document.removeEventListener('keydown', unlockOnce, true);
  }

  // expõe para ser chamado antes de iniciar o jogo
  try { window.primeGameAudio = primeGameSounds; } catch(e){}

  window.addEventListener('load', function(){
    // Ouve o primeiro gesto do usuário para liberar o áudio
    document.addEventListener('touchstart', unlockOnce, { once:true, capture:true });
    document.addEventListener('click', unlockOnce, { once:true, capture:true });
    document.addEventListener('keydown', unlockOnce, { once:true, capture:true });
    // Retoma ao voltar para a aba/app (apenas no menu)
    document.addEventListener('visibilitychange', function(){
      try {
        if (!document.hidden && !isGameRunning()) {
          const el = document.getElementById('bg-music');
          if (el && el.paused) { el.play().catch(()=>{}); }
        }
      } catch(e){}
    });
  });
})();