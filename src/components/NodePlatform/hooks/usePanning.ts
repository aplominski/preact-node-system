import { useState, useCallback } from "preact/hooks";
import type { RefObject } from "preact";

export interface PanningState {
    offset: { x: number; y: number };
    scale: number;
}

export interface UsePanningResult {
    offset: { x: number; y: number };
    scale: number;
    setOffset: (offset: { x: number; y: number }) => void;
    setScale: (scale: number) => void;
    handleWheel: (e: WheelEvent) => void;
    handleMiddleMousePan: (e: PointerEvent) => boolean;
}

export function usePanning(): UsePanningResult {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;

        if (isCtrlOrCmd) {
            // Ctrl/Cmd + Wheel = Zoom
            const delta = -e.deltaY * 0.001;
            setScale((prev) => Math.min(Math.max(0.2, prev + delta), 2));
            // Shift + Wheel = Horizontal panning
            setOffset((prev) => ({
                x: prev.x - e.deltaY,
                y: prev.y,
            }));
        } else {
            // Wheel = Vertical panning
            setOffset((prev) => ({
                x: prev.x,
                y: prev.y - e.deltaY,
            }));
        }
    }, []);

    const handleMiddleMousePan = useCallback((e: PointerEvent): boolean => {
        if (e.button !== 1) return false;

        e.preventDefault();
        const start = { x: e.clientX, y: e.clientY };
        const init = { ...offset };

        const move = (ev: PointerEvent) => {
            setOffset({
                x: init.x + (ev.clientX - start.x),
                y: init.y + (ev.clientY - start.y),
            });
        };

        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);

        return true;
    }, [offset]);

    return {
        offset,
        scale,
        setOffset,
        setScale: (s: number) => setScale(s),
        handleWheel,
        handleMiddleMousePan,
    };
}
