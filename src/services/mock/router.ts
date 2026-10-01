import { leerUsuarioGuardado } from '@/lib/session'
import { limaAIso, nombreCompletoValido, normalizar, soloDigitos, ymdLima, money } from '@/lib/format'
import type {
  Activacion,
  Anuncio,
  CambioDato,
  Configuracion,
  Gasto,
  NinoBusqueda,
  PlanReserva,
  ReglaFidelidad,
  Reserva,
  ResumenReportes,
  Sesion,
  Tarifa,
  Tarjeta,
  TarjetaPublica,
  Usuario,
  VistaQr,
} from '@/types'
import { ApiError } from '../http'
import {
  db,
  DIA,
  MIN,
  nextId,
  type MActivacion,
  type MNino,
  type MReserva,
  type MSesion,
  type MTarjeta,
  type MUsuario,
} from './db'

type Params = string[]
type Query = URLSearchParams
type Handler = (p: Params, body: any, q: Query) => unknown
type Route = { method: string; re: RegExp; handler: Handler; auth: 'none' | 'user' | 'admin' }

const iso = (ms: number) => new Date(ms).toISOString()
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function yo(): MUsuario {
  const id = db.meId ?? leerUsuarioGuardado()?.id ?? null
  const u = db.usuarios.find((x) => x.id === id && x.activo)
  if (!u) throw new ApiError(401, 'Sesión no válida')
  db.meId = u.id
  return u
}

function nombreEmpleado(id: number): string {
  return db.usuarios.find((u) => u.id === id)?.nombre ?? 'Sistema'
}

const usuarioDto = (u: MUsuario): Usuario => ({
  id: u.id,
  nombre: u.nombre,
  usuario: u.usuario,
  rol: u.rol,
  activo: u.activo,
})

const maxSellos = () => {
  const a = db.reglas.filter((r) => r.activa).map((r) => r.sellosRequeridos)
  return a.length ? Math.max(...a) : 10
}

const tarjetaAbierta = (ninoId: number): MTarjeta | undefined =>
  db.tarjetas.find((t) => t.ninoId === ninoId && !t.completadaEn)

const conteoSellos = (tarjetaId: number) => db.sellos.filter((s) => s.tarjetaId === tarjetaId).length

const apoderadoDe = (n: MNino) => db.apoderados.find((a) => a.id === n.apoderadoId) ?? null

function enJuego(ninoId: number): boolean {
  return db.sesiones.some((s) => s.estado === 'activa' && s.ninoIds.includes(ninoId))
}

function ninoDto(n: MNino): NinoBusqueda {
  const ap = apoderadoDe(n)
  const t = tarjetaAbierta(n.id)
  return {
    id: n.id,
    nombre: n.nombre,
    apoderadoId: ap?.id ?? null,
    apoderado: ap?.nombre ?? null,
    telefono: ap?.telefono ?? null,
    sellos: t ? { actuales: conteoSellos(t.id), requeridos: maxSellos() } : null,
    enJuego: enJuego(n.id),
    activo: n.activo,
  }
}

function sesionDto(s: MSesion): Sesion {
  const dur = (s.finPrevisto - s.inicio) / MIN
  const rapida = s.estado === 'activa' && s.tarifaId !== null && s.ninoIds.length === 1
  return {
    id: s.id,
    tarifa: s.tarifaId
      ? { id: s.tarifaId, nombre: db.tarifas.find((t) => t.id === s.tarifaId)!.nombre }
      : { id: null, nombre: s.canjeHito ? 'Canje' : 'Especial' },
    ninos: s.ninoIds.map((id) => ({ id, nombre: db.ninos.find((n) => n.id === id)!.nombre })),
    inicio: iso(s.inicio),
    finPrevisto: iso(s.finPrevisto),
    monto: s.pago + s.extensiones.reduce((a, e) => a + e.monto, 0),
    estado: s.estado,
    extensionRapida: rapida
      ? { label: dur < 60 ? `Pasar a 1 hora · +${money(3)}` : `+½ hora · +${money(5)}` }
      : null,
  }
}

function agregarSello(ninoId: number, sesionId: number) {
  const t = tarjetaAbierta(ninoId)
  if (t && conteoSellos(t.id) < maxSellos()) {
    db.sellos.push({ id: nextId(), tarjetaId: t.id, sesionId, ninoId })
  }
}

function registrarCambio(tabla: string, registroId: number, campo: string, anterior: string | null, nuevo: string | null) {
  if (anterior === nuevo) return
  db.cambios.push({ id: nextId(), tabla, registroId, campo, anterior, nuevo, empleadoId: yo().id, en: Date.now() })
}

function barrerActivaciones() {
  const now = Date.now()
  for (const a of db.activaciones) {
    if (['esperando', 'reclamada', 'aprobada'].includes(a.estado) && now > a.expiraEn) {
      a.estado = a.estado === 'aprobada' ? 'cerrada' : 'expirada'
    }
  }
}

