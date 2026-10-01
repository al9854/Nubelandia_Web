import logo from '@/assets/logo-nubelandia.png'
import type { VistaQr } from '@/types'
import { SellosGrid } from '@/components/SellosGrid'
import { Button } from '@/components/ui/Button'
import { fechaCortaLima, money } from '@/lib/format'

interface Props {
  vista: VistaQr
  onAceptar: () => void
  onRechazar: () => void
  pendiente?: boolean
}

function Caja({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] bg-white px-3 py-2.5">
      <span className="text-[13px] font-extrabold">{titulo}</span>
      {children}
    </div>
  )
}

export function QrVista({ vista, onAceptar, onRechazar, pendiente }: Props) {
  if (vista.vista === 'anuncio') {
    const a = vista.anuncio
    return (
      <>
        <img src={logo} alt="Nubelandia" className="w-[200px] self-center" />
        <div className="text-center font-display text-xl font-bold leading-[1.15] text-rosa">¡Ven, juega y haz nuevos amigos!</div>
        <div className="rounded-[14px] bg-white px-3 py-2.5 text-[13px] leading-normal">
          <b>{a.horario}</b>
          <br />
          {a.direccion}
        </div>
        <Caja titulo="Tarifas">
          {a.tarifas.map((t) => (
            <div key={t.nombre} className="flex justify-between text-[13px]">
              <span>{t.nombre}</span>
              <b>{t.precio > 0 ? money(t.precio) : 'Gratis'}</b>
            </div>
          ))}
        </Caja>
        <Caja titulo="Tarjeta de fidelidad">
          {a.premios.map((p) => (
            <div key={p.texto} className="text-[13px]">
              {p.texto}
            </div>
          ))}
        </Caja>
        <Caja titulo="Reserva el salón">
          {a.planes.map((p) => (
            <div key={p.nombre} className="flex justify-between gap-2 text-[13px]">
              <span>{p.nombre}</span>
              <b>{money(p.precio)}</b>
            </div>
          ))}
        </Caja>
        {a.facebookUrl && (
          <a
            href={a.facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center rounded-[14px] bg-azul text-sm font-extrabold text-white no-underline"
          >
            Síguenos en Facebook
          </a>
        )}
      </>
    )
  }

  if (vista.vista === 'autorizacion') {
    const a = vista.autorizacion
    return (
      <>
        <img src={logo} alt="Nubelandia" className="w-[150px] self-center" />
        <div className="font-display text-xl font-bold leading-[1.15]">Hola, {a.apoderadoCorto}</div>
        <div className="text-[13.5px] leading-normal text-[#3a4a6b]">
          Para crear la tarjeta de fidelidad de tu hijo necesitamos guardar estos datos:
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1 rounded-[14px] bg-white p-3 text-[13px]">
          <span className="font-bold text-texto-3">Papá o mamá</span>
          <b>{a.apoderado}</b>
          <span className="font-bold text-texto-3">Hijo o hija</span>
          <b>{a.nino}</b>
          <span className="font-bold text-texto-3">Celular</span>
          <b>{a.telefonoOculto}</b>
        </div>
        <div className="text-xs leading-normal text-texto-2">
          Solo los usamos para registrar las visitas y premios de la tarjeta. Solo el personal del salón puede verlos y no los
          compartimos. Aviso {a.version}.
        </div>
        <Button variant="primary" size="md" className="h-[46px] rounded-[14px] shadow-none" onClick={onAceptar} disabled={pendiente}>
          Acepto
        </Button>
        <Button variant="ghost" size="md" className="h-10 rounded-[14px] text-texto-2" onClick={onRechazar} disabled={pendiente}>
          No acepto
        </Button>
      </>
    )
  }

  const t = vista.tarjeta
  return (
    <>
      <img src={logo} alt="Nubelandia" className="w-[150px] self-center" />
      <div className="font-display text-xl font-bold leading-[1.15]">{t.nino}</div>
      <div className="text-[13px] font-bold text-texto-2">
        {t.sellos} de {t.totalSellos} sellos
      </div>
      <div className="rounded-[18px] bg-white p-3.5 shadow-[inset_0_0_0_2px_#cfe2f7]">
        <SellosGrid total={t.totalSellos} actuales={t.sellos} compact />
      </div>
      {t.premios.map((p) => (
        <div key={p.titulo} className="text-[13px] text-texto-2">
          {p.titulo}
        </div>
      ))}
      {t.visitas.length > 0 && (
        <>
          <div className="text-[13px] font-extrabold">Últimas visitas</div>
          {t.visitas.map((v) => (
            <div key={v.fecha} className="text-[13px] capitalize text-texto-2">
              {fechaCortaLima(v.fecha)}
            </div>
          ))}
        </>
      )}
    </>
  )
}
