import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  FileParseRequest,
  ParserSummary,
  ParseDatasetResponse
} from '@shared/parser/types';
import { ImportService } from '@renderer/services/import-service';

interface DataImportWizardProps {
  projectId: string | null;
  onImported?: (response: ParseDatasetResponse) => void;
}

interface WizardState {
  parsers: ParserSummary[];
  selectedFormat: ParserSummary | null;
  filePath: string;
  result: ParseDatasetResponse | null;
  warnings: string[];
  loading: boolean;
  error: string | null;
}

const initialState: WizardState = {
  parsers: [],
  selectedFormat: null,
  filePath: '',
  result: null,
  warnings: [],
  loading: false,
  error: null
};

export const DataImportWizard = ({ projectId, onImported }: DataImportWizardProps) => {
  const { t } = useTranslation(['import', 'projects']);
  const [state, setState] = useState<WizardState>(initialState);

  useEffect(() => {
    ImportService.listParsers()
      .then((parsers) => {
        setState((prev) => ({
          ...prev,
          parsers,
          selectedFormat: parsers[0] ?? null
        }));
      })
      .catch((error) => {
        console.error(error);
        setState((prev) => ({ ...prev, error: t('import:alerts.loadFailed') }));
      });
  }, [t]);

  const canSubmit = useMemo(() => {
    return Boolean(
      projectId && state.selectedFormat && state.filePath.trim().length > 0
    );
  }, [projectId, state.selectedFormat, state.filePath]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !projectId || !state.selectedFormat) {
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null, warnings: [] }));

    const payload: FileParseRequest = {
      projectId,
      filePath: state.filePath.trim(),
      formatHint: state.selectedFormat.format
    };

    try {
      const result = await ImportService.parse(payload);
      setState((prev) => ({
        ...prev,
        result,
        warnings: result.warnings ?? [],
        loading: false
      }));
      onImported?.(result);
    } catch (error) {
      console.error(error);
      setState((prev) => ({
        ...prev,
        error: t('import:alerts.parseFailed'),
        loading: false
      }));
    }
  };

  return (
    <section className="import-wizard">
      <header className="import-wizard__header">
        <div>
          <h3>{t('import:title')}</h3>
          <p>{t('import:subtitle')}</p>
        </div>
        <span className="import-wizard__badge">
          {state.selectedFormat?.displayName ?? t('import:placeholder.format')}
        </span>
      </header>

      <form className="import-form" onSubmit={handleSubmit}>
        <label className="import-form__field">
          <span>{t('import:fields.format')}</span>
          <select
            value={state.selectedFormat?.format ?? ''}
            onChange={(event) => {
              const format = state.parsers.find(
                (item) => item.format === event.target.value
              );
              setState((prev) => ({
                ...prev,
                selectedFormat: format ?? null
              }));
            }}
          >
            {state.parsers.map((parser) => (
              <option key={parser.format} value={parser.format}>
                {parser.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="import-form__field">
          <span>{t('import:fields.filePath')}</span>
          <div className="import-form__picker">
            <input
              type="text"
              placeholder={t('import:placeholder.filePath')}
              value={state.filePath}
              onChange={(event) =>
                setState((prev) => ({ ...prev, filePath: event.target.value }))
              }
            />
            <button
              type="button"
              onClick={async () => {
                if (!window.appBridge?.selectFile) {
                  return;
                }
                try {
                  const file = await window.appBridge.selectFile([
                    { name: 'GenBank', extensions: ['gb', 'gbk'] },
                    { name: 'GFF3', extensions: ['gff', 'gff3'] },
                    { name: 'JSON', extensions: ['json'] },
                    { name: 'CSV', extensions: ['csv'] },
                    {
                      name: t('import:filters.any'),
                      extensions: ['*']
                    }
                  ]);
                  if (file) {
                    setState((prev) => ({ ...prev, filePath: file }));
                  }
                } catch (error) {
                  console.error(error);
                }
              }}
            >
              {t('import:actions.browse')}
            </button>
          </div>
          <small>
            {state.filePath
              ? t('import:placeholder.fileSelected', { path: state.filePath })
              : t('import:helper.mockFile')}
          </small>
          {state.selectedFormat?.format === 'csv' ? (
            <small className="import-form__hint">{t('import:helper.csvColumns')}</small>
          ) : null}
        </label>

        <button type="submit" disabled={!canSubmit || state.loading}>
          {state.loading ? t('import:actions.parsing') : t('import:actions.start')}
        </button>
      </form>

      {state.error ? <div className="alert alert--error">{state.error}</div> : null}

      {state.result ? (
        <div className="import-result">
          <header>
            <h4>{t('import:result.title')}</h4>
            <p>{t('import:result.summary', {
              recordCount: state.result.dataset.recordCount,
              organism: state.result.dataset.organism ?? t('import:result.unknownOrganism')
            })}</p>
          </header>
          {state.warnings.length > 0 ? (
            <ul className="import-result__warnings">
              {state.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {state.result.previewFeatures ? (
            <pre className="import-result__preview">
              {JSON.stringify(state.result.previewFeatures, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : (
        <div className="import-result import-result--empty">
          <p>{t('import:placeholder.result')}</p>
        </div>
      )}
    </section>
  );
};
