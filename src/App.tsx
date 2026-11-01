import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Bot,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  FileText,
  Gauge,
  Instagram,
  LayoutDashboard,
  LogOut,
  Link2,
  Menu,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  Pause,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react'
import './App.css'
import './styles/client.css'
import { useAuth } from './hooks/useAuth'
import ClientHome from './pages/client/ClientHome'

type Section =
  | 'inicio'
  | 'conversaciones'
  | 'contactos'
  | 'asistente'
  | 'negocio'
  | 'probar'
  | 'integraciones'

type Conversation = {
  id: number
  name: string
  username: string
  avatar: string
  preview: string
  time: string
  unread: number
  stage: string
  mode: 'Auto' | 'Copiloto' | 'Manual'
}

const conversations: Conversation[] = [
  { id: 1, name: 'Lucía Martín', username: '@luciamartin', avatar: 'LM', preview: '¿Trabajáis también con tiendas online?', time: '10:42', unread: 2, stage: 'Cualificando', mode: 'Copiloto' },
  { id: 2, name: 'Marcos Vega', username: '@marcos.vg', avatar: 'MV', preview: 'Perfecto, el jueves me viene genial.', time: '09:18', unread: 0, stage: 'Cita propuesta', mode: 'Auto' },
  { id: 3, name: 'Carla Ruiz', username: '@carlaruiz', avatar: 'CR', preview: 'Quería saber cómo funciona exactamente.', time: 'Ayer', unread: 0, stage: 'Nuevo', mode: 'Manual' },
  { id: 4, name: 'Sergio León', username: '@sergio.leon', avatar: 'SL', preview: 'Nuestro equipo es de cinco personas.', time: 'Ayer', unread: 0, stage: 'Cualificado', mode: 'Auto' },
]

const navItems: { id: Section; label: string; icon: typeof Gauge }[] = [
  { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
  { id: 'conversaciones', label: 'Conversaciones', icon: MessageCircle },
  { id: 'contactos', label: 'Contactos', icon: Users },
  { id: 'asistente', label: 'Mi asistente', icon: Bot },
  { id: 'negocio', label: 'Mi negocio', icon: BookOpen },
  { id: 'probar', label: 'Probar asistente', icon: Sparkles },
  { id: 'integraciones', label: 'Integraciones', icon: Link2 },
]

const processScenes = [
  {
    lead: 'Quiero conseguir más clientes, pero ahora mismo gestiono todos los mensajes yo sola.',
    reply: 'Entiendo. Para ver si podemos ayudarte, ¿cuántas conversaciones nuevas recibes aproximadamente cada semana?',
    followUp: 'Entre 30 y 40, sobre todo después de publicar.',
    need: 'Ahorrar tiempo',
    detail: '30–40 / semana',
    state: 'Buen encaje',
  },
  {
    lead: 'Vendemos formación online para profesionales y nuestro programa principal dura ocho semanas.',
    reply: 'Perfecto. ¿Qué tipo de profesional obtiene mejores resultados con vuestro programa?',
    followUp: 'Personas con experiencia que quieren empezar a captar clientes por su cuenta.',
    need: 'Definir el perfil',
    detail: 'Formación online',
    state: 'Contexto listo',
  },
  {
    lead: '¿Puedo ver cómo respondería antes de conectarlo a mi Instagram?',
    reply: 'Sí. Podemos simular varios perfiles de cliente y ajustar el tono antes de activar nada.',
    followUp: 'Genial, quiero probar una conversación sobre precios.',
    need: 'Validar el tono',
    detail: 'Simulación',
    state: 'En pruebas',
  },
  {
    lead: 'Un contacto está preguntando por una condición que no habíamos configurado.',
    reply: 'He pausado el envío y he marcado la conversación para que puedas revisarla.',
    followUp: 'Perfecto, respondo yo y después añadimos la regla.',
    need: 'Intervención',
    detail: 'Modo manual',
    state: 'Bajo control',
  },
]

const integrationItems = [
  { name: 'Instagram', icon: Instagram },
  { name: 'Calendario', icon: CalendarCheck },
  { name: 'Webhooks', icon: Link2 },
  { name: 'Mensajería', icon: MessageCircle },
  { name: 'CRM', icon: Users },
  { name: 'Automatización', icon: Zap },
]

function Brand({ light = false }: { light?: boolean }) {
  return (
    <button className={`brand ${light ? 'brand--light' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Ir al inicio">
      <span className="brand-mark" aria-hidden="true"><span /><span /></span>
      <span>setter</span>
      <i>.</i>
    </button>
  )
}

function PillButton({ children, variant = 'primary', onClick, icon = true }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'light'; onClick?: () => void; icon?: boolean }) {
  return (
    <button className={`pill-button pill-button--${variant}`} onClick={onClick}>
      <span>{children}</span>{icon && <ArrowRight size={17} />}
    </button>
  )
}

function HeroChat() {
  return (
    <div className="hero-product" aria-label="Vista previa de una conversación con el setter">
      <div className="hero-product__glow" />
      <div className="chat-window">
        <div className="chat-window__head">
          <div className="assistant-avatar"><Sparkles size={18} /></div>
          <div><strong>Nora</strong><span><i /> Asistente activo</span></div>
          <div className="sound-wave"><b /><b /><b /><b /><b /></div>
        </div>
        <div className="chat-window__body">
          <div className="lead-chip"><Instagram size={15} /> Nuevo mensaje de Instagram</div>
          <div className="bubble bubble--lead">Hola, he visto vuestro programa. ¿Crees que podría encajarme?</div>
          <div className="bubble bubble--assistant">¡Hola, Lucía! Claro. Para orientarte bien, ¿qué objetivo te gustaría conseguir ahora mismo?</div>
          <div className="chat-typing"><span /><span /><span /> Nora está escribiendo</div>
        </div>
        <div className="chat-window__insight">
          <div><Target size={17} /><span><small>Intención detectada</small><strong>Interés en el programa</strong></span></div>
          <span className="status-chip status-chip--green">Cualificando</span>
        </div>
      </div>
      <div className="floating-note floating-note--top"><CheckCircle2 size={18} /><span><strong>Control humano</strong><small>Pausa la IA cuando quieras</small></span></div>
    </div>
  )
}

function FlowIllustration({ type }: { type: 'respond' | 'qualify' | 'control' }) {
  if (type === 'respond') return (
    <div className="flow-visual flow-visual--respond">
      <div className="mini-source"><Instagram size={16} /> Instagram <span>ahora</span></div>
      <div className="flow-dots"><i /><i /><i /></div>
      <div className="mini-reply"><span className="mini-orb"><Sparkles size={14} /></span><span><small>Respuesta lista</small><strong>en segundos</strong></span><Check size={17} /></div>
    </div>
  )
  if (type === 'qualify') return (
    <div className="flow-visual flow-visual--qualify">
      <div className="score-ring"><span>84</span><small>encaje</small></div>
      <div className="criteria"><span><Check size={14} /> Tiene necesidad</span><span><Check size={14} /> Decide la compra</span><span><Check size={14} /> Quiere empezar pronto</span></div>
    </div>
  )
  return (
    <div className="flow-visual flow-visual--control">
      <div className="mode-row"><span><Bot size={16} /> Modo copiloto</span><div className="switch-on"><i /></div></div>
      <div className="suggestion-card"><Sparkles size={15} /><span><small>Sugerencia de Nora</small>Perfecto, ¿cuándo te vendría bien hablar?</span></div>
      <div className="approve-row"><button><X size={15} /></button><button><Check size={15} /> Aprobar</button></div>
    </div>
  )
}

export function Landing({ openApp, openLogin, authenticated }: { openApp: () => void; openLogin: () => void; authenticated: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSolution, setActiveSolution] = useState(1)
  const [activeProcess, setActiveProcess] = useState(0)
  const landingRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const scene = processScenes[activeProcess]

  useEffect(() => {
    const root = landingRef.current
    const hero = heroRef.current
    const nav = navRef.current
    if (!root || !hero || !nav) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const revealItems = root.querySelectorAll<HTMLElement>(
      '.hero-copy > *, .hero-product, .section-heading, .solution-card, .process-copy > *, .process-demo, .integration-copy, .integration-marquee, .browser-frame, .customize-copy > *, .settings-mock, .control-grid article, .final-cta__inner > *',
    )

    root.classList.add('motion-ready')
    revealItems.forEach((element, index) => {
      element.classList.add('reveal-item')
      element.style.setProperty('--reveal-delay', `${(index % 3) * 90}ms`)
    })

    let observer: IntersectionObserver | undefined
    if (reducedMotion) {
      revealItems.forEach(element => element.classList.add('is-visible'))
    } else {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer?.unobserve(entry.target)
          }
        })
      }, { threshold: 0.14, rootMargin: '0px 0px -9% 0px' })
      revealItems.forEach(element => observer?.observe(element))
    }

    const updateScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      nav.style.setProperty('--scroll-progress', `${Math.min(100, (window.scrollY / maxScroll) * 100)}%`)
      setScrolled(window.scrollY > 90)
    }
    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })

    const onHeroPointer = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      hero.style.setProperty('--pointer-x', `${x * 100}%`)
      hero.style.setProperty('--pointer-y', `${y * 100}%`)
    }

    const tiltCleanups: Array<() => void> = []
    if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
      hero.addEventListener('pointermove', onHeroPointer)
      root.querySelectorAll<HTMLElement>('[data-tilt]').forEach(element => {
        const move = (event: PointerEvent) => {
          const rect = element.getBoundingClientRect()
          const x = (event.clientX - rect.left) / rect.width - 0.5
          const y = (event.clientY - rect.top) / rect.height - 0.5
          element.style.setProperty('--tilt-x', `${y * -4}deg`)
          element.style.setProperty('--tilt-y', `${x * 5}deg`)
          element.style.setProperty('--shine-x', `${(x + 0.5) * 100}%`)
          element.style.setProperty('--shine-y', `${(y + 0.5) * 100}%`)
        }
        const leave = () => {
          element.style.setProperty('--tilt-x', '0deg')
          element.style.setProperty('--tilt-y', '0deg')
        }
        element.addEventListener('pointermove', move)
        element.addEventListener('pointerleave', leave)
        tiltCleanups.push(() => {
          element.removeEventListener('pointermove', move)
          element.removeEventListener('pointerleave', leave)
        })
      })
    }

    return () => {
      observer?.disconnect()
      window.removeEventListener('scroll', updateScroll)
      hero.removeEventListener('pointermove', onHeroPointer)
      tiltCleanups.forEach(cleanup => cleanup())
    }
  }, [])

  return (
    <div className="landing" ref={landingRef}>
      <section className="hero" id="inicio" ref={heroRef}>
        <div className="hero-grid" />
        <header className={`marketing-nav ${scrolled ? 'is-scrolled' : ''}`} ref={navRef}>
          <Brand />
          <nav className={menuOpen ? 'marketing-nav__links is-open' : 'marketing-nav__links'} aria-label="Navegación principal">
            <a href="#como" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
            <a href="#producto" onClick={() => setMenuOpen(false)}>Producto</a>
            <a href="#control" onClick={() => setMenuOpen(false)}>Control</a>
          </nav>
          <button className="nav-login" onClick={openLogin}>{authenticated ? 'Mi panel' : 'Iniciar sesión'} <ArrowRight size={16} /></button>
          <button className="nav-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">{menuOpen ? <X /> : <Menu />}</button>
        </header>

        <div className="hero-inner page-shell">
          <div className="hero-copy">
            <div className="eyebrow"><span><Instagram size={16} /></span> Setter de IA para Instagram</div>
            <h1>
              <span className="hero-title-main">Convierte<br />mensajes.</span>
              <span className="hero-title-muted">Tú solo</span>
              <span className="hero-title-accent">cierras.</span>
            </h1>
            <p>Tu asistente conversa, cualifica y prepara el siguiente paso. Tú decides cómo responde y cuándo tomar el control.</p>
            <div className="hero-actions">
              <PillButton variant="primary" onClick={openApp}>{authenticated ? 'Ir a mi panel' : 'Crear cuenta'}</PillButton>
              <a className="text-link" href="#como">Descubrir cómo funciona <ArrowRight size={16} /></a>
            </div>
            <div className="hero-proof">
              <div><strong>3 modos</strong><span>Manual · copiloto · auto</span></div>
              <div><strong>Tu criterio</strong><span>Entrenado para tu negocio</span></div>
              <div><strong>Tu control</strong><span>Intervén en cualquier momento</span></div>
            </div>
          </div>
          <HeroChat />
        </div>
      </section>

      <main>
        <section className="solutions section" id="producto">
          <div className="page-shell">
            <div className="section-heading section-heading--row">
              <h2>Todo lo que necesitas<br /><span>para conversar mejor.</span></h2>
              <PillButton variant="secondary" onClick={openApp}>Explorar el panel</PillButton>
            </div>
            <div className="solution-grid">
              <article tabIndex={0} data-tilt className={`solution-card ${activeSolution === 0 ? 'solution-card--featured' : ''}`} onMouseEnter={() => setActiveSolution(0)} onFocus={() => setActiveSolution(0)}><FlowIllustration type="respond" /><div className="solution-card__copy"><span>01</span><h3>Responde con contexto</h3><p>El asistente utiliza la información de tu negocio y el historial del contacto para mantener una conversación coherente.</p></div></article>
              <article tabIndex={0} data-tilt className={`solution-card ${activeSolution === 1 ? 'solution-card--featured' : ''}`} onMouseEnter={() => setActiveSolution(1)} onFocus={() => setActiveSolution(1)}><FlowIllustration type="qualify" /><div className="solution-card__copy"><span>02</span><h3>Cualifica con tu criterio</h3><p>Define qué debe preguntar, qué señales importan y cuándo una persona está preparada para reservar.</p></div></article>
              <article tabIndex={0} data-tilt className={`solution-card ${activeSolution === 2 ? 'solution-card--featured' : ''}`} onMouseEnter={() => setActiveSolution(2)} onFocus={() => setActiveSolution(2)}><FlowIllustration type="control" /><div className="solution-card__copy"><span>03</span><h3>Conserva el control</h3><p>Revisa propuestas, edita respuestas o toma la conversación sin perder el contexto recopilado.</p></div></article>
            </div>
          </div>
        </section>

        <section className="process section" id="como">
          <div className="page-shell process-layout">
            <div className="process-copy">
              <span className="section-kicker">Cómo funciona</span>
              <h2>De un mensaje a una conversación que avanza.</h2>
              <p>Configura una vez el criterio de tu negocio y mejora el asistente con cada revisión.</p>
              <div className="process-steps">
                {[
                  ['01', 'Conecta tu cuenta', 'Centraliza las conversaciones que ya llegan a tu Instagram.'],
                  ['02', 'Explica qué vendes', 'Añade tu oferta, cliente ideal, preguntas y límites.'],
                  ['03', 'Prueba el asistente', 'Simula conversaciones antes de activar los cambios.'],
                  ['04', 'Supervisa y mejora', 'Revisa los chats y ajusta el comportamiento desde el panel.'],
                ].map(([number, title, text], index) => <button type="button" className={`process-step ${index === activeProcess ? 'is-active' : ''}`} onMouseEnter={() => setActiveProcess(index)} onFocus={() => setActiveProcess(index)} onClick={() => setActiveProcess(index)} key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></button>)}
              </div>
            </div>
            <div className="process-demo">
              <div className="process-demo__top"><span>Conversación en directo</span><span className="status-chip status-chip--green"><i /> IA activa</span></div>
              <div className="process-person"><span className="avatar avatar--coral">LM</span><div><strong>Lucía Martín</strong><small>@luciamartin</small></div><button><MoreHorizontal size={20} /></button></div>
              <div className="process-chat">
                <div className="bubble bubble--lead" key={`lead-${activeProcess}`}>{scene.lead}</div>
                <div className="bubble bubble--assistant" key={`reply-${activeProcess}`}>{scene.reply}</div>
                <div className="bubble bubble--lead" key={`follow-${activeProcess}`}>{scene.followUp}</div>
              </div>
              <div className="process-summary">
                <div className="summary-label"><Sparkles size={16} /> Resumen del asistente</div>
                <div className="summary-grid"><span><small>Necesidad</small><strong>{scene.need}</strong></span><span><small>Detalle</small><strong>{scene.detail}</strong></span><span><small>Estado</small><strong className="green-text">{scene.state}</strong></span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="integration-band section" aria-label="Integraciones disponibles">
          <div className="page-shell integration-copy">
            <span className="section-kicker">Se conecta con tu proceso</span>
            <h2>Las herramientas que ya utilizas,<br /><span>en el mismo flujo.</span></h2>
          </div>
          <div className="integration-marquee">
            {[0, 1].map(row => <div className={`marquee-row ${row === 1 ? 'marquee-row--reverse' : ''}`} key={row}><div className="marquee-track">{[...integrationItems, ...integrationItems].map(({ name, icon: Icon }, index) => <div className="marquee-item" key={`${row}-${name}-${index}`}><Icon size={20} /><span>{name}</span></div>)}</div></div>)}
          </div>
        </section>

        <section className="panel-showcase section" id="control">
          <div className="page-shell">
            <div className="section-heading section-heading--center">
              <span className="section-kicker">Tu espacio de trabajo</span>
              <h2>Un panel. Todo bajo control.</h2>
              <p>Configura, supervisa y mejora el setter sin tocar automatizaciones.</p>
            </div>
            <div className="browser-frame" data-tilt>
              <div className="browser-bar"><span /><span /><span /><i>app.setter.local</i></div>
              <div className="browser-content">
                <aside className="mini-sidebar"><Brand light /><div><i className="active"><LayoutDashboard /></i><i><MessageCircle /></i><i><Users /></i><i><Bot /></i><i><BookOpen /></i></div></aside>
                <div className="mini-dashboard">
                  <div className="mini-dashboard__head"><span><small>Buenos días, Álex</small><strong>Tu setter está trabajando.</strong></span><span className="status-chip status-chip--green"><i /> Activo</span></div>
                  <div className="metric-grid"><div><MessageCircle /><span><small>Conversaciones</small><strong>28</strong></span><b>+6</b></div><div><Target /><span><small>Cualificados</small><strong>11</strong></span><b>39%</b></div><div><CalendarCheck /><span><small>Reservas</small><strong>5</strong></span><b>esta semana</b></div></div>
                  <div className="dashboard-table"><div className="dashboard-table__title"><strong>Conversaciones recientes</strong><span>Ver todas <ArrowRight /></span></div>{conversations.slice(0, 3).map(c => <div className="dashboard-row" key={c.id}><span className="avatar">{c.avatar}</span><span><strong>{c.name}</strong><small>{c.preview}</small></span><span className="status-chip">{c.stage}</span><small>{c.time}</small></div>)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="customize section">
          <div className="page-shell customize-layout">
            <div className="customize-copy"><span className="section-kicker">Hecho para tu negocio</span><h2>Haz que responda como tú responderías.</h2><p>Define el tono, las preguntas y los límites con controles claros. Cada cambio se puede probar antes de activarlo.</p><ul><li><CheckCircle2 /> Una pregunta cada vez</li><li><CheckCircle2 /> Información comercial aprobada</li><li><CheckCircle2 /> Derivación cuando hace falta</li></ul><PillButton variant="light" onClick={openApp}>Configurar mi asistente</PillButton></div>
            <div className="settings-mock" data-tilt>
              <div className="settings-mock__head"><div><span className="assistant-avatar"><Sparkles size={17} /></span><span><small>Tu asistente</small><strong>Nora</strong></span></div><span className="saved"><Check size={14} /> Guardado</span></div>
              <div className="setting-block"><label>Tono de voz</label><div className="tone-pills"><span>Cercano</span><span className="active">Profesional</span><span>Directo</span></div></div>
              <div className="setting-block"><label>Objetivo principal</label><div className="fake-select"><Target size={17} /> Conseguir una reserva <ChevronDown size={17} /></div></div>
              <div className="setting-block"><label>Regla de conversación</label><div className="fake-textarea">Haz una sola pregunta por mensaje y entiende la necesidad antes de hablar del servicio.</div></div>
              <div className="settings-preview"><span><Sparkles size={14} /> Vista previa</span><p>¡Gracias por contármelo! Para entender mejor tu situación, ¿qué resultado te gustaría conseguir primero?</p></div>
            </div>
          </div>
        </section>

        <section className="control section">
          <div className="page-shell">
            <div className="section-heading section-heading--row"><h2>La IA ayuda.<br /><span>Tú decides.</span></h2><p>El sistema está diseñado para darte visibilidad y control en los momentos que importan.</p></div>
            <div className="control-grid"><article data-tilt><span><Pause /></span><h3>Pausa inmediata</h3><p>Detén el asistente en una conversación y responde personalmente.</p></article><article data-tilt><span><ShieldCheck /></span><h3>Límites claros</h3><p>Define qué puede decir y cuándo debe pedir ayuda.</p></article><article data-tilt><span><FileText /></span><h3>Contexto visible</h3><p>Consulta qué sabe del contacto y por qué propone el siguiente paso.</p></article></div>
          </div>
        </section>

        <section className="final-cta section">
          <div className="final-grid" />
          <div className="page-shell final-cta__inner"><div><span className="section-kicker section-kicker--light">Primera versión</span><h2>Empieza por una conversación.<br /><span>Mejora a partir de ahí.</span></h2></div><div><p>Crea tu cuenta y accede a tu espacio para supervisar tu setter de IA.</p><PillButton variant="primary" onClick={openApp}>{authenticated ? 'Ir a mi panel' : 'Crear cuenta'}</PillButton></div></div>
        </section>
      </main>

      <footer className="footer"><div className="page-shell footer-grid"><div><Brand /><p>Convierte conversaciones de Instagram en oportunidades reales.</p></div><div><strong>Producto</strong><a href="#como">Cómo funciona</a><a href="#producto">Funciones</a><button onClick={openLogin}>Iniciar sesión</button></div><div><strong>Recursos</strong><a href="#control">Control y seguridad</a><a href="#inicio">Preguntas frecuentes</a></div><div><strong>Estado</strong><span className="footer-status"><i /> Prototipo frontend</span></div></div><div className="page-shell footer-bottom"><span>© 2026 Setter. Diseño de producto en desarrollo.</span><span>Privacidad · Aviso legal</span></div></footer>
    </div>
  )
}

function StatusPill({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'green' | 'amber' | 'blue' }) {
  return <span className={`app-status app-status--${tone}`}>{children}</span>
}

function AppHeader({ title, subtitle, goHome }: { title: string; subtitle?: string; goHome: () => void }) {
  const { user } = useAuth()
  return <header className="app-topbar"><div><div className="mobile-brand" onClick={goHome}><Brand /></div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="app-topbar__actions"><button className="icon-button" aria-label="Ayuda"><CircleHelp size={19} /></button><span className="avatar-button" title={user?.name}>{user?.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span></div></header>
}

function ConversationsSection() {
  const [selected, setSelected] = useState(conversations[0])
  const [mode, setMode] = useState<'Auto' | 'Copiloto' | 'Manual'>(selected.mode)
  const [draft, setDraft] = useState('Sí, también trabajamos con tiendas online. Para entender tu caso, ¿qué tipo de productos vendes?')
  return <div className="conversation-page"><AppHeader title="Conversaciones" subtitle="Supervisa y toma el control cuando lo necesites." goHome={() => undefined} /><div className="conversation-layout">
    <aside className="conversation-list"><div className="conversation-search"><Search size={18} /><input aria-label="Buscar conversación" placeholder="Buscar conversación" /><SlidersHorizontal size={18} /></div><div className="conversation-tabs"><button className="active">Todas <span>28</span></button><button>Pendientes <span>2</span></button></div><div className="conversation-items">{conversations.map(c => <button className={selected.id === c.id ? 'active' : ''} key={c.id} onClick={() => { setSelected(c); setMode(c.mode) }}><span className={`avatar ${c.id === 1 ? 'avatar--coral' : ''}`}>{c.avatar}</span><span className="conversation-item__body"><span><strong>{c.name}</strong><time>{c.time}</time></span><small>{c.preview}</small><span><StatusPill tone={c.stage === 'Cualificado' || c.stage === 'Cita propuesta' ? 'green' : c.stage === 'Nuevo' ? 'blue' : 'amber'}>{c.stage}</StatusPill>{c.unread > 0 && <b>{c.unread}</b>}</span></span></button>)}</div></aside>
    <section className="active-chat"><header><div><span className="avatar avatar--coral">{selected.avatar}</span><span><strong>{selected.name}</strong><small>{selected.username} · Instagram</small></span></div><div className="chat-mode"><span>Modo</span><select value={mode} onChange={e => setMode(e.target.value as typeof mode)} aria-label="Modo de la conversación"><option>Auto</option><option>Copiloto</option><option>Manual</option></select><button><MoreHorizontal /></button></div></header><div className="active-chat__messages"><div className="chat-day">Hoy</div><div className="message incoming"><p>Hola, he visto vuestro programa y me interesa saber un poco más.</p><time>10:38</time></div><div className="message outgoing"><p>¡Hola, {selected.name.split(' ')[0]}! Encantada. Para orientarte bien, ¿qué te gustaría mejorar ahora mismo en tu negocio?</p><time>10:39 · IA</time></div><div className="message incoming"><p>Sobre todo quiero ahorrar tiempo con los mensajes. ¿Trabajáis también con tiendas online?</p><time>10:42</time></div></div><div className="ai-draft"><div className="ai-draft__label"><span><Sparkles size={15} /> Respuesta sugerida</span><small>Puedes editarla antes de enviar</small></div><textarea value={draft} onChange={e => setDraft(e.target.value)} aria-label="Respuesta sugerida" /><div className="ai-draft__actions"><button className="draft-secondary"><Sparkles size={15} /> Regenerar</button><button className="draft-send">Enviar respuesta <Send size={15} /></button></div></div></section>
    <aside className="contact-panel"><div className="contact-panel__person"><span className="avatar avatar--large avatar--coral">{selected.avatar}</span><h3>{selected.name}</h3><p>{selected.username}</p><StatusPill tone="amber">{selected.stage}</StatusPill></div><div className="contact-panel__section"><h4>Información detectada</h4><dl><div><dt>Necesidad</dt><dd>Ahorrar tiempo en mensajes</dd></div><div><dt>Tipo de negocio</dt><dd>Tienda online</dd></div><div><dt>Plazo</dt><dd>Sin confirmar</dd></div></dl><button><Plus size={15} /> Añadir dato</button></div><div className="contact-panel__section"><h4>Siguiente objetivo</h4><div className="next-goal"><Target size={17} /><span><strong>Confirmar volumen</strong><small>Preguntar cuántos mensajes recibe</small></span></div></div><div className="contact-panel__section"><h4>Notas</h4><textarea placeholder="Añade una nota privada…" /></div></aside>
  </div></div>
}

function ContactsSection() {
  return <><AppHeader title="Contactos" subtitle="Consulta el contexto y el estado de cada oportunidad." goHome={() => undefined} /><div className="app-page-content"><div className="toolbar"><div className="table-search"><Search size={18} /><input placeholder="Buscar por nombre o usuario" /></div><button className="filter-button"><SlidersHorizontal size={17} /> Filtros</button><button className="primary-small"><Plus size={17} /> Nuevo contacto</button></div><section className="app-card contacts-table"><div className="table-head"><span>Contacto</span><span>Necesidad</span><span>Estado</span><span>Modo</span><span>Última actividad</span><span /></div>{conversations.map((c, i) => <div className="table-row" key={c.id}><span className="person-cell"><span className="avatar">{c.avatar}</span><span><strong>{c.name}</strong><small>{c.username}</small></span></span><span>{['Automatizar mensajes', 'Conseguir más reservas', 'Conocer el producto', 'Organizar al equipo'][i]}</span><span><StatusPill tone={c.stage === 'Cualificado' || c.stage === 'Cita propuesta' ? 'green' : c.stage === 'Nuevo' ? 'blue' : 'amber'}>{c.stage}</StatusPill></span><span>{c.mode}</span><span>{c.time}</span><button><MoreHorizontal size={18} /></button></div>)}</section></div></>
}

function AssistantSection() {
  const [tone, setTone] = useState('Profesional')
  const [length, setLength] = useState(45)
  return <><AppHeader title="Mi asistente" subtitle="Decide cómo habla, pregunta y avanza Nora." goHome={() => undefined} /><div className="app-page-content settings-layout"><div className="settings-main"><section className="app-card form-card"><div className="form-card__title"><span className="metric-icon mint"><Bot /></span><div><h3>Identidad y tono</h3><p>Define cómo se presenta y cómo debe sonar.</p></div></div><div className="form-grid"><label><span>Nombre del asistente</span><input defaultValue="Nora" /></label><label><span>Cómo debe presentarse</span><select defaultValue="equipo"><option value="equipo">Como parte del equipo</option><option value="asistente">Como asistente virtual</option></select></label></div><label className="field-label"><span>Tono principal</span><div className="option-pills">{['Cercano', 'Profesional', 'Directo', 'Enérgico'].map(item => <button className={tone === item ? 'active' : ''} onClick={() => setTone(item)} key={item}>{tone === item && <Check size={15} />}{item}</button>)}</div></label><label className="field-label"><span>Longitud de las respuestas</span><div className="range-labels"><small>Muy breves</small><small>Detalladas</small></div><input className="range-input" type="range" value={length} onChange={e => setLength(Number(e.target.value))} /></label></section><section className="app-card form-card"><div className="form-card__title"><span className="metric-icon peach"><Target /></span><div><h3>Objetivo y cualificación</h3><p>Marca el camino que debe seguir cada conversación.</p></div></div><label className="field-label"><span>Objetivo principal</span><div className="large-select"><CalendarCheck size={18} /><span><strong>Conseguir una reserva</strong><small>Ofrecer el enlace cuando el contacto encaje</small></span><ChevronDown size={18} /></div></label><div className="question-list"><span>Preguntas de cualificación</span>{['¿Qué objetivo quieres conseguir?', '¿Qué estás haciendo actualmente?', '¿Cuándo te gustaría empezar?'].map((q, i) => <div key={q}><b>{i + 1}</b><input defaultValue={q} /><MoreHorizontal size={17} /></div>)}<button><Plus size={16} /> Añadir pregunta</button></div></section></div><aside className="settings-aside"><section className="app-card live-preview"><span className="preview-label"><Sparkles size={15} /> Vista previa</span><div className="preview-person"><span className="assistant-avatar"><Sparkles size={16} /></span><span><strong>Nora</strong><small>{tone} · respuestas {length < 50 ? 'breves' : 'detalladas'}</small></span></div><div className="bubble bubble--lead">Me gustaría saber si esto encaja con mi negocio.</div><div className="bubble bubble--assistant">¡Claro! Para orientarte bien, ¿qué tipo de negocio tienes y qué te gustaría mejorar?</div><button>Probar conversación <ArrowRight size={15} /></button></section><section className="save-box"><div><CheckCircle2 size={18} /><span><strong>Cambios guardados</strong><small>Solo se aplicarán al publicarlos.</small></span></div><button>Publicar configuración</button></section></aside></div></>
}

function BusinessSection() {
  return <><AppHeader title="Mi negocio" subtitle="La información que Nora utilizará para responder con precisión." goHome={() => undefined} /><div className="app-page-content settings-layout"><div className="settings-main"><section className="app-card form-card"><div className="form-card__title"><span className="metric-icon mint"><BookOpen /></span><div><h3>Información general</h3><p>Ayuda al asistente a entender qué haces y para quién.</p></div></div><div className="form-grid"><label><span>Nombre del negocio</span><input defaultValue="Estudio Norte" /></label><label><span>Sector</span><select defaultValue="consultoria"><option value="consultoria">Consultoría</option><option>Formación</option><option>Servicios</option></select></label></div><label className="field-label"><span>Qué vendes</span><textarea defaultValue="Programa de acompañamiento para pequeños negocios que quieren automatizar su captación y organizar mejor sus conversaciones comerciales." /></label><label className="field-label"><span>Cliente ideal</span><textarea defaultValue="Dueños de negocios de servicios que reciben consultas por Instagram y gestionan las respuestas personalmente." /></label></section><section className="app-card form-card"><div className="form-card__title"><span className="metric-icon peach"><MessageSquareText /></span><div><h3>Preguntas y objeciones</h3><p>Prepara respuestas seguras para los temas habituales.</p></div></div><div className="knowledge-item"><span><strong>¿Cuánto cuesta?</strong><small>El programa se adapta al volumen y las necesidades. Nora debe entender el caso antes de hablar de precio.</small></span><button><MoreHorizontal /></button></div><div className="knowledge-item"><span><strong>¿Puedo probarlo?</strong><small>Sí. Podemos enseñar una simulación adaptada al negocio antes de activar la automatización.</small></span><button><MoreHorizontal /></button></div><button className="add-knowledge"><Plus size={16} /> Añadir pregunta frecuente</button></section></div><aside className="settings-aside"><section className="app-card completeness"><div className="completion-ring">72<small>%</small></div><h3>Perfil casi completo</h3><p>Añade precios y condiciones para mejorar la precisión de las respuestas.</p><div><span>Información general <Check size={15} /></span><span>Cliente ideal <Check size={15} /></span><span className="pending">Precios y condiciones <ArrowRight size={15} /></span></div></section><section className="tip-box"><Sparkles size={18} /><div><strong>Cuanto más concreto, mejor</strong><p>Nora nunca inventará información. Si algo no está definido, te pedirá intervenir.</p></div></section></aside></div></>
}

function SimulatorSection() {
  const [messages, setMessages] = useState([{ from: 'bot', text: '¡Hola! Soy Nora, del equipo de Estudio Norte. ¿En qué puedo ayudarte?' }])
  const [input, setInput] = useState('')
  const sendMessage = () => { if (!input.trim()) return; const text = input.trim(); setMessages(prev => [...prev, { from: 'user', text }, { from: 'bot', text: 'Gracias por contármelo. Para orientarte bien, ¿qué resultado te gustaría conseguir primero?' }]); setInput('') }
  return <><AppHeader title="Probar asistente" subtitle="Simula una conversación sin afectar chats reales." goHome={() => undefined} /><div className="app-page-content simulator-layout"><section className="simulator-chat app-card"><header><div><span className="assistant-avatar"><Sparkles size={17} /></span><span><strong>Nora</strong><small>Entorno de prueba</small></span></div><button onClick={() => setMessages([{ from: 'bot', text: '¡Hola! Soy Nora, del equipo de Estudio Norte. ¿En qué puedo ayudarte?' }])}>Reiniciar</button></header><div className="simulator-messages">{messages.map((m, i) => <div key={i} className={`message ${m.from === 'bot' ? 'outgoing' : 'incoming'}`}><p>{m.text}</p></div>)}</div><div className="simulator-input"><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Escribe como si fueras un cliente…" /><button onClick={sendMessage}><Send size={17} /></button></div></section><aside className="simulator-insights"><section className="app-card"><span className="preview-label"><Sparkles size={15} /> Lectura de la conversación</span><dl><div><dt>Intención</dt><dd>Explorando el servicio</dd></div><div><dt>Estado</dt><dd><StatusPill tone="blue">Nuevo</StatusPill></dd></div><div><dt>Datos recogidos</dt><dd>{Math.max(0, messages.length - 1)} de 3</dd></div><div><dt>Siguiente paso</dt><dd>Entender la necesidad</dd></div></dl></section><section className="tip-box"><ShieldCheck size={18} /><div><strong>Entorno seguro</strong><p>Esta prueba no se guarda como contacto ni se envía a Instagram.</p></div></section></aside></div></>
}

function IntegrationsSection() {
  return <><AppHeader title="Integraciones" subtitle="Conecta los canales que utiliza tu negocio." goHome={() => undefined} /><div className="app-page-content"><div className="integration-grid"><article className="app-card integration-card integration-card--connected"><div className="integration-logo instagram-logo"><Instagram /></div><div><span className="connected-label"><i /> Conectado</span><h3>Instagram</h3><p>Recibe y responde mensajes desde tu cuenta profesional.</p></div><button>Gestionar <ArrowRight size={15} /></button></article><article className="app-card integration-card"><div className="integration-logo calendar-logo"><CalendarCheck /></div><div><span className="soon-label">Recomendado</span><h3>Calendario</h3><p>Comparte disponibilidad y registra reservas conseguidas.</p></div><button>Conectar <Plus size={15} /></button></article><article className="app-card integration-card"><div className="integration-logo webhook-logo"><Zap /></div><div><span className="soon-label">Avanzado</span><h3>Webhooks</h3><p>Envía eventos a tus herramientas y automatizaciones.</p></div><button>Configurar <ArrowRight size={15} /></button></article></div><section className="app-card connection-log"><div className="app-card__header"><div><h3>Estado de las conexiones</h3><p>Últimas comprobaciones realizadas.</p></div><button>Comprobar ahora</button></div><div><span className="metric-icon mint"><Instagram /></span><span><strong>Instagram</strong><small>Conexión verificada correctamente</small></span><StatusPill tone="green">Operativo</StatusPill><time>Hace 4 min</time></div></section></div></>
}

export function AppDashboard({ goLanding }: { goLanding: () => void }) {
  const { user, profile, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const companyInitials = (profile?.company_name || 'Mi negocio').trim().slice(0, 2).toUpperCase()
  const logout = async () => {
    setSigningOut(true)
    setSignOutError('')
    try { await signOut() } catch (cause) { setSignOutError(cause instanceof Error ? cause.message : 'No se ha podido cerrar la sesión.') }
    finally { setSigningOut(false) }
  }
  const [section, setSection] = useState<Section>('inicio')
  const [mobileMore, setMobileMore] = useState(false)
  const activeLabel = useMemo(() => navItems.find(item => item.id === section)?.label, [section])
  return <div className="app-shell"><aside className="app-sidebar"><div className="app-sidebar__brand"><Brand light /><button className="collapse-button"><ChevronDown size={17} /></button></div><div className="workspace-select"><span>{companyInitials}</span><div><small>Espacio de trabajo</small><strong>{profile?.company_name || 'Mi negocio'}</strong></div><ChevronDown size={16} /></div><nav aria-label="Panel principal">{navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)} title={item.label}><Icon size={19} /><span>{item.label}</span></button> })}</nav><div className="app-sidebar__bottom"><button onClick={() => void logout()} disabled={signingOut} title="Cerrar sesión"><LogOut size={19} /><span>{signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span></button><button onClick={goLanding}><ExternalLink size={19} /><span>Ver web pública</span></button><div className="sidebar-profile"><span>{initials}</span><div><strong>{user?.name}</strong><small>Cliente</small></div></div></div></aside><main className="app-main" aria-label={activeLabel}>{signOutError && <div className="client-error" role="alert">{signOutError}</div>}{section !== 'inicio' && <div className="client-demo-notice"><CircleHelp size={16} /><span>Vista previa del producto. Los datos y configuraciones de esta sección son ejemplos.</span></div>}<div className="app-view" key={section}>
    {section === 'inicio' && <ClientHome />}
    {section === 'conversaciones' && <ConversationsSection />}
    {section === 'contactos' && <ContactsSection />}
    {section === 'asistente' && <AssistantSection />}
    {section === 'negocio' && <BusinessSection />}
    {section === 'probar' && <SimulatorSection />}
    {section === 'integraciones' && <IntegrationsSection />}
  </div></main>{mobileMore && <div className="mobile-more-menu"><button className="mobile-more-backdrop" aria-label="Cerrar menú" onClick={() => setMobileMore(false)} /><div className="mobile-more-sheet"><div><strong>Más opciones</strong><button onClick={() => setMobileMore(false)}><X size={18} /></button></div>{navItems.slice(4).map(item => { const Icon = item.icon; return <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => { setSection(item.id); setMobileMore(false) }}><Icon size={19} /><span>{item.label}</span><ArrowRight size={15} /></button> })}<button onClick={goLanding}><ExternalLink size={19} /><span>Ver web pública</span><ArrowRight size={15} /></button><button className="client-logout-mobile" disabled={signingOut} onClick={() => void logout()}><LogOut size={19} /><span>{signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span></button></div></div>}<nav className="mobile-app-nav">{navItems.slice(0, 4).map(item => { const Icon = item.icon; return <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => { setSection(item.id); setMobileMore(false) }}><Icon size={20} /><span>{item.label}</span></button> })}<button className={navItems.slice(4).some(item => item.id === section) ? 'active' : ''} onClick={() => setMobileMore(true)}><MoreHorizontal size={20} /><span>Más</span></button></nav></div>
}
