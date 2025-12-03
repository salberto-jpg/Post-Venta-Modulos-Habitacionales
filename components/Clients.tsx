import React, { useState, useEffect } from 'react';
import { getAllClientsSummary } from '../services/supabaseService';
import { type Client } from '../types';
import Spinner from './Spinner';
import AddClientModal from './AddClientModal';
import ClientDetails from './ClientDetails';

interface ClientSummary extends Client {
    moduleCount: number;
    activeTickets: number;
}

const Clients: React.FC = () => {
    const [clients, setClients] = useState<ClientSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const data = await getAllClientsSummary();
            setClients(data);
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    if (selectedClient) {
        return <ClientDetails client={selectedClient} onBack={() => { setSelectedClient(null); fetchClients(); }} />;
    }

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Cartera de Clientes</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center bg-sky-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-sky-700 transition-colors font-semibold"
                >
                    <PlusIcon className="h-6 w-6 mr-2" />
                    Alta de Cliente
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {clients.map(client => (
                    <div 
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-sky-300 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-slate-50 p-4 rounded-full group-hover:bg-sky-100 transition-colors">
                                <UserIcon className="h-8 w-8 text-slate-400 group-hover:text-sky-600" />
                            </div>
                            {client.activeTickets > 0 && (
                                <span className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full border border-amber-200 shadow-sm">
                                    {client.activeTickets} Tickets Activos
                                </span>
                            )}
                        </div>
                        
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-slate-800 mb-1 leading-tight">{client.name}</h3>
                            <p className="text-slate-500 text-base">{client.email}</p>
                        </div>
                        
                        <div className="border-t border-slate-100 pt-6 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Módulos</p>
                                <p className="text-4xl font-extrabold text-slate-700 group-hover:text-sky-600 transition-colors">{client.moduleCount}</p>
                            </div>
                            <div className="flex flex-col justify-end">
                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Teléfono</p>
                                <p className="text-lg font-bold text-slate-600 truncate">{client.phone}</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 text-right">
                            <span className="text-base font-semibold text-sky-600 group-hover:underline flex items-center justify-end">
                                Ver Legajo <ArrowRightIcon className="h-5 w-5 ml-1" />
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <AddClientModal
                    onClose={() => setIsModalOpen(false)}
                    onClientAdded={() => { setIsModalOpen(false); fetchClients(); }}
                />
            )}
        </div>
    );
};

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const UserIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
const ArrowRightIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;

export default Clients;
