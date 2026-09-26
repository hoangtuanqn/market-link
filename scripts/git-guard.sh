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

# R-10: commit messages are 100% English. Vietnamese letters (diacritics and đ) give it away.
# Alternation of literal UTF-8 characters, matched byte-wise under LC_ALL=C, so it does not depend on the user's locale.
VIETNAMESE_LETTERS='à|á|ả|ã|ạ|ă|ằ|ắ|ẳ|ẵ|ặ|â|ầ|ấ|ẩ|ẫ|ậ|è|é|ẻ|ẽ|ẹ|ê|ề|ế|ể|ễ|ệ|ì|í|ỉ|ĩ|ị'
VIETNAMESE_LETTERS+='|ò|ó|ỏ|õ|ọ|ô|ồ|ố|ổ|ỗ|ộ|ơ|ờ|ớ|ở|ỡ|ợ|ù|ú|ủ|ũ|ụ|ư|ừ|ứ|ử|ữ|ự|ỳ|ý|ỷ|ỹ|ỵ|đ'
VIETNAMESE_LETTERS+='|À|Á|Ả|Ã|Ạ|Ă|Ằ|Ắ|Ẳ|Ẵ|Ặ|Â|Ầ|Ấ|Ẩ|Ẫ|Ậ|È|É|Ẻ|Ẽ|Ẹ|Ê|Ề|Ế|Ể|Ễ|Ệ|Ì|Í|Ỉ|Ĩ|Ị'
VIETNAMESE_LETTERS+='|Ò|Ó|Ỏ|Õ|Ọ|Ô|Ồ|Ố|Ổ|Ỗ|Ộ|Ơ|Ờ|Ớ|Ở|Ỡ|Ợ|Ù|Ú|Ủ|Ũ|Ụ|Ư|Ừ|Ứ|Ử|Ữ|Ự|Ỳ|Ý|Ỷ|Ỹ|Ỵ|Đ'
# Decomposed form (base letter + combining mark, U+0300–U+036F), which macOS can produce on paste
VIETNAMESE_LETTERS+=$'|\xcc[\x80-\xbf]|\xcd[\x80-\xaf]'

commit_msg() {
    local file="${1:-}"
    if [[ ! -f "$file" ]]; then
        echo "usage: $0 commit-msg <message-file>" >&2
        exit 2
    fi

    # Git drops lines starting with '#', so only the rest lands in history. Number lines before filtering.
    local offending
    offending="$(LC_ALL=C grep -nE "$VIETNAMESE_LETTERS" "$file" | grep -vE '^[0-9]+:#' || true)"
    if [[ -n "$offending" ]]; then
        red "✗ Commit message phải viết 100% tiếng Anh, cả tiêu đề lẫn phần thân (luật R-10). Dòng có tiếng Việt:"
        printf '    %s\n' "$offending" >&2
        red "  Viết lại bằng tiếng Anh rồi commit lại. Đã commit rồi thì: git commit --amend"
        exit 1
    fi
}

case "${1:-}" in
    pre-commit) pre_commit ;;
    pre-push) pre_push ;;
    commit-msg) commit_msg "${2:-}" ;;
    *)
        echo "usage: $0 pre-commit | pre-push | commit-msg <message-file>" >&2
        exit 2
        ;;
esac
