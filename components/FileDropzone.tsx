
import React, { useCallback, useState } from 'react';

interface FileDropzoneProps {
    onFilesSelected: (files: File[]) => void;
    accept?: Record<string, string[]>;
    maxFiles?: number;
    multiple?: boolean;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ 
    onFilesSelected, 
    accept = { 'image/*': [], 'application/pdf': [] }, 
    maxFiles = 1,
    multiple = true 
}) => {
    const [isDragActive, setIsDragActive] = useState(false);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files) as File[];
            validateAndPassFiles(files);
        }
    }, []);

    const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files) as File[];
            validateAndPassFiles(files);
        }
    };

    const validateAndPassFiles = (files: File[]) => {
        // Basic validation logic could go here
        if (maxFiles === 1) {
            onFilesSelected([files[0]]);
        } else {
            onFilesSelected(files.slice(0, maxFiles));
        }
    };

    return (
        <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-dropzone-input')?.click()}
        >
            <input 
                id="file-dropzone-input"
                type="file" 
                className="hidden" 
                multiple={multiple} 
                accept={Object.keys(accept).join(',')}
                onChange={onFileInputChange}
            />
            
            <div className="flex flex-col items-center justify-center space-y-2">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 ${isDragActive ? 'text-sky-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm font-medium text-slate-700">
                    {isDragActive ? 'Suelta los archivos aquí' : 'Haz clic o arrastra archivos aquí'}
                </p>
                <p className="text-xs text-slate-500">
                    Soporta: {Object.keys(accept).join(', ').replace(/application\//g, '').replace(/image\//g, '')}
                </p>
            </div>
        </div>
    );
};

export default FileDropzone;