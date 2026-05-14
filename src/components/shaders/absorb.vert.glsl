uniform sampler2D uHeightmap;
uniform vec4 uTerrainBounds;  // (minX, minZ, maxX, maxZ) world space
uniform float uHeightScale;   // max terrain height in world units
uniform float uTerrainDepth;  // vertical offset (negative = ocean floor below water)
uniform float uTerrainHeight;

varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
    // ── 1. World-space base (flat) ────────────────────────────────
    vec3 worldBase = (modelMatrix * vec4(position, 1.0)).xyz;
    vec2 xz = worldBase.xz;

    vec3 displaced = worldBase;

    vec2 hUV = clamp((xz - uTerrainBounds.xy) / (uTerrainBounds.zw - uTerrainBounds.xy), 0.0, 1.0);
    float uTerrainHeight = texture(uHeightmap, hUV).r;  // [0 = deep, 1 = land peak]

    gl_Position = vec4(displaced, 1.0);
}