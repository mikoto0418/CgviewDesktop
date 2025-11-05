import { randomUUID } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { Database, SqlJsStatic } from 'sql.js';
import initSqlJs from 'sql.js';

import type {
  CreateProjectInput,
  ProjectSummary
} from '@shared/domain/project';
import type {
  DatasetSummary,
  PersistedDataset,
  DatasetDetail,
  FeatureStateMap,
  DatasetStatistics
} from '@shared/parser/types';
import type { PlotTrack, LinkTrack } from '@shared/domain/visualization';
import {
  normalizeFeatureStates,
  normalizeLinkTracks,
  normalizePlotTracks
} from '@shared/domain/visualization-normalizers';
import { computeDatasetStatistics } from '@shared/domain/dataset-statistics';

import type { PersistenceAdapter } from './persistence-adapter';
import { migration001 } from './migrations/001_init';
import { migration002 } from './migrations/002_add_dataset_features';
import { migration003 } from './migrations/003_add_dataset_display_name';

const MIGRATIONS = [migration001, migration002, migration003] as const;
const ACTIVE_SCOPE = 'app_state';
const ACTIVE_KEY = 'active_project';

interface SQLiteAdapterOptions {
  databaseFile: string;
  wasmFile?: string;
}

export class SQLitePersistenceAdapter implements PersistenceAdapter {
  private db: Database | null = null;
  private sql: SqlJsStatic | null = null;

  constructor(private readonly options: SQLiteAdapterOptions) {}

  public async init(): Promise<void> {
    if (this.db) {
      return;
    }

    const { databaseFile } = this.options;
    const directory = dirname(databaseFile);

    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    this.sql = await initSqlJs({
      locateFile: (file) => {
        if (this.options.wasmFile) {
          return this.options.wasmFile;
        }
        return resolve(
          process.cwd(),
          'node_modules/sql.js/dist',
          file
        );
      }
    });

    const databaseBinary = existsSync(databaseFile)
      ? readFileSync(databaseFile)
      : null;

    this.db = databaseBinary
      ? new this.sql.Database(databaseBinary)
      : new this.sql.Database();

    this.db.exec('PRAGMA foreign_keys = ON;');
    this.ensureMigrationsTable();
    await this.runPendingMigrations();
    this.persist();
  }

  public async listProjects(): Promise<ProjectSummary[]> {
    this.assertInitialized();
    const statement = this.db.prepare(
      `SELECT id, name, description, created_at, updated_at
       FROM projects
       ORDER BY datetime(created_at) DESC;`
    );

    const rows: ProjectSummary[] = [];
    while (statement.step()) {
      const row = statement.getAsObject() as Record<string, unknown>;
      rows.push(this.mapProjectRow(row));
    }
    statement.free();
    return rows;
  }

  public async getProjectById(id: string): Promise<ProjectSummary | null> {
    this.assertInitialized();
    const statement = this.db.prepare(
      `SELECT id, name, description, created_at, updated_at
       FROM projects
       WHERE id = ?
       LIMIT 1;`
    );
    statement.bind([id]);

    let project: ProjectSummary | null = null;
    if (statement.step()) {
      const row = statement.getAsObject() as Record<string, unknown>;
      project = this.mapProjectRow(row);
    }
    statement.free();
    return project;
  }

  public async createProject(
    input: CreateProjectInput
  ): Promise<ProjectSummary> {
    this.assertInitialized();

    const now = new Date().toISOString();
    const id = randomUUID();
    const description = input.description ?? null;

    const insert = this.db.prepare(
      `INSERT INTO projects (id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?);`
    );

    insert.run([id, input.name, description, now, now]);
    insert.free();

    this.persist();

    return {
      id,
      name: input.name,
      description,
      createdAt: now,
      updatedAt: now
    };
  }

