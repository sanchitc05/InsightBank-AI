# MySQL → PostgreSQL Migration Plan
## Production-Grade Zero-Downtime Migration Strategy

## Executive Summary

This plan outlines a **production-grade, zero-downtime migration** from MySQL to PostgreSQL for InsightBank-AI. The strategy minimizes user-facing downtime through dual-write architecture, phased rollout, and comprehensive validation. Estimated effort: **25-35 hours** with contingency buffer.

**Key Differentiators:**
- ✅ **Zero-downtime cutover** using dual-write pattern
- ✅ **Detailed data validation** (row counts, checksums, referential integrity)
- ✅ **Query optimization** with PostgreSQL-specific indexing and features
- ✅ **Advanced observability** (slow query logging, metrics collection)
- ✅ **Comprehensive testing** (≥85% code coverage, chaos engineering)
- ✅ **Connection pooling** and performance tuning guidance
- ✅ **Realistic timeline** with contingency buffers

---

## Context
- **Current Database**: MySQL with PyMySQL driver
- **Target Database**: PostgreSQL with psycopg2 driver
- **ORM**: SQLAlchemy 2.0+ (database-agnostic, simplifies migration)
- **Migrations**: Alembic (handles schema versioning)
- **Current Schema**: See `backend/alembic/versions/` for all migrations
- **Estimated Data Volume**: TBD during Phase 1.2 audit
- **Acceptable Downtime**: < 5 minutes for production cutover

---

## High-Level Migration Strategy: Zero-Downtime Dual-Write

```
Timeline: Pre-migration → Shadow Phase → Validation Phase → Read Switch Phase → Cutover → Post-Migration

[MySQL]              [MySQL + PG]        [MySQL + PG]        [PG]                [PG Only]
 |                    |                   |                    |                   |
 Week 1-2        Week 3-4 (Shadow)   Week 5-6 (Validate)  Week 7 (Cutover)    Week 8+
 Prep            Dual-Write On       Reconcile & Compare   Read from PG        Monitor
                                     Fix Discrepancies
```

### Three-Phase Cutover Strategy

1. **Shadow Phase (Days 1-7)**: All writes go to both MySQL and PostgreSQL; reads still from MySQL
   - Zero user impact
   - Identify sync issues early
   - Build confidence in dual-write logic

2. **Validation Phase (Days 8-14)**: Intensive data comparison and query testing
   - Compare row counts, checksums, referential integrity
   - Run identical queries on both DBs, compare results
   - Measure query performance

3. **Read Switch + Cutover (Day 15, < 5 min downtime)**: 
   - Stop writes
   - Final sync
   - Switch reads to PostgreSQL
   - Monitor for 24-48 hours
   - Resume writes to PostgreSQL only

---

## Phase 1: Preparation & Discovery (Environment Setup)

### 1.1 Install PostgreSQL Dependencies & Infrastructure
- [ ] Add `psycopg2-binary>=2.9.0`, `psycopg2>=2.9.0`, and `pgloader>=3.6.2` to `requirements.txt`
- [ ] Add `SQLAlchemy[asyncio]>=2.0.35` for async support (optional, future-proofing)
- [ ] Create development PostgreSQL instance (Docker recommended for consistency):
  ```bash
  docker run --name insightbank-pg -e POSTGRES_PASSWORD=devpass -p 5432:5432 -d postgres:15
  ```
- [ ] Create test PostgreSQL instance (separate, for testing/staging)
- [ ] Install `pgloader` system-wide (data migration tool):
  ```bash
  # On Windows: Download binary from pgloader releases
  # On Linux: apt-get install pgloader or build from source
  ```
- [ ] **Verification**: 
  - [ ] `psycopg2` imports successfully: `python -c "import psycopg2"`
  - [ ] PostgreSQL instances accessible: `psql -U postgres -h localhost`
  - [ ] pgloader installed and callable: `pgloader --version`

### 1.2 Comprehensive Audit of Current MySQL Setup
- [ ] **Database Inventory**:
  - [ ] Run: `SELECT table_name, table_rows FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = 'your_db'`
  - [ ] Document table sizes, row counts, estimated data volume
  - [ ] Identify tables > 100MB (candidates for chunked migration)
  
- [ ] **Schema Analysis**:
  - [ ] Extract full schema: `mysqldump --no-data -u user -p database > schema.sql`
  - [ ] Search for MySQL-specific features:
    - [ ] Full-text search indexes (`FULLTEXT`)
    - [ ] Unsigned integers (`UNSIGNED`)
    - [ ] Spatial indexes (`SPATIAL`)
    - [ ] Partitioned tables (`PARTITION BY`)
    - [ ] Auto-increment with specific `AUTO_INCREMENT` values
    - [ ] Character set/collation declarations
    - [ ] Engine declarations (`ENGINE=InnoDB`)
  - [ ] Document findings in `MYSQL_AUDIT.md`

- [ ] **Query Analysis**:
  - [ ] Enable slow query log: `SET GLOBAL slow_query_log = 'ON'`
  - [ ] Run application against MySQL for 24 hours, collect slow queries
  - [ ] Export slow queries: `mysqldump -u root -p mysql --tables slow_log > slow_queries.sql`
  - [ ] Identify queries that may behave differently in PostgreSQL (implicit type coercion, string comparison)
  
- [ ] **Code Audit**:
  - [ ] Search codebase for hardcoded SQL: `grep -r "SELECT\|INSERT\|UPDATE\|DELETE" --include="*.py" backend/`
  - [ ] Identify MySQL-specific functions (CONCAT, DATE_FORMAT, UNIX_TIMESTAMP, etc.)
  - [ ] Check for transaction isolation level assumptions
  - [ ] Document findings in `SQL_PATTERNS.md`

- [ ] **Alembic Migrations Review**:
  - [ ] Review each file in `backend/alembic/versions/`:
    - [ ] Document MySQL-specific syntax
    - [ ] Flag unsupported features (e.g., `CREATE TABLE ... ENGINE=InnoDB`)
    - [ ] Note version numbers and execution order
  - [ ] Create compatibility matrix in `MIGRATION_COMPAT_MATRIX.md`

- [ ] **Verification**: Create `DISCOVERY_REPORT.md` with:
  - Total data volume (GB)
  - Number of tables, indexes, constraints
  - List of MySQL-specific features found
  - List of custom SQL queries that need rewriting
  - Data type mapping summary

### 1.3 Develop Data Migration & Validation Strategy
- [ ] **Data Volume & Timeline**:
  - [ ] Estimate migration time: `data_volume_gb / migration_rate_per_sec`
  - [ ] For <10GB: Full dump + restore (~5-15 min)
  - [ ] For 10-100GB: pgloader with parallel workers (~15-45 min)
  - [ ] For >100GB: Chunked pgloader + parallel tables (~1-2 hours)
  
- [ ] **Data Type Mapping** (create mapping document):
  | MySQL | PostgreSQL | Notes |
  |-------|-----------|-------|
  | TINYINT | SMALLINT | MySQL: 1 byte; PG: 2 bytes |
  | INT UNSIGNED | BIGINT | No unsigned in PG; use larger type or CHECK constraint |
  | DECIMAL(p,s) | NUMERIC(p,s) | Direct mapping |
  | TEXT | TEXT | Direct mapping; verify encoding |
  | LONGTEXT | TEXT | Direct mapping |
  | JSON | JSONB | Use JSONB for indexing benefits |
  | DATETIME | TIMESTAMP | Add UTC normalization |
  | TIMESTAMP | TIMESTAMP WITH TIME ZONE | Careful with timezone handling |
  | ENUM | VARCHAR(n) + CHECK | Consider native PostgreSQL ENUM if stable |

- [ ] **Backup & Recovery Plan**:
  - [ ] MySQL backup strategy: Daily full + incremental binlog
  - [ ] Backup retention: 30 days minimum
  - [ ] Test restore procedure: Full restore to test environment
  - [ ] Document: `BACKUP_RECOVERY_PROCEDURE.md`
  - [ ] Estimate recovery time objective (RTO): < 1 hour
  - [ ] Estimate recovery point objective (RPO): < 5 minutes

- [ ] **Validation Checkpoints**:
  - [ ] Row count matching per table
  - [ ] Checksum/hash comparison (see Phase 4.2)
  - [ ] Referential integrity verification
  - [ ] Constraint validation

- [ ] **Verification**: 
  - [ ] Data mapping document complete
  - [ ] Backup procedure tested: can restore MySQL in < 15 minutes
  - [ ] Recovery rollback plan documented

---

## Phase 2: Backend Configuration & Dual-Write Setup

