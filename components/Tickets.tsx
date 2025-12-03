
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
            return 'text-red-600';
        case Priority.Medium:
            return 'text-amber-600';
        case Priority.Low:
            return 'text-sky-600';
        default:
            return 'text-slate-600';
    }
};

const PriorityIcon: React.FC<{ priority: Priority }> = ({ priority }) => (
    <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-1 ${getPriorityBadge(priority)}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-sm">{priority}</span>
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
        // Re-fetch all tickets to get the latest list
        fetchTickets();
    };


    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800">Tickets de Soporte</h2>
                <div className="flex items-center space-x-4">
                     <div className="flex space-x-2">
                        {(['all', ...Object.values(TicketStatus)] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    filter === status
                                        ? 'bg-sky-600 text-white shadow-sm'
                                        : 'bg-white text-slate-700 hover:bg-slate-50 border'
                                }`}
                            >
                                {status === 'all' ? 'Todos' : status}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center bg-sky-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-sky-700 transition-colors"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Crear Nuevo Ticket
                    </button>
                </div>
            </div>

            <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-md border border-slate-300">
                <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-transparent">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ticket</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Módulo</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prioridad</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-transparent divide-y divide-slate-200">
                            {filteredTickets.map(ticket => (
                                <tr key={ticket.id} className="hover:bg-slate-200/60 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{ticket.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{ticket.clientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{ticket.moduleSerial}</td>
                                     <td className="px-6 py-4 whitespace-nowrap"><PriorityIcon priority={ticket.priority} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(ticket.createdAt).toLocaleString()}</td>
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