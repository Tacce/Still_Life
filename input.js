"use strict";

// Oggetto globale che fa da "ponte" tra input.js e still_life.js
const cameraState = {
    angleX: 0.2,
    angleY: 0.0,
    D: 8.0
};

// Funzione da chiamare nel main per attivare i controlli
function initInputHandlers(canvas) {
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

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

    // --- CONTROLLI TOUCH (MOBILE) ---
    canvas.addEventListener('touchstart', (e) => {
        isDragging = true;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
    }, {passive: false});
    
    canvas.addEventListener('touchmove', (e) => {
        if (isDragging) {
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
        }
    }, {passive: false});
    
    canvas.addEventListener('touchend', () => { 
        isDragging = false; 
    });
}