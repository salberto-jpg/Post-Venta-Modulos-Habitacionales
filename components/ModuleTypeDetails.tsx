
import React, { useState, useEffect } from 'react';
import { getDocumentsByModuleType, createDocument } from '../services/supabaseService';
import { type ModuleType, type Document } from '../types';
import Spinner from './Spinner';
import FileDropzone from './FileDropzone';

interface ModuleTypeDetailsProps {
    moduleType: ModuleType;
    onBack: () => void;
}

const ModuleTypeDetails: React.FC<ModuleTypeDetailsProps> = ({ moduleType, onBack }) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Filter states
    const [activeTab, setActiveTab] = useState<'plan' | 'manual' | 'warranty'>('plan');

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

    const filteredDocs = documents.filter(doc => doc.type === activeTab);

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

    return (
        <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
                <button onClick={onBack} className="text-sm text-slate-500 hover:text-sky-600 mb-4 flex items-center">
                    &larr; Volver al Catálogo
                </button>
                <div className="flex flex-col md:flex-row gap-6">
                    {moduleType.imageUrl && (
                        <div 
                            className="w-full md:w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white cursor-pointer"
                            onClick={() => setPreviewImage(moduleType.imageUrl!)}
                        >
                            <img src={moduleType.imageUrl} alt={moduleType.name} className="w-full h-full object-contain" />
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
                            Cargar Documento
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
                                <a 
                                    href={doc.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-sky-600 hover:text-sky-800 text-sm font-medium"
                                >
                                    Ver
                                </a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-500">
                        No hay documentos cargados en esta categoría.
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <UploadDocModal 
                    onClose={() => setIsUploadModalOpen(false)} 
                    onSuccess={() => {
                        fetchDocs();
                        setIsUploadModalOpen(false);
                    }}
                    moduleId={moduleType.id}
                    preSelectedType={activeTab}
                />
            )}

            {/* Image Zoom Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex justify-center items-center p-4" 
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-full max-h-full">
                        <button 
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 focus:outline-none"
                            onClick={() => setPreviewImage(null)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img 
                            src={previewImage} 
                            alt="Full size preview" 
                            className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </div>
                </div>
            )}
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

// --- Internal Upload Modal ---

const UploadDocModal: React.FC<{ onClose: () => void; onSuccess: () => void; moduleId: string; preSelectedType: string }> = ({ onClose, onSuccess, moduleId, preSelectedType }) => {
    const [file, setFile] = useState<File | null>(null);
    const [version, setVersion] = useState('');
    const [docType, setDocType] = useState(preSelectedType);
    const [loading, setLoading] = useState(false);

    const handleFilesSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setLoading(true);
        try {
            await createDocument(moduleId, 'moduleType', docType as Document['type'], file, version);
            onSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Cargar Documento</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Tipo</label>
                        <select 
                            value={docType} 
                            onChange={e => setDocType(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                        >
                            <option value="plan">Plano Dimensional</option>
                            <option value="manual">Manual de Instrucciones</option>
                            <option value="warranty">Garantía</option>
                        </select>
                    </div>

                    {docType === 'plan' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Versión</label>
                            <input 
                                type="text" 
                                placeholder="Ej: 1.0, 2.3-beta"
                                value={version} 
                                onChange={e => setVersion(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Archivo</label>
                        <FileDropzone 
                            onFilesSelected={handleFilesSelected}
                            accept={{ 'application/pdf': [], 'image/*': [] }}
                            maxFiles={1}
                        />
                        {file && <p className="text-xs text-emerald-600 mt-1">Archivo seleccionado: {file.name}</p>}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md">Cancelar</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50">
                            {loading ? <Spinner /> : 'Cargar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ArrowUpTrayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const DocumentIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;

export default ModuleTypeDetails;
