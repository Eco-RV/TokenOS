import { useState } from "react"
import { NODES, SCN, type Step } from "../lib/sim"
import type { Sim } from "../useSim"
import { Timeline } from "./Timeline"
import { Track } from "./Track"

export function Ruta({ sim, steps }: { sim: Sim; steps: Step[] }) {
	const i = Math.min(sim.step, steps.length - 1)
	const s = steps[i]
	const [pick, setPick] = useState<number | null>(null)
	const N = NODES[pick ?? s.node]
	return (
		<div className="sec">
			<div className="chap">
				<div className="cell">
					<div className="num">03</div>
					<div className="kicker">Misión · participantes</div>
					<h2>Recorrido</h2>
				</div>
				<div className="cell">Qué pasa fuera de la blockchain y qué queda registrado en ella, paso a paso.</div>
			</div>
			<div className="grid two">
				<div className="cell">
					<h3 className="k">Línea temporal</h3>
					<label htmlFor="scn2">Operación de demostración</label>
					<select id="scn2" value={sim.scn} onChange={(e) => sim.set({ scn: e.target.value })}>
						{Object.entries(SCN).map(([k, v]) => (
							<option key={k} value={k}>
								{v.n}
							</option>
						))}
					</select>
					<div className="chev" />
					<Timeline
						steps={steps}
						cur={i}
						onPick={(k) => {
							setPick(null)
							sim.goto(k)
						}}
					/>
					<div className="row" style={{ marginTop: 16 }}>
						<button
							className="btn"
							type="button"
							onClick={() => {
								setPick(null)
								sim.play()
							}}
						>
							▶ Reproducir
						</button>
						<button
							className="btn line"
							type="button"
							onClick={() => {
								setPick(null)
								sim.goto(0)
							}}
						>
							↺ Reiniciar
						</button>
					</div>
				</div>
				<div className="cell">
					<h3 className="k">Participantes</h3>
					<Track step={s} onNode={setPick} />
					<label htmlFor="scrub">Revisar paso a paso</label>
					<input
						id="scrub"
						type="range"
						min={0}
						max={steps.length - 1}
						value={i}
						onChange={(e) => {
							setPick(null)
							sim.goto(+e.target.value)
						}}
					/>
					<div className="stat">
						<span className="state">{s.state}</span>
						<span className={`badge ${s.off ? "off" : "on"}`}>
							{s.off ? "Fuera de la blockchain" : "Registrado en la blockchain"}
						</span>
					</div>
					<div className="stepmsg">
						<b>{s.t}</b>
						{s.d}
					</div>
					<div className="stepmsg">
						<b>{N.n}</b>
						{N.w}
						<br />
						<span className="mut">{pick === null ? s.proc : N.p}</span>
					</div>
				</div>
			</div>
		</div>
	)
}
