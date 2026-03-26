import dayjs from 'dayjs'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../lib/firebase'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const sanitizeFileName = (name) =>
  String(name || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)

const ensureImageFile = (file) => {
  if (!(file instanceof File)) {
    throw new Error('Selecciona un archivo de imagen válido.')
  }

  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Solo se permiten archivos de imagen (JPG, PNG, WEBP, etc).')
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('La imagen supera el límite de 5 MB.')
  }
}

const buildStoragePath = ({ tenantId, entityType, entityId, file }) => {
  const timestamp = dayjs().format('YYYYMMDDHHmmss')
  const safeName = sanitizeFileName(file.name || `${entityType}.jpg`)
  return `tenants/${tenantId}/${entityType}/${entityId}/${timestamp}-${safeName}`
}

export const uploadEntityImage = async ({ tenantId, entityType, entityId, file }) => {
  if (!tenantId || !entityType || !entityId) {
    throw new Error('No fue posible preparar la ruta de Storage para la imagen.')
  }

  ensureImageFile(file)
  const path = buildStoragePath({ tenantId, entityType, entityId, file })
  const fileRef = ref(storage, path)

  await uploadBytes(fileRef, file, {
    contentType: file.type || 'image/jpeg',
    cacheControl: 'public,max-age=3600',
  })

  const downloadURL = await getDownloadURL(fileRef)
  return {
    path,
    downloadURL,
  }
}

