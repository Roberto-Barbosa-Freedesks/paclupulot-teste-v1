// achievements.js - Sistema de Conquistas do Pac-Lúpulo

class AchievementSystem {
  constructor() {
    this.achievements = {
      // Conquistas de Pontuação
      first_score: {
        id: 'first_score',
        name: 'Primeira Cervejada',
        description: 'Faça seus primeiros pontos',
        icon: '🍺',
        condition: (stats) => stats.pontuacaoMaxima > 0,
        points: 10
      },
      score_1000: {
        id: 'score_1000',
        name: 'Cervejeiro Iniciante',
        description: 'Alcance 1.000 pontos em uma partida',
        icon: '🥉',
        condition: (stats) => stats.pontuacaoMaxima >= 1000,
        points: 25
      },
      score_5000: {
        id: 'score_5000',
        name: 'Mestre Cervejeiro',
        description: 'Alcance 5.000 pontos em uma partida',
        icon: '🥈',
        condition: (stats) => stats.pontuacaoMaxima >= 5000,
        points: 50
      },
      score_10000: {
        id: 'score_10000',
        name: 'Lenda do Lúpulo',
        description: 'Alcance 10.000 pontos em uma partida',
        icon: '🥇',
        condition: (stats) => stats.pontuacaoMaxima >= 10000,
        points: 100
      },
      
      // Conquistas de Frequência
      plays_10: {
        id: 'plays_10',
        name: 'Frequentador da Casa',
        description: 'Jogue 10 partidas',
        icon: '🎮',
        condition: (stats) => stats.quantidadePlays >= 10,
        points: 20
      },
      plays_50: {
        id: 'plays_50',
        name: 'Viciado em Lúpulo',
        description: 'Jogue 50 partidas',
        icon: '🕹️',
        condition: (stats) => stats.quantidadePlays >= 50,
        points: 75
      },
      plays_100: {
        id: 'plays_100',
        name: 'Campeão da Cervejaria',
        description: 'Jogue 100 partidas',
        icon: '👑',
        condition: (stats) => stats.quantidadePlays >= 100,
        points: 150
      },
      
      // Conquistas de Acumulação
      total_10000: {
        id: 'total_10000',
        name: 'Colecionador de Pontos',
        description: 'Acumule 10.000 pontos no total',
        icon: '💰',
        condition: (stats) => stats.pontuacaoAcumulada >= 10000,
        points: 50
      },
      total_50000: {
        id: 'total_50000',
        name: 'Magnata do Lúpulo',
        description: 'Acumule 50.000 pontos no total',
        icon: '💎',
        condition: (stats) => stats.pontuacaoAcumulada >= 50000,
        points: 100
      },
      
      // Conquistas Especiais
      perfect_start: {
        id: 'perfect_start',
        name: 'Início Perfeito',
        description: 'Alcance 500 pontos na primeira partida',
        icon: '⭐',
        condition: (stats) => stats.quantidadePlays === 1 && stats.pontuacaoMaxima >= 500,
        points: 30
      },
      comeback_king: {
        id: 'comeback_king',
        name: 'Rei do Comeback',
        description: 'Supere sua pontuação máxima por mais de 2000 pontos',
        icon: '🔥',
        condition: (stats, gameStats) => {
          return gameStats && gameStats.currentScore > (stats.pontuacaoMaxima + 2000);
        },
        points: 75
      }
    };
    
    this.userAchievements = new Set();
    this.loadUserAchievements();
  }

  async loadUserAchievements() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
      const doc = await firebase.firestore()
        .collection('players')
        .doc(user.uid)
        .get();
      
