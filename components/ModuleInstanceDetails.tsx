
import React, { useState, useEffect } from 'react';
import { type Module, type Ticket, TicketStatus, type Document } from '../types';
import { getModuleDossier, deleteModule, deleteDocument } from '../services/supabaseService';
import AddModuleInstanceModal from './AddModuleInstanceModal';
import TicketDetailsModal from './TicketDetailsModal';
import Spinner from './Spinner';
import ConfirmModal from './ConfirmModal';
import LinkDocumentModal from './LinkDocumentModal';

interface ModuleInstanceDetailsProps {
    moduleInstance: Module;
    history: Ticket[];
    onBack: () => void;
}

const ModuleInstanceDetails: React.FC<ModuleInstanceDetailsProps> = ({ moduleInstance: initialModule, history: initialHistory, onBack }) => {
    const [moduleData, setModuleData] = useState<Module>(initialModule);
    const [tickets, setTickets] = useState<Ticket[]>(initialHistory);
    const [documents, setDocuments] = useState<Document[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'docs'>('general');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLinkDocOpen, setIsLinkDocOpen] = useState(false);

    // Ticket Details State
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    // Modal States
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{id: string, name: string} | null>(null);

    const fetchDossier = async () => {
        setLoading(true);
        try {
            const data = await getModuleDossier(initialModule.id);
            setModuleData(data.module);
            setTickets(data.tickets);
            setDocuments(data.documents);
        } catch (error) {
            console.error("Error fetching module dossier:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDossier();
    }, [initialModule.id]);

    const handleDelete = async () => {
        setShowDeleteConfirm(false);
        setIsDeleting(true);
        try {
            await deleteModule(moduleData.id);
            onBack();
        } catch (e: any) {
            console.error(e);
            alert("Error al eliminar el módulo: " + (e.message || "Permisos insuficientes."));
            setIsDeleting(false);
        }
    };

    const handleDeleteDocument = async () => {
        if (!docToDelete) return;
        try {
            await deleteDocument(docToDelete.id);
            setDocToDelete(null);
            fetchDossier();
        } catch (error: any) {
            console.error("Error deleting document:", error);
            alert("No se pudo eliminar el documento.");
        }
    };
    
    const handleTicketUpdated = (updatedTicket: Ticket) => {
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        setSelectedTicket(updatedTicket);
    };

    const sortedHistory = [...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const isWarrantyActive = () => {
        if (!moduleData.warrantyExpiration) return false;
        return new Date(moduleData.warrantyExpiration) > new Date();
    };

    const getDocumentIcon = (type: Document['type']) => {
        switch (type) {
            case 'manual': return <BookOpenIcon className="h-6 w-6 text-sky-500" />;
            case 'warranty': return <ShieldCheckIcon className="h-6 w-6 text-emerald-500" />;
            case 'plan': return <MapIcon className="h-6 w-6 text-violet-500" />;
            default: return <DocumentIcon className="h-6 w-6 text-slate-500" />;
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

    return (
        <div className="flex flex-col h-full bg-slate-100 min-h-screen relative animate-in fade-in duration-500">
            
            {/* --- HERO HEADER PREMIUM --- */}
            <div className="relative bg-slate-900 text-white pb-24 pt-10 px-6 md:px-10 shadow-2xl overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
                
                <div className="relative z-10 max-w-7xl mx-auto">
                    <button onClick={onBack} className="group flex items-center text-slate-400 hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-wider">
                        <span className="bg-slate-800 p-1.5 rounded-full mr-2 group-hover:bg-violet-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </span>
                        Volver al Legajo
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
                                    {moduleData.modelName}
                                </h1>
                                <span className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-lg font-mono text-sm shadow-sm inline-block self-start md:self-auto">
                                    ID: {moduleData.serialNumber}
                                </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-300 font-medium">
                                <div className="flex items-center bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
                                    <svg className="w-4 h-4 mr-2 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Instalación: {new Date(moduleData.installationDate).toLocaleDateString()}
                                </div>
                                {moduleData.warrantyExpiration && (
                                    <div className={`flex items-center px-3 py-1.5 rounded-lg border backdrop-blur-sm font-bold ${isWarrantyActive() ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-100' : 'bg-red-500/20 border-red-500/50 text-red-100'}`}>
                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {isWarrantyActive() ? `Garantía hasta ${new Date(moduleData.warrantyExpiration).toLocaleDateString()}` : `Garantía vencida (${new Date(moduleData.warrantyExpiration).toLocaleDateString()})`}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsEditModalOpen(true)}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center shadow-lg"
                            >
                                <PencilIcon className="h-4 w-4 mr-2" />
                                Editar Datos
                            </button>
                            <button 
                                onClick={() => setShowDeleteConfirm(true)}
                                className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/30 backdrop-blur-md px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center shadow-lg"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CONTENIDO PRINCIPAL (Overlap) --- */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 w-full -mt-16 relative z-20 pb-10 flex-1 flex flex-col">
                
                {/* TABS PILLS */}
                <div className="flex items-center justify-between mb-6">
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                                activeTab === 'general' 
                                    ? 'bg-slate-900 text-white shadow-md transform scale-105' 
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            General e Historial
                        </button>
                        <button
                            onClick={() => setActiveTab('docs')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                                activeTab === 'docs' 
                                    ? 'bg-slate-900 text-white shadow-md transform scale-105' 
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            Documentación
                        </button>
                    </div>
                    
                    {activeTab === 'docs' && (
                        <button 
                            onClick={() => setIsLinkDocOpen(true)} 
                            className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-violet-500 transition-all flex items-center active:scale-95"
                        >
                            <span className="text-xl mr-2 leading-none mb-0.5">+</span> Vincular Doc
                        </button>
                    )}
                </div>

                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Geolocation Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-slate-100 bg-white">
                                <h3 className="font-bold text-slate-800 flex items-center text-lg">
                                    <MapPinIcon className="h-5 w-5 mr-2 text-violet-600" />
                                    Ubicación Geográfica
                                </h3>
                            </div>
                            <div className="h-80 bg-slate-100 relative group">
                                {moduleData.latitude && moduleData.longitude ? (
                                    <iframe 
                                        width="100%" 
                                        height="100%" 
                                        frameBorder="0" 
                                        scrolling="no" 
                                        marginHeight={0} 
                                        marginWidth={0} 
                                        src={`https://maps.google.com/maps?q=${moduleData.latitude},${moduleData.longitude}&z=15&output=embed`}
                                        title="Module Location"
                                        className="filter grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
                                    ></iframe>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50">
                                        <MapPinIcon className="h-12 w-12 mb-3 opacity-20" />
                                        <p className="font-medium">Sin coordenadas registradas</p>
                                    </div>
                                )}
                                {moduleData.address && (
                                    <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-200 text-sm font-medium text-slate-700">
                                        📍 {moduleData.address}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Service History Timeline */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col max-h-[600px]">
                            <div className="p-5 border-b border-slate-100 bg-white sticky top-0 z-10 rounded-t-2xl">
                                <h3 className="font-bold text-slate-800 flex items-center text-lg">
                                    <ClipboardDocumentListIcon className="h-5 w-5 mr-2 text-violet-600" />
                                    Historial de Eventos
                                </h3>
                            </div>
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                {sortedHistory.length > 0 ? (
                                    <div className="space-y-8 relative border-l-2 border-slate-100 ml-3">
                                        {sortedHistory.map(ticket => {
                                            // Lógica visual: Fuera de Garantía
                                            const isOutOfWarranty = moduleData.warrantyExpiration && 
                                                new Date(ticket.createdAt) > new Date(moduleData.warrantyExpiration);
                                            
                                            const cardBg = isOutOfWarranty ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200';
                                            const hoverClass = isOutOfWarranty ? 'hover:border-amber-300 hover:bg-amber-100' : 'hover:border-violet-300 hover:shadow-md';

                                            return (
                                                <div key={ticket.id} className="relative pl-8">
                                                    <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-white shadow-sm ${
                                                        ticket.status === TicketStatus.Closed ? 'bg-emerald-500' : 
                                                        ticket.status === TicketStatus.New ? 'bg-red-500' : 'bg-sky-500'
                                                    }`}></div>
                                                    <div className="group">
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                                                            {new Date(ticket.createdAt).toLocaleDateString()} <span className="mx-1">•</span> {new Date(ticket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            {isOutOfWarranty && (
                                                                <span className="ml-2 bg-amber-200 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold border border-amber-300">
                                                                    FUERA DE GARANTÍA
                                                                </span>
                                                            )}
                                                        </span>
                                                        <div 
                                                            onClick={() => setSelectedTicket({...ticket, warrantyExpiration: moduleData.warrantyExpiration} as any)} // Hack to pass expiration
                                                            className={`${cardBg} rounded-xl p-4 border cursor-pointer ${hoverClass} transition-all relative overflow-hidden`}
                                                        >
                                                            <div className="flex justify-between items-start mb-2 relative z-10">
                                                                <h4 className="font-bold text-slate-800 text-base group-hover:text-violet-700 transition-colors">{ticket.title}</h4>
                                                                <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wide border ${
                                                                    ticket.status === TicketStatus.Closed ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-sky-50 text-sky-700 border-sky-100'
                                                                }`}>
                                                                    {ticket.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-600 line-clamp-2 relative z-10">{ticket.description}</p>
                                                            {isOutOfWarranty && ticket.status === TicketStatus.Closed && ticket.invoiceUrl && (
                                                                <div className="mt-2 inline-flex items-center text-xs font-bold text-amber-700 bg-amber-100/50 px-2 py-1 rounded border border-amber-200">
                                                                    📄 Factura Adjunta
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                     <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                        <p className="text-sm italic">Este módulo no tiene historial de servicios.</p>
                                     </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'docs' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {documents.length > 0 ? (
                            documents.map(doc => (
                                <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-violet-200 transition-all group">
                                    <div className="flex items-center min-w-0">
                                        <div className="p-3 bg-slate-50 rounded-xl mr-4 border border-slate-100 group-hover:bg-violet-50 group-hover:border-violet-100 transition-colors shrink-0">
                                            {getDocumentIcon(doc.type)}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <h4 className="font-bold text-slate-800 text-sm truncate" title={doc.name}>{doc.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{doc.type}</span>
                                                {doc.moduleTypeId && <span className="text-[10px] text-violet-500 font-bold">● Modelo</span>}
                                                {doc.moduleId && <span className="text-[10px] text-emerald-500 font-bold">● Único</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <a 
                                            href={doc.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-violet-600 hover:text-violet-800 text-xs font-bold uppercase tracking-wider bg-violet-50 px-3 py-1.5 rounded-lg transition-colors hover:bg-violet-100"
                                        >
                                            Ver PDF
                                        </a>
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDocToDelete({id: doc.id, name: doc.name}); }}
                                            className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                            title="Eliminar documento"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <DocumentIcon className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-700">Sin Documentación</h3>
                                <p className="text-slate-500 text-sm mt-1">Vincula manuales o sube archivos específicos para este módulo.</p>
                            </div>
                        )}
                    </div>
                )}

            </div>

            {isEditModalOpen && (
                <AddModuleInstanceModal
                    clientId={moduleData.clientId}
                    moduleToEdit={moduleData}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        fetchDossier(); // Refresh data
                    }}
                />
            )}
            
            {isLinkDocOpen && (
                <LinkDocumentModal 
                    onClose={() => setIsLinkDocOpen(false)}
                    onDocumentLinked={() => { setIsLinkDocOpen(false); fetchDossier(); }}
                    targetModuleId={moduleData.id}
                />
            )}
            
            {selectedTicket && (
                <TicketDetailsModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onTicketUpdated={handleTicketUpdated}
                />
            )}

            <ConfirmModal 
                isOpen={showDeleteConfirm}
                title="Eliminar Módulo"
                message={`¿Estás seguro de que deseas eliminar el módulo ${moduleData.serialNumber}?\n\nSe borrarán también todos los tickets y documentos asociados.`}
                confirmText="Sí, Eliminar"
                isDestructive={true}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            <ConfirmModal 
                isOpen={!!docToDelete}
                title="Eliminar Documento"
                message={`¿Eliminar el documento "${docToDelete?.name}"?`}
                confirmText="Eliminar"
                isDestructive={true}
                onConfirm={handleDeleteDocument}
                onCancel={() => setDocToDelete(null)}
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

const ClipboardDocumentListIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
    </svg>
);

const PencilIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const BookOpenIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>;
const ShieldCheckIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" /></svg>;
const MapIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.5-12.75a.75.75 0 01.75.75v14.25a.75.75 0 01-1.5 0V4.5a.75.75 0 01.75-.75zM3.75 12a.75.75 0 01.75-.75h14.25a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75z" /></svg>;
const DocumentIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const TrashIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>;

export default ModuleInstanceDetails;
