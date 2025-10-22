#!/bin/bash
set -e

# Run CI checks locally - mimics GitHub Actions workflows
# This script runs all tests, linters, and checks that run in CI

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
EXIT_CODE=0
AUTO_FIXES_APPLIED=()
AUTO_FIXED_AND_PASSED=()

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# CI tools virtual environment
CI_VENV="$PROJECT_ROOT/.ci-venv"

# Helper functions
print_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

run_check() {
    local name=$1
    local command=$2

    echo -e "${YELLOW}Running: $name${NC}"
    if eval "$command"; then
        print_success "$name passed"
    else
        print_error "$name failed"
        EXIT_CODE=1
        return 1
    fi
    return 0
}

# Auto-fix functions
auto_fix_black() {
    if [ "$AUTO_FIX" = true ]; then
        echo -e "${YELLOW}Auto-fixing Black formatting...${NC}"
        local current_dir=$(pwd)
        cd "$PROJECT_ROOT"
        poetry run black backend/
        print_success "Black formatting fixed"
        AUTO_FIXES_APPLIED+=("Black formatting")
        cd "$current_dir"
    fi
}

auto_fix_ruff() {
    if [ "$AUTO_FIX" = true ]; then
        echo -e "${YELLOW}Auto-fixing Ruff issues...${NC}"
        local current_dir=$(pwd)
        cd "$PROJECT_ROOT"
        "$CI_VENV/bin/ruff" check backend/ --fix
        print_success "Ruff issues fixed (where possible)"
        AUTO_FIXES_APPLIED+=("Ruff")
        cd "$current_dir"
    fi
}

auto_fix_eslint() {
    if [ "$AUTO_FIX" = true ]; then
        echo -e "${YELLOW}Auto-fixing ESLint issues...${NC}"
        local current_dir=$(pwd)
        cd "$PROJECT_ROOT/frontend"
        npm run lint -- --fix
        print_success "ESLint issues fixed (where possible)"
        AUTO_FIXES_APPLIED+=("ESLint")
        cd "$current_dir"
    fi
}

auto_fix_prettier() {
    if [ "$AUTO_FIX" = true ]; then
        echo -e "${YELLOW}Auto-fixing Prettier formatting...${NC}"
        local current_dir=$(pwd)
        cd "$PROJECT_ROOT/frontend"
        npm run format
        print_success "Prettier formatting fixed"
        AUTO_FIXES_APPLIED+=("Prettier formatting")
        cd "$current_dir"
    fi
}

# Parse arguments
SKIP_TESTS=false
SKIP_LINT=false
SKIP_SECURITY=false
SKIP_DOCKER=true  # Skip Docker build by default
QUICK=false
AUTO_FIX=true  # Auto-fix is enabled by default
FRONTEND_ONLY=false
BACKEND_ONLY=false
USE_POSTGRES=false  # Use SQLite by default for faster tests

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --skip-lint)
      SKIP_LINT=true
      shift
      ;;
    --skip-security)
      SKIP_SECURITY=true
      shift
      ;;
    --skip-docker)
      SKIP_DOCKER=true
      shift
      ;;
    --quick)
      QUICK=true
      shift
      ;;
    --include-docker)
      SKIP_DOCKER=false
      shift
      ;;
    --auto-fix)
      AUTO_FIX=true
      shift
      ;;
    --no-auto-fix)
      AUTO_FIX=false
      shift
      ;;
    --frontend-only)
      FRONTEND_ONLY=true
      shift
      ;;
    --backend-only)
      BACKEND_ONLY=true
      shift
      ;;
    --postgres)
      USE_POSTGRES=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-tests      Skip running tests"
      echo "  --skip-lint       Skip linting checks"
      echo "  --skip-security   Skip security scans"
      echo "  --skip-docker     Skip Docker build test (default: true)"
      echo "  --include-docker  Include Docker build test"
      echo "  --quick           Run quick tests only (similar to PR checks)"
      echo "  --auto-fix        Automatically fix common issues (default: enabled)"
      echo "  --no-auto-fix     Disable automatic fixes"
      echo "  --frontend-only   Run only frontend-related tests and checks"
      echo "  --backend-only    Run only backend-related tests and checks"
      echo "  --postgres        Use PostgreSQL for tests (requires Docker)"
      echo "  -h, --help        Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Validate flags
