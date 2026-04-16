# SDD Coder

Autonomous execution engine for Spec-Driven Development (SDD). Describe a task in plain language; the agent runs the full SDD pipeline (propose → spec → design → tasks → apply) and commits the result.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Node.js 24](https://nodejs.org/) + npm
- [git](https://git-scm.com/)
- [gh CLI](https://cli.github.com/)

## Setup

```bash
git clone https://github.com/your-org/sdd-coder.git
cd sdd-coder
cp .env.example .env
# Fill in required variables in .env
docker compose up
```

Open [http://localhost:3000](http://localhost:3000).

## Dev without Docker

```bash
npm install
npm run dev
```

## Reset database

```bash
docker compose down -v && docker compose up
```

## Run tests

```bash
npm test
```
