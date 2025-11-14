#!/bin/bash
# Script to remove node_modules from host (safe when using Docker)
# This script removes node_modules from the host since containers use isolated node_modules

set -e

echo "Checking for node_modules on host..."
if [ -d "node_modules" ]; then
    echo "Found node_modules on host (size: $(du -sh node_modules | cut -f1))"
    echo "This is safe to delete - containers use isolated node_modules"
    read -p "Do you want to delete node_modules on host? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing node_modules from host..."
        rm -rf node_modules
        echo "✓ node_modules removed from host"
        echo "Note: Containers will continue to work - they use isolated node_modules"
    else
        echo "Cancelled. node_modules on host kept."
    fi
else
    echo "No node_modules found on host. Nothing to clean."
fi
