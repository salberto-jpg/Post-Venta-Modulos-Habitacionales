
import React, { useMemo } from 'react';
import { type Ticket, TicketStatus } from '../types';
import { GOOGLE_API_KEY } from '../config';

interface RoutePlannerModalProps {
    tickets: Ticket[];
    onClose: () => void;
    onTicketComplete: (ticketId: string) => void;
}

const RoutePlannerModal: React.FC<RoutePlannerModalProps> = ({ tickets, onClose, onTicketComplete }) => {

    const googleMapsUrl = useMemo(() => {
        // The previous URL (google.com/maps/dir/...) is not embeddable in an iframe
        // due to Google's 'X-Frame-Options' header. The correct method is to use the
        // Google Maps Embed API, which requires an API key. In this prototype, a missing
        // key will show a proper Google error instead of a broken image icon.
        if (tickets.length < 2) return '';

        const origin = `${tickets[0].latitude},${tickets[0].longitude}`;
        const destination = `${tickets[tickets.length - 1].latitude},${tickets[tickets.length - 1].longitude}`;
        
        const waypoints = tickets
            .slice(1, -1)
            .map(t => `${t.latitude},${t.longitude}`)
            .join('|');

        const baseUrl = `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_API_KEY}&travelmode=driving`;
        let url = `${baseUrl}&origin=${origin}&destination=${destination}`;

        if (waypoints) {
            url += `&waypoints=${waypoints}`;
        }
    
        return url;
    }, [tickets]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] mx-4 my-8 flex flex-col overflow-hidden border border-slate-300" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Ruta de Mantenimiento de Hoy</h2>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-grow p-2 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
                    <div className="md:col-span-1 overflow-y-auto pr-2">
                        <h3 className="text-lg font-semibold text-slate-700 mb-3">Paradas de la Ruta ({tickets.length})</h3>
                        <ol className="space-y-3">
                            {tickets.map((ticket) => (
                                <li key={ticket.id} className="bg-slate-200/70 p-3 rounded-md list-decimal list-inside">
                                    <div className="ml-2">
                                        <p className="font-semibold text-slate-800">{ticket.title}</p>
                                        <p className="text-sm text-slate-600">{ticket.clientName} - {ticket.moduleSerial}</p>
                                        <a
                                            href={`https://www.google.com/maps?q=${ticket.latitude},${ticket.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-sky-600 hover:underline"
                                        >
                                            Ver ubicación
                                        </a>
                                        <div className="mt-2">
                                            {ticket.status !== TicketStatus.Closed ? (
                                                <button 
                                                    onClick={() => onTicketComplete(ticket.id)}
                                                    className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
                                                >
                                                    Marcar como Completado
                                                </button>
                                            ) : (
                                                <p className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-200 rounded-md inline-block">
                                                    ✓ Completado
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="md:col-span-2 h-full">
                        {googleMapsUrl ? (
                            <iframe
                                src={googleMapsUrl}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen={false}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                className="rounded-md"
                            ></iframe>
                        ) : (
                            <div className="flex items-center justify-center h-full bg-slate-200 rounded-md">
                                <p className="text-slate-500">No se puede generar la ruta.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-100 border-t border-slate-300 flex justify-end items-center">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-sky-600 text-white shadow-sm hover:bg-sky-700">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoutePlannerModal;