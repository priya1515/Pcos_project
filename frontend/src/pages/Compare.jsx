import EmptyState from "../components/common/EmptyState";
import ScanComparison from "../components/compare/ScanComparison";
import { useAppContext } from "../context/useAppContext";

function Compare() {
  const { scans, compareSelection } = useAppContext();
  const selectedScans = compareSelection
    .map((id) => scans.find((scan) => scan.id === id))
    .filter(Boolean);

  if (selectedScans.length !== 2) {
    return (
      <EmptyState
        title="Select two scans to compare"
        description="Choose exactly two saved screenings from scan history to generate a side-by-side comparison."
        actionLabel="Open History"
        actionHref="/history"
      />
    );
  }

  return <ScanComparison scans={selectedScans} />;
}

export default Compare;
