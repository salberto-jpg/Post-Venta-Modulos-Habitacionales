import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Tickets from './components/Tickets';
import Clients from './components/Clients';
import Documents from './components/Documents';
import Maintenance from './components/Maintenance';
import ModuleCatalog from './components/ModuleCatalog';
import Login from './components/Login';
import Spinner from './components/Spinner';
import { supabase } from './services/supabaseClient';
import { getCurrentUserProfile, signOut } from './services/supabaseService';
import { type View, type UserProfile } from './types';
import { logoutFromGoogle } from './services/googleCalendarService';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [session, setSession] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check active session on load
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile();
            else setLoading(false);
        });

        // 2. Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchProfile();
            else {
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async () => {
        try {
            const profile = await getCurrentUserProfile();
            setUserProfile(profile);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        // Desconectar Google Calendar para seguridad (opcional, pero recomendado)
        logoutFromGoogle();
        await signOut();
        setLoading(false);
    };

    const renderView = () => {
        switch (currentView) {
            case 'dashboard': return <Dashboard />;
            case 'catalog': return <ModuleCatalog />;
            case 'tickets': return <Tickets />;
            case 'clients': return <Clients />;
            case 'documents': return <Documents />;
            case 'maintenance': return <Maintenance />;
            default: return <Dashboard />;
        }
    };

    if (loading) return <div className="h-screen flex justify-center items-center bg-slate-100"><Spinner /></div>;

    if (!session) {
        return <Login onLoginSuccess={() => {}} />;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-100 font-sans">
            <Sidebar 
                currentView={currentView} 
                setCurrentView={setCurrentView} 
                userProfile={userProfile}
                onLogout={handleLogout}
            />
            <main className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-x-hidden overflow-y-auto">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
                        {renderView()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;