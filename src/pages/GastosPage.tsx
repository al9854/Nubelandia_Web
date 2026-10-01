import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gastosService, mensajeDeError } from '@/services'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, Empty } from '@/components/ui/Card'
import { Field, FormError, Input, Select } from '@/components/ui/Fields'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { fechaCortaLima, hoyLima, limaAIso, money, parseMonto } from '@/lib/format'

export function GastosPage() {
  const qc = useQueryClient()
  const toast = useToast()

  const categorias = useQuery({ queryKey: ['categorias-gasto'], queryFn: gastosService.categorias })
  const cats = categorias.data ?? []

  const [filtro, setFiltro] = useState<number | null>(null)
  const [catId, setCatId] = useState('')
  const [desc, setDesc] = useState('')
  const [montoTxt, setMontoTxt] = useState('')
  const [fecha, setFecha] = useState(hoyLima)
  const [error, setError] = useState('')
  const [nuevaCat, setNuevaCat] = useState('')
  const [catError, setCatError] = useState('')

  const lista = useQuery({ queryKey: ['gastos', filtro], queryFn: () => gastosService.listar(filtro) })

  const categoriaElegida = catId || String(cats[0]?.id ?? '')

  const crear = useMutation({
    mutationFn: gastosService.crear,
    onSuccess: () => {
      toast('Gasto guardado')
      setDesc('')
      setMontoTxt('')
      setError('')
      qc.invalidateQueries({ queryKey: ['gastos'] })
      qc.invalidateQueries({ queryKey: ['reportes'] })
    },
    onError: (e) => setError(mensajeDeError(e)),
  })

  const crearCategoria = useMutation({
    mutationFn: gastosService.crearCategoria,
    onSuccess: (c) => {
      setNuevaCat('')
      setCatError('')
      setCatId(String(c.id))
      qc.invalidateQueries({ queryKey: ['categorias-gasto'] })
    },
    onError: (e) => setCatError(mensajeDeError(e)),
  })

  function guardar() {
    const monto = parseMonto(montoTxt)
    if (!categoriaElegida) return setError('Elige una categoría.')
    if (!desc.trim()) return setError('Escribe una descripción.')
    if (!Number.isFinite(monto) || monto <= 0) return setError('El monto debe ser mayor a 0.')
    if (!fecha) return setError('Elige la fecha.')
    setError('')
    crear.mutate({ categoriaId: Number(categoriaElegida), descripcion: desc.trim(), monto, fecha })
  }

  const chips: { id: number | null; label: string }[] = [{ id: null, label: 'Todas' }, ...cats.map((c) => ({ id: c.id, label: c.nombre }))]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-start gap-6">
      <Card className="gap-3.5">
        <CardTitle>Registrar gasto</CardTitle>
        <Field label="Categoría">
          <Select value={categoriaElegida} onChange={(e) => setCatId(e.target.value)}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descripción">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej. Stickers para tarjetas" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto (S/)">
            <Input value={montoTxt} onChange={(e) => setMontoTxt(e.target.value)} placeholder="0.00" inputMode="decimal" />
          </Field>
          <Field label="Fecha">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
        </div>
        <FormError>{error}</FormError>
        <Button variant="primary" size="lg" className="h-[50px] text-lg" disabled={crear.isPending} onClick={guardar}>
          {crear.isPending ? 'Guardando…' : 'Guardar gasto'}
        </Button>
        <div className="flex flex-col gap-2 border-t border-linea pt-3.5">
          <div className="text-[13px] font-extrabold">Nueva categoría</div>
          <div className="flex gap-2">
            <Input value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} placeholder="Ej. Decoración" className="h-[42px] flex-1" />
            <Button disabled={!nuevaCat.trim() || crearCategoria.isPending} onClick={() => crearCategoria.mutate(nuevaCat.trim())}>
              Agregar
            </Button>
          </div>
          <FormError>{catError}</FormError>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardTitle>Gastos registrados</CardTitle>
          <div className="font-display text-[22px] font-extrabold text-rosa">{money(lista.data?.total ?? 0)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.id ?? 'todas'}
              onClick={() => setFiltro(c.id)}
              className={cn(
                'h-[34px] cursor-pointer rounded-full border-0 px-3.5 text-[13px] font-extrabold',
                filtro === c.id ? 'bg-tinta text-white' : 'bg-gris-100 text-texto-2',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col">
          {lista.data?.items.length === 0 && <Empty>No hay gastos en esta vista.</Empty>}
          {lista.data?.items.map((g) => (
            <div key={g.id} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 border-t border-linea py-3">
              <span className="text-[13.5px] font-bold capitalize text-texto-2">{fechaCortaLima(limaAIso(g.fecha, '12:00'))}</span>
              <div className="flex min-w-0 flex-col gap-px">
                <span className="text-[14.5px] font-extrabold">{g.descripcion}</span>
                <span className="text-[12.5px] text-texto-3">
                  {g.categoria} · {g.empleado}
                </span>
              </div>
              <span className="text-[15px] font-extrabold tabular-nums">{money(g.monto)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
