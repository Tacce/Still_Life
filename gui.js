function define_gui() {
    const gui = new dat.GUI();
    gui.width = 320;

    const defaultCameraState = {
        angleX: 0.17,
        angleY: -1.5,
        D: 12.0,
        near: 0.1,
        far: 100.0,
        fovy: 45.0
    };

    const defaultLightState = {
        x: -1.0,
        y: 10.0,
        z: 5.0,
        ambientR: 0.2,
        ambientG: 0.2,
        ambientB: 0.25,
        lightR: 1.0,
        lightG: 0.9,
        lightB: 0.8
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

    function refreshControllers(folder) {
        folder.__controllers.forEach((controller) => controller.updateDisplay());
        folder.__folders && Object.values(folder.__folders).forEach((subFolder) => refreshControllers(subFolder));
    }

    function resetToDefaults() {
        Object.assign(cameraState, defaultCameraState);
        Object.assign(lightState, defaultLightState);
        Object.assign(flyWingAnimationState, defaultFlyWingAnimationState);
        Object.assign(butterflyWingAnimationState, defaultButterflyWingAnimationState);
        Object.assign(shadowState, defaultShadowState);
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
    lightFolder.add(lightState, "x", -20.0, 20.0, 0.1).listen();
    lightFolder.add(lightState, "y", -20.0, 20.0, 0.1).listen();
    lightFolder.add(lightState, "z", -20.0, 20.0, 0.1).listen();
    lightFolder.add(lightState, "ambientR", 0.0, 1.0, 0.01).listen();
    lightFolder.add(lightState, "ambientG", 0.0, 1.0, 0.01).listen();
    lightFolder.add(lightState, "ambientB", 0.0, 1.0, 0.01).listen();
    lightFolder.add(lightState, "lightR", 0.0, 1.0, 0.01).listen();
    lightFolder.add(lightState, "lightG", 0.0, 1.0, 0.01).listen();
    lightFolder.add(lightState, "lightB", 0.0, 1.0, 0.01).listen();
    lightFolder.open();

    const shadowFolder = gui.addFolder("Shadow Mapping");
    shadowFolder.add(shadowState, "enabled").name("Enable shadows").listen();
    shadowFolder.open();

    const animationFolder = gui.addFolder("Animation");
    animationFolder.add(flyWingAnimationState, "speed", 0.0, 0.02, 0.0005).name("Fly wing speed").listen();
    animationFolder.add(butterflyWingAnimationState, "speed", 0.0, 0.005, 0.001).name("Butterfly wing speed").listen();
    animationFolder.open();
}