# Everyday commands for this project. Run "make" to see them all.
# New machine: git clone ... && cd Patient_Management && make setup && make dev

.DEFAULT_GOAL := help
.PHONY: help setup install env db migrate seed dev backend frontend test eval build check audit clean

help: ## Show all commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  make %-10s %s\n", $$1, $$2}'

setup: install env db ## First-time setup: install packages, create backend/.env, create and fill the database
	@echo "Done. Run: make dev"

install: ## Install backend and frontend packages (exact versions from the lock files)
	cd backend && npm ci
	cd frontend && npm ci

env: ## Create backend/.env (asks for your MongoDB URI and Groq key, generates the JWT secret)
	@node backend/setup/init-env.js

db: migrate seed ## Create collections and indexes, then load the demo data

migrate: ## Create or update collections, validation rules and indexes
	cd backend && npm run migrate

seed: ## Load the demo data (replaces existing data)
	cd backend && npm run seed

dev: ## Run backend (5050) and frontend (5173) together; Ctrl+C stops both
	@trap 'kill 0' INT TERM; \
	(cd backend && npm run dev) & \
	(cd frontend && npm run dev) & \
	wait

backend: ## Run only the backend
	cd backend && npm run dev

frontend: ## Run only the frontend
	cd frontend && npm run dev

test: ## Run the backend tests (uses MONGO_URI_TEST, the AI is mocked)
	cd backend && npm test

eval: ## Run the 38-question golden set against the real AI (results in backend/eval/RESULTS.md)
	cd backend && npm run eval

build: ## Build the frontend for production
	cd frontend && npm run build

check: test build audit ## Everything before a push: tests, production build, security audit

audit: ## Check dependencies for known security issues
	cd backend && npm audit --omit=dev --audit-level=high
	cd frontend && npm audit --omit=dev --audit-level=high

clean: ## Remove installed packages and build output
	rm -rf backend/node_modules frontend/node_modules frontend/dist
