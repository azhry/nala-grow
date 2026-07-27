.PHONY: test test-unit test-integration test-coverage build clean

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
