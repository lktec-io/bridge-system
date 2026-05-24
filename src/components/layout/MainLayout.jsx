import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ErrorBoundary from '../ui/ErrorBoundary';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navProgress, setNavProgress] = useState(false);
  const location = useLocation();

  const closeSidebar  = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  useEffect(() => {
    setNavProgress(true);
    const t = setTimeout(() => setNavProgress(false), 550);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      <div className={`page-top-bar${navProgress ? ' active' : ''}`} />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      <div className="main-content">
        <Navbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="page-content" key={location.pathname}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
