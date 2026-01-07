/**
 * Graph export functionality
 * Export knowledge graph to various formats
 */

import { useState, useCallback } from "react";
import { Download, Image, FileText, Network } from "lucide-react";
import { GraphData, GraphNode, GraphEdge, GraphNodeType } from "./KnowledgeGraph";

/**
 * Export format
 */
export enum GraphExportFormat {
  PNG = "png",
  SVG = "svg",
  JSON = "json",
  GEXF = "gexf",
  GraphML = "graphml",
  CSV = "csv",
  DOT = "dot",
}

/**
 * Export options
 */
export interface GraphExportOptions {
  format: GraphExportFormat;
  includeMetadata?: boolean;
  includeLayout?: boolean;
  scale?: number;
  backgroundColor?: string;
}

/**
 * Export graph to PNG
 */
export function exportGraphToPNG(
  canvas: HTMLCanvasElement,
  options: GraphExportOptions = { format: GraphExportFormat.PNG }
): void {
  const { scale = 2, backgroundColor = "#ffffff" } = options;

  // Create temporary canvas for scaling
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width * scale;
  tempCanvas.height = canvas.height * scale;
  const tempCtx = tempCanvas.getContext("2d");

  if (!tempCtx) return;

  // Fill background
  tempCtx.fillStyle = backgroundColor;
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  // Draw original canvas scaled
  tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

  // Export
  const link = document.createElement("a");
  link.download = `knowledge-graph-${Date.now()}.png`;
  link.href = tempCanvas.toDataURL("image/png");
  link.click();
}

/**
 * Export graph to SVG
 */
export function exportGraphToSVG(
  data: GraphData,
  options: GraphExportOptions = { format: GraphExportFormat.SVG }
): string {
  const { backgroundColor = "#ffffff" } = options;

  // Calculate bounds
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  data.nodes.forEach((node) => {
    minX = Math.min(minX, node.x - (node.radius || 20));
    minY = Math.min(minY, node.y - (node.radius || 20));
    maxX = Math.max(maxX, node.x + (node.radius || 20));
    maxY = Math.max(maxY, node.y + (node.radius || 20));
  });

  const width = maxX - minX + 40;
  const height = maxY - minY + 40;

  // Build SVG
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - 20} ${minY - 20} ${width} ${height}">
  <style>
    .node { cursor: pointer; }
    .node:hover { opacity: 0.8; }
    .edge { stroke-linecap: round; }
    text { font-family: Arial, sans-serif; font-size: 12px; }
  </style>
  <rect width="100%" height="100%" fill="${backgroundColor}"/>
`;

  // Draw edges
  data.edges.forEach((edge) => {
    const source = data.nodes.find((n) => n.id === edge.source);
    const target = data.nodes.find((n) => n.id === edge.target);

    if (!source || !target) return;

    let stroke = "#999";
    let strokeWidth = "1";

    switch (edge.type) {
      case "reference":
        stroke = "#3b82f6";
        strokeWidth = "2";
        break;
      case "derived":
        stroke = "#22c55e";
        strokeWidth = "2";
        break;
      case "contains":
        stroke = "#64748b";
        break;
    }

    svg += `  <line class="edge" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="0.5"/>
`;
  });

  // Draw nodes
  data.nodes.forEach((node) => {
    const color = node.color || "#3b82f6";
    const radius = node.radius || 20;

    svg += `  <g class="node">
    <circle cx="${node.x}" cy="${node.y}" r="${radius}" fill="${color}"/>
    <text x="${node.x}" y="${node.y + radius + 14}" text-anchor="middle" fill="#333">${node.label}</text>
  </g>
`;
  });

  svg += "</svg>";

  // Download
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const link = document.createElement("a");
  link.download = `knowledge-graph-${Date.now()}.svg`;
  link.href = URL.createObjectURL(blob);
  link.click();

  return svg;
}

/**
 * Export graph to JSON
 */
export function exportGraphToJSON(
  data: GraphData,
  options: GraphExportOptions = { format: GraphExportFormat.JSON }
): void {
  const exportData = {
    version: "1.0",
    exported: new Date().toISOString(),
    ...data,
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const link = document.createElement("a");
  link.download = `knowledge-graph-${Date.now()}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
}

