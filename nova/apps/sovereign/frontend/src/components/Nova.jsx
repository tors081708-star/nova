import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MessagesSquare, Boxes, Settings2, Sparkles, ChevronDown, LayoutDashboard } from "lucide-react";
import { api } from "@/api";
import ChatMode from "@/components/ChatMode";
import AgentTeamMode from "@/components/AgentTeamMode";
import DashboardMode from "@/components/DashboardMode";
import SettingsDialog from "@/components/SettingsDialog";

export default function Nova() {
  const [mode, setMode] = useState("chat");
  const [settings, setSettings] = useState({ has_key: false, model: "" });
  const [models, setModels] = useState([]);
  const [activeModel, setActiveModel] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const loadModels = useCallback(async () => {
    try {
      const m = await api.getModels();
      setModels(m.models || []);
      setActiveModel(m.active || "");
    } catch (e) { /* backend may lack a key yet */ }
  }, []);

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      setActiveModel(s.model);
      if (!s.has_key) setShowSettings(true);
    });
    loadModels();
  }, [loadModels]);

  const pickModel = async (m) => {
    setActiveModel(m);
    setModelOpen(false);
    await api.saveSettings({ model: m });
  };

  const navItems = [
    { id: "chat", label: "Chat", icon: MessagesSquare },
    { id: "agents", label: "Agent Team", icon: Boxes },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  return (
    <div className="nova-bg flex h-screen w-screen overflow-hidden text-white">
      <aside className="glass z-40 flex w-[76px] flex-col items-center gap-2 border-r border-white/10 py-5 md:w-[240px] md:items-stretch md:px-4" data-testid="nav-rail">
        <div className="mb-6 flex items-center gap-2.5 px-1 md:px-2">
          <div className="glow-primary flex h-9 w-9 items-center justify-center rounded-xl bg-[#00FF9D] text-black">
            <Sparkles size={18} />
          </div>
          <div className="hidden md:block">
            <div className="font-heading text-lg font-extrabold leading-none tracking-tight">NOVA</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00FF9D]">Sovereign AI</div>
          </div>
        </div>

        {navItems.map((n) => {
          const Icon = n.icon;
          const active = mode === n.id;
          return (
            <button key={n.id} onClick={() => setMode(n.id)} data-testid={`nav-${n.id}`}
              className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors md:justify-start ${active ? "bg-white/[0.07] text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
            >
              <Icon size={20} className={active ? "text-[#00FF9D]" : ""} />
              <span className="hidden text-sm font-medium md:inline">{n.label}</span>
              {active && (<motion.span layoutId="nav-active" className="ml-auto hidden h-2 w-2 rounded-full bg-[#00FF9D] md:block" />)}
            </button>
          );
        })}

        <div className="mt-auto">
          <button onClick={() => setShowSettings(true)} data-testid="nav-settings"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
            <Settings2 size={20} />
            <span className="hidden text-sm font-medium md:inline">Settings</span>
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="glass z-30 flex items-center justify-between border-b border-white/10 px-5 py-3" data-testid="model-status-bar">
          <div className="flex items-center gap-2.5">
            <span className={`pulse-dot h-2.5 w-2.5 rounded-full ${settings.has_key ? "bg-[#00FF9D]" : "bg-[#FF3366]"}`} />
            <span className="font-mono text-xs text-zinc-400">
              {settings.has_key ? "OpenRouter · free tier" : "No key — configure in Settings"}
            </span>
          </div>

          <div className="relative">
            <button onClick={() => setModelOpen((o) => !o)} data-testid="model-switcher"
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-white hover:border-[#00FF9D]/50">
              <span className="max-w-[240px] truncate">{activeModel || "select model"}</span>
              <ChevronDown size={14} className={`transition-transform ${modelOpen ? "rotate-180" : ""}`} />
            </button>
            {modelOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setModelOpen(false)} />
                <div className="glass absolute right-0 z-50 mt-2 max-h-80 w-[320px] overflow-y-auto rounded-xl p-1.5" data-testid="model-list">
                  {models.length === 0 && (<div className="px-3 py-2 font-mono text-xs text-zinc-500">No models loaded</div>)}
                  {models.map((m) => (
                    <button key={m} onClick={() => pickModel(m)} data-testid={`model-option-${m}`}
                      className={`block w-full truncate rounded-lg px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-white/5 ${m === activeModel ? "text-[#00FF9D]" : "text-zinc-300"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </header>

        <section className="min-h-0 flex-1">
          {mode === "chat" && <ChatMode activeModel={activeModel} hasKey={settings.has_key} />}
          {mode === "agents" && <AgentTeamMode activeModel={activeModel} hasKey={settings.has_key} />}
          {mode === "dashboard" && <DashboardMode hasKey={settings.has_key} />}
        </section>
      </main>

      <SettingsDialog
        open={showSettings} onClose={() => setShowSettings(false)}
        settings={settings} models={models} activeModel={activeModel}
        onSaved={(res) => {
          setSettings((s) => ({ ...s, has_key: res.has_key, model: res.model }));
          setActiveModel(res.model);
          loadModels();
        }}
      />
    </div>
  );
}
