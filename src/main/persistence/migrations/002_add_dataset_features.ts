import type { MigrationDefinition } from '../persistence-adapter';

export const migration002: MigrationDefinition = {
  id: '002_add_dataset_features',
  statements: [
    `CREATE TABLE IF NOT EXISTS dataset_features (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        feature_index INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
      );`,
    `CREATE INDEX IF NOT EXISTS idx_dataset_features_dataset
       ON dataset_features(dataset_id, feature_index);`
  ]
};
