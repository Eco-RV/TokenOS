import { useCallback, useEffect, useMemo, useState } from "react"
import { Chain } from "./components/Chain"
import { Converter } from "./components/Converter"
import { Hero } from "./components/Hero"
import { Lab } from "./components/Lab"
import { Real } from "./components/Real"
import { Ruta } from "./components/Ruta"
import { loadToml, type Toml } from "./lib/lendara"
import { FALLBACK, loadRates, type Rates } from "./lib/rates"
import { buildSteps, calc } from "./lib/sim"
import { useSim } from "./useSim"

const TABS = [
	{ id: "lab", n: "01", t: "Laboratorio" },
	{ id: "real", n: "02", t: "Depósito real" },
	{ id: "ruta", n: "03", t: "Recorrido" },
	{ id: "chain", n: "04", t: "Blockchain" },
	{ id: "conv", n: "05", t: "Convertidor" },
]

export default function App() {
	const [tab, setTab] = useState("lab")
	const [rates, setRates] = useState<Rates>(FALLBACK)
	const [toml, setToml] = useState<Toml | null>(null)
	const [issuer, setIssuer] = useState<string | null>(null)
	const [tomlErr, setTomlErr] = useState("")

	useEffect(() => {
		void loadRates().then(setRates)
	}, [])
	useEffect(() => {
		loadToml()
			.then(setToml)
			.catch(() => setTomlErr("No se pudo leer el stellar.toml de Lendara. El modo real no está disponible ahora."))
	}, [])

	const sim = useSim()
	const c = useMemo(
		() => calc(sim.cur, Math.max(0, Number(sim.amt) || 0), sim.prod, rates),
		[sim.cur, sim.amt, sim.prod, rates],
	)
	const steps = useMemo(() => buildSteps(sim.scn, c), [sim.scn, c])

	const show = useCallback((id: string) => {
		setTab(id)
		// Tras pintar la sección, baja hasta su contenido (debajo del header fijo).
		requestAnimationFrame(() => {
			const el = document.getElementById(id)
			const hh = document.querySelector("header")?.clientHeight ?? 0
			if (!el) return
			scrollTo({
				top: Math.max(0, el.getBoundingClientRect().top + scrollY - hh - 8),
				behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth",
			})
		})
	}, [])

	return (
		<>
			<div className="guides" />
			<header>
				<div className="sec hd">
					<div className="logo">
						<svg viewBox="0 0 40 40" aria-hidden="true">
							<rect x="2" y="11" width="14" height="18" fill="currentColor" />
							<rect x="24" y="11" width="14" height="18" fill="none" stroke="var(--alert)" strokeWidth="3" />
							<path d="M16 20h8" stroke="var(--alert)" strokeWidth="3" />
						</svg>
						<span>Token</span>
						<span className="os">OS</span>
					</div>
					<nav role="tablist" aria-label="Secciones">
						{TABS.map((t) => (
							<button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => show(t.id)}>
								{t.n} {t.t}
							</button>
						))}
					</nav>
					<button className="btn blk cta" onClick={() => show("real")}>
						→ Depósito real
					</button>
				</div>
			</header>
			<aside className="idx" aria-label="Índice">
				{TABS.map((t) => (
					<button key={t.id} className={tab === t.id ? "cur" : ""} onClick={() => show(t.id)}>
						{t.n}
					</button>
				))}
			</aside>

			<Hero />
			<div className="ticker" aria-hidden="true">
				<div>
					{[0, 1, 2, 3].map((i) => (
						<span key={i}>
							Moneda local <i>✦</i> <b>Anchor</b> <i>✦</i> Stellar <i>✦</i> <b>USDC</b> <i>✦</i> Comisiones <i>✦</i>{" "}
							<b>Testnet</b> <i>✦</i>
						</span>
					))}
				</div>
			</div>

			<main>
				<section id="lab" className={tab === "lab" ? "on" : ""}>
					<Lab sim={sim} c={c} steps={steps} rates={rates} />
				</section>
				<section id="real" className={tab === "real" ? "on" : ""}>
					{tomlErr ? (
						<div className="sec">
							<p className="note" role="alert">
								{tomlErr}
							</p>
						</div>
					) : (
						<Real toml={toml} onIssuer={setIssuer} />
					)}
				</section>
				<section id="ruta" className={tab === "ruta" ? "on" : ""}>
					<Ruta sim={sim} steps={steps} />
				</section>
				<section id="chain" className={tab === "chain" ? "on" : ""}>
					<Chain active={tab === "chain"} issuer={issuer} />
				</section>
				<section id="conv" className={tab === "conv" ? "on" : ""}>
					<Converter rates={rates} />
				</section>
			</main>

			<footer>
				<div className="sec">
					Token <b style={{ color: "var(--alert)" }}>OS</b> · todo en testnet, sin valor real · hecho con Stellar y el
					anchor de Lendara
				</div>
			</footer>
		</>
	)
}
