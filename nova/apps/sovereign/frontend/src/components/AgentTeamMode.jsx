import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Palette, Code2, ShieldCheck, FileText, Plug, Zap, Loader2, Wrench,
  CheckCircle2, ChevronDown, Gavel, Copy, Download, ClipboardCheck, SkipForward,
} from "lucide-react";
import { errText, streamPost } from "@/api";
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

const STATUS_LABEL = {
  queued: "Queued",
  running: "Running",
  done: "Done",
  error: "Error",
  skipped: "Skipped",
};

function AgentCard({ agent, index, expanded, onToggle }) {
  const meta = ROLE_META[agent.role] || { icon: Zap, label: agent.role };
  const Icon = meta.icon;
  const running = agent.status === "running";
  const done = agent.status === "done";
  const skipped = agent.status === "skipped";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-2xl ${running ? "tracing" : ""}`}
      data-testid={`agent-card-${agent.role}`}
    >
      <div className="glass h-full rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              done
                ? "border-[#00FF9D]/40 bg-[#00FF9D]/10 text-[#00FF9D]"
                : running
                  ? "border-[#00E5FF]/40 bg-[#00E5FF]/10 text-[#00E5FF]"
                  : skipped
                    ? "border-white/10 bg-black/40 text-zinc-600"
                    : "border-white/10 bg-black/40 text-zinc-500"
            } ${running ? "pulse-dot" : ""}`}
          >
            {skipped ? <SkipForward size={18} /> : <Icon size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-bold text-white">{meta.label}</h3>
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  done
                    ? "text-[#00FF9D]"
                    : running
                      ? "text-[#00E5FF]"
                      : agent.status === "error"
                        ? "text-[#FF3366]"
                        : skipped
                          ? "text-zinc-600"
                          : "text-zinc-500"
                }`}
                data-testid={`agent-status-${agent.role}`}
              >
                {STATUS_LABEL[agent.status] || agent.status}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
              {skipped ? agent.reason || "Skipped" : agent.order}
            </p>
          </div>
        </div>

        {done && (
          <button
            onClick={onToggle}
            data-testid={`agent-toggle-${agent.role}`}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-[#00FF9D]" /> View output
            </span>
            <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}

        <AnimatePresence>
          {expanded && done && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
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

export default function AgentTeamMode({ activeModel, ready }) {
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState("");
  const [ack, setAck] = useState("");
  const [agents, setAgents] = useState([]);
  const [verdict, setVerdict] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [copied, setCopied] = useState(false);
  const [runId, setRunId] = useState("");
  const abortRef = useRef(null);

  const verdictPass = verdict && /VERDICT:\s*PASS/i.test(verdict);

  const upsertAgent = (role, patch) => {
    setAgents((prev) => {
      const idx = prev.findIndex((a) => a.role === role);
      if (idx === -1) {
        return [...prev, { role, name: ROLE_META[role]?.label || role, order: "", status: "queued", output: "", ...patch }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const buildReport = () => {
    const stamp = new Date().toISOString();
    let md = `# NOVA · Agent Team Report\n\n`;
    md += `**Goal:** ${goal}\n\n`;
    md += `**Model:** ${activeModel}\n\n`;
    if (runId) md += `**Run:** ${runId}\n\n`;
    md += `**Generated:** ${stamp}\n\n---\n\n`;
    if (ack) md += `## Genie · Plan\n\n${ack}\n\n`;
    agents.forEach((a) => {
      const label = ROLE_META[a.role]?.label || a.role;
      if (a.status === "skipped") {
        md += `## ${label}\n\n_(skipped: ${a.reason || "n/a"})_\n\n`;
        return;
      }
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
    if (!g || running || !ready) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    setError("");
    setAck("");
    setVerdict("");
    setAgents([]);
    setExpanded({});
    setStage("plan");
    setRunId("");
    try {
      await streamPost(
        "/agents/run",
        { goal: g, model: activeModel },
        (evt) => {
          if (evt.run_id) setRunId(evt.run_id);
          switch (evt.type) {
            case "stage_start":
              setStage(evt.stage);
              if (evt.stage !== "plan" && evt.stage !== "critic") {
                upsertAgent(evt.stage, {
                  status: "running",
                  order: evt.order || "",
                  name: evt.name || ROLE_META[evt.stage]?.label || evt.stage,
                });
              }
              break;
            case "plan":
              setAck(evt.acknowledgement || "");
              setAgents(
                (evt.orders || []).map((o) => ({
                  ...o,
                  status: "queued",
                  output: "",
                })),
              );
              break;
            case "stage_done":
              if (evt.skipped && evt.stage === "repair") {
                upsertAgent("repair", {
                  status: "skipped",
                  reason: evt.reason || "qa_pass_or_no_qa",
                  order: "",
                });
              } else if (evt.stage !== "plan" && evt.stage !== "critic" && evt.output != null) {
                upsertAgent(evt.stage, {
                  status: evt.error ? "error" : "done",
                  output: evt.output,
                  order: evt.order,
                  name: evt.name,
                });
              }
              break;
            case "critic":
              setVerdict(evt.verdict || "");
              break;
            case "final":
              if (evt.verdict) setVerdict(evt.verdict);
              if (Array.isArray(evt.results)) {
                setAgents((prev) => {
                  const byRole = Object.fromEntries(prev.map((a) => [a.role, a]));
                  evt.results.forEach((r) => {
                    byRole[r.role] = {
                      ...(byRole[r.role] || {}),
                      role: r.role,
                      name: r.name,
                      order: r.order,
                      output: r.output,
                      status: "done",
                    };
                  });
                  return Object.values(byRole);
                });
              }
              break;
            case "error":
              setError(evt.error || "Mission failed");
              break;
            case "done":
              setStage(evt.ok ? "complete" : "failed");
              break;
            default:
              break;
          }
        },
        { signal: ac.signal },
      );
    } catch (e) {
      if (e?.name !== "AbortError") setError(errText(e));
    } finally {
      setRunning(false);
      setStage((s) => (s === "complete" || s === "failed" ? s : ""));
    }
  };

  const stageLabel = stage === "plan"
    ? "Genie planning…"
    : stage === "critic"
      ? "QA critic judging…"
      : stage === "complete"
        ? "Mission complete"
        : stage && ROLE_META[stage]
          ? `${ROLE_META[stage].label} working…`
          : running
            ? "Team working…"
            : "";

  return (
    <div className="h-full overflow-y-auto px-5 py-6" data-testid="agent-team-mode">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#00FF9D]">
            <Zap size={12} /> Command Center
          </div>
          <textarea
            rows={2}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) deploy();
            }}
            placeholder="Give the team a mission — e.g. 'Design and build a landing page for a coffee subscription startup'"
            disabled={!ready || running}
            data-testid="goal-input"
            className="w-full resize-none border-b-2 border-white/10 bg-transparent pb-3 font-heading text-2xl font-semibold text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-[#00FF9D] disabled:opacity-60"
          />
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="font-mono text-[11px] text-zinc-600">
              {ready
                ? running && stageLabel
                  ? stageLabel
                  : "Backend pipeline · parallel waves · artifact handoffs · critic gate"
                : "Add an OpenRouter key or start Ollama"}
            </p>
            <button
              onClick={deploy}
              disabled={running || !goal.trim() || !ready}
              data-testid="deploy-team-btn"
              className="glow-primary inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#00FF9D] px-6 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {running ? <Loader2 size={17} className="animate-spin" /> : <Zap size={17} />}
              {running ? "Team working…" : "Deploy Team"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-[#FF3366]/30 bg-[#FF3366]/10 px-4 py-3 text-sm text-[#FF3366]" data-testid="agent-error">
            {error}
          </div>
        )}

        {ack && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass mb-6 rounded-2xl p-5"
            data-testid="genie-plan"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="glow-primary flex h-7 w-7 items-center justify-center rounded-lg bg-[#00FF9D] text-black">
                <Zap size={15} />
              </div>
              <h2 className="font-heading text-sm font-bold">Genie · Plan</h2>
              {runId && (
                <span className="ml-auto font-mono text-[10px] text-zinc-600" data-testid="run-id">
                  {runId.slice(0, 8)}
                </span>
              )}
            </div>
            <div className="text-[13px] text-zinc-300">
              <Markdown>{ack}</Markdown>
            </div>
          </motion.div>
        )}

        {agents.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Specialist Agents</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyReport}
                  data-testid="copy-report-btn"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:border-[#00FF9D]/50 hover:text-white"
                >
                  {copied ? (
                    <>
                      <ClipboardCheck size={13} className="text-[#00FF9D]" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copy report
                    </>
                  )}
                </button>
                <button
                  onClick={downloadReport}
                  data-testid="download-report-btn"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:border-[#00FF9D]/50 hover:text-white"
                >
                  <Download size={13} /> Download .md
                </button>
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((a, i) => (
                <AgentCard
                  key={a.role}
                  agent={a}
                  index={i}
                  expanded={!!expanded[a.role]}
                  onToggle={() => setExpanded((e) => ({ ...e, [a.role]: !e[a.role] }))}
                />
              ))}
            </div>
          </>
        )}

        {verdict && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass rounded-2xl border-l-4 p-5 ${verdictPass ? "border-l-[#00FF9D]" : "border-l-[#FFB020]"}`}
            data-testid="critic-verdict"
          >
            <div className="mb-2 flex items-center gap-2">
              <Gavel size={16} className={verdictPass ? "text-[#00FF9D]" : "text-[#FFB020]"} />
              <h2 className="font-heading text-sm font-bold">QA Critic Verdict</h2>
            </div>
            <div className="text-[13px] text-zinc-200">
              <Markdown>{verdict}</Markdown>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
