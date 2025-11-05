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
      <div className="project-list project-list--empty">
        <p>{t('list.empty')}</p>
      </div>
    );
  }

  return (
    <ul className="project-list">
      {projects.map((project) => (
        <li
          key={project.id}
          className={
            selectedId === project.id
              ? 'project-list__item project-list__item--active'
              : 'project-list__item'
          }
        >
          <button
            type="button"
            onClick={() => onSelect?.(project)}
            className="project-list__button"
          >
            <span className="project-list__name">{project.name}</span>
            {project.description ? (
              <span className="project-list__description">
                {project.description}
              </span>
            ) : null}
            <span className="project-list__meta">
              {t('list.createdAt', {
                date: dateFormatter.format(new Date(project.createdAt))
              })}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};
