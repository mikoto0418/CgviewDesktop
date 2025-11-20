import React from 'react';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate }) => {
  const { t } = useTranslation('common');

  const menuItems = [
    { id: 'dashboard', icon: '🏠', label: t('nav.dashboard', '仪表盘') },
    { id: 'settings', icon: '⚙️', label: t('nav.settings', '设置') },
    { id: 'help', icon: '❓', label: t('nav.help', '帮助') },
  ];

  return (
    <aside className="app-sidebar glass-panel" style={{ borderRight: '1px solid var(--glass-border)' }}>
      <div className="sidebar-header" style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '36px', 
          height: '36px', 
          background: 'linear-gradient(135deg, #0071e3, #00c7be)', 
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(0,113,227,0.3)'
        }}>
          CG
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: '16px', letterSpacing: '-0.01em' }}>CGView</span>
          <span style={{ fontSize: '11px', color: 'var(--system-text-secondary)' }}>Desktop</span>
        </div>
      </div>

      <nav className="sidebar-nav" style={{ flex: 1, padding: '16px 12px' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={activeView === item.id ? 'active' : ''}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  border: 'none',
                  background: activeView === item.id ? 'var(--system-blue)' : 'transparent',
                  color: activeView === item.id ? 'white' : 'var(--system-text-primary)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: activeView === item.id ? 500 : 400,
                  transition: 'all 0.2s ease',
                  opacity: activeView === item.id ? 1 : 0.8
                }}
                onMouseEnter={(e) => {
                  if (activeView !== item.id) {
                    e.currentTarget.style.background = 'var(--system-background-tertiary)';
                    e.currentTarget.style.opacity = '1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeView !== item.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.opacity = '0.8';
                  }
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer" style={{ padding: '20px', borderTop: '1px solid var(--system-divider)' }}>
        <div style={{ fontSize: '11px', color: 'var(--system-text-tertiary)', textAlign: 'center' }}>
          v0.3.0
        </div>
      </div>
    </aside>
  );
};
