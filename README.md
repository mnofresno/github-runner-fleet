# github-runner-fleet

Small Docker-based fleet manager for GitHub Actions runners.

This service is intentionally ephemeral-only:

- every runner is launched as a short-lived stack
- each stack contains a GitHub runner container plus a dedicated `docker:dind` sidecar
- each stack gets its own bridge network and named volumes
- when the work finishes, the fleet removes the full stack, including containers, network, and volumes

That model keeps CI traffic away from the host Docker daemon and avoids leaking ports or reusing production networks.

## Files

- `docker-compose.yml`: local UI and reconciler service
- `status-app/server.js`: GitHub API polling, Docker orchestration, autoscaling, and HTML rendering
- `status-app/cleanup.js`: helper logic for stale managed resource cleanup
- `.env.example`: sample environment

## Environment

Use `RUNNER_TARGETS_JSON` to define the fleet:

```json
[
  {
    "id": "bpf-org",
    "name": "BPF Shared Org Fleet",
    "scope": "org",
    "owner": "bpf-project",
    "repo": "bpf-application",
    "runnerGroup": "Default",
    "labels": ["self-hosted", "linux", "x64", "bpf-org", "shared"]
  },
  {
    "id": "gymnerd-org",
    "name": "GymNerd Org Fleet",
    "scope": "org",
    "owner": "gymnerd-ar",
    "repo": "gymnerd-bot",
    "runnerGroup": "Default",
    "labels": ["self-hosted", "linux", "x64", "gymnerd", "shared"]
  }
]
```

Supported fields:

- `id`: stable slug used by the API and UI
- `name`: display name
- `scope`: `repo` or `org`
- `owner`: GitHub owner or organization
- `repo`: recommended even for `org` scope if you want repo run visibility and autoscaling
- `labels`: extra runner labels
- `runnerGroup`: optional GitHub runner group for org scope
- `description`: optional UI text
- `accessToken`: optional per-target token override
- `runnerImage`: optional image override
- `runnerWorkdir`: optional workdir override
- `dindImage`: optional Docker-in-Docker image override
- `maxRunners`: optional per-target cap for concurrent ephemeral stacks

Shared variables:

- `RUNNER_TARGETS_JSON`
- `ACCESS_TOKEN`
- `RUNNER_IMAGE`
- `RUNNER_WORKDIR`
- `DIND_IMAGE`
- `STATUS_BIND`
- `STATUS_INTERNAL_PORT`
- `STATUS_PORT`
- `RECONCILE_INTERVAL_MS`
- `STACK_GRACE_MS`
- `MAX_RUNNERS_PER_TARGET`

## Run

```bash
docker compose up -d
```

The `runner-status` service reconciles target demand continuously:

- it inspects recent workflow runs for each configured repo feed
- it launches ephemeral runner stacks when queued work needs capacity
- it removes stale or idle stacks after a short grace window

You can still launch or remove a stack manually from the UI.

## Isolation model

Ephemeral runners launched from the fleet do not use the host Docker daemon directly.

- each runner gets its own privileged `docker:dind` sidecar
- the runner shares that sidecar network namespace and talks to it through `DOCKER_HOST=tcp://127.0.0.1:2375`
- the inner Docker daemon starts with `--ip=127.0.0.1`, so published ports stay inside the runner namespace
- workflow `docker compose` stacks stay inside that per-runner daemon instead of the server Docker engine

That prevents CI jobs from seeing production containers, attaching to host networks, or publishing test ports on the server.

## Scope choice

Use org-scoped runners when:

- several repos in the same organization should share capacity
- the token has org runner administration permissions
- access through runner groups is acceptable

Use repo-scoped runners when:

- the fleet must stay isolated to one repository
- billing or trust boundaries differ
- you need run-level controls tied to exactly one repository

Even for org-scoped runners, adding `repo` is strongly recommended so the UI can correlate active runs and right-size the ephemeral stack count.

## Deployment

For production on this server, deploy the checked-out repo from `/var/www/github-runner-fleet` and keep `.env` local to the server.

This repo includes `.git-auto-deploy.yml` so the existing git-auto-deploy installation can run:

```bash
docker compose up -d --remove-orphans
docker compose restart runner-status
```

## GitHub permissions

The token used by a target needs runner administration at the same scope:

- repo-scoped: repository self-hosted runner admin access
- org-scoped: organization self-hosted runner admin access

If one token does not cover every org, set `accessToken` per target.

## Notes

- `myoung34/github-runner` is a third-party image.
- Old managed resources that still carry the legacy `github-selfhosted` labels can still be detected and removed.
