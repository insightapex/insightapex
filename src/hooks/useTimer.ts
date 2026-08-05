"use client";

import { useEffect, useRef, useState } from "react";

export function useTimer(
  initialSeconds: number,
  onExpire?: () => void,
  paused = false
) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const expired = useRef(false);

  useEffect(() => {
    setSeconds(initialSeconds);
    expired.current = false;
  }, [initialSeconds]);

  useEffect(() => {
    if (initialSeconds <= 0 || paused) return;

    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          if (!expired.current) {
            expired.current = true;
            onExpire?.();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [initialSeconds, onExpire, paused]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return { seconds, formatted: `${mm}:${ss}`, isLow: seconds < 120 };
}
