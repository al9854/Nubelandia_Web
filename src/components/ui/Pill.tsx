import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Tone = 'rosa' | 'morado' | 'azul' | 'verde' | 'naranja' | 'rojo' | 'gris' | 'tinta'

export const toneClasses: Record<Tone, string> = {
  rosa: 'bg-rosa-50 text-rosa-700',
  morado: 'bg-morado-50 text-morado-900',
  azul: 'bg-azul-50 text-azul-800',
  verde: 'bg-verde-50 text-verde-800',
  naranja: 'bg-naranja-50 text-naranja-800',
  rojo: 'bg-rojo-50 text-rojo-800',
  gris: 'bg-gris-100 text-texto-3',
  tinta: 'bg-tinta text-white',
}

export function Pill({ tone = 'gris', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-extrabold',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