### 2.1 Update Database Abstraction Layer with Dual-Write Support
- [ ] Create new module `backend/app/dual_db.py`:
  ```python
  from sqlalchemy import create_engine
  from sqlalchemy.pool import QueuePool
  import logging

  class DualWriteManager:
      """Manages writes to both MySQL and PostgreSQL during migration."""
      
      def __init__(self, mysql_url: str, pg_url: str):
          self.mysql_engine = create_engine(mysql_url, poolclass=QueuePool)
          self.pg_engine = create_engine(pg_url, poolclass=QueuePool)
          self.logger = logging.getLogger(__name__)
          self.dual_write_enabled = False
      
      def write_to_both(self, session_mysql, session_pg, operation):
          """Execute write operation on both databases."""
          try:
              result_mysql = operation(session_mysql)
              result_pg = operation(session_pg)
              return result_mysql  # Return MySQL result (primary)
          except Exception as e:
              self.logger.error(f"Dual-write failed: {e}")
              # Fall back to MySQL only; log for reconciliation
              raise
  ```
  - [ ] Implement error handling for desynchronization
  - [ ] Add logging for all dual-write operations
  - [ ] Include fallback/rollback logic

- [ ] Modify `backend/app/database.py`:
  ```python
  # Updated database.py with dual-write support
  def build_database_url(db_type: str = "mysql"):
      if db_type == "postgresql":
          return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
      # ... existing MySQL logic
  
  # Environment-based configuration
  DUAL_WRITE_MODE = os.getenv("DUAL_WRITE_ENABLED", "false").lower() == "true"
  ACTIVE_DB = os.getenv("ACTIVE_DATABASE", "mysql")  # mysql or postgresql
  ```

- [ ] Update all API routers to use dual-write manager when enabled
- [ ] Add middleware to route read operations based on `ACTIVE_DB` flag
- [ ] **Verification**:
  - [ ] Dual-write manager imports without errors
  - [ ] Both databases can be connected simultaneously
  - [ ] Writes logged and traceable

### 2.2 Update Dependencies & Configure Connection Pooling
- [ ] Update `backend/requirements.txt`:
  ```
  # Remove
  pymysql>=1.1.1

  # Add
  psycopg2-binary>=2.9.0
  psycopg2>=2.9.0
  SQLAlchemy[asyncio]>=2.0.35  # Upgrade from 2.0.35
  pgloader>=3.6.2
  ```

- [ ] Configure SQLAlchemy connection pooling for PostgreSQL in `backend/app/database.py`:
  ```python
  from sqlalchemy.pool import QueuePool, NullPool
  
  # For production PostgreSQL
  engine = create_engine(
      DATABASE_URL,
      poolclass=QueuePool,
      pool_size=20,           # Connections to keep in pool
      max_overflow=40,        # Max additional connections
      pool_recycle=3600,      # Recycle connections every hour
      pool_pre_ping=True,     # Verify connection before using
      echo=False,             # Set to True for SQL logging
      connect_args={
          "connect_timeout": 10,
          "application_name": "insightbank-api"
      }
  )
  ```

- [ ] Update `backend/app/core/dependencies.py` with pool monitoring:
  ```python
  async def get_db_stats():
      """Return current connection pool statistics."""
      pool = engine.pool
      return {
          "pool_size": pool.size(),
          "checked_out": pool.checkedout(),
          "overflow": pool.overflow(),
          "total": pool.size() + pool.overflow()
      }
  ```

- [ ] Run `pip install -r requirements.txt`
- [ ] **Verification**:
  - [ ] `from psycopg2 import connect` succeeds
  - [ ] Connection pooling configured correctly
  - [ ] Pool monitoring endpoint works

### 2.3 Create Environment Configuration & Documentation
- [ ] Create `.env.postgres.example`:
  ```env
  # PostgreSQL Configuration
  DB_HOST=localhost
  DB_PORT=5432
  DB_USER=insightbank
  DB_PASS=<secure_password>
  DB_NAME=insightbank_pg
  DATABASE_URL=postgresql+psycopg2://insightbank:<password>@localhost:5432/insightbank_pg

  # PostgreSQL-Specific
  PGCONNECT_TIMEOUT=10
  PGSSLMODE=prefer  # or require for production

  # Migration Settings
  DUAL_WRITE_ENABLED=false
  ACTIVE_DATABASE=mysql  # Switch to 'postgresql' during cutover
  MIGRATION_PHASE=preparation  # preparation, shadow, validation, cutover, production

  # Monitoring
  LOG_SQL_QUERIES=false  # Enable during debugging
  SLOW_QUERY_LOG_MS=500  # Log queries slower than 500ms
  ```

- [ ] Create `.env.migration.example` for migration tools:
  ```env
  # pgloader Configuration
  PGLOADER_WORKERS=4
  PGLOADER_BATCH_SIZE=10000
  PGLOADER_RETRY_COUNT=3

  # Data Validation
  VALIDATE_CHECKSUMS=true
  VALIDATE_REFERENTIAL_INTEGRITY=true
  ```

- [ ] Document in `docs/POSTGRESQL_CONFIG.md`:
  - [ ] Connection string format and parameters
  - [ ] Pool sizing calculation: `pool_size = (2 * num_cpu_cores) + 4`
  - [ ] Recommended settings for development vs production
  - [ ] Troubleshooting connection issues

- [ ] **Verification**:
  - [ ] All `.env` files documented
  - [ ] Configuration loads without errors
  - [ ] Sensitive data not hardcoded

---

## Phase 3: Schema Migration & Query Optimization Planning

### 3.1 Advanced Schema Audit & Migration Script Generation
- [ ] Create schema conversion tool `backend/scripts/convert_schema.py`:
  ```python
  import re
  
  def convert_mysql_migration_to_pg(mysql_migration: str) -> str:
      """Convert Alembic migration from MySQL to PostgreSQL."""
      pg_migration = mysql_migration
      
      # Replace auto-increment
      pg_migration = re.sub(
          r'sa\.Column\("(\w+)",\s*sa\.Integer,\s*autoincrement=True\)',
          r'sa.Column("\1", sa.Integer, server_default=sa.text("nextval(\\"\\1_seq\\")"))',
          pg_migration
      )
      
      # Replace unsigned integers
      pg_migration = re.sub(
          r'mysql\.INTEGER\(unsigned=True\)',
          r'sa.BigInteger',  # Use BIGINT for safety
          pg_migration
      )
      
      # Remove ENGINE declaration
      pg_migration = re.sub(r'mysql_engine=.*?,', '', pg_migration)
      
      # Replace FULLTEXT with GIN index (for text search)
      pg_migration = re.sub(
          r'Index\("(\w+_idx)",.*?mysql_using=\'FULLTEXT\'\)',
          r'Index("\1_idx", postgresql_using="gin")',
          pg_migration
      )
      
      return pg_migration
  ```

- [ ] Review each migration in `backend/alembic/versions/`:
  - [ ] 20260410_0001_initial_schema.py: Convert to PostgreSQL
  - [ ] 20260413_0001_add_user_profile_fields.py: Handle any ENUM types
  - [ ] 2e773595c90a_add_user_id_to_statements.py: Verify foreign key constraints
  - [ ] c23350bf0860_add_users_and_revoked_tokens.py: Check auth-related schemas
  - [ ] f0a3d20cfce5_add_statement_status_and_logs.py: Verify status values

- [ ] Create new migration file: `backend/alembic/versions/00001_postgresql_initial.py`:
  ```python
  # This is a clean PostgreSQL schema starting point
  def upgrade():
      # Create all tables with PostgreSQL-native features
      # Use IDENTITY instead of AUTO_INCREMENT
      # Use TEXT + CHECK for ENUM instead of MySQL ENUM
  
  def downgrade():
      pass  # No downgrade for initial schema
  ```

- [ ] **Verification**:
  - [ ] All migrations reviewed and compatible
  - [ ] Schema conversion tool tested on sample migrations
  - [ ] PostgreSQL schema file generated without errors

### 3.2 PostgreSQL-Specific Schema Optimizations
- [ ] **Indexing Strategy**:
  | Index Type | Use Case | Example |
  |-----------|----------|---------|
  | BTREE | Equality, range queries (default) | `CREATE INDEX idx_user_email ON users(email)` |
  | HASH | Equality only, faster for large datasets | `CREATE INDEX idx_statement_id ON statements USING HASH(statement_id)` |
  | GIN | Full-text search, JSONB queries | `CREATE INDEX idx_statement_data ON statements USING GIN(data)` |
  | BRIN | Large sequential tables | `CREATE INDEX idx_transaction_date ON transactions USING BRIN(transaction_date)` |
  | PARTIAL | Conditional queries | `CREATE INDEX idx_active_users ON users(id) WHERE is_active = true` |

