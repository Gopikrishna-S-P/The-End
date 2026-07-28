// Local queue for the server's batched offline-sync endpoint
// (POST /api/v1/agent/sync — see AgentSyncRequest/"design-doc §7.6"). Visit
// logs, PTPs, and collections that fail to submit due to a network error
// (not a validation error) are queued here and replayed once connectivity
// returns, instead of losing the field officer's work.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { agentFieldApi } from '@/api/agentFieldApi';
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

export async function enqueueVisitMetadata(visit: VisitLogRequest): Promise<void> {
  const queue = await readQueue();
  queue.push({ clientId: newClientId(), kind: 'VISIT_METADATA', visit });
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

  let response;
  try {
    response = await agentFieldApi.sync({ items: queue });
  } catch {
    return null;
  }

  const succeededIds = new Set(response.results.filter((r) => r.success).map((r) => r.clientId));
  const remaining = queue.filter((item) => !succeededIds.has(item.clientId));
  await writeQueue(remaining);

  return {
    attempted: queue.length,
    succeeded: response.succeeded,
    failed: response.failed,
    failedKinds: response.results.filter((r) => !r.success).map((r) => r.kind),
  };
}
