export function KnowledgeNetworkTab() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-card border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Knowledge Network (2D)</h2>
        <p className="text-sm text-muted-foreground">
          Explore connections between concepts and documents
        </p>
      </div>

      <div className="flex-1 relative">
        {/* Placeholder content area - would contain 2D force-directed graph */}
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="text-8xl mb-6">🕸️</div>
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Coming Soon
            </h3>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              2D force-directed graph visualization coming soon. Explore relationships between
              documents, topics, and learning items in an interactive network view.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="text-left">
                <div className="font-medium text-foreground mb-2">Planned Features:</div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Force-directed layout</li>
                  <li>• Topic clustering</li>
                  <li>• Interactive filtering</li>
                  <li>• Path finding between concepts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
