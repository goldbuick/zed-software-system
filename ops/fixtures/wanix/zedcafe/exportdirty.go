package main

import (
	"strings"
	"sync"
	"time"
)

const exportdirtydebounce = 50 * time.Millisecond

var (
	dirtymu         sync.Mutex
	dirtytimer      *time.Timer
	dirtypathset    = map[string]struct{}{}
	dirtynotifyfunc func(paths []string)
)

func setdirtynotify(fn func(paths []string)) {
	dirtymu.Lock()
	defer dirtymu.Unlock()
	dirtynotifyfunc = fn
}

func cleardirtytimerfortest() {
	dirtymu.Lock()
	defer dirtymu.Unlock()
	if dirtytimer != nil {
		dirtytimer.Stop()
		dirtytimer = nil
	}
	dirtypathset = map[string]struct{}{}
}

func markexportdirty(name string) {
	rel := normalizeexportpath(name)
  // Host revision / journal meta under zedsync/ -- not guest content; never
  // kick the import poll for these writes.
  if rel == "zedsync" || strings.HasPrefix(rel, "zedsync/") {
		return
	}
	dirtymu.Lock()
	defer dirtymu.Unlock()
	if name != "" {
		dirtypathset[name] = struct{}{}
	}
	if dirtytimer != nil {
		dirtytimer.Stop()
	}
	dirtytimer = time.AfterFunc(exportdirtydebounce, func() {
		dirtymu.Lock()
		fn := dirtynotifyfunc
		paths := make([]string, 0, len(dirtypathset))
		for path := range dirtypathset {
			paths = append(paths, path)
		}
		dirtypathset = map[string]struct{}{}
		dirtymu.Unlock()
		if fn == nil {
			fn = defaultdirtynotify
		}
		fn(paths)
	})
}
