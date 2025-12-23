import { h, Fragment } from "preact";
import { useCallback, useEffect, useRef, useMemo } from "preact/hooks";
import type { FunctionalComponent, Ref, RefObject } from "preact";
import { NodePlatform } from "../NodePlatform/NodePlatform.tsx";
import { useHistory } from "../../hooks/useHistory.ts";
import type { Connection, NodeData, NodeTypeDef } from "../Node/node.ts";

export type NodeSystemProps = {
    nodeTypes: Record<string, NodeTypeDef>;
    initialNodes?: NodeData[];
    initialConnections?: Connection[];
    onChange?: (nodes: NodeData[], connections: Connection[]) => void;
    storageKey?: string; // Optional key for local storage persistence or similar
    disableHistory?: boolean;
    nodeRef?: RefObject<NodeSystemHandle> | ((handle: NodeSystemHandle | null) => void);
    returningCallback?: (data: { nodes: NodeData[], connections: Connection[] }) => { nodes: NodeData[], connections: Connection[] };
};

export type NodeSystemHandle = {
    getNodes: () => NodeData[];
    getConnections: () => Connection[];
    setNodes: (nodes: NodeData[]) => void;
    setConnections: (connections: Connection[]) => void;
    save: () => { nodes: NodeData[], connections: Connection[] };
    load: (data: { nodes: NodeData[], connections: Connection[] }) => void;
    getProcessedState: () => { nodes: NodeData[], connections: Connection[] };
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
};

type AppState = {
    nodes: NodeData[];
    connections: Connection[];
};

