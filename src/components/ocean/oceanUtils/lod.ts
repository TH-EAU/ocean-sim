import { LOD } from "../oceanConsts";

// Tile size for a given ring/axis index (0 = center): doubles each step
export const tileSizeForAxisIndex = (base: number, n: number): number =>
    base * Math.pow(2, n);

// World-space center offset for chunk (row, col), accumulating axis sizes independently.
export const computeGridOffset = (row: number, col: number, base: number): [number, number] => {
    let ox = 0;
    for (let c = 0; c < Math.abs(col); c++) {
        ox += (tileSizeForAxisIndex(base, c) + tileSizeForAxisIndex(base, c + 1)) / 2;
    }
    let oz = 0;
    for (let r = 0; r < Math.abs(row); r++) {
        oz += (tileSizeForAxisIndex(base, r) + tileSizeForAxisIndex(base, r + 1)) / 2;
    }
    return [Math.sign(col) * ox, Math.sign(row) * oz];
};

export const buildChunks = () => {
    const list = [];
    for (let row = -LOD.gridRadius; row <= LOD.gridRadius; row++) {
        for (let col = -LOD.gridRadius; col <= LOD.gridRadius; col++) {
            const ring = Math.max(Math.abs(row), Math.abs(col));
            list.push({
                row, col, ring,
                resolution: LOD.levels[Math.min(ring, LOD.levels.length - 1)],
                tileSize: tileSizeForAxisIndex(LOD.baseTileSize, ring),
                gridOffset: computeGridOffset(row, col, LOD.baseTileSize),
            });
        }
    }
    return list;
}