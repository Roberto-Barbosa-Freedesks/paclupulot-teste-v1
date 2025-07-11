// custom‐renderer.js - Versão Modificada para Canecas
(function(){
  // 1. Carrega os avatares (mantenha isso igual)
  const avatarPaths = {
    0: 'img/forasteira.png',
    1: 'img/ipazero.png',
    2: 'img/pilsen.png'
  };

  const avatars = {};
  Object.keys(avatarPaths).forEach(key => {
    const img = new Image();
    img.src = avatarPaths[key];
    avatars[key] = img;
  });

  // 2. Carrega a imagem do lúpulo (mantenha)
  const lupuloImage = new Image();
  lupuloImage.src = 'img/lupulo.png';

  // 3. ADICIONE ESTE BLOCO - Carrega a imagem da caneca
  const canecaImage = new Image();
  canecaImage.src = 'img/caneca.png';
  let canecaLoaded = false;
  canecaImage.onload = function() {
    canecaLoaded = true;
  };

  // 4. Função para desenhar avatares (mantenha igual)
  function drawAvatar(ctx, x, y, dirEnum, img) {
    const halfW = img.width / 2;
    const halfH = img.height / 2;
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    if (dirEnum === 2) ctx.scale(-1, 1);
    else if (dirEnum === 1) ctx.rotate(Math.PI / 2);
    else if (dirEnum === 3) ctx.rotate(-Math.PI / 2);
    ctx.drawImage(img, -halfW, -halfH);
    ctx.restore();
  }

  // 5. ADICIONE ESTA NOVA FUNÇÃO - Para desenhar canecas
  function drawCaneca(ctx, x, y) {
    if (canecaLoaded) {
      const size = tileSize * 1.5; // Tamanho da caneca (ajuste se necessário)
      ctx.save();
      ctx.translate(Math.floor(x), Math.floor(y));
      ctx.drawImage(canecaImage, -size/2, -size/2, size, size);
      ctx.restore();
    } else {
      // Fallback temporário (círculo amarelo)
      ctx.save();
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(Math.floor(x), Math.floor(y), tileSize/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 6. Quando tudo carregar, faça as substituições
  window.addEventListener('load', () => {
    const chosen = window.selectedAvatarType || 0;

    // A. Mantenha os avatares originais
    atlas.drawPacmanSprite = function(ctx, x, y, dirEnum) {
      drawAvatar(ctx, x, y, dirEnum, avatars[chosen]);
    };
    atlas.drawMsPacmanSprite = atlas.drawPacmanSprite;
    atlas.drawCookiemanSprite = atlas.drawPacmanSprite;

    // B. Mantenha os fantasmas com lúpulo
    const originalDrawGhostSprite = atlas.drawGhostSprite;
    atlas.drawGhostSprite = function(ctx, x, y, frame, dirEnum, scared, isFlash, eyesOnly, color) {
      if (scared) {
        const halfW = lupuloImage.width / 2;
        const halfH = lupuloImage.height / 2;
        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y));
        ctx.drawImage(lupuloImage, -halfW, -halfH);
        ctx.restore();
      } else {
        originalDrawGhostSprite(ctx, x, y, frame, dirEnum, scared, isFlash, eyesOnly, color);
      }
    };

    // C. SUBSTITUIÇÃO CRÍTICA - Energizers por Canecas
    // Guarda a função original de desenho de dots
    const originalDrawDotSprite = atlas.drawDotSprite;

    // Sobrescreve a função
    atlas.drawDotSprite = function(ctx, x, y, type) {
      if (type === 1) { // 1 = energizer
        drawCaneca(ctx, x, y);
      } else {
        originalDrawDotSprite(ctx, x, y, type);
      }
    };
        // D. SUBSTITUIÇÃO DO BONUS "PRETZEL" POR LÚPULO
    // Guarda a função original de desenhar bônus
    const originalDrawFruitSprite = atlas.drawFruitSprite;
    atlas.drawFruitSprite = function(ctx, x, y, fruitType) {
      if (fruitType === 8) { // 8 = pretzel
        // Tamanho proporcional ao tile
        const size = typeof tileSize !== "undefined" ? tileSize * 2 : 36;
        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y));
        ctx.drawImage(lupuloImage, -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        originalDrawFruitSprite(ctx, x, y, fruitType);
      }
    };
  });
})();