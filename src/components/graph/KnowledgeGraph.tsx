/**
 * Knowledge Graph component
 * Visualizes relationships between documents, extracts, and flashcards
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTheme } from "../common/ThemeSystem";

/**
 * Graph node types
 */
export enum GraphNodeType {
  Document = "document",
  Extract = "extract",
  Flashcard = "flashcard",
  Category = "category",
  Tag = "tag",
}

/**
 * Graph node
 */
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  description?: string;
  x: number;
  y: number;
  radius?: number;
  color?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Graph edge
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: "reference" | "contains" | "related" | "derived" | "tagged";
  weight?: number;
  label?: string;
}

/**
 * Graph data
 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Layout algorithm type
 */
export enum LayoutAlgorithm {
  Force = "force",
  Circular = "circular",
  Hierarchical = "hierarchical",
  Grid = "grid",
  Random = "random",
}

/**
 * Knowledge graph props
 */
export interface KnowledgeGraphProps {
  data: GraphData;
  layout?: LayoutAlgorithm;
  onNodeClick?: (node: GraphNode) => void;
  onNodeDoubleClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  selectedNode?: string;
  highlightedNodes?: string[];
  minZoom?: number;
  maxZoom?: number;
  enablePhysics?: boolean;
  showLabels?: boolean;
  edgeThreshold?: number;
}

/**
 * Knowledge Graph Component
 */
