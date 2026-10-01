import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mensajeDeError, publicoService } from '@/services'
import { QrVista } from './QrVista'

export function QrContenido() {
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['public', 'qr'],
    queryFn: publicoService.qr,
    refetchInterval: 4000,
  })

  const autorizar = useMutation({
    mutationFn: (acepta: boolean) => publicoService.autorizar(acepta),
    onSuccess: (vista) => qc.setQueryData(['public', 'qr'], vista),
  })

  if (isLoading) return <div className="py-10 text-center text-sm font-bold text-texto-4">Cargando…</div>
  if (error || !data) return <div className="py-10 text-center text-sm font-bold text-rojo-800">{mensajeDeError(error)}</div>

  return (
    <>
      <QrVista
        vista={data}
        pendiente={autorizar.isPending}
        onAceptar={() => autorizar.mutate(true)}
        onRechazar={() => autorizar.mutate(false)}
      />
      {autorizar.error && <div className="text-center text-[13px] font-bold text-rojo-800">{mensajeDeError(autorizar.error)}</div>}
    </>
  )
}
