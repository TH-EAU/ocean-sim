// ============================================================
// Vertex shader — heightmap terrain
//
// World-space domain (consistent with ocean.vert.glsl):
//   - modelMatrix applied first → wave/terrain domain is world XZ
//   - height sampled from uHeightmap via world→UV mapping
//   - displacement is purely vertical (world Y)
//   - normal computed analytically from heightmap gradient
// ============================================================

uniform sampler2D uHeightmap;
uniform vec4 uTerrainBounds;  // (minX, minZ, maxX, maxZ) world space
uniform float uHeightScale;   // max terrain height in world units
uniform float uTerrainDepth;  // vertical offset (negative = ocean floor below water)

varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
    // ── 1. World-space base (flat) ────────────────────────────────
    vec3 worldBase = (modelMatrix * vec4(position, 1.0)).xyz;
    vec2 xz = worldBase.xz;

    // ── 2. Heightmap UV ──────────────────────────────────────────
    vec2 hUV = clamp((xz - uTerrainBounds.xy) / (uTerrainBounds.zw - uTerrainBounds.xy), 0.0, 1.0);
    float h = texture(uHeightmap, hUV).r;  // [0 = deep, 1 = land peak]

    // ── 3. Vertical displacement (world Y only) ───────────────────
    vec3 displaced = worldBase;
    displaced.y = h * uHeightScale + uTerrainDepth;

    // ── 4. Analytical normal from heightmap gradient ──────────────
    // Sample 4 neighbours (central differences, 2-texel step for stability)
    float eps = 2.0 / 1080.0;
    float h_xp = texture(uHeightmap, hUV + vec2(eps, 0.0)).r;
    float h_xn = texture(uHeightmap, hUV - vec2(eps, 0.0)).r;
    float h_zp = texture(uHeightmap, hUV + vec2(0.0, eps)).r;
    float h_zn = texture(uHeightmap, hUV - vec2(0.0, eps)).r;

    // Slope in world space: Δheight / Δdistance
    // eps (UV) × 60 (world units/UV) = world step;  ×2 for central diff
    float slopeScale = uHeightScale / (eps * 60.0);

    // Tangent (∂P/∂x_world) and bitangent (∂P/∂z_world)
    vec3 ddx = vec3(1.0, (h_xp - h_xn) * slopeScale, 0.0);
    vec3 ddz = vec3(0.0, (h_zp - h_zn) * slopeScale, 1.0);

    // Same cross-product convention as ocean shader
    vNormal = normalize(cross(ddz, ddx));
    vWorldPos = displaced;

    gl_Position = projectionMatrix * viewMatrix * vec4(displaced, 1.0);
}