  public async createDataset(
    dataset: PersistedDataset
  ): Promise<DatasetSummary> {
    this.assertInitialized();

    let resolvedDisplayName = basename(dataset.sourcePath);
    this.db.run('BEGIN TRANSACTION;');
    try {
      const trimmedName =
        typeof dataset.displayName === 'string' ? dataset.displayName.trim() : '';
      if (trimmedName.length > 0) {
        resolvedDisplayName = trimmedName;
      }

      const insert = this.db.prepare(
        `INSERT INTO datasets (
          id, project_id, file_name, file_type, status, metadata_json, imported_at, display_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`
      );

      const normalizedFeatureStates = normalizeFeatureStates(
        dataset.featureStates ?? {}
      );
      const normalizedPlotTracks = normalizePlotTracks(
        dataset.plotTracks ?? []
      );
      const normalizedLinkTracks = normalizeLinkTracks(
        dataset.linkTracks ?? []
      );
      const statistics =
        dataset.statistics ?? computeDatasetStatistics(dataset.features);

      insert.run([
        dataset.id,
        dataset.projectId,
        dataset.sourcePath,
        dataset.format,
        'parsed',
        JSON.stringify({
          meta: dataset.meta,
          featureStates: normalizedFeatureStates,
          plotTracks: normalizedPlotTracks,
          linkTracks: normalizedLinkTracks,
          statistics
        }),
        dataset.createdAt,
        resolvedDisplayName
      ]);
      insert.free();

      this.insertDatasetFeatures(dataset.id, dataset.features);

      this.db.run('COMMIT;');
    } catch (error) {
      this.db.run('ROLLBACK;');
      throw error;
    }

    this.persist();

    return {
      id: dataset.id,
      projectId: dataset.projectId,
      format: dataset.format,
      sourcePath: dataset.sourcePath,
      displayName: resolvedDisplayName,
      recordCount: dataset.meta.recordCount,
      organism: dataset.meta.organism,
      totalLength: dataset.meta.totalLength,
      createdAt: dataset.createdAt,
      featureStates: normalizeFeatureStates(dataset.featureStates ?? {}),
      plotTracks: normalizePlotTracks(dataset.plotTracks ?? []),
      linkTracks: normalizeLinkTracks(dataset.linkTracks ?? []),
      statistics
    };
  }

  public async listDatasets(projectId: string): Promise<DatasetSummary[]> {
    this.assertInitialized();
    const statement = this.db.prepare(
      `SELECT id, project_id, file_name, file_type, metadata_json, imported_at, display_name
       FROM datasets
       WHERE project_id = ?
       ORDER BY datetime(imported_at) DESC;`
    );
    statement.bind([projectId]);

    const rows: DatasetSummary[] = [];
    while (statement.step()) {
      const row = statement.getAsObject() as Record<string, unknown>;
      rows.push(this.mapDatasetRow(row));
    }
    statement.free();
    return rows;
  }

  public async getDatasetDetail(datasetId: string): Promise<DatasetDetail | null> {
    this.assertInitialized();
    const datasetStmt = this.db.prepare(
      `SELECT id, project_id, file_name, file_type, metadata_json, imported_at, display_name
       FROM datasets
       WHERE id = ?
       LIMIT 1;`
    );
    datasetStmt.bind([datasetId]);

    let summary: DatasetSummary | null = null;
    if (datasetStmt.step()) {
      const row = datasetStmt.getAsObject() as Record<string, unknown>;
      summary = this.mapDatasetRow(row);
    }
    datasetStmt.free();

    if (!summary) {
      return null;
    }

    const featuresStmt = this.db.prepare(
      `SELECT payload_json
       FROM dataset_features
       WHERE dataset_id = ?
       ORDER BY feature_index ASC;`
    );
    featuresStmt.bind([datasetId]);

    const features: Array<Record<string, unknown>> = [];
    while (featuresStmt.step()) {
      const row = featuresStmt.getAsObject() as Record<string, unknown>;
      try {
        const payload =
          typeof row['payload_json'] === 'string'
            ? JSON.parse(String(row['payload_json']))
            : row['payload_json'];
        if (payload && typeof payload === 'object') {
          features.push(payload as Record<string, unknown>);
        }
      } catch (error) {
        console.error('[Persistence] Failed to parse dataset feature payload', error);
      }
    }
    featuresStmt.free();

    return {
      ...summary,
      features
    };
  }