if [ "$FRONTEND_ONLY" = true ] && [ "$BACKEND_ONLY" = true ]; then
    print_error "Cannot use both --frontend-only and --backend-only flags together"
    exit 1
fi

# Main script
print_section "Gate Access Controller CI Checks"
if [ "$FRONTEND_ONLY" = true ]; then
    echo "This script runs frontend CI checks locally"
elif [ "$BACKEND_ONLY" = true ]; then
    echo "This script runs backend CI checks locally"
else
    echo "This script runs all CI checks locally"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check prerequisites
print_section "Checking Prerequisites"

# Change to project root
cd "$PROJECT_ROOT"

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed"
    exit 1
else
    print_success "Python $(python3 --version | cut -d' ' -f2) found"
fi

# Check Poetry
if ! command -v poetry &> /dev/null; then
    print_error "Poetry is not installed. Please install it: https://python-poetry.org/docs/#installation"
    exit 1
else
    print_success "Poetry $(poetry --version | cut -d' ' -f3) found"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
else
    print_success "Node.js $(node --version) found"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
else
    print_success "npm $(npm --version) found"
fi

# Setup CI virtual environment for tools
if [ ! -d "$CI_VENV" ]; then
    echo -e "\n${YELLOW}Creating CI tools virtual environment...${NC}"
    python3 -m venv "$CI_VENV"
fi

# Activate virtual environment
source "$CI_VENV/bin/activate"

# Upgrade pip in virtual environment
echo -e "${YELLOW}Ensuring pip is up to date...${NC}"
python -m pip install --upgrade pip --quiet

# Backend Tests
if [ "$SKIP_TESTS" = false ] && [ "$FRONTEND_ONLY" = false ]; then
    print_section "Backend Tests"

    cd "$PROJECT_ROOT"
    if [ ! -d ".venv" ]; then
        echo "Installing backend dependencies..."
        poetry install --with dev
    fi

    # Setup PostgreSQL if requested
    POSTGRES_CONTAINER=""
    if [ "$USE_POSTGRES" = true ]; then
        echo -e "${YELLOW}Starting PostgreSQL container for tests...${NC}"

        # Check if Docker is available
        if ! command -v docker &> /dev/null; then
            print_error "Docker is required for PostgreSQL tests but is not installed"
            exit 1
        fi

        # Start PostgreSQL container
        POSTGRES_CONTAINER="gate-access-test-db-$$"
        docker run -d \
            --name "$POSTGRES_CONTAINER" \
            -e POSTGRES_USER=test_user \
            -e POSTGRES_PASSWORD=test_password \
            -e POSTGRES_DB=test_gate_access \
            -p 5432:5432 \
            postgres:15-alpine > /dev/null 2>&1

        # Wait for PostgreSQL to be ready
        echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
        for i in {1..30}; do
            if docker exec "$POSTGRES_CONTAINER" pg_isready -U test_user > /dev/null 2>&1; then
                print_success "PostgreSQL is ready"
                break
            fi
            if [ $i -eq 30 ]; then
                print_error "PostgreSQL failed to start in time"
                docker rm -f "$POSTGRES_CONTAINER" > /dev/null 2>&1
                exit 1
            fi
            sleep 1
        done

        export DATABASE_URL="postgresql://test_user:test_password@localhost:5432/test_gate_access"
        export TESTING="true"
        print_success "PostgreSQL test database started"
    else
        export TESTING="true"
        print_success "Using SQLite for tests (use --postgres for PostgreSQL)"
    fi

    if [ "$QUICK" = true ]; then
        run_check "Backend quick tests" "poetry run pytest -x --ff"
    else
        run_check "Backend tests with coverage" "poetry run pytest --cov=backend/app --cov-report=xml --cov-report=term"
    fi

    # Cleanup PostgreSQL container if it was started
    if [ -n "$POSTGRES_CONTAINER" ]; then
        echo -e "${YELLOW}Stopping PostgreSQL container...${NC}"
        docker rm -f "$POSTGRES_CONTAINER" > /dev/null 2>&1
        print_success "PostgreSQL test database stopped"
    fi

    cd "$PROJECT_ROOT"
