/**
 * Graph filtering and search component
 */

import { useState, useCallback, useMemo } from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import {
  GraphNode,
  GraphEdge,
  GraphNodeType,
  LayoutAlgorithm,
} from "./KnowledgeGraph";

/**
 * Filter options
 */
export interface GraphFilters {
  searchQuery: string;
  nodeTypes: GraphNodeType[];
  categories: string[];
  tags: string[];
  minConnections?: number;
  maxConnections?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Graph filter controls props
 */
export interface GraphFilterControlsProps {
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
  availableCategories: string[];
  availableTags: string[];
  layout: LayoutAlgorithm;
  onLayoutChange: (layout: LayoutAlgorithm) => void;
}

/**
 * Graph filter controls component
 */
export function GraphFilterControls({
  filters,
  onFiltersChange,
  availableCategories,
  availableTags,
  layout,
  onLayoutChange,
}: GraphFilterControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTypeFilter, setShowTypeFilter] = useState(true);
  const [showCategoryFilter, setShowCategoryFilter] = useState(true);
  const [showTagFilter, setShowTagFilter] = useState(true);

  const updateSearchQuery = useCallback((query: string) => {
    onFiltersChange({ ...filters, searchQuery: query });
  }, [filters, onFiltersChange]);

  const toggleNodeType = useCallback((type: GraphNodeType) => {
    const newTypes = filters.nodeTypes.includes(type)
      ? filters.nodeTypes.filter((t) => t !== type)
      : [...filters.nodeTypes, type];
    onFiltersChange({ ...filters, nodeTypes: newTypes });
  }, [filters, onFiltersChange]);

  const toggleCategory = useCallback((category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  }, [filters, onFiltersChange]);

  const toggleTag = useCallback((tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  }, [filters, onFiltersChange]);

  const clearAll = useCallback(() => {
    onFiltersChange({
      searchQuery: "",
      nodeTypes: [],
      categories: [],
      tags: [],
    });
  }, [onFiltersChange]);

