import dayjs from 'dayjs'

const dayMonthFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
})

const dayMonthYearFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function toDate(value) {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.toDate() : new Date(value)
}

export function formatDayMonth(value = new Date()) {
  return dayMonthFormatter.format(toDate(value))
}

export function formatDayMonthYear(value) {
  return dayMonthYearFormatter.format(toDate(value))
}

