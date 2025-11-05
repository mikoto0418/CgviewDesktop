import '@testing-library/jest-dom';

// Mock i18next for tests
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn(),
      language: 'zh-CN'
    }
  })
}));

// Mock window.electron API for tests
global.window = {
  ...global.window,
  electron: {
    invoke: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
};

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));
