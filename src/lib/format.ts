const TZ = 'America/Lima'
const LOCALE = 'es-PE'

export function money(value: number): string {
  return `S/ ${value.toFixed(2)}`
}

export function parseMonto(raw: string): number {
  const n = Number(raw.replace(',', '.').trim())
  return Number.isFinite(n) ? n : NaN
}

const fmtHora = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
const fmtReloj = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
const fmtFechaLarga = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
const fmtFechaCorta = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
const fmtDiaMes = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: 'numeric', month: 'short' })
const fmtDiaNumero = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: 'numeric' })
const fmtYmd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const fmtHm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })

type Fecha = string | number | Date

const toDate = (value: Fecha) => (value instanceof Date ? value : new Date(value))

export const horaLima = (value: Fecha) => fmtHora.format(toDate(value))
export const relojLima = (value: Fecha) => fmtReloj.format(toDate(value))
export const fechaLargaLima = (value: Fecha) => fmtFechaLarga.format(toDate(value))
export const fechaCortaLima = (value: Fecha) => fmtFechaCorta.format(toDate(value))
export const diaMesLima = (value: Fecha) => fmtDiaMes.format(toDate(value))
export const diaNumeroLima = (value: Fecha) => fmtDiaNumero.format(toDate(value))
export const ymdLima = (value: Fecha) => fmtYmd.format(toDate(value))
export const hmLima = (value: Fecha) => fmtHm.format(toDate(value))

export const fechaHoraLima = (value: Fecha) => `${fechaCortaLima(value)} · ${horaLima(value)}`

export function hoyLima(): string {
  return ymdLima(new Date())
}

export function sumarDias(ymd: string, dias: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d + dias))
  return base.toISOString().slice(0, 10)
}

export function limaAIso(ymd: string, hm = '00:00'): string {
  return new Date(`${ymd}T${hm}:00-05:00`).toISOString()
}

export function minutosSegundos(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatoCelular(value: string | null): string {
  if (!value) return ''
  return value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
}

export function soloDigitos(value: string): string {
  return value.replace(/\D/g, '')
}

export function nombreCompletoValido(value: string): boolean {
  return value.trim().split(/\s+/).filter(Boolean).length >= 2
}

export function normalizar(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
