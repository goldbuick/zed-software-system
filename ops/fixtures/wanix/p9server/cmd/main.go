//go:build !js && !wasm

package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"

	"zed.cafe/wanix-fixtures/p9server"
)

func main() {
	dir := flag.String("dir", ".", "directory to serve over wss:// 9P")
	cert := flag.String("cert", "", "TLS certificate PEM (default: ~/.vite-plugin-mkcert/cert.pem)")
	key := flag.String("key", "", "TLS private key PEM (default: ~/.vite-plugin-mkcert/dev.pem)")
	flag.Parse()

	opts := p9server.Options{
		CertFile: *cert,
		KeyFile:  *key,
	}
	if opts.CertFile == "" && opts.KeyFile == "" {
		home, err := os.UserHomeDir()
		if err == nil {
			mk := filepath.Join(home, ".vite-plugin-mkcert")
			c := filepath.Join(mk, "cert.pem")
			k := filepath.Join(mk, "dev.pem")
			if _, err := os.Stat(c); err == nil {
				if _, err := os.Stat(k); err == nil {
					opts.CertFile = c
					opts.KeyFile = k
				}
			}
		}
	}
	if opts.CertFile == "" || opts.KeyFile == "" {
		fmt.Fprintln(os.Stderr, "p9server: TLS required — need ~/.vite-plugin-mkcert from cafe:dev, or -cert and -key")
		os.Exit(1)
	}

	srv, err := p9server.Start(*dir, opts)
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
