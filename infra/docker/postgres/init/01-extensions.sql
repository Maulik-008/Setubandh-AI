-- Local dev only: extensions the app expects (requirements §4.3). Production enables them in migrations (M1-04).
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
