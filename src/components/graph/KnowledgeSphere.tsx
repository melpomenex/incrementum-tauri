/**
 * Knowledge Sphere 3D visualization
 * Interactive 3D sphere displaying knowledge as connected nodes
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { GraphNode, GraphEdge, GraphNodeType } from "./KnowledgeGraph";
import { useTheme } from "../common/ThemeSystem";

/**
 * 3D point
 */
interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 3D node with position
 */
interface SphereNode extends GraphNode {
  position: Point3D;
  velocity: Point3D;
}

/**
 * Knowledge sphere props
 */
export interface KnowledgeSphereProps {
  nodes: GraphNode[];
  edges?: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  autoRotate?: boolean;
  rotationSpeed?: number;
  nodeSize?: number;
  edgeOpacity?: number;
  showLabels?: boolean;
  connectionDistance?: number;
}

/**
 * Knowledge Sphere Component
 */
export function KnowledgeSphere({
  nodes,
  edges = [],
  onNodeClick,
  onNodeHover,
  autoRotate = true,
  rotationSpeed = 0.001,
  nodeSize = 8,
  edgeOpacity = 0.3,
  showLabels = true,
  connectionDistance = 150,
}: KnowledgeSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const theme = useTheme();

  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Convert nodes to 3D positions on sphere
  const sphereNodes = useRef<SphereNode[]>([]);

  useEffect(() => {
    // Distribute nodes on sphere surface using Fibonacci sphere algorithm
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    sphereNodes.current = nodes.map((node, i) => {
      const y = 1 - (i / (nodes.length - 1 || 1)) * 2; // y from 1 to -1
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      return {
        ...node,
        position: { x: x * 200, y: y * 200, z: z * 200 },
        velocity: { x: 0, y: 0, z: 0 },
      };
    });
  }, [nodes]);

  // 3D to 2D projection
  const project = useCallback(
    (point: Point3D): { x: number; y: number; scale: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, scale: 1 };

      const { width, height } = canvas;
      const centerX = width / 2;
      const centerY = height / 2;

      // Apply rotation
      const cosX = Math.cos(rotation.x);
      const sinX = Math.sin(rotation.x);
      const cosY = Math.cos(rotation.y);
      const sinY = Math.sin(rotation.y);

      let x = point.x;
      let y = point.y;
      let z = point.z;

      // Rotate around Y axis
      let tempX = x * cosY - z * sinY;
      let tempZ = x * sinY + z * cosY;
      x = tempX;
      z = tempZ;

      // Rotate around X axis
      let tempY = y * cosX - z * sinX;
      tempZ = y * sinX + z * cosX;
      y = tempY;
      z = tempZ;

      // Perspective projection
      const fov = 500;
      const scale = fov / (fov + z) * zoom;
      const projectedX = centerX + x * scale;
      const projectedY = centerY + y * scale;

      return { x: projectedX, y: projectedY, scale };
    },
    [rotation, zoom]
  );

  // Draw sphere
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Get colors from theme
    const colors = theme.theme.colors;

    // Sort nodes by z-depth (painter's algorithm)
    const projectedNodes = sphereNodes.current.map((node) => {
      const projected = project(node.position);
      return { node, projected };
    });

    projectedNodes.sort((a, b) => {
      const aZ = a.node.position.z;
      const bZ = b.node.position.z;
      return aZ - bZ;
    });

    // Draw edges
    edges.forEach((edge) => {
      const sourceNode = sphereNodes.current.find((n) => n.id === edge.source);
      const targetNode = sphereNodes.current.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) return;

      const source = project(sourceNode.position);
      const target = project(targetNode.position);

      // Calculate depth for opacity
      const avgZ = (sourceNode.position.z + targetNode.position.z) / 2;
      const depth = (avgZ + 200) / 400; // Normalize to 0-1
      const opacity = depth * edgeOpacity;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      let strokeColor = colors.border;
      switch (edge.type) {
        case "reference":
          strokeColor = colors.primary;
          break;
        case "derived":
          strokeColor = colors.success;
          break;
        case "related":
          strokeColor = colors.accent;
          break;
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = opacity;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Draw nodes
    projectedNodes.forEach(({ node, projected }) => {
      const depth = (node.position.z + 200) / 400; // Normalize to 0-1
      const opacity = 0.3 + depth * 0.7;

      // Node color
      let nodeColor = node.color;
      if (!nodeColor) {
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

      // Draw node glow
      if (hoveredNode === node.id) {
        const gradient = ctx.createRadialGradient(
          projected.x,
          projected.y,
          0,
          projected.x,
          projected.y,
          nodeSize * 2 * projected.scale
        );
        gradient.addColorStop(0, `${nodeColor}80`);
        gradient.addColorStop(1, `${nodeColor}00`);

        ctx.beginPath();
        ctx.arc(projected.x, projected.y, nodeSize * 2 * projected.scale, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw node
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, nodeSize * projected.scale, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.globalAlpha = opacity;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Draw border for selected/hovered
      if (hoveredNode === node.id) {
        ctx.strokeStyle = colors.foreground;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw label
      if (showLabels && projected.scale > 0.5) {
        ctx.font = `${10 * projected.scale}px sans-serif`;
        ctx.fillStyle = colors.foreground;
        ctx.globalAlpha = opacity;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.label, projected.x, projected.y + nodeSize * projected.scale + 4);
        ctx.globalAlpha = 1;
      }
    });
  }, [edges, project, theme, hoveredNode, showLabels, nodeSize, edgeOpacity]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (autoRotate && !isDragging) {
        setRotation((prev) => ({
          x: prev.x,
          y: prev.y + rotationSpeed,
        }));
      }

      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw, autoRotate, rotationSpeed, isDragging]);

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
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setRotation((prev) => ({
        x: prev.x + deltaY * 0.005,
        y: prev.y + deltaX * 0.005,
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      // Check for node hover
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let hovered: string | null = null;
      for (const node of sphereNodes.current) {
        const projected = project(node.position);
        const dx = mouseX - projected.x;
        const dy = mouseY - projected.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= nodeSize * projected.scale + 5) {
          hovered = node.id;
          break;
        }
      }

      if (hovered !== hoveredNode) {
        setHoveredNode(hovered);
        const node = nodes.find((n) => n.id === hovered);
        onNodeHover?.(node || null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.1, Math.min(5, prev * zoomFactor)));
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hoveredNode && onNodeClick) {
      const node = nodes.find((n) => n.id === hoveredNode);
      if (node) {
        onNodeClick(node);
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
      />

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setRotation({ x: 0, y: 0 })}
          className="p-2 bg-card border border-border rounded-lg shadow hover:bg-muted"
          title="Reset rotation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(5, z * 1.2))}
          className="p-2 bg-card border border-border rounded-lg shadow hover:bg-muted"
          title="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))}
          className="p-2 bg-card border border-border rounded-lg shadow hover:bg-muted"
          title="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <button
          onClick={() => setRotation((r) => ({ ...r, x: r.x + 0.1 }))}
          className="p-2 bg-card border border-border rounded-lg shadow hover:bg-muted"
          title="Tilt up"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={() => setRotation((r) => ({ ...r, x: r.x - 0.1 }))}
          className="p-2 bg-card border border-border rounded-lg shadow hover:bg-muted"
          title="Tilt down"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="absolute top-4 left-4 bg-card/80 backdrop-blur border border-border rounded-lg shadow p-3">
        <h3 className="text-sm font-semibold mb-1">Knowledge Sphere</h3>
        <p className="text-xs text-muted-foreground">
          {nodes.length} nodes • {edges.length} connections
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Drag to rotate • Scroll to zoom
        </p>
      </div>
    </div>
  );
}

/**
 * Hook to manage sphere theming
 */
export function useSphereThemess() {
  const theme = useTheme();

  const getNodeTypeColor = useCallback(
    (type: GraphNodeType): string => {
      const colors = theme.theme.colors;
      switch (type) {
        case GraphNodeType.Document:
          return colors.primary;
        case GraphNodeType.Extract:
          return colors.accent;
        case GraphNodeType.Flashcard:
          return colors.success;
        case GraphNodeType.Category:
          return colors.warning;
        case GraphNodeType.Tag:
          return colors.info;
      }
    },
    [theme]
  );

  const getEdgeTypeColor = useCallback(
    (type?: string): string => {
      const colors = theme.theme.colors;
      switch (type) {
        case "reference":
          return colors.primary;
        case "derived":
          return colors.success;
        case "related":
          return colors.accent;
        default:
          return colors.border;
      }
    },
    [theme]
  );

  return {
    getNodeTypeColor,
    getEdgeTypeColor,
    theme: theme.theme,
  };
}
