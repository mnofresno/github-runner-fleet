# Node.js security runtime

Node.js containers and CI use the November 11, 2026 security release, 22.23.5.
Docker Hub security tags may lag the binary release. Dockerfiles therefore
bootstrap from the existing Node 22 image and install the official archive with
a pinned SHA-256 checksum before installing dependencies or running application code.
Alpine uses the official Node 22.23.5 multi-architecture image. Debian uses the
verified glibc archive. Unsupported
architectures fail the build rather than using an unchecked binary.

Verify the final image with `docker run --rm --entrypoint node IMAGE --version`.
Rebuild and recreate the service to replace the running runtime; changing CI
or a Dockerfile alone does not patch an existing container.

Source: https://nodejs.org/en/blog/vulnerability/november-2026-security-releases
