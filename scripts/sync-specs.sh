#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPECS_DIR="$REPO_ROOT/docs/specifications"
SKILLS_DIR="$REPO_ROOT/skills"
STALE_MARKER="$REPO_ROOT/.sync-specs-manifest"

log() { printf "  %s\n" "$1"; }

copy_spec() {
    local skill_name="$1"
    local src_rel="$2"
    local dest_name="$3"
    local src="$SPECS_DIR/$src_rel"
    local refs_dir="$SKILLS_DIR/$skill_name/references"
    local dest="$refs_dir/$dest_name"

    mkdir -p "$refs_dir"

    if [[ ! -f "$src" ]]; then
        echo "  WARN: Source not found: $src"
        return
    fi

    echo "$dest" >> "$STALE_MARKER"

    if [[ ! -f "$dest" ]] || ! diff -q "$src" "$dest" > /dev/null 2>&1; then
        cp "$src" "$dest"
        log "Copied: $src_rel → skills/$skill_name/references/$dest_name"
    fi
}

rm -f "$STALE_MARKER"
touch "$STALE_MARKER"

echo "Syncing specs → skills/references/"
echo ""

# ── business-requirements-interview ──
copy_spec "business-requirements-interview" "business-requirements/spec.md"      "output-spec.md"
copy_spec "business-requirements-interview" "business-requirements/example.yaml"  "example.yaml"
copy_spec "business-requirements-interview" "business-interview-jsonl-spec.md"    "interview-jsonl-spec.md"

# ── technical-requirements-interview ──
copy_spec "technical-requirements-interview" "technical-requirements/spec.md"      "output-spec.md"
copy_spec "technical-requirements-interview" "technical-requirements/example.yaml" "example.yaml"
copy_spec "technical-requirements-interview" "technical-interview-jsonl-spec.md"   "interview-jsonl-spec.md"

# ── gap-analysis-worksheet ──
copy_spec "gap-analysis-worksheet" "gap-analysis-worksheet/spec.md"      "output-spec.md"
copy_spec "gap-analysis-worksheet" "gap-analysis-worksheet/example.yaml" "example.yaml"

# ── implementation-planner ──
copy_spec "implementation-planner" "milestones/spec.md"          "milestones-spec.md"
copy_spec "implementation-planner" "milestones/example.yaml"     "milestones-example.yaml"
copy_spec "implementation-planner" "milestone-tasks/spec.md"     "milestone-tasks-spec.md"
copy_spec "implementation-planner" "milestone-tasks/example.yaml" "milestone-tasks-example.yaml"

# ── implementation-plan-review ──
copy_spec "implementation-plan-review" "implementation-plan-review/spec.md"      "output-spec.md"
copy_spec "implementation-plan-review" "implementation-plan-review/example.yaml" "example.yaml"

# ── delivery-timeline ──
copy_spec "delivery-timeline" "timeline/spec.md"      "output-spec.md"
copy_spec "delivery-timeline" "timeline/example.yaml"  "example.yaml"

# ── qa-test-plan ──
copy_spec "qa-test-plan" "qa-test-plan/spec.md"      "output-spec.md"
copy_spec "qa-test-plan" "qa-test-plan/example.yaml"  "example.yaml"

# ── architecture-decision-record ──
copy_spec "architecture-decision-record" "adr/adr-document-spec.md" "adr-document-spec.md"
copy_spec "architecture-decision-record" "adr/adr-index-spec.md"    "adr-index-spec.md"
copy_spec "architecture-decision-record" "adr/example-ADR-001.md"   "example-ADR-001.md"
copy_spec "architecture-decision-record" "adr/example-ADR-003.md"   "example-ADR-003.md"
copy_spec "architecture-decision-record" "adr/example-INDEX.md"     "example-INDEX.md"

# ── developer-summary ──
copy_spec "developer-summary" "summaries/developer-summary-spec.md"    "output-spec.md"
copy_spec "developer-summary" "summaries/example-developer-summary.md" "example.md"

# ── executive-summary ──
copy_spec "executive-summary" "summaries/executive-summary-spec.md"    "output-spec.md"
copy_spec "executive-summary" "summaries/example-executive-summary.md" "example.md"

# ── style-anchors-collection ──
copy_spec "style-anchors-collection" "style-anchor-document/spec.md"  "output-spec.md"
copy_spec "style-anchors-collection" "style-anchor-document/example.md" "example.md"

echo ""
echo "Checking for stale files in references/ directories..."

stale=0
for refs_dir in "$SKILLS_DIR"/*/references; do
    [[ -d "$refs_dir" ]] || continue
    skill_name="$(basename "$(dirname "$refs_dir")")"
    for file in "$refs_dir"/*; do
        [[ -f "$file" ]] || continue
        if ! grep -qxF "$file" "$STALE_MARKER" 2>/dev/null; then
            echo "  STALE: skills/$skill_name/references/$(basename "$file") (not in sync mapping)"
            stale=$((stale + 1))
        fi
    done
done

rm -f "$STALE_MARKER"

if [[ $stale -eq 0 ]]; then
    echo "  No stale files found."
fi

echo ""
echo "Done."
