import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { NinoBusqueda } from '@/types'
import { activacionesService } from '@/services'
import { NinoSearch } from '@/components/NinoSearch'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { FichaNino } from '@/features/fidelidad/FichaNino'
import { NuevoRegistroCard } from '@/features/fidelidad/NuevoRegistroCard'
import { ESTADOS_ACTIVACION, QrEstado, TelefonoSimulado } from '@/features/fidelidad/QrLocalPanel'
import { horaLima } from '@/lib/format'

export function FidelidadPage() {
  const [nino, setNino] = useState<NinoBusqueda | null>(null)
  const [nuevo, setNuevo] = useState(false)

  const hoy = useQuery({ queryKey: ['activaciones', 'hoy'], queryFn: activacionesService.hoy, refetchInterval: 5000 })

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px]">
        <div className="flex flex-wrap items-start gap-3">
          <NinoSearch
            className="min-w-[300px] flex-[1_1_300px]"
            placeholder="Busca al niño por su nombre, el del papá o el celular"
            emptyText="No encontramos a ese niño. Usa “Nuevo registro”."
            onPick={(n) => {
              setNino(n)
              setNuevo(false)
            }}
          />
          <Button
            variant="morado"
            className="h-[50px] rounded-[14px] px-[22px] font-display text-[17px] font-bold shadow-[0_5px_0_var(--color-morado-700)]"
            onClick={() => setNuevo((v) => !v)}
          >
            Nuevo registro
          </Button>
        </div>

        {nuevo && (
          <NuevoRegistroCard
            onCancelar={() => setNuevo(false)}
            onCreado={(n) => {
              setNino(n)
              setNuevo(false)
            }}
          />
        )}

        {!nino && !nuevo && (
          <div className="flex flex-col gap-2 rounded-card bg-white px-6 py-[22px] shadow-[0_1px_0_#e6ebf3]">
            <div className="font-display text-xl font-bold">¿Cómo funciona el QR del local?</div>
            <div className="text-[14.5px] leading-[1.55] text-texto-2">
              El QR está impreso y pegado en el salón. Si no hay nada habilitado, quien lo escanee ve un anuncio con la información
              del negocio. Cuando registras a un niño nuevo, el QR le pide al papá autorizar el uso de sus datos y luego le muestra
              la tarjeta. Para un niño ya inscrito, pulsa <b>Habilitar consulta</b> y el papá verá su tarjeta. Cada habilitación
              dura 10 minutos.
            </div>
          </div>
        )}

        {nino && <FichaNino key={nino.id} nino={nino} onActualizado={setNino} />}

        <section className="flex flex-col gap-2 rounded-card bg-white px-6 py-5 shadow-[0_1px_0_#e6ebf3]">
          <div className="font-display text-lg font-bold">Habilitaciones de hoy</div>
          {hoy.data?.length === 0 && <div className="text-sm font-bold text-texto-4">Aún no se habilitó el QR hoy.</div>}
          {hoy.data?.map((a) => {
            const est = ESTADOS_ACTIVACION[a.estado]
            return (
              <div
                key={a.id}
                className="grid grid-cols-[84px_90px_minmax(0,1fr)_auto] items-center gap-3 border-t border-linea py-[9px] text-sm"
              >
                <span className="font-extrabold tabular-nums">{horaLima(a.creadaEn)}</span>
                <span className="font-bold text-texto-2">{a.tipo === 'registro' ? 'Registro' : 'Consulta'}</span>
                <span className="truncate font-bold">{a.ninoNombre}</span>
                <Pill tone={est.tone}>{est.texto}</Pill>
              </div>
            )
          })}
        </section>
      </div>

      <aside className="flex flex-[0_0_330px] flex-col gap-3.5">
        <QrEstado />
        <TelefonoSimulado />
      </aside>
    </div>
  )
}
