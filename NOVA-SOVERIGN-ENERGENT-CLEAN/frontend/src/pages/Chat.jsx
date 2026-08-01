import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { chatApi, meta } from '../api.js'
import {
  Send,
  Sparkles,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  ChevronDown,
} from 'lucide-react'

const HERO_IMG =
  'https://static.prod-images.emergentagent.com/jobs/7daa9539-e2ae-4bb3-8261-04b0aaa430eb/images/0337c674f8b2d010c65ef87f2cfbb73f49b4685205e2ae108dade39dfc1122e3.png'

export default function Chat() {
  const nav = useNavigate()
  const { sessionId: urlSession } = useParams()
  const [sessions, setSessions] = useState([])
  const [messages, setMessages] = useState([])
  const [session, setSession] = useState(urlSession || null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [models, setModels] = useState([])
  const [personas, setPersonas] = useState([])
  const [model, setModel] = useState(localStorage.getItem('nova_model') || 'gpt-5.2')
  const [persona, setPersona] = useState(localStorage.getItem('nova_persona') || 'default')
  const [err, setErr] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    meta.models().then((d) => setModels(d.models || []))
    meta.personas().then((d) => setPersonas(d.personas || []))
    chatApi.sessions().then(setSessions).catch(() => {})
  }, [])

  useEffect(() => {
    if (urlSession) {
      setSession(urlSession)
      chatApi.history(urlSession).then((d) => setMessages(d.messages || []))
    } else {
      setSession(null)
      setMessages([])
    }
  }, [urlSession])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  function changeModel(v) { setModel(v); localStorage.setItem('nova_model', v) }
  function changePersona(v) { setPersona(v); localStorage.setItem('nova_persona', v) }

  async function newChat() {
    setSession(null)
    setMessages([])
    nav('/chat')
  }

  async function openSession(id) {
    nav(`/chat/${id}`)
  }

  async function deleteSession(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    await chatApi.del(id)
    setSessions((s) => s.filter((x) => x.session_id !== id))
    if (session === id) newChat()
  }

  async function send() {
    const msg = text.trim()
    if (!msg || sending) return
    setErr('')
    setSending(true)
    const userMsg = { role: 'user', content: msg, at: new Date().toISOString() }
    setMessages((m) => [...m, userMsg])
    setText('')
    try {
      const res = await chatApi.send({
        message: msg,
        session_id: session || undefined,
        model,
        persona,
      })
      if (!session) {
        setSession(res.session_id)
        nav(`/chat/${res.session_id}`, { replace: true })
      }
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: res.reply, at: new Date().toISOString(), model: res.model, persona: res.persona },
      ])
      chatApi.sessions().then(setSessions).catch(() => {})
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Message failed')
      setMessages((m) => m.slice(0, -1))
      setText(msg)
    } finally {
      setSending(false)
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const personaObj = personas.find((p) => p.id === persona) || personas[0]

  return (
    <div className="h-screen flex" data-testid="chat-page">
      {/* Session rail */}
      <div className="w-64 shrink-0 border-r border-line flex flex-col">
        <div className="p-4 border-b border-line">
          <button className="btn btn-primary w-full" onClick={newChat} data-testid="chat-new">
            <Plus size={14} strokeWidth={1.5} /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <div className="text-xs text-ink-subtle p-4">No conversations yet.</div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.session_id}
                onClick={() => openSession(s.session_id)}
                className={`group px-3 py-2 mb-1 rounded-md cursor-pointer text-sm flex items-start gap-2 border-l-2 transition-colors ${
                  session === s.session_id
                    ? 'bg-bg-elev border-brand text-ink'
                    : 'border-transparent text-ink-muted hover:bg-bg-elev hover:text-ink'
                }`}
                data-testid={`chat-session-${s.session_id}`}
              >
                <MessageSquare size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{s.preview || 'New chat'}</div>
                  <div className="text-xxs text-ink-subtle mt-0.5 font-mono">
                    {s.persona} · {s.count} msgs
                  </div>
                </div>
                <button
                  className="btn-danger-ghost p-1 opacity-0 group-hover:opacity-100 rounded"
                  onClick={(e) => deleteSession(s.session_id, e)}
                  data-testid={`chat-delete-${s.session_id}`}
                  aria-label="Delete"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <div className="border-b border-line px-6 py-3 flex items-center gap-3 bg-bg/70 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-brand/20 border border-brand/30 grid place-items-center">
              <Sparkles size={13} strokeWidth={1.5} className="text-brand" />
            </div>
            <div>
              <div className="text-sm font-medium">{personaObj?.name || 'NOVA'}</div>
              <div className="text-xxs text-ink-subtle">{personaObj?.tagline}</div>
            </div>
          </div>
          <div className="flex-1" />
          <Select
            label="Persona"
            value={persona}
            onChange={changePersona}
            options={personas.map((p) => ({ value: p.id, label: p.name }))}
            testid="chat-persona-select"
          />
          <Select
            label="Model"
            value={model}
            onChange={changeModel}
            options={models.map((m) => ({ value: m.id, label: m.label }))}
            testid="chat-model-select"
          />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 relative">
          {messages.length === 0 ? (
            <EmptyChat img={HERO_IMG} personaObj={personaObj} onQuick={(q) => { setText(q); setTimeout(send, 0) }} />
          ) : (
            <div className="max-w-3xl mx-auto flex flex-col gap-5">
              {messages.map((m, i) => (
                <Bubble key={i} msg={m} />
              ))}
              {sending && (
                <div className="flex items-start gap-3" data-testid="chat-typing">
                  <Avatar role="assistant" />
                  <div className="card px-4 py-3 inline-flex gap-1.5 items-center">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {err && (
          <div className="px-6 py-2 text-sm text-danger border-t border-line" data-testid="chat-error">
            {err}
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-line px-6 py-4 bg-bg">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <textarea
              className="field"
              rows={1}
              placeholder="Ask NOVA anything — Enter to send, Shift+Enter for newline"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              data-testid="chat-input"
              style={{ minHeight: 46, maxHeight: 180 }}
            />
            <button
              className="btn btn-primary"
              onClick={send}
              disabled={sending || !text.trim()}
              data-testid="chat-send"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={1.5} />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options, testid }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-bg-elev text-ink border border-line rounded-md text-xs font-mono px-3 py-1.5 pr-7 cursor-pointer hover:border-ink-muted transition-colors"
        data-testid={testid}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} strokeWidth={1.5} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
    </label>
  )
}

function Avatar({ role }) {
  if (role === 'user') {
    return (
      <div className="w-7 h-7 rounded-md bg-bg-soft border border-line grid place-items-center text-xs font-mono text-ink-muted shrink-0">
        YOU
      </div>
    )
  }
  return (
    <div className="w-7 h-7 rounded-md bg-brand/20 border border-brand/40 grid place-items-center shrink-0">
      <Sparkles size={12} strokeWidth={1.5} className="text-brand" />
    </div>
  )
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`} data-testid={`msg-${msg.role}`}>
      {!isUser && <Avatar role="assistant" />}
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 leading-relaxed whitespace-pre-wrap text-[15px] ${
          isUser
            ? 'bg-bg-soft border border-line'
            : 'bg-bg-elev border border-line border-l-2 border-l-brand/60'
        }`}
      >
        <div className="prose-nova">{msg.content}</div>
      </div>
      {isUser && <Avatar role="user" />}
    </div>
  )
}

function EmptyChat({ img, personaObj, onQuick }) {
  const suggestions = [
    'Summarize the key themes of my week',
    'Help me outline a blog post about focus',
    'What should I ask an accountant about freelancing?',
    'Explain vector embeddings like I\'m curious but busy',
  ]
  return (
    <div className="h-full flex flex-col items-center justify-center text-center relative" data-testid="chat-empty">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, hsl(220 35% 4%) 75%), url(${img})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative z-10 max-w-lg">
        <div className="overline mb-3">New conversation</div>
        <h2 className="font-display text-3xl font-light tracking-tight">
          What's on your mind, <span className="text-brand">boss</span>?
        </h2>
        <p className="text-ink-muted text-sm mt-2">
          You're chatting with <span className="text-ink">{personaObj?.name || 'NOVA'}</span>
          {personaObj?.tagline ? <> — {personaObj.tagline.toLowerCase()}</> : null}.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 text-left">
          {suggestions.map((s) => (
            <button
              key={s}
              className="card card-hover p-3 text-sm text-ink-muted hover:text-ink"
              onClick={() => onQuick(s)}
              data-testid={`chat-suggest-${s.slice(0, 12).replace(/\s/g, '-')}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
