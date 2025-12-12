
import React, { useCallback, useState, useRef } from 'react';

interface FileDropzoneProps {
    onFilesSelected: (files: File[]) => void;
    accept?: Record<string, string[]>;
    maxFiles?: number;
    multiple?: boolean;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onFilesSelected, accept = { 'image/*': [], 'application/pdf': [] }, maxFiles = 1, multiple = true }) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragActive(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragActive(false); }, []);
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesSelected(Array.from(e.dataTransfer.files));
        }
    }, [onFilesSelected]);
    
    const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
        }
    };

    return (
        <div 
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 overflow-hidden group ${isDragActive ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200 ring-offset-2' : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50'}`} 
            onDragOver={onDragOver} 
            onDragLeave={onDragLeave} 
            onDrop={onDrop} 
            onClick={() => inputRef.current?.click()}
        >
            <input ref={inputRef} type="file" className="hidden" multiple={multiple} accept={Object.keys(accept).join(',')} onChange={onFileInputChange} />
            
            {/* Translucent Background Icon */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-32 h-32 text-slate-900 transform rotate-12" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                </svg>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3 relative z-10">
                <div className={`p-3.5 rounded-full shadow-sm transition-all duration-300 ${isDragActive ? 'bg-sky-100 text-sky-600 scale-110' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-sky-500 group-hover:shadow-md group-hover:scale-110'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-slate-800 transition-colors">
                        {isDragActive ? '¡Suelta los archivos aquí!' : 'Haz clic o arrastra para subir'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-medium group-hover:text-slate-500">
                        Soporta imágenes (JPG, PNG) y documentos
                    </p>
                </div>
            </div>
        </div>
    );
};
export default FileDropzone;
