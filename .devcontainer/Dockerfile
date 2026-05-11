# AI Contribution Framework — devcontainer base image.
#
# Goal: a single Linux dev environment that runs the portal cross-OS
# (macOS / Linux / Windows-via-WSL2) without the host needing to deal
# with platform-specific node-gyp / node-pty / native-build pain.
#
# What gets baked in:
#   - Node 24 (matches the portal's `engines: node >=24`, required for
#     stable `node:sqlite`).
#   - The build toolchain node-pty needs (build-essential + python3).
#   - The `gh` CLI (used by GitHub Copilot CLI install).
#   - Three AI-tool CLIs the capstone supports: Claude Code, Codex,
#     GitHub Copilot. Trainees still authenticate them on first use
#     (their tokens land under ~/.claude, ~/.codex, ~/.copilot inside
#     the container — devcontainer convention bind-mounts that home dir
#     into the workspace volume so auth persists across container
#     restarts).
#
# What does NOT get baked in:
#   - The portal's `node_modules`. They're installed via the
#     postCreateCommand on first launch so the build adapts to the
#     repo's lockfile at the time of the container build.
#   - `_bmad/` and `.claude/skills/`. The trainee runs the BMAD install
#     against THEIR chosenDir during the capstone; the portal's repo
#     stays as-is.

FROM node:24-bookworm-slim

# Native build deps + tools the AI-tool CLIs and capstone need.
# - build-essential, python3: node-pty's native compile.
# - git: required by the curriculum (story files, repo navigation).
# - curl, ca-certificates: AI-tool installer scripts.
# - gh: GitHub CLI; needed for `gh extension install github/gh-copilot`.
# - sqlite3: convenience for inspecting the progress DB.
#
# Run apt-get install + the gh-CLI repo setup as a single RUN so the
# packages-list cache stays warm across the two install passes. The
# command chain is POSIX-sh compatible (no bash-isms; use `curl -o`
# instead of `... | dd ...` so no pipefail is required) — works in
# both Docker (docker format) and Podman (OCI format) without a SHELL
# override.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        git \
        gnupg \
        less \
        python3 \
        sqlite3 \
        sudo \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

# Codex CLI (npm-distributed). Installs into /usr/local/lib/node_modules
# with a /usr/local/bin/codex symlink — visible to every user.
# Pinned to the @latest dist-tag, mirroring the capstone's
# `npx bmad-method@latest install` evergreen choice.
RUN npm install -g @openai/codex

# GitHub Copilot CLI is a `gh` extension; users install it after
# authenticating to GitHub on first use:
#   gh auth login
#   gh extension install github/gh-copilot
# Pre-installing it would couple the image to a GH-anonymous install,
# which doesn't work reliably. Documented in the README quickstart.

# Set up a non-root `node` user (already exists in node:22-bookworm
# images; we add passwordless sudo). Keeping a non-root user matches
# devcontainer best practice.
RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

USER node
# Anthropic's `claude` CLI installs into the invoking user's
# `~/.local/bin/`. Add it to PATH so non-interactive shells (e.g.
# the devcontainer's PTY spawn path, the npm scripts) can find it.
ENV PATH="/home/node/.local/bin:${PATH}"
WORKDIR /workspaces/bmad_demo

# Claude Code CLI — install AS THE NODE USER so it lands in
# /home/node/.local/bin/. Installing as root would put it in
# /root/.local/bin/, invisible to the node user the capstone runs as.
RUN curl -fsSL https://claude.ai/install.sh -o /tmp/install-claude.sh \
    && bash /tmp/install-claude.sh \
    && rm /tmp/install-claude.sh

# The repo gets bind-mounted by the devcontainer at runtime; we don't
# COPY it in. postCreateCommand handles `npm install` on first launch.
EXPOSE 3000
