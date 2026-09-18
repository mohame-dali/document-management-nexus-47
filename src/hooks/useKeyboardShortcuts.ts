import { useEffect } from 'react';

/**
 * Global Keyboard Shortcuts hook
 * - Ctrl+K / Cmd+K: Focus search input
 * - Ctrl+S / Cmd+S: Prevent browser default save page dialog
 * - Escape: Close dialogs / clear focus
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: Focus on search bar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="بحث"], input[placeholder*="ابحث"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Ctrl+S or Cmd+S: Prevent default browser "Save Page As"
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
