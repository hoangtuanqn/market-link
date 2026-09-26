#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Git guard — block mixing the dev / main environments right on the machine (CONTRIBUTING.md §0)
# Called automatically by lefthook; can also be run by hand:
#   scripts/git-guard.sh pre-commit
#   scripts/git-guard.sh pre-push <remote> <url>   (reads the list of refs from stdin)
# ---------------------------------------------------------------------
set -euo pipefail

PROTECTED_BRANCHES=("main" "dev")

red() { printf '\033[31m%s\033[0m\n' "$*" >&2; }

is_protected() {
    local name="$1"
    for protected in "${PROTECTED_BRANCHES[@]}"; do
        [[ "$name" == "$protected" ]] && return 0
    done
    return 1
}

pre_commit() {
    local branch
    branch="$(git symbolic-ref --quiet --short HEAD || true)"
    if [[ -n "$branch" ]] && is_protected "$branch"; then
        red "✗ Không commit trực tiếp trên nhánh '$branch' (luật H-3)."
        red "  Tạo nhánh làm việc rồi commit ở đó:"
        red "    git switch -c feature/FR-xxx-mo-ta     # thay đổi đang có sẽ đi theo"
        exit 1
    fi

    # Do not commit secret files / files of one specific machine's env (rule H-7)
    local staged forbidden=()
    staged="$(git diff --cached --name-only --diff-filter=ACMR)"
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        case "$file" in
            .env | .env.production | */.env | */.env.production.local | */.env.local | *.env.local \
                | */application-local.yml | */application-local.yaml | */application-local.properties \
                | *.pem | *.key | *.p12 | *.jks)
                forbidden+=("$file")
                ;;
        esac
    done <<< "$staged"
    if (( ${#forbidden[@]} > 0 )); then
        red "✗ Không commit file bí mật hoặc file env của máy (luật H-7):"
        printf '    %s\n' "${forbidden[@]}" >&2
        red "  Bỏ khỏi commit: git restore --staged <file>"
        exit 1
    fi
}

pre_push() {
    local local_ref local_sha remote_ref remote_sha
    local zero="0000000000000000000000000000000000000000"
    while read -r local_ref local_sha remote_ref remote_sha; do
        [[ -z "${remote_ref:-}" ]] && continue
        local target="${remote_ref#refs/heads/}"

        if [[ "$remote_ref" == refs/heads/* ]] && is_protected "$target"; then
            if [[ "$local_sha" == "$zero" ]]; then
                red "✗ Không xoá nhánh '$target' trên remote (luật H-4)."
            else
                red "✗ Không push thẳng vào '$target' (luật H-4)."
                red "  '$target' chỉ nhận code qua Pull Request trên GitHub:"
                red "    feature/* → dev        release: dev → main        hotfix/* → main"
            fi
            exit 1
        fi

        # A force-push to another shared branch is also not allowed, except your own branch
        if [[ "$remote_sha" != "$zero" && "$local_sha" != "$zero" ]] \
            && git cat-file -e "$remote_sha" 2>/dev/null \
            && ! git merge-base --is-ancestor "$remote_sha" "$local_sha"; then
            printf '\033[33m! Force-push lên %s. Chỉ làm trên nhánh của chính bạn, dùng --force-with-lease.\033[0m\n' \
                "$target" >&2
        fi
    done
}

case "${1:-}" in
    pre-commit) pre_commit ;;
    pre-push) pre_push ;;
    *)
        echo "usage: $0 pre-commit | pre-push" >&2
        exit 2
        ;;
esac