const vigente = (): MActivacion | undefined => {
  barrerActivaciones()
  return db.activaciones.find((a) => ['esperando', 'reclamada', 'aprobada'].includes(a.estado))
}

function activacionDto(a: MActivacion): Activacion {
  const n = db.ninos.find((x) => x.id === a.ninoId)!
  return {
    id: a.id,
    tipo: a.tipo,
    estado: a.estado,
    ninoId: a.ninoId,
    ninoNombre: n.nombre,
    apoderadoNombre: apoderadoDe(n)?.nombre ?? null,
    creadaEn: iso(a.creadaEn),
    expiraEn: iso(a.expiraEn),
    creadaPor: nombreEmpleado(a.creadaPor),
  }
}

function crearActivacion(tipo: 'registro' | 'consulta', ninoId: number): MActivacion {
  if (db.config.modoMantenimiento) throw new ApiError(423, 'El sistema está en modo mantenimiento.')
  if (vigente()) throw new ApiError(409, 'Ya hay un QR habilitado. Deshabilítalo primero.')
  const now = Date.now()
  const a: MActivacion = {
    id: nextId(),
    tipo,
    estado: 'esperando',
    ninoId,
    creadaEn: now,
    expiraEn: now + 10 * MIN,
    creadaPor: yo().id,
  }
  db.activaciones.unshift(a)
  return a
}

function tarjetaDto(t: MTarjeta): Tarjeta {
  const sellos = conteoSellos(t.id)
  const premios = db.reglas
    .filter((r) => r.activa)
    .sort((a, b) => a.sellosRequeridos - b.sellosRequeridos)
    .map((r) => {
      const canjeado = db.canjes.some((c) => c.tarjetaId === t.id && c.hito === r.sellosRequeridos)
      const disponible = sellos >= r.sellosRequeridos
      return {
        hito: r.sellosRequeridos,
        titulo: `${r.sellosRequeridos} sellos: ${r.descripcionRecompensa}`,
        estado: canjeado ? ('canjeado' as const) : disponible ? ('disponible' as const) : ('bloqueado' as const),
        detalle: canjeado
          ? 'Canjeado'
          : disponible
            ? 'Disponible para canjear'
            : `Faltan ${r.sellosRequeridos - sellos} sellos`,
      }
    })
  const visitas = db.sesiones
    .filter((s) => s.estado !== 'cancelada' && s.ninoIds.includes(t.ninoId))
    .sort((a, b) => b.inicio - a.inicio)
    .slice(0, 8)
    .map((s) => ({
      fecha: iso(s.inicio),
      tarifa: s.canjeHito ? `Canje de ${s.canjeHito} sellos` : sesionDto(s).tarifa.nombre,
      etiqueta: s.canjeHito
        ? ('canje' as const)
        : db.sellos.some((x) => x.sesionId === s.id && x.ninoId === t.ninoId)
          ? ('sello' as const)
          : ('sin sello' as const),
    }))
  return { id: t.id, ninoId: t.ninoId, ciclo: t.ciclo, sellos, totalSellos: maxSellos(), premios, visitas }
}

function tarjetaPublica(ninoId: number): TarjetaPublica {
  const t = tarjetaAbierta(ninoId)!
  const full = tarjetaDto(t)
  return {
    nino: db.ninos.find((n) => n.id === ninoId)!.nombre,
    sellos: full.sellos,
    totalSellos: full.totalSellos,
    premios: full.premios.map((p) => ({ titulo: p.titulo })),
    visitas: full.visitas.slice(0, 3).map((v) => ({ fecha: v.fecha })),
  }
}

function anuncio(): Anuncio {
  return {
    horario: 'Martes a domingo · 3:00 – 8:00 p. m.',
    direccion: 'Calle Manuel Garay 289, Puente Piedra',
    tarifas: db.tarifas.filter((t) => t.activa).map((t) => ({ nombre: t.nombre, precio: t.precio })),
    premios: db.reglas
      .filter((r) => r.activa)
      .map((r) => ({ texto: `${r.sellosRequeridos} sellos: ${r.descripcionRecompensa}` })),
    planes: db.planes.filter((p) => p.activo).map((p) => ({ nombre: p.nombre, precio: p.precio })),
    facebookUrl: db.config.facebookUrl,
  }
}

function reservaDto(r: MReserva): Reserva {
  const plan = db.planes.find((p) => p.id === r.planId)!
  return {
    id: r.id,
    plan: { id: plan.id, nombre: plan.nombre },
    contacto: r.contacto,
    telefono: r.telefono,
    inicio: iso(r.inicio),
    fin: iso(r.fin),
    monto: r.monto,
    adelanto: r.adelanto,
    saldo: r.monto - r.adelanto,
    estado: r.estado,
    observaciones: r.observaciones,
    siguientesEstados:
      r.estado === 'pendiente'
        ? ['confirmada', 'cancelada']
        : r.estado === 'confirmada'
          ? ['realizada', 'cancelada']
          : [],
  }
}

