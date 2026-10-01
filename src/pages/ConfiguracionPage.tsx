import { useEffect, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PlanReserva, ReglaFidelidad, Rol, Tarifa, Usuario } from '@/types'
import { configuracionService, mensajeDeError, USE_MOCKS } from '@/services'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { FormError, Input, Select, Textarea } from '@/components/ui/Fields'
import { Pill } from '@/components/ui/Pill'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import { parseMonto } from '@/lib/format'

type CommitProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string
  onCommit: (value: string) => void
}

function CommitInput({ value, onCommit, className, ...rest }: CommitProps) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <Input
      {...rest}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className={cn('h-[38px] rounded-[10px] bg-white px-2.5 text-[15px]', className)}
    />
  )
}

type CommitAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
  value: string
  onCommit: (value: string) => void
}

function CommitArea({ value, onCommit, className, ...rest }: CommitAreaProps) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <Textarea
      {...rest}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      className={cn('rounded-[10px] bg-white px-2.5 py-2 text-[13.5px]', className)}
    />
  )
}

function Fila({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid items-center gap-3 border-t border-linea py-2.5', className)}>{children}</div>
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card className="gap-1.5">
      <CardTitle className="mb-1.5 text-xl">{titulo}</CardTitle>
      {children}
    </Card>
  )
}

function useGuardar(claves: string[]) {
  const qc = useQueryClient()
  const toast = useToast()
  return {
    ok: () => {
      toast('Guardado')
      claves.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
    },
    error: (e: unknown) => toast(mensajeDeError(e)),
  }
}

function TarifaFila({ t }: { t: Tarifa }) {
  const g = useGuardar(['tarifas'])
  const guardar = useMutation({
    mutationFn: (body: { precio: number; activa: boolean }) => configuracionService.guardarTarifa(t.id, body),
    onSuccess: g.ok,
    onError: g.error,
  })
  return (
    <Fila className="grid-cols-[minmax(0,1fr)_110px_52px]">
      <div className="flex flex-col">
        <span className="font-extrabold">{t.nombre}</span>
        <span className="text-[12.5px] text-texto-3">
          {t.duracionMinutos} min · {t.cantidadNinos} {t.cantidadNinos === 1 ? 'niño' : 'niños'}
        </span>
      </div>
      <div className="flex items-center gap-1.5 font-extrabold text-texto-2">
        S/
        <CommitInput
          value={String(t.precio)}
          inputMode="decimal"
          onCommit={(v) => {
            const precio = parseMonto(v)
            if (!Number.isFinite(precio) || precio < 0) return g.error(new Error('Precio no válido'))
            guardar.mutate({ precio, activa: t.activa })
          }}
        />
      </div>
      <Switch label={`Tarifa ${t.nombre} activa`} checked={t.activa} onChange={(activa) => guardar.mutate({ precio: t.precio, activa })} />
    </Fila>
  )
}

function PlanFila({ p }: { p: PlanReserva }) {
  const g = useGuardar(['planes'])
  const guardar = useMutation({
    mutationFn: (body: Omit<PlanReserva, 'id'>) => configuracionService.guardarPlan(p.id, body),
    onSuccess: g.ok,
    onError: g.error,
  })
  const base = { nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, activo: p.activo }
  return (
    <div className="flex flex-col gap-2 border-t border-linea py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_110px_52px] items-center gap-3">
        <CommitInput
          value={p.nombre}
          className="font-extrabold"
          onCommit={(v) => v.trim() && guardar.mutate({ ...base, nombre: v.trim() })}
        />
        <div className="flex items-center gap-1.5 font-extrabold text-texto-2">
          S/
          <CommitInput
            value={String(p.precio)}
            inputMode="decimal"
            onCommit={(v) => {
              const precio = parseMonto(v)
              if (!Number.isFinite(precio) || precio < 0) return g.error(new Error('Precio no válido'))
              guardar.mutate({ ...base, precio })
            }}
          />
        </div>
        <Switch label={`Plan ${p.nombre} activo`} checked={p.activo} onChange={(activo) => guardar.mutate({ ...base, activo })} />
      </div>
      <CommitArea value={p.descripcion} rows={2} onCommit={(v) => guardar.mutate({ ...base, descripcion: v })} />
    </div>
  )
}

