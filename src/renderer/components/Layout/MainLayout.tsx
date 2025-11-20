import React from 'react';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, activeView, onNavigate }) => {
  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <main className="app-main">
        {/* Top Bar / Toolbar can go here if needed */}
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
};