function gastoDto(g: (typeof db.gastos)[number]): Gasto {
  return {
    id: g.id,
    categoriaId: g.categoriaId,
    categoria: db.categorias.find((c) => c.id === g.categoriaId)?.nombre ?? '',
    descripcion: g.descripcion,
    monto: g.monto,
    fecha: g.fecha,
    empleado: nombreEmpleado(g.empleadoId),
  }
}

function buscarApoderadoPorTelefono(tel: string, excluirId?: number) {
  return db.apoderados.find((a) => a.telefono === tel && a.id !== excluirId)
}

function validarNino(nombre: string, apoderadoNombre?: string, telefono?: string) {
  if (!nombreCompletoValido(nombre)) throw new ApiError(400, 'Escribe el nombre completo del niño.')
  const tieneAp = !!apoderadoNombre?.trim()
  const tieneTel = !!telefono?.trim()
  if (tieneAp !== tieneTel) throw new ApiError(400, 'Si llenas papá o celular, llena ambos.')
  if (tieneTel && soloDigitos(telefono!).length !== 9) throw new ApiError(400, 'El celular debe tener 9 dígitos.')
  if (tieneAp && !nombreCompletoValido(apoderadoNombre!)) throw new ApiError(400, 'Escribe el nombre completo del papá o mamá.')
}

function duplicado(nombre: string, apoderadoId: number | null, excluirId?: number) {
  if (apoderadoId === null) return false
  const norm = normalizar(nombre)
  return db.ninos.some(
    (n) => n.activo && n.id !== excluirId && n.apoderadoId === apoderadoId && normalizar(n.nombre) === norm,
  )
}

function rangoMs(desde: string, hasta: string) {
  return [new Date(limaAIso(desde)).getTime(), new Date(limaAIso(hasta)).getTime() + DIA] as const
}

function totalSesion(s: MSesion) {
  return s.pago + s.extensiones.reduce((a, e) => a + e.monto, 0)
}

function resumen(desde: string, hasta: string): ResumenReportes {
  const [d, h] = rangoMs(desde, hasta)
  const ses = db.sesiones.filter((s) => s.estado !== 'cancelada' && s.inicio >= d && s.inicio < h)
  const extra = ses.reduce((a, s) => a + s.extensiones.reduce((x, e) => x + e.monto, 0), 0)
  const ingresos = ses.reduce((a, s) => a + totalSesion(s), 0)
  const res = db.reservas.filter((r) => r.estado === 'realizada' && r.inicio >= d && r.inicio < h)
  const reservasMonto = res.reduce((a, r) => a + r.monto, 0)
  const gas = db.gastos.filter((g) => g.fecha >= desde && g.fecha <= hasta)
  const gastosMonto = gas.reduce((a, g) => a + g.monto, 0)

  const ventasPorDia = Array.from({ length: 14 }, (_, i) => {
    const dia = ymdLima(Date.now() - (13 - i) * DIA)
    const [a, b] = rangoMs(dia, dia)
    const delDia = db.sesiones.filter((s) => s.estado !== 'cancelada' && s.inicio >= a && s.inicio < b)
    return { fecha: dia, total: delDia.reduce((x, s) => x + totalSesion(s), 0), sesiones: delDia.length }
  })

  const grupos = new Map<string, { sesiones: number; ingresos: number }>()
  for (const s of ses) {
    const nombre = sesionDto(s).tarifa.nombre
    const g = grupos.get(nombre) ?? { sesiones: 0, ingresos: 0 }
    g.sesiones += 1
    g.ingresos += totalSesion(s)
    grupos.set(nombre, g)
  }

  return {
    ingresosSesiones: ingresos,
    ingresosTiempoExtra: extra,
    visitas: ses.reduce((a, s) => a + s.ninoIds.length, 0),
    sesiones: ses.length,
    reservasRealizadas: { cantidad: res.length, monto: reservasMonto },
    gastos: { registros: gas.length, monto: gastosMonto },
    utilidad: ingresos + reservasMonto - gastosMonto,
    ventasPorDia,
    porTarifa: [...grupos.entries()]
      .map(([nombre, g]) => ({ nombre, ...g }))
      .sort((a, b) => b.ingresos - a.ingresos),
    sellosEntregados: db.sellos.filter((s) => ses.some((x) => x.id === s.sesionId)).length,
    canjes: db.canjes.filter((c) => c.en >= d && c.en < h).length,
  }
}

