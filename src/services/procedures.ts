import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';

export interface ProcedureValue {
  baseValue: number;
  transferType: 'PERCENTAGE' | 'FIXED' | 'VARIABLE';
  transferRate: number;
  localRate: number;
}

export interface Procedure {
  id: string;
  name: string;
  code: string;
  type: 'Consulta' | 'Exame' | 'Cirurgia';
  // Chave no formato: "insuranceId_locationId"
  values: Record<string, ProcedureValue>;
}

const COLLECTION_NAME = 'procedures';

export const getProcedures = async (): Promise<Procedure[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Procedure));
};

export const addProcedure = async (data: Omit<Procedure, 'id'>) => {
  return addDoc(collection(db, COLLECTION_NAME), data);
};

export const updateProcedure = async (id: string, data: Partial<Procedure>) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return updateDoc(docRef, data);
};

export const deleteProcedure = async (id: string) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return deleteDoc(docRef);
};
