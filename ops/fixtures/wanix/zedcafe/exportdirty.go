package main

import (
	"sync"
	"time"
)

const exportdirtydebounce = 150 * time.Millisecond

var (
	dirtymu         sync.Mutex
	dirtytimer      *time.Timer
	dirtynotifyfunc func()
)

func setdirtynotify(fn func()) {
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
}

func markexportdirty(_ string) {
	dirtymu.Lock()
	defer dirtymu.Unlock()
	if dirtytimer != nil {
		dirtytimer.Stop()
	}
	dirtytimer = time.AfterFunc(exportdirtydebounce, func() {
		dirtymu.Lock()
		fn := dirtynotifyfunc
		dirtymu.Unlock()
		if fn == nil {
			fn = defaultdirtynotify
		}
		fn()
	})
}
