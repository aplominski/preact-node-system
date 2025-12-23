import { NodeData, Connection } from "../components/Node/node";

export type SerializedGraph = [
  (string | number | Record<string, any> | undefined)[][],
  (string | number)[][]
];
/**
 * Serializes the current graph state (nodes and connections) to a compact JSON string.
 */
export function serializeGraph(
  nodes: NodeData[],
  connections: Connection[]
): string {
  const serializedNodes = nodes.map((n) => {
    const node: (string | number | Record<string, any> | undefined)[] = [
      n.id,
      n.type,
      Math.round(n.x),
      Math.round(n.y),
    ];

    if (
      n.data &&
      Object.keys(n.data).length > 0
    ) {
      node.push(n.data);
    } else {
      node.push(undefined);
    }

    if (n.width) {
      node.push(n.width);
    } else {
      node.push(undefined);
    }

    if (n.height) {
      node.push(n.height);
    } else {
      node.push(undefined);
    }

    // trim trailing undefined values
    for (let i = node.length - 1; i >= 4; i--) {
      if (node[i] === undefined) {
        node.pop();
      } else {
        break;
      }
    }

    return node;
  });

  const serializedConnections = connections.map((c) => [
    c.from.nodeId,
    c.from.port,
    c.to.nodeId,
    c.to.port,
  ]);

  const state: SerializedGraph = [serializedNodes, serializedConnections];

  return JSON.stringify(state);
}
