import { NextResponse } from "next/server";
import type {
  ListProjectsResponse,
  SaveProjectRequest,
  SaveProjectResponse
} from "@/lib/api/contracts/projects";
import { projectSaveRequestSchema } from "@/lib/project/schema";
import { getSession } from "@/lib/server/auth/getSession";
import { getErrorMessage } from "@/lib/server/http/getErrorMessage";
import { createProject } from "@/lib/server/projects/mutations";
import { listProjectsByUser } from "@/lib/server/projects/queries";
import { serializeProjectSummary } from "@/lib/server/projects/serializers";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
        aiSnapshot: created.aiSnapshot
      }
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error, "Failed to create project.");
    const status = message.includes("DATABASE_URL") ? 500 : 400;
    return NextResponse.json({ message }, { status });
  }
}