  public async deleteDataset(datasetId: string): Promise<void> {
    this.assertInitialized();

    this.db.run('BEGIN TRANSACTION;');
    try {
      const statement = this.db.prepare(
        `DELETE FROM datasets
         WHERE id = ?;`
      );
      statement.run([datasetId]);
      statement.free();
      this.db.run('COMMIT;');
    } catch (error) {
      this.db.run('ROLLBACK;');
      throw error;
    }

    this.persist();
  }

  public async updateDatasetDisplayName(datasetId: string, displayName: string): Promise<void> {
    this.assertInitialized();

    const trimmed = displayName.trim();
    const value = trimmed.length > 0 ? trimmed : null;

    const statement = this.db.prepare(
      `UPDATE datasets
         SET display_name = ?
       WHERE id = ?;`
    );
    statement.run([value, datasetId]);
    statement.free();

    this.persist();
  }

  public async updateDatasetFeatureStates(
    datasetId: string,
    featureStates: FeatureStateMap
  ): Promise<void> {
    this.assertInitialized();

    this.db.run('BEGIN TRANSACTION;');
    try {
      const statement = this.db.prepare(
        `SELECT metadata_json
           FROM datasets
          WHERE id = ?
          LIMIT 1;`
      );
      statement.bind([datasetId]);

      if (!statement.step()) {
        statement.free();
        throw new Error(`Dataset ${datasetId} not found.`);
      }

      const row = statement.getAsObject() as Record<string, unknown>;
      statement.free();

      let metadata: Record<string, unknown>;
      try {
        metadata =
          typeof row['metadata_json'] === 'string'
            ? JSON.parse(String(row['metadata_json']))
            : {};
      } catch {
        metadata = {};
      }

      metadata.featureStates = normalizeFeatureStates(featureStates ?? {});
      metadata.plotTracks = normalizePlotTracks(metadata['plotTracks']);
      metadata.linkTracks = normalizeLinkTracks(metadata['linkTracks']);

      const update = this.db.prepare(
        `UPDATE datasets
           SET metadata_json = ?
         WHERE id = ?;`
      );
      update.run([JSON.stringify(metadata), datasetId]);
      update.free();

      this.db.run('COMMIT;');
      this.persist();
    } catch (error) {
      this.db.run('ROLLBACK;');
      throw error;
    }
  }

  public async updateDatasetPlotTracks(
    datasetId: string,
    plotTracks: PlotTrack[]
  ): Promise<void> {
    this.assertInitialized();

    this.db.run('BEGIN TRANSACTION;');
    try {
      const statement = this.db.prepare(
        `SELECT metadata_json
           FROM datasets
          WHERE id = ?
          LIMIT 1;`
      );
      statement.bind([datasetId]);

      if (!statement.step()) {
        statement.free();
        throw new Error(`Dataset ${datasetId} not found.`);
      }

      const row = statement.getAsObject() as Record<string, unknown>;
      statement.free();

      let metadata: Record<string, unknown>;
      try {
        metadata =
          typeof row['metadata_json'] === 'string'
            ? JSON.parse(String(row['metadata_json']))
            : {};
      } catch {
        metadata = {};
      }

      metadata.plotTracks = normalizePlotTracks(plotTracks ?? []);
      metadata.featureStates = normalizeFeatureStates(
        metadata['featureStates']
      );
      metadata.linkTracks = normalizeLinkTracks(metadata['linkTracks']);

      const update = this.db.prepare(
        `UPDATE datasets
           SET metadata_json = ?
         WHERE id = ?;`
      );
      update.run([JSON.stringify(metadata), datasetId]);
      update.free();

      this.db.run('COMMIT;');
      this.persist();
    } catch (error) {
      this.db.run('ROLLBACK;');
      throw error;
    }
  }

