package main

import (
	_ "embed"
	"encoding/json"
	"path"
	"regexp"
	"strings"
	"sync"

	"tractor.dev/wanix/fs"
	"tractor.dev/wanix/fs/memfs"
)

//go:embed allowed-path-patterns.json
var allowedpathpatternsjson []byte

var (
	allowedpathpatterns     []*regexp.Regexp
	allowedpathpatternsonce sync.Once
	allowedpathpatternserr  error
)

func loadallowedpathpatterns() ([]*regexp.Regexp, error) {
	allowedpathpatternsonce.Do(func() {
		var raw []string
		if err := json.Unmarshal(allowedpathpatternsjson, &raw); err != nil {
			allowedpathpatternserr = err
			return
		}
		patterns := make([]*regexp.Regexp, 0, len(raw))
		for _, item := range raw {
			re, err := regexp.Compile(item)
			if err != nil {
				allowedpathpatternserr = err
				return
			}
			patterns = append(patterns, re)
		}
		allowedpathpatterns = patterns
	})
	return allowedpathpatterns, allowedpathpatternserr
}

func normalizeexportpath(name string) string {
	clean := path.Clean(name)
	if clean == "." {
		return ""
	}
	return clean
}

func isallowedexportpath(name string) bool {
	rel := normalizeexportpath(name)
	if rel == "" || strings.Contains(rel, "..") || strings.HasPrefix(rel, "/") {
		return false
	}
	patterns, err := loadallowedpathpatterns()
	if err != nil {
		return false
	}
	for _, pattern := range patterns {
		if pattern.MatchString(rel) {
			return true
		}
	}
	return false
}

func guardexportpath(op, name string) error {
	if isallowedexportpath(name) {
		return nil
	}
	return &fs.PathError{Op: op, Path: name, Err: fs.ErrPermission}
}

// schemaGuardFS wraps memfs and rejects guest creates outside the export path allowlist.
type schemaGuardFS struct {
	*memfs.FS
}

func newSchemaGuardFS(inner *memfs.FS) *schemaGuardFS {
	return &schemaGuardFS{FS: inner}
}

func (g *schemaGuardFS) Create(name string) (fs.File, error) {
	if err := guardexportpath("create", name); err != nil {
		return nil, err
	}
	return g.FS.Create(name)
}

func (g *schemaGuardFS) Mkdir(name string, perm fs.FileMode) error {
	if err := guardexportpath("mkdir", name); err != nil {
		return err
	}
	return g.FS.Mkdir(name, perm)
}

func (g *schemaGuardFS) Rename(oldname, newname string) error {
	if err := guardexportpath("rename", newname); err != nil {
		return err
	}
	return g.FS.Rename(oldname, newname)
}

func (g *schemaGuardFS) Symlink(oldname, newname string) error {
	if err := guardexportpath("symlink", newname); err != nil {
		return err
	}
	return g.FS.Symlink(oldname, newname)
}

func (g *schemaGuardFS) Truncate(name string, size int64) error {
	exists, err := fs.Exists(g.FS, name)
	if err != nil {
		return err
	}
	if !exists {
		if err := guardexportpath("truncate", name); err != nil {
			return err
		}
	}
	return g.FS.Truncate(name, size)
}
