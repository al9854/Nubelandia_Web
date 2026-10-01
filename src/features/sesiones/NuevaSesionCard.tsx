import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NinoBusqueda } from '@/types'
import { mensajeDeError, ninosService, configuracionService, sesionesService } from '@/services'
import { NinoSearch } from '@/components/NinoSearch'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Field, FormError, Input } from '@/components/ui/Fields'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { money, nombreCompletoValido, parseMonto, soloDigitos } from '@/lib/format'

const TONOS = [
  { precio: 'text-morado', ring: 'ring-morado' },
  { precio: 'text-rosa', ring: 'ring-rosa' },
  { precio: 'text-rosa', ring: 'ring-rosa' },
  { precio: 'text-verde', ring: 'ring-verde' },
  { precio: 'text-azul', ring: 'ring-azul' },
]

type Seleccion = number | 'especial' | null

function Paso({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[15px] font-extrabold">
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-tinta text-[13px] text-white">{n}</span>
      {children}
    </div>
  )
}

export function NuevaSesionCard() {
  const qc = useQueryClient()
  const toast = useToast()

  const { data: tarifas = [] } = useQuery({ queryKey: ['tarifas'], queryFn: configuracionService.tarifas })
  const activas = tarifas.filter((t) => t.activa)

  const [sel, setSel] = useState<Seleccion>(null)
  const [espMin, setEspMin] = useState('60')
  const [espMonto, setEspMonto] = useState('')
  const [ninos, setNinos] = useState<NinoBusqueda[]>([])

  const [form, setForm] = useState(false)
  const [fNino, setFNino] = useState('')
  const [fApod, setFApod] = useState('')
  const [fTel, setFTel] = useState('')
  const [formErr, setFormErr] = useState('')

  const tarifa = typeof sel === 'number' ? activas.find((t) => t.id === sel) : undefined
  const esEspecial = sel === 'especial'
  const requeridos = tarifa?.cantidadNinos ?? null
  const completo = requeridos !== null && ninos.length >= requeridos
  const mostrarBuscador = sel !== null && !completo

  const minutos = Number(soloDigitos(espMin))
  const monto = parseMonto(espMonto || '0')
  const especialOk = esEspecial && minutos > 0 && Number.isFinite(monto) && monto >= 0

  let pista = ''
  if (sel === null) pista = 'Elige una tarifa para empezar.'
  else if (esEspecial && !especialOk) pista = 'Escribe los minutos y un monto válido.'
  else if (ninos.length === 0) pista = 'Agrega al menos un niño.'
  else if (requeridos !== null && ninos.length < requeridos) pista = `Faltan ${requeridos - ninos.length} niño(s) para esta tarifa.`

  const listo = pista === ''
  const precioTxt = esEspecial ? (monto > 0 ? money(monto) : 'Gratis') : tarifa && tarifa.precio > 0 ? money(tarifa.precio) : 'Gratis'

  function elegirTarifa(next: Seleccion) {
    setSel(next)
    const t = typeof next === 'number' ? activas.find((x) => x.id === next) : undefined
    if (t) setNinos((prev) => prev.slice(0, t.cantidadNinos))
  }

  function agregar(n: NinoBusqueda) {
    if (ninos.some((x) => x.id === n.id)) return
    setNinos((prev) => (requeridos !== null && prev.length >= requeridos ? prev : [...prev, n]))
  }

  function limpiar() {
    setSel(null)
    setNinos([])
    setEspMin('60')
    setEspMonto('')
  }

  const iniciar = useMutation({
    mutationFn: () =>
      sesionesService.crear({
        tarifaId: tarifa ? tarifa.id : null,
        minutos: esEspecial ? minutos : undefined,
        monto: esEspecial ? monto : undefined,
        ninoIds: ninos.map((n) => n.id),
      }),
    onSuccess: () => {
      toast('Sesión iniciada')
      limpiar()
      qc.invalidateQueries({ queryKey: ['sesiones'] })
      qc.invalidateQueries({ queryKey: ['ninos'] })
      qc.invalidateQueries({ queryKey: ['tarjeta'] })
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  const registrar = useMutation({
    mutationFn: () =>
      ninosService.crear({
        nombreCompleto: fNino,
        apoderadoNombre: fApod.trim() || undefined,
        telefono: fTel.trim() ? soloDigitos(fTel) : undefined,
      }),
    onSuccess: (n) => {
      agregar(n)
      cerrarForm()
    },
    onError: (e) => setFormErr(mensajeDeError(e)),
  })

  function abrirForm(texto: string) {
    setForm(true)
    setFNino(texto)
    setFApod('')
    setFTel('')
    setFormErr('')
  }

  function cerrarForm() {
    setForm(false)
    setFormErr('')
  }

  function guardarForm() {
    if (!nombreCompletoValido(fNino)) return setFormErr('Escribe el nombre completo del niño.')
    const tieneAp = !!fApod.trim()
    const tieneTel = !!fTel.trim()
    if (tieneAp !== tieneTel) return setFormErr('Si llenas papá o celular, llena ambos.')
    if (tieneTel && soloDigitos(fTel).length !== 9) return setFormErr('El celular debe tener 9 dígitos.')
    setFormErr('')
    registrar.mutate()
  }

  return (
    <Card className="gap-[22px]">
      <CardTitle>Nueva sesión</CardTitle>

      <div className="flex flex-col gap-2.5">
        <Paso n={1}>Tarifa</Paso>
        <div className="grid grid-cols-2 gap-2.5">
          {activas.map((t, i) => {
            const tono = TONOS[i % TONOS.length]
            const activa = sel === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => elegirTarifa(t.id)}
                className={cn(
                  'flex cursor-pointer flex-col items-start gap-0.5 rounded-2xl border-0 px-3.5 py-3 text-left text-tinta',
                  activa ? cn('bg-white ring-2', tono.ring) : 'bg-gris-100 hover:bg-[#e9edf5]',
                )}
              >
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span className="text-[15px] font-extrabold">{t.nombre}</span>
                  <span className={cn('font-display text-[22px] font-extrabold', tono.precio)}>
                    {t.precio > 0 ? money(t.precio) : 'Gratis'}
                  </span>
                </span>
                <span className="text-[13px] font-semibold text-texto-2">
                  {t.duracionMinutos} min · {t.cantidadNinos} {t.cantidadNinos === 1 ? 'niño' : 'niños'}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => elegirTarifa('especial')}
            className={cn(
              'flex cursor-pointer flex-col items-start gap-0.5 rounded-2xl border-0 px-3.5 py-3 text-left text-tinta',
              esEspecial ? 'bg-white ring-2 ring-tinta' : 'bg-gris-100 hover:bg-[#e9edf5]',
            )}
          >
            <span className="flex w-full items-baseline justify-between gap-2">
              <span className="text-[15px] font-extrabold">Especial</span>
              <span className="font-display text-[22px] font-extrabold text-[#3a4a6b]">S/ ?</span>
            </span>
            <span className="text-[13px] font-semibold text-texto-2">Minutos y monto a mano</span>
          </button>
        </div>

        {esEspecial && (
          <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-gris-100 p-3.5">
            <Field label="Minutos">
              <Input value={espMin} onChange={(e) => setEspMin(e.target.value)} inputMode="numeric" placeholder="60" className="bg-white" />
            </Field>
            <Field label="Monto (S/)">
              <Input value={espMonto} onChange={(e) => setEspMonto(e.target.value)} inputMode="decimal" placeholder="0.00" className="bg-white" />
            </Field>
            <div className="col-span-2 text-[12.5px] text-texto-2">Para casos especiales puedes agregar uno o varios niños.</div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <Paso n={2}>{requeridos !== null ? `Niños · ${ninos.length} de ${requeridos}` : 'Niños'}</Paso>
        {ninos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ninos.map((n) => (
              <div key={n.id} className="flex items-center gap-2 rounded-full bg-azul-50 py-1.5 pl-3.5 pr-1.5 text-sm font-extrabold">
                {n.nombre}
                <button
                  type="button"
                  aria-label={`Quitar a ${n.nombre}`}
                  onClick={() => setNinos((prev) => prev.filter((x) => x.id !== n.id))}
                  className="h-[26px] w-[26px] cursor-pointer rounded-full border-0 bg-white font-extrabold leading-none text-texto-2"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {mostrarBuscador && (
          <NinoSearch
            placeholder={ninos.length ? 'Busca al siguiente niño' : 'Busca por nombre del niño, del papá o celular'}
            onPick={agregar}
            disabledIds={ninos.map((n) => n.id)}
            onRegisterNew={abrirForm}
          />
        )}
        {sel === null && <div className="text-sm text-texto-3">Primero elige la tarifa.</div>}

        {form && (
          <div className="flex flex-col gap-3 rounded-2xl bg-[#f6f1fe] p-4">
            <div className="text-[15px] font-extrabold text-morado-900">Primera vez en Nubelandia</div>
            <Field label="Nombre completo del niño">
              <Input value={fNino} onChange={(e) => setFNino(e.target.value)} placeholder="Ej. Mateo Pérez Rojas" className="border-[#e1d6f6] bg-white" />
            </Field>
            <div className="grid grid-cols-[1.3fr_1fr] gap-2.5">
              <Field label="Papá o mamá (opcional)">
                <Input value={fApod} onChange={(e) => setFApod(e.target.value)} placeholder="Nombre completo" className="border-[#e1d6f6] bg-white" />
              </Field>
              <Field label="Celular (opcional)">
                <Input value={fTel} onChange={(e) => setFTel(e.target.value)} placeholder="9xx xxx xxx" inputMode="numeric" className="border-[#e1d6f6] bg-white" />
              </Field>
            </div>
            <FormError>{formErr}</FormError>
            <div className="flex justify-end gap-2.5">
              <Button variant="ghost" size="sm" onClick={cerrarForm}>
                Cancelar
              </Button>
              <Button variant="morado" size="sm" onClick={guardarForm} disabled={registrar.isPending}>
                Guardar y agregar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {pista && <div className="rounded-xl bg-naranja-50 px-3.5 py-2.5 text-sm font-bold text-naranja-800">{pista}</div>}
        <Button variant="primary" size="lg" disabled={!listo || iniciar.isPending} onClick={() => iniciar.mutate()}>
          {iniciar.isPending ? 'Iniciando…' : `Iniciar sesión${sel !== null ? ` · ${precioTxt}` : ''}`}
        </Button>
        <div className="text-center text-[12.5px] text-texto-4">
          Se registra el pago y 1 sello por niño con tarjeta activa (no aplica en sesiones gratis).
        </div>
      </div>
    </Card>
  )
}
