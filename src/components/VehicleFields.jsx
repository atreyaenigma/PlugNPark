"use client";
import { useId } from "react";
import { CONNECTOR_KINDS, VEHICLES } from "@/lib/vehicles";

// Car picker used on first login, on the My car page and in the trip planner.
// state = { id, custom }  (see stateFromVehicle / vehicleFromState in lib/vehicles.js)
export default function VehicleFields({ state, onChange, allowEmpty = false }) {
  const uid = useId();
  const preset = VEHICLES.find((v) => v.id === state.id && v.id !== "custom");
  const setC = (k) => (e) => onChange({ ...state, custom: { ...state.custom, [k]: e.target.value } });
  const toggle = (k) => {
    const cur = state.custom.connectors;
    onChange({ ...state, custom: { ...state.custom, connectors: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] } });
  };

  return (
    <div className="vfields">
      <label className="fld" htmlFor={`${uid}-car`}>Your car
        <select id={`${uid}-car`} name="car" value={state.id} onChange={(e) => onChange({ ...state, id: e.target.value })}>
          {allowEmpty && <option value="">Choose your car...</option>}
          {VEHICLES.map((v) => <option key={v.id} value={v.id}>{v.id === "custom" ? "Another car (enter details)" : v.name}</option>)}
        </select>
      </label>
      {preset && (
        <p className="muted small-note">
          {preset.batteryKwh} kWh battery · about {preset.rangeKm} km real-world range · {preset.maxDcKw > 0 ? `fast charging up to ${preset.maxDcKw} kW` : "no fast charging"} · plugs: {preset.connectors.join(", ")}.
          These are approximate. Choose "Another car" to enter your own figures.
        </p>
      )}
      {state.id === "custom" && (
        <div className="customcar">
          <label className="fld wide">Car name<input name="carName" maxLength={60} value={state.custom.name || ""} onChange={setC("name")} placeholder="For example: Dad's Zoom" /></label>
          <label className="fld">Battery (kWh)<input name="batteryKwh" type="number" min="5" max="200" step="0.1" value={state.custom.batteryKwh} onChange={setC("batteryKwh")} /></label>
          <label className="fld">Real range (km)<input name="rangeKm" type="number" min="50" max="800" value={state.custom.rangeKm} onChange={setC("rangeKm")} /></label>
          <label className="fld">Max fast charge (kW)<input name="maxDcKw" type="number" min="0" max="350" value={state.custom.maxDcKw} onChange={setC("maxDcKw")} /></label>
          <label className="fld">Max AC charge (kW)<input name="maxAcKw" type="number" min="0" max="22" step="0.1" value={state.custom.maxAcKw} onChange={setC("maxAcKw")} /></label>
          <fieldset className="conns"><legend className="fld">Plugs your car has</legend>
            {CONNECTOR_KINDS.map((k) => <label key={k} className="check"><input type="checkbox" checked={state.custom.connectors.includes(k)} onChange={() => toggle(k)} /> {k}</label>)}
          </fieldset>
        </div>
      )}
    </div>
  );
}
