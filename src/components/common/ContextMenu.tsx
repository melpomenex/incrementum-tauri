/**
 * Context menu system
 * Provides right-click context menus for various elements
 */

import { useState, useCallback, useEffect, useRef, ReactNode } from "react";

/**
 * Context menu item type
 */
export enum ContextMenuItemType {
  Normal = "normal",
  Separator = "separator",
  Submenu = "submenu",
  Checkbox = "checkbox",
  Radio = "radio",
  Danger = "danger",
}

/**
 * Context menu item
 */
export interface ContextMenuItem {
  id: string;
  type?: ContextMenuItemType;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  onClick?: () => void;
  children?: ContextMenuItem[];
}

/**
 * Context menu position
 */
export interface ContextMenuPosition {
  x: number;
  y: number;
}

/**
 * Context menu state
 */
interface ContextMenuState {
  visible: boolean;
  position: ContextMenuPosition;
  items: ContextMenuItem[];
  parentId?: string;
}

/**
 * Context menu store
 */
interface ContextMenuStore {
  menus: Map<string, ContextMenuState>;
  showMenu: (id: string, position: ContextMenuPosition, items: ContextMenuItem[]) => void;
  hideMenu: (id: string) => void;
  hideAll: () => void;
}

const createContextMenuStore = () => {
  let store: ContextMenuStore = {
    menus: new Map(),
    showMenu: (id, position, items) => {
      const existing = store.menus.get(id);
      store.menus.set(id, {
        visible: true,
        position,
        items,
        parentId: existing?.parentId,
      });
    },
    hideMenu: (id) => {
      const menu = store.menus.get(id);
      if (menu) {
        store.menus.set(id, { ...menu, visible: false });
      }
    },
    hideAll: () => {
      store.menus.forEach((menu, id) => {
        store.menus.set(id, { ...menu, visible: false });
      });
    },
  };
  return store;
};

const contextMenuStore = createContextMenuStore();

/**
 * Hook to use context menu
 */
export function useContextMenu(menuId: string) {
  const [state, setState] = useState<ContextMenuState>({
    visible: false,
    position: { x: 0, y: 0 },
    items: [],
  });

  const showMenu = useCallback((position: ContextMenuPosition, items: ContextMenuItem[]) => {
    contextMenuStore.showMenu(menuId, position, items);
    setState({
      visible: true,
      position,
      items,
    });
  }, [menuId]);

  const hideMenu = useCallback(() => {
    contextMenuStore.hideMenu(menuId);
    setState((prev) => ({ ...prev, visible: false }));
  }, [menuId]);

  // Handle click outside
  useEffect(() => {
    const handleClick = () => {
      if (state.visible) {
        hideMenu();
      }
    };

    if (state.visible) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [state.visible, hideMenu]);

  // Handle escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.visible) {
        hideMenu();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [state.visible, hideMenu]);

  return {
    visible: state.visible,
    position: state.position,
    items: state.items,
    showMenu,
    hideMenu,
  };
}

/**
 * Context menu component
 */
export function ContextMenu({
  menuId,
  items,
  visible,
  position,
  onClose,
}: {
  menuId: string;
  items: ContextMenuItem[];
  visible: boolean;
  position: ContextMenuPosition;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuState, setSubmenuState] = useState<{
    itemId: string | null;
    position: ContextMenuPosition;
  } | null>(null);

  // Adjust position if menu goes off screen
  const adjustedPosition = useCallback(() => {
    if (!menuRef.current) return position;

    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 8;
    }

    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 8;
    }

    return { x, y };
  }, [position]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const menu = menuRef.current;
      if (!menu) return;

      const focusableItems = menu.querySelectorAll<HTMLElement>(
        "[role^='menuitem']:not([disabled])"
      );
      const currentIndex = Array.from(focusableItems).findIndex(
        (item) => item === document.activeElement
      );

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % focusableItems.length;
          focusableItems[nextIndex]?.focus();
          break;

        case "ArrowUp":
          e.preventDefault();
          const prevIndex =
            (currentIndex - 1 + focusableItems.length) % focusableItems.length;
          focusableItems[prevIndex]?.focus();
          break;

        case "Enter":
        case " ":
          e.preventDefault();
          (document.activeElement as HTMLElement)?.click();
          break;

        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  const pos = adjustedPosition();

  return (
    <>
      <div
        ref={menuRef}
        className="context-menu fixed z-50 min-w-48 py-1 bg-card border border-border rounded-lg shadow-lg"
        style={{
          left: pos.x,
          top: pos.y,
        }}
        role="menu"
        tabIndex={-1}
      >
        {items.map((item, index) => {
          if (item.type === ContextMenuItemType.Separator) {
            return (
              <div
                key={`separator-${index}`}
                className="my-1 border-t border-border"
                role="separator"
              />
            );
          }

          const hasSubmenu = item.children && item.children.length > 0;

          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => {
                if (hasSubmenu && menuRef.current) {
                  const menuRect = menuRef.current.getBoundingClientRect();
                  setSubmenuState({
                    itemId: item.id,
                    position: {
                      x: menuRect.right - 4,
                      y: pos.y,
                    },
                  });
                }
              }}
              onMouseLeave={() => {
                if (hasSubmenu) {
                  setSubmenuState(null);
                }
              }}
            >
              <button
                className={`
                  w-full px-3 py-2 flex items-center gap-2 text-left text-sm
                  hover:bg-muted transition-colors
                  ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}
                  ${item.type === ContextMenuItemType.Danger ? "text-destructive hover:bg-destructive/10" : "text-foreground"}
                  ${item.checked ? "bg-muted/50" : ""}
                `}
                role="menuitem"
                tabIndex={index === 0 ? 0 : -1}
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.();
                    onClose();
                  }
                }}
              >
                {/* Checkbox/Radio indicator */}
                {(item.type === ContextMenuItemType.Checkbox ||
                  item.type === ContextMenuItemType.Radio) && (
                  <span className="w-4 h-4 flex items-center justify-center">
                    {item.checked && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>
                )}

                {/* Icon */}
                {item.icon && (
                  <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">
                    {item.icon}
                  </span>
                )}

                {/* Label */}
                <span className="flex-1">{item.label}</span>

                {/* Shortcut */}
                {item.shortcut && (
                  <span className="text-xs text-muted-foreground">{item.shortcut}</span>
                )}

                {/* Submenu indicator */}
                {hasSubmenu && (
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Submenu */}
      {submenuState && (
        <ContextMenu
          menuId={`${menuId}-${submenuState.itemId}`}
          items={
            items.find((i) => i.id === submenuState.itemId)?.children || []
          }
          visible={true}
          position={submenuState.position}
          onClose={() => setSubmenuState(null)}
        />
      )}
    </>
  );
}

