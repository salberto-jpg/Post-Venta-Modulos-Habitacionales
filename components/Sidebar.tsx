import React, { useState } from 'react';
import { type View } from '../types';

interface SidebarProps {
    currentView: View;
    setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
    viewName: View;
    icon: React.ReactElement<{ className?: string }>;
    label: string;
    currentView: View;
    onClick: (view: View) => void;
    mobile?: boolean;
}> = ({ viewName, icon, label, currentView, onClick, mobile }) => {
    const isActive = currentView === viewName;
    const baseClasses = mobile ? 'flex items-center px-4 py-3 text-lg font-medium w-full transition-colors duration-200 border-l-4' : 'flex items-center px-4 py-3 text-base font-bold rounded-md transition-colors duration-200 whitespace-nowrap';
    const activeClasses = mobile ? 'bg-slate-50 text-sky-700 border-sky-600' : 'bg-slate-800 text-white shadow-sm';
    const inactiveClasses = mobile ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900';

    return (
        <button onClick={() => onClick(viewName)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            {React.cloneElement(icon, { className: mobile ? 'h-7 w-7 mr-3' : 'h-6 w-6 mr-2' })}
            <span>{label}</span>
        </button>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const handleMobileNavClick = (view: View) => { setCurrentView(view); setIsMobileMenuOpen(false); };

    return (
        <div className="w-full bg-white border-b border-slate-200 shadow-sm z-30 flex-shrink-0 sticky top-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-28"> {/* Increased height from h-20 to h-28 */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center mr-8">
                            {/* Increased logo size even more: h-20 on mobile, h-24 on desktop */}
                            <img src="https://metallo.com.ar/wp-content/uploads/2024/09/LOGO-GREEN-BOX_Mesa-de-trabajo-1.png" alt="Green Box Logo" className="h-20 md:h-24 w-auto object-contain" />
                        </div>
                        <div className="hidden md:flex md:space-x-4 overflow-x-auto no-scrollbar items-center h-full">
                            <NavItem viewName="dashboard" label="Dashboard" icon={<HomeIcon />} currentView={currentView} onClick={setCurrentView} />
                            <NavItem viewName="catalog" label="Catálogo" icon={<CubeIcon />} currentView={currentView} onClick={setCurrentView} />
                            <NavItem viewName="tickets" label="Tickets" icon={<TicketIcon />} currentView={currentView} onClick={setCurrentView} />
                            <NavItem viewName="maintenance" label="Agenda" icon={<CalendarIcon />} currentView={currentView} onClick={setCurrentView} />
                            <NavItem viewName="clients" label="Clientes" icon={<UsersIcon />} currentView={currentView} onClick={setCurrentView} />
                            <NavItem viewName="documents" label="Docs" icon={<DocumentTextIcon />} currentView={currentView} onClick={setCurrentView} />
                        </div>
                    </div>
                    <div className="flex items-center md:hidden">
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-3 rounded-md text-slate-400 hover:bg-slate-100">
                            {isMobileMenuOpen ? <XIcon className="h-10 w-10" /> : <MenuIcon className="h-10 w-10" />}
                        </button>
                    </div>
                </div>
            </div>
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-slate-200 absolute w-full shadow-xl">
                    <div className="pt-2 pb-3 space-y-1">
                        <NavItem mobile viewName="dashboard" label="Dashboard" icon={<HomeIcon />} currentView={currentView} onClick={handleMobileNavClick} />
                        <NavItem mobile viewName="catalog" label="Catálogo" icon={<CubeIcon />} currentView={currentView} onClick={handleMobileNavClick} />
                        <NavItem mobile viewName="tickets" label="Tickets" icon={<TicketIcon />} currentView={currentView} onClick={handleMobileNavClick} />
                        <NavItem mobile viewName="maintenance" label="Agenda" icon={<CalendarIcon />} currentView={currentView} onClick={handleMobileNavClick} />
                        <NavItem mobile viewName="clients" label="Clientes" icon={<UsersIcon />} currentView={currentView} onClick={handleMobileNavClick} />
                        <NavItem mobile viewName="documents" label="Docs" icon={<DocumentTextIcon />} currentView={currentView} onClick={handleMobileNavClick} />
                    </div>
                </div>
            )}
        </div>
    );
};

const HomeIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg>;
const CubeIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>;
const TicketIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h5.25m-5.25 0h5.25M3 4.5h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 013 4.5z" /></svg>;
const UsersIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663M12 3.375c-3.418 0-6.167 2.749-6.167 6.167s2.749 6.167 6.167 6.167 6.167-2.749 6.167-6.167S15.418 3.375 12 3.375z" /></svg>;
const DocumentTextIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const CalendarIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>;
const MenuIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
const XIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
export default Sidebar;