function crearSesion(ninoIds: number[], tarifaId: number | null, minutos: number, monto: number, canjeHito: number | null = null) {
  const now = Date.now()
  const s: MSesion = {
    id: nextId(),
    ninoIds,
    tarifaId,
    empleadoId: yo().id,
    inicio: now,
    finPrevisto: now + minutos * MIN,
    finReal: null,
    estado: 'activa',
    pago: monto,
    extensiones: [],
    canjeHito,
  }
  db.sesiones.push(s)
  if (monto > 0) for (const id of ninoIds) agregarSello(id, s.id)
  return s
}

function exigirLibres(ninoIds: number[]) {
  for (const id of ninoIds) {
    const n = db.ninos.find((x) => x.id === id && x.activo)
    if (!n) throw new ApiError(400, 'Niño no encontrado.')
    if (enJuego(id)) throw new ApiError(409, `${n.nombre} ya está jugando.`)
  }
}

function sesionActiva(id: string): MSesion {
  const s = db.sesiones.find((x) => x.id === Number(id))
  if (!s) throw new ApiError(404, 'Sesión no encontrada.')
  if (s.estado !== 'activa') throw new ApiError(409, 'La sesión ya no está activa.')
  return s
}

const routes: Route[] = []
const add = (method: string, pattern: string, auth: Route['auth'], handler: Handler) => {
  routes.push({ method, re: new RegExp(`^${pattern}$`), handler, auth })
}

add('POST', '/api/auth/login', 'none', (_p, b) => {
  const u = db.usuarios.find((x) => x.usuario === String(b.usuario ?? '').trim().toLowerCase())
  if (!u || u.password !== b.contrasena) throw new ApiError(401, 'Usuario o contraseña incorrectos')
  if (!u.activo) throw new ApiError(403, 'Este usuario está desactivado')
  db.meId = u.id
  return usuarioDto(u)
})

add('POST', '/api/auth/logout', 'none', () => {
  db.meId = null
  return null
})

add('GET', '/api/configuracion', 'user', (): Configuracion => ({ ...db.config }))

add('PUT', '/api/configuracion/(modo_mantenimiento|facebook_url)', 'admin', ([clave], b): Configuracion => {
  if (clave === 'modo_mantenimiento') db.config.modoMantenimiento = b.valor === 'true'
  else db.config.facebookUrl = String(b.valor ?? '')
  return { ...db.config }
})

add('GET', '/api/tarifas', 'user', (): Tarifa[] => db.tarifas.map((t) => ({ ...t })))

add('PUT', '/api/tarifas/(\\d+)', 'admin', ([id], b): Tarifa => {
  const t = db.tarifas.find((x) => x.id === Number(id))
  if (!t) throw new ApiError(404, 'Tarifa no encontrada.')
  if (typeof b.precio !== 'number' || b.precio < 0) throw new ApiError(400, 'Precio no válido.')
  t.precio = b.precio
  t.activa = !!b.activa
  return { ...t }
})

add('GET', '/api/planes-reserva', 'user', (): PlanReserva[] => db.planes.map((p) => ({ ...p })))

add('POST', '/api/planes-reserva', 'admin', (_p, b): PlanReserva => {
  if (!String(b.nombre ?? '').trim()) throw new ApiError(400, 'Escribe el nombre del plan.')
  if (!(b.precio >= 0)) throw new ApiError(400, 'Precio no válido.')
  const p = { id: nextId(), nombre: b.nombre.trim(), descripcion: b.descripcion ?? '', precio: b.precio, activo: true }
  db.planes.push(p)
  return { ...p }
})

add('PUT', '/api/planes-reserva/(\\d+)', 'admin', ([id], b): PlanReserva => {
  const p = db.planes.find((x) => x.id === Number(id))
  if (!p) throw new ApiError(404, 'Plan no encontrado.')
  Object.assign(p, { nombre: b.nombre, descripcion: b.descripcion, precio: b.precio, activo: !!b.activo })
  return { ...p }
})

add('GET', '/api/reglas', 'user', (): ReglaFidelidad[] =>
  db.reglas.map(({ minutos: _m, ...r }) => ({ ...r })),
)

add('PUT', '/api/reglas/(\\d+)', 'admin', ([id], b): ReglaFidelidad => {
  const r = db.reglas.find((x) => x.id === Number(id))
  if (!r) throw new ApiError(404, 'Regla no encontrada.')
  r.descripcionRecompensa = b.descripcionRecompensa
  r.activa = !!b.activa
  const { minutos: _m, ...out } = r
  return out
})

add('GET', '/api/usuarios', 'admin', (): Usuario[] => db.usuarios.map(usuarioDto))

add('POST', '/api/usuarios', 'admin', (_p, b): Usuario => {
  const usuario = String(b.usuario ?? '').trim().toLowerCase()
  if (!String(b.nombre ?? '').trim() || !usuario) throw new ApiError(400, 'Completa nombre y usuario.')
  if (db.usuarios.some((u) => u.usuario === usuario)) throw new ApiError(409, 'Ese usuario ya existe.')
  const u: MUsuario = { id: nextId(), nombre: b.nombre.trim(), usuario, rol: b.rol, activo: true, password: 'nube123' }
  db.usuarios.push(u)
  return usuarioDto(u)
})

