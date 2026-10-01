import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('flex min-w-0 flex-col gap-4 rounded-card bg-white p-6 shadow-card', className)}
      {...rest}
    />
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('m-0 font-display text-[22px] font-bold leading-tight', className)}>{children}</h2>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-3 text-sm font-bold text-texto-4">{children}</div>
}
