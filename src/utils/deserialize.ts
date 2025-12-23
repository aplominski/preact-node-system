import { NodeData, Connection } from "../components/Node/node";
import { SerializedGraph } from "./serialize";

export interface GraphState {
  nodes: NodeData[];
  connections: Connection[];
}

/**
 * Deserializes a JSON string back into graph state.
 */
export function deserializeGraph(json: string): GraphState {
  try {
    const state: SerializedGraph = JSON.parse(json);
    // Basic structure check
    if (!state || !Array.isArray(state) || state.length !== 2) {
      throw new Error("Invalid graph state format");
    }

    const nodes: NodeData[] = state[0].map((n) => {
      const node: NodeData = {
        id: n[0] as string,
        type: n[1] as string,
        x: n[2] as number,
        y: n[3] as number,
      };

      if (n[4]) {
        node.data = n[4] as Record<string, any>;
      }
      if (n[5]) {
        node.width = n[5] as number;
      }
      if (n[6]) {
        node.height = n[6] as number;
      }

      return node;
    });

    const connections: Connection[] = state[1].map((c) => ({
      from: {
        nodeId: c[0] as string,
        port: c[1] as string,
      },
      to: {
        nodeId: c[2] as string,
        port: c[3] as string,
      },
    }));

    return {
      nodes,
      connections,
    };
  } catch (e) {
    console.error("Failed to deserialize graph:", e);
    throw e;
  }
}
