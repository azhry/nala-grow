.PHONY: db-up test test-unit test-integration test-coverage build clean

# Start the local Postgres dependency used by the API. Creates it on first use.
db-up:
	@docker container inspect nalagrow-postgres >NUL 2>&1 || docker run --name nalagrow-postgres -e POSTGRES_USER=nalagrow -e POSTGRES_PASSWORD=nalagrow -e POSTGRES_DB=nalagrow -p 5432:5432 -d postgres:16-alpine >NUL
	@docker inspect --format "{{.State.Running}}" nalagrow-postgres | findstr /I "true" >NUL || docker start nalagrow-postgres >NUL
	@powershell -NoProfile -Command "$$attempts = 0; while ($$attempts -lt 30) { docker exec nalagrow-postgres pg_isready -U nalagrow -d nalagrow *> $$null; if ($$LASTEXITCODE -eq 0) { exit 0 }; $$attempts++; Start-Sleep -Seconds 1 }; Write-Error 'Postgres did not become ready'; exit 1"
	@echo Postgres is ready on localhost:5432 (database: nalagrow)

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