/**
 * Context menu provider
 */
export function ContextMenuProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Hook to create context menu handler
 */
export function useContextMenuHandler(menuId: string, items: ContextMenuItem[]) {
  const { showMenu } = useContextMenu(menuId);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showMenu({ x: e.clientX, y: e.clientY }, items);
    },
    [showMenu, items]
  );

  return { handleContextMenu };
}

/**
 * Higher-order component to add context menu
 */
export function withContextMenu<P extends object>(
  Component: React.ComponentType<P>,
  items: ContextMenuItem[],
  menuId?: string
) {
  return function ContextMenuWrapper(props: P) {
    const id = menuId || `context-menu-${Math.random().toString(36).substr(2, 9)}`;
    const { handleContextMenu } = useContextMenuHandler(id, items);

    return (
      <div onContextMenu={handleContextMenu}>
        <Component {...props} />
      </div>
    );
  };
}

/**
 * Common context menus
 */
export const CommonContextMenus = {
  text: [
    { id: "copy", label: "Copy", shortcut: "Ctrl+C", type: ContextMenuItemType.Normal },
    { id: "cut", label: "Cut", shortcut: "Ctrl+X", type: ContextMenuItemType.Normal },
    { id: "paste", label: "Paste", shortcut: "Ctrl+V", type: ContextMenuItemType.Normal },
    { id: "sep1", type: ContextMenuItemType.Separator },
    { id: "select-all", label: "Select All", shortcut: "Ctrl+A", type: ContextMenuItemType.Normal },
  ],

  document: [
    { id: "open", label: "Open", type: ContextMenuItemType.Normal },
    { id: "sep1", type: ContextMenuItemType.Separator },
    { id: "edit", label: "Edit", type: ContextMenuItemType.Normal },
    { id: "duplicate", label: "Duplicate", type: ContextMenuItemType.Normal },
    { id: "sep2", type: ContextMenuItemType.Separator },
    { id: "delete", label: "Delete", shortcut: "Del", type: ContextMenuItemType.Danger },
  ],

  folder: [
    { id: "open", label: "Open", type: ContextMenuItemType.Normal },
    { id: "sep1", type: ContextMenuItemType.Separator },
    { id: "new-folder", label: "New Folder", type: ContextMenuItemType.Normal },
    { id: "new-document", label: "New Document", type: ContextMenuItemType.Normal },
    { id: "sep2", type: ContextMenuItemType.Separator },
    { id: "rename", label: "Rename", type: ContextMenuItemType.Normal },
    { id: "delete", label: "Delete", shortcut: "Del", type: ContextMenuItemType.Danger },
  ],

  flashcard: [
    { id: "edit", label: "Edit", type: ContextMenuItemType.Normal },
    { id: "sep1", type: ContextMenuItemType.Separator },
    { id: "suspend", label: "Suspend", type: ContextMenuItemType.Checkbox },
    { id: "bury", label: "Bury", type: ContextMenuItemType.Checkbox },
    { id: "mark-new", label: "Mark as New", type: ContextMenuItemType.Normal },
    { id: "sep2", type: ContextMenuItemType.Separator },
    { id: "delete", label: "Delete", shortcut: "Del", type: ContextMenuItemType.Danger },
  ],

  link: [
    { id: "open", label: "Open Link", type: ContextMenuItemType.Normal },
    { id: "open-new-tab", label: "Open in New Tab", type: ContextMenuItemType.Normal },
    { id: "sep1", type: ContextMenuItemType.Separator },
    { id: "copy-link", label: "Copy Link Address", type: ContextMenuItemType.Normal },
  ],
};
