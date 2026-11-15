import React, { useState } from 'react';
import { LangProvider } from './context/LangContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Debtors from './pages/Debtors';
import Returns from './pages/Returns';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function AppContent() {
  const { user, isAdmin } = useAuth();
  const [activePage, setActivePage] = useState('pos');

  if (!user || !user.loggedIn) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'inventory': return <Inventory />;
      case 'pos': return <POS />;
      case 'debtors': return <Debtors />;
      case 'returns': return <Returns />;
      case 'reports': return isAdmin ? <Reports /> : <POS />;
      case 'settings': return <Settings />;
      default: return <POS />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Left Sidebar on Desktop */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* Right Column: Header + Scrollable Page Content */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Sticky/Static Top Header Bar */}
        <Header />

        {/* Scrollable Main Area for ALL Pages */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 md:pb-8 min-w-0">
          <div className="max-w-7xl w-full mx-auto min-w-0">
            {renderPage()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <BottomNav activePage={activePage} onNavigate={setActivePage} />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </LangProvider>
  );
}
