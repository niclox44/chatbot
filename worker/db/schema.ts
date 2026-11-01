export type PlatformRole = 'admin' | 'client'
export type AccountStatus = 'active' | 'suspended'

export interface Profile {
  user_id: string
  full_name: string
  company_name: string
  platform_role: PlatformRole
  status: AccountStatus
  created_at: string
}

export interface SessionIdentity {
  user: { id: string; email: string; name: string }
  profile: Profile
}

export interface AssistantSnapshot {
  assistant_status: 'not_configured' | 'active' | 'paused'
  conversation_count: number
}

export interface ClientRecord extends Profile, AssistantSnapshot {
  email: string
  platform_role: 'client'
}

export type WorkerContext = {
  Bindings: Env
  Variables: { identity: SessionIdentity }
}

export function findProfile(db: D1Database, userId: string) {
  return db.prepare('SELECT user_id, full_name, company_name, platform_role, status, created_at FROM profiles WHERE user_id = ?').bind(userId).first<Profile>()
}
