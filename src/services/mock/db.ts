import { limaAIso, ymdLima } from '@/lib/format'

export const MIN = 60_000
export const HORA = 3_600_000
export const DIA = 86_400_000

export interface MUsuario {
  id: number
  nombre: string
  usuario: string
  rol: 'admin' | 'empleado'
  activo: boolean
  password: string
}

export interface MTarifa {
  id: number
  nombre: string
  duracionMinutos: number
  cantidadNinos: number
  precio: number
  activa: boolean
}

export interface MRegla {
  id: number
  sellosRequeridos: number
  descripcionRecompensa: string
  minutos: number
  activa: boolean
}

export interface MPlan {
  id: number
  nombre: string
  descripcion: string
  precio: number
  activo: boolean
}

export interface MReserva {
  id: number
  planId: number
  contacto: string
  telefono: string
  inicio: number
  fin: number
  monto: number
  adelanto: number
  estado: 'pendiente' | 'confirmada' | 'realizada' | 'cancelada'
  observaciones: string | null
  empleadoId: number
}

export interface MApoderado {
  id: number
  nombre: string
  telefono: string
  aceptaDatos: boolean
  aceptaEn: number | null
  version: string | null
  activo: boolean
}

export interface MNino {
  id: number
  nombre: string
  apoderadoId: number | null
  activo: boolean
}

export interface MExtension {
  tipo: 'pagada' | 'cortesia'
  minutos: number
  monto: number
  en: number
}

export interface MSesion {
  id: number
  ninoIds: number[]
  tarifaId: number | null
  empleadoId: number
  inicio: number
  finPrevisto: number
  finReal: number | null
  estado: 'activa' | 'finalizada' | 'cancelada'
  pago: number
  extensiones: MExtension[]
  canjeHito: number | null
}

export interface MSello {
  id: number
  tarjetaId: number
  sesionId: number
  ninoId: number
}

export interface MTarjeta {
  id: number
  ninoId: number
  ciclo: number
  completadaEn: number | null
}

export interface MCanje {
  id: number
  tarjetaId: number
  hito: number
  sesionId: number
  empleadoId: number
  en: number
}

export interface MCategoria {
  id: number
  nombre: string
}

export interface MGasto {
  id: number
  categoriaId: number
  descripcion: string
  monto: number
  fecha: string
  empleadoId: number
}

export interface MCambio {
  id: number
  tabla: string
  registroId: number
  campo: string
  anterior: string | null
  nuevo: string | null
  empleadoId: number
  en: number
}

export interface MActivacion {
  id: number
  tipo: 'registro' | 'consulta'
  estado: 'esperando' | 'reclamada' | 'aprobada' | 'expirada' | 'cancelada' | 'cerrada'
  ninoId: number
  creadaEn: number
  expiraEn: number
  creadaPor: number
}

export interface MockDb {
  meId: number | null
  seq: number
  usuarios: MUsuario[]
  tarifas: MTarifa[]
  reglas: MRegla[]
  planes: MPlan[]
  reservas: MReserva[]
  config: { modoMantenimiento: boolean; facebookUrl: string }
  apoderados: MApoderado[]
  ninos: MNino[]
  sesiones: MSesion[]
  sellos: MSello[]
  tarjetas: MTarjeta[]
  canjes: MCanje[]
  categorias: MCategoria[]
  gastos: MGasto[]
  cambios: MCambio[]
  activaciones: MActivacion[]
}

