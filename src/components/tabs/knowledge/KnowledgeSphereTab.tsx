export function KnowledgeSphereTab() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-card border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Knowledge Sphere (3D)</h2>
        <p className="text-sm text-muted-foreground">
          Interactive 3D visualization of your knowledge network
        </p>
      </div>

      <div className="flex-1 relative">
        {/* Placeholder content area - would contain 3D sphere visualization */}
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="text-8xl mb-6">🌐</div>
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Coming Soon
            </h3>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Full 3D knowledge visualization is under development. This will display your documents,
              extracts, and flashcards as interconnected nodes on a rotating sphere.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Documents</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Extracts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Cards</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
