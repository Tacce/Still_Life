"use strict";

function initInputHandlers(canvas) {
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    function wrapAngle(angle) {
        const twoPi = Math.PI * 2;
        return ((angle + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
    }

    const pressedKeys = new Set();
    let lastLightMoveTime = performance.now();

    function moveLight(deltaSeconds) {
        if (!canMoveLight()) {
            return;
        }

        const speed = 10.0;
        const step = speed * deltaSeconds;

        if (pressedKeys.has('w')) lightState.x += step;
        if (pressedKeys.has('s')) lightState.x -= step;
        if (pressedKeys.has('a')) lightState.z -= step;
        if (pressedKeys.has('d')) lightState.z += step;
        if (pressedKeys.has('q')) lightState.y += step;
        if (pressedKeys.has('e')) lightState.y -= step;

        lightState.x = Math.max(-10.0, Math.min(10.0, lightState.x));
        lightState.y = Math.max(5.0, Math.min(15.0, lightState.y));
        lightState.z = Math.max(-15.0, Math.min(15.0, lightState.z));
    }

    function isLightMovementKey(key) {
        return key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'q' || key === 'e';
    }

    function pressLightKey(key) {
        if (!canMoveLight()) {
            return;
        }

        pressedKeys.add(key);
        if (pressedKeys.size === 1) {
            lastLightMoveTime = performance.now();
        }
    }

    function releaseLightKey(key) {
        pressedKeys.delete(key);
    }

    function clearLightKeys() {
        pressedKeys.clear();
    }

    function updateLightMovement(now) {
        if (canMoveLight()) {
            const delta = (now - lastLightMoveTime) / 1000.0;
            lastLightMoveTime = now;

            if (pressedKeys.size > 0) {
                moveLight(delta);
            }
        } else {
            lastLightMoveTime = now;
            if (pressedKeys.size > 0) {
                clearLightKeys();
            }
        }

        requestAnimationFrame(updateLightMovement);
    }

    let isPinching = false;
    let lastPinchDistance = 0;

    function getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // --- CONTROLLI MOUSE ---
    canvas.addEventListener('mousedown', (e) => { 
        isDragging = true; 
        lastMouseX = e.clientX; 
        lastMouseY = e.clientY; 
    });
    
    canvas.addEventListener('mouseup', () => { 
        isDragging = false; 
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            cameraState.angleY -= (e.clientX - lastMouseX) * 0.01; 
            cameraState.angleY = wrapAngle(cameraState.angleY);
            cameraState.angleX += (e.clientY - lastMouseY) * 0.01;
            
            const limit = Math.PI / 2 - 0.05;
            if (cameraState.angleX > 0) {
                cameraState.angleX = Math.min(limit, cameraState.angleX);
            } else {
                cameraState.angleX = Math.max(-limit, cameraState.angleX);
            }
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    // --- ZOOM CON ROTELLINA ---
    canvas.addEventListener('wheel', (e) => {
        if (e.deltaY < 0) cameraState.D -= 0.5; 
        else if (e.deltaY > 0) cameraState.D += 0.5; 
        
        cameraState.D = Math.max(2.0, Math.min(20.0, cameraState.D));
        e.preventDefault();
    }, {passive: false});

    // --- CONTROLLI PAUSA (Tastiera e Mobile) ---
    const mainControls = document.getElementById('mobile-main-controls');
    const lightControls = document.getElementById('mobile-light-controls');
    const pauseBtn = document.getElementById('mobile-pause-btn');
    const skyboxBtn = document.getElementById('mobile-skybox-btn');
    const lightBtn = document.getElementById('mobile-light-btn');
    const lightBackBtn = document.getElementById('mobile-light-back-btn');
    const lightKeyButtons = document.querySelectorAll('[data-light-key]');

    function canMoveLight() {
        return appState.currentSkybox === 'Nessuna';
    }

    function syncLightControlsVisibility() {
        const lightMovementAllowed = canMoveLight();

        if (lightBtn) {
            lightBtn.classList.toggle('hidden', !lightMovementAllowed);
        }

        if (!lightMovementAllowed && lightControls && !lightControls.classList.contains('hidden')) {
            showMainMobileControls();
        }
    }

    function showMainMobileControls() {
        clearLightKeys();
        if (mainControls) {
            mainControls.classList.remove('hidden');
        }
        if (lightControls) {
            lightControls.classList.add('hidden');
        }
    }

    function showLightMobileControls() {
        clearLightKeys();
        if (mainControls) {
            mainControls.classList.add('hidden');
        }
        if (lightControls) {
            lightControls.classList.remove('hidden');
        }
    }

    function bindHoldButton(button, key) {
        if (!button) return;

        button.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            button.setPointerCapture(e.pointerId);
            pressLightKey(key);
        });

        button.addEventListener('pointerup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            releaseLightKey(key);
        });

        button.addEventListener('pointercancel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            releaseLightKey(key);
        });

        button.addEventListener('pointerleave', () => {
            releaseLightKey(key);
        });
    }

    function togglePause() {
        appState.isPaused = !appState.isPaused;
        if (pauseBtn) {
            pauseBtn.innerText = appState.isPaused ? "Play" : "Pause";
        }
    }

    function cycleSkybox() {
        const presetNames = Object.keys(skyboxPresets);
        const currentIndex = presetNames.indexOf(appState.currentSkybox);
        const nextIndex = (currentIndex + 1) % presetNames.length;
        
        appState.currentSkybox = presetNames[nextIndex];
        
        if (window.changeEnvironment) {
            window.changeEnvironment(appState.currentSkybox);
            
            // Aggiorna la GUI se aperta
            if (window.updateGuiDisplay) {
                window.updateGuiDisplay();
            }
        }
    }

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();

        if (isLightMovementKey(key) && canMoveLight()) {
            pressedKeys.add(key);
            e.preventDefault();
            if (pressedKeys.size === 1) {
                lastLightMoveTime = performance.now();
                moveLight(0.0);
            }
            return;
        }

        if (e.key === 'p' || e.key === 'P') {
            togglePause();
        }

        if (e.key === 'b' || e.key === 'B') {
            cycleSkybox();
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (isLightMovementKey(key)) {
            pressedKeys.delete(key);
            e.preventDefault();
        }
    });

    if (pauseBtn) {
        pauseBtn.addEventListener('click', (e) => {
            togglePause();
        });

        pauseBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        pauseBtn.addEventListener('touchstart', (e) => e.stopPropagation());
    }

    if (skyboxBtn) {
        skyboxBtn.addEventListener('click', (e) => {
            cycleSkybox();
        });

        skyboxBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        skyboxBtn.addEventListener('touchstart', (e) => e.stopPropagation());
    }

    if (lightBtn) {
        lightBtn.addEventListener('click', () => {
            if (!canMoveLight()) {
                return;
            }

            showLightMobileControls();
        });
        lightBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        lightBtn.addEventListener('touchstart', (e) => e.stopPropagation());
    }

    if (lightBackBtn) {
        lightBackBtn.addEventListener('click', () => {
            showMainMobileControls();
        });
        lightBackBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        lightBackBtn.addEventListener('touchstart', (e) => e.stopPropagation());
    }

    lightKeyButtons.forEach((button) => {
        bindHoldButton(button, button.dataset.lightKey);
    });

    window.updateLightControlsVisibility = syncLightControlsVisibility;
    syncLightControlsVisibility();

    requestAnimationFrame(updateLightMovement);

    // --- CONTROLLI TOUCH (Mobile) ---
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            // 1 dito :rotazione
            isDragging = true;
            isPinching = false;
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // 2 dita: zoom
            isDragging = false; // Ferma la rotazione
            isPinching = true;
            lastPinchDistance = getPinchDistance(e.touches);
        }
    }, {passive: false});
    
    canvas.addEventListener('touchmove', (e) => {
        // FONDAMENTALE: Impedisce allo schermo intero del telefono di zoomare o scorrere
        e.preventDefault();

        if (isDragging && e.touches.length === 1) {
            // --- LOGICA ROTAZIONE (1 dito) ---
            const deltaX = e.touches[0].clientX - lastMouseX;
            const deltaY = e.touches[0].clientY - lastMouseY;
            cameraState.angleY += deltaX * 0.01;
            cameraState.angleY = wrapAngle(cameraState.angleY);
            cameraState.angleX += deltaY * 0.01;
            
            const limit = Math.PI / 2 - 0.05;
            if (cameraState.angleX > 0) {
                cameraState.angleX = Math.min(limit, cameraState.angleX);
            } else {
                cameraState.angleX = Math.max(-limit, cameraState.angleX);
            }            
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;

        } else if (isPinching && e.touches.length === 2) {
            // --- LOGICA PINCH-TO-ZOOM (2 dita) ---
            const currentPinchDistance = getPinchDistance(e.touches);
            
            const pinchDelta = lastPinchDistance - currentPinchDistance;
            
            const sensibility = 0.05
            cameraState.D += pinchDelta * sensibility;
            cameraState.D = Math.max(2.0, Math.min(20.0, cameraState.D));
            
            // Salviamo la nuova distanza per il frame successivo
            lastPinchDistance = currentPinchDistance;
        }
    }, {passive: false});
    
    canvas.addEventListener('touchend', (e) => { 
        if (e.touches.length === 0) {
            isDragging = false; 
            isPinching = false;
        } else if (e.touches.length === 1) {
            isPinching = false;
            isDragging = true;
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        }
    });
}