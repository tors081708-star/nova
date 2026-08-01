import { useEffect, useRef, useState } from 'react'
import { docsApi } from '../api.js'
import { Plus, Upload, Trash2, Loader2, FileText, Send, Sparkles } from 'lucide-react'

export default function Docs() {
  const [docs, setDocs] = useState([])
  const [active, setActive] = useState(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [asking, setAsking] = useState(false)
  const [err, setErr] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [pasteTitle, setPasteTitle] = useState('')
  const [pasteContent, setPasteContent] = useState('')
  const fileInput = useRef(null)

  useEffect(() => { docsApi.list().then(setDocs) }, [])

  async function openDoc(d) {
    setActive(d); setAnswer(''); setQuestion(''); setContent(''); setLoading(true); setErr('')
    try {
      const full = await docsApi.get(d.id)
      setContent(full.content || '')
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not load doc')
    } finally { setLoading(false) }
  }

  async function uploadFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setErr('')
    try {
      const d = await docsApi.upload(f)
      setDocs((xs) => [d, ...xs])
      await openDoc(d)
    } catch (err) {
      setErr(err?.response?.data?.detail || 'Upload failed')
    } finally {
      e.target.value = ''
    }
  }

  async function pasteSubmit(e) {
    e.preventDefault()
    if (!pasteTitle.trim() || !pasteContent.trim()) return
    try {
      const d = await docsApi.create({ title: pasteTitle.trim(), content: pasteContent })
      setDocs((xs) => [d, ...xs])
      setShowPaste(false); setPasteTitle(''); setPasteContent('')
      await openDoc(d)
    } catch (err) {
      setErr(err?.response?.data?.detail || 'Save failed')
    }
  }

  async function remove(d) {
    if (!confirm(`Delete "${d.title}"?`)) return
    await docsApi.del(d.id)
    setDocs((xs) => xs.filter((x) => x.id !== d.id))
    if (active?.id === d.id) { setActive(null); setContent('') }
  }

  async function ask(e) {
    e?.preventDefault?.()
    if (!active || !question.trim()) return
    setAsking(true); setErr(''); setAnswer('')
    try {
      const res = await docsApi.ask({ doc_id: active.id, question: question.trim() })
      setAnswer(res.answer)
    } catch (err) {
      setErr(err?.response?.data?.detail || 'Could not get an answer')
    } finally { setAsking(false) }
  }

  return (
    <div className="h-screen flex" data-testid="docs-page">
      <div className="w-72 shrink-0 border-r border-line flex flex-col">
        <div className="p-4 border-b border-line">
          <div className="overline mb-2">Documents</div>
          <div className="flex gap-2">
            <button className="btn btn-primary text-sm flex-1" onClick={() => fileInput.current?.click()} data-testid="docs-upload">
              <Upload size={14} strokeWidth={1.5} /> Upload
            </button>
            <button className="btn btn-ghost text-sm" onClick={() => setShowPaste((s) => !s)} data-testid="docs-paste-toggle">
              <Plus size={14} strokeWidth={1.5} />
            </button>
          </div>
          <input ref={fileInput} type="file" accept=".pdf,.txt,.md,.json,.csv,.log" onChange={uploadFile} className="hidden" data-testid="docs-file-input" />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {docs.length === 0 ? (
            <div className="text-xs text-ink-subtle p-4 text-center">
              <FileText size={22} strokeWidth={1} className="mx-auto mb-2" />
              No documents yet.
            </div>
          ) : docs.map((d) => (
            <div
              key={d.id}
              onClick={() => openDoc(d)}
              className={`group cursor-pointer px-3 py-2.5 mb-1 rounded-md text-sm border-l-2 transition-colors flex items-start gap-2 ${
                active?.id === d.id
                  ? 'bg-bg-elev border-brand text-ink'
                  : 'border-transparent text-ink-muted hover:bg-bg-elev hover:text-ink'
              }`}
              data-testid={`docs-item-${d.id}`}
            >
              <FileText size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{d.title}</div>
                <div className="text-xxs text-ink-subtle mt-0.5 font-mono">{d.source} · {Math.round((d.size || 0) / 1024)} KB</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); remove(d) }} className="btn-danger-ghost btn p-1 opacity-0 group-hover:opacity-100" aria-label="Delete" data-testid={`docs-delete-${d.id}`}>
                <Trash2 size={12} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {showPaste && (
          <form onSubmit={pasteSubmit} className="border-b border-line p-4 flex flex-col gap-2 bg-bg-elev" data-testid="docs-paste-form">
            <input value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} placeholder="Document title" className="field" data-testid="docs-paste-title" required />
            <textarea value={pasteContent} onChange={(e) => setPasteContent(e.target.value)} placeholder="Paste text content here…" className="field min-h-[140px]" data-testid="docs-paste-content" required />
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn btn-ghost text-sm" onClick={() => setShowPaste(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary text-sm" data-testid="docs-paste-save">Save document</button>
            </div>
          </form>
        )}

        {!active ? (
          <div className="flex-1 grid place-items-center text-center" data-testid="docs-empty">
            <div>
              <FileText size={40} strokeWidth={1} className="mx-auto text-ink-subtle mb-3" />
              <div className="overline mb-2">Documents</div>
              <h2 className="font-display text-2xl font-light">Ask your docs anything.</h2>
              <p className="text-ink-muted text-sm mt-1 max-w-sm">
                Upload a PDF or paste text. NOVA answers questions grounded in the document.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-line px-6 py-3 flex items-center gap-3">
              <FileText size={16} strokeWidth={1.5} className="text-brand" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{active.title}</div>
                <div className="text-xxs text-ink-subtle font-mono">{active.source} · {Math.round((active.size || 0) / 1024)} KB</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="lg:col-span-2">
                <div className="overline mb-2">Content</div>
                <div className="card p-4 text-sm text-ink-muted whitespace-pre-wrap max-h-[65vh] overflow-y-auto prose-nova" data-testid="docs-content">
                  {loading ? 'Loading…' : (content || '(empty)')}
                </div>
              </section>

              <aside className="card p-5 flex flex-col gap-3" data-testid="docs-qa-panel">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} strokeWidth={1.5} className="text-brand" />
                  <div className="overline">Ask this document</div>
                </div>
                <form onSubmit={ask} className="flex flex-col gap-2">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What are the key takeaways?"
                    className="field min-h-[80px] text-sm"
                    data-testid="docs-question"
                  />
                  <button type="submit" className="btn btn-primary text-sm" disabled={asking || !question.trim()} data-testid="docs-ask">
                    {asking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={1.5} />}
                    Ask
                  </button>
                </form>
                {answer && (
                  <div className="mt-1 border-t border-line pt-3" data-testid="docs-answer">
                    <div className="overline mb-2">Answer</div>
                    <div className="prose-nova text-sm text-ink whitespace-pre-wrap">{answer}</div>
                  </div>
                )}
                {err && <div className="text-danger text-xs" data-testid="docs-error">{err}</div>}
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
