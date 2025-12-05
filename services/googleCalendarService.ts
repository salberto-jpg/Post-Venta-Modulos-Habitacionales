
import { GOOGLE_CALENDAR_SCOPES } from '../config';

declare global {
    interface Window {
        google: any;
    }
}

let tokenClient: any;
let accessToken: string | null = localStorage.getItem('google_access_token');
let tokenExpiration: number = parseInt(localStorage.getItem('google_token_expiration') || '0');

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

export const isTokenValid = () => {
    return accessToken && Date.now() < tokenExpiration;
};

export const initGoogleClient = (onTokenReceived: (token: string) => void) => {
    const { clientId } = getApiConfig();

    if (!hasValidConfig()) {
        console.warn("⚠️ Google API no configurada.");
        return;
    }

    // Si hay un token válido guardado, lo usamos inmediatamente
    if (isTokenValid() && accessToken) {
        console.log("Restaurando sesión de Google válida...");
        onTokenReceived(accessToken);
    }

    if (typeof window !== 'undefined' && window.google && window.google.accounts) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: GOOGLE_CALENDAR_SCOPES,
            ux_mode: 'popup',
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    // Token suele durar 3599 segundos. Guardamos expiración.
                    const expiresIn = (tokenResponse.expires_in || 3599) * 1000;
                    tokenExpiration = Date.now() + expiresIn;
                    
                    localStorage.setItem('google_access_token', accessToken as string);
                    localStorage.setItem('google_token_expiration', tokenExpiration.toString());
                    
                    if (onTokenCallback) onTokenCallback(accessToken as string);
                }
            },
        });
    }
    
    // Guardamos el callback globalmente para re-intentos
    onTokenCallback = onTokenReceived;
};

let onTokenCallback: ((token: string) => void) | null = null;

export const loginToGoogle = () => {
    if (!hasValidConfig()) {
        alert("Configura las credenciales API primero.");
        return;
    }
    if (tokenClient) {
        // CAMBIO IMPORTANTE: 'consent' fuerza a Google a mostrar la pantalla de permisos nuevamente.
        // Esto es necesario para actualizar de 'readonly' a permisos de escritura.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Si el script no cargó, reintentamos init
        initGoogleClient(onTokenCallback || (() => {}));
    }
};

export const logoutFromGoogle = () => {
    if (accessToken && window.google) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Access token revoked');
        });
    }
    accessToken = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiration');
};

export const getGoogleUserProfile = async () => {
    if (!accessToken) return null;
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.status === 401) return null; // Token expirado
        return await response.json();
    } catch (error) {
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

export const createGoogleCalendarEvent = async (eventData: { title: string, description: string, date: string, location?: string }) => {
    if (!accessToken) return false;

    // NOTA: No usamos '?key=' aquí. Con el token OAuth es suficiente.
    
    // Evento de día completo
    const startDate = new Date(eventData.date);
    const endDate = new Date(eventData.date);
    endDate.setDate(endDate.getDate() + 1);
    
    const body = {
        summary: `🛠️ ${eventData.title}`,
        description: eventData.description,
        location: eventData.location || '',
        start: { date: eventData.date },
        end: { date: endDate.toISOString().split('T')[0] },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 30 },
            ],
        },
    };

    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const errJson = await response.json();
            console.error("Google Calendar API Error:", errJson);
            // Si es un error de permisos, devolvemos false para manejarlo en la UI
            if (response.status === 403) {
                 console.error("Permisos insuficientes. El usuario debe reconectar la cuenta.");
            }
            throw new Error('Error API Google: ' + (errJson.error?.message || response.statusText));
        }
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const fetchGoogleEvents = async (): Promise<GoogleCalendarEvent[]> => {
    if (!accessToken) throw new Error("No token");
    
    const now = new Date();
    const startRange = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    
    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startRange}&showDeleted=false&singleEvents=true&maxResults=250&orderBy=startTime`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        if (response.status === 401) {
            accessToken = null; // Forzar re-login en UI
            localStorage.removeItem('google_access_token');
            throw new Error("TOKEN_EXPIRED");
        }
        const errJson = await response.json();
        console.error("Google Fetch Error:", errJson);
        throw new Error("API Error: " + (errJson.error?.message || response.statusText));
    }

    const data = await response.json();
    return data.items || [];
};
