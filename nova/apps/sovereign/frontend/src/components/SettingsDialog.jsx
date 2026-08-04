import { useState, useEffect } from "react";
import { X, KeyRound, Cpu, Check, Loader2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, errText } from "@/api";

export default function SettingsDialog({ open, onClose, settings, models, activeModel, onSaved }) {
  const [key, setKey] = useState("");
  const [model, setModel] = useState(activeModel);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setModel(activeModel);
  }, [activeModel, open]);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const body = { model };
      if (key.trim()) body.openrouter_api_key = key.trim();
      const res = await api.saveSettings(body);
      setMsg("Saved");
      setKey("");
      onSaved?.(res);
      setTimeout(() => onClose(), 500);
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          data-testid="settings-modal"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="glass relative z-10 w-full max-w-lg rounded-2xl p-6"
            initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-white">Settings</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white" data-testid="settings-close-btn">
                <X size={18} />
              </button>
            </div>

            <label className="mb-1.5 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
              <KeyRound size={13} /> OpenRouter API Key
            </label>
            <input
              type="password" value={key} onChange={(e) => setKey(e.target.value)}
              placeholder={settings?.has_key ? "•••••••• (configured — leave blank to keep)" : "sk-or-v1-..."}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-[#00FF9D]"
              data-testid="settings-key-input"
            />
            <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-[#00E5FF] hover:underline">
              Get a free key <ExternalLink size={11} />
            </a>

            <label className="mb-1.5 mt-5 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
              <Cpu size={13} /> Free Model
            </label>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-[#00FF9D]"
              data-testid="settings-model-select"
            >
              {models.map((m) => (<option key={m} value={m} className="bg-[#0C0C0E]">{m}</option>))}
            </select>

            <div className="mt-6 flex items-center justify-between">
              <span className={`text-sm ${msg === "Saved" ? "text-[#00FF9D]" : "text-[#FF3366]"}`} data-testid="settings-msg">
                {msg === "Saved" ? (<span className="flex items-center gap-1"><Check size={14} /> Saved</span>) : (msg)}
              </span>
              <button onClick={save} disabled={saving}
                className="glow-primary inline-flex items-center gap-2 rounded-lg bg-[#00FF9D] px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                data-testid="settings-save-btn"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
