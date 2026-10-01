export type Rol = 'admin' | 'empleado'

export interface Usuario {
  id: number
  nombre: string
  usuario: string
  rol: Rol
  activo: boolean
}

export interface Sesion {
  id: number
  tarifa: { id: number | null; nombre: string }
  ninos: { id: number; nombre: string }[]
  inicio: string
  finPrevisto: string
  monto: number
  estado: 'activa' | 'finalizada' | 'cancelada'
  extensionRapida: { label: string } | null
}

export interface Tarifa {
  id: number
  nombre: string
  duracionMinutos: number
  cantidadNinos: number
  precio: number
  activa: boolean
}

export interface ReglaFidelidad {
  id: number
  sellosRequeridos: number
  descripcionRecompensa: string
  activa: boolean
}

export interface PlanReserva {
  id: number
  nombre: string
  descripcion: string
  precio: number
  activo: boolean
}

export interface Configuracion {
  modoMantenimiento: boolean
  facebookUrl: string
}

export interface NinoBusqueda {
  id: number
  nombre: string
  apoderadoId: number | null
  apoderado: string | null
  telefono: string | null
  sellos: { actuales: number; requeridos: number } | null
  enJuego: boolean
  activo: boolean
}

export interface CrearSesionRequest {
  tarifaId: number | null
  minutos?: number
  monto?: number
  ninoIds: number[]
}

export interface ExtensionRequest {
  tipo: 'rapida' | 'cortesia' | 'otro'
  minutos?: number
  monto?: number
}

export interface CrearNinoRequest {
  nombreCompleto: string
  apoderadoNombre?: string
  telefono?: string
}

export interface EditarNinoRequest {
  nombreCompleto?: string
  apoderadoNombre?: string
  telefono?: string
  apoderadoId?: number
  pedirAutorizacion?: boolean
}

export interface Premio {
  hito: number
  titulo: string
  estado: 'bloqueado' | 'disponible' | 'canjeado'
  detalle: string
}

export interface VisitaNino {
  fecha: string
  tarifa: string
  etiqueta: 'sello' | 'canje' | 'sin sello'
}

export interface Tarjeta {
  id: number
  ninoId: number
  ciclo: number
  sellos: number
  totalSellos: number
  premios: Premio[]
  visitas: VisitaNino[]
}

export interface CambioDato {
  id: number
  campo: string
  valorAnterior: string | null
  valorNuevo: string | null
  empleado: string
  fecha: string
}

export type EstadoActivacion =
  | 'esperando'
  | 'reclamada'
  | 'aprobada'
  | 'expirada'
  | 'cancelada'
  | 'cerrada'

export interface Activacion {
  id: number
  tipo: 'registro' | 'consulta'
  estado: EstadoActivacion
  ninoId: number
  ninoNombre: string
  apoderadoNombre: string | null
  creadaEn: string
  expiraEn: string
  creadaPor: string
}

export interface ActivacionRequest {
  tipo: 'registro' | 'consulta'
  ninoId: number
}

export interface TarjetaPublica {
  nino: string
  sellos: number
  totalSellos: number
  premios: { titulo: string }[]
  visitas: { fecha: string }[]
}

export interface Anuncio {
  horario: string
  direccion: string
  tarifas: { nombre: string; precio: number }[]
  premios: { texto: string }[]
  planes: { nombre: string; precio: number }[]
  facebookUrl: string
}

export interface Autorizacion {
  apoderadoCorto: string
  apoderado: string
  nino: string
  telefonoOculto: string
  version: string
}

export type VistaQr =
  | { vista: 'autorizacion'; autorizacion: Autorizacion }
  | { vista: 'tarjeta'; tarjeta: TarjetaPublica }
  | { vista: 'anuncio'; anuncio: Anuncio }

export type EstadoReserva = 'pendiente' | 'confirmada' | 'realizada' | 'cancelada'

export interface Reserva {
  id: number
  plan: { id: number; nombre: string }
  contacto: string
  telefono: string
  inicio: string
  fin: string
  monto: number
  adelanto: number
  saldo: number
  estado: EstadoReserva
  observaciones: string | null
  siguientesEstados: EstadoReserva[]
}

export interface CrearReservaRequest {
  planId: number
  inicio: string
  fin: string
  contacto: string
  telefono: string
  monto: number
  adelanto: number
  observaciones?: string
}

export interface CategoriaGasto {
  id: number
  nombre: string
}

export interface Gasto {
  id: number
  categoriaId: number
  categoria: string
  descripcion: string
  monto: number
  fecha: string
  empleado: string
}

export interface ListaGastos {
  items: Gasto[]
  total: number
}

export interface CrearGastoRequest {
  categoriaId: number
  descripcion: string
  monto: number
  fecha: string
}

export interface ResumenReportes {
  ingresosSesiones: number
  ingresosTiempoExtra: number
  visitas: number
  sesiones: number
  reservasRealizadas: { cantidad: number; monto: number }
  gastos: { registros: number; monto: number }
  utilidad: number
  ventasPorDia: { fecha: string; total: number; sesiones: number }[]
  porTarifa: { nombre: string; sesiones: number; ingresos: number }[]
  sellosEntregados: number
  canjes: number
}

export interface CrearUsuarioRequest {
  nombre: string
  usuario: string
  rol: Rol
}
