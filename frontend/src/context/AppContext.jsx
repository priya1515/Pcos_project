import { useState } from "react";
import { useHealthStatus } from "../hooks/useHealthStatus";
import { useScanHistory } from "../hooks/useScanHistory";
import { useTheme } from "../hooks/useTheme";
import { downloadScanReport } from "../services/reportService";
import { getPredictionMeta } from "../utils/scan";
import { AppContext } from "./appContextObject";

function useToasts() {
  const [toasts, setToasts] = useState([]);

  function pushToast(toast) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextToast = { id, tone: "info", ...toast };

    setToasts((current) => [...current, nextToast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4000);
  }

  return { toasts, pushToast };
}

export function AppProvider({ children }) {
  const { scans, saveScan, deleteScan, clearScans, exportScans } = useScanHistory();
  const { health, healthError, refreshHealth } = useHealthStatus();
  const { theme, setTheme } = useTheme();
  const { toasts, pushToast } = useToasts();
  const [compareSelection, setCompareSelection] = useState([]);

  function addCompareSelection(scanId) {
    setCompareSelection((current) => {
      if (current.includes(scanId)) {
        return current.filter((id) => id !== scanId);
      }

      return [...current, scanId].slice(-2);
    });
  }

  function resetCompareSelection() {
    setCompareSelection([]);
  }

  function saveResultScan({ fileName, imageDataUrl, imageSize, result, clinical }) {
    const meta = getPredictionMeta(result.prediction);

    const scan = saveScan({
      createdAt: new Date().toISOString(),
      fileName,
      imageDataUrl,
      imageSize,
      prediction: result.prediction,
      predictionLabel: meta.label,
      confidence: result.confidence,
      probabilities: result.probabilities,
      model: result.model,
      analysisType: result.analysisType,
      status: "Completed",
      gradcamImage: result.raw?.gradcam_image || null,
      clinical: clinical || null,
    });

    pushToast({
      title: "Scan saved",
      description: `${scan.id} was added to local scan history.`,
      tone: "success",
    });

    return scan;
  }

  function removeScan(scanId) {
    deleteScan(scanId);
    setCompareSelection((current) => current.filter((id) => id !== scanId));
    pushToast({
      title: "Scan deleted",
      description: `${scanId} was removed from history.`,
      tone: "warning",
    });
  }

  function clearHistory() {
    clearScans();
    resetCompareSelection();
    pushToast({
      title: "History cleared",
      description: "All locally stored scans were removed.",
      tone: "warning",
    });
  }

  function exportHistory() {
    const blob = new Blob([exportScans()], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `femwell-scan-history-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);

    pushToast({
      title: "History exported",
      description: "A JSON copy of your saved scans has been downloaded.",
      tone: "success",
    });
  }

  const value = {
    scans,
    health,
    healthError,
    refreshHealth,
    theme,
    setTheme,
    toasts,
    pushToast,
    compareSelection,
    addCompareSelection,
    resetCompareSelection,
    saveResultScan,
    removeScan,
    clearHistory,
    exportHistory,
    downloadScanReport,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
