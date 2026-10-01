import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const base =
  'w-full min-w-0 rounded-xl border-2 border-borde bg-[#fbfcfe] px-3.5 font-semibold text-tinta outline-none transition-colors focus:border-morado focus:bg-white'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, 'h-11 text-[15px]', className)} {...rest} />
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, 'h-11 cursor-pointer text-[15px] font-bold', className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, 'resize-y py-2.5 text-sm', className)} {...rest} />
}

interface FieldProps {
  label: string
  children: ReactNode
  className?: string
}

export function Field({ label, children, className }: FieldProps) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5 text-[13px] font-extrabold', className)}>
      {label}
      {children}
    </label>
  )
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <div className="text-[13px] font-bold text-rojo-800">{children}</div>
}
