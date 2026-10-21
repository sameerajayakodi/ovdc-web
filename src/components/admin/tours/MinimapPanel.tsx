"use client";

import { RotateCcw, RotateCw, Sparkles, Trash2, X } from "lucide-react";
import type { PlanRoom } from "@/db/schema";
import type { AdminScene } from "@/lib/admin/types";
import { MAP_H, MAP_W, matchScene, minimapFromPlan, roomCentre, roomId, type MiniRoom } from "@/lib/minimap";
import { useAdminUi } from "../AdminRoot";
import s from "./tours.module.css";

const wrap = (y: number) => ((((y + 180) % 360) + 360) % 360) - 180;
const r1 = (n: number) => Math.round(n * 10) / 10;

interface Props {
  rooms: MiniRoom[];
  scenes: AdminScene[];
  cur: number;
  /** The tour's unit type and its floor plan rooms, when it has a layout */
  type: string;
  planRooms: PlanRoom[];
  onRooms: (rooms: MiniRoom[]) => void;
  onScenes: (scenes: AdminScene[]) => void;
}

/**
 * The floor plan card in the corner of the tour: rooms generated from the unit type's
 * floor plan, each linked to its scene, and a marker and view cone for every scene.
 */
export function MinimapPanel({ rooms, scenes, cur, type, planRooms, onRooms, onScenes }: Props) {
  const { confirm, toast } = useAdminUi();
  const scene = scenes[cur] as AdminScene | undefined;
  const heading = scene ? wrap(scene.yaw + scene.planRot) : 0;
  const canGenerate = planRooms.some((r) => r.name && r.w > 0 && r.l > 0);

  async function generate() {
    if (rooms.length && !(await confirm({ title: "Replace the minimap?", body: `The rooms are redrawn from the ${type} floor plan. Scene markers move into their rooms.`, confirmLabel: "Replace" }))) return;
    const next = minimapFromPlan(planRooms, scenes);
    onRooms(next);
    // Put every scene that has a room of its own in the middle of that room.
    onScenes(
      scenes.map((x) => {
        const r = next.find((m) => m.id === x.key);
        if (!r) return x;
        const [planX, planY] = roomCentre(r);
        return { ...x, planX, planY };
      }),
    );
    const linked = next.filter((r) => scenes.some((x) => x.key === r.id)).length;
    toast(`${next.length} rooms drawn from the ${type} floor plan · ${linked} linked to scenes`);
  }

  function place(e: React.MouseEvent<SVGSVGElement>) {
    if (!scene) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const planX = r1(Math.min(MAP_W, Math.max(0, p.x)));
    const planY = r1(Math.min(MAP_H, Math.max(0, p.y)));
    onScenes(scenes.map((x, i) => (i === cur ? { ...x, planX, planY } : x)));
  }

  /** Points the cone of the starting view; the panorama and its hotspots stay as they are. */
  const turn = (deg: number) => scene && onScenes(scenes.map((x, i) => (i === cur ? { ...x, planRot: r1(wrap(deg - x.yaw)) } : x)));

  const setRoom = (i: number, patch: Partial<MiniRoom>) => onRooms(rooms.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  function link(i: number, key: string) {
    const used = new Set(rooms.filter((_, j) => j !== i).map((r) => r.id));
    if (key && used.has(key)) return toast("That scene already has a room on the plan.", "err");
    setRoom(i, { id: key || roomId(rooms[i].label, used) });
  }

  return (
    <section className={s.panel} aria-label="Floor plan minimap">
      <div className={s.panelHead}>
        <strong style={{ flex: 1 }}>Floor plan minimap</strong>
        {rooms.length > 0 && (
          <button type="button" className="ad-btn ad-btn-icon" aria-label="Clear the minimap" title="Clear the minimap" onClick={() => onRooms([])}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className={s.panelBody}>
        <div className={s.miniWrap}>
          <svg viewBox={`-6 -6 ${MAP_W + 12} ${MAP_H + 12}`} className={s.mini} role="img" aria-label={scene ? `Minimap. Click to place ${scene.name}` : "Minimap"} onClick={place}>
            <rect x={0} y={0} width={MAP_W} height={MAP_H} className={s.miniBg} />
            {rooms.map((r) => (
              <g key={r.id}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} className={s.miniRoom} data-on={r.id === scene?.key || undefined} strokeDasharray={r.outdoor ? "3 2" : undefined} />
                <text x={r.x + 4} y={r.y + 10} className={s.miniLabel}>
                  {r.label.length > Math.max(4, r.w / 4.6) ? `${r.label.slice(0, Math.max(3, Math.floor(r.w / 4.6)))}…` : r.label}
                </text>
              </g>
            ))}
            {scenes.map((x, i) =>
              i === cur ? null : (
                <g key={x.key} transform={`translate(${x.planX} ${x.planY})`} className={s.miniDot}>
                  <circle r={5} />
                  <text y={2.6} textAnchor="middle">
                    {i + 1}
                  </text>
                </g>
              ),
            )}
            {scene && (
              <g transform={`translate(${scene.planX} ${scene.planY}) rotate(${heading})`} style={{ pointerEvents: "none" }}>
                <path d="M0 0 L34 -18 A38 38 0 0 1 34 18 Z" className={s.miniCone} />
                <circle r={5} className={s.miniHere} />
              </g>
            )}
          </svg>
          {!rooms.length && <span className={s.miniEmpty}>{canGenerate ? "No rooms yet. Draw them from the floor plan." : "No rooms yet."}</span>}
        </div>

        {scene && (
          <>
            <span className="ad-help">Click the plan to place {scene.name}. Then turn the cone to where the starting view looks.</span>
            <div className="ad-field">
              <label htmlFor="mm-dir">Starting view points (° clockwise from east)</label>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="ad-btn ad-btn-icon" aria-label="Turn left 15°" onClick={() => turn(heading - 15)}>
                  <RotateCcw size={14} />
                </button>
                <input id="mm-dir" className="ad-input" type="number" step={5} value={heading} onChange={(e) => turn(Number(e.target.value) || 0)} style={{ flex: 1 }} />
                <button type="button" className="ad-btn ad-btn-icon" aria-label="Turn right 15°" onClick={() => turn(heading + 15)}>
                  <RotateCw size={14} />
                </button>
              </div>
            </div>
          </>
        )}

        <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" style={{ alignSelf: "flex-start" }} disabled={!canGenerate} onClick={generate} aria-label={`${rooms.length ? "Redraw" : "Draw"} from ${type || "the"} floor plan`} title={canGenerate ? `Rooms from the ${type} layout in Floor plans` : type ? `The ${type} floor plan has no room sizes yet` : "Choose the tour's unit type first"}>
          <Sparkles size={14} />
          {rooms.length ? "Redraw" : "Draw"} from the floor plan
        </button>
        {!canGenerate && (
          <span className="ad-help">{type ? `Add room sizes to ${type} in Floor plans to draw the minimap.` : "Choose the unit type in the tour settings below; its floor plan draws the minimap."}</span>
        )}

        {rooms.length > 0 && (
          <ul className={s.miniRooms} aria-label="Minimap rooms">
            {rooms.map((r, i) => (
              <li key={i}>
                <input className="ad-input" aria-label={`Label of room ${i + 1}`} value={r.label} maxLength={40} onChange={(e) => setRoom(i, { label: e.target.value.toUpperCase() })} />
                <select className="ad-input" aria-label={`Scene for ${r.label}`} value={scenes.some((x) => x.key === r.id) ? r.id : ""} onChange={(e) => link(i, e.target.value)}>
                  <option value="">No scene</option>
                  {scenes.map((x) => (
                    <option key={x.key} value={x.key}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="ad-btn ad-btn-icon" aria-label={`Remove ${r.label}`} onClick={() => onRooms(rooms.filter((_, j) => j !== i))}>
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {rooms.length > 0 && scenes.some((x) => !rooms.some((r) => r.id === x.key)) && (
          <button
            type="button"
            className="ad-btn ad-btn-ghost ad-btn-sm"
            style={{ alignSelf: "flex-start", paddingLeft: 0 }}
            onClick={() => {
              // Link scenes to rooms with matching names, then centre their markers.
              const taken = new Set(rooms.map((r) => r.id).filter((id) => scenes.some((x) => x.key === id)));
              const next = rooms.map((r) => {
                if (taken.has(r.id)) return r;
                const m = matchScene(r.label, scenes, taken);
                if (!m) return r;
                taken.add(m.key);
                return { ...r, id: m.key };
              });
              onRooms(next);
              onScenes(
                scenes.map((x) => {
                  const r = next.find((m) => m.id === x.key);
                  if (!r || rooms.some((o) => o.id === x.key)) return x;
                  const [planX, planY] = roomCentre(r);
                  return { ...x, planX, planY };
                }),
              );
            }}
          >
            Link scenes to rooms by name
          </button>
        )}
      </div>
    </section>
  );
}
