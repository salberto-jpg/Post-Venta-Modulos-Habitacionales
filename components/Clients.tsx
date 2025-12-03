
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
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800">Cartera de Clientes</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center bg-sky-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-sky-700 transition-colors"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Alta de Cliente
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map(client => (
                    <div 
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-md hover:border-sky-300 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-slate-100 p-3 rounded-full group-hover:bg-sky-100 transition-colors">
                                <UserIcon className="h-6 w-6 text-slate-600 group-hover:text-sky-600" />
                            </div>
                            {client.activeTickets > 0 && (
                                <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
                                    {client.activeTickets} Tickets Activos
                                </span>
                            )}
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-800 mb-1">{client.name}</h3>
                        <p className="text-sm text-slate-500 mb-4">{client.email}</p>
                        
                        <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Módulos</p>
                                <p className="text-lg font-semibold text-slate-700">{client.moduleCount}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Teléfono</p>
                                <p className="text-sm font-medium text-slate-700 truncate">{client.phone}</p>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                            <span className="text-sm font-medium text-sky-600 group-hover:underline">Ver Legajo &rarr;</span>
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

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);

export default Clients;
