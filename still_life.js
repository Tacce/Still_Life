"use strict";

const cameraState = {
    angleX: 0.17,
    angleY: -1.5,
    D: 12.0,
    near: 0.1,
    far: 100.0,
    fovy: 45.0
};

const lightState = {
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

const flyWingAnimationState = {
    speed: 0.008
};

const butterflyWingAnimationState = {
    speed: 0.002
};

const shadowState = {
    enabled: true
};

const appState = {
    isPaused: false
};

// --- FUNZIONE PONTE PER USARE GLM_UTILS ---
async function loadMeshWithGLM(url) {
    const response = await fetch(url);
    const textData = await response.text();

    let mesh = new subd_mesh();
    glmReadOBJ(textData, mesh);
    
    // Array piatti per WebGL
    let positions = [];
    let normals = [];
    let texCoords = [];

    // glm_utils usa array con indice di partenza 1 (il primo elemento è fittizio)
    for (let i = 1; i <= mesh.nface; i++) {
        let f = mesh.face[i];
        
        // n_v_e indica i vertici per faccia (3 per i triangoli)
        for (let j = 0; j < f.n_v_e; j++) {
            let vIdx = f.vert[j];
            let nIdx = f.normalVertexIndex[j];
            let tIdx = f.textCoordsIndex[j];
            // Inserisci X, Y, Z
            positions.push(mesh.vert[vIdx].x, mesh.vert[vIdx].y, mesh.vert[vIdx].z);

            // Inserisci i, j, k (normali)
            if (nIdx !== undefined && mesh.normal[nIdx]) {
                normals.push(mesh.normal[nIdx].i, mesh.normal[nIdx].j, mesh.normal[nIdx].k);
            } else {
                normals.push(0, 0, 1); // Sicurezza se mancano le normali
            }

            // Inserisci u, v (coordinate texture)
            if (tIdx !== undefined && !isNaN(tIdx) && mesh.textCoords && mesh.textCoords[tIdx]) {
                texCoords.push(mesh.textCoords[tIdx].u, mesh.textCoords[tIdx].v);
            } else {
                texCoords.push(0, 0); // Sicurezza
            }
        }
    }

    return {
    position: { numComponents: 3, data: new Float32Array(positions) },
    normal:   { numComponents: 3, data: new Float32Array(normals) },
    texcoord: { numComponents: 2, data: new Float32Array(texCoords) },
    };
}


// Funzione helper per caricare le texture
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([150, 150, 150, 255]));
    const image = new Image();
    image.src = url;
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    return texture;
}

function createSolidColorTexture(gl, r, g, b, a) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const pixel = new Uint8Array([r, g, b, a]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return texture;
}