function NuevoPlan() {
  const g = useGuardar(['planes'])
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState('')

  const crear = useMutation({
    mutationFn: configuracionService.crearPlan,
    onSuccess: () => {
      g.ok()
      setNombre('')
      setPrecio('')
      setDesc('')
      setError('')
    },
    onError: (e) => setError(mensajeDeError(e)),
  })

  function agregar() {
    const p = parseMonto(precio)
    if (!nombre.trim()) return setError('Escribe el nombre del plan.')
    if (!Number.isFinite(p) || p < 0) return setError('El precio no es válido.')
    setError('')
    crear.mutate({ nombre: nombre.trim(), descripcion: desc.trim(), precio: p, activo: true })
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del plan" />
        <Input value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="S/ precio" inputMode="decimal" />
      </div>
      <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Qué incluye: horas, niños, decoración…" />
      <FormError>{error}</FormError>
      <Button className="self-start" disabled={crear.isPending} onClick={agregar}>
        Agregar plan
      </Button>
    </div>
  )
}

function ReglaFila({ r }: { r: ReglaFidelidad }) {
  const g = useGuardar(['reglas'])
  const guardar = useMutation({
    mutationFn: (body: Pick<ReglaFidelidad, 'descripcionRecompensa' | 'activa'>) => configuracionService.guardarRegla(r.id, body),
    onSuccess: g.ok,
    onError: g.error,
  })
  return (
    <Fila className="grid-cols-[90px_minmax(0,1fr)_52px]">
      <span className="font-extrabold">{r.sellosRequeridos} sellos</span>
      <CommitInput
        value={r.descripcionRecompensa}
        onCommit={(v) => v.trim() && guardar.mutate({ descripcionRecompensa: v.trim(), activa: r.activa })}
      />
      <Switch
        label={`Regla de ${r.sellosRequeridos} sellos activa`}
        checked={r.activa}
        onChange={(activa) => guardar.mutate({ descripcionRecompensa: r.descripcionRecompensa, activa })}
      />
    </Fila>
  )
}

function Sistema() {
  const g = useGuardar(['configuracion'])
  const { data } = useQuery({ queryKey: ['configuracion'], queryFn: configuracionService.obtener })
  const guardar = useMutation({
    mutationFn: ({ clave, valor }: { clave: 'modo_mantenimiento' | 'facebook_url'; valor: string }) =>
      configuracionService.guardarClave(clave, valor),
    onSuccess: g.ok,
    onError: g.error,
  })
  if (!data) return null
  return (
    <>
      <CardTitle className="mb-1.5 mt-[18px] text-xl">Sistema</CardTitle>
      <Fila className="grid-cols-[minmax(0,1fr)_52px]">
        <div className="flex flex-col">
          <span className="font-extrabold">Modo mantenimiento</span>
          <span className="text-[12.5px] text-texto-3">El QR del local solo muestra el anuncio.</span>
        </div>
        <Switch
          label="Modo mantenimiento"
          checked={data.modoMantenimiento}
          onChange={(on) => guardar.mutate({ clave: 'modo_mantenimiento', valor: String(on) })}
        />
      </Fila>
      <div className="flex flex-col gap-1.5 border-t border-linea py-2.5 font-extrabold">
        Enlace de Facebook
        <span className="text-[12.5px] font-semibold text-texto-3">Aparece en el anuncio del QR.</span>
        <CommitInput
          value={data.facebookUrl}
          placeholder="https://facebook.com/…"
          onCommit={(v) => guardar.mutate({ clave: 'facebook_url', valor: v.trim() })}
        />
      </div>
    </>
  )
}

