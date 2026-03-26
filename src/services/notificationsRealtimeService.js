import dayjs from 'dayjs'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'

const toSafeNotifications = (snapshot) =>
  snapshot.docs
    .map((doc) => ({
      notificationId: doc.id,
      ...(doc.data() || {}),
    }))
    .sort((a, b) => dayjs(b.createdAtCustom).valueOf() - dayjs(a.createdAtCustom).valueOf())

export const subscribeNotificationsFeed = ({ tenantId, maxItems = 300, onData, onError }) => {
  const notificationsQuery = query(
    collection(db, `tenants/${tenantId}/notifications`),
    orderBy('createdAtCustom', 'desc'),
    limit(maxItems),
  )

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      onData(toSafeNotifications(snapshot))
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      }
    },
  )
}
