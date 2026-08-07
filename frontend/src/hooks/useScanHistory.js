import { useCallback, useMemo, useState } from "react";
import { scanStorage } from "../services/scanStorage";

export function useScanHistory() {
  const [scans, setScans] = useState(() => scanStorage.list());

  const refreshScans = useCallback(() => {
    setScans(scanStorage.list());
  }, []);

  const saveScan = useCallback((scan) => {
    const record = scanStorage.save(scan);
    refreshScans();
    return record;
  }, [refreshScans]);

  const deleteScan = useCallback((id) => {
    scanStorage.remove(id);
    refreshScans();
  }, [refreshScans]);

  const clearScans = useCallback(() => {
    scanStorage.clear();
    refreshScans();
  }, [refreshScans]);

  return useMemo(
    () => ({
      scans,
      saveScan,
      deleteScan,
      clearScans,
      refreshScans,
      exportScans: () => scanStorage.export(),
    }),
    [clearScans, deleteScan, refreshScans, saveScan, scans],
  );
}
