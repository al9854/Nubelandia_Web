import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import logo from '@/assets/logo-nubelandia.png'
import { useAuth } from '@/hooks/useAuth'
import { useNow } from '@/hooks/useNow'
import { configuracionService } from '@/services'
import { fechaLargaLima, relojLima } from '@/lib/format'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/sesiones', label: 'Sesiones', dot: 'bg-rosa', admin: false },
  { to: '/fidelidad', label: 'Fidelidad', dot: 'bg-morado', admin: false },
  { to: '/reservas', label: 'Reservas', dot: 'bg-rosa', admin: false },
  { to: '/gastos', label: 'Gastos', dot: 'bg-[#e8a31d]', admin: false },
  { to: '/reportes', label: 'Reportes', dot: 'bg-azul', admin: false },
  { to: '/configuracion', label: 'Configuración', dot: 'bg-verde', admin: true },
]

export function AppLayout() {
  const { usuario, esAdmin, logout } = useAuth()
  const now = useNow()
  const { pathname } = useLocation()
  const config = useQuery({ queryKey: ['configuracion'], queryFn: configuracionService.obtener, refetchInterval: 30_000 })

  const titulo = NAV.find((n) => pathname.startsWith(n.to))?.label ?? ''

  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 box-border flex h-screen flex-col gap-[22px] border-r border-[#e6ebf3] bg-white px-3.5 py-[22px]">
        <img src={logo} alt="Nubelandia" className="w-[180px] self-center" />
        <nav className="flex flex-col gap-1">
          {NAV.filter((n) => !n.admin || esAdmin).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-[15px] font-extrabold no-underline transition-colors',
                  isActive ? 'bg-rosa-50 text-rosa-700' : 'text-tinta hover:bg-morado-50',
                )
              }
            >
              <span className={cn('h-2.5 w-2.5 rounded-full', n.dot)} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 rounded-[14px] bg-fondo p-3">
          <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-morado font-display text-[17px] font-bold text-white">
            {usuario?.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-extrabold">{usuario?.nombre}</span>
            <span className="text-xs capitalize text-texto-4">{usuario?.rol === 'admin' ? 'Administrador' : 'Empleado'}</span>
          </div>
          <button
            onClick={logout}
            className="ml-auto cursor-pointer border-0 bg-transparent p-1.5 text-[13px] font-extrabold text-rosa hover:text-rosa-700"
          >
            Salir
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-col gap-[22px] px-8 pb-14 pt-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="text-sm font-bold capitalize text-texto-4">{fechaLargaLima(now)}</div>
            <h1 className="m-0 font-display text-4xl font-bold leading-[1.1]">{titulo}</h1>
          </div>
          <div className="font-display text-[28px] font-bold tabular-nums text-[#3a4a6b]">{relojLima(now)}</div>
        </header>
        {config.data?.modoMantenimiento && (
          <div className="rounded-[14px] bg-naranja-50 px-4 py-3 text-sm font-extrabold text-naranja-800">
            Modo mantenimiento activo: el QR del local solo muestra el anuncio.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