export function KnowledgeGraph({
  data,
  layout = LayoutAlgorithm.Force,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  selectedNode,
  highlightedNodes = [],
  minZoom = 0.1,
  maxZoom = 5,
  enablePhysics = true,
  showLabels = true,
  edgeThreshold = 0,
}: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const theme = useTheme();

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(enablePhysics);

  // Apply layout
  const laidOutNodes = useMemo(() => {
    return applyLayout(data.nodes, layout);
  }, [data.nodes, layout]);

  // Physics simulation
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(
    () =>
      laidOutNodes.reduce((acc, node) => {
        acc[node.id] = { x: node.x, y: node.y };
        return acc;
      }, {} as Record<string, { x: number; y: number }>)
  );

  // Force simulation
  const runForceSimulation = useCallback(() => {
    if (!physicsEnabled) return;

    const nodes = laidOutNodes;
    const edges = data.edges;
    const width = canvasRef.current?.width || 800;
    const height = canvasRef.current?.height || 600;

    let iteration = 0;
    const maxIterations = 300;
    const coolingRate = 0.95;
    let temperature = 100;

    const simulate = () => {
      if (iteration >= maxIterations || temperature < 0.1) {
        setPhysicsEnabled(false);
        return;
      }

      // Initialize velocities if not exist
      const velocities: Record<string, { vx: number; vy: number }> = {};

      // Apply forces
      nodes.forEach((node) => {
        let fx = 0;
        let fy = 0;

        // Repulsion between all nodes
        nodes.forEach((other) => {
          if (node.id === other.id) return;

          const dx = positions[node.id].x - positions[other.id].x;
          const dy = positions[node.id].y - positions[other.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 500 / (dist * dist);

          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        });

        // Attraction along edges
        edges.forEach((edge) => {
          if (edge.source === node.id) {
            const target = positions[edge.target];
            const dx = target.x - positions[node.id].x;
            const dy = target.y - positions[node.id].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 150) * 0.01;

            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          } else if (edge.target === node.id) {
            const source = positions[edge.source];
            const dx = source.x - positions[node.id].x;
            const dy = source.y - positions[node.id].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 150) * 0.01;

            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });

        // Center gravity
        fx += (width / 2 - positions[node.id].x) * 0.01;
        fy += (height / 2 - positions[node.id].y) * 0.01;

        // Update position with temperature
        positions[node.id].x += fx * temperature * 0.1;
        positions[node.id].y += fy * temperature * 0.1;
      });

      temperature *= coolingRate;
      iteration++;

      setPositions({ ...positions });
      animationRef.current = requestAnimationFrame(simulate);
    };

    simulate();
  }, [laidOutNodes, data.edges, physicsEnabled]);

  // Start simulation when data or layout changes
  useEffect(() => {
    if (physicsEnabled && layout === LayoutAlgorithm.Force) {
      runForceSimulation();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data, layout, physicsEnabled]);

  // Draw graph
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Draw edges
    data.edges.forEach((edge) => {
      const source = positions[edge.source];
      const target = positions[edge.target];

      if (!source || !target) return;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      // Edge style based on type
      const colors = theme.theme.colors;
      let strokeColor = colors.border;
      let strokeWidth = 1;

      switch (edge.type) {
        case "reference":
          strokeColor = colors.primary;
          strokeWidth = 2;
          break;
        case "contains":
          strokeColor = colors.secondary;
          strokeWidth = 1;
          break;
        case "related":
          strokeColor = colors.accent;
          strokeWidth = 1;
          break;
        case "derived":
          strokeColor = colors.success;
          strokeWidth = 2;
          break;
        case "tagged":
          strokeColor = colors.muted;
          strokeWidth = 1;
          break;
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth / transform.k;
      ctx.globalAlpha = edge.weight ? edge.weight * 0.5 + 0.3 : 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Draw edge label
      if (edge.label && showLabels && transform.k > 0.5) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;

        ctx.font = `${10 / transform.k}px sans-serif`;
        ctx.fillStyle = colors.mutedForeground;
        ctx.textAlign = "center";
        ctx.fillText(edge.label, midX, midY);
      }
    });

    // Draw nodes
    laidOutNodes.forEach((node) => {
      const pos = positions[node.id];
      if (!pos) return;

      const isHighlighted = highlightedNodes.includes(node.id);
      const isSelected = selectedNode === node.id;
      const isHovered = hoveredNode === node.id;

      // Node color based on type
      let nodeColor = node.color;
      if (!nodeColor) {
        const colors = theme.theme.colors;
        switch (node.type) {
          case GraphNodeType.Document:
            nodeColor = colors.primary;
            break;
          case GraphNodeType.Extract:
            nodeColor = colors.accent;
            break;
          case GraphNodeType.Flashcard:
            nodeColor = colors.success;
            break;
          case GraphNodeType.Category:
            nodeColor = colors.warning;
            break;
          case GraphNodeType.Tag:
            nodeColor = colors.info;
            break;
        }
      }

      // Draw node shadow
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (node.radius || 20) + 5, 0, Math.PI * 2);
        ctx.fillStyle = `${nodeColor}40`;
        ctx.fill();
      }

      // Draw node
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, node.radius || 20, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      // Draw border
      if (isSelected || isHighlighted) {
        ctx.strokeStyle = theme.theme.colors.foreground;
        ctx.lineWidth = 2 / transform.k;
        ctx.stroke();
      }

      // Draw label
      if (showLabels || isHovered || isSelected) {
        ctx.font = `${isHovered || isSelected ? 14 : 12 / transform.k}px sans-serif`;
        ctx.fillStyle = theme.theme.colors.foreground;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.label, pos.x, pos.y + (node.radius || 20) + 5);
      }
    });

    ctx.restore();
  }, [
    data,
    positions,
    laidOutNodes,
    transform,
    theme,
    selectedNode,
    highlightedNodes,
    hoveredNode,
    showLabels,
  ]);

  // Animation loop
  useEffect(() => {
    if (!physicsEnabled) return;

    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw, physicsEnabled]);

  // Handle canvas resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform({
        ...transform,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else {
      // Check for node hover
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - transform.x) / transform.k;
      const y = (e.clientY - rect.top - transform.y) / transform.k;

      let hovered: string | null = null;
      for (const node of laidOutNodes) {
        const pos = positions[node.id];
        if (!pos) continue;

        const dx = x - pos.x;
        const dy = y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= (node.radius || 20)) {
          hovered = node.id;
          break;
        }
      }

      setHoveredNode(hovered);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newK = Math.max(minZoom, Math.min(maxZoom, transform.k * zoomFactor));

    // Zoom towards mouse position
    const newX = mouseX - (mouseX - transform.x) * (newK / transform.k);
    const newY = mouseY - (mouseY - transform.y) * (newK / transform.k);

    setTransform({ x: newX, y: newY, k: newK });
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hoveredNode && onNodeClick) {
      const node = laidOutNodes.find((n) => n.id === hoveredNode);
      if (node) {
        onNodeClick(node);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (hoveredNode && onNodeDoubleClick) {
      const node = laidOutNodes.find((n) => n.id === hoveredNode);
      if (node) {
        onNodeDoubleClick(node);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-background">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setTransform({ x: 0, y: 0, k: 1 })}
          className="p-2 bg-card border border-border rounded-lg shadow hover:bg-muted"
          title="Reset view"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          onClick={() => setTransform((t) => ({ ...t, k: Math.min(maxZoom, t.k * 1.2) }))}
          className="p-2 bg-card border border-border rounded-lg shadow hover:bg-muted"
          title="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
        <button
          onClick={() => setTransform((t) => ({ ...t, k: Math.max(minZoom, t.k * 0.8) }))}
          className="p-2 bg-card border border-border rounded-lg shadow hover:bg-muted"
          title="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-card border border-border rounded-lg shadow p-3">
        <h3 className="text-sm font-semibold mb-2">Legend</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ background: theme.theme.colors.primary }} />
            <span>Documents</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ background: theme.theme.colors.accent }} />
            <span>Extracts</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ background: theme.theme.colors.success }} />
            <span>Flashcards</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ background: theme.theme.colors.warning }} />
            <span>Categories</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ background: theme.theme.colors.info }} />
            <span>Tags</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Apply layout algorithm to nodes
 */
