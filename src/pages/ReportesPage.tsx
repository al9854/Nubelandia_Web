import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportesService } from '@/services'
import { Card, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { diaMesLima, diaNumeroLima, hoyLima, limaAIso, money, sumarDias } from '@/lib/format'

type Rango = 'hoy' | '7' | '30'

const RANGOS: { id: Rango; label: string; dias: number }[] = [
  { id: 'hoy', label: 'Hoy', dias: 0 },
  { id: '7', label: '7 días', dias: 6 },
  { id: '30', label: '30 días', dias: 29 },
]

const COLORES_TARIFA = ['bg-morado', 'bg-rosa', 'bg-azul', 'bg-verde', 'bg-naranja', 'bg-tinta']

export function ReportesPage() {
  const [rango, setRango] = useState<Rango>('7')
  const hasta = hoyLima()
  const dias = RANGOS.find((r) => r.id === rango)!.dias
  const desde = sumarDias(hasta, -dias)

  const { data } = useQuery({
    queryKey: ['reportes', desde, hasta],
    queryFn: () => reportesService.resumen(desde, hasta),
    refetchInterval: 30_000,
  })

  const kpis = data
    ? [
        { label: 'Ingresos por sesiones', valor: money(data.ingresosSesiones), sub: `${money(data.ingresosTiempoExtra)} por tiempo extra`, color: 'text-tinta' },
        { label: 'Visitas', valor: String(data.visitas), sub: `${data.sesiones} sesiones`, color: 'text-tinta' },
        { label: 'Reservas realizadas', valor: money(data.reservasRealizadas.monto), sub: `${data.reservasRealizadas.cantidad} reservas`, color: 'text-tinta' },
        { label: 'Gastos', valor: money(data.gastos.monto), sub: `${data.gastos.registros} registros`, color: 'text-tinta' },
        { label: 'Utilidad', valor: money(data.utilidad), sub: 'Sesiones + reservas − gastos', color: data.utilidad >= 0 ? 'text-verde' : 'text-rojo' },
      ]
    : []

  const maxVenta = Math.max(1, ...(data?.ventasPorDia.map((d) => d.total) ?? [1]))
  const maxTarifa = Math.max(1, ...(data?.porTarifa.map((t) => t.ingresos) ?? [1]))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        {RANGOS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRango(r.id)}
            className={cn(
              'h-10 cursor-pointer rounded-full border-0 px-[18px] text-sm font-extrabold',
              rango === r.id ? 'bg-tinta text-white' : 'bg-white text-texto-2 hover:bg-gris-100',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-1 rounded-[20px] bg-white px-5 py-[18px] shadow-[0_1px_0_#e6ebf3]">
            <span className="text-[13px] font-extrabold text-texto-3">{k.label}</span>
            <span className={cn('font-display text-[30px] font-extrabold leading-[1.1]', k.color)}>{k.valor}</span>
            <span className="text-[13px] font-semibold text-texto-3">{k.sub}</span>
          </div>
        ))}
      </div>

      {data && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start gap-5">
          <Card className="gap-4">
            <CardTitle className="text-xl">Ventas de los últimos 14 días</CardTitle>
            <div className="grid h-[200px] grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1.5">
              {data.ventasPorDia.map((d) => (
                <div
                  key={d.fecha}
                  title={`${diaMesLima(limaAIso(d.fecha, '12:00'))}: ${money(d.total)} · ${d.sesiones} sesiones`}
                  className={cn('min-h-1 rounded-t-lg rounded-b-[3px]', d.fecha === hasta ? 'bg-rosa' : 'bg-morado')}
                  style={{ height: `${Math.max(2, (d.total / maxVenta) * 100)}%` }}
                />
              ))}
            </div>
            <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5">
              {data.ventasPorDia.map((d) => (
                <span key={d.fecha} className="text-center text-[11px] font-bold text-texto-4">
                  {diaNumeroLima(limaAIso(d.fecha, '12:00'))}
                </span>
              ))}
            </div>
          </Card>

          <Card className="gap-3">
            <CardTitle className="text-xl">Por tarifa</CardTitle>
            {data.porTarifa.length === 0 && <div className="text-sm font-bold text-texto-4">Sin sesiones en este rango.</div>}
            {data.porTarifa.map((t, i) => (
              <div key={t.nombre} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-2.5 text-sm">
                  <span className="font-extrabold">{t.nombre}</span>
                  <span className="font-bold text-texto-2">
                    {t.sesiones} ses. · {money(t.ingresos)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-linea">
                  <div className={cn('h-full rounded-full', COLORES_TARIFA[i % COLORES_TARIFA.length])} style={{ width: `${(t.ingresos / maxTarifa) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <div className="flex flex-col rounded-[14px] bg-morado-50 p-3.5">
                <span className="text-[13px] font-extrabold text-morado-900">Sellos entregados</span>
                <span className="font-display text-[26px] font-extrabold">{data.sellosEntregados}</span>
              </div>
              <div className="flex flex-col rounded-[14px] bg-rosa-50 p-3.5">
                <span className="text-[13px] font-extrabold text-rosa-700">Canjes</span>
                <span className="font-display text-[26px] font-extrabold">{data.canjes}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
