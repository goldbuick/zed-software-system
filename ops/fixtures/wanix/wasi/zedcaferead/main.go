package main

import (
	"fmt"
	"io"
	"os"
)

func main() {
	file, err := os.Open("zed-cafe/stats.json")
	if err != nil {
		_, _ = fmt.Fprint(os.Stdout, "zed-cafe missing\n")
		os.Exit(1)
	}
	defer file.Close()

	buf := make([]byte, 384)
	n, err := file.Read(buf)
	if (err != nil && err != io.EOF) || n == 0 {
		_, _ = fmt.Fprint(os.Stdout, "zed-cafe empty\n")
		os.Exit(1)
	}

	_, _ = fmt.Fprint(os.Stdout, "zed-cafe ok: ")
	_, _ = os.Stdout.Write(buf[:n])
	_, _ = fmt.Fprint(os.Stdout, "\n")

	marker, err := os.Create("zed-cafe-read.ok")
	if err == nil {
		_, _ = marker.WriteString("ok\n")
		_ = marker.Close()
	}
}
