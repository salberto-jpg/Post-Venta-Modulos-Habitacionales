
import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    doc, 
    query, 
    where, 
    getDoc,
    Timestamp 
} from 'firebase/firestore';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from 'firebase/storage';
import { db, storage } from './firebaseConfig';
import { type Client, type Module, type Ticket, type Document, type ModuleType, TicketStatus, Priority } from '../types';

// Helper to convert Firestore timestamps to ISO strings
const convertTimestamps = (data: any) => {
    const result = { ...data };
    for (const key in result) {
        if (result[key] instanceof Timestamp) {
            result[key] = result[key].toDate().toISOString();
        }
    }
    return result;
};

// Helper for file upload (Simulated URL if no file provided, or actual upload)
const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    } catch (e) {
        console.error("Storage upload failed, returning mock URL", e);
        return '#'; // Fallback
    }
};

// --- TICKETS ---

export const getDashboardStats = async () => {
    const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const modulesSnapshot = await getDocs(collection(db, 'modules'));

    const tickets = ticketsSnapshot.docs.map(doc => doc.data() as Ticket);
    
    const newTickets = tickets.filter(t => t.status === TicketStatus.New).length;
    const pendingMaintenance = tickets.filter(t => t.status === TicketStatus.New || t.status === TicketStatus.InProgress).length;
    
    return { 
        newTickets, 
        pendingMaintenance, 
        totalClients: clientsSnapshot.size, 
        totalModules: modulesSnapshot.size 
    };
};

export const getRecentTickets = async (limit = 5): Promise<Ticket[]> => {
    const tickets = await getAllTickets();
    return tickets.slice(0, limit);
};

export const getAllTickets = async (): Promise<Ticket[]> => {
    const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const modulesSnapshot = await getDocs(collection(db, 'modules'));

    const clientsMap = new Map<string, Client>(
        clientsSnapshot.docs.map(d => [d.id, d.data() as Client])
    );
    const modulesMap = new Map<string, Module>(
        modulesSnapshot.docs.map(d => [d.id, d.data() as Module])
    );

    const tickets = ticketsSnapshot.docs.map(doc => {
        const data = doc.data();
        const client = clientsMap.get(data.clientId);
        const module = modulesMap.get(data.moduleId);
        
        return {
            id: doc.id,
            ...convertTimestamps(data),
            clientName: client?.name || 'N/A',
            moduleSerial: module?.serialNumber || 'N/A',
            latitude: module?.latitude,
            longitude: module?.longitude,
        } as Ticket;
    });

    return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const createTicket = async (data: Omit<Ticket, 'id' | 'createdAt' | 'status'>): Promise<Ticket> => {
    const newTicketData = {
        ...data,
        createdAt: new Date().toISOString(),
        status: TicketStatus.New,
        photos: data.photos || [] // Ensure array
    };
    
    const docRef = await addDoc(collection(db, 'tickets'), newTicketData);
    return { id: docRef.id, ...newTicketData } as Ticket;
};

export const updateTicketStatus = async (ticketId: string, status: TicketStatus): Promise<void> => {
    const ticketRef = doc(db, 'tickets', ticketId);
    const updateData: any = { status };
    if (status !== TicketStatus.Scheduled) {
        updateData.scheduledDate = null; // Clear schedule if status changes away from scheduled
    }
    await updateDoc(ticketRef, updateData);
};

export const scheduleTicket = async (ticketId: string, date: string): Promise<void> => {
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
        status: TicketStatus.Scheduled,
        scheduledDate: date
    });
};

// --- CLIENTS ---

export const getAllClients = async (): Promise<Client[]> => {
    const snapshot = await getDocs(collection(db, 'clients'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Client));
};

export const getAllClientsSummary = async () => {
    const clients = await getAllClients();
    const modulesSnapshot = await getDocs(collection(db, 'modules'));
    const ticketsSnapshot = await getDocs(collection(db, 'tickets'));

    const modules = modulesSnapshot.docs.map(d => d.data() as Module);
    const tickets = ticketsSnapshot.docs.map(d => d.data() as Ticket);

    return clients.map(client => ({
        ...client,
        moduleCount: modules.filter(m => m.clientId === client.id).length,
        activeTickets: tickets.filter(t => t.clientId === client.id && t.status !== TicketStatus.Closed).length
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getClientDossier = async (clientId: string) => {
    const clientRef = doc(db, 'clients', clientId);
    const clientSnap = await getDoc(clientRef);
    
    if (!clientSnap.exists()) throw new Error("Client not found");
    const client = { id: clientSnap.id, ...convertTimestamps(clientSnap.data()) } as Client;

    // Get Modules
    const qModules = query(collection(db, 'modules'), where("clientId", "==", clientId));
    const modulesSnap = await getDocs(qModules);
    const clientModules = modulesSnap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as Module));

    // Get Tickets
    const qTickets = query(collection(db, 'tickets'), where("clientId", "==", clientId));
    const ticketsSnap = await getDocs(qTickets);
    const clientTickets = ticketsSnap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as Ticket))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Get Documents (Needs logic for "owned types")
    // Fetch ALL docs for simplicity in prototype, filter in memory due to Firestore OR limitations
    const docsSnap = await getDocs(collection(db, 'documents'));
    const allDocs = docsSnap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as Document));

    const ownedTypeIds = Array.from(new Set(clientModules.map(m => m.moduleTypeId)));
    
    const relevantDocs = allDocs.filter(d => 
        d.clientId === clientId || 
        (d.moduleId && clientModules.some(m => m.id === d.moduleId)) ||
        (d.moduleTypeId && ownedTypeIds.includes(d.moduleTypeId))
    );

    return {
        client,
        modules: clientModules,
        tickets: clientTickets,
        documents: relevantDocs
    };
};

