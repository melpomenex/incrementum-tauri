import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

interface Node {
  id: string;
  type: "document" | "extract" | "card";
  label: string;
  connections: string[];
}

interface KnowledgeSphereTabProps {
  nodes?: Node[];
}

const MOCK_NODES: Node[] = [
  // Central documents
  { id: "d1", type: "document", label: "Machine Learning Basics", connections: ["e1", "e2", "e3", "c1", "c2"] },
  { id: "d2", type: "document", label: "Neural Networks", connections: ["e4", "e5", "c3", "c4"] },
  { id: "d3", type: "document", label: "Deep Learning", connections: ["e2", "e6", "c5"] },
  { id: "d4", type: "document", label: "Computer Vision", connections: ["e7", "e8", "c6"] },

  // Extracts
  { id: "e1", type: "extract", label: "Supervised Learning", connections: ["c1"] },
  { id: "e2", type: "extract", label: "Backpropagation", connections: ["c2", "c5"] },
  { id: "e3", type: "extract", label: "Gradient Descent", connections: ["c3"] },
  { id: "e4", type: "extract", label: "CNN Architecture", connections: ["c6"] },
  { id: "e5", type: "extract", label: "RNN and LSTM", connections: [] },
  { id: "e6", type: "extract", label: "Attention Mechanism", connections: [] },
  { id: "e7", type: "extract", label: "Object Detection", connections: [] },
  { id: "e8", type: "extract", label: "Image Segmentation", connections: [] },

  // Cards
  { id: "c1", type: "card", label: "What is overfitting?", connections: [] },
  { id: "c2", type: "card", label: "Explain backpropagation", connections: [] },
  { id: "c3", type: "card", label: "Learning rate importance", connections: [] },
  { id: "c4", type: "card", label: "Activation functions", connections: [] },
  { id: "c5", type: "card", label: "Vanishing gradient problem", connections: [] },
  { id: "c6", type: "card", label: "Pooling layers purpose", connections: [] },
];

// Color palette for different node types
const NODE_COLORS = {
  document: 0x3b82f6, // Blue
  extract: 0x22c55e,  // Green
  card: 0xa855f7,     // Purple
};

const NODE_SIZES = {
  document: 2.5,
  extract: 1.5,
  card: 1.0,
};

// Fibonacci sphere algorithm for even distribution
function fibonacciSphere(index: number, total: number, radius: number): THREE.Vector3 {
  const phi = Math.acos(1 - 2 * (index + 0.5) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5);

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
}

