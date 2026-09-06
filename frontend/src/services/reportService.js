import { formatLongDate } from "../utils/formatters";
import { generateRecommendations, getRiskLabel } from "../utils/recommendations";

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

  const gradcam  = toDataSrc(scan.gradcamImage || scan.raw?.gradcam_image);
  const original = scan.imageDataUrl || null;

  const pcosPct = probPcos > 1 ? probPcos : probPcos * 100;
  const recs    = generateRecommendations(pcosPct, scan.clinical || null);
  const risk    = getRiskLabel(pcosPct);

  const riskColors = {
    emerald: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
    yellow:  { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
    orange:  { bg: "#ffedd5", color: "#9a3412", border: "#fdba74" },
    red:     { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
    rose:    { bg: "#ffe4e6", color: "#9f1239", border: "#fda4af" },
  };
  const rc = riskColors[risk.color];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>FemWell Report – ${scan.id}</title>
<style>
  @page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Segoe UI", Arial, sans-serif;
    color: #0f172a;
    font-size: 12.5px;
    line-height: 1.65;
  }

  /* ── Header ── */
  .header {
    display: table;
    width: 100%;
    border-bottom: 2.5px solid #0f172a;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .header-left  { display: table-cell; vertical-align: bottom; }
  .header-right { display: table-cell; vertical-align: bottom; text-align: right; white-space: nowrap; }
  .header-brand { font-size: 9.5px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #1d4ed8; margin-bottom: 3px; }
  .header h1    { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; }
  .header-sub   { font-size: 10.5px; color: #64748b; margin-top: 2px; }
  .header-right .scan-id   { font-size: 13px; font-weight: 700; color: #0f172a; display: block; }
  .header-right .scan-date { font-size: 10.5px; color: #64748b; display: block; margin-top: 2px; }

  /* ── Section ── */
  .section { margin-bottom: 16px; page-break-inside: avoid; }
  .section-title {
    font-size: 9.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.18em; color: #94a3b8;
    padding-bottom: 5px; margin-bottom: 10px;
    border-bottom: 1px solid #e2e8f0;
  }

  /* ── Two-column table layout ── */
  .two-col { display: table; width: 100%; border-collapse: separate; border-spacing: 8px 0; }
  .col     { display: table-cell; width: 50%; vertical-align: top; }

  /* ── Info box ── */
  .box {
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    padding: 11px 13px;
    background: #f8fafc;
    height: 100%;
  }
  .lbl { font-size: 9.5px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }
  .val { font-size: 17px; font-weight: 700; color: #0f172a; }

  /* ── Badge ── */
  .badge {
    display: inline-block; padding: 2px 9px; border-radius: 999px;
    font-size: 10.5px; font-weight: 700; margin-top: 7px;
    background: ${isPcos ? "#fef3c7" : "#d1fae5"};
    color: ${accentColor};
    border: 1px solid ${accentColor};
  }

  /* ── Probability bars ── */
  .bar-wrap { margin-top: 6px; }
  .bar-row  { display: table; width: 100%; font-size: 11.5px; font-weight: 500; margin-bottom: 3px; }
  .bar-row span:first-child { display: table-cell; }
  .bar-row span:last-child  { display: table-cell; text-align: right; }
  .bar-track { height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
  .bar-fill  { height: 8px; border-radius: 999px; }

  /* ── Image pair ── */
  .img-pair { display: table; width: 100%; border-collapse: separate; border-spacing: 10px 0; margin-top: 10px; }
  .img-col  { display: table-cell; width: 50%; vertical-align: top; }
  .img-lbl  {
    display: block;
    font-size: 9.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.12em; color: #64748b;
    margin-bottom: 6px;
  }
  .img-col img {
    display: block;
    width: 100%;
    height: 195px;
    object-fit: cover;
    border-radius: 7px;
    border: 1px solid #e2e8f0;
  }
  .img-placeholder {
    display: block;
    width: 100%;
    height: 195px;
    border-radius: 7px;
    border: 1px dashed #cbd5e1;
    background: #f1f5f9;
    text-align: center;
    line-height: 195px;
    font-size: 10.5px;
    color: #94a3b8;
  }

  /* ── XAI box ── */
  .xai-box {
    margin-top: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    padding: 11px 13px;
    background: #f8fafc;
  }
  .xai-box .lbl { margin-bottom: 7px; }
  .legend-bar {
    height: 8px;
    border-radius: 999px;
    background: linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000);
    margin-bottom: 4px;
  }
  .legend-labels { display: table; width: 100%; font-size: 9.5px; color: #64748b; margin-bottom: 10px; }
  .legend-labels span:first-child { display: table-cell; text-align: left; }
  .legend-labels span:nth-child(2){ display: table-cell; text-align: center; }
  .legend-labels span:last-child  { display: table-cell; text-align: right; }
  .xai-interpret {
    font-size: 11px; color: #475569; line-height: 1.7;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
  }

  /* ── Recommendations ── */
  .rec-section { margin-bottom: 16px; page-break-inside: avoid; }
  .rec-category {
    border-radius: 7px;
    padding: 10px 13px;
    margin-bottom: 8px;
  }
  .rec-category-title {
    font-size: 9.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.14em; margin-bottom: 7px;
  }
  .rec-item {
    display: table;
    width: 100%;
    font-size: 11px;
    color: #1e293b;
    margin-bottom: 5px;
    line-height: 1.55;
  }
  .rec-dot  { display: table-cell; width: 10px; padding-top: 5px; vertical-align: top; }
  .rec-text { display: table-cell; vertical-align: top; }

  /* ── Disclaimer ── */
  .disclaimer {
    border: 1px solid #bae6fd; background: #f0f9ff;
    border-radius: 7px; padding: 10px 13px;
    font-size: 10.5px; color: #0369a1;
    margin-top: 18px; page-break-inside: avoid;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 20px;
    border-top: 1px solid #e2e8f0;
    padding-top: 9px;
    font-size: 9.5px; color: #94a3b8;
    display: table; width: 100%;
    page-break-inside: avoid;
  }
  .footer span:first-child { display: table-cell; }
  .footer span:last-child  { display: table-cell; text-align: right; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="header-brand">FemWell</div>
      <h1>PCOS Screening Report</h1>
      <div class="header-sub">AI-assisted multimodal analysis</div>
    </div>
    <div class="header-right">
      <span class="scan-id">${scan.id}</span>
      <span class="scan-date">${formatLongDate(scan.createdAt)}</span>
    </div>
  </div>

  <!-- Prediction Summary -->
  <div class="section">
    <div class="section-title">Prediction Summary</div>
    <div class="two-col">
      <div class="col">
        <div class="box">
          <div class="lbl">Final Prediction</div>
          <div class="val" style="color:${accentColor}">${scan.predictionLabel}</div>
          <span class="badge">${isPcos ? "PCOS Indicators Detected" : "Normal Indicators"}</span>
          <span style="display:inline-block;margin-top:6px;margin-left:6px;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700;background:${rc.bg};color:${rc.color};border:1px solid ${rc.border}">${risk.label}</span>
        </div>
      </div>
      <div class="col">
        <div class="box">
          <div class="lbl">PCOS Probability</div>
          <div class="val">${pcosDisplay}%</div>
          <div class="lbl" style="margin-top:9px">Confidence</div>
          <div style="font-weight:600;font-size:13.5px">${confDisplay}%</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Probability Breakdown -->
  <div class="section">
    <div class="section-title">Probability Breakdown</div>
    <div class="box">
      <div class="bar-wrap">
        <div class="bar-row"><span>PCOS</span><span>${pcosDisplay}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, parseFloat(pcosDisplay))}%;background:#f59e0b"></div></div>
      </div>
      <div class="bar-wrap" style="margin-top:11px">
        <div class="bar-row"><span>Normal</span><span>${normalDisplay}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, parseFloat(normalDisplay))}%;background:#10b981"></div></div>
      </div>
    </div>
  </div>

  <!-- Model Information -->
  <div class="section">
    <div class="section-title">Model Information</div>
    <div class="two-col">
      <div class="col">
        <div class="box"><div class="lbl">Model</div><div style="font-weight:600;font-size:12px">${scan.model || "—"}</div></div>
      </div>
      <div class="col">
        <div class="box"><div class="lbl">Analysis Type</div><div style="font-weight:600;font-size:12px">${scan.analysisType || "—"}</div></div>
      </div>
    </div>
  </div>

  <!-- Grad-CAM / Image -->
  ${gradcam ? `
  <div class="section">
    <div class="section-title">Explainable AI — Grad-CAM Heatmap</div>
    <div class="img-pair">
      <div class="img-col">
        <span class="img-lbl">Original Ultrasound</span>
        ${original
          ? `<img src="${original}" alt="Original Ultrasound"/>`
          : `<span class="img-placeholder">Not available</span>`
        }
      </div>
      <div class="img-col">
        <span class="img-lbl">Grad-CAM Overlay</span>
        <img src="${gradcam}" alt="Grad-CAM Overlay"/>
      </div>
    </div>
    <div class="xai-box">
      <div class="lbl">Heatmap Legend</div>
      <div class="legend-bar"></div>
      <div class="legend-labels">
        <span>Low influence</span>
        <span>Medium influence</span>
        <span>High influence</span>
      </div>
      <div class="xai-interpret">
        <strong>How to interpret:</strong>&nbsp; Red and yellow regions had the highest impact on the
        model's <strong>${isPcos ? "PCOS" : "Normal"}</strong> prediction. Blue regions had little to
        no influence. ${isPcos
          ? "Highlighted areas likely correspond to follicular clusters or ovarian morphology indicative of PCOS."
          : "Highlighted areas correspond to normal ovarian tissue features the model used to rule out PCOS."
        }
      </div>
    </div>
  </div>` : original ? `
  <div class="section">
    <div class="section-title">Ultrasound Image</div>
    <img src="${original}" alt="Ultrasound"
      style="display:block;width:240px;height:195px;object-fit:cover;border-radius:7px;border:1px solid #e2e8f0"/>
  </div>` : ""}

  <!-- Recommendations -->
  ${(recs.medical.length || recs.lifestyle.length || recs.followup.length) ? `
  <div class="rec-section">
    <div class="section-title">Recommendations</div>
    ${recs.medical.length ? `
    <div class="rec-category" style="background:#fff1f2;border:1px solid #fecdd3">
      <div class="rec-category-title" style="color:#be123c">&#9651; Medical</div>
      ${recs.medical.map(item => `
      <div class="rec-item">
        <span class="rec-dot"><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#be123c;margin-top:1px"></span></span>
        <span class="rec-text">${item}</span>
      </div>`).join("")}
    </div>` : ""}
    ${recs.lifestyle.length ? `
    <div class="rec-category" style="background:#fffbeb;border:1px solid #fde68a">
      <div class="rec-category-title" style="color:#b45309">&#9829; Lifestyle</div>
      ${recs.lifestyle.map(item => `
      <div class="rec-item">
        <span class="rec-dot"><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#b45309;margin-top:1px"></span></span>
        <span class="rec-text">${item}</span>
      </div>`).join("")}
    </div>` : ""}
  </div>` : ""}

  <!-- Disclaimer -->
  <div class="disclaimer">
    <strong>Disclaimer:</strong>&nbsp; FemWell is an AI-assisted screening tool. This result is not a
    medical diagnosis and should not replace evaluation by a qualified healthcare professional.
  </div>

  <!-- Footer -->
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
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1500);
  }, 600);
}
