import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NinoBusqueda } from '@/types'
import {
  activacionesService,
  ApiError,
  configuracionService,
  mensajeDeError,
  ninosService,
  sesionesService,
} from '@/services'
import { SellosGrid } from '@/components/SellosGrid'
import { Button } from '@/components/ui/Button'
import { Field, FormError, Input } from '@/components/ui/Fields'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import { fechaCortaLima, fechaHoraLima, formatoCelular, nombreCompletoValido, soloDigitos } from '@/lib/format'

interface Props {
  nino: NinoBusqueda
  onActualizado: (nino: NinoBusqueda | null) => void
}

const CAMPOS: Record<string, string> = {
  nombre_completo: 'Nombre',
  telefono: 'Celular',
  apoderado: 'Apoderado',
  activo: 'Estado',
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 font-display text-lg font-bold">{children}</div>
}

export function FichaNino({ nino, onActualizado }: Props) {
  const qc = useQueryClient()
  const toast = useToast()
  const { esAdmin } = useAuth()

  const tarjeta = useQuery({ queryKey: ['tarjeta', nino.id], queryFn: () => ninosService.tarjeta(nino.id) })
  const cambios = useQuery({ queryKey: ['ninos', nino.id, 'cambios'], queryFn: () => ninosService.cambios(nino.id) })
  const vigente = useQuery({ queryKey: ['activaciones', 'vigente'], queryFn: activacionesService.vigente })
  const config = useQuery({ queryKey: ['configuracion'], queryFn: configuracionService.obtener })

  const [editando, setEditando] = useState(false)
  const [eNino, setENino] = useState(nino.nombre)
  const [eApod, setEApod] = useState(nino.apoderado ?? '')
  const [eTel, setETel] = useState(nino.telefono ?? '')
  const [eReauth, setEReauth] = useState(true)
  const [eError, setEError] = useState('')
  const [conflicto, setConflicto] = useState<{ id: number; nombre: string; mensaje: string } | null>(null)

  const [kApod, setKApod] = useState('')
  const [kTel, setKTel] = useState('')
  const [kError, setKError] = useState('')

  const bloqueoQr = !!vigente.data || !!config.data?.modoMantenimiento

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['ninos'] })
    qc.invalidateQueries({ queryKey: ['tarjeta'] })
    qc.invalidateQueries({ queryKey: ['activaciones'] })
    qc.invalidateQueries({ queryKey: ['sesiones'] })
  }

  function abrirEdicion() {
    setENino(nino.nombre)
    setEApod(nino.apoderado ?? '')
    setETel(nino.telefono ?? '')
    setEReauth(true)
    setEError('')
    setConflicto(null)
    setEditando(true)
  }

  const telCambio = nino.apoderadoId !== null && soloDigitos(eTel) !== (nino.telefono ?? '')

  const guardar = useMutation({
    mutationFn: () => {
      const body: Parameters<typeof ninosService.editar>[1] = {}
      if (eNino.trim() !== nino.nombre) body.nombreCompleto = eNino
      if (eApod.trim() !== (nino.apoderado ?? '') || soloDigitos(eTel) !== (nino.telefono ?? '')) {
        body.apoderadoNombre = eApod
        body.telefono = soloDigitos(eTel)
        if (telCambio && eReauth) body.pedirAutorizacion = true
      }
      return ninosService.editar(nino.id, body)
    },
    onSuccess: (actualizado) => {
      toast('Datos actualizados')
      setEditando(false)
      onActualizado(actualizado)
      refrescar()
      qc.invalidateQueries({ queryKey: ['ninos', nino.id, 'cambios'] })
    },
    onError: (e) => {
      const data = e instanceof ApiError ? (e.data as { apoderadoExistente?: { id: number; nombre: string } } | null) : null
      if (data?.apoderadoExistente) {
        setConflicto({ id: data.apoderadoExistente.id, nombre: data.apoderadoExistente.nombre, mensaje: mensajeDeError(e) })
        setEError('')
      } else {
        setConflicto(null)
        setEError(mensajeDeError(e))
      }
    },
  })

  function enviarEdicion() {
    if (!nombreCompletoValido(eNino)) return setEError('Escribe el nombre completo del niño.')
    const tieneAp = !!eApod.trim()
    const tieneTel = !!eTel.trim()
    if (tieneAp !== tieneTel) return setEError('Si llenas papá o celular, llena ambos.')
    if (tieneTel && soloDigitos(eTel).length !== 9) return setEError('El celular debe tener 9 dígitos.')
    setEError('')
    setConflicto(null)
    guardar.mutate()
  }

  const mover = useMutation({
    mutationFn: (apoderadoId: number) => ninosService.editar(nino.id, { apoderadoId }),
    onSuccess: (actualizado) => {
      toast('Niño movido al otro apoderado')
      setEditando(false)
      setConflicto(null)
      onActualizado(actualizado)
      refrescar()
      qc.invalidateQueries({ queryKey: ['ninos', nino.id, 'cambios'] })
    },
    onError: (e) => setEError(mensajeDeError(e)),
  })

  const desactivar = useMutation({
    mutationFn: () => ninosService.desactivar(nino.id),
    onSuccess: () => {
      toast('Niño desactivado')
      refrescar()
      onActualizado(null)
    },
    onError: (e) => setEError(mensajeDeError(e)),
  })

  const habilitar = useMutation({
    mutationFn: (tipo: 'registro' | 'consulta') => activacionesService.crear({ tipo, ninoId: nino.id }),
    onSuccess: (a) => {
      toast(a.tipo === 'registro' ? 'QR habilitado: el papá debe escanearlo y autorizar' : 'QR habilitado para consulta')
      qc.invalidateQueries({ queryKey: ['activaciones'] })
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  const guardarApodYPedir = useMutation({
    mutationFn: async () => {
      await ninosService.editar(nino.id, { apoderadoNombre: kApod, telefono: soloDigitos(kTel) })
      return activacionesService.crear({ tipo: 'registro', ninoId: nino.id })
    },
    onSuccess: () => {
      toast('QR habilitado: el papá debe escanearlo y autorizar')
      refrescar()
      ninosService.buscar(nino.nombre).then((r) => {
        const fresco = r.find((x) => x.id === nino.id)
        if (fresco) onActualizado(fresco)
      })
    },
    onError: (e) => setKError(mensajeDeError(e)),
  })

  function enviarApod() {
    if (!nombreCompletoValido(kApod)) return setKError('Escribe el nombre completo del papá o mamá.')
    if (soloDigitos(kTel).length !== 9) return setKError('El celular debe tener 9 dígitos.')
    setKError('')
    guardarApodYPedir.mutate()
  }

  const canjear = useMutation({
    mutationFn: ({ tarjetaId, hito }: { tarjetaId: number; hito: number }) => sesionesService.canjear(tarjetaId, hito),
    onSuccess: () => {
      toast('Canje hecho: sesión gratis iniciada')
      refrescar()
      qc.invalidateQueries({ queryKey: ['reportes'] })
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  const t = tarjeta.data

  return (
    <section className="flex flex-col gap-[18px] rounded-card bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="font-display text-[26px] font-bold leading-[1.1]">{nino.nombre}</div>
          <div className="text-sm font-semibold text-texto-3">
            {nino.apoderado ? `${nino.apoderado} · ${formatoCelular(nino.telefono)}` : 'Sin papá o mamá registrado'}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="soft" size="sm" onClick={() => (editando ? setEditando(false) : abrirEdicion())}>
            Editar datos
          </Button>
          <Button variant="gris" size="sm" onClick={() => onActualizado(null)}>
            Cerrar
          </Button>
        </div>
      </div>

      {editando && (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-gris-50 p-4">
          <div className="text-[15px] font-extrabold">Corregir datos</div>
          <Field label="Nombre completo del niño">
            <Input value={eNino} onChange={(e) => setENino(e.target.value)} className="bg-white" />
          </Field>
          <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
            <Field label="Papá o mamá">
              <Input value={eApod} onChange={(e) => setEApod(e.target.value)} placeholder="Nombre completo" className="bg-white" />
            </Field>
            <Field label="Celular">
              <Input value={eTel} onChange={(e) => setETel(e.target.value)} placeholder="9xx xxx xxx" inputMode="numeric" className="bg-white" />
            </Field>
          </div>
          {nino.apoderadoId !== null && (
            <div className="text-[13px] text-texto-2">
              Si el papá tiene más hijos, el cambio de nombre o celular aplica a todos.
            </div>
          )}
          {telCambio && (
            <label className="flex items-center gap-2 text-[13.5px] font-bold">
              <input type="checkbox" checked={eReauth} onChange={(e) => setEReauth(e.target.checked)} />
              Cambió el celular: pedir la autorización de nuevo por QR
            </label>
          )}
          {conflicto && (
            <div className="flex flex-col gap-2 rounded-xl bg-naranja-50 px-3 py-2.5 text-[13.5px] font-bold text-[#7a4a08]">
              {conflicto.mensaje} ¿Quieres mover a {nino.nombre.split(' ')[0]} a ese apoderado?
              <Button size="sm" className="self-start" disabled={mover.isPending} onClick={() => mover.mutate(conflicto.id)}>
                Mover a ese apoderado
              </Button>
            </div>
          )}
          <FormError>{eError}</FormError>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {esAdmin && (
              <Button variant="peligro" size="sm" disabled={desactivar.isPending} onClick={() => desactivar.mutate()}>
                Desactivar niño
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" className="text-texto-2" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
              <Button variant="morado" size="sm" disabled={guardar.isPending} onClick={enviarEdicion}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      {tarjeta.isLoading && <div className="text-sm font-bold text-texto-4">Cargando tarjeta…</div>}

      {t && (
        <>
          <div className="flex flex-col gap-3.5 rounded-[20px] bg-[#f3f8fe] p-5 shadow-[inset_0_0_0_2px_#cfe2f7]">
            <div className="flex items-center justify-between gap-2.5">
              <span className="font-display text-lg font-bold text-azul-800">Tarjeta de fidelidad · ciclo {t.ciclo}</span>
              <span className="font-display text-[22px] font-extrabold text-rosa">
                {t.sellos} de {t.totalSellos} sellos
              </span>
            </div>
            <SellosGrid total={t.totalSellos} actuales={t.sellos} hitos={t.premios.map((p) => p.hito)} />
          </div>
          <div className="flex flex-col gap-2">
            {t.premios.map((p) => (
              <div
                key={p.hito}
                className={cn(
                  'flex items-center gap-3 rounded-[14px] px-3.5 py-3',
                  p.estado === 'disponible' ? 'bg-rosa-50' : p.estado === 'canjeado' ? 'bg-verde-50' : 'bg-gris-50',
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-[15px] font-extrabold">{p.titulo}</span>
                  <span className="text-[13px] font-semibold text-texto-2">{p.detalle}</span>
                </div>
                {p.estado === 'disponible' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-10 shadow-none"
                    disabled={nino.enJuego || canjear.isPending}
                    onClick={() => canjear.mutate({ tarjetaId: t.id, hito: p.hito })}
                  >
                    Canjear e iniciar
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            variant="morado"
            size="lg"
            className="h-[52px] text-lg"
            disabled={bloqueoQr || habilitar.isPending}
            onClick={() => habilitar.mutate('consulta')}
          >
            Habilitar consulta en el QR
          </Button>
        </>
      )}

      {!tarjeta.isLoading && !t && (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-[#f6f1fe] p-[18px]">
          <div className="font-extrabold text-morado-900">Este niño aún no tiene tarjeta de fidelidad.</div>
          {nino.apoderadoId !== null ? (
            <>
              <div className="text-sm text-texto-2">
                Habilita el QR para que {nino.apoderado} autorice el uso de sus datos. Al aceptar se crea la tarjeta.
              </div>
              <Button variant="morado" className="self-start" disabled={bloqueoQr || habilitar.isPending} onClick={() => habilitar.mutate('registro')}>
                Habilitar autorización en el QR
              </Button>
            </>
          ) : (
            <>
              <div className="text-sm text-texto-2">Se registró rápido en Sesiones sin papá. Agrega sus datos para pedir la autorización.</div>
              <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
                <Input value={kApod} onChange={(e) => setKApod(e.target.value)} placeholder="Papá o mamá" className="border-[#e1d6f6] bg-white" />
                <Input value={kTel} onChange={(e) => setKTel(e.target.value)} placeholder="Celular" inputMode="numeric" className="border-[#e1d6f6] bg-white" />
              </div>
              <FormError>{kError}</FormError>
              <Button variant="morado" className="self-start" disabled={bloqueoQr || guardarApodYPedir.isPending} onClick={enviarApod}>
                Guardar y habilitar QR
              </Button>
            </>
          )}
          {bloqueoQr && (
            <div className="text-[13px] font-bold text-naranja-800">
              {config.data?.modoMantenimiento ? 'Modo mantenimiento activo.' : 'Hay otro QR habilitado: deshabilítalo primero.'}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col">
        <Titulo>Visitas</Titulo>
        {t && t.visitas.length === 0 && <div className="text-sm font-bold text-texto-4">Todavía no tiene visitas.</div>}
        {!t && <div className="text-sm font-bold text-texto-4">Las visitas se muestran cuando tenga tarjeta.</div>}
        {t?.visitas.map((v) => (
          <div key={v.fecha} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-t border-linea py-2.5">
            <div className="flex flex-col gap-px">
              <span className="text-sm font-extrabold capitalize">{fechaHoraLima(v.fecha)}</span>
              <span className="text-[13px] text-texto-3">{v.tarifa}</span>
            </div>
            <Pill tone={v.etiqueta === 'sello' ? 'verde' : v.etiqueta === 'canje' ? 'rosa' : 'gris'}>
              {v.etiqueta === 'sello' ? 'Sello' : v.etiqueta === 'canje' ? 'Canje' : 'Sin sello'}
            </Pill>
          </div>
        ))}
      </div>

      {cambios.data && cambios.data.length > 0 && (
        <div className="flex flex-col">
          <Titulo>Historial de cambios</Titulo>
          {cambios.data.map((c) => (
            <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 border-t border-linea py-[9px] text-[13px]">
              <span>
                <b>{CAMPOS[c.campo] ?? c.campo}:</b> {c.valorAnterior ?? '—'} → {c.valorNuevo ?? '—'}
              </span>
              <span className="whitespace-nowrap capitalize text-texto-3">
                {fechaCortaLima(c.fecha)} · {c.empleado}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
