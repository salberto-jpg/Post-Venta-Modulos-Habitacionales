import React, { useState } from 'react';
import { type Ticket, TicketStatus, Priority } from '../types';
import { updateTicketStatus } from '../services/supabaseService';
import Spinner from './Spinner';

interface TicketDetailsModalProps {
    ticket: Ticket;
    onClose: () => void;
    onStatusChange: (ticketId: string, newStatus: TicketStatus) => void;
}

const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({ ticket, onClose, onStatusChange }) => {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (newStatus: TicketStatus) => {
        setIsUpdating(true);
        try {
            await updateTicketStatus(ticket.id, newStatus);
            onStatusChange(ticket.id, newStatus);
        } catch (error) {
            console.error("Failed to update ticket status:", error);
            // Here you might want to show an error message to the user
        } finally {
            setIsUpdating(false);
        }
    };
    
    const getStatusBadgeClass = (status: TicketStatus) => {
        switch (status) {
            case TicketStatus.New: return 'bg-sky-100 text-sky-800';
            case TicketStatus.InProgress: return 'bg-amber-100 text-amber-800';
            case TicketStatus.Scheduled: return 'bg-violet-100 text-violet-800';
            case TicketStatus.Closed: return 'bg-emerald-100 text-emerald-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getPriorityBadgeClass = (priority: Priority) => {
        switch (priority) {
            case Priority.High: return 'bg-red-100 text-red-800';
            case Priority.Medium: return 'bg-amber-100 text-amber-800';
            case Priority.Low: return 'bg-sky-100 text-sky-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8 overflow-hidden border border-slate-300" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{ticket.title}</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Cliente: {ticket.clientName} | Módulo: {ticket.moduleSerial}
                            </p>
                            <p className="text-sm text-slate-500">
                                Creado: {new Date(ticket.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="mb-6">
                        <h3 className="font-semibold text-slate-700 mb-2">Descripción del Problema</h3>
                        <p className="text-slate-600 bg-slate-200/70 p-4 rounded-md">{ticket.description}</p>
                    </div>

                    {ticket.scheduledDate && (
                         <div className="mb-6">
                            <h3 className="font-semibold text-slate-700 mb-2">Fecha Agendada</h3>
                            <p className="text-slate-600 font-medium text-violet-700 bg-violet-100 p-3 rounded-md inline-block">{new Date(ticket.scheduledDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    )}
                    
                    {ticket.latitude && ticket.longitude && (
                        <div className="mb-6">
                            <h3 className="font-semibold text-slate-700 mb-2">Ubicación del Módulo</h3>
                            <a 
                                href={`https://www.google.com/maps?q=${ticket.latitude},${ticket.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sky-600 hover:text-sky-800 bg-sky-100 p-3 rounded-md font-medium transition-colors"
                            >
                                <MapPinIcon className="h-5 w-5 mr-2" />
                                Ver en Google Maps
                            </a>
                        </div>
                    )}

                    {ticket.photos.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-semibold text-slate-700 mb-2">Fotos Adjuntas</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {ticket.photos.map((photo, index) => (
                                    <a href={photo} target="_blank" rel="noopener noreferrer" key={index} className="block rounded-lg overflow-hidden border-2 border-transparent hover:border-sky-500 transition">
                                        <img src={photo} alt={`Ticket photo ${index + 1}`} className="object-cover w-full h-32" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mb-2">
                        <h3 className="font-semibold text-slate-700 mb-2">Detalles</h3>
                        <div className="flex items-center space-x-4">
                             <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeClass(ticket.status)}`}>
                                {ticket.status}
                            </span>
                             <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getPriorityBadgeClass(ticket.priority)}`}>
                                Prioridad: {ticket.priority}
                            </span>
                        </div>
                    </div>

                </div>
                 <div className="p-6 bg-slate-100 border-t border-slate-300 flex justify-end items-center space-x-3">
                    <span className="text-sm font-medium text-slate-600">Cambiar estado:</span>
                    {isUpdating ? <Spinner /> : (
                        <div className="flex space-x-2">
                            {Object.values(TicketStatus).map(status => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    disabled={ticket.status === status}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                        ticket.status === status
                                            ? 'bg-sky-600 text-white shadow-sm'
                                            : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    )}
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

export default TicketDetailsModal;
