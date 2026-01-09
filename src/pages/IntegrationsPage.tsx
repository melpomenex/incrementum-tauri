import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  SiObsidian,
  SiAnki,
  Link as LinkIcon,
  Download,
  Upload,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";

export function IntegrationsPage() {
  const [obsidianVault, setObsidianVault] = useState("");
  const [obsidianStatus, setObsidianStatus] = useState<string>("");
  const [ankiProfile, setAnkiProfile] = useState("");
  const [ankiStatus, setAnkiStatus] = useState<string>("");

  const handleObsidianExport = async () => {
    if (!obsidianVault) {
      alert("Please enter your Obsidian vault path");
      return;
    }

    setObsidianStatus("exporting");

    try {
      await invoke("export_to_obsidian", { vaultPath: obsidianVault });
      setObsidianStatus("success");
      setTimeout(() => setObsidianStatus(""), 3000);
    } catch (error: any) {
      setObsidianStatus(`error: ${error}`);
    }
  };

  const handleObsidianSync = async () => {
    if (!obsidianVault) {
      alert("Please enter your Obsidian vault path");
      return;
    }

    setObsidianStatus("syncing");

    try {
      await invoke("sync_to_obsidian", { vaultPath: obsidianVault });
      setObsidianStatus("success");
      setTimeout(() => setObsidianStatus(""), 3000);
    } catch (error: any) {
      setObsidianStatus(`error: ${error}`);
    }
  };

  const handleAnkiSync = async () => {
    setAnkiStatus("syncing");

    try {
      await invoke("sync_flashcards_to_anki", { profile: ankiProfile || "User 1" });
      setAnkiStatus("success");
      setTimeout(() => setAnkiStatus(""), 3000);
    } catch (error: any) {
      setAnkiStatus(`error: ${error}`);
    }
  };

  const handleTestAnki = async () => {
    setAnkiStatus("testing");

    try {
      await invoke("test_anki_connection");
      setAnkiStatus("connected");
      setTimeout(() => setAnkiStatus(""), 3000);
    } catch (error: any) {
      setAnkiStatus(`error: ${error}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-cream">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <h1 className="text-xl font-semibold text-foreground mb-1">
          Integrations
        </h1>
        <p className="text-sm text-foreground-secondary">
          Connect Incrementum with your favorite tools
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Obsidian Integration */}
          <div className="bg-card border border-border rounded p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <SiObsidian className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Obsidian
                </h3>
                <p className="text-sm text-foreground-secondary mt-1">
                  Sync your documents and flashcards to Obsidian for advanced
                  note-taking
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Vault Path
                </label>
                <input
                  type="text"
                  value={obsidianVault}
                  onChange={(e) => setObsidianVault(e.target.value)}
                  placeholder="/Users/yourname/Obsidian/MyVault"
                  className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleObsidianExport}
                  disabled={obsidianStatus === "exporting" || !obsidianVault}
                  className="px-4 py-2 bg-primary-300 text-white rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {obsidianStatus === "exporting" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Export to Obsidian
                    </>
                  )}
                </button>
                <button
                  onClick={handleObsidianSync}
                  disabled={obsidianStatus === "syncing" || !obsidianVault}
                  className="px-4 py-2 bg-background border border-border rounded hover:bg-muted disabled:opacity-50 flex items-center gap-2"
                >
                  {obsidianStatus === "syncing" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      Sync
                    </>
                  )}
                </button>
              </div>

              {obsidianStatus === "success" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  Sync completed successfully
                </div>
              )}

              {obsidianStatus?.startsWith("error") && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {obsidianStatus.replace("error: ", "")}
                </div>
              )}
            </div>
          </div>

          {/* Anki Integration */}
          <div className="bg-card border border-border rounded p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <SiAnki className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">Anki</h3>
                <p className="text-sm text-foreground-secondary mt-1">
                  Sync your flashcards to Anki for cross-platform spaced
                  repetition
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Anki Profile
                </label>
                <input
                  type="text"
                  value={ankiProfile}
                  onChange={(e) => setAnkiProfile(e.target.value)}
                  placeholder="User 1"
                  className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTestAnki}
                  disabled={ankiStatus === "testing"}
                  className="px-4 py-2 bg-background border border-border rounded hover:bg-muted disabled:opacity-50 flex items-center gap-2"
                >
                  {ankiStatus === "testing" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </button>
                <button
                  onClick={handleAnkiSync}
                  disabled={ankiStatus === "syncing"}
                  className="px-4 py-2 bg-primary-300 text-white rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {ankiStatus === "syncing" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Sync to Anki
                    </>
                  )}
                </button>
              </div>

              {ankiStatus === "success" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  Sync completed successfully
                </div>
              )}

              {ankiStatus === "connected" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  Anki connection successful
                </div>
              )}

              {ankiStatus?.startsWith("error") && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {ankiStatus.replace("error: ", "")}
                </div>
              )}
            </div>
          </div>

          {/* Browser Extension */}
          <div className="bg-card border border-border rounded p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Browser Extension
                </h3>
                <p className="text-sm text-foreground-secondary mt-1 mb-4">
                  Install the browser extension to quickly save content from the
                  web
                </p>
                <button className="px-4 py-2 bg-primary-300 text-white rounded hover:opacity-90">
                  Install Extension
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
