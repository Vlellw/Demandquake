import { queryOptions } from "@tanstack/react-query";
import {
  getDashboardStats,
  getRadarNodes,
  getRecentRuns,
  getRunDetail,
  getScanDetail,
  getStartupCards,
  getStartupDetail,
  getClusterSignals,
  getCompetitorBrands,
  getStartupScans,
  getRecentQuakes,
} from "./research.functions";
import { getProject, getProjectTeam, listMyProjects, previewInvite } from "./projects.functions";

export const startupCardsQuery = queryOptions({
  queryKey: ["startups"],
  queryFn: () => getStartupCards(),
  staleTime: 30_000,
});

export const radarQuery = queryOptions({
  queryKey: ["radar"],
  queryFn: () => getRadarNodes(),
  staleTime: 30_000,
});

export const statsQuery = queryOptions({
  queryKey: ["stats"],
  queryFn: () => getDashboardStats(),
  staleTime: 30_000,
});

export const recentRunsQuery = queryOptions({
  queryKey: ["runs", "recent"],
  queryFn: () => getRecentRuns(),
  staleTime: 15_000,
});

export const recentQuakesQuery = queryOptions({
  queryKey: ["quakes", "recent"],
  queryFn: () => getRecentQuakes(),
  staleTime: 30_000,
});

export const runDetailQuery = (runId: string) =>
  queryOptions({
    queryKey: ["run", runId],
    queryFn: () => getRunDetail({ data: { runId } }),
  });

export const startupDetailQuery = (slug: string) =>
  queryOptions({
    queryKey: ["startup", slug],
    queryFn: () => getStartupDetail({ data: { slug } }),
    staleTime: 15_000,
  });

export const scanDetailQuery = (scanId: string) =>
  queryOptions({
    queryKey: ["scan", scanId],
    queryFn: () => getScanDetail({ data: { scanId } }),
  });

export const clusterSignalsQuery = (clusterId: string) =>
  queryOptions({
    queryKey: ["cluster", clusterId],
    queryFn: () => getClusterSignals({ data: { clusterId } }),
    staleTime: 60_000,
  });

export const myProjectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: () => listMyProjects(),
});

export const projectQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["project", projectId],
    queryFn: () => getProject({ data: { projectId } }),
  });

export const projectTeamQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["project-team", projectId],
    queryFn: () => getProjectTeam({ data: { projectId } }),
  });

export const invitePreviewQuery = (token: string) =>
  queryOptions({
    queryKey: ["invite", token],
    queryFn: () => previewInvite({ data: { token } }),
  });

export const competitorBrandsQuery = (slug: string) =>
  queryOptions({
    queryKey: ["competitor-brands", slug],
    queryFn: () => getCompetitorBrands({ data: { slug } }),
    staleTime: 5 * 60_000,
  });

export const startupScansQuery = (slug: string) =>
  queryOptions({
    queryKey: ["startup-scans", slug],
    queryFn: () => getStartupScans({ data: { slug } }),
    staleTime: 30_000,
  });
