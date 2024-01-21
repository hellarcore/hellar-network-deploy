#!/usr/bin/env bash

scripts=("deploy destroy test list logs hellar-cli generate")

if [[ " ${scripts[@]} " =~ " ${1} " ]]; then
    script=$1

    # Remove the first argument ("hellar-network")
    shift

    source "bin/$script"
else
    exec "$@"
fi
