import { QueryClient, useMutation, useQuery } from '@tanstack/react-query';
import type { RunState } from '@/game/state';
import { LocalStorageRepository } from './local-storage';
import type { SaveRepository } from './repository';
import { SAVE_VERSION } from './schema';

export const MAIN_SLOT = 'main';

export const repository: SaveRepository = new LocalStorageRepository();

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, retry: false } },
});

export const saveKey = (slot: string) => ['save', slot] as const;

export function useSaveQuery(slot = MAIN_SLOT) {
  return useQuery({ queryKey: saveKey(slot), queryFn: () => repository.load(slot) });
}

export async function saveRun(run: RunState, slot = MAIN_SLOT): Promise<void> {
  await repository.save(slot, { version: SAVE_VERSION, savedAt: new Date().toISOString(), run });
  await queryClient.invalidateQueries({ queryKey: saveKey(slot) });
}

export async function deleteSave(slot = MAIN_SLOT): Promise<void> {
  await repository.remove(slot);
  await queryClient.invalidateQueries({ queryKey: saveKey(slot) });
}

export function useSaveMutation(slot = MAIN_SLOT) {
  return useMutation({ mutationFn: (run: RunState) => saveRun(run, slot) });
}