  const hasActiveFilters =
    filters.searchQuery ||
    filters.nodeTypes.length > 0 ||
    filters.categories.length > 0 ||
    filters.tags.length > 0;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-muted rounded"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => updateSearchQuery(e.target.value)}
                placeholder="Search nodes..."
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Node Types */}
          <div>
            <button
              onClick={() => setShowTypeFilter(!showTypeFilter)}
              className="flex items-center justify-between w-full text-sm font-medium mb-2"
            >
              <span>Node Types</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showTypeFilter ? "" : "-rotate-90"}`}
              />
            </button>
            {showTypeFilter && (
              <div className="grid grid-cols-2 gap-2">
                {Object.values(GraphNodeType).map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.nodeTypes.includes(type)}
                      onChange={() => toggleNodeType(type)}
                      className="rounded border-border"
                    />
                    <span className="capitalize">{type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          {availableCategories.length > 0 && (
            <div>
              <button
                onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                className="flex items-center justify-between w-full text-sm font-medium mb-2"
              >
                <span>Categories</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showCategoryFilter ? "" : "-rotate-90"}`}
                />
              </button>
              {showCategoryFilter && (
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        filters.categories.includes(category)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {availableTags.length > 0 && (
            <div>
              <button
                onClick={() => setShowTagFilter(!showTagFilter)}
                className="flex items-center justify-between w-full text-sm font-medium mb-2"
              >
                <span>Tags</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showTagFilter ? "" : "-rotate-90"}`}
                />
              </button>
              {showTagFilter && (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        filters.tags.includes(tag)
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Layout */}
          <div>
            <label className="block text-sm font-medium mb-2">Layout</label>
            <select
              value={layout}
              onChange={(e) => onLayoutChange(e.target.value as LayoutAlgorithm)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={LayoutAlgorithm.Force}>Force-Directed</option>
              <option value={LayoutAlgorithm.Circular}>Circular</option>
              <option value={LayoutAlgorithm.Hierarchical}>Hierarchical</option>
              <option value={LayoutAlgorithm.Grid}>Grid</option>
              <option value={LayoutAlgorithm.Random}>Random</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Apply filters to graph data
 */
export function applyGraphFilters(
  nodes: GraphNode[],
  edges: GraphEdge[],
  filters: GraphFilters
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  let filteredNodes = [...nodes];

  // Filter by search query
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filteredNodes = filteredNodes.filter(
      (node) =>
        node.label.toLowerCase().includes(query) ||
        node.description?.toLowerCase().includes(query) ||
        node.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  // Filter by node types
  if (filters.nodeTypes.length > 0) {
    filteredNodes = filteredNodes.filter((node) =>
      filters.nodeTypes.includes(node.type)
    );
  }

  // Filter by categories
  if (filters.categories.length > 0) {
    filteredNodes = filteredNodes.filter((node) =>
      node.category && filters.categories.includes(node.category)
    );
  }

  // Filter by tags
  if (filters.tags.length > 0) {
    filteredNodes = filteredNodes.filter((node) =>
      node.tags?.some((tag) => filters.tags.includes(tag))
    );
  }

  // Filter by connections
  if (filters.minConnections !== undefined || filters.maxConnections !== undefined) {
    filteredNodes = filteredNodes.filter((node) => {
      const connectionCount = edges.filter(
        (edge) => edge.source === node.id || edge.target === node.id
      ).length;

      if (filters.minConnections !== undefined && connectionCount < filters.minConnections) {
        return false;
      }
      if (filters.maxConnections !== undefined && connectionCount > filters.maxConnections) {
        return false;
      }
      return true;
    });
  }

  // Filter edges to only include connections between filtered nodes
  const nodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  return { nodes: filteredNodes, edges: filteredEdges };
}

/**
 * Highlight nodes and edges related to a search query
 */
export function highlightSearchResults(
  nodes: GraphNode[],
  edges: GraphEdge[],
  query: string
): { highlightedNodes: string[]; highlightedEdges: string[] } {
  if (!query) return { highlightedNodes: [], highlightedEdges: [] };

  const lowerQuery = query.toLowerCase();
  const matchingNodes = new Set<string>();
  const matchingEdges = new Set<string>();

  // Find matching nodes
  nodes.forEach((node) => {
    if (
      node.label.toLowerCase().includes(lowerQuery) ||
      node.description?.toLowerCase().includes(lowerQuery)
    ) {
      matchingNodes.add(node.id);
    }
  });

  // Find edges connected to matching nodes
  edges.forEach((edge) => {
    if (matchingNodes.has(edge.source) || matchingNodes.has(edge.target)) {
      matchingEdges.add(edge.id);
      matchingNodes.add(edge.source);
      matchingNodes.add(edge.target);
    }
  });

  return {
    highlightedNodes: Array.from(matchingNodes),
    highlightedEdges: Array.from(matchingEdges),
  };
}

/**
 * Extract available categories and tags from nodes
 */
export function extractGraphMetadata(nodes: GraphNode[]): {
  categories: string[];
  tags: string[];
} {
  const categories = new Set<string>();
  const tags = new Set<string>();

  nodes.forEach((node) => {
    if (node.category) {
      categories.add(node.category);
    }
    node.tags?.forEach((tag) => tags.add(tag));
  });

  return {
    categories: Array.from(categories).sort(),
    tags: Array.from(tags).sort(),
  };
}

/**
 * Graph statistics
 */
export interface GraphStatistics {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<GraphNodeType, number>;
  averageConnections: number;
  isolatedNodes: number;
  connectedComponents: number;
}

/**
 * Calculate graph statistics
 */
export function calculateGraphStatistics(
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphStatistics {
  const nodesByType: Record<GraphNodeType, number> = {
    [GraphNodeType.Document]: 0,
    [GraphNodeType.Extract]: 0,
    [GraphNodeType.Flashcard]: 0,
    [GraphNodeType.Category]: 0,
    [GraphNodeType.Tag]: 0,
  };

  nodes.forEach((node) => {
    nodesByType[node.type]++;
  });

  const connectionCounts = new Map<string, number>();
  nodes.forEach((node) => connectionCounts.set(node.id, 0));

  edges.forEach((edge) => {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
  });

  const totalConnections = Array.from(connectionCounts.values()).reduce((a, b) => a + b, 0);
  const averageConnections = nodes.length > 0 ? totalConnections / nodes.length : 0;

  const isolatedNodes = Array.from(connectionCounts.values()).filter((c) => c === 0).length;

  // Calculate connected components (simplified)
  const visited = new Set<string>();
  let components = 0;

  const dfs = (nodeId: string) => {
    visited.add(nodeId);
    edges.forEach((edge) => {
      if (edge.source === nodeId && !visited.has(edge.target)) {
        dfs(edge.target);
      }
      if (edge.target === nodeId && !visited.has(edge.source)) {
        dfs(edge.source);
      }
    });
  };

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      components++;
      dfs(node.id);
    }
  });

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodesByType,
    averageConnections,
    isolatedNodes,
    connectedComponents: components,
  };
}
