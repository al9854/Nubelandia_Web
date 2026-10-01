import type { Usuario } from '@/types'

const KEY = 'nubelandia.usuario'

export function leerUsuarioGuardado(): Usuario | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Usuario) : null
  } catch {
    return null
  }
}

export function guardarUsuario(usuario: Usuario | null) {
  try {
    if (usuario) sessionStorage.setItem(KEY, JSON.stringify(usuario))
    else sessionStorage.removeItem(KEY)
  } catch {
    return
  }
}
