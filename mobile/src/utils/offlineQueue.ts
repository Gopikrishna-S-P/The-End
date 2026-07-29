// Local queue for offline-submitted PTPs, collections, and visit logs that fail
// with a network error (not a validation error) — replayed once connectivity
// returns, instead of losing the field officer's work. PTPs and collections
// replay through the server's batched sync endpoint (POST /api/v1/agent/sync —
// see AgentSyncRequest/"design-doc §7.6"). Visit logs do NOT: the backend's
// AgentSyncServiceImpl rejects VISIT_METADATA on that endpoint by design
// ("visits with photos go through POST /api/v1/visit-logs (multipart); this
// batch endpoint is for COLLECTION + PTP only in v1") — see trySync() below.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { agentFieldApi } from '@/api/agentFieldApi';
import { visitLogApi } from '@/api/visitLogApi';
import { isNetworkError } from '@/utils/extractApiError';
import type { AgentSyncItem, SyncItemKind } from '@/types/agentField';
import type { CreatePtpRequest, SubmitCollectionRequest, VisitLogRequest } from '@/types/domain';

const STORAGE_KEY = 'rp_offline_sync_queue';

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

function notify(count: number) {
  listeners.forEach((fn) => fn(count));
}

export function subscribeQueueCount(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function readQueue(): Promise<AgentSyncItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AgentSyncItem[]) : [];
}

async function writeQueue(items: AgentSyncItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notify(items.length);
}

function newClientId(): string {
  return 'q-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export async function queueCount(): Promise<number> {
  return (await readQueue()).length;
}

export async function enqueuePtp(ptp: CreatePtpRequest): Promise<void> {
  const queue = await readQueue();
  queue.push({ clientId: newClientId(), kind: 'PTP', ptp });
  await writeQueue(queue);
}

export async function enqueueCollection(collection: SubmitCollectionRequest): Promise<void> {
  const queue = await readQueue();
  queue.push({ clientId: newClientId(), kind: 'COLLECTION', collection });
  await writeQueue(queue);
}

export async function enqueueVisitMetadata(visit: VisitLogRequest, idempotencyKey: string): Promise<void> {
  const queue = await readQueue();
  queue.push({ clientId: newClientId(), kind: 'VISIT_METADATA', visit, idempotencyKey });
  await writeQueue(queue);
}

export interface SyncResult {
  attempted: number;
  succeeded: number;
  failed: number;
  failedKinds: SyncItemKind[];
}

/** Best-effort — silently no-ops if the sync request itself can't reach the server. */
export async function trySync(): Promise<SyncResult | null> {
  const queue = await readQueue();
  if (queue.length === 0) return null;

  const visitItems = queue.filter((item) => item.kind === 'VISIT_METADATA');
  const batchItems = queue.filter((item) => item.kind !== 'VISIT_METADATA');

  const succeededIds = new Set<string>();
  const failedKinds: SyncItemKind[] = [];
  let succeeded = 0;
  let failed = 0;

  // Visits replay individually against POST /api/v1/visit-logs (matching the
  // live foreground submit path), not through the batch endpoint below — see
  // this file's header comment. The idempotency key was minted once when the
  // item was enqueued and is reused on every retry, so a submit that actually
  // succeeded server-side but whose response got lost to a network drop
  // doesn't create a duplicate visit log on the next sync attempt.
  for (const item of visitItems) {
    if (!item.visit || !item.idempotencyKey) continue;
    try {
      await visitLogApi.create(item.visit, [], item.idempotencyKey);
      succeededIds.add(item.clientId);
      succeeded++;
    } catch (e) {
      if (isNetworkError(e)) continue; // still unreachable -- retry next sync
      failed++;
      failedKinds.push('VISIT_METADATA');
    }
  }

  if (batchItems.length > 0) {
    try {
      const response = await agentFieldApi.sync({ items: batchItems });
      response.results.forEach((r) => {
        if (r.success) {
          succeededIds.add(r.clientId);
          succeeded++;
        } else {
          failed++;
          failedKinds.push(r.kind);
        }
      });
    } catch {
      // batch request itself unreachable -- those items just stay queued
    }
  }

  const remaining = queue.filter((item) => !succeededIds.has(item.clientId));
  await writeQueue(remaining);

  if (succeeded === 0 && failed === 0) return null;

  return { attempted: queue.length, succeeded, failed, failedKinds };
}
