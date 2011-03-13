#!/bin/bash
client/closure-library/closure/bin/build/closurebuilder.py --root=client --namespace="tetriweb" --output_mode=compiled --compiler_jar=bin/compiler.jar --compiler_flags="--compilation_level=ADVANCED_OPTIMIZATIONS" > client/tetriweb.compiled.js
