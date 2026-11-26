import { useEffect } from 'react';

/**
 * Global Keyboard Shortcuts hook
 * - Ctrl+K / Cmd+K: Open global search palette (fallback: focus search input)
 * - Ctrl+S / Cmd+S: Prevent browser default save page dialog
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: Open global search palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-global-search'));
        const searchInput = document.querySelector<HTMLInputElement>(
          '#global-search-input'
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
