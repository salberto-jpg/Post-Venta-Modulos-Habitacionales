
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllTickets, updateTicketStatus } from '../services/supabaseService';
import { initGoogleClient, loginToGoogle, fetchGoogleEvents, type GoogleCalendarEvent } from '../services/googleCalendarService';
import { type Ticket, TicketStatus, Priority } from '../types';
import Spinner from './Spinner';
import ScheduleTicketModal from './ScheduleTicketModal';
import RoutePlannerModal from './RoutePlannerModal';
import TicketDetailsModal from './TicketDetailsModal'; // Import the detailed view
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');
const localizer = momentLocalizer(moment);

interface CalendarEvent {
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource?: { source: 'app' | 'google', id: string, link?: string };
}

const Maintenance: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [schedulingTicket, setSchedulingTicket] = useState<Ticket | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null); // State for viewing details
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [routeTickets, setRouteTickets] = useState<Ticket[]>([]);
    const [isPendingListOpen, setIsPendingListOpen] = useState(false);
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllTickets();
            setTickets(data);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
        initGoogleClient(async () => {
            setIsGoogleConnected(true);
            try {
                const events = await fetchGoogleEvents();
                setGoogleEvents(events);
            } catch (error) {
                console.error("Error fetching Google events:", error);
            }
        });
    }, [fetchTickets]);

    const handleGoogleLogin = () => loginToGoogle();

    const pendingTickets = useMemo(() => {
        return tickets.filter(t => t.status === TicketStatus.New || t.status === TicketStatus.InProgress);
    }, [tickets]);

    const handleTicketScheduled = async () => {
        await fetchTickets();
    };

    const handleTicketStatusChange = (ticketId: string, newStatus: TicketStatus) => {
        setTickets(prevTickets =>
            prevTickets.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
        if (selectedTicket && selectedTicket.id === ticketId) {
            setSelectedTicket({ ...selectedTicket, status: newStatus });
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
            alert("Se necesitan al menos 2 visitas con ubicación agendadas para hoy.");
        }
    };
    
    const combinedEvents = useMemo(() => {
        const appEvents: CalendarEvent[] = tickets
            .filter(t => (t.status === TicketStatus.Scheduled || t.status === TicketStatus.Closed) && t.scheduledDate)
            .map(ticket => ({
                title: `${ticket.status === TicketStatus.Closed ? '✓ ' : ''}${ticket.title} (${ticket.clientName})`,
                start: new Date(ticket.scheduledDate!),
                end: new Date(ticket.scheduledDate!),
                allDay: true,
                resource: { source: 'app', id: ticket.id },
            }));

        const gEvents: CalendarEvent[] = googleEvents.map(evt => ({
            title: `📅 ${evt.summary}`,
            start: evt.start.dateTime ? new Date(evt.start.dateTime) : new Date(evt.start.date!),
            end: evt.end.dateTime ? new Date(evt.end.dateTime) : new Date(evt.end.date!),
            allDay: !evt.start.dateTime,
            resource: { source: 'google', id: evt.id, link: evt.htmlLink }
        }));

        return [...appEvents, ...gEvents];
    }, [tickets, googleEvents]);

    const eventPropGetter = useCallback((event: CalendarEvent) => {
        const defaultStyle = {
            borderRadius: '4px', opacity: 0.9, color: 'white', border: '0px', display: 'block', fontSize: '0.85em'
        };
        if (event.resource?.source === 'google') return { style: { ...defaultStyle, backgroundColor: '#10b981' } };
        
        const ticket = tickets.find(t => t.id === event.resource?.id);
        const isCompleted = ticket?.status === TicketStatus.Closed;
        return { style: { ...defaultStyle, backgroundColor: isCompleted ? '#64748b' : '#0284c7', textDecoration: isCompleted ? 'line-through' : 'none' } };
    }, [tickets]);

    // Handler for clicking a calendar event
    const handleSelectEvent = (event: CalendarEvent) => {
        if (event.resource?.source === 'app') {
            const ticket = tickets.find(t => t.id === event.resource?.id);
            if (ticket) {
                setSelectedTicket(ticket);
            }
        } else if (event.resource?.source === 'google' && event.resource.link) {
            window.open(event.resource.link, '_blank');
        }
    };

    const ticketsForTodayRoute = useMemo(() => {
        const today = moment().startOf('day');
        return tickets.filter(ticket => ticket.scheduledDate && moment(ticket.scheduledDate).isSame(today, 'day') && ticket.latitude && ticket.longitude).length;
    }, [tickets]);

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div className="h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                 <div>
                    <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Agenda de Servicios</h2>
                    <p className="text-slate-500 mt-1">Organiza las visitas técnicas y sincroniza con tu calendario.</p>
                 </div>
                 
                 <div className="flex space-x-3">
                    <button 
                        onClick={() => setIsPendingListOpen(true)}
                        className="relative flex items-center bg-amber-100 text-amber-900 border border-amber-200 px-6 py-3 rounded-xl shadow-sm hover:bg-amber-200 transition-all font-bold"
                    >
                        <TicketIcon className="h-6 w-6 mr-2 text-amber-700" />
                        {pendingTickets.length} Tickets Pendientes
                        {pendingTickets.length > 0 && <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>

                    <button 
                        onClick={handleOpenRoutePlanner}
                        disabled={ticketsForTodayRoute < 2}
                        className="flex items-center bg-white text-slate-700 px-4 py-3 rounded-xl shadow-sm hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        <MapIcon className="h-5 w-5 mr-2 text-slate-500" />
                        Ruta de Hoy
                    </button>
                 </div>
            </div>

            <div className="flex-grow bg-white rounded-2xl shadow-xl border border-slate-200 p-6 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-4">
                        <span className="flex items-center text-xs font-semibold text-slate-500"><span className="w-3 h-3 rounded-full bg-sky-500 mr-2"></span> Servicios App</span>
                        <span className="flex items-center text-xs font-semibold text-slate-500"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span> Google Calendar</span>
                    </div>
                    {!isGoogleConnected && (
                        <button onClick={handleGoogleLogin} className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center bg-sky-50 px-3 py-1 rounded-full border border-sky-100">+ Conectar Google</button>
                    )}
                </div>
                <div className="flex-grow">
                    <Calendar
                        localizer={localizer}
                        events={combinedEvents}
                        startAccessor="start"
                        endAccessor="end"
                        messages={{ next: "Sig", previous: "Ant", today: "Hoy", month: "Mes", week: "Semana", day: "Día", agenda: "Agenda" }}
                        eventPropGetter={eventPropGetter}
                        onSelectEvent={handleSelectEvent}
                        views={['month', 'week', 'day']}
                        defaultView='month'
                        className="minimal-calendar"
                    />
                </div>
            </div>

            {/* Modal for Pending Tickets List */}
            {isPendingListOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={() => setIsPendingListOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl m-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="text-2xl font-bold text-slate-800">Pendientes de Agendar</h3>
                            <button onClick={() => setIsPendingListOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            {pendingTickets.length === 0 ? (
                                <p className="text-center py-20 text-slate-500">¡Todo al día!</p>
                            ) : (
                                <div className="grid gap-4">
                                    {pendingTickets.map(ticket => (
                                        <div key={ticket.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-800">{ticket.title}</h4>
                                                <p className="text-sm text-slate-600">{ticket.clientName}</p>
                                            </div>
                                            <button onClick={() => { setSchedulingTicket(ticket); setIsPendingListOpen(false); }} className="bg-sky-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-sky-700">Agendar</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Scheduling a specific ticket */}
            {schedulingTicket && (
                <ScheduleTicketModal 
                    ticket={schedulingTicket} 
                    onClose={() => setSchedulingTicket(null)} 
                    onTicketScheduled={handleTicketScheduled} 
                />
            )}

            {/* Modal for Route Planner */}
            {isRouteModalOpen && (
                <RoutePlannerModal 
                    tickets={routeTickets} 
                    onClose={() => setIsRouteModalOpen(false)} 
                    onTicketComplete={() => {}} 
                />
            )}

            {/* Modal for Ticket Details (when clicking on calendar event) */}
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

const MapIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.5-12.75a.75.75 0 01.75.75v14.25a.75.75 0 01-1.5 0V4.5a.75.75 0 01.75-.75zM3.75 12a.75.75 0 01.75-.75h14.25a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75z" /></svg>;
const TicketIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h5.25m-5.25 0h5.25M3 4.5h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 013 4.5z" /></svg>;

export default Maintenance;