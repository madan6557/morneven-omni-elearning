import { prisma } from "./prisma.js";

export function audit(userId: string | undefined, action: string, entity: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  return prisma.auditLog.create({ data: { userId: userId || null, action, entity, entityId: entityId || null, metadata: JSON.stringify(metadata) } }).catch(() => undefined);
}
