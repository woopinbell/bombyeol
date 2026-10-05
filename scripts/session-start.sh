#!/usr/bin/env bash
# 세션 시작 훅(.claude/settings.json): docs 고아 브랜치를 .docs/ 워크트리로 붙이고 CLAUDE.md, docs, image-asset을 루트에 링크한다.
# 문서는 main에 없고 docs 브랜치에만 있다(docs 브랜치 docs/CLOUD_SESSION.md 1절과 같은 절차). 실패해도 세션을 막지 않는다.
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 0
git fetch -q origin docs 2>/dev/null || exit 0
[ -d .docs ] || git worktree add -q -B docs .docs origin/docs 2>/dev/null || exit 0
git -C .docs pull -q --ff-only origin docs 2>/dev/null || true
for p in CLAUDE.md docs image-asset; do ln -sfn ".docs/$p" "$p"; done
exclude="$(git rev-parse --git-path info/exclude)"
for p in .docs/ CLAUDE.md docs image-asset; do
  grep -qxF "$p" "$exclude" 2>/dev/null || printf '%s\n' "$p" >> "$exclude"
done
exit 0
