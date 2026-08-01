import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { meta } from '../api.js'
import { Sparkles, Flame, GraduationCap, Code2, Feather, Compass, ArrowRight } from 'lucide-react'

const ICONS = {
  sparkles: Sparkles,
  flame: Flame,
  'graduation-cap': GraduationCap,
  code: Code2,
  feather: Feather,
  compass: Compass,
}

const COACH_IMG = 'https://static.prod-images.emergentagent.com/jobs/7daa9539-e2ae-4bb3-8261-04b0aaa430eb/images/dc188f722fca869639166194aa0d73371542e322438813c6ac7d6e3ee1922e61.png'
const TUTOR_IMG = 'https://static.prod-images.emergentagent.com/jobs/7daa9539-e2ae-4bb3-8261-04b0aaa430eb/images/1fea8f152fdef6d8c5b20348b723a945604c28c025cda379dc2f7cdefb58afaf.png'

const IMG_MAP = {
  coach: COACH_IMG,
  tutor: TUTOR_IMG,
}

export default function Personas() {
  const nav = useNavigate()
  const [personas, setPersonas] = useState([])
  useEffect(() => { meta.personas().then((d) => setPersonas(d.personas || [])) }, [])
  const active = localStorage.getItem('nova_persona') || 'default'

  function use(p) {
    localStorage.setItem('nova_persona', p.id)
    nav('/chat')
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto" data-testid="personas-page">
      <header className="mb-8">
        <div className="overline">Personas</div>
        <h1 className="font-display text-3xl md:text-4xl font-light tracking-tight mt-1">
          Pick the voice you need today.
        </h1>
        <p className="text-ink-muted mt-2 max-w-xl">
          NOVA shifts character depending on the job. Each persona tunes the tone, style, and
          focus of your conversations.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personas.map((p) => {
          const Icon = ICONS[p.icon] || Sparkles
          const img = IMG_MAP[p.id]
          const isActive = p.id === active
          return (
            <div
              key={p.id}
              className={`card card-hover p-6 flex flex-col gap-4 relative overflow-hidden ${
                isActive ? 'border-brand/50 glow-brand' : ''
              }`}
              data-testid={`persona-card-${p.id}`}
            >
              {img && (
                <div
                  className="absolute top-0 right-0 w-28 h-28 opacity-30 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(circle at top right, rgba(0,0,0,0) 30%, hsl(217 28% 9%) 75%), url(${img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              )}
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-md bg-brand/15 border border-brand/30 grid place-items-center">
                  <Icon size={18} strokeWidth={1.5} className="text-brand" />
                </div>
                <div>
                  <div className="font-display text-xl">{p.name}</div>
                  <div className="text-xs text-ink-muted">{p.tagline}</div>
                </div>
              </div>

              <p className="text-sm text-ink-muted leading-relaxed flex-1 relative z-10">{p.system}</p>

              <div className="flex items-center justify-between relative z-10">
                <span className={`overline ${isActive ? 'text-brand' : ''}`}>
                  {isActive ? 'Active' : 'Available'}
                </span>
                <button
                  onClick={() => use(p)}
                  className="btn btn-primary text-sm"
                  data-testid={`persona-use-${p.id}`}
                >
                  Chat with {p.name} <ArrowRight size={12} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
