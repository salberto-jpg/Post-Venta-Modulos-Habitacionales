import React, { useState, useEffect } from 'react';
import { getDashboardStats, getRecentTickets } from '../services/supabaseService';
import { type Ticket, TicketStatus } from '../types';
import Spinner from './Spinner';
import TicketDetailsModal from './TicketDetailsModal';

interface StatCardProps {
    title: string;
    value: string | number;
    // FIX: Changed icon type to allow passing className via cloneElement.
    icon: React.ReactElement<{ className?: string }>;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
    <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-md p-6 flex items-center border border-slate-300">
        <div className={`p-3 rounded-full mr-4 ${color}`}>
            {React.cloneElement(icon, { className: 'h-8 w-8 text-white' })}
        </div>
        <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
        case TicketStatus.New:
            return 'bg-sky-100 text-sky-800';
        case TicketStatus.InProgress:
            return 'bg-amber-100 text-amber-800';
        case TicketStatus.Scheduled:
            return 'bg-violet-100 text-violet-800';
        case TicketStatus.Closed:
            return 'bg-emerald-100 text-emerald-800';
        default:
            return 'bg-slate-100 text-slate-800';
    }
};

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState({ newTickets: 0, pendingMaintenance: 0, totalClients: 0, totalModules: 0 });
    const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [statsData, ticketsData] = await Promise.all([
                    getDashboardStats(),
                    getRecentTickets()
                ]);
                setStats(statsData);
                setRecentTickets(ticketsData);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const handleTicketStatusChange = (ticketId: string, newStatus: TicketStatus) => {
        // Optimistically update UI
        setRecentTickets(prevTickets =>
            prevTickets.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
        if (selectedTicket && selectedTicket.id === ticketId) {
            setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Tickets Nuevos" value={stats.newTickets} icon={<TicketIcon />} color="bg-gradient-to-br from-sky-500 to-sky-600" />
                <StatCard title="Tickets por Agendar" value={stats.pendingMaintenance} icon={<WrenchScrewdriverIcon />} color="bg-gradient-to-br from-amber-500 to-amber-600" />
                <StatCard title="Total de Clientes" value={stats.totalClients} icon={<UsersIcon />} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
                <StatCard title="Módulos Instalados" value={stats.totalModules} icon={<HomeIcon />} color="bg-gradient-to-br from-slate-500 to-slate-600" />
            </div>

            <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-md p-6 border border-slate-300">
                <h3 className="text-xl font-semibold text-slate-700 mb-4">Tickets Recientes</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-transparent">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ticket</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-transparent">
                            {recentTickets.map(ticket => (
                                <tr key={ticket.id} className="hover:bg-slate-200/60 cursor-pointer border-t border-slate-200" onClick={() => setSelectedTicket(ticket)}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{ticket.title}</div>
                                        <div className="text-sm text-slate-500">Módulo: {ticket.moduleSerial}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{ticket.clientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedTicket && (
                <TicketDetailsModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onStatusChange={handleTicketStatusChange}
                />
            )}
        </div>
    );
};


// Icons
const TicketIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h5.25m-5.25 0h5.25m-5.25 0h5.25M3 4.5h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 013 4.5z" />
    </svg>
);
const WrenchScrewdriverIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.83-5.83M11.42 15.17l.354-.354a3.75 3.75 0 0 0-5.303-5.303l-.354.354M3 21l3.75-3.75M17.25 3l-3.75 3.75" />
    </svg>
);
const UsersIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663M12 3.375c-3.418 0-6.167 2.749-6.167 6.167s2.749 6.167 6.167 6.167 6.167-2.749 6.167-6.167S15.418 3.375 12 3.375z" />
    </svg>
);
const HomeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
    </svg>
);


export default Dashboard;