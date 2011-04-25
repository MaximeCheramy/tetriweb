#!/bin/bash
client/closure-library/closure/bin/build/closurebuilder.py --root=client --namespace="tetriweb" --output_mode=compiled --compiler_jar=bin/compiler.jar --compiler_flags="--compilation_level=ADVANCED_OPTIMIZATIONS" --compiler_flags="--warning_level=VERBOSE" --compiler_flags="--create_source_map=tetriweb-map" > client/tetriweb.compiled.js
