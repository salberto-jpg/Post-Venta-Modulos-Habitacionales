import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllTickets } from '../services/supabaseService';
import { initGoogleClient, loginToGoogle, fetchGoogleEvents, logoutFromGoogle, getGoogleUserProfile, hasValidConfig, type GoogleCalendarEvent } from '../services/googleCalendarService';
import { type Ticket, TicketStatus } from '../types';
import Spinner from './Spinner';
import ScheduleTicketModal from './ScheduleTicketModal';
import RoutePlannerModal from './RoutePlannerModal';
import TicketDetailsModal from './TicketDetailsModal';
import ApiSettingsModal from './ApiSettingsModal'; // Importar el nuevo modal
import { Calendar, momentLocalizer, Messages } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');
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
    noEventsInRange: 'No hay eventos en este rango.',
    showMore: total => `+${total} más`
};

const customCalendarStyles = `
    .rbc-calendar { font-family: inherit; }
    .rbc-toolbar { margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
    .rbc-toolbar button { 
        border: 1px solid #e2e8f0 !important; 
        border-radius: 8px !important; 
        padding: 6px 16px !important; 
        color: #64748b !important; 
        font-weight: 500 !important;
        font-size: 0.875rem !important;
        background: white !important;
        transition: all 0.2s;
    }
    .rbc-toolbar button:hover { background-color: #f8fafc !important; color: #0f172a !important; }
    .rbc-toolbar button.rbc-active { 
        background-color: #0284c7 !important; 
        color: white !important; 
        border-color: #0284c7 !important; 
        box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);
    }
    .rbc-toolbar-label { font-size: 1.1rem !important; font-weight: 700 !important; color: #334155; text-transform: capitalize; }
    .rbc-month-view { border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; background: white; }
    .rbc-header { 
        padding: 16px 0; 
        font-weight: 600; 
        font-size: 0.75rem; 
        color: #94a3b8; 
        text-transform: uppercase; 
        letter-spacing: 0.05em; 
        border-bottom: 1px solid #e2e8f0; 
        background: #f8fafc;
    }
    .rbc-day-bg { border-left: 1px solid #f1f5f9; }
    .rbc-off-range-bg { background-color: #f8fafc; }
    .rbc-today { background-color: #f0f9ff; }
    .rbc-date-cell { padding: 8px; font-size: 0.85rem; font-weight: 500; color: #64748b; }
    .rbc-event { 
        background: transparent !important; 
        padding: 2px !important; 
        max-height: 100%;
    }
    .rbc-event:focus { outline: none; }
`;

interface CalendarEvent {
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource?: { source: 'app' | 'google', id: string, link?: string };
}

interface GoogleUser {
    name: string;
    picture: string;
    email: string;
}

