const REASON_MESSAGES = {
  USER_NOT_ACTIVE: 'La cuenta del alumno no está activa.',
  USER_BLOCKED: 'La cuenta del alumno está bloqueada.',
  USER_IDENTITY_MISMATCH: 'El número de alumno no coincide con el correo registrado.',
  QR_NOT_ACTIVE: 'El código QR está pausado o inactivo.',
  QR_OUT_OF_WINDOW: 'Este código QR no está vigente en este momento.',
  DAILY_LIMIT_REACHED: 'El alumno ya alcanzó su límite de registros de hoy.',
  COOLDOWN_NOT_MET: 'Aún no se puede registrar otra asistencia para este alumno.',
  REWARD_NOT_ACTIVE: 'Este premio no está disponible actualmente.',
  REWARD_OUT_OF_WINDOW: 'Este premio no está vigente en este momento.',
  INSUFFICIENT_VISITS: 'El alumno no tiene visitas suficientes para este canje.',
  OUT_OF_STOCK: 'Este premio se quedó sin existencias.',
  MAX_REDEMPTIONS_PER_USER_REACHED: 'El alumno ya alcanzó el máximo de canjes permitido para este premio.',
  SAME_DAY_REDEEM_NOT_ALLOWED: 'Este premio no permite canjearse el mismo día del registro.',
  INVALID_RULESET: 'La configuración del programa requiere revisión.',
  FIRESTORE_WRITE_FAILED: 'No se pudo guardar la operación. Intenta de nuevo.',
}

const REDEMPTION_STATUS_MESSAGES = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  delivered: 'Entregado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
}

const QR_MODE_MESSAGES = {
  session: 'Por clase',
  static: 'Fijo',
  dynamic: 'Dinámico',
}

const FALLBACK_MESSAGE = 'No se pudo completar la operación.'

export const getFriendlyReason = (reason) => {
  const code = String(reason || '').trim()
  if (!code) {
    return FALLBACK_MESSAGE
  }
  return REASON_MESSAGES[code] || FALLBACK_MESSAGE
}

export const getFriendlyRedemptionStatus = (status) =>
  REDEMPTION_STATUS_MESSAGES[String(status || '').toLowerCase()] || 'En revisión'

export const getFriendlyQrMode = (mode) =>
  QR_MODE_MESSAGES[String(mode || '').toLowerCase()] || 'Por clase'

export const getLastTransactionHint = (result) => {
  if (!result) {
    return 'Sin actividad reciente'
  }

  if (result.ok) {
    return 'Operación exitosa'
  }

  return getFriendlyReason(result.reason)
}

