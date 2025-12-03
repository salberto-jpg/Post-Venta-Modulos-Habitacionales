import React, { useState, useEffect } from 'react';
import { getAllDocuments } from '../services/supabaseService';
import { type Document } from '../types';
import Spinner from './Spinner';
import AddDocumentModal from './AddDocumentModal';

interface PopulatedDocument extends Document {
    moduleSerial: string;
    clientName: string;
}

const getDocumentIcon = (type: Document['type'], className: string = "h-6 w-6") => {
    switch (type) {
        case 'manual': return <BookOpenIcon className={`${className} text-sky-500`} />;
        case 'warranty': return <ShieldCheckIcon className={`${className} text-emerald-500`} />;
        case 'plan': return <MapIcon className={`${className} text-violet-500`} />;
        default: return <DocumentIcon className={`${className} text-slate-400`} />;
    }
};

const getDocumentLabel = (type: Document['type']) => {
    switch (type) {
        case 'manual': return 'Manual';
        case 'warranty': return 'Garantía';
        case 'plan': return 'Plano';
        case 'contract': return 'Contrato';
        default: return 'Documento';
    }
}

const Documents: React.FC = () => {
    const [documents, setDocuments] = useState<PopulatedDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const data = await getAllDocuments();
            setDocuments(data);
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleDocumentAdded = () => {
        fetchDocuments();
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Biblioteca Digital</h2>
                    <p className="text-lg text-slate-500 mt-2">Repositorio centralizado de documentos.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center justify-center bg-sky-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-sky-600/20 hover:bg-sky-700 hover:shadow-sky-600/40 transition-all font-bold"
                >
                    <ArrowUpTrayIcon className="h-6 w-6 mr-2" />
                    Cargar Documento
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {documents.map(doc => (
                    <div 
                        key={doc.id} 
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-sky-200 hover:-translate-y-1 transition-all group flex flex-col items-center text-center h-full"
                    >
                        <div className="h-20 w-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            {getDocumentIcon(doc.type, "h-10 w-10")}
                        </div>
                        
                        <div className="mb-4 flex-1 w-full">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 mb-2">
                                {getDocumentLabel(doc.type)}
                            </span>
                            <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1 truncate w-full" title={doc.name}>
                                {doc.name}
                            </h3>
                            {doc.version && <p className="text-xs text-sky-600 font-bold">v{doc.version}</p>}
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                        </div>

                        <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full py-2.5 rounded-lg border border-sky-200 text-sky-600 font-bold text-sm hover:bg-sky-600 hover:text-white transition-colors flex items-center justify-center"
                        >
                            Ver Archivo
                        </a>
                    </div>
                ))}
            </div>

            {isAddModalOpen && (
                <AddDocumentModal
                    onClose={() => setIsAddModalOpen(false)}
                    onDocumentAdded={handleDocumentAdded}
                />
            )}
        </div>
    );
};

// Icons
const ArrowUpTrayIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const BookOpenIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>;
const ShieldCheckIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" /></svg>;
const MapIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.5-12.75a.75.75 0 01.75.75v14.25a.75.75 0 01-1.5 0V4.5a.75.75 0 01.75-.75zM3.75 12a.75.75 0 01.75-.75h14.25a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75z" /></svg>;
const DocumentIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;

export default Documents;
