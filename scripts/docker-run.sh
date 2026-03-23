#!/bin/sh
set -e

echo "docker:run — published image (ellium12/zed-software-system)"
echo ""
echo "This runs the equivalent of:"
echo ""
echo "  docker run -it --network host --name zss -v zss-data:/zss-data ellium12/zed-software-system ./start.sh"
echo ""
echo "  -it                 Interactive TTY"
echo "  --network host      Container uses the host network stack"
echo "  --name zss          Fixed container name (if it already exists: docker rm -f zss)"
echo "  -v zss-data:/data   Named volume for ZSS data (ZSS_DATA_DIR in the image)"
echo ""
