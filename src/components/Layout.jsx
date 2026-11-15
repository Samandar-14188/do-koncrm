import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout({ activePage, onNavigate, children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Left Sidebar on Desktop */}
      <Sidebar activePage={activePage} onNavigate={onNavigate} />

      {/* Right Column: Header + Scrollable Page Content */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Static Top Header Bar (never overlaps or clips content) */}
        <Header />

        {/* Scrollable Main Area for ALL Pages */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 md:pb-8 min-w-0">
          <div className="max-w-7xl w-full mx-auto min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <BottomNav activePage={activePage} onNavigate={onNavigate} />
    </div>
  );
}
