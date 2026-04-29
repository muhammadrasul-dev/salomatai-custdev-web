import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyA2cdQgwSoZod9YB_x1JmmoY8wQq7qcJsQ',
  authDomain: 'salomatai-db4e2.firebaseapp.com',
  projectId: 'salomatai-db4e2',
  storageBucket: 'salomatai-db4e2.firebasestorage.app',
  messagingSenderId: '277218328225',
  appId: '1:277218328225:web:db8af8616aadb93e1a3ae0',
  measurementId: 'G-Q4CCZG27GP',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const db = getFirestore(firebaseApp)

export const initFirebaseAnalytics = async () => {
  if (typeof window === 'undefined') {
    return null
  }

  const analyticsSupported = await isSupported()
  if (!analyticsSupported) {
    return null
  }

  return getAnalytics(firebaseApp)
}