export function KnowledgeSphereTab({ nodes = MOCK_NODES }: KnowledgeSphereTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const nodesRef = useRef<THREE.Mesh[]>([]);
  const edgesRef = useRef<THREE.Line[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let animationId: number;

    const initSphere = async () => {
      if (!containerRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        if (!mounted) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0a);
        sceneRef.current = scene;

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
          75,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000
        );
        camera.position.z = 25;
        cameraRef.current = camera;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.5;
        controls.zoomSpeed = 0.8;
        controls.minDistance = 10;
        controls.maxDistance = 50;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
        controlsRef.current = controls;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        pointLight.position.set(10, 10, 10);
        scene.add(pointLight);

        // Create nodes
        const nodeMeshes: THREE.Mesh[] = [];
        const nodeMap = new Map<string, THREE.Mesh>();

        nodes.forEach((node, index) => {
          const position = fibonacciSphere(index, nodes.length, 12);

          // Node geometry
          const geometry = new THREE.SphereGeometry(NODE_SIZES[node.type], 32, 32);
          const material = new THREE.MeshPhongMaterial({
            color: NODE_COLORS[node.type],
            emissive: NODE_COLORS[node.type],
            emissiveIntensity: 0.3,
            shininess: 100,
            transparent: true,
            opacity: 0.9,
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.copy(position);
          mesh.userData = { node };
          scene.add(mesh);

          nodeMeshes.push(mesh);
          nodeMap.set(node.id, mesh);

          // Glow effect
          const glowGeometry = new THREE.SphereGeometry(NODE_SIZES[node.type] * 1.5, 32, 32);
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: NODE_COLORS[node.type],
            transparent: true,
            opacity: 0.15,
          });
          const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
          glowMesh.position.copy(position);
          scene.add(glowMesh);
        });

        nodesRef.current = nodeMeshes;

        // Create edges
        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.15,
        });

        const edges: THREE.Line[] = [];
        const edgePairs = new Set<string>();

        nodes.forEach((node) => {
          node.connections.forEach((targetId) => {
            const sourceMesh = nodeMap.get(node.id);
            const targetMesh = nodeMap.get(targetId);

            if (sourceMesh && targetMesh) {
              const pairKey = [node.id, targetId].sort().join("-");
              if (!edgePairs.has(pairKey)) {
                edgePairs.add(pairKey);

                const geometry = new THREE.BufferGeometry().setFromPoints([
                  sourceMesh.position,
                  targetMesh.position,
                ]);

                const line = new THREE.Line(geometry, edgeMaterial);
                scene.add(line);
                edges.push(line);
              }
            }
          });
        });

        edgesRef.current = edges;

        // Animation loop
        const animate = () => {
          animationId = requestAnimationFrame(animate);

          // Subtle node pulsing
          const time = Date.now() * 0.001;
          nodeMeshes.forEach((mesh, i) => {
            const scale = 1 + Math.sin(time * 2 + i * 0.5) * 0.05;
            mesh.scale.setScalar(scale);
          });

          controls.update();
          renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        const handleResize = () => {
          if (!containerRef.current || !camera || !renderer) return;

          camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };

        window.addEventListener("resize", handleResize);

        // Cleanup
        return () => {
          window.removeEventListener("resize", handleResize);
          cancelAnimationFrame(animationId);

          nodeMeshes.forEach((mesh) => {
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
          });

          edges.forEach((edge) => {
            edge.geometry.dispose();
          });

          edgeMaterial.dispose();
          renderer.dispose();
          controls.dispose();

          if (containerRef.current && renderer.domElement) {
            containerRef.current.removeChild(renderer.domElement);
          }
        };
      } catch (err) {
        console.error("Error initializing 3D sphere:", err);
        setError(err instanceof Error ? err.message : "Failed to load 3D visualization");
        setIsLoading(false);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initSphere();

    return () => {
      mounted = false;
    };
  }, [nodes]);

  // Handle mouse move for hover effects
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current!);
      const intersects = raycasterRef.current.intersectObjects(nodesRef.current);

      if (intersects.length > 0) {
        const intersectedNode = intersects[0].object.userData.node as Node;
        setHoveredNode(intersectedNode.id);
        container.style.cursor = "pointer";
      } else {
        setHoveredNode(null);
        container.style.cursor = "default";
      }
    };

    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Handle click for node selection
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    const handleClick = (event: MouseEvent) => {
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current!);
      const intersects = raycasterRef.current.intersectObjects(nodesRef.current);

      if (intersects.length > 0) {
        const node = intersects[0].object.userData.node as Node;
        setSelectedNode(node);

        // Pause auto-rotate when node is selected
        if (controlsRef.current) {
          controlsRef.current.autoRotate = false;
        }
      } else {
        setSelectedNode(null);

        // Resume auto-rotate
        if (controlsRef.current) {
          controlsRef.current.autoRotate = true;
        }
      }
    };

    container.addEventListener("click", handleClick);

    return () => {
      container.removeEventListener("click", handleClick);
    };
  }, []);

  // Update node colors on hover/select
  useEffect(() => {
    nodesRef.current.forEach((mesh) => {
      const node = mesh.userData.node as Node;
      const material = mesh.material as THREE.MeshPhongMaterial;

      if (selectedNode?.id === node.id) {
        material.emissiveIntensity = 0.8;
        material.opacity = 1;
      } else if (hoveredNode === node.id) {
        material.emissiveIntensity = 0.6;
        material.opacity = 0.95;
      } else if (selectedNode && node.connections.includes(selectedNode.id)) {
        // Highlight connected nodes
        material.emissiveIntensity = 0.5;
        material.opacity = 0.95;
      } else {
        material.emissiveIntensity = 0.3;
        material.opacity = 0.9;
      }
    });

    // Update edge opacity based on selection
    edgesRef.current.forEach((edge) => {
      const material = edge.material as THREE.LineBasicMaterial;
      if (selectedNode) {
        material.opacity = 0.05;
      } else {
        material.opacity = 0.15;
      }
    });
  }, [hoveredNode, selectedNode]);

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-card border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Knowledge Sphere (3D)</h2>
              <p className="text-sm text-muted-foreground">
                Interactive 3D visualization of your knowledge network
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Failed to Load 3D Visualization
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              Make sure Three.js is installed: npm install three @types/three
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-card border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Knowledge Sphere (3D)</h2>
            <p className="text-sm text-muted-foreground">
              Interactive 3D visualization of your knowledge network
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Documents</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Extracts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-muted-foreground">Cards</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative" ref={containerRef}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading 3D visualization...</p>
            </div>
          </div>
        )}

        {/* Controls hint */}
        <div className="absolute bottom-4 left-4 z-10 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg">
          <div className="space-y-1">
            <div>🖱️ Drag to rotate</div>
            <div>🔍 Scroll to zoom</div>
            <div>👆 Click node to select</div>
          </div>
        </div>

        {/* Node info panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-10 bg-card border border-border rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    selectedNode.type === "document"
                      ? "bg-blue-500"
                      : selectedNode.type === "extract"
                      ? "bg-green-500"
                      : "bg-purple-500"
                  }`}
                />
                <span className="text-sm font-medium capitalize text-foreground">
                  {selectedNode.type}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedNode(null);
                  if (controlsRef.current) {
                    controlsRef.current.autoRotate = true;
                  }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ×
              </button>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {selectedNode.label}
            </h3>
            {selectedNode.connections.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{selectedNode.connections.length}</span> connection
                {selectedNode.connections.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}

        {/* Node count */}
        <div className="absolute top-4 left-4 z-10 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg">
          <div className="font-medium text-foreground">
            {nodes.length} nodes
          </div>
          <div className="text-muted-foreground">
            {nodes.filter((n) => n.type === "document").length} documents •{" "}
            {nodes.filter((n) => n.type === "extract").length} extracts •{" "}
            {nodes.filter((n) => n.type === "card").length} cards
          </div>
        </div>
      </div>
    </div>
  );
}
