import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Palette, Code2, ShieldCheck, FileText, Plug, Zap, Loader2, Wrench, CheckCircle2, ChevronDown, Gavel, Copy, Download, ClipboardCheck } from "lucide-react";
import { api, errText } from "@/api";
import Markdown from "@/components/Markdown";

const ROLE_META = {
  research: { icon: Search, label: "Research" },
  design: { icon: Palette, label: "Design" },
  code: { icon: Code2, label: "Coding" },
  qa: { icon: ShieldCheck, label: "QA" },
  report: { icon: FileText, label: "Reporting" },
  integration: { icon: Plug, label: "Integration" },
  repair: { icon: Wrench, label: "Repair" },
};

const STATUS_LABEL = { queued: "Queued", running: "Running", done: "Done", error: "Error" };

function AgentCard({ agent, index, expanded, onToggle }) {
  const meta = ROLE_META[agent.role] || { icon: Zap, label: agent.role };
  const Icon = meta.icon;
  const running = agent.status === "running";
  const done = agent.status === "done";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={`rounded-2xl ${running ? "tracing" : ""}`} data-testid={`agent-card-${agent.role}`}>
      <div className="glass h-full rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${done ? "border-[#00FF9D]/40 bg-[#00FF9D]/10 text-[#00FF9D]" : running ? "border-[#00E5FF]/40 bg-[#00E5FF]/10 text-[#00E5FF]" : "border-white/10 bg-black/40 text-zinc-500"} ${running ? "pulse-dot" : ""}`}>
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-bold text-white">{meta.label}</h3>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${done ? "text-[#00FF9D]" : running ? "text-[#00E5FF]" : agent.status === "error" ? "text-[#FF3366]" : "text-zinc-500"}`} data-testid={`agent-status-${agent.role}`}>
                {STATUS_LABEL[agent.status]}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{agent.order}</p>
          </div>
        </div>

        {done && (
          <button onClick={onToggle} data-testid={`agent-toggle-${agent.role}`}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[#00FF9D]" /> View output</span>
            <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}

        <AnimatePresence>
          {expanded && done && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 max-h-96 overflow-y-auto rounded-lg border border-white/5 bg-black/40 p-3 text-[13px] text-zinc-200">
                <Markdown>{agent.output}</Markdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function AgentTeamMode({ activeModel, hasKey }) {
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);
  const [ack, setAck] = useState("");
  const [agents, setAgents] = useState([]);
  const [verdict, setVerdict] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [copied, setCopied] = useState(false);

  const verdictPass = verdict && /VERDICT:\s*PASS/i.test(verdict);

  const buildReport = () => {
    const stamp = new Date().toISOString();
    let md = `# NOVA · Agent Team Report\n\n`;
    md += `**Goal:** ${goal}\n\n`;
    md += `**Model:** ${activeModel}\n\n`;
    md += `**Generated:** ${stamp}\n\n---\n\n`;
    if (ack) md += `## Genie · Plan\n\n${ack}\n\n`;
    agents.forEach((a) => {
      const label = ROLE_META[a.role]?.label || a.role;
      md += `## ${label}\n\n> Order: ${a.order}\n\n${a.output || "_(no output)_"}\n\n`;
    });
    if (verdict) md += `## QA Critic Verdict\n\n${verdict}\n`;
    return md;
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked */ }
  };

  const downloadReport = () => {
    const blob = new Blob([buildReport()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nova-agent-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const deploy = async () => {
    const g = goal.trim();
    if (!g || running || !hasKey) return;
    setRunning(true); setError(""); setAck(""); setVerdict(""); setAgents([]); setExpanded({});
    try {
      const plan = await api.plan({ goal: g, model: activeModel });
      setAck(plan.acknowledgement);
      let list = plan.orders.map((o) => ({ ...o, status: "queued", output: "" }));
      setAgents(list);
      for (let i = 0; i < list.length; i++) {
        list = list.map((a, idx) => (idx === i ? { ...a, status: "running" } : a));
        setAgents([...list]);
        try {
          const res = await api.dispatch({ goal: g, role: list[i].role, order: list[i].order, model: activeModel });
          list = list.map((a, idx) => (idx === i ? { ...a, status: "done", output: res.output } : a));
        } catch (e) {
          list = list.map((a, idx) => (idx === i ? { ...a, status: "error", output: errText(e) } : a));
        }
        setAgents([...list]);
      }
      const done = list.filter((a) => a.status === "done");
      if (done.length) {
        const cr = await api.critic({ goal: g, results: done, model: activeModel });
        setVerdict(cr.verdict);
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-5 py-6" data-testid="agent-team-mode">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#00FF9D]">
            <Zap size={12} /> Command Center
          </div>
          <textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) deploy(); }}
            placeholder="Give the team a mission — e.g. 'Design and build a landing page for a coffee subscription startup'"
            disabled={!hasKey || running} data-testid="goal-input"
            className="w-full resize-none border-b-2 border-white/10 bg-transparent pb-3 font-heading text-2xl font-semibold text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-[#00FF9D] disabled:opacity-60" />
          <div className="mt-4 flex items-center justify-between">
            <p className="font-mono text-[11px] text-zinc-600">
              {hasKey ? "Genie plans → specialists dispatch → QA critic gates" : "Add an OpenRouter key in Settings"}
            </p>
            <button onClick={deploy} disabled={running || !goal.trim() || !hasKey} data-testid="deploy-team-btn"
              className="glow-primary inline-flex items-center gap-2 rounded-xl bg-[#00FF9D] px-6 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0">
              {running ? <Loader2 size={17} className="animate-spin" /> : <Zap size={17} />}
              {running ? "Team working…" : "Deploy Team"}
            </button>
          </div>
        </div>

        {error && (<div className="mb-6 rounded-xl border border-[#FF3366]/30 bg-[#FF3366]/10 px-4 py-3 text-sm text-[#FF3366]" data-testid="agent-error">{error}</div>)}

        {ack && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass mb-6 rounded-2xl p-5" data-testid="genie-plan">
            <div className="mb-2 flex items-center gap-2">
              <div className="glow-primary flex h-7 w-7 items-center justify-center rounded-lg bg-[#00FF9D] text-black"><Zap size={15} /></div>
              <h2 className="font-heading text-sm font-bold">Genie · Plan</h2>
            </div>
            <div className="text-[13px] text-zinc-300"><Markdown>{ack}</Markdown></div>
          </motion.div>
        )}

        {agents.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Specialist Agents</h2>
              <div className="flex items-center gap-2">
                <button onClick={copyReport} data-testid="copy-report-btn"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:border-[#00FF9D]/50 hover:text-white">
                  {copied ? (<><ClipboardCheck size={13} className="text-[#00FF9D]" /> Copied</>) : (<><Copy size={13} /> Copy report</>)}
                </button>
                <button onClick={downloadReport} data-testid="download-report-btn"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:border-[#00FF9D]/50 hover:text-white">
                  <Download size={13} /> Download .md
                </button>
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((a, i) => (
                <AgentCard key={a.role} agent={a} index={i} expanded={!!expanded[a.role]}
                  onToggle={() => setExpanded((e) => ({ ...e, [a.role]: !e[a.role] }))} />
              ))}
            </div>
          </>
        )}

        {verdict && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`glass rounded-2xl border-l-4 p-5 ${verdictPass ? "border-l-[#00FF9D]" : "border-l-[#FFB020]"}`} data-testid="critic-verdict">
            <div className="mb-2 flex items-center gap-2">
              <Gavel size={16} className={verdictPass ? "text-[#00FF9D]" : "text-[#FFB020]"} />
              <h2 className="font-heading text-sm font-bold">QA Critic Verdict</h2>
            </div>
            <div className="text-[13px] text-zinc-200"><Markdown>{verdict}</Markdown></div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
