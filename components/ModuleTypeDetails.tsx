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
            <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-sky-600 flex items-center">
                        &larr; Volver al Catálogo
                    </button>
                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="text-sm text-sky-600 hover:text-sky-800 font-medium flex items-center border border-sky-200 bg-sky-50 px-3 py-1 rounded-md"
                    >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Editar Modelo
                    </button>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                    {moduleType.imageUrl ? (
                        <div 
                            className="w-full md:w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white cursor-pointer group relative"
                            onClick={() => setPreviewImage(moduleType.imageUrl!)}
                        >
                            <img src={moduleType.imageUrl} alt={moduleType.name} className="w-full h-full object-contain" />
                        </div>
                    ) : (
                         <div className="w-full md:w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                             <span className="text-3xl">📦</span>
                         </div>
                    )}
                    <div className="flex-1 flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800">{moduleType.name}</h2>
                            <p className="text-slate-600 mt-2">{moduleType.description}</p>
                        </div>
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="bg-sky-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-sky-700 transition-colors flex items-center shrink-0 ml-4"
                        >
                            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                            Cargar {activeTab === 'plan' ? 'Plano' : activeTab === 'manual' ? 'Manual' : 'Garantía'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6">
                <TabButton label="Planos Dimensionales" active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
                <TabButton label="Manuales de Instrucción" active={activeTab === 'manual'} onClick={() => setActiveTab('manual')} />
                <TabButton label="Garantías" active={activeTab === 'warranty'} onClick={() => setActiveTab('warranty')} />
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto bg-slate-50">
                {filteredDocs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDocs.map(doc => (
                            <div key={doc.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-start justify-between">
                                <div className="flex items-start">
                                    <div className="p-2 bg-slate-100 rounded mr-3">
                                        <DocumentIcon className="h-6 w-6 text-slate-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800">{doc.name}</h4>
                                        {doc.version && (
                                            <span className="inline-block bg-sky-100 text-sky-800 text-xs px-2 py-0.5 rounded-full mt-1">
                                                v{doc.version}
                                            </span>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end space-y-2">
                                    <a 
                                        href={doc.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-sky-600 hover:text-sky-800 text-sm font-medium"
                                    >
                                        Ver
                                    </a>
                                    <button 
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDocToDelete({id: doc.id, name: doc.name}); }}
                                        className="text-red-500 hover:text-red-700 p-1 border border-red-100 bg-red-50 rounded"
                                        title="Eliminar documento"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <DocumentIcon className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-lg font-medium">No hay documentos de tipo "{activeTab}"</p>
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="mt-4 text-sky-600 hover:underline text-sm font-semibold"
                        >
                            Subir Documento Ahora
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
                    className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex justify-center items-center p-4" 
                    onClick={() => setPreviewImage(null)}
                >
                    <img 
                        src={previewImage} 
                        className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl"
                        onClick={(e) => e.stopPropagation()} 
                    />
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
        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            active ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'
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
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Editar Modelo</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Nombre</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded mt-1" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Descripción</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full border p-2 rounded mt-1" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Actualizar Imagen (Opcional)</label>
                        <FileDropzone onFilesSelected={f => setFile(f[0])} accept={{ 'image/*': [] }} maxFiles={1} />
                        {file && (
                             <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-200 rounded-md mt-2">
                                <div className="flex items-center overflow-hidden">
                                    <div className="h-10 w-10 rounded bg-white border border-sky-100 flex items-center justify-center mr-3 shrink-0">
                                        <span className="text-xl">🖼️</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-sky-800 truncate" title={file.name}>{file.name}</p>
                                        <p className="text-xs text-sky-600">{formatBytes(file.size)}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setFile(null)} className="text-sky-500 hover:text-red-500 font-bold px-2">
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <button 
                            type="button" 
                            onClick={() => setShowDeleteConfirm(true)} 
                            disabled={isDeleting}
                            className="text-red-600 text-sm font-bold hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors"
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar Modelo'}
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
                            <button type="submit" disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded">{loading ? <Spinner /> : 'Guardar'}</button>
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