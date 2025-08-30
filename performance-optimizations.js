// performance-optimizations.js - Otimizações de Performance e Segurança

(function() {
    'use strict';

    // === FPS Governor & Visibility Handling ===
    let __preferredUPS = 60;
    let __prevUPS = 60;
    let __visibilityUPS = 1; // enquanto em segundo plano, mantém loop quase ocioso

    async function chooseUPS() {
        let ups = 60;

        // Conexão lenta → reduz UPS
        try {
            const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (c) {
                if (c.saveData) ups = Math.min(ups, 30);
                if (c.effectiveType && /(^|-)2g$/.test(c.effectiveType)) ups = Math.min(ups, 30);
            }
        } catch(e){}

        // Memória do dispositivo muito baixa → reduz UPS
        try {
            if (navigator.deviceMemory && navigator.deviceMemory <= 2) ups = Math.min(ups, 45);
        } catch(e){}

        // Battery API: nível baixo e não carregando → reduz UPS
        try {
            if (navigator.getBattery) {
                const b = await navigator.getBattery();
                if (!b.charging && b.level <= 0.2) ups = Math.min(ups, 30);
            }
        } catch(e){}

        __preferredUPS = ups;
        return ups;
    }

    function applyUPS(ups) {
        try {
            if (window.executive && typeof window.executive.setUpdatesPerSecond === 'function') {
                window.executive.setUpdatesPerSecond(ups);
                __prevUPS = ups;
                console.log('⚙️ UPS ajustado para', ups);
            }
        } catch(e){ console.warn('Não foi possível ajustar UPS:', e); }
    }

    function setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                applyUPS(__visibilityUPS);
                // pausa música de fundo, se existir
                const bg = document.getElementById('bg-music');
                try { if (bg && !bg.paused) bg.pause(); } catch(e){}
            } else {
applyUPS(__preferredUPS || 60);
                // Não retome bg-music aqui. O gerenciador de áudio do jogo controla a música.
            }
        });
    }

    function setupPassiveListeners() {
        try {
            window.addEventListener('scroll', ()=>{}, {passive:true});
            window.addEventListener('wheel', ()=>{}, {passive:true});
        } catch(e){}
    }


    // Debounce function para otimizar eventos
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function para eventos de alta frequência
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Validação de entrada segura
    function sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input
            .replace(/[<>]/g, '') // Remove caracteres HTML básicos
            .replace(/javascript:/gi, '') // Remove javascript: URLs
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim()
            .substring(0, 1000); // Limita tamanho
    }

    // Validação de email mais robusta
    function isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    // Validação de WhatsApp
    function isValidWhatsApp(whatsapp) {
        const cleanWhatsapp = whatsapp.replace(/\D/g, '');
        return cleanWhatsapp.length >= 10 && cleanWhatsapp.length <= 15;
    }

    // Validação de nome
    function isValidName(name) {
        const nameRegex = /^[a-zA-ZÀ-ÿ\s]{2,100}$/;
        const words = name.trim().split(/\s+/);
        return nameRegex.test(name) && words.length >= 2 && words.every(word => word.length >= 2);
    }

    // Rate limiting simples
    const rateLimiter = {
        attempts: new Map(),
        isAllowed: function(key, maxAttempts = 5, windowMs = 300000) { // 5 tentativas em 5 minutos
            const now = Date.now();
            const attempts = this.attempts.get(key) || [];
            
            // Remove tentativas antigas
            const validAttempts = attempts.filter(time => now - time < windowMs);
            
            if (validAttempts.length >= maxAttempts) {
                return false;
            }
            
            validAttempts.push(now);
            this.attempts.set(key, validAttempts);
            return true;
        }
    };

    // Monitoramento de performance
    const performanceMonitor = {
        metrics: {},
        
        startTimer: function(name) {
            this.metrics[name] = { start: performance.now() };
        },
        
        endTimer: function(name) {
            if (this.metrics[name]) {
                this.metrics[name].duration = performance.now() - this.metrics[name].start;
                console.log(`⏱️ ${name}: ${this.metrics[name].duration.toFixed(2)}ms`);
            }
        },
        
        logMemoryUsage: function() {
            if (performance.memory) {
                console.log('💾 Memory Usage:', {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
                });
            }
        }
    };

    // Otimização de imagens lazy loading
    function setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    // Preload de recursos críticos
    function preloadCriticalResources() {
        const criticalResources = [
            'font/ARCADE_R.TTF',
            'img/capa.jpg',
            'sounds/coffee-break-music.mp3'
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            
            if (resource.endsWith('.ttf')) {
                link.as = 'font';
                link.type = 'font/ttf';
                link.crossOrigin = 'anonymous';
            } else if (resource.endsWith('.jpg') || resource.endsWith('.png')) {
                link.as = 'image';
            } else if (resource.endsWith('.mp3')) {
                link.as = 'audio';
            }
            
            link.href = resource;
            document.head.appendChild(link);
        });
    }

    // Otimização de eventos de resize
    const optimizedResize = debounce(() => {
        // Atualiza controles mobile se necessário
        if (window.mobileControls && window.mobileControls.show) {
            window.mobileControls.show();
        }
        
        // Redimensiona canvas se necessário
        const canvas = document.getElementById('canvas');
        if (canvas && window.innerWidth <= 768) {
            const maxWidth = window.innerWidth - 20;
            const maxHeight = window.innerHeight * 0.7;
            
            if (canvas.width > maxWidth || canvas.height > maxHeight) {
                const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
                canvas.style.transform = `scale(${scale})`;
                canvas.style.transformOrigin = 'top left';
            }
        }
    }, 250);

    // Detecção de conexão lenta
    function detectSlowConnection() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            const slowConnections = ['slow-2g', '2g', '3g'];
            
            if (slowConnections.includes(connection.effectiveType)) {
                console.log('🐌 Conexão lenta detectada, aplicando otimizações...');
                
                // Reduz qualidade de áudio se possível
                const audio = document.getElementById('bg-music');
                if (audio) {
                    audio.preload = 'none';
                }
                
                // Mostra aviso para o usuário
                if (window.notifications) {
                    window.notifications.show(
                        'Conexão lenta detectada. O jogo pode carregar mais devagar.',
                        'warning',
                        5000
                    );
                }
                
                return true;
            }
        }
        return false;
    }

    // Limpeza de memória
    function cleanupMemory() {
        // Remove event listeners não utilizados
        const unusedElements = document.querySelectorAll('[data-cleanup]');
        unusedElements.forEach(element => {
            element.removeEventListener('click', element._clickHandler);
            element.removeEventListener('touchstart', element._touchHandler);
        });

        // Força garbage collection se disponível
        if (window.gc) {
            window.gc();
        }
    }

    // Monitoramento de erros
    function setupErrorMonitoring() {
        window.addEventListener('error', (event) => {
            console.error('🚨 JavaScript Error:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });

            // Envia erro para analytics se configurado
            if (window.trackGameplayEvent) {
                window.trackGameplayEvent('error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno
                });
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Unhandled Promise Rejection:', event.reason);
            
            if (window.trackGameplayEvent) {
                window.trackGameplayEvent('promise_rejection', {
                    reason: event.reason?.toString() || 'Unknown'
                });
            }
        });
    }

    // Otimização de formulários
    function optimizeForms() {
        const forms = document.querySelectorAll('form, [data-form]');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                // Adiciona validação em tempo real com debounce
                const debouncedValidation = debounce(() => {
                    validateInput(input);
                }, 300);
                
                input.addEventListener('input', debouncedValidation);
                input.addEventListener('blur', () => validateInput(input));
            });
        });
    }

    function validateInput(input) {
        const value = sanitizeInput(input.value);
        let isValid = true;
        let errorMessage = '';

        switch (input.type) {
            case 'email':
                isValid = isValidEmail(value);
                errorMessage = 'Email inválido';
                break;
            case 'tel':
                isValid = isValidWhatsApp(value);
                errorMessage = 'WhatsApp inválido';
                break;
            case 'text':
                if (input.placeholder.includes('Nome')) {
                    isValid = isValidName(value);
                    errorMessage = 'Nome deve ter pelo menos 2 palavras';
                }
                break;
            case 'password':
                isValid = value.length >= 6;
                errorMessage = 'Senha deve ter pelo menos 6 caracteres';
                break;
        }

        // Atualiza visual do input
        input.style.borderColor = isValid ? '#f5d922' : '#ff4444';
        
        // Remove mensagem de erro anterior
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Adiciona mensagem de erro se necessário
        if (!isValid && value.length > 0) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = 'color: #ff4444; font-size: 12px; margin-top: 5px;';
            errorDiv.textContent = errorMessage;
            input.parentNode.appendChild(errorDiv);
        }

        return isValid;
    }

    // Inicialização das otimizações
    function initOptimizations() {

        // Governação de FPS/UPS adaptativa
        try { 
            chooseUPS().then(applyUPS);
            setupVisibilityHandling();
            setupPassiveListeners();
        } catch(e){}

        console.log('🚀 Inicializando otimizações de performance...');
        
        performanceMonitor.startTimer('initialization');
        
        // Setup básico
        setupErrorMonitoring();
        setupLazyLoading();
        optimizeForms();
        
        // Detecta conexão lenta
        detectSlowConnection();
        
        // Preload de recursos críticos
        preloadCriticalResources();
        
        // Event listeners otimizados
        window.addEventListener('resize', optimizedResize);
        
        // Limpeza periódica de memória
        setInterval(cleanupMemory, 300000); // A cada 5 minutos
        
        // Log de uso de memória em desenvolvimento
        if (window.location.hostname === 'localhost') {
            setInterval(() => performanceMonitor.logMemoryUsage(), 60000);
        }
        
        performanceMonitor.endTimer('initialization');
        
        console.log('✅ Otimizações de performance carregadas');
    }

    // Exporta funções úteis
    window.gameOptimizations = {
        sanitizeInput,
        isValidEmail,
        isValidWhatsApp,
        isValidName,
        rateLimiter,
        performanceMonitor,
        debounce,
        throttle
    };

    // Inicializa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOptimizations);
    } else {
        initOptimizations();
    }

})();

