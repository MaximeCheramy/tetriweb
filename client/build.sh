#!/bin/bash
closure-library/closure/bin/build/closurebuilder.py --root=. --namespace="tetriweb" --output_mode=compiled --compiler_jar=bin/compiler.jar --compiler_flags="--compilation_level=ADVANCED_OPTIMIZATIONS" > tetriweb.compiled.js
