#!/usr/bin/env bash
#
# Sherpy CLI Uninstaller
# Removes sherpy from /usr/local/bin
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/validkeys/sherpy/main/uninstall.sh | bash
#   OR
#   ./uninstall.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BINARY_NAME="sherpy"
INSTALL_DIR="/usr/local/bin"
SKILLS_DIR="$HOME/.claude/skills"
SKILL_NAME="sherpy-cli-planner"

info() {
    echo -e "${BLUE}==>${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}!${NC} $1"
}

# Check if binary is installed
check_installation() {
    if [ ! -f "$INSTALL_DIR/$BINARY_NAME" ]; then
        warn "$BINARY_NAME is not installed at $INSTALL_DIR"

        # Check if it's in PATH somewhere else
        if command -v "$BINARY_NAME" &> /dev/null; then
            FOUND_PATH=$(command -v "$BINARY_NAME")
            warn "Found $BINARY_NAME at: $FOUND_PATH"
            echo ""
            echo "To remove it manually:"
            echo "  sudo rm \"$FOUND_PATH\""
        else
            info "$BINARY_NAME is not found in PATH"
        fi
        exit 0
    fi

    success "Found $BINARY_NAME at $INSTALL_DIR/$BINARY_NAME"
}

# Confirm uninstallation
confirm_uninstall() {
    echo ""
    warn "This will remove $BINARY_NAME from your system"
    echo ""
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Uninstallation cancelled"
        exit 0
    fi
}

# Remove binary
remove_binary() {
    info "Removing $BINARY_NAME from $INSTALL_DIR"

    if [ -w "$INSTALL_DIR" ]; then
        # No sudo needed
        if rm -f "$INSTALL_DIR/$BINARY_NAME"; then
            success "Removed $BINARY_NAME"
        else
            error "Failed to remove binary"
            exit 1
        fi
    else
        # Sudo needed
        if sudo rm -f "$INSTALL_DIR/$BINARY_NAME"; then
            success "Removed $BINARY_NAME (with sudo)"
        else
            error "Failed to remove binary (sudo required)"
            exit 1
        fi
    fi
}

# Verify removal
verify_removal() {
    info "Verifying removal..."

    if [ -f "$INSTALL_DIR/$BINARY_NAME" ]; then
        error "Binary still exists at $INSTALL_DIR/$BINARY_NAME"
        exit 1
    fi

    if command -v "$BINARY_NAME" &> /dev/null; then
        warn "$BINARY_NAME is still available in PATH"
        FOUND_PATH=$(command -v "$BINARY_NAME")
        warn "Found at: $FOUND_PATH"
        echo ""
        echo "You may have another installation. Remove it manually:"
        echo "  sudo rm \"$FOUND_PATH\""
    else
        success "$BINARY_NAME has been removed from your system"
    fi
}

# Check for installed skill
check_skill() {
    if [ -d "$SKILLS_DIR/$SKILL_NAME" ]; then
        return 0
    else
        return 1
    fi
}

# Check if npx is available
check_npx() {
    if command -v npx &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Ask about skill removal
prompt_skill_removal() {
    echo ""

    if ! check_skill; then
        return
    fi

    warn "Found $SKILL_NAME skill at $SKILLS_DIR/$SKILL_NAME"
    echo ""
    read -p "Remove $SKILL_NAME skill? (Y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Nn]$ ]]; then
        info "Keeping skill installation"
        return
    fi

    remove_skill
}

# Remove skill using npx skills
remove_skill_with_npx() {
    info "Removing $SKILL_NAME skill using npx skills..."
    echo ""

    if npx skills remove sherpy-cli-planner; then
        echo ""
        success "Removed $SKILL_NAME skill"
        return 0
    else
        echo ""
        error "Failed to remove skill using npx skills"
        return 1
    fi
}

# Remove skill
remove_skill() {
    # Try npx skills first if available
    if check_npx; then
        if remove_skill_with_npx; then
            return
        fi
        warn "Falling back to manual removal"
    else
        info "npx not found, using manual removal"
    fi

    # Manual removal fallback
    info "Removing $SKILL_NAME skill manually..."

    if rm -rf "$SKILLS_DIR/$SKILL_NAME"; then
        success "Removed $SKILL_NAME skill"
    else
        error "Failed to remove skill"
        echo "Remove manually: rm -rf \"$SKILLS_DIR/$SKILL_NAME\""
    fi
}

# Main uninstallation flow
main() {
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║    Sherpy CLI Uninstaller             ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""

    check_installation
    confirm_uninstall
    echo ""
    remove_binary
    verify_removal
    prompt_skill_removal
    echo ""

    # Success message
    echo "╔═══════════════════════════════════════╗"
    echo "║    Uninstallation Complete            ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""
    success "$BINARY_NAME has been removed"
    echo ""
    info "To reinstall, visit: https://github.com/validkeys/sherpy"
    echo ""
}

# Run main function
main
