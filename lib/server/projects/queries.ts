import { and, desc, eq, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { projects } from "@/db/schema";
import { requireDatabase } from "@/lib/server/db/requireDatabase";

export type ProjectSummaryRow = {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  updatedAt: Date;
  version: number;
};

export async function listProjectsByUser(userId: string) {
  const db = requireDatabase();

  return db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      tags: projects.tags,
      thumbnailUrl: sql<string | null>`${projects.snapshot}->'thumbnail'->>'url'`,
      updatedAt: projects.updatedAt,
      version: projects.version
    })
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.updatedAt)) satisfies Promise<ProjectSummaryRow[]>;
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
