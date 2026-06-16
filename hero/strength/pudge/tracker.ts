import {
 Creep,
 EntityManager,
 GameState,
 Hero,
 Vector3,
} from "github.com/octarine-public/wrapper/index";

import { PudgeConfig } from "./config";
import { PudgeState } from "./state";

export const HOOK_SPEED = 1600;
export const STABILITY_WINDOW = 0.45;

export function updateTracker(enemy: Hero): void {
 const now = GameState.RawGameTime;
 const pos = enemy.Position;
 const idx = enemy.Index;
 const t = PudgeState.trackerMap.get(idx);

 if (!t) {
  PudgeState.trackerMap.set(idx, {
   lastX: pos.x,
   lastY: pos.y,
   lastZ: pos.z,
   lastTime: now,
   samples: [],
  });
  return;
 }
 const dt = now - t.lastTime;
 if (dt < 0.016) {
  return;
 }

 const vx = (pos.x - t.lastX) / dt;
 const vy = (pos.y - t.lastY) / dt;
 t.samples.push({ vx, vy, time: now });

 const cutoff = now - 0.5;
 t.samples = t.samples.filter((s) => s.time >= cutoff);
 t.lastX = pos.x;
 t.lastY = pos.y;
 t.lastZ = pos.z;
 t.lastTime = now;
}

export function getVelocity(idx: number): { vx: number; vy: number } {
 const t = PudgeState.trackerMap.get(idx);
 if (!t || t.samples.length === 0) {
  return { vx: 0, vy: 0 };
 }
 const last = t.samples[t.samples.length - 1];
 return { vx: last.vx, vy: last.vy };
}

export function isDirectionStable(idx: number): boolean {
 const t = PudgeState.trackerMap.get(idx);
 if (!t || t.samples.length < 2) {
  return true;
 }

 const now = GameState.RawGameTime;
 const window = t.samples.filter((s) => s.time >= now - STABILITY_WINDOW);
 if (window.length < 2) {
  return true;
 }

 const moving = window.filter((s) => Math.sqrt(s.vx * s.vx + s.vy * s.vy) > 20);
 if (moving.length < 2) {
  return true;
 } // stationary = stable

 const refAngle = Math.atan2(moving[0].vy, moving[0].vx) * (180 / Math.PI);
 const threshold = PudgeConfig.stableThreshDeg.value;

 for (let i = 1; i < moving.length; i++) {
  let diff =
   Math.atan2(moving[i].vy, moving[i].vx) * (180 / Math.PI) - refAngle;
  while (diff > 180) {
   diff -= 360;
  }
  while (diff < -180) {
   diff += 360;
  }
  if (Math.abs(diff) > threshold) {
   return false;
  }
 }
 return true;
}

export function solveIntercept(
 px: number,
 py: number,
 tx: number,
 ty: number,
 vx: number,
 vy: number,
): number | null {
 const dx = tx - px;
 const dy = ty - py;
 const a = vx * vx + vy * vy - HOOK_SPEED * HOOK_SPEED;
 const b = 2 * (dx * vx + dy * vy);
 const c = dx * dx + dy * dy;

 if (Math.abs(a) < 1e-4) {
  if (Math.abs(b) < 1e-4) {
   return null;
  }
  const t = -c / b;
  return t > 0 ? t : null;
 }
 const disc = b * b - 4 * a * c;
 if (disc < 0) {
  return null;
 }

 const sq = Math.sqrt(disc);
 const t1 = (-b - sq) / (2 * a);
 const t2 = (-b + sq) / (2 * a);

 if (t1 > 0 && t2 > 0) {
  return Math.min(t1, t2);
 }
 if (t1 > 0) {
  return t1;
 }
 if (t2 > 0) {
  return t2;
 }
 return null;
}

export function calcCastPos(
 hero: Hero,
 target: Hero,
 hookRange: number,
): Vector3 {
 const hp = hero.Position;
 const tp = target.Position;
 const vel = getVelocity(target.Index);
 const bufSec = PudgeConfig.predBufMs.value / 1000 + GameState.InputLag;

 const t = solveIntercept(hp.x, hp.y, tp.x, tp.y, vel.vx, vel.vy);
 let cx: number;
 let cy: number;

 if (t !== null && t < 5) {
  const totalT = t + bufSec;
  cx = tp.x + vel.vx * totalT;
  cy = tp.y + vel.vy * totalT;
 } else {
  cx = tp.x;
  cy = tp.y;
 }

 const dx = cx - hp.x;
 const dy = cy - hp.y;
 const dist = Math.sqrt(dx * dx + dy * dy);
 if (dist > hookRange) {
  const ratio = hookRange / dist;
  cx = hp.x + dx * ratio;
  cy = hp.y + dy * ratio;
 }

 return new Vector3(cx, cy, tp.z);
}

export function timeToEnterRange(
 hero: Hero,
 target: Hero,
 hookRange: number,
): number | null {
 const dist = hero.Distance2D(target);
 if (dist <= hookRange) {
  return 0;
 }

 const vel = getVelocity(target.Index);
 const dx = target.Position.x - hero.Position.x;
 const dy = target.Position.y - hero.Position.y;
 const len = Math.sqrt(dx * dx + dy * dy);
 if (len < 1) {
  return null;
 }

 const approach = -((vel.vx * dx + vel.vy * dy) / len);
 if (approach <= 0) {
  return null;
 }

 const secs = (dist - hookRange) / approach;
 return secs <= PudgeConfig.espApproachSec.value ? secs : null;
}

export function distToSegmentSquared(
 px: number,
 py: number,
 vx: number,
 vy: number,
 wx: number,
 wy: number,
): number {
 const l2 = (wx - vx) * (wx - vx) + (wy - vy) * (wy - vy);
 if (l2 === 0) {
  return (px - vx) * (px - vx) + (py - vy) * (py - vy);
 }
 let t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
 t = Math.max(0, Math.min(1, t));
 const projX = vx + t * (wx - vx);
 const projY = vy + t * (wy - vy);
 return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

export function isHookBlocked(
 hero: Hero,
 target: Hero,
 castPos: Vector3,
 radius: number,
): boolean {
 const hpos = hero.Position;
 const r2 = radius * radius;

 for (const creep of EntityManager.GetEntitiesByClass(Creep)) {
  if (!creep.IsValid || !creep.IsAlive || !creep.IsVisible) {
   continue;
  }
  const cpos = creep.Position;
  const d2 = distToSegmentSquared(
   cpos.x,
   cpos.y,
   hpos.x,
   hpos.y,
   castPos.x,
   castPos.y,
  );
  if (d2 <= r2) {
   return true;
  }
 }

 for (const en of EntityManager.GetEntitiesByClass(Hero)) {
  if (
   !en.IsValid ||
   !en.IsAlive ||
   !en.IsVisible ||
   en.Index === hero.Index ||
   en.Index === target.Index
  ) {
   continue;
  }
  const epos = en.Position;
  const d2 = distToSegmentSquared(
   epos.x,
   epos.y,
   hpos.x,
   hpos.y,
   castPos.x,
   castPos.y,
  );
  if (d2 <= r2) {
   return true;
  }
 }

 return false;
}
