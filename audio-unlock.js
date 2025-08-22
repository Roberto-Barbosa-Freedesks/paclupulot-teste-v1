(function(){
  'use strict';

  var __primeRequested = false;
  var __primed = false;

  // Desbloqueia trilhas do jogo com o primeiro gesto do usuário
  function primeGameSounds(){
    __primeRequested = true;
    try {
      const a = (typeof window !== 'undefined') ? (window.audio || window.__paclupuloAudio || null) : null; // compat
      if (!a) return; // mixer ainda não carregou; aguardamos 'gameaudio-ready'
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
      primeGameSounds(); // requisita/desencadeia o prime do mixer do jogo
    } catch(e){}
    document.removeEventListener('touchstart', unlockOnce, true);
    document.removeEventListener('click', unlockOnce, true);
    document.removeEventListener('keydown', unlockOnce, true);
  }

  // expõe para ser chamado antes de iniciar o jogo (ex.: no fluxo de login/cadastro)
  try { window.primeGameAudio = primeGameSounds; } catch(e){}

  window.addEventListener('load', function(){
    // se o mixer ficar pronto depois do gesto, prime de novo
    window.addEventListener('gameaudio-ready', function(){
      if (__primeRequested && !__primed) { try{ primeGameSounds(); }catch(e){} }
    });

    // Ouve o primeiro gesto do usuário para liberar áudio
    document.addEventListener('touchstart', unlockOnce, { once:true, capture:true });
    document.addEventListener('click',      unlockOnce, { once:true, capture:true });
    document.addEventListener('keydown',    unlockOnce, { once:true, capture:true });

    // Retoma música do menu apenas quando estamos no menu
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