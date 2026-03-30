---
name: awesome-agent-skills-index
description: >-
  Points to the VoltAgent curated list of real-world agent skills (Claude, Vercel,
  Stripe, etc.). Use when the user wants to discover, compare, or install third-party
  skills from the awesome list, or when aligning with vendor-published skill patterns.
---

# Awesome Agent Skills (index)

This project vendors a **pointe[r skill** to [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills): a curated index of 1000+ agent skills from teams (Anthropic, Vercel, Stripe, Cloudflare, etc.) and the community. It is compatible with Cursor, Claude Code, Codex, and similar tools.

## How to use

1. Open the repository README on GitHub for the full table of contents and links to each skill’s source repo.
2. Install a skill by cloning or copying its upstream `SKILL.md` (and any `scripts/` / reference files) into `.cursor/skills/<skill-name>/` for this project, or into `~/.cursor/skills/` for all projects.
3. **Security**: Treat every third-party skill as untrusted until reviewed. See the repo’s security notice; prefer scanning with tools such as [Snyk agent-scan](https://github.com/snyk/agent-scan) when adopting new skills.
]()
## Local reference

For a short offline summary of official Claude skills and key links, see [reference.md](reference.md).
