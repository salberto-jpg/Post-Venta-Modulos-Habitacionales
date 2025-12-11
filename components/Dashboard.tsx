
import React, { useState, useEffect } from 'react';
import { getDashboardStats, getRecentTickets } from '../services/supabaseService';
import { type Ticket, TicketStatus } from '../types';
import Spinner from './Spinner';
import TicketDetailsModal from './TicketDetailsModal';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactElement<{ className?: string }>;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center border border-slate-100 hover:shadow-md transition-shadow">
        <div className={`p-4 rounded-xl mr-5 shadow-sm ${color}`}>
            {React.cloneElement(icon, { className: 'h-8 w-8 text-white' })}
        </div>
        <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-black text-slate-800 mt-1">{value}</p>
        </div>
    </div>
);

const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
        case TicketStatus.New:
            return 'bg-red-100 text-red-700 border-red-200';
        case TicketStatus.Scheduled:
            return 'bg-violet-100 text-violet-700 border-violet-200';
        case TicketStatus.Closed:
            return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
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
        setRecentTickets(prevTickets =>
            prevTickets.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
        if (selectedTicket && selectedTicket.id === ticketId) {
            setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
    };

    const handleTicketUpdated = (updatedTicket: Ticket) => {
        setRecentTickets(prevTickets =>
            prevTickets.map(t => (t.id === updatedTicket.id ? updatedTicket : t))
        );
        setSelectedTicket(updatedTicket);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <h2 className="text-4xl md:text-7xl font-black text-slate-800 mb-8 tracking-tight">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard title="Tickets Nuevos" value={stats.newTickets} icon={<TicketIcon />} color="bg-red-500" />
                <StatCard title="Agendados" value={stats.pendingMaintenance} icon={<WrenchScrewdriverIcon />} color="bg-violet-500" />
                <StatCard title="Total Clientes" value={stats.totalClients} icon={<UsersIcon />} color="bg-emerald-500" />
                <StatCard title="Módulos" value={stats.totalModules} icon={<HomeIcon />} color="bg-slate-500" />
            </div>

            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-slate-800">Actividad Reciente</h3>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Últimos 5 tickets</span>
                </div>
                
                <div className="flex flex-col gap-4">
                    {recentTickets.map(ticket => (
                        <div 
                            key={ticket.id} 
                            onClick={() => setSelectedTicket(ticket)}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-sky-200 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                        >
                            <div className="flex items-start gap-5">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    ticket.status === TicketStatus.New ? 'bg-red-100 text-red-600' :
                                    ticket.status === TicketStatus.Closed ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'
                                }`}>
                                     <TicketIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-slate-800 group-hover:text-sky-600 transition-colors">{ticket.title}</h4>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                        <p className="text-sm text-slate-500 flex items-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2"></span>
                                            {ticket.clientName}
                                        </p>
                                        <p className="text-sm text-slate-400 font-mono bg-slate-50 px-1.5 rounded border border-slate-100">
                                            {ticket.moduleSerial}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between md:flex-col md:items-end gap-2 md:gap-1 pl-16 md:pl-0">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-lg uppercase tracking-wide border ${getStatusBadge(ticket.status)}`}>
                                    {ticket.status}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {selectedTicket && (
                <TicketDetailsModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onStatusChange={handleTicketStatusChange}
                    onTicketUpdated={handleTicketUpdated}
                />
            )}
        </div>
    );
};


// Icons
const TicketIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h5.25m-5.25 0h5.25M3 4.5h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 013 4.5z" />
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
