#!/usr/bin/env bash
#
# Sherpy CLI Installer
# Builds from source and installs to /usr/local/bin
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/validkeys/sherpy/main/install.sh | bash
#   OR
#   ./install.sh

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
MIN_GO_VERSION="1.26"
SKILLS_DIR="$HOME/.claude/skills"
SKILL_NAME="sherpy-cli-planner"

# Platform detection
OS="$(uname -s)"
ARCH="$(uname -m)"

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

# Check if running on supported platform
check_platform() {
    case "$OS" in
        Linux|Darwin)
            success "Detected platform: $OS ($ARCH)"
            ;;
        *)
            error "Unsupported operating system: $OS"
            error "This installer supports macOS and Linux only"
            exit 1
            ;;
    esac
}

# Check if Go is installed
check_go() {
    if ! command -v go &> /dev/null; then
        error "Go is not installed"
        echo ""
        echo "Please install Go $MIN_GO_VERSION or later:"
        echo "  - macOS: brew install go"
        echo "  - Linux: https://go.dev/doc/install"
        exit 1
    fi

    GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
    success "Found Go $GO_VERSION"

    # Simple version check (just check major.minor)
    GO_MAJOR=$(echo "$GO_VERSION" | cut -d. -f1)
    GO_MINOR=$(echo "$GO_VERSION" | cut -d. -f2)
    MIN_MAJOR=$(echo "$MIN_GO_VERSION" | cut -d. -f1)
    MIN_MINOR=$(echo "$MIN_GO_VERSION" | cut -d. -f2)

    if [ "$GO_MAJOR" -lt "$MIN_MAJOR" ]; then
        error "Go $MIN_GO_VERSION or later required (found $GO_VERSION)"
        echo ""
        echo "Please upgrade Go:"
        echo "  - macOS: brew upgrade go"
        echo "  - Linux: https://go.dev/doc/install"
        exit 1
    fi

    if [ "$GO_MAJOR" -eq "$MIN_MAJOR" ] && [ "$GO_MINOR" -lt "$MIN_MINOR" ]; then
        error "Go $MIN_GO_VERSION or later required (found $GO_VERSION)"
        echo ""
        echo "Please upgrade Go:"
        echo "  - macOS: brew upgrade go"
        echo "  - Linux: https://go.dev/doc/install"
        exit 1
    fi

    success "Go version check passed ($GO_VERSION >= $MIN_GO_VERSION)"
}

# Check if git is installed
check_git() {
    if ! command -v git &> /dev/null; then
        error "Git is not installed"
        echo ""
        echo "Please install Git:"
        echo "  - macOS: brew install git"
        echo "  - Linux: apt-get install git / yum install git"
        exit 1
    fi
    success "Found git $(git --version | awk '{print $3}')"
}

# Check if make is installed
check_make() {
    if ! command -v make &> /dev/null; then
        error "Make is not installed"
        echo ""
        echo "Please install Make:"
        echo "  - macOS: xcode-select --install"
        echo "  - Linux: apt-get install build-essential / yum install make"
        exit 1
    fi
    success "Found make"
}

# Check if install directory is writable
check_install_dir() {
    if [ ! -d "$INSTALL_DIR" ]; then
        warn "Install directory $INSTALL_DIR does not exist"
        info "Will attempt to create it (may require sudo)"
        return
    fi

    if [ -w "$INSTALL_DIR" ]; then
        success "Install directory $INSTALL_DIR is writable"
    else
        warn "Install directory $INSTALL_DIR requires sudo access"
        info "You may be prompted for your password during installation"
    fi
}

# Clone or update repository
clone_repo() {
    TEMP_DIR=$(mktemp -d)
    info "Cloning repository to $TEMP_DIR"

    if git clone --depth 1 https://github.com/validkeys/sherpy.git "$TEMP_DIR" &> /dev/null; then
        success "Repository cloned"
        cd "$TEMP_DIR"
    else
        error "Failed to clone repository"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
}

# Build binary
build_binary() {
    info "Building $BINARY_NAME from source..."

    if make build &> /dev/null; then
        success "Build completed successfully"
    else
        error "Build failed"
        echo ""
        echo "Try building manually:"
        echo "  cd $TEMP_DIR"
        echo "  make build"
        exit 1
    fi

    # Verify binary was created
    if [ ! -f "$BINARY_NAME" ]; then
        error "Binary not found after build"
        exit 1
    fi

    # Test binary
    if ./"$BINARY_NAME" --help &> /dev/null; then
        success "Binary is functional"
    else
        error "Binary test failed"
        exit 1
    fi
}

