import { GOOGLE_CALENDAR_SCOPES } from '../config';

declare global {
    interface Window {
        google: any;
    }
}

let tokenClient: any;
let accessToken: string | null = null;
let onTokenCallback: ((token: string) => void) | null = null;

// Helper para obtener claves dinámicas
export const getApiConfig = () => {
    const storedClientId = localStorage.getItem('google_client_id');
    const storedApiKey = localStorage.getItem('google_api_key');
    return {
        clientId: storedClientId || '',
        apiKey: storedApiKey || ''
    };
};

export const saveApiConfig = (clientId: string, apiKey: string) => {
    localStorage.setItem('google_client_id', clientId.trim());
    localStorage.setItem('google_api_key', apiKey.trim());
};

export const hasValidConfig = () => {
    const { clientId, apiKey } = getApiConfig();
    return clientId.length > 10 && apiKey.length > 10 && !clientId.includes('PON_AQUI');
};

export const initGoogleClient = (onTokenReceived: (token: string) => void) => {
    onTokenCallback = onTokenReceived;
    const { clientId } = getApiConfig();

    if (!hasValidConfig()) {
        console.warn("⚠️ Google API no configurada. Usando modo inactivo.");
        return;
    }

    if (typeof window !== 'undefined' && window.google && window.google.accounts) {
        try {
            // Inicializar el cliente de token
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: GOOGLE_CALENDAR_SCOPES,
                ux_mode: 'popup',
                callback: (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        accessToken = tokenResponse.access_token;
                        if (onTokenCallback) onTokenCallback(accessToken);
                    } else {
                        console.error("Respuesta de token vacía o error:", tokenResponse);
                    }
                },
                error_callback: (error: any) => {
                    console.error("Error en Google Auth:", error);
                    if (error.type === 'popup_closed') {
                         console.warn("Popup cerrado por el usuario");
                    } else {
                         alert(`Error de autenticación Google (${error.type}): ${error.message || 'Desconocido'}`);
                    }
                }
            });
            console.log("Google Token Client inicializado correctamente.");
        } catch (e) {
            console.error("Error inicializando Google Client:", e);
        }
    } else {
        console.warn("Librería Google GIS no cargada aún.");
    }
};

export const loginToGoogle = () => {
    if (!hasValidConfig()) {
        alert("Por favor, configura las credenciales de Google API primero (icono de engranaje).");
        return;
    }

    const { clientId } = getApiConfig();
    
    // Check script loaded
    if (!window.google || !window.google.accounts) {
        alert("La librería de seguridad de Google no se ha cargado. Verifica si tienes bloqueadores de anuncios activados o recarga la página.");
        return;
    }

    // Inicialización Lazy si no existe
    if (!tokenClient) {
        console.log("Inicializando cliente antes de login...");
        try {
            initGoogleClient(onTokenCallback || ((t) => console.log("Token recibido (JIT):", t)));
        } catch (e) {
            alert("Error crítico al inicializar cliente Google: " + e);
            return;
        }
    }

    // Ejecución inmediata
    if (tokenClient) {
        // requestAccessToken debe ser resultado directo de la acción del usuario (click)
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        alert("No se pudo iniciar el cliente de autenticación. Verifica que el 'Client ID' sea correcto en la configuración.");
    }
};

export const logoutFromGoogle = () => {
    if (accessToken && window.google) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Access token revoked');
        });
    }
    accessToken = null;
};

export const getGoogleUserProfile = async () => {
    if (!accessToken) return null;

    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.status === 401) {
             accessToken = null; // Token inválido
             return null;
        }
        if (!response.ok) throw new Error('Failed to fetch user profile');
        return await response.json();
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};

export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
}

export const fetchGoogleEvents = async (): Promise<GoogleCalendarEvent[]> => {
    if (!accessToken) throw new Error("No access token");
    
    const { apiKey } = getApiConfig();
    if (!apiKey) throw new Error("No API Key configured");

    const now = new Date();
    const startRange = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    
    try {
        const calendarId = 'primary';
        
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${startRange}&showDeleted=false&singleEvents=true&maxResults=250&orderBy=startTime`,
            { 
                headers: { 
                    'Authorization': `Bearer ${accessToken}`, 
                    'Content-Type': 'application/json' 
                } 
            }
        );

        if (response.status === 401) {
            accessToken = null;
            throw new Error("TOKEN_EXPIRED");
        }

        if (response.status === 403) {
             throw new Error("PERMISO_DENEGADO: Verifica que tu usuario de prueba esté agregado en Google Cloud Console o que la API esté habilitada.");
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error API Google');
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        throw error;
    }
};