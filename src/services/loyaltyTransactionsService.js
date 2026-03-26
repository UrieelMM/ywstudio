import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'

const registerCheckInCallable = httpsCallable(functions, 'registerCheckIn')
const registerCheckInByPublicIdentityCallable = httpsCallable(
  functions,
  'registerCheckInByPublicIdentity',
)
const redeemRewardCallable = httpsCallable(functions, 'redeemReward')

export const runCheckInTransaction = async (payload) => {
  const response = await registerCheckInCallable(payload)
  return response.data
}

export const runPublicQrCheckIn = async (payload) => {
  const response = await registerCheckInByPublicIdentityCallable(payload)
  return response.data
}

export const runRedeemTransaction = async (payload) => {
  const response = await redeemRewardCallable(payload)
  return response.data
}
