import React, { useState, useEffect } from 'react';
import { type Module, type Ticket, TicketStatus, type Document } from '../types';
import { getModuleDossier, deleteModule, deleteDocument } from '../services/supabaseService';
import AddModuleInstanceModal from './AddModuleInstanceModal';
import Spinner from './Spinner';
import ConfirmModal from './ConfirmModal';

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
    
    const sortedHistory = [...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
        <div className="flex flex-col h-full bg-slate-50 rounded-lg shadow-sm border border-slate-200">
            {/* Header */}
            <div className="p-6 bg-white border-b border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-sky-600 flex items-center">
                        &larr; Volver al Legajo
                    </button>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isDeleting}
                            className="text-sm text-red-600 font-medium border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md"
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </button>
                        <button 
                            onClick={() => setIsEditModalOpen(true)}
                            className="text-sm text-sky-600 hover:text-sky-800 font-medium flex items-center border border-sky-200 bg-sky-50 px-3 py-1 rounded-md"
                        >
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Editar Módulo
                        </button>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{moduleData.modelName}</h1>
                        <div className="flex items-center mt-2 space-x-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">ID Trazabilidad (Serial)</span>
                                <span className="font-mono text-lg font-medium text-slate-700 bg-slate-100 px-2 rounded border border-slate-200">
                                    {moduleData.serialNumber}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-slate-300"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Instalación</span>
                                <span className="text-sm font-medium text-slate-700">
                                    {new Date(moduleData.installationDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-6">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                        activeTab === 'general' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    General e Historial
                </button>
                <button
                    onClick={() => setActiveTab('docs')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                        activeTab === 'docs' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Documentación del Módulo
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {activeTab === 'general' && (
                    <>
                        {/* Geolocation Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50">
                                <h3 className="font-bold text-slate-700 flex items-center">
                                    <MapPinIcon className="h-5 w-5 mr-2 text-sky-600" />
                                    Ubicación Geográfica
                                </h3>
                            </div>
                            <div className="h-64 bg-slate-200 relative">
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
                                    ></iframe>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <MapPinIcon className="h-10 w-10 mb-2 opacity-50" />
                                        <p>Sin coordenadas registradas</p>
                                    </div>
                                )}
                                {moduleData.address && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-2 text-xs text-center border-t border-slate-200">
                                        {moduleData.address}
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
                    </>
                )}

                {activeTab === 'docs' && (
                    <div className="grid grid-cols-1 gap-4">
                        {documents.length > 0 ? (
                            documents.map(doc => (
                                <div key={doc.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-slate-100 rounded mr-3">
                                            {getDocumentIcon(doc.type)}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-sm">{doc.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-500 capitalize">{doc.type}</span>
                                                {doc.moduleTypeId && <span className="bg-violet-100 text-violet-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Catálogo</span>}
                                                {doc.moduleId && <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Específico</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <a 
                                            href={doc.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-sky-600 hover:text-sky-800 text-sm font-medium px-3 py-1 rounded hover:bg-sky-50"
                                        >
                                            Ver
                                        </a>
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDocToDelete({id: doc.id, name: doc.name}); }}
                                            className="text-red-500 hover:text-red-700 p-2 border border-red-100 bg-red-50 rounded"
                                            title="Eliminar documento"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                                <DocumentIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">No hay documentos asociados a este módulo.</p>
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
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