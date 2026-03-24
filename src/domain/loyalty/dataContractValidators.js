import dayjs from 'dayjs'
import { dataContractSchemas } from './dataContract'

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isCustomTimestamp = (value) => dayjs(value).isValid()
const isIsoDate = (value) => dayjs(value, 'YYYY-MM-DD', true).isValid()

const validateByType = (value, spec) => {
  if (value === null || value === undefined) {
    return false
  }

  if (spec.type === 'string') {
    return typeof value === 'string'
  }

  if (spec.type === 'number') {
    return typeof value === 'number' && Number.isFinite(value)
  }

  if (spec.type === 'boolean') {
    return typeof value === 'boolean'
  }

  if (spec.type === 'array') {
    if (!Array.isArray(value)) {
      return false
    }

    if (!spec.itemType) {
      return true
    }

    return value.every((item) => typeof item === spec.itemType)
  }

  if (spec.type === 'object') {
    return isPlainObject(value)
  }

  return false
}

const validateFormat = (value, spec) => {
  if (!spec.format || value === undefined || value === null) {
    return true
  }

  if (spec.format === 'customTimestamp') {
    return typeof value === 'string' && isCustomTimestamp(value)
  }

  if (spec.format === 'isoDate') {
    return typeof value === 'string' && isIsoDate(value)
  }

  return true
}

const validateMinValues = (value, spec) => {
  if (value === undefined || value === null) {
    return true
  }

  if (typeof spec.min === 'number' && typeof value === 'number') {
    return value >= spec.min
  }

  if (typeof spec.minLength === 'number' && typeof value === 'string') {
    return value.trim().length >= spec.minLength
  }

  if (typeof spec.minItems === 'number' && Array.isArray(value)) {
    return value.length >= spec.minItems
  }

  return true
}

const validatePattern = (value, spec) => {
  if (!spec.pattern || value === undefined || value === null) {
    return true
  }

  if (typeof value !== 'string') {
    return false
  }

  return new RegExp(spec.pattern).test(value)
}

const validateEnum = (value, spec) => {
  if (!spec.enum || value === undefined || value === null) {
    return true
  }

  return spec.enum.includes(value)
}

export const validateEntityRecord = (
  entityKey,
  record,
  options = { partial: false, allowUnknownFields: false },
) => {
  const schema = dataContractSchemas[entityKey]
  if (!schema) {
    return {
      valid: false,
      errors: [`Schema inexistente para entityKey: ${entityKey}`],
      warnings: [],
    }
  }

  if (!isPlainObject(record)) {
    return {
      valid: false,
      errors: ['El registro debe ser un objeto plano.'],
      warnings: [],
    }
  }

  const errors = []
  const warnings = []
  const fieldEntries = Object.entries(schema.fields)

  fieldEntries.forEach(([fieldName, spec]) => {
    const value = record[fieldName]
    const exists = value !== undefined && value !== null

    if (!options.partial && spec.required && !exists) {
      errors.push(`Falta campo obligatorio: ${fieldName}`)
      return
    }

    if (!exists) {
      return
    }

    if (!validateByType(value, spec)) {
      errors.push(`Tipo inválido en ${fieldName}. Esperado: ${spec.type}`)
      return
    }

    if (!validateEnum(value, spec)) {
      errors.push(`Valor inválido en ${fieldName}. Permitidos: ${spec.enum.join(', ')}`)
    }

    if (!validatePattern(value, spec)) {
      errors.push(`Formato inválido en ${fieldName}.`)
    }

    if (!validateFormat(value, spec)) {
      errors.push(`Formato especial inválido en ${fieldName}: ${spec.format}`)
    }

    if (!validateMinValues(value, spec)) {
      errors.push(`Valor fuera de rango en ${fieldName}.`)
    }
  })

  if (!options.allowUnknownFields) {
    Object.keys(record).forEach((fieldName) => {
      if (!schema.fields[fieldName]) {
        warnings.push(`Campo no contemplado por contrato: ${fieldName}`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export const assertEntityRecord = (entityKey, record, options) => {
  const report = validateEntityRecord(entityKey, record, options)

  if (!report.valid) {
    throw new Error(`Contrato inválido para ${entityKey}: ${report.errors.join(' | ')}`)
  }

  return report
}

