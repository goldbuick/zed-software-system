package main

import (
	"encoding/json"
	"errors"
	"fmt"
)

const (
	muxVersion     = 1
	muxSessionSize = 16
)

type hostControlMsg struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

func encodemuxframe(sessionid string, payload []byte) ([]byte, error) {
	sid, err := padsessionid(sessionid)
	if err != nil {
		return nil, err
	}
	out := make([]byte, 1+muxSessionSize+len(payload))
	out[0] = muxVersion
	copy(out[1:1+muxSessionSize], sid)
	copy(out[1+muxSessionSize:], payload)
	return out, nil
}

func decodemuxframe(buf []byte) (sessionid string, payload []byte, err error) {
	if len(buf) < 1+muxSessionSize {
		return "", nil, errors.New("mux frame too short")
	}
	if buf[0] != muxVersion {
		return "", nil, fmt.Errorf("unsupported mux version %d", buf[0])
	}
	sessionid = trimsessionid(buf[1 : 1+muxSessionSize])
	payload = buf[1+muxSessionSize:]
	return sessionid, payload, nil
}

func padsessionid(id string) ([]byte, error) {
	if id == "" {
		return nil, errors.New("empty session id")
	}
	if len(id) > muxSessionSize {
		return nil, fmt.Errorf("session id too long: %q", id)
	}
	out := make([]byte, muxSessionSize)
	copy(out, []byte(id))
	return out, nil
}

func trimsessionid(raw []byte) string {
	end := len(raw)
	for end > 0 && raw[end-1] == 0 {
		end--
	}
	return string(raw[:end])
}

func encodecontrol(typ, id string) ([]byte, error) {
	return json.Marshal(hostControlMsg{Type: typ, ID: id})
}

func decodecontrol(buf []byte) (hostControlMsg, error) {
	var msg hostControlMsg
	if err := json.Unmarshal(buf, &msg); err != nil {
		return msg, err
	}
	return msg, nil
}
