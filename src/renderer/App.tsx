import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProjectList } from "./components/ProjectList";
import { CreateProjectForm } from "./components/CreateProjectForm";
import { useProjectStore } from "./state/project-store";
import { ProjectDetailPanel } from "./components/ProjectDetailPanel";
import { DataImportWizard } from "./modules/import/DataImportWizard";
import { WorkspaceIntegrationView } from "./modules/workspace/WorkspaceIntegrationView";

const languages = [
  { code: "zh-CN", labelKey: "common:language.zhCN" },
  { code: "en-US", labelKey: "common:language.enUS" }
] as const;

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation("common");

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1>{t("app.name")}</h1>
        <LanguageSwitcher />
      </header>
      <main className="app-shell__content">{children}</main>
    </div>
  );
};

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation("common");

  return (
    <select
      value={i18n.language}
      onChange={(event) => {
        i18n.changeLanguage(event.target.value);
      }}
    >
      {languages.map((item) => (
        <option key={item.code} value={item.code}>
          {t(item.labelKey)}
        </option>
      ))}
    </select>
  );
};

const AppContent = () => {
  const { t } = useTranslation([
    "dashboard",
    "projects",
    "common",
    "import",
    "workspace"
  ]);
  const [error, setError] = useState<string | null>(null);
  const projects = useProjectStore((state) => state.projects);
  const selectedId = useProjectStore((state) => state.selectedId);
  const loading = useProjectStore((state) => state.loading);
  const isCreating = useProjectStore((state) => state.isCreating);
  const view = useProjectStore((state) => state.view);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const createProject = useProjectStore((state) => state.createProject);
  const selectProject = useProjectStore((state) => state.selectProject);
  const openProject = useProjectStore((state) => state.openProject);
  const exitWorkspace = useProjectStore((state) => state.exitWorkspace);

  const runtimeInfo = useMemo(() => {
    if (!window.appBridge) {
      return { version: "unknown", platform: "unknown" };
    }

    return {
      version: window.appBridge.version,
      platform: window.appBridge.platform
    };
  }, []);

  useEffect(() => {
    loadProjects().catch((err) => {
      console.error(err);
      setError(t("projects:alerts.loadFailed"));
    });
  }, [loadProjects, t]);

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

  const handleExitWorkspace = useCallback(() => {
    exitWorkspace();
    setError(null);
  }, [exitWorkspace]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId]
  );

  if (view === 'workspace') {
    return (
      <div className="app-shell__content app-shell__content--workspace">
        {error ? <div className="alert alert--error">{error}</div> : null}
        <WorkspaceIntegrationView project={selectedProject} onExit={handleExitWorkspace} />
      </div>
    );
  }

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <div>
          <h2>{t("dashboard:title")}</h2>
          <p>{t("dashboard:subtitle")}</p>
        </div>
        <div className="runtime-card">
          <p>
            {t("dashboard:runtime.version")}: {runtimeInfo.version}
          </p>
          <p>
            {t("dashboard:runtime.platform")}: {runtimeInfo.platform}
          </p>
        </div>
      </header>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <section className="dashboard__grid">
        <article className="card card--list">
          <header className="card__header">
            <h3>{t("projects:list.title")}</h3>
            {loading ? <span className="badge">{t("app.loading")}</span> : null}
          </header>
          <ProjectList
            projects={projects}
            selectedId={selectedId}
            onSelect={(project) => selectProject(project.id)}
          />
        </article>
        <div className="dashboard__stack">
          <article className="card">
            <ProjectDetailPanel
              project={selectedProject}
              onOpen={async (project) => {
                try {
                  await openProject(project.id);
                  setError(null);
                } catch (err) {
                  console.error(err);
                  setError(t("projects:alerts.openFailed"));
                }
              }}
            />
          </article>
          {selectedProject ? (
            <article className="card">
              <DataImportWizard projectId={selectedProject.id} />
            </article>
          ) : null}
          <article className="card">
            <CreateProjectForm onSubmit={handleCreate} isSubmitting={isCreating} />
          </article>
        </div>
      </section>

      <div className="placeholder">
        <h3>{t("dashboard:nextSteps.title")}</h3>
        <ul>
          <li>{t("dashboard:nextSteps.importData")}</li>
          <li>{t("dashboard:nextSteps.configureLayers")}</li>
          <li>{t("dashboard:nextSteps.prepareRendering")}</li>
        </ul>
      </div>
    </section>
  );
};

const App = () => (
  <Suspense fallback={<span>Loading...</span>}>
    <AppShell>
      <AppContent />
    </AppShell>
  </Suspense>
);

export default App;