- [ ] Create `backend/alembic/versions/00002_optimize_indexes.py`:
  ```python
  def upgrade():
      # Full-text search on statement content
      op.execute("""
          CREATE INDEX idx_statement_content_gin 
          ON statements USING GIN(to_tsvector('english', content))
      """)
      
      # JSONB indexing for fast queries
      op.execute("""
          CREATE INDEX idx_transaction_data_jsonb 
          ON transactions USING GIN(data)
      """)
      
      # Partial index for active users only
      op.execute("""
          CREATE INDEX idx_active_users 
          ON users(id) WHERE is_active = true
      """)
      
      # Covering index for common queries
      op.execute("""
          CREATE INDEX idx_statement_user_status 
          ON statements(user_id, status) INCLUDE (created_at)
      """)
  ```

- [ ] **JSONB Feature Adoption** (if applicable):
  - [ ] Identify TEXT/JSON columns in schema
  - [ ] Migrate to JSONB for better performance and indexing
  - [ ] Add GIN indexes for JSONB queries
  - [ ] Example migration:
    ```python
    # In migration file
    op.execute("""
        ALTER TABLE transactions 
        ADD COLUMN metadata_jsonb JSONB DEFAULT '{}'::jsonb;
    """)
    op.execute("""
        UPDATE transactions 
        SET metadata_jsonb = metadata::jsonb 
        WHERE metadata IS NOT NULL;
    """)
    ```

- [ ] **Verify Schema Compatibility**:
  - [ ] Run migrations against test PostgreSQL database
  - [ ] Compare schema with MySQL: `pg_dump --schema-only vs mysqldump --no-data`
  - [ ] Check for missing sequences, constraints, or triggers
  - [ ] Document any schema differences

- [ ] **Verification**:
  - [ ] All indexes created successfully
  - [ ] Schema matches expectations
  - [ ] EXPLAIN ANALYZE shows good index usage

### 3.3 Query Optimization & Rewrite Planning
- [ ] Create `backend/docs/QUERY_OPTIMIZATION.md`:
  
  **MySQL Query Issues in PostgreSQL:**
  
  | Issue | MySQL Behavior | PostgreSQL Behavior | Solution |
  |-------|----------------|-------------------|----------|
  | Implicit type coercion | `WHERE user_id = '123'` works | Requires explicit cast | Use `WHERE user_id = '123'::INTEGER` |
  | CONCAT function | `CONCAT(first_name, ' ', last_name)` | Use `\|\|` operator | `first_name \|\| ' ' \|\| last_name` |
  | DATE functions | `DATE_FORMAT(created_at, '%Y-%m')` | `to_char(created_at, 'YYYY-MM')` | Use PostgreSQL date functions |
  | LIMIT + OFFSET | Performance degrades | More efficient query planning | Use keyset pagination for large offsets |
  | UNION ALL | May not preserve order | Preserves order per spec | No change needed |
  | GROUP BY | Allows non-aggregated columns | Requires strict adherence | Fix GROUP BY clause |

- [ ] Identify queries to rewrite:
  - [ ] Search codebase: `grep -r "CONCAT\|DATE_FORMAT\|UNIX_TIMESTAMP" backend/app/`
  - [ ] Extract all SQLAlchemy filters with implicit type coercion
  - [ ] Create PR with query rewrites

- [ ] Run EXPLAIN ANALYZE comparison:
  ```python
  # backend/scripts/query_comparison.py
  import sqlalchemy as sa
  
  def compare_query_plans(query_str: str, mysql_engine, pg_engine):
      """Compare EXPLAIN ANALYZE output between MySQL and PostgreSQL."""
      mysql_plan = mysql_engine.execute(f"EXPLAIN ANALYZE {query_str}").fetchall()
      pg_plan = pg_engine.execute(f"EXPLAIN ANALYZE {query_str}").fetchall()
      
      return {
          "mysql_plan": mysql_plan,
          "postgres_plan": pg_plan
      }
  ```

- [ ] **Verification**:
  - [ ] All identified queries rewritten
  - [ ] EXPLAIN ANALYZE shows reasonable query plans in PostgreSQL
  - [ ] Performance improvement measured (target: ≥10% faster)

---

## Phase 4: Detailed Data Migration Strategy

### 4.1 Select & Configure Data Migration Tool
- [ ] **Tool Selection** (based on data volume from Phase 1.2):
  
  | Tool | Volume | Speed | Reliability | Notes |
  |------|--------|-------|-------------|-------|
  | pg_dump + psql | < 5 GB | Fast | High | Simple, direct |
  | pgloader | 5-100 GB | Very Fast | High | Parallel workers, flexible |
  | Custom ETL script | > 100 GB | Medium | Medium | Fine-grained control, chunked |

- [ ] **Setup pgloader** (recommended for InsightBank-AI):
  ```bash
  # Create pgloader configuration file: backend/scripts/migration.load
  LOAD DATABASE
      FROM mysql://user:pass@localhost:3306/insightbank
      INTO postgresql://user:pass@localhost:5432/insightbank_pg
  
  WITH include drop, create tables, disable triggers,
       workers = 4,                    # Parallel workers
       batch rows = 10000,             # Batch size
       max parallel create index = 4
  
  BEFORE LOAD DO
    $$ CREATE EXTENSION IF NOT EXISTS pgcrypto; $$
  
  AFTER LOAD DO
    $$ SELECT pg_sleep(1); $$;        # Allow async operations to complete
  ```

- [ ] **Test pgloader on staging data**:
  ```bash
  # Test run (dry run)
  pgloader --dry-run backend/scripts/migration.load
  
  # Full run
  time pgloader backend/scripts/migration.load
  ```

- [ ] **Verification**:
  - [ ] pgloader configured and tested
  - [ ] Migration time < 1 hour (or documented as known issue)
  - [ ] No errors during test run

### 4.2 Advanced Data Validation & Reconciliation
- [ ] Create validation script `backend/scripts/validate_migration.py`:
  ```python
  import sqlalchemy as sa
  import hashlib
  from sqlalchemy.orm import Session
  
  class DataValidator:
      """Validates data parity between MySQL and PostgreSQL."""
      
      def __init__(self, mysql_engine, pg_engine):
          self.mysql_engine = mysql_engine
          self.pg_engine = pg_engine
          self.mismatches = []
      
      def validate_row_counts(self):
          """Compare row counts for all tables."""
          with Session(self.mysql_engine) as mysql_db:
              with Session(self.pg_engine) as pg_db:
                  tables = self._get_table_names()
                  
                  for table in tables:
                      mysql_count = mysql_db.execute(
                          sa.text(f"SELECT COUNT(*) FROM {table}")
                      ).scalar()
                      
                      pg_count = pg_db.execute(
                          sa.text(f"SELECT COUNT(*) FROM {table}")
                      ).scalar()
                      
                      if mysql_count != pg_count:
                          self.mismatches.append({
                              "table": table,
                              "mysql_count": mysql_count,
                              "pg_count": pg_count
                          })
          
          return len(self.mismatches) == 0
      
      def validate_checksums(self):
          """Compare row checksums between databases."""
          with Session(self.mysql_engine) as mysql_db:
              with Session(self.pg_engine) as pg_db:
                  tables = self._get_table_names()
                  
                  for table in tables:
                      # MySQL checksum
                      mysql_checksum = mysql_db.execute(
                          sa.text(f"CHECKSUM TABLE {table}")
                      ).first()[1]
                      
                      # PostgreSQL checksum (simulate)
                      pg_rows = pg_db.execute(
                          sa.text(f"SELECT * FROM {table} ORDER BY id")
                      ).fetchall()
                      pg_checksum = hashlib.md5(
                          str(pg_rows).encode()
                      ).hexdigest()
                      
                      if mysql_checksum != pg_checksum:
                          self.mismatches.append({
                              "table": table,
                              "type": "checksum_mismatch"
                          })
          
          return len(self.mismatches) == 0
      
      def validate_referential_integrity(self):
          """Verify all foreign keys are intact."""
          with Session(self.pg_engine) as pg_db:
              # Find orphaned records
              integrity_checks = [
                  """
                  SELECT COUNT(*) FROM statements s
                  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id)
                  """,
                  """
                  SELECT COUNT(*) FROM transactions t
                  WHERE NOT EXISTS (SELECT 1 FROM statements s WHERE s.id = t.statement_id)
                  """
              ]
              
              for check in integrity_checks:
                  orphaned_count = pg_db.execute(sa.text(check)).scalar()
                  if orphaned_count > 0:
                      self.mismatches.append({
                          "type": "orphaned_records",
                          "count": orphaned_count
                      })
          
          return len(self.mismatches) == 0
      
      def validate_encoding(self):
          """Verify UTF-8 encoding and no corruption."""
          with Session(self.pg_engine) as pg_db:
              # Check for invalid UTF-8
              result = pg_db.execute(
                  sa.text("""
                      SELECT COUNT(*) FROM pg_stat_all_tables 
                      WHERE schemaname = 'public'
                  """)
              ).scalar()
              return result > 0
      
      def generate_report(self):
          """Generate validation report."""
          return {
              "total_mismatches": len(self.mismatches),
              "mismatches": self.mismatches,
              "validation_passed": len(self.mismatches) == 0
          }
      
      def _get_table_names(self):
          """Get list of all tables to validate."""
          with Session(self.mysql_engine) as db:
              result = db.execute(
                  sa.text(
                      "SELECT table_name FROM INFORMATION_SCHEMA.TABLES "
                      "WHERE table_schema = DATABASE()"
                  )
              ).fetchall()
              return [row[0] for row in result]
  ```

