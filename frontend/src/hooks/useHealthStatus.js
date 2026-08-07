import { useCallback, useEffect, useState } from "react";
import { getHealthStatus } from "../api/health";

const POLL_INTERVAL = 60000;

export function useHealthStatus() {
  const [health, setHealth] = useState({
    status: "checking",
    model: "ResNet-50 PCOS Classifier",
    checkedAt: null,
  });

  const [error, setError] = useState("");

  const refreshHealth = useCallback(async () => {
    try {
      const next = await getHealthStatus();
      setHealth(next);
      setError("");
    } catch (requestError) {
      setHealth((current) => ({
        ...current,
        status: "offline",
        checkedAt: Date.now(),
      }));
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshHealth();
    }, 0);

    const intervalId = window.setInterval(refreshHealth, POLL_INTERVAL);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [refreshHealth]);

  return { health, healthError: error, refreshHealth };
}
