import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Sesion } from '@/types'
import { mensajeDeError, sesionesService } from '@/services'
import { useNow } from '@/hooks/useNow'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Fields'
import { Pill, type Tone } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { horaLima, minutosSegundos, money, parseMonto, soloDigitos } from '@/lib/format'

const UMBRAL_POR_TERMINAR_MS = 5 * 60_000
const TONOS_TARIFA: Tone[] = ['morado', 'rosa', 'rosa', 'verde', 'azul']

type Fase = 'jugando' | 'porTerminar' | 'vencida'

const FASES: Record<Fase, { texto: string; color: string; barra: string; anillo: string }> = {
  jugando: { texto: 'Jugando', color: 'text-verde', barra: 'bg-verde', anillo: '' },
  porTerminar: { texto: 'Por terminar', color: 'text-naranja', barra: 'bg-naranja', anillo: 'outline outline-2 outline-naranja/40' },
  vencida: { texto: 'Tiempo cumplido', color: 'text-rojo', barra: 'bg-rojo', anillo: 'outline outline-2 outline-rojo/40' },
}

function SesionCard({ sesion }: { sesion: Sesion }) {
  const now = useNow()
  const qc = useQueryClient()
  const toast = useToast()
  const [otroAbierto, setOtroAbierto] = useState(false)
  const [exMin, setExMin] = useState('15')
  const [exMonto, setExMonto] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const inicio = Date.parse(sesion.inicio)
  const fin = Date.parse(sesion.finPrevisto)
  const restante = fin - now
  const fase: Fase = restante <= 0 ? 'vencida' : restante <= UMBRAL_POR_TERMINAR_MS ? 'porTerminar' : 'jugando'
  const ui = FASES[fase]
  const pct = Math.min(100, Math.max(0, ((now - inicio) / (fin - inicio)) * 100))
  const tonoTarifa: Tone = sesion.tarifa.id === null ? 'gris' : TONOS_TARIFA[(sesion.tarifa.id - 1) % TONOS_TARIFA.length]

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['sesiones'] })
    qc.invalidateQueries({ queryKey: ['ninos'] })
    qc.invalidateQueries({ queryKey: ['tarjeta'] })
    qc.invalidateQueries({ queryKey: ['reportes'] })
  }

  const extender = useMutation({
    mutationFn: (body: Parameters<typeof sesionesService.extender>[1]) => sesionesService.extender(sesion.id, body),
    onSuccess: () => {
      setOtroAbierto(false)
      refrescar()
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  const finalizar = useMutation({
    mutationFn: () => sesionesService.finalizar(sesion.id),
    onSuccess: () => {
      toast('Sesión finalizada')
      refrescar()
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  const cancelar = useMutation({
    mutationFn: () => sesionesService.cancelar(sesion.id),
    onSuccess: () => {
      toast('Sesión cancelada: se anularon pago, extensiones y sellos')
      refrescar()
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  function pedirCancelar() {
    if (!confirmando) {
      setConfirmando(true)
      timer.current = setTimeout(() => setConfirmando(false), 4000)
      return
    }
    cancelar.mutate()
  }

  function agregarOtro() {
    const minutos = Number(soloDigitos(exMin))
    const monto = parseMonto(exMonto || '0')
    if (!(minutos > 0)) return toast('Escribe los minutos')
    if (!Number.isFinite(monto) || monto < 0) return toast('Escribe un monto válido')
    extender.mutate({ tipo: 'otro', minutos, monto })
  }

  const ocupado = extender.isPending || finalizar.isPending || cancelar.isPending

  return (
    <div className={cn('flex flex-col gap-3 rounded-[20px] bg-white p-[18px] shadow-card', ui.anillo)}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-base font-extrabold leading-[1.3]">{sesion.ninos.map((n) => n.nombre).join(' · ')}</span>
          <span className="text-[13px] font-semibold text-texto-3">
            Entró {horaLima(inicio)} · sale {horaLima(fin)} · {money(sesion.monto)}
          </span>
        </div>
        <Pill tone={tonoTarifa}>{sesion.tarifa.nombre}</Pill>
      </div>

      <div className="flex items-baseline justify-between gap-2.5">
        <span className={cn('font-display text-[40px] font-extrabold leading-none tabular-nums', ui.color)}>
          {restante <= 0 ? '+' : ''}
          {minutosSegundos(restante)}
        </span>
        <span className={cn('text-[13px] font-extrabold', ui.color)}>{ui.texto}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-linea">
        <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', ui.barra)} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex flex-wrap gap-2">
        {sesion.extensionRapida && (
          <Button variant="soft" size="sm" className="h-10 flex-[1_1_140px]" disabled={ocupado} onClick={() => extender.mutate({ tipo: 'rapida' })}>
            {sesion.extensionRapida.label}
          </Button>
        )}
        <Button variant="azul" size="sm" className="h-10 flex-[1_1_110px]" disabled={ocupado} onClick={() => extender.mutate({ tipo: 'cortesia' })}>
          +5 min cortesía
        </Button>
        <Button variant="gris" size="sm" className="h-10 flex-[1_1_100px]" onClick={() => setOtroAbierto((v) => !v)}>
          Otro tiempo
        </Button>
      </div>

      {otroAbierto && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 rounded-[14px] bg-gris-50 p-2.5">
          <Field label="Minutos" className="text-xs">
            <Input value={exMin} onChange={(e) => setExMin(e.target.value)} inputMode="numeric" className="h-[38px] rounded-[10px] bg-white text-[15px]" />
          </Field>
          <Field label="Monto S/" className="text-xs">
            <Input value={exMonto} onChange={(e) => setExMonto(e.target.value)} inputMode="decimal" placeholder="0.00" className="h-[38px] rounded-[10px] bg-white text-[15px]" />
          </Field>
          <Button variant="morado" size="sm" className="h-[38px] rounded-[10px]" disabled={ocupado} onClick={agregarOtro}>
            Agregar
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-10" disabled={ocupado} onClick={pedirCancelar}>
          {confirmando ? '¿Seguro? Confirmar' : 'Cancelar'}
        </Button>
        <Button variant="tinta" size="sm" className="h-10 flex-1 text-[13.5px]" disabled={ocupado} onClick={() => finalizar.mutate()}>
          Finalizar
        </Button>
      </div>
    </div>
  )
}

export function EnJuegoSection() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['sesiones', 'activas'],
    queryFn: sesionesService.activas,
    refetchInterval: 5000,
  })

  const ordenadas = [...data].sort((a, b) => Date.parse(a.finPrevisto) - Date.parse(b.finPrevisto))

  return (
    <section className="flex min-w-0 flex-col gap-3.5">
      <div className="flex items-baseline gap-3">
        <h2 className="m-0 whitespace-nowrap font-display text-[22px] font-bold">En juego ahora</h2>
        <div className="whitespace-nowrap text-[15px] font-extrabold text-texto-4">
          {data.length} {data.length === 1 ? 'sesión' : 'sesiones'}
        </div>
      </div>
      {!isLoading && data.length === 0 && (
        <div className="rounded-card border-2 border-dashed border-[#dbe2ee] p-10 text-center font-bold text-texto-4">
          No hay niños jugando en este momento.
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(270px,100%),1fr))] gap-3.5">
        {ordenadas.map((s) => (
          <SesionCard key={s.id} sesion={s} />
        ))}
      </div>
    </section>
  )
}