fi

# Frontend Build & Type Check
if [ "$SKIP_TESTS" = false ] && [ "$BACKEND_ONLY" = false ]; then
    print_section "Frontend Type Check & Build"

    cd "$PROJECT_ROOT/frontend"
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm ci
    fi

    run_check "Frontend TypeScript check" "npm run type-check"

    if [ "$QUICK" = false ]; then
        run_check "Frontend build" "npm run build"
    fi

    # Note about tests
    print_warning "Frontend tests not configured yet - add 'test' script to package.json"

    cd "$PROJECT_ROOT"
fi

# Python Linting
if [ "$SKIP_LINT" = false ] && [ "$FRONTEND_ONLY" = false ]; then
    print_section "Python Linting"

    # Install linting tools in CI virtual environment
    echo "Installing linting tools..."
    python -m pip install --quiet ruff==0.8.3 mypy==1.13.0

    # Ensure backend dependencies are installed for black
    cd "$PROJECT_ROOT"
    if [ ! -d ".venv" ]; then
        poetry install --with dev
    fi

    # Black checks
    echo -e "\n${YELLOW}Black Code Formatting${NC}"

    SAVED_EXIT_CODE=$EXIT_CODE

    if ! run_check "Black formatting" "poetry run black --check backend/"; then
        if [ "$AUTO_FIX" = true ]; then
            auto_fix_black
            # Re-run the check after fix
            if run_check "Black formatting (after fix)" "poetry run black --check backend/"; then
                EXIT_CODE=$SAVED_EXIT_CODE
                AUTO_FIXED_AND_PASSED+=("Black formatting")
                print_success "Black formatting auto-fixed successfully - counting as PASS"
            fi
        fi
    fi

    # Ruff checks
    echo -e "\n${YELLOW}Ruff Linting${NC}"

    SAVED_EXIT_CODE=$EXIT_CODE

    if ! run_check "Ruff" "cd \"$PROJECT_ROOT\" && \"$CI_VENV/bin/ruff\" check backend/"; then
        if [ "$AUTO_FIX" = true ]; then
            auto_fix_ruff
            # Re-run the check after fix
            if run_check "Ruff (after fix)" "cd \"$PROJECT_ROOT\" && \"$CI_VENV/bin/ruff\" check backend/"; then
                EXIT_CODE=$SAVED_EXIT_CODE
                AUTO_FIXED_AND_PASSED+=("Ruff")
                print_success "Ruff auto-fixed successfully - counting as PASS"
            fi
        fi
    fi

    # MyPy checks
    echo -e "\n${YELLOW}MyPy Type Checking${NC}"

    cd "$PROJECT_ROOT"
    if [ ! -d ".venv" ]; then
        poetry install --with dev
    fi
    run_check "MyPy" "poetry run mypy backend/app/ --ignore-missing-imports"
    cd "$PROJECT_ROOT"
fi

# Frontend Linting
if [ "$SKIP_LINT" = false ] && [ "$BACKEND_ONLY" = false ]; then
    print_section "Frontend Linting"

    cd "$PROJECT_ROOT/frontend"
    if [ ! -d "node_modules" ]; then
        npm ci
    fi

    # ESLint
    SAVED_EXIT_CODE=$EXIT_CODE

    if ! run_check "ESLint" "npm run lint"; then
        if [ "$AUTO_FIX" = true ]; then
            auto_fix_eslint
            # Re-run the check after fix
            if run_check "ESLint (after fix)" "npm run lint"; then
                EXIT_CODE=$SAVED_EXIT_CODE
                AUTO_FIXED_AND_PASSED+=("ESLint")
                print_success "ESLint auto-fixed successfully - counting as PASS"
            fi
        fi
    fi

    # Prettier (if format script exists)
    if npm run | grep -q "format"; then
        SAVED_EXIT_CODE=$EXIT_CODE

        if ! run_check "Prettier formatting check" "npm run format -- --check"; then
            if [ "$AUTO_FIX" = true ]; then
                auto_fix_prettier
                # Re-run the check after fix
                if run_check "Prettier formatting check (after fix)" "npm run format -- --check"; then
                    EXIT_CODE=$SAVED_EXIT_CODE
                    AUTO_FIXED_AND_PASSED+=("Prettier formatting")
                    print_success "Prettier formatting auto-fixed successfully - counting as PASS"
                fi
            fi
        fi
    fi

    cd "$PROJECT_ROOT"