      if (doc.exists) {
        const data = doc.data();
        this.userAchievements = new Set(data.achievements || []);
      }
    } catch (error) {
      console.error('Erro ao carregar conquistas:', error);
    }
  }

  async checkAchievements(stats, gameStats = null) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const newAchievements = [];

    for (const [id, achievement] of Object.entries(this.achievements)) {
      if (!this.userAchievements.has(id) && achievement.condition(stats, gameStats)) {
        newAchievements.push(achievement);
        this.userAchievements.add(id);
      }
    }

    if (newAchievements.length > 0) {
      await this.saveAchievements();
      this.showAchievementNotifications(newAchievements);
    }

    return newAchievements;
  }

  async saveAchievements() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
      await firebase.firestore()
        .collection('players')
        .doc(user.uid)
        .update({
          achievements: Array.from(this.userAchievements),
          lastAchievementUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error('Erro ao salvar conquistas:', error);
    }
  }

  showAchievementNotifications(achievements) {
    achievements.forEach((achievement, index) => {
      setTimeout(() => {
        if (window.notifications) {
          window.notifications.show(
            `🏆 ${achievement.name}: ${achievement.description} (+${achievement.points} pts)`,
            'success',
            6000
          );
        }
        
        // Efeito sonoro (se disponível)
        this.playAchievementSound();
        
        // Animação especial na tela
        this.showAchievementAnimation(achievement);
      }, index * 1000);
    });
  }

  showAchievementAnimation(achievement) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.5s ease-out;
    `;

    const achievementCard = document.createElement('div');
    achievementCard.style.cssText = `
      background: linear-gradient(145deg, #f5d922, #e6c41d);
      color: #000;
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      animation: bounceIn 0.8s ease-out;
      font-family: 'ArcadeR', monospace;
    `;

    achievementCard.innerHTML = `
      <div style="font-size: 60px; margin-bottom: 20px;">${achievement.icon}</div>
      <h2 style="margin: 0 0 10px 0; font-size: 24px;">CONQUISTA DESBLOQUEADA!</h2>
      <h3 style="margin: 0 0 10px 0; font-size: 18px;">${achievement.name}</h3>
      <p style="margin: 0 0 20px 0; font-size: 14px;">${achievement.description}</p>
      <div style="font-size: 16px; font-weight: bold;">+${achievement.points} pontos de conquista</div>
    `;

    overlay.appendChild(achievementCard);
    document.body.appendChild(overlay);

    // Remove após 4 segundos
    setTimeout(() => {
      overlay.style.animation = 'fadeOut 0.5s ease-out';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 500);
    }, 4000);

    // Clique para fechar
    overlay.addEventListener('click', () => {
      overlay.style.animation = 'fadeOut 0.5s ease-out';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 500);
    });
  }

  playAchievementSound() {
    try {
      // Tenta tocar som de conquista se disponível
      if (window.audio && window.audio.extend) {
        window.audio.extend.play();
      }
    } catch (error) {
      console.log('Som de conquista não disponível');
    }
  }

  getAchievementProgress(stats) {
    const progress = {};
    
    for (const [id, achievement] of Object.entries(this.achievements)) {
      const unlocked = this.userAchievements.has(id);
      let progressPercent = 0;
      
      if (!unlocked) {
        // Calcula progresso baseado no tipo de conquista
        if (id.includes('score_')) {
          const target = parseInt(id.split('_')[1]);
          progressPercent = Math.min(100, (stats.pontuacaoMaxima / target) * 100);
        } else if (id.includes('plays_')) {
          const target = parseInt(id.split('_')[1]);
          progressPercent = Math.min(100, (stats.quantidadePlays / target) * 100);
        } else if (id.includes('total_')) {
          const target = parseInt(id.split('_')[1]);
          progressPercent = Math.min(100, (stats.pontuacaoAcumulada / target) * 100);
        }
      } else {
        progressPercent = 100;
      }
      
      progress[id] = {
        unlocked,
        progress: progressPercent,
        achievement
      };
    }
    
    return progress;
  }

  getTotalAchievementPoints() {
    let total = 0;
    for (const id of this.userAchievements) {
      if (this.achievements[id]) {
        total += this.achievements[id].points;
      }
    }
    return total;
  }
}

// Adiciona animações CSS para conquistas
const achievementStyle = document.createElement('style');
achievementStyle.textContent = `
  @keyframes bounceIn {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(achievementStyle);

// Instância global
window.achievementSystem = new AchievementSystem();

