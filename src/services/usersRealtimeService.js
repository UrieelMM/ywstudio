import dayjs from 'dayjs'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'

const toSafeUsers = (snapshot) =>
  snapshot.docs
    .map((doc) => ({
      userId: doc.id,
      ...(doc.data() || {}),
    }))
    .sort((a, b) => dayjs(b.createdAtCustom).valueOf() - dayjs(a.createdAtCustom).valueOf())

export const subscribeUsersFeed = ({ tenantId, maxItems = 600, onData, onError }) => {
  const usersQuery = query(
    collection(db, `tenants/${tenantId}/users`),
    orderBy('createdAtCustom', 'desc'),
    limit(maxItems),
  )

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      onData(toSafeUsers(snapshot))
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      }
    },
  )
}
