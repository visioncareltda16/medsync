import { useEffect, useCallback, useRef } from 'react';

export function useIdleTimeout(onTimeout: () => void, timeoutMinutes: number = 30) {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    timeoutId.current = setTimeout(() => {
      onTimeout();
    }, timeoutMinutes * 60 * 1000);
  }, [onTimeout, timeoutMinutes]);

  useEffect(() => {
    const events = [
      'mousemove',
      'mousedown',
      'resize',
      'keydown',
      'touchstart',
      'scroll'
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Initialize timer
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, true);
    });

    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity, true);
      });
    };
  }, [resetTimer]);
}
