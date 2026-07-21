# Operations and dispatch boundary

Copy `.env.example` to `.env`, replace secrets, then explicitly run `scripts/bootstrap.sh` and `scripts/migrate.sh`. `start.sh` only launches its own child processes. Synthetic records require `CONFIRM_DEMO_SEED=yes scripts/seed-demo.sh`; the legacy destructive `db/init.sql` is never executed by start or migrate.

`/api/dispatch-cases` records versioned CAD provenance, current unit capabilities/status, traffic, hospital capacity, deterministic eligibility, stale-input fail-safe behavior, dispatcher/supervisor authority, radio acknowledgement, idempotency, tenant isolation, concurrency, and immutable history. Automated dispatch is never allowed. Generic AI, in-memory integration, and generated gap routes are not mounted. CAD, AVL, GIS/traffic, hospital, and radio adapters require controlled test systems and credentials; operational dispatch validation is external.

