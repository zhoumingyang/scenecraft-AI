import { and, desc, eq, isNull } from "drizzle-orm";
import { projects } from "@/db/schema";
import { requireDatabase } from "@/lib/server/db/requireDatabase";

export async function listProjectsByUser(userId: string) {
  const db = requireDatabase();

  return db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectByIdForUser(projectId: string, userId: string) {
  const db = requireDatabase();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId), isNull(projects.deletedAt)))
    .limit(1);

  return project ?? null;
}
