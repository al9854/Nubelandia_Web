import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { NinoBusqueda } from '@/types'
import { activacionesService, mensajeDeError, ninosService } from '@/services'
import { Button } from '@/components/ui/Button'
import { Field, FormError, Input } from '@/components/ui/Fields'
import { useToast } from '@/components/ui/Toast'
import { nombreCompletoValido, soloDigitos } from '@/lib/format'

interface Props {
  onCreado: (nino: NinoBusqueda) => void
  onCancelar: () => void
}

export function NuevoRegistroCard({ onCreado, onCancelar }: Props) {
  const qc = useQueryClient()
  const toast = useToast()
  const [apod, setApod] = useState('')
  const [tel, setTel] = useState('')
  const [nino, setNino] = useState('')
  const [error, setError] = useState('')

  const guardar = useMutation({
    mutationFn: async () => {
      const creado = await ninosService.crear({
        nombreCompleto: nino,
        apoderadoNombre: apod,
        telefono: soloDigitos(tel),
      })
      try {
        await activacionesService.crear({ tipo: 'registro', ninoId: creado.id })
      } catch (e) {
        return { creado, aviso: mensajeDeError(e) }
      }
      return { creado, aviso: null }
    },
    onSuccess: ({ creado, aviso }) => {
      qc.invalidateQueries({ queryKey: ['activaciones'] })
      qc.invalidateQueries({ queryKey: ['ninos'] })
      toast(aviso ?? 'QR habilitado: el papá debe escanearlo y autorizar')
      onCreado(creado)
    },
    onError: (e) => setError(mensajeDeError(e)),
  })

  function enviar() {
    if (!nombreCompletoValido(apod)) return setError('Escribe el nombre completo del papá o mamá.')
    if (soloDigitos(tel).length !== 9) return setError('El celular debe tener 9 dígitos.')
    if (!nombreCompletoValido(nino)) return setError('Escribe el nombre completo del niño.')
    setError('')
    guardar.mutate()
  }

  return (
    <section className="flex flex-col gap-3 rounded-card bg-white p-[22px] shadow-[0_1px_0_#e6ebf3]">
      <div className="font-display text-xl font-bold">Nuevo registro para tarjeta</div>
      <div className="text-sm text-texto-2">
        Escribe los datos que te da el papá. Al guardar se habilita el QR del local para que él autorice el uso de sus datos.
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
        <Field label="Papá o mamá">
          <Input value={apod} onChange={(e) => setApod(e.target.value)} placeholder="Nombre completo" />
        </Field>
        <Field label="Celular">
          <Input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="9xx xxx xxx" inputMode="numeric" />
        </Field>
      </div>
      <Field label="Hijo o hija">
        <Input value={nino} onChange={(e) => setNino(e.target.value)} placeholder="Nombre completo del niño" />
      </Field>
      <FormError>{error}</FormError>
      <div className="flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onCancelar} className="text-texto-2">
          Cancelar
        </Button>
        <Button variant="morado" onClick={enviar} disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar y habilitar QR'}
        </Button>
      </div>
    </section>
  )
}
