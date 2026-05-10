# BMAD Demo — devcontainer base image.
#
# Goal: a single Linux dev environment that runs the portal cross-OS
# (macOS / Linux / Windows-via-WSL2) without the host needing to deal
# with platform-specific node-gyp / node-pty / native-build pain.
#
# What gets baked in:
#   - Node 22 (matches the portal's `engines: node >=20`).
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

FROM node:22-bookworm-slim

# Native build deps + tools the AI-tool CLIs and capstone need.
# - build-essential, python3: node-pty's native compile.
# - git: required by the curriculum (story files, repo navigation).
# - curl, ca-certificates: AI-tool installer scripts.
# - gh: GitHub CLI; needed for `gh extension install github/gh-copilot`.
# - sqlite3: convenience for inspecting the progress DB.
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
    && type -p curl >/dev/null \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

# Codex CLI (npm-distributed). Pinned to the @latest dist-tag — Lesson 6
# explains the trade-off (current vs pinned) for the capstone install
# command; this devcontainer mirrors the same evergreen choice for
# the AI tool itself.
RUN npm install -g @openai/codex

# Claude Code CLI (Anthropic-hosted install script).
RUN curl -fsSL https://claude.ai/install.sh -o /tmp/install-claude.sh \
    && bash /tmp/install-claude.sh \
    && rm /tmp/install-claude.sh

# GitHub Copilot CLI is a `gh` extension; users install it after
# authenticating to GitHub on first use:
#   gh auth login
#   gh extension install github/gh-copilot
# Pre-installing it would couple the image to a GH-anonymous install,
# which doesn't work reliably. Documented in the README quickstart.

# Set up a non-root `node` user (already exists in node:22-bookworm
# images; verify and add sudo). Keeping a non-root user matches
# devcontainer best practice.
RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

USER node
WORKDIR /workspaces/bmad_demo

# The repo gets bind-mounted by the devcontainer at runtime; we don't
# COPY it in. postCreateCommand handles `npm install` on first launch.
EXPOSE 3000