add('PUT', '/api/usuarios/(\\d+)', 'admin', ([id], b): Usuario => {
  const u = db.usuarios.find((x) => x.id === Number(id))
  if (!u) throw new ApiError(404, 'Usuario no encontrado.')
  if (u.id === yo().id) throw new ApiError(400, 'No puedes desactivarte a ti mismo.')
  u.activo = !!b.activo
  return usuarioDto(u)
})

add('GET', '/api/ninos/buscar', 'user', (_p, _b, q): NinoBusqueda[] => {
  const term = normalizar(q.get('q') ?? '')
  if (term.length < 2) return []
  const dig = soloDigitos(term)
  return db.ninos
    .filter((n) => {
      if (!n.activo) return false
      const ap = apoderadoDe(n)
      return (
        normalizar(n.nombre).includes(term) ||
        (!!ap && normalizar(ap.nombre).includes(term)) ||
        (dig.length >= 3 && !!ap && ap.telefono.includes(dig))
      )
    })
    .slice(0, 6)
    .map(ninoDto)
})

add('POST', '/api/ninos', 'user', (_p, b): NinoBusqueda => {
  validarNino(b.nombreCompleto ?? '', b.apoderadoNombre, b.telefono)
  let apoderadoId: number | null = null
  if (b.telefono?.trim()) {
    const tel = soloDigitos(b.telefono)
    let ap = buscarApoderadoPorTelefono(tel)
    if (!ap) {
      ap = {
        id: nextId(),
        nombre: b.apoderadoNombre.trim().replace(/\s+/g, ' '),
        telefono: tel,
        aceptaDatos: false,
        aceptaEn: null,
        version: null,
        activo: true,
      }
      db.apoderados.push(ap)
    }
    apoderadoId = ap.id
  }
  const nombre = b.nombreCompleto.trim().replace(/\s+/g, ' ')
  if (duplicado(nombre, apoderadoId)) throw new ApiError(409, 'Ese niño ya está registrado con ese papá o mamá.')
  const n: MNino = { id: nextId(), nombre, apoderadoId, activo: true }
  db.ninos.push(n)
  return ninoDto(n)
})

add('PUT', '/api/ninos/(\\d+)', 'user', ([id], b): NinoBusqueda => {
  const n = db.ninos.find((x) => x.id === Number(id))
  if (!n) throw new ApiError(404, 'Niño no encontrado.')
  const actual = apoderadoDe(n)

  if (b.apoderadoId !== undefined) {
    const destino = db.apoderados.find((a) => a.id === b.apoderadoId)
    if (!destino) throw new ApiError(404, 'Apoderado no encontrado.')
    if (duplicado(n.nombre, destino.id, n.id)) throw new ApiError(409, 'Ese apoderado ya tiene un niño con ese nombre.')
    registrarCambio('ninos', n.id, 'apoderado', actual?.nombre ?? null, destino.nombre)
    n.apoderadoId = destino.id
    return ninoDto(n)
  }

  if (b.pedirAutorizacion && vigente()) throw new ApiError(409, 'Ya hay un QR habilitado. Deshabilítalo primero.')

  if (b.nombreCompleto !== undefined) {
    if (!nombreCompletoValido(b.nombreCompleto)) throw new ApiError(400, 'Escribe el nombre completo del niño.')
    const nombre = b.nombreCompleto.trim().replace(/\s+/g, ' ')
    if (duplicado(nombre, n.apoderadoId, n.id)) throw new ApiError(409, 'Ese niño ya está registrado con ese papá o mamá.')
    registrarCambio('ninos', n.id, 'nombre_completo', n.nombre, nombre)
    n.nombre = nombre
  }

  if (b.apoderadoNombre !== undefined || b.telefono !== undefined) {
    validarNino(n.nombre, b.apoderadoNombre, b.telefono)
    const tel = b.telefono ? soloDigitos(b.telefono) : ''
    const nombreAp = (b.apoderadoNombre ?? '').trim().replace(/\s+/g, ' ')
    if (!actual) {
      if (tel) {
        let ap = buscarApoderadoPorTelefono(tel)
        if (!ap) {
          ap = { id: nextId(), nombre: nombreAp, telefono: tel, aceptaDatos: false, aceptaEn: null, version: null, activo: true }
          db.apoderados.push(ap)
        }
        n.apoderadoId = ap.id
        registrarCambio('ninos', n.id, 'apoderado', null, ap.nombre)
      }
    } else if (tel) {
      const otro = buscarApoderadoPorTelefono(tel, actual.id)
      if (otro) {
        throw new ApiError(409, `El celular ${tel.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')} ya es de ${otro.nombre}.`)
          .withData({ apoderadoExistente: { id: otro.id, nombre: otro.nombre, telefono: otro.telefono } })
      }
      registrarCambio('apoderados', actual.id, 'nombre_completo', actual.nombre, nombreAp)
      registrarCambio('apoderados', actual.id, 'telefono', actual.telefono, tel)
      const cambioTel = actual.telefono !== tel
      actual.nombre = nombreAp
      actual.telefono = tel
      if (cambioTel && b.pedirAutorizacion) {
        actual.aceptaDatos = false
        actual.aceptaEn = null
        actual.version = null
        crearActivacion('registro', n.id)
      }
    }
  }
  return ninoDto(n)
})

