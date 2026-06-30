package main

import (
	"fmt"
	"os"
)

func main() {
	file, err := os.OpenFile(
		"zed-cafe/evil.json",
		os.O_CREATE|os.O_TRUNC|os.O_WRONLY,
		0o644,
	)
	if err != nil {
		_, _ = fmt.Fprint(os.Stdout, "zed-cafe write bad ok\n")
		return
	}
	_ = file.Close()
	_, _ = fmt.Fprint(os.Stdout, "zed-cafe write bad fail\n")
	os.Exit(1)
}
