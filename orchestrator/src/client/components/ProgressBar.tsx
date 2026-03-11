import { useEffect, useState } from 'react';

let progressBarListeners: Set<(isLoading: boolean) => void> = new Set();

// Global progress bar state
export const progressBar = {
  start() {
    progressBarListeners.forEach((listener) => listener(true));
  },
  done() {
    progressBarListeners.forEach((listener) => listener(false));
  },
};

export function ProgressBar() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const listener = (loading: boolean) => {
      setIsLoading(loading);
      if (loading) {
        setProgress(0);
      } else {
        setProgress(100);
        // Reset after animation
        setTimeout(() => setProgress(0), 400);
      }
    };

    progressBarListeners.add(listener);
    return () => {
      progressBarListeners.delete(listener);
    };
  }, []);

  // Simulate progress when loading
  useEffect(() => {
    if (!isLoading) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    return () => clearInterval(timer);
  }, [isLoading]);

  if (!isLoading && progress === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 h-0.5 bg-[#E94560] transition-all duration-300 ease-out"
      style={{
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
      }}
    />
  );
}

// Intercept fetch to trigger progress bar
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    progressBar.start();
    try {
      const response = await originalFetch(...args);
      return response;
    } finally {
      progressBar.done();
    }
  };
}
