import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthStore, UserProfile } from '@/store/useAuthStore';

// Initialize auth listener
export const initAuthListener = () => {
  return onAuthStateChanged(auth, async (user) => {
    const { setUser, setProfile, setLoading } = useAuthStore.getState();
    setUser(user);
    
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile({
            id: user.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            doctorId: data.doctorId,
          } as UserProfile);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
    
    setLoading(false);
  });
};

export const login = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerUser = async (name: string, email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Create user profile in firestore with PENDENTE role
  await setDoc(doc(db, 'users', user.uid), {
    name,
    email,
    role: 'PENDENTE',
    createdAt: Date.now()
  });
  
  return userCredential;
};

export const logout = async () => {
  await signOut(auth);
  useAuthStore.getState().logout();
};

export const resetPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};