add('POST', '/api/ninos/(\\d+)/desactivar', 'admin', ([id]) => {
  const n = db.ninos.find((x) => x.id === Number(id))
  if (!n) throw new ApiError(404, 'Niño no encontrado.')
  if (enJuego(n.id)) throw new ApiError(409, 'El niño está jugando ahora.')
  n.activo = false
  registrarCambio('ninos', n.id, 'activo', 'true', 'false')
  return null
})

add('GET', '/api/ninos/(\\d+)/cambios', 'user', ([id]): CambioDato[] =>
  db.cambios
    .filter((c) => c.tabla === 'ninos' && c.registroId === Number(id))
    .sort((a, b) => b.en - a.en)
    .map((c) => ({
      id: c.id,
      campo: c.campo,
      valorAnterior: c.anterior,
      valorNuevo: c.nuevo,
      empleado: nombreEmpleado(c.empleadoId),
      fecha: iso(c.en),
    })),
)

add('GET', '/api/ninos/(\\d+)/tarjeta', 'user', ([id]): Tarjeta | null => {
  const t = tarjetaAbierta(Number(id))
  return t ? tarjetaDto(t) : null
})

add('GET', '/api/sesiones/activas', 'user', (): Sesion[] =>
  db.sesiones.filter((s) => s.estado === 'activa').map(sesionDto),
)

add('POST', '/api/sesiones', 'user', (_p, b): Sesion => {
  const ninoIds: number[] = b.ninoIds ?? []
  if (!ninoIds.length) throw new ApiError(400, 'Agrega al menos un niño.')
  exigirLibres(ninoIds)
  if (b.tarifaId === null) {
    if (!(b.minutos > 0)) throw new ApiError(400, 'Escribe los minutos.')
    if (!(b.monto >= 0)) throw new ApiError(400, 'Escribe un monto válido.')
    return sesionDto(crearSesion(ninoIds, null, b.minutos, b.monto))
  }
  const t = db.tarifas.find((x) => x.id === b.tarifaId && x.activa)
  if (!t) throw new ApiError(400, 'Tarifa no disponible.')
  if (ninoIds.length !== t.cantidadNinos) throw new ApiError(400, `Esta tarifa necesita ${t.cantidadNinos} niño(s).`)
  return sesionDto(crearSesion(ninoIds, t.id, t.duracionMinutos, t.precio))
})

add('POST', '/api/sesiones/(\\d+)/extensiones', 'user', ([id], b): Sesion => {
  const s = sesionActiva(id)
  if (b.tipo === 'cortesia') {
    s.extensiones.push({ tipo: 'cortesia', minutos: 5, monto: 0, en: Date.now() })
    s.finPrevisto += 5 * MIN
  } else if (b.tipo === 'rapida') {
    if (s.tarifaId === null || s.ninoIds.length !== 1) throw new ApiError(400, 'Esta sesión no tiene tiempo rápido.')
    const dur = (s.finPrevisto - s.inicio) / MIN
    const monto = dur < 60 ? 3 : 5
    s.extensiones.push({ tipo: 'pagada', minutos: 30, monto, en: Date.now() })
    s.finPrevisto += 30 * MIN
  } else {
    if (!(b.minutos > 0)) throw new ApiError(400, 'Escribe los minutos.')
    if (!(b.monto >= 0)) throw new ApiError(400, 'Escribe un monto válido.')
    s.extensiones.push({ tipo: 'pagada', minutos: b.minutos, monto: b.monto, en: Date.now() })
    s.finPrevisto += b.minutos * MIN
  }
  return sesionDto(s)
})

add('POST', '/api/sesiones/(\\d+)/finalizar', 'user', ([id]) => {
  const s = sesionActiva(id)
  s.estado = 'finalizada'
  s.finReal = Date.now()
  return null
})

add('POST', '/api/sesiones/(\\d+)/cancelar', 'user', ([id]) => {
  const s = sesionActiva(id)
  s.estado = 'cancelada'
  s.finReal = Date.now()
  db.sellos = db.sellos.filter((x) => x.sesionId !== s.id)
  return null
})

