import React, { useState, useEffect } from 'react';
import { getAllClientsSummary } from '../services/supabaseService';
import { type Client } from '../types';
import Spinner from './Spinner';
import AddClientModal from './AddClientModal';
import ClientDetails from './ClientDetails';

interface ClientSummary extends Client { moduleCount: number; activeTickets: number; }

const Clients: React.FC = () => {
    const [clients, setClients] = useState<ClientSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const fetchClients = async () => { setLoading(true); setClients(await getAllClientsSummary()); setLoading(false); };
    useEffect(() => { fetchClients(); }, []);

    if (selectedClient) return <ClientDetails client={selectedClient} onBack={() => { setSelectedClient(null); fetchClients(); }} />;
    if (loading) return <div className="flex justify-center h-full items-center"><Spinner /></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-4xl md:text-7xl font-black text-slate-800 tracking-tight">Clientes</h2>
                <button onClick={() => setIsModalOpen(true)} className="bg-sky-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-sky-700 transition-colors self-end md:self-auto">Alta de Cliente</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {clients.map(client => (
                    <div key={client.id} onClick={() => setSelectedClient(client)} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 cursor-pointer hover:shadow-xl transition-all">
                        <div className="flex justify-between mb-6"><div className="bg-slate-50 p-4 rounded-full"><UserIcon className="h-8 w-8 text-slate-400" /></div>{client.activeTickets > 0 && <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold text-sm">{client.activeTickets} Tickets</span>}</div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">{client.name}</h3><p className="text-slate-500">{client.email}</p>
                        <div className="border-t mt-6 pt-6 grid grid-cols-2 gap-4"><div><p className="text-xs font-bold text-slate-400 uppercase">Módulos</p><p className="text-4xl font-extrabold text-slate-700">{client.moduleCount}</p></div><div><p className="text-xs font-bold text-slate-400 uppercase">Teléfono</p><p className="text-lg font-bold text-slate-600 truncate">{client.phone}</p></div></div>
                    </div>
                ))}
            </div>
            {isModalOpen && <AddClientModal onClose={() => setIsModalOpen(false)} onClientAdded={() => { setIsModalOpen(false); fetchClients(); }} />}
        </div>
    );
};
const UserIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
export default Clients;