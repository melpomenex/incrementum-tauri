/**
 * Node detail view panel
 * Shows detailed information about selected graph nodes
 */

import { useState, useCallback, useMemo } from "react";
import { X, ExternalLink, Edit, Trash2, Link as LinkIcon } from "lucide-react";
import { GraphNode, GraphEdge, GraphNodeType } from "./KnowledgeGraph";

/**
 * Node detail view props
 */
export interface NodeDetailViewProps {
  node: GraphNode;
  relatedNodes: GraphNode[];
  connectedEdges: GraphEdge[];
  onClose: () => void;
  onNavigate?: (nodeId: string) => void;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

/**
 * Node detail view component
 */
export function NodeDetailView({
  node,
  relatedNodes,
  connectedEdges,
  onClose,
  onNavigate,
  onEdit,
  onDelete,
}: NodeDetailViewProps) {
  const [showConnections, setShowConnections] = useState(true);

  // Get icon for node type
  const getTypeIcon = useCallback((type: GraphNodeType) => {
    switch (type) {
      case GraphNodeType.Document:
        return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
      case GraphNodeType.Extract:
        return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>;
      case GraphNodeType.Flashcard:
        return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
      case GraphNodeType.Category:
        return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;
      case GraphNodeType.Tag:
        return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>;
    }
  }, []);

  // Group connections by type
  const connectionsByType = useMemo(() => {
    const grouped: Record<string, { nodes: GraphNode[]; edges: GraphEdge[] }> = {};

    connectedEdges.forEach((edge) => {
      const type = edge.type || "related";
      if (!grouped[type]) {
        grouped[type] = { nodes: [], edges: [] };
      }
      grouped[type].edges.push(edge);

      const relatedId = edge.source === node.id ? edge.target : edge.source;
      const relatedNode = relatedNodes.find((n) => n.id === relatedId);
      if (relatedNode && !grouped[type].nodes.some((n) => n.id === relatedId)) {
        grouped[type].nodes.push(relatedNode);
      }
    });

    return grouped;
  }, [connectedEdges, relatedNodes, node.id]);

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l border-border shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${node.color}20` }}>
            <div style={{ color: node.color }}>
              {getTypeIcon(node.type)}
            </div>
          </div>
          <div>
            <h3 className="font-semibold">{node.label}</h3>
            <p className="text-xs text-muted-foreground capitalize">{node.type}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Description */}
        {node.description && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{node.description}</p>
          </div>
        )}

        {/* Category */}
        {node.category && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Category</h4>
            <span className="inline-flex items-center px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
              {node.category}
            </span>
          </div>
        )}

        {/* Tags */}
        {node.tags && node.tags.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {node.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Metadata</h4>
            <dl className="space-y-2">
              {Object.entries(node.metadata).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between">
                  <dt className="text-sm text-muted-foreground capitalize">{key}</dt>
                  <dd className="text-sm text-right max-w-[200px] truncate">
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Connections */}
        {showConnections && (connectedEdges.length > 0 || relatedNodes.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Connections</h4>
              <button
                onClick={() => setShowConnections(!showConnections)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showConnections ? "Hide" : "Show"}
              </button>
            </div>

            {Object.entries(connectionsByType).map(([type, data]) => (
              <div key={type} className="mb-3">
                <h5 className="text-xs font-medium text-muted-foreground capitalize mb-2">
                  {type} ({data.nodes.length})
                </h5>
                <div className="space-y-2">
                  {data.nodes.map((relatedNode) => (
                    <button
                      key={relatedNode.id}
                      onClick={() => onNavigate?.(relatedNode.id)}
                      className="w-full flex items-center gap-2 p-2 bg-muted/30 hover:bg-muted rounded transition-colors text-left"
                    >
                      <div className={`p-1 rounded`} style={{ backgroundColor: `${relatedNode.color}20` }}>
                        <div className="w-4 h-4" style={{ color: relatedNode.color }}>
                          {getTypeIcon(relatedNode.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{relatedNode.label}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {relatedNode.type}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Statistics */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Statistics</h4>
          <dl className="space-y-1">
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Connections</dt>
              <dd>{connectedEdges.length}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Related Nodes</dt>
              <dd>{relatedNodes.length}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-border bg-muted/30 space-y-2">
        {onNavigate && (
          <button
            onClick={() => onNavigate(node.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(node.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-background border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(node.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Node detail panel props (simplified version)
 */
export interface NodeDetailPanelProps {
  node: GraphNode;
  onClose: () => void;
}

/**
 * Simplified node detail panel
 */
export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: node.color }}
          />
          <h3 className="font-semibold">{node.label}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {node.description && (
        <p className="text-sm text-muted-foreground mb-3">{node.description}</p>
      )}

      {node.category && (
        <div className="mb-2">
          <span className="text-xs text-muted-foreground">Category: </span>
          <span className="text-xs">{node.category}</span>
        </div>
      )}

      {node.tags && node.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {node.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-accent text-accent-foreground rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mini node card (for hover tooltip)
 */
export function NodeCard({ node, onClick }: { node: GraphNode; onClick?: () => void }) {
  return (
    <div
      className={`bg-card border border-border rounded-lg shadow-lg p-3 ${onClick ? "cursor-pointer hover:shadow-xl transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: node.color }}
        />
        <span className="text-sm font-medium">{node.label}</span>
      </div>

      <p className="text-xs text-muted-foreground capitalize">{node.type}</p>

      {node.description && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {node.description}
        </p>
      )}

      {node.tags && node.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {node.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded"
            >
              #{tag}
            </span>
          ))}
          {node.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{node.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
