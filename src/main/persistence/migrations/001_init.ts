import type { MigrationDefinition } from '../persistence-adapter';

export const migration001: MigrationDefinition = {
  id: '001_init',
  statements: [
    `CREATE TABLE IF NOT EXISTS __migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,
    `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        default_render_config_id TEXT
      );`,
    `CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        status TEXT NOT NULL,
        metadata_json TEXT,
        imported_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );`,
    `CREATE INDEX IF NOT EXISTS idx_datasets_project ON datasets(project_id);`,
    `CREATE TABLE IF NOT EXISTS feature_layers (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        layer_order INTEGER NOT NULL,
        config_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );`,
    `CREATE INDEX IF NOT EXISTS idx_feature_layers_project ON feature_layers(project_id);`,
    `CREATE TABLE IF NOT EXISTS render_configs (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        name TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        is_template INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );`,
    `CREATE INDEX IF NOT EXISTS idx_render_configs_project ON render_configs(project_id);`,
    `CREATE TABLE IF NOT EXISTS filters (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        definition_json TEXT NOT NULL,
        is_shared INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );`,
    `CREATE INDEX IF NOT EXISTS idx_filters_project ON filters(project_id);`,
    `CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        job_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        log_path TEXT,
        started_at TEXT,
        finished_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );`,
    `CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id);`,
    `CREATE TABLE IF NOT EXISTS preferences (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        key TEXT NOT NULL,
        value_json TEXT NOT NULL,
        project_id TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE(scope, key, project_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );`
  ]
};