function UsuarioFila({ u, esYo }: { u: Usuario; esYo: boolean }) {
  const g = useGuardar(['usuarios'])
  const guardar = useMutation({
    mutationFn: (activo: boolean) => configuracionService.guardarUsuario(u.id, { activo }),
    onSuccess: g.ok,
    onError: g.error,
  })
  return (
    <Fila className="grid-cols-[minmax(0,1fr)_auto_52px]">
      <div className="flex flex-col">
        <span className="font-extrabold">{u.nombre}</span>
        <span className="text-[12.5px] text-texto-3">{u.usuario}</span>
      </div>
      <Pill tone={u.rol === 'admin' ? 'morado' : 'azul'}>{u.rol}</Pill>
      <Switch label={`Usuario ${u.usuario} activo`} checked={u.activo} disabled={esYo || guardar.isPending} onChange={(on) => guardar.mutate(on)} />
    </Fila>
  )
}

function NuevoUsuario() {
  const g = useGuardar(['usuarios'])
  const [nombre, setNombre] = useState('')
  const [usuario, setUsuario] = useState('')
  const [rol, setRol] = useState<Rol>('empleado')
  const [error, setError] = useState('')

  const crear = useMutation({
    mutationFn: configuracionService.crearUsuario,
    onSuccess: () => {
      g.ok()
      setNombre('')
      setUsuario('')
      setRol('empleado')
      setError('')
    },
    onError: (e) => setError(mensajeDeError(e)),
  })

  return (
    <>
      <div className="mt-2.5 grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px] gap-2">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" />
        <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="usuario" autoCapitalize="none" />
        <Select value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          <option value="empleado">empleado</option>
          <option value="admin">admin</option>
        </Select>
      </div>
      <FormError>{error}</FormError>
      <Button
        className="mt-1.5 self-start"
        disabled={crear.isPending}
        onClick={() => {
          if (!nombre.trim() || !usuario.trim()) return setError('Completa nombre y usuario.')
          setError('')
          crear.mutate({ nombre: nombre.trim(), usuario: usuario.trim(), rol })
        }}
      >
        Agregar usuario
      </Button>
      {USE_MOCKS && <div className="text-[12.5px] text-texto-4">Contraseña inicial del demo: nube123</div>}
    </>
  )
}

export function ConfiguracionPage() {
  const { usuario: yo } = useAuth()
  const tarifas = useQuery({ queryKey: ['tarifas'], queryFn: configuracionService.tarifas })
  const planes = useQuery({ queryKey: ['planes'], queryFn: configuracionService.planes })
  const reglas = useQuery({ queryKey: ['reglas'], queryFn: configuracionService.reglas })
  const usuarios = useQuery({ queryKey: ['usuarios'], queryFn: configuracionService.usuarios })

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start gap-5">
      <Seccion titulo="Tarifas">
        {tarifas.data?.map((t) => <TarifaFila key={t.id} t={t} />)}
        <div className="mt-1.5 text-[12.5px] text-texto-4">En Sesiones también aparece “Especial” para escribir minutos y monto a mano.</div>
      </Seccion>

      <Seccion titulo="Planes de reserva">
        {planes.data?.map((p) => <PlanFila key={p.id} p={p} />)}
        <NuevoPlan />
      </Seccion>

      <Card className="gap-1.5">
        <CardTitle className="mb-1.5 text-xl">Reglas de fidelidad</CardTitle>
        {reglas.data?.map((r) => <ReglaFila key={r.id} r={r} />)}
        <Sistema />
      </Card>

      <Seccion titulo="Usuarios">
        {usuarios.data?.map((u) => <UsuarioFila key={u.id} u={u} esYo={u.id === yo?.id} />)}
        <NuevoUsuario />
      </Seccion>
    </div>
  )
}
