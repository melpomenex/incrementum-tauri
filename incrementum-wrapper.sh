#!/bin/bash
# Incrementum wrapper script for Wayland compatibility
export GDK_BACKEND=x11
exec /usr/local/bin/incrementum-bin "$@"
