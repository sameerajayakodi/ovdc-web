"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import type { Tour, TourHotspotInfo } from "@/lib/types";
import { routes } from "@/lib/routes";
import { company } from "@/lib/data/content";
import { UNIT_STATUS } from "@/lib/status";
import { money, perSqft } from "@/lib/money";
import { usePrefs } from "@/components/providers/Preferences";
import s from "./tour.module.css";

const ICON_PLUS = "M12 5v14M5 12h14";
const ICON_X = "M18 6 6 18M6 6l12 12";

type Three = typeof THREE;

/**
 * Immersive 360° tour: equirectangular panoramas on an inverted sphere,
 * gold navigation markers between rooms, info hotspots, minimap with view
 * cone, day/night, VR split view, gyroscope, fullscreen and share.
 */
export function TourViewer({ tour, embedded = false, backHref }: { tour: Tour; embedded?: boolean; backHref?: string }) {
  const router = useRouter();
  const { currency } = usePrefs();
  const scenes = tour.scenes;

  const [scene, setScene] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [auto, setAuto] = useState(true);
  const [night, setNight] = useState(false);
  const [vr, setVr] = useState(false);
  const [gyro, setGyro] = useState(false);
  const [panel, setPanel] = useState(!embedded);
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [interacted, setInteracted] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [fading, setFading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const coneRefs = useRef<(SVGGElement | null)[]>([]);
  const hsEls = useRef<Record<string, HTMLDivElement | null>>({});

  // Mutable render state (read by the animation loop without re-rendering).
  const st = useRef({ lon: scenes[0].yaw, lat: 0, fov: 75, dragging: false, auto: true, night: false, vr: false, gyro: false, info: false, scene: 0 });
  const three = useRef<{
    T: Three;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    scene3: THREE.Scene;
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    v: THREE.Vector3;
    day: THREE.Color;
    nightC: THREE.Color;
  } | null>(null);
  const texCache = useRef<Record<string, THREE.Texture>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flash = useCallback((m: string) => {
    clearTimeout(toastTimer.current);
    setToast(m);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // Dev aid for placing hotspots: window.__tour.lon / .lat / .fov
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __tour: unknown }).__tour = st.current;
  }, []);

  // keep loop-visible flags in sync
  useEffect(() => {
    Object.assign(st.current, { auto, night, vr, gyro, info: !!openInfo, scene });
  }, [auto, night, vr, gyro, openInfo, scene]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 700px)");
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const panoFor = useCallback((i: number) => scenes[i].panorama ?? tour.panorama, [scenes, tour.panorama]);

  const getTexture = useCallback(async (url: string, track: boolean) => {
    const T = three.current!.T;
    if (texCache.current[url]) return texCache.current[url];
    let src = url;
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const total = Number(res.headers.get("content-length")) || 0;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        if (track && total) setProgress((p) => Math.max(p, Math.min(99, (got / total) * 100)));
      }
      src = URL.createObjectURL(new Blob(chunks as BlobPart[]));
    } catch {
      /* fall back to a direct image load */
    }
    const tex = await new Promise<THREE.Texture>((ok, no) => new T.TextureLoader().load(src, ok, undefined, no));
    tex.colorSpace = T.SRGBColorSpace;
    texCache.current[url] = tex;
    return tex;
  }, []);

  const applyScene = useCallback(
    (i: number, tex?: THREE.Texture) => {
      const t = three.current;
      if (!t) return;
      if (tex) {
        t.mat.map = tex;
        t.mat.needsUpdate = true;
      }
      t.mesh.rotation.y = (scenes[i].rot * Math.PI) / 180;
      st.current.lon = scenes[i].yaw;
      st.current.lat = 0;
    },
    [scenes],
  );

  // ── init three.js ──
  useEffect(() => {
    let raf = 0;
    let disposed = false;
    let ro: ResizeObserver | null = null;
    const el = mountRef.current!;
    const fake = setInterval(() => setProgress((p) => Math.min(92, p + (92 - p) * 0.06 + 0.4)), 80);
    const started = performance.now();
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      st.current.dragging = true;
      el.style.cursor = "grabbing";
      setInteracted(true);
      setOpenInfo(null);
    };
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 1) {
        const k = 0.12 * (st.current.fov / 75);
        st.current.lon -= dx * k;
        st.current.lat += dy * k;
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) st.current.fov = Math.max(30, Math.min(95, st.current.fov * (pinch / d)));
        pinch = d;
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
      st.current.dragging = pointers.size > 0;
      el.style.cursor = "grab";
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      st.current.fov = Math.max(30, Math.min(95, st.current.fov + e.deltaY * 0.04));
    };

    (async () => {
      try {
        const T = (await import("three")) as Three;
        if (disposed) return;
        const renderer = new T.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(el.clientWidth, el.clientHeight);
        renderer.domElement.style.display = "block";
        el.appendChild(renderer.domElement);
        const camera = new T.PerspectiveCamera(75, el.clientWidth / el.clientHeight, 1, 1100);
        const scene3 = new T.Scene();
        const geo = new T.SphereGeometry(500, 64, 40);
        geo.scale(-1, 1, 1);
        const mat = new T.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new T.Mesh(geo, mat);
        scene3.add(mesh);
        three.current = { T, renderer, camera, scene3, mesh, mat, v: new T.Vector3(), day: new T.Color(0xffffff), nightC: new T.Color(0x4b5a86) };

        ro = new ResizeObserver(() => {
          renderer.setSize(el.clientWidth, el.clientHeight);
          camera.aspect = el.clientWidth / el.clientHeight;
          camera.updateProjectionMatrix();
        });
        ro.observe(el);
        el.addEventListener("pointerdown", onDown);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        el.addEventListener("wheel", onWheel, { passive: false });

        const tex = await getTexture(panoFor(0), true);
        if (disposed) return;
        applyScene(0, tex);
        const wait = Math.max(0, 1200 - (performance.now() - started));
        clearInterval(fake);
        setProgress(100);
        setTimeout(() => !disposed && setLoading(false), wait + 300);

        const D = Math.PI / 180;
        const proj = new T.Vector3();
        const tick = () => {
          raf = requestAnimationFrame(tick);
          const S = st.current;
          if (S.auto && !S.dragging && !S.gyro && !S.info) S.lon += 0.035;
          S.lat = Math.max(-85, Math.min(85, S.lat));
          camera.fov += (S.fov - camera.fov) * 0.15;
          const phi = (90 - S.lat) * D;
          const th = S.lon * D;
          const v = three.current!.v;
          v.set(500 * Math.sin(phi) * Math.cos(th), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(th));
          camera.lookAt(v);
          mat.color.lerp(S.night ? three.current!.nightC : three.current!.day, 0.06);
          const w = el.clientWidth;
          const h = el.clientHeight;
          if (S.vr) {
            renderer.setScissorTest(true);
            camera.aspect = w / 2 / h;
            camera.updateProjectionMatrix();
            renderer.setViewport(0, 0, w / 2, h);
            renderer.setScissor(0, 0, w / 2, h);
            renderer.render(scene3, camera);
            renderer.setViewport(w / 2, 0, w / 2, h);
            renderer.setScissor(w / 2, 0, w / 2, h);
            renderer.render(scene3, camera);
            renderer.setScissorTest(false);
          } else {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setViewport(0, 0, w, h);
            renderer.render(scene3, camera);
          }
          // project hotspots
          const sc = scenes[S.scene];
          sc.hs.forEach((hs, i) => {
            const node = hsEls.current[`${sc.id}-${i}`];
            if (!node) return;
            const p2 = (90 - hs.pitch) * D;
            const t2 = hs.yaw * D;
            proj.set(400 * Math.sin(p2) * Math.cos(t2), 400 * Math.cos(p2), 400 * Math.sin(p2) * Math.sin(t2)).project(camera);
            const vis = proj.z < 1 && Math.abs(proj.x) < 1.2 && Math.abs(proj.y) < 1.2;
            node.style.transform = `translate(${((proj.x + 1) / 2) * w}px, ${((1 - proj.y) / 2) * h}px)`;
            node.style.opacity = vis ? "1" : "0";
            node.style.visibility = vis ? "visible" : "hidden";
          });
          coneRefs.current.forEach((g) => g?.setAttribute("transform", `translate(${sc.plan[0]} ${sc.plan[1]}) rotate(${S.lon})`));
        };
        tick();
      } catch (e) {
        console.warn("[tour]", e);
        clearInterval(fake);
        setError(true);
      }
    })();

    return () => {
      disposed = true;
      clearInterval(fake);
      cancelAnimationFrame(raf);
      ro?.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      const t = three.current;
      if (t) {
        t.renderer.dispose();
        t.renderer.domElement.remove();
        t.mat.dispose();
        t.mesh.geometry.dispose();
      }
      Object.values(texCache.current).forEach((x) => x.dispose());
      texCache.current = {};
      three.current = null;
    };
  }, [applyScene, getTexture, panoFor, scenes]);

  const goTo = useCallback(
    (i: number) => {
      if (i === scene || fading) return;
      setOpenInfo(null);
      setInteracted(true);
      if (!three.current) {
        setScene(i);
        return;
      }
      setFading(true);
      const url = panoFor(i);
      Promise.all([getTexture(url, false).catch(() => undefined), new Promise((r) => setTimeout(r, 280))]).then(([tex]) => {
        applyScene(i, tex as THREE.Texture | undefined);
        setScene(i);
        setTimeout(() => setFading(false), 60);
      });
    },
    [scene, fading, panoFor, getTexture, applyScene],
  );
  const goId = (id: string) => goTo(scenes.findIndex((x) => x.id === id));

  // gyroscope
  const oriRef = useRef<{ got: boolean; offset: number; handler: ((e: DeviceOrientationEvent) => void) | null }>({ got: false, offset: 0, handler: null });
  const stopGyro = useCallback(() => {
    if (oriRef.current.handler) window.removeEventListener("deviceorientation", oriRef.current.handler);
    oriRef.current.handler = null;
    setGyro(false);
  }, []);
  async function toggleGyro() {
    if (gyro) return stopGyro();
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      if (DOE?.requestPermission) {
        const p = await DOE.requestPermission();
        if (p !== "granted") return flash("Motion access was declined");
      }
    } catch {
      /* not supported */
    }
    oriRef.current.got = false;
    oriRef.current.offset = st.current.lon;
    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null) return;
      oriRef.current.got = true;
      st.current.lon = -e.alpha + oriRef.current.offset;
      st.current.lat = e.beta - 90;
    };
    oriRef.current.handler = handler;
    window.addEventListener("deviceorientation", handler);
    setGyro(true);
    setInteracted(true);
    flash("Move your phone to look around");
    setTimeout(() => {
      if (!oriRef.current.got && oriRef.current.handler) {
        stopGyro();
        flash("No motion sensor on this device");
      }
    }, 1500);
  }
  useEffect(() => () => stopGyro(), [stopGyro]);

  function share() {
    const url = window.location.origin + routes.tour(tour.id);
    if (navigator.share) navigator.share({ title: `${tour.title} · 360° tour`, url }).catch(() => {});
    else {
      navigator.clipboard?.writeText(url).catch(() => {});
      flash("Tour link copied");
    }
  }
  function fullscreen() {
    const el = rootRef.current;
    if (document.fullscreenElement) document.exitFullscreen();
    else el?.requestFullscreen?.().catch(() => flash("Fullscreen is blocked here"));
  }
  function close() {
    if (backHref) router.push(backHref);
    else if (window.history.length > 1) router.back();
    else router.push(routes.project(tour.projectSlug));
  }
  const zoomBy = (d: number) => (st.current.fov = Math.max(30, Math.min(95, st.current.fov + d)));

  const cur = scenes[scene];
  const sceneN = String(scene + 1).padStart(2, "0");
  const total = String(scenes.length).padStart(2, "0");
  const status = UNIT_STATUS[tour.status];
  const unitHref = routes.unit(tour.projectSlug, tour.unitRef);
  const visitHref = routes.bookVisit({ project: tour.projectSlug, unit: tour.unitRef });
  const openHs = cur.hs.map((h, i) => ({ h, key: `${cur.id}-${i}` })).find((x) => x.key === openInfo)?.h as TourHotspotInfo | undefined;
  const on = (a: boolean) => (a ? s.on : "");
  const planFill = (id: string) => (cur.id === id ? "rgba(196,160,90,.28)" : "rgba(239,233,221,.04)");

  const minimap = (big: boolean, idx: number) => (
    <svg viewBox="-6 -6 212 152" className={s.planSvg} role="img" aria-label={`Floor plan, you are in the ${cur.name}`}>
      {tour.planRooms.map((r) => (
        <rect
          key={r.id}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill={planFill(r.id)}
          stroke="rgba(239,233,221,.55)"
          strokeWidth={big ? 1.2 : 2}
          strokeDasharray={r.outdoor ? "3 2" : undefined}
          onClick={() => goId(r.id)}
          style={{ cursor: "pointer" }}
        >
          <title>{r.label}</title>
        </rect>
      ))}
      {big &&
        tour.planRooms.map((r) => (
          <text key={r.id} x={r.x + 7} y={r.y + 13} fill="rgba(239,233,221,.7)" fontFamily="var(--font-body)" fontSize={r.w > 100 && !r.outdoor ? 8 : 7} letterSpacing=".6" style={{ pointerEvents: "none" }}>
            {r.label}
          </text>
        ))}
      <g ref={(g) => void (coneRefs.current[idx] = g)} transform={`translate(${cur.plan[0]} ${cur.plan[1]})`} style={{ pointerEvents: "none" }}>
        <path d={big ? "M0 0 L34 -18 A38 38 0 0 1 34 18 Z" : "M0 0 L40 -22 A46 46 0 0 1 40 22 Z"} fill="rgba(196,160,90,.48)" />
        <circle r={big ? 5 : 8} fill="#c4a05a" stroke="#060d18" strokeWidth={big ? 1.5 : 2} />
      </g>
    </svg>
  );

  return (
    <div ref={rootRef} data-theme="dark" className={`${s.root} ${embedded ? s.embedded : ""}`}>
      <div ref={mountRef} className={s.mount} aria-label={`360° panorama of the ${cur.name}. Drag to look around.`} role="img" />
      <div className={s.nightGlow} style={{ opacity: night ? 1 : 0 }} />
      <div className={s.topShade} />
      <div className={s.bottomShade} />

      {/* hotspots */}
      <div className={s.hsLayer} style={{ opacity: vr || loading ? 0 : 1 }}>
        {cur.hs.map((h, i) => {
          const key = `${cur.id}-${i}`;
          if (h.t === "nav") {
            const target = scenes.find((x) => x.id === h.to)!;
            const n = String(scenes.indexOf(target) + 1).padStart(2, "0");
            return (
              <div key={key} ref={(el) => void (hsEls.current[key] = el)} className={s.hs}>
                <button className={s.navHs} onClick={() => goTo(scenes.indexOf(target))} aria-label={`Go to ${target.name}`}>
                  <span className={s.navRing} style={{ width: mobile ? 58 : 72, height: mobile ? 58 : 72 }}>
                    <span className={s.navDot}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="m17 11-5-5-5 5M17 18l-5-5-5 5" />
                      </svg>
                    </span>
                  </span>
                  <span className={s.navLabel}>
                    <span style={{ color: "#c4a05a" }}>{n}</span>
                    {target.name}
                  </span>
                </button>
              </div>
            );
          }
          const open = openInfo === key;
          return (
            <div key={key} ref={(el) => void (hsEls.current[key] = el)} className={s.hs}>
              <button
                className={s.infoHs}
                style={{ background: open ? "#c4a05a" : "#f6f3ed" }}
                aria-expanded={open}
                aria-label={h.title}
                onClick={() => {
                  setOpenInfo(open ? null : key);
                  setInteracted(true);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                  <path d={open ? ICON_X : ICON_PLUS} />
                </svg>
              </button>
              {open && !mobile && (
                <div className={s.infoCard}>
                  <div className={s.infoHead}>
                    <span>{h.kicker}</span>
                    <button onClick={() => setOpenInfo(null)} aria-label="Close">
                      ×
                    </button>
                  </div>
                  <span className={s.infoTitle}>{h.title}</span>
                  <span className={s.infoBody}>{h.body}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {vr && (
        <>
          <div className={s.vrSplit} />
          <div className={s.vrDot} style={{ left: "25%" }} />
          <div className={s.vrDot} style={{ left: "75%" }} />
        </>
      )}

      {!interacted && !loading && !vr && (
        <div className={s.hint}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c4a05a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
          <span>{mobile ? "Drag or move your phone · Pinch to zoom" : "Drag to look around · Scroll to zoom"}</span>
        </div>
      )}

      {!mobile ? (
        <>
          <div className={s.titleBlock}>
            {!embedded && (
              <div className={s.brandRow}>
                <span className={s.brand}>OVDC</span>
                <span className={s.brandSep} />
                <span className={s.brandSub}>
                  {tour.projectName} · Unit {tour.unitRef.split("-")[1]} · Virtual tour
                </span>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className={s.sceneN}>
                {sceneN} / {total}
              </span>
              <span className={s.sceneName} style={{ fontSize: embedded ? 48 : 64 }}>
                {cur.name}
              </span>
              <span className={s.sceneNote}>{cur.note}</span>
            </div>
          </div>

          <div className={s.toolbar}>
            <div className={s.tools}>
              <button onClick={() => setAuto((a) => !a)} title="Auto-rotate" aria-pressed={auto} className={on(auto)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </button>
              <button onClick={() => setNight(false)} title="Day view" aria-pressed={!night} className={`${s.wide} ${on(!night)}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
                Day
              </button>
              <button onClick={() => setNight(true)} title="Night view" aria-pressed={night} className={`${s.wide} ${on(night)}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
                Night
              </button>
              <button onClick={() => zoomBy(10)} title="Zoom out" aria-label="Zoom out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M5 12h14" />
                </svg>
              </button>
              <button onClick={() => zoomBy(-10)} title="Zoom in" aria-label="Zoom in">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M5 12h14M12 5v14" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const v = !vr;
                  setVr(v);
                  setOpenInfo(null);
                  if (!embedded) setPanel(!v);
                  if (v) flash("VR view · place your phone in a headset");
                }}
                title="VR mode"
                aria-pressed={vr}
                className={on(vr)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="6" cy="15" r="4" />
                  <circle cx="18" cy="15" r="4" />
                  <path d="M14 15a2 2 0 0 0-4 0M2.5 13 5 7c.7-1.3 1.4-2 3-2M21.5 13 19 7c-.7-1.3-1.5-2-3-2" />
                </svg>
              </button>
              <button onClick={share} title="Share" aria-label="Share tour">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
                </svg>
              </button>
              <button onClick={fullscreen} title="Fullscreen" aria-label="Fullscreen">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
              {!embedded && (
                <button onClick={() => setPanel((p) => !p)} title="Unit details" aria-pressed={panel} className={on(panel)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" />
                    <path d="M15 3v18" />
                  </svg>
                </button>
              )}
            </div>
            {!embedded && (
              <button onClick={close} className={s.close}>
                Close
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {panel && !embedded && (
            <aside className={s.panel} aria-label="Unit details">
              <div className={s.panelHead}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span className={s.panelKicker}>
                    Unit {tour.unitRef.split("-")[1]} · {tour.typeLabel} · {tour.floorLabel}
                  </span>
                  <span className={s.avail}>
                    <span />
                    {status.label}
                  </span>
                </div>
                <span className={s.panelTitle}>{tour.title}</span>
                <span className={s.panelSub}>
                  {tour.projectName}, {tour.projectLoc}
                </span>
              </div>
              <div className={s.panelSpecs}>
                <div>
                  <span>Interior</span>
                  <span>{tour.interior.toLocaleString("en-US")} sqft</span>
                </div>
                <div>
                  <span>Terrace</span>
                  <span>{tour.terrace} sqft</span>
                </div>
                <div>
                  <span>Bedrooms</span>
                  <span>{tour.bedrooms}</span>
                </div>
                <div>
                  <span>Bathrooms</span>
                  <span>{tour.bathrooms}</span>
                </div>
              </div>
              <div className={s.panelPrice}>
                <span className={s.panelKicker} style={{ color: "#c4a05a" }}>
                  Price
                </span>
                <span className={s.priceBig}>{money(tour.price, currency)}</span>
                <span className={s.panelSub} style={{ fontSize: 12 }}>
                  {perSqft(tour.price, tour.interior, currency)} · 20% to reserve · {tour.parking}
                </span>
              </div>
              <div className={s.panelCtas}>
                <Link className="btn btn-primary btn-block" href={visitHref}>
                  Book a site visit<span aria-hidden>→</span>
                </Link>
                <Link className={`btn btn-secondary btn-block ${s.ghostLight}`} href={unitHref}>
                  View unit details<span aria-hidden>→</span>
                </Link>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
                  <a className="btn btn-ghost" href={company.whatsappHref} target="_blank" rel="noopener" style={{ color: "#efe9dd", fontSize: 12 }}>
                    WhatsApp sales
                  </a>
                  <Link className="btn btn-ghost" href={`${unitHref}#plan`} style={{ color: "#efe9dd", fontSize: 12 }}>
                    Floor plan
                  </Link>
                </div>
              </div>
            </aside>
          )}

          <div className={s.planCard}>
            <div className={s.planHead}>
              <span>Floor plan · {tour.typeLabel}</span>
              <span style={{ color: "#c4a05a" }}>N ↑</span>
            </div>
            {minimap(true, 0)}
            <span className={s.planFoot}>You are here · {cur.name}</span>
          </div>

          <div className={s.strip} style={{ right: panel && !embedded ? 396 : 32 }}>
            {scenes.map((x, i) => (
              <button key={x.id} onClick={() => goTo(i)} className={s.thumb} aria-current={i === scene} aria-label={`Go to ${x.name}`}>
                <span className={s.thumbImg}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={x.thumb ?? x.panorama ?? tour.panorama} alt="" style={{ objectPosition: x.pos, filter: night ? "brightness(.55) saturate(.7)" : "none" }} />
                </span>
                <span className={s.thumbLabel}>
                  <span style={{ color: "#c4a05a" }}>{String(i + 1).padStart(2, "0")}</span>
                  {x.name}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className={s.mTop}>
            {!embedded && (
              <button onClick={close} aria-label="Close tour" className={s.mBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, paddingTop: 2, minWidth: 0 }}>
              <span className={s.sceneN} style={{ fontSize: 10 }}>
                {sceneN} / {total} · Unit {tour.unitRef.split("-")[1]}
              </span>
              <span className={s.sceneName} style={{ fontSize: 30, lineHeight: 1 }}>
                {cur.name}
              </span>
            </div>
            <button onClick={share} aria-label="Share tour" className={s.mBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
              </svg>
            </button>
          </div>

          <div className={s.mPlan}>{minimap(false, 1)}</div>

          <div className={s.mTools}>
            <button onClick={() => setAuto((a) => !a)} aria-label="Auto-rotate" aria-pressed={auto} className={on(auto)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
            <button onClick={toggleGyro} aria-label="Gyroscope" aria-pressed={gyro} className={on(gyro)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <rect x="6" y="2" width="12" height="20" />
                <path d="M12 18h.01M2 9a10 10 0 0 0 0 6M22 9a10 10 0 0 1 0 6" />
              </svg>
            </button>
            <button onClick={() => setNight((n) => !n)} aria-label="Day / night" aria-pressed={night} className={on(night)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </button>
            <button
              onClick={() => {
                const v = !vr;
                setVr(v);
                setOpenInfo(null);
                if (v) flash("VR view · place your phone in a headset");
              }}
              aria-label="VR mode"
              aria-pressed={vr}
              className={on(vr)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="6" cy="15" r="4" />
                <circle cx="18" cy="15" r="4" />
                <path d="M14 15a2 2 0 0 0-4 0M2.5 13 5 7c.7-1.3 1.4-2 3-2M21.5 13 19 7c-.7-1.3-1.5-2-3-2" />
              </svg>
            </button>
            <button onClick={fullscreen} aria-label="Fullscreen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
          </div>

          {openHs && (
            <div className={s.mInfo} style={{ bottom: sheet ? 330 : embedded ? 96 : 176 }}>
              <div className={s.infoHead} style={{ padding: "14px 16px 0" }}>
                <span>{openHs.kicker}</span>
                <button onClick={() => setOpenInfo(null)} aria-label="Close" style={{ width: 44, height: 44, margin: "-12px -12px -12px 0", fontSize: 22 }}>
                  ×
                </button>
              </div>
              <span className={s.infoTitle} style={{ padding: "4px 16px 0" }}>
                {openHs.title}
              </span>
              <span className={s.infoBody} style={{ fontSize: 14 }}>
                {openHs.body}
              </span>
            </div>
          )}

          <div className={s.mBottom}>
            <div className={s.mStrip}>
              {scenes.map((x, i) => (
                <button key={x.id} onClick={() => goTo(i)} className={s.mThumb} aria-current={i === scene} aria-label={`Go to ${x.name}`}>
                  <span className={s.mThumbImg}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={x.thumb ?? x.panorama ?? tour.panorama} alt="" style={{ objectPosition: x.pos, filter: night ? "brightness(.55) saturate(.7)" : "none" }} />
                  </span>
                  <span className={s.mThumbLabel}>{x.short}</span>
                </button>
              ))}
            </div>
            {!embedded && (
              <div className={s.mSheet}>
                {sheet && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 16px 4px" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: 28, lineHeight: 1.05 }}>{tour.title}</span>
                    <div className={s.mSpecs}>
                      <div>
                        <span>Area</span>
                        <span>{tour.interior.toLocaleString("en-US")} ft²</span>
                      </div>
                      <div>
                        <span>Beds</span>
                        <span>{tour.bedrooms.split(" ")[0]}</span>
                      </div>
                      <div>
                        <span>Baths</span>
                        <span>{tour.bathrooms}</span>
                      </div>
                      <div>
                        <span>Floor</span>
                        <span>{tour.floorLabel.replace("Floor ", "")}</span>
                      </div>
                    </div>
                    <Link className={`btn btn-secondary btn-block ${s.ghostLight}`} href={unitHref}>
                      View unit details<span aria-hidden>→</span>
                    </Link>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px 20px 16px" }}>
                  <button onClick={() => setSheet((v) => !v)} className={s.mSheetBtn} aria-expanded={sheet}>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#9fd0b5" }}>
                      ● {status.label} · {sheet ? "Hide details" : `${tour.interior.toLocaleString("en-US")} sqft · Details`}
                    </span>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: 24, lineHeight: 1 }}>{money(tour.price, currency)}</span>
                  </button>
                  <Link className="btn btn-primary" href={visitHref} style={{ flex: "none", minHeight: 52 }}>
                    Book visit<span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {toast && <div className={s.toast}>{toast}</div>}

      <div className={s.fade} style={{ opacity: fading ? 1 : 0 }} />

      {loading && (
        <div className={s.loader} role="status" aria-live="polite">
          <span className={s.brand} style={{ fontSize: 26 }}>
            OVDC
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 640 }}>
            <span className={s.sceneN} style={{ fontSize: 11, letterSpacing: ".16em" }}>
              {tour.projectName} · Unit {tour.unitRef.split("-")[1]}
            </span>
            <span className={s.loaderTitle}>
              Preparing your
              <br />
              <em>virtual tour</em>
            </span>
            <span style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(239,233,221,.7)", maxWidth: "44ch" }}>
              {scenes.length} rooms, captured at eye level. Drag to look around, use the gold markers to move between rooms.
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
              <span style={{ fontSize: 12, color: "rgba(239,233,221,.7)" }}>
                {error ? "Couldn’t load the panorama. Check your connection and try again." : progress >= 100 ? "Ready" : `Loading ${cur.name} panorama`}
              </span>
              <span className={s.loaderPct}>{Math.round(progress)}%</span>
            </div>
            <div className={s.loaderBar}>
              <div style={{ width: `${Math.round(progress)}%` }} />
            </div>
            <div className={s.loaderScenes}>
              {scenes.map((x, i) => (
                <span key={x.id}>
                  {String(i + 1).padStart(2, "0")} {x.short}
                </span>
              ))}
            </div>
            {error && (
              <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => window.location.reload()}>
                Try again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
