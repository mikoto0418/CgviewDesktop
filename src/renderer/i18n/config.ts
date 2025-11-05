import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCommon from './locales/zh-CN/common.json';
import zhDashboard from './locales/zh-CN/dashboard.json';
import zhProjects from './locales/zh-CN/projects.json';
import zhImport from './locales/zh-CN/import.json';
import zhWorkspace from './locales/zh-CN/workspace.json';
import enCommon from './locales/en-US/common.json';
import enDashboard from './locales/en-US/dashboard.json';
import enProjects from './locales/en-US/projects.json';
import enImport from './locales/en-US/import.json';
import enWorkspace from './locales/en-US/workspace.json';

const STORAGE_KEY = 'cgview.language';

const resources = {
  'zh-CN': {
    common: zhCommon,
    dashboard: zhDashboard,
    projects: zhProjects,
    import: zhImport,
    workspace: zhWorkspace
  },
  'en-US': {
    common: enCommon,
    dashboard: enDashboard,
    projects: enProjects,
    import: enImport,
    workspace: enWorkspace
  }
} as const;

const detectLanguage = () => {
  if (typeof window === 'undefined') {
    return 'zh-CN';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && resources[stored as keyof typeof resources]) {
    return stored;
  }

  const navigatorLanguages = window.navigator.languages ?? [];
  if (navigatorLanguages.some((lang) => lang.startsWith('zh'))) {
    return 'zh-CN';
  }

  return 'en-US';
};

const initialLanguage = detectLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'zh-CN',
    ns: ['common', 'dashboard', 'projects', 'import', 'workspace'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    }
  })
  .then(() => {
    i18n.on('languageChanged', (lng) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, lng);
      }
    });
  });

export default i18n;
