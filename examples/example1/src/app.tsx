import { useRef } from "preact/hooks";
import { NodeSystem, type NodeSystemHandle } from "../../../src/components/NodeSystem/NodeSystem.tsx";
import type { Connection, NodeData, NodeTypeDef } from "../../../src/components/Node/node.ts";
import "./app.css";
import { serializeGraph } from "../../../src/utils/serialize.ts";
import { deserializeGraph } from "../../../src/utils/deserialize.ts";

// 1. Define Node Types
const nodeTypes: Record<string, NodeTypeDef> = {
  add: {
    id: "add",
    title: "Add",
    inputs: [
      { name: "A", type: "number" },
      { name: "B", type: "number" },
    ],
    outputs: [{ name: "Result", type: "number" }],
    color: "#3f51b5",
    category: "Math",
    showOutputs: true,
  },
  subtract: {
    id: "subtract",
    title: "Subtract",
    inputs: [
      { name: "A", type: "number" },
      { name: "B", type: "number" },
    ],
    outputs: [{ name: "Result", type: "number" }],
    color: "#f44336",
    category: "Math",
    showOutputs: true,
  },
  test: {
    id: "test",
    title: "Blok testowy",
    inputs: [
      { name: "Boolean", type: "boolean" },
      { name: "Kolor", type: "color" },
      { name: "Numer", type: "number" },
      { name: "Tekst", type: "string" },
      { name: "Zdjęcie", type: "image" },
      { name: "Wektor (2)", type: "Vec2" },
      { name: "Wektor (3)", type: "Vec3" },
    ],
    outputs: [{ name: "Wyjście", type: "number" }],
    color: "#4caf50",
    showOutputs: true,
  }
};

// 2. Initial Node Data
const initialNodes: NodeData[] = [
  { id: "3", type: "add", x: 300, y: 120 },
  { id: "5", type: "subtract", x: 300, y: 300 },
  { id: "4", type: "subtract", x: 600, y: 120 },
];

const initialConnections: Connection[] = [];

const saveGraphToFile = (nodes: NodeData[], connections: Connection[], filename: string = 'graph.json') => {
  const json = serializeGraph(nodes, connections);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};



export function App() {
  const nodeSystemRef = useRef<NodeSystemHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  function handleSaveGraph() {
    if (!nodeSystemRef.current) {
      console.error('NodeSystem ref is not set yet.');
      alert('NodeSystem is not ready yet. Try again in a moment.');
      return;
    }

    if (typeof (nodeSystemRef.current as any).save !== 'function') {
      console.error('NodeSystem handle does not expose save().', nodeSystemRef.current);
      alert('Save is not available — see console for details.');
      return;
    }

    const { nodes, connections } = nodeSystemRef.current.save();
    saveGraphToFile(nodes, connections);
  }


  const handleLoadGraph = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const state = deserializeGraph(json);
        nodeSystemRef.current?.load(state);
      } catch (error) {
        console.error("Failed to load graph:", error);
        alert("Failed to load graph. Invalid JSON file.");
      }
    };

    reader.readAsText(file);
    // Reset input so same file can be selected again
    input.value = '';
  };

  /**
   * Simple Graph Execution Engine
   * This function is called by NodeSystem via returningCallback.
   * It calculates values based on connections.
   */
  const processGraph = (state: { nodes: NodeData[], connections: Connection[] }) => {
    const { nodes, connections } = state;

    // 1. Create a map for quick access and to store calculated results
    const nodeResults: Record<string, Record<string, any>> = {};
    nodes.forEach(n => {
      nodeResults[n.id] = { ...(n.data || {}) };
    });

    // 2. Simple iterative pass (improvement: topological sort)
    // We run it a few times to propagate values through connections
    for (let i = 0; i < 3; i++) {
      nodes.forEach(node => {
        const currentData = nodeResults[node.id];

        // Resolve inputs from connections
        connections.forEach(conn => {
          if (conn.to.nodeId === node.id) {
            const sourceNodeValues = nodeResults[conn.from.nodeId];
            if (sourceNodeValues && sourceNodeValues[conn.from.port] !== undefined) {
              currentData[conn.to.port] = sourceNodeValues[conn.from.port];
            }
          }
        });

        // Execute node logic
        if (node.type === 'add') {
          const a = parseFloat(currentData['A']) || 0;
          const b = parseFloat(currentData['B']) || 0;
          currentData['Result'] = a + b;
        } else if (node.type === 'subtract') {
          const a = parseFloat(currentData['A']) || 0;
          const b = parseFloat(currentData['B']) || 0;
          currentData['Result'] = a - b;
        } else if (node.type === 'logic') {
          const enabled = !!currentData['Enabled'];
          const val = parseFloat(currentData['Value']) || 0;
          currentData['Out'] = enabled ? val : 0;
        }
      });
    }

    // 3. Return updated nodes with calculated data
    return {
      nodes: nodes.map(n => ({
        ...n,
        data: nodeResults[n.id]
      })),
      connections
    };
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <NodeSystem
        nodeRef={nodeSystemRef}
        nodeTypes={nodeTypes}
        initialNodes={initialNodes}
        initialConnections={initialConnections}
        returningCallback={processGraph}
      />
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 100 }}>
        <button
          onClick={handleSaveGraph}
          style={{ padding: '8px 16px', cursor: 'pointer', background: 'white', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          Save JSON
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ padding: '8px 16px', cursor: 'pointer', background: 'white', border: '1px solid #ccc', borderRadius: '4px', marginLeft: '10px' }}
        >
          Load JSON
        </button>
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleLoadGraph}
        />
      </div>
    </div>
  );
}