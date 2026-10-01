export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
export const USE_MOCKS: boolean = import.meta.env.VITE_USE_MOCKS === 'true'

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
  }

  withData(data: unknown): this {
    this.data = data
    return this
  }
}

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

const RUTAS_SIN_REDIRECCION_401 = ['/api/auth/login', '/public/']

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  if (USE_MOCKS) {
    const { mockRequest } = await import('./mock/router')
    return mockRequest<T>(method, path, body)
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await res.text()
  const data = text ? safeJson(text) : null

  if (res.status === 401 && !RUTAS_SIN_REDIRECCION_401.some((r) => path.startsWith(r))) {
    unauthorizedHandler?.()
  }

  if (!res.ok) {
    throw new ApiError(res.status, mensajeDe(data) ?? mensajePorEstado(res.status), data)
  }

  return data as T
}

function mensajeDe(data: unknown): string | null {
  if (data && typeof data === 'object' && 'mensaje' in data) {
    const m = (data as { mensaje: unknown }).mensaje
    if (typeof m === 'string' && m) return m
  }
  return null
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function mensajePorEstado(status: number): string {
  if (status === 401) return 'Tu sesión terminó. Ingresa de nuevo.'
  if (status === 403) return 'No tienes permiso para hacer esto.'
  if (status === 409) return 'Ya existe un registro igual.'
  if (status === 423) return 'El sistema está en modo mantenimiento.'
  if (status >= 500) return 'Error del servidor. Intenta de nuevo.'
  return 'No se pudo completar la acción.'
}

export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'No se pudo completar la acción.'
}
