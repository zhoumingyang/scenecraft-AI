import { NextResponse } from "next/server";
import type {
  ListProjectsResponse,
  SaveProjectRequest,
  SaveProjectResponse
} from "@/lib/api/contracts/projects";
import { normalizeProjectAiLibrary, projectSaveRequestSchema } from "@/lib/project/schema";
import { withAuth } from "@/lib/server/auth/withAuth";
import { getServerErrorStatus } from "@/lib/server/http/errors";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";
import { createProject } from "@/lib/server/projects/mutations";
import { listProjectsByUser } from "@/lib/server/projects/queries";
import { serializeProjectSummary } from "@/lib/server/projects/serializers";

export const GET = withAuth(async (_request, _context, session) => {
  try {
    const items = await listProjectsByUser(session.user.id);
    const response: ListProjectsResponse = {
      projects: items.map(serializeProjectSummary)
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = getErrorMessage(error, "Failed to load projects.");
    return NextResponse.json({ message }, { status: 500 });
  }
});

export const POST = withAuth(async (request, _context, session) => {
  try {
    const payload = projectSaveRequestSchema.parse((await request.json()) as SaveProjectRequest);
    const projectId = payload.snapshot.id;
    const created = await createProject({
      projectId,
      userId: session.user.id,
      payload
    });

    const response: SaveProjectResponse = {
      project: {
        id: created.id,
        version: created.version,
        updatedAt: created.updatedAt.toISOString(),
        snapshot: created.snapshot,
        aiSnapshot: normalizeProjectAiLibrary(created.aiSnapshot)
      }
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error, "Failed to create project.");
    return NextResponse.json({ message }, { status: getServerErrorStatus(error, 400) });
  }
});
