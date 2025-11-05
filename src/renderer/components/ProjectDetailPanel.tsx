import { useMemo } from "react";
import type { ProjectSummary } from "@shared/domain/project";
import { useTranslation } from "react-i18next";

interface ProjectDetailPanelProps {
  project: ProjectSummary | null;
  onOpen?: (project: ProjectSummary) => Promise<void> | void;
}

export const ProjectDetailPanel = ({ project, onOpen }: ProjectDetailPanelProps) => {
  const { t, i18n } = useTranslation(["projects", "common"]);

  const formattedTimestamps = useMemo(() => {
    if (!project) {
      return null;
    }

    const formatter = new Intl.DateTimeFormat(
      i18n.language === "en-US" ? "en-US" : "zh-CN",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }
    );

    return {
      createdAt: formatter.format(new Date(project.createdAt)),
      updatedAt: formatter.format(new Date(project.updatedAt))
    };
  }, [project, i18n.language]);

  if (!project) {
    return (
      <div className="project-detail project-detail--empty">
        <h3>{t("projects:detail.title")}</h3>
        <p>{t("projects:detail.empty")}</p>
      </div>
    );
  }

  const handleOpen = async () => {
    if (!onOpen) {
      return;
    }
    await onOpen(project);
  };

  return (
    <div className="project-detail">
      <header className="project-detail__header">
        <h3>{project.name}</h3>
        <span className="project-detail__badge">{t("projects:detail.label")}</span>
      </header>
      {project.description ? (
        <p className="project-detail__description">{project.description}</p>
      ) : (
        <p className="project-detail__description project-detail__description--muted">
          {t("projects:detail.noDescription")}
        </p>
      )}
      {formattedTimestamps ? (
        <dl className="project-detail__meta">
          <div>
            <dt>{t("projects:detail.createdAt")}</dt>
            <dd>{formattedTimestamps.createdAt}</dd>
          </div>
          <div>
            <dt>{t("projects:detail.updatedAt")}</dt>
            <dd>{formattedTimestamps.updatedAt}</dd>
          </div>
        </dl>
      ) : null}
      <footer className="project-detail__footer">
        <button type="button" onClick={handleOpen} disabled={!onOpen}>
          {t("projects:detail.openAction")}
        </button>
      </footer>
    </div>
  );
};
