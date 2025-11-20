import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectList } from './ProjectList';
import { ProjectDetailPanel } from './ProjectDetailPanel';
import { CreateProjectForm } from './CreateProjectForm';
import { DataImportWizard } from '../modules/import/DataImportWizard';
import type { ProjectSummary } from '@shared/domain/project';

interface DashboardProps {
  projects: ProjectSummary[];
  selectedId: string | null;
  loading: boolean;
  isCreating: boolean;
  error: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (input: { name: string; description?: string }) => Promise<void>;
  onRenameProject: (projectId: string, name: string, description?: string) => Promise<void>;
  onDeleteProject: (project: ProjectSummary) => Promise<void>;
  onOpenProject: (project: ProjectSummary) => Promise<void>;
}

export const Dashboard = ({
  projects,
  selectedId,
  loading,
  isCreating,
  error,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onOpenProject
}: DashboardProps) => {
  const { t } = useTranslation(['dashboard', 'projects', 'common']);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId]
  );

  const runtimeInfo = useMemo(() => {
    if (!window.appBridge) {
      return { version: 'Web Mode', platform: 'Browser' };
    }
    return {
      version: window.appBridge.version,
      platform: window.appBridge.platform
    };
  }, []);

  const handleCreateSubmit = async (input: { name: string; description?: string }) => {
    await onCreateProject(input);
    setShowCreateModal(false);
  };

  return (
    <div className="dashboard-container animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header Section */}
      <header className="flex-between mb-4" style={{ paddingBottom: '20px', borderBottom: '1px solid var(--system-divider)' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>{t('dashboard:title')}</h1>
          <p style={{ fontSize: '15px', color: 'var(--system-text-secondary)', margin: 0 }}>{t('dashboard:subtitle')}</p>
        </div>
        <div className="flex-center gap-4">
           <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--system-text-tertiary)', marginRight: '10px' }}>
            {runtimeInfo.platform} v{runtimeInfo.version}
          </div>
          <button 
            className="btn-apple" 
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ fontSize: '16px' }}>+</span> {t('projects:actions.create')}
          </button>
        </div>
      </header>

      {error && (
        <div className="card" style={{ background: '#fff2f2', borderColor: '#ffcccc', color: 'var(--system-red)', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="dashboard-content" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Project List */}
        <div className="flex-col gap-4">
          <div className="section-header flex-between mb-2">
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('projects:list.title')}</h3>
            {loading && <span style={{ fontSize: '12px', color: 'var(--system-blue)' }}>Loading...</span>}
          </div>
          
          <div className="card glass-panel" style={{ minHeight: '400px' }}>
             <ProjectList
              projects={projects}
              selectedId={selectedId}
              onSelect={(project) => onSelectProject(project.id)}
            />
          </div>
        </div>

        {/* Right Column: Details & Actions */}
        <div className="flex-col gap-4">
          <div className="section-header mb-2">
             <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('projects:detail.title')}</h3>
          </div>

          <div className="card glass-panel">
            <ProjectDetailPanel
              project={selectedProject}
              onOpen={onOpenProject}
              onRename={onRenameProject}
              onDelete={onDeleteProject}
            />
          </div>

          {selectedProject && (
            <div className="card glass-panel animate-fade-in">
              <DataImportWizard projectId={selectedProject.id} />
            </div>
          )}
        </div>
      </div>

      {/* Simple Modal Overlay for Create Project */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setShowCreateModal(false)}>
          <div 
            className="card glass-panel animate-fade-in" 
            style={{ width: '400px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex-between mb-4">
              <h3 style={{ margin: 0 }}>{t('projects:actions.create')}</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--system-text-secondary)' }}
              >
                ×
              </button>
            </div>
            <CreateProjectForm onSubmit={handleCreateSubmit} isSubmitting={isCreating} />
          </div>
        </div>
      )}
    </div>
  );
};
