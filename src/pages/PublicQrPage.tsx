import { QrContenido } from '@/features/qr/QrContenido'

export function PublicQrPage() {
  return (
    <div className="min-h-screen bg-fondo">
      <div className="mx-auto flex max-w-[420px] flex-col gap-3 px-4 py-6">
        <QrContenido />
      </div>
    </div>
  )
}
