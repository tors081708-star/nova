import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashApi } from '../api.js'
import {
  MessageSquare,
  NotebookPen,
  ListChecks,
  FileText,
  CircleCheck,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'

const HERO_IMG =
  'https://static.prod-images.emergentagent.com/jobs/7daa9539-e2ae-4bb3-8261-04b0aaa430eb/images/e15fb9ed4824af06ca9257ff81c00a019f336a3d50753086b19b5f9ebf3f44c4.png'

export default function Dashboard() {
  const email = localStorage.getItem('nova_email') || ''
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    dashApi.get().then(setData).catch((e) => setErr(e?.response?.data?.detail || 'Failed to load'))
  }, [])

  const c = data?.counts || { notes: 0, tasks_open: 0, tasks_done: 0, docs: 0, chats: 0 }
  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Burning late' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto" data-testid="dashboard-page">
      {/* Header */}
      <header className="mb-8">
        <div className="overline">Briefing · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1 className="font-display text-4xl md:text-5xl font-light tracking-tight mt-2">
          {greeting}, <span className="text-brand">{email.split('@')[0] || 'friend'}</span>.
        </h1>
        <p className="text-ink-muted mt-2 max-w-xl">
          Your quiet AI companion is ready. Start a conversation, capture a thought, or let NOVA
          tackle a document.
        </p>
      </header>

      {err && <div className="mb-4 text-sm text-danger" data-testid="dashboard-error">{err}</div>}

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-min">
        {/* Hero card */}
        <div
          className="md:col-span-4 md:row-span-2 card card-hover overflow-hidden relative"
          data-testid="dashboard-hero"
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `linear-gradient(180deg, hsla(217,28%,9%,0.2), hsla(217,28%,9%,0.95)), url(${HERO_IMG})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="relative p-8 flex flex-col h-full min-h-[280px] justify-end">
            <div className="overline mb-2">Start here</div>
            <h2 className="font-display text-2xl md:text-3xl font-light tracking-tight max-w-md">
              Ask NOVA anything, or pick up where you left off.
            </h2>
            <div className="flex flex-wrap gap-2 mt-5">
              <Link to="/chat" className="btn btn-primary" data-testid="dashboard-start-chat">
                <Sparkles size={15} strokeWidth={1.5} /> New chat
              </Link>
              <Link to="/notes" className="btn btn-ghost" data-testid="dashboard-new-note">
                <NotebookPen size={15} strokeWidth={1.5} /> New note
              </Link>
              <Link to="/tasks" className="btn btn-ghost" data-testid="dashboard-new-task">
                <ListChecks size={15} strokeWidth={1.5} /> New task
              </Link>
            </div>
          </div>
        </div>

        <Stat label="Chats" value={c.chats} icon={MessageSquare} to="/chat" testid="stat-chats" />
        <Stat label="Notes" value={c.notes} icon={NotebookPen} to="/notes" testid="stat-notes" />
        <Stat
          label="Open tasks"
          value={c.tasks_open}
          icon={ListChecks}
          to="/tasks"
          testid="stat-tasks"
          foot={`${c.tasks_done} done`}
        />
        <Stat label="Documents" value={c.docs} icon={FileText} to="/docs" testid="stat-docs" />

        {/* Recent tasks */}
        <div className="md:col-span-3 card p-6" data-testid="dashboard-tasks-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="overline">Up next</div>
            <Link to="/tasks" className="text-xs text-ink-muted hover:text-brand flex items-center gap-1">
              Open <ArrowUpRight size={12} strokeWidth={1.5} />
            </Link>
          </div>
          {data?.recent_tasks?.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {data.recent_tasks.map((t) => (
                <li key={t.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <CircleCheck size={14} strokeWidth={1.5} className="text-ink-muted" />
                  <span className="flex-1 truncate">{t.title}</span>
                  {t.ai_rank && (
                    <span className="text-xxs text-brand font-mono">#{t.ai_rank}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRow text="No open tasks. Capture the next thing." />
          )}
        </div>

        {/* Recent notes */}
        <div className="md:col-span-3 card p-6" data-testid="dashboard-notes-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="overline">Recent notes</div>
            <Link to="/notes" className="text-xs text-ink-muted hover:text-brand flex items-center gap-1">
              Open <ArrowUpRight size={12} strokeWidth={1.5} />
            </Link>
          </div>
          {data?.recent_notes?.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {data.recent_notes.map((n) => (
                <li key={n.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <NotebookPen size={14} strokeWidth={1.5} className="text-ink-muted" />
                  <span className="flex-1 truncate">{n.title}</span>
                  <span className="text-xxs text-ink-subtle font-mono">
                    {new Date(n.updated_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRow text="No notes yet. Jot something down." />
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, icon: Icon, to, testid, foot }) {
  return (
    <Link
      to={to}
      className="md:col-span-1 card card-hover p-5 flex flex-col gap-2"
      data-testid={testid}
    >
      <div className="flex items-center justify-between">
        <Icon size={16} strokeWidth={1.5} className="text-brand" />
        <ArrowUpRight size={13} strokeWidth={1.5} className="text-ink-subtle" />
      </div>
      <div className="font-display text-3xl font-light">{value}</div>
      <div className="text-xs text-ink-muted uppercase tracking-wider">{label}</div>
      {foot && <div className="text-xxs text-ink-subtle mt-auto">{foot}</div>}
    </Link>
  )
}

function EmptyRow({ text }) {
  return <div className="text-sm text-ink-subtle py-4">{text}</div>
}
