import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { NinoBusqueda } from '@/types'
import { ninosService } from '@/services'
import { useDebounced } from '@/hooks/useDebounced'
import { formatoCelular } from '@/lib/format'
import { Pill, type Tone } from '@/components/ui/Pill'
import { cn } from '@/lib/cn'

interface Props {
  placeholder: string
  onPick: (nino: NinoBusqueda) => void
  disabledIds?: number[]
  onRegisterNew?: (texto: string) => void
  emptyText?: string
  className?: string
}

function etiqueta(n: NinoBusqueda, agregado: boolean): { texto: string; tone: Tone } {
  if (agregado) return { texto: 'Agregado', tone: 'gris' }
  if (n.enJuego) return { texto: 'En juego', tone: 'verde' }
  if (n.sellos) return { texto: `Tarjeta ${n.sellos.actuales}/${n.sellos.requeridos}`, tone: 'morado' }
  return { texto: 'Sin tarjeta', tone: 'gris' }
}

export function NinoSearch({ placeholder, onPick, disabledIds = [], onRegisterNew, emptyText, className }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const term = useDebounced(q.trim(), 250)

  const { data = [], isFetching } = useQuery({
    queryKey: ['ninos', 'buscar', term],
    queryFn: () => ninosService.buscar(term),
    enabled: term.length >= 2,
    staleTime: 0,
  })

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  const mostrar = open && q.trim().length >= 2
  const sinResultados = term === q.trim() && !isFetching && data.length === 0

  function elegir(n: NinoBusqueda) {
    onPick(n)
    setQ('')
    setOpen(false)
  }

  return (
    <div ref={box} className={cn('relative', className)}>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="box-border h-[50px] w-full rounded-[14px] border-2 border-borde bg-[#fbfcfe] px-4 text-[15px] font-semibold text-tinta outline-none focus:border-morado focus:bg-white"
      />
      {mostrar && (
        <div className="absolute inset-x-0 top-14 z-10 flex flex-col gap-0.5 rounded-2xl bg-white p-1.5 shadow-pop">
          {data.map((n) => {
            const agregado = disabledIds.includes(n.id)
            const tag = etiqueta(n, agregado)
            const bloqueado = agregado || n.enJuego
            return (
              <button
                key={n.id}
                type="button"
                disabled={bloqueado && !!onRegisterNew}
                onClick={() => elegir(n)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border-0 bg-white px-3 py-2.5 text-left hover:bg-[#f4effd] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white',
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-[15px] font-extrabold">{n.nombre}</span>
                  <span className="text-[13px] text-texto-3">
                    {n.apoderado ? `${n.apoderado} · ${formatoCelular(n.telefono)}` : 'Sin papá o mamá registrado'}
                  </span>
                </div>
                <Pill tone={tag.tone}>{tag.texto}</Pill>
              </button>
            )
          })}
          {sinResultados && <div className="px-3 py-2.5 text-sm text-texto-3">{emptyText ?? 'No hay niños con ese nombre.'}</div>}
          {onRegisterNew && (
            <button
              type="button"
              onClick={() => {
                onRegisterNew(q.trim())
                setQ('')
                setOpen(false)
              }}
              className="cursor-pointer rounded-b-xl border-0 border-t border-linea bg-white p-3 text-left text-sm font-extrabold text-morado hover:bg-[#f4effd]"
            >
              + Registrar “{q.trim()}” como niño nuevo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
