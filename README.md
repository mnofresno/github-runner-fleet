# github-selfhosted

Minimal self-hosted GitHub Actions runner stack with:

- `myoung34/github-runner` for the runner container
- a tiny Node status app that shows runner state and recent workflow runs
- force-cancel support for the active workflow run
- rerun controls for an entire run, only failed jobs, or a specific past job
- `docker-compose.yml` for deployment

## Files

- `docker-compose.yml`: runner and status app services
- `status-app/server.js`: GitHub API polling and HTML rendering
- `status/index.html`: static fallback page
- `.env.example`: required environment variables without secrets

## Environment

Copy `.env.example` to `.env` and fill:

- `REPO_URL`
- `ACCESS_TOKEN`
- `RUNNER_NAME`
- `RUNNER_WORKDIR`
- `LABELS`
- `STATUS_PORT`
- `COMPOSE_PROJECT_NAME`

## Run

```bash
docker compose up -d
```

## Notes

- GitHub Actions supports rerunning a full run, rerunning failed jobs, and rerunning a specific job.
- GitHub Actions does not expose a clean official API to cancel only one job while keeping the rest of the run alive.
