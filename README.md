# Preact Node System 

A small, lightweight set of Preact components for building node-based editors (nodes, edges, platforms, and editors). It provides composable UI building blocks to create interactive node graphs and editor interfaces for web applications.

---

## Quick overview

- **What it is:** A minimal node editor system implemented with **Preact** components.
- **How it works:** Nodes are represented by `Node` components and rendered inside `NodePlatform`. `NodeSystem` coordinates nodes and connections; editors such as `VariableEditor` expose editable properties. The project includes utilities for serializing and deserializing node graphs.

---

## Example 

See the demo at `examples/example1`:

1. cd into the example: `cd examples/example1`
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev` (uses Vite)

Open the site in your browser to interact with the example node editor.

---

## Documentation & Getting Started 

Detailed documentation and guides live in the `docs/` folder. Start with `docs/getting-started.md` for a short tutorial on creating simple editors — covering how to define node types, wire inputs and outputs, and use `NodePlatform`, `NodeSystem`, and `VariableEditor`. For a complete working example, see `examples/example1`.

---

## Build & use

- Root scripts live in `package.json`.
- To build the library:

```bash
npm install
npm run build
```

- The package is distributed in `dist` (ESM, CJS and types). This library has a peer dependency on `preact` — make sure your app provides it.

---

## Contributing 

Contributions and issues are welcome. Please open issues or PRs on the repository.

---

## License 

This project is provided under the **BSD 3-Clause License**. See the `LICENSE` file for details.

---
