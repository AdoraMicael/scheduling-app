import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

/**
 * Sign in with email and password
 */
export const login = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

/**
 * Create a new user account
 */
export const signup = async (email, password) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

/**
 * Sign out the current user
 */
export const logout = async () => {
  return await signOut(auth);
};

/**
 * Subscribe to authentication state changes
 * @param {Function} callback - Called with the current user when auth state changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};
