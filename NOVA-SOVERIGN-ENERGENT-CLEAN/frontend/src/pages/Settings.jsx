import { useEffect, useState } from 'react'
import { meta } from '../api.js'
import { Cpu, Sparkles, User2, Shield } from 'lucide-react'

const HEADER_IMG = 'https://images.unsplash.com/photo-1771226281605-f1e505ade901?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzOTB8MHwxfHNlYXJjaHwyfHxkYXJrJTIwbHV4dXJ5JTIwYWJzdHJhY3QlMjB0ZXh0dXJlfGVufDB8fHx8MTc3NzI4NzY2NHww&ixlib=rb-4.1.0&q=85'

export default function Settings() {
  const email = localStorage.getItem('nova_email') || ''
  const [models, setModels] = useState([])
  const [personas, setPersonas] = useState([])
  const [model, setModel] = useState(localStorage.getItem('nova_model') || 'gpt-5.2')
  const [persona, setPersona] = useState(localStorage.getItem('nova_persona') || 'default')

  useEffect(() => {
    meta.models().then((d) => setModels(d.models || []))
    meta.personas().then((d) => setPersonas(d.personas || []))
  }, [])

  function saveModel(v) { setModel(v); localStorage.setItem('nova_model', v) }
  function savePersona(v) { setPersona(v); localStorage.setItem('nova_persona', v) }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10" data-testid="settings-page">
      <div
        className="rounded-lg overflow-hidden border border-line mb-8 relative"
        style={{
          backgroundImage: `linear-gradient(120deg, hsla(220,35%,4%,0.85), hsla(220,35%,4%,0.6)), url(${HEADER_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="p-8">
          <div className="overline">Settings</div>
          <h1 className="font-display text-3xl font-light tracking-tight mt-1">Tune NOVA to your taste.</h1>
          <p className="text-ink-muted text-sm mt-1 max-w-md">
            Preferences are saved to your device. Sign out to clear them.
          </p>
        </div>
      </div>

      <section className="card p-6 mb-4" data-testid="settings-account">
        <div className="flex items-center gap-2 mb-3">
          <User2 size={14} strokeWidth={1.5} className="text-brand" />
          <div className="overline">Account</div>
        </div>
        <div className="text-sm">
          <div className="flex items-center justify-between py-2">
            <span className="text-ink-muted">Email</span>
            <span className="font-mono">{email}</span>
          </div>
        </div>
      </section>

      <section className="card p-6 mb-4" data-testid="settings-model">
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={14} strokeWidth={1.5} className="text-brand" />
          <div className="overline">Default model</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => saveModel(m.id)}
              className={`card card-hover p-4 text-left flex items-center justify-between ${
                m.id === model ? 'border-brand/60 glow-brand' : ''
              }`}
              data-testid={`settings-model-${m.id}`}
            >
              <div>
                <div className="font-medium">{m.label}</div>
                <div className="text-xxs text-ink-muted font-mono mt-0.5">{m.vendor}</div>
              </div>
              {m.id === model && <span className="text-brand text-xs">Selected</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-6 mb-4" data-testid="settings-persona">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} strokeWidth={1.5} className="text-brand" />
          <div className="overline">Default persona</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => savePersona(p.id)}
              className={`card card-hover p-3 text-left ${
                p.id === persona ? 'border-brand/60 glow-brand' : ''
              }`}
              data-testid={`settings-persona-${p.id}`}
            >
              <div className="font-medium text-sm">{p.name}</div>
              <div className="text-xxs text-ink-muted mt-0.5">{p.tagline}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-6" data-testid="settings-privacy">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} strokeWidth={1.5} className="text-brand" />
          <div className="overline">Privacy</div>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed">
          Your chats, notes, tasks, and documents live in your own MongoDB instance. Model
          requests route through the Emergent Universal LLM key — no conversation data is
          retained by NOVA beyond your database.
        </p>
      </section>
    </div>
  )
}
