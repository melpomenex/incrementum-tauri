import { useState, useEffect } from "react";
import { getUser, logout, isAuthenticated as checkIsAuthenticated } from "../../lib/sync-client";
import { User, LogOut, Crown, Shield } from "lucide-react";
import { LoginModal } from "../auth/LoginModal";

export function UserProfilePanel() {
  const [user, setUser] = useState(getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(checkIsAuthenticated());
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    // Refresh user state on mount and periodically
    const refresh = () => {
        setUser(getUser());
        setIsAuthenticated(checkIsAuthenticated());
    };
    refresh();
    // Poll for changes (e.g. if updated elsewhere)
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    setIsAuthenticated(false);
    window.location.reload();
  };

  const handleLoginSuccess = () => {
    setIsLoginOpen(false);
    setUser(getUser());
    setIsAuthenticated(true);
  };

  const isFree = user?.subscriptionTier === 'free';

  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">
              {isAuthenticated && user ? user.email : "Guest User"}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {isAuthenticated ? (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                  isFree 
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"
                }`}>
                  {isFree ? <Shield className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
                  {isFree ? "Free Plan" : "Pro Plan"}
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                  Demo Mode
                </span>
              )}
            </div>
          </div>
          
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          ) : (
            <button
              onClick={() => setIsLoginOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
            >
              Sign In / Sign Up
            </button>
          )}
        </div>
      </div>

      {/* Subscription Info */}
      {isAuthenticated && isFree && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Crown className="w-8 h-8 text-amber-600 dark:text-amber-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">Upgrade to Pro</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Unlock full file synchronization and unlimited storage.
                Currently on Free plan: Syncs metadata and extracts only.
              </p>
              <button 
                className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-medium transition-colors"
                onClick={() => alert("Payment flow placeholder")}
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onAuthenticated={handleLoginSuccess}
      />
    </div>
  );
}
