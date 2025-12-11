
import React, { useMemo, useState } from 'react';
import { type Ticket, TicketStatus } from '../types';
import { getApiConfig } from '../services/googleCalendarService';

interface RoutePlannerModalProps {
    tickets: Ticket[];
    onClose: () => void;
    onTicketComplete: (ticketId: string) => void;
    isDemoMode?: boolean;
}

const RoutePlannerModal: React.FC<RoutePlannerModalProps> = ({ tickets, onClose, onTicketComplete, isDemoMode = false }) => {
    const { apiKey } = getApiConfig();
    
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

    const getWazeLink = (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    const getMapsLink = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    // Helper para posiciones simuladas (Demo Mode)
    const getSimulatedPosition = (index: number, total: number) => {
        const positions = [
            { x: 20, y: 20 },
            { x: 45, y: 35 },
            { x: 30, y: 60 },
            { x: 70, y: 75 },
            { x: 85, y: 40 },
        ];
        if (index < positions.length) return positions[index];
        const stepY = 80 / (total + 1); 
        const isEven = index % 2 === 0;
        const top = 15 + (index * stepY) % 70; 
        const left = isEven ? 25 : 75;
        return { x: left, y: top };
    };

    const simulatedPoints = useMemo(() => {
        return tickets.map((t, i) => {
            const pos = getSimulatedPosition(i, tickets.length);
            return { ...t, simX: pos.x, simY: pos.y };
        });
    }, [tickets]);

    const svgPolylinePoints = simulatedPoints.map(p => `${p.simX},${p.simY}`).join(' ');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] mx-4 my-8 flex flex-col overflow-hidden border border-slate-300" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center">
                            <span className="mr-2">🚛</span> Ruta de Servicio
                            {isDemoMode && <span className="ml-3 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold uppercase border border-amber-200">Modo Demo</span>}
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                                                            onClick={() => onTicketComplete(ticket.id)}
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
                        {apiKey && googleMapsEmbedUrl && !isDemoMode ? (
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
                        ) : isDemoMode ? (
                            /* SIMULACIÓN AVANZADA DE GOOGLE MAPS PARA DEMO */
                            <div className="relative w-full h-full bg-[#E5E3DF] overflow-hidden group">
                                <div 
                                    className="absolute inset-0 w-full h-full bg-cover bg-center opacity-80"
                                    style={{ 
                                        backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Map_of_Milan.svg/2000px-Map_of_Milan.svg.png)',
                                        filter: 'grayscale(0.1) contrast(0.9) brightness(1.1)' 
                                    }}
                                ></div>
                                <div className="absolute top-3 left-3 flex gap-0 shadow-md rounded-sm overflow-hidden z-20">
                                    <div className="bg-white px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50">Mapa</div>
                                    <div className="bg-white px-3 py-2 text-xs font-medium text-slate-500 border-l cursor-pointer hover:bg-slate-50">Satélite</div>
                                </div>
                                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                                     <polyline 
                                        points={svgPolylinePoints}
                                        fill="none" 
                                        stroke="rgba(0,0,0,0.2)" 
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        transform="translate(0.5, 0.5)"
                                     />
                                     <polyline 
                                        points={svgPolylinePoints}
                                        fill="none" 
                                        stroke="#4285F4" 
                                        strokeWidth="1.2" 
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeOpacity="0.9"
                                     />
                                     {simulatedPoints.slice(0, -1).map((p, i) => {
                                         const next = simulatedPoints[i+1];
                                         const midX = (p.simX + next.simX) / 2;
                                         const midY = (p.simY + next.simY) / 2;
                                         return <circle key={`dot-${i}`} cx={midX} cy={midY} r="0.3" fill="white" fillOpacity="0.8" />
                                     })}
                                </svg>
                                {simulatedPoints.map((t, i) => {
                                    const isDone = t.status === TicketStatus.Closed;
                                    const isLast = i === simulatedPoints.length - 1;
                                    const bgColor = isDone ? 'bg-slate-500' : (isLast ? 'bg-red-600' : 'bg-red-500'); 
                                    return (
                                        <div 
                                            key={t.id} 
                                            className="absolute transform -translate-x-1/2 -translate-y-full z-30 cursor-pointer group hover:z-40"
                                            style={{ top: `${t.simY}%`, left: `${t.simX}%` }}
                                            title={t.address}
                                            onClick={() => !isDone && onTicketComplete(t.id)}
                                        >
                                            <div className="relative flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full ${bgColor} border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-sm z-20 hover:scale-110 transition-transform`}>
                                                    {isDone ? '✓' : i + 1}
                                                </div>
                                                <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] ${isDone ? 'border-t-slate-500' : (isLast ? 'border-t-red-600' : 'border-t-red-500')} -mt-1 shadow-sm`}></div>
                                                <div className="w-3 h-1.5 bg-black/20 rounded-full blur-[1px] mt-0"></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center bg-slate-50">
                                <span className="text-4xl mb-4">⚙️</span>
                                <h3 className="font-bold text-lg text-slate-700">API Key No Configurada</h3>
                                <p className="mb-4 text-sm">Para ver el mapa real, ve a la configuración.</p>
                            </div>
                        )}
                        {!isDemoMode && apiKey && <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg text-xs font-medium text-slate-600 shadow-sm border border-slate-200">Vista previa de la ruta completa</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoutePlannerModal;