  public async updateDatasetLinkTracks(
    datasetId: string,
    linkTracks: LinkTrack[]
  ): Promise<void> {
    this.assertInitialized();

    this.db.run('BEGIN TRANSACTION;');
    try {
      const statement = this.db.prepare(
        `SELECT metadata_json
           FROM datasets
          WHERE id = ?
          LIMIT 1;`
      );
      statement.bind([datasetId]);

      if (!statement.step()) {
        statement.free();
        throw new Error(`Dataset ${datasetId} not found.`);
      }

      const row = statement.getAsObject() as Record<string, unknown>;
      statement.free();

      let metadata: Record<string, unknown>;
      try {
        metadata =
          typeof row['metadata_json'] === 'string'
            ? JSON.parse(String(row['metadata_json']))
            : {};
      } catch {
        metadata = {};
      }

      metadata.linkTracks = normalizeLinkTracks(linkTracks ?? []);
      metadata.featureStates = normalizeFeatureStates(
        metadata['featureStates']
      );
      metadata.plotTracks = normalizePlotTracks(metadata['plotTracks']);

      const update = this.db.prepare(
        `UPDATE datasets
           SET metadata_json = ?
         WHERE id = ?;`
      );
      update.run([JSON.stringify(metadata), datasetId]);
      update.free();

      this.db.run('COMMIT;');
      this.persist();
    } catch (error) {
      this.db.run('ROLLBACK;');
      throw error;
    }
  }

