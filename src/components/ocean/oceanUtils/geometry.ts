export function radialDirection(degrees: number): [number, number] {
    const rad = degrees * (Math.PI / 180);
    return [Math.cos(rad), Math.sin(rad)];
}