export const NodeSystem: FunctionalComponent<NodeSystemProps> = ({
    nodeTypes,
    initialNodes = [],
    initialConnections = [],
    onChange,
    disableHistory = false,
    nodeRef,
    returningCallback
}) => {
    const { history, set, undo, redo, canUndo, canRedo } = useHistory<AppState>({
        nodes: initialNodes,
        connections: initialConnections,
    });

    const { nodes, connections } = history.present;
    const isDraggingRef = useRef(false);

    // Apply transformation if callback is provided
    const { nodes: displayNodes, connections: displayConnections } = useMemo(() => {
        const state = { nodes, connections };
        if (returningCallback) {
            try {
                return returningCallback(state);
            } catch (e) {
                console.error("Error in returningCallback:", e);
                return state;
            }
        }
        return state;
    }, [nodes, connections, returningCallback]);

    // Also keep a ref to processed state for the handle
    const processedStateRef = useRef<AppState>({ nodes: displayNodes, connections: displayConnections });
    processedStateRef.current = { nodes: displayNodes, connections: displayConnections };

    // Keep a ref to the latest state so that imperative methods always access fresh data
    const stateRef = useRef<AppState>({ nodes, connections });
    stateRef.current = { nodes, connections };

    // Keep refs to history functions so they're always fresh
    const setRef = useRef(set);
    setRef.current = set;
    const undoRef = useRef(undo);
    undoRef.current = undo;
    const redoRef = useRef(redo);
    redoRef.current = redo;

    // Notify parent of changes
    useEffect(() => {
        onChange?.(nodes, connections);
    }, [nodes, connections, onChange]);

    // Manually manage node ref - this bypasses Preact's forwardRef issues
    useEffect(() => {
        if (!nodeRef) return;

        const handle: NodeSystemHandle = {
            getNodes: () => stateRef.current.nodes,
            getConnections: () => stateRef.current.connections,
            setNodes: (newNodes: NodeData[]) => setRef.current({ nodes: newNodes, connections: stateRef.current.connections }),
            setConnections: (newConnections: Connection[]) => setRef.current({ nodes: stateRef.current.nodes, connections: newConnections }),
            save: () => ({ nodes: stateRef.current.nodes, connections: stateRef.current.connections }),
            load: (data: AppState) => setRef.current(data),
            getProcessedState: () => processedStateRef.current,
            undo: () => undoRef.current(),
            redo: () => redoRef.current(),
            canUndo,
            canRedo,
        };

        if (typeof nodeRef === 'function') {
            nodeRef(handle);
            return () => nodeRef(null);
        } else if (nodeRef && 'current' in nodeRef) {
            (nodeRef as any).current = handle;
            return () => {
                (nodeRef as any).current = null;
            };
        }
    }, [nodeRef, canUndo, canRedo]);

    // Keyboard shortcuts for Undo/Redo
    useEffect(() => {
        if (disableHistory) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            if (isCtrlOrCmd && e.key === "z") {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if (isCtrlOrCmd && e.key === "y") {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undo, redo, disableHistory]);

    const handleNodeDragStart = useCallback(() => {
        isDraggingRef.current = true;
    }, []);

    const handleNodeDragEnd = useCallback(() => {
        isDraggingRef.current = false;
    }, []);

    const handleNodeMove = (id: string, x: number, y: number) => {
        set({
            nodes: nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
            connections,
        }, { replace: isDraggingRef.current });
    };

    const handleNodeSelect = (id: string | string[] | null, evt?: PointerEvent) => {
        if (id === null) {
            // Deselect all nodes
            set({
                nodes: nodes.map((n) => ({ ...n, selected: false })),
                connections,
            }, { replace: true });
            return;
        }

        if (Array.isArray(id)) {
            set({
                nodes: nodes.map((n) => ({
                    ...n,
                    selected: id.includes(n.id)
                })),
                connections
            }, { replace: true });
            return;
        }

        // ID is string (single node click)
        set({
            nodes: (() => {
                const isCtrlPressed = evt?.ctrlKey || evt?.metaKey;
                if (isCtrlPressed) {
                    return nodes.map((n) => n.id === id ? { ...n, selected: !n.selected } : n);
                } else {
                    return nodes.map((n) => ({ ...n, selected: n.id === id }));
                }
            })(),
            connections,
        }, { replace: true });
    };

    const handleCompleteConnection = (connection: Connection) => {
        set({
            nodes,
            connections: [...connections, connection],
        });
    };

    const handleAddNode = (nodeTypeId: string, x: number, y: number) => {
        const newNodeId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNode: NodeData = {
            id: newNodeId,
            type: nodeTypeId,
            x,
            y,
            data: {},
        };

        set({
            nodes: [...nodes, newNode],
            connections,
        });
    };

    const handleNodeDelete = (id: string | string[]) => {
        const idsToDelete = Array.isArray(id) ? id : [id];
        set({
            nodes: nodes.filter((n) => !idsToDelete.includes(n.id)),
            connections: connections.filter((c) => !idsToDelete.includes(c.from.nodeId) && !idsToDelete.includes(c.to.nodeId)),
        });
    };

    const handlePasteNodes = (newNodes: NodeData[]) => {
        const deselectedNodes = nodes.map(n => ({ ...n, selected: false }));
        const nodesWithSelection = newNodes.map(n => ({ ...n, data: n.data ?? {}, selected: n.selected ?? true }));

        set({
            nodes: [...deselectedNodes, ...nodesWithSelection],
            connections,
        });
    };

    const handleNodeValueChange = (id: string, portName: string, value: any) => {
        set({
            nodes: nodes.map((n) =>
                n.id === id
                    ? {
                        ...n,
                        data: {
                            ...n.data,
                            [portName]: value,
                        },
                    }
                    : n
            ),
            connections,
        });
    };

    const handleSpliceNode = (nodeId: string, connectionToRemove: Connection, inputPort: string, outputPort: string, newX?: number, newY?: number) => {
        // Use current ref to ensure we have the absolute latest state including recent moves
        const currentNodes = stateRef.current.nodes;
        const currentConnections = stateRef.current.connections;

        const connectionIn: Connection = {
            from: connectionToRemove.from,
            to: { nodeId, port: inputPort }
        };
        const connectionOut: Connection = {
            from: { nodeId, port: outputPort },
            to: connectionToRemove.to
        };

        // Update node position if new coords are provided (snap to line)
        const updatedNodes = newX !== undefined && newY !== undefined
            ? currentNodes.map(n => n.id === nodeId ? { ...n, x: newX, y: newY } : n)
            : currentNodes;

        set({
            nodes: updatedNodes,
            connections: [
                ...currentConnections.filter(c => c !== connectionToRemove),
                connectionIn,
                connectionOut
            ]
        });
    };

    return (
        <NodePlatform
            nodes={displayNodes}
            nodeTypes={nodeTypes}
            edges={displayConnections}
            onNodeMove={handleNodeMove}
            onNodeSelect={handleNodeSelect}
            onNodeDelete={handleNodeDelete}
            onCompleteConnection={handleCompleteConnection}
            onDeleteConnection={(connection) => {
                set({
                    nodes,
                    connections: connections.filter(c => c !== connection),
                });
            }}
            onAddNode={handleAddNode}
            onPasteNodes={handlePasteNodes}
            onNodeValueChange={handleNodeValueChange}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragEnd={handleNodeDragEnd}
            onSpliceNode={handleSpliceNode}
        />
    );
};