  public async getActiveProjectId(): Promise<string | null> {
    this.assertInitialized();
    const statement = this.db.prepare(
      `SELECT value_json
       FROM preferences
       WHERE scope = ? AND key = ?
       LIMIT 1;`
    );
    statement.bind([ACTIVE_SCOPE, ACTIVE_KEY]);

    let active: string | null = null;
    if (statement.step()) {
      const row = statement.getAsObject() as Record<string, unknown>;
      const value = row['value_json'];
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed === 'string') {
            active = parsed;
          }
        } catch {
          active = null;
        }
      }
    }

    statement.free();
    return active;
  }

  public async setActiveProjectId(projectId: string | null): Promise<void> {
    this.assertInitialized();

    this.db.run('BEGIN IMMEDIATE TRANSACTION;');
    try {
      const deleteStmt = this.db.prepare(
        `DELETE FROM preferences
         WHERE scope = ? AND key = ?;`
      );
      deleteStmt.run([ACTIVE_SCOPE, ACTIVE_KEY]);
      deleteStmt.free();

      if (projectId) {
        const project = await this.getProjectById(projectId);
        if (!project) {
          throw new Error(`Project ${projectId} does not exist.`);
        }

        const insertStmt = this.db.prepare(
          `INSERT INTO preferences
             (id, scope, key, value_json, project_id, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'));`
        );

        insertStmt.run([
          randomUUID(),
          ACTIVE_SCOPE,
          ACTIVE_KEY,
          JSON.stringify(projectId),
          projectId
        ]);
        insertStmt.free();
      }

      this.db.run('COMMIT;');
      this.persist();
    } catch (error) {
      this.db.run('ROLLBACK;');
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    this.persist();
    this.db.close();
    this.db = null;
    this.sql = null;
  }

  private ensureMigrationsTable(): void {
    this.assertInitialized();
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS __migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`
    );
  }

  private async runPendingMigrations(): Promise<void> {
    this.assertInitialized();

    const applied = new Set<string>();
    const statement = this.db.prepare('SELECT id FROM __migrations;');
    while (statement.step()) {
      const row = statement.get() as unknown[];
      if (row[0]) {
        applied.add(String(row[0]));
      }
    }
    statement.free();

    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) {
        continue;
      }

      this.db.run('BEGIN TRANSACTION;');
      try {
        for (const sql of migration.statements) {
          this.db.exec(sql);
        }
        const insert = this.db.prepare(
          `INSERT INTO __migrations (id, applied_at)
           VALUES (?, datetime('now'));`
        );
        insert.run([migration.id]);
        insert.free();
        this.db.run('COMMIT;');
      } catch (error) {
        this.db.run('ROLLBACK;');
        throw error;
      }
    }
  }

  private persist(): void {
    this.assertInitialized();
    const binary = this.db.export();
    writeFileSync(this.options.databaseFile, Buffer.from(binary));
  }

  private mapProjectRow(row: Record<string, unknown>): ProjectSummary {
    const description =
      row['description'] === undefined || row['description'] === null
        ? null
        : String(row['description']);

    return {
      id: String(row['id']),
      name: String(row['name']),
      description,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at'])
    };
  }

  private mapDatasetRow(row: Record<string, unknown>): DatasetSummary {
    let metadata: Record<string, unknown> = {};
    try {
      metadata =
        typeof row['metadata_json'] === 'string'
          ? JSON.parse(String(row['metadata_json']))
          : {};
    } catch {
      metadata = {};
    }

    const meta = metadata['meta'] as Record<string, unknown> | undefined;
    const featureStatesRaw =
      (metadata['featureStates'] as Record<string, unknown> | undefined) ?? {};
    const featureStates = normalizeFeatureStates(featureStatesRaw);
    const plotTracks = normalizePlotTracks(metadata['plotTracks']);
    const linkTracks = normalizeLinkTracks(metadata['linkTracks']);
    const statisticsRaw = metadata['statistics'] as Record<string, unknown> | undefined;
    const statistics: DatasetStatistics | undefined =
      statisticsRaw && typeof statisticsRaw === 'object'
        ? {
            totalFeatures: Number(
              (statisticsRaw['totalFeatures'] as number | undefined) ?? 0
            ),
            featureTypes: Array.isArray(statisticsRaw['featureTypes'])
              ? (statisticsRaw['featureTypes'] as Array<Record<string, unknown>>)
                  .map((item) => {
                    const key =
                      typeof item['key'] === 'string'
                        ? item['key']
                        : '';
                    const label =
                      typeof item['label'] === 'string'
                        ? item['label']
                        : key;
                    const count = Number(item['count']);
                    return {
                      key,
                      label,
                      count: Number.isFinite(count) ? count : 0
                    };
                  })
                  .filter((item) => item.key.length > 0)
              : []
          }
        : undefined;
    const rawDisplayName = typeof row['display_name'] === 'string' ? row['display_name'] : null;
    const displayName =
      rawDisplayName && rawDisplayName.trim().length > 0
        ? rawDisplayName.trim()
        : basename(String(row['file_name']));

    return {
      id: String(row['id']),
      projectId: String(row['project_id']),
      format: row['file_type'] as DatasetSummary['format'],
      sourcePath: String(row['file_name']),
      displayName,
      recordCount: Number(
        (meta?.['recordCount'] as number | undefined) ??
          (metadata['recordCount'] as number | undefined) ??
          0
      ),
      organism:
        (meta?.['organism'] as string | undefined) ??
        (metadata['organism'] as string | undefined) ??
        undefined,
      totalLength: Number(
        (meta?.['totalLength'] as number | undefined) ??
          (metadata['totalLength'] as number | undefined) ??
          0
      ) || undefined,
      createdAt: String(row['imported_at']),
      featureStates,
      plotTracks,
      linkTracks,
      statistics
    };
  }

  private insertDatasetFeatures(
    datasetId: string,
    features: Array<Record<string, unknown>>
  ) {
    if (!features.length) {
      return;
    }

    const statement = this.db.prepare(
      `INSERT INTO dataset_features (
        id, dataset_id, feature_index, payload_json
      ) VALUES (?, ?, ?, ?);`
    );

    features.forEach((feature, index) => {
      statement.run([
        randomUUID(),
        datasetId,
        index,
        JSON.stringify(feature)
      ]);
    });

    statement.free();
  }

  private assertInitialized(): asserts this is {
    db: Database;
    sql: SqlJsStatic;
  } {
    if (!this.db || !this.sql) {
      throw new Error('SQLitePersistenceAdapter is not initialized.');
    }
  }
}

export const createSQLiteAdapter = (databaseFile: string) => {
  const wasmFile = resolve(
    process.cwd(),
    'node_modules/sql.js/dist/sql-wasm.wasm'
  );

  return new SQLitePersistenceAdapter({
    databaseFile,
    wasmFile: existsSync(wasmFile) ? wasmFile : undefined
  });
};
