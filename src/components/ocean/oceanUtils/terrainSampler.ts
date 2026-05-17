// Mirrors terrain.vert.glsl height formula — keep constants in sync
const BOUNDS_MIN_X = -30;
const BOUNDS_MIN_Z = -30;
const BOUNDS_MAX_X =  30;
const BOUNDS_MAX_Z =  30;

let _data:        Uint8ClampedArray | null = null;
let _imgW         = 0;
let _imgH         = 0;
let _heightScale  = 10;
let _terrainDepth = -4;

export function initTerrainSampler(
  url:          string,
  heightScale:  number,
  terrainDepth: number,
  onReady?:     () => void,
): void {
  _heightScale  = heightScale;
  _terrainDepth = terrainDepth;

  const img = new Image();
  img.src = url;
  img.onload = () => {
    const canvas    = document.createElement("canvas");
    canvas.width    = img.width;
    canvas.height   = img.height;
    const ctx       = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    _data = imageData.data;
    _imgW = img.width;
    _imgH = img.height;
    onReady?.();
  };
}

// Three.js uploads textures with flipY=true by default.
// GPU UV.y=0 → bottom of original image → we must flip V when reading CPU pixels.
export function sampleTerrainY(x: number, z: number): number {
  if (!_data) return _terrainDepth;
  const u  = Math.max(0, Math.min(1, (x - BOUNDS_MIN_X) / (BOUNDS_MAX_X - BOUNDS_MIN_X)));
  const v  = Math.max(0, Math.min(1, (z - BOUNDS_MIN_Z) / (BOUNDS_MAX_Z - BOUNDS_MIN_Z)));
  const px = Math.floor(u       * (_imgW - 1));
  const py = Math.floor((1 - v) * (_imgH - 1));
  const h  = _data[(py * _imgW + px) * 4] / 255;
  return h * _heightScale + _terrainDepth;
}

export function buildTrimesh(res = 64): { vertices: Float32Array; indices: Uint32Array } | null {
  if (!_data) return null;
  const rangeX = BOUNDS_MAX_X - BOUNDS_MIN_X;
  const rangeZ = BOUNDS_MAX_Z - BOUNDS_MIN_Z;
  const stepX  = rangeX / (res - 1);
  const stepZ  = rangeZ / (res - 1);

  const vertices = new Float32Array(res * res * 3);
  for (let r = 0; r < res; r++) {
    for (let c = 0; c < res; c++) {
      const i = r * res + c;
      const x = BOUNDS_MIN_X + c * stepX;
      const z = BOUNDS_MIN_Z + r * stepZ;
      vertices[i * 3 + 0] = x;
      vertices[i * 3 + 1] = sampleTerrainY(x, z);
      vertices[i * 3 + 2] = z;
    }
  }

  const quads   = (res - 1) * (res - 1);
  const indices = new Uint32Array(quads * 6);
  let   idx     = 0;
  for (let r = 0; r < res - 1; r++) {
    for (let c = 0; c < res - 1; c++) {
      const a  =  r      * res + c;
      const b  = a + 1;
      const c2 = (r + 1) * res + c;
      const d  = c2 + 1;
      indices[idx++] = a;  indices[idx++] = c2; indices[idx++] = b;
      indices[idx++] = b;  indices[idx++] = c2; indices[idx++] = d;
    }
  }
  return { vertices, indices };
}
