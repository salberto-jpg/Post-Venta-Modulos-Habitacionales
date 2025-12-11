
import React, { useState, useEffect } from 'react';
import { getDocumentsByModuleType, updateModuleType, deleteModuleType, deleteDocument } from '../services/supabaseService';
import { type ModuleType, type Document } from '../types';
import Spinner from './Spinner';
import AddDocumentModal from './AddDocumentModal';
import FileDropzone from './FileDropzone';
import ConfirmModal from './ConfirmModal';

interface ModuleTypeDetailsProps {
    moduleType: ModuleType;
    onBack: () => void;
}

const ModuleTypeDetails: React.FC<ModuleTypeDetailsProps> = ({ moduleType: initialModuleType, onBack }) => {
    const [moduleType, setModuleType] = useState(initialModuleType);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Filter states
    const [activeTab, setActiveTab] = useState<'plan' | 'manual' | 'warranty'>('plan');
    
    // Modal state
    const [docToDelete, setDocToDelete] = useState<{id: string, name: string} | null>(null);

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const docs = await getDocumentsByModuleType(moduleType.id);
            setDocuments(docs);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocs();
    }, [moduleType.id]);

    const handleUpdateSuccess = (updatedModule: ModuleType) => {
        setModuleType(updatedModule);
        setIsEditModalOpen(false);
    };

    const handleDeleteSuccess = () => {
        setIsEditModalOpen(false);
        onBack(); // Go back to catalog after delete
    };

    const handleDeleteDocument = async () => {
        if (!docToDelete) return;
        try {
            await deleteDocument(docToDelete.id);
            setDocToDelete(null);
            fetchDocs();
        } catch (error: any) {
            console.error("Error deleting document:", error);
            alert("Error al eliminar el documento: " + (error.message || "Verifique permisos."));
        }
    };

    const filteredDocs = documents.filter(doc => doc.type === activeTab);

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

    return (
        <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
            {/* Header */}
            <div className="p-6 md:p-10 border-b border-slate-200">
                <div className="flex justify-between items-center mb-6 md:mb-8">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-sky-600 flex items-center font-bold uppercase tracking-wide">
                        &larr; Volver al Catálogo
                    </button>
                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="text-sm text-sky-600 hover:text-sky-800 font-medium flex items-center border border-sky-200 bg-sky-50 px-4 py-2 rounded-lg transition-colors"
                    >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Editar Modelo
                    </button>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                    {/* Imagen con Recuadro Premium (Solo Desktop afecta tamaño grande) */}
                    {moduleType.imageUrl ? (
                        <div 
                            className="w-full md:w-96 md:h-72 flex-shrink-0 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-white cursor-pointer group relative ring-1 ring-slate-200 transition-transform duration-300 hover:scale-[1.01]"
                            onClick={() => setPreviewImage(moduleType.imageUrl!)}
                        >
                            <div className="absolute inset-0 bg-slate-50/50 group-hover:bg-transparent transition-colors duration-300"></div>
                            <img 
                                src={moduleType.imageUrl} 
                                alt={moduleType.name} 
                                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 ease-out" 
                            />
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-slate-800/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Ampliar 🔍</span>
                            </div>
                        </div>
                    ) : (
                         <div className="w-full md:w-96 md:h-72 flex-shrink-0 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-50 flex items-center justify-center ring-1 ring-slate-200">
                             <div className="text-center text-slate-300">
                                <span className="text-5xl mb-2 block">📦</span>
                                <span className="text-sm font-bold uppercase">Sin Imagen</span>
                             </div>
                         </div>
                    )}

                    {/* Descripción y Acciones */}
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight mb-4">{moduleType.name}</h2>
                            <div className="h-1 w-20 bg-sky-500 mb-6 rounded-full"></div>
                            <p className="text-slate-600 md:text-lg leading-relaxed">{moduleType.description}</p>
                        </div>
                        
                        <div className="mt-8 md:mt-0 pt-6 md:pt-0 flex flex-col md:flex-row items-start md:items-end justify-between border-t md:border-t-0 border-slate-100">
                            <div className="hidden md:block">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Documentación Disponbile</span>
                                <div className="flex gap-2 mt-2">
                                    <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                    <span className="h-2 w-2 rounded-full bg-violet-500"></span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setIsUploadModalOpen(true)}
                                className="w-full md:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-sky-600 transition-all duration-300 flex items-center justify-center font-bold"
                            >
                                <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                                Cargar Documento
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6 md:px-10 bg-slate-50/50">
                <TabButton label="Planos Dimensionales" active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
                <TabButton label="Manuales de Instrucción" active={activeTab === 'manual'} onClick={() => setActiveTab('manual')} />
                <TabButton label="Garantías" active={activeTab === 'warranty'} onClick={() => setActiveTab('warranty')} />
            </div>

            {/* Content */}
            <div className="p-6 md:p-10 flex-1 overflow-y-auto bg-slate-50">
                {filteredDocs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDocs.map(doc => (
                            <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between hover:shadow-md transition-shadow group">
                                <div className="flex items-start">
                                    <div className="p-3 bg-slate-50 rounded-lg mr-4 border border-slate-100 group-hover:border-sky-100 group-hover:bg-sky-50 transition-colors">
                                        <DocumentIcon className="h-6 w-6 text-slate-400 group-hover:text-sky-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm md:text-base">{doc.name}</h4>
                                        {doc.version && (
                                            <span className="inline-block bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-2 py-0.5 rounded-md mt-1 font-bold">
                                                v{doc.version}
                                            </span>
                                        )}
                                        <p className="text-xs text-slate-400 mt-1">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end space-y-2">
                                    <a 
                                        href={doc.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-sky-600 hover:text-sky-800 text-xs font-bold uppercase tracking-wider hover:underline"
                                    >
                                        Ver PDF
                                    </a>
                                    <button 
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDocToDelete({id: doc.id, name: doc.name}); }}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                        title="Eliminar documento"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                        <DocumentIcon className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No hay documentos de tipo "{activeTab}"</p>
                        <p className="text-sm mb-6">Sube planos, manuales o garantías para este modelo.</p>
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 hover:text-sky-600 hover:border-sky-200 transition-all font-bold text-sm shadow-sm"
                        >
                            + Subir Documento
                        </button>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <AddDocumentModal 
                    onClose={() => setIsUploadModalOpen(false)} 
                    onDocumentAdded={() => {
                        fetchDocs();
                        setIsUploadModalOpen(false);
                    }}
                    initialTargetId={moduleType.id}
                    initialType={activeTab}
                    lockModelSelection={true} 
                />
            )}
            
            {/* Edit Module Type Modal */}
            {isEditModalOpen && (
                <EditModuleTypeModal 
                    moduleType={moduleType} 
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={handleUpdateSuccess}
                    onDelete={handleDeleteSuccess}
                />
            )}

            {/* Image Zoom */}
            {previewImage && (
                <div 
                    className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[60] flex justify-center items-center p-8 cursor-zoom-out" 
                    onClick={() => setPreviewImage(null)}
                >
                    <img 
                        src={previewImage} 
                        className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-slate-200"
                        onClick={(e) => e.stopPropagation()} 
                    />
                    <button className="absolute top-5 right-5 text-slate-400 hover:text-slate-800">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
            
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

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-6 py-4 font-bold text-sm transition-all border-b-[3px] ${
            active ? 'border-sky-600 text-sky-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
        }`}
    >
        {label}
    </button>
);

const EditModuleTypeModal: React.FC<{ moduleType: ModuleType; onClose: () => void; onSuccess: (updated: ModuleType) => void; onDelete: () => void; }> = ({ moduleType, onClose, onSuccess, onDelete }) => {
    const [name, setName] = useState(moduleType.name);
    const [description, setDescription] = useState(moduleType.description);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const formatBytes = (bytes: number) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateModuleType(moduleType.id, { name, description }, file || undefined);
            onSuccess({ ...moduleType, name, description }); 
        } catch (e) {
            console.error(e);
            alert("Error al actualizar");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setShowDeleteConfirm(false);
        setIsDeleting(true);
        try {
            await deleteModuleType(moduleType.id);
            onDelete();
        } catch(e: any) {
            console.error(e);
            alert("Error al eliminar el modelo: " + (e.message || "Permisos insuficientes."));
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-slate-800">Editar Modelo</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Modelo</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Descripción Técnica</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Actualizar Imagen (Opcional)</label>
                        <FileDropzone onFilesSelected={f => setFile(f[0])} accept={{ 'image/*': [] }} maxFiles={1} />
                        {file && (
                             <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-200 rounded-xl mt-3">
                                <div className="flex items-center overflow-hidden">
                                    <div className="h-10 w-10 rounded-lg bg-white border border-sky-100 flex items-center justify-center mr-3 shrink-0">
                                        <span className="text-xl">🖼️</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-sky-800 truncate" title={file.name}>{file.name}</p>
                                        <p className="text-xs text-sky-600 font-medium">{formatBytes(file.size)}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setFile(null)} className="text-sky-500 hover:text-red-500 font-bold px-2">
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-2">
                        <button 
                            type="button" 
                            onClick={() => setShowDeleteConfirm(true)} 
                            disabled={isDeleting}
                            className="text-red-600 text-sm font-bold hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors"
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar Modelo'}
                        </button>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-sky-600 shadow-md hover:shadow-lg transition-all">{loading ? <Spinner /> : 'Guardar Cambios'}</button>
                        </div>
                    </div>
                </form>
            </div>
             <ConfirmModal 
                isOpen={showDeleteConfirm}
                title="Eliminar Modelo"
                message="¿Seguro que deseas eliminar este modelo? Se requiere que no tenga módulos asociados."
                confirmText="Sí, Eliminar"
                isDestructive={true}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    );
};

const ArrowUpTrayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const DocumentIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const PencilIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
const TrashIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>;

export default ModuleTypeDetails;
