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

  // === Ajustes de escala com base no tileSize e cache offscreen para performance ===
  let _cache = {
    lastTile: null,
    caneca: null,
    lupulo: null
  };

  function ensureCaches() {
    const ts = (typeof tileSize !== 'undefined' && tileSize) ? tileSize : 18;
    if (_cache.lastTile === ts) return;
    _cache.lastTile = ts;

    // cria imagens offscreen proporcionais ao tile
    const mk = (img, mul) => {
      const size = Math.max(1, Math.round(ts * mul));
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const cx = c.getContext('2d');
      cx.imageSmoothingEnabled = true;
      cx.drawImage(img, 0, 0, size, size);
      return {canvas: c, size};
    };

    if (canecaImage && canecaImage.complete) _cache.caneca = mk(canecaImage, 2); // energizer ~2× tile
    if (lupuloImage && lupuloImage.complete) _cache.lupulo = mk(lupuloImage, 2); // scared ghost/pretzel ~2× tile
  }

  function drawImageScaledCentered(ctx, imgOrCanvas, x, y, size) {
    const half = size / 2;
    ctx.drawImage(imgOrCanvas, Math.floor(x - half), Math.floor(y - half), size, size);
  }


  // 4. Função para desenhar avatares (mantenha igual)
  function drawAvatar(ctx, x, y, dirEnum, img) {
    ensureCaches();
    const ts = (typeof tileSize !== 'undefined' && tileSize) ? tileSize : 18;
    const size = Math.max(1, Math.round(ts * 2));
    const halfW = size / 2;
    const halfH = size / 2;
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    if (dirEnum === 2) ctx.scale(-1, 1);
    else if (dirEnum === 1) ctx.rotate(Math.PI / 2);
    else if (dirEnum === 3) ctx.rotate(-Math.PI / 2);
    ctx.drawImage(img, -halfW, -halfH, size, size);
    ctx.restore();
  }

  // 5. ADICIONE ESTA NOVA FUNÇÃO - Para desenhar canecas
  function drawCaneca(ctx, x, y) {
    ensureCaches();
    const ts = (typeof tileSize !== 'undefined' && tileSize) ? tileSize : 18;
    if (canecaLoaded) {
      const off = _cache.caneca;
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

    // B. Garante fantasmas frightened visíveis em qualquer dispositivo
    const originalDrawGhostSprite = atlas.drawGhostSprite;
    atlas.drawGhostSprite = function(ctx, x, y, frame, dirEnum, scared, isFlash, eyesOnly, color) {
      if (scared && !eyesOnly) {
        // Mantém o sprite original "frightened" para garantir consistência visual
        // nos dispositivos móveis (sem usar lupuloImage como substituto).
        originalDrawGhostSprite(ctx, x, y, frame, dirEnum, true, isFlash, eyesOnly, color);
        return;
      }
      originalDrawGhostSprite(ctx, x, y, frame, dirEnum, scared, isFlash, eyesOnly, color);
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
        if (_cache.lupulo) { ctx.drawImage(_cache.lupulo.canvas, -_cache.lupulo.size/2, -_cache.lupulo.size/2); } else { ctx.drawImage(lupuloImage, -size / 2, -size / 2, size, size); }
        ctx.restore();
      } else {
        originalDrawFruitSprite(ctx, x, y, fruitType);
      }
    };

  // === CHATGPT PATCH: frightened visibility enforcement ===
  // Garante que fantasmas em estado frightened nunca "sumam" (alpha = 0) e
  // aplica paleta azul/piscar sem alterar a ordem de desenho do renderer.
  try {
    if (window.atlas && typeof atlas.drawGhostSprite === 'function') {
      const __origDrawGhostSprite = atlas.drawGhostSprite;
      atlas.drawGhostSprite = function(ctx, x, y, frame, faceDirEnum, scared, isFlash, eyesOnly, color) {
        // Força alpha visível
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = 1;

        // Mantém olhos-only como está; caso "scared", ajusta cor para azul/piscar
        let useColor = color;
        if (scared && !eyesOnly) {
          // Azul padrão frightened; alterna com branco quando piscar
          const BLUE = "#2156F3";
          if (isFlash) {
            // Alterna a cada ~120ms usando high-res timer se disponível
            const t = (typeof performance !== 'undefined' ? performance.now() : Date.now());
            useColor = Math.floor(t / 120) % 2 ? "#FFFFFF" : BLUE;
          } else {
            useColor = BLUE;
          }
        }

        __origDrawGhostSprite.call(atlas, ctx, x, y, frame, faceDirEnum, scared, isFlash, eyesOnly, useColor);
        ctx.globalAlpha = prevAlpha;
      };
    }
  } catch (e) { console.warn('Ghost frightened visibility patch falhou:', e); }

  });
})();