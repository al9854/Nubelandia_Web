import { cn } from '@/lib/cn'

interface Props {
  total: number
  actuales: number
  hitos?: number[]
  compact?: boolean
}

export function SellosGrid({ total, actuales, hitos = [], compact }: Props) {
  return (
    <div className={cn('grid grid-cols-5 justify-items-center', compact ? 'gap-2' : 'gap-3')}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const lleno = n <= actuales
        const hito = hitos.includes(n)
        return (
          <div
            key={n}
            className={cn(
              'flex items-center justify-center rounded-full font-display font-extrabold',
              compact ? 'aspect-square w-full text-[15px]' : 'h-[52px] w-[52px] text-xl',
              lleno ? 'bg-rosa text-white' : 'bg-white text-texto-4',
              hito ? 'ring-[3px] ring-[#e8a31d]' : !lleno && 'ring-2 ring-[#cfe2f7]',
            )}
          >
            {n}
          </div>
        )
      })}
    </div>
  )
}