- [ ] **Run validation tests**:
  ```bash
  python backend/scripts/validate_migration.py --mysql-url $MYSQL_URL --pg-url $PG_URL
  ```

- [ ] **Handle Data Discrepancies**:
  - [ ] If row counts differ: Identify missing/extra rows
  - [ ] If checksums differ: Row-by-row comparison to find corrupted data
  - [ ] If foreign keys broken: Re-run pgloader or manual fixes
  - [ ] If encoding issues: Manual cleanup or character set adjustment

- [ ] **Data Transformation** (if needed):
  ```python
  # Example: Normalize timestamps to UTC
  from datetime import timezone
  
  def normalize_timestamps(pg_engine):
      with Session(pg_engine) as db:
          db.execute(sa.text("""
              UPDATE statements 
              SET created_at = created_at AT TIME ZONE 'UTC'
              WHERE created_at IS NOT NULL
          """))
          db.commit()
  ```

- [ ] **Verification**:
  - [ ] Row counts match: 100% ✓
  - [ ] Checksums match or documented variance explained
  - [ ] Referential integrity: 0 orphaned records
  - [ ] Encoding: No corruption detected
  - [ ] All data transformations applied

### 4.3 Backup & Recovery Testing
- [ ] **Backup MySQL Before Migration**:
  ```bash
  mysqldump --single-transaction --quick --lock-tables=false \
    -u root -p insightbank > insightbank_backup_$(date +%Y%m%d_%H%M%S).sql
  
  # Compress backup
  gzip insightbank_backup_*.sql
  ```

- [ ] **Test Restore Procedure**:
  - [ ] Restore backup to test instance
  - [ ] Verify all data intact
  - [ ] Document restore time (target: < 15 minutes)

- [ ] **Create Rollback Procedure** (`backend/scripts/rollback_migration.sh`):
  ```bash
  #!/bin/bash
  # 1. Stop application
  systemctl stop insightbank-api
  
  # 2. Update connection string back to MySQL
  sed -i 's/postgresql/mysql+pymysql/g' .env
  
  # 3. Restart application
  systemctl start insightbank-api
  
  # 4. Verify MySQL connectivity
  curl http://localhost:8000/health
  ```

- [ ] **Verification**:
  - [ ] Backup file created and verified
  - [ ] Restore procedure tested: all data recoverable
  - [ ] Rollback script tested: can revert to MySQL in < 2 minutes

---

## Phase 5: Application Code Updates & Advanced Testing Setup

### 5.1 Comprehensive Code Audit & Database-Specific Query Refactoring
- [ ] Search & document MySQL-specific SQL patterns:
  ```bash
  grep -r "SELECT\|INSERT\|UPDATE\|DELETE" --include="*.py" backend/app/ > raw_queries.txt
  grep -r "CONCAT\|DATE_FORMAT\|UNIX_TIMESTAMP\|GROUP_CONCAT" --include="*.py" backend/app/ > mysql_functions.txt
  ```

- [ ] Create `backend/scripts/find_mysql_patterns.py`:
  ```python
  import re
  import os
  
  MYSQL_PATTERNS = {
      r'CONCAT\(': 'Use || operator in PostgreSQL',
      r'DATE_FORMAT\(': 'Use to_char() in PostgreSQL',
      r'UNIX_TIMESTAMP\(': 'Use EXTRACT(EPOCH FROM ...)',
      r'GROUP_CONCAT\(': 'Use string_agg() in PostgreSQL',
      r'IFNULL\(': 'Use COALESCE()',
      r'CAST\(.*\s+AS\s+CHAR\)': 'Use ::TEXT in PostgreSQL',
      r'=\s+\'(\d+)\'': 'Potential implicit type coercion'
  }
  
  def find_patterns(filepath):
      with open(filepath, 'r') as f:
          content = f.read()
          findings = []
          for pattern, replacement in MYSQL_PATTERNS.items():
              matches = re.finditer(pattern, content, re.IGNORECASE)
              for match in matches:
                  findings.append({
                      'file': filepath,
                      'pattern': pattern,
                      'suggestion': replacement,
                      'context': content[max(0, match.start()-50):match.end()+50]
                  })
          return findings
  ```

- [ ] Update connection string references:
  ```python
  # backend/app/database.py
  def build_database_url():
      if os.getenv("DB_TYPE") == "postgresql":
          return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
      else:
          return f"mysql+pymysql://{user}:{password}@{host}:{port}/{dbname}"
  ```

- [ ] **Update ORM Models** for PostgreSQL:
  ```python
  # Example: Replace MySQL-specific Column types
  from sqlalchemy import Integer, String, Text, DateTime
  from sqlalchemy.dialects.postgresql import JSON, JSONB
  
  class Transaction(Base):
      __tablename__ = "transactions"
      
      id = Column(Integer, primary_key=True, server_default=func.nextval('transactions_id_seq'))
      # Changed from: autoincrement=True
      
      amount = Column(Numeric(10, 2), nullable=False)  # Replaces DECIMAL
      metadata = Column(JSONB, default={})  # Use JSONB for PostgreSQL
      created_at = Column(DateTime(timezone=True), default=func.now())
      # Added timezone-aware datetime
  ```

- [ ] Update all repository queries to use SQLAlchemy Core/ORM patterns:
  ```python
  # BEFORE (MySQL-specific)
  query = f"SELECT id, name FROM users WHERE status = '{status}'"
  
  # AFTER (Database-agnostic)
  query = select(User).where(User.status == status)
  ```

- [ ] Create configuration module `backend/app/db_compatibility.py`:
  ```python
  from sqlalchemy import func
  import os
  
  DB_TYPE = os.getenv("DB_TYPE", "postgresql")
  
  def get_current_timestamp():
      if DB_TYPE == "mysql":
          return func.now()
      else:
          return func.now()  # Same in PostgreSQL
  
  def get_concat(*args):
      if DB_TYPE == "mysql":
          return func.concat(*args)
      else:
          # PostgreSQL: use || operator or concat function
          from sqlalchemy import literal_column
          return literal_column("' || '".join([str(arg) for arg in args]))
  ```

- [ ] **Verification**:
  - [ ] All MySQL-specific patterns identified and documented
  - [ ] SQLAlchemy ORM used consistently (no raw SQL)
  - [ ] Connection string properly configurable
  - [ ] Code runs on both MySQL and PostgreSQL (or marked for replacement)

### 5.2 Monitoring & Observability Setup
- [ ] Create `backend/app/core/monitoring.py`:
  ```python
  import time
  import logging
  from sqlalchemy.event import listen
  from sqlalchemy.pool import Pool
  
  logger = logging.getLogger(__name__)
  
  class QueryLogger:
      """Logs slow queries and connection pool metrics."""
      
      def __init__(self, slow_query_threshold_ms=500):
          self.threshold = slow_query_threshold_ms / 1000
      
      def before_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
          conn.info.setdefault('query_start_time', []).append(time.time())
      
      def after_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
          total_time = time.time() - conn.info['query_start_time'].pop(-1)
          
          if total_time > self.threshold:
              logger.warning(f"Slow query ({total_time*1000:.1f}ms): {statement}")
  
  def setup_monitoring(engine):
      listen(engine, "before_cursor_execute", QueryLogger().before_cursor_execute)
      listen(engine, "after_cursor_execute", QueryLogger().after_cursor_execute)
      
      @listen(Pool, "connect")
      def receive_connect(dbapi_conn, connection_record):
          logger.info("Database connection established")
      
      @listen(Pool, "pool_connect")
      def receive_pool_connect(dbapi_conn, connection_record):
          logger.debug("Connection from pool")
  ```

- [ ] Add metrics endpoint `backend/app/routers/metrics.py`:
  ```python
  from fastapi import APIRouter
  
  router = APIRouter(prefix="/api/metrics", tags=["metrics"])
  
  @router.get("/db-health")
  async def db_health(db: Session = Depends(get_db)):
      try:
          result = db.execute(text("SELECT 1")).scalar()
          return {
              "status": "healthy",
              "database": "postgresql",
              "response_time_ms": 0
          }
      except Exception as e:
          return {
              "status": "unhealthy",
              "error": str(e)
          }
  
  @router.get("/db-stats")
  async def db_stats():
      pool = engine.pool
      return {
          "pool_size": pool.size(),
          "checked_out": pool.checkedout(),
          "overflow": pool.overflow()
      }
  ```

