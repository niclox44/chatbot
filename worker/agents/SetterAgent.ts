import { DurableObject } from 'cloudflare:workers'
import type { AssistantSnapshot } from '../db/schema'

// One private, persistent state per client. AI configuration and messaging come later.
export class SetterAgent extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS assistant_state (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      client_id TEXT NOT NULL UNIQUE,
      assistant_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (assistant_status IN ('not_configured', 'active', 'paused')),
      conversation_count INTEGER NOT NULL DEFAULT 0 CHECK (conversation_count >= 0)
    )`)
  }

  getSnapshot(clientId: string): AssistantSnapshot {
    this.ctx.storage.sql.exec('INSERT OR IGNORE INTO assistant_state (singleton, client_id) VALUES (1, ?)', clientId)
    const state = this.ctx.storage.sql.exec<{ client_id: string; assistant_status: AssistantSnapshot['assistant_status']; conversation_count: number }>(
      'SELECT client_id, assistant_status, conversation_count FROM assistant_state WHERE singleton = 1',
    ).one()
    if (state.client_id !== clientId) throw new Error('Assistant tenant mismatch.')
    return { assistant_status: state.assistant_status, conversation_count: state.conversation_count }
  }
}
