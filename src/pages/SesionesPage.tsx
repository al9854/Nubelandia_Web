import { EnJuegoSection } from '@/features/sesiones/EnJuegoSection'
import { NuevaSesionCard } from '@/features/sesiones/NuevaSesionCard'

export function SesionesPage() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] items-start gap-6">
      <NuevaSesionCard />
      <EnJuegoSection />
    </div>
  )
}
