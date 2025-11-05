import type { MigrationDefinition } from '../persistence-adapter';

export const migration003: MigrationDefinition = {
  id: '003_add_dataset_display_name',
  statements: [
    `ALTER TABLE datasets
       ADD COLUMN display_name TEXT;`,
    `UPDATE datasets
       SET display_name = file_name
       WHERE display_name IS NULL
          OR TRIM(display_name) = '';`
  ]
};
