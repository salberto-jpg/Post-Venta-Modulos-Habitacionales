
import React, { useState, useEffect, useMemo } from 'react';
import { getAllTickets } from '../services/supabaseService';
import { type Ticket, TicketStatus, Priority } from '../types';
import Spinner from './Spinner';
import TicketDetailsModal from './TicketDetailsModal';
import AddTicketModal from './AddTicketModal';

// Helper para colores según estado
const getStatusConfig = (status: TicketStatus) => {
    switch (status) {
        case TicketStatus.New:
            return { color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
        case TicketStatus.Scheduled:
            return { color: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' };
        case TicketStatus.Closed:
            return { color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
        default:
            return { color: 'bg-slate-500', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
    }
};

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
    
    const handleTicketUpdated = (updatedTicket: Ticket) => {
        setTickets(prevTickets =>
            prevTickets.map(t => (t.id === updatedTicket.id ? updatedTicket : t))
        );
        setSelectedTicket(updatedTicket);
    };

    const handleTicketAdded = () => {
        fetchTickets();
    };

    // Filter out nothing, show all valid statuses
    const activeStatuses = Object.values(TicketStatus);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <h2 className="text-4xl md:text-7xl font-black text-slate-800 tracking-tight">Tickets</h2>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                     <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap border ${
                                filter === 'all'
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
                            }`}
                        >
                            Todos
                        </button>
                        {activeStatuses.map(status => {
                             const isActive = filter === status;
                             const statusStyle = getStatusConfig(status);
                             
                             return (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap border ${
                                        isActive
                                            ? `${statusStyle.bg} ${statusStyle.text} border-${statusStyle.text} ring-2 ring-offset-1 ring-${statusStyle.text.split('-')[1]}-200`
                                            : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
                                    }`}
                                >
                                    {status}
                                </button>
                             )
                        })}
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
                {filteredTickets.map(ticket => {
                    const statusConfig = getStatusConfig(ticket.status);

                    return (
                        <div 
                            key={ticket.id} 
                            onClick={() => setSelectedTicket(ticket)}
                            className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-slate-100 cursor-pointer"
                        >
                            {/* Barra lateral de color de estado */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusConfig.color}`}></div>

                            <div className="p-6 pl-8">
                                {/* Header: Estado y Fecha */}
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                                        {ticket.status}
                                    </span>
                                    <span className="text-xs font-medium text-slate-400">
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                {/* Título */}
                                <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight group-hover:text-sky-600 transition-colors">
                                    {ticket.title}
                                </h3>

                                {/* Bloque de Info Cliente/Módulo */}
                                <div className="bg-slate-50 rounded-lg p-3 my-4 border border-slate-100 space-y-2">
                                    <div className="flex items-center">
                                        <UserIcon className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
                                        <span className="text-sm font-semibold text-slate-700 truncate" title={ticket.clientName}>
                                            {ticket.clientName}
                                        </span>
                                    </div>
                                    <div className="flex items-center border-t border-slate-200 pt-2">
                                        <CubeIcon className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
                                        <span className="text-xs font-medium text-slate-600 font-mono truncate" title={ticket.moduleSerial}>
                                            {ticket.moduleSerial}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Footer: Parte Afectada y Fotos */}
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 border border-slate-200">
                                        <span className="text-xs">🔧</span>
                                        <span className="text-xs font-bold text-slate-600 uppercase">
                                            {ticket.affectedPart || 'General'}
                                        </span>
                                    </div>

                                    {ticket.photos && ticket.photos.length > 0 && (
                                        <div className="flex -space-x-2">
                                            {ticket.photos.slice(0, 3).map((photo, i) => (
                                                <img 
                                                    key={i} 
                                                    src={photo} 
                                                    alt="thumb" 
                                                    className="w-6 h-6 rounded-full border-2 border-white object-cover"
                                                />
                                            ))}
                                            {ticket.photos.length > 3 && (
                                                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                    +{ticket.photos.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedTicket && (
                <TicketDetailsModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onTicketUpdated={handleTicketUpdated}
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
const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);
const CubeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
);

export default Tickets;
