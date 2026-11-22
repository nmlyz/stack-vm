# stack-vm

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/nmlyz/stack-vm/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/nmlyz/stack-vm/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

A tiny stack virtual machine for Node 22. It runs bytecode programs with 32-bit wrapping arithmetic, branches, calls, 256 words of memory, input and output, and ten traps with their own exit codes.

## Run it

```sh
MAKEFUN_INPUT_DIR=<input dir> MAKEFUN_OUTPUT_DIR=<output dir> node main.ts
```

For each `i001`–`i040` it reads `<input>/<id>/program.bin` and `<input>/<id>/input.bin`, then writes `<output>/<id>/stdout.bin` and `<output>/<id>/exit.txt`.
