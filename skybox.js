function loadCubemapFromCross(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceTargets = [
        gl.TEXTURE_CUBE_MAP_POSITIVE_X, // Right
        gl.TEXTURE_CUBE_MAP_NEGATIVE_X, // Left
        gl.TEXTURE_CUBE_MAP_POSITIVE_Y, // Top
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, // Bottom
        gl.TEXTURE_CUBE_MAP_POSITIVE_Z, // Front
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Z  // Back
    ];
    faceTargets.forEach(target => {
        gl.texImage2D(target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([100, 100, 100, 255]));
    });

    const image = new Image();
    image.src = url;
    image.onload = function() {
        // In una croce orizzontale, la larghezza totale è 4 volte la faccia
        const faceSize = image.width / 4;

        // Creiamo un canvas 2D nascosto per estrarre i pixel delle singole zone
        const canvas2d = document.createElement('canvas');
        canvas2d.width = faceSize;
        canvas2d.height = faceSize;
        const ctx = canvas2d.getContext('2d');

        // Coordinate (colonna, riga) dei quadrati nella griglia 4x3 della croce orizzontale
        const gridCoordinates = {
            [gl.TEXTURE_CUBE_MAP_POSITIVE_X]: { col: 2, row: 1 }, // Right
            [gl.TEXTURE_CUBE_MAP_NEGATIVE_X]: { col: 0, row: 1 }, // Left
            [gl.TEXTURE_CUBE_MAP_POSITIVE_Y]: { col: 1, row: 0 }, // Top
            [gl.TEXTURE_CUBE_MAP_NEGATIVE_Y]: { col: 1, row: 2 }, // Bottom
            [gl.TEXTURE_CUBE_MAP_POSITIVE_Z]: { col: 1, row: 1 }, // Front
            [gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]: { col: 3, row: 1 }  // Back
        };

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        
        // Le cubemap vogliono l'orientamento nativo delle coordinate di Blender
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

        faceTargets.forEach(target => {
            const coords = gridCoordinates[target];
            ctx.clearRect(0, 0, faceSize, faceSize);
            
            // Ritagliamo la porzione corretta dall'immagine originale e la stampiamo sul canvas 2D
            ctx.drawImage(
                image,
                coords.col * faceSize, coords.row * faceSize, faceSize, faceSize, 
                0, 0, faceSize, faceSize                                        
            );

            // Passiamo i pixel estratti a WebGL
            gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas2d);
        });

        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    };

    return texture;
}

function createXYQuadVertices() {
    const xOffset = 0;
    const yOffset = 0;
    const size = 1;
    return {
        position: {
            numComponents: 2,
            data: [
                xOffset + -1 * size, yOffset + -1 * size,
                xOffset +  1 * size, yOffset + -1 * size,
                xOffset + -1 * size, yOffset +  1 * size,
                xOffset +  1 * size, yOffset +  1 * size,
            ],
        },
        normal: [
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
        ],
        texcoord: [
            0, 0,
            1, 0,
            0, 1,
            1, 1,
        ],
        indices: [ 0, 1, 2, 2, 1, 3 ],
    };
}

function createFloorBufferInfo(gl) {
    const size = 1000.0;
    const y = -10.9; 

    return webglUtils.createBufferInfoFromArrays(gl, {
        position: { numComponents: 3, data: new Float32Array([
            -size, y, -size,
             size, y, -size,
            -size, y,  size,
             size, y,  size,
        ])},
        texcoord: { numComponents: 2, data: new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1,  
        ])},
        indices: [0, 2, 1, 1, 2, 3],
    });
}