import { useMemo } from 'react';
import type { ProjectSummary } from '@shared/domain/project';
import { useTranslation } from 'react-i18next';

type ProjectListProps = {
  projects: ProjectSummary[];
  selectedId?: string | null;
  onSelect?: (project: ProjectSummary) => void;
};

export const ProjectList = ({
  projects,
  selectedId,
  onSelect
}: ProjectListProps) => {
  const { t, i18n } = useTranslation('projects');

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language === 'en-US' ? 'en-US' : 'zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }),
    [i18n.language]
  );

  if (projects.length === 0) {
    return (
      <div className="flex-center" style={{ padding: '40px', color: 'var(--system-text-tertiary)', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '48px' }}>📂</span>
        <p>{t('list.empty')}</p>
      </div>
    );
  }

  return (
    <div className="project-list" style={{ display: 'grid', gap: '12px' }}>
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onSelect?.(project)}
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: selectedId === project.id ? 'var(--system-blue)' : 'transparent',
            color: selectedId === project.id ? 'white' : 'var(--system-text-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: '1px solid transparent',
          }}
          className={`${selectedId !== project.id ? 'list-item-hover' : ''} ${selectedId === project.id ? 'selected' : ''}`}
        >
          <div className="flex-between mb-2">
            <span style={{ fontWeight: 600, fontSize: '16px' }}>{project.name}</span>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>
              {dateFormatter.format(new Date(project.createdAt))}
            </span>
          </div>
          {project.description && (
            <p style={{ 
              fontSize: '14px', 
              margin: 0, 
              opacity: 0.9, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              color: selectedId === project.id ? 'rgba(255,255,255,0.9)' : 'var(--system-text-secondary)'
            }}>
              {project.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
