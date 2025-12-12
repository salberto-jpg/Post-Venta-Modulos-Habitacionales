
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

    if (loading) return <div className="flex justify-center p-10 h-full items-center"><Spinner /></div>;
    if (selectedModuleType) return <ModuleTypeDetails moduleType={selectedModuleType} onBack={() => setSelectedModuleType(null)} />;

    return (
        <div>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tight">Catálogo</h2>
                    <p className="text-slate-500 font-medium mt-2">Modelos y especificaciones técnicas disponibles</p>
                </div>
            </div>

            {/* Grid Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {moduleTypes.map(m => (
                    <div 
                        key={m.id} 
                        onClick={() => setSelectedModuleType(m)} 
                        className="group relative bg-white rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200 flex flex-col"
                    >
                        {/* Decorative Top Bar */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-slate-700 to-slate-900 group-hover:from-sky-500 group-hover:to-indigo-500 transition-all duration-500"></div>

                        {/* Image Container with Technical Grid Background */}
                        <div className="h-56 bg-slate-50 relative p-6 flex items-center justify-center overflow-hidden border-b border-slate-100 group-hover:bg-white transition-colors duration-300">
                            {/* Grid Pattern Background */}
                            <div className="absolute inset-0 opacity-[0.03]" 
                                 style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                            </div>

                            {m.imageUrl ? (
                                <img 
                                    src={m.imageUrl} 
                                    className="w-full h-full object-contain relative z-10 drop-shadow-sm group-hover:scale-105 transition-transform duration-500" 
                                    onClick={(e) => handleImageClick(e, m.imageUrl!)} 
                                    alt={m.name}
                                />
                            ) : (
                                <div className="text-slate-300 flex flex-col items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                    </svg>
                                    <span className="text-xs font-bold uppercase tracking-widest">Sin Imagen</span>
                                </div>
                            )}
                            
                            {/* Floating "Zoom" Action */}
                            {m.imageUrl && (
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="bg-white/90 backdrop-blur rounded-full p-2 shadow-sm text-slate-600 hover:text-sky-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Content Body */}
                        <div className="p-6 flex flex-col flex-1">
                            <div className="mb-auto">
                                <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-sky-700 transition-colors">
                                    {m.name}
                                </h3>
                                <div className="h-0.5 w-10 bg-slate-200 mt-3 mb-3 group-hover:w-full group-hover:bg-sky-100 transition-all duration-500"></div>
                                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                                    {m.description}
                                </p>
                            </div>
                            
                            <div className="pt-5 mt-2 flex items-center justify-between">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600 uppercase tracking-wide border border-slate-200 group-hover:bg-sky-50 group-hover:text-sky-700 group-hover:border-sky-200 transition-colors">
                                    Ficha Técnica
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Empty State / Add New Card Shortcut */}
                <div 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-8 text-slate-400 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 transition-all cursor-pointer min-h-[300px] group"
                >
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-white group-hover:shadow-md transition-all">
                        <span className="text-3xl font-light">+</span>
                    </div>
                    <span className="font-bold text-lg">Añadir Modelo</span>
                    <span className="text-xs mt-1 opacity-70">Agregar al catálogo</span>
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 m-4 transform transition-all" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-800">Crear Nuevo Modelo</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        
                        <form onSubmit={handleCreateSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Modelo</label>
                                <input type="text" placeholder="Ej: Oficina Modular 20ft" value={newModelName} onChange={e => setNewModelName(e.target.value)} className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all" required />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Descripción Técnica</label>
                                <textarea placeholder="Dimensiones, materiales, uso recomendado..." value={newModelDesc} onChange={e => setNewModelDesc(e.target.value)} className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all" rows={3} required />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Plano o Render (Imagen)</label>
                                <FileDropzone onFilesSelected={f => setSelectedFile(f[0])} accept={{ 'image/*': [] }} maxFiles={1} />
                                {selectedFile && (
                                    <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-200 rounded-xl mt-3">
                                        <div className="flex items-center overflow-hidden">
                                            <div className="h-10 w-10 rounded-lg bg-white border border-sky-100 flex items-center justify-center mr-3 shrink-0">
                                                <span className="text-xl">🖼️</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-sky-800 truncate" title={selectedFile.name}>{selectedFile.name}</p>
                                                <p className="text-xs text-sky-600 font-medium">{formatBytes(selectedFile.size)}</p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setSelectedFile(null)} className="text-sky-500 hover:text-red-500 font-bold px-2">
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                <button type="submit" disabled={isCreating} className="px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-sky-600 shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                                    {isCreating ? 'Guardando...' : 'Crear Modelo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Full Screen Image Preview */}
            {previewImage && (
                <div className="fixed inset-0 bg-white/95 z-[60] flex justify-center items-center p-4 cursor-zoom-out" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-lg border border-slate-200" />
                    <button className="absolute top-5 right-5 text-slate-500 hover:text-slate-800">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};
export default ModuleCatalog;
