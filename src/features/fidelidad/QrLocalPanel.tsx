import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EstadoActivacion } from '@/types'
import { activacionesService, configuracionService, mensajeDeError, USE_MOCKS } from '@/services'
import { QrContenido } from '@/features/qr/QrContenido'
import { Button } from '@/components/ui/Button'
import { Pill, type Tone } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/cn'
import { minutosSegundos } from '@/lib/format'

export const ESTADOS_ACTIVACION: Record<EstadoActivacion, { texto: string; tone: Tone }> = {
  esperando: { texto: 'Esperando', tone: 'naranja' },
  reclamada: { texto: 'Abierto por el papá', tone: 'azul' },
  aprobada: { texto: 'Autorizado', tone: 'verde' },
  expirada: { texto: 'Expirada', tone: 'gris' },
  cancelada: { texto: 'No aceptó', tone: 'rojo' },
  cerrada: { texto: 'Deshabilitada', tone: 'gris' },
}

export function QrEstado() {
  const qc = useQueryClient()
  const toast = useToast()
  const now = useNow()
  const { data: vigente } = useQuery({
    queryKey: ['activaciones', 'vigente'],
    queryFn: activacionesService.vigente,
    refetchInterval: 3000,
  })
  const { data: config } = useQuery({ queryKey: ['configuracion'], queryFn: configuracionService.obtener })

  const cerrar = useMutation({
    mutationFn: (id: number) => activacionesService.cerrar(id),
    onSuccess: () => {
      toast('QR deshabilitado')
      qc.invalidateQueries({ queryKey: ['activaciones'] })
    },
    onError: (e) => toast(mensajeDeError(e)),
  })

  let badge: { texto: string; tone: Tone } = { texto: 'Sin habilitar', tone: 'gris' }
  let texto = 'Quien escanee el QR del local verá el anuncio con la información del negocio.'

  if (config?.modoMantenimiento) {
    badge = { texto: 'Mantenimiento', tone: 'naranja' }
    texto = 'Modo mantenimiento: el QR solo muestra el anuncio y no se puede habilitar.'
  } else if (vigente) {
    badge = ESTADOS_ACTIVACION[vigente.estado]
    texto =
      vigente.tipo === 'registro'
        ? `Autorización de ${vigente.apoderadoNombre ?? 'el papá'} para la tarjeta de ${vigente.ninoNombre}.`
        : `Consulta de la tarjeta de ${vigente.ninoNombre}.`
  }

  const pasos: { label: string; activo: boolean }[] = vigente
    ? vigente.tipo === 'registro'
      ? [
          { label: 'Esperando', activo: true },
          { label: 'Abierto por el papá', activo: vigente.estado !== 'esperando' },
          { label: 'Autorizado', activo: vigente.estado === 'aprobada' },
        ]
      : [
          { label: 'Esperando', activo: true },
          { label: 'Abierto por el papá', activo: vigente.estado !== 'esperando' },
        ]
    : []

  const restante = vigente ? Date.parse(vigente.expiraEn) - now : 0

  return (
    <section className="flex flex-col gap-2.5 rounded-card bg-white p-[18px] shadow-[0_1px_0_#e6ebf3]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-lg font-bold">QR del local</span>
        <Pill tone={badge.tone}>{badge.texto}</Pill>
      </div>
      <div className="text-sm leading-[1.45] text-texto-2">{texto}</div>
      {vigente && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {pasos.map((p) => (
              <Pill key={p.label} tone={p.activo ? 'verde' : 'gris'}>
                {p.label}
              </Pill>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2.5">
            <span className={cn('text-sm font-extrabold', restante < 120_000 ? 'text-naranja' : 'text-texto-2')}>
              Se deshabilita en {minutosSegundos(Math.max(restante, 0))}
            </span>
            <Button size="sm" disabled={cerrar.isPending} onClick={() => cerrar.mutate(vigente.id)}>
              Deshabilitar
            </Button>
          </div>
        </>
      )}
    </section>
  )
}

export function TelefonoSimulado() {
  const [escaneado, setEscaneado] = useState(false)
  const qc = useQueryClient()

  if (!USE_MOCKS) return null

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-texto-4">Simulación · celular del papá</span>
      <div className="box-border flex h-[600px] w-[300px] flex-col overflow-hidden rounded-[42px] border-[10px] border-tinta bg-fondo">
        <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">
          {!escaneado ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center">
              <div className="flex h-[150px] w-[150px] items-center justify-center rounded-3xl border-[3px] border-dashed border-[#9aa4b8] text-[13px] font-extrabold text-texto-3">
                Cámara
              </div>
              <div className="text-sm font-bold text-texto-2">El papá apunta la cámara al QR pegado en el local.</div>
              <Button variant="morado" className="h-[46px] rounded-[14px] px-5" onClick={() => setEscaneado(true)}>
                Escanear QR
              </Button>
            </div>
          ) : (
            <QrContenido />
          )}
        </div>
        {escaneado && (
          <button
            onClick={() => {
              setEscaneado(false)
              qc.removeQueries({ queryKey: ['public', 'qr'] })
              qc.invalidateQueries({ queryKey: ['activaciones'] })
            }}
            className="h-10 cursor-pointer border-0 border-t border-borde bg-white text-[13px] font-extrabold text-morado"
          >
            Volver a escanear
          </button>
        )}
      </div>
    </div>
  )
}