- [ ] **Verification**:
  - [ ] Slow query logging configured
  - [ ] Metrics endpoint accessible: `curl http://localhost:8000/api/metrics/db-health`
  - [ ] Pool statistics tracked

### 5.3 Advanced Testing Strategy with High Coverage
- [ ] **Test Coverage Targets**:
  - Minimum: 85% code coverage
  - Critical path: 100% (auth, data ingestion, analytics)
  - Database layer: 95%

- [ ] Create comprehensive test suite `backend/tests/test_db_migration.py`:
  ```python
  import pytest
  from sqlalchemy import text
  
  class TestMySQLPostgreSQLParity:
      """Tests that verify MySQL and PostgreSQL return identical results."""
      
      @pytest.fixture
      def mysql_db(self):
          """MySQL test database session."""
          pass
      
      @pytest.fixture
      def postgres_db(self):
          """PostgreSQL test database session."""
          pass
      
      def test_row_counts_match(self, mysql_db, postgres_db):
          """Verify all tables have same row counts."""
          tables = ['users', 'statements', 'transactions']
          for table in tables:
              mysql_count = mysql_db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
              pg_count = postgres_db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
              assert mysql_count == pg_count, f"{table}: {mysql_count} != {pg_count}"
      
      def test_query_results_identical(self, mysql_db, postgres_db):
          """Test that same queries return identical results."""
          query = "SELECT id, user_id, amount FROM transactions LIMIT 100"
          
          mysql_results = mysql_db.execute(text(query)).fetchall()
          pg_results = postgres_db.execute(text(query)).fetchall()
          
          assert mysql_results == pg_results
      
      def test_referential_integrity(self, postgres_db):
          """Verify no orphaned foreign key records."""
          orphaned = postgres_db.execute(text("""
              SELECT COUNT(*) FROM transactions t
              WHERE NOT EXISTS (SELECT 1 FROM statements s WHERE s.id = t.statement_id)
          """)).scalar()
          
          assert orphaned == 0
      
      def test_concurrent_reads(self, postgres_db):
          """Test PostgreSQL handles concurrent connections."""
          import concurrent.futures
          
          def query_db():
              return postgres_db.execute(text("SELECT COUNT(*) FROM users")).scalar()
          
          with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
              futures = [executor.submit(query_db) for _ in range(10)]
              results = [f.result() for f in concurrent.futures.as_completed(futures)]
          
          assert all(r == results[0] for r in results)
  ```

- [ ] Create stress test `backend/tests/test_performance.py`:
  ```python
  import pytest
  import time
  from sqlalchemy import text
  
  class TestPostgreSQLPerformance:
      """Performance benchmarks and stress tests."""
      
      def test_bulk_insert_performance(self, postgres_db):
          """Benchmark bulk insert performance."""
          start = time.time()
          
          # Insert 10,000 transactions
          for i in range(10000):
              postgres_db.execute(text(f"""
                  INSERT INTO transactions (user_id, amount) 
                  VALUES ({i % 100}, {i * 0.01})
              """))
          postgres_db.commit()
          
          duration = time.time() - start
          rate = 10000 / duration
          
          assert rate > 1000, f"Insert rate too slow: {rate} rows/sec"
      
      def test_complex_query_performance(self, postgres_db):
          """Benchmark complex analytical query."""
          start = time.time()
          
          result = postgres_db.execute(text("""
              SELECT user_id, COUNT(*) as count, SUM(amount) as total
              FROM transactions
              GROUP BY user_id
              HAVING COUNT(*) > 10
              ORDER BY total DESC
          """)).fetchall()
          
          duration = time.time() - start
          
          assert duration < 1.0, f"Complex query took {duration}s (target: < 1s)"
  ```

- [ ] **Verification**:
  - [ ] All tests pass: `pytest backend/tests/ -v --cov=backend/app --cov-report=html`
  - [ ] Coverage report shows ≥ 85% coverage
  - [ ] Performance tests meet benchmarks
  - [ ] MySQL/PostgreSQL parity tests pass

---

## Phase 6: Shadow Phase (Dual-Write Testing in Staging)

### 6.1 Enable Dual-Write Mode with Shadow Writes
- [ ] Deploy application with `DUAL_WRITE_ENABLED=true` to staging environment
- [ ] Set `ACTIVE_DATABASE=mysql` (primary reads/writes still from MySQL)
- [ ] All writes now go to both MySQL and PostgreSQL
- [ ] Configure logging for all dual-write operations:
  ```python
  logger.info(f"Dual-write: {operation} to both MySQL and PostgreSQL")
  logger.error(f"Dual-write failed: {error_details}")
  ```

- [ ] Run application against production-like data for 48 hours:
  - [ ] Simulate user workflows
  - [ ] Capture write patterns and latency impact
  - [ ] Monitor for sync failures
  - [ ] Document any discrepancies

- [ ] **Verification**:
  - [ ] No write failures logged
  - [ ] Dual-write latency < 50ms additional overhead
  - [ ] MySQL and PostgreSQL data identical (validate with Phase 4.2 script)
  - [ ] All features functional

### 6.2 Query Plan Analysis & Optimization
- [ ] Enable PostgreSQL query logging:
  ```sql
  ALTER SYSTEM SET log_min_duration_statement = 500;  -- Log queries > 500ms
  ALTER SYSTEM SET log_statement = 'all';              -- Log all statements
  ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
  SELECT pg_reload_conf();
  ```

- [ ] Collect slow queries from PostgreSQL logs:
  ```bash
  grep "duration:" /var/log/postgresql/postgresql.log | sort -t':' -k2 -nr | head -20
  ```

- [ ] Run EXPLAIN ANALYZE on slow queries:
  ```sql
  EXPLAIN ANALYZE
  SELECT u.id, COUNT(t.id) as transaction_count
  FROM users u
  LEFT JOIN transactions t ON u.id = t.user_id
  GROUP BY u.id
  ORDER BY transaction_count DESC;
  ```

- [ ] If query plans suboptimal, create additional indexes (Phase 3.2)

- [ ] **Verification**:
  - [ ] All queries have acceptable execution plans
  - [ ] No sequential scans on large tables without WHERE clause
  - [ ] Index usage confirmed

### 6.3 Staging Environment Full Test Suite
- [ ] Run complete test suite against PostgreSQL:
  ```bash
  cd backend
  pytest tests/ -v --cov=app --cov-report=term-missing -x
  ```

- [ ] Run API integration tests:
  ```bash
  # Test all endpoints with PostgreSQL backend
  pytest tests/test_api.py -v
  pytest tests/test_auth.py -v
  pytest tests/test_ingestion.py -v
  pytest tests/test_insights.py -v
  ```

- [ ] Run bank-specific parser tests:
  ```bash
  pytest tests/test_hdfc_parser.py -v
  pytest tests/test_icici_parser.py -v
  pytest tests/test_sbi_parser.py -v
  ```

- [ ] **Verification**:
  - [ ] Test suite passes: 100% success rate
  - [ ] Code coverage: ≥ 85%
  - [ ] No flaky tests (run 3 times)

---

## Phase 7: Validation Phase (Read-Only Comparison & Cutover Prep)

### 7.1 Data Parity & Consistency Testing
- [ ] Switch to read-only mode:
  - [ ] Pause application writes
  - [ ] Perform final dual-write sync
  - [ ] Run comprehensive validation (Phase 4.2)

- [ ] Execute detailed comparison tests:
  ```python
  # backend/scripts/final_validation.py
  def validate_all_data():
      # Row count comparison
      # Checksum comparison
      # Referential integrity check
      # Encoding validation
      # Sample data spot-checks (100 random records)
  ```

- [ ] Generate validation report:
  ```bash
  python backend/scripts/final_validation.py \
    --mysql-url $MYSQL_URL \
    --pg-url $PG_URL \
    --report final_validation_report.json
  ```

- [ ] **Verification**:
  - [ ] Row count parity: 100%
  - [ ] Checksum match: 100% or documented differences
  - [ ] Referential integrity: 0 violations
  - [ ] All tables validated

### 7.2 Read Switching Preparation
- [ ] **Create traffic splitting configuration**:
  ```python
  # backend/app/core/db_router.py
  class DatabaseRouter:
      def __init__(self, migration_phase: str):
          self.phase = migration_phase
      
      def get_read_session(self):
          if self.phase == "shadow":
              return self.mysql_session
          elif self.phase == "validation":
              return self.mysql_session  # Still MySQL for reads
          elif self.phase == "cutover":
              return self.postgres_session
          else:
              return self.postgres_session
      
      def get_write_session(self):
          if self.phase == "shadow":
              return DualWriteSession(self.mysql, self.postgres)
          else:
              return self.postgres_session
  ```

