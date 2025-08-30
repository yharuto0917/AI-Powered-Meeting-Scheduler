import { 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebase';

const actionCodeSettings = {
  url: process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || 'http://localhost:3000/auth/verify',
  handleCodeInApp: true,
};

export const sendAuthLink = async (email) => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // Save the email locally so you don't need to ask the user for it again
    // if they open the link on the same device.
    window.localStorage.setItem('emailForSignIn', email);
    return { success: true, message: 'Authentication link sent to your email!' };
  } catch (error) {
    console.error('Error sending auth link:', error);
    return { success: false, error: error.message };
  }
};

export const completeSignIn = async (email, url) => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    if (!isSignInWithEmailLink(auth, url)) {
      throw new Error('Invalid sign-in link');
    }
    
    // Get the email if available. This should be available if on the same device
    let signInEmail = email;
    if (!signInEmail) {
      signInEmail = window.localStorage.getItem('emailForSignIn');
    }
    if (!signInEmail) {
      // User opened the link on a different device. To prevent session fixation
      // attacks, ask the user to provide the associated email again.
      signInEmail = window.prompt('Please provide your email for confirmation');
    }

    const result = await signInWithEmailLink(auth, signInEmail, url);
    window.localStorage.removeItem('emailForSignIn');
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Error completing sign-in:', error);
    return { success: false, error: error.message };
  }
};

export const logout = async () => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error: error.message };
  }
};

export const onAuthChange = (callback) => {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    return null;
  }
  return auth.currentUser;
};