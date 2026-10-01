import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EstadoReserva } from '@/types'
import { configuracionService, mensajeDeError, reservasService, type FiltroReservas } from '@/services'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, Empty } from '@/components/ui/Card'
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/Fields'
import { Pill, type Tone } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import {
  fechaCortaLima,
  horaLima,
  hoyLima,
  limaAIso,
  money,
  nombreCompletoValido,
  parseMonto,
  soloDigitos,
  sumarDias,
} from '@/lib/format'

const ESTADOS: Record<EstadoReserva, { texto: string; tone: Tone }> = {
  pendiente: { texto: 'Pendiente', tone: 'naranja' },
  confirmada: { texto: 'Confirmada', tone: 'verde' },
  realizada: { texto: 'Realizada', tone: 'gris' },
  cancelada: { texto: 'Cancelada', tone: 'rojo' },
}

const ACCIONES: Record<EstadoReserva, { texto: string; variant: 'verde' | 'tinta' | 'ghost' } | null> = {
  pendiente: null,
  confirmada: { texto: 'Confirmar', variant: 'verde' },
  realizada: { texto: 'Marcar realizada', variant: 'tinta' },
  cancelada: { texto: 'Cancelar', variant: 'ghost' },
}

export function ReservasPage() {
  const qc = useQueryClient()
  const toast = useToast()

  const { data: planes = [] } = useQuery({ queryKey: ['planes'], queryFn: configuracionService.planes })
  const activos = planes.filter((p) => p.activo)

  const [planId, setPlanId] = useState('')
  const [fecha, setFecha] = useState(() => sumarDias(hoyLima(), 2))
  const [ini, setIni] = useState('15:00')
  const [fin, setFin] = useState('17:00')
  const [contacto, setContacto] = useState('')
  const [tel, setTel] = useState('')
  const [montoTxt, setMontoTxt] = useState('')
  const [adelTxt, setAdelTxt] = useState('')
  const [obs, setObs] = useState('')
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState<FiltroReservas>('proximas')

  const plan = activos.find((p) => String(p.id) === planId) ?? activos[0]

  const lista = useQuery({ queryKey: ['reservas', filtro], queryFn: () => reservasService.listar(filtro) })

  const crear = useMutation({
    mutationFn: reservasService.crear,
    onSuccess: () => {
      toast('Reserva guardada')
      setContacto('')
      setTel('')
      setMontoTxt('')
      setAdelTxt('')
      setObs('')
      setError('')
      qc.invalidateQueries({ queryKey: ['reservas'] })
    },
    onError: (e) => setError(mensajeDeError(e)),
  })

  const cambiar = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoReserva }) => reservasService.cambiarEstado(id, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas'] })
      qc.invalidateQueries({ queryKey: ['reportes'] })
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  function guardar() {
    if (!plan) return setError('Elige un plan.')
    if (!fecha) return setError('Elige la fecha.')
    if (!(fin > ini)) return setError('La hora final debe ser mayor a la inicial.')
    if (!nombreCompletoValido(contacto)) return setError('Escribe el nombre completo del contacto.')
    if (soloDigitos(tel).length !== 9) return setError('El celular debe tener 9 dígitos.')
    const monto = montoTxt.trim() ? parseMonto(montoTxt) : plan.precio
    const adelanto = adelTxt.trim() ? parseMonto(adelTxt) : 0
    if (!Number.isFinite(monto) || monto < 0) return setError('El monto total no es válido.')
    if (!Number.isFinite(adelanto) || adelanto < 0) return setError('El adelanto no es válido.')
    if (adelanto > monto) return setError('El adelanto no puede superar el total.')
    setError('')
    crear.mutate({
      planId: plan.id,
      inicio: limaAIso(fecha, ini),
      fin: limaAIso(fecha, fin),
      contacto,
      telefono: soloDigitos(tel),
      monto,
      adelanto,
      observaciones: obs.trim() || undefined,
    })
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start gap-6">
      <Card className="gap-3.5">
        <CardTitle>Nueva reserva del salón</CardTitle>
        <Field label="Plan">
          <Select value={plan ? String(plan.id) : ''} onChange={(e) => setPlanId(e.target.value)}>
            {activos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · {money(p.precio)}
              </option>
            ))}
          </Select>
        </Field>
        {plan && <div className="rounded-xl bg-gris-50 px-3 py-2.5 text-[13.5px] leading-[1.45] text-texto-2">{plan.descripcion}</div>}
        <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2.5">
          <Field label="Fecha">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Desde">
            <Input type="time" value={ini} onChange={(e) => setIni(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="time" value={fin} onChange={(e) => setFin(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
          <Field label="Contacto">
            <Input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Nombre completo" />
          </Field>
          <Field label="Celular">
            <Input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="9xx xxx xxx" inputMode="numeric" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Monto total (S/)">
            <Input value={montoTxt} onChange={(e) => setMontoTxt(e.target.value)} placeholder={plan ? plan.precio.toFixed(2) : '0.00'} inputMode="decimal" />
          </Field>
          <Field label="Adelanto (S/)">
            <Input value={adelTxt} onChange={(e) => setAdelTxt(e.target.value)} placeholder="0.00" inputMode="decimal" />
          </Field>
        </div>
        <Field label="Observaciones">
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Temática, número de niños, torta…" />
        </Field>
        <FormError>{error}</FormError>
        <Button variant="primary" size="lg" className="h-[50px] text-lg" disabled={crear.isPending || !plan} onClick={guardar}>
          {crear.isPending ? 'Guardando…' : 'Guardar reserva'}
        </Button>
      </Card>

      <Card className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Reservas</CardTitle>
          <div className="flex gap-2">
            {(['proximas', 'todas'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={cn(
                  'h-[34px] cursor-pointer rounded-full border-0 px-3.5 text-[13px] font-extrabold',
                  filtro === f ? 'bg-tinta text-white' : 'bg-gris-100 text-texto-2',
                )}
              >
                {f === 'proximas' ? 'Próximas' : 'Todas'}
              </button>
            ))}
          </div>
        </div>
        {lista.data?.length === 0 && <Empty>No hay reservas en esta vista.</Empty>}
        {lista.data?.map((r) => {
          const est = ESTADOS[r.estado]
          return (
            <div key={r.id} className="flex flex-col gap-2 border-t border-linea py-3.5">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 flex-col gap-px">
                  <span className="text-[15.5px] font-extrabold capitalize">
                    {fechaCortaLima(r.inicio)} · {horaLima(r.inicio)} – {horaLima(r.fin)}
                  </span>
                  <span className="text-[13.5px] font-bold text-texto-2">
                    {r.plan.nombre} · {r.contacto}
                  </span>
                </div>
                <Pill tone={est.tone}>{est.texto}</Pill>
              </div>
              <div className="text-[13.5px] text-[#3a4a6b]">
                Total {money(r.monto)} · Adelanto {money(r.adelanto)} · Saldo {money(r.saldo)}
              </div>
              {r.observaciones && <div className="text-[13px] text-texto-3">{r.observaciones}</div>}
              {r.siguientesEstados.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {r.siguientesEstados.map((s) => {
                    const accion = ACCIONES[s]
                    if (!accion) return null
                    return (
                      <Button
                        key={s}
                        variant={accion.variant}
                        size="sm"
                        disabled={cambiar.isPending}
                        onClick={() => cambiar.mutate({ id: r.id, estado: s })}
                      >
                        {accion.texto}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
