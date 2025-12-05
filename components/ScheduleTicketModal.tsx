import React, { useState } from 'react';
import { scheduleTicket } from '../services/supabaseService';
import { createGoogleCalendarEvent } from '../services/googleCalendarService';
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
    const [syncWithGoogle, setSyncWithGoogle] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scheduleDate) {
            setError('Por favor, selecciona una fecha.');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            // 1. Actualizar en Supabase (Base de datos principal)
            await scheduleTicket(ticket.id, scheduleDate);

            // 2. Crear evento en Google Calendar (si está marcado)
            if (syncWithGoogle) {
                const locationStr = ticket.latitude && ticket.longitude 
                    ? `https://maps.google.com/?q=${ticket.latitude},${ticket.longitude}` 
                    : ticket.address || '';

                const googleSuccess = await createGoogleCalendarEvent({
                    title: `${ticket.title} - ${ticket.clientName}`,
                    description: `Cliente: ${ticket.clientName}\nMódulo: ${ticket.moduleSerial}\nDescripción: ${ticket.description}`,
                    date: scheduleDate,
                    location: locationStr
                });

                if (!googleSuccess) {
                    console.warn("No se pudo sincronizar con Google Calendar (posiblemente no conectado o error de permisos).");
                    // No bloqueamos el flujo, pero podríamos avisar con un toast/alerta suave
                }
            }

            onTicketScheduled();
            onClose();
        } catch (err) {
            setError('Hubo un error al agendar la visita. Inténtalo de nuevo.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden border border-slate-300" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200">
                        <div className="flex justify-between items-start">
                             <div>
                                <h2 className="text-2xl font-bold text-slate-800">Agendar Visita</h2>
                                <p className="text-sm text-slate-500 mt-1">{ticket.title}</p>
                            </div>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="scheduleDate" className="block text-sm font-medium text-slate-600">Seleccionar Fecha de la Visita</label>
                            <input 
                                type="date" 
                                id="scheduleDate" 
                                value={scheduleDate} 
                                onChange={e => setScheduleDate(e.target.value)} 
                                min={today}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500" 
                                required 
                            />
                        </div>

                        <div className="flex items-center bg-white p-3 rounded-md border border-slate-200">
                            <input 
                                id="googleSync" 
                                type="checkbox" 
                                checked={syncWithGoogle} 
                                onChange={e => setSyncWithGoogle(e.target.checked)}
                                className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                            />
                            <label htmlFor="googleSync" className="ml-2 block text-sm text-slate-700 font-medium cursor-pointer">
                                Sincronizar con Google Calendar
                            </label>
                        </div>

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    </div>

                    <div className="p-6 bg-slate-100 border-t border-slate-300 flex justify-end items-center space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-white text-slate-700 hover:bg-slate-50 border border-slate-300">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium rounded-md bg-sky-600 text-white shadow-sm hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed flex items-center">
                            {isLoading ? <Spinner /> : 'Confirmar Agenda'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleTicketModal;