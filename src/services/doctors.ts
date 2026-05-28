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

export interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  crm: string;
  specialty: string;
  locationIds: string[]; // Locais onde o médico atende
  userId?: string; // UID do Firebase Auth se houver login associado
}

const COLLECTION_NAME = 'doctors';

export const getDoctors = async (): Promise<Doctor[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Doctor));
};

export const addDoctor = async (data: Omit<Doctor, 'id'>) => {
  return addDoc(collection(db, COLLECTION_NAME), data);
};

export const updateDoctor = async (id: string, data: Partial<Doctor>) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return updateDoc(docRef, data);
};

export const deleteDoctor = async (id: string) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return deleteDoc(docRef);
};
