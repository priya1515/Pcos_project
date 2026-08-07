import { formatLongDate } from "../utils/formatters";

function createReportMarkup(scan) {
  return `FemWell Screening Report

Scan ID: ${scan.id}
Date: ${formatLongDate(scan.createdAt)}
Prediction: ${scan.predictionLabel}
Confidence: ${scan.confidence.toFixed(2)}%
PCOS Probability: ${scan.probabilities.pcos.toFixed(2)}%
Normal Probability: ${scan.probabilities.normal.toFixed(2)}%
Model: ${scan.model}
Analysis Type: ${scan.analysisType}

Disclaimer:
FemWell is an AI-assisted screening tool based on ultrasound image analysis. This result is not a medical diagnosis and should not replace evaluation by a qualified healthcare professional.
`;
}

export function downloadScanReport(scan) {
  const blob = new Blob([createReportMarkup(scan)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${scan.id.toLowerCase()}-report.txt`;
  link.click();

  URL.revokeObjectURL(url);
}
