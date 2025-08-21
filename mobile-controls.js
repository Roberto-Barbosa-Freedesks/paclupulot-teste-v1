// mobile-controls.js - Sistema D-Pad Definitivo com Integração Perfeita

(function() {
    'use strict';

    // Variáveis de controle
    let touchControlsEnabled = false;
    let isSwipeInProgress = false;
            const absX = Math.abs(dx), absY = Math.abs(dy);
            if (absX < DEADZONE && absY < DEADZONE) return;
            let dir = null;
            if (absX > absY * 1.15) {
                dir = (dx > 0) ? 'DIR_RIGHT' : 'DIR_LEFT';
            } else if (absY > absX * 1.15) {
                dir = (dy > 0) ? 'DIR_DOWN' : 'DIR_UP';
            }
            if (dir) sendDirectionCommand(dir);
    
    let lastTouchTime = 0;
    let currentDirection = null;
    let directionInterval = null;

    // Detecta se é dispositivo móvel
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768 && 'ontouchstart' in window);
    }

    // Função DEFINITIVA para enviar comandos direcionais
    function sendDirectionCommand(direction) {
        console.log(`🎮 Enviando comando: ${direction}`);
        
        // Método 1: Via objeto pacman global (principal)
        if (typeof window.pacman !== 'undefined' && window.pacman && typeof window.pacman.setInputDir === 'function') {
            const dirValue = window[direction];
            if (dirValue !== undefined) {
                window.pacman.setInputDir(dirValue);
                console.log(`✅ Comando enviado via pacman.setInputDir: ${direction} = ${dirValue}`);
                return true;
            }
        }

        // Método 2: Via simulação de evento de teclado (fallback)
        const keyMap = {
            'DIR_UP': 38,    // Arrow Up
            'DIR_DOWN': 40,  // Arrow Down
            'DIR_LEFT': 37,  // Arrow Left
            'DIR_RIGHT': 39  // Arrow Right
        };
        
        const keyCode = keyMap[direction];
        if (keyCode) {
            // Simula keydown
            const keydownEvent = new KeyboardEvent('keydown', {
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(keydownEvent);
            
            // Simula keyup após um pequeno delay para evitar movimento contínuo
            setTimeout(() => {
                const keyupEvent = new KeyboardEvent('keyup', {
                    keyCode: keyCode,
                    which: keyCode,
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(keyupEvent);
            }, 50);
            
            console.log(`✅ Comando enviado via simulação de tecla: ${keyCode}`);
            return true;
        }

        console.error(`❌ Falha ao enviar comando: ${direction}`);
        return false;
    }

    // Função para envio contínuo de comandos (para movimento fluido)
    function startContinuousDirection(direction) {
        stopContinuousDirection();
        currentDirection = direction;
        
        // Envia comando imediatamente
        sendDirectionCommand(direction);
        
        // Continua enviando comandos a cada 100ms para movimento fluido
        directionInterval = setInterval(() => {
            sendDirectionCommand(direction);
        }, 100);
    }

    function stopContinuousDirection() {
        if (directionInterval) {
            clearInterval(directionInterval);
            directionInterval = null;
        }
        currentDirection = null;
    }

    // Cria interface de controles visuais para mobile
    function createMobileControls() {
        if (!isMobileDevice()) return;

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
            opacity: 0.9;
            transition: opacity 0.3s ease;
            user-select: none;
            touch-action: none;
            -webkit-user-select: none;
            touch-action: none;
            -webkit-touch-callout: none;
        `;

        // D-Pad virtual
        const dpadContainer = document.createElement('div');
        dpadContainer.id = 'virtual-dpad';
        dpadContainer.style.cssText = `
            position: relative;
            width: 168px;
            height: 168px;
            display: block;
            margin: 10px auto;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 50%;
            border: 3px solid #f5d922;
        `;

        // Botões direcionais com posicionamento preciso
        const directions = [
            { id: 'up', dir: 'DIR_UP', symbol: '▲', style: 'top: 5px; left: 50%; transform: translateX(-50%);' },
            { id: 'down', dir: 'DIR_DOWN', symbol: '▼', style: 'bottom: 5px; left: 50%; transform: translateX(-50%);' },
            { id: 'left', dir: 'DIR_LEFT', symbol: '◀', style: 'left: 5px; top: 50%; transform: translateY(-50%);' },
            { id: 'right', dir: 'DIR_RIGHT', symbol: '▶', style: 'right: 5px; top: 50%; transform: translateY(-50%);' }
        ];

        directions.forEach(dir => {
            const button = document.createElement('button');
            button.id = `btn-${dir.id}`;
            button.innerHTML = dir.symbol;
            button.dataset.direction = dir.dir;
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
                ${dir.style}
            `;

            // Event listeners otimizados para resposta imediata
            ['pointerdown', 'touchstart', 'mousedown'].forEach(evt => {
            button.addEventListener(evt, function(e) {
            e.preventDefault(); e.stopPropagation();
            handleDirectionPress(dir.dir, button);
            }, { passive: false });
            });
            ['pointerup', 'touchend', 'mouseup', 'pointercancel'].forEach(evt => {
            button.addEventListener(evt, function(e) {
            e.preventDefault(); e.stopPropagation();
            handleDirectionRelease();
            }, { passive: false });
            });

            button.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handleDirectionRelease(button);
            }, { passive: false });

            button.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handleDirectionPress(dir.dir, button);
            });

            button.addEventListener('mouseup', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handleDirectionRelease(button);
            });

            // Previne context menu
            button.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            });

            dpadContainer.appendChild(button);
        });

        // Botão central (opcional - para parar movimento)
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
        `;
        dpadContainer.appendChild(centerButton);

        controlsContainer.appendChild(dpadContainer);
        document.body.appendChild(controlsContainer);

        // Mostra controles automaticamente
        showMobileControlsIfNeeded();
    }

    // Manipula pressão de botão direcional
    function handleDirectionPress(direction, button) {
        console.log(`🎮 Botão pressionado: ${direction}`);
        
        // Feedback visual imediato
        button.style.transform = button.style.transform + ' scale(0.85)';
        button.style.background = 'rgba(245, 217, 34, 1)';
        button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.6)';
        
        // Vibração tátil se disponível
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
        
        // Inicia movimento contínuo
        startContinuousDirection(direction);
    }

    // Manipula liberação de botão direcional
    function handleDirectionRelease(button) {
        console.log(`🎮 Botão liberado`);
        
        // Remove feedback visual
        button.style.transform = button.style.transform.replace(' scale(0.85)', '');
        button.style.background = 'rgba(245, 217, 34, 0.9)';
        button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
        
        // Para movimento contínuo
        stopContinuousDirection();
    }

    // Mostra controles mobile quando necessário
    function showMobileControlsIfNeeded() {
        if (!isMobileDevice()) return;

        const controls = document.getElementById('mobile-controls');
        if (!controls) return;

        const authScreen = document.getElementById('auth-screen');
        const pontosScreen = document.getElementById('pontos-screen');
        
        // Mostra controles apenas quando não estiver em telas de menu
        const shouldShow = (!authScreen || authScreen.style.display === 'none') && 
                          (!pontosScreen || pontosScreen.style.display === 'none');
        
        controls.style.display = shouldShow ? 'flex' : 'none';
        // Auto-ocultar após inatividade (4s); reaparecer ao próximo toque
        try { if (window.__dpadHideTimer) clearTimeout(window.__dpadHideTimer); } catch(e){}
        if (shouldShow) {
            controls.style.opacity = '0.9';
            window.__dpadHideTimer = setTimeout(() => {
                controls.style.opacity = '0';
                setTimeout(() => { controls.style.display = 'none'; }, 300);
            }, 4000);
        }
    
        
        if (shouldShow) {
            console.log('🎮 Controles mobile ativados');
        }
    }

    // Sistema de swipe gestures otimizado
    function initSwipeControls() {
        if (!isMobileDevice()) return;

        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        const DEADZONE = 24;

        canvas.addEventListener('touchstart', function(e) {
            // Reaparece D-Pad ao primeiro toque
            showMobileControlsIfNeeded();
            try { controls = document.getElementById('mobile-controls'); if (controls) { controls.style.display='flex'; controls.style.opacity='0.9'; } } catch(e){}

            e.preventDefault();
            if (e.touches.length !== 1) return;
            
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            isSwipeInProgress = true;
            lastTouchTime = Date.now();
        }, { passive: false });

        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            if (!isSwipeInProgress || e.touches.length !== 1) return;
            
            const touch = e.touches[0];
            touchEndX = touch.clientX;
            touchEndY = touch.clientY;
        }, { passive: false });

        canvas.addEventListener('touchend', function(e) {
            e.preventDefault();
            if (!isSwipeInProgress) return;
            
            isSwipeInProgress = false;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const deltaTime = Date.now() - lastTouchTime;
            
            // Swipes rápidos e precisos
            if (deltaTime > 200) return;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (distance < 15) return;
            
            // Determina direção
            let direction;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                direction = deltaX > 0 ? 'DIR_RIGHT' : 'DIR_LEFT';
            } else {
                direction = deltaY > 0 ? 'DIR_DOWN' : 'DIR_UP';
            }
            
            // Envia comando
            sendDirectionCommand(direction);
            
            // Vibração tátil
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
        }, { passive: false });
    }

    // Observa mudanças de tela
    function observeScreenChanges() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    showMobileControlsIfNeeded();
                }
            });
        });

        const authScreen = document.getElementById('auth-screen');
        const pontosScreen = document.getElementById('pontos-screen');
        
        if (authScreen) observer.observe(authScreen, { attributes: true });
        if (pontosScreen) observer.observe(pontosScreen, { attributes: true });
    }

    // Inicialização definitiva
    function initMobileControls() {
        if (!isMobileDevice()) {
            console.log('📱 Dispositivo desktop detectado - controles mobile desabilitados');
            return;
        }

        console.log('📱 Inicializando controles mobile definitivos...');
        
        // Aguarda o jogo carregar completamente
        const waitForGame = setInterval(() => {
            if (typeof window.pacman !== 'undefined' && window.pacman) {
                clearInterval(waitForGame);
                console.log('🎮 Objeto pacman detectado - integrando controles');
                
                createMobileControls();
                initSwipeControls();
                observeScreenChanges();
                
                console.log('✅ Controles mobile definitivos inicializados');
            } else {
                console.log('⏳ Aguardando objeto pacman...');
            }
        }, 500);

        // Timeout de segurança
        setTimeout(() => {
            clearInterval(waitForGame);
            if (typeof window.pacman === 'undefined') {
                console.warn('⚠️ Objeto pacman não encontrado - criando controles mesmo assim');
                createMobileControls();
                initSwipeControls();
                observeScreenChanges();
            }
        }, 10000);
    }

    // Inicializa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileControls);
    } else {
        initMobileControls();
    }

    // Inicializa também quando o jogo carregar
    window.addEventListener('load', function() {
        setTimeout(initMobileControls, 2000);
    });

    // Exporta funções para uso global
    window.mobileControls = {
        init: initMobileControls,
        show: showMobileControlsIfNeeded,
        isMobile: isMobileDevice,
        sendCommand: sendDirectionCommand
    };

    // Cleanup hook to avoid lingering intervals/listeners between sessions
    window.addEventListener('game:cleanup', function(){ try { stopContinuousDirection(); } catch(e){} });
    window.mobileControls.cleanup = function(){ try { stopContinuousDirection(); } catch(e){} };

})();

