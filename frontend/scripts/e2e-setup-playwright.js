#!/usr/bin/env node
// e2e-setup-playwright.js — lifecycle for Playwright E2E.
// Starts Postgres, resets DB, starts backend, starts frontend,
// then blocks until Playwright terminates this process.

const { spawn, execSync } = require("child_process")
const http = require("http")
const path = require("path")

const BACKEND_PORT = 8080
const FRONTEND_PORT = 3000
const POSTGRES_PORT = 5432
const DB_CONTAINER = "nalagrow-pg"
const REPO_ROOT = path.resolve(__dirname, "../..")
const BACKEND_DIR = path.join(REPO_ROOT, "backend")
const FRONTEND_DIR = path.join(REPO_ROOT, "frontend")

let backendProc = null
let frontendProc = null

function log(msg) {
  console.log(`[e2e-setup] ${msg}`)
}

function killPort(port) {
  try {
    const isWin = process.platform === "win32"
    if (isWin) {
      const out = execSync(`netstat -ano | findstr ":${port}"`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] })
      const pids = [...new Set(
        out.split("\n")
          .map(l => l.trim().split(/\s+/).pop())
          .filter(Boolean)
      )]
      pids.forEach(pid => {
        try { execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" }) } catch {}
      })
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore" })
    }
  } catch {}
}

function waitForPort(port, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      http.get(`http://localhost:${port}`, (res) => {
        res.resume()
        resolve()
      }).on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Port ${port} not ready after ${timeoutMs}ms`))
        } else {
          setTimeout(check, 1000)
        }
      })
    }
    check()
  })
}

function cleanup() {
  log("Cleaning up...")
  if (frontendProc) {
    try { frontendProc.kill("SIGTERM") } catch {}
    log("Frontend stopped")
  }
  if (backendProc) {
    try { backendProc.kill("SIGTERM") } catch {}
    log("Backend stopped")
  }
  try {
    execSync(`docker stop ${DB_CONTAINER}`, { stdio: "ignore" })
    log("DB stopped")
  } catch {}
  log("Done")
}

function resetDatabase() {
  log("Resetting database...")
  try {
    execSync(`docker exec ${DB_CONTAINER} psql -U nalagrow -c "DROP DATABASE IF EXISTS nalagrow_test;"`, { stdio: "ignore" })
    execSync(`docker exec ${DB_CONTAINER} psql -U nalagrow -c "CREATE DATABASE nalagrow_test;"`, { stdio: "ignore" })
    log("Database reset complete")
  } catch (e) {
    log(`Database reset failed: ${e.message}`)
  }
}

async function main() {
  // --- Kill stale processes ---
  log("Killing stale processes on ports 3000, 8080...")
  killPort(FRONTEND_PORT)
  killPort(BACKEND_PORT)

  // --- PostgreSQL ---
  log("Starting PostgreSQL...")
  try {
    const ps = execSync("docker ps --format {{.Names}}", { encoding: "utf8" })
    if (ps.includes(DB_CONTAINER)) {
      log("DB already running, resetting...")
      resetDatabase()
    } else {
      try {
        execSync(`docker start ${DB_CONTAINER}`, { stdio: "ignore" })
      } catch {
        execSync(
          `docker run -d --name ${DB_CONTAINER} -e POSTGRES_USER=nalagrow -e POSTGRES_PASSWORD=nalagrow -e POSTGRES_DB=nalagrow -p ${POSTGRES_PORT}:5432 postgres:16-alpine`,
          { stdio: "ignore" }
        )
      }
    }
  } catch {
    log("ERROR: Docker not available")
    process.exit(1)
  }

  log("Waiting for DB...")
  for (let i = 0; i < 60; i++) {
    try {
      execSync(`docker exec ${DB_CONTAINER} pg_isready -U nalagrow -q`, { stdio: "ignore" })
      log("DB is ready")
      break
    } catch {}
    if (i === 59) { log("ERROR: DB not ready"); process.exit(1) }
    await new Promise(r => setTimeout(r, 1000))
  }

  // Reset DB before each run
  resetDatabase()

  // --- Backend ---
  log("Starting backend...")
  const backendExe = process.platform === "win32" ? "nala-grow-backend.exe" : "./nala-grow-backend"
  backendProc = spawn(backendExe, [], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      ALLOWED_ORIGIN: `http://localhost:${FRONTEND_PORT}`,
      DATABASE_URL: `postgres://nalagrow:nalagrow@localhost:${POSTGRES_PORT}/nalagrow_test?sslmode=disable`,
    },
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  })

  backendProc.stdout.on("data", (d) => log(`[backend] ${d.toString().trim()}`))
  backendProc.stderr.on("data", (d) => log(`[backend] ${d.toString().trim()}`))
  backendProc.on("error", (e) => { log(`Backend error: ${e.message}`); process.exit(1) })

  log("Waiting for backend...")
  try {
    await waitForPort(BACKEND_PORT, 30000)
    log("Backend is ready")
  } catch (e) { log(e.message); process.exit(1) }

  // --- Frontend ---
  log("Starting frontend...")
  const isWin = process.platform === "win32"
  frontendProc = spawn(isWin ? "npm.cmd" : "npm", ["run", "dev"], {
    cwd: FRONTEND_DIR,
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  })

  frontendProc.stdout.on("data", (d) => log(`[frontend] ${d.toString().trim()}`))
  frontendProc.stderr.on("data", (d) => log(`[frontend] ${d.toString().trim()}`))
  frontendProc.on("error", (e) => { log(`Frontend error: ${e.message}`); process.exit(1) })

  log("Waiting for frontend...")
  try {
    await waitForPort(FRONTEND_PORT, 60000)
    log("Frontend is ready")
  } catch (e) { log(e.message); process.exit(1) }

  log("All services running. Waiting for Playwright to finish...")

  process.stdin.on("end", () => { cleanup(); process.exit(0) })
  process.on("SIGTERM", () => { cleanup(); process.exit(0) })
  process.on("SIGINT", () => { cleanup(); process.exit(0) })

  await new Promise(() => {})
}

main().catch((e) => { log(`Fatal: ${e.message}`); process.exit(1) })
