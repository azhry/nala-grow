ifeq ($(OS),Windows_NT)
SHELL := powershell.exe
.SHELLFLAGS := -NoProfile -Command
endif

.PHONY: db-up test test-unit test-integration test-coverage build clean

# Start the local Postgres dependency used by the API. Creates it on first use.
db-up:
	@$$name = 'nalagrow-postgres'; $$existing = docker container inspect $$name 2> $$null; if ($$LASTEXITCODE -ne 0) { docker run --name $$name -e POSTGRES_USER=nalagrow -e POSTGRES_PASSWORD=nalagrow -e POSTGRES_DB=nalagrow -p 5432:5432 -d postgres:16-alpine | Out-Null } elseif ((docker inspect --format '{{.State.Running}}' $$name) -ne 'true') { docker start $$name | Out-Null }; for ($$attempt = 0; $$attempt -lt 30; $$attempt++) { docker exec $$name pg_isready -U nalagrow -d nalagrow *> $$null; if ($$LASTEXITCODE -eq 0) { Write-Output 'Postgres is ready on localhost:5432 (database: nalagrow)'; exit 0 }; Start-Sleep -Seconds 1 }; throw 'Postgres did not become ready'

# Default target
test: test-unit

# Run all unit tests (no database required)
test-unit:
	go test ./... -count=1 -short -v 2>&1

# Run integration tests with a fresh disposable PostgreSQL container (requires Docker)
test-integration:
	go test ./... -count=1 -tags=integration -run Integration -v 2>&1

# Run all tests with coverage
test-coverage:
	go test ./... -count=1 -coverprofile=coverage.out -v 2>&1
	go tool cover -func=coverage.out

build:
	go build ./...

clean:
	rm -f coverage.out
	go clean -testcache
