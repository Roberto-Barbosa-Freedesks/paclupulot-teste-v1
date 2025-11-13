// mobile-controls.js - Sistema D-Pad Definitivo com Integração Perfeita
// Ajustado para garantir funcionamento estável em todos os dispositivos mobile.
(function() {
  'use strict';

  const DPAD_HIDE_DELAY = 4000;

  let currentDirection = null;
  let directionInterval = null;
  let hideTimeout = null;
  let isSwipeInProgress = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  function isMobileDevice() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth <= 768 && 'ontouchstart' in window)
    );
  }

  function getDirectionValue(direction) {
    if (typeof window !== 'undefined' && direction && direction in window) {
      return window[direction];
    }
    return undefined;
  }

  function sendDirectionCommand(direction) {
    if (!direction) return false;

    if (typeof window.pacman !== 'undefined' && window.pacman && typeof window.pacman.setInputDir === 'function') {
      const dirValue = getDirectionValue(direction);
      if (dirValue !== undefined) {
        window.pacman.setInputDir(dirValue);
        return true;
      }
    }

    const keyMap = {
      DIR_UP: 38,
      DIR_DOWN: 40,
      DIR_LEFT: 37,
      DIR_RIGHT: 39,
    };

    const keyCode = keyMap[direction];
    if (!keyCode) return false;

    const keydownEvent = new KeyboardEvent('keydown', {
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(keydownEvent);

    setTimeout(() => {
      const keyupEvent = new KeyboardEvent('keyup', {
        keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(keyupEvent);
    }, 50);

    return true;
  }

  function startContinuousDirection(direction) {
    stopContinuousDirection();
    currentDirection = direction;
    sendDirectionCommand(direction);
    directionInterval = setInterval(() => sendDirectionCommand(direction), 100);
  }

  function stopContinuousDirection() {
    if (directionInterval) {
      clearInterval(directionInterval);
      directionInterval = null;
    }
    currentDirection = null;
  }

  function vibrate(duration) {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(duration);
      }
    } catch (err) {
      console.warn('Vibration API unavailable:', err);
    }
  }

  function applyButtonState(button, active) {
    if (!button) return;
    const baseTransform = button.dataset.baseTransform || '';
    if (active) {
      button.style.transform = `${baseTransform} scale(0.85)`;
      button.style.background = 'rgba(245, 217, 34, 1)';
      button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.6)';
    } else {
      button.style.transform = baseTransform;
      button.style.background = 'rgba(245, 217, 34, 0.9)';
      button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
    }
  }

  function handleDirectionPress(direction, button) {
    applyButtonState(button, true);
    vibrate(30);
    startContinuousDirection(direction);
  }

  function handleDirectionRelease(button) {
    applyButtonState(button, false);
    stopContinuousDirection();
  }

  function scheduleHideControls(container) {
    if (!container) return;
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      container.style.opacity = '0';
      setTimeout(() => {
        container.style.display = 'none';
      }, 300);
    }, DPAD_HIDE_DELAY);
  }

  function isElementVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function showMobileControlsIfNeeded() {
    if (!isMobileDevice()) return;
    const controls = document.getElementById('mobile-controls');
    if (!controls) return;

    const startScreen = document.getElementById('start-screen');
    const authScreen = document.getElementById('auth-screen');
    const pontosScreen = document.getElementById('pontos-screen');

    const shouldShow = !isElementVisible(startScreen) && !isElementVisible(authScreen) && !isElementVisible(pontosScreen);

    if (!shouldShow) {
      controls.style.display = 'none';
      controls.style.opacity = '0';
      return;
    }

    controls.style.display = 'flex';
    requestAnimationFrame(() => {
      controls.style.opacity = '0.9';
    });
    scheduleHideControls(controls);
  }

  function createDirectionalButton(directionConfig) {
    const button = document.createElement('button');
    button.id = `btn-${directionConfig.id}`;
    button.innerHTML = directionConfig.symbol;
    button.dataset.direction = directionConfig.dir;
    button.dataset.baseTransform = directionConfig.transform;
    button.style.cssText = `
      position: absolute;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(245, 217, 34, 0.9);
      border: 3px solid #000;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
      transition: all 0.1s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #000;
      touch-action: none;
      ${directionConfig.position}
    `;
    button.style.transform = directionConfig.transform;
    button.setAttribute('aria-label', directionConfig.aria);

    const pressHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      showMobileControlsIfNeeded();
      handleDirectionPress(directionConfig.dir, button);
    };

    const releaseHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleDirectionRelease(button);
    };

    ['pointerdown', 'touchstart', 'mousedown'].forEach((evt) => {
      button.addEventListener(evt, pressHandler, { passive: false });
    });

    ['pointerup', 'touchend', 'mouseup', 'pointercancel', 'touchcancel', 'mouseleave'].forEach((evt) => {
      button.addEventListener(evt, releaseHandler, { passive: false });
    });

    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    return button;
  }

  function createMobileControls() {
    if (!isMobileDevice()) return;
    if (document.getElementById('mobile-controls')) return;

    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'mobile-controls';
    controlsContainer.style.cssText = `
      position: fixed;
      bottom: calc(20px + env(safe-area-inset-bottom, 0px));
      right: calc(20px + env(safe-area-inset-right, 0px));
      z-index: 2000;
      display: none;
      flex-direction: column;
      gap: 10px;
      opacity: 0;
      transition: opacity 0.3s ease;
      user-select: none;
      touch-action: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    `;

    const dpadContainer = document.createElement('div');
    dpadContainer.id = 'virtual-dpad';
    dpadContainer.style.cssText = `
      position: relative;
      width: 168px;
      height: 168px;
      display: block;
      margin: 10px auto;
      background: rgba(0, 0, 0, 0.35);
      border-radius: 50%;
      border: 3px solid #f5d922;
      backdrop-filter: blur(2px);
    `;

    const directions = [
      { id: 'up', dir: 'DIR_UP', symbol: '▲', position: 'top: 5px; left: 50%;', transform: 'translateX(-50%)', aria: 'Mover para cima' },
      { id: 'down', dir: 'DIR_DOWN', symbol: '▼', position: 'bottom: 5px; left: 50%;', transform: 'translateX(-50%)', aria: 'Mover para baixo' },
      { id: 'left', dir: 'DIR_LEFT', symbol: '◀', position: 'left: 5px; top: 50%;', transform: 'translateY(-50%)', aria: 'Mover para esquerda' },
      { id: 'right', dir: 'DIR_RIGHT', symbol: '▶', position: 'right: 5px; top: 50%;', transform: 'translateY(-50%)', aria: 'Mover para direita' },
    ];

    directions.forEach((directionConfig) => {
      const button = createDirectionalButton(directionConfig);
      dpadContainer.appendChild(button);
    });

    const centerButton = document.createElement('div');
    centerButton.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid #f5d922;
      pointer-events: none;
    `;
    dpadContainer.appendChild(centerButton);

    controlsContainer.appendChild(dpadContainer);
    document.body.appendChild(controlsContainer);

    showMobileControlsIfNeeded();
  }

  function initSwipeControls() {
    if (!isMobileDevice()) return;
    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    const DEADZONE = 24;

    canvas.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length !== 1) return;
        event.preventDefault();
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        isSwipeInProgress = true;
        showMobileControlsIfNeeded();
      },
      { passive: false }
    );

    canvas.addEventListener(
      'touchmove',
      (event) => {
        if (!isSwipeInProgress || event.touches.length !== 1) return;
        event.preventDefault();
      },
      { passive: false }
    );

    canvas.addEventListener(
      'touchend',
      (event) => {
        if (!isSwipeInProgress) return;
        isSwipeInProgress = false;
        const deltaTime = Date.now() - touchStartTime;
        if (deltaTime > 200) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absX < DEADZONE && absY < DEADZONE) return;

        let direction = null;
        if (absX > absY * 1.15) {
          direction = deltaX > 0 ? 'DIR_RIGHT' : 'DIR_LEFT';
        } else if (absY > absX * 1.15) {
          direction = deltaY > 0 ? 'DIR_DOWN' : 'DIR_UP';
        }

        if (direction) {
          sendDirectionCommand(direction);
          vibrate(20);
        }
      },
      { passive: false }
    );
  }

  function observeScreenChanges() {
    const observer = new MutationObserver(() => {
      showMobileControlsIfNeeded();
    });

    const startScreen = document.getElementById('start-screen');
    const authScreen = document.getElementById('auth-screen');
    const pontosScreen = document.getElementById('pontos-screen');

    const observerConfig = { attributes: true, attributeFilter: ['style', 'class'] };

    if (startScreen) observer.observe(startScreen, observerConfig);
    if (authScreen) observer.observe(authScreen, observerConfig);
    if (pontosScreen) observer.observe(pontosScreen, observerConfig);
  }

  function initMobileControls() {
    if (!isMobileDevice()) {
      return;
    }

    const waitForGame = setInterval(() => {
      if (typeof window.pacman !== 'undefined' && window.pacman) {
        clearInterval(waitForGame);
        createMobileControls();
        initSwipeControls();
        observeScreenChanges();
      }
    }, 500);

    setTimeout(() => {
      clearInterval(waitForGame);
      if (!document.getElementById('mobile-controls')) {
        createMobileControls();
        initSwipeControls();
        observeScreenChanges();
      }
    }, 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileControls);
  } else {
    initMobileControls();
  }

  window.addEventListener('load', () => {
    setTimeout(initMobileControls, 2000);
  });

  window.addEventListener('resize', showMobileControlsIfNeeded);

  window.addEventListener('game:cleanup', () => {
    stopContinuousDirection();
  });

  window.mobileControls = {
    init: initMobileControls,
    show: showMobileControlsIfNeeded,
    isMobile: isMobileDevice,
    sendCommand: sendDirectionCommand,
    cleanup: () => {
      stopContinuousDirection();
    },
  };
})();
