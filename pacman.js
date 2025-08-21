// pacman.js – Loader de Autenticação Firebase e Inicialização do Jogo Original

// 1) CONFIRMA que o DOM já está carregado antes de usar elementos (por via das dúvidas)
document.addEventListener('DOMContentLoaded', () => {
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
    document.getElementById('pontos-screen').style.display = 'flex';

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

    // Ajuste no ranking: apenas nomes de jogadores (sem símbolos, sem nomes duvidosos, sem score zero)
    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '<p>Carregando...</p>';
    firebase.firestore().collection('players').orderBy('pontuacaoMaxima', 'desc').limit(50).get()
      .then(snapshot => {
        let html = '';
        let pos = 1;
        snapshot.forEach(doc => {
          const d = doc.data();
          // Filtro: só exibe nomes com pelo menos 2 palavras e sem caracteres inválidos/suspeitos
          if (
          typeof d.nome === 'string' &&
          pos <= 10 &&
          (d.pontuacaoMaxima ?? 0) > 0
          ) {
          html += `<div style="margin-bottom:4px;font-size:15px;"><strong>${pos}º</strong> ${d.nome.trim()} — <span style="color:#FFD700;">${d.pontuacaoMaxima} pts</span></div>`;
          pos++;
          }
          });
          rankingList.innerHTML = html;
          })
          .catch(() => {
          rankingList.innerHTML = '<p>Erro ao carregar ranking.</p>';
          });
          }

  // 6) Função para fechar tela de pontos
  function closeScoreboardScreen() {
    document.getElementById('pontos-screen').style.display = 'none';
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
