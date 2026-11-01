import { useCallback, useEffect, useState } from 'react'
import { Bot, Building2, MessageCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { requestApi } from '../../lib/api'
import type { AssistantSummary } from '../../types/auth'

export default function ClientHome() {
  const { user, profile } = useAuth()
  const [summary, setSummary] = useState<AssistantSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const result = await requestApi<AssistantSummary>('/api/client/assistant', { signal })
      if (!signal?.aborted) setSummary(result)
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : 'No se ha podido cargar tu espacio.')
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [])
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])
  const assistantLabel = summary?.assistant_status === 'active' ? 'Activo' : summary?.assistant_status === 'paused' ? 'En pausa' : 'Sin configurar'
  return <>
    <header className="app-topbar"><div><h1>Hola, {user?.name.split(' ')[0]}</h1><p>Este es el espacio de {profile?.company_name || 'tu negocio'}.</p></div><span className="client-account-badge"><ShieldCheck size={15} /> Cuenta activa</span></header>
    <div className="app-page-content">
      <section className="client-welcome"><span><Bot size={26} /></span><div><small>Tu espacio de trabajo</small><h2>Todo empieza con una conversación.</h2><p>Tu cuenta ya está preparada. Aquí podrás consultar el estado de tu asistente y sus conversaciones.</p></div></section>
      {error && <div role="alert" className="client-error">{error} <button onClick={() => void load()}>Reintentar</button></div>}
      <div className="client-overview" aria-busy={loading}>
        <article><Bot size={21} /><small>Estado del asistente</small><strong>{loading || error ? '—' : assistantLabel}</strong></article>
        <article><MessageCircle size={21} /><small>Conversaciones</small><strong>{loading || error ? '—' : summary?.conversation_count ?? 0}</strong></article>
        <article><Building2 size={21} /><small>Negocio</small><strong>{profile?.company_name || 'Sin nombre'}</strong></article>
      </div>
      {!loading && !error && summary?.assistant_status === 'not_configured' && <section className="client-empty"><Bot size={32} /><h2>Tu asistente aún no está configurado</h2><p>Tu cuenta está creada. El asistente y la conexión con Instagram se habilitarán cuando estén configurados.</p></section>}
    </div>
  </>
}