add('POST', '/api/tarjetas/(\\d+)/canjes', 'user', ([id], b) => {
  const t = db.tarjetas.find((x) => x.id === Number(id))
  if (!t) throw new ApiError(404, 'Tarjeta no encontrada.')
  const regla = db.reglas.find((r) => r.activa && r.sellosRequeridos === b.hito)
  if (!regla) throw new ApiError(400, 'Ese premio no existe.')
  if (conteoSellos(t.id) < regla.sellosRequeridos) throw new ApiError(409, 'Todavía no tiene los sellos necesarios.')
  if (db.canjes.some((c) => c.tarjetaId === t.id && c.hito === regla.sellosRequeridos)) {
    throw new ApiError(409, 'Ese premio ya fue canjeado.')
  }
  exigirLibres([t.ninoId])
  const s = crearSesion([t.ninoId], null, regla.minutos, 0, regla.sellosRequeridos)
  db.canjes.push({ id: nextId(), tarjetaId: t.id, hito: regla.sellosRequeridos, sesionId: s.id, empleadoId: yo().id, en: Date.now() })
  let abierta = t
  if (regla.sellosRequeridos === maxSellos()) {
    t.completadaEn = Date.now()
    abierta = { id: nextId(), ninoId: t.ninoId, ciclo: t.ciclo + 1, completadaEn: null }
    db.tarjetas.push(abierta)
  }
  return { sesion: sesionDto(s), tarjeta: tarjetaDto(abierta) }
})

add('GET', '/api/activaciones/vigente', 'user', (): Activacion | null => {
  const a = vigente()
  return a ? activacionDto(a) : null
})

add('GET', '/api/activaciones/hoy', 'user', (): Activacion[] => {
  const hoy = ymdLima(Date.now())
  return db.activaciones.filter((a) => ymdLima(a.creadaEn) === hoy).map(activacionDto)
})

add('POST', '/api/activaciones', 'user', (_p, b): Activacion => {
  const n = db.ninos.find((x) => x.id === b.ninoId && x.activo)
  if (!n) throw new ApiError(404, 'Niño no encontrado.')
  const tiene = !!tarjetaAbierta(n.id)
  if (b.tipo === 'consulta' && !tiene) throw new ApiError(400, 'Este niño aún no tiene tarjeta.')
  if (b.tipo === 'registro' && !n.apoderadoId) throw new ApiError(400, 'Agrega los datos del papá o mamá primero.')
  return activacionDto(crearActivacion(b.tipo, n.id))
})

add('POST', '/api/activaciones/(\\d+)/cerrar', 'user', ([id]) => {
  const a = db.activaciones.find((x) => x.id === Number(id))
  if (!a) throw new ApiError(404, 'Habilitación no encontrada.')
  if (['esperando', 'reclamada', 'aprobada'].includes(a.estado)) a.estado = 'cerrada'
  return null
})

function vistaPublica(): VistaQr {
  const a = vigente()
  if (db.config.modoMantenimiento || !a) return { vista: 'anuncio', anuncio: anuncio() }
  const n = db.ninos.find((x) => x.id === a.ninoId)!
  const ap = apoderadoDe(n)!
  if (a.tipo === 'registro' && a.estado !== 'aprobada') {
    a.estado = 'reclamada'
    return {
      vista: 'autorizacion',
      autorizacion: {
        apoderadoCorto: ap.nombre.split(' ')[0],
        apoderado: ap.nombre,
        nino: n.nombre,
        telefonoOculto: `••• ••• ${ap.telefono.slice(-3)}`,
        version: 'v1',
      },
    }
  }
  if (a.estado === 'esperando') a.estado = 'reclamada'
  return { vista: 'tarjeta', tarjeta: tarjetaPublica(n.id) }
}

add('GET', '/public/qr', 'none', () => vistaPublica())

add('POST', '/public/qr/autorizar', 'none', (_p, b): VistaQr => {
  const a = vigente()
  if (!a || a.tipo !== 'registro' || a.estado === 'aprobada') throw new ApiError(409, 'No hay una autorización pendiente.')
  if (!b.acepta) {
    a.estado = 'cancelada'
    return { vista: 'anuncio', anuncio: anuncio() }
  }
  const n = db.ninos.find((x) => x.id === a.ninoId)!
  const ap = apoderadoDe(n)!
  ap.aceptaDatos = true
  ap.aceptaEn = Date.now()
  ap.version = 'v1'
  if (!tarjetaAbierta(n.id)) db.tarjetas.push({ id: nextId(), ninoId: n.id, ciclo: 1, completadaEn: null })
  a.estado = 'aprobada'
  return { vista: 'tarjeta', tarjeta: tarjetaPublica(n.id) }
})

add('GET', '/api/reservas', 'user', (_p, _b, q): Reserva[] => {
  const now = Date.now()
  const proximas = q.get('filtro') !== 'todas'
  const lista = proximas
    ? db.reservas.filter((r) => ['pendiente', 'confirmada'].includes(r.estado) && r.fin >= now)
    : [...db.reservas]
  return lista.sort((a, b) => (proximas ? a.inicio - b.inicio : b.inicio - a.inicio)).map(reservaDto)
})

