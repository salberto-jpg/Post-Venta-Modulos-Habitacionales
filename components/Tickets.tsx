import React, { useState, useEffect, useMemo } from 'react';
import { getAllTickets } from '../services/supabaseService';
import { type Ticket, TicketStatus, Priority } from '../types';
import Spinner from './Spinner';
import TicketDetailsModal from './TicketDetailsModal';
import AddTicketModal from './AddTicketModal';

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

const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
        case Priority.High:
            return 'text-red-600 bg-red-50';
        case Priority.Medium:
            return 'text-amber-600 bg-amber-50';
        case Priority.Low:
            return 'text-sky-600 bg-sky-50';
        default:
            return 'text-slate-600';
    }
};

const PriorityIcon: React.FC<{ priority: Priority }> = ({ priority }) => (
    <div className={`flex items-center px-2 py-1 rounded-md ${getPriorityBadge(priority)}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-xs font-bold uppercase">{priority}</span>
    </div>
);


const Tickets: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [filter, setFilter] = useState<TicketStatus | 'all'>('all');

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const ticketsData = await getAllTickets();
            setTickets(ticketsData);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const filteredTickets = useMemo(() => {
        if (filter === 'all') {
            return tickets;
        }
        return tickets.filter(ticket => ticket.status === filter);
    }, [tickets, filter]);
    
    const handleTicketStatusChange = (ticketId: string, newStatus: TicketStatus) => {
        setTickets(prevTickets =>
            prevTickets.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
         if (selectedTicket && selectedTicket.id === ticketId) {
            setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
    };

    const handleTicketAdded = () => {
        fetchTickets();
    };


    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <h2 className="text-4xl md:text-7xl font-black text-slate-800 tracking-tight">Tickets</h2>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                     <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        {(['all', ...Object.values(TicketStatus)] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                                    filter === status
                                        ? 'bg-slate-800 text-white shadow-lg'
                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                            >
                                {status === 'all' ? 'Todos' : status}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex justify-center items-center bg-sky-600 text-white px-5 py-3 rounded-xl shadow-lg hover:bg-sky-700 transition-colors font-bold"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Crear Ticket
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTickets.map(ticket => (
                    <div 
                        key={ticket.id} 
                        onClick={() => setSelectedTicket(ticket)}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-sky-300 transition-all cursor-pointer flex flex-col group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase tracking-wide ${getStatusBadge(ticket.status)}`}>
                                {ticket.status}
                            </span>
                            <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded">
                                {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-sky-700 transition-colors line-clamp-2">{ticket.title}</h3>
                        
                        <div className="flex-grow space-y-3 mb-6">
                            <div className="flex items-start">
                                <span className="text-slate-400 text-xs uppercase font-bold w-16 pt-0.5">Cliente</span>
                                <span className="text-slate-600 text-sm font-medium">{ticket.clientName}</span>
                            </div>
                            <div className="flex items-start">
                                <span className="text-slate-400 text-xs uppercase font-bold w-16 pt-0.5">Módulo</span>
                                <span className="text-slate-600 text-sm font-medium">{ticket.moduleSerial}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                            <PriorityIcon priority={ticket.priority} />
                            <span className="text-sky-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalle →</span>
                        </div>
                    </div>
                ))}
            </div>

            {selectedTicket && (
                <TicketDetailsModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onStatusChange={handleTicketStatusChange}
                />
            )}
            {isAddModalOpen && (
                <AddTicketModal
                    onClose={() => setIsAddModalOpen(false)}
                    onTicketAdded={handleTicketAdded}
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


export default Tickets;