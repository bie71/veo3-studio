SHELL := bash
.DEFAULT_GOAL := help

# Load variables from .env if present and export to child processes
ifneq (,$(wildcard .env))
include .env
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env)
endif

.PHONY: help install web server dev

help:
	@echo "Available targets:"
	@echo "  web      - Run web dev server (vite) in ./web"
	@echo "  server   - Run API server (tsx watch) in ./server"
	@echo "  dev      - Run both web and server together"
	@echo "  install  - Install dependencies in web and server"

install:
	cd server && npm install
	cd web && npm install

web:
	cd web && npm run dev

server:
	cd server && npm run dev

dev:
	@echo "Starting server and web (Ctrl+C to stop both)..."
	@trap 'kill 0' SIGINT SIGTERM EXIT; \
	( cd server && npm run dev ) & \
	( cd web && npm run dev ) & \
	wait

