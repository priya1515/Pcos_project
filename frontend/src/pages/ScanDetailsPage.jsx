import { useNavigate, useParams } from "react-router-dom";
import EmptyState from "../components/common/EmptyState";
import ScanDetails from "../components/history/ScanDetails";
import { useAppContext } from "../context/useAppContext";

function ScanDetailsPage() {
  const navigate = useNavigate();
  const { scanId } = useParams();
  const { scans, addCompareSelection, downloadScanReport, removeScan } = useAppContext();
  const scan = scans.find((entry) => entry.id === scanId);

  if (!scan) {
    return (
      <EmptyState
        title="Scan not found"
        description="The requested scan is not available in local history."
        actionLabel="Back to History"
        actionHref="/history"
      />
    );
  }

  function handleCompare() {
    addCompareSelection(scan.id);
    navigate("/compare");
  }

  function handleDelete() {
    removeScan(scan.id);
    navigate("/history");
  }

  return (
    <ScanDetails
      scan={scan}
      onCompare={handleCompare}
      onDownload={() => downloadScanReport(scan)}
      onDelete={handleDelete}
    />
  );
}

export default ScanDetailsPage;
