package main

import (
	_ "embed"
	"encoding/json"
	"errors"
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
	allowedpathraw          []string
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
		allowedpathraw = raw
		allowedpathpatterns = patterns
	})
	return allowedpathpatterns, allowedpathpatternserr
}

func loadallowedpathraw() ([]string, error) {
	if _, err := loadallowedpathpatterns(); err != nil {
		return nil, err
	}
	return allowedpathraw, nil
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

// isallowedexportdir permits mkdir on directory prefixes of allowlisted leaf paths.
// Host push uses p9 Create/WriteFile on the client, which walks parents before the
// server Create handler can materialize implicit dirs.
func isallowedexportdir(name string) bool {
	rel := normalizeexportpath(name)
	if rel == "" {
		return true
	}
	if strings.Contains(rel, "..") || strings.HasPrefix(rel, "/") {
		return false
	}
	suffixes := []string{
		"/stats.json",
		"/board/stats.json",
		"/board/terrain.json",
		"/board/objects/_.json",
		"/object/element.json",
		"/terrain/element.json",
		"/charset/bitmap.json",
		"/palette/bitmap.json",
	}
	for _, suffix := range suffixes {
		if isallowedexportpath(rel + suffix) {
			return true
		}
	}
	raw, err := loadallowedpathraw()
	if err != nil {
		return false
	}
	prefix := rel + "/"
	for _, pat := range raw {
		core := strings.TrimSuffix(strings.TrimPrefix(pat, "^"), "$")
		if strings.HasPrefix(core, prefix) {
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

// ensureimplicitparents materializes parent directory nodes before Create on nested
// allowlisted paths. Mirrors memfs.From implicit dirs; bypasses schema guard on
// Mkdir so only leaf paths need to be allowlisted.
func (g *schemaGuardFS) ensureimplicitparents(name string) error {
	dir := path.Dir(name)
	if dir == "." {
		return nil
	}
	parts := strings.Split(dir, "/")
	prefix := ""
	for _, part := range parts {
		if prefix == "" {
			prefix = part
		} else {
			prefix = prefix + "/" + part
		}
		exists, err := fs.Exists(g.FS, prefix)
		if err != nil {
			return err
		}
		if exists {
			continue
		}
		if err := g.FS.Mkdir(prefix, 0o755); err != nil {
			var patherr *fs.PathError
			if errors.As(err, &patherr) && errors.Is(patherr.Err, fs.ErrExist) {
				continue
			}
			return err
		}
	}
	return nil
}

func (g *schemaGuardFS) Create(name string) (fs.File, error) {
	if err := guardexportpath("create", name); err != nil {
		return nil, err
	}
	if err := g.ensureimplicitparents(name); err != nil {
		return nil, err
	}
	return g.FS.Create(name)
}

func (g *schemaGuardFS) WriteFile(name string, data []byte, perm fs.FileMode) error {
	if err := guardexportpath("write", name); err != nil {
		return err
	}
	if err := g.ensureimplicitparents(name); err != nil {
		return err
	}
	return fs.WriteFile(g.FS, name, data, perm)
}

func (g *schemaGuardFS) Mkdir(name string, perm fs.FileMode) error {
	if !isallowedexportdir(name) {
		return &fs.PathError{Op: "mkdir", Path: name, Err: fs.ErrPermission}
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
