import { h } from "preact";
import { useRef, useState, useEffect } from "preact/hooks";
import type { FunctionalComponent } from "preact";
import Node from "../Node/Node.tsx";
import BlockMenu from "../BlockMenu/BlockMenu.tsx";
import { EdgeRenderer, ConnectionPreviewLine } from "./EdgeRenderer.tsx";
import { usePanning } from "./hooks/usePanning";
import { useSelectionBox } from "./hooks/useSelectionBox";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useConnectionDrag } from "./hooks/useConnectionDrag";
import type { Connection, NodeData, NodeTypeDef, PortDef } from "../Node/node.ts";
import "./NodePlatform.css";

import { distancePointToSegment, distance } from "../../utils/geometry"; // Import geometry utils

type Props = {
  nodes: NodeData[];
  nodeTypes: Record<string, NodeTypeDef>;
  edges?: Connection[];
  onNodeMove?: (id: string, x: number, y: number) => void;
  onNodeSelect?: (id: string | string[] | null, evt?: PointerEvent) => void;
  onNodeDelete?: (id: string | string[]) => void;
  onCompleteConnection: (connection: Connection) => void;
  onStartConnection?: (fromNode: string, fromPort: PortDef) => void;
  onAddNode?: (nodeTypeId: string, x: number, y: number) => void;
  onPasteNodes?: (nodes: NodeData[]) => void;
  onNodeValueChange?: (id: string, portName: string, value: any) => void;
  onNodeDragStart?: (id: string) => void;
  onNodeDragEnd?: (id: string) => void;
  onDeleteConnection?: (connection: Connection) => void;
  onSpliceNode?: (nodeId: string, connectionToRemove: Connection, inputPort: string, outputPort: string) => void;
};

