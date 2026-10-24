
declare global {
  interface Window {
    cachedUser?: import('./index').User | null;
  }
}

export {};
