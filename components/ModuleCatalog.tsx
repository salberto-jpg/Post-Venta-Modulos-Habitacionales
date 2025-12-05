import React, { useState, useEffect } from 'react';
import { getAllModuleTypes, createModuleType } from '../services/supabaseService';
import { type ModuleType } from '../types';
import Spinner from './Spinner';
import ModuleTypeDetails from './ModuleTypeDetails';
import FileDropzone from './FileDropzone';

const ModuleCatalog: React.FC = () => {
    const [moduleTypes, setModuleTypes] = useState<ModuleType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedModuleType, setSelectedModuleType] = useState<ModuleType | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [newModelName, setNewModelName] = useState('');
    const [newModelDesc, setNewModelDesc] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => { fetchModuleTypes(); }, []);
    const fetchModuleTypes = async () => { setLoading(true); setModuleTypes(await getAllModuleTypes()); setLoading(false); };
    const handleCreateSubmit = async (e: React.FormEvent) => { e.preventDefault(); setIsCreating(true); await createModuleType({ name: newModelName, description: newModelDesc }, selectedFile || undefined); await fetchModuleTypes(); setIsCreateModalOpen(false); setIsCreating(false); setSelectedFile(null); setNewModelName(''); setNewModelDesc(''); };
    const handleImageClick = (e: React.MouseEvent, imageUrl: string) => { e.stopPropagation(); setPreviewImage(imageUrl); };

    const formatBytes = (bytes: number) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
    };

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;
    if (selectedModuleType) return <ModuleTypeDetails moduleType={selectedModuleType} onBack={() => setSelectedModuleType(null)} />;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-4xl md:text-7xl font-black text-slate-800 tracking-tight">Catálogo</h2>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 transition-colors self-end md:self-auto">Nuevo Modelo</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {moduleTypes.map(m => (
                    <div key={m.id} onClick={() => setSelectedModuleType(m)} className="bg-white rounded-lg shadow-md cursor-pointer group overflow-hidden">
                        <div className="h-48 bg-white p-4 flex items-center justify-center border-b">
                            {m.imageUrl ? <img src={m.imageUrl} className="w-full h-full object-contain hover:scale-105 transition" onClick={(e) => handleImageClick(e, m.imageUrl!)} /> : <span className="text-slate-300 text-4xl">📦</span>}
                        </div>
                        <div className="p-6"><h3 className="text-xl font-bold">{m.name}</h3><p className="text-slate-600 text-sm">{m.description}</p></div>
                    </div>
                ))}
            </div>
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4">Crear Modelo</h3>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <input type="text" placeholder="Nombre" value={newModelName} onChange={e => setNewModelName(e.target.value)} className="w-full border p-2 rounded" required />
                            <textarea placeholder="Descripción" value={newModelDesc} onChange={e => setNewModelDesc(e.target.value)} className="w-full border p-2 rounded" required />
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Imagen del Modelo</label>
                                <FileDropzone onFilesSelected={f => setSelectedFile(f[0])} accept={{ 'image/*': [] }} maxFiles={1} />
                                {selectedFile && (
                                    <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-200 rounded-md mt-2">
                                        <div className="flex items-center overflow-hidden">
                                            <div className="h-10 w-10 rounded bg-white border border-sky-100 flex items-center justify-center mr-3 shrink-0">
                                                <span className="text-xl">🖼️</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-sky-800 truncate" title={selectedFile.name}>{selectedFile.name}</p>
                                                <p className="text-xs text-sky-600">{formatBytes(selectedFile.size)}</p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setSelectedFile(null)} className="text-sky-500 hover:text-red-500 font-bold px-2">
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border rounded">Cancelar</button><button type="submit" disabled={isCreating} className="px-4 py-2 bg-sky-600 text-white rounded">Guardar</button></div>
                        </form>
                    </div>
                </div>
            )}
            {previewImage && <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex justify-center items-center" onClick={() => setPreviewImage(null)}><img src={previewImage} className="max-h-[90vh] max-w-[90vw] object-contain" /></div>}
        </div>
    );
};
export default ModuleCatalog;