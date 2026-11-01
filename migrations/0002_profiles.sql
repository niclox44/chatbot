CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  platform_role TEXT NOT NULL DEFAULT 'client' CHECK (platform_role IN ('admin', 'client')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX profiles_role_created_idx ON profiles(platform_role, created_at DESC);

-- The public auth API has no write access to roles or account status.
CREATE TRIGGER create_client_profile AFTER INSERT ON user BEGIN
  INSERT INTO profiles(user_id, full_name, company_name) VALUES (NEW.id, NEW.name, NEW.company_name);
END;

CREATE TRIGGER sync_profile_details AFTER UPDATE OF name, company_name ON user BEGIN
  UPDATE profiles SET full_name = NEW.name, company_name = NEW.company_name WHERE user_id = NEW.id;
END;

-- Revocation is atomic with suspension, including sessions created concurrently.
CREATE TRIGGER revoke_suspended_sessions AFTER UPDATE OF status ON profiles WHEN NEW.status = 'suspended' BEGIN
  DELETE FROM session WHERE userId = NEW.user_id;
END;

CREATE TRIGGER prevent_suspended_session BEFORE INSERT ON session WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = NEW.userId AND status = 'active') BEGIN
  SELECT RAISE(ABORT, 'Account is not active');
END;