function applyLayout(nodes: GraphNode[], algorithm: LayoutAlgorithm): GraphNode[] {
  const result = [...nodes];

  switch (algorithm) {
    case LayoutAlgorithm.Circular:
      const centerX = 400;
      const centerY = 300;
      const radius = Math.min(centerX, centerY) * 0.8;
      const angleStep = (Math.PI * 2) / result.length;

      result.forEach((node, i) => {
        node.x = centerX + Math.cos(i * angleStep) * radius;
        node.y = centerY + Math.sin(i * angleStep) * radius;
      });
      break;

    case LayoutAlgorithm.Hierarchical:
      const levels: Record<string, GraphNode[]> = {};
      result.forEach((node) => {
        const level = node.metadata?.level as number || 0;
        if (!levels[level]) levels[level] = [];
        levels[level].push(node);
      });

      let y = 50;
      Object.values(levels).forEach((levelNodes) => {
        const xStep = 800 / (levelNodes.length + 1);
        levelNodes.forEach((node, i) => {
          node.x = xStep * (i + 1);
          node.y = y;
        });
        y += 100;
      });
      break;

    case LayoutAlgorithm.Grid:
      const gridSize = Math.ceil(Math.sqrt(result.length));
      const cellWidth = 800 / gridSize;
      const cellHeight = 600 / gridSize;

      result.forEach((node, i) => {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        node.x = col * cellWidth + cellWidth / 2;
        node.y = row * cellHeight + cellHeight / 2;
      });
      break;

    case LayoutAlgorithm.Random:
      result.forEach((node) => {
        node.x = Math.random() * 700 + 50;
        node.y = Math.random() * 500 + 50;
      });
      break;

    case LayoutAlgorithm.Force:
    default:
      // Initial positions in center with small random offset
      result.forEach((node) => {
        node.x = 400 + (Math.random() - 0.5) * 100;
        node.y = 300 + (Math.random() - 0.5) * 100;
      });
      break;
  }

  return result;
}
