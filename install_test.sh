#!/usr/bin/env bash
#
# Test suite for install.sh version checking logic
# This is a standalone test file to validate version comparison
#

set -e

# ANSI colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Test version comparison logic
# This matches the logic that should be in install.sh
test_version_check() {
    local go_major=$1
    local go_minor=$2
    local min_major=$3
    local min_minor=$4
    local expected=$5  # "pass" or "fail"

    # Apply the same logic as install.sh
    if [ "$go_major" -lt "$min_major" ]; then
        result="fail"
    elif [ "$go_major" -eq "$min_major" ] && [ "$go_minor" -lt "$min_minor" ]; then
        result="fail"
    else
        result="pass"
    fi

    # Verify result matches expectation
    if [ "$result" != "$expected" ]; then
        echo -e "${RED}FAIL${NC}: version $go_major.$go_minor vs $min_major.$min_minor expected $expected, got $result"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    echo -e "${GREEN}PASS${NC}: version $go_major.$go_minor vs $min_major.$min_minor -> $result"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

echo "Running install.sh version check tests..."
echo ""

# Run test cases
test_version_check 1 20 1 26 fail   # Old version (should reject)
test_version_check 1 26 1 26 pass   # Exact version (should accept)
test_version_check 1 27 1 26 pass   # Newer minor (should accept)
test_version_check 2 0 1 26 pass    # Newer major (should accept)
test_version_check 1 25 1 26 fail   # Just under (should reject)
test_version_check 0 99 1 26 fail   # Very old (should reject)
test_version_check 1 26 1 25 pass   # Higher than minimum (should accept)

echo ""
echo "=========================================="
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $TESTS_FAILED"
echo "=========================================="

if [ $TESTS_FAILED -gt 0 ]; then
    exit 1
fi

exit 0
