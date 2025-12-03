
import React from 'react';
import { type Module, type Ticket, TicketStatus } from '../types';

interface ModuleInstanceDetailsProps {
    moduleInstance: Module;
    history: Ticket[];
    onBack: () => void;
}

const ModuleInstanceDetails: React.FC<ModuleInstanceDetailsProps> = ({ moduleInstance, history, onBack }) => {
    
    // Sort history by date desc
    const sortedHistory = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-lg shadow-sm border border-slate-200">
            {/* Header */}
            <div className="p-6 bg-white border-b border-slate-200">
                <button onClick={onBack} className="text-sm text-slate-500 hover:text-sky-600 mb-4 flex items-center">
                    &larr; Volver al Legajo
                </button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{moduleInstance.modelName}</h1>
                        <div className="flex items-center mt-2 space-x-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">ID Trazabilidad (Serial)</span>
                                <span className="font-mono text-lg font-medium text-slate-700 bg-slate-100 px-2 rounded border border-slate-200">
                                    {moduleInstance.serialNumber}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-slate-300"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Instalación</span>
                                <span className="text-sm font-medium text-slate-700">
                                    {new Date(moduleInstance.installationDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Geolocation Section */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center">
                            <MapPinIcon className="h-5 w-5 mr-2 text-sky-600" />
                            Ubicación Geográfica
                        </h3>
                    </div>
                    <div className="h-64 bg-slate-200 relative">
                        {moduleInstance.latitude && moduleInstance.longitude ? (
                            <iframe 
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                scrolling="no" 
                                marginHeight={0} 
                                marginWidth={0} 
                                src={`https://maps.google.com/maps?q=${moduleInstance.latitude},${moduleInstance.longitude}&z=15&output=embed`}
                                title="Module Location"
                            ></iframe>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <MapPinIcon className="h-10 w-10 mb-2 opacity-50" />
                                <p>Sin coordenadas registradas</p>
                            </div>
                        )}
                        {moduleInstance.address && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-2 text-xs text-center border-t border-slate-200">
                                {moduleInstance.address}
                            </div>
                        )}
                    </div>
                </div>

                {/* Service History Timeline */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center">
                            <ClipboardDocumentListIcon className="h-5 w-5 mr-2 text-sky-600" />
                            Historial de Eventos y Servicios
                        </h3>
                    </div>
                    <div className="p-6">
                        {sortedHistory.length > 0 ? (
                            <div className="space-y-6 relative border-l-2 border-slate-200 ml-2">
                                {sortedHistory.map(ticket => (
                                    <div key={ticket.id} className="relative pl-6">
                                        <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${
                                            ticket.status === TicketStatus.Closed ? 'bg-emerald-500' : 
                                            ticket.status === TicketStatus.New ? 'bg-red-500' : 'bg-sky-500'
                                        }`}></div>
                                        <div>
                                            <span className="text-xs text-slate-400 font-medium block mb-1">
                                                {new Date(ticket.createdAt).toLocaleString()}
                                            </span>
                                            <div className="bg-slate-50 rounded-md p-3 border border-slate-100">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-semibold text-slate-800 text-sm">{ticket.title}</h4>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                        ticket.status === TicketStatus.Closed ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                                                    }`}>
                                                        {ticket.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600">{ticket.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <p className="text-center text-slate-500 py-4 text-sm">Este módulo no tiene historial de servicios.</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

const ClipboardDocumentListIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
);

export default ModuleInstanceDetails;
