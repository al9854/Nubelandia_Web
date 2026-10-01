import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'morado' | 'tinta' | 'soft' | 'azul' | 'gris' | 'ghost' | 'peligro' | 'verde'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-rosa text-white shadow-[0_5px_0_var(--color-rosa-700)] hover:bg-rosa-600 active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-rosa-700)] disabled:bg-[#cfd5e1] disabled:shadow-[0_5px_0_#b3bbcb]',
  morado:
    'bg-morado text-white hover:bg-morado-600 disabled:bg-[#cfd5e1]',
  tinta: 'bg-tinta text-white hover:bg-tinta-600 disabled:bg-[#cfd5e1]',
  soft: 'bg-morado-50 text-morado-900 hover:bg-morado-100',
  azul: 'bg-azul-50 text-azul-800 hover:bg-azul-100',
  verde: 'bg-verde-50 text-verde-800 hover:bg-[#d3efe3]',
  gris: 'bg-gris-100 text-[#3a4a6b] hover:bg-[#e6eaf2]',
  ghost: 'bg-transparent text-texto-4 hover:text-rojo-800',
  peligro: 'bg-transparent text-rojo-800 hover:bg-rojo-50',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px] rounded-xl',
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-14 px-5 text-xl rounded-2xl font-display',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'tinta', size = 'md', className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap border-0 font-extrabold transition-colors disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        variant === 'primary' && size === 'lg' && 'font-bold',
        className,
      )}
      {...rest}
    />
  )
}