export const createClient = async (clientData: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
    const newData = { ...clientData, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'clients'), newData);
    return { id: docRef.id, ...newData } as Client;
};

export const updateClient = async (clientId: string, data: Partial<Client>): Promise<void> => {
    const clientRef = doc(db, 'clients', clientId);
    await updateDoc(clientRef, data);
};

// --- MODULES ---

export const addModuleToClient = async (clientId: string, moduleTypeId: string, serialNumber: string, installationDate: string, lat?: number, lng?: number): Promise<Module> => {
    // Fetch Type Name for denormalization
    const typeRef = doc(db, 'module_types', moduleTypeId);
    const typeSnap = await getDoc(typeRef);
    const typeName = typeSnap.exists() ? typeSnap.data().name : 'Desconocido';

    const newModule = {
        clientId,
        moduleTypeId,
        modelName: typeName,
        serialNumber,
        installationDate,
        latitude: lat || null,
        longitude: lng || null,
        warrantyExpiration: new Date(new Date(installationDate).setFullYear(new Date(installationDate).getFullYear() + 1)).toISOString().split('T')[0]
    };
    
    const docRef = await addDoc(collection(db, 'modules'), newModule);
    return { id: docRef.id, ...newModule } as Module;
};

export const getModulesByClientId = async (clientId: string): Promise<Module[]> => {
    const q = query(collection(db, 'modules'), where("clientId", "==", clientId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as Module));
};

export const getAllModulesPopulated = async (): Promise<(Module & { clientName: string })[]> => {
    const modulesSnapshot = await getDocs(collection(db, 'modules'));
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    
    const clientsMap = new Map<string, string>(
        clientsSnapshot.docs.map(d => [d.id, d.data().name])
    );

    return modulesSnapshot.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...convertTimestamps(data),
            clientName: clientsMap.get(data.clientId) || 'Desconocido'
        } as Module & { clientName: string };
    });
};

// --- MODULE TYPES ---

export const getAllModuleTypes = async (): Promise<ModuleType[]> => {
    const snapshot = await getDocs(collection(db, 'module_types'));
    return snapshot.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as ModuleType));
};

export const createModuleType = async (data: Omit<ModuleType, 'id' | 'createdAt' | 'imageUrl'>, imageFile?: File): Promise<ModuleType> => {
    let imageUrl = '';
    if (imageFile) {
        const filePath = `module_types/${Date.now()}_${imageFile.name}`;
        imageUrl = await uploadFileToStorage(imageFile, filePath);
    }

    const newData = { ...data, imageUrl, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'module_types'), newData);
    return { id: docRef.id, ...newData } as ModuleType;
};

// --- DOCUMENTS ---

export const getAllDocuments = async (): Promise<(Document & {moduleSerial: string, clientName: string})[]> => {
    const docsSnapshot = await getDocs(collection(db, 'documents'));
    const modulesSnapshot = await getDocs(collection(db, 'modules'));
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const typesSnapshot = await getDocs(collection(db, 'module_types'));

    const modules = modulesSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Module));
    const clients = clientsSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Client));

    const populatedDocs = docsSnapshot.docs.map(doc => {
        const data = doc.data() as Document;
        let module: Module | undefined;
        let client: Client | undefined;

        if (data.moduleId) {
            module = modules.find(m => m.id === data.moduleId);
            client = clients.find(c => c.id === module?.clientId);
        } else if (data.clientId) {
            client = clients.find(c => c.id === data.clientId);
        }

        return {
            id: doc.id,
            ...convertTimestamps(data),
            moduleSerial: module?.serialNumber || (data.moduleTypeId ? 'N/A (Modelo)' : 'N/A'),
            clientName: client?.name || (data.moduleTypeId ? 'Global' : 'N/A')
        };
    });

    return populatedDocs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
};

export const getDocumentsByModuleType = async (moduleTypeId: string): Promise<Document[]> => {
    const q = query(collection(db, 'documents'), where("moduleTypeId", "==", moduleTypeId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) } as Document))
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
};

export const createDocument = async (
    targetId: string, 
    targetType: 'module' | 'moduleType' | 'client',
    type: Document['type'],
    file: File,
    version?: string
): Promise<Document> => {
    
    const filePath = `documents/${targetType}/${targetId}/${Date.now()}_${file.name}`;
    const url = await uploadFileToStorage(file, filePath);

    const newDocument: any = {
        name: file.name,
        type,
        version: version || null,
        url,
        uploadedAt: new Date().toISOString(),
    };

    if (targetType === 'module') newDocument.moduleId = targetId;
    if (targetType === 'moduleType') newDocument.moduleTypeId = targetId;
    if (targetType === 'client') newDocument.clientId = targetId;

    const docRef = await addDoc(collection(db, 'documents'), newDocument);
    return { id: docRef.id, ...newDocument } as Document;
};
