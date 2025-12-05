
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllTickets } from '../services/supabaseService';
import { initGoogleClient, loginToGoogle, fetchGoogleEvents, logoutFromGoogle, getGoogleUserProfile, hasValidConfig, isTokenValid, type GoogleCalendarEvent } from '../services/googleCalendarService';
import { type Ticket, TicketStatus } from '../types';
import Spinner from './Spinner';
import ScheduleTicketModal from './ScheduleTicketModal';
import RoutePlannerModal from './RoutePlannerModal';
import TicketDetailsModal from './TicketDetailsModal';
import ApiSettingsModal from './ApiSettingsModal';
import { Calendar, momentLocalizer, Messages, Formats } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';

// Configuración profunda de Moment.js para Español
moment.locale('es', {
    week: {
        dow: 1, // Lunes es el primer día de la semana
        doy: 4  // La semana que contiene el 4 de enero es la primera semana del año
    }
});
const localizer = momentLocalizer(moment);

const messages: Messages = {
    allDay: 'Todo el día',
    previous: 'Anterior',
    next: 'Siguiente',
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
    agenda: 'Agenda',
    date: 'Fecha',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'No hay visitas programadas en este rango',
    showMore: total => `+ Ver ${total} más`
};

// Formatos para forzar 24hs y visualización clara
const calendarFormats: Formats = {
    timeGutterFormat: (date: Date, culture?: string, localizer?: any) => 
        localizer.format(date, 'HH:mm', culture), // Eje Y: 13:00, 14:00
    eventTimeRangeFormat: ({ start, end }: any, culture?: string, localizer?: any) =>
        `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`, // Evento: 13:00 - 14:00
    agendaTimeRangeFormat: ({ start, end }: any, culture?: string, localizer?: any) =>
        `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
};

const customCalendarStyles = `.rbc-calendar { font-family: inherit; } .rbc-toolbar button { border: 1px solid #e2e8f0; background: white; } .rbc-toolbar button.rbc-active { background-color: #0284c7; color: white; } .rbc-event { background: transparent; padding: 2px; } .rbc-time-view .rbc-header { border-bottom: 1px solid #e2e8f0; } .rbc-today { background-color: #f0f9ff; }`;

interface CalendarEvent { title: string; start: Date; end: Date; allDay: boolean; resource?: { source: 'app' | 'google', id: string, link?: string }; }
interface GoogleUser { name: string; picture: string; email: string; }

const Maintenance: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [schedulingTicket, setSchedulingTicket] = useState<Ticket | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [routeTickets, setRouteTickets] = useState<Ticket[]>([]);
    const [isPendingListOpen, setIsPendingListOpen] = useState(false);
    
    // Route Date Picker
    const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Google State
    const [isGoogleConnected, setIsGoogleConnected] = useState(isTokenValid());
    const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
    const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
    const [googleError, setGoogleError] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try { setTickets(await getAllTickets()); } catch (error) { console.error(error); } finally { setLoading(false); }
    }, []);

    const loadGoogleData = async () => {
        setGoogleError('');
        try {
            const userProfile = await getGoogleUserProfile();
            if (userProfile) {
                setGoogleUser(userProfile);
                setIsGoogleConnected(true);
                const events = await fetchGoogleEvents();
                setGoogleEvents(events);
            } else {
                setIsGoogleConnected(false);
            }
        } catch (error: any) {
            console.error("Sync Error:", error);
            if (error.message === "TOKEN_EXPIRED") {
                setIsGoogleConnected(false);
                setGoogleUser(null);
            } else {
                setGoogleError('Error sincronizando');
            }
        }
    };

    useEffect(() => {
        fetchTickets();
        if (hasValidConfig()) {
            initGoogleClient((token) => {
                setIsGoogleConnected(true);
                loadGoogleData();
            });
            if (isTokenValid()) {
                loadGoogleData();
            }
        }
    }, [fetchTickets]);

    const handleGoogleLogin = () => {
        if (!hasValidConfig()) setIsSettingsOpen(true);
        else loginToGoogle();
    };
    
    const handleLogout = () => {
        logoutFromGoogle();
        setIsGoogleConnected(false);
        setGoogleUser(null);
        setGoogleEvents([]);
    };

    const pendingTickets = useMemo(() => tickets.filter(t => t.status === TicketStatus.New || t.status === TicketStatus.InProgress), [tickets]);

    const handleTicketScheduled = async () => { await fetchTickets(); if(isGoogleConnected) loadGoogleData(); };

    const handleOpenRoutePlanner = () => {
        const selectedMoment = moment(routeDate).startOf('day');
        const ticketsForDate = tickets.filter(ticket => 
            ticket.scheduledDate && 
            moment(ticket.scheduledDate).isSame(selectedMoment, 'day') && 
            ticket.latitude && 
            ticket.longitude
        );
        ticketsForDate.sort((a, b) => a.id.localeCompare(b.id));

        if (ticketsForDate.length > 0) {
            setRouteTickets(ticketsForDate);
            setIsRouteModalOpen(true);
        } else {
            alert(`No hay servicios con ubicación GPS programados para el ${selectedMoment.format('DD/MM/YYYY')}.`);
        }
    };
    
    const handleTicketCompletedFromRoute = async (ticketId: string) => {
         setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: TicketStatus.Closed } : t));
         setRouteTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: TicketStatus.Closed } : t));
         await fetchTickets();
    };

    const combinedEvents = useMemo(() => {
        const appEvents: CalendarEvent[] = tickets
            .filter(t => (t.status === TicketStatus.Scheduled || t.status === TicketStatus.Closed) && t.scheduledDate)
            .map(ticket => ({
                title: `${ticket.title} - ${ticket.clientName}`,
                start: new Date(ticket.scheduledDate!),
                end: new Date(ticket.scheduledDate!),
                allDay: true,
                resource: { source: 'app', id: ticket.id },
            }));

        const gEvents: CalendarEvent[] = googleEvents.map(evt => ({
            title: 'Ocupado (Google)', 
            start: evt.start.dateTime ? new Date(evt.start.dateTime) : new Date(evt.start.date!),
            end: evt.end.dateTime ? new Date(evt.end.dateTime) : new Date(evt.end.date!),
            allDay: !evt.start.dateTime,
            resource: { source: 'google', id: evt.id, link: evt.htmlLink }
        }));

        return [...appEvents, ...gEvents];
    }, [tickets, googleEvents]);

    const eventPropGetter = useCallback((event: CalendarEvent) => {
        let style = { border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', borderLeft: '4px solid', marginBottom: '2px' };
        if (event.resource?.source === 'google') {
            return { style: { ...style, backgroundColor: '#f1f5f9', color: '#64748b', borderLeftColor: '#94a3b8', opacity: 0.8 } };
        } else {
            const ticket = tickets.find(t => t.id === event.resource?.id);
            const isCompleted = ticket?.status === TicketStatus.Closed;
            return { style: { ...style, backgroundColor: isCompleted ? '#f0fdf4' : '#e0f2fe', color: isCompleted ? '#166534' : '#0369a1', borderLeftColor: isCompleted ? '#22c55e' : '#0ea5e9' } };
        }
    }, [tickets]);

    const handleSelectEvent = (event: CalendarEvent) => {
        if (event.resource?.source === 'app') {
            const ticket = tickets.find(t => t.id === event.resource?.id);
            if (ticket) setSelectedTicket(ticket);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div className="h-full flex flex-col">
            <style>{customCalendarStyles}</style>
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                 <div><h2 className="text-4xl font-black text-slate-800">Agenda</h2></div>
                 
                 <div className="flex flex-wrap gap-3 items-center">
                    <button onClick={() => setIsPendingListOpen(true)} className="bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg font-bold flex items-center shadow-sm hover:bg-amber-100 transition-colors">
                        <span className="bg-amber-600 text-white rounded-full text-xs px-2 py-0.5 mr-2">{pendingTickets.length}</span> Pendientes
                    </button>
                    
                    <div className="flex items-center bg-white border border-slate-300 rounded-lg p-1 shadow-sm">
                        <input 
                            type="date" 
                            value={routeDate}
                            onChange={(e) => setRouteDate(e.target.value)}
                            className="text-sm font-medium text-slate-700 border-none focus:ring-0 rounded-l-md px-3 py-1 bg-transparent"
                        />
                        <button onClick={handleOpenRoutePlanner} className="bg-sky-600 text-white px-4 py-1.5 rounded-md font-bold hover:bg-sky-700 flex items-center transition-colors ml-1">
                            <span className="mr-2">🗺️</span> Ruta del Día
                        </button>
                    </div>
                 </div>
            </div>

            <div className="flex-grow flex flex-col">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
                        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-sky-500 mr-2"></span>Visitas</div>
                        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span>Realizadas</div>
                        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-slate-300 mr-2"></span>Google (Ocupado)</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {googleError && <span className="text-xs text-red-500 font-bold">{googleError}</span>}
                        {!isGoogleConnected ? (
                            <button onClick={handleGoogleLogin} className="text-sm font-bold text-sky-600 hover:bg-sky-50 px-3 py-1.5 rounded border border-transparent hover:border-sky-200 transition-all flex items-center">
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-4 w-4 mr-2" /> Conectar Calendar
                            </button>
                        ) : (
                            <div className="flex items-center bg-emerald-50 px-3 py-1 rounded border border-emerald-100 shadow-sm">
                                {googleUser && <img src={googleUser.picture} className="h-6 w-6 rounded-full mr-2 border border-emerald-200" />}
                                <span className="text-xs font-bold text-emerald-700 mr-3">Conectado</span>
                                <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-red-500 underline font-medium">Salir</button>
                            </div>
                        )}
                        <button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 p-2 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors" title="Configurar API">⚙️</button>
                    </div>
                </div>

                <div className="flex-grow bg-white rounded-2xl shadow-lg border border-slate-100 p-4">
                    <Calendar 
                        localizer={localizer} 
                        events={combinedEvents} 
                        startAccessor="start" 
                        endAccessor="end" 
                        messages={messages}
                        culture="es" // Forzar cultura española en el componente
                        formats={calendarFormats} // Formato 24hs
                        min={new Date(0, 0, 0, 8, 0, 0)} // Inicio visual: 08:00 AM
                        max={new Date(0, 0, 0, 20, 0, 0)} // Fin visual: 08:00 PM
                        eventPropGetter={eventPropGetter} 
                        onSelectEvent={handleSelectEvent} 
                        views={['month', 'week', 'day']} 
                        defaultView='month' 
                        className="h-full" 
                    />
                </div>
            </div>

            {isPendingListOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center" onClick={() => setIsPendingListOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between bg-slate-50 rounded-t-xl"><h3 className="font-bold text-lg text-slate-800">Tickets Pendientes</h3><button onClick={() => setIsPendingListOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button></div>
                        <div className="p-4 overflow-y-auto bg-white flex-1 space-y-3">
                            {pendingTickets.map(t => (
                                <div key={t.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center hover:border-sky-300 transition-colors">
                                    <div>
                                        <p className="font-bold text-slate-800">{t.title}</p>
                                        <p className="text-xs text-slate-500 mt-1">{t.clientName} | {t.moduleSerial}</p>
                                    </div>
                                    <button onClick={() => { setSchedulingTicket(t); setIsPendingListOpen(false); }} className="text-xs bg-sky-600 text-white px-3 py-2 rounded-md font-bold hover:bg-sky-700 shadow-sm">Agendar</button>
                                </div>
                            ))}
                            {pendingTickets.length === 0 && <p className="text-center text-slate-400 py-8 italic">¡Todo al día! No hay tickets pendientes.</p>}
                        </div>
                    </div>
                </div>
            )}
            
            {isSettingsOpen && <ApiSettingsModal onClose={() => setIsSettingsOpen(false)} onSaved={() => { if(hasValidConfig()) { setIsGoogleConnected(true); initGoogleClient(loadGoogleData); } }} />}
            {schedulingTicket && <ScheduleTicketModal ticket={schedulingTicket} onClose={() => setSchedulingTicket(null)} onTicketScheduled={handleTicketScheduled} />}
            {isRouteModalOpen && <RoutePlannerModal tickets={routeTickets} onClose={() => setIsRouteModalOpen(false)} onTicketComplete={async (id) => { 
                const { updateTicketStatus } = await import('../services/supabaseService');
                await updateTicketStatus(id, TicketStatus.Closed);
                handleTicketCompletedFromRoute(id);
            }} />}
            {selectedTicket && <TicketDetailsModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onTicketUpdated={(t) => setTickets(prev => prev.map(pt => pt.id === t.id ? t : pt))} />}
        </div>
    );
};
export default Maintenance;