/**
 * Export graph to GEXF (Gephi format)
 */
export function exportGraphToGEXF(
  data: GraphData,
  options: GraphExportOptions = { format: GraphExportFormat.GEXF }
): void {
  let gexf = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <graph mode="static" defaultedgetype="directed">
    <attributes class="node">
      <attribute id="0" title="type" type="string"/>
      <attribute id="1" title="category" type="string"/>
    </attributes>
    <nodes>
`;

  data.nodes.forEach((node, index) => {
    gexf += `      <node id="${node.id}" label="${node.label}">
        <attvalues>
          <attvalue for="0" value="${node.type}"/>
          ${node.category ? `<attvalue for="1" value="${node.category}"/>` : ""}
        </attvalues>
        <viz:position x="${node.x}" y="${node.y}" z="0"/>
        <viz:size value="${node.radius || 20}"/>
        <viz:color r="${parseInt(node.color?.slice(1, 3) || "3b", 16)}" g="${parseInt(node.color?.slice(3, 5) || "82", 16)}" b="${parseInt(node.color?.slice(5, 7) || "f6", 16)}"/>
      </node>
`;
  });

  gexf += "    </nodes>\n    <edges>\n";

  data.edges.forEach((edge, index) => {
    gexf += `      <edge id="${index}" source="${edge.source}" target="${edge.target}" ${edge.weight ? `weight="${edge.weight}"` : ""}/>\n`;
  });

  gexf += `    </edges>
  </graph>
</gexf>`;

  const blob = new Blob([gexf], { type: "application/xml" });
  const link = document.createElement("a");
  link.download = `knowledge-graph-${Date.now()}.gexf`;
  link.href = URL.createObjectURL(blob);
  link.click();
}

/**
 * Export graph to GraphML
 */
export function exportGraphToGraphML(
  data: GraphData,
  options: GraphExportOptions = { format: GraphExportFormat.GraphML }
): void {
  let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <key id="d0" for="node" attr.name="type" attr.type="string"/>
  <key id="d1" for="node" attr.name="label" attr.type="string"/>
  <key id="d2" for="edge" attr.name="type" attr.type="string"/>
  <graph id="G" edgedefault="directed">
`;

  data.nodes.forEach((node) => {
    graphml += `    <node id="${node.id}">
      <data key="d0">${node.type}</data>
      <data key="d1">${node.label}</data>
    </node>
`;
  });

  data.edges.forEach((edge) => {
    graphml += `    <edge source="${edge.source}" target="${edge.target}">
      ${edge.type ? `<data key="d2">${edge.type}</data>` : ""}
    </edge>
`;
  });

  graphml += `  </graph>
</graphml>`;

  const blob = new Blob([graphml], { type: "application/xml" });
  const link = document.createElement("a");
  link.download = `knowledge-graph-${Date.now()}.graphml`;
  link.href = URL.createObjectURL(blob);
  link.click();
}

/**
 * Export graph to CSV
 */
export function exportGraphToCSV(
  data: GraphData,
  options: GraphExportOptions = { format: GraphExportFormat.CSV }
): void {
  // Nodes CSV
  let nodesCsv = "id,label,type,category,description,x,y\n";
  data.nodes.forEach((node) => {
    nodesCsv += `"${node.id}","${node.label}","${node.type}","${node.category || ""}","${node.description || ""}",${node.x},${node.y}\n`;
  });

  // Edges CSV
  let edgesCsv = "id,source,target,type,weight,label\n";
  data.edges.forEach((edge, index) => {
    edgesCsv += `${index},"${edge.source}","${edge.target}","${edge.type || ""}",${edge.weight || 1},"${edge.label || ""}"\n`;
  });

  // Combine both
  const combined = `# Nodes
${nodesCsv}

# Edges
${edgesCsv}`;

  const blob = new Blob([combined], { type: "text/csv" });
  const link = document.createElement("a");
  link.download = `knowledge-graph-${Date.now()}.csv`;
  link.href = URL.createObjectURL(blob);
  link.click();
}

