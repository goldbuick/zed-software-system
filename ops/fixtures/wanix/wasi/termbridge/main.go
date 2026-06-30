package main

import "os"

func main() {
	_, _ = os.Stdout.WriteString("wanix term bridge ready\n")
	_, _ = os.Stdout.WriteString("type ping for bridge -> pong\n")
	_, _ = os.Stdout.WriteString("> ")
	for {
	}
}
