import { formatLongDate } from "../utils/formatters";

function toDataSrc(raw) {
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;
  return `data:image/png;base64,${raw}`;
}

function buildPrintHtml(scan) {
  const isPcos = scan.prediction === "pcos";
  const accentColor = isPcos ? "#d97706" : "#059669";
  const probPcos   = typeof scan.probabilities?.pcos   === "number" ? scan.probabilities.pcos   : 0;
  const probNormal = typeof scan.probabilities?.normal === "number" ? scan.probabilities.normal : 0;

  const pcosDisplay   = probPcos   > 1 ? probPcos.toFixed(1)   : (probPcos   * 100).toFixed(1);
  const normalDisplay = probNormal > 1 ? probNormal.toFixed(1) : (probNormal * 100).toFixed(1);
  const confDisplay   = scan.confidence > 1 ? scan.confidence.toFixed(1) : (scan.confidence * 100).toFixed(1);

  const gradcam  = toDataSrc(scan.raw?.gradcam_image);
  const original = scan.imageDataUrl || null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>FemWell Report – ${scan.id}</title>
<style>
  /* Chrome ignores @page margin — set margin:0 and use body padding instead */
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Segoe UI", Arial, sans-serif;
    color: #0f172a;
    font-size: 13px;
    line-height: 1.6;
    padding: 28mm 22mm 28mm 22mm;
  }
  /* ── Header ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 14px;
    margin-bottom: 26px;
  }
  .header-brand { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #1d4ed8; margin-bottom: 4px; }
  .header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .header-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .header-meta { text-align: right; font-size: 11px; color: #64748b; }
  .header-meta strong { display: block; font-size: 13px; color: #0f172a; }
  /* ── Section ── */
  .section { margin-bottom: 20px; page-break-inside: avoid; }
  .section-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.16em; color: #94a3b8; margin-bottom: 10px;
    padding-bottom: 6px; border-bottom: 1px solid #e2e8f0;
  }
  /* ── Grid ── */
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  /* ── Box ── */
  .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #f8fafc; }
  .box .lbl { font-size: 10px; color: #64748b; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.1em; }
  .box .val { font-size: 18px; font-weight: 700; color: #0f172a; }
  /* ── Badge ── */
  .badge {
    display: inline-block; padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 700;
    background: ${isPcos ? "#fef3c7" : "#d1fae5"};
    color: ${accentColor};
    border: 1px solid ${accentColor};
    margin-top: 8px;
  }
  /* ── Bars ── */
  .bar-wrap { margin-top: 8px; }
  .bar-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; font-weight: 500; }
  .bar-track { height: 9px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
  .bar-fill  { height: 9px; border-radius: 999px; }
  /* ── Images ── */
  .img-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; page-break-inside: avoid; }
  .img-lbl { font-size: 10px; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.1em; }
  .img-grid img { width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; display: block; }
  /* ── Disclaimer ── */
  .disclaimer {
    border: 1px solid #bae6fd; background: #f0f9ff;
    border-radius: 8px; padding: 11px 14px;
    font-size: 11px; color: #0369a1;
    margin-top: 22px; page-break-inside: avoid;
  }
  /* ── Footer ── */
  .footer {
    margin-top: 28px; border-top: 1px solid #e2e8f0;
    padding-top: 10px; font-size: 10px; color: #94a3b8;
    display: flex; justify-content: space-between;
    page-break-inside: avoid;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

  <div class="header">
    <div>
      <div class="header-brand">FemWell</div>
      <h1>PCOS Screening Report</h1>
      <div class="header-sub">AI-assisted multimodal analysis</div>
    </div>
    <div class="header-meta">
      <strong>${scan.id}</strong>
      ${formatLongDate(scan.createdAt)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Prediction Summary</div>
    <div class="grid2">
      <div class="box">
        <div class="lbl">Final Prediction</div>
        <div class="val" style="color:${accentColor}">${scan.predictionLabel}</div>
        <span class="badge">${isPcos ? "PCOS Indicators Detected" : "Normal Indicators"}</span>
      </div>
      <div class="box">
        <div class="lbl">PCOS Probability</div>
        <div class="val">${pcosDisplay}%</div>
        <div class="lbl" style="margin-top:10px">Confidence</div>
        <div style="font-weight:600;font-size:14px">${confDisplay}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Probability Breakdown</div>
    <div class="box">
      <div class="bar-wrap">
        <div class="bar-row"><span>PCOS</span><span>${pcosDisplay}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, parseFloat(pcosDisplay))}%;background:#f59e0b"></div></div>
      </div>
      <div class="bar-wrap" style="margin-top:12px">
        <div class="bar-row"><span>Normal</span><span>${normalDisplay}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, parseFloat(normalDisplay))}%;background:#10b981"></div></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Model Information</div>
    <div class="grid2">
      <div class="box"><div class="lbl">Model</div><div style="font-weight:600">${scan.model || "—"}</div></div>
      <div class="box"><div class="lbl">Analysis Type</div><div style="font-weight:600">${scan.analysisType || "—"}</div></div>
    </div>
  </div>

  ${gradcam ? `
  <div class="section">
    <div class="section-title">Grad-CAM Heatmap</div>
    <div class="img-grid">
      <div>
        <div class="img-lbl">Original Ultrasound</div>
        ${original ? `<img src="${original}" alt="Original"/>` : "<p style='color:#94a3b8;font-size:11px'>Not available</p>"}
      </div>
      <div>
        <div class="img-lbl">Grad-CAM Overlay</div>
        <img src="${gradcam}" alt="Grad-CAM"/>
      </div>
    </div>
  </div>` : original ? `
  <div class="section">
    <div class="section-title">Ultrasound Image</div>
    <img src="${original}" alt="Ultrasound" style="max-width:240px;border-radius:8px;border:1px solid #e2e8f0"/>
  </div>` : ""}

  <div class="disclaimer">
    <strong>Disclaimer:</strong> FemWell is an AI-assisted screening tool. This result is not a medical diagnosis
    and should not replace evaluation by a qualified healthcare professional.
  </div>

  <div class="footer">
    <span>FemWell AI Screening Suite</span>
    <span>Generated ${new Date().toLocaleString()}</span>
  </div>

</body>
</html>`;
}

export function downloadScanReport(scan) {
  const html = buildPrintHtml(scan);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  iframe.contentWindow.focus();
  // Wait for base64 images to render before opening print dialog
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1500);
  }, 600);
}
