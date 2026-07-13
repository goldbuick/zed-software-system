package main

import (
	"io"

	"tractor.dev/wanix/fs"
)

// dirtyfile wraps an open file and marks the export dirty on Close after writes.
type dirtyfile struct {
	fs.File
	name    string
	written bool
}

func wrapdirtyfile(name string, file fs.File) fs.File {
	if file == nil {
		return nil
	}
	return &dirtyfile{File: file, name: name}
}

func (f *dirtyfile) Write(p []byte) (int, error) {
	n, err := fs.Write(f.File, p)
	if n > 0 {
		f.written = true
	}
	return n, err
}

func (f *dirtyfile) WriteAt(p []byte, off int64) (int, error) {
	n, err := fs.WriteAt(f.File, p, off)
	if n > 0 {
		f.written = true
	}
	return n, err
}

func (f *dirtyfile) Close() error {
	err := f.File.Close()
	if f.written {
		markexportdirty(f.name)
	}
	return err
}

var (
	_ io.Writer   = (*dirtyfile)(nil)
	_ io.WriterAt = (*dirtyfile)(nil)
)
