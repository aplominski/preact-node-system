import { h } from "preact";
import type { FunctionalComponent } from "preact";
import type { Connection, NodeData } from "../Node/node";

type EdgeRendererProps = {
    edges: Connection[];
    nodes: NodeData[];
    portPositions: { [key: string]: { x: number; y: number } };
    onDeleteConnection?: (connection: Connection) => void;
};

export const EdgeRenderer: FunctionalComponent<EdgeRendererProps> = ({
    edges,
    nodes,
    portPositions,
    onDeleteConnection,
}) => {
    return (
        <>
            {edges.map((edge, idx) => {
                const fromNode = nodes.find((n) => n.id === edge.from.nodeId);
                const toNode = nodes.find((n) => n.id === edge.to.nodeId);

                const fromPortKey = `${edge.from.nodeId}-${edge.from.port}`;
                const toPortKey = `${edge.to.nodeId}-${edge.to.port}`;

                const fromPos = portPositions[fromPortKey];
                const toPos = portPositions[toPortKey];

                if (!fromNode || !toNode || !fromPos || !toPos) {
                    return null;
                }

                // Calculate control points for smooth Bezier curves
                const dx = Math.abs(toPos.x - fromPos.x);
                const offset = Math.min(dx * 0.5, 100);

                const path = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + offset} ${fromPos.y}, ${toPos.x - offset} ${toPos.y}, ${toPos.x} ${toPos.y}`;

                const handlePointerDown = (e: PointerEvent) => {
                    e.stopPropagation();
                    // Disconnect on Ctrl/Cmd + Left Click
                    if ((e.ctrlKey || e.metaKey) && e.button === 0) {
                        e.preventDefault();
                        onDeleteConnection?.(edge);
                    }
                };

                const handleContextMenu = (e: MouseEvent) => {
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteConnection?.(edge);
                    }
                };

                return (
                    <g key={idx}>
                        {/* Hit area for easier selection/interaction */}
                        <path
                            d={path}
                            stroke="transparent"
                            strokeWidth={15}
                            fill="none"
                            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                            onPointerDown={handlePointerDown}
                            onContextMenu={handleContextMenu}
                        />
                        {/* Visual path */}
                        <path
                            d={path}
                            stroke="#888"
                            strokeWidth={2}
                            fill="none"
                            pointerEvents="none"
                        />
                    </g>
                );
            })}
        </>
    );
};

export interface ConnectionPreviewProps {
    preview: { start: { x: number; y: number }; end: { x: number; y: number } };
}

export const ConnectionPreviewLine: FunctionalComponent<ConnectionPreviewProps> = ({ preview }) => {
    const dx = Math.abs(preview.end.x - preview.start.x);
    const offset = Math.min(dx * 0.5, 100);
    const previewPath = `M ${preview.start.x} ${preview.start.y} C ${preview.start.x + offset} ${preview.start.y}, ${preview.end.x - offset} ${preview.end.y}, ${preview.end.x} ${preview.end.y}`;

    return (
        <path
            d={previewPath}
            stroke="#aaa"
            strokeDasharray="5,5"
            strokeWidth={2}
            fill="none"
            pointerEvents="none"
        />
    );
};

export default EdgeRenderer;
