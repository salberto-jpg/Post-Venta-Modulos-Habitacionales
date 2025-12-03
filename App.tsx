
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Tickets from './components/Tickets';
import Clients from './components/Clients';
import Documents from './components/Documents';
import Maintenance from './components/Maintenance';
import ModuleCatalog from './components/ModuleCatalog';
import { type View } from './types';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard />;
            case 'catalog':
                return <ModuleCatalog />;
            case 'tickets':
                return <Tickets />;
            case 'clients':
                return <Clients />;
            case 'documents':
                return <Documents />;
            case 'maintenance':
                return <Maintenance />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-200 font-sans">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-200">
                    <div className="container mx-auto px-6 py-8">
                        {renderView()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;