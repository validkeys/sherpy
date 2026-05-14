.PHONY: help build install test lint clean vet staticcheck

# Default target
.DEFAULT_GOAL := help

# Binary name
BINARY_NAME=sherpy
INSTALL_PATH=/usr/local/bin

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOINSTALL=$(GOCMD) install
GOTEST=$(GOCMD) test
GOVET=$(GOCMD) vet
GOCLEAN=$(GOCMD) clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the binary
	$(GOBUILD) -o $(BINARY_NAME) -v .

install: build ## Install the binary to /usr/local/bin
	sudo cp $(BINARY_NAME) $(INSTALL_PATH)/$(BINARY_NAME)

test: ## Run all tests
	$(GOTEST) ./... -v -count=1

vet: ## Run go vet
	$(GOVET) ./...

staticcheck: ## Run staticcheck (install if needed)
	@which staticcheck > /dev/null || (echo "Installing staticcheck..." && go install honnef.co/go/tools/cmd/staticcheck@latest)
	staticcheck ./...

lint: vet staticcheck ## Run all linters (vet + staticcheck)

clean: ## Remove binary and clean build cache
	$(GOCLEAN)
	rm -f $(BINARY_NAME)

integration-test: build ## Run integration tests with the built binary
	$(GOTEST) ./integration -v -count=1
