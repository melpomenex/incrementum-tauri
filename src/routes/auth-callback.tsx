/**
 * OAuth Callback Route
 * Handles OAuth callbacks from cloud providers (Google Drive, OneDrive, Dropbox)
 */

import { useEffect } from "react";
import { invokeCommand } from "../lib/tauri";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      // Get the pending provider from sessionStorage
      const pendingProvider = sessionStorage.getItem("pending_oauth_provider");

      if (error) {
        console.error("OAuth error:", error);
        // Redirect back to settings with error
        navigate("/settings?oauth_error=" + encodeURIComponent(error));
        return;
      }

      if (!code || !state || !pendingProvider) {
        console.error("Missing OAuth parameters");
        navigate("/settings?oauth_error=missing_parameters");
        return;
      }

      try {
        // Determine provider from state parameter
        let providerType: string;
        if (state.startsWith("googledrive_")) {
          providerType = "google-drive";
        } else if (state.startsWith("onedrive_")) {
          providerType = "onedrive";
        } else if (state.startsWith("dropbox_")) {
          providerType = "dropbox";
        } else {
          throw new Error("Unknown OAuth state");
        }

        // Call the OAuth callback command
        const result = await invokeCommand("oauth_callback", {
          providerType,
          code,
          state,
        });

        console.log("OAuth successful:", result);

        // Redirect back to settings with success
        navigate("/settings?oauth_success=true");
      } catch (err) {
        console.error("OAuth callback failed:", err);
        navigate("/settings?oauth_error=" + encodeURIComponent(err as string));
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign-in...</p>
      </div>
    </div>
  );
}
