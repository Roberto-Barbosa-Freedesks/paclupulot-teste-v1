// pacman.js – Loader de Autenticação Firebase e Inicialização do Jogo Original

// 1) CONFIRMA que o DOM já está carregado antes de usar elementos (por via das dúvidas)
document.addEventListener('DOMContentLoaded', () => {
try{ window.__useBgMusic = false; }catch(e){};
// === MOBILE AUDIO GUARD (não agressivo, só garante retomada em toques) ===
(function mobileAudioGuard(){
  try{
    // Em mobile/iOS, apenas 'prima' a origem de áudio SEM tocar bg-music.
    function prime(){ try{ window.dispatchEvent(new Event('gameaudio-prime-request')); }catch(e){} }
    document.addEventListener('pointerdown', prime, { passive: true, capture: true });
    document.addEventListener('touchend',   prime, { passive: true, capture: true });
    window.addEventListener('focus',    prime, { capture: true });
    window.addEventListener('pageshow', prime, { capture: true });
  }catch(e){}
})();
// --------------------------------------------------------------
// Cleanup de Áudio centralizado
window.addEventListener('game:cleanup', () => {
  try {
    const audioManager = window.__paclupuloAudio;
    if (audioManager && typeof audioManager.silence === 'function') {
      audioManager.silence();
    }
  } catch (err) {
    console.warn('Erro ao silenciar sons do jogo:', err);
  }
  try {
    const bgEl = document.getElementById('bg-music');
    if (bgEl) { bgEl.pause(); bgEl.currentTime = 0; }
  } catch (err) {
    console.warn('Erro ao pausar bg-music:', err);
  }
});


// CHATGPT PATCH: CEP AutoFill via ViaCEP (readOnly/lock)
  (function setupCepAutofill(){
    const cepInput = document.getElementById('register-cep');
    const stateSel = document.getElementById('register-state');
    const cityInput = document.getElementById('register-city-input');
    if (!cepInput || !stateSel || !cityInput) return;

    // Popula UFs se vazio (sem dependências)
    const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
    if (stateSel.options.length <= 1) {
      UFS.forEach(uf => {
        const opt = document.createElement('option');
        opt.value = uf; opt.textContent = uf;
        stateSel.appendChild(opt);
      });
    }

    function onlyDigits(s){ return (s||'').replace(/\D/g, ''); }
    function formatCEP(s){ s = onlyDigits(s).slice(0,8); return s.length > 5 ? s.slice(0,5) + "-" + s.slice(5) : s; }

    let lastQuery = "";
    let controller = null;

    function unlockFields() {
      cityInput.readOnly = false;
      stateSel.disabled = false;
      cityInput.classList.remove('locked');
      stateSel.classList.remove('locked');
    }

    function lockFields() {
      cityInput.readOnly = true;
      stateSel.disabled = true;
      cityInput.classList.add('locked');
      stateSel.classList.add('locked');
    }

    function showCepMessage(msg, isError){
      const el = document.getElementById('register-error');
      if (el) el.textContent = msg || "";
    }

    async function fetchWithTimeout(url, ms){
      const c = new AbortController();
      const id = setTimeout(() => c.abort(), ms);
      try {
        const res = await fetch(url, { signal: c.signal });
        clearTimeout(id);
        return res;
      } catch(e){
        clearTimeout(id);
        throw e;
      }
    }

    async function tryViaCEP(rawDigits){
      if (controller) { try{ controller.abort(); }catch(e){} }
      controller = new AbortController();
      const url = "https://viacep.com.br/ws/" + rawDigits + "/json/";
      const res = await fetchWithTimeout(url, 4000).catch(()=>null);
      if (!res) throw new Error('timeout');
      if (!res.ok) throw new Error('http');
      const data = await res.json();
      if (data && data.erro) throw new Error('notfound');
      return data; // { uf, localidade, ... }
    }

    cepInput.addEventListener('input', async function(){
      // máscara
      const formatted = formatCEP(cepInput.value);
      if (cepInput.value !== formatted) {
        const pos = cepInput.selectionStart;
        cepInput.value = formatted;
        try { cepInput.setSelectionRange(pos, pos); } catch(e){}
      }

      const digits = (formatted || "").replace(/\D/g, "");
      if (digits.length !== 8) { showCepMessage(""); unlockFields(); return; }
      if (digits === lastQuery) return; // evita chamadas duplicadas
      lastQuery = digits;

      // Consulta ViaCEP resiliente (com retries simples)
      const attempts = [0, 300, 600];
      let ok = false, data = null;
      for (let i=0;i<attempts.length && !ok;i++){
        if (i>0) await new Promise(r=>setTimeout(r, attempts[i]));
        try { data = await tryViaCEP(digits); ok = true; } catch(e){}
      }

      if (ok && data) {
        // Preenche e bloqueia
        const uf = (data.uf || "").toUpperCase();
        const city = data.localidade || "";
        if (uf) stateSel.value = uf;
        cityInput.value = city;
        lockFields();
        showCepMessage("");
      } else {
        // Falha → permite edição manual + mensagem
        unlockFields();
        showCepMessage("Não foi possível preencher cidade/estado automaticamente. Preencha manualmente.", true);
      }
    });
  })();

  // 2) Variável de controle para não carregar múltiplas vezes
  let gameLoaded = false;

  // 3) FUNÇÕES DE TELA de Autenticação
  const authScreen = document.getElementById('auth-screen');
  function showAuthScreen() { authScreen.style.display = 'flex'; }
  function hideAuthScreen() { authScreen.style.display = 'none'; }
  function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-error').innerText = '';
  }
  function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('register-error').innerText = '';
  }

  const pontosButton = document.getElementById('pontos-button');
  const logoutButton = document.getElementById('logout-button');
  const backToGameButton = document.getElementById('back-to-game-button');

  // 5) Função para abrir tela de pontos (ranking)
  function openScoreboardScreen() {
  try{ if (window.__pointsOverlayOpen===true) return; }catch(e){}
  try{ if (typeof executive!=='undefined' && !executive.isPaused()) executive.togglePause(); }catch(e){}
  document.getElementById('pontos-screen').style.display = 'flex';
  try{ window.__pointsOverlayOpen = true; }catch(e){}

    // Atualiza pontuação do usuário logado
    const user = firebase.auth().currentUser;
    if (!user) return;

    firebase.firestore().collection('players').doc(user.uid).get()
    .then(doc => {
      if (!doc.exists) throw new Error('Doc não existe');
      const data = doc.data() || {};
      document.getElementById('pontuacao-acumulada').textContent = (data.pontuacaoAcumulada ?? 0).toString();
      document.getElementById('pontuacao-maxima').textContent   = (data.pontuacaoMaxima   ?? 0).toString();
    })
    .catch(err => console.error('Erro ao atualizar pontos:', err));

    const rankingList = document.getElementById('ranking-list');
    if (rankingList){
      rankingList.innerHTML = '<p style="font-size:12px;">Carregando ranking...</p>';
    }
    try{
      if (window.__paclupuloLeaderboard){
        window.__paclupuloLeaderboard.refresh();
      } else {
        window.dispatchEvent(new Event('leaderboard:refresh'));
      }
    }catch(err){
      console.warn('Não foi possível atualizar o ranking (compat)', err);
      if (rankingList){
        rankingList.innerHTML = '<p style="font-size:12px;">Ranking temporariamente indisponível.</p>';
      }
    }
          }

  // 6) Função para fechar tela de pontos
  function closeScoreboardScreen() {
  try{ if (window.__pointsOverlayOpen===false) return; }catch(e){}
  try{ if (typeof executive!=='undefined' && executive.isPaused()) executive.togglePause(); }catch(e){}
  document.getElementById('pontos-screen').style.display = 'none';
  try{ window.__pointsOverlayOpen = false; }catch(e){}
}

  // 7) Listeners dos botões, SEM duplicidade!
  pontosButton.addEventListener('click', openScoreboardScreen);
  pontosButton.addEventListener('touchstart', function(e) { e.preventDefault(); openScoreboardScreen(); });

  logoutButton.addEventListener('click', function() { firebase.auth().signOut(); });
  logoutButton.addEventListener('touchstart', function(e) { e.preventDefault(); firebase.auth().signOut(); });

  backToGameButton.addEventListener('click', closeScoreboardScreen);
  backToGameButton.addEventListener('touchstart', function(e) { e.preventDefault(); closeScoreboardScreen(); });

  // 8) Eventos extras do fluxo de autenticação (login/cadastro)
  document.getElementById('show-register-link').addEventListener('click', e => {
    e.preventDefault(); showRegisterForm();
  });
  document.getElementById('show-login-link').addEventListener('click', e => {
    e.preventDefault(); showLoginForm();
  });
  document.getElementById('login-button').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    firebase.auth().signInWithEmailAndPassword(email, password)
      .catch(err => document.getElementById('login-error').innerText = err.message);
  });
  document.getElementById('register-button').addEventListener('click', () => {
    const name     = document.getElementById('register-name').value;
    const email    = document.getElementById('register-email').value;
    const whatsapp = document.getElementById('register-whatsapp').value;
    const pw       = document.getElementById('register-password').value;
    const confirm  = document.getElementById('register-confirm-password').value;
    if (pw !== confirm) {
      return document.getElementById('register-error').innerText = 'Senhas não coincidem.';
    }
    firebase.auth().createUserWithEmailAndPassword(email, pw)
      .then(cred =>
        cred.user.updateProfile({ displayName: name })
        .then(() => {
          return firebase.firestore().collection("players").doc(cred.user.uid).set({
            email: email,
            nome: name,
            whatsapp: whatsapp,
            cep: document.getElementById("register-cep").value,
            estado: document.getElementById("register-state").value,
            cidade: document.getElementById("register-city-input").value,
            dataCadastro: firebase.firestore.FieldValue.serverTimestamp(),
            dataUltimoPlay: null,
            nivelMax: 0,
            pontuacaoAcumulada: 0,
            pontuacaoMaxima: 0,
            quantidadePlays: 0
          });
        })
      )
      .catch(err => document.getElementById('register-error').innerText = err.message);
  });

  // 9) Controle de autenticação e carregamento do jogo original
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      hideAuthScreen();
      logoutButton.style.display = 'block';
      pontosButton.style.display = 'block';
      backToGameButton.style.display = 'block';
      if (!gameLoaded) {
        gameLoaded = true;
        loadGameScript();
      }
    } else {
      showAuthScreen();
      logoutButton.style.display = 'none';
      pontosButton.style.display = 'none';
      document.getElementById('pontos-screen').style.display = 'none';
    }
  });

  // 10) Carrega o script do jogo original e dispara o load manualmente
  function loadGameScript() {
    const script = document.createElement('script');
    script.src = 'pacman-original.js';
    script.onload = () => {
      window.dispatchEvent(new Event('load'));
    };
    document.body.appendChild(script);
  }
});
