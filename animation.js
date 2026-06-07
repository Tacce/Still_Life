window.computeFlyAnimation = function(time, flyBaseMatrix, aladxWorldMatrix, alasxWorldMatrix) {
    const wingPhase = (time * flyWingAnimationState.speed) % 1;
    const wingWave = 1 - 4 * Math.abs(wingPhase - 0.5);
    const wingAngle = Math.round(wingWave * 5) / 5 * 0.6;
    const aladxWorldMatrixAnimated = m4.multiply(
        flyBaseMatrix,
        m4.multiply(aladxWorldMatrix, m4.xRotation(wingAngle))
    );
    const alasxWorldMatrixAnimated = m4.multiply(
        flyBaseMatrix,
        m4.multiply(alasxWorldMatrix, m4.xRotation(-wingAngle))
    );
    const corpoWorldMatrix = flyBaseMatrix;
    const occhioWorldMatrix = flyBaseMatrix;
    return {
        aladxWorldMatrixAnimated,
        alasxWorldMatrixAnimated,
        corpoWorldMatrix,
        occhioWorldMatrix
    };
};

window.computeButterflyAnimation = function(time, butterflyAladxWorldMatrix, butterflyAlasxWorldMatrix) {
    const butterflyWingPhase = (time * butterflyWingAnimationState.speed * 0.15) % 1;
    const butterflyWingWave = 1 - Math.abs(2 * butterflyWingPhase - 1);
    const butterflyWingAngle = butterflyWingWave * (Math.PI / 2);

    const butterflyOrbitPhase = time * 0.00035;
    const butterflyOrbitX = 5 * Math.cos(butterflyOrbitPhase);
    const butterflyOrbitY = 3 + 0.5 * Math.sin(6 * butterflyOrbitPhase);
    const butterflyOrbitZ = 8 * Math.sin(butterflyOrbitPhase);
    // Tangent direction on XZ-plane
    const dirX = 5 * Math.sin(butterflyOrbitPhase);
    const dirZ = -8 * Math.cos(butterflyOrbitPhase);
    const butterflyYaw = Math.atan2(dirX, dirZ) - Math.PI / 2;

    const butterflyBaseMatrixAnimated = m4.multiply(
        m4.translation(butterflyOrbitX, butterflyOrbitY, butterflyOrbitZ),
        m4.multiply(m4.yRotation(butterflyYaw), m4.zRotation(0.3))
    );

    const butterflyAladxWorldMatrixAnimated = m4.multiply(
        butterflyBaseMatrixAnimated,
        m4.multiply(butterflyAladxWorldMatrix, m4.yRotation(-butterflyWingAngle))
    );
    const butterflyAlasxWorldMatrixAnimated = m4.multiply(
        butterflyBaseMatrixAnimated,
        m4.multiply(butterflyAlasxWorldMatrix, m4.yRotation(butterflyWingAngle))
    );

    return {
        butterflyAladxWorldMatrixAnimated,
        butterflyAlasxWorldMatrixAnimated,
        butterflyBaseMatrixAnimated
    };
};
