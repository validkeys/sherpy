package main

import (
	"testing"
)

func TestRootCommandHasSubcommands(t *testing.T) {
	root := NewRootCmd()
	expected := []string{"init", "setup", "sync", "status"}
	if len(root.Commands()) != len(expected) {
		t.Fatalf("expected %d subcommands, got %d", len(expected), len(root.Commands()))
	}
	for _, name := range expected {
		found := false
		for _, cmd := range root.Commands() {
			if cmd.Name() == name {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected subcommand %q not found", name)
		}
	}
}

func TestRootCommandFlags(t *testing.T) {
	root := NewRootCmd()
	f := root.Flags().Lookup("global-config")
	if f == nil {
		t.Fatal("expected --global-config flag")
	}
	if f.DefValue != "" {
		t.Errorf("expected default empty string, got %q", f.DefValue)
	}
}

func TestInitStubReturnsError(t *testing.T) {
	root := NewRootCmd()
	for _, cmd := range root.Commands() {
		if cmd.Name() == "init" {
			if cmd.RunE == nil {
				t.Fatal("init command should have RunE set")
			}
			err := cmd.RunE(cmd, nil)
			if err == nil {
				t.Fatal("expected error from init stub")
			}
			return
		}
	}
	t.Fatal("init command not found")
}
