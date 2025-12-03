
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllTickets, updateTicketStatus } from '../services/supabaseService';
import { type Ticket, TicketStatus, Priority } from '../types';
import Spinner from './Spinner';
import ScheduleTicketModal from './ScheduleTicketModal';
import RoutePlannerModal from './RoutePlannerModal';

// --- Third-party calendar components ---
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es'; // Spanish locale for moment

// Setup for the calendar component
moment.locale('es');
const localizer = momentLocalizer(moment);

// --- Type for calendar events ---
interface CalendarEvent {
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource?: {
        source: 'app' | 'google';
        id: string;
    };
}

// --- Mock Data for Prototype ---
const getMockGcalEvents = (): CalendarEvent[] => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    return [
        { title: 'Reunión de equipo (Ejemplo)', start: new Date(today.setHours(10, 0, 0, 0)), end: new Date(today.setHours(11, 0, 0, 0)), allDay: false, resource: { source: 'google', id: 'gcal_1' } },
        { title: 'Almuerzo con proveedor (Ejemplo)', start: new Date(today.setHours(13, 0, 0, 0)), end: new Date(today.setHours(14, 0, 0, 0)), allDay: false, resource: { source: 'google', id: 'gcal_2' } },
        { title: 'Entrega de materiales (Ejemplo)', start: tomorrow, end: tomorrow, allDay: true, resource: { source: 'google', id: 'gcal_3' } },
        { title: 'Llamada de seguimiento (Ejemplo)', start: new Date(yesterday.setHours(15, 0, 0, 0)), end: new Date(yesterday.setHours(15, 30, 0, 0)), allDay: false, resource: { source: 'google', id: 'gcal_4' } },
    ];
};


const getPriorityBadgeStyle = (priority: Priority) => {
    switch (priority) {
        case Priority.High: return 'border-red-500';
        case Priority.Medium: return 'border-amber-500';
        case Priority.Low: return 'border-sky-500';
        default: return 'border-slate-500';
    }
};

type ViewFilter = 'pending' | 'scheduled' | 'closed';

