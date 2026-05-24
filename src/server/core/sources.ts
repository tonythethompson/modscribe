import type { SourceSnapshot } from '../../shared/types.js';
import { getArchiveRecord, getNominee } from './db.js';

/** Load snapshots for prior article sources (inbox or archive). */
export async function loadPriorSourceSnapshots(
  sourceIds: string[],
  excludeSourceId: string
): Promise<SourceSnapshot[]> {
  const snapshots: SourceSnapshot[] = [];

  for (const id of sourceIds) {
    if (id === excludeSourceId) continue;

    const inbox = await getNominee(id);
    if (inbox) {
      snapshots.push(inbox.snapshot);
      continue;
    }

    const archived = await getArchiveRecord(id);
    if (archived) {
      snapshots.push(archived.snapshot);
    }
  }

  return snapshots;
}