export const NodePlatform: FunctionalComponent<Props> = ({
  nodes,
  nodeTypes,
  edges = [],
  onNodeMove,
  onNodeSelect,
  onNodeDelete,
  onStartConnection,
  onCompleteConnection,
  onDeleteConnection,
  onAddNode,
  onPasteNodes,
  onNodeValueChange,
  onNodeDragStart,
  onNodeDragEnd,
  onSpliceNode,
}) => {
  const platformRef = useRef<HTMLDivElement | null>(null);
  const clipboardRef = useRef<NodeData[]>([]);
  const [portPositions, setPortPositions] = useState<{ [key: string]: { x: number, y: number } }>({});
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [blockMenuPosition, setBlockMenuPosition] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Custom hooks
  const { offset, scale, setOffset, handleWheel, handleMiddleMousePan } = usePanning();
  const { selectionBox, handleSelectionStart } = useSelectionBox();

  const {
    newConnection,
    connectionPreview,
    handlePortPointerDown,
    handlePortPointerUp,
    handlePointerMove: handleConnectionPointerMove,
    handlePointerUp: handleConnectionPointerUp,
  } = useConnectionDrag({
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
  });

  // Splice logic
  const handleNodeDragEndWrapper = (nodeId: string) => {
    onNodeDragEnd?.(nodeId);

    if (!onSpliceNode) return;

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const nodeType = nodeTypes[node.type];
    if (!nodeType) return;



    // Collect valid port positions for this node
    // We strictly use DOM for the dragged node to ensure we have the latest visual position
    // because React state (portPositions) might lag behind the drag animation.
    const inputPositions: { name: string, p: { x: number, y: number } }[] = [];
    const outputPositions: { name: string, p: { x: number, y: number } }[] = [];

    let centerX = 0;
    let centerY = 0;
    let count = 0;

    if (platformRef.current) {
      const platformRect = platformRef.current.getBoundingClientRect();
      const portElements = platformRef.current.querySelectorAll(`.node-node[data-id="${nodeId}"] .node-port-dot`);

      portElements.forEach((el) => {
        const portName = el.getAttribute('data-port-name');

        if (!portName) return;

        const rect = el.getBoundingClientRect();
        // Convert to local coordinates
        const localX = (rect.left + rect.width / 2 - platformRect.left - offset.x) / scale;
        const localY = (rect.top + rect.height / 2 - platformRect.top - offset.y) / scale;

        // Determine if it is input or output based on typeDef
        const isInput = nodeType.inputs.some(def => def.name === portName);
        const isOutput = nodeType.outputs.some(def => def.name === portName);

        if (isInput) {
          inputPositions.push({ name: portName, p: { x: localX, y: localY } });
          centerX += localX;
          centerY += localY;
          count++;
        } else if (isOutput) {
          outputPositions.push({ name: portName, p: { x: localX, y: localY } });
          centerX += localX;
          centerY += localY;
          count++;
        }
      });
    }


    if (count === 0) return; // No ports, can't splice

    const nodeCenter = { x: centerX / count, y: centerY / count };

    let bestConnection: Connection | null = null;
    let minDist = Infinity;
    const SPLICE_THRESHOLD = 50; // pixels

    for (const edge of edges) {
      // Avoid splicing self-connections or already connected (basic check)
      if (edge.from.nodeId === nodeId || edge.to.nodeId === nodeId) continue;

      const startPos = portPositions[`${edge.from.nodeId}-${edge.from.port}`];
      const endPos = portPositions[`${edge.to.nodeId}-${edge.to.port}`];

      if (!startPos || !endPos) continue;

      const dist = distancePointToSegment(nodeCenter, startPos, endPos);

      if (dist < SPLICE_THRESHOLD && dist < minDist) {
        minDist = dist;
        bestConnection = edge;
      }
    }

    if (bestConnection) {
      // Find best input port (closest to connection source)
      const startPos = portPositions[`${bestConnection.from.nodeId}-${bestConnection.from.port}`];

      let bestInput = null;
      let minInputDist = Infinity;

      for (const input of inputPositions) {
        const d = distance(input.p, startPos);
        if (d < minInputDist) {
          minInputDist = d;
          bestInput = input.name;
        }
      }

      // Find best output port (closest to connection target)
      const endPos = portPositions[`${bestConnection.to.nodeId}-${bestConnection.to.port}`];

      let bestOutput = null;
      let minOutputDist = Infinity;

      for (const output of outputPositions) {
        const d = distance(output.p, endPos);
        if (d < minOutputDist) {
          minOutputDist = d;
          bestOutput = output.name;
        }
      }

      if (bestInput && bestOutput) {
        onSpliceNode(nodeId, bestConnection, bestInput, bestOutput);
      }
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    nodes,
    blockMenuOpen,
    mousePosition,
    offset,
    scale,
    platformRef,
    clipboardRef,
    onBlockMenuOpen: (position) => {
      setBlockMenuPosition(position);
      setBlockMenuOpen(true);
    },
    onNodeDelete: onNodeDelete as ((ids: string[]) => void) | undefined,
    onNodeSelect: onNodeSelect as ((id: string | string[] | null) => void) | undefined,
    onNodeMove,
    onPasteNodes,
  });

  // Warning message auto-hide
  useEffect(() => {
    if (warningMessage) {
      const timer = setTimeout(() => {
        setWarningMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [warningMessage]);

  // Track mouse position
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  const handleBlockMenuSelect = (nodeTypeId: string) => {
    if (!onAddNode || !platformRef.current) return;

    const rect = platformRef.current.getBoundingClientRect();
    const nodeX = (mousePosition.x - rect.left - offset.x) / scale;
    const nodeY = (mousePosition.y - rect.top - offset.y) / scale;

    onAddNode(nodeTypeId, nodeX, nodeY);
  };

  const handlePortPositionChange = (nodeId: string, portName: string, position: { x: number, y: number }) => {
    if (platformRef.current) {
      const platformRect = platformRef.current.getBoundingClientRect();
      const localX = (position.x - platformRect.left - offset.x) / scale;
      const localY = (position.y - platformRect.top - offset.y) / scale;

      setPortPositions(prev => ({
        ...prev,
        [`${nodeId}-${portName}`]: {
          x: localX,
          y: localY,
        }
      }));
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    // Handle middle mouse button for panning
    if (handleMiddleMousePan(e)) return;

    if (e.button !== 0) return;
    setWarningMessage(null);

    // Handle Shift + Click for box selection
    if (handleSelectionStart(e, platformRef, (ids, evt) => onNodeSelect?.(ids, evt))) {
      return;
    }

    // If clicking on the platform background, deselect all nodes
    if (!e.ctrlKey && !e.metaKey && onNodeSelect) {
      const target = e.target as Element;
      if (!target.closest('.node-node')) {
        onNodeSelect(null, e);
      }
    }

    // Panning with left mouse button
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
  };

  const onPointerMove = (e: PointerEvent) => {
    handleConnectionPointerMove(e);
  };

  const onPointerUp = () => {
    handleConnectionPointerUp();
  };

  const handleAuxClick = (e: MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  };

  return (
    <div
      className="node-node-platform"
      ref={platformRef}
      onWheel={handleWheel as any}
      onPointerDown={onPointerDown as any}
      onPointerMove={onPointerMove as any}
      onPointerUp={onPointerUp as any}
      onAuxClick={handleAuxClick as any}
    >
      <svg
        className="node-node-platform-canvas"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        }}
      >
        <EdgeRenderer
          edges={edges}
          nodes={nodes}
          portPositions={portPositions}
          onDeleteConnection={onDeleteConnection}
        />
        {connectionPreview && (
          <ConnectionPreviewLine preview={connectionPreview} />
        )}
      </svg>

      {selectionBox && platformRef.current && (() => {
        const rect = platformRef.current.getBoundingClientRect();
        const left = Math.min(selectionBox.start.x, selectionBox.end.x) - rect.left;
        const top = Math.min(selectionBox.start.y, selectionBox.end.y) - rect.top;
        const width = Math.abs(selectionBox.end.x - selectionBox.start.x);
        const height = Math.abs(selectionBox.end.y - selectionBox.start.y);

        return (
          <div
            style={{
              position: 'absolute',
              left: left,
              top: top,
              width: width,
              height: height,
              backgroundColor: 'rgba(0, 120, 255, 0.2)',
              border: '1px solid rgba(0, 120, 255, 0.5)',
              pointerEvents: 'none',
              zIndex: 1000
            }}
          />
        );
      })()}

      <div
        className="node-node-platform-nodes"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        }}
      >
        {nodes.map((n) => (
          <Node
            key={n.id}
            node={n}
            typeDef={nodeTypes[n.type]}
            onMove={(id, x, y) => {
              if (onNodeMove) {
                const node = nodes.find(n => n.id === id);
                if (node) {
                  if (node.selected) {
                    const dx = x - node.x;
                    const dy = y - node.y;

                    const selectedNodes = nodes.filter(n => n.selected);
                    selectedNodes.forEach(sn => {
                      onNodeMove(sn.id, sn.x + dx, sn.y + dy);
                    });
                  } else {
                    onNodeMove(id, x, y);
                  }
                }
              }
            }}
            onSelect={(id, evt) => {
              if (evt) {
                onNodeSelect?.(id, evt);
              } else {
                onNodeSelect?.(id);
              }
            }}
            onPortPointerDown={handlePortPointerDown}
            onPortPointerUp={handlePortPointerUp}
            onPortPositionChange={handlePortPositionChange}
            onValueChange={onNodeValueChange}
            onDragStart={onNodeDragStart}
            onDragEnd={handleNodeDragEndWrapper}
            connections={edges}
          />
        ))}
      </div>

      {warningMessage && (
        <div className="node-node-platform-warning">
          {warningMessage}
        </div>
      )}

      {blockMenuOpen && onAddNode && (
        <BlockMenu
          nodeTypes={nodeTypes}
          position={blockMenuPosition}
          onSelect={handleBlockMenuSelect}
          onClose={() => setBlockMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default NodePlatform;