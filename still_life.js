"use strict";

const cameraState = {
    angleX: 0.17,
    angleY: -1.5,
    D: 12.0,
    near: 0.1,
    far: 200.0,
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

const bumpState = {
    enabled: true
};

const appState = {
    isPaused: false,
    currentSkybox: 'Nessuna'
};

const skyboxPresets = {
    'Nessuna': {
        url: null,
        floor_url: null,
        light: { x: -1.0, y: 10.0, z: 5.0, ambientR: 0.2, ambientG: 0.2, ambientB: 0.25, lightR: 1.0, lightG: 0.9, lightB: 0.8 }
    },
    'Giorno': {
        url: 'resources/skybox/giorno.png',
        floor_url: 'resources/texture/floor_giorno.png',
        light: { x: 9, y: 8.0, z: 15.3, ambientR: 0.42, ambientG: 0.38, ambientB: 0.35, lightR: 1.0, lightG: 0.95, lightB: 0.9 }
    },
    'Notte': {
        url: 'resources/skybox/notte.png',
        floor_url: 'resources/texture/floor_notte.png',
        light: { x: -1.0, y: 9.0, z: -12.0, ambientR: 0., ambientG: 0., ambientB: 0.0, lightR: 0.15, lightG: 0.2, lightB: 0.35 } 
    }
};

const renderStyleState = {
    shadingType: 'Phong' 
}

// --- FUNZIONE PONTE PER USARE GLM_UTILS ---
async function loadMeshWithGLM(url) {
    const response = await fetch(url);
    const textData = await response.text();

    let mesh = new subd_mesh();
    glmReadOBJ(textData, mesh);

    let positions = [];
    let normals = [];
    let texCoords = [];
    let flatNormals = [];
    let tangents = []; 

    for (let i = 1; i <= mesh.nface; i++) {
        let f = mesh.face[i];
        let fNorm = mesh.facetnorms[f.normalFaceIndex];
        
        // Prima raccogliamo i dati del triangolo per calcolare la Tangente
        let p = [], uv = [];
        for (let j = 0; j < f.n_v_e; j++) {
            let vIdx = f.vert[j];
            let tIdx = f.textCoordsIndex[j];
            p.push([mesh.vert[vIdx].x, mesh.vert[vIdx].y, mesh.vert[vIdx].z]);
            if (tIdx !== undefined && !isNaN(tIdx) && mesh.textCoords && mesh.textCoords[tIdx]) {
                uv.push([mesh.textCoords[tIdx].u, mesh.textCoords[tIdx].v]);
            } else {
                uv.push([0, 0]);
            }
        }

        // Calcolo Matematico della Tangente della Faccia
        let tx = 1, ty = 0, tz = 0;
        if (p.length >= 3) {
            let dx1 = p[1][0] - p[0][0], dy1 = p[1][1] - p[0][1], dz1 = p[1][2] - p[0][2];
            let dx2 = p[2][0] - p[0][0], dy2 = p[2][1] - p[0][1], dz2 = p[2][2] - p[0][2];
            let du1 = uv[1][0] - uv[0][0], dv1 = uv[1][1] - uv[0][1];
            let du2 = uv[2][0] - uv[0][0], dv2 = uv[2][1] - uv[0][1];
            let det = du1 * dv2 - du2 * dv1;
            if (det !== 0) {
                let r = 1.0 / det;
                tx = (dv2 * dx1 - dv1 * dx2) * r;
                ty = (dv2 * dy1 - dv1 * dy2) * r;
                tz = (dv2 * dz1 - dv1 * dz2) * r;
                let len = Math.sqrt(tx*tx + ty*ty + tz*tz);
                if (len > 0) { tx/=len; ty/=len; tz/=len; }
            }
        }

        for (let j = 0; j < f.n_v_e; j++) {
            let vIdx = f.vert[j];
            let nIdx = f.normalVertexIndex[j];
            let tIdx = f.textCoordsIndex[j];
            
            positions.push(mesh.vert[vIdx].x, mesh.vert[vIdx].y, mesh.vert[vIdx].z);

            // Inserisci i, j, k (normali)
            if (nIdx !== undefined && mesh.normal[nIdx]) {
                normals.push(mesh.normal[nIdx].i, mesh.normal[nIdx].j, mesh.normal[nIdx].k);
            } else { normals.push(0, 0, 1); }

            // Inserisci u, v (coordinate texture)
            if (tIdx !== undefined && !isNaN(tIdx) && mesh.textCoords && mesh.textCoords[tIdx]) {
                texCoords.push(mesh.textCoords[tIdx].u, mesh.textCoords[tIdx].v);
            } else { texCoords.push(0, 0); }

            flatNormals.push(fNorm.i, fNorm.j, fNorm.k);
            tangents.push(tx, ty, tz);
        }
    }

    return {
        position:   { numComponents: 3, data: new Float32Array(positions) },
        normal:     { numComponents: 3, data: new Float32Array(normals) },
        texcoord:   { numComponents: 2, data: new Float32Array(texCoords) },
        flatNormal: { numComponents: 3, data: new Float32Array(flatNormals) },
        tangent:    { numComponents: 3, data: new Float32Array(tangents) } 
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

function loadBumpTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array([128]));
    const image = new Image();
    image.src = url;
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    };
    return texture;
}

