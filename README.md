# GitHub Runner Fleet

Self-hosted GitHub Actions runner manager with **persistent runners** and a web-based dashboard.

## Architecture

```
┌──────────────────────────────────┐
│  runner-status (Node.js)         │
│  ┌────────────┐ ┌─────────────┐  │
│  │ Dashboard   │ │ CRUD API    │  │
│  │ (HTML/JS)   │ │ /api/...    │  │
│  └────────────┘ └─────────────┘  │
│           │                      │
│     Docker Socket                │
│           │                      │
│  ┌────────▼────────────────────┐ │
│  │ Persistent Runner Stacks    │ │
│  │ ┌─────────┐ ┌────────────┐ │ │
│  │ │ Runner  │ │ DinD       │ │ │
│  │ │ (always │ │ (always    │ │ │
│  │ │  on)    │ │  on)       │ │ │
│  │ └─────────┘ └────────────┘ │ │
│  └─────────────────────────────┘ │
└──────────────────────────────────┘
```

**Runners are persistent** — they stay running and connected to GitHub at all times. When a workflow job arrives, the runner agent executes it inside the DinD daemon. No waiting for runner spin-up.

**Configuration is done via the web UI** — add, remove, or restart targets from the dashboard. Config is persisted to `/app/data/targets.json`.

## Quick Start

```bash
cp .env.example .env
# Edit .env — set ACCESS_TOKEN and configure RUNNER_TARGETS_JSON
docker compose up -d
```

Visit `http://localhost:3571` to see the dashboard.

## Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ACCESS_TOKEN` | — | GitHub PAT with `admin:org` scope |
| `RUNNER_IMAGE` | `myoung34/github-runner:latest` | Docker image for runners |
| `DIND_IMAGE` | `docker:27-dind` | Docker-in-Docker image |
| `RUNNERS_PER_TARGET` | `1` | Default runner count per target |
| `HEALTHCHECK_INTERVAL_MS` | `15000` | How often to check runner health |
| `STATUS_BIND` | `127.0.0.1:3571` | Dashboard bind address |
| `LABELS` | `self-hosted,linux,x64` | Default runner labels |

### Target Configuration

Targets can be configured two ways:

1. **Via UI** — Use the "Add Target" form in the dashboard
2. **Via `RUNNER_TARGETS_JSON`** — JSON array in `.env` (imported on first startup)

Example target:
```json
{
  "id": "my-org",
  "name": "My Org Fleet",
  "scope": "org",
  "owner": "my-github-org",
  "repo": "my-app",
  "labels": ["self-hosted", "linux", "x64"],
  "runnersCount": 1,
  "runnerGroup": "Default",
  "description": "Runners for my org"
}
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Dashboard UI |
| `GET` | `/api/status` | Full fleet status JSON |
| `POST` | `/api/targets` | Add a new target |
| `DELETE` | `/api/targets/:id` | Remove a target and stop its runners |
| `POST` | `/api/targets/:id/restart` | Restart runners for a target |
| `GET` | `/api/targets/:id/runs/:runId/jobs` | List jobs for a run |
| `POST` | `/api/targets/:id/runs/:runId/rerun` | Rerun a workflow |
| `POST` | `/api/targets/:id/runs/:runId/rerun-failed` | Retry failed jobs |
| `POST` | `/api/targets/:id/jobs/:jobId/rerun` | Rerun a single job |

## How It Works

1. On startup, targets are loaded from `targets.json` (or imported from `RUNNER_TARGETS_JSON` on first run)
2. For each target, persistent runner+DinD container pairs are created and started
3. A healthcheck loop runs every 15s to restart any crashed runners
4. The dashboard shows real-time status from Docker and GitHub APIs
5. Targets can be added/removed from the dashboard — changes persist across restarts