- [ ] **Prepare read-switch runbook**:
  ```markdown
  # Read Switch Runbook (< 5 minute execution)
  1. Set ACTIVE_DATABASE=postgresql in environment
  2. Restart API instances (rolling restart, zero-downtime)
  3. Monitor /api/metrics/db-health endpoint (poll every 5s)
  4. If errors, revert: Set ACTIVE_DATABASE=mysql
  5. Verify logs: No connection errors expected
  ```

- [ ] Test read-switch in staging:
  - [ ] Execute runbook
  - [ ] Verify all reads now hit PostgreSQL
  - [ ] Confirm data consistency

- [ ] **Verification**:
  - [ ] Read switch runbook tested and documented
  - [ ] Traffic can switch in < 5 minutes
  - [ ] Monitoring alerts configured

### 7.3 Final Pre-Cutover Checklist
- [ ] Database backups verified and accessible
- [ ] Rollback procedures tested
- [ ] Monitoring and alerting configured
- [ ] On-call team briefed
- [ ] Maintenance window communicated to users
- [ ] Database indexes optimized
- [ ] Connection pool configured correctly
- [ ] PostgreSQL performance meets or exceeds MySQL

- [ ] **Verification**:
  - [ ] All checklist items completed
  - [ ] Team sign-off obtained
  - [ ] Go/no-go decision made

---

## Phase 8: Cutover Phase (Minimal Downtime Execution)

### 8.1 Pre-Cutover Steps (30 minutes before)
- [ ] Final backup of MySQL:
  ```bash
  mysqldump --single-transaction --quick -u root -p insightbank | gzip > pre_cutover_backup.sql.gz
  ```

- [ ] Disable application writes (via circuit breaker or API gate):
  ```python
  # backend/app/core/circuit_breaker.py
  @app.middleware("http")
  async def write_gate(request: Request, call_next):
      if CUTOVER_IN_PROGRESS and request.method in ["POST", "PUT", "DELETE"]:
          return JSONResponse(status_code=503, content={"error": "Maintenance in progress"})
      return await call_next(request)
  ```

- [ ] Monitor in-flight transactions for completion:
  ```sql
  -- PostgreSQL: Monitor active connections
  SELECT pid, usename, state, query FROM pg_stat_activity WHERE state != 'idle';
  ```

- [ ] **Verification**:
  - [ ] No writes in-flight
  - [ ] All connections idle
  - [ ] MySQL backup created successfully

### 8.2 Cutover Execution (< 5 minutes)
- [ ] **Step 1**: Final sync of any stragglers
  ```bash
  # Run pgloader one final time to sync any last-minute changes
  pgloader backend/scripts/migration.load
  ```

- [ ] **Step 2**: Set environment and deploy
  ```bash
  export ACTIVE_DATABASE=postgresql
  export DUAL_WRITE_ENABLED=false
  
  # Rolling restart (blue-green or rolling strategy)
  kubectl set env deployment/insightbank-api ACTIVE_DATABASE=postgresql
  kubectl rollout status deployment/insightbank-api
  ```

- [ ] **Step 3**: Health check
  ```bash
  # Poll health endpoint
  for i in {1..30}; do
      if curl -f http://localhost:8000/api/metrics/db-health; then
          echo "✓ Application healthy"
          break
      fi
      sleep 1
  done
  ```

- [ ] **Step 4**: Smoke tests
  ```bash
  # Test critical endpoints
  pytest backend/tests/test_api.py::test_list_users -v
  pytest backend/tests/test_ingestion.py::test_upload_statement -v
  pytest backend/tests/test_analytics.py::test_get_insights -v
  ```

- [ ] **Verification**:
  - [ ] Application running on PostgreSQL
  - [ ] Health checks passing
  - [ ] Critical endpoints responding
  - [ ] Error rate normal
  - [ ] Response times acceptable

### 8.3 Post-Cutover Monitoring (First 48 hours)
- [ ] **Continuous Monitoring Setup**:
  ```yaml
  # Prometheus alerts to enable
  alerts:
    - name: PostgreSQL High Connection Count
      condition: pg_stat_activity_count > 80
    - name: Slow Query Threshold Exceeded
      condition: query_duration_ms > 1000
    - name: Database Replication Lag
      condition: replication_lag_seconds > 10
  ```

- [ ] **Monitoring Dashboard** (Grafana):
  - [ ] Database connections (target: < 40/100)
  - [ ] Query latency distribution
  - [ ] Error rate (target: < 0.1%)
  - [ ] API response times
  - [ ] Transaction throughput

- [ ] **Log Analysis**:
  ```bash
  # Check for errors in logs
  tail -f /var/log/insightbank-api/app.log | grep -i error
  tail -f /var/log/postgresql/postgresql.log | grep ERROR
  ```

- [ ] **Verification**:
  - [ ] No errors or warnings for first 24 hours
  - [ ] All metrics within expected ranges
  - [ ] User reports minimal/no issues

### 8.4 Rollback Procedure (If Critical Issues)
- [ ] **Decision Criteria for Rollback**:
  - Data corruption detected
  - > 5% error rate
  - Application unavailable > 5 minutes
  - Data loss confirmed

- [ ] **Execute Rollback** (< 10 minutes):
  ```bash
  # 1. Stop application
  kubectl scale deployment insightbank-api --replicas=0
  
  # 2. Restore MySQL from backup
  mysql -u root -p insightbank < pre_cutover_backup.sql.gz
  
  # 3. Revert environment
  export ACTIVE_DATABASE=mysql
  export DUAL_WRITE_ENABLED=false
  
  # 4. Restart application
  kubectl scale deployment insightbank-api --replicas=3
  kubectl rollout status deployment/insightbank-api
  ```

- [ ] **Post-Rollback Analysis**:
  - [ ] Identify root cause of failure
  - [ ] Document in `ROLLBACK_ANALYSIS.md`
  - [ ] Fix and re-plan cutover for next attempt

- [ ] **Verification**:
  - [ ] Application back on MySQL
  - [ ] All data intact
  - [ ] Users notified

---

## Phase 9: Production Hardening & Performance Tuning

### 9.1 PostgreSQL Configuration Optimization
- [ ] **Tune PostgreSQL parameters** (`/etc/postgresql/15/main/postgresql.conf`):
  ```ini
  # Memory
  shared_buffers = 256MB              # 1/4 of system RAM
  effective_cache_size = 2GB          # 50-75% of system RAM
  work_mem = 10MB                     # (system_ram / num_connections) / 2
  
  # WAL & Checkpoints
  wal_buffers = 16MB
  min_wal_size = 1GB
  max_wal_size = 4GB
  checkpoint_completion_target = 0.9
  
  # Logging
  log_min_duration_statement = 1000   # Log queries > 1 second
  log_statement = 'mod'               # Log DDL/DML
  log_statement_sample_rate = 0.1     # Sample 10% of queries
  
  # Performance
  random_page_cost = 1.1              # Adjust for SSD (default 4.0 for spinning disk)
  effective_io_concurrency = 200      # For SSD
  jit = on                            # Enable JIT compilation
  
  # Connections
  max_connections = 200
  ```

- [ ] Reload configuration:
  ```bash
  sudo pg_ctlcluster 15 main reload
  ```

- [ ] **Verification**:
  - [ ] Configuration applied: `SHOW shared_buffers;`
  - [ ] No errors in PostgreSQL logs

### 9.2 Maintenance Tasks & Vacuuming Strategy
- [ ] **Configure Autovacuum**:
  ```sql
  ALTER TABLE users SET (autovacuum_vacuum_scale_factor = 0.01);  -- More frequent
  ALTER TABLE transactions SET (autovacuum_vacuum_scale_factor = 0.01);
  ```

- [ ] **Setup Maintenance Windows**:
  ```bash
  # Daily VACUUM ANALYZE at 2 AM
  0 2 * * * /usr/lib/postgresql/15/bin/vacuumdb -U postgres -d insightbank -z
  ```

- [ ] **Monitor Query Plans Over Time**:
  ```sql
  -- Enable pg_stat_statements
  CREATE EXTENSION pg_stat_statements;
  
  -- Query to find most expensive queries
  SELECT query, mean_exec_time, calls FROM pg_stat_statements 
  ORDER BY mean_exec_time DESC LIMIT 10;
  ```

- [ ] **Verification**:
  - [ ] Autovacuum running smoothly
  - [ ] No bloated tables
  - [ ] Query plans remain optimal

