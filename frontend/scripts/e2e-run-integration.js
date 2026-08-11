#!/usr/bin/env node

const { spawn } = require("child_process")
const path = require("path")

const frontendDir = path.resolve(__dirname, "..")
const lifecycleScript = path.join(__dirname, "e2e-setup-playwright.js")
const playwrightCli = require.resolve("@playwright/test/cli")
const defaultSpec = "e2e/frontend-backend-integration.spec.ts"
let lifecycle
let shuttingDown = false

function isSpecPath(argument) {
  return /\.spec\.[cm]?[jt]sx?$/i.test(argument)
}

function buildPlaywrightArgs(cliArgs) {
  const specArgs = cliArgs.some(isSpecPath) ? [] : [defaultSpec]
  return ["test", ...specArgs, "--project=desktop", ...cliArgs]
}

function pipeWithReadiness(stream, target, onLine) {
  let buffer = ""
  stream.on("data", (chunk) => {
    const text = chunk.toString()
    target.write(text)
    buffer += text
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ""
    for (const line of lines) onLine(line)
  })
}

function startLifecycle() {
  return new Promise((resolve, reject) => {
    let ready = false
    lifecycle = spawn(process.execPath, [lifecycleScript], {
      cwd: frontendDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      shell: false,
    })
    const inspectLine = (line) => {
      if (!ready && line.includes("All services healthy; waiting for Playwright")) {
        ready = true
        resolve()
      }
    }
    pipeWithReadiness(lifecycle.stdout, process.stdout, inspectLine)
    pipeWithReadiness(lifecycle.stderr, process.stderr, inspectLine)
    lifecycle.on("error", reject)
    lifecycle.on("exit", (code, signal) => {
      if (!ready) reject(new Error(`E2E lifecycle exited before readiness (code=${code}, signal=${signal})`))
      else if (!shuttingDown) reject(new Error(`E2E lifecycle exited during Playwright (code=${code}, signal=${signal})`))
    })
  })
}

function runPlaywright(cliArgs = process.argv.slice(2)) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [playwrightCli, ...buildPlaywrightArgs(cliArgs)], {
      cwd: frontendDir,
      env: { ...process.env, E2E_SERVICES_EXTERNAL: "1" },
      stdio: "inherit",
      shell: false,
    })
    child.on("error", reject)
    child.on("exit", (code, signal) => {
      if (signal) reject(new Error(`Playwright terminated by ${signal}`))
      else resolve(code ?? 1)
    })
  })
}

async function shutdownLifecycle() {
  if (!lifecycle || lifecycle.exitCode !== null) return
  shuttingDown = true
  lifecycle.send({ type: "shutdown" })
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 15_000)
    lifecycle.once("exit", () => {
      clearTimeout(timeout)
      resolve()
    })
  })
}

async function main() {
  let exitCode = 1
  try {
    await startLifecycle()
    exitCode = await runPlaywright()
  } finally {
    await shutdownLifecycle()
  }
  process.exit(exitCode)
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error(`[e2e-integration] ${error.stack || error.message}`)
    await shutdownLifecycle()
    process.exit(1)
  })
}

module.exports = { buildPlaywrightArgs, defaultSpec, isSpecPath }
