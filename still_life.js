"use strict";

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

    const programInfo = webglUtils.createProgramInfo(gl, ["3d-vertex-shader", "3d-fragment-shader"]);
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
        lightPos: gl.getUniformLocation(program, "u_lightWorldPosition"),
        viewPos: gl.getUniformLocation(program, "u_viewWorldPosition"),
        ambient: gl.getUniformLocation(program, "u_ambientLight"),
        lightColor: gl.getUniformLocation(program, "u_lightColor"),
        objectColor: gl.getUniformLocation(program, "u_objectColor"),
        diffuseMap: gl.getUniformLocation(program, "u_diffuseMap"),
        alpha: gl.getUniformLocation(program, "u_alpha"),
    };

    // USIAMO LA NUOVA FUNZIONE PONTE CON GLM_UTILS
    const fiascoMesh = await loadMeshWithGLM('resources/obj/Fiasco.obj'); 
    const tavoloMesh = await loadMeshWithGLM('resources/obj/Tavolo.obj');
    const bottiglioneMesh = await loadMeshWithGLM('resources/obj/Bottiglione.obj');

    const fiascoBuffers = webglUtils.createBufferInfoFromArrays(gl, fiascoMesh);
    const tavoloBuffers = webglUtils.createBufferInfoFromArrays(gl, tavoloMesh);
    const bottiglioneBuffers = webglUtils.createBufferInfoFromArrays(gl, bottiglioneMesh);

    const tavoloTexture = loadTexture(gl, 'resources/texture/wood.png'); 
    const fiascoTexture = createSolidColorTexture(gl, 100, 180, 120, 255);
    const bottiglioneTexture = createSolidColorTexture(gl, 194, 116, 0, 255);
    

    initInputHandlers(canvas);

    // Helper per disegnare velocemente nel render loop
    function drawObject(buffers, texture, alpha) {
       webglUtils.setBuffersAndAttributes(gl, programInfo, buffers);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1f(locations.alpha, alpha);
        webglUtils.drawBufferInfo(gl, buffers);    
    }

    // Calcola la distanza di un oggetto dalla camera
    function getObjectDistance(objectCenter, cameraPos) {
        const dx = objectCenter[0] - cameraPos[0];
        const dy = objectCenter[1] - cameraPos[1];
        const dz = objectCenter[2] - cameraPos[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function render(time) {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        
        // Attiviamo il Culling per nascondere i retri delle facce
        gl.enable(gl.CULL_FACE);     
        gl.cullFace(gl.BACK);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const camX = Math.sin(cameraState.angleY) * Math.cos(cameraState.angleX) * cameraState.D;
        const camY = Math.sin(cameraState.angleX) * cameraState.D;
        const camZ = Math.cos(cameraState.angleY) * Math.cos(cameraState.angleX) * cameraState.D;

        const cameraPosition = [camX, camY, camZ];
        const target = [0, 2, 0]; 
        const up = [0, 1, 0];
        
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projectionMatrix = m4.perspective(Math.PI / 4, aspect, 0.1, 100);
        const cameraMatrix = m4.lookAt(cameraPosition, target, up);
        const viewMatrix = m4.inverse(cameraMatrix);

        let worldMatrix = m4.identity(); 
        let worldInverseTransposeMatrix = m4.identity(); 

        gl.uniformMatrix4fv(locations.projection, false, projectionMatrix);
        gl.uniformMatrix4fv(locations.view, false, viewMatrix);
        gl.uniformMatrix4fv(locations.world, false, worldMatrix);
        gl.uniformMatrix4fv(locations.worldInverseTranspose, false, worldInverseTransposeMatrix);

        gl.uniform3fv(locations.lightPos, [-1, 10, 5]); 
        gl.uniform3fv(locations.viewPos, cameraPosition); 
        gl.uniform3fv(locations.ambient, [0.2, 0.2, 0.25]); 
        gl.uniform3fv(locations.lightColor, [1.0, 0.9, 0.8]);
        gl.uniform3fv(locations.objectColor, [0.8, 0.8, 0.8]); 

        // OGGETTI OPACHI (Tavolo)
        gl.disable(gl.BLEND);
        drawObject(tavoloBuffers, tavoloTexture, 1.0);

        //OGGETTI TRANSPARENTI (Vetro)
        gl.enable(gl.BLEND);
        gl.enable(gl.CULL_FACE);

        // Ordina gli oggetti trasparenti per distanza dalla camera (dal più lontano al più vicino)
        const transparentObjects = [
            { buffers: fiascoBuffers, texture: fiascoTexture, center: [0, 0, -6] },
            { buffers: bottiglioneBuffers, texture: bottiglioneTexture, center: [2.8, 0, -3.8] }
        ];

        transparentObjects.sort((a, b) => {
            const distA = getObjectDistance(a.center, cameraPosition);
            const distB = getObjectDistance(b.center, cameraPosition);
            return distB - distA; // Ordina dal più lontano al più vicino
        });

        // 1° Passaggio: Disegna la parte interna/posteriore degli oggetti trasparenti (ordinati per distanza)
        gl.cullFace(gl.FRONT); // Scarta le facce davanti, disegna quelle dietro
        for (let obj of transparentObjects) {
            drawObject(obj.buffers, obj.texture, 0.6);
        }

        // 2° Passaggio: Disegna la parte esterna/frontale degli oggetti trasparenti (stesso ordine)
        gl.cullFace(gl.BACK);  // Scarta le facce dietro, sovrappone quelle davanti
        for (let obj of transparentObjects) {
            drawObject(obj.buffers, obj.texture, 0.6);
        }

        gl.depthMask(true);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();
 