### 9.3 Security Hardening
- [ ] **Enable SSL for PostgreSQL**:
  ```bash
  # Generate self-signed certificate (or use Let's Encrypt)
  sudo openssl req -new -x509 -days 365 -nodes \
    -out /etc/postgresql/15/main/server.crt \
    -keyout /etc/postgresql/15/main/server.key
  
  # Update postgresql.conf
  ssl = on
  ssl_cert_file = '/etc/postgresql/15/main/server.crt'
  ssl_key_file = '/etc/postgresql/15/main/server.key'
  ```

- [ ] **Configure Connection Security**:
  ```bash
  # Update pg_hba.conf for SSL enforcement
  # hostssl    all             all             0.0.0.0/0               md5
  ```

- [ ] **Setup Database User Permissions**:
  ```sql
  -- Create restricted application user (not superuser)
  CREATE ROLE insightbank_app WITH LOGIN PASSWORD '<strong_password>';
  GRANT CONNECT ON DATABASE insightbank_pg TO insightbank_app;
  GRANT USAGE ON SCHEMA public TO insightbank_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO insightbank_app;
  ```

- [ ] **Verification**:
  - [ ] SSL connection verified: `psql -h localhost sslmode=require`
  - [ ] Permissions correctly set

### 9.4 Monitoring & Alerting Configuration
- [ ] **Setup Prometheus Scraping**:
  ```yaml
  # prometheus.yml
  scrape_configs:
    - job_name: 'postgresql'
      static_configs:
        - targets: ['localhost:5432']
      metric_path: '/metrics'
  ```

- [ ] **Deploy PostgreSQL Exporter**:
  ```bash
  docker run -d --name postgres_exporter \
    -e DATA_SOURCE_NAME="postgresql://user:pass@localhost:5432/insightbank_pg?sslmode=disable" \
    -p 9187:9187 prometheuscommunity/postgres-exporter
  ```

- [ ] **Configure Grafana Dashboard**:
  - [ ] PostgreSQL server health
  - [ ] Query performance metrics
  - [ ] Connection pool usage
  - [ ] Disk I/O metrics
  - [ ] Replication status (if applicable)

- [ ] **Setup Critical Alerts**:
  ```yaml
  alerts:
    - HIGH_DB_CONNECTIONS: pg_stat_activity_count > 180 (max: 200)
    - HIGH_QUERY_TIME: avg_query_duration > 5000ms
    - LOW_DISK_SPACE: db_disk_free_percent < 15%
    - TRANSACTION_WRAPAROUND: txid_current / txid_max > 0.8
  ```

- [ ] **Verification**:
  - [ ] Prometheus scraping PostgreSQL metrics
  - [ ] Grafana dashboard displaying live data
  - [ ] Alert webhooks functional (Slack/PagerDuty)

### 9.5 Backup & Disaster Recovery
- [ ] **Setup Automated Backups**:
  ```bash
  #!/bin/bash
  # Daily full backup + weekly base + WAL archiving
  BACKUP_DIR="/var/backups/postgresql"
  
  # Full backup daily at 1 AM
  0 1 * * * pg_dump -U postgres -F custom insightbank_pg > $BACKUP_DIR/full_$(date +\%Y\%m\%d).dump
  
  # WAL archiving for PITR (Point-in-Time Recovery)
  archive_command = 'test ! -f /var/backups/postgresql/wal/%f && cp %p /var/backups/postgresql/wal/%f'
  ```

- [ ] **Test Restore Procedure**:
  - [ ] Full restore from dump: < 30 minutes
  - [ ] PITR to specific timestamp: verify data integrity
  - [ ] Document procedure in `DISASTER_RECOVERY.md`

- [ ] **Verification**:
  - [ ] Backups running on schedule
  - [ ] Restore procedure tested monthly
  - [ ] RTO < 1 hour, RPO < 5 minutes

---

## Success Criteria

### Data Integrity (Non-Negotiable)
✅ Row count parity: 100% across all tables  
✅ Checksum/hash validation: 100% match or documented exceptions  
✅ Referential integrity: 0 orphaned records  
✅ Encoding validation: No UTF-8 corruption  
✅ Character data preservation: 100% accurate  

### Performance & Reliability
✅ Query latency: ≥ 10% improvement or ≤ 5% regression (acceptable)  
✅ Connection pool: Stable under sustained load (100+ concurrent connections)  
✅ Throughput: ≥ 500 requests/second  
✅ Error rate post-cutover: < 0.1% for 48 hours  
✅ Uptime: 99.9% SLA maintained  

### Code & Testing Quality
✅ All tests passing: 100% success rate  
✅ Code coverage: ≥ 85% overall, ≥ 95% database layer  
✅ No hardcoded MySQL references in codebase  
✅ SQLAlchemy ORM used consistently (no raw SQL)  
✅ Zero critical security vulnerabilities  

### Operations & Observability
✅ Monitoring alerts configured and tested  
✅ Slow query logging active and monitored  
✅ Backup & disaster recovery procedures tested  
✅ Rollback procedure tested and < 10 minutes execution  
✅ On-call team trained and documented  

### User-Facing
✅ Cutover downtime: < 5 minutes  
✅ User-visible issues: 0 reported in first 72 hours  
✅ Data consistency visible to users: Confirmed  
✅ Feature parity: 100% (no regressions)  

---

## Detailed Effort Estimation (Revised with Buffers)

### Phase Breakdown with Realistic Timing

| Phase | Core Tasks | Effort | Buffer | Total | Notes |
|-------|-----------|--------|--------|-------|-------|
| Phase 1: Discovery | Audit MySQL, assess data volume, plan backup/recovery | 4-6 hrs | 1 hr | 5-7 hrs | Blockers: Access to production schema |
| Phase 2: Config | Dual-write setup, pooling config, env templates | 3-4 hrs | 1 hr | 4-5 hrs | Includes debugging connection issues |
| Phase 3: Schema | Migrations rewrite, indexes, JSONB adoption | 4-6 hrs | 2 hrs | 6-8 hrs | Testing schema on test DB |
| Phase 4: Data Mig | pgloader setup, validation script, backup testing | 5-7 hrs | 2 hrs | 7-9 hrs | Includes dry runs and troubleshooting |
| Phase 5: Testing | Code audit, test suite, monitoring setup | 6-8 hrs | 2 hrs | 8-10 hrs | High variability based on codebase size |
| Phase 6: Shadow | 48-hour dual-write testing, query analysis | 8 hrs | 2 hrs | 10 hrs | Mainly monitoring/waiting |
| Phase 7: Validation | Final data checks, read-switch testing, prep | 4-5 hrs | 1 hr | 5-6 hrs | Pre-cutover verification |
| Phase 8: Cutover | Execution, monitoring, rollback if needed | 4-6 hrs | 2 hrs | 6-8 hrs | Includes 48-hour post-cutover watch |
| Phase 9: Hardening | PG tuning, security, backups, monitoring | 5-7 hrs | 2 hrs | 7-9 hrs | Long-term stability setup |
| **TOTAL** | **All phases** | **39-49 hrs** | **15 hrs** | **54-64 hrs** | **8-10 days (realistic, non-consecutive)** |

### Calendar Timeline (Recommended Phasing)

```
Week 1 (Mon-Fri):
  Phase 1: Discovery               (2-3 days)
  Phase 2: Config & Setup          (1-2 days)

Week 2-3 (Mon-Fri):
  Phase 3: Schema Migration        (2 days)
  Phase 4: Data Migration Setup    (1 day)
  Phase 5: Testing & Code Updates  (2-3 days)

Week 4 (Mon-Thu):
  Phase 6: Shadow Phase (48 hrs)   (2-3 days) ← Passive monitoring
  Phase 7: Validation              (1 day)
  
Week 4 (Fri):
  Phase 8: Cutover (minimal window)(5 min execution + 48-hr watch)

Week 5+:
  Phase 9: Hardening & Optimization (ongoing)
```

### Effort Distribution

```
Discovery & Planning:     10%  (5-6 hours)
Implementation:           40%  (20-24 hours)  ← Largest effort
Testing & Validation:     30%  (15-18 hours)  ← Critical for confidence
Operations & Hardening:   20%  (10-12 hours)
```

---

## Comprehensive Risk Assessment & Mitigation

