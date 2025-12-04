import React, { useCallback, useState } from 'react';

interface FileDropzoneProps {
    onFilesSelected: (files: File[]) => void;
    accept?: Record<string, string[]>;
    maxFiles?: number;
    multiple?: boolean;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onFilesSelected, accept = { 'image/*': [], 'application/pdf': [] }, maxFiles = 1, multiple = true }) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragActive(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragActive(false); }, []);
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesSelected(Array.from(e.dataTransfer.files));
        }
    }, []);
    const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
        }
    };
    return (
        <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50'}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => document.getElementById('file-dropzone-input')?.click()}>
            <input id="file-dropzone-input" type="file" className="hidden" multiple={multiple} accept={Object.keys(accept).join(',')} onChange={onFileInputChange} />
            <div className="flex flex-col items-center justify-center space-y-2">
                <p className="text-sm font-medium text-slate-700">{isDragActive ? 'Suelta aquí' : 'Haz clic o arrastra archivos'}</p>
            </div>
        </div>
    );
};
export default FileDropzone;