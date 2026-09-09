import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ScanLine, ClipboardList, Cpu, BarChart2, FileDown, GitMerge,
  ChevronDown, ChevronUp, HelpCircle, BookOpen, Lightbulb, ShieldCheck,
} from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";

// ── Workflow steps ────────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: ScanLine,
    color: "bg-violet-100 text-violet-600",
    title: "Upload Ultrasound",
    desc: "Select a JPG or PNG ovarian ultrasound image (max 10 MB). The image is processed locally — nothing is sent to external servers.",
    link: "/new-scan",
    linkLabel: "Go to New Scan",
  },
  {
    icon: ClipboardList,
    color: "bg-sky-100 text-sky-600",
    title: "Enter Clinical Data",
    desc: "Fill in the 15 clinical features — age, hormone levels (LH, AMH, PRL), follicle counts, blood pressure, cycle length, and more. These feed the clinical model alongside the image.",
    link: "/new-scan",
    linkLabel: "Open Clinical Form",
  },
  {
    icon: Cpu,
    color: "bg-amber-100 text-amber-600",
    title: "Run Multimodal Analysis",
    desc: "FemWell runs two models in parallel — a ResNet-50 image classifier and a clinical MLP — then fuses their outputs with equal-weight averaging for a final PCOS probability.",
    link: null,
    linkLabel: null,
  },
  {
    icon: BarChart2,
    color: "bg-emerald-100 text-emerald-600",
    title: "Review Results & Grad-CAM",
    desc: "See fused, image, and clinical probability bars. The Grad-CAM heatmap highlights which ultrasound regions drove the prediction. Personalised recommendations are generated based on risk level.",
    link: "/history",
    linkLabel: "View Saved Scans",
  },
  {
    icon: FileDown,
    color: "bg-rose-100 text-rose-600",
    title: "Save & Export Report",
    desc: "Save the scan to local history, then download a PDF report containing the image, Grad-CAM overlay, probabilities, clinical values, and recommendations.",
    link: "/reports",
    linkLabel: "Go to Reports",
  },
  {
    icon: GitMerge,
    color: "bg-indigo-100 text-indigo-600",
    title: "Federated Learning",
    desc: "Scans are logged per hospital node. Start a federated training round to aggregate model weights across nodes without sharing raw patient data. Monitor live round metrics and download global weights.",
    link: "/federation",
    linkLabel: "Open Federation",
  },
];

// ── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: BarChart2,
    color: "text-violet-600",
    title: "Compare Scans",
    desc: "Select any two saved scans from history and open a side-by-side comparison of probabilities, confidence, clinical values, and Grad-CAM overlays.",
    link: "/compare",
  },
  {
    icon: FileDown,
    color: "text-sky-600",
    title: "PDF Reports",
    desc: "Every saved scan can be exported as a formatted PDF — includes the original ultrasound, Grad-CAM heatmap, probability breakdown, and clinical summary.",
    link: "/reports",
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-600",
    title: "Privacy First",
    desc: "All scan data is stored in your browser's localStorage. No images or clinical values are uploaded to any external server. Clear history at any time from Settings.",
    link: "/settings",
  },
  {
    icon: GitMerge,
    color: "text-indigo-600",
    title: "Federated Learning",
    desc: "Hospital nodes train locally and share only model weight updates. The global model improves across institutions without centralising patient data.",
    link: "/federation",
  },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "Is this a medical diagnosis tool?",
    a: "No. FemWell is an AI-assisted screening aid. Results are not a substitute for evaluation by a qualified healthcare professional. Always consult a doctor for diagnosis and treatment.",
  },
  {
    q: "What image formats are supported?",
    a: "JPG, JPEG, and PNG. The file must be under 10 MB. For best results use a clear, greyscale ovarian ultrasound image.",
  },
  {
    q: "Where is my data stored?",
    a: "Scan images, clinical values, and results are stored only in your browser's localStorage. Nothing is sent to external servers. You can export or clear your history from the Settings page.",
  },
  {
    q: "What are the 15 clinical features?",
    a: "Age, Height, Pulse Rate, Random Blood Sugar, Systolic BP, Cycle Length, LH, AMH, Prolactin (PRL), Vitamin D3, Follicle Count (Right & Left), Avg. Follicle Size (Right), Beta-HCG I, and Beta-HCG II.",
  },
  {
    q: "What does the Grad-CAM heatmap show?",
    a: "Grad-CAM (Gradient-weighted Class Activation Mapping) highlights which regions of the ultrasound image most influenced the model's prediction. Red/yellow areas had the highest impact; blue areas had little influence.",
  },
  {
    q: "What is federated learning and why does it matter?",
    a: "Federated learning trains the AI model across multiple hospital nodes without sharing raw patient data. Each node trains locally and only shares weight updates. This improves model accuracy while preserving patient privacy.",
  },
  {
    q: "Can I compare two scans?",
    a: "Yes. In Scan History, check the checkbox on any two scans, then click 'Compare Selected'. You can also tick scans from the Recent Scans list on the Dashboard.",
  },
  {
    q: "Why does the confidence differ from the PCOS probability?",
    a: "Confidence reflects the model's certainty in its prediction (the higher of the two class probabilities). PCOS probability is specifically the likelihood of PCOS regardless of which class was predicted.",
  },
];