const Maintenance: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewFilter, setViewFilter] = useState<ViewFilter>('pending');
    const [schedulingTicket, setSchedulingTicket] = useState<Ticket | null>(null);
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [routeTickets, setRouteTickets] = useState<Ticket[]>([]);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllTickets();
            setTickets(data);
        } catch (error) {
            console.error("Error fetching tickets for maintenance:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const filteredTickets = useMemo(() => {
        switch (viewFilter) {
            case 'pending':
                return tickets.filter(t => t.status === TicketStatus.New || t.status === TicketStatus.InProgress);
            case 'scheduled':
                // For the list view, "scheduled" means only scheduled, not closed.
                return tickets.filter(t => t.status === TicketStatus.Scheduled);
            case 'closed':
                return tickets.filter(t => t.status === TicketStatus.Closed);
            default:
                return [];
        }
    }, [tickets, viewFilter]);

    // --- Event Handlers ---
    const handleTicketScheduled = async () => {
        // In prototype mode, we just refetch the tickets to update the calendar.
        await fetchTickets();
    };

    const handleTicketComplete = async (ticketId: string) => {
        // Optimistic UI update for immediate feedback
        const updateStatus = (ticketList: Ticket[]) => 
            ticketList.map(t => t.id === ticketId ? { ...t, status: TicketStatus.Closed } : t);
        
        setTickets(updateStatus);
        setRouteTickets(updateStatus);

        try {
            await updateTicketStatus(ticketId, TicketStatus.Closed);
        } catch (error) {
            console.error("Failed to update ticket status:", error);
            // On error, refetch to revert the optimistic update
            await fetchTickets();
        }
    };
    
    const handleOpenRoutePlanner = () => {
        const today = moment().startOf('day');
        const ticketsForToday = tickets.filter(ticket => 
            ticket.scheduledDate && moment(ticket.scheduledDate).isSame(today, 'day') && ticket.latitude && ticket.longitude
        );

        if (ticketsForToday.length > 1) {
            setRouteTickets(ticketsForToday);
            setIsRouteModalOpen(true);
        } else {
            alert("Se necesitan al menos 2 visitas con ubicación agendadas para hoy para poder crear una ruta.");
        }
    };
    
    const combinedEvents = useMemo(() => {
        const appEvents: CalendarEvent[] = tickets
            .filter(t => (t.status === TicketStatus.Scheduled || t.status === TicketStatus.Closed) && t.scheduledDate)
            .map(ticket => ({
                title: `${ticket.status === TicketStatus.Closed ? '✓ ' : ''}${ticket.title}`,
                start: new Date(ticket.scheduledDate!),
                end: new Date(ticket.scheduledDate!),
                allDay: true,
                resource: { source: 'app', id: ticket.id },
            }));
        // For the prototype, we combine app events with static mock Google events
        return [...appEvents, ...getMockGcalEvents()];
    }, [tickets]);

    const eventPropGetter = useCallback((event: CalendarEvent) => {
        const defaultStyle = {
            borderRadius: '5px',
            opacity: 0.9,
            color: 'white',
            border: '0px',
            display: 'block'
        };

        if (event.resource?.source !== 'app') {
            return { style: { ...defaultStyle, backgroundColor: '#10b981' } }; // Google event
        }
        
        const ticket = tickets.find(t => t.id === event.resource?.id);
        const isCompleted = ticket?.status === TicketStatus.Closed;

        return {
            style: {
                ...defaultStyle,
                backgroundColor: isCompleted ? '#16a34a' : '#0284c7', // Emerald green for completed, blue for scheduled
                textDecoration: isCompleted ? 'line-through' : 'none',
            }
        };
    }, [tickets]);

    const ticketsForTodayRoute = useMemo(() => {
        const today = moment().startOf('day');
        return tickets.filter(ticket => 
            ticket.scheduledDate && moment(ticket.scheduledDate).isSame(today, 'day') && ticket.latitude && ticket.longitude
        ).length;
    }, [tickets]);


    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    const TicketTable = () => (
         <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-md border border-slate-300">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-100">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ticket / Cliente</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Módulo (Serial)</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha de Creación</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                            {viewFilter === 'pending' && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Agendar</span></th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                       {filteredTickets.length > 0 ? (
                            filteredTickets.map(ticket => (
                                <tr key={ticket.id} className={`border-l-4 ${getPriorityBadgeStyle(ticket.priority)}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{ticket.title}</div>
                                        <div className="text-sm text-slate-500">{ticket.clientName}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{ticket.moduleSerial}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    {viewFilter === 'pending' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => setSchedulingTicket(ticket)}
                                                className="text-white bg-sky-600 hover:bg-sky-700 font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
                                            >
                                                Agendar
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                       ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-slate-500">
                                    No hay tickets en esta categoría.
                                </td>
                            </tr>
                       )}
                    </tbody>
                </table>
            </div>
        </div>
    );
    
    const CalendarView = () => (
         <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-md border border-slate-300 p-4">
             <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-800 p-4 mb-4 rounded-r-lg" role="alert">
                <p className="font-bold">Modo de Demostración</p>
                <p>Este es un calendario de ejemplo. Los eventos en <span className="font-semibold text-emerald-600">verde</span> simulan eventos de su Google Calendar. Los eventos en <span className="font-semibold text-sky-600">azul</span> son tickets agendados en esta app.</p>
            </div>
             <div className="mb-4 flex justify-end">
                <button 
                    onClick={handleOpenRoutePlanner}
                    disabled={ticketsForTodayRoute < 2}
                    className="flex items-center bg-white text-slate-700 px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 transition-colors border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <MapIcon className="h-5 w-5 mr-2" />
                    Planificar Ruta de Hoy
                </button>
            </div>
            <div style={{ height: '70vh' }}>
                <Calendar
                    localizer={localizer}
                    events={combinedEvents}
                    startAccessor="start"
                    endAccessor="end"
                    messages={{
                        next: "Sig",
                        previous: "Ant",
                        today: "Hoy",
                        month: "Mes",
                        week: "Semana",
                        day: "Día",
                        agenda: "Agenda"
                    }}
                    eventPropGetter={eventPropGetter}
                />
            </div>
        </div>
    );
    

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold text-slate-800">Agenda de Mantenimiento</h2>
                 <div className="flex space-x-2 items-center">
                    <div className="flex space-x-2 p-1 bg-slate-300/50 rounded-lg">
                        {(
                            [
                                {key: 'pending', label: 'Pendientes'},
                                {key: 'scheduled', label: 'Agendados'},
                                {key: 'closed', label: 'Historial'}
                            ] as {key: ViewFilter, label: string}[]
                        ).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setViewFilter(tab.key)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    viewFilter === tab.key
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'bg-transparent text-slate-600 hover:bg-white/50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                 </div>
            </div>

            {viewFilter === 'scheduled' ? <CalendarView /> : <TicketTable />}

            {schedulingTicket && (
                <ScheduleTicketModal 
                    ticket={schedulingTicket}
                    onClose={() => setSchedulingTicket(null)}
                    onTicketScheduled={handleTicketScheduled}
                />
            )}
            {isRouteModalOpen && (
                <RoutePlannerModal
                    tickets={routeTickets}
                    onClose={() => setIsRouteModalOpen(false)}
                    onTicketComplete={handleTicketComplete}
                />
            )}
        </div>
    );
};

const MapIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.5-12.75a.75.75 0 01.75.75v14.25a.75.75 0 01-1.5 0V4.5a.75.75 0 01.75-.75zM3.75 12a.75.75 0 01.75-.75h14.25a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75z" />
    </svg>
);

export default Maintenance;