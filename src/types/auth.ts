export type PlatformRole = 'admin' | 'client'
export type AccountStatus = 'active' | 'suspended'
export type AssistantStatus = 'not_configured' | 'active' | 'paused'

export type AuthIdentity = {
  id: string
  email: string
  name: string
}

export type UserProfile = {
  user_id: string
  full_name: string
  company_name: string
  platform_role: PlatformRole
  status: AccountStatus
  created_at: string
}

export type MeResponse = {
  user: AuthIdentity
  profile: UserProfile
}

export type AssistantSummary = {
  assistant_status: AssistantStatus
  conversation_count: number
}

export type ClientRecord = UserProfile & AssistantSummary & {
  email: string
  platform_role: 'client'
}
