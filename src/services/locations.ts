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

export interface Location {
  id: string;
  name: string;
  address: string;
  active: boolean;
}

const COLLECTION_NAME = 'locations';

export const getLocations = async (): Promise<Location[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Location));
};

export const addLocation = async (data: Omit<Location, 'id'>) => {
  return addDoc(collection(db, COLLECTION_NAME), data);
};

export const updateLocation = async (id: string, data: Partial<Location>) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return updateDoc(docRef, data);
};

export const deleteLocation = async (id: string) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return deleteDoc(docRef);
};