# Install binary
install_binary() {
    info "Installing $BINARY_NAME to $INSTALL_DIR"

    # Create install directory if it doesn't exist
    if [ ! -d "$INSTALL_DIR" ]; then
        if sudo mkdir -p "$INSTALL_DIR" 2>/dev/null; then
            success "Created install directory"
        else
            error "Failed to create install directory"
            exit 1
        fi
    fi

    # Install binary
    if [ -w "$INSTALL_DIR" ]; then
        # No sudo needed
        if cp "$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"; then
            success "Installed $BINARY_NAME to $INSTALL_DIR"
        else
            error "Failed to install binary"
            exit 1
        fi
    else
        # Sudo needed
        if sudo cp "$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"; then
            success "Installed $BINARY_NAME to $INSTALL_DIR (with sudo)"
        else
            error "Failed to install binary (sudo required)"
            exit 1
        fi
    fi

    # Make binary executable
    if [ -w "$INSTALL_DIR/$BINARY_NAME" ]; then
        chmod +x "$INSTALL_DIR/$BINARY_NAME"
    else
        sudo chmod +x "$INSTALL_DIR/$BINARY_NAME"
    fi
}

# Verify installation
verify_installation() {
    info "Verifying installation..."

    # Check if binary is in PATH
    if command -v "$BINARY_NAME" &> /dev/null; then
        INSTALLED_VERSION=$("$BINARY_NAME" --version 2>&1 | head -1 || echo "unknown")
        success "$BINARY_NAME is now available in your PATH"
        info "Version: $INSTALLED_VERSION"
    else
        error "$BINARY_NAME is not in your PATH"
        echo ""
        echo "Add $INSTALL_DIR to your PATH by adding this line to your shell config:"
        echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
        exit 1
    fi

    # Run a simple command
    if "$BINARY_NAME" types &> /dev/null; then
        success "Installation verified successfully"
    else
        error "Installation verification failed"
        exit 1
    fi
}

# Check if Claude Code is installed
check_claude_code() {
    if [ -d "$HOME/.claude" ]; then
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

# Ask about skill installation
prompt_skill_installation() {
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║    Claude Code Skill Installation    ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""

    if ! check_claude_code; then
        info "Claude Code not detected (~/.claude directory not found)"
        info "Skipping skill installation"
        return
    fi

    success "Claude Code detected"

    if ! check_npx; then
        warn "npx not found (required for skill installation)"
        echo ""
        info "To install skills manually after sherpy is installed:"
        echo "  npx skills add validkeys/sherpy -s sherpy-cli-planner"
        echo ""
        info "Or install Node.js/npm to get npx:"
        echo "  - macOS: brew install node"
        echo "  - Linux: apt-get install nodejs npm / yum install nodejs npm"
        return
    fi

    success "npx detected"
    echo ""
    info "The sherpy-cli-planner skill orchestrates the full planning pipeline"
    info "using sherpy CLI commands. Would you like to install it?"
    echo ""
    echo "  - Provides /sherpy-cli-planner command in Claude Code"
    echo "  - Runs 12-step planning workflow (requirements → implementation)"
    echo "  - Token-efficient (loads instructions on-demand via CLI)"
    echo ""
    read -p "Install sherpy-cli-planner skill? (Y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Nn]$ ]]; then
        info "Skipping skill installation"
        return
    fi

    install_skill
}

# Install skill
install_skill() {
    info "Installing $SKILL_NAME skill using npx skills..."
    echo ""

    # Use the official skills CLI to install
    if npx skills add validkeys/sherpy -s sherpy-cli-planner; then
        echo ""
        success "Installed $SKILL_NAME skill"
        echo ""
        info "Usage in Claude Code:"
        echo "  /sherpy-cli-planner [output-directory]"
        echo ""
    else
        echo ""
        error "Failed to install skill using npx skills"
        warn "You can install the skill manually:"
        echo "  npx skills add validkeys/sherpy -s sherpy-cli-planner"
        echo ""
    fi
}

# Cleanup temporary files
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        info "Cleaning up temporary files"
        cd /
        rm -rf "$TEMP_DIR"
        success "Cleanup complete"
    fi
}

# Main installation flow
main() {
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║    Sherpy CLI Installer               ║"
    echo "║    Building from source               ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""

    info "Starting installation..."
    echo ""

    # Pre-flight checks
    check_platform
    check_go
    check_git
    check_make
    check_install_dir
    echo ""

    # Build and install
    clone_repo
    build_binary
    install_binary
    verify_installation

    # Optional skill installation
    prompt_skill_installation
    echo ""

    # Cleanup
    cleanup
    echo ""

    # Success message
    echo "╔═══════════════════════════════════════╗"
    echo "║    Installation Complete! 🎉          ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""
    success "$BINARY_NAME is installed and ready to use"
    echo ""
    info "Quick start:"
    echo "  $BINARY_NAME types                    # List document types"
    echo "  $BINARY_NAME prompt --list            # List available prompts"
    echo "  $BINARY_NAME validate -t <type> -f <file>  # Validate a document"
    echo "  $BINARY_NAME --help                   # Show all commands"
    echo ""
    info "Documentation: https://github.com/validkeys/sherpy"
    echo ""
}

# Trap errors and cleanup
trap cleanup EXIT

# Run main function
main
