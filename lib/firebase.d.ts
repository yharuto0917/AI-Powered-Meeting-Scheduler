// 型宣言: JS 実装の lib/firebase.js を TypeScript から安全に import できるようにする
import type { Firestore } from 'firebase/firestore'
import type { Auth } from 'firebase/auth'
import type { Functions } from 'firebase/functions'

declare module '@/lib/firebase' {
  export const db: Firestore | null
  export const auth: Auth | null
  export const functions: Functions | null
  export function connectToEmulators(): void
  const app: unknown
  export default app
}


