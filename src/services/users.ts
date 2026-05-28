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

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MÉDICO' | 'PENDENTE';
  doctorId?: string; // Vinculo com perfil de médico
}

const COLLECTION_NAME = 'users';

export const getUsers = async (): Promise<User[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as User));
};

export const addUser = async (data: Omit<User, 'id'>) => {
  // Nota: Isso não cria o usuário no Firebase Auth, apenas a permissão no Firestore.
  return addDoc(collection(db, COLLECTION_NAME), data);
};

export const updateUser = async (id: string, data: Partial<User>) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return updateDoc(docRef, data);
};

export const deleteUser = async (id: string) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return deleteDoc(docRef);
};
