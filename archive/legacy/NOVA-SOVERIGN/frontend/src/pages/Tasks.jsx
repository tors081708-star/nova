import { useEffect, useMemo, useState } from 'react'
import { tasksApi } from '../api.js'
import { Plus, Sparkles, Trash2, Loader2, Circle, CheckCircle2, ListChecks } from 'lucide-react'

const PRIORITIES = [
  { v: 'urgent', label: 'Urgent', cls: 'text-[hsl(0_62%_65%)]' },
  { v: 'high', label: 'High', cls: 'text-[hsl(28_80%_65%)]' },
  { v: 'normal', label: 'Normal', cls: 'text-ink-muted' },
  { v: 'low', label: 'Low', cls: 'text-ink-subtle' },
]

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('normal')
  const [due, setDue] = useState('')
  const [prioritizing, setPrioritizing] = useState(false)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('open') // open | all | done

  useEffect(() => { tasksApi.list().then(setTasks) }, [])

  async function add(e) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      const t = await tasksApi.create({ title: title.trim(), priority, due: due || null, notes: '' })
      setTasks((xs) => [t, ...xs])
      setTitle(''); setDue(''); setPriority('normal')
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not add task')
    }
  }

  async function toggleDone(t) {
    const up = await tasksApi.update(t.id, { done: !t.done })
    setTasks((xs) => xs.map((x) => (x.id === up.id ? up : x)))
  }

  async function remove(t) {
    await tasksApi.del(t.id)
    setTasks((xs) => xs.filter((x) => x.id !== t.id))
  }

  async function changePriority(t, p) {
    const up = await tasksApi.update(t.id, { priority: p })
    setTasks((xs) => xs.map((x) => (x.id === up.id ? up : x)))
  }

  async function prioritize() {
    setPrioritizing(true); setErr('')
    try {
      await tasksApi.prioritize()
      const list = await tasksApi.list()
      setTasks(list)
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Prioritize failed')
    } finally { setPrioritizing(false) }
  }

  const visible = useMemo(() => {
    let list = tasks
    if (filter === 'open') list = tasks.filter((t) => !t.done)
    if (filter === 'done') list = tasks.filter((t) => t.done)
    // sort open by ai_rank then created desc; done by updated desc
    return [...list].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      if (!a.done && !b.done) {
        const ra = a.ai_rank ?? 9999
        const rb = b.ai_rank ?? 9999
        if (ra !== rb) return ra - rb
      }
      return (b.updated_at || '').localeCompare(a.updated_at || '')
    })
  }, [tasks, filter])

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto" data-testid="tasks-page">
      <header className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="overline">Tasks</div>
          <h1 className="font-display text-3xl font-light tracking-tight mt-1">What needs doing.</h1>
          <p className="text-ink-muted text-sm mt-1">Capture fast. Let NOVA rank what's next.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={prioritize}
          disabled={prioritizing || tasks.filter((t) => !t.done).length === 0}
          data-testid="tasks-prioritize"
        >
          {prioritizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={1.5} />}
          AI prioritize
        </button>
      </header>

      <form onSubmit={add} className="card p-4 flex flex-wrap gap-2 items-center" data-testid="tasks-form">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className="field flex-1 min-w-[240px]"
          data-testid="tasks-title"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="field w-auto"
          data-testid="tasks-priority"
        >
          {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
        </select>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="field w-auto"
          data-testid="tasks-due"
        />
        <button type="submit" className="btn btn-primary" data-testid="tasks-add" disabled={!title.trim()}>
          <Plus size={14} strokeWidth={1.5} /> Add
        </button>
      </form>

      <div className="flex items-center gap-2 mt-6 text-xs">
        {['open', 'all', 'done'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`uppercase tracking-widest px-3 py-1.5 rounded font-mono text-xxs transition-colors ${
              filter === f ? 'bg-bg-elev text-brand border border-line' : 'text-ink-muted hover:text-ink'
            }`}
            data-testid={`tasks-filter-${f}`}
          >
            {f}
          </button>
        ))}
        <div className="flex-1" />
        <div className="text-xs text-ink-subtle font-mono">
          {tasks.filter((t) => !t.done).length} open · {tasks.filter((t) => t.done).length} done
        </div>
      </div>

      {err && <div className="text-danger text-sm mt-3" data-testid="tasks-error">{err}</div>}

      <ul className="mt-4 flex flex-col gap-2">
        {visible.length === 0 && (
          <li className="card p-8 text-center text-ink-subtle text-sm" data-testid="tasks-empty">
            <ListChecks size={28} strokeWidth={1} className="mx-auto text-ink-subtle mb-2" />
            {filter === 'done' ? 'Nothing done yet.' : 'All clear. Go touch grass.'}
          </li>
        )}
        {visible.map((t) => (
          <li
            key={t.id}
            className={`card card-hover px-4 py-3 flex items-center gap-3 ${t.done ? 'opacity-60' : ''}`}
            data-testid={`tasks-item-${t.id}`}
          >
            <button onClick={() => toggleDone(t)} data-testid={`tasks-toggle-${t.id}`} className="shrink-0">
              {t.done ? (
                <CheckCircle2 size={18} strokeWidth={1.5} className="text-brand" />
              ) : (
                <Circle size={18} strokeWidth={1.5} className="text-ink-muted hover:text-brand" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${t.done ? 'line-through text-ink-muted' : ''}`}>{t.title}</div>
              <div className="flex items-center gap-3 text-xxs text-ink-subtle font-mono mt-1 flex-wrap">
                {t.ai_rank && (
                  <span className="text-brand">NOVA #{t.ai_rank}</span>
                )}
                {t.ai_reason && <span className="italic text-ink-muted truncate max-w-md">{t.ai_reason}</span>}
                {t.due && <span>due {t.due}</span>}
              </div>
            </div>
            <select
              value={t.priority}
              onChange={(e) => changePriority(t, e.target.value)}
              className="appearance-none bg-bg-soft border border-line rounded px-2 py-1 text-xxs font-mono"
              data-testid={`tasks-priority-${t.id}`}
            >
              {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select>
            <button
              className="btn-danger-ghost btn p-1.5"
              onClick={() => remove(t)}
              data-testid={`tasks-delete-${t.id}`}
              aria-label="Delete"
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
