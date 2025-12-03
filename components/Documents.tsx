
import React, { useState, useEffect } from 'react';
import { getAllDocuments } from '../services/supabaseService';
import { type Document } from '../types';
import Spinner from './Spinner';
import AddDocumentModal from './AddDocumentModal';

interface PopulatedDocument extends Document {
    moduleSerial: string;
    clientName: string;
}

const getDocumentIcon = (type: Document['type']) => {
    switch (type) {
        case 'manual':
            return <BookOpenIcon className="h-6 w-6 text-sky-500" />;
        case 'warranty':
            return <ShieldCheckIcon className="h-6 w-6 text-emerald-500" />;
        case 'plan':
            return <MapIcon className="h-6 w-6 text-violet-500" />;
        default:
            return <DocumentIcon className="h-6 w-6 text-slate-500" />;
    }
};

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
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800">Biblioteca de Documentos</h2>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center bg-sky-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-sky-700 transition-colors"
                >
                    <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                    Cargar Documento
                </button>
            </div>
            <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-md border border-slate-300">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-transparent">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Documento</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Módulo (Serial)</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha de Carga</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="bg-transparent divide-y divide-slate-200">
                            {documents.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-200/60">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="mr-3">{getDocumentIcon(doc.type)}</div>
                                            <span className="text-sm font-medium text-slate-900">{doc.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">{doc.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{doc.moduleSerial}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{doc.clientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <a href={doc.url} className="text-sky-600 hover:text-sky-800 font-semibold">Ver</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
const ArrowUpTrayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);
const BookOpenIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>;
const ShieldCheckIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" /></svg>;
const MapIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.5-12.75a.75.75 0 01.75.75v14.25a.75.75 0 01-1.5 0V4.5a.75.75 0 01.75-.75zM3.75 12a.75.75 0 01.75-.75h14.25a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75z" /></svg>;
const DocumentIcon: React.FC<{className?: string}> = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;

export default Documents;
