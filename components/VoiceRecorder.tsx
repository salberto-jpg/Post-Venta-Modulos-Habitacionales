
import React, { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
    onAudioRecorded: (audioBlob: Blob) => void;
    onDelete: () => void;
    existingAudioUrl?: string | null;
    variant?: 'simple' | 'large'; // New prop to control style
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onAudioRecorded, onDelete, existingAudioUrl, variant = 'simple' }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (audioUrl && !existingAudioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl, existingAudioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                onAudioRecorded(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("No se pudo acceder al micrófono. Verifique los permisos.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const handleDelete = () => {
        setAudioUrl(null);
        setRecordingTime(0);
        onDelete();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- RENDERIZADO ---

    // 1. Estado de Grabación Activa (Diseño flotante o barra)
    if (isRecording) {
        return (
            <div className={`flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100 animate-pulse ${variant === 'large' ? 'w-full' : ''}`}>
                <div className="flex items-center text-red-600 font-mono font-bold text-lg">
                    <div className="w-4 h-4 rounded-full bg-red-600 mr-3 animate-ping"></div>
                    {formatTime(recordingTime)}
                </div>
                <button 
                    type="button" 
                    onClick={stopRecording}
                    className="bg-white text-red-600 border border-red-200 shadow-sm font-bold px-4 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center"
                >
                    <span className="w-3 h-3 bg-red-600 rounded-sm mr-2"></span>
                    Detener
                </button>
            </div>
        );
    }

    // 2. Estado Grabado (Reproductor)
    if (audioUrl) {
        return (
            <div className={`flex items-center p-2 bg-emerald-50 border border-emerald-200 rounded-xl ${variant === 'large' ? 'w-full' : ''}`}>
                <div className="bg-white p-2 rounded-full shadow-sm mr-3">
                    <span className="text-xl">🎤</span>
                </div>
                <audio src={audioUrl} controls className="h-8 flex-1 mr-3" />
                <button 
                    type="button" 
                    onClick={handleDelete}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-all"
                    title="Eliminar audio"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        );
    }

    // 3. Estado Inicial (Botón de Grabar)
    if (variant === 'large') {
        return (
            <button 
                type="button" 
                onClick={startRecording}
                className="group flex flex-col items-center justify-center p-4 transition-all hover:scale-105 active:scale-95"
                title="Grabar nota de voz"
            >
                <div className="w-14 h-14 bg-red-600 rounded-full shadow-lg shadow-red-200 flex items-center justify-center mb-2 group-hover:bg-red-700 transition-colors ring-4 ring-white border border-red-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide group-hover:text-red-600 transition-colors">Grabar</span>
            </button>
        );
    }

    // Estilo simple por defecto
    return (
        <button 
            type="button" 
            onClick={startRecording}
            className="flex items-center text-red-600 hover:text-red-700 font-bold text-sm bg-white border border-red-200 px-3 py-2 rounded-full shadow-sm hover:shadow transition-all"
        >
            <div className="w-3 h-3 rounded-full bg-red-600 mr-2"></div>
            Grabar Nota de Voz
        </button>
    );
};

export default VoiceRecorder;
