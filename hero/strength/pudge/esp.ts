import {
  Color,
  EntityManager,
  ExecuteOrder,
  Hero,
  LocalPlayer,
  RendererSDK,
  Vector2,
  Vector3,
} from "github.com/octarine-public/wrapper/index";
import { PudgeConfig } from "./config";
import { isDirectionStable, timeToEnterRange, calcCastPos } from "./tracker";

function drawDotCircle(
  cx: number,
  cy: number,
  cz: number,
  r: number,
  col: Color,
  segs = 64,
): void {
  for (let i = 0; i < segs; i++) {
    if (i % 2 !== 0) {
      continue;
    }
    const a = (i / segs) * Math.PI * 2;
    const sp = RendererSDK.WorldToScreen(
      new Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz),
    );
    if (sp !== null && sp !== undefined) {
      RendererSDK.FilledCircle(sp, new Vector2(3, 3), col);
    }
  }
}

function drawLine(a: Vector2, b: Vector2, col: Color): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) {
    return;
  }
  const steps = Math.ceil(len / 5);
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    RendererSDK.FilledCircle(
      new Vector2(a.x + dx * f, a.y + dy * f),
      new Vector2(2, 2),
      col,
    );
  }
}

export function drawEsp(): void {
  const hasLocalHero =
    LocalPlayer !== undefined &&
    LocalPlayer.Hero !== undefined &&
    LocalPlayer.Hero.IsValid &&
    LocalPlayer.Hero.Name === "npc_dota_hero_pudge";

  if (!hasLocalHero || ExecuteOrder.DisableHumanizer) {
    return;
  }
  const hero = LocalPlayer?.Hero;
  if (!hero || !hero.IsValid || !hero.IsAlive) {
    return;
  }

  const hook = hero.GetAbilityByName("pudge_meat_hook");
  const hookRange =
    hook && hook.IsValid && hook.Level > 0 && hook.CastRange > 0
      ? hook.CastRange
      : 1300;
  const hookReady =
    hook !== undefined && hook.IsValid && hook.Level > 0 && hook.Cooldown <= 0.1;

  if (PudgeConfig.espRangeCircle.value) {
    const p = hero.Position;
    const col = hookReady ? Color.Aqua.SetA(180) : Color.Gray.SetA(100);
    drawDotCircle(p.x, p.y, p.z, hookRange, col);
  }

  for (const en of EntityManager.GetEntitiesByClass(Hero)) {
    if (
      !en.IsValid ||
      !en.IsAlive ||
      !en.IsVisible ||
      !en.IsEnemy(hero) ||
      en.IsIllusion
    ) {
      continue;
    }

    // @ts-ignore
    const sp = RendererSDK.WorldToScreen(en.Position) as Vector2 | null;
    if (sp === null) {
      continue;
    }

    const dist = hero.Distance2D(en);
    const inRange = dist <= hookRange;
    const stable = isDirectionStable(en.Index);

    if (PudgeConfig.espRangeLabel.value) {
      const tte = inRange ? 0 : timeToEnterRange(hero, en, hookRange);
      let label: string;
      let col: Color;

      if (inRange && hookReady) {
        label = stable ? "[ HOOK READY ]" : "[ HOOK READY — ROTATING ]";
        col = stable ? Color.Green : Color.Red;
      } else if (inRange) {
        label = stable ? "[ IN RANGE ]" : "[ IN RANGE — ROTATING ]";
        col = stable ? Color.Yellow : Color.Red;
      } else if (tte !== null) {
        label = `[ ENTERING ${tte.toFixed(1)}s ]`;
        col = Color.Yellow;
      } else {
        label = `[ ${Math.round(dist)}u / ${hookRange}u ]`;
        col = Color.White.SetA(150);
      }

      const font = "PTSans";
      const sz = RendererSDK.GetTextSize(label, font, 11, 700, false);
      const tp = new Vector2(sp.x - sz.x / 2, sp.y - 42);
      RendererSDK.FilledRect(
        new Vector2(tp.x - 4, tp.y - 2),
        new Vector2(sz.x + 8, sz.y + 4),
        Color.Black.SetA(160),
      );
      RendererSDK.Text(label, tp, col, font, 11, 700, false, true);
    }

    // @ts-ignore
    if (PudgeConfig.espHookLine.value && PudgeConfig.comboKey.isPressed && inRange) {
      const cast = calcCastPos(hero, en, hookRange);
      // @ts-ignore
      const hs = RendererSDK.WorldToScreen(hero.Position) as Vector2 | null;
      // @ts-ignore
      const cs = RendererSDK.WorldToScreen(
        new Vector3(cast.x, cast.y, cast.z),
      ) as Vector2 | null;
      if (hs !== null && cs !== null) {
        const col = stable ? Color.Aqua.SetA(220) : Color.Red.SetA(220);
        drawLine(hs, cs, col);
        RendererSDK.FilledCircle(cs, new Vector2(7, 7), col);
      }
    }
  }
}
