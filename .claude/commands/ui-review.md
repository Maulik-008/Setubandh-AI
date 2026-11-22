---
description: Run the Paper & Pastel review protocol on the screens changed in the current diff.
---

Use the `paper-pastel-studio` skill (`.claude/skills/paper-pastel-studio/SKILL.md`, especially `references/craft/review-protocol.md`) to review the UI files changed in the current git diff.

Check: tokens only (no raw hex, no Tailwind palette classes), one ink CTA per view, six category hues, Lucide icons at stroke 1.75, Geist fonts, light **and** dark mode, empty / loading / error states, keyboard path, WCAG 2.2 AA contrast.

If `pnpm ui:audit` exists, run it and include the result. Report a ranked list of material fixes; do not edit code unless I ask.
