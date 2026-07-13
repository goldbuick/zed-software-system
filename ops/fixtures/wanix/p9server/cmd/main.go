//go:build !js && !wasm

package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"

	"zed.cafe/wanix-fixtures/p9server"
)

func main() {
	dir := flag.String("dir", ".", "directory to serve over WebSocket 9P")
	flag.Parse()
	srv, err := p9server.Start(*dir)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Println(srv.URL)
	fmt.Fprintf(os.Stderr, "p9server serving %s at %s\n", srv.RootDir, srv.URL)
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt)
	<-sig
	_ = srv.Close()
}
