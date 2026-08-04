import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, Cpu, Boxes, Terminal, GitBranch, FolderTree, Rocket, Brain, LayoutDashboard, Server, ShieldCheck, PlayCircle, Loader2, CheckCircle2, XCircle, ChevronDown, Copy, ClipboardCheck } from "lucide-react";
import { api, errText, API } from "@/api";

const TREE = [
  { label: "Core Engine", icon: Cpu, depth: 0 },
  { label: "Agent System", icon: Boxes, depth: 0 },
  { label: "Planner", icon: Brain, depth: 1 },
  { label: "Coder", icon: Terminal, depth: 1 },
  { label: "Tester", icon: ShieldCheck, depth: 1 },
  { label: "Repair Agent", icon: Activity, depth: 1 },
  { label: "Interface", icon: LayoutDashboard, depth: 0 },
  { label: "Open WebUI", icon: Server, depth: 1 },
  { label: "Dashboard", icon: LayoutDashboard, depth: 1 },
  { label: "Model Gateway", icon: Cpu, depth: 0 },
  { label: "OpenRouter / OpenAI-compatible API", icon: Cpu, depth: 1 },
  { label: "Memory", icon: Brain, depth: 0 },
  { label: "Tools", icon: Boxes, depth: 0 },
  { label: "Terminal", icon: Terminal, depth: 1 },
  { label: "Git", icon: GitBranch, depth: 1 },
  { label: "File manager", icon: FolderTree, depth: 1 },
  { label: "Deployment", icon: Rocket, depth: 1 },
  { label: "Health System", icon: Activity, depth: 0 },
];

function StatDot({ ok }) {
  return (<span className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-[#00FF9D] pulse-dot" : "bg-[#FF3366]"}`} />);
}

export default function DashboardMode({ ready }) {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [proof, setProof] = useState(null);
  const [proving, setProving] = useState(false);
  const [error, setError] = useState("");
  const [openStep, setOpenStep] = useState(null);
  const [copied, setCopied] = useState(false);

  const gatewayBase = `${API}/v1`;

  const loadHealth = () => {
    setLoadingHealth(true);
    api.systemHealth().then(setHealth).catch(() => {}).finally(() => setLoadingHealth(false));
  };

  useEffect(() => { loadHealth(); }, []);

  const runProof = async () => {
    if (proving || !ready) return;
    setProving(true); setError(""); setProof(null);
    try {
      const res = await api.prove();
      setProof(res);
    } catch (e) {
      setError(errText(e));
    } finally {
      setProving(false);
    }
  };

  const copyBase = async () => {
    try { await navigator.clipboard.writeText(gatewayBase); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div className="h-full overflow-y-auto px-5 py-6" data-testid="dashboard-mode">
      <div className="mx-auto max-w-6xl">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.25em] text-[#00FF9D]">NOVA MASTER</div>
        <h1 className="mb-6 font-heading text-3xl font-extrabold">Control Dashboard</h1>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="glass rounded-2xl p-5 lg:row-span-2" data-testid="system-tree">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-bold"><Boxes size={16} className="text-[#00FF9D]" /> System Map</h2>
            <div className="space-y-0.5">
              {TREE.map((n) => {
                const Icon = n.icon;
                return (
                  <div key={n.label} className={`flex items-center gap-2 rounded-md py-1.5 text-sm ${n.depth === 0 ? "text-white" : "text-zinc-400"}`} style={{ paddingLeft: `${n.depth * 18}px` }}>
                    {n.depth === 1 && <span className="font-mono text-zinc-700">└─</span>}
                    <Icon size={n.depth === 0 ? 15 : 13} className={n.depth === 0 ? "text-[#00E5FF]" : "text-zinc-500"} />
                    <span className={n.depth === 0 ? "font-medium" : "font-mono text-xs"}>{n.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-2xl p-5 lg:col-span-2" data-testid="health-panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-heading text-sm font-bold"><Activity size={16} className="text-[#00FF9D]" /> Health System</h2>
              {health && (<span className="font-mono text-xs text-[#00FF9D]">{health.healthy}/{health.total} healthy</span>)}
            </div>
            {loadingHealth ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 size={15} className="animate-spin" /> checking subsystems…</div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {health?.checks?.map((c) => (
                  <div key={c.name} className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-black/30 px-3 py-2.5" data-testid={`health-${c.name}`}>
                    <StatDot ok={c.ok} />
                    <div className="min-w-0">
                      <div className="text-sm text-zinc-100">{c.name}</div>
                      <div className="truncate font-mono text-[10px] text-zinc-500">{c.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-5 lg:col-span-2" data-testid="gateway-panel">
            <h2 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold"><Server size={16} className="text-[#00FF9D]" /> Model Gateway · Connect Open WebUI</h2>
            <p className="mb-3 text-sm text-zinc-400">NOVA exposes an OpenAI-compatible endpoint. Point Open WebUI (podman) at it — every model is a free OpenRouter model, no key in the browser.</p>
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
              <span className="font-mono text-[10px] uppercase text-zinc-500">Base URL</span>
              <code className="flex-1 truncate font-mono text-xs text-[#00E5FF]">{gatewayBase}</code>
              <button onClick={copyBase} data-testid="copy-gateway-btn" className="rounded-md p-1 text-zinc-400 hover:text-white">
                {copied ? <ClipboardCheck size={14} className="text-[#00FF9D]" /> : <Copy size={14} />}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
{`# deploy/open-webui/
NOVA_BASE_URL="${API.replace(/\/api$/, "")}" ./start.sh
# -> http://localhost:3080  (free models in the picker)`}
            </pre>
          </div>

          <div className="glass rounded-2xl p-5 lg:col-span-3" data-testid="prove-panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-heading text-sm font-bold"><PlayCircle size={16} className="text-[#00FF9D]" /> Phase 5 · Prove It</h2>
              <button onClick={runProof} disabled={proving || !ready} data-testid="run-proof-btn"
                className="glow-primary inline-flex items-center gap-2 rounded-xl bg-[#00FF9D] px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0">
                {proving ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                {proving ? "Proving…" : "Run self-proof"}
              </button>
            </div>

            {error && (<div className="mb-3 text-sm text-[#FF3366]" data-testid="prove-error">{error}</div>)}

            {!proof && !proving && (
              <p className="text-sm text-zinc-500">Runs a live, sandboxed self-demonstration: reads its own repo, explains its architecture, modifies a test, runs it, reports the diff, restores from backup, and prepares deployment.</p>
            )}

            {proof && (
              <>
                <div className="mb-3 font-mono text-xs text-[#00FF9D]">{proof.passed}/{proof.total} checks passed · workspace {proof.workspace}</div>
                <div className="space-y-2">
                  {proof.steps.map((s, i) => (
                    <motion.div key={s.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="rounded-xl border border-white/5 bg-black/30" data-testid={`prove-step-${i}`}>
                      <button onClick={() => setOpenStep(openStep === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                        {s.ok ? (<CheckCircle2 size={17} className="text-[#00FF9D]" />) : (<XCircle size={17} className="text-[#FF3366]" />)}
                        <span className="flex-1 text-sm text-zinc-100">{s.name}</span>
                        <ChevronDown size={15} className={`text-zinc-500 transition-transform ${openStep === i ? "rotate-180" : ""}`} />
                      </button>
                      {openStep === i && (
                        <pre className="mx-4 mb-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
                          {s.detail || "(no output)"}
                        </pre>
                      )}
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
