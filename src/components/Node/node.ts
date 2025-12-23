// Node.ts
export type PortDirection = "input" | "output";

/**
 * Basic port definition used by engine and UI.
 */
export interface PortDef {
  name: string;
  type: string; // logical type name e.g. "Int", "Object", "Vec3"
}

/**
 * Node type definition - describes ports and optional metadata.
 */
export interface NodeTypeDef {
  id: string;
  title?: string;
  category?: string;
  inputs: PortDef[];
  outputs: PortDef[];
  color?: string; // optional theme color for the node
  showOutputs?: boolean; // whether to display output values inline on the node
}

/**
 * Instance of a node placed in the graph.
 */
export interface NodeData {
  id: string;
  type: string; // matches NodeTypeDef.id
  x: number;
  y: number;
  width?: number;
  height?: number;
  data?: Record<string, any>;
  selected?: boolean;
}

export type Connection = {
  from: {
    nodeId: string,
    port: string,
    portDef?: PortDef // Added for connection validation
  },
  to: {
    nodeId: string,
    port: string,
    portDef?: PortDef // Added for connection validation
  }
};