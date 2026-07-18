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

func (f *dirtyfile) ReadDir(n int) ([]fs.DirEntry, error) {
	if rd, ok := f.File.(fs.ReadDirFile); ok {
		return rd.ReadDir(n)
	}
	return nil, &fs.PathError{Op: "readdir", Path: f.name, Err: fs.ErrInvalid}
}

func (f *dirtyfile) ReadAt(p []byte, off int64) (int, error) {
	return fs.ReadAt(f.File, p, off)
}

func (f *dirtyfile) Seek(offset int64, whence int) (int64, error) {
	return fs.Seek(f.File, offset, whence)
}

var (
	_ io.Writer      = (*dirtyfile)(nil)
	_ io.WriterAt    = (*dirtyfile)(nil)
	_ io.ReaderAt    = (*dirtyfile)(nil)
	_ io.Seeker      = (*dirtyfile)(nil)
	_ fs.ReadDirFile = (*dirtyfile)(nil)
)
