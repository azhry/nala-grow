package main

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

type rootManifest struct {
	Projects map[string]manifestProject `yaml:"projects"`
}

type manifestProject struct {
	CWD        string             `yaml:"cwd"`
	Run        string             `yaml:"run"`
	Port       int                `yaml:"port"`
	Deployment manifestDeployment `yaml:"deployment"`
}

type manifestDeployment struct {
	SchemaVersion int            `yaml:"schemaVersion"`
	App           manifestApp    `yaml:"app"`
	Build         manifestBuild  `yaml:"build"`
	Test          manifestTest   `yaml:"test"`
	Runtime       manifestRun    `yaml:"runtime"`
	Configuration manifestConfig `yaml:"configuration"`
}

type manifestApp struct {
	Name string `yaml:"name"`
}

type manifestBuild struct {
	Context    string   `yaml:"context"`
	Dockerfile string   `yaml:"dockerfile"`
	Command    []string `yaml:"command"`
}

type manifestTest struct {
	Command []string `yaml:"command"`
}

type manifestRun struct {
	Command []string `yaml:"command"`
	Health  struct {
		Path string `yaml:"path"`
	} `yaml:"health"`
}

type manifestConfig struct {
	Vault struct {
		Mount string   `yaml:"mount"`
		Path  string   `yaml:"path"`
		Keys  []string `yaml:"keys"`
	} `yaml:"vault"`
	Database struct {
		Required bool   `yaml:"required"`
		Ref      string `yaml:"ref"`
	} `yaml:"database"`
}

