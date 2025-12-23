/** Node.tsx */
import { h } from "preact";
import { useRef, useEffect, useState, useCallback } from "preact/hooks";
import type { FunctionalComponent } from "preact";
import type { NodeData, NodeTypeDef, PortDef, Connection } from "./node";
import { useNodeDrag } from "./hooks/useNodeDrag";
import { OutputViewer } from "./OutputViewer";
import VariableEditor from "../VariableEditor/VariableEditor.tsx";
import "./Node.css";

type Props = {
  node: NodeData;
  typeDef: NodeTypeDef;
  onMove: (id: string, x: number, y: number) => void;
  onPortPointerDown: (id: string, port: PortDef, direction: "input" | "output", clientX: number, clientY: number) => void;
  onPortPointerUp: (id: string, port: PortDef, direction: "input" | "output") => void;
  onSelect?: (id: string, evt: PointerEvent) => void;
  onPortPositionChange: (id: string, portName: string, position: { x: number, y: number }) => void;
  onValueChange?: (id: string, portName: string, value: any) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  connections?: Connection[];
};

export const Node: FunctionalComponent<Props> = ({
  node,
  typeDef,
  onMove,
  onPortPointerDown,
  onPortPointerUp,
  onSelect,
  onPortPositionChange,
  onValueChange,
  onDragStart,
  onDragEnd,
  connections = []
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const portContainerRef = useRef<HTMLDivElement | null>(null);

  // Output viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerValue, setViewerValue] = useState<any>(null);
  const [viewerType, setViewerType] = useState<string | undefined>(undefined);
  const [viewerPosition, setViewerPosition] = useState<{ x: number; y: number } | null>(null);

  const updatePortPositions = useCallback(() => {
    if (portContainerRef.current) {
      const portElements = portContainerRef.current.querySelectorAll('.node-port-dot');
      portElements.forEach(portElement => {
        const portName = portElement.getAttribute('data-port-name');
        if (portName) {
          const rect = portElement.getBoundingClientRect();
          onPortPositionChange(node.id, portName, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
      });
    }
  }, [node.id, onPortPositionChange]);

  useEffect(() => {
    const timeoutId = setTimeout(updatePortPositions, 0);
    return () => clearTimeout(timeoutId);
  }, [node.x, node.y, node.id, typeDef.inputs, typeDef.outputs, updatePortPositions]);

  // Use custom hook for drag logic
  const { onPointerDown } = useNodeDrag({
    nodeId: node.id,
    nodeX: node.x,
    nodeY: node.y,
    selected: node.selected ?? false,
    onMove,
    onSelect,
    onDragStart,
    onDragEnd,
    updatePortPositions,
  });

  // Helper function to check if an input port is connected
  const isInputConnected = (portName: string): boolean => {
    return connections.some(
      (conn) => conn.to.nodeId === node.id && conn.to.port === portName
    );
  };

  // Helper function to handle value changes
  const handleValueChange = (portName: string, value: any) => {
    if (onValueChange) {
      onValueChange(node.id, portName, value);
    }
  };

  const openViewer = (value: any, type?: string, pos?: { x: number; y: number } | null) => {
    setViewerValue(value);
    setViewerType(type);
    setViewerPosition(pos ?? null);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerValue(null);
    setViewerType(undefined);
    setViewerPosition(null);
  };

  // compute CSS transform from node position
  const style: Record<string, string | undefined> = {
    transform: `translate(${node.x}px, ${node.y}px)`,
    minWidth: node.width ? `${node.width}px` : undefined,
    minHeight: node.height ? `${node.height}px` : undefined,
    borderColor: typeDef.color ?? undefined,
    '--node-border-color': typeDef.color ?? '#333',
  };

  return (
    <>
      <div
        className={`node-node ${node.selected ? "selected" : ""}`}
        ref={rootRef}
        style={style}
        data-id={node.id}
        onPointerDown={(e) => onPointerDown(e as unknown as PointerEvent)}
        onDragStart={(e) => e.preventDefault()}
        role="group"
        aria-label={typeDef.title ?? typeDef.id}
      >
        <div className="node-node-header" title={typeDef.id}>
          <div className="node-node-title">{typeDef.title ?? typeDef.id}</div>
          {typeDef.category && <div className="node-node-category">{typeDef.category}</div>}
        </div>

        <div className="node-node-body" ref={portContainerRef}>
          <div className="node-node-ports node-node-inputs">
            {typeDef.inputs.map((p, idx) => {
              const connected = isInputConnected(p.name);
              const portValue = node.data?.[p.name];
              return (
                <div className="node-port-row" key={`in-${idx}-${p.name}`}>
                  <div
                    className="node-port-dot node-port-input"
                    data-port-name={p.name}
                    data-port-type={p.type}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onPortPointerDown(node.id, p, "input", e.clientX, e.clientY);
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      onPortPointerUp(node.id, p, "input");
                    }}
                    title={`${p.name} : ${p.type}`}
                  />
                  <div className="node-port-label">{p.name}</div>
                  <div className={`node-port-value-container ${connected ? 'connected' : ''}`}>
                    <VariableEditor
                      type={p.type}
                      value={portValue}
                      onChange={(value) => handleValueChange(p.name, value)}
                      disabled={connected}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="node-node-spacer" />

          <div className="node-node-ports node-node-outputs">
            {typeDef.outputs.map((p, idx) => {
              const portValue = node.data?.[p.name];
              return (
                <div className="node-port-row" key={`out-${idx}-${p.name}`}>
                  <div className="node-port-label">{p.name}</div>
                  {typeDef.showOutputs && (
                    <div
                      className="node-output-clickable"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as Element).getBoundingClientRect();
                        openViewer(portValue, p.type, { x: rect.left, y: rect.bottom + 6 });
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
                          const rect = (e.currentTarget as Element).getBoundingClientRect();
                          openViewer(portValue, p.type, { x: rect.left, y: rect.bottom + 6 });
                        }
                      }}
                    >
                      <VariableEditor
                        type={p.type}
                        value={portValue}
                        onChange={(value) => handleValueChange(p.name, value)}
                        disabled={true}
                      />
                    </div>
                  )}
                  <div
                    className="node-port-dot node-port-output"
                    data-port-name={p.name}
                    data-port-type={p.type}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onPortPointerDown(node.id, p, "output", e.clientX, e.clientY);
                    }}
                    onDblClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as Element).getBoundingClientRect();
                      openViewer(portValue, p.type, { x: rect.left, y: rect.bottom + 6 });
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      onPortPointerUp(node.id, p, "output");
                    }}
                    title={`${p.name} : ${p.type}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {viewerOpen && (
        <OutputViewer
          value={viewerValue}
          type={viewerType}
          position={viewerPosition}
          onClose={closeViewer}
        />
      )}
    </>
  );
};

export default Node;