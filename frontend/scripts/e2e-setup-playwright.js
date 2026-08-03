#!/usr/bin/env node

const { execFileSync, spawn } = require("child_process")
const fs = require("fs")
const http = require("http")
const os = require("os")
const path = require("path")

const HOST = "127.0.0.1"
const BACKEND_PORT = 8080
const FRONTEND_PORT = 3000
const POSTGRES_PORT = 55410
const DB_CONTAINER = "nalagrow-pg-azh410"
const REPO_ROOT = path.resolve(__dirname, "../..")
const BACKEND_DIR = path.join(REPO_ROOT, "backend")
const FRONTEND_DIR = path.join(REPO_ROOT, "frontend")
const BUILD_DIR = path.join(os.tmpdir(), "nala-grow-e2e")
const BACKEND_EXE = path.join(BUILD_DIR, process.platform === "win32" ? "nala-grow-backend.exe" : "nala-grow-backend")

const children = new Map()
let shuttingDown = false

function log(message) {
  console.log(`[e2e-setup] ${message}`)
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options })
}

function listenerPids(port) {
  if (process.platform === "win32") {
    const script = `$items = Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($items) { [Console]::Out.Write(($items -join ',')) }; exit 0`
    const output = run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]).trim()
    return output ? output.split(",").map(Number).filter(Number.isInteger) : []
  }
  try {
    return run("lsof", ["-t", `-iTCP:${port}`, "-sTCP:LISTEN"]).trim().split(/\s+/).map(Number).filter(Number.isInteger)
  } catch (error) {
    if (error.status === 1) return []
    throw error
  }
}

async function reclaimPort(port) {
  const pids = listenerPids(port)
  for (const pid of pids) {
    if (pid === process.pid) throw new Error(`Refusing to terminate lifecycle process ${pid} on port ${port}`)
    log(`Reclaiming port ${port} from listener PID ${pid}`)
    if (process.platform === "win32") run("taskkill.exe", ["/PID", String(pid), "/T", "/F"])
    else process.kill(pid, "SIGTERM")
  }
  const deadline = Date.now() + 10_000
  while (listenerPids(port).length > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  const remaining = listenerPids(port)
  if (remaining.length > 0) throw new Error(`Port ${port} remains occupied by PID(s) ${remaining.join(", ")}`)
}

function waitForUrl(url, timeoutMs, childName) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const poll = () => {
      if (!children.has(childName)) return reject(new Error(`${childName} exited before ${url} became healthy`))
      const request = http.get(url, { timeout: 2_000 }, (response) => {
        response.resume()
        if (response.statusCode >= 200 && response.statusCode < 400) return resolve()
        retry(new Error(`${url} returned HTTP ${response.statusCode}`))
      })
      request.on("timeout", () => request.destroy(new Error("request timed out")))
      request.on("error", retry)
    }
    const retry = (lastError) => {
      if (Date.now() >= deadline) return reject(new Error(`${url} was not ready after ${timeoutMs}ms: ${lastError.message}`))
      setTimeout(poll, 500)
    }
    poll()
  })
}

function startChild(name, command, args, options) {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], shell: false, ...options })
  children.set(name, child)
  child.stdout.on("data", (data) => log(`[${name}] ${data.toString().trimEnd()}`))
  child.stderr.on("data", (data) => log(`[${name}] ${data.toString().trimEnd()}`))
  child.on("error", (error) => fail(`${name} failed to start: ${error.message}`))
  child.on("exit", (code, signal) => {
    children.delete(name)
    if (!shuttingDown) fail(`${name} exited unexpectedly (code=${code}, signal=${signal})`)
  })
  return child
}

function stopChild(name, child) {
  if (!child || child.exitCode !== null) return
  log(`Stopping owned ${name} process tree (PID ${child.pid})`)
  try {
    if (process.platform === "win32") run("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"])
    else child.kill("SIGTERM")
  } catch (error) {
    log(`Could not stop ${name}: ${error.message}`)
  }
}

