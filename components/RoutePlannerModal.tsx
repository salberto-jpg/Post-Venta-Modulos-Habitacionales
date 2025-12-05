
import React, { useMemo, useState } from 'react';
import { type Ticket, TicketStatus } from '../types';
import { getApiConfig } from '../services/googleCalendarService';
import MessageModal from './MessageModal';

interface RoutePlannerModalProps {
    tickets: Ticket[];
    onClose: () => void;
    onTicketComplete: (ticketId: string) => void;
}

const RoutePlannerModal: React.FC<RoutePlannerModalProps> = ({ tickets, onClose, onTicketComplete }) => {
    // Obtener la API Key dinámica guardada por el usuario
    const { apiKey } = getApiConfig();
    
    // Estado para el modal de confirmación
    const [ticketToComplete, setTicketToComplete] = useState<string | null>(null);

    // URL para EMBEBER en la página (Vista previa estática/interactiva básica)
    const googleMapsEmbedUrl = useMemo(() => {
        if (tickets.length < 1 || !apiKey) return ''; 

        // Si solo hay 1 ticket, mostramos place mode
        if (tickets.length === 1) {
            return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${tickets[0].latitude},${tickets[0].longitude}`;
        }

        const origin = `${tickets[0].latitude},${tickets[0].longitude}`;
        const destination = `${tickets[tickets.length - 1].latitude},${tickets[tickets.length - 1].longitude}`;
        
        const waypoints = tickets
            .slice(1, -1)
            .map(t => `${t.latitude},${t.longitude}`)
            .join('|');

        // Embed API usa 'mode' (driving, walking, bicycling, flying, transit)
        const baseUrl = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&mode=driving`;
        let url = `${baseUrl}&origin=${origin}&destination=${destination}`;

        if (waypoints) {
            url += `&waypoints=${waypoints}`;
        }
    
        return url;
    }, [tickets, apiKey]);

    // URL general de ruta (Link externo a Google Maps - No requiere API Key para abrir la web)
    const googleMapsNavigationUrl = useMemo(() => {
        if (tickets.length === 0) return '';
        const origin = `${tickets[0].latitude},${tickets[0].longitude}`;
        const destination = `${tickets[tickets.length - 1].latitude},${tickets[tickets.length - 1].longitude}`;
        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
        const waypoints = tickets.slice(1, -1).map(t => `${t.latitude},${t.longitude}`).join('|');
        if (waypoints) url += `&waypoints=${waypoints}`;
        return url;
    }, [tickets]);

    // Función para obtener link Waze
    const getWazeLink = (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    // Función para obtener link Google Maps directo al punto
    const getMapsLink = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    const handleConfirmComplete = () => {
        if (ticketToComplete) {
            onTicketComplete(ticketToComplete);
            setTicketToComplete(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] mx-4 my-8 flex flex-col overflow-hidden border border-slate-300" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center">
                            <span className="mr-2">🚛</span> Ruta de Servicio
                        </h2>
                        <p className="text-sm text-slate-500">{tickets.length} paradas programadas</p>
                    </div>
                    
                    <div className="flex gap-3">
                        <a 
                            href={googleMapsNavigationUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 hover:shadow-lg transition-all flex items-center animate-pulse"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            Iniciar Ruta Completa
                        </a>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
                    {/* Lista de Pasos (Izquierda) */}
                    <div className="md:col-span-5 lg:col-span-4 overflow-y-auto pr-2 h-full custom-scrollbar bg-slate-100 p-2 rounded-lg">
                        <div className="space-y-4 pb-4">
                            {tickets.map((ticket, index) => {
                                const isCompleted = ticket.status === TicketStatus.Closed;
                                const isLast = index === tickets.length - 1;
                                
                                return (
                                    <div key={ticket.id} className={`relative p-4 rounded-xl border-2 transition-all ${isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-sky-300 shadow-sm'}`}>
                                        {/* Conector visual de ruta */}
                                        {!isLast && (
                                            <div className="absolute left-8 bottom-[-24px] w-0.5 h-8 bg-slate-300 z-0"></div>
                                        )}
                                        
                                        <div className="flex items-start relative z-10">
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm shrink-0 mr-3 shadow-sm ${isCompleted ? 'bg-emerald-500' : 'bg-sky-600'}`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-slate-800 text-sm truncate" title={ticket.clientName}>{ticket.clientName}</h4>
                                                    {isCompleted && <span className="text-emerald-600 text-[10px] uppercase font-extrabold border border-emerald-200 px-1.5 rounded bg-white">Hecho</span>}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5 font-mono">{ticket.moduleSerial}</p>
                                                <p className="text-xs text-slate-600 font-medium mt-1 truncate">{ticket.title}</p>
                                                
                                                {!isCompleted && (
                                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                                        <a 
                                                            href={getMapsLink(ticket.latitude!, ticket.longitude!)}
                                                            target="_blank"
                                                            rel="noreferrer" 
                                                            className="flex items-center justify-center px-2 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded hover:bg-sky-100 transition-colors"
                                                            title="Abrir en Google Maps"
                                                        >
                                                            📍 Maps
                                                        </a>
                                                        <a 
                                                            href={getWazeLink(ticket.latitude!, ticket.longitude!)}
                                                            target="_blank"
                                                            rel="noreferrer" 
                                                            className="flex items-center justify-center px-2 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded hover:bg-blue-100 transition-colors"
                                                            title="Abrir en Waze"
                                                        >
                                                            🚙 Waze
                                                        </a>
                                                    </div>
                                                )}

                                                <div className="mt-2">
                                                    {!isCompleted ? (
                                                        <button 
                                                            onClick={() => setTicketToComplete(ticket.id)}
                                                            className="w-full px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center"
                                                        >
                                                            <span className="mr-1">✓</span> Marcar Completado
                                                        </button>
                                                    ) : (
                                                        <div className="w-full px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 rounded border border-emerald-200 text-center">
                                                            Servicio Finalizado
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mapa (Derecha) */}
                    <div className="md:col-span-7 lg:col-span-8 h-full bg-slate-200 rounded-xl overflow-hidden shadow-inner border border-slate-300 relative">
                        {apiKey ? (
                            googleMapsEmbedUrl ? (
                                <iframe
                                    src={googleMapsEmbedUrl}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen={false}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="w-full h-full"
                                ></iframe>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <span className="text-4xl mb-2">🗺️</span>
                                    <p>No se puede previsualizar la ruta (faltan coordenadas).</p>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                                <span className="text-4xl mb-4">⚙️</span>
                                <h3 className="font-bold text-lg text-slate-700">API Key No Configurada</h3>
                                <p className="mb-4 text-sm">Para ver el mapa, ve a la sección <b>Agenda</b>, haz clic en el engranaje ⚙️ e ingresa tu Google Cloud API Key.</p>
                            </div>
                        )}
                        
                        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg text-xs font-medium text-slate-600 shadow-sm border border-slate-200">
                             Vista previa de la ruta completa
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Confirmación Estético */}
            <MessageModal 
                isOpen={!!ticketToComplete}
                onClose={() => setTicketToComplete(null)}
                title="¿Finalizar Servicio?"
                message="Confirmas que has realizado el servicio. El ticket se marcará como cerrado y completado."
                type="success"
                onConfirm={handleConfirmComplete}
                confirmText="Sí, Completar"
                cancelText="Cancelar"
            />
        </div>
    );
};

export default RoutePlannerModal;
