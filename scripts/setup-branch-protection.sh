#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Bật bảo vệ nhánh main + dev trên GitHub (CONTRIBUTING.md §11)
# CHỈ chủ repo / admin chạy được. Cần: gh auth login (tài khoản admin), jq.
#   scripts/setup-branch-protection.sh            # áp dụng
#   scripts/setup-branch-protection.sh --dry-run  # chỉ in JSON sẽ gửi
# Chạy lại nhiều lần không sao: ruleset cùng tên sẽ được cập nhật.
# ---------------------------------------------------------------------
set -euo pipefail

REPO="${REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
DRY_RUN="${1:-}"

# Tên check = tên job trong .github/workflows/*.yml
COMMON_CHECKS='["Branch policy","Env guard","Backend · format + test","Frontend · lint + build"]'
MAIN_CHECKS='["Branch policy","Env guard","Backend · format + test","Frontend · lint + build","Docker · build image production"]'

ruleset() { # name branch merge_method checks_json
    jq -n --arg name "$1" --arg ref "refs/heads/$2" --arg method "$3" --argjson checks "$4" '{
      name: $name,
      target: "branch",
      enforcement: "active",
      conditions: { ref_name: { include: [$ref], exclude: [] } },
      bypass_actors: [],
      rules: [
        { type: "deletion" },
        { type: "non_fast_forward" },
        { type: "pull_request", parameters: {
            required_approving_review_count: 1,
            dismiss_stale_reviews_on_push: true,
            require_code_owner_review: false,
            require_last_push_approval: false,
            required_review_thread_resolution: false,
            allowed_merge_methods: [$method]
        } },
        { type: "required_status_checks", parameters: {
            strict_required_status_checks_policy: true,
            required_status_checks: ($checks | map({ context: . }))
        } }
      ]
    }'
}

apply() { # name branch merge_method checks_json
    local body id
    body="$(ruleset "$@")"
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        echo "$body"
        return
    fi
    id="$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name == \"$1\") | .id" || true)"
    if [[ -n "$id" ]]; then
        gh api -X PUT "repos/$REPO/rulesets/$id" --input - <<< "$body" > /dev/null
        echo "✓ Cập nhật ruleset '$1'"
    else
        gh api -X POST "repos/$REPO/rulesets" --input - <<< "$body" > /dev/null
        echo "✓ Tạo ruleset '$1'"
    fi
}

apply "protect-main" main merge "$MAIN_CHECKS"
apply "protect-dev" dev squash "$COMMON_CHECKS"

if [[ "$DRY_RUN" != "--dry-run" ]]; then
    gh api -X PATCH "repos/$REPO" -f default_branch=dev -F delete_branch_on_merge=true > /dev/null
    echo "✓ Default branch = dev, tự xoá nhánh sau khi merge"
fi
