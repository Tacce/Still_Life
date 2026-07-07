"use strict";

async function loadMeshWithGLM(url) {
    const response = await fetch(url);
    const textData = await response.text();

    let mesh = new subd_mesh();
    glmReadOBJ(textData, mesh);

    let positions = [];
    let normals = [];
    let texCoords = [];
    let flatNormals = [];

    for (let i = 1; i <= mesh.nface; i++) {
        let f = mesh.face[i];
        let fNorm = mesh.facetnorms[f.normalFaceIndex];

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

        for (let j = 0; j < f.n_v_e; j++) {
            let vIdx = f.vert[j];
            let nIdx = f.normalVertexIndex[j];
            let tIdx = f.textCoordsIndex[j];

            positions.push(mesh.vert[vIdx].x, mesh.vert[vIdx].y, mesh.vert[vIdx].z);

            if (nIdx !== undefined && mesh.normal[nIdx]) {
                normals.push(mesh.normal[nIdx].i, mesh.normal[nIdx].j, mesh.normal[nIdx].k);
            } else {
                normals.push(0, 0, 1);
            }

            if (tIdx !== undefined && !isNaN(tIdx) && mesh.textCoords && mesh.textCoords[tIdx]) {
                texCoords.push(mesh.textCoords[tIdx].u, mesh.textCoords[tIdx].v);
            } else {
                texCoords.push(0, 0);
            }

            flatNormals.push(fNorm.i, fNorm.j, fNorm.k);
        }
    }

    return {
        position: { numComponents: 3, data: new Float32Array(positions) },
        normal: { numComponents: 3, data: new Float32Array(normals) },
        texcoord: { numComponents: 2, data: new Float32Array(texCoords) },
        flatNormal: { numComponents: 3, data: new Float32Array(flatNormals) },
    };
}

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

