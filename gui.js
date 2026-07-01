window.guiInstance = null;

function define_gui() {
    
    window.guiInstance = new dat.GUI();
    const gui = window.guiInstance;
    gui.width = 320;
    gui.close();

    let shadingToggleController = null;

    const defaultCameraState = {
        angleX: 0.17,
        angleY: -1.5,
        D: 12.0,
        near: 0.1,
        far: 200.0,
        fovy: 45.0
    };

    const defaultFlyWingAnimationState = {
        speed: 0.008
    };
    const defaultButterflyWingAnimationState = {
        speed: 0.002
    };

    const defaultShadowState = {
        enabled: true
    };

    const defaultBumpState = {
        enabled: true
    };


    function refreshControllers(folder) {
        folder.__controllers.forEach((controller) => controller.updateDisplay());
        folder.__folders && Object.values(folder.__folders).forEach((subFolder) => refreshControllers(subFolder));
    }

    function resetToDefaults() {
        Object.assign(cameraState, defaultCameraState);
        Object.assign(flyWingAnimationState, defaultFlyWingAnimationState);
        Object.assign(butterflyWingAnimationState, defaultButterflyWingAnimationState);
        Object.assign(shadowState, defaultShadowState);
        Object.assign(bumpState, defaultBumpState);

        const currentPreset = skyboxPresets[appState.currentSkybox];
        if (currentPreset && currentPreset.light) {
            Object.assign(lightState, currentPreset.light);
        }
        refreshControllers(gui);
    }

    gui.add({ reset: resetToDefaults }, "reset").name("Reset defaults");
    
    const cameraFolder = gui.addFolder("Camera");
    cameraFolder.add(cameraState, "angleX", -1.5, 1.5, 0.01).listen();
    cameraFolder.add(cameraState, "angleY", -Math.PI, Math.PI, 0.01).listen();
    cameraFolder.add(cameraState, "D", 2.0, 20.0, 0.1).listen();
    cameraFolder.add(cameraState, "near", 0.1, 10.0, 0.1).listen();
    cameraFolder.add(cameraState, "far", 1.0, 200.0, 1.0).listen();
    cameraFolder.add(cameraState, "fovy", 20.0, 120.0, 1.0).listen();
    cameraFolder.open();

    const lightFolder = gui.addFolder("Light");
    lightFolder.add(lightState, "x", -10.0, 10.0, 0.1).listen();
    lightFolder.add(lightState, "y", 5.0, 15.0, 0.1).listen();
    lightFolder.add(lightState, "z", -15.0, 15.0, 0.1).listen();
    lightFolder.add(lightState, "ambientR", 0.0, 1.0, 0.01).listen();
    lightFolder.add(lightState, "ambientG", 0.0, 1.0, 0.01).listen();
    lightFolder.add(lightState, "ambientB", 0.0, 1.0, 0.01).listen();
    lightFolder.add(lightState, "lightR", 0.0, 1.0, 0.01).listen();
    lightFolder.add(lightState, "lightG", 0.0, 1.0, 0.01).listen();
    lightFolder.add(lightState, "lightB", 0.0, 1.0, 0.01).listen();
    lightFolder.open();

    const specialFolder = gui.addFolder("Advanced Rendering");
    specialFolder.add(shadowState, "enabled").name("Enable shadows").listen();
    specialFolder.add(renderStyleState, "shadingType", ["Phong", "Flat"]).name("Shading Style").listen();
    specialFolder.add(bumpState, "enabled").name("Enable bump mapping").listen();
    specialFolder.open();

    const animationFolder = gui.addFolder("Animation");
    animationFolder.add(flyWingAnimationState, "speed", 0.0, 0.02, 0.0005).name("Fly wing speed").listen();
    animationFolder.add(butterflyWingAnimationState, "speed", 0.0, 0.005, 0.001).name("Butterfly wing speed").listen();
    animationFolder.open();

    const envFolder = gui.addFolder("Ambiente & Skybox");
    
    envFolder.add(appState, "currentSkybox", ["Nessuna", "Giorno", "Notte"])
        .name("Skybox")
        .onChange((value) => {
            if (window.changeEnvironment) {
                window.changeEnvironment(value);
                // Forza la GUI ad aggiornare i cursori della luce
                refreshControllers(gui);
            }
        });
        
    envFolder.open();
}

// Aggiungi questa funzione in gui.js
window.updateGuiDisplay = function() {
    function refreshRecursive(folder) {
        // Aggiorna i controller del folder attuale
        folder.__controllers.forEach(c => c.updateDisplay());
        // Aggiorna ricorsivamente i sub-folders
        for (let name in folder.__folders) {
            refreshRecursive(folder.__folders[name]);
        }
    }
    
    if (window.guiInstance) {
        refreshRecursive(window.guiInstance);
    }
};