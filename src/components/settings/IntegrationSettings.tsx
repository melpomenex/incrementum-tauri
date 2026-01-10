import { useState, useEffect } from "react";
import {
  BookOpen,
  Brain,
  Globe,
  Settings as SettingsIcon,
  FolderOpen,
  Check,
  X,
  RefreshCw,
  Download,
  Upload,
  Server,
  Plug,
} from "lucide-react";
import {
  getIntegrationSettings,
  saveIntegrationSettings,
  updateObsidianConfig,
  updateAnkiConfig,
  testAnkiConnection,
  getAnkiDecks,
  getAnkiModels,
  syncFlashcardToAnki,
  syncFlashcardsToAnki,
  exportToObsidian,
  syncToObsidian,
  startBrowserSyncServer,
  stopBrowserSyncServer,
  getBrowserSyncServerStatus,
  type ObsidianConfig,
  type AnkiConfig,
} from "../../api/integrations";

type IntegrationType = "obsidian" | "anki" | "extension";

export function IntegrationSettings() {
  const [settings, setSettings] = useState(getIntegrationSettings());
  const [activeTab, setActiveTab] = useState<IntegrationType>("obsidian");

  // Obsidian state
  const [obsidianVault, setObsidianVault] = useState("");
  const [obsidianNotes, setObsidianNotes] = useState("Incrementum");
  const [obsidianAttachments, setObsidianAttachments] = useState("Incrementum Assets");
  const [obsidianDataview, setObsidianDataview] = useState("");

  // Anki state
  const [ankiUrl, setAnkiUrl] = useState("http://localhost:8765");
  const [ankiDeck, setAnkiDeck] = useState("Incrementum");
  const [ankiModel, setAnkiModel] = useState("Basic");
  const [ankiConnected, setAnkiConnected] = useState(false);
  const [ankiDecks, setAnkiDecks] = useState<string[]>([]);
  const [ankiModels, setAnkiModels] = useState<string[]>([]);

  // Extension state
  const [extensionPort, setExtensionPort] = useState(8766);
  const [extensionStatus, setExtensionStatus] = useState<{
    running: boolean;
    port: number;
    connections: number;
  }>({ running: false, port: 8766, connections: 0 });

  // Operation status
  const [isOperating, setIsOperating] = useState(false);
  const [operationResult, setOperationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loaded = getIntegrationSettings();
    setSettings(loaded);

    if (loaded.obsidian) {
      setObsidianVault(loaded.obsidian.vaultPath);
      setObsidianNotes(loaded.obsidian.notesFolder);
      setObsidianAttachments(loaded.obsidian.attachmentsFolder);
      setObsidianDataview(loaded.obsidian.dataviewFolder || "");
    }

    if (loaded.anki) {
      setAnkiUrl(loaded.anki.url);
      setAnkiDeck(loaded.anki.deckName);
      setAnkiModel(loaded.anki.modelName);
    }

    setExtensionPort(loaded.extensionPort);
  }, []);

  // Load extension status
  useEffect(() => {
    loadExtensionStatus();
    const interval = setInterval(loadExtensionStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadExtensionStatus = async () => {
    try {
      const status = await getBrowserSyncServerStatus(extensionPort);
      setExtensionStatus(status);
    } catch {
      // Ignore errors
    }
  };

  // Save Obsidian config
  const handleSaveObsidian = () => {
    const config: ObsidianConfig = {
      vaultPath: obsidianVault,
      notesFolder: obsidianNotes,
      attachmentsFolder: obsidianAttachments,
      dataviewFolder: obsidianDataview || undefined,
    };
    updateObsidianConfig(config);
    showResult(true, "Obsidian configuration saved");
  };

  // Test Anki connection
  const handleTestAnki = async () => {
    setIsOperating(true);
    try {
      const connected = await testAnkiConnection(ankiUrl);
      setAnkiConnected(connected);

      if (connected) {
        // Load decks and models
        const [decks, models] = await Promise.all([
          getAnkiDecks(ankiUrl),
          getAnkiModels(ankiUrl),
        ]);
        setAnkiDecks(decks);
        setAnkiModels(models);
        showResult(true, "Connected to Anki successfully");
      } else {
        showResult(false, "Failed to connect to Anki. Make sure Anki is running.");
      }
    } catch {
      setAnkiConnected(false);
      showResult(false, "Failed to test Anki connection");
    } finally {
      setIsOperating(false);
    }
  };

  // Save Anki config
  const handleSaveAnki = () => {
    const config: AnkiConfig = {
      url: ankiUrl,
      deckName: ankiDeck,
      modelName: ankiModel,
    };
    updateAnkiConfig(config);
    showResult(true, "Anki configuration saved");
  };

  // Toggle extension server
  const handleToggleExtension = async () => {
    setIsOperating(true);
    try {
      if (extensionStatus.running) {
        await stopBrowserSyncServer();
        showResult(true, "Extension server stopped");
      } else {
        await startBrowserSyncServer(extensionPort);
        showResult(true, "Extension server started");
      }
      loadExtensionStatus();
    } catch {
      showResult(false, "Failed to toggle extension server");
    } finally {
      setIsOperating(false);
    }
  };

  const showResult = (success: boolean, message: string) => {
    setOperationResult({ success, message });
    setTimeout(() => setOperationResult(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Plug className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Integrations</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("obsidian")}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === "obsidian"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:opacity-90"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Obsidian
        </button>
        <button
          onClick={() => setActiveTab("anki")}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === "anki"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:opacity-90"
          }`}
        >
          <Brain className="w-4 h-4" />
          Anki
        </button>
        <button
          onClick={() => setActiveTab("extension")}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === "extension"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:opacity-90"
          }`}
        >
          <Globe className="w-4 h-4" />
          Browser Extension
        </button>
      </div>

      {/* Result notification */}
      {operationResult && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            operationResult.success
              ? "bg-green-500/10 text-green-500 border border-green-500/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {operationResult.success ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          <span>{operationResult.message}</span>
        </div>
      )}

      {/* Obsidian Settings */}
      {activeTab === "obsidian" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-foreground">Obsidian Integration</h3>
            </div>

            <div className="space-y-4">
              {/* Vault path */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Vault Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={obsidianVault}
                    onChange={(e) => setObsidianVault(e.target.value)}
                    placeholder="/home/user/Documents/ObsidianVault"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </button>
                </div>
              </div>

              {/* Notes folder */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes Folder
                </label>
                <input
                  type="text"
                  value={obsidianNotes}
                  onChange={(e) => setObsidianNotes(e.target.value)}
                  placeholder="Incrementum"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Attachments folder */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Attachments Folder
                </label>
                <input
                  type="text"
                  value={obsidianAttachments}
                  onChange={(e) => setObsidianAttachments(e.target.value)}
                  placeholder="Incrementum Assets"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Dataview folder */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Dataview Folder (Optional)
                </label>
                <input
                  type="text"
                  value={obsidianDataview}
                  onChange={(e) => setObsidianDataview(e.target.value)}
                  placeholder="Dataview"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveObsidian}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                Save Obsidian Configuration
              </button>
            </div>
          </div>

          {/* Sync actions */}
          {settings.obsidian && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-foreground mb-4">Sync Actions</h4>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setIsOperating(true);
                    try {
                      await syncToObsidian(settings.obsidian);
                      showResult(true, "Synced to Obsidian successfully");
                    } catch {
                      showResult(false, "Failed to sync to Obsidian");
                    } finally {
                      setIsOperating(false);
                    }
                  }}
                  disabled={isOperating}
                  className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Sync All to Obsidian
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Anki Settings */}
      {activeTab === "anki" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-foreground">Anki Integration</h3>
              {ankiConnected && (
                <span className="ml-auto px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Anki URL */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  AnkiConnect URL
                </label>
                <input
                  type="text"
                  value={ankiUrl}
                  onChange={(e) => setAnkiUrl(e.target.value)}
                  placeholder="http://localhost:8765"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Test connection */}
              <button
                onClick={handleTestAnki}
                disabled={isOperating}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isOperating ? "animate-spin" : ""}`} />
                Test Connection
              </button>

              {/* Deck selection */}
              {ankiConnected && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Target Deck
                    </label>
                    <select
                      value={ankiDeck}
                      onChange={(e) => setAnkiDeck(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {ankiDecks.map((deck) => (
                        <option key={deck} value={deck}>
                          {deck}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Card Model
                    </label>
                    <select
                      value={ankiModel}
                      onChange={(e) => setAnkiModel(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {ankiModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Save button */}
                  <button
                    onClick={handleSaveAnki}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                  >
                    Save Anki Configuration
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sync actions */}
          {settings.anki && ankiConnected && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-foreground mb-4">Sync Actions</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Sync flashcards from Incrementum to Anki
              </p>
              <button
                onClick={async () => {
                  setIsOperating(true);
                  try {
                    const result = await syncFlashcardsToAnki([], settings.anki);
                    showResult(
                      true,
                      `Synced ${result.added} cards to Anki${result.failed > 0 ? ` (${result.failed} failed)` : ""}`
                    );
                  } catch {
                    showResult(false, "Failed to sync to Anki");
                  } finally {
                    setIsOperating(false);
                  }
                }}
                disabled={isOperating}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Sync Flashcards to Anki
              </button>
            </div>
          )}
        </div>
      )}

      {/* Browser Extension Settings */}
      {activeTab === "extension" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-foreground">Browser Extension Server</h3>
              {extensionStatus.running && (
                <span className="ml-auto px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded-full flex items-center gap-1">
                  <Server className="w-3 h-3" />
                  Running
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Port */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  HTTP Server Port
                </label>
                <input
                  type="number"
                  value={extensionPort}
                  onChange={(e) => setExtensionPort(parseInt(e.target.value) || 8766)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default: 8766 (change if port is in use)
                </p>
              </div>

              {/* Status info */}
              {extensionStatus.running && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-green-500">Running</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Port:</span>
                    <span className="text-foreground">{extensionStatus.port}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Connections:</span>
                    <span className="text-foreground">{extensionStatus.connections}</span>
                  </div>
                </div>
              )}

              {/* Toggle button */}
              <button
                onClick={handleToggleExtension}
                disabled={isOperating}
                className={`w-full px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 ${
                  extensionStatus.running
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <Server className="w-4 h-4" />
                {extensionStatus.running ? "Stop Server" : "Start Server"}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              The browser extension server allows the Incrementum web clipper extension to communicate
              with the desktop application via HTTP. Start the server to enable web clipping functionality.
              Configure the extension to connect to http://127.0.0.1:{extensionPort}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
