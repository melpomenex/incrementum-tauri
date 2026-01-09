import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { KnowledgeGraph, GraphNodeType, type GraphNode, type GraphEdge, type GraphData } from "../components/graph/KnowledgeGraph";
import {
  Network,
  Filter,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings2,
} from "lucide-react";

export function KnowledgeGraphPage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | undefined>();
  const [filters, setFilters] = useState({
    documents: true,
    extracts: true,
    flashcards: true,
    categories: true,
  });

  useEffect(() => {
    loadGraphData();
  }, [filters]);

  const loadGraphData = async () => {
    setIsLoading(true);

    try {
      // Fetch data from backend
      const documents = await invoke<any[]>("get_documents");
      const extracts = await invoke<any[]>("get_extracts", { documentId: null });
      const learningItems = await invoke<any[]>("get_learning_items");

      // Build graph nodes
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      let nodeId = 0;

      // Add document nodes
      if (filters.documents) {
        documents.forEach((doc: any) => {
          nodes.push({
            id: `doc-${doc.id}`,
            type: GraphNodeType.Document,
            label: doc.title || "Untitled",
            x: Math.random() * 800 + 100,
            y: Math.random() * 600 + 100,
            radius: 25,
            category: doc.category,
            metadata: { fileType: doc.fileType },
          });
        });
      }

      // Add extract nodes
      if (filters.extracts) {
        extracts.forEach((extract: any) => {
          nodes.push({
            id: `extract-${extract.id}`,
            type: GraphNodeType.Extract,
            label: extract.content?.substring(0, 30) + "..." || "Untitled",
            description: extract.content,
            x: Math.random() * 800 + 100,
            y: Math.random() * 600 + 100,
            radius: 15,
            metadata: { documentId: extract.documentId },
          });

          // Create edge from document to extract
          edges.push({
            id: `edge-${extract.id}`,
            source: `doc-${extract.documentId}`,
            target: `extract-${extract.id}`,
            type: "contains",
          });
        });
      }

      // Add flashcard nodes
      if (filters.flashcards) {
        learningItems.forEach((item: any) => {
          nodes.push({
            id: `card-${item.id}`,
            type: GraphNodeType.Flashcard,
            label: item.question?.substring(0, 20) + "..." || "Untitled",
            description: item.question,
            x: Math.random() * 800 + 100,
            y: Math.random() * 600 + 100,
            radius: 12,
            metadata: {
              documentId: item.documentId,
              extractId: item.extractId,
            },
          });

          // Create edge from extract to flashcard
          if (item.extractId) {
            edges.push({
              id: `edge-card-${item.id}`,
              source: `extract-${item.extractId}`,
              target: `card-${item.id}`,
              type: "derived",
            });
          }
        });
      }

      setGraphData({ nodes, edges });
    } catch (error) {
      console.error("Failed to load graph data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node.id);
    console.log("Clicked node:", node);
  }, []);

  const handleNodeDoubleClick = useCallback((node: GraphNode) => {
    // Open the item in the relevant view
    switch (node.type) {
      case GraphNodeType.Document:
        // Navigate to document
        break;
      case GraphNodeType.Extract:
        // Navigate to extract
        break;
      case GraphNodeType.Flashcard:
        // Navigate to flashcard
        break;
    }
  }, []);

  const exportGraph = async () => {
    try {
      const dataStr = JSON.stringify(graphData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "knowledge-graph.json";
      a.click();
    } catch (error) {
      console.error("Failed to export graph:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-secondary">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-cream">
      {/* Header */}
      <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-primary-600" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Knowledge Graph
            </h1>
            <p className="text-xs text-foreground-secondary">
              {graphData.nodes.length} nodes • {graphData.edges.length} connections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportGraph}
            className="p-2 hover:bg-muted rounded transition-colors"
            title="Export graph"
          >
            <Download className="w-4 h-4 text-foreground-secondary" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Filters Sidebar */}
        <div className="w-56 border-r border-border bg-card p-4 overflow-y-auto flex-shrink-0">
          <h3 className="text-sm font-medium text-foreground mb-4">Filters</h3>

          <div className="space-y-3">
            <FilterSection
              label="Documents"
              checked={filters.documents}
              onChange={(checked) => setFilters({ ...filters, documents: checked })}
              count={graphData.nodes.filter(n => n.type === GraphNodeType.Document).length}
              color="bg-primary-500"
            />
            <FilterSection
              label="Extracts"
              checked={filters.extracts}
              onChange={(checked) => setFilters({ ...filters, extracts: checked })}
              count={graphData.nodes.filter(n => n.type === GraphNodeType.Extract).length}
              color="bg-accent"
            />
            <FilterSection
              label="Flashcards"
              checked={filters.flashcards}
              onChange={(checked) => setFilters({ ...filters, flashcards: checked })}
              count={graphData.nodes.filter(n => n.type === GraphNodeType.Flashcard).length}
              color="bg-success"
            />
            <FilterSection
              label="Categories"
              checked={filters.categories}
              onChange={(checked) => setFilters({ ...filters, categories: checked })}
              count={graphData.nodes.filter(n => n.type === GraphNodeType.Category).length}
              color="bg-warning"
            />
          </div>

          {selectedNode && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-3">
                Selected Node
              </h3>
              <div className="p-3 bg-muted rounded">
                <div className="text-sm text-foreground">
                  {graphData.nodes.find(n => n.id === selectedNode)?.label}
                </div>
                <div className="text-xs text-foreground-secondary mt-1">
                  {graphData.nodes.find(n => n.id === selectedNode)?.type}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Graph */}
        <div className="flex-1">
          <KnowledgeGraph
            data={graphData}
            layout="force"
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            selectedNode={selectedNode}
            enablePhysics={true}
            showLabels={true}
          />
        </div>
      </div>
    </div>
  );
}

function FilterSection({
  label,
  checked,
  onChange,
  count,
  color,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  count: number;
  color: string;
}) {
  return (
    <label className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded ${color}`} />
        <span className="text-xs text-foreground-secondary">{count}</span>
      </div>
    </label>
  );
}