async function main() {
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl",{stencil:true});
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
    const planarShadowProgramInfo = webglUtils.createProgramInfo(gl, ["planar-shadow-vertex-shader", "planar-shadow-fragment-shader"]);

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


    const skyboxProgramInfo = webglUtils.createProgramInfo(gl, ["skybox-vertex-shader", "skybox-fragment-shader"]);
    const quadVertices = createXYQuadVertices(); 
    const quadBufferInfo = webglUtils.createBufferInfoFromArrays(gl, quadVertices);
    
    let activeSkyboxTexture = null;

    const floorProgramInfo = webglUtils.createProgramInfo(gl, ["floor-vertex-shader", "floor-fragment-shader"]);
    const floorBufferInfo = createFloorBufferInfo(gl);
    let activeFloorTexture = null;
    
    window.changeEnvironment = function(presetName) {
        const preset = skyboxPresets[presetName];
        if (!preset) return;

        Object.assign(lightState, preset.light);

        if (presetName === 'Nessuna') {
            activeSkyboxTexture = null;
            activeFloorTexture = null;
        } else {
            activeSkyboxTexture = loadCubemapFromCross(gl, preset.url);
            activeFloorTexture = loadTexture(gl, preset.floor_url);
        }
    };

    // Inizializziamo l'ambiente di default all'avvio
    window.changeEnvironment(appState.currentSkybox);
    const program = programInfo.program; 
    gl.useProgram(program);

    const locations = {
        position: gl.getAttribLocation(program, "a_position"),
        normal: gl.getAttribLocation(program, "a_normal"),
        flatNormal: gl.getAttribLocation(program, "a_flatNormal"),
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
        isDoubleSided: gl.getUniformLocation(program, "u_isDoubleSided"),
        useFlatShading: gl.getUniformLocation(program, "u_useFlatShading"),
        Ka: gl.getUniformLocation(program, "u_Ka"),
        Kd: gl.getUniformLocation(program, "u_Kd"),
        Ks: gl.getUniformLocation(program, "u_Ks"),
        shininess: gl.getUniformLocation(program, "u_shininess"),
        tangent: gl.getAttribLocation(program, "a_tangent"),
        bumpMap: gl.getUniformLocation(program, "u_bumpMap"),
        useBumpMap: gl.getUniformLocation(program, "u_useBumpMap"),
        bumpStrength: gl.getUniformLocation(program, "u_bumpStrength"),
        bumpMapSize: gl.getUniformLocation(program, "u_bumpMapSize"),
        bumpTiling:   gl.getUniformLocation(program, "u_bumpTiling"),
        bumpScale:    gl.getUniformLocation(program, "u_bumpScale"),
    };

    // USIAMO LA NUOVA FUNZIONE PONTE CON GLM_UTILS
    const fiascoMesh = await loadMeshWithGLM('resources/obj/Fiasco.obj'); 
    const tavoloMesh = await loadMeshWithGLM('resources/obj/Tavolo.obj');
    const bottiglioneMesh = await loadMeshWithGLM('resources/obj/Bottiglione.obj');
    const vinoMesh = await loadMeshWithGLM('resources/obj/Vino.obj');
    const tappoMesh = await loadMeshWithGLM('resources/obj/Tappo.obj');
    const etichettaMesh = await loadMeshWithGLM('resources/obj/Etichetta.obj');
    const tovagliaMesh = await loadMeshWithGLM('resources/obj/Tovaglia.obj');

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
    const tovagliaBuffers = webglUtils.createBufferInfoFromArrays(gl, tovagliaMesh);
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
    const tovagliaTexture = loadTexture(gl, 'resources/texture/tovaglia.jpg');
   
    const Fly_corpoTexture = createSolidColorTexture(gl, 50, 50, 50, 255);
    const Fly_alaTexture = loadTexture(gl, 'resources/texture/wings.png');
    const Fly_occhioTexture = loadTexture(gl, 'resources/texture/Insect-eyes.png');
    const butterflyTexture = loadTexture(gl, 'resources/texture/Farfalla.png');

    const tavoloBumpTexture = loadBumpTexture(gl, 'resources/bump_maps/wood_bump1.png');
    const tovagliaBumpTexture = loadBumpTexture(gl, 'resources/bump_maps/cloth_bump2.png');
    

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

    const defaultMaterial = { Ka: 1.0, Kd: 1.0, Ks: 0.2, shininess: 30.0 };
    const matWood = { Ka: 1.0, Kd: 0.9, Ks: 0.05, shininess: 10.0 }; 
    const matGlass = { Ka: 1.0, Kd: 0.5, Ks: 1.5, shininess: 150.0 }; 
    const matPlastic = { Ka: 1.0, Kd: 0.8, Ks: 0.5, shininess: 50.0 };
    const matCloth = { Ka: 1.0, Kd: 0.8, Ks: 0.05, shininess: 2.0 };

    // Helper per disegnare velocemente nel render loop
    function drawObject(currentProgramInfo, buffers, texture, alpha, material = defaultMaterial, worldMatrix = m4.identity(), isDoubleSided = false, bumpTexture = null, bumpOptions = {}) {
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
            gl.uniform1i(locations.useFlatShading, renderStyleState.shadingType === 'Flat' ? 1 : 0);
            gl.uniform1f(locations.Ka, material.Ka);
            gl.uniform1f(locations.Kd, material.Kd);
            gl.uniform1f(locations.Ks, material.Ks);
            gl.uniform1f(locations.shininess, material.shininess);

            if (bumpTexture !== null && bumpState.enabled) {
                gl.uniform1i(locations.useBumpMap, 1);
                gl.uniform1f(locations.bumpStrength, bumpOptions.strength  ?? 5.0);
                gl.uniform1f(locations.bumpScale,    bumpOptions.scale     ?? 3.0);
                gl.uniform2f(locations.bumpMapSize,  bumpOptions.width     ?? 1024.0, 
                                                    bumpOptions.height    ?? 512.0);
                gl.uniform1f(locations.bumpTiling,   bumpOptions.tiling    ?? 0.5);

                gl.activeTexture(gl.TEXTURE3);
                gl.bindTexture(gl.TEXTURE_2D, bumpTexture);
                gl.uniform1i(locations.bumpMap, 3);
                gl.activeTexture(gl.TEXTURE0); 
            } else {
                gl.uniform1i(locations.useBumpMap, 0);
            }
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

        drawObject(currentProgramInfo, tavoloBuffers, tavoloTexture, 1.0, matWood, m4.identity(), false, tavoloBumpTexture, {
            strength: 5.0,
            scale: 3.0,
            width: 1024.0,
            height: 512.0,
        });
        drawObject(currentProgramInfo, tappoBuffers, tappoTexture, 1.0, matWood);
        drawObject(currentProgramInfo, vinoBuffers, vinoTexture, 1.0, matGlass);
        if (!shadowPass) {
            drawObject(currentProgramInfo, etichettaBuffers, etichettaTexture, 1.0);
        }

        drawObject(currentProgramInfo, tovagliaBuffers, tovagliaTexture, 1.0, matCloth, m4.identity(), false, tovagliaBumpTexture, {
            strength: 0.7,
            scale: 10.0,
            width: 512.0,
            height: 512.0,
            tiling: 0.5
        });         

        drawObject(currentProgramInfo, corpoBuffers, Fly_corpoTexture, 1.0,defaultMaterial, flyWorldMatrices.corpoWorldMatrix);
        drawObject(currentProgramInfo, aladxBuffers, Fly_alaTexture, 1.0, defaultMaterial, flyWorldMatrices.aladxWorldMatrixAnimated);
        drawObject(currentProgramInfo, alasxBuffers, Fly_alaTexture, 1.0, defaultMaterial, flyWorldMatrices.alasxWorldMatrixAnimated);
        drawObject(currentProgramInfo, occhioBuffers, Fly_occhioTexture, 1.0, defaultMaterial, flyWorldMatrices.occhioWorldMatrix);
        
        drawObject(currentProgramInfo, butterflyCorpoBuffers, butterflyTexture, 1.0, defaultMaterial, butterflyWorldMatrices.butterflyBaseMatrixAnimated);
        
        gl.disable(gl.CULL_FACE);
        drawObject(currentProgramInfo, butterflyAladxBuffers, butterflyTexture, 1.0, defaultMaterial, butterflyWorldMatrices.butterflyAladxWorldMatrixAnimated, true);
        drawObject(currentProgramInfo, butterflyAlasxBuffers, butterflyTexture, 1.0, defaultMaterial, butterflyWorldMatrices.butterflyAlasxWorldMatrixAnimated, true);
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
            drawObject(currentProgramInfo, obj.buffers, obj.texture, 0.6, matGlass);
            
            // Pass 2: facce frontali  
            gl.cullFace(gl.BACK);
            drawObject(currentProgramInfo, obj.buffers, obj.texture, 0.6, matGlass);
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
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        // --- RENDERING DELLA SKYBOX ---
        if (appState.currentSkybox !== 'Nessuna' && activeSkyboxTexture !== null) {
            let viewDirectionMatrix = m4.copy(viewMatrix);
            viewDirectionMatrix[12] = 0;
            viewDirectionMatrix[13] = 0;
            viewDirectionMatrix[14] = 0;

            let viewDirectionProjectionMatrix = m4.multiply(projectionMatrix, viewDirectionMatrix);
            let viewDirectionProjectionInverseMatrix = m4.inverse(viewDirectionProjectionMatrix);

            gl.depthFunc(gl.LEQUAL);
            gl.useProgram(skyboxProgramInfo.program);
            webglUtils.setBuffersAndAttributes(gl, skyboxProgramInfo, quadBufferInfo);
            webglUtils.setUniforms(skyboxProgramInfo, {
                u_viewDirectionProjectionInverse: viewDirectionProjectionInverseMatrix,
                u_skybox: activeSkyboxTexture, // <--- Usa la nuova variabile
            });
            webglUtils.drawBufferInfo(gl, quadBufferInfo);
            gl.depthFunc(gl.LESS); 
        }

        // --- RENDERING DEL PIANO ---
        if (appState.currentSkybox !== 'Nessuna' && activeSkyboxTexture !== null) {
            gl.depthFunc(gl.LESS);
            gl.useProgram(floorProgramInfo.program);
            webglUtils.setBuffersAndAttributes(gl, floorProgramInfo, floorBufferInfo);

            gl.uniformMatrix4fv(gl.getUniformLocation(floorProgramInfo.program, "u_projection"), false, projectionMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(floorProgramInfo.program, "u_view"), false, viewMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(floorProgramInfo.program, "u_world"), false, m4.identity());
            gl.uniform3fv(gl.getUniformLocation(floorProgramInfo.program, "u_cameraPos"), cameraPosition);

            // NUOVO: Passiamo la matrice per proiettare l'ombra e lo stato dell'interruttore
            gl.uniformMatrix4fv(gl.getUniformLocation(floorProgramInfo.program, "u_textureMatrix"), false, textureMatrix);
            gl.uniform1i(gl.getUniformLocation(floorProgramInfo.program, "u_shadowsEnabled"), shadowState.enabled ? 1 : 0);
            gl.uniform3fv(gl.getUniformLocation(floorProgramInfo.program, "u_lightDir"), [lightState.x, lightState.y, lightState.z]);

            // Texture 0: L'erba
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, activeFloorTexture);
            gl.uniform1i(gl.getUniformLocation(floorProgramInfo.program, "u_floorTexture"), 0);

            // NUOVO: Texture 1 (La mappa di profondità delle ombre)
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, depthTexture);
            gl.uniform1i(gl.getUniformLocation(floorProgramInfo.program, "u_projectedTexture"), 1);

            // Texture 2: Skybox
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, activeSkyboxTexture);
            gl.uniform1i(gl.getUniformLocation(floorProgramInfo.program, "u_skybox"), 2);

            webglUtils.drawBufferInfo(gl, floorBufferInfo);

            gl.activeTexture(gl.TEXTURE0); // Ripristino sicurezza
        }

        // --- RENDERING OMBRA PLANARE SUL PAVIMENTO ---
        if (shadowState.enabled) {
            gl.useProgram(planarShadowProgramInfo.program);
            
            // Stencil per evitare che le ombre si scuriscano sovrapponendosi
            gl.enable(gl.STENCIL_TEST);
            gl.stencilFunc(gl.EQUAL, 0, 0xFF);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
            
            gl.enable(gl.BLEND);
            gl.depthMask(false);

            const lightDir = m4.normalize([lightState.x, lightState.y, lightState.z]);
            
            gl.uniformMatrix4fv(gl.getUniformLocation(planarShadowProgramInfo.program, "u_projection"), false, projectionMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(planarShadowProgramInfo.program, "u_view"), false, viewMatrix);
            gl.uniform3fv(gl.getUniformLocation(planarShadowProgramInfo.program, "u_lightDir"), lightDir);
            gl.uniform1f(gl.getUniformLocation(planarShadowProgramInfo.program, "u_floorY"), -10.9);
            gl.uniform3fv(gl.getUniformLocation(planarShadowProgramInfo.program, "u_cameraPos"), cameraPosition);

            // Usiamo shadowPass: true per evitare calcoli inutili su texture e trasparenze
            drawSceneObjects(planarShadowProgramInfo, { flyWorldMatrices, butterflyWorldMatrices, cameraPosition }, { includeTransparent: true, shadowPass: true });

            gl.depthMask(true);
            gl.disable(gl.STENCIL_TEST);
        }

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
 