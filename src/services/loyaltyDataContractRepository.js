import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as limitQuery,
  query,
  setDoc,
} from 'firebase/firestore'
import {
  dataContractSchemas,
  DATA_CONTRACT_VERSION,
  TENANT_ROOT_COLLECTION,
} from '../domain/loyalty/dataContract'
import {
  assertEntityRecord,
  validateEntityRecord,
} from '../domain/loyalty/dataContractValidators'
import {
  createAuditLogRecord,
  createCheckInRecord,
  createDailyUsageRecord,
  createQrCodeRecord,
  createRedemptionRecord,
  createNotificationRecord,
  createRewardRecord,
  createUserRecord,
  createUserRewardCounterRecord,
  createWalletTransactionRecord,
} from '../domain/loyalty/dataFactories'

const entityFactoryMap = {
  user: createUserRecord,
  qrCode: createQrCodeRecord,
  reward: createRewardRecord,
  checkIn: createCheckInRecord,
  walletTransaction: createWalletTransactionRecord,
  redemption: createRedemptionRecord,
  auditLog: createAuditLogRecord,
  dailyUsage: createDailyUsageRecord,
  userRewardCounter: createUserRewardCounterRecord,
  notification: createNotificationRecord,
}

export const tenantDocumentRef = (db, tenantId) =>
  doc(db, TENANT_ROOT_COLLECTION, tenantId)

export const tenantEntityCollectionRef = (db, tenantId, entityKey) => {
  const schema = dataContractSchemas[entityKey]
  if (!schema) {
    throw new Error(`Entity key inválido: ${entityKey}`)
  }
  return collection(db, TENANT_ROOT_COLLECTION, tenantId, schema.collection)
}

export const tenantEntityDocRef = (db, tenantId, entityKey, entityId) => {
  return doc(tenantEntityCollectionRef(db, tenantId, entityKey), entityId)
}

export const createEntityRecord = async ({
  db,
  tenantId,
  entityKey,
  payload,
  actorId = 'system',
}) => {
  const buildRecord = entityFactoryMap[entityKey]
  if (!buildRecord) {
    throw new Error(`No hay factory para entityKey: ${entityKey}`)
  }

  const record = buildRecord({
    tenantId,
    actorId,
    ...payload,
  })

  assertEntityRecord(entityKey, record, { partial: false, allowUnknownFields: false })

  const idField = dataContractSchemas[entityKey].idField
  const entityId = record[idField]
  await setDoc(tenantEntityDocRef(db, tenantId, entityKey, entityId), record, {
    merge: false,
  })

  return {
    entityId,
    record,
    contractVersion: DATA_CONTRACT_VERSION,
  }
}

export const upsertEntityRecord = async ({
  db,
  tenantId,
  entityKey,
  entityId,
  payload,
  actorId = 'system',
}) => {
  const schema = dataContractSchemas[entityKey]
  if (!schema) {
    throw new Error(`Entity key inválido: ${entityKey}`)
  }

  const snapshot = await getDoc(tenantEntityDocRef(db, tenantId, entityKey, entityId))
  const current = snapshot.exists() ? snapshot.data() : null
  const nextRecord = {
    ...(current || {}),
    ...payload,
    [schema.idField]: entityId,
    tenantId,
    updatedBy: actorId,
  }

  const report = validateEntityRecord(entityKey, nextRecord, {
    partial: false,
    allowUnknownFields: false,
  })

  if (!report.valid) {
    throw new Error(
      `No se pudo guardar ${entityKey}. Errores: ${report.errors.join(' | ')}`,
    )
  }

  await setDoc(tenantEntityDocRef(db, tenantId, entityKey, entityId), nextRecord, {
    merge: false,
  })

  return {
    entityId,
    record: nextRecord,
    warnings: report.warnings,
  }
}

export const listEntityRecords = async ({
  db,
  tenantId,
  entityKey,
  limit = 50,
}) => {
  const recordsQuery = query(
    tenantEntityCollectionRef(db, tenantId, entityKey),
    limitQuery(limit),
  )

  const snapshot = await getDocs(recordsQuery)
  return snapshot.docs.map((recordDoc) => ({
    id: recordDoc.id,
    ...recordDoc.data(),
  }))
}

export const deleteEntityRecord = async ({
  db,
  tenantId,
  entityKey,
  entityId,
}) => {
  await deleteDoc(tenantEntityDocRef(db, tenantId, entityKey, entityId))
  return {
    entityId,
  }
}
