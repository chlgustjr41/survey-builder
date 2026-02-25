import { create } from 'zustand'
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { ref, set, get } from 'firebase/database'
import { auth, db, googleProvider } from '@/services/firebase'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  init: () => () => void
}

export const useAuthStore = create<AuthState>((setState) => ({
  user: null,
  loading: true,

  signIn: async () => {
    const result = await signInWithPopup(auth, googleProvider)
    const u = result.user
    const userRef = ref(db, `users/${u.uid}`)
    const snap = await get(userRef)
    if (!snap.exists()) {
      await set(userRef, {
        email: u.email,
        displayName: u.displayName,
        createdAt: Date.now(),
      })
    }
  },

  signOut: async () => {
    await signOut(auth)
    setState({ user: null })
  },

  init: () => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false })
    })
    return unsub
  },
}))
