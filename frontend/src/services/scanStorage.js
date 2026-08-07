const STORAGE_KEY = "femwell-scan-history";

function readScans() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScans(scans) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
}

function createScanId(scans) {
  const maxId = scans.reduce((highest, scan) => {
    const numericId = Number(String(scan.id || "").replace("SCAN-", ""));
    return Number.isFinite(numericId) ? Math.max(highest, numericId) : highest;
  }, 0);

  return `SCAN-${String(maxId + 1).padStart(5, "0")}`;
}

export const scanStorage = {
  list() {
    return readScans().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  save(scan) {
    const scans = readScans();
    const record = {
      ...scan,
      id: scan.id || createScanId(scans),
      savedAt: new Date().toISOString(),
    };

    scans.unshift(record);
    writeScans(scans);
    return record;
  },

  remove(id) {
    const scans = readScans().filter((scan) => scan.id !== id);
    writeScans(scans);
    return scans;
  },

  clear() {
    writeScans([]);
  },

  find(id) {
    return readScans().find((scan) => scan.id === id) || null;
  },

  export() {
    return JSON.stringify(this.list(), null, 2);
  },
};