| Risk | Severity | Probability | Impact | Mitigation | Contingency |
|------|----------|-------------|--------|-----------|------------|
| **Data loss during migration** | CRITICAL | Medium | All data gone, service down weeks | - Full MySQL backup before cutover<br>- Test restore procedure<br>- Validate row counts before/after | Restore from backup, restart MySQL |
| **Performance regression** | HIGH | Medium | Users experience slowness, revenue impact | - EXPLAIN ANALYZE on all queries<br>- Benchmark before/after<br>- Index optimization (Phase 3) | Rollback to MySQL, re-optimize, retry |
| **Deadlocks in dual-write phase** | HIGH | Low | Write failures, data inconsistency | - Implement dual-write queue<br>- Error logging and alerting<br>- Short timeout retry logic | Disable dual-write, diagnose, retry |
| **Connection pool exhaustion** | MEDIUM | Medium | New requests timeout, service degrades | - Pool size = (2 * CPU cores) + 4<br>- pool_recycle = 3600<br>- Monitor pool stats | Restart application, tune pool config |
| **Migration takes > expected time** | MEDIUM | Medium | Downtime window increases, user dissatisfaction | - Test on staging first<br>- Estimate migration rate upfront<br>- Use pgloader (parallel workers) | Extend maintenance window, communicate |
| **MySQL-specific SQL found late** | MEDIUM | Low | Queries break in PostgreSQL after cutover | - Comprehensive code audit (Phase 5.1)<br>- Automated pattern search<br>- Test against both DBs | Apply hot fixes, or rollback |
| **Encoding/charset issues** | MEDIUM | Low | Data corruption, garbled characters | - Verify UTF-8 encoding before migration<br>- Test with non-ASCII data<br>- Run validation script (Phase 4.2) | Restore from backup, investigate |
| **Concurrent write conflicts** | LOW | Low | Dual-write mode has conflicts | - Implement optimistic locking<br>- Handle race conditions<br>- Log conflicts for investigation | Disable dual-write, investigate |
| **PostgreSQL too slow for production** | LOW | Low | Performance unacceptable, user complaints | - Benchmark extensively (Phase 5.3)<br>- Index optimization<br>- Query plan analysis | Rollback, optimize, retry later |
| **Team unfamiliar with PostgreSQL** | LOW | High | Operations challenges, slow troubleshooting | - Document PostgreSQL basics<br>- Schedule training<br>- Create runbooks | Hire consultant, extend post-migration support |

### Mitigation Strategy Priority

**Before Cutover (Non-Negotiable):**
1. ✅ MySQL backup tested & verified
2. ✅ Row count parity confirmed (Phase 4.2)
3. ✅ Rollback procedure tested < 10 min
4. ✅ Performance benchmarks acceptable
5. ✅ All tests passing (≥ 85% coverage)

**During Cutover (Execution Checklist):**
1. ✅ Disable writes (circuit breaker)
2. ✅ Final data sync
3. ✅ Health checks pass
4. ✅ Smoke tests pass
5. ✅ Monitoring active

**Post-Cutover (First 72 Hours):**
1. ✅ 24/7 on-call monitoring
2. ✅ Hourly health checks
3. ✅ Daily backup verification
4. ✅ Database log monitoring
5. ✅ User feedback channels open

---

## Advanced Monitoring & Observability Checklist

### Pre-Cutover Monitoring Setup
- [ ] Prometheus scraping PostgreSQL metrics
- [ ] Grafana dashboard with:
  - [ ] Query latency (P50, P95, P99)
  - [ ] Connection count
  - [ ] Cache hit ratio
  - [ ] Disk I/O
  - [ ] Transaction rate
- [ ] Slow query logging (queries > 500ms)
- [ ] Error rate dashboard
- [ ] API response time histogram
- [ ] Database size trend

### Post-Cutover Alerts (First 48 Hours)
- [ ] Slack/PagerDuty integration for critical alerts
- [ ] Alert thresholds:
  - [ ] Error rate > 1%
  - [ ] Query latency P95 > 1000ms
  - [ ] Connection count > 180 (out of 200)
  - [ ] Disk usage > 85%
  - [ ] Replication lag > 10 seconds (if applicable)

### Logging & Log Aggregation
- [ ] Application logs: `/var/log/insightbank-api/`
- [ ] PostgreSQL logs: `/var/log/postgresql/`
- [ ] System logs: `/var/log/syslog`
- [ ] Log aggregation tool (ELK stack or similar)
- [ ] Centralized search capability

---

## Connection Pooling Best Practices

### SQLAlchemy Configuration for Production PostgreSQL

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    "postgresql+psycopg2://user:pass@host:5432/db",
    
    # Connection Pool Settings
    poolclass=QueuePool,
    pool_size=20,                    # Connections to keep pre-allocated
    max_overflow=40,                 # Additional connections allowed
    pool_recycle=3600,               # Recycle connections every hour (prevent stale)
    pool_pre_ping=True,              # Test connection before using
    
    # Connection Timeout & Retry
    connect_args={
        "connect_timeout": 10,       # 10 second timeout
        "application_name": "insightbank-api",
        "statement_timeout": 30000,  # 30 second query timeout
    },
    
    # Query Execution
    echo=False,                      # Set to True for SQL debugging
    echo_pool=False,                 # SQL pool events logging
    
    # Performance
    pool_pre_ping_interval=10,       # Check connection health every 10 seconds
)

# Pool Size Calculation
# Recommended: (2 * CPU_CORES) + 4
# Example: 8-core server → pool_size = 20
```

### Monitoring Pool Health

```python
def get_pool_stats(engine):
    """Returns current connection pool statistics."""
    pool = engine.pool
    return {
        "size": pool.size(),              # Current connections
        "checked_out": pool.checkedout(), # In-use connections
        "overflow": pool.overflow(),      # Over-allocated connections
        "total": pool.size() + pool.overflow(),
        "available": pool.size() - pool.checkedout()
    }

# Expose via metrics endpoint
@app.get("/api/metrics/pool")
async def pool_metrics():
    return get_pool_stats(engine)
```

---

## Key Deliverables

1. **MIGRATION_PLAN.md** (this document) - Comprehensive plan
2. **DISCOVERY_REPORT.md** - Data volume, schema audit, findings
3. **MYSQL_AUDIT.md** - MySQL-specific features found
4. **SQL_PATTERNS.md** - Custom SQL and rewrites needed
5. **MIGRATION_COMPAT_MATRIX.md** - Alembic migration compatibility
6. **BACKUP_RECOVERY_PROCEDURE.md** - Backup/restore documentation
7. **POSTGRESQL_CONFIG.md** - Connection and configuration guide
8. **QUERY_OPTIMIZATION.md** - Query rewrites and performance tips
9. **DISASTER_RECOVERY.md** - RTO/RPO procedures
10. **CUTOVER_RUNBOOK.md** - Step-by-step execution guide
11. **ROLLBACK_RUNBOOK.md** - If cutover fails
12. **VALIDATION_REPORT.md** - Final pre-cutover data validation
13. **POST_CUTOVER_REPORT.md** - Issues encountered and resolutions

---

## PostgreSQL vs MySQL: Feature & Performance Comparison

| Aspect | MySQL | PostgreSQL | Winner |
|--------|-------|-----------|--------|
| **JSON Support** | TEXT-based | Native JSONB + GIN indexing | PostgreSQL |
| **Full-Text Search** | FULLTEXT index | tsvector + GIN | PostgreSQL |
| **ACID Compliance** | InnoDB | Native | Tie |
| **Concurrency** | Lock contention | MVCC (better) | PostgreSQL |
| **Query Optimizer** | Good | Excellent | PostgreSQL |
| **Index Types** | Few | BTREE, HASH, GIN, BRIN | PostgreSQL |
| **Scalability** | Good | Better (partitioning, sharding) | PostgreSQL |
| **Replication** | Master-slave | Multiple options (streams, logical) | PostgreSQL |
| **Licensing** | GPL | PostgreSQL License (permissive) | PostgreSQL |
| **Community & Support** | Large | Growing, active | MySQL |

---

## Notes & Important Considerations

- **Alembic Migrations**: Already present; focus on converting MySQL-specific constructs
- **SQLAlchemy ORM**: Already in use; leverage it for database abstraction
- **Dual-Write Window**: Shadow phase minimizes risk; provides high confidence before cutover
- **Zero-Downtime Strategy**: Key differentiator from simple "stop and migrate" approach
- **PostgreSQL JSONB**: Consider migrating TEXT/JSON columns for better performance
- **Connection Pooling**: Correct sizing is critical for production stability
- **Monitoring**: Non-negotiable for production; set up before cutover
- **Rollback Plan**: Must be tested multiple times; know exact steps
- **Team Training**: PostgreSQL quirks differ from MySQL; brief team beforehand
- **Post-Migration**: 30-day close-out period before decommissioning MySQL

---

## References & Tools

- **pgloader**: Data migration tool - https://pgloader.io/
- **pg_dump/restore**: PostgreSQL backup utilities
- **EXPLAIN ANALYZE**: Query planning tool
- **pg_stat_statements**: Query performance monitoring
- **Prometheus + Grafana**: Monitoring stack
- **Alembic**: Schema version control - https://alembic.sqlalchemy.org/
