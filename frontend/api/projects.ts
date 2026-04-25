"use client";

import type {
  GetProjectResponse,
  ListProjectsResponse,
  SaveProjectRequest,
  SaveProjectResponse
} from "@/lib/api/contracts/projects";
import { postJson } from "@/lib/http/axios";
import { appApiClient } from "@/frontend/api/client";

export async function listProjects() {
  const response = await appApiClient.get<ListProjectsResponse>("/projects");
  return response.data;
}

export async function getProject(projectId: string) {
  const response = await appApiClient.get<GetProjectResponse>(`/projects/${projectId}`);
  return response.data;
}

export async function createProject(payload: SaveProjectRequest) {
  return postJson<SaveProjectResponse, SaveProjectRequest>(appApiClient, "/projects", payload);
}

export async function updateProject(projectId: string, payload: SaveProjectRequest) {
  return postJson<SaveProjectResponse, SaveProjectRequest>(
    appApiClient,
    `/projects/${projectId}`,
    payload
  );
}