async function main() {
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) {
        alert("Il tuo browser non supporta WebGL");
        return;
    }

    const ext = gl.getExtension('WEBGL_depth_texture');
    if (!ext) {
        alert('Il tuo browser non supporta WEBGL_depth_texture');
        return;
    }

    const programInfo = webglUtils.createProgramInfo(gl, ["3d-vertex-shader", "3d-fragment-shader"]);
    const depthProgramInfo = webglUtils.createProgramInfo(gl, ["depth-vertex-shader", "depth-fragment-shader"]);

    const depthTextureSize = 2048;
    const depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, depthTextureSize, depthTextureSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const depthFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const program = programInfo.program; 
    gl.useProgram(program);

    const locations = {
        position: gl.getAttribLocation(program, "a_position"),
        normal: gl.getAttribLocation(program, "a_normal"),
        texcoord: gl.getAttribLocation(program, "a_texcoord"),
        projection: gl.getUniformLocation(program, "u_projection"),
        view: gl.getUniformLocation(program, "u_view"),
        world: gl.getUniformLocation(program, "u_world"),
        worldInverseTranspose: gl.getUniformLocation(program, "u_worldInverseTranspose"),
        textureMatrix: gl.getUniformLocation(program, "u_textureMatrix"),
        lightPos: gl.getUniformLocation(program, "u_lightWorldPosition"),
        viewPos: gl.getUniformLocation(program, "u_viewWorldPosition"),
        ambient: gl.getUniformLocation(program, "u_ambientLight"),
        lightColor: gl.getUniformLocation(program, "u_lightColor"),
        objectColor: gl.getUniformLocation(program, "u_objectColor"),
        diffuseMap: gl.getUniformLocation(program, "u_diffuseMap"),
        projectedTexture: gl.getUniformLocation(program, "u_projectedTexture"),
        bias: gl.getUniformLocation(program, "u_bias"),
        shadowsEnabled: gl.getUniformLocation(program, "u_shadowsEnabled"),
        alpha: gl.getUniformLocation(program, "u_alpha"),
        isDoubleSided: gl.getUniformLocation(program, "u_isDoubleSided")
    };

    // USIAMO LA NUOVA FUNZIONE PONTE CON GLM_UTILS
    const fiascoMesh = await loadMeshWithGLM('resources/obj/Fiasco.obj'); 
    const tavoloMesh = await loadMeshWithGLM('resources/obj/Tavolo.obj');
    const bottiglioneMesh = await loadMeshWithGLM('resources/obj/Bottiglione.obj');
    const vinoMesh = await loadMeshWithGLM('resources/obj/Vino.obj');
    const tappoMesh = await loadMeshWithGLM('resources/obj/Tappo.obj');
    const etichettaMesh = await loadMeshWithGLM('resources/obj/Etichetta.obj');

    // Mosca
    const Fly_corpoMesh = await loadMeshWithGLM('resources/obj/Fly_body.obj');
    const Fly_aladxMesh = await loadMeshWithGLM('resources/obj/Fly_ala_dx.obj');
    const Fly_alasxMesh = await loadMeshWithGLM('resources/obj/Fly_ala_sx.obj');
    const Fly_occhioMesh = await loadMeshWithGLM('resources/obj/Fly_eyes.obj');

    // Farfalla
    const Butterfly_corpoMesh = await loadMeshWithGLM('resources/obj/Butterfly_body.obj');
    const Butterfly_aladxMesh = await loadMeshWithGLM('resources/obj/Butterfly_ala_dx.obj');
    const Butterfly_alasxMesh = await loadMeshWithGLM('resources/obj/Butterfly_ala_sx.obj');

    const fiascoBuffers = webglUtils.createBufferInfoFromArrays(gl, fiascoMesh);
    const tavoloBuffers = webglUtils.createBufferInfoFromArrays(gl, tavoloMesh);
    const bottiglioneBuffers = webglUtils.createBufferInfoFromArrays(gl, bottiglioneMesh);
    const vinoBuffers = webglUtils.createBufferInfoFromArrays(gl, vinoMesh);
    const tappoBuffers = webglUtils.createBufferInfoFromArrays(gl, tappoMesh);
    const etichettaBuffers = webglUtils.createBufferInfoFromArrays(gl, etichettaMesh);
    const corpoBuffers = webglUtils.createBufferInfoFromArrays(gl, Fly_corpoMesh);
    const aladxBuffers = webglUtils.createBufferInfoFromArrays(gl, Fly_aladxMesh);
    const alasxBuffers = webglUtils.createBufferInfoFromArrays(gl, Fly_alasxMesh);
    const occhioBuffers = webglUtils.createBufferInfoFromArrays(gl, Fly_occhioMesh);
    const butterflyCorpoBuffers = webglUtils.createBufferInfoFromArrays(gl, Butterfly_corpoMesh);
    const butterflyAladxBuffers = webglUtils.createBufferInfoFromArrays(gl, Butterfly_aladxMesh);
    const butterflyAlasxBuffers = webglUtils.createBufferInfoFromArrays(gl, Butterfly_alasxMesh);


    const tavoloTexture = loadTexture(gl, 'resources/texture/wood.png'); 
    const fiascoTexture = createSolidColorTexture(gl, 100, 180, 120, 255);
    const bottiglioneTexture = createSolidColorTexture(gl, 194, 116, 0, 255);
    const vinoTexture = createSolidColorTexture(gl, 15, 0, 0, 255);
    const tappoTexture = loadTexture(gl, 'resources/texture/sughero.jpg');
    const etichettaTexture = loadTexture(gl, 'resources/texture/Etichetta.png');
   
    const Fly_corpoTexture = createSolidColorTexture(gl, 50, 50, 50, 255);
    const Fly_alaTexture = loadTexture(gl, 'resources/texture/wings.png');
    const Fly_occhioTexture = loadTexture(gl, 'resources/texture/Insect-eyes.png');
    const butterflyTexture = loadTexture(gl, 'resources/texture/Farfalla.png');

    

    const aladxWorldMatrix = m4.translation(-0.013, 0.157, 0.018);
    const alasxWorldMatrix = m4.translation(-0.013, 0.157, -0.018);
    const flyBaseMatrix = m4.multiply(
        m4.translation(3.0, 0.0, -6.0),
        m4.yRotation(47 * Math.PI / 180)
    );
    // Butterfly wing base translations (left/right)
    const butterflyAlasxWorldMatrix = m4.translation(0.07, 0.05, 0.02); // left (sx)
    const butterflyAladxWorldMatrix = m4.translation(0.07, 0.05, -0.02); // right (dx)


    initInputHandlers(canvas);
    define_gui();

    // Helper per disegnare velocemente nel render loop
    function drawObject(currentProgramInfo, buffers, texture, alpha, worldMatrix = m4.identity(), isDoubleSided = false) {
        webglUtils.setBuffersAndAttributes(gl, currentProgramInfo, buffers);
        gl.uniformMatrix4fv(gl.getUniformLocation(currentProgramInfo.program, "u_world"), false, worldMatrix);

        const witLoc = gl.getUniformLocation(currentProgramInfo.program, "u_worldInverseTranspose");
        if (witLoc) {
            gl.uniformMatrix4fv(witLoc, false, m4.transpose(m4.inverse(worldMatrix)));
        }

        if (currentProgramInfo === programInfo) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1f(locations.alpha, alpha);
            gl.uniform1i(locations.isDoubleSided, isDoubleSided ? 1 : 0);
        }

        webglUtils.drawBufferInfo(gl, buffers);    
    }

    // Calcola la distanza di un oggetto dalla camera
    function getObjectDistance(objectCenter, cameraPos) {
        const dx = objectCenter[0] - cameraPos[0];
        const dy = objectCenter[1] - cameraPos[1];
        const dz = objectCenter[2] - cameraPos[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function drawSceneObjects(currentProgramInfo, sceneState, options = {}) {
        const includeTransparent = options.includeTransparent !== false;
        const shadowPass = options.shadowPass === true;
        const { flyWorldMatrices, butterflyWorldMatrices, cameraPosition } = sceneState;

        drawObject(currentProgramInfo, tavoloBuffers, tavoloTexture, 1.0);
        drawObject(currentProgramInfo, tappoBuffers, tappoTexture, 1.0);
        drawObject(currentProgramInfo, vinoBuffers, vinoTexture, 1.0);
        if (!shadowPass) {
            drawObject(currentProgramInfo, etichettaBuffers, etichettaTexture, 1.0);
        }
        
        drawObject(currentProgramInfo, corpoBuffers, Fly_corpoTexture, 1.0, flyWorldMatrices.corpoWorldMatrix);
        drawObject(currentProgramInfo, aladxBuffers, Fly_alaTexture, 1.0, flyWorldMatrices.aladxWorldMatrixAnimated);
        drawObject(currentProgramInfo, alasxBuffers, Fly_alaTexture, 1.0, flyWorldMatrices.alasxWorldMatrixAnimated);
        drawObject(currentProgramInfo, occhioBuffers, Fly_occhioTexture, 1.0, flyWorldMatrices.occhioWorldMatrix);
        
        drawObject(currentProgramInfo, butterflyCorpoBuffers, butterflyTexture, 1.0, butterflyWorldMatrices.butterflyBaseMatrixAnimated);
        
        gl.disable(gl.CULL_FACE);
        drawObject(currentProgramInfo, butterflyAladxBuffers, butterflyTexture, 1.0, butterflyWorldMatrices.butterflyAladxWorldMatrixAnimated, true);
        drawObject(currentProgramInfo, butterflyAlasxBuffers, butterflyTexture, 1.0, butterflyWorldMatrices.butterflyAlasxWorldMatrixAnimated, true);
        gl.enable(gl.CULL_FACE);


        if (!includeTransparent) {
            return;
        }

        const transparentObjects = [
            { buffers: fiascoBuffers, texture: fiascoTexture, center: [0, 0, -6] },
            { buffers: bottiglioneBuffers, texture: bottiglioneTexture, center: [2.8, 0, -3.8] }
        ];

        transparentObjects.sort((a, b) => {
            const distA = getObjectDistance(a.center, cameraPosition);
            const distB = getObjectDistance(b.center, cameraPosition);
            return distB - distA;
        });

        if (shadowPass) {
            gl.disable(gl.CULL_FACE);
            for (const obj of transparentObjects) {
                drawObject(currentProgramInfo, obj.buffers, obj.texture, 1.0);
            }
            gl.enable(gl.CULL_FACE);
            return;
        }

        gl.enable(gl.BLEND);
        gl.depthMask(false);
        for (const obj of transparentObjects) {
            // Pass 1: facce posteriori
            gl.cullFace(gl.FRONT);
            drawObject(currentProgramInfo, obj.buffers, obj.texture, 0.6);
            
            // Pass 2: facce frontali  
            gl.cullFace(gl.BACK);
            drawObject(currentProgramInfo, obj.buffers, obj.texture, 0.6);
        }
        gl.depthMask(true);
    }

    // Variabili per il calcolo del tempo virtuale
    let virtualTime = 0;
    let lastRealTime = 0;

    function render(time) {

        if (lastRealTime === 0) lastRealTime = time;
        const deltaTime = time - lastRealTime;
        lastRealTime = time; // Aggiorniamo il contatore per il frame successivo

        if (!appState.isPaused) {
            virtualTime += deltaTime;
        }

        const flyAnim = computeFlyAnimation(virtualTime, flyBaseMatrix, aladxWorldMatrix, alasxWorldMatrix);
        const flyWorldMatrices = {
            aladxWorldMatrixAnimated: flyAnim.aladxWorldMatrixAnimated,
            alasxWorldMatrixAnimated: flyAnim.alasxWorldMatrixAnimated,
            corpoWorldMatrix: flyAnim.corpoWorldMatrix,
            occhioWorldMatrix: flyAnim.occhioWorldMatrix,
        };

        const butterflyAnim = computeButterflyAnimation(virtualTime, butterflyAladxWorldMatrix, butterflyAlasxWorldMatrix);
        const butterflyWorldMatrices = {
            butterflyAladxWorldMatrixAnimated: butterflyAnim.butterflyAladxWorldMatrixAnimated,
            butterflyAlasxWorldMatrixAnimated: butterflyAnim.butterflyAlasxWorldMatrixAnimated,
            butterflyBaseMatrixAnimated: butterflyAnim.butterflyBaseMatrixAnimated,
        };

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);     
        gl.cullFace(gl.BACK);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const target = [0, 2, 0]; 
        const up = [0, 1, 0];

        const camX = target[0] + Math.sin(cameraState.angleY) * Math.cos(cameraState.angleX) * cameraState.D;
        const camY = target[1] + Math.sin(cameraState.angleX) * cameraState.D;
        const camZ = target[2] + Math.cos(cameraState.angleY) * Math.cos(cameraState.angleX) * cameraState.D;

        const cameraPosition = [camX, camY, camZ];
        
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projectionMatrix = m4.perspective(cameraState.fovy * Math.PI / 180, aspect, cameraState.near, cameraState.far);
        const cameraMatrix = m4.lookAt(cameraPosition, target, up);
        const viewMatrix = m4.inverse(cameraMatrix);

        const lightWorldMatrix = m4.lookAt([lightState.x, lightState.y, lightState.z], [0, 0, 0], [0, 1, 0]);
        // Calcola automaticamente la frustum minima che copre la scena
        /*const sceneRadius = 10; // raggio approssimativo della scena
        const lightDist = Math.sqrt(lightState.x**2 + lightState.y**2 + lightState.z**2);
        const frustumSize = sceneRadius * (lightDist / lightState.y); // scala con l'angolo

        const lightProjectionMatrix = m4.orthographic(
            -frustumSize, frustumSize, 
            -frustumSize, frustumSize, 
            0.5, lightDist + sceneRadius
        );*/
        const lightProjectionMatrix = m4.orthographic(-10, 10, -10, 10, 0.5, 30);


        if (shadowState.enabled) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
            gl.viewport(0, 0, depthTextureSize, depthTextureSize);
            gl.clear(gl.DEPTH_BUFFER_BIT);
            gl.useProgram(depthProgramInfo.program);
            gl.uniformMatrix4fv(gl.getUniformLocation(depthProgramInfo.program, "u_projection"), false, lightProjectionMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(depthProgramInfo.program, "u_view"), false, m4.inverse(lightWorldMatrix));
            gl.uniformMatrix4fv(gl.getUniformLocation(depthProgramInfo.program, "u_world"), false, m4.identity());
            gl.disable(gl.BLEND);
            drawSceneObjects(depthProgramInfo, { flyWorldMatrices, butterflyWorldMatrices, cameraPosition }, { includeTransparent: true, shadowPass: true });
        }

        let textureMatrix = m4.identity();
        textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
        textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
        textureMatrix = m4.multiply(textureMatrix, lightProjectionMatrix);
        textureMatrix = m4.multiply(textureMatrix, m4.inverse(lightWorldMatrix));

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(programInfo.program);
        gl.uniformMatrix4fv(locations.projection, false, projectionMatrix);
        gl.uniformMatrix4fv(locations.view, false, viewMatrix);
        gl.uniformMatrix4fv(locations.textureMatrix, false, textureMatrix);
        gl.uniform1f(locations.bias, 0);
        gl.uniform3fv(locations.lightPos, [lightState.x, lightState.y, lightState.z]); 
        gl.uniform3fv(locations.viewPos, cameraPosition); 
        gl.uniform3fv(locations.ambient, [lightState.ambientR, lightState.ambientG, lightState.ambientB]); 
        gl.uniform3fv(locations.lightColor, [lightState.lightR, lightState.lightG, lightState.lightB]);
        gl.uniform3fv(locations.objectColor, [0.8, 0.8, 0.8]); 
        gl.uniform1i(locations.diffuseMap, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        gl.uniform1i(locations.projectedTexture, 1);
        gl.uniform1i(locations.shadowsEnabled, shadowState.enabled ? 1 : 0);
        gl.activeTexture(gl.TEXTURE0);

        drawSceneObjects(programInfo, { flyWorldMatrices, butterflyWorldMatrices, cameraPosition }, { includeTransparent: true });

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();
 