# Getting Started — Simple Editors 

This short guide shows how to create a minimal node-based editor using the components provided by this library.

## Prerequisites

- Node.js & npm
- A Preact app (this library is a set of Preact components; install `preact` as a peer dependency)

## Quick steps

1. Install or link the library to your app:

You can download the full CSS and JavaScript files from a package that has been added to the GitHub version. This package also includes a .d.ts file with the TypeScript/TSX definitions.

2. Basic structure

- Use `NodePlatform` as the canvas for nodes and edges.
- Use `NodeSystem` to hold node data and manage connections.
- Create `Node` components to define node UI and expose inputs/outputs.
- Use editors like `VariableEditor` to present editable properties.

## Concrete example (based on `examples/example1`)

Below are the essential snippets taken from `examples/example1/src/app.tsx` so you can get started quickly.

### 1) Define node types

```ts
const nodeTypes: Record<string, NodeTypeDef> = {
  add: {
    id: "add",
    title: "Add",
    inputs: [ { name: "A", type: "number" }, { name: "B", type: "number" } ],
    outputs: [ { name: "Result", type: "number" } ],
    color: "#3f51b5",
    category: "Math",
    showOutputs: true,
  },
  // more types...
};
```

### 2) Initial nodes and connections

```ts
const initialNodes: NodeData[] = [
  { id: "3", type: "add", x: 300, y: 120 },
  { id: "5", type: "subtract", x: 300, y: 300 },
];
const initialConnections: Connection[] = [];
```

### 3) Serialization / save & load

The example includes `serializeGraph` / `deserializeGraph` helpers and exposes simple Save/Load buttons that call `nodeSystemRef.current.save()` and `nodeSystemRef.current.load(state)` to persist the graph to JSON or restore it from a file.

### 4) Simple execution engine (processing values)

`NodeSystem` can accept a `returningCallback` which the example uses to process the graph and compute node outputs. The example implements a basic iterative evaluator that:

- builds a map of node data,
- propagates connected values through ports,
- executes small per-node logic (e.g., "add", "subtract"),
- returns updated nodes + connections.

A trimmed pseudocode of this idea:

```ts
const processGraph = (state) => {
  // build nodeResults map and run a few passes resolving connections
  // execute per-node operations (add/subtract/etc.)
  return { nodes: updatedNodes, connections };
};
```

### 5) Run the example locally

```bash
cd examples/example1
npm install
npm run dev
# open http://localhost:5173 (Vite default) and try the editor
```

See the full demo in `examples/example1` to inspect the exact implementation (save/load buttons, file input handling, and the `processGraph` logic).

---

## Tips

- Start simple: create one or two custom node types and ensure you can serialize/deserialize their state.
- Reuse `VariableEditor` for common property editors (number, string, color, etc.).
- Inspect `src/` for hooks and utilities (e.g., serialization helpers, dragging/panning hooks).

---

For more advanced topics (custom renderers, complex connection rules, performance tips), open an issue or a PR and we can expand this docs section. Thank you for trying out the project! 
