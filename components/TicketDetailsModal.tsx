import React, { useState } from 'react';
import { type Ticket, TicketStatus, Priority } from '../types';
import { updateTicketStatus, updateTicket, deleteTicket, uploadFileToStorage } from '../services/supabaseService';
import Spinner from './Spinner';
import FileDropzone from './FileDropzone';
import ConfirmModal from './ConfirmModal';

interface TicketDetailsModalProps {
    ticket: Ticket;
    onClose: () => void;
    onTicketUpdated: (ticket: Ticket) => void;
}

const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({ ticket: initialTicket, onClose, onTicketUpdated }) => {
    const [ticket, setTicket] = useState(initialTicket);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(initialTicket.title);
    const [editDescription, setEditDescription] = useState(initialTicket.description);
    const [editPriority, setEditPriority] = useState<Priority>(initialTicket.priority);
    const [currentPhotos, setCurrentPhotos] = useState<string[]>(initialTicket.photos || []);
    const [newPhotos, setNewPhotos] = useState<File[]>([]);
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const formatBytes = (bytes: number) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
    };

    const handleStatusChange = async (newStatus: TicketStatus) => {
        setIsUpdating(true);
        try {
            await updateTicketStatus(ticket.id, newStatus);
            const updatedTicket = { ...ticket, status: newStatus };
            setTicket(updatedTicket);
            onTicketUpdated(updatedTicket);
        } catch (error) {
            console.error("Failed to update ticket status:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemovePhoto = (index: number) => {
        setCurrentPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleNewFilesSelected = (files: File[]) => {
        setNewPhotos(prev => [...prev, ...files]);
    };

    const handleRemoveNewPhoto = (index: number) => {
        setNewPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveEdit = async () => {
        setIsUpdating(true);
        try {
            // Upload new photos first
            const uploadedUrls: string[] = [];
            for (const file of newPhotos) {
                const url = await uploadFileToStorage(file, 'files', `tickets/${Date.now()}_${file.name}`);
                if (url) uploadedUrls.push(url);
            }

            // Combine existing (kept) photos with new ones
            const finalPhotos = [...currentPhotos, ...uploadedUrls];

            const updates = {
                title: editTitle,
                description: editDescription,
                priority: editPriority,
                photos: finalPhotos
            };

            await updateTicket(ticket.id, updates);

            const updatedTicket = { ...ticket, ...updates };
            setTicket(updatedTicket);
            
            // Reset temp state
            setNewPhotos([]);
            setIsEditing(false);
            
            // Notify parent to update the list
            onTicketUpdated(updatedTicket);
        } catch (error) {
            console.error("Failed to update ticket details:", error);
            alert("Error al actualizar el ticket: " + (error as any).message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        setShowDeleteConfirm(false); // Close modal
        setIsDeleting(true);
        try {
            await deleteTicket(ticket.id);
            onClose();
            window.location.reload(); 
        } catch (error: any) {
            console.error("Failed to delete ticket:", error);
            alert("Error al eliminar el ticket: " + (error.message || "Verifique que RLS esté desactivado en Supabase."));
            setIsDeleting(false);
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
            <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8 overflow-hidden border border-slate-300 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 bg-white shrink-0">
                    <div className="flex justify-between items-start">
                        <div className="w-full mr-4">
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={editTitle} 
                                    onChange={e => setEditTitle(e.target.value)} 
                                    className="text-2xl font-bold text-slate-800 w-full border-b border-sky-300 focus:outline-none focus:border-sky-600 bg-transparent"
                                />
                            ) : (
                                <h2 className="text-2xl font-bold text-slate-800">{ticket.title}</h2>
                            )}
                            <p className="text-sm text-slate-500 mt-1">
                                Cliente: {ticket.clientName} | Módulo: {ticket.moduleSerial}
                            </p>
                            <p className="text-sm text-slate-500">
                                Creado: {new Date(ticket.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="text-sky-600 hover:text-sky-800 p-2 rounded hover:bg-sky-50 transition-colors" title="Editar Ticket">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                </button>
                            )}
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded hover:bg-slate-100 transition-colors">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-6">
                        <h3 className="font-semibold text-slate-700 mb-2">Descripción del Problema</h3>
                        {isEditing ? (
                            <textarea 
                                value={editDescription} 
                                onChange={e => setEditDescription(e.target.value)} 
                                rows={4}
                                className="w-full text-slate-600 bg-white border border-slate-300 p-3 rounded-md focus:ring-sky-500 focus:border-sky-500"
                            />
                        ) : (
                            <p className="text-slate-600 bg-slate-200/70 p-4 rounded-md whitespace-pre-wrap">{ticket.description}</p>
                        )}
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

                    <div className="mb-6">
                        <h3 className="font-semibold text-slate-700 mb-2">Fotos Adjuntas</h3>
                        
                        {/* Edit Mode: Photos List & Add */}
                        {isEditing ? (
                            <div className="space-y-4">
                                {currentPhotos.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {currentPhotos.map((photo, index) => (
                                            <div key={index} className="relative group">
                                                <img src={photo} alt="ticket" className="h-24 w-full object-cover rounded" />
                                                <button 
                                                    onClick={() => handleRemovePhoto(index)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {newPhotos.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold text-green-600 mb-2">Nuevas para subir:</p>
                                        <div className="space-y-2">
                                            {newPhotos.map((file, index) => (
                                                <div key={index} className="flex items-center p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                                    <div className="h-10 w-10 bg-slate-200 rounded flex items-center justify-center mr-3 shrink-0 overflow-hidden">
                                                        {file.type.startsWith('image/') ? (
                                                            <img src={URL.createObjectURL(file)} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span className="text-xs">File</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                                                        <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveNewPhoto(index)}
                                                        className="ml-2 text-slate-400 hover:text-red-500 p-1"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <FileDropzone onFilesSelected={handleNewFilesSelected} accept={{ 'image/*': [] }} maxFiles={5} />
                            </div>
                        ) : (
                            /* View Mode: Photos */
                            ticket.photos.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {ticket.photos.map((photo, index) => (
                                        <a href={photo} target="_blank" rel="noopener noreferrer" key={index} className="block rounded-lg overflow-hidden border-2 border-transparent hover:border-sky-500 transition">
                                            <img src={photo} alt={`Ticket photo ${index + 1}`} className="object-cover w-full h-32" />
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No hay fotos adjuntas.</p>
                            )
                        )}
                    </div>

                    <div className="mb-2">
                        <h3 className="font-semibold text-slate-700 mb-2">Detalles</h3>
                        <div className="flex items-center space-x-4">
                             <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeClass(ticket.status)}`}>
                                {ticket.status}
                            </span>
                             {isEditing ? (
                                <select 
                                    value={editPriority} 
                                    onChange={e => setEditPriority(e.target.value as Priority)}
                                    className="px-3 py-1 text-sm border border-slate-300 rounded-md"
                                >
                                    <option value={Priority.Low}>Prioridad: Baja</option>
                                    <option value={Priority.Medium}>Prioridad: Media</option>
                                    <option value={Priority.High}>Prioridad: Alta</option>
                                </select>
                             ) : (
                                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getPriorityBadgeClass(ticket.priority)}`}>
                                    Prioridad: {ticket.priority}
                                </span>
                             )}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-100 border-t border-slate-300 shrink-0">
                    {isEditing ? (
                        <div className="flex justify-between items-center">
                            <button 
                                onClick={() => setShowDeleteConfirm(true)} 
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-bold text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors"
                            >
                                {isDeleting ? 'Eliminando...' : 'Eliminar Ticket'}
                            </button>
                            <div className="flex space-x-3">
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium rounded-md bg-white border text-slate-600 hover:bg-slate-50">Cancelar</button>
                                <button onClick={handleSaveEdit} disabled={isUpdating} className="px-4 py-2 text-sm font-medium rounded-md bg-sky-600 text-white hover:bg-sky-700 shadow-sm">
                                    {isUpdating ? <Spinner /> : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center w-full">
                            <button 
                                onClick={() => setShowDeleteConfirm(true)} 
                                disabled={isDeleting}
                                className="px-3 py-2 text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors flex items-center"
                            >
                                {isDeleting ? 'Eliminando...' : (
                                    <>
                                        <TrashIcon className="h-4 w-4 mr-1" /> Eliminar
                                    </>
                                )}
                            </button>
                            <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-slate-600">Cambiar estado:</span>
                                {isUpdating ? <Spinner /> : (
                                    <div className="flex space-x-2 overflow-x-auto">
                                        {Object.values(TicketStatus).map(status => (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusChange(status)}
                                                disabled={ticket.status === status}
                                                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
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
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Eliminar Ticket"
                message="¿Estás seguro de que deseas eliminar este ticket permanentemente? Esta acción no se puede deshacer."
                confirmText="Sí, Eliminar"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isDestructive={true}
            />
        </div>
    );
};

const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

const TrashIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

export default TicketDetailsModal;