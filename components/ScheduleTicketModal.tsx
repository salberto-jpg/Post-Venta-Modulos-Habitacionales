
import React, { useState } from 'react';
import { scheduleTicket } from '../services/supabaseService';
import { createGoogleCalendarEvent, isTokenValid, logoutFromGoogle } from '../services/googleCalendarService';
import { type Ticket } from '../types';
import Spinner from './Spinner';

interface ScheduleTicketModalProps {
    ticket: Ticket;
    onClose: () => void;
    onTicketScheduled: () => void;
}

const ScheduleTicketModal: React.FC<ScheduleTicketModalProps> = ({ ticket, onClose, onTicketScheduled }) => {
    const today = new Date().toISOString().split('T')[0];
    const [scheduleDate, setScheduleDate] = useState(today);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [syncWithGoogle, setSyncWithGoogle] = useState(isTokenValid()); // Default true if logged in

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // 1. Supabase Update
            await scheduleTicket(ticket.id, scheduleDate);

            // 2. Google Calendar
            if (syncWithGoogle) {
                // Crear URL de Maps para el campo 'location'
                let locString = ticket.address || '';
                if (ticket.latitude && ticket.longitude) {
                    // Formato que Google Calendar reconoce bien como ubicación mapable
                    locString = `https://www.google.com/maps/search/?api=1&query=${ticket.latitude},${ticket.longitude}`;
                }

                const success = await createGoogleCalendarEvent({
                    title: `${ticket.title} - ${ticket.clientName}`,
                    description: `Cliente: ${ticket.clientName}\nMódulo: ${ticket.moduleSerial}\nDescripción: ${ticket.description}\n\nVer en App: [Link interno]`,
                    date: scheduleDate,
                    location: locString
                });

                if (!success) {
                    // Si falla, es probable que sea error de permisos (403)
                    if (window.confirm("El ticket se agendó en la App, pero falló Google Calendar (Error 403).\n\nEs probable que necesites renovar permisos de escritura.\n\n¿Quieres cerrar sesión de Google ahora para reconectar?")) {
                        logoutFromGoogle();
                        window.location.reload();
                    }
                }
            }

            onTicketScheduled();
            onClose();
        } catch (err) {
            setError('Error al agendar. Intenta de nuevo.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-50 p-4 border-b">
                    <h3 className="font-bold text-lg text-slate-800">Agendar Visita Técnica</h3>
                    <p className="text-sm text-slate-500">{ticket.title}</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Fecha</label>
                        <input type="date" value={scheduleDate} min={today} onChange={e => setScheduleDate(e.target.value)} className="w-full border p-2 rounded focus:ring-2 ring-sky-500 outline-none" required />
                    </div>

                    <div className="flex items-center p-3 bg-slate-50 rounded border border-slate-200">
                        <input 
                            type="checkbox" 
                            id="gSync" 
                            checked={syncWithGoogle} 
                            onChange={e => setSyncWithGoogle(e.target.checked)} 
                            className="h-4 w-4 text-sky-600 rounded"
                            disabled={!isTokenValid()}
                        />
                        <div className="ml-3">
                            <label htmlFor="gSync" className={`text-sm font-bold block ${!isTokenValid() ? 'text-slate-400' : 'text-slate-700'}`}>Sincronizar Google Calendar</label>
                            {!isTokenValid() && <p className="text-xs text-amber-500">Conecta tu cuenta en la Agenda primero.</p>}
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-sky-600 text-white font-bold rounded shadow hover:bg-sky-700 disabled:opacity-50">
                            {isLoading ? <Spinner /> : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleTicketModal;
