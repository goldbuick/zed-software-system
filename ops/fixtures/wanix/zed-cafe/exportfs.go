package main

import (
	"encoding/base64"
	"encoding/json"

	"tractor.dev/wanix/fs/fskit"
	"tractor.dev/wanix/fs/memfs"
)

type inboxentry struct {
	Path string `json:"path"`
	Data string `json:"data"`
}

type inboxpayload struct {
	Files []inboxentry `json:"files"`
}

// ExportFS is the zed-cafe export namespace served by gojs.Export.
type ExportFS struct {
	*memfs.FS
}

func NewExportFromInboxJSON(raw []byte) (*ExportFS, error) {
	var payload inboxpayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, err
	}
	return NewExportFromPayload(payload)
}

func NewExportFromPayload(payload inboxpayload) (*ExportFS, error) {
	snapshot, err := snapshotfrompayload(payload)
	if err != nil {
		return nil, err
	}
	return &ExportFS{FS: memfs.From(snapshot)}, nil
}

func snapshotfrompayload(payload inboxpayload) (fskit.MapFS, error) {
	nodes := fskit.MapFS{}
	for _, entry := range payload.Files {
		data, err := base64.StdEncoding.DecodeString(entry.Data)
		if err != nil {
			return nil, err
		}
		nodes[entry.Path] = fskit.RawNode(data)
	}
	return nodes, nil
}
