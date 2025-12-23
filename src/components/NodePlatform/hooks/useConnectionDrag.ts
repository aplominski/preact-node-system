import { useState, useCallback } from "preact/hooks";
import type { RefObject } from "preact";
import type { Connection, NodeData, NodeTypeDef, PortDef } from "../../Node/node";

export interface ConnectionEndpoint {
    nodeId: string;
    port: string;
    portDef?: PortDef;
}

export interface NewConnection {
    from?: ConnectionEndpoint;
    to?: ConnectionEndpoint;
}

export interface ConnectionPreview {
    start: { x: number; y: number };
    end: { x: number; y: number };
}

export interface UseConnectionDragConfig {
    nodes: NodeData[];
    edges: Connection[];
    nodeTypes: Record<string, NodeTypeDef>;
    portPositions: { [key: string]: { x: number; y: number } };
    offset: { x: number; y: number };
    scale: number;
    platformRef: RefObject<HTMLDivElement>;
    onCompleteConnection: (connection: Connection) => void;
    onStartConnection?: (fromNode: string, fromPort: PortDef) => void;
    onDeleteConnection?: (connection: Connection) => void;
    setWarningMessage: (message: string | null) => void;
}

export interface UseConnectionDragResult {
    newConnection: NewConnection | null;
    connectionPreview: ConnectionPreview | null;
    handlePortPointerDown: (
        nodeId: string,
        port: PortDef,
        direction: "input" | "output",
        clientX: number,
        clientY: number
    ) => void;
    handlePortPointerUp: (
        nodeId: string,
        port: PortDef,
        direction: "input" | "output"
    ) => void;
    handlePointerMove: (e: PointerEvent) => void;
    handlePointerUp: () => void;
}

export function useConnectionDrag(config: UseConnectionDragConfig): UseConnectionDragResult {
    const {
        nodes,
        edges,
        nodeTypes,
        portPositions,
        offset,
        scale,
        platformRef,
        onCompleteConnection,
        onStartConnection,
        onDeleteConnection,
        setWarningMessage,
    } = config;

    const [newConnection, setNewConnection] = useState<NewConnection | null>(null);
    const [connectionPreview, setConnectionPreview] = useState<ConnectionPreview | null>(null);

    const handlePortPointerDown = useCallback((
        nodeId: string,
        port: PortDef,
        direction: "input" | "output",
        clientX: number,
        clientY: number
    ) => {
        setWarningMessage(null);
        const portKey = `${nodeId}-${port.name}`;
        const pos = portPositions[portKey];

        if (pos && platformRef.current) {
            // Check if this is an input port that is already connected
            if (direction === "input") {
                const existingConnection = edges.find(
                    e => e.to.nodeId === nodeId && e.to.port === port.name
                );

                if (existingConnection) {
                    onDeleteConnection?.(existingConnection);
                    return;
                }
            }

            const platformRect = platformRef.current.getBoundingClientRect();
            const endX = (clientX - platformRect.left - offset.x) / scale;
            const endY = (clientY - platformRect.top - offset.y) / scale;

            if (direction === "output") {
                setNewConnection({ from: { nodeId, port: port.name, portDef: port } });
            } else {
                setNewConnection({ to: { nodeId, port: port.name, portDef: port } });
            }
            setConnectionPreview({
                start: pos,
                end: { x: endX, y: endY },
            });
            onStartConnection?.(nodeId, port);
        }
    }, [portPositions, platformRef, offset, scale, edges, onDeleteConnection, onStartConnection, setWarningMessage]);

    const handlePortPointerUp = useCallback((
        nodeId: string,
        port: PortDef,
        direction: "input" | "output"
    ) => {
        if (!newConnection) return;

        let fromNodeId: string | undefined;
        let fromPortName: string | undefined;
        let toNodeId: string | undefined;
        let toPortName: string | undefined;

        if (direction === "input") {
            fromNodeId = newConnection.from?.nodeId;
            fromPortName = newConnection.from?.port;
            toNodeId = nodeId;
            toPortName = port.name;
        } else {
            fromNodeId = nodeId;
            fromPortName = port.name;
            toNodeId = newConnection.to?.nodeId;
            toPortName = newConnection.to?.port;
        }

        if (!fromNodeId || !fromPortName || !toNodeId || !toPortName) {
            setNewConnection(null);
            setConnectionPreview(null);
            return;
        }

        const fromNode = nodes.find(n => n.id === fromNodeId);
        const toNode = nodes.find(n => n.id === toNodeId);
        const fromNodeType = fromNode ? nodeTypes[fromNode.type] : undefined;
        const toNodeType = toNode ? nodeTypes[toNode.type] : undefined;

        const fromPortDef = fromNodeType?.outputs.find(p => p.name === fromPortName);
        const toPortDef = toNodeType?.inputs.find(p => p.name === toPortName);

        // Validation
        if (fromNodeId === toNodeId) {
            setWarningMessage("Cannot connect a node to itself");
        } else if (!fromNodeType || !toNodeType) {
            setWarningMessage("Invalid node types");
        } else if (!fromPortDef || !toPortDef) {
            setWarningMessage("Port not found in node definition");
        } else if (fromPortDef.type !== toPortDef.type) {
            setWarningMessage(`Cannot connect ports of different types: ${fromPortDef.type} and ${toPortDef.type}`);
        } else {
            const isDuplicate = edges.some(
                e => e.from.nodeId === fromNodeId &&
                    e.from.port === fromPortName &&
                    e.to.nodeId === toNodeId &&
                    e.to.port === toPortName
            );

            if (isDuplicate) {
                setWarningMessage("This connection already exists");
            } else {
                const inputAlreadyConnected = edges.some(
                    e => e.to.nodeId === toNodeId && e.to.port === toPortName
                );

                if (inputAlreadyConnected) {
                    setWarningMessage(`Input port "${toPortName}" is already connected`);
                } else {
                    onCompleteConnection({
                        from: { nodeId: fromNodeId, port: fromPortName },
                        to: { nodeId: toNodeId, port: toPortName },
                    });
                }
            }
        }

        setNewConnection(null);
        setConnectionPreview(null);
    }, [newConnection, nodes, nodeTypes, edges, onCompleteConnection, setWarningMessage]);

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (connectionPreview && newConnection && platformRef.current) {
            const platformRect = platformRef.current.getBoundingClientRect();
            setConnectionPreview(prev => prev ? {
                ...prev,
                end: {
                    x: (e.clientX - platformRect.left - offset.x) / scale,
                    y: (e.clientY - platformRect.top - offset.y) / scale
                }
            } : null);
        }
    }, [connectionPreview, newConnection, platformRef, offset, scale]);

    const handlePointerUp = useCallback(() => {
        setNewConnection(null);
        setConnectionPreview(null);
    }, []);

    return {
        newConnection,
        connectionPreview,
        handlePortPointerDown,
        handlePortPointerUp,
        handlePointerMove,
        handlePointerUp,
    };
}
