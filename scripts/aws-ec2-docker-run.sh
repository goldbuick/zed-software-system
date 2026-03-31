#!/bin/sh
# AWS EC2 helper for scripts/vm-zss-docker-run.sh.
# Set AWS_EC2_HOST to the instance public IP or DNS, then run from your laptop.
# Optional: AWS_EC2_USER (default ubuntu), AWS_EC2_SSH_KEY (path to .pem), AWS_RUN_LOCAL=1 on the instance.
#
# Example (laptop):
#   AWS_EC2_HOST=1.2.3.4 AWS_EC2_SSH_KEY=$HOME/.ssh/my-key.pem sh scripts/aws-ec2-docker-run.sh
#
# Example (already SSH'd into the instance):
#   AWS_RUN_LOCAL=1 sh scripts/aws-ec2-docker-run.sh
set -eu

DIR=$(dirname "$0")
export VM_SSH_HOST="${AWS_EC2_HOST:-${VM_SSH_HOST:-}}"
export VM_SSH_USER="${AWS_EC2_USER:-${VM_SSH_USER:-ubuntu}}"
export VM_SSH_IDENTITYFILE="${AWS_EC2_SSH_KEY:-${VM_SSH_IDENTITYFILE:-}}"
export VM_RUN_LOCAL="${AWS_RUN_LOCAL:-${VM_RUN_LOCAL:-0}}"

exec sh "$DIR/vm-zss-docker-run.sh"
