/**
 * User Menu Dropdown - Shown when user is authenticated
 */

import { User, Settings, LogOut } from 'lucide-react';

interface UserMenuProps {
  user: { id: string; email: string; subscriptionTier?: string } | null;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export function UserMenu({ user, onLogout, onOpenSettings }: UserMenuProps) {
  const getInitials = (email: string) => {
    return email[0].toUpperCase();
  };

  const getTierLabel = (tier?: string) => {
    switch (tier) {
      case 'pro':
      case 'paid':
        return 'Pro';
      case 'free':
      default:
        return 'Free';
    }
  };

  return (
    <div className="relative group">
      <button className="p-1 hover:bg-muted rounded transition-colors" title="User profile">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
          {user ? getInitials(user.email) : '?'}
        </div>
      </button>
      <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg bg-card border border-border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="px-3 py-2 border-b border-border">
          <div className="text-sm font-medium text-foreground truncate">
            {user?.email}
          </div>
          <div className="text-xs text-foreground-secondary mt-0.5">
            {user && getTierLabel(user.subscriptionTier)} Plan
          </div>
        </div>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        )}
        <button
          onClick={onLogout}
          className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-muted flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
