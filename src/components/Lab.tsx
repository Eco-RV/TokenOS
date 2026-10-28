import { useRef } from "react"
import { fmt, sym } from "../lib/format"
import { FEE, MAX, MIN, SANDBOX, type Rates } from "../lib/rates"
import { SCN, type Calc, type Step } from "../lib/sim"
import { Track } from "./Track"
import type { Sim } from "../useSim"

interface Props {
	sim: Sim
	c: Calc
	steps: Step[]
	rates: Rates
}

export function Lab({ sim, c, steps, rates }: Props) {
	const dlg = useRef<HTMLDialogElement>(null)
	const s = steps[Math.min(sim.step, steps.length - 1)]
	const bad = c.net < MIN || c.net > MAX
	const row = (a: React.ReactNode, b: React.ReactNode, cls = "") => (
		<tr className={cls}>
			<td>{a}</td>
			<td>{b}</td>
		</tr>
	)
	const reached = Math.min(sim.step, steps.length - 1)
	const last = steps[steps.length - 1]
	const txt: [string, string][] = [
		[
			"Tu dinero tradicional",
			`Elegiste ${fmt(c.fiat)} ${c.cur}. Eso es dinero «fiat»: lo respalda un banco central, no una blockchain. Hasta aquí nada está en Stellar.`,
		],
		[
			"Proveedor de pago",
			`Cobró tu tarjeta. Es una empresa regulada que cobra su comisión (aquí ${c.prod ? "2,9 % ilustrativo" : "no se simula"}). Conoce tus datos de pago; la blockchain no.`,
		],
		[
			"Anchor: el puente",
			`Un anchor es una empresa que recibe moneda local y a cambio emite un activo digital en Stellar. Lendara aplicó su tasa (1 USDC = ${fmt(c.rate, 0)} ${c.cur}) y su comisión fija (${fmt(FEE)} USDC). Aquí se hace el KYC y se decide si la operación procede.`,
		],
		[
			"Stellar: el activo digital",
			`El anchor envió ${fmt(c.net)} USDC a tu cuenta. La red cobró 0,00001 XLM, el pago se confirmó en ~5 s y quedó un registro público e inmutable. USDC es un token estable (≈ 1 USD); necesitas una trustline para recibirlo.`,
		],
	]
	const idx = steps.map((x) => x.node)

	return (
		<div className="sec">
			<div className="chap">
				<div className="cell">
					<div className="num">01</div>
					<div className="kicker">Misión · conversión</div>
					<h2>Laboratorio</h2>
				</div>
				<div className="cell">
					Simula la conversión de dinero ficticio a USDC y revisa cada cargo. Para hacerlo con tu wallet, ve a «Depósito
					real».
				</div>
			</div>
			<div className="grid two">
				<div className="cell">
					<h3 className="k">Elige tu dinero ficticio</h3>
					<label htmlFor="amt">Monto a pagar</label>
					<div className="row">
						<input
							id="amt"
							type="number"
							min="0"
							step="0.01"
							inputMode="decimal"
							value={sim.amt}
							onChange={(e) => sim.set({ amt: e.target.value })}
						/>
						<select
							id="cur"
							style={{ maxWidth: 110 }}
							aria-label="Moneda"
							value={sim.cur}
							onChange={(e) => sim.set({ cur: e.target.value })}
						>
							{Object.keys(SANDBOX).map((k) => (
								<option key={k}>{k}</option>
							))}
						</select>
					</div>
					<div className="chips">
						{[10000, 25000, 50000, 100000].map((v) => (
							<button key={v} type="button" className="chip" onClick={() => sim.set({ amt: String(v) })}>
								{fmt(v, 0)}
							</button>
						))}
					</div>
					<label htmlFor="scn">Tarjeta de prueba</label>
					<select id="scn" value={sim.scn} onChange={(e) => sim.set({ scn: e.target.value })}>
						{Object.entries(SCN).map(([k, v]) => (
							<option key={k} value={k}>
								{v.n}
							</option>
						))}
					</select>
					<label className="switch">
						<input type="checkbox" checked={sim.prod} onChange={(e) => sim.set({ prod: e.target.checked })} /> Mostrar
						comisiones de producción ilustrativas
					</label>
					<div className="row" style={{ marginTop: 20 }}>
						<button className="btn" type="button" onClick={sim.play}>
							▶ Convertir
						</button>
						<button className="btn line" type="button" onClick={() => dlg.current?.showModal()}>
							¿Qué acaba de pasar?
						</button>
					</div>
					<p className="note" style={bad ? { color: "var(--alert)" } : undefined}>
						{bad
							? `⚠ Lendara acepta de ${MIN} a ${fmt(MAX, 0)} USDC después de la comisión; ahora recibirías ${fmt(c.net)}.`
							: `Límites de Lendara: ${MIN}–${fmt(MAX, 0)} USDC tras comisión.`}
					</p>
					<p className="note">
						<span className={`live${rates.live ? " ok" : ""}`}>
							{rates.live
								? `Mercado real · 1 USD = ${fmt(rates.usd.CRC, 0)} CRC · 1 XLM = US$ ${fmt(rates.xlm, 4)}`
								: "Sin conexión: usando valores de referencia aproximados"}
						</span>
					</p>
				</div>
				<div className="cell">
					<h3 className="k">El viaje del dinero</h3>
					<Track step={s} />
					<div className="stat">
						<span className="state">{s.state}</span>
						<span className="mut">
							paso {reached + 1} de {steps.length}
						</span>
					</div>
					<div className="stepmsg">
						<b>{s.t}</b>
						{s.d}
					</div>
				</div>
			</div>

			<div className="slab">
				<div className="sec">
					<div className="num">02</div>
					<div className="kicker" style={{ marginTop: 10 }}>
						Desglose
					</div>
					<div className="h2" style={{ marginBottom: 16 }}>
						Cuánto recibes y qué cargos se aplican
					</div>
					<table>
						<tbody>
							{row("Pagas", `${sym[c.cur]}${fmt(c.fiat)} ${c.cur}`)}
							{row(
								<>
									Tasa Lendara sandbox <span className="mut">(ficticia)</span>
								</>,
								`1 USDC = ${fmt(c.rate, 0)} ${c.cur}`,
							)}
							{row("Equivalente bruto", `${fmt(c.gross)} USDC`)}
							{c.prod &&
								row(
									<>
										Proveedor de pago <span className="mut">(2,9 % ilustrativo)</span>
									</>,
									<span className="neg">− {fmt(c.proc / c.rate)} USDC</span>,
								)}
							{c.prod &&
								row(
									<>
										Margen del anchor <span className="mut">(1 % ilustrativo)</span>
									</>,
									<span className="neg">− {fmt(c.spread)} USDC</span>,
								)}
							{row("Comisión fija del anchor", <span className="neg">− {fmt(FEE)} USDC</span>)}
							{row(
								<>
									Comisión de red Stellar <span className="mut">(la cubre el anchor)</span>
								</>,
								`0,00001 XLM ≈ US$ ${fmt(0.00001 * rates.xlm, 7)}`,
							)}
							{row("Recibes en tu cuenta Stellar", `${fmt(c.net)} USDC`, "total")}
							{row("≈ en XLM al precio real", `${fmt(c.xlm)} XLM`)}
							{row(
								"Valor real de ese dinero hoy",
								<>
									US$ {fmt(c.marketUsd)}{" "}
									<span className="mut">
										(tasa {fmt(c.real, 0)} {c.cur}/USD)
									</span>
								</>,
							)}
						</tbody>
					</table>
					{c.net > 0 && (
						<p className="note">
							Frente al mercado real, pierdes ≈ {fmt(c.lossPct, 1)} % entre tasa de sandbox y comisiones. Es
							ilustrativo: en producción la tasa la define el anchor.
						</p>
					)}
				</div>
			</div>

			<dialog ref={dlg}>
				<h3>¿Qué acaba de pasar?</h3>
				<div>
					{txt.map((t, i) => {
						const r = idx.slice(0, reached + 1).includes(i)
						const f = !!last.err && i === last.node && reached === steps.length - 1
						return (
							<div key={t[0]} className={`st ${f ? "fail" : r ? "reached" : "todo"}`}>
								<b>
									{i + 1}. {t[0]}
								</b>{" "}
								{f ? "⚠" : r ? "✓" : "· aún no"}
								<br />
								{t[1]}
							</div>
						)
					})}
				</div>
				<p className="note">
					Lección: la tarjeta, el KYC y la conversión de moneda suceden <b>fuera</b> de la blockchain. Solo el pago de
					USDC (cuenta, monto, activo, hash) queda <b>en</b> ella.
				</p>
				<button className="btn" type="button" style={{ marginTop: 8 }} onClick={() => dlg.current?.close()}>
					Entendido
				</button>
			</dialog>
		</div>
	)
}
