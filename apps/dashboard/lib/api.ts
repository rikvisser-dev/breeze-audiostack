const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
export type ApiGetEndpoint =
  | "alerts"
  | "commands"
  | "config"
  | "containers"
  | "emergencyAudio"
  | "status";
export type ApiPostEndpoint =
  | "commandsRun"
  | "emergencyAudioDelete"
  | "emergencyAudioUpload";

const API_PATHS: Record<ApiGetEndpoint | ApiPostEndpoint, string> = {
  alerts: "/api/alerts",
  commands: "/api/commands",
  commandsRun: "/api/commands/run",
  config: "/api/config",
  containers: "/api/containers",
  emergencyAudio: "/api/emergency-audio",
  emergencyAudioDelete: "/api/emergency-audio/delete",
  emergencyAudioUpload: "/api/emergency-audio/upload",
  status: "/api/status",
};

function resolveApiUrl(path: string): string {
  if (!API_URL) {
    return path;
  }

  const apiBaseUrl = new URL(API_URL);
  const url = new URL(path, apiBaseUrl);

  if (url.origin !== apiBaseUrl.origin) {
    throw new Error(`Cross-origin API path is not allowed: ${path}`);
  }

  return url.toString();
}

function getApiPath(endpoint: ApiGetEndpoint): string {
  if (endpoint === "alerts") return API_PATHS.alerts;
  if (endpoint === "commands") return API_PATHS.commands;
  if (endpoint === "config") return API_PATHS.config;
  if (endpoint === "containers") return API_PATHS.containers;
  if (endpoint === "emergencyAudio") return API_PATHS.emergencyAudio;
  return API_PATHS.status;
}

function getPostApiPath(endpoint: ApiPostEndpoint): string {
  if (endpoint === "commandsRun") return API_PATHS.commandsRun;
  if (endpoint === "emergencyAudioDelete") return API_PATHS.emergencyAudioDelete;
  return API_PATHS.emergencyAudioUpload;
}

export async function apiFetch<T>(
  endpoint: ApiGetEndpoint,
  jwt: string
): Promise<T> {
  const res = await fetch(resolveApiUrl(getApiPath(endpoint)), {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(
  endpoint: ApiPostEndpoint,
  jwt: string,
  body?: Record<string, unknown> | FormData
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
  };
  let reqBody: string | FormData | undefined;

  if (body instanceof FormData) {
    reqBody = body;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    reqBody = JSON.stringify(body);
  }

  const res = await fetch(resolveApiUrl(getPostApiPath(endpoint)), {
    method: "POST",
    headers,
    body: reqBody,
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Types
export interface Mount {
  mount: string;
  listeners: number;
  peak_listeners: number;
  name: string;
  description: string;
  audio_info: string;
  genre: string;
  title: string;
  content_type: string;
  stream_start: string;
}

export interface StreamStatus {
  status: string;
  station_name: string;
  server_id: string;
  total_listeners: number;
  mounts: Mount[];
  timestamp: number;
  error?: string;
}

export interface StackConfig {
  station_name: string;
  icecast_url: string;
  hostname: string;
  harbor_primary_port: string;
  harbor_fallback_port: string;
  silence_threshold_db: string;
  silence_duration_s: string;
  max_listeners: string;
  posthog_enabled: boolean;
  pushover_enabled: boolean;
  can_manage_emergency_audio: boolean;
  can_run_risky_commands: boolean;
}

export interface Alert {
  type: string;
  message: string;
  timestamp: number;
}

export interface Container {
  name: string;
  status: string;
  image: string;
  ports: string;
}

export interface EmergencyFile {
  filename: string;
  size_bytes: number;
  size_mb: number;
  modified: number;
}

export interface CommandDef {
  id: string;
  label: string;
  requires_service: boolean;
}

export interface CommandsConfig {
  commands: CommandDef[];
  services: string[];
}

export interface CommandResult {
  ok?: boolean;
  output?: string;
  exit_code?: number;
  error?: string;
}
