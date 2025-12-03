
import { GOOGLE_CLIENT_ID, GOOGLE_API_KEY, GOOGLE_CALENDAR_SCOPES } from '../config';

declare global {
    interface Window {
        google: any;
    }
}

let tokenClient: any;
let accessToken: string | null = null;

/**
 * Inicializa el cliente de Google Identity Services.
 * Debe llamarse al montar el componente.
 */
export const initGoogleClient = (onSuccess: () => void) => {
    if (window.google) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: GOOGLE_CALENDAR_SCOPES,
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    onSuccess();
                }
            },
        });
    }
};

/**
 * Abre el popup de Google para iniciar sesión.
 */
export const loginToGoogle = () => {
    if (tokenClient) {
        tokenClient.requestAccessToken();
    } else {
        console.error("Google Client not initialized. Check your internet connection or Client ID.");
    }
};

/**
 * Cierra la sesión (simulado, solo borra el token local).
 */
export const logoutFromGoogle = () => {
    accessToken = null;
    // Para revocar permisos reales se requeriría una llamada a oauth2.revoke
};

export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
}

/**
 * Obtiene los próximos 100 eventos del calendario principal del usuario.
 */
export const fetchGoogleEvents = async (): Promise<GoogleCalendarEvent[]> => {
    if (!accessToken) throw new Error("No access token provided");

    const now = new Date().toISOString();
    
    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?key=${GOOGLE_API_KEY}&timeMin=${now}&showDeleted=false&singleEvents=true&maxResults=100&orderBy=startTime`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch Google Calendar events');
    }

    const data = await response.json();
    return data.items || [];
};
