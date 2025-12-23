import { useEffect, useCallback } from "preact/hooks";
import type { RefObject } from "preact";
import type { NodeData } from "../../Node/node";

export interface KeyboardShortcutsConfig {
    nodes: NodeData[];
    blockMenuOpen: boolean;
    mousePosition: { x: number; y: number };
    offset: { x: number; y: number };
    scale: number;
    platformRef: RefObject<HTMLDivElement>;
    clipboardRef: RefObject<NodeData[]>;
    onBlockMenuOpen: (position: { x: number; y: number }) => void;
    onNodeDelete?: (ids: string[]) => void;
    onNodeSelect?: (id: string | string[] | null) => void;
    onNodeMove?: (id: string, x: number, y: number) => void;
    onPasteNodes?: (nodes: NodeData[]) => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig): void {
    const {
        nodes,
        blockMenuOpen,
        mousePosition,
        offset,
        scale,
        platformRef,
        clipboardRef,
        onBlockMenuOpen,
        onNodeDelete,
        onNodeSelect,
        onNodeMove,
        onPasteNodes,
    } = config;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            if (e.shiftKey && e.key === "A" && !blockMenuOpen) {
                e.preventDefault();
                onBlockMenuOpen({ x: mousePosition.x, y: mousePosition.y });
            } else if (e.key === "Delete" || e.key === "Backspace") {
                // Find all selected nodes and delete them
                const selectedNodes = nodes.filter(n => n.selected);
                if (selectedNodes.length > 0 && onNodeDelete) {
                    e.preventDefault();
                    onNodeDelete(selectedNodes.map(n => n.id));
                }
            } else if (isCtrlOrCmd && (e.key === "c" || e.key === "C")) {
                // Copy selected nodes
                const selectedNodes = nodes.filter(n => n.selected);
                if (selectedNodes.length > 0) {
                    e.preventDefault();
                    clipboardRef.current = selectedNodes.map(node => ({
                        ...node,
                        selected: false,
                    }));
                }
            } else if (isCtrlOrCmd && (e.key === "x" || e.key === "X")) {
                // Cut selected nodes (copy + delete)
                const selectedNodes = nodes.filter(n => n.selected);
                if (selectedNodes.length > 0 && onNodeDelete) {
                    e.preventDefault();

                    clipboardRef.current = selectedNodes.map(node => ({
                        ...node,
                        selected: false,
                    }));

                    onNodeDelete(selectedNodes.map(n => n.id));
                }
            } else if (isCtrlOrCmd && e.key === "v") {
                // Paste nodes from clipboard
                if (clipboardRef.current.length > 0 && onPasteNodes && platformRef.current) {
                    e.preventDefault();

                    if (onNodeSelect) {
                        onNodeSelect(null);
                    }

                    const rect = platformRef.current.getBoundingClientRect();
                    const pasteX = (mousePosition.x - rect.left - offset.x) / scale;
                    const pasteY = (mousePosition.y - rect.top - offset.y) / scale;

                    const minX = Math.min(...clipboardRef.current.map(n => n.x));
                    const minY = Math.min(...clipboardRef.current.map(n => n.y));

                    const offsetX = 20;
                    const offsetY = 20;

                    const newNodes = clipboardRef.current.map(node => {
                        const relativeX = node.x - minX;
                        const relativeY = node.y - minY;
                        const newNodeId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                        return {
                            ...node,
                            id: newNodeId,
                            x: pasteX + relativeX + offsetX,
                            y: pasteY + relativeY + offsetY,
                            selected: true,
                        };
                    });

                    onPasteNodes(newNodes);
                }
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
                const selectedNodes = nodes.filter(n => n.selected);
                if (selectedNodes.length > 0 && onNodeMove) {
                    if (!isCtrlOrCmd) {
                        e.preventDefault();

                        const step = e.shiftKey ? 50 : 10;
                        let dx = 0;
                        let dy = 0;

                        if (e.key === "ArrowUp") {
                            dy = -step;
                        } else if (e.key === "ArrowDown") {
                            dy = step;
                        } else if (e.key === "ArrowLeft") {
                            dx = -step;
                        } else if (e.key === "ArrowRight") {
                            dx = step;
                        }

                        selectedNodes.forEach(node => {
                            onNodeMove(node.id, node.x + dx, node.y + dy);
                        });
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [blockMenuOpen, nodes, onNodeDelete, onPasteNodes, onNodeMove, mousePosition, offset, scale]);
}
