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

  // Auto-detect format based on file extension
  useEffect(() => {
    if (!state.filePath || state.parsers.length === 0) return;

    const extension = state.filePath.split('.').pop()?.toLowerCase();
    let detectedFormat: ParserSummary | undefined;

    switch (extension) {
      case 'gb':
      case 'gbk':
      case 'genbank':
        detectedFormat = state.parsers.find(p => p.format === 'genbank');
        break;
      case 'gff':
      case 'gff3':
        detectedFormat = state.parsers.find(p => p.format === 'gff3');
        break;
      case 'json':
        detectedFormat = state.parsers.find(p => p.format === 'json');
        break;
      case 'csv':
      case 'tsv':
        detectedFormat = state.parsers.find(p => p.format === 'csv');
        break;
    }

    if (detectedFormat) {
      setState(prev => ({ ...prev, selectedFormat: detectedFormat! }));
    }
  }, [state.filePath, state.parsers]);

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
    <section className="import-wizard" style={{ padding: '20px' }}>
      <header className="import-wizard__header" style={{ marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{t('import:title')}</h3>
          <p style={{ color: 'var(--system-text-secondary)', fontSize: '13px', margin: 0 }}>{t('import:subtitle')}</p>
        </div>
      </header>

      <form className="import-form flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex-col gap-2">
          <label style={{ fontSize: '13px', fontWeight: 500 }}>{t('import:fields.filePath')}</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="control-input"
              placeholder={t('import:placeholder.filePath')}
              value={state.filePath}
              onChange={(event) =>
                setState((prev) => ({ ...prev, filePath: event.target.value }))
              }
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn-apple-secondary"
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
        </div>

        <div className="flex-col gap-2">
          <label style={{ fontSize: '13px', fontWeight: 500 }}>{t('import:fields.format')}</label>
          <select
            className="control-input"
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
          {state.selectedFormat?.format === 'csv' && (
            <small style={{ color: 'var(--system-text-tertiary)', fontSize: '12px' }}>{t('import:helper.csvColumns')}</small>
          )}
        </div>

        <button 
          type="submit" 
          className="btn-apple-primary" 
          disabled={!canSubmit || state.loading}
          style={{ marginTop: '10px' }}
        >
          {state.loading ? t('import:actions.parsing') : t('import:actions.start')}
        </button>
      </form>

      {state.error && (
        <div className="card" style={{ background: '#fff2f2', borderColor: '#ffcccc', color: 'var(--system-red)', marginTop: '16px', padding: '12px' }}>
          ⚠️ {state.error}
        </div>
      )}

      {state.result && (
        <div className="card glass-panel animate-fade-in" style={{ marginTop: '20px', background: 'rgba(52, 199, 89, 0.1)', borderColor: 'var(--system-green)' }}>
          <div className="flex-between">
            <div>
              <h4 style={{ color: 'var(--system-green)', margin: '0 0 4px 0' }}>✓ {t('import:result.title')}</h4>
              <p style={{ fontSize: '13px', margin: 0 }}>
                {t('import:result.summary', {
                  recordCount: state.result.dataset.recordCount,
                  organism: state.result.dataset.organism ?? t('import:result.unknownOrganism')
                })}
              </p>
            </div>
          </div>
          
          {state.warnings.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--system-orange)', margin: '0 0 4px 0' }}>Warnings:</p>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--system-text-secondary)' }}>
                {state.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