add('POST', '/api/reservas', 'user', (_p, b): Reserva => {
  const plan = db.planes.find((p) => p.id === b.planId && p.activo)
  if (!plan) throw new ApiError(400, 'Elige un plan.')
  const inicio = new Date(b.inicio).getTime()
  const fin = new Date(b.fin).getTime()
  if (!(fin > inicio)) throw new ApiError(400, 'La hora final debe ser mayor a la inicial.')
  if (!nombreCompletoValido(b.contacto ?? '')) throw new ApiError(400, 'Escribe el nombre completo del contacto.')
  if (soloDigitos(b.telefono ?? '').length !== 9) throw new ApiError(400, 'El celular debe tener 9 dígitos.')
  if (!(b.monto >= 0)) throw new ApiError(400, 'Monto no válido.')
  if (!(b.adelanto >= 0) || b.adelanto > b.monto) throw new ApiError(400, 'El adelanto no puede superar el total.')
  if (db.reservas.some((r) => r.estado !== 'cancelada' && r.inicio < fin && r.fin > inicio)) {
    throw new ApiError(409, 'Ya hay una reserva que se cruza con ese horario.')
  }
  const r: MReserva = {
    id: nextId(),
    planId: plan.id,
    contacto: b.contacto.trim().replace(/\s+/g, ' '),
    telefono: soloDigitos(b.telefono),
    inicio,
    fin,
    monto: b.monto,
    adelanto: b.adelanto,
    estado: 'pendiente',
    observaciones: b.observaciones?.trim() || null,
    empleadoId: yo().id,
  }
  db.reservas.push(r)
  return reservaDto(r)
})

add('POST', '/api/reservas/(\\d+)/estado', 'user', ([id], b): Reserva => {
  const r = db.reservas.find((x) => x.id === Number(id))
  if (!r) throw new ApiError(404, 'Reserva no encontrada.')
  if (!reservaDto(r).siguientesEstados.includes(b.estado)) throw new ApiError(409, 'Ese cambio de estado no es válido.')
  r.estado = b.estado
  return reservaDto(r)
})

add('GET', '/api/categorias-gasto', 'user', () => db.categorias.map((c) => ({ ...c })))

add('POST', '/api/categorias-gasto', 'user', (_p, b) => {
  const nombre = String(b.nombre ?? '').trim()
  if (!nombre) throw new ApiError(400, 'Escribe el nombre de la categoría.')
  if (db.categorias.some((c) => normalizar(c.nombre) === normalizar(nombre))) {
    throw new ApiError(409, 'Esa categoría ya existe.')
  }
  const c = { id: nextId(), nombre }
  db.categorias.push(c)
  return c
})

add('GET', '/api/gastos', 'user', (_p, _b, q) => {
  const cat = q.get('categoriaId')
  const items = db.gastos
    .filter((g) => !cat || g.categoriaId === Number(cat))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id))
    .map(gastoDto)
  return { items, total: items.reduce((a, g) => a + g.monto, 0) }
})

add('POST', '/api/gastos', 'user', (_p, b): Gasto => {
  if (!db.categorias.some((c) => c.id === b.categoriaId)) throw new ApiError(400, 'Elige una categoría.')
  if (!String(b.descripcion ?? '').trim()) throw new ApiError(400, 'Escribe una descripción.')
  if (!(b.monto > 0)) throw new ApiError(400, 'El monto debe ser mayor a 0.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.fecha ?? '')) throw new ApiError(400, 'Elige una fecha.')
  const g = {
    id: nextId(),
    categoriaId: b.categoriaId,
    descripcion: b.descripcion.trim(),
    monto: b.monto,
    fecha: b.fecha,
    empleadoId: yo().id,
  }
  db.gastos.push(g)
  return gastoDto(g)
})

add('GET', '/api/reportes/resumen', 'user', (_p, _b, q): ResumenReportes => {
  const desde = q.get('desde')
  const hasta = q.get('hasta')
  if (!desde || !hasta) throw new ApiError(400, 'Indica el rango de fechas.')
  return resumen(desde, hasta)
})

export async function mockRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  await delay(120 + Math.random() * 120)
  const url = new URL(path, 'http://mock.local')
  for (const route of routes) {
    if (route.method !== method) continue
    const m = route.re.exec(url.pathname)
    if (!m) continue
    if (route.auth !== 'none') {
      const u = yo()
      if (route.auth === 'admin' && u.rol !== 'admin') throw new ApiError(403, 'Solo el administrador puede hacer esto.')
    }
    const result = route.handler(m.slice(1), body ?? {}, url.searchParams)
    return JSON.parse(JSON.stringify(result ?? null)) as T
  }
  throw new ApiError(404, 'Ruta no encontrada.')
}