// ── Tips ──────────────────────────────────────────────────────────────────────
const TIPS = [
  "Use a clear, well-lit greyscale ovarian ultrasound for the most accurate image model output.",
  "Fill in all 15 clinical fields — missing values reduce the clinical model's accuracy.",
  "After saving a scan, open it from Scan History to view the full Grad-CAM and XAI breakdown.",
  "Use the global search bar (top right) to filter scans by ID, file name, or prediction across all pages.",
  "Export your scan history as JSON from Settings before clearing, so you have a backup.",
  "Run federated training after logging scans from multiple hospital nodes for a more generalised global model.",
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--color-border)] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors"
      >
        {q}
        {open
          ? <ChevronUp className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
        }
      </button>
      {open && (
        <p className="pb-4 text-sm leading-6 text-[var(--color-muted-foreground)]">{a}</p>
      )}
    </div>
  );
}

function SectionHeading({ icon: Icon, label, title }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-[var(--color-primary)]" />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">{label}</p>
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">{title}</h2>
    </div>
  );
}

function Help() {
  return (
    <div className="space-y-12">

      {/* ── Hero ── */}
      <Card className="overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#1e3a5f_60%,#1a4a7a_100%)] text-white">
        <p className="text-xs font-bold tracking-[0.22em] uppercase text-[#38bdf8]">Help & Guide</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] leading-snug max-w-lg">
          Everything you need to use FemWell
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
          Learn how to run a scan, interpret results, use Grad-CAM, compare screenings, export reports, and understand federated learning.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button as={Link} to="/new-scan" className="bg-[#38bdf8] text-slate-950 font-bold hover:bg-[#7dd3fc]">
            Start a Scan
          </Button>
          <Button as={Link} to="/history" variant="ghost" className="border-2 border-white/40 text-white font-bold hover:bg-white hover:text-slate-950">
            View History
          </Button>
        </div>
      </Card>

      {/* ── Workflow ── */}
      <section>
        <SectionHeading icon={BookOpen} label="Workflow" title="How FemWell works — step by step" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${step.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white shrink-0">
                        {i + 1}
                      </span>
                      <p className="font-semibold text-[var(--color-foreground)]">{step.title}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{step.desc}</p>
                  </div>
                </div>
                {step.link && (
                  <Button as={Link} to={step.link} variant="secondary" className="mt-auto w-full justify-center text-xs">
                    {step.linkLabel}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Features ── */}
      <section>
        <SectionHeading icon={Lightbulb} label="Features" title="What you can do with FemWell" />
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="flex gap-4">
                <Icon className={`h-6 w-6 shrink-0 mt-0.5 ${f.color}`} />
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">{f.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">{f.desc}</p>
                  <Button as={Link} to={f.link} variant="ghost" className="mt-3 px-0 text-xs text-[var(--color-primary)] hover:underline">
                    Open →
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Tips ── */}
      <section>
        <SectionHeading icon={Lightbulb} label="Tips" title="Get the best results" />
        <Card className="space-y-3">
          {TIPS.map((tip, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm leading-6 text-[var(--color-foreground)]">{tip}</p>
            </div>
          ))}
        </Card>
      </section>

      {/* ── FAQ ── */}
      <section>
        <SectionHeading icon={HelpCircle} label="FAQ" title="Frequently asked questions" />
        <Card>
          {FAQS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </Card>
      </section>

      {/* ── Disclaimer ── */}
      <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-4 text-sm leading-6 text-cyan-800">
        FemWell is an AI-assisted screening tool based on ultrasound image and clinical data analysis. Results are not a medical diagnosis and should not replace evaluation by a qualified healthcare professional.
      </div>

    </div>
  );
}

export default Help;
