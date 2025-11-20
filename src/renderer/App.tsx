import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "./state/project-store";
import { WorkspaceIntegrationView } from "./modules/workspace/WorkspaceIntegrationView";
import { MainLayout } from "./components/Layout/MainLayout";
import { Dashboard } from "./components/Dashboard";

const AppContent = () => {
  const { t } = useTranslation(["projects", "common"]);
  const [error, setError] = useState<string | null>(null);
  
  // Store state
  const projects = useProjectStore((state) => state.projects);
  const selectedId = useProjectStore((state) => state.selectedId);
  const loading = useProjectStore((state) => state.loading);
  const isCreating = useProjectStore((state) => state.isCreating);
  const view = useProjectStore((state) => state.view);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const createProject = useProjectStore((state) => state.createProject);
  const updateProject = useProjectStore((state) => state.updateProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const selectProject = useProjectStore((state) => state.selectProject);
  const openProject = useProjectStore((state) => state.openProject);
  const exitWorkspace = useProjectStore((state) => state.exitWorkspace);

  // Derived state
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId]
  );

  // Initial load
  useEffect(() => {
    console.info('[renderer] App initializing...');
    loadProjects()
      .then(() => console.info('[renderer] Projects loaded'))
      .catch((err) => {
        console.error('[renderer] Failed to load projects:', err);
        setError(t("projects:alerts.loadFailed"));
      });
  }, [loadProjects, t]);

  // Handlers
  const handleCreate = useCallback(
    async (input: { name: string; description?: string }) => {
      try {
        await createProject(input);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(t("projects:alerts.createFailed"));
      }
    },
    [createProject, t]
  );

  const handleOpenProject = useCallback(async (project: any) => {
    try {
      await openProject(project.id);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(t("projects:alerts.openFailed"));
    }
  }, [openProject, t]);

  const handleRenameProject = useCallback(async (projectId: string, name: string, description?: string) => {
    try {
      await updateProject(projectId, name, description);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(t("projects:alerts.renameFailed"));
      throw err;
    }
  }, [updateProject, t]);

  const handleDeleteProject = useCallback(async (project: any) => {
    try {
      await deleteProject(project.id);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(t("projects:alerts.deleteFailed"));
      throw err;
    }
  }, [deleteProject, t]);

  const handleNavigate = useCallback((newView: string) => {
    if (newView === 'dashboard') {
      exitWorkspace();
    } else if (newView === 'workspace') {
      if (selectedId) {
        openProject(selectedId);
      }
    }
    // Handle other views if added
  }, [exitWorkspace, openProject, selectedId]);

  // Render Content based on View
  const renderContent = () => {
    if (view === 'workspace') {
      return (
        <WorkspaceIntegrationView 
          project={selectedProject} 
          onExit={exitWorkspace} 
        />
      );
    }

    return (
      <Dashboard
        projects={projects}
        selectedId={selectedId}
        loading={loading}
        isCreating={isCreating}
        error={error}
        onSelectProject={selectProject}
        onCreateProject={handleCreate}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        onOpenProject={handleOpenProject}
      />
    );
  };

  return (
    <MainLayout activeView={view} onNavigate={handleNavigate}>
      {renderContent()}
    </MainLayout>
  );
};

const App = () => (
  <Suspense fallback={<div className="flex-center" style={{ height: '100vh' }}>Loading...</div>}>
    <AppContent />
  </Suspense>
);

export default App;