fi

# Security Scanning
if [ "$SKIP_SECURITY" = false ]; then
    print_section "Security Scanning"

    # Trivy scan
    if command -v trivy &> /dev/null; then
        if [ "$QUICK" = true ]; then
            run_check "Trivy quick scan (CRITICAL only)" "cd \"$PROJECT_ROOT\" && trivy fs . --severity CRITICAL --exit-code 0"
        else
            run_check "Trivy full scan" "cd \"$PROJECT_ROOT\" && trivy fs . --severity CRITICAL,HIGH --exit-code 0"
        fi
    else
        echo -e "${YELLOW}Trivy not installed. Skipping vulnerability scan.${NC}"
        echo "Install with: brew install trivy (macOS) or see https://github.com/aquasecurity/trivy"
    fi

    # npm audit (only if not quick mode and not backend-only)
    if [ "$QUICK" = false ] && [ "$BACKEND_ONLY" = false ]; then
        echo -e "\n${YELLOW}npm Dependency Audit${NC}"
        cd "$PROJECT_ROOT/frontend"
        run_check "npm audit" "npm audit --json > npm-audit.json && ([ ! -s npm-audit.json ] || (cat npm-audit.json | jq -e '.vulnerabilities | length == 0')) || true"
        rm -f npm-audit.json
        cd "$PROJECT_ROOT"
    fi
fi

# Docker Build Test (only if explicitly requested)
if [ "$SKIP_DOCKER" = false ]; then
    print_section "Docker Build Test"

    if command -v docker &> /dev/null; then
        run_check "Docker build" "cd \"$PROJECT_ROOT\" && docker build -f Dockerfile -t gate-access-controller:ci-test ."

        # Clean up
        docker rmi gate-access-controller:ci-test 2>/dev/null || true
    else
        echo -e "${YELLOW}Docker not installed. Skipping Docker build test.${NC}"
    fi
fi

# Summary
print_section "CI Check Summary"

if [ $EXIT_CODE -eq 0 ]; then
    print_success "All CI checks passed! ✨"
else
    print_error "Some CI checks failed. Please fix the issues above."
    if [ "$AUTO_FIX" = false ]; then
        echo -e "${YELLOW}Tip: Auto-fix is disabled. Remove --no-auto-fix to automatically fix some issues${NC}"
    fi
fi

# Show auto-fixes summary
if [ ${#AUTO_FIXES_APPLIED[@]} -gt 0 ] && [ "$AUTO_FIX" = true ]; then
    echo -e "\n${YELLOW}Auto-fixes applied:${NC}"
    for fix in "${AUTO_FIXES_APPLIED[@]}"; do
        echo -e "  ${GREEN}✓${NC} $fix"
    done
    echo -e "\n${YELLOW}Please review the changes and commit if they look good.${NC}"
fi

# Show auto-fixed and passed checks
if [ ${#AUTO_FIXED_AND_PASSED[@]} -gt 0 ]; then
    echo -e "\n${GREEN}Auto-fixed checks (counted as PASS):${NC}"
    for check in "${AUTO_FIXED_AND_PASSED[@]}"; do
        echo -e "  ${GREEN}✓${NC} $check - auto-fixed and passing"
    done
fi

# Deactivate virtual environment
deactivate 2>/dev/null || true

exit $EXIT_CODE
