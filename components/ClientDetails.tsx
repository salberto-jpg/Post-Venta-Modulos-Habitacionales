
import React, { useState, useEffect } from 'react';
import { getClientDossier, getAllModuleTypes } from '../services/supabaseService';
import { type Client, type Module, type Ticket, type Document, TicketStatus, type ModuleType } from '../types';
import Spinner from './Spinner';
import AddModuleInstanceModal from './AddModuleInstanceModal';
import ModuleInstanceDetails from './ModuleInstanceDetails';
import AddClientModal from './AddClientModal';

interface ClientDetailsProps {
    client: Client;
    onBack: () => void;
}

interface ClientDossierData {
    client: Client;
    modules: Module[];
    tickets: Ticket[];
    documents: Document[];
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ client, onBack }) => {
    const [data, setData] = useState<ClientDossierData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'modules' | 'history' | 'docs'>('modules');
    const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [isEditClientOpen, setIsEditClientOpen] = useState(false);
    const [moduleTypes, setModuleTypes] = useState<ModuleType[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [dossier, types] = await Promise.all([
                getClientDossier(client.id),
                getAllModuleTypes()
            ]);
            setData(dossier);
            setModuleTypes(types);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [client.id]);

    if (loading || !data) return <div className="flex justify-center p-10"><Spinner /></div>;

    if (selectedModule) {
        return (
            <ModuleInstanceDetails 
                moduleInstance={selectedModule} 
                history={data.tickets.filter(t => t.moduleId === selectedModule.id)}
                onBack={() => {
                    setSelectedModule(null);
                    fetchData(); // Refresh in case module was edited
                }}
            />
        );
    }

    const { client: c } = data;

    const getDocumentSourceLabel = (doc: Document) => {
        if (doc.clientId) return <span className="bg-sky-100 text-sky-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Cliente</span>;
        if (doc.moduleId) {
            const mod = data.modules.find(m => m.id === doc.moduleId);
            return <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Módulo: {mod?.serialNumber}</span>;
        }
        if (doc.moduleTypeId) {
            const type = moduleTypes.find(t => t.id === doc.moduleTypeId);
            return <span className="bg-violet-100 text-violet-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Catálogo: {type?.name}</span>;
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-lg shadow-sm border border-slate-200">
            {/* Header / Info Personal */}
            <div className="p-6 bg-white border-b border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-sky-600 flex items-center">
                        &larr; Volver a Clientes
                    </button>
                    <button 
                        onClick={() => setIsEditClientOpen(true)}
                        className="text-sm text-sky-600 hover:text-sky-800 font-medium flex items-center border border-sky-200 bg-sky-50 px-3 py-1 rounded-md"
                    >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Editar Cliente
                    </button>
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="flex-1">
                        <div className="mb-4">
                            <h1 className="text-3xl font-bold text-slate-800 flex items-center flex-wrap">
                                {c.name}
                                <span className="ml-3 px-3 py-1 bg-sky-100 text-sky-800 text-xs rounded-full font-semibold uppercase tracking-wide">Cliente</span>
                            </h1>
                            {c.fantasyName && <p className="text-lg text-slate-500 font-medium">{c.fantasyName}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                            {/* Contact Info */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider border-b pb-1 mb-2">Contacto</h4>
                                <p><span className="text-slate-400 font-medium w-16 inline-block">Email:</span> <span className="text-slate-700">{c.email}</span></p>
                                <p><span className="text-slate-400 font-medium w-16 inline-block">Tel:</span> <span className="text-slate-700">{c.phone}</span></p>
                                {c.secondaryPhone && <p><span className="text-slate-400 font-medium w-16 inline-block">Alt:</span> <span className="text-slate-700">{c.secondaryPhone}</span></p>}
                                {c.website && <p><span className="text-slate-400 font-medium w-16 inline-block">Web:</span> <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">{c.website}</a></p>}
                            </div>

                            {/* Tax Info */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider border-b pb-1 mb-2">Datos Fiscales</h4>
                                <p><span className="text-slate-400 font-medium w-16 inline-block">CUIT:</span> <span className="text-slate-700">{c.cuit || '-'}</span></p>
                                <p><span className="text-slate-400 font-medium w-16 inline-block">IVA:</span> <span className="text-slate-700">{c.taxCondition || '-'}</span></p>
                                <p><span className="text-slate-400 font-medium w-16 inline-block">Alta:</span> <span className="text-slate-700">{new Date(c.createdAt).toLocaleDateString()}</span></p>
                            </div>

                            {/* Location */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider border-b pb-1 mb-2">Ubicación</h4>
                                <p className="text-slate-700">{c.address || 'Sin dirección'}</p>
                                <p className="text-slate-700">
                                    {[c.city, c.province, c.country].filter(Boolean).join(', ') || '-'}
                                </p>
                                {c.zipCode && <p className="text-slate-500 text-xs">CP: {c.zipCode}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="text-right shrink-0">
                        <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 text-center min-w-[140px] shadow-sm">
                            <p className="text-3xl font-extrabold text-slate-800">{data.modules.length}</p>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-1">Módulos Activos</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-6">
                <TabButton label="Módulos Instalados" active={activeTab === 'modules'} onClick={() => setActiveTab('modules')} />
                <TabButton label="Historial de Servicio" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                <TabButton label="Documentación" active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} />
            </div>

            {/* Tab Content */}
            <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50">
                
                {activeTab === 'modules' && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <button 
                                onClick={() => setIsAddModuleOpen(true)}
                                className="bg-sky-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-sky-700 text-sm font-medium flex items-center"
                            >
                                <PlusIcon className="h-5 w-5 mr-2" />
                                Asociar Nuevo Módulo
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {data.modules.map(mod => (
                                <div 
                                    key={mod.id} 
                                    onClick={() => setSelectedModule(mod)}
                                    className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-300 cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-slate-800">{mod.modelName}</h3>
                                        {mod.warrantyExpiration && (
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                                                Garantía Activa
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="mb-4">
                                        <p className="text-xs text-slate-500 uppercase font-semibold">ID Trazabilidad (Serial)</p>
                                        <p className="font-mono text-sm bg-slate-100 p-1 rounded inline-block text-slate-700">{mod.serialNumber}</p>
                                    </div>

                                    <div className="text-sm text-slate-500 space-y-1">
                                        <p>Instalación: {new Date(mod.installationDate).toLocaleDateString()}</p>
                                        {mod.address && <p className="truncate">Ubicación: {mod.address}</p>}
                                    </div>
                                    
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                        {mod.latitude && mod.longitude ? (
                                             <span className="text-xs text-sky-600 flex items-center">
                                                <MapPinIcon className="h-3 w-3 mr-1" /> Geolocalizado
                                             </span>
                                        ) : <span className="text-xs text-slate-400">Sin ubicación</span>}
                                        <span className="text-sm font-medium text-sky-600 group-hover:underline">Ver Detalles &rarr;</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {data.modules.length === 0 && <p className="text-center text-slate-500 py-8">Este cliente no tiene módulos asociados aún.</p>}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {data.tickets.length > 0 ? (
                            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
                                {data.tickets.map(ticket => (
                                    <div key={ticket.id} className="relative pl-8">
                                        <span className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white ${
                                            ticket.status === TicketStatus.Closed ? 'bg-emerald-500' : 'bg-sky-500'
                                        }`}></span>
                                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-xs text-slate-400 font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                                    <h4 className="font-bold text-slate-800">{ticket.title}</h4>
                                                    <p className="text-sm text-slate-600 mt-1">{ticket.description}</p>
                                                </div>
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    ticket.status === TicketStatus.Closed ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                                                }`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs text-slate-500">
                                                Sobre Módulo: {ticket.moduleSerial}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-8">No hay historial de servicios registrado.</p>
                        )}
                    </div>
                )}

                {activeTab === 'docs' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.documents.map(doc => (
                            <div key={doc.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-start">
                                <div className="p-2 bg-slate-100 rounded mr-3">
                                    <DocumentIcon className="h-6 w-6 text-slate-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-800 truncate" title={doc.name}>{doc.name}</h4>
                                    <div className="flex items-center gap-2 mt-1 mb-1">
                                        <span className="text-xs text-slate-500 capitalize">{doc.type}</span>
                                        {getDocumentSourceLabel(doc)}
                                    </div>
                                    <div className="mt-2">
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 hover:underline font-medium">Ver Documento</a>
                                    </div>
                                </div>
                            </div>
                        ))}
                         {data.documents.length === 0 && <p className="col-span-3 text-center text-slate-500 py-8">No hay documentos disponibles.</p>}
                    </div>
                )}
            </div>

             {isAddModuleOpen && (
                <AddModuleInstanceModal
                    clientId={client.id}
                    onClose={() => setIsAddModuleOpen(false)}
                    onSuccess={() => {
                        setIsAddModuleOpen(false);
                        fetchData();
                    }}
                />
            )}
            
            {isEditClientOpen && (
                <AddClientModal
                    onClose={() => setIsEditClientOpen(false)}
                    onClientAdded={() => {
                        setIsEditClientOpen(false);
                        fetchData();
                    }}
                    clientToEdit={data.client}
                />
            )}
        </div>
    );
};

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
            active ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'
        }`}
    >
        {label}
    </button>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

const DocumentIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;

const PencilIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

export default ClientDetails;
