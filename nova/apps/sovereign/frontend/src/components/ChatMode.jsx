import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, Loader2, Sparkles, History } from "lucide-react";
import { api, errText, API } from "@/api";
import Markdown from "@/components/Markdown";

export default function ChatMode({ activeModel, hasKey }) {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const feedRef = useRef(null);

  const loadSessions = useCallback(() => api.getSessions().then(setSessions).catch(() => {}), []);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const openSession = async (id) => {
    setSessionId(id);
    setError("");
    const h = await api.getHistory(id);
    setMessages(h.messages || []);
  };

  const newChat = () => { setSessionId(null); setMessages([]); setInput(""); setError(""); };

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !hasKey) return;
    setError("");
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "", model: activeModel, streaming: true }]);
    setSending(true);
    try {
      const resp = await fetch(`${API}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId, model: activeModel }),
      });
      if (!resp.ok || !resp.body) throw new Error(await resp.text());

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamErr = "";

      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop();
          for (const chunk of chunks) {
            const line = chunk.replace(/^data:\s?/, "").trim();
            if (!line) continue;
            let evt;
            try { evt = JSON.parse(line); } catch { continue; }
            if (evt.session_id) setSessionId(evt.session_id);
            if (evt.delta) {
              setMessages((m) => {
                const c = [...m];
                const last = c[c.length - 1];
                c[c.length - 1] = { ...last, content: last.content + evt.delta };
                return c;
              });
            }
            if (evt.error) streamErr = evt.error;
            if (evt.done) {
              setMessages((m) => {
                const c = [...m];
                c[c.length - 1] = { ...c[c.length - 1], streaming: false, model: evt.model };
                return c;
              });
            }
          }
        }
      };
      await pump();
      if (streamErr) throw new Error(streamErr);
      loadSessions();
    } catch (e) {
      setError(errText(e));
      setMessages((m) => {
        const c = [...m];
        if (c.length && c[c.length - 1].role === "assistant" && !c[c.length - 1].content) c.pop();
        return c;
      });
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="hidden w-[260px] flex-col border-r border-white/10 lg:flex" data-testid="chat-sessions">
        <div className="p-3">
          <button onClick={newChat} data-testid="new-chat-btn"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00FF9D]/30 bg-[#00FF9D]/10 py-2.5 text-sm font-medium text-[#00FF9D] transition-colors hover:bg-[#00FF9D]/20">
            <Plus size={16} /> New chat
          </button>
        </div>
        <div className="mb-1 flex items-center gap-2 px-4 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          <History size={11} /> Sessions
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {sessions.length === 0 && (<p className="px-2 py-3 text-xs text-zinc-600">No conversations yet.</p>)}
          {sessions.map((s) => (
            <button key={s.session_id} onClick={() => openSession(s.session_id)} data-testid={`session-${s.session_id}`}
              className={`block w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${s.session_id === sessionId ? "bg-white/[0.06]" : ""}`}>
              <div className="truncate text-sm text-zinc-200">{s.preview || "Untitled"}</div>
              <div className="font-mono text-[10px] text-zinc-600">{s.message_count} msgs</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6" data-testid="chat-feed">
          <div className="mx-auto max-w-[820px] space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="glow-primary mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00FF9D] text-black">
                  <Sparkles size={26} />
                </div>
                <h1 className="font-heading text-3xl font-extrabold">Talk to NOVA</h1>
                <p className="mt-2 max-w-md text-sm text-zinc-400">Your sovereign, open AI sidekick. Ask anything — running free on OpenRouter.</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  {m.role === "user" ? (
                    <div className="max-w-[80%] rounded-2xl rounded-br-md border border-white/5 bg-[#141417] px-4 py-3 text-[15px] leading-relaxed text-zinc-100" data-testid="msg-user">
                      {m.content}
                    </div>
                  ) : (
                    <div className="max-w-[88%] border-l-2 border-[#00FF9D] bg-transparent py-1 pl-4 pr-2 text-[15px] leading-relaxed text-zinc-100" data-testid="msg-assistant">
                      {m.content ? (<Markdown>{m.content}</Markdown>) : (<span className="blink-cursor text-zinc-400">NOVA is thinking</span>)}
                      {m.streaming && m.content && <span className="blink-cursor" />}
                      {m.model && !m.streaming && (<div className="mt-2 font-mono text-[10px] text-zinc-600">{m.model}</div>)}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="mx-auto max-w-[820px]">
            {error && (<div className="mb-2 text-xs text-[#FF3366]" data-testid="chat-error">{error}</div>)}
            <div className="glass flex items-end gap-2 rounded-2xl p-2">
              <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={hasKey ? "Message NOVA…" : "Add an OpenRouter key in Settings to begin"}
                disabled={!hasKey} data-testid="chat-input"
                className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-white outline-none placeholder:text-zinc-600 disabled:opacity-60" />
              <button onClick={send} disabled={sending || !input.trim() || !hasKey} data-testid="chat-send-btn"
                className="glow-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00FF9D] text-black transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0">
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
