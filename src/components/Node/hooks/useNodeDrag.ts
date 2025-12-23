import { useRef, useCallback } from "preact/hooks";

export interface DragState {
    dragging: boolean;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    pointerId?: number;
    hasMoved?: boolean;
    selectOnUp?: boolean;
}

export interface UseNodeDragConfig {
    nodeId: string;
    nodeX: number;
    nodeY: number;
    selected: boolean;
    onMove: (id: string, x: number, y: number) => void;
    onSelect?: (id: string, evt: PointerEvent) => void;
    onDragStart?: (id: string) => void;
    onDragEnd?: (id: string) => void;
    updatePortPositions: () => void;
}

export interface UseNodeDragResult {
    onPointerDown: (e: PointerEvent) => void;
}

export function useNodeDrag(config: UseNodeDragConfig): UseNodeDragResult {
    const {
        nodeId,
        nodeX,
        nodeY,
        selected,
        onMove,
        onSelect,
        onDragStart,
        onDragEnd,
        updatePortPositions,
    } = config;

    const dragState = useRef<DragState>({
        dragging: false,
        startX: 0,
        startY: 0,
        initX: 0,
        initY: 0,
    });

    const onPointerMove = useCallback((e: PointerEvent) => {
        if (!dragState.current.dragging) return;
        if (e.pointerId !== dragState.current.pointerId) return;

        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;

        // Track if we moved enough to consider it a drag
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            dragState.current.hasMoved = true;
        }

        const nx = dragState.current.initX + dx;
        const ny = dragState.current.initY + dy;

        onMove(nodeId, nx, ny);
        // Update port positions during drag
        requestAnimationFrame(updatePortPositions);
    }, [nodeId, onMove, updatePortPositions]);

    const onPointerUp = useCallback((e: PointerEvent) => {
        if (!dragState.current.dragging) return;
        if (e.pointerId !== dragState.current.pointerId) return;

        // If we didn't move (drag), and we are supposed to select deferredly, do it now
        if (!dragState.current.hasMoved && dragState.current.selectOnUp) {
            onSelect?.(nodeId, e);
        }

        dragState.current.dragging = false;
        onDragEnd?.(nodeId);
    }, [nodeId, onSelect, onDragEnd]);

    const onPointerDown = useCallback((e: PointerEvent) => {
        // only primary button
        if (e.button !== 0) return;
        (e.target as Element).setPointerCapture?.(e.pointerId);

        // Stop propagation so we don't deselect everyone by clicking the platform
        e.stopPropagation();

        // Check modifiers
        const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;

        // Determine if we should select immediately or defer
        let selectOnUp = false;

        if (!selected) {
            // New selection - do it now so we can drag immediately if needed
            onSelect?.(nodeId, e);
        } else {
            // Already selected
            if (isMultiSelect) {
                // Ctrl+Click on selected node -> toggle off
                onSelect?.(nodeId, e);
            } else {
                // Plain click on selected node - defer selection
                selectOnUp = true;
            }
        }

        dragState.current = {
            dragging: true,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            initX: nodeX,
            initY: nodeY,
            hasMoved: false,
            selectOnUp,
        };

        // attach global listeners
        window.addEventListener("pointermove", onPointerMove as EventListener);
        window.addEventListener("pointerup", onPointerUp as EventListener);

        onDragStart?.(nodeId);
    }, [nodeId, nodeX, nodeY, selected, onSelect, onDragStart, onPointerMove, onPointerUp]);

    return {
        onPointerDown,
    };
}
