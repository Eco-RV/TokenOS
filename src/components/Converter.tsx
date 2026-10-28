import { useState } from "react"
import { fmt } from "../lib/format"
import type { Rates } from "../lib/rates"

const ASSETS = ["XLM", "USDC", "USD", "CRC", "ARS", "CLP", "EUR"]

export function Converter({ rates }: { rates: Rates }) {
	const [v, setV] = useState("100")
	const [from, setFrom] = useState("XLM")
	const [to, setTo] = useState("CRC")
	const usdOf = (a: string) => (a === "XLM" ? rates.xlm : 1 / rates.usd[a])
	const n = Number(v) || 0
	const usd = n * usdOf(from)
	const out = usd / usdOf(to)
	const d = (x: number) => (x < 1 ? 4 : 2)
	return (
		<div className="sec">
			<div className="chap">
				<div className="cell">
					<div className="num">05</div>
					<div className="kicker">Utilidad · mercado real</div>
					<h2>Convertidor</h2>
				</div>
				<div className="cell">Cuánto es en XLM, USDC, colones, pesos o dólares, con tasas reales.</div>
			</div>
			<div className="grid">
				<div className="cell">
					<div className="row" style={{ flexWrap: "wrap", alignItems: "end" }}>
						<div style={{ flex: "1 1 140px" }}>
							<label htmlFor="cv">Cantidad</label>
							<input id="cv" type="number" step="any" value={v} onChange={(e) => setV(e.target.value)} />
						</div>
						<div style={{ flex: "1 1 120px" }}>
							<label htmlFor="cf">De</label>
							<select id="cf" value={from} onChange={(e) => setFrom(e.target.value)}>
								{ASSETS.map((a) => (
									<option key={a}>{a}</option>
								))}
							</select>
						</div>
						<div style={{ flex: "0 0 56px" }}>
							<button
								className="btn line"
								type="button"
								aria-label="Invertir"
								style={{ width: "100%", padding: "11px 0" }}
								onClick={() => {
									setFrom(to)
									setTo(from)
								}}
							>
								⇄
							</button>
						</div>
						<div style={{ flex: "1 1 120px" }}>
							<label htmlFor="ct">A</label>
							<select id="ct" value={to} onChange={(e) => setTo(e.target.value)}>
								{ASSETS.map((a) => (
									<option key={a}>{a}</option>
								))}
							</select>
						</div>
					</div>
					<div className="big" style={{ marginTop: 22 }}>
						{fmt(n, d(n))} {from} ≈ {fmt(out, d(out))} {to}
					</div>
					<div className="eq">
						{ASSETS.filter((a) => a !== from).map((a) => {
							const x = usd / usdOf(a)
							return (
								<div key={a}>
									<span className="mut">{a}</span>
									<b>{fmt(x, d(x))}</b>
								</div>
							)
						})}
					</div>
					<p className="note">
						{rates.live
							? `Tasas reales de mercado (open.er-api.com y CoinGecko), actualizadas ${rates.ts?.toLocaleTimeString("es-CR")}. USDC se trata como 1 USD. En la testnet el XLM no tiene valor, pero esta es la equivalencia que tendría en la mainnet.`
							: "Sin conexión: valores aproximados de respaldo, no confiables."}
					</p>
				</div>
			</div>
		</div>
	)
}
