
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllTickets, updateTicketStatus } from '../services/supabaseService';
import { initGoogleClient, loginToGoogle, fetchGoogleEvents, logoutFromGoogle, getGoogleUserProfile, hasValidConfig, isTokenValid, findAndMarkEventAsDone, getMockGoogleEvents, type GoogleCalendarEvent } from '../services/googleCalendarService';
import { type Ticket, TicketStatus, Priority } from '../types';
import Spinner from './Spinner';
import ScheduleTicketModal from './ScheduleTicketModal';
import RoutePlannerModal from './RoutePlannerModal';
import TicketDetailsModal from './TicketDetailsModal';
import ApiSettingsModal from './ApiSettingsModal';
import { Calendar, momentLocalizer, Messages, Formats } from 'react-big-calendar';
import moment from 'moment';

// DEFINICIÓN MANUAL DEL IDIOMA ESPAÑOL PARA ASEGURAR CARGA
moment.updateLocale('es', {
    months: 'Enero_Febrero_Marzo_Abril_Mayo_Junio_Julio_Agosto_Septiembre_Octubre_Noviembre_Diciembre'.split('_'),
    monthsShort: 'Ene._Feb._Mar._Abr._May._Jun._Jul._Ago._Sep._Oct._Nov._Dic.'.split('_'),
    weekdays: 'Domingo_Lunes_Martes_Miércoles_Jueves_Viernes_Sábado'.split('_'),
    weekdaysShort: 'Dom._Lun._Mar._Mié._Jue._Vie._Sáb.'.split('_'),
    weekdaysMin: 'Do_Lu_Ma_Mi_Ju_Vi_Sá'.split('_'),
    longDateFormat: {
        LT: 'H:mm',
        LTS: 'H:mm:ss',
        L: 'DD/MM/YYYY',
        LL: 'D [de] MMMM [de] YYYY',
        LLL: 'D [de] MMMM [de] YYYY H:mm',
        LLLL: 'dddd, D [de] MMMM [de] YYYY H:mm'
    },
    week: {
        dow: 1, // Lunes es el primer día de la semana
        doy: 4  // La semana que contiene el 4 de enero es la primera semana del año
    }
});

// Establecer el locale globalmente
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