func TestRootManifestPackagesBackendAndFrontendIndependently(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("..", "..", "..", "nala.yml"))
	if err != nil {
		t.Fatalf("read root nala.yml: %v", err)
	}

	var manifest rootManifest
	if err := yaml.Unmarshal(data, &manifest); err != nil {
		t.Fatalf("parse root nala.yml: %v", err)
	}
	if len(manifest.Projects) != 2 {
		t.Fatalf("projects count = %d, want 2", len(manifest.Projects))
	}

	checks := []struct {
		project string
		cwd     string
		port    int
		name    string
		build   []string
		test    []string
		runtime []string
		health  string
	}{
		{
			project: "backend",
			cwd:     "backend",
			port:    4000,
			name:    "nala-grow-backend",
			build:   []string{"go", "build", "-o", "server", "./cmd/server"},
			test:    []string{"go", "test", "./..."},
			runtime: []string{"./server"},
			health:  "/healthz",
		},
		{
			project: "frontend",
			cwd:     "frontend",
			port:    3000,
			name:    "nala-grow-frontend",
			build:   []string{"npm", "run", "build"},
			test:    []string{"npm", "run", "test:unit"},
			runtime: []string{"npm", "run", "start"},
			health:  "/login",
		},
	}

	seenNames := make(map[string]struct{}, len(checks))
	for _, check := range checks {
		project, ok := manifest.Projects[check.project]
		if !ok {
			t.Fatalf("missing projects.%s", check.project)
		}
		if project.CWD != check.cwd || project.Run == "" || project.Port != check.port {
			t.Errorf("projects.%s local service fields = {cwd:%q runSet:%t port:%d}, want cwd %q, existing run command, port %d", check.project, project.CWD, project.Run != "", project.Port, check.cwd, check.port)
		}

		deployment := project.Deployment
		if deployment.SchemaVersion != 1 {
			t.Errorf("projects.%s deployment.schemaVersion = %d, want 1", check.project, deployment.SchemaVersion)
		}
		if deployment.App.Name != check.name {
			t.Errorf("projects.%s deployment.app.name = %q, want %q", check.project, deployment.App.Name, check.name)
		}
		if _, exists := seenNames[deployment.App.Name]; exists {
			t.Errorf("deployment app name %q is not unique", deployment.App.Name)
		}
		seenNames[deployment.App.Name] = struct{}{}
		if deployment.Build.Context != "." || deployment.Build.Dockerfile != "Dockerfile" {
			t.Errorf("projects.%s build context/dockerfile = %q/%q, want ./Dockerfile relative to cwd", check.project, deployment.Build.Context, deployment.Build.Dockerfile)
		}
		if !reflect.DeepEqual(deployment.Build.Command, check.build) {
			t.Errorf("projects.%s build.command = %v, want %v", check.project, deployment.Build.Command, check.build)
		}
		if !reflect.DeepEqual(deployment.Test.Command, check.test) {
			t.Errorf("projects.%s test.command = %v, want %v", check.project, deployment.Test.Command, check.test)
		}
		if !reflect.DeepEqual(deployment.Runtime.Command, check.runtime) {
			t.Errorf("projects.%s runtime.command = %v, want %v", check.project, deployment.Runtime.Command, check.runtime)
		}
		if deployment.Runtime.Health.Path != check.health {
			t.Errorf("projects.%s runtime.health.path = %q, want %q", check.project, deployment.Runtime.Health.Path, check.health)
		}
		if deployment.Configuration.Vault.Mount != "secret" || deployment.Configuration.Vault.Path != "nala-labs/nala-grow" {
			t.Errorf("projects.%s Vault reference does not point to the documented NalaGrow KV path", check.project)
		}
		vaultKeys := make(map[string]struct{}, len(deployment.Configuration.Vault.Keys))
		for _, key := range deployment.Configuration.Vault.Keys {
			vaultKeys[key] = struct{}{}
			if key == "VAULT_TOKEN" || key == "VAULT_ROLE_ID" || key == "VAULT_SECRET_ID" {
				t.Errorf("projects.%s Vault keys contain a transport credential reference", check.project)
			}
		}
		if check.project == "frontend" {
			for _, key := range deployment.Configuration.Vault.Keys {
				if !strings.HasPrefix(key, "NEXT_PUBLIC_") {
					t.Errorf("frontend Vault key %q is not public configuration", key)
				}
			}
			for _, key := range []string{
				"NEXT_PUBLIC_API_URL",
				"NEXT_PUBLIC_GRAPHQL_URL",
				"NEXT_PUBLIC_GOOGLE_CLIENT_ID",
				"NEXT_PUBLIC_CASDOOR_ISSUER",
				"NEXT_PUBLIC_CASDOOR_CLIENT_ID",
				"NEXT_PUBLIC_CASDOOR_ORGANIZATION",
				"NEXT_PUBLIC_CASDOOR_APPLICATION",
				"NEXT_PUBLIC_CASDOOR_REDIRECT_URI",
				"NEXT_PUBLIC_CASDOOR_AUTHORIZATION_URL",
			} {
				if _, ok := vaultKeys[key]; !ok {
					t.Errorf("frontend Vault reference is missing %q", key)
				}
			}
		} else {
			for _, key := range []string{
				"DATABASE_URL",
				"JWT_SECRET",
				"CASDOOR_ISSUER",
				"CASDOOR_CLIENT_ID",
				"CASDOOR_CLIENT_SECRET",
				"CASDOOR_ADMIN_TOKEN",
			} {
				if _, ok := vaultKeys[key]; !ok {
					t.Errorf("backend Vault reference is missing %q", key)
				}
			}
		}

		ignoreFile, err := os.ReadFile(filepath.Join("..", "..", "..", check.project, ".dockerignore"))
		if err != nil {
			t.Fatalf("read %s .dockerignore: %v", check.project, err)
		}
		for _, pattern := range []string{"**/.env", "**/.env.*", "**/.vault-config", "**/.vault-config.*", "**/*.pem", "**/*.key", "**/*.p12", "**/*.pfx"} {
			if !strings.Contains(string(ignoreFile), pattern) {
				t.Errorf("%s .dockerignore is missing %q", check.project, pattern)
			}
		}
	}

	backendDatabase := manifest.Projects["backend"].Deployment.Configuration.Database
	if !backendDatabase.Required || backendDatabase.Ref != "nala-grow" {
		t.Errorf("backend database declaration = {required:%t ref:%q}, want required account-owned nala-grow reference", backendDatabase.Required, backendDatabase.Ref)
	}
	frontendDatabase := manifest.Projects["frontend"].Deployment.Configuration.Database
	if frontendDatabase.Required || frontendDatabase.Ref != "" {
		t.Errorf("frontend database declaration = {required:%t ref:%q}, want no database reference", frontendDatabase.Required, frontendDatabase.Ref)
	}
}
