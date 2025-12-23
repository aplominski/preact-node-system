import { h } from "preact";
import { useRef, useEffect, useState } from "preact/hooks";
import type { FunctionalComponent } from "preact";
import VariableEditor from "../VariableEditor/VariableEditor.tsx";

type OutputViewerProps = {
    value: any;
    type?: string;
    position: { x: number; y: number } | null;
    onClose: () => void;
};

export const OutputViewer: FunctionalComponent<OutputViewerProps> = ({
    value,
    type,
    position,
    onClose,
}) => {
    const viewerPanelRef = useRef<HTMLDivElement | null>(null);
    const closeTimeoutRef = useRef<number | null>(null);

    const cancelScheduledClose = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const handleCloseImmediate = () => {
        cancelScheduledClose();
        onClose();
    };

    const scheduleClose = (delay = 300) => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
        }
        closeTimeoutRef.current = window.setTimeout(() => {
            closeTimeoutRef.current = null;
            onClose();
        }, delay);
    };

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleCloseImmediate();
        };

        const handlePointerDown = (e: PointerEvent) => {
            const panel = viewerPanelRef.current;
            if (!panel) return;
            const target = e.target as Node | null;
            if (!target || !panel.contains(target)) {
                handleCloseImmediate();
            }
        };

        const handlePointerMove = (e: PointerEvent) => {
            const panel = viewerPanelRef.current;
            if (!panel) return;
            const target = e.target as Node | null;
            const isOver = !!target && panel.contains(target);
            if (isOver) {
                cancelScheduledClose();
            } else {
                if (!closeTimeoutRef.current) scheduleClose(500);
            }
        };

        const timeoutId = setTimeout(() => {
            document.addEventListener('keydown', handleEscape);
            document.addEventListener('pointerdown', handlePointerDown);
            document.addEventListener('pointermove', handlePointerMove);

            try {
                if (!viewerPanelRef.current || !viewerPanelRef.current.matches(':hover')) {
                    scheduleClose(500);
                }
            } catch (err) {
                scheduleClose(500);
            }
        }, 50);

        return () => {
            clearTimeout(timeoutId);
            cancelScheduledClose();
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('pointermove', handlePointerMove);
        };
    }, []);

    return (
        <div>
            <div
                ref={viewerPanelRef}
                className="node-image-popover"
                style={position ? { top: position.y, left: position.x } : {}}
                role="dialog"
                aria-modal={false}
            >
                <div style={{ padding: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ color: '#fff', fontWeight: 600 }}>Output Viewer{type ? `: ${type}` : ''}</div>
                    </div>
                    <div>
                        <VariableEditor type={type} value={value} disabled={true} onChange={() => { }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OutputViewer;
