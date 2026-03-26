import dayjs from 'dayjs'
import { limitToLast, onValue, query, ref } from 'firebase/database'
import { rtdb } from '../lib/firebase'

const toSafeArray = (value) => {
  if (!value || typeof value !== 'object') {
    return []
  }

  return Object.entries(value)
    .map(([checkInId, item]) => ({
      checkInId,
      ...(item || {}),
    }))
    .sort((a, b) => dayjs(b.scannedAtCustom).valueOf() - dayjs(a.scannedAtCustom).valueOf())
}

export const subscribeCheckInFeed = ({ tenantId, limit = 700, onData, onError }) => {
  const checkInFeedRef = query(ref(rtdb, `tenants/${tenantId}/checkInFeed`), limitToLast(limit))

  const unsubscribe = onValue(
    checkInFeedRef,
    (snapshot) => {
      onData(toSafeArray(snapshot.val()))
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      }
    },
  )

  return unsubscribe
}
