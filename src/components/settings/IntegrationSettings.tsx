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
  ListVideo,
  Cookie,
  Trash2,
  AlertCircle,
  Info,
} from "lucide-react";
import { YouTubePlaylistManager } from "../media/YouTubePlaylistManager";
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
  getBrowserSyncConfig,
  setBrowserSyncConfig,
  type ObsidianConfig,
  type AnkiConfig,
} from "../../api/integrations";
import {
  getStoredYouTubeCookies,
  storeYouTubeCookies,
  clearYouTubeCookies,
  hasYouTubeCookies,
  getYouTubeCookieCount,
  parseCookiesFromString,
  testYouTubeCookies,
  validateYouTubeCookies,
  type YouTubeCookie,
} from "../../utils/youtubeCookies";

type IntegrationType = "obsidian" | "anki" | "extension" | "youtube" | "youtube-cookies";

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
  const [extensionAutoStart, setExtensionAutoStart] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState<{
    running: boolean;
    port: number;
    connections: number;
  }>({ running: false, port: 8766, connections: 0 });

  // YouTube Cookies state
  const [youtubeCookies, setYoutubeCookies] = useState<YouTubeCookie[]>([]);
  const [cookieInput, setCookieInput] = useState("");
  const [cookieTestStatus, setCookieTestStatus] = useState<{
    status: "idle" | "testing" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });
  const [showCookieInput, setShowCookieInput] = useState(false);

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

  // Load browser sync config
  useEffect(() => {
    const loadBrowserSyncConfig = async () => {
      try {
        const config = await getBrowserSyncConfig();
        setExtensionPort(config.port);
        setExtensionAutoStart(config.autoStart);
      } catch {
        // Ignore errors
      }
    };
    loadBrowserSyncConfig();
  }, []);

  // Load extension status
  useEffect(() => {
    loadExtensionStatus();
    const interval = setInterval(loadExtensionStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load YouTube cookies on mount
  useEffect(() => {
    setYoutubeCookies(getStoredYouTubeCookies());
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

  const handleExtensionConfigChange = async (port?: number, autoStart?: boolean) => {
    try {
      await setBrowserSyncConfig({
        host: "127.0.0.1",
        port: port ?? extensionPort,
        autoStart: autoStart ?? extensionAutoStart,
      });
      if (autoStart !== undefined) {
        setExtensionAutoStart(autoStart);
      }
    } catch {
      // Ignore errors
    }
  };

  // YouTube Cookies handlers
  const handleSaveCookies = () => {
    if (!cookieInput.trim()) {
      showResult(false, "Please enter cookies");
      return;
    }

    try {
      const parsed = parseCookiesFromString(cookieInput);
      if (parsed.length === 0) {
        showResult(false, "No valid cookies found. Please check the format.");
        return;
      }

      const validation = validateYouTubeCookies(parsed);
      storeYouTubeCookies(parsed);
      setYoutubeCookies(parsed);
      setCookieInput("");
      setShowCookieInput(false);

      if (validation.valid) {
        showResult(
          true,
          `Saved ${parsed.length} cookies. ${validation.hasAuth ? "Authentication cookies detected!" : ""}`
        );
      } else {
        showResult(
          true,
          `Saved ${parsed.length} cookies. Warning: Missing recommended cookies: ${validation.missing.join(", ")}`
        );
      }
    } catch (error) {
      showResult(false, error instanceof Error ? error.message : "Failed to parse cookies");
    }
  };

  const handleTestCookies = async () => {
    if (youtubeCookies.length === 0) {
      showResult(false, "No cookies to test");
      return;
    }

    setCookieTestStatus({ status: "testing", message: "Testing cookies..." });

    const result = await testYouTubeCookies(youtubeCookies);

    if (result.success) {
      setCookieTestStatus({ status: "success", message: result.message });
      showResult(true, result.message);
    } else {
      setCookieTestStatus({ status: "error", message: result.message });
      showResult(false, result.message);
    }

    setTimeout(() => {
      setCookieTestStatus({ status: "idle", message: "" });
    }, 5000);
  };

  const handleClearCookies = () => {
    clearYouTubeCookies();
    setYoutubeCookies([]);
    setCookieTestStatus({ status: "idle", message: "" });
    showResult(true, "Cookies cleared");
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
        <button
          onClick={() => setActiveTab("youtube")}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === "youtube"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:opacity-90"
          }`}
        >
          <ListVideo className="w-4 h-4" />
          YouTube Playlists
        </button>
        <button
          onClick={() => setActiveTab("youtube-cookies")}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === "youtube-cookies"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:opacity-90"
          }`}
        >
          <Cookie className="w-4 h-4" />
          YouTube Cookies
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

              {/* Auto-start toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Auto-start on app launch
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically start the server when Incrementum opens
                  </p>
                </div>
                <button
                  onClick={() => handleExtensionConfigChange(undefined, !extensionAutoStart)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    extensionAutoStart ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      extensionAutoStart ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
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

      {/* YouTube Playlist Settings */}
      {activeTab === "youtube" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <YouTubePlaylistManager />
          </div>
        </div>
      )}

      {/* YouTube Cookies Settings */}
      {activeTab === "youtube-cookies" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-foreground">YouTube Authentication Cookies</h3>
              {youtubeCookies.length > 0 && (
                <span className="ml-auto px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {youtubeCookies.length} cookies
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Info banner */}
              <div className="p-4 bg-muted/30 rounded-lg flex gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Why upload cookies?</p>
                  <p>
                    YouTube may block transcript requests due to bot detection. By uploading your own YouTube cookies,
                    the server can make authenticated requests on your behalf. Your cookies are stored locally in your
                    browser and sent directly to the server.
                  </p>
                </div>
              </div>

              {/* Cookie status */}
              {youtubeCookies.length > 0 ? (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Cookies stored</span>
                    <span className="text-sm text-green-500">{youtubeCookies.length} cookies</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleTestCookies}
                      disabled={cookieTestStatus.status === "testing"}
                      className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                      <RefreshCw className={`w-4 h-4 ${cookieTestStatus.status === "testing" ? "animate-spin" : ""}`} />
                      {cookieTestStatus.status === "testing" ? "Testing..." : "Test Cookies"}
                    </button>
                    <button
                      onClick={handleClearCookies}
                      className="px-3 py-2 bg-destructive/20 text-destructive rounded-lg hover:opacity-90 flex items-center justify-center gap-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear
                    </button>
                  </div>
                  {cookieTestStatus.status !== "idle" && (
                    <div className={`mt-2 text-sm flex items-center gap-2 ${
                      cookieTestStatus.status === "success" ? "text-green-500" :
                      cookieTestStatus.status === "error" ? "text-destructive" :
                      "text-muted-foreground"
                    }`}>
                      {cookieTestStatus.status === "success" && <Check className="w-4 h-4" />}
                      {cookieTestStatus.status === "error" && <X className="w-4 h-4" />}
                      {cookieTestStatus.message}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">No cookies stored</span>
                  </div>
                </div>
              )}

              {/* Cookie input area */}
              {!showCookieInput ? (
                <button
                  onClick={() => setShowCookieInput(true)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Cookies
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Paste your YouTube cookies (JSON format)
                    </label>
                    <textarea
                      value={cookieInput}
                      onChange={(e) => setCookieInput(e.target.value)}
                      placeholder='[{"name": "VISITOR_INFO1_LIVE", "value": "...", "domain": ".youtube.com"}, ...]'
                      rows={6}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCookies}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                    >
                      Save Cookies
                    </button>
                    <button
                      onClick={() => {
                        setShowCookieInput(false);
                        setCookieInput("");
                      }}
                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">How to get your cookies:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Install a cookie exporter extension (e.g., "Get cookies.txt" for Chrome/Firefox)</li>
                  <li>Go to YouTube.com and make sure you're logged in</li>
                  <li>Export cookies for youtube.com in JSON format</li>
                  <li>Paste the JSON above and click "Save Cookies"</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Important:</strong> Cookies contain authentication tokens. Only share them with services you trust.
                  Your cookies are stored locally in your browser.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
