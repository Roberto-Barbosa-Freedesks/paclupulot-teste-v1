// audio-unlock.js — Desbloqueio robusto de áudio em mobile (iOS/Android) e retomada após suspensão
(function(){
  'use strict';

  var __primed = false;
  var __priming = false;

  function withAllTracks(fn){
    try{
      var a = (typeof window !== 'undefined') ? (window.__paclupuloAudio || window.audio || null) : null;
      if (!a) return;
      for (var k in a){
        if (!Object.prototype.hasOwnProperty.call(a,k)) continue;
        if (k === 'silence' || k === 'ghostReset') continue;
        var tr = a[k];
        if (!tr) continue;
        fn(tr, k);
      }
    }catch(e){}
  }

  function safePlay(tr){
    try{
      if (typeof tr.play === 'function') {
        var p = tr.play(true);
        if (p && typeof p.catch === 'function') { p.catch(function(){/* ignore */}); }
      }
    }catch(e){}
  }
  function safeStop(tr){
    try{
      if (typeof tr.stopLoop === 'function') tr.stopLoop(true);
    }catch(e){}
  }

  function primeGameSounds(){
    if (__primed || __priming) return;
    __priming = true;

    // 1) Toca rapidamente cada faixa e pausa para desbloquear o áudio
    withAllTracks(function(tr){ safePlay(tr); });
    setTimeout(function(){
      withAllTracks(function(tr){ safeStop(tr); });
      __primed = true;
      __priming = false;
      try{ window.dispatchEvent(new Event('gameaudio-unlocked')); }catch(e){}
    }, 60);
  }

  function requestPrime(){ try{ primeGameSounds(); }catch(e){} }

  function unlockOnce(){
    requestPrime();
    // não remover os listeners globais — alguns browsers exigem múltiplos gestos até liberar
  }

  function isGameRunning(){
    try{
      return !!(window.executive && window.executive.state);
    }catch(e){}
    return false;
  }

  // Eventos
  document.addEventListener('DOMContentLoaded', function(){
    // Gesto do usuário
    document.addEventListener('touchstart', unlockOnce, { capture:true });
    document.addEventListener('pointerdown', unlockOnce, { capture:true });
    document.addEventListener('click', unlockOnce, { capture:true });
    document.addEventListener('keydown', unlockOnce, { capture:true });

    // Requisição programática
    window.addEventListener('gameaudio-prime-request', requestPrime);

    // Quando o motor de áudio estiver pronto
    window.addEventListener('gameaudio-ready', function(){ requestPrime(); });

    // Visibilidade (saiu e voltou do app/aba)
    document.addEventListener('visibilitychange', function(){
      if (!document.hidden){
        requestPrime();
      }
    });

    // iOS: ao voltar do modo picture-in-picture / chamadas, etc.
    window.addEventListener('pageshow', function(){ requestPrime(); });
  });
})();