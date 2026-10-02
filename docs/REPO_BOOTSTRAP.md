# Bombyeol - 리포 부트스트랩 절차 (사용자 지시 후 1회 수행)

현재 `products/bombyeol/`은 git 리포가 아니고 `CLAUDE.md`, `docs/`, `image-asset/`만 있다. 사용자가 "리포 부트스트랩" 또는 "docs 커밋"을 지시하면 아래를 수행한다(로컬 macOS, git 2.50 확인, `gh`는 계정 `seungwoo7050`으로 로그인됨).

**이 절차는 커밋, GitHub 리포 생성, 푸시를 포함하므로 지시 없이 수행하지 않는다.**

```bash
cd /Users/woopinbell/Desktop/ongoing/products/bombyeol

# 1) 문서, 에셋을 임시로 치운다
mkdir -p ../.bombyeol-docs-tmp && mv CLAUDE.md docs image-asset ../.bombyeol-docs-tmp/

# 2) main: 개발 전용 브랜치, 첫 커밋은 .gitignore만
git init -b main
cat > .gitignore <<'EOF'
node_modules/
.next/
.open-next/
.wrangler/
.env*
!.env.example
*.tsbuildinfo
next-env.d.ts
/coverage
/test-results/
/playwright-report/
.DS_Store
EOF
git add .gitignore
git commit -m "chore(repo): 저장소 초기화"

# 3) docs: main과 공통 조상이 없는 고아 브랜치를 .docs 워크트리로
git worktree add --orphan -b docs .docs
mv ../.bombyeol-docs-tmp/* .docs/ && rmdir ../.bombyeol-docs-tmp
git -C .docs add -A
git -C .docs commit -m "docs: 기반 문서와 브랜드 에셋 초기 커밋"

# 4) 루트에 링크, main에서는 무시
for p in CLAUDE.md docs image-asset; do ln -sfn ".docs/$p" "$p"; done
printf '%s\n' '.docs/' 'CLAUDE.md' 'docs' 'image-asset' >> .git/info/exclude

# 5) GitHub private 리포 생성 및 푸시 (지시 확인 후)
gh repo create bombyeol --private --source=. --remote=origin
git push -u origin main
git -C .docs push -u origin docs
```

검증: `git status`가 깨끗해야 하고(링크는 exclude), `git log main --oneline`에 문서 커밋이 없어야 하며, `git log docs --oneline`에 문서 커밋만 있어야 한다. `git merge-base main docs`는 출력이 없어야 한다(공통 조상 없음).

이후 세션은 `CLOUD_SESSION.md` §1 부트스트랩으로 `.docs/`를 붙인다.

주의: 이 리포의 원격 이름은 `bombyeol`(영문 표기 확정). 리포 이름, GitHub 계정(개인/조직)은 실행 직전에 사용자에게 다시 확인한다.
