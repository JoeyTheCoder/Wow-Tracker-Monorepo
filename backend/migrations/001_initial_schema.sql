CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE group_memberships (
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX group_memberships_user_id_idx ON group_memberships(user_id);

CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 64),
  realm text NOT NULL DEFAULT '' CHECK (length(realm) <= 64),
  class text NOT NULL DEFAULT '' CHECK (length(class) <= 32),
  level integer CHECK (level BETWEEN 1 AND 1000),
  game_updated_at timestamptz,
  server_received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, owner_user_id)
);

CREATE UNIQUE INDEX characters_owner_identity_idx
  ON characters(owner_user_id, lower(realm), lower(name));
CREATE INDEX characters_owner_user_id_idx ON characters(owner_user_id);

CREATE TABLE group_member_characters (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  character_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id, character_id),
  UNIQUE (group_id, character_id),
  FOREIGN KEY (group_id, user_id) REFERENCES group_memberships(group_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (character_id, user_id) REFERENCES characters(id, owner_user_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX group_member_one_active_character_idx
  ON group_member_characters(group_id, user_id) WHERE is_active;

CREATE TABLE group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  FOREIGN KEY (group_id, created_by_user_id) REFERENCES group_memberships(group_id, user_id) ON DELETE RESTRICT,
  CHECK (expires_at > created_at)
);

CREATE INDEX group_invites_group_id_idx ON group_invites(group_id);

CREATE TABLE dungeons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  zone text NOT NULL,
  recommended_min_level integer NOT NULL CHECK (recommended_min_level BETWEEN 1 AND 1000),
  recommended_max_level integer NOT NULL CHECK (recommended_max_level BETWEEN recommended_min_level AND 1000),
  sort_order integer NOT NULL UNIQUE,
  source_url text
);

CREATE TABLE group_dungeon_plan (
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  dungeon_id uuid NOT NULL REFERENCES dungeons(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL CHECK (sort_order >= 0),
  is_next boolean NOT NULL DEFAULT false,
  PRIMARY KEY (group_id, dungeon_id),
  UNIQUE (group_id, sort_order)
);

CREATE UNIQUE INDEX group_dungeon_plan_one_next_idx
  ON group_dungeon_plan(group_id) WHERE is_next;

CREATE TABLE dungeon_completions (
  group_id uuid NOT NULL,
  dungeon_id uuid NOT NULL,
  character_id uuid NOT NULL,
  completed_by_user_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, dungeon_id, character_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE RESTRICT,
  FOREIGN KEY (group_id, character_id) REFERENCES group_member_characters(group_id, character_id) ON DELETE CASCADE,
  FOREIGN KEY (group_id, completed_by_user_id) REFERENCES group_memberships(group_id, user_id) ON DELETE CASCADE
);

CREATE TABLE availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'maybe', 'unavailable')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (group_id, user_id) REFERENCES group_memberships(group_id, user_id) ON DELETE CASCADE,
  CHECK (ends_at > starts_at)
);

CREATE INDEX availability_group_time_idx ON availability(group_id, starts_at, ends_at);
CREATE INDEX availability_user_time_idx ON availability(user_id, starts_at);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  dungeon_id uuid REFERENCES dungeons(id) ON DELETE SET NULL,
  created_by_user_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'planned', 'cancelled', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (group_id, created_by_user_id) REFERENCES group_memberships(group_id, user_id) ON DELETE CASCADE,
  CHECK (ends_at > starts_at)
);

CREATE INDEX sessions_group_time_idx ON sessions(group_id, starts_at);

CREATE TABLE character_sync_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE INDEX character_sync_credentials_character_id_idx ON character_sync_credentials(character_id);

CREATE TABLE character_pairing_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE INDEX character_pairing_codes_user_idx ON character_pairing_codes(created_by_user_id);
