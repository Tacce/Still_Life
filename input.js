"use strict";

function initInputHandlers(canvas) {
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

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
    const pauseBtn = document.getElementById('mobile-pause-btn');

    function togglePause() {
        appState.isPaused = !appState.isPaused;
        if (pauseBtn) {
            pauseBtn.innerText = appState.isPaused ? "Play" : "Pause";
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'p' || e.key === 'P') {
            togglePause();
        }
    });

    if (pauseBtn) {
        pauseBtn.addEventListener('click', (e) => {
            togglePause();
        });

        pauseBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        pauseBtn.addEventListener('touchstart', (e) => e.stopPropagation());
    }

    // --- CONTROLLI TOUCH (Mobile) ---
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            // 1 DITO: Inizia la rotazione
            isDragging = true;
            isPinching = false;
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // 2 DITA: Inizia lo zoom
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
            
            // Salva la nuova distanza per il frame successivo
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