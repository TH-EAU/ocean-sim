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
export function sampleTerrainH(x: number, z: number): number {
  if (!_data) return 0;
  const u  = Math.max(0, Math.min(1, (x - BOUNDS_MIN_X) / (BOUNDS_MAX_X - BOUNDS_MIN_X)));
  const v  = Math.max(0, Math.min(1, (z - BOUNDS_MIN_Z) / (BOUNDS_MAX_Z - BOUNDS_MIN_Z)));
  const px = Math.floor(u       * (_imgW - 1));
  const py = Math.floor((1 - v) * (_imgH - 1));
  return _data[(py * _imgW + px) * 4] / 255;
}

export function sampleTerrainY(x: number, z: number): number {
  if (!_data) return _terrainDepth;
  return sampleTerrainH(x, z) * _heightScale + _terrainDepth;
}