function crearSemilla(): MockDb {
  const now = Date.now()
  const hoy = limaAIso(ymdLima(now))
  const base = new Date(hoy).getTime()
  let r = 11
  const rnd = () => {
    r = (r * 16807) % 2147483647
    return (r - 1) / 2147483646
  }
  let seq = 1
  const nextId = () => seq++

  const tarifas: MTarifa[] = [
    { id: 1, nombre: 'Media hora', duracionMinutos: 30, cantidadNinos: 1, precio: 7, activa: true },
    { id: 2, nombre: '1 hora', duracionMinutos: 60, cantidadNinos: 1, precio: 10, activa: true },
    { id: 3, nombre: 'Dúo de amigos', duracionMinutos: 60, cantidadNinos: 2, precio: 15, activa: true },
    { id: 4, nombre: 'Trío de amigos', duracionMinutos: 60, cantidadNinos: 3, precio: 20, activa: true },
    { id: 5, nombre: 'Cumpleañero', duracionMinutos: 60, cantidadNinos: 1, precio: 0, activa: true },
  ]

  const ap = (id: number, nombre: string, telefono: string, acepta = true): MApoderado => ({
    id,
    nombre,
    telefono,
    aceptaDatos: acepta,
    aceptaEn: acepta ? base - 20 * DIA : null,
    version: acepta ? 'v1' : null,
    activo: true,
  })
  const apoderados = [
    ap(1, 'Carla Rojas Medina', '987654321'),
    ap(2, 'Jorge Salazar Ruiz', '956112233'),
    ap(3, 'Luis Quispe Huamán', '945887766'),
    ap(4, 'Rosa Mendoza Lara', '912334455'),
    ap(5, 'Ana Vega Torres', '998221144'),
    ap(6, 'Pedro Chávez Ríos', '933556677'),
    ap(7, 'Milagros Soto Vargas', '977445566'),
    ap(8, 'Diego Paredes León', '966778899'),
    ap(9, 'Karina Flores Díaz', '921456789', false),
  ]

  const ni = (id: number, nombre: string, apoderadoId: number | null): MNino => ({
    id,
    nombre,
    apoderadoId,
    activo: true,
  })
  const ninos = [
    ni(1, 'Mateo Pérez Rojas', 1),
    ni(2, 'Mateo Salazar Ruiz', 2),
    ni(3, 'Valentina Quispe Huamán', 3),
    ni(4, 'Thiago Mendoza Lara', 4),
    ni(5, 'Camila Flores Díaz', 9),
    ni(6, 'Luciana Torres Vega', 5),
    ni(7, 'Sebastián Chávez Ríos', 6),
    ni(8, 'Isabella Ramos Vega', 5),
    ni(9, 'Gael Vargas Soto', 7),
    ni(10, 'Ariana Castillo Paz', null),
    ni(11, 'Emma Paredes León', 8),
    ni(12, 'Joaquín Ruiz Alva', null),
    ni(13, 'Renata Gómez Silva', null),
    ni(14, 'Santiago Núñez Paz', null),
    ni(15, 'Mía Herrera Cano', null),
    ni(16, 'Dylan Cortez Ramos', null),
  ]

  const sesiones: MSesion[] = []
  const sellos: MSello[] = []
  const tarjetas: MTarjeta[] = []
  const canjes: MCanje[] = []

  const sesion = (
    inicio: number,
    ninoIds: number[],
    tarifaId: number,
    estado: MSesion['estado'] = 'finalizada',
    gratis = false,
  ) => {
    const t = tarifas.find((x) => x.id === tarifaId)!
    const s: MSesion = {
      id: nextId(),
      ninoIds,
      tarifaId,
      empleadoId: 1 + (seq % 2),
      inicio,
      finPrevisto: inicio + t.duracionMinutos * MIN,
      finReal: estado === 'finalizada' ? inicio + t.duracionMinutos * MIN : null,
      estado,
      pago: gratis ? 0 : t.precio,
      extensiones: [],
      canjeHito: null,
    }
    sesiones.push(s)
    return s
  }
  const sello = (tarjeta: MTarjeta, s: MSesion, ninoId: number) =>
    sellos.push({ id: nextId(), tarjetaId: tarjeta.id, sesionId: s.id, ninoId })

  const conTarjeta: Record<number, number> = { 1: 4, 2: 8, 3: 2, 4: 5, 6: 0, 7: 8, 9: 5, 11: 3 }
  for (const [k, cantidad] of Object.entries(conTarjeta)) {
    const ninoId = Number(k)
    const tarjeta: MTarjeta = { id: nextId(), ninoId, ciclo: 1, completadaEn: null }
    tarjetas.push(tarjeta)
    for (let i = 0; i < cantidad; i++) {
      const d = 1 + ((ninoId * 7 + i * 3) % 13)
      const ini = base - d * DIA + 15 * HORA + Math.floor(rnd() * 280) * MIN
      sello(tarjeta, sesion(ini, [ninoId], i % 2 ? 1 : 2), ninoId)
    }
  }

  const pool = [5, 8, 10, 12, 13, 14, 15, 16]
  for (let d = 13; d >= 0; d--) {
    const cuantas = 4 + Math.floor(rnd() * 6)
    for (let i = 0; i < cuantas; i++) {
      const x = rnd()
      const tid = x < 0.35 ? 1 : x < 0.7 ? 2 : x < 0.85 ? 3 : x < 0.95 ? 4 : 5
      const n = tarifas.find((t) => t.id === tid)!.cantidadNinos
      const kids: number[] = []
      while (kids.length < n) {
        const c = pool[Math.floor(rnd() * pool.length)]
        if (!kids.includes(c)) kids.push(c)
      }
      let ini = base - d * DIA + 15 * HORA + Math.floor(rnd() * 270) * MIN
      if (d === 0) ini = Math.min(ini, now - (100 + i * 15) * MIN)
      const s = sesion(ini, kids, tid)
      if (rnd() < 0.25) {
        const monto = tid === 1 ? 3 : 5
        s.extensiones.push({ tipo: 'pagada', minutos: 30, monto, en: ini })
        s.finPrevisto += 30 * MIN
        if (s.finReal) s.finReal += 30 * MIN
      }
    }
  }

  const tarjeta2 = tarjetas.find((t) => t.ninoId === 2)!
  const gratis = sesion(base - 3 * DIA + 16 * HORA, [2], 1, 'finalizada', true)
  gratis.canjeHito = 5
  canjes.push({ id: nextId(), tarjetaId: tarjeta2.id, hito: 5, sesionId: gratis.id, empleadoId: 1, en: gratis.inicio })

  const activas: [number, number[], number][] = [
    [now - 38 * MIN, [4], 2],
    [now - 27 * MIN, [5], 1],
    [now - 62 * MIN, [7], 2],
    [now - 19 * MIN, [6, 8], 3],
  ]
  for (const [ini, kids, tid] of activas) {
    const s = sesion(ini, kids, tid, 'activa')
    for (const nid of kids) {
      const t = tarjetas.find((x) => x.ninoId === nid)
      if (t) sello(t, s, nid)
    }
  }

  const categorias: MCategoria[] = [
    { id: 1, nombre: 'Insumos' },
    { id: 2, nombre: 'Limpieza' },
    { id: 3, nombre: 'Mantenimiento' },
    { id: 4, nombre: 'Servicios' },
  ]
  const g = (categoriaId: number, descripcion: string, monto: number, dias: number, empleadoId: number): MGasto => ({
    id: nextId(),
    categoriaId,
    descripcion,
    monto,
    fecha: ymdLima(base - dias * DIA + 12 * HORA),
    empleadoId,
  })
  const gastos = [
    g(1, 'Agua de mesa x12', 18, 0, 2),
    g(1, 'Stickers para tarjetas', 25, 1, 1),
    g(2, 'Desinfectante y paños', 38, 2, 2),
    g(3, 'Pintura para juegos', 45, 3, 1),
    g(3, 'Reparación de resbaladera', 120, 5, 1),
    g(2, 'Alcohol en gel', 22, 6, 2),
    g(4, 'Luz', 85, 8, 1),
    g(1, 'Pelotas para piscina', 60, 10, 1),
    g(4, 'Internet', 70, 12, 1),
  ]

  const planes: MPlan[] = [
    {
      id: 1,
      nombre: 'Cumpleaños Nube',
      descripcion: 'Salón exclusivo por 2 horas, hasta 15 niños, decoración temática y mesa para torta.',
      precio: 250,
      activo: true,
    },
    {
      id: 2,
      nombre: 'Cumpleaños Arcoíris',
      descripcion: 'Salón exclusivo por 3 horas, hasta 25 niños, decoración, animación y bolsitas de regalo.',
      precio: 390,
      activo: true,
    },
  ]

  const rv = (
    planId: number,
    contacto: string,
    telefono: string,
    dias: number,
    h1: number,
    h2: number,
    monto: number,
    adelanto: number,
    estado: MReserva['estado'],
    observaciones: string | null,
  ): MReserva => ({
    id: nextId(),
    planId,
    contacto,
    telefono,
    inicio: base + dias * DIA + h1 * HORA,
    fin: base + dias * DIA + h2 * HORA,
    monto,
    adelanto,
    estado,
    observaciones,
    empleadoId: 1,
  })

  return {
    meId: null,
    seq: seq + 1000,
    usuarios: [
      { id: 1, nombre: 'Administrador', usuario: 'admin', rol: 'admin', activo: true, password: 'nube123' },
      { id: 2, nombre: 'Lucía Herrera', usuario: 'lucia', rol: 'empleado', activo: true, password: 'nube123' },
    ],
    tarifas,
    reglas: [
      { id: 1, sellosRequeridos: 5, descripcionRecompensa: '½ hora gratis', minutos: 30, activa: true },
      { id: 2, sellosRequeridos: 10, descripcionRecompensa: '1 hora gratis + regalo sorpresa', minutos: 60, activa: true },
    ],
    planes,
    reservas: [
      rv(1, 'Patricia Lozano Ríos', '944332211', 2, 15, 17, 250, 100, 'confirmada', 'Temática de dinosaurios, 12 niños'),
      rv(2, 'Ricardo Benites Paz', '955667788', 5, 16, 19, 390, 150, 'pendiente', null),
      rv(1, 'Sofía Castro León', '988776655', -4, 15, 17, 250, 250, 'realizada', null),
    ],
    config: { modoMantenimiento: false, facebookUrl: 'https://facebook.com/nubelandia' },
    apoderados,
    ninos,
    sesiones,
    sellos,
    tarjetas,
    canjes,
    categorias,
    gastos,
    cambios: [
      {
        id: nextId(),
        tabla: 'ninos',
        registroId: 1,
        campo: 'nombre_completo',
        anterior: 'Mateo Peres Rojas',
        nuevo: 'Mateo Pérez Rojas',
        empleadoId: 2,
        en: now - 3 * DIA,
      },
    ],
    activaciones: [],
  }
}

export const db: MockDb = crearSemilla()

export function nextId(): number {
  return db.seq++
}
