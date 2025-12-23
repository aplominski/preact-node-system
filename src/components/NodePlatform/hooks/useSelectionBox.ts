import { useState, useCallback } from "preact/hooks";
import type { RefObject } from "preact";

export interface SelectionBox {
    start: { x: number; y: number };
    end: { x: number; y: number };
}

export interface UseSelectionBoxResult {
    selectionBox: SelectionBox | null;
    handleSelectionStart: (
        e: PointerEvent,
        platformRef: RefObject<HTMLDivElement>,
        onNodeSelect?: (ids: string[], evt: PointerEvent) => void
    ) => boolean;
}

export function useSelectionBox(): UseSelectionBoxResult {
    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

    const handleSelectionStart = useCallback((
        e: PointerEvent,
        platformRef: RefObject<HTMLDivElement>,
        onNodeSelect?: (ids: string[], evt: PointerEvent) => void
    ): boolean => {
        if (!e.shiftKey) return false;

        const start = { x: e.clientX, y: e.clientY };
        setSelectionBox({ start, end: start });

        const move = (ev: PointerEvent) => {
            setSelectionBox((prev) => prev ? {
                ...prev,
                end: { x: ev.clientX, y: ev.clientY }
            } : null);
        };

        const up = (ev: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);

            // Calculate intersection
            if (platformRef.current && onNodeSelect) {
                const boxStart = start;
                const boxEnd = { x: ev.clientX, y: ev.clientY };

                // Normalize box coordinates
                const left = Math.min(boxStart.x, boxEnd.x);
                const top = Math.min(boxStart.y, boxEnd.y);
                const right = Math.max(boxStart.x, boxEnd.x);
                const bottom = Math.max(boxStart.y, boxEnd.y);

                // Find nodes within the box
                const nodeElements = platformRef.current.querySelectorAll('.node-node');
                const selectedIds: string[] = [];

                nodeElements.forEach((el) => {
                    const rect = el.getBoundingClientRect();
                    // Check for intersection (simple bounding box overlap)
                    const intersects = !(rect.right < left ||
                        rect.left > right ||
                        rect.bottom < top ||
                        rect.top > bottom);

                    if (intersects) {
                        const id = el.getAttribute('data-id');
                        if (id) selectedIds.push(id);
                    }
                });

                if (selectedIds.length > 0) {
                    onNodeSelect(selectedIds, ev);
                }
            }

            setSelectionBox(null);
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);

        return true;
    }, []);

    return {
        selectionBox,
        handleSelectionStart,
    };
}
