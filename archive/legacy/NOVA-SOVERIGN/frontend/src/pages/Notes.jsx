import { useEffect, useState } from 'react'
import { notesApi } from '../api.js'
import { Plus, Sparkles, Trash2, Loader2, NotebookPen } from 'lucide-react'

export default function Notes() {
  const [notes, setNotes] = useState([])
  const [active, setActive] = useState(null)
  const [saving, setSaving] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    const list = await notesApi.list()
    setNotes(list)
    if (!active && list[0]) setActive(list[0])
  }

  async function createNote() {
    const n = await notesApi.create({ title: 'Untitled note', content: '' })
    setNotes((xs) => [n, ...xs])
    setActive(n)
  }

  async function saveActive() {
    if (!active) return
    setSaving(true); setErr('')
    try {
      const up = await notesApi.update(active.id, {
        title: active.title, content: active.content, tags: active.tags || []
      })
      setActive(up)
      setNotes((xs) => xs.map((n) => (n.id === up.id ? up : n)))
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  async function summarize() {
    if (!active) return
    setSummarizing(true); setErr('')
    try {
      // save first to persist content
      await saveActive()
      const res = await notesApi.summarize(active.id)
      const updated = { ...active, summary: res.summary }
      setActive(updated)
      setNotes((xs) => xs.map((n) => (n.id === updated.id ? updated : n)))
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Summarize failed')
    } finally { setSummarizing(false) }
  }

  async function removeNote(id) {
    if (!confirm('Delete this note?')) return
    await notesApi.del(id)
    setNotes((xs) => xs.filter((n) => n.id !== id))
    if (active?.id === id) setActive(null)
  }

  return (
    <div className="h-screen flex" data-testid="notes-page">
      <div className="w-72 shrink-0 border-r border-line flex flex-col">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <div>
            <div className="overline">Notes</div>
            <div className="text-xs text-ink-muted mt-0.5">{notes.length} total</div>
          </div>
          <button className="btn btn-primary text-sm" onClick={createNote} data-testid="notes-new">
            <Plus size={14} strokeWidth={1.5} /> New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {notes.length === 0 ? (
            <div className="text-xs text-ink-subtle p-4 text-center">
              <NotebookPen size={24} strokeWidth={1} className="mx-auto mb-2 text-ink-subtle" />
              No notes yet.
            </div>
          ) : notes.map((n) => (
            <button
              key={n.id}
              onClick={() => setActive(n)}
              className={`w-full text-left px-3 py-2.5 mb-1 rounded-md text-sm transition-colors border-l-2 ${
                active?.id === n.id
                  ? 'bg-bg-elev border-brand text-ink'
                  : 'border-transparent text-ink-muted hover:bg-bg-elev hover:text-ink'
              }`}
              data-testid={`notes-item-${n.id}`}
            >
              <div className="font-medium truncate">{n.title || 'Untitled'}</div>
              <div className="text-xxs text-ink-subtle mt-0.5 font-mono">
                {new Date(n.updated_at).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {!active ? (
          <div className="flex-1 grid place-items-center text-center" data-testid="notes-empty">
            <div>
              <NotebookPen size={40} strokeWidth={1} className="mx-auto text-ink-subtle mb-3" />
              <div className="overline mb-2">Notes</div>
              <h2 className="font-display text-2xl font-light">Your quiet scratchpad.</h2>
              <p className="text-ink-muted text-sm mt-1">Create a note to get started.</p>
              <button className="btn btn-primary mt-4" onClick={createNote}>
                <Plus size={14} strokeWidth={1.5} /> New note
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-line px-6 py-3 flex items-center gap-2">
              <input
                value={active.title}
                onChange={(e) => setActive({ ...active, title: e.target.value })}
                onBlur={saveActive}
                className="flex-1 bg-transparent border-0 outline-none font-display text-xl"
                data-testid="notes-title"
              />
              <button
                className="btn btn-ghost text-sm"
                onClick={summarize}
                disabled={summarizing || !active.content?.trim()}
                data-testid="notes-summarize"
              >
                {summarizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={1.5} />}
                AI summary
              </button>
              <button
                className="btn btn-ghost text-sm"
                onClick={saveActive}
                disabled={saving}
                data-testid="notes-save"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Save
              </button>
              <button
                className="btn-danger-ghost btn text-sm"
                onClick={() => removeNote(active.id)}
                data-testid="notes-delete"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <textarea
                  value={active.content || ''}
                  onChange={(e) => setActive({ ...active, content: e.target.value })}
                  onBlur={saveActive}
                  placeholder="Start writing…"
                  className="field w-full min-h-[60vh]"
                  data-testid="notes-content"
                />
              </div>
              <aside className="card p-5 h-fit sticky top-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} strokeWidth={1.5} className="text-brand" />
                  <div className="overline">AI summary</div>
                </div>
                {active.summary ? (
                  <div className="prose-nova text-sm text-ink-muted whitespace-pre-wrap">{active.summary}</div>
                ) : (
                  <div className="text-sm text-ink-subtle">
                    Hit <span className="text-ink">AI summary</span> to distill this note into 3-5 bullets.
                  </div>
                )}
              </aside>
            </div>
            {err && <div className="text-danger text-sm px-6 pb-3" data-testid="notes-error">{err}</div>}
          </>
        )}
      </div>
    </div>
  )
}