/**
 * Export graph to DOT (Graphviz)
 */
export function exportGraphToDOT(
  data: GraphData,
  options: GraphExportOptions = { format: GraphExportFormat.DOT }
): void {
  let dot = "digraph KnowledgeGraph {\n";
  dot += "  node [shape=circle];\n";
  dot += "  edge [dir=none];\n\n";

  // Nodes
  data.nodes.forEach((node) => {
    const color = node.color || "#3b82f6";
    dot += `  "${node.id}" [label="${node.label}", fillcolor="${color}", style=filled];\n`;
  });

  // Edges
  data.edges.forEach((edge) => {
    let style = "";
    if (edge.type === "reference") style = " [color=blue, penwidth=2]";
    if (edge.type === "derived") style = " [color=green, penwidth=2]";

    dot += `  "${edge.source}" -> "${edge.target}"${style};\n`;
  });

  dot += "}";

  const blob = new Blob([dot], { type: "text/plain" });
  const link = document.createElement("a");
  link.download = `knowledge-graph-${Date.now()}.dot`;
  link.href = URL.createObjectURL(blob);
  link.click();
}

/**
 * Main export function
 */
export function exportGraph(
  data: GraphData,
  canvas: HTMLCanvasElement | null,
  options: GraphExportOptions
): void {
  switch (options.format) {
    case GraphExportFormat.PNG:
      if (canvas) {
        exportGraphToPNG(canvas, options);
      }
      break;
    case GraphExportFormat.SVG:
      exportGraphToSVG(data, options);
      break;
    case GraphExportFormat.JSON:
      exportGraphToJSON(data, options);
      break;
    case GraphExportFormat.GEXF:
      exportGraphToGEXF(data, options);
      break;
    case GraphExportFormat.GraphML:
      exportGraphToGraphML(data, options);
      break;
    case GraphExportFormat.CSV:
      exportGraphToCSV(data, options);
      break;
    case GraphExportFormat.DOT:
      exportGraphToDOT(data, options);
      break;
  }
}

/**
 * Export button component
 */
export function GraphExportButton({
  data,
  canvas,
}: {
  data: GraphData;
  canvas: HTMLCanvasElement | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = useCallback((format: GraphExportFormat) => {
    exportGraph(data, canvas, { format });
    setIsOpen(false);
  }, [data, canvas]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-md hover:bg-muted transition-colors"
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-20 bg-card border border-border rounded-lg shadow-lg min-w-48">
            <div className="p-1">
              <button
                onClick={() => handleExport(GraphExportFormat.PNG)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
                disabled={!canvas}
              >
                <Image className="w-4 h-4" />
                PNG Image
              </button>
              <button
                onClick={() => handleExport(GraphExportFormat.SVG)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
              >
                <Image className="w-4 h-4" />
                SVG Vector
              </button>
              <button
                onClick={() => handleExport(GraphExportFormat.JSON)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
              >
                <FileText className="w-4 h-4" />
                JSON Data
              </button>
              <button
                onClick={() => handleExport(GraphExportFormat.GEXF)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
              >
                <Network className="w-4 h-4" />
                GEXF (Gephi)
              </button>
              <button
                onClick={() => handleExport(GraphExportFormat.GraphML)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
              >
                <Network className="w-4 h-4" />
                GraphML
              </button>
              <button
                onClick={() => handleExport(GraphExportFormat.DOT)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
              >
                <Network className="w-4 h-4" />
                Graphviz DOT
              </button>
              <button
                onClick={() => handleExport(GraphExportFormat.CSV)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
              >
                <FileText className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
