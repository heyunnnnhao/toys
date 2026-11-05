import { UNLOCKS } from '@/config/levels';
import { R, freezeRegistries } from '@/game/registries';
import { patrol } from './behaviors/patrol';
import { blastHelmet } from './items/blast-helmet';
import { clover, polish, rockBook, strength } from './buffs/buffs';
import { hedgehog } from './creatures/hedgehog';
import { diamondPig, pig } from './creatures/pig';
import { contract, steadyRope, treasureMap } from './buffs/more-buffs';
import { aimLine } from './hook-traits/aim-line';
import { appraise } from './hook-traits/appraise';
import { magnetPull } from './hook-traits/magnet-pull';
import { heavyLift, lucky, quickReturn, thickGlove } from './hook-traits/more-traits';
import { pierceRock } from './hook-traits/pierce-rock';
import { adrenaline } from './items/adrenaline';
import { defuse } from './items/defuse';
import { goldRain } from './items/gold-rain';
import { luckyCoin } from './items/lucky-coin';
import { doubleCard } from './items/double-card';
import { midas } from './items/midas';
import { rockBlast } from './items/rock-blast';
import { killPath } from './hook-traits/kill-path';
import { MODULES } from './modules/modules';
import { freeze } from './items/freeze';
import { hourglass } from './items/hourglass';
import { magnet } from './items/magnet';
import { pigFeed } from './items/pig-feed';
import { xray } from './items/xray';
import { goldL, goldM, goldS, goldXl } from './minerals/gold';
import { bone, debris, diamond, ruby } from './minerals/misc';
import { mysteryBag } from './minerals/mystery-bag';
import { rockL, rockS } from './minerals/rock';
import { tnt } from './minerals/tnt';
import { TALENTS } from './talents/talents';

let registered = false;

/** Registers every content definition once, then freezes the registries. */
export function registerAllContent(): void {
  if (registered) return;
  registered = true;

  for (const m of [goldS, goldM, goldL, goldXl, rockS, rockL, diamond, ruby, bone, mysteryBag, tnt, debris])
    R.minerals.register(m);
  for (const c of [pig, diamondPig, hedgehog]) R.creatures.register(c);
  R.behaviors.register(patrol);
  for (const i of [
    freeze,
    hourglass,
    magnet,
    xray,
    pigFeed,
    blastHelmet,
    adrenaline,
    defuse,
    goldRain,
    luckyCoin,
    rockBlast,
    midas,
    doubleCard,
  ])
    R.items.register(i);
  for (const b of [strength, clover, rockBook, polish, steadyRope, treasureMap, contract])
    R.buffs.register(b);
  for (const m of MODULES) R.modules.register(m);
  for (const t of [aimLine, killPath, pierceRock, appraise, magnetPull, quickReturn, heavyLift, thickGlove, lucky])
    R.hookTraits.register(t);
  for (const t of TALENTS) R.talents.register(t);

  freezeRegistries();
  if (import.meta.env?.DEV) validateContent();
}

/** Checks cross references between content and config. Throws on the first problem. */
export function validateContent(): void {
  const fail = (msg: string) => {
    throw new Error(`[content] ${msg}`);
  };
  for (const u of UNLOCKS) {
    for (const id of u.minerals ?? [])
      if (!R.minerals.has(id)) fail(`unlock references unknown mineral ${id}`);
    for (const id of u.creatures ?? [])
      if (!R.creatures.has(id)) fail(`unlock references unknown creature ${id}`);
  }
  for (const c of R.creatures.all()) {
    for (const b of c.behaviors) if (!R.behaviors.has(b)) fail(`${c.id} uses unknown behavior ${b}`);
  }
  for (const m of R.modules.all()) {
    for (const t of m.traits) if (!R.hookTraits.has(t)) fail(`${m.id} uses unknown trait ${t}`);
    if (m.price <= 0) fail(`${m.id} has no price`);
  }
  for (const m of R.minerals.all()) {
    if (m.value < 0 || m.weight <= 0 || m.radius <= 0) fail(`${m.id} has invalid numbers`);
  }
}
