import { useEffect, useState } from "react"
import { fmt, short } from "../lib/format"
import { HORIZON, loadBalances } from "../lib/stellar"

interface Ledger {
	sequence: number
	closed_at: string
	successful_transaction_count: number
	failed_transaction_count: number
	operation_count: number
	hash: string
	protocol_version: number | string
}
interface Pay {
	id: string
	from: string
	to: string
	amount: string
	asset: string
}

export function Chain({ active, issuer }: { active: boolean; issuer: string | null }) {
	const [blocks, setBlocks] = useState<(Ledger & { fresh?: boolean })[]>([])
	const [pays, setPays] = useState<Pay[]>([])
	const [sel, setSel] = useState<Ledger | null>(null)
	const [status, setStatus] = useState("conectando a Horizon…")
	const [ok, setOk] = useState(false)
	const [last, setLast] = useState(0)
	const [now, setNow] = useState(0)
	const [acct, setAcct] = useState("")
	const [out, setOut] = useState("")

	useEffect(() => {
		if (!active) return
		let es: EventSource | undefined
		let ps: EventSource | undefined
		let fake: number | undefined
		let dead = false
		const add = (l: Ledger, fresh: boolean) => {
			setBlocks((b) => (b.some((x) => x.sequence === l.sequence) ? b : [{ ...l, fresh }, ...b].slice(0, 12)))
			if (fresh) {
				setLast(Date.now())
				setSel(l)
			}
		}
		;(async () => {
			try {
				const r = await fetch(`${HORIZON}/ledgers?order=desc&limit=8`).then((x) => x.json())
				if (dead) return
				const recs: Ledger[] = r._embedded.records.reverse()
				recs.forEach((l) => add(l, false))
				setLast(new Date(recs[recs.length - 1].closed_at).getTime())
				setOk(true)
				setStatus("En vivo · Horizon testnet")
				es = new EventSource(`${HORIZON}/ledgers?cursor=now`)
				es.onmessage = (e) => {
					try {
						add(JSON.parse(e.data), true)
					} catch {
						/* ignora */
					}
				}
				ps = new EventSource(`${HORIZON}/payments?cursor=now`)
				ps.onmessage = (e) => {
					try {
						const p = JSON.parse(e.data)
						if (p.type !== "payment") return
						setPays((x) =>
							[
								{
									id: p.id,
									from: p.from,
									to: p.to,
									amount: p.amount,
									asset: p.asset_type === "native" ? "XLM" : p.asset_code,
								},
								...x,
							].slice(0, 30),
						)
					} catch {
						/* ignora */
					}
				}
			} catch {
				setStatus("Sin conexión: bloques simulados")
				let n = 1000000
				fake = window.setInterval(
					() =>
						add(
							{
								sequence: ++n,
								closed_at: new Date().toISOString(),
								successful_transaction_count: Math.floor(Math.random() * 40),
								failed_transaction_count: 0,
								operation_count: Math.floor(Math.random() * 120),
								hash: "simulado",
								protocol_version: "—",
							},
							true,
						),
					5000,
				)
			}
		})()
		const tick = window.setInterval(() => setNow(Date.now()), 250)
		return () => {
			dead = true
			es?.close()
			ps?.close()
			window.clearInterval(fake)
			window.clearInterval(tick)
		}
	}, [active])

	const secs = last ? Math.max(0, (now - last) / 1000) : 0

	async function check() {
		const a = acct.trim()
		if (!/^G[A-Z2-7]{55}$/.test(a)) {
			setOut("Clave inválida. Debe empezar por G y tener 56 caracteres.")
			return
		}
		setOut("Consultando…")
		try {
			const b = await loadBalances(a, issuer ?? "")
			setOut(
				b.exists
					? `${fmt(b.xlm)} XLM · ${b.usdc === null ? "sin trustline a USDC de Lendara" : `${fmt(b.usdc)} USDC`}`
					: "La cuenta no existe aún en testnet (fondéala con Friendbot).",
			)
		} catch (e) {
			setOut((e as Error).message)
		}
	}

	return (
		<div className="sec">
			<div className="chap">
				<div className="cell">
					<div className="num">04</div>
					<div className="kicker">Red · Stellar testnet</div>
					<h2>Blockchain en vivo</h2>
				</div>
				<div className="cell">Cada ~5 s se cierra un ledger: un bloque de transacciones confirmadas e inmutables.</div>
			</div>
			<div className="grid">
				<div className="cell">
					<div className="stat" style={{ margin: "0 0 8px" }}>
						<h3 className="k" style={{ margin: 0 }}>
							Ledgers recientes
						</h3>
						<span className={`live${ok ? " ok" : ""}`}>{status}</span>
					</div>
					<div className="belt">
						{blocks.map((l) => {
							const t = new Date(l.closed_at)
							return (
								<div key={l.sequence} className={`blk${l.fresh ? " new" : ""}`} onClick={() => setSel(l)}>
									<b>#{l.sequence}</b>
									{t.toLocaleTimeString("es-CR")}
									<br />
									{l.successful_transaction_count} tx · {l.operation_count} ops
								</div>
							)
						})}
					</div>
					<div className="stat">
						<span className="mut">Toca un bloque para ver sus datos.</span>
						<span className="mut">{last ? `último bloque hace ${Math.floor(secs)} s` : ""}</span>
					</div>
					<div className="bar">
						<i style={{ width: `${Math.min(100, (secs / 5) * 100)}%` }} />
					</div>
					<div className="stepmsg mono">
						{sel ? (
							<>
								Ledger #{sel.sequence}
								<br />
								Cerrado: {new Date(sel.closed_at).toLocaleString("es-CR")}
								<br />
								Transacciones: {sel.successful_transaction_count} ok / {sel.failed_transaction_count} fallidas
								<br />
								Operaciones: {sel.operation_count}
								<br />
								Hash: {sel.hash}
								<br />
								Protocolo: v{sel.protocol_version}
							</>
						) : (
							"Sin bloque seleccionado."
						)}
					</div>
				</div>
			</div>
			<div className="grid two">
				<div className="cell">
					<h3 className="k">Pagos en vivo</h3>
					<div className="feed mono">
						{pays.length === 0 ? (
							<span className="mut">esperando pagos…</span>
						) : (
							pays.map((p) => (
								<div key={p.id}>
									<span>
										{short(p.from)} → {short(p.to)}
									</span>
									<b>
										{fmt(+p.amount)} {p.asset}
									</b>
								</div>
							))
						)}
					</div>
				</div>
				<div className="cell">
					<h3 className="k">Revisa tu cuenta</h3>
					<label htmlFor="acct">Clave pública (G…) de testnet</label>
					<input
						id="acct"
						placeholder="G…"
						spellCheck={false}
						style={{ textAlign: "left" }}
						value={acct}
						onChange={(e) => setAcct(e.target.value)}
					/>
					<button className="btn" type="button" style={{ marginTop: 14 }} onClick={check}>
						Consultar
					</button>
					<div className="note">{out}</div>
					<p className="note">
						Tras un depósito, el USDC aparece aquí: en la blockchain queda el pago, no la tarjeta ni el KYC.
					</p>
				</div>
			</div>
		</div>
	)
}
