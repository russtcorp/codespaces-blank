import type { VectorizeSyncMessage } from "@diner-saas/db/src/menu-crud";

export interface Env {
  AI: any;
  VECTORIZE: any;
}

export async function handleVectorizeSync(
  batch: MessageBatch<VectorizeSyncMessage>,
  env: Env
) {
  const vectors = [];
  const idsToDelete = [];

  for (const msg of batch.messages) {
    const { type, tenantId, itemId, text } = msg.body;
    const vectorId = `${tenantId}:${itemId}`;

    if (type === "delete-item") {
      idsToDelete.push(vectorId);
      continue;
    }

    if (type === "sync-item" && text) {
      try {
        const embedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
          text: text,
        });

        if (embedding?.data?.[0]) {
          vectors.push({
            id: vectorId,
            values: embedding.data[0],
            metadata: {
              tenantId,
              itemId: itemId.toString(),
              text: text.slice(0, 100), // Store snippet for debugging
            },
          });
        }
      } catch (error) {
        console.error(`Failed to generate embedding for ${vectorId}:`, error);
        msg.retry();
      }
    }
  }

  // Batch operations
  if (idsToDelete.length > 0) {
    await env.VECTORIZE.deleteByIds(idsToDelete);
  }

  if (vectors.length > 0) {
    await env.VECTORIZE.upsert(vectors);
  }
}
