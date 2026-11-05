import { Registry } from '@/core/registry';
import type {
  BehaviorId,
  BuffId,
  CreatureId,
  HookTraitId,
  ItemId,
  MineralId,
  ModuleId,
  TalentId,
} from '@/content/ids';
import type {
  BehaviorDef,
  BuffDef,
  CreatureDef,
  HookTraitDef,
  ItemDef,
  MineralDef,
  ModuleDef,
  TalentDef,
} from './defs';

export const R = {
  minerals: new Registry<MineralId, MineralDef>('minerals'),
  creatures: new Registry<CreatureId, CreatureDef>('creatures'),
  behaviors: new Registry<BehaviorId, BehaviorDef>('behaviors'),
  items: new Registry<ItemId, ItemDef>('items'),
  buffs: new Registry<BuffId, BuffDef>('buffs'),
  modules: new Registry<ModuleId, ModuleDef>('modules'),
  hookTraits: new Registry<HookTraitId, HookTraitDef>('hookTraits'),
  talents: new Registry<TalentId, TalentDef>('talents'),
};

export function freezeRegistries(): void {
  for (const reg of Object.values(R)) reg.freeze();
}
