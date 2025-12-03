
import React from 'react';
import { type View } from '../types';

interface SidebarProps {
    currentView: View;
    setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
    viewName: View;
    // FIX: Changed icon type to allow passing className via cloneElement.
    icon: React.ReactElement<{ className?: string }>;
    label: string;
    currentView: View;
    onClick: (view: View) => void;
}> = ({ viewName, icon, label, currentView, onClick }) => {
    const isActive = currentView === viewName;
    const baseClasses = 'flex items-center px-6 py-4 w-full text-left transition-colors duration-200 rounded-lg';
    const activeClasses = 'bg-sky-600 text-white';
    const inactiveClasses = 'text-slate-400 hover:bg-slate-700 hover:text-white';

    return (
        <button
            onClick={() => onClick(viewName)}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            {React.cloneElement(icon, { className: 'h-6 w-6 mr-4' })}
            <span className="mx-2 text-lg font-normal">{label}</span>
        </button>
    );
};


const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
    return (
        <div className="flex flex-col w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white h-screen">
            <div className="flex items-center justify-center h-24 bg-slate-100 border-b border-slate-300 p-4">
                <img 
                    src="https://metallo.com.ar/wp-content/uploads/2024/09/LOGO-GREEN-BOX_Mesa-de-trabajo-1.png" 
                    alt="Módulos Pro Logo" 
                    className="max-h-full max-w-full object-contain"
                />
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2">
                <NavItem
                    viewName="dashboard"
                    label="Dashboard"
                    icon={<HomeIcon />}
                    currentView={currentView}
                    onClick={setCurrentView}
                />
                <NavItem
                    viewName="catalog"
                    label="Catálogo Módulos"
                    icon={<CubeIcon />}
                    currentView={currentView}
                    onClick={setCurrentView}
                />
                <NavItem
                    viewName="tickets"
                    label="Tickets"
                    icon={<TicketIcon />}
                    currentView={currentView}
                    onClick={setCurrentView}
                />
                 <NavItem
                    viewName="maintenance"
                    label="Mantenimiento"
                    icon={<WrenchScrewdriverIcon />}
                    currentView={currentView}
                    onClick={setCurrentView}
                />
                <NavItem
                    viewName="clients"
                    label="Clientes"
                    icon={<UsersIcon />}
                    currentView={currentView}
                    onClick={setCurrentView}
                />
                <NavItem
                    viewName="documents"
                    label="Documentos"
                    icon={<DocumentTextIcon />}
                    currentView={currentView}
                    onClick={setCurrentView}
                />
            </nav>
        </div>
    );
};

// SVG Icons as separate components for clarity
const HomeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
    </svg>
);

const CubeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
);

const TicketIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h5.25m-5.25 0h5.25m-5.25 0h5.25M3 4.5h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 013 4.5z" />
    </svg>
);

const UsersIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663M12 3.375c-3.418 0-6.167 2.749-6.167 6.167s2.749 6.167 6.167 6.167 6.167-2.749 6.167-6.167S15.418 3.375 12 3.375z" />
    </svg>
);

const DocumentTextIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

const WrenchScrewdriverIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.83-5.83M11.42 15.17l.354-.354a3.75 3.75 0 0 0-5.303-5.303l-.354.354M3 21l3.75-3.75M17.25 3l-3.75 3.75" />
    </svg>
);


export default Sidebar;
