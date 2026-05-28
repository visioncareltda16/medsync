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

export interface Insurance {
  id: string;
  name: string;
  locationIds: string[]; // IDs dos locais onde este convênio atende
}

const COLLECTION_NAME = 'insurances';

export const getInsurances = async (): Promise<Insurance[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Insurance));
};

export const addInsurance = async (data: Omit<Insurance, 'id'>) => {
  return addDoc(collection(db, COLLECTION_NAME), data);
};

export const updateInsurance = async (id: string, data: Partial<Insurance>) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return updateDoc(docRef, data);
};

export const deleteInsurance = async (id: string) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return deleteDoc(docRef);
};
