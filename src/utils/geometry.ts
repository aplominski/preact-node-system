export interface Point {
    x: number;
    y: number;
}

export function distancePointToSegment(p: Point, a: Point, b: Point): number {
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);

    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projectionX = a.x + t * (b.x - a.x);
    const projectionY = a.y + t * (b.y - a.y);

    return Math.hypot(p.x - projectionX, p.y - projectionY);
}

export function projectPointToSegment(p: Point, a: Point, b: Point): Point {
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (l2 === 0) return { x: a.x, y: a.y };

    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    return {
        x: a.x + t * (b.x - a.x),
        y: a.y + t * (b.y - a.y)
    };
}

export function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
