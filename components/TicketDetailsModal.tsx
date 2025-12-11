
import React, { useState, useEffect } from 'react';
import { type Ticket, TicketStatus, Priority } from '../types';
import { updateTicketStatus, updateTicket, deleteTicket, uploadFileToStorage } from '../services/supabaseService';
import { getApiConfig, findAndMarkEventAsDone, isTokenValid } from '../services/googleCalendarService';
import Spinner from './Spinner';
import FileDropzone from './FileDropzone';
import ConfirmModal from './ConfirmModal';
import VoiceRecorder from './VoiceRecorder';

interface TicketDetailsModalProps {
    ticket: Ticket;
    onClose: () => void;
    onTicketUpdated: (ticket: Ticket) => void;
    onStatusChange?: (id: string, status: TicketStatus) => void; 
    initialMode?: 'details' | 'close';
}

const AFFECTED_PARTS = [
    'Techo',
    'Laterales',
    'Instalación Eléctrica',
    'Instalación de Agua',
    'Cloacas',
    'Aberturas',
    'Pisos',
    'Mobiliario',
    'Otros'
];

const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({ ticket: initialTicket, onClose, onTicketUpdated, onStatusChange, initialMode = 'details' }) => {
    const [ticket, setTicket] = useState(initialTicket);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Edit Mode State - Main Fields
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(ticket.title);
    const [editDescription, setEditDescription] = useState(ticket.description);
    const [editAffectedPart, setEditAffectedPart] = useState(ticket.affectedPart || 'Otros');
    const [currentPhotos, setCurrentPhotos] = useState<string[]>(ticket.photos || []);
    const [newPhotos, setNewPhotos] = useState<File[]>([]);

    // Edit Mode State - Closure Fields (Persistencia de datos)
    const [editClosureDescription, setEditClosureDescription] = useState(ticket.closureDescription || '');
    const [currentClosurePhotos, setCurrentClosurePhotos] = useState<string[]>(ticket.closurePhotos || []);
    const [currentClosureAudioUrl, setCurrentClosureAudioUrl] = useState<string | null>(ticket.closureAudioUrl || null);
    
    // Invoice State (Multiple)
    const [currentInvoices, setCurrentInvoices] = useState<string[]>(
        ticket.invoices && ticket.invoices.length > 0 
            ? ticket.invoices 
            : (ticket.invoiceUrl ? [ticket.invoiceUrl] : [])
    );
    const [newInvoiceFiles, setNewInvoiceFiles] = useState<File[]>([]);
    const [isInvoiceUploading, setIsInvoiceUploading] = useState(false);

    // Closure Mode State (For new closures)
    const [isClosingMode, setIsClosingMode] = useState(initialMode === 'close' && ticket.status !== TicketStatus.Closed);
    const [closureDescription, setClosureDescription] = useState('');
    const [closureFiles, setClosureFiles] = useState<File[]>([]);
    const [closureAudioBlob, setClosureAudioBlob] = useState<Blob | null>(null);
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const { apiKey } = getApiConfig();

    const isOutOfWarranty = (ticket as any).warrantyExpiration 
        ? new Date(ticket.createdAt) > new Date((ticket as any).warrantyExpiration)
        : false; 

    // Sincronizar estados de edición cuando el ticket cambia (ej: al guardar)
    useEffect(() => {
        setEditTitle(ticket.title);
        setEditDescription(ticket.description);
        setEditAffectedPart(ticket.affectedPart || 'Otros');
        setCurrentPhotos(ticket.photos || []);
        
        setEditClosureDescription(ticket.closureDescription || '');
        setCurrentClosurePhotos(ticket.closurePhotos || []);
        setCurrentClosureAudioUrl(ticket.closureAudioUrl || null);
        
        setCurrentInvoices(
            ticket.invoices && ticket.invoices.length > 0 
                ? ticket.invoices 
                : (ticket.invoiceUrl ? [ticket.invoiceUrl] : [])
        );
    }, [ticket]);

    const sanitizeFileName = (name: string) => {
        return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, "_");
    };

    const initiateStatusChange = (newStatus: TicketStatus) => {
        if (newStatus === TicketStatus.Closed && ticket.status !== TicketStatus.Closed) {
            setIsClosingMode(true);
        } else {
            handleStatusChange(newStatus);
        }
    };

    const handleClosureSubmit = async () => {
        if (!closureDescription) {
            alert("Por favor, ingresa una descripción del trabajo realizado.");
            return;
        }
        setIsUpdating(true);

        if (ticket.id.startsWith('demo-')) {
            await new Promise(r => setTimeout(r, 1000));
            const fakePhotoUrls = closureFiles.map(f => URL.createObjectURL(f));
            const fakeAudioUrl = closureAudioBlob ? URL.createObjectURL(closureAudioBlob) : undefined;

            const updatedTicket = { 
                ...ticket, 
                status: TicketStatus.Closed,
                closureDescription,
                closurePhotos: fakePhotoUrls,
                closureAudioUrl: fakeAudioUrl
            };
            
            setTicket(updatedTicket);
            if(onTicketUpdated) onTicketUpdated(updatedTicket);
            if(onStatusChange) onStatusChange(ticket.id, TicketStatus.Closed);
            setIsClosingMode(false);
            setIsUpdating(false);
            return;
        }

        try {
            const uploadedPhotoUrls: string[] = [];
            for (const file of closureFiles) {
                const safeName = sanitizeFileName(file.name);
                const url = await uploadFileToStorage(file, 'files', `tickets/closure/${Date.now()}_${safeName}`);
                if (url) uploadedPhotoUrls.push(url);
            }

            let closureAudioUrl = null;
            if (closureAudioBlob) {
                closureAudioUrl = await uploadFileToStorage(closureAudioBlob, 'files', `tickets/audio/${Date.now()}_closure_voice.webm`);
            }

            const updates: Partial<Ticket> = {
                status: TicketStatus.Closed,
                closureDescription,
                closurePhotos: uploadedPhotoUrls,
                closureAudioUrl: closureAudioUrl || undefined
            };
            
            try {
                await updateTicket(ticket.id, updates);
            } catch (dbError: any) {
                console.warn("Error actualizando campos extendidos. Fallback...", dbError);
                const fallbackDescription = `${ticket.description}\n\n--- CIERRE DE SERVICIO ---\n${closureDescription}`;
                await updateTicket(ticket.id, {
                    status: TicketStatus.Closed,
                    description: fallbackDescription,
                });
                updates.description = fallbackDescription;
            }
            
            const updatedTicket = { ...ticket, ...updates };
            setTicket(updatedTicket);

            if (isTokenValid() && ticket.scheduledDate) {
                await findAndMarkEventAsDone(ticket);
            }

            if(onTicketUpdated) onTicketUpdated(updatedTicket);
            if(onStatusChange) onStatusChange(ticket.id, TicketStatus.Closed);
            setIsClosingMode(false);

        } catch (error: any) {
            console.error("Error closing ticket:", error);
            const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            alert(`Hubo un error al cerrar el ticket: ${msg}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStatusChange = async (newStatus: TicketStatus) => {
        setIsUpdating(true);
        try {
            await updateTicketStatus(ticket.id, newStatus);
            const updatedTicket = { ...ticket, status: newStatus };
            setTicket(updatedTicket);
            
            if(onTicketUpdated) onTicketUpdated(updatedTicket);
            if(onStatusChange) onStatusChange(ticket.id, newStatus);
        } catch (error) {
            console.error("Failed to update ticket status:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    // Upload directly in View Mode
    const handleDirectInvoiceUpload = async (files: File[]) => {
        setIsInvoiceUploading(true);
        try {
            const uploadedUrls: string[] = [];
            for (const file of files) {
                const safeName = sanitizeFileName(file.name);
                const url = await uploadFileToStorage(file, 'files', `tickets/invoices/${Date.now()}_${safeName}`);
                if(url) uploadedUrls.push(url);
            }
            
            const newInvoicesList = [...currentInvoices, ...uploadedUrls];
            
            await updateTicket(ticket.id, { 
                invoices: newInvoicesList,
                invoiceUrl: newInvoicesList[0] || null // Update legacy field
            });
            
            const updatedTicket = { ...ticket, invoices: newInvoicesList, invoiceUrl: newInvoicesList[0] || undefined };
            setTicket(updatedTicket);
            setCurrentInvoices(newInvoicesList);
            if(onTicketUpdated) onTicketUpdated(updatedTicket);
        } catch (error) {
            console.error(error);
            alert("Error al subir facturas.");
        } finally {
            setIsInvoiceUploading(false);
        }
    };

    const handleDeleteInvoice = async (index: number) => {
        if (!confirm("¿Eliminar este documento?")) return;
        setIsInvoiceUploading(true);
        try {
            const newInvoicesList = currentInvoices.filter((_, i) => i !== index);
            await updateTicket(ticket.id, { 
                invoices: newInvoicesList,
                invoiceUrl: newInvoicesList[0] || null
            } as any);
            
            const updatedTicket = { ...ticket, invoices: newInvoicesList, invoiceUrl: newInvoicesList[0] || undefined };
            setTicket(updatedTicket);
            setCurrentInvoices(newInvoicesList);
            if(onTicketUpdated) onTicketUpdated(updatedTicket);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar la factura.");
        } finally {
            setIsInvoiceUploading(false);
        }
    };

    const handleSaveEdit = async () => {
        setIsUpdating(true);
        try {
            // Upload Photos
            const uploadedPhotoUrls: string[] = [];
            for (const file of newPhotos) {
                const safeName = sanitizeFileName(file.name);
                const url = await uploadFileToStorage(file, 'files', `tickets/${Date.now()}_${safeName}`);
                if (url) uploadedPhotoUrls.push(url);
            }
            const finalPhotos = [...currentPhotos, ...uploadedPhotoUrls];
            
            // Upload Invoices
            const uploadedInvoiceUrls: string[] = [];
            for (const file of newInvoiceFiles) {
                const safeName = sanitizeFileName(file.name);
                const url = await uploadFileToStorage(file, 'files', `tickets/invoices/${Date.now()}_${safeName}`);
                if (url) uploadedInvoiceUrls.push(url);
            }
            const finalInvoices = [...currentInvoices, ...uploadedInvoiceUrls];

            const updates = { 
                title: editTitle, 
                description: editDescription, 
                affectedPart: editAffectedPart, 
                photos: finalPhotos,
                closureDescription: editClosureDescription,
                closurePhotos: currentClosurePhotos,
                closureAudioUrl: currentClosureAudioUrl,
                invoices: finalInvoices,
                invoiceUrl: finalInvoices[0] || undefined // Legacy support
            };

            await updateTicket(ticket.id, updates);
            const updatedTicket = { ...ticket, ...updates };
            setTicket(updatedTicket);
            setNewPhotos([]);
            setNewInvoiceFiles([]);
            setIsEditing(false);
            if(onTicketUpdated) onTicketUpdated(updatedTicket);
        } catch (error) {
            alert("Error al actualizar");
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        setShowDeleteConfirm(false); setIsDeleting(true);
        try { await deleteTicket(ticket.id); onClose(); window.location.reload(); } catch (error) { setIsDeleting(false); alert("Error eliminando ticket."); }
    };
    
    const hasClosureData = ticket.status === TicketStatus.Closed || 
                           !!ticket.closureDescription || 
                           !!ticket.closureAudioUrl || 
                           (ticket.closurePhotos && ticket.closurePhotos.length > 0);

    // --- CLOSURE MODE (MODAL) ---
    if (isClosingMode) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex justify-center items-center p-4 animate-in fade-in" onClick={() => setIsClosingMode(false)}>
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-100" onClick={e => e.stopPropagation()}>
                    <div className="bg-emerald-600 px-8 py-6 text-white shrink-0 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight relative z-10">Finalizar Servicio</h2>
                        <p className="text-emerald-100 text-sm font-medium mt-1 relative z-10">Completar ticket <strong>"{ticket.title}"</strong></p>
                        <button onClick={() => setIsClosingMode(false)} className="absolute top-6 right-6 text-emerald-200 hover:text-white transition-colors z-20">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Descripción del Trabajo Realizado</label>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all shadow-sm">
                                <textarea 
                                    placeholder="Detalla las reparaciones o mantenimientos efectuados..." 
                                    value={closureDescription} 
                                    onChange={e => setClosureDescription(e.target.value)} 
                                    rows={5} 
                                    className="w-full bg-transparent border-none focus:ring-0 p-3 text-slate-700 leading-relaxed resize-none placeholder-slate-400" 
                                    required 
                                />
                                <div className="border-t border-emerald-200/60 pt-2 px-2 flex justify-between items-center bg-white/50 rounded-b-xl">
                                    <div className="text-xs text-emerald-600 font-medium pl-2">{closureDescription.length > 0 ? `${closureDescription.length} caracteres` : 'Escribe o graba nota de voz'}</div>
                                    <div className="flex-shrink-0">
                                        <VoiceRecorder onAudioRecorded={setClosureAudioBlob} onDelete={() => setClosureAudioBlob(null)} variant="large" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Evidencia Fotográfica (Opcional)</label>
                            <FileDropzone onFilesSelected={f => setClosureFiles(prev => [...prev, ...f])} accept={{ 'image/*': [] }} maxFiles={5} multiple={true} />
                            {closureFiles.length > 0 && (
                                <div className="grid grid-cols-4 gap-3 mt-3">
                                    {closureFiles.map((file, index) => (
                                        <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">IMG</div>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button type="button" onClick={() => setClosureFiles(prev => prev.filter((_, i) => i !== index))} className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:bg-red-50">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                        <button type="button" onClick={() => setIsClosingMode(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors">Cancelar</button>
                        <button onClick={handleClosureSubmit} disabled={isUpdating} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-500 hover:shadow-emerald-200/50 transition-all flex items-center">
                            {isUpdating ? <Spinner /> : 'Confirmar Cierre'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- PREMIUM DETAILS VIEW ---
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center items-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100" onClick={e => e.stopPropagation()}>
                
                {/* HERO HEADER */}
                <div className={`text-white p-8 relative overflow-hidden shrink-0 ${isOutOfWarranty ? 'bg-amber-600' : 'bg-slate-900'}`}>
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-white rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                    <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                    
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex-1 mr-4">
                            {isEditing ? (
                                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-white/10 border border-white/20 text-white text-2xl font-bold rounded-lg px-3 py-1 w-full focus:outline-none focus:ring-2 focus:ring-sky-500" />
                            ) : (
                                <h2 className="text-3xl font-black tracking-tight leading-tight">{ticket.title}</h2>
                            )}
                            <div className="flex items-center text-white/80 mt-2 text-sm font-medium">
                                <span className="flex items-center mr-4">
                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                    {ticket.clientName}
                                </span>
                                <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                    {ticket.moduleSerial}
                                </span>
                            </div>
                            {isOutOfWarranty && (
                                <div className="mt-3 inline-flex items-center bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/30 text-white shadow-sm">
                                    ⚠️ SERVICIO FUERA DE GARANTÍA
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-colors text-white border border-white/10">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                            )}
                            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-colors text-white border border-white/10">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1 bg-slate-50 space-y-8">
                    
                    {/* INFO GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* MAP CARD */}
                        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative group h-64">
                            {ticket.latitude && ticket.longitude ? (
                                <>
                                    {apiKey ? (
                                        <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${ticket.latitude},${ticket.longitude}&zoom=15`}></iframe>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-100">
                                            <p className="font-bold mb-1">Mapa no disponible</p>
                                            <p className="text-xs opacity-70">Falta API Key</p>
                                        </div>
                                    )}
                                    <div className="absolute bottom-4 right-4 flex gap-2">
                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${ticket.latitude},${ticket.longitude}`} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-700 text-xs font-bold px-4 py-2 rounded-xl shadow-lg hover:bg-sky-50 transition-all flex items-center border border-slate-200">
                                            📍 Cómo llegar
                                        </a>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-100">
                                    <svg className="w-12 h-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <p className="text-sm font-medium">Sin ubicación GPS</p>
                                </div>
                            )}
                        </div>

                        {/* STATUS & DETAILS CARD */}
                        <div className="space-y-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estado</p>
                                <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border font-bold text-sm ${
                                    ticket.status === TicketStatus.New ? 'bg-red-50 text-red-700 border-red-100' :
                                    ticket.status === TicketStatus.Closed ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    'bg-violet-50 text-violet-700 border-violet-100'
                                }`}>
                                    <span className={`w-2 h-2 rounded-full mr-2 ${
                                        ticket.status === TicketStatus.New ? 'bg-red-500' :
                                        ticket.status === TicketStatus.Closed ? 'bg-emerald-500' :
                                        'bg-violet-500'
                                    }`}></span>
                                    {ticket.status}
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Parte Afectada</p>
                                {isEditing ? (
                                    <select value={editAffectedPart} onChange={e => setEditAffectedPart(e.target.value)} className="w-full border p-2 rounded bg-slate-50 text-sm font-bold">
                                        {AFFECTED_PARTS.map(part => <option key={part} value={part}>{part}</option>)}
                                    </select>
                                ) : (
                                    <div className="flex items-center text-slate-700 font-bold">
                                        <span className="bg-slate-100 p-1.5 rounded-lg mr-2">🔧</span>
                                        {ticket.affectedPart || 'General'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                        <h3 className="font-bold text-slate-800 mb-3 text-lg">Descripción del Problema</h3>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            {isEditing ? (
                                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={4} className="w-full bg-slate-50 border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-sky-500" />
                            ) : (
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                            )}
                            {ticket.audioUrl && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Nota de Voz Adjunta</p>
                                    <audio controls src={ticket.audioUrl} className="w-full h-8" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PHOTOS */}
                    {(currentPhotos.length > 0 || isEditing) && (
                        <div>
                            <h3 className="font-bold text-slate-800 mb-3 text-lg">Fotos del Reporte</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {currentPhotos.map((p, i) => (
                                    <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                                        <a href={p} target="_blank" rel="noreferrer"><img src={p} className="w-full h-full object-cover transition-transform group-hover:scale-105" /></a>
                                        {isEditing && (
                                            <button onClick={() => setCurrentPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full p-1.5 hover:bg-red-600 backdrop-blur-sm">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {isEditing && (
                                    <div className="aspect-square">
                                        <FileDropzone onFilesSelected={f => setNewPhotos(p => [...p, ...f])} maxFiles={3} multiple={true} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CLOSURE SECTION */}
                    {hasClosureData && (
                        <div className="border-t-2 border-emerald-100/50 pt-8">
                            <div className={`rounded-3xl p-6 md:p-8 border ${ticket.status === TicketStatus.Closed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-100 border-slate-200'}`}>
                                <h3 className={`font-black text-xl mb-4 flex items-center ${ticket.status === TicketStatus.Closed ? 'text-emerald-800' : 'text-slate-600'}`}>
                                    <span className="bg-emerald-200 text-emerald-800 p-1.5 rounded-full mr-3"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></span>
                                    Resolución del Servicio
                                    {ticket.status !== TicketStatus.Closed && <span className="ml-3 text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-md uppercase font-bold tracking-wide">Historial</span>}
                                </h3>
                                
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Trabajo Realizado</h4>
                                        {isEditing ? (
                                            <textarea value={editClosureDescription} onChange={e => setEditClosureDescription(e.target.value)} rows={3} className="w-full border p-3 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500" />
                                        ) : (
                                            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm text-slate-700 whitespace-pre-wrap">
                                                {ticket.closureDescription || "Sin descripción."}
                                            </div>
                                        )}
                                    </div>

                                    {(currentClosureAudioUrl || isEditing) && (
                                        <div>
                                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Nota de Audio</h4>
                                            {currentClosureAudioUrl ? (
                                                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                                                    <audio controls src={currentClosureAudioUrl} className="w-full h-8" />
                                                    {isEditing && <button onClick={() => setCurrentClosureAudioUrl(null)} className="text-red-500 hover:bg-red-50 p-1 rounded">✕</button>}
                                                </div>
                                            ) : isEditing && <p className="text-xs text-slate-400 italic">Sin audio.</p>}
                                        </div>
                                    )}

                                    {(currentClosurePhotos.length > 0 || isEditing) && (
                                        <div>
                                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Evidencia Final</h4>
                                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                                {currentClosurePhotos.map((p, i) => (
                                                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-emerald-100 shadow-sm">
                                                        <a href={p} target="_blank"><img src={p} className="w-full h-full object-cover" /></a>
                                                        {isEditing && (
                                                            <button onClick={() => setCurrentClosurePhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full p-1 shadow-sm">✕</button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* INVOICE / COST SECTION - ONLY IF OUT OF WARRANTY */}
                    {(isOutOfWarranty || isEditing) && (
                        <div className="pt-6 border-t border-amber-200">
                            <h3 className="font-bold text-amber-800 mb-3 text-lg flex items-center">
                                <span className="bg-amber-100 p-1 rounded mr-2">💰</span> Costos y Facturación
                            </h3>
                            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                                
                                {/* LISTADO DE FACTURAS EXISTENTES */}
                                {currentInvoices.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {currentInvoices.map((inv, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
                                                <div className="flex items-center">
                                                    <span className="text-2xl mr-3">📄</span>
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm">Factura / Comprobante #{idx + 1}</p>
                                                        <a href={inv} target="_blank" className="text-xs text-sky-600 hover:underline">Ver documento</a>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={isEditing ? () => setCurrentInvoices(prev => prev.filter((_, i) => i !== idx)) : () => handleDeleteInvoice(idx)} 
                                                    disabled={isInvoiceUploading}
                                                    className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                                    title="Eliminar Factura"
                                                >
                                                    {isInvoiceUploading ? <Spinner /> : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* MODO EDICIÓN: ZONA DE CARGA */}
                                {isEditing ? (
                                    <div className={`${currentInvoices.length > 0 ? 'mt-4 pt-4 border-t border-amber-200/50' : ''}`}>
                                        <label className="block text-xs font-bold text-amber-700 uppercase mb-2">
                                            Agregar Factura (PDF/Foto)
                                        </label>
                                        <FileDropzone onFilesSelected={f => setNewInvoiceFiles(prev => [...prev, ...f])} maxFiles={5} multiple={true} />
                                        
                                        {/* PENDING UPLOADS LIST */}
                                        {newInvoiceFiles.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {newInvoiceFiles.map((file, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-amber-200 rounded-lg shadow-sm">
                                                        <div className="flex items-center text-sm text-slate-700">
                                                            <span className="mr-2 text-xl">📎</span> 
                                                            <span className="font-bold">{file.name}</span>
                                                            <span className="ml-2 text-xs text-amber-600 font-medium">(Se subirá al guardar)</span>
                                                        </div>
                                                        <button onClick={() => setNewInvoiceFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : currentInvoices.length === 0 && (
                                    // MODO VISTA + SIN FACTURAS: Botón de carga directa
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <p className="text-sm text-slate-500 italic mb-3">No se ha cargado información de facturación.</p>
                                        <label className={`cursor-pointer flex items-center bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 font-bold py-2 px-4 rounded-xl shadow-sm transition-all ${isInvoiceUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            {isInvoiceUploading ? (
                                                <span className="ml-2">Subiendo...</span>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                    Cargar Factura
                                                </>
                                            )}
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*,application/pdf" 
                                                multiple
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        handleDirectInvoiceUpload(Array.from(e.target.files));
                                                    }
                                                }} 
                                                disabled={isInvoiceUploading}
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-5 bg-white border-t border-slate-200 shrink-0">
                    {isEditing ? (
                        <div className="flex justify-between items-center w-full">
                            <button onClick={() => setShowDeleteConfirm(true)} className="text-red-500 font-bold text-sm hover:underline">Eliminar Ticket</button>
                            <div className="flex gap-3">
                                <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                                <button onClick={handleSaveEdit} disabled={isUpdating} className="px-6 py-2.5 rounded-xl bg-sky-600 text-white font-bold shadow-lg hover:bg-sky-500 transition-all">
                                    {isUpdating ? <Spinner/> : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center w-full">
                             <div className="flex gap-2">
                                {Object.values(TicketStatus).map(s => {
                                    const isActive = ticket.status === s;
                                    let btnClass = "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800";
                                    
                                    if (isActive) {
                                        if (s === TicketStatus.New) btnClass = "bg-red-500 text-white border-red-500 ring-2 ring-red-200 ring-offset-1";
                                        else if (s === TicketStatus.Scheduled) btnClass = "bg-violet-500 text-white border-violet-500 ring-2 ring-violet-200 ring-offset-1";
                                        else if (s === TicketStatus.Closed) btnClass = "bg-emerald-500 text-white border-emerald-500 ring-2 ring-emerald-200 ring-offset-1";
                                    }

                                    return (
                                        <button 
                                            key={s} 
                                            onClick={() => initiateStatusChange(s)} 
                                            disabled={isActive} 
                                            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${btnClass} disabled:opacity-100 disabled:cursor-default shadow-sm`}
                                        >
                                            {s}
                                        </button>
                                    );
                                })}
                             </div>
                        </div>
                    )}
                </div>
            </div>
            <ConfirmModal isOpen={showDeleteConfirm} title="Eliminar" message="¿Seguro?" onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} isDestructive={true} />
        </div>
    );
};

export default TicketDetailsModal;
