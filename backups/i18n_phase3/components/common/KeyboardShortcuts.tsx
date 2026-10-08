import React from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export const KeyboardShortcuts: React.FC = () => {
  useKeyboardShortcuts();
  return null;
};

export default KeyboardShortcuts;
