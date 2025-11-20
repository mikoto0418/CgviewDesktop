import { useMemo, useState } from "react";
import type { ProjectSummary } from "@shared/domain/project";
import { useTranslation } from "react-i18next";

interface ProjectDetailPanelProps {
  project: ProjectSummary | null;
  onOpen?: (project: ProjectSummary) => Promise<void> | void;
  onRename?: (projectId: string, name: string, description?: string) => Promise<void> | void;
  onDelete?: (project: ProjectSummary) => Promise<void> | void;
}

export const ProjectDetailPanel = ({ project, onOpen, onRename, onDelete }: ProjectDetailPanelProps) => {
  const { t, i18n } = useTranslation(["projects", "common"]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

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
      <div className="flex-center" style={{ height: '100%', minHeight: '200px', flexDirection: 'column', color: 'var(--system-text-tertiary)' }}>
        <span style={{ fontSize: '32px', marginBottom: '10px' }}>📄</span>
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

  const handleDelete = async () => {
    if (!onDelete) {
      return;
    }
    
    if (confirm(t("projects:detail.deleteConfirm", { name: project.name }))) {
      await onDelete(project);
    }
  };

  const startEditing = () => {
    setEditName(project.name);
    setEditDescription(project.description || "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditName("");
    setEditDescription("");
  };

  const saveEditing = async () => {
    if (!onRename || !editName.trim()) {
      return;
    }

    setIsRenaming(true);
    try {
      await onRename(project.id, editName.trim(), editDescription.trim() || undefined);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to rename project', error);
      alert(t("projects:alerts.renameFailed"));
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="project-detail">
      <header className="flex-between mb-4">
        {isEditing ? (
          <div style={{ flex: 1,  display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="control-input"
              placeholder={t("projects:detail.renamePlaceholder")}
              style={{ flex: 1, fontSize: '16px', fontWeight: 600 }}
              autoFocus
            />
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: '18px', margin: 0 }}>{project.name}</h3>
            {onRename && (
              <button
                type="button"
                onClick={startEditing}
                className="btn-apple-secondary"
                style={{ padding: '4px 8px', fontSize: '12px' }}
                title={t("projects:actions.rename")}
              >
                ✏️ {t("projects:actions.rename")}
              </button>
            )}
          </>
        )}
      </header>
      
      <div style={{ marginBottom: '20px' }}>
        {isEditing ? (
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="control-input"
            placeholder={t("projects:form.descriptionPlaceholder")}
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
        ) : (
          <>
            {project.description ? (
              <p style={{ color: 'var(--system-text-secondary)', lineHeight: 1.6 }}>{project.description}</p>
            ) : (
              <p style={{ color: 'var(--system-text-tertiary)', fontStyle: 'italic' }}>
                {t("projects:detail.noDescription")}
              </p>
            )}
          </>
        )}
      </div>

      {!isEditing && formattedTimestamps ? (
        <div style={{ display: 'grid', gap: '10px', marginBottom: '20px', fontSize: '13px' }}>
          <div className="flex-between">
            <span style={{ color: 'var(--system-text-secondary)' }}>{t("projects:detail.createdAt")}</span>
            <span style={{ fontFamily: 'monospace' }}>{formattedTimestamps.createdAt}</span>
          </div>
          <div className="flex-between">
            <span style={{ color: 'var(--system-text-secondary)' }}>{t("projects:detail.updatedAt")}</span>
            <span style={{ fontFamily: 'monospace' }}>{formattedTimestamps.updatedAt}</span>
          </div>
        </div>
      ) : null}

      {isEditing ? (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            onClick={cancelEditing}
            className="btn-apple-secondary"
            disabled={isRenaming}
            style={{ flex: 1 }}
          >
            {t("common:common.cancel")}
          </button>
          <button 
            type="button" 
            onClick={saveEditing}
            disabled={!editName.trim() || isRenaming}
            className="btn-apple"
            style={{ flex: 2 }}
          >
            {isRenaming ? t("common:common.loading") : t("common:common.save")}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            onClick={handleDelete} 
            disabled={!onDelete}
            className="btn-apple-secondary"
            style={{ flex: 1, color: 'var(--system-red)' }}
          >
            {t("common:common.delete")}
          </button>
          <button 
            type="button" 
            onClick={handleOpen} 
            disabled={!onOpen}
            className="btn-apple"
            style={{ flex: 2 }}
          >
            {t("projects:detail.openAction")}
          </button>
        </div>
      )}
    </div>
  );
};
