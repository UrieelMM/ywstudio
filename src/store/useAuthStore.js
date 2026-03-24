import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { create } from './initialStore'

let authListenerInitialized = false

const mapAuthUser = (firebaseUser) => {
  if (!firebaseUser) {
    return null
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || '',
  }
}

export const getFirebaseAuthErrorMessage = (code) => {
  const messages = {
    'auth/wrong-password': 'La contraseña es incorrecta.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/invalid-email': 'El correo electrónico no es válido.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/invalid-login-credentials': 'Correo o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Intenta de nuevo en unos minutos.',
    'auth/network-request-failed': 'Sin conexión. Revisa tu internet e intenta de nuevo.',
  }

  return messages[code] || 'No fue posible iniciar sesión. Intenta nuevamente.'
}

export const useAuthStore = create()((set) => ({
  user: null,
  isCheckingSession: true,
  isLoggingIn: false,

  initializeAuth: async () => {
    if (authListenerInitialized) {
      return
    }

    authListenerInitialized = true

    try {
      await setPersistence(auth, browserLocalPersistence)
    } catch {
      // Si no se puede configurar persistencia, continuamos con el listener.
    }

    onAuthStateChanged(auth, (firebaseUser) => {
      set({
        user: mapAuthUser(firebaseUser),
        isCheckingSession: false,
      })
    })
  },

  login: async ({ email, password }) => {
    set({ isLoggingIn: true })
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        code: error?.code || 'auth/unknown',
        message: getFirebaseAuthErrorMessage(error?.code),
      }
    } finally {
      set({ isLoggingIn: false })
    }
  },

  logout: async () => {
    try {
      await signOut(auth)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        code: error?.code || 'auth/unknown',
        message: 'No fue posible cerrar sesión. Intenta nuevamente.',
      }
    }
  },
}))
