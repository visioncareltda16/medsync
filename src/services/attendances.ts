import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';

export type FinancialStatus = 'A RECEBER' | 'RECEBIDO';

export interface Attendance {
  id: string;
  month: string; // Ex: '2023-10'
  date: string; // Ex: '2023-10-15'
  dayOfWeek: string;
  doctorId: string;
  locationId: string;
  patientName: string;
  procedureId: string;
  insuranceId: string;
  quantity: number;
  transferValue: number; // Valor repasse (unidade)
  transferType?: 'PERCENTAGE' | 'FIXED';
  transferRate: number; // Taxa de repasse (%) ou valor fixo
  realValue: number; // Valor real recebido (unidade)
  subtotal: number; // quantidade * transferValue
  status: FinancialStatus;
  receivedDate?: string;
  receivedBy?: string;
  createdAt: number;
}

const COLLECTION_NAME = 'attendances';

export const getAttendances = async (filters?: {
  month?: string;
  doctorId?: string;
  locationId?: string;
  status?: FinancialStatus;
}): Promise<Attendance[]> => {
  let q = query(collection(db, COLLECTION_NAME));

  if (filters?.month) q = query(q, where('month', '==', filters.month));
  if (filters?.doctorId) q = query(q, where('doctorId', '==', filters.doctorId));
  if (filters?.locationId) q = query(q, where('locationId', '==', filters.locationId));
  if (filters?.status) q = query(q, where('status', '==', filters.status));

  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Attendance));
  
  return data.sort((a, b) => {
    // Sort by date desc (newest first), then by createdAt desc
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff === 0) return b.createdAt - a.createdAt;
    return dateDiff;
  });
};

export const addAttendance = async (data: Omit<Attendance, 'id'>) => {
  return addDoc(collection(db, COLLECTION_NAME), data);
};

export const updateAttendance = async (id: string, data: Partial<Attendance>) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return updateDoc(docRef, data);
};

export const deleteAttendance = async (id: string) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return deleteDoc(docRef);
};

export const markAsReceived = async (id: string, receivedBy: string) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return updateDoc(docRef, {
    status: 'RECEBIDO',
    receivedDate: new Date().toISOString(),
    receivedBy
  });
};
