package main

import (
	"fmt"
	"os"
)

const payload = "{\"exportedAt\":\"guest\",\"bookCount\":0,\"books\":[],\"guestTouch\":true}\n"

func main() {
	file, err := os.OpenFile(
		"zedcafe/stats.json",
		os.O_CREATE|os.O_TRUNC|os.O_WRONLY,
		0o644,
	)
	if err != nil {
		_, _ = fmt.Fprint(os.Stdout, "zed-cafe write fail\n")
		os.Exit(1)
	}
	n, err := file.WriteString(payload)
	_ = file.Close()
	if err != nil || n == 0 {
		_, _ = fmt.Fprint(os.Stdout, "zed-cafe write fail\n")
		os.Exit(1)
	}
	_, _ = fmt.Fprint(os.Stdout, "zed-cafe write ok\n")
}