// --- PREMIUM STYLES FOR CALENDAR ---
const customCalendarStyles = `
    .rbc-calendar { font-family: inherit; border: none; }
    
    /* Header Styling */
    .rbc-header {
        padding: 12px 0;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8; /* Slate 400 */
        border-bottom: 1px solid #e2e8f0;
    }
    
    /* Grid Styling */
    .rbc-month-view { border: 1px solid #f1f5f9; border-radius: 1rem; overflow: hidden; }
    .rbc-month-row { border-top: 1px solid #f1f5f9; }
    .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #f1f5f9; }
    
    /* Today Cell */
    .rbc-today { background-color: #f8fafc; }
    
    /* Off-range days */
    .rbc-off-range-bg { background-color: #fcfcfc; }

    /* Date Number Styling */
    .rbc-date-cell {
        padding: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
    }
    .rbc-now .rbc-button-link {
        color: #0ea5e9; /* Sky 500 */
        background: #e0f2fe;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: auto;
    }

    /* Toolbar Styling */
    .rbc-toolbar { margin-bottom: 1.5rem; flex-wrap: wrap; gap: 10px; }
    .rbc-toolbar-label { font-size: 1.25rem; font-weight: 800; color: #1e293b; text-transform: capitalize; }
    .rbc-btn-group { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); border-radius: 0.75rem; overflow: hidden; border: 1px solid #e2e8f0; }
    .rbc-btn-group button { border: none; background: white; color: #64748b; font-weight: 600; padding: 0.5rem 1rem; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
    .rbc-btn-group button:hover { background: #f8fafc; color: #0f172a; }
    .rbc-btn-group button.rbc-active { background: #0f172a; color: white; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06); }
    .rbc-btn-group button + button { border-left: 1px solid #e2e8f0; }

    /* Event Styling */
    .rbc-event {
        background: transparent;
        padding: 2px 4px;
        border-radius: 6px;
        margin-bottom: 3px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        transition: transform 0.1s;
    }
    .rbc-event:hover {
        transform: scale(1.02);
        z-index: 50;
    }
    .rbc-event-content { font-size: 0.75rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

interface CalendarEvent { title: string; start: Date; end: Date; allDay: boolean; resource?: { source: 'app' | 'google', id: string, link?: string }; }
interface GoogleUser { name: string; picture: string; email: string; }

const Maintenance: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Multi-Select Scheduling State
    const [ticketsToSchedule, setTicketsToSchedule] = useState<Ticket[]>([]); // Array for batch scheduling
    
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [ticketModalMode, setTicketModalMode] = useState<'details' | 'close'>('details');

    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [routeTickets, setRouteTickets] = useState<Ticket[]>([]);
    const [isPendingListOpen, setIsPendingListOpen] = useState(false);
    
    // Pending List Multi-Select State
    const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);

    // Route Date Picker
    const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Google State
    const [isGoogleConnected, setIsGoogleConnected] = useState(isTokenValid());
    const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
    const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
    const [googleError, setGoogleError] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // DEMO MODE STATE
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [demoTickets, setDemoTickets] = useState<Ticket[]>([]); 

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
                // We fetch events just to keep the connection alive/validated, 
                // even if we don't display them anymore as per requirement.
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

    const activateDemoMode = () => {
        setIsDemoMode(true);
        // In Demo Mode we also mock Google Events but we won't display them in the calendar view
        setGoogleEvents(getMockGoogleEvents());
        setIsGoogleConnected(true); 
        setGoogleUser({
            name: 'Demo Usuario',
            email: 'demo@greenbox.com',
            picture: 'https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff'
        });

        const mockRouteTickets: Ticket[] = [
             { id: 'demo-route-1', title: 'Mantenimiento Preventivo', description: 'Mantenimiento preventivo anual según contrato.', clientName: 'Agroindustrias Baires', address: 'Av. Corrientes 1234', status: TicketStatus.Scheduled, priority: Priority.Medium, createdAt: new Date().toISOString(), photos: [], moduleSerial: 'MOD-001', latitude: -34.6037, longitude: -58.3816, moduleId: '1', clientId: '1', scheduledDate: new Date().toISOString() },
             { id: 'demo-route-2', title: 'Reparación de Aire', description: 'El equipo de aire acondicionado hace ruido extraño.', clientName: 'Logística Sur SRL', address: 'Parque Industrial Pilar', status: TicketStatus.Scheduled, priority: Priority.High, createdAt: new Date().toISOString(), photos: [], moduleSerial: 'MOD-002', latitude: -34.6200, longitude: -58.4000, moduleId: '2', clientId: '2', scheduledDate: new Date().toISOString() },
             { id: 'demo-route-3', title: 'Revisión Eléctrica', description: 'Revisión de cableado y tablero principal.', clientName: 'Constructora Norte', address: 'Av. Libertador 5000', status: TicketStatus.Scheduled, priority: Priority.Low, createdAt: new Date().toISOString(), photos: [], moduleSerial: 'MOD-003', latitude: -34.5800, longitude: -58.4200, moduleId: '3', clientId: '3', scheduledDate: new Date().toISOString() },
             { id: 'demo-route-4', title: 'Limpieza de Filtros', description: 'Limpieza general de filtros y conductos.', clientName: 'Torre Bellagio', address: 'Puerto Madero Dock 4', status: TicketStatus.New, priority: Priority.Medium, createdAt: new Date().toISOString(), photos: [], moduleSerial: 'MOD-004', latitude: -34.6100, longitude: -58.3600, moduleId: '4', clientId: '4', scheduledDate: new Date().toISOString() },
        ];
        setDemoTickets(mockRouteTickets);
    };

    const deactivateDemoMode = () => {
        setIsDemoMode(false);
        setGoogleEvents([]);
        setIsGoogleConnected(false);
        setGoogleUser(null);
        setDemoTickets([]); 
        if (isTokenValid()) loadGoogleData(); 
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
        if (isDemoMode) {
            deactivateDemoMode();
        } else {
            logoutFromGoogle();
            setIsGoogleConnected(false);
            setGoogleUser(null);
            setGoogleEvents([]);
        }
    };

    const pendingTickets = useMemo(() => tickets.filter(t => t.status === TicketStatus.New), [tickets]);

    // Handle Selection Logic
    const togglePendingSelection = (id: string) => {
        setSelectedPendingIds(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedPendingIds.length === pendingTickets.length) {
            setSelectedPendingIds([]);
        } else {
            setSelectedPendingIds(pendingTickets.map(t => t.id));
        }
    };

    const handleScheduleSelected = () => {
        const selected = pendingTickets.filter(t => selectedPendingIds.includes(t.id));
        setTicketsToSchedule(selected);
        setIsPendingListOpen(false);
        setSelectedPendingIds([]); // Reset
    };

    const handleTicketScheduled = async () => { await fetchTickets(); if(isGoogleConnected && !isDemoMode) loadGoogleData(); };

    const handleOpenRoutePlanner = () => {
        if (isDemoMode) {
            setRouteTickets(demoTickets);
            setIsRouteModalOpen(true);
            return;
        }

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
        // DEMO MODE: Find mock ticket and open modal
        if (isDemoMode && ticketId.startsWith('demo-')) {
             const ticket = demoTickets.find(t => t.id === ticketId);
             if (ticket) {
                 setTicketModalMode('close');
                 setSelectedTicket(ticket);
             }
             return;
        }

        // REAL MODE: Open the closure modal to allow photo/desc entry
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
            setTicketModalMode('close');
            setSelectedTicket(ticket);
        }
    };

    const handleTicketUpdated = (updatedTicket: Ticket) => {
        // Handle Demo Mode Updates in Memory
        if (isDemoMode && updatedTicket.id.startsWith('demo-')) {
            setDemoTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
            setRouteTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
            setSelectedTicket(updatedTicket); // Keep modal updated
            return;
        }

        // Update general tickets list
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        // Update route tickets if open
        setRouteTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        // Update detail view if open
        setSelectedTicket(updatedTicket);
    };

    const combinedEvents = useMemo(() => {
        // We now only show APP events (Services), ignoring Google Events in the view
        const appEvents: CalendarEvent[] = tickets
            .filter(t => (t.status === TicketStatus.Scheduled || t.status === TicketStatus.Closed) && t.scheduledDate)
            .map(ticket => {
                const datePart = ticket.scheduledDate!.split('T')[0];
                const [year, month, day] = datePart.split('-').map(Number);
                const localDate = new Date(year, month - 1, day); 

                return {
                    title: `${ticket.title} - ${ticket.clientName}`,
                    start: localDate,
                    end: localDate,
                    allDay: true,
                    resource: { source: 'app', id: ticket.id },
                };
            });

        // Filter out Google Events from display
        return appEvents;
    }, [tickets]);

    const eventPropGetter = useCallback((event: CalendarEvent) => {
        const ticket = tickets.find(t => t.id === event.resource?.id);
        const isCompleted = ticket?.status === TicketStatus.Closed;
        
        // Premium Color Palette
        // Scheduled: Violet/Blue gradient feel
        // Closed: Emerald/Green
        
        let style: any = {
            borderLeft: '4px solid',
            color: isCompleted ? '#065f46' : '#1e40af', // Darker text for contrast
            backgroundColor: isCompleted ? '#d1fae5' : '#dbeafe', // bg-emerald-100 vs bg-blue-100
            borderLeftColor: isCompleted ? '#10b981' : '#3b82f6', // emerald-500 vs blue-500
            fontSize: '0.75rem',
            fontWeight: '600',
            borderRadius: '6px',
            padding: '4px 8px',
            opacity: isCompleted ? 0.8 : 1,
            textDecoration: isCompleted ? 'line-through' : 'none',
        };
        
        return { style };
    }, [tickets]);

    const handleSelectEvent = (event: CalendarEvent) => {
        if (event.resource?.source === 'app') {
            const ticket = tickets.find(t => t.id === event.resource?.id);
            if (ticket) {
                setTicketModalMode('details');
                setSelectedTicket(ticket);
            }
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div className="flex flex-col h-full bg-slate-100 min-h-screen relative animate-in fade-in duration-500">
            <style>{customCalendarStyles}</style>
            
            {/* --- HERO HEADER PREMIUM --- */}
            <div className="relative bg-slate-900 text-white pb-24 pt-10 px-6 md:px-10 shadow-2xl overflow-hidden shrink-0">
                {/* Background Decorativo */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-sky-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
                
                <div className="relative z-10 max-w-8xl mx-auto flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight mb-2">
                            Agenda Maestra
                        </h1>
                        <p className="text-slate-400 text-sm md:text-base font-medium flex items-center">
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-xs uppercase tracking-wide mr-2 border border-slate-700">Zona Horaria</span>
                            {userTimezone}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        {/* API Config Button */}
                        <button onClick={() => setIsSettingsOpen(true)} className="bg-white/5 hover:bg-white/10 text-slate-300 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm transition-colors" title="Configurar API">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>

                        {/* Google Connect Button */}
                        {!isGoogleConnected ? (
                            <button onClick={handleGoogleLogin} className="flex items-center bg-white text-slate-800 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors shadow-lg">
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-4 w-4 mr-2" /> 
                                Conectar Calendar
                            </button>
                        ) : (
                            <div className={`flex items-center px-4 py-2 rounded-xl backdrop-blur-md border shadow-sm ${isDemoMode ? 'bg-amber-500/20 border-amber-500/30 text-amber-100' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100'}`}>
                                {googleUser && <img src={googleUser.picture} className="h-6 w-6 rounded-full mr-2 border border-white/20" />}
                                <span className="text-xs font-bold mr-3">{isDemoMode ? 'Modo Demo' : 'Conectado'}</span>
                                <button onClick={handleLogout} className="text-xs opacity-70 hover:opacity-100 underline font-medium">Salir</button>
                            </div>
                        )}

                        {/* Pending Tickets Button */}
                        <button 
                            onClick={() => setIsPendingListOpen(true)} 
                            className="bg-sky-600 text-white border border-sky-500 px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg hover:bg-sky-500 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <span className="bg-white text-sky-700 rounded-full text-xs font-black px-1.5 py-0.5 mr-2 min-w-[20px] text-center">{pendingTickets.length}</span>
                            Pendientes
                        </button>
                        
                        {!isGoogleConnected && !isDemoMode && (
                             <button onClick={activateDemoMode} className="text-xs font-bold text-slate-400 hover:text-white px-3 py-2 rounded transition-colors uppercase tracking-wide border border-transparent hover:border-slate-700">
                                Probar Demo
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* --- CALENDAR CONTAINER (Overlap) --- */}
            <div className="max-w-8xl mx-auto px-4 w-full -mt-16 relative z-20 pb-10 flex-1 flex flex-col h-full">
                
                <div className="bg-white rounded-3xl shadow-xl h-full p-6 md:p-8 border border-slate-200 flex flex-col">
                    
                    {/* Toolbar & Route Picker Row */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 pb-6 border-b border-slate-100 gap-4">
                        <div className="flex items-center gap-4">
                            {/* Legend */}
                            <div className="flex items-center gap-3 text-sm font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                <div className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-blue-500 mr-2"></span>Agendado</div>
                                <div className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-emerald-500 mr-2"></span>Realizado</div>
                            </div>
                        </div>

                        {/* Route Date Picker */}
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner">
                            <input 
                                type="date" 
                                value={routeDate}
                                onChange={(e) => setRouteDate(e.target.value)}
                                className="text-sm font-bold text-slate-700 border-none focus:ring-0 rounded-lg px-3 py-1.5 bg-transparent cursor-pointer"
                            />
                            <button 
                                onClick={handleOpenRoutePlanner} 
                                className="bg-white text-slate-700 hover:text-sky-600 px-4 py-1.5 rounded-lg font-bold shadow-sm hover:shadow transition-all flex items-center ml-1 border border-slate-200"
                            >
                                <span className="mr-2 text-lg">🗺️</span> Ruta
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <Calendar 
                            localizer={localizer} 
                            events={combinedEvents} 
                            startAccessor="start" 
                            endAccessor="end" 
                            messages={messages}
                            culture="es" 
                            formats={calendarFormats} 
                            min={new Date(0, 0, 0, 8, 0, 0)} 
                            max={new Date(0, 0, 0, 20, 0, 0)} 
                            eventPropGetter={eventPropGetter} 
                            onSelectEvent={handleSelectEvent} 
                            views={['month', 'week', 'day']} 
                            defaultView='month' 
                            className="h-full" 
                        />
                    </div>
                </div>
            </div>

            {/* Modals remain mostly unchanged but functional */}
            {isPendingListOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] flex justify-center items-center p-4 animate-in fade-in" onClick={() => setIsPendingListOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] border border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center shrink-0">
                            <h3 className="font-black text-lg text-slate-800 flex items-center">
                                <span className="bg-slate-200 p-1.5 rounded-lg mr-2">📋</span> Tickets Sin Agendar
                            </h3>
                            {selectedPendingIds.length > 0 && (
                                <button 
                                    onClick={handleScheduleSelected} 
                                    className="bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-sky-700 transition-colors animate-in fade-in zoom-in"
                                >
                                    Agendar Seleccionados ({selectedPendingIds.length})
                                </button>
                            )}
                            <button onClick={() => setIsPendingListOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">✕</button>
                        </div>
                        
                        <div className="bg-slate-50 px-5 py-2 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={pendingTickets.length > 0 && selectedPendingIds.length === pendingTickets.length}
                                    onChange={toggleSelectAll}
                                    className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 mr-3 cursor-pointer"
                                    disabled={pendingTickets.length === 0}
                                />
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Seleccionar Todos</span>
                            </div>
                            <span className="text-[10px] text-slate-400 italic">Haz clic en la tarjeta para ver detalles</span>
                        </div>

                        <div className="p-4 overflow-y-auto bg-white flex-1 space-y-3">
                            {pendingTickets.map(t => (
                                <div 
                                    key={t.id} 
                                    onClick={() => {
                                        setTicketModalMode('details');
                                        setSelectedTicket(t);
                                    }}
                                    className={`p-4 rounded-xl border flex items-center transition-all cursor-pointer group ${selectedPendingIds.includes(t.id) ? 'bg-sky-50 border-sky-200 ring-1 ring-sky-100' : 'bg-white border-slate-100 hover:border-sky-200 hover:shadow-md'}`}
                                >
                                    <div className="mr-4" onClick={e => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedPendingIds.includes(t.id)}
                                            onChange={() => togglePendingSelection(t.id)}
                                            className="rounded text-sky-600 focus:ring-sky-500 h-5 w-5 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between">
                                            <p className="font-bold text-slate-800 truncate text-sm">{t.title}</p>
                                            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold uppercase">{t.priority}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 truncate font-medium flex items-center">
                                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full mr-2"></span>
                                            {t.clientName}
                                        </p>
                                    </div>
                                    <div className="ml-2 text-slate-300 group-hover:text-sky-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                </div>
                            ))}
                            {pendingTickets.length === 0 && (
                                <div className="text-center py-10">
                                    <div className="text-4xl mb-2">🎉</div>
                                    <p className="text-slate-500 font-bold">¡Todo al día!</p>
                                    <p className="text-xs text-slate-400">No hay tickets pendientes de agendar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {isSettingsOpen && <ApiSettingsModal onClose={() => setIsSettingsOpen(false)} onSaved={() => { if(hasValidConfig()) { setIsGoogleConnected(true); initGoogleClient(loadGoogleData); } }} />}
            {ticketsToSchedule.length > 0 && (
                <ScheduleTicketModal 
                    tickets={ticketsToSchedule} 
                    onClose={() => setTicketsToSchedule([])} 
                    onTicketScheduled={handleTicketScheduled} 
                />
            )}
            {isRouteModalOpen && <RoutePlannerModal tickets={routeTickets} onClose={() => setIsRouteModalOpen(false)} onTicketComplete={(id) => handleTicketCompletedFromRoute(id)} isDemoMode={isDemoMode} />}
            {selectedTicket && <TicketDetailsModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onTicketUpdated={handleTicketUpdated} initialMode={ticketModalMode} />}
        </div>
    );
};
export default Maintenance;
