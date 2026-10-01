import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type ToastFn = (message: string) => void

const ToastContext = createContext<ToastFn>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const toast = useCallback<ToastFn>((m) => {
    clearTimeout(timer.current)
    setMessage(m)
    timer.current = setTimeout(() => setMessage(''), 2800)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {message && (
        <div
          role="status"
          className="fixed bottom-7 left-1/2 z-40 -translate-x-1/2 rounded-2xl bg-tinta px-[22px] py-3.5 text-[15px] font-extrabold text-white shadow-[0_12px_30px_rgb(31_42_68/0.3)]"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastFn {
  return useContext(ToastContext)
}