const Maintenance: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [schedulingTicket, setSchedulingTicket] = useState<Ticket | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [routeTickets, setRouteTickets] = useState<Ticket[]>([]);
    const [isPendingListOpen, setIsPendingListOpen] = useState(false);
    
    // Google State
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
    const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
    const [googleError, setGoogleError] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Settings Modal
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

    const loadGoogleData = async () => {
        setIsSyncing(true);
        setGoogleError('');
        try {
            const userProfile = await getGoogleUserProfile();
            if (userProfile) setGoogleUser(userProfile);

            const events = await fetchGoogleEvents();
            setGoogleEvents(events);
            setIsGoogleConnected(true);
        } catch (error: any) {
            console.error("Sync Error:", error);
            if (error.message === "TOKEN_EXPIRED") {
                setIsGoogleConnected(false);
                setGoogleUser(null);
            } else if (error.message.includes("PERMISO")) {
                 setGoogleError("Falta permiso en Google Cloud");
            } else {
                setGoogleError('Error de sincronización');
            }
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchTickets();
        
        // Solo inicializar si hay config válida
        if (hasValidConfig()) {
            const timer = setTimeout(() => {
                initGoogleClient((accessToken) => {
                    loadGoogleData();
                });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [fetchTickets]);

    const handleGoogleLogin = () => {
        setGoogleError('');
        if (!hasValidConfig()) {
            setIsSettingsOpen(true);
        } else {
            loginToGoogle();
        }
    };

    const handleGoogleLogout = () => {
        logoutFromGoogle();
        setIsGoogleConnected(false);
        setGoogleEvents([]);
        setGoogleUser(null);
    };

    const handleApiSettingsSaved = () => {
        // Reintentar inicialización con las nuevas credenciales
        if (hasValidConfig()) {
             initGoogleClient((accessToken) => {
                loadGoogleData();
            });
        }
    };

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
                title: `${ticket.title} - ${ticket.clientName}`,
                start: new Date(ticket.scheduledDate!),
                end: new Date(ticket.scheduledDate!),
                allDay: true,
                resource: { source: 'app', id: ticket.id },
            }));

        const gEvents: CalendarEvent[] = googleEvents.map(evt => ({
            // ENMASCARAMIENTO DE PRIVACIDAD: Mostramos 'Ocupado' en lugar del título real
            title: 'Ocupado', 
            start: evt.start.dateTime ? new Date(evt.start.dateTime) : new Date(evt.start.date!),
            end: evt.end.dateTime ? new Date(evt.end.dateTime) : new Date(evt.end.date!),
            allDay: !evt.start.dateTime,
            resource: { source: 'google', id: evt.id, link: evt.htmlLink }
        }));

        return [...appEvents, ...gEvents];
    }, [tickets, googleEvents]);

    const eventPropGetter = useCallback((event: CalendarEvent) => {
        let style = {};
        const baseStyle = {
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: '600',
            padding: '2px 8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            borderLeft: '4px solid', 
            marginBottom: '4px'
        };

        if (event.resource?.source === 'google') {
            style = {
                ...baseStyle,
                // Estilo "Ocupado" (Gris neutro)
                backgroundColor: '#f1f5f9', // slate-100
                color: '#64748b', // slate-500
                borderLeftColor: '#94a3b8', // slate-400
                fontStyle: 'italic',
                opacity: 0.9
            };
        } else {
            const ticket = tickets.find(t => t.id === event.resource?.id);
            const isCompleted = ticket?.status === TicketStatus.Closed;
            style = {
                ...baseStyle,
                backgroundColor: isCompleted ? '#f1f5f9' : '#e0f2fe',
                color: isCompleted ? '#64748b' : '#0369a1',
                borderLeftColor: isCompleted ? '#94a3b8' : '#0ea5e9',
                textDecoration: isCompleted ? 'line-through' : 'none'
            };
        }
        return { style };
    }, [tickets]);

    const handleSelectEvent = (event: CalendarEvent) => {
        if (event.resource?.source === 'app') {
            const ticket = tickets.find(t => t.id === event.resource?.id);
            if (ticket) setSelectedTicket(ticket);
        } 
        // Deshabilitado el click automático para eventos de Google para mantener la ilusión de "Ocupado" en la UI,
        // aunque si el usuario quiere puede descomentar la línea de abajo para abrir el link en una pestaña nueva.
        else if (event.resource?.source === 'google' && event.resource.link) {
            // Opcional: Permitir al dueño del calendario ver sus propios eventos si hace clic
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
            <style>{customCalendarStyles}</style>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                 <div>
                    <h2 className="text-4xl md:text-7xl font-black text-slate-800 tracking-tight">Agenda</h2>
                    <p className="text-slate-500 mt-2 text-lg">Sincronización de eventos y visitas técnicas.</p>
                 </div>
                 
                 <div className="flex flex-wrap gap-3 self-end md:self-auto">
                    <button 
                        onClick={() => setIsPendingListOpen(true)}
                        className="relative flex items-center bg-amber-50 text-amber-700 border border-amber-200 px-5 py-3 rounded-xl shadow-sm hover:bg-amber-100 transition-all font-bold group"
                    >
                        <TicketIcon className="h-5 w-5 mr-2 text-amber-600 group-hover:scale-110 transition-transform" />
                        {pendingTickets.length} Pendientes
                        {pendingTickets.length > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>}
                    </button>

                    <button 
                        onClick={handleOpenRoutePlanner}
                        disabled={ticketsForTodayRoute < 2}
                        className="flex items-center bg-white text-slate-700 px-5 py-3 rounded-xl shadow-sm hover:bg-slate-50 hover:shadow transition-all border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        <MapIcon className="h-5 w-5 mr-2 text-slate-500" />
                        Ruta de Hoy
                    </button>
                 </div>
            </div>

            <div className="flex-grow flex flex-col">
                {/* Connection Status Bar */}
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-sm mb-4 flex justify-between items-center">
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center">
                            <span className="w-3 h-3 rounded-full bg-sky-500 mr-2 shadow-sm"></span> 
                            <span className="text-sm font-semibold text-slate-600">Servicios GreenBox</span>
                        </div>
                        <div className="flex items-center">
                            <span className={`w-3 h-3 rounded-full mr-2 shadow-sm transition-colors ${isGoogleConnected ? 'bg-slate-400' : 'bg-slate-200'}`}></span> 
                            <span className="text-sm font-semibold text-slate-600">Google Calendar (Ocupado)</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {googleError && <span className="text-xs text-red-500 font-medium mr-2">{googleError}</span>}
                        
                        {!isGoogleConnected ? (
                             <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                                    title="Configurar claves de API"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                                </button>
                                <button onClick={handleGoogleLogin} className="text-sm font-bold text-sky-600 hover:text-white hover:bg-sky-600 flex items-center bg-sky-50 px-4 py-2 rounded-lg border border-sky-200 transition-all shadow-sm">
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-4 w-4 mr-2" alt="Google" />
                                    Conectar mi Calendario
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200">
                                {googleUser && (
                                    <div className="flex items-center mr-3 border-r border-slate-200 pr-3">
                                        <img src={googleUser.picture} alt={googleUser.name} className="h-6 w-6 rounded-full mr-2" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700 leading-tight">{googleUser.name}</span>
                                            <span className="text-[10px] text-slate-500 leading-tight">{googleUser.email}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center mr-3">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                                    <span className="text-xs font-bold text-emerald-700">Conectado</span>
                                </div>
                                <button 
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded mr-2"
                                    title="Configuración"
                                >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                                </button>
                                <button onClick={handleGoogleLogout} className="text-xs text-slate-400 hover:text-red-500 font-medium underline px-2">
                                    Salir
                                </button>
                            </div>
                        )}
                        {isSyncing && <Spinner />}
                    </div>
                </div>

                <div className="flex-grow bg-white rounded-3xl shadow-xl border border-slate-100 p-2 md:p-6 overflow-hidden">
                    <Calendar
                        localizer={localizer}
                        events={combinedEvents}
                        startAccessor="start"
                        endAccessor="end"
                        messages={messages}
                        eventPropGetter={eventPropGetter}
                        onSelectEvent={handleSelectEvent}
                        views={['month', 'week', 'day']}
                        defaultView='month'
                        className="minimal-calendar h-full"
                    />
                </div>
            </div>

            {isPendingListOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={() => setIsPendingListOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl m-4 max-h-[85vh] flex flex-col transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">Tickets Pendientes</h3>
                                <p className="text-sm text-slate-500">Selecciona un ticket para asignar fecha.</p>
                            </div>
                            <button onClick={() => setIsPendingListOpen(false)} className="bg-slate-200 hover:bg-slate-300 p-2 rounded-full transition-colors">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            {pendingTickets.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="bg-emerald-100 p-4 rounded-full inline-block mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="text-lg font-medium text-slate-600">¡Todo al día!</p>
                                    <p className="text-slate-400">No hay tickets pendientes de agendar.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {pendingTickets.map(ticket => (
                                        <div key={ticket.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow">
                                            <div className="mb-4 sm:mb-0">
                                                <h4 className="text-lg font-bold text-slate-800 flex items-center">
                                                    {ticket.title}
                                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${ticket.priority === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{ticket.priority}</span>
                                                </h4>
                                                <div className="flex items-center text-sm text-slate-500 mt-1">
                                                    <span className="font-medium mr-2">{ticket.clientName}</span>
                                                    <span className="text-slate-300">|</span>
                                                    <span className="ml-2">{ticket.moduleSerial}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => { setSchedulingTicket(ticket); setIsPendingListOpen(false); }} className="bg-sky-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-sky-700 w-full sm:w-auto text-center">
                                                Agendar Visita
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {isSettingsOpen && <ApiSettingsModal onClose={() => setIsSettingsOpen(false)} onSaved={handleApiSettingsSaved} />}

            {schedulingTicket && <ScheduleTicketModal ticket={schedulingTicket} onClose={() => setSchedulingTicket(null)} onTicketScheduled={handleTicketScheduled} />}
            {isRouteModalOpen && <RoutePlannerModal tickets={routeTickets} onClose={() => setIsRouteModalOpen(false)} onTicketComplete={() => {}} />}
            
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
const TicketIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h5.25m-5.25 0h5.25m-5.25 0h5.25M3 4.5h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 013 4.5z" /></svg>;

export default Maintenance;