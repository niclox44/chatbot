import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, CheckCircle2, ChevronRight, ExternalLink, LogOut, MessageCircle, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { requestApi } from '../../lib/api'
import type { AssistantStatus, ClientRecord } from '../../types/auth'
import '../../styles/admin.css'

const assistantLabels: Record<AssistantStatus, string> = {
  not_configured: 'Sin configurar',
  active: 'Activo',
  paused: 'En pausa',
}

const formatDate = (date: string) => new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(date))
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

export default function AdminDashboardPage() {
  const { user, signOut } = useAuth()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<ClientRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const detailHeading = useRef<HTMLHeadingElement>(null)

  const loadClients = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const result = await requestApi<{ clients: ClientRecord[] }>('/api/admin/clients', { signal })
      if (!signal?.aborted) setClients(result.clients)
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : 'No se han podido cargar los clientes.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadClients(controller.signal)
    return () => controller.abort()
  }, [loadClients])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    setSelected(null)
    setDetailError('')
    setNotice('')
    setDetailLoading(true)
    requestApi<{ client: ClientRecord }>(`/api/admin/clients/${encodeURIComponent(selectedId)}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setSelected(result.client) })
      .catch(cause => { if (!controller.signal.aborted) setDetailError(cause instanceof Error ? cause.message : 'No se ha podido cargar el detalle.') })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => controller.abort()
  }, [selectedId])

  useEffect(() => { if (selected) detailHeading.current?.focus() }, [selected?.user_id])

  async function toggleStatus() {
    if (!selected || busy) return
    setBusy(true)
    setDetailError('')
    setNotice('')
    try {
      const { client } = await requestApi<{ client: ClientRecord }>(`/api/admin/clients/${encodeURIComponent(selected.user_id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: selected.status === 'active' ? 'suspended' : 'active' }),
      })
      setSelected(client)
      setClients(current => current.map(item => item.user_id === client.user_id ? client : item))
      setNotice(client.status === 'active' ? 'Cuenta activada. El cliente puede iniciar sesión.' : 'Cuenta suspendida. Sus sesiones han quedado cerradas.')
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'No se ha podido actualizar la cuenta.')
    } finally { setBusy(false) }
  }

  async function logout() {
    setSigningOut(true)
    try { await signOut() } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido cerrar la sesión.')
    } finally { setSigningOut(false) }
  }

  const visibleClients = clients.filter(client => {
    const matchesQuery = `${client.full_name} ${client.email} ${client.company_name}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
    return matchesQuery && (filter === 'all' || client.status === filter)
  })

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-brand" to="/" aria-label="Setter, ir al inicio"><span className="brand-mark" aria-hidden="true"><span /><span /></span>setter<span>.</span></Link>
      <div className="admin-workspace"><ShieldCheck size={20} /><span><small>Espacio de trabajo</small><strong>Administración</strong></span></div>
      <nav aria-label="Administración"><a href="#clientes" className="admin-nav-active"><Users size={18} /> Clientes <ChevronRight size={16} /></a></nav>
      <div className="admin-sidebar-bottom"><Link to="/"><ExternalLink size={17} /> Ver web pública</Link><button onClick={() => void logout()} disabled={signingOut}><LogOut size={17} /> {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</button><div className="admin-identity"><span>{initials(user?.name || 'Admin')}</span><div><strong>{user?.name}</strong><small>Administrador de plataforma</small></div></div></div>
    </aside>
    <main className="admin-content" id="clientes">
      <header className="admin-header"><div><span className="admin-kicker">Plataforma</span><h1>Clientes</h1><p>Gestiona el acceso y consulta el estado de cada cuenta.</p></div><button className="admin-refresh" onClick={() => void loadClients()} disabled={loading}><RefreshCw size={16} /> Actualizar</button></header>
      {error && <div className="admin-error" role="alert">{error}</div>}
      <div className="admin-metrics" aria-label="Resumen de clientes">
        <article><span><Users size={21} /></span><div><small>Total de clientes</small><strong>{loading || error ? '—' : clients.length}</strong></div></article>
        <article><span><CheckCircle2 size={21} /></span><div><small>Cuentas activas</small><strong>{loading || error ? '—' : clients.filter(client => client.status === 'active').length}</strong></div></article>
        <article><span><MessageCircle size={21} /></span><div><small>Conversaciones</small><strong>{loading || error ? '—' : clients.reduce((sum, client) => sum + client.conversation_count, 0)}</strong></div></article>
      </div>
      <div className={`admin-client-layout ${selectedId ? 'has-detail' : ''}`}>
        <section className="admin-list" aria-label="Listado de clientes">
          <div className="admin-toolbar"><label className="admin-search"><Search size={17} /><input aria-label="Buscar clientes" placeholder="Nombre, email o negocio" value={query} onChange={event => setQuery(event.target.value)} /></label><select aria-label="Filtrar por estado" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todos los estados</option><option value="active">Activos</option><option value="suspended">Suspendidos</option></select></div>
          {loading ? <div className="admin-empty" role="status">Cargando clientes…</div> : error ? <div className="admin-empty"><p>No se pudo cargar el listado.</p><button className="admin-refresh" onClick={() => void loadClients()}>Reintentar</button></div> : visibleClients.length === 0 ? <div className="admin-empty"><Users size={30} /><h2>{clients.length ? 'Sin resultados' : 'Todavía no hay clientes'}</h2><p>{clients.length ? 'Prueba con otro nombre o estado.' : 'Las cuentas registradas aparecerán aquí automáticamente.'}</p></div> : <div className="admin-table-scroll"><table><thead><tr><th>Cliente</th><th>Estado</th><th>Asistente</th><th>Registro</th><th><span className="admin-sr-only">Detalle</span></th></tr></thead><tbody>{visibleClients.map(client => <tr key={client.user_id} className={selectedId === client.user_id ? 'is-selected' : ''}><td><div className="admin-person"><span>{initials(client.full_name)}</span><div><strong>{client.full_name}</strong><small>{client.company_name || client.email}</small></div></div></td><td><span className={`admin-state admin-state--${client.status}`}>{client.status === 'active' ? 'Activo' : 'Suspendido'}</span></td><td>{assistantLabels[client.assistant_status]}</td><td>{formatDate(client.created_at)}</td><td><button className="admin-detail-button" aria-label={`Ver detalle de ${client.full_name}`} onClick={() => setSelectedId(client.user_id)} disabled={busy}><ArrowRight size={17} /></button></td></tr>)}</tbody></table></div>}
        </section>
        {selectedId && <section className="admin-detail" aria-label="Detalle del cliente"><button className="admin-detail-close" aria-label="Cerrar detalle" disabled={busy} onClick={() => { setSelectedId(null); setSelected(null) }}><X size={18} /></button>
          {detailLoading && <p role="status">Cargando detalle…</p>}
          {detailError && <p role="alert" className="admin-error">{detailError}</p>}
          {selected && <><span className="admin-detail-avatar">{initials(selected.full_name)}</span><h2 ref={detailHeading} tabIndex={-1}>{selected.full_name}</h2><p className="admin-detail-company">{selected.company_name}</p><span className={`admin-state admin-state--${selected.status}`}>{selected.status === 'active' ? 'Cuenta activa' : 'Cuenta suspendida'}</span><dl><div><dt>Email</dt><dd>{selected.email}</dd></div><div><dt>Fecha de registro</dt><dd>{formatDate(selected.created_at)}</dd></div><div><dt>Asistente</dt><dd><Bot size={15} />{assistantLabels[selected.assistant_status]}</dd></div><div><dt>Conversaciones</dt><dd>{selected.conversation_count}</dd></div></dl><div className="admin-access"><h3>Acceso a la plataforma</h3><p>{selected.status === 'active' ? 'Al suspender la cuenta se cerrarán sus sesiones y se impedirá el acceso.' : 'Al activar la cuenta, el cliente podrá volver a iniciar sesión.'}</p><button className={selected.status === 'active' ? 'admin-suspend' : 'admin-activate'} disabled={busy} onClick={() => void toggleStatus()}>{busy ? 'Guardando…' : selected.status === 'active' ? 'Suspender cuenta' : 'Activar cuenta'}</button></div>{notice && <p className="admin-notice" role="status">{notice}</p>}</>}
        </section>}
      </div>
    </main>
  </div>
}
