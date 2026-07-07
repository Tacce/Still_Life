"use strict";

async function loadMeshWithGLM(url) {
    const response = await fetch(url);
    const textData = await response.text();

    let mesh = new subd_mesh();
    glmReadOBJ(textData, mesh);

    let positions = [];
    let normals = [];
    let texCoords = [];
    let tangents = [];
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

        let tx = 1.0;
        let ty = 0.0;
        let tz = 0.0;

        if (p.length >= 3 && uv.length >= 3) {
            const edge1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
            const edge2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
            const deltaUV1 = [uv[1][0] - uv[0][0], uv[1][1] - uv[0][1]];
            const deltaUV2 = [uv[2][0] - uv[0][0], uv[2][1] - uv[0][1]];

            const denom = deltaUV1[0] * deltaUV2[1] - deltaUV2[0] * deltaUV1[1];
            if (Math.abs(denom) > 1e-8) {
                const r = 1.0 / denom;
                tx = (edge1[0] * deltaUV2[1] - edge2[0] * deltaUV1[1]) * r;
                ty = (edge1[1] * deltaUV2[1] - edge2[1] * deltaUV1[1]) * r;
                tz = (edge1[2] * deltaUV2[1] - edge2[2] * deltaUV1[1]) * r;

                const tangentLength = Math.hypot(tx, ty, tz);
                if (tangentLength > 1e-8) {
                    tx /= tangentLength;
                    ty /= tangentLength;
                    tz /= tangentLength;
                }
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

            tangents.push(tx, ty, tz);

            flatNormals.push(fNorm.i, fNorm.j, fNorm.k);
        }
    }

    return {
        position: { numComponents: 3, data: new Float32Array(positions) },
        normal: { numComponents: 3, data: new Float32Array(normals) },
        texcoord: { numComponents: 2, data: new Float32Array(texCoords) },
        tangent: { numComponents: 3, data: new Float32Array(tangents) },
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

