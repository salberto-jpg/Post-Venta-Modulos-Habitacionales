
import React, { useState, useEffect } from 'react';
import { getClientDossier, deleteClient, deleteDocument } from '../services/supabaseService';
import { type Client, type Module, TicketStatus, Priority } from '../types';
import Spinner from './Spinner';
import AddModuleInstanceModal from './AddModuleInstanceModal';
import ModuleInstanceDetails from './ModuleInstanceDetails';
import AddClientModal from './AddClientModal';
import ConfirmModal from './ConfirmModal';
import AddDocumentModal from './AddDocumentModal';

interface ClientDetailsProps { client: Client; onBack: () => void; }

const ClientDetails: React.FC<ClientDetailsProps> = ({ client: initialClient, onBack }) => {
    const [clientData, setClientData] = useState<Client>(initialClient);
    const [dossierData, setDossierData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'modules' | 'docs'>('modules');
    const [isAddModOpen, setIsAddModOpen] = useState(false);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Document Modals
    const [isAddDocOpen, setIsAddDocOpen] = useState(false);

    // Modal States
    const [showDeleteClientConfirm, setShowDeleteClientConfirm] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{id: string, name: string} | null>(null);
    
    // Data Modal State (Dynamic Contact Info)
    const [dataModal, setDataModal] = useState<{ isOpen: boolean; title: string; value: string; type: 'email' | 'phone' | 'address' | 'text' } | null>(null);

    // KPI Detail Modal State
    const [kpiModal, setKpiModal] = useState<'modules' | 'tickets' | null>(null);

    const fetchDossier = async () => {
        setLoading(true);
        try {
            const data = await getClientDossier(clientData.id);
            setDossierData(data);
            setClientData(data.client);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchDossier(); 
    }, [initialClient.id]);

    const handleDeleteClient = async () => {
        setShowDeleteClientConfirm(false);
        setIsDeleting(true);
        try {
            await deleteClient(clientData.id);
            onBack();
        } catch (e: any) {
            console.error(e);
            alert("Error al eliminar: " + (e.message || "Error desconocido."));
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

    if (loading) return <div className="flex justify-center items-center h-screen bg-slate-50"><Spinner /></div>;
    
    if (selectedModule) return <ModuleInstanceDetails moduleInstance={selectedModule} history={dossierData.tickets.filter((t:any) => t.moduleId === selectedModule.id)} onBack={() => setSelectedModule(null)} />;

    // Calculamos estadísticas rápidas
    const activeTickets = dossierData?.tickets?.filter((t: any) => t.status !== TicketStatus.Closed) || [];
    const activeTicketsCount = activeTickets.length;
    const modulesCount = dossierData?.modules?.length || 0;
    // const docsCount = dossierData?.documents?.length || 0; // Ya no se muestra en KPI

    return (
        <div className="flex flex-col h-full bg-slate-100 min-h-screen relative animate-in fade-in duration-500">
            
            {/* --- HERO HEADER PREMIUM --- */}
            <div className="relative bg-slate-900 text-white pb-24 pt-10 px-6 md:px-10 shadow-2xl overflow-hidden shrink-0">
                {/* Background Decorativo */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
                
                <div className="relative z-10 max-w-7xl mx-auto">
                    <button onClick={onBack} className="group flex items-center text-slate-400 hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-wider">
                        <span className="bg-slate-800 p-1.5 rounded-full mr-2 group-hover:bg-sky-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </span>
                        Volver al listado
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-gradient-to-br from-sky-500 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 text-2xl font-bold text-white">
                                    {clientData.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
                                        {clientData.name}
                                    </h1>
                                    <p className="text-slate-400 text-sm md:text-base font-medium">
                                        {clientData.fantasyName || 'Cliente Corporativo'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 mt-6 text-sm text-slate-300 font-medium">
                                <button 
                                    onClick={() => setDataModal({ isOpen: true, title: 'Correo Electrónico', value: clientData.email, type: 'email' })}
                                    className="flex items-center bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm cursor-pointer transition-colors"
                                >
                                    <svg className="w-4 h-4 mr-2 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    {clientData.email}
                                </button>
                                {clientData.phone && (
                                    <button 
                                        onClick={() => setDataModal({ isOpen: true, title: 'Teléfono Principal', value: clientData.phone, type: 'phone' })}
                                        className="flex items-center bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm cursor-pointer transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        {clientData.phone}
                                    </button>
                                )}
                                {clientData.address && (
                                    <button 
                                        onClick={() => setDataModal({ isOpen: true, title: 'Dirección Comercial', value: clientData.city ? `${clientData.address}, ${clientData.city}` : clientData.address, type: 'address' })}
                                        className="flex items-center bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm cursor-pointer transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {clientData.city ? `${clientData.address}, ${clientData.city}` : clientData.address}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsEditOpen(true)}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center shadow-lg"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Editar Perfil
                            </button>
                            <button 
                                onClick={() => setShowDeleteClientConfirm(true)}
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
                
                {/* KPI CARDS - Ahora son botones de solo 2 columnas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <button 
                        onClick={() => setKpiModal('modules')}
                        className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 flex items-center justify-between group hover:-translate-y-1 hover:shadow-xl hover:border-sky-200 transition-all text-left"
                    >
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Módulos Instalados</p>
                            <p className="text-3xl font-black text-slate-800 group-hover:text-sky-600 transition-colors">{modulesCount}</p>
                        </div>
                        <div className="bg-sky-50 w-12 h-12 rounded-xl flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                    </button>
                    
                    <button 
                        onClick={() => setKpiModal('tickets')}
                        className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 flex items-center justify-between group hover:-translate-y-1 hover:shadow-xl hover:border-amber-200 transition-all text-left"
                    >
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Tickets Pendientes</p>
                            <p className={`text-3xl font-black ${activeTicketsCount > 0 ? 'text-amber-500' : 'text-slate-800'}`}>{activeTicketsCount}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${activeTicketsCount > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </button>
                </div>

                {/* CONTENIDO TABS */}
                <div className="flex-1 flex flex-col">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-3">
                        {/* Píldoras de Navegación */}
                        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
                            <button
                                onClick={() => setActiveTab('modules')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                                    activeTab === 'modules' 
                                        ? 'bg-slate-900 text-white shadow-md transform scale-105' 
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                Módulos Habitacionales
                            </button>
                            <button
                                onClick={() => setActiveTab('docs')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                                    activeTab === 'docs' 
                                        ? 'bg-slate-900 text-white shadow-md transform scale-105' 
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                Documentos Legales Personales
                            </button>
                        </div>

                        {activeTab === 'modules' && (
                            <button 
                                onClick={() => setIsAddModOpen(true)} 
                                className="bg-sky-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-sky-500 hover:shadow-sky-200/50 transition-all flex items-center active:scale-95"
                            >
                                <span className="text-xl mr-2 leading-none mb-0.5">+</span> Asociar Módulo
                            </button>
                        )}
                        {activeTab === 'docs' && (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsAddDocOpen(true)} 
                                    className="bg-sky-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg hover:bg-sky-500 transition-all flex items-center text-sm"
                                >
                                    <span className="text-xl mr-2 leading-none mb-0.5">+</span> Cargar Nuevo
                                </button>
                            </div>
                        )}
                    </div>

                    {/* VISTA MÓDULOS */}
                    {activeTab === 'modules' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {dossierData.modules.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {dossierData.modules.map((m: any) => (
                                        <div 
                                            key={m.id} 
                                            onClick={() => setSelectedModule(m)} 
                                            className="group bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-xl hover:border-sky-300 transition-all duration-300 relative flex flex-col h-full"
                                        >
                                            {/* Decorative Top */}
                                            <div className="h-2 w-full bg-gradient-to-r from-slate-200 to-slate-300 group-hover:from-sky-400 group-hover:to-indigo-400 transition-all"></div>
                                            
                                            <div className="p-6 flex-1 flex flex-col relative">
                                                {/* Grid Pattern BG */}
                                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                </div>

                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                        🏠
                                                    </div>
                                                    {m.latitude ? (
                                                        <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100 flex items-center">
                                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></span> GPS Activo
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-400 px-2 py-1 rounded border border-slate-200">
                                                            Sin GPS
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-sky-600 transition-colors">
                                                    {m.modelName}
                                                </h3>
                                                
                                                <div className="mb-6">
                                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Serial Number</p>
                                                    <div className="bg-slate-100 border border-slate-200 rounded px-3 py-1.5 font-mono text-sm text-slate-600 shadow-inner inline-block">
                                                        {m.serialNumber}
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-medium text-slate-500">
                                                    <span>Instalado: {new Date(m.installationDate).toLocaleDateString()}</span>
                                                    <span className="text-sky-600 group-hover:underline flex items-center">
                                                        Ver Detalles &rarr;
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                    <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-3xl">📦</div>
                                    <h3 className="text-lg font-bold text-slate-800">Sin Módulos</h3>
                                    <p className="text-slate-500 text-sm mb-6">Este cliente aún no tiene módulos asociados.</p>
                                    <button onClick={() => setIsAddModOpen(true)} className="text-sky-600 font-bold hover:underline">Asociar el primero ahora</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VISTA DOCUMENTOS */}
                    {activeTab === 'docs' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {dossierData.documents.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {dossierData.documents.map((d: any) => (
                                        <div key={d.id} className="group bg-white p-4 rounded-xl border border-slate-200 hover:shadow-lg hover:border-sky-200 transition-all relative">
                                            <button 
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDocToDelete({id: d.id, name: d.name}); }}
                                                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>

                                            <a href={d.url} target="_blank" rel="noreferrer" className="flex flex-col h-full">
                                                <div className="flex items-center mb-3">
                                                    <div className={`p-3 rounded-lg mr-3 shrink-0 ${
                                                        d.type === 'contract' ? 'bg-violet-50 text-violet-600' :
                                                        d.type === 'manual' ? 'bg-sky-50 text-sky-600' :
                                                        'bg-emerald-50 text-emerald-600'
                                                    }`}>
                                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">{d.type}</span>
                                                        <h4 className="font-bold text-slate-800 text-sm truncate leading-tight group-hover:text-sky-600 transition-colors" title={d.name}>{d.name}</h4>
                                                    </div>
                                                </div>
                                                <div className="mt-auto pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                                    <span>{new Date(d.uploadedAt).toLocaleDateString()}</span>
                                                    <span className="text-sky-500 bg-sky-50 px-2 py-0.5 rounded group-hover:bg-sky-100 transition-colors">Abrir PDF</span>
                                                </div>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                    <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-3xl opacity-50">📄</div>
                                    <h3 className="text-lg font-bold text-slate-800">Carpeta Vacía</h3>
                                    <p className="text-slate-500 text-sm">No hay documentos personales cargados para este cliente.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}
            {isAddModOpen && <AddModuleInstanceModal clientId={clientData.id} onClose={() => setIsAddModOpen(false)} onSuccess={() => { setIsAddModOpen(false); fetchDossier(); }} />}
            {isEditOpen && <AddClientModal onClose={() => setIsEditOpen(false)} onClientAdded={() => { setIsEditOpen(false); fetchDossier(); }} clientToEdit={clientData} />}
            
            {isAddDocOpen && (
                <AddDocumentModal 
                    onClose={() => setIsAddDocOpen(false)} 
                    onDocumentAdded={() => { setIsAddDocOpen(false); fetchDossier(); }}
                    initialTargetId={clientData.id}
                    context="client"
                    initialType="contract"
                    lockModelSelection={true} 
                />
            )}

            <ConfirmModal 
                isOpen={showDeleteClientConfirm}
                title="Eliminar Cliente"
                message={`¿Estás seguro de que deseas eliminar a ${clientData.name}?\n\nEsta acción borrará PERMANENTEMENTE:\n• El cliente\n• Todos sus módulos\n• Todos sus tickets\n• Todos sus documentos`}
                confirmText="Sí, Eliminar Todo"
                isDestructive={true}
                onConfirm={handleDeleteClient}
                onCancel={() => setShowDeleteClientConfirm(false)}
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

            {/* KPI DETAIL MODAL (GENERIC LIST) */}
            {kpiModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex justify-center items-center p-4 animate-in fade-in" onClick={() => setKpiModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] border border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center">
                                {kpiModal === 'modules' ? '📦 Detalle de Módulos' : '⏱️ Tickets Pendientes'}
                            </h3>
                            <button onClick={() => setKpiModal(null)} className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-full border shadow-sm">✕</button>
                        </div>
                        <div className="overflow-y-auto p-4 flex-1 bg-white">
                            {kpiModal === 'modules' ? (
                                dossierData.modules.length > 0 ? (
                                    <div className="space-y-3">
                                        {dossierData.modules.map((m: any) => (
                                            <div key={m.id} className="flex items-start p-3 rounded-lg border border-slate-100 hover:border-sky-200 hover:bg-sky-50 transition-colors">
                                                <div className="bg-white p-2 rounded border border-slate-200 mr-3 text-xl shadow-sm">🏠</div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{m.modelName}</p>
                                                    <p className="text-xs text-slate-500 font-mono mt-0.5">S/N: {m.serialNumber}</p>
                                                    {m.address && <p className="text-xs text-slate-400 mt-1 truncate max-w-[250px]">📍 {m.address}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-center text-slate-400 py-4 italic">No hay módulos registrados.</p>
                            ) : (
                                activeTickets.length > 0 ? (
                                    <div className="space-y-3">
                                        {activeTickets.map((t: any) => (
                                            <div key={t.id} className="flex items-start p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-colors">
                                                <div className={`w-2 h-2 rounded-full mt-1.5 mr-3 shrink-0 ${t.status === TicketStatus.New ? 'bg-red-500' : 'bg-violet-500'}`}></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-bold text-slate-800 text-sm truncate">{t.title}</p>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500 uppercase font-bold">{t.status}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{t.description}</p>
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                                                        <span className={`text-[10px] font-bold px-1.5 rounded ${t.priority === Priority.High ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{t.priority}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-center text-slate-400 py-4 italic">No hay tickets pendientes.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CONTACT DATA POPUP MODAL */}
            {dataModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex justify-center items-center p-4 animate-in fade-in" onClick={() => setDataModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center relative border border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl shadow-sm ${
                            dataModal.type === 'email' ? 'bg-sky-100 text-sky-600' : 
                            dataModal.type === 'phone' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                            {dataModal.type === 'email' ? '@' : dataModal.type === 'phone' ? '📞' : '📍'}
                        </div>
                        <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">{dataModal.title}</h3>
                        <p className="text-slate-900 font-black text-lg leading-tight break-words px-4 mb-6 select-all">
                            {dataModal.value}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => { navigator.clipboard.writeText(dataModal.value); alert("Copiado al portapapeles"); setDataModal(null); }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-colors"
                            >
                                Copiar
                            </button>
                            {dataModal.type === 'email' && (
                                <a href={`mailto:${dataModal.value}`} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 rounded-xl transition-colors flex items-center justify-center">
                                    Enviar Correo
                                </a>
                            )}
                            {dataModal.type === 'phone' && (
                                <a href={`tel:${dataModal.value}`} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl transition-colors flex items-center justify-center">
                                    Llamar
                                </a>
                            )}
                            {dataModal.type === 'address' && (
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dataModal.value)}`} target="_blank" rel="noreferrer" className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl transition-colors flex items-center justify-center">
                                    Ver Mapa
                                </a>
                            )}
                        </div>
                        <button onClick={() => setDataModal(null)} className="absolute top-2 right-2 p-2 text-slate-300 hover:text-slate-500">✕</button>
                    </div>
                </div>
            )}
        </div>
    );
};
export default ClientDetails;