function cleanup(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const [name, child] of [...children.entries()].reverse()) stopChild(name, child)
  children.clear()
  try {
    run("docker", ["stop", DB_CONTAINER], { stdio: "ignore" })
    log(`Stopped PostgreSQL container ${DB_CONTAINER} (container preserved)`)
  } catch (error) {
    log(`PostgreSQL cleanup warning: ${error.message}`)
  }
  process.exit(exitCode)
}

function fail(message) {
  console.error(`[e2e-setup] ERROR: ${message}`)
  cleanup(1)
}

function ensurePostgres() {
  log("Starting PostgreSQL")
  let exists = false
  try {
    exists = run("docker", ["container", "inspect", DB_CONTAINER], { stdio: "ignore" }) !== undefined
  } catch {}
  if (exists) run("docker", ["start", DB_CONTAINER], { stdio: "ignore" })
  else run("docker", ["run", "-d", "--name", DB_CONTAINER, "-e", "POSTGRES_USER=nalagrow", "-e", "POSTGRES_PASSWORD=nalagrow", "-e", "POSTGRES_DB=nalagrow", "-p", `${POSTGRES_PORT}:5432`, "postgres:16-alpine"], { stdio: "ignore" })

  const deadline = Date.now() + 60_000
  let consecutiveReadyChecks = 0
  while (Date.now() < deadline) {
    try {
      run("docker", ["exec", DB_CONTAINER, "psql", "-U", "nalagrow", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "SELECT 1;"], { stdio: "ignore" })
      consecutiveReadyChecks += 1
      if (consecutiveReadyChecks >= 2) break
    } catch {
      consecutiveReadyChecks = 0
      if (Date.now() >= deadline) throw new Error("PostgreSQL did not become ready within 60 seconds")
    }
    sleep(1_000)
  }
  if (consecutiveReadyChecks < 2) throw new Error("PostgreSQL did not become stably ready within 60 seconds")
  run("docker", ["exec", DB_CONTAINER, "psql", "-U", "nalagrow", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "DROP DATABASE IF EXISTS nalagrow_test WITH (FORCE);"])
  run("docker", ["exec", DB_CONTAINER, "psql", "-U", "nalagrow", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "CREATE DATABASE nalagrow_test;"])
  log("PostgreSQL is ready with a fresh nalagrow_test database")
}

async function main() {
  await reclaimPort(FRONTEND_PORT)
  await reclaimPort(BACKEND_PORT)
  ensurePostgres()

  fs.mkdirSync(BUILD_DIR, { recursive: true })
  log(`Building stable backend executable at ${BACKEND_EXE}`)
  run("go", ["build", "-o", BACKEND_EXE, "./cmd/server"], { cwd: BACKEND_DIR, stdio: "inherit" })

  startChild("backend", BACKEND_EXE, [], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      HOST,
      PORT: String(BACKEND_PORT),
      ALLOWED_ORIGIN: `http://${HOST}:${FRONTEND_PORT}`,
      DATABASE_URL: `postgres://nalagrow:nalagrow@${HOST}:${POSTGRES_PORT}/nalagrow_test?sslmode=disable`,
      JWT_SECRET: "e2e-disposable-secret",
    },
  })
  await waitForUrl(`http://${HOST}:${BACKEND_PORT}/health`, 60_000, "backend")
  log(`Backend healthy at http://${HOST}:${BACKEND_PORT}/health`)

  const nextCli = require.resolve("next/dist/bin/next")
  startChild("frontend", process.execPath, [nextCli, "dev", "--hostname", HOST, "--port", String(FRONTEND_PORT)], {
    cwd: FRONTEND_DIR,
    env: { ...process.env, NEXT_PUBLIC_GRAPHQL_URL: `http://${HOST}:${BACKEND_PORT}/graphql` },
  })
  await waitForUrl(`http://${HOST}:${FRONTEND_PORT}/login`, 120_000, "frontend")
  log(`Frontend ready at http://${HOST}:${FRONTEND_PORT}/login`)
  log("All services healthy; waiting for Playwright")

  process.on("SIGINT", () => cleanup(0))
  process.on("SIGTERM", () => cleanup(0))
  process.on("message", (message) => {
    if (message?.type === "shutdown") cleanup(0)
  })
}

main().catch((error) => fail(error.stack || error.message))
