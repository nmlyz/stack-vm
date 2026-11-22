// Tiny stack VM for make.fun's tiny stack ISA v1 (ISA.md in the kit).
// Runs every program.bin in /input/<id>/ against its input.bin and writes
// /output/<id>/stdout.bin + exit.txt. Semantics follow the kit's reference
// VM exactly: 32-bit wrapping arithmetic, 256-value data stack, 64-deep
// call stack, 256 words of memory, ten traps with their own exit codes,
// 1,000,000-step and 65,536-byte output limits.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(p, inp) {
  const D = new Int32Array(256);
  const C = new Int32Array(64);
  const M = new Int32Array(256);
  const o = new Uint8Array(65536);
  const n = p.length;
  let s = 0, c = 0, ol = 0, ip = 0, pc = 0, st = 0;
  for (;;) {
    if (st === 1000000) return [o, ol, 10];
    if (pc < 0 || pc >= n) return [o, ol, 9];
    const op = p[pc];
    const known = op < 8 || (op >= 0x10 && op <= 0x22) || (op >= 0x30 && op <= 0x34)
      || op === 0x40 || op === 0x41 || (op >= 0x50 && op <= 0x53);
    if (!known) return [o, ol, 5];
    let im = 0;
    if (op === 1) im = 1;
    else if (op === 2) im = 4;
    else if (op >= 0x30 && op <= 0x33) im = 2;
    if (pc + im >= n) return [o, ol, 9];
    st++;
    const nx = pc + 1 + im;
    let po = 0, pu = 0;
    if (op === 1 || op === 2 || op === 0x52) pu = 1;
    else if (op === 3) po = 1;
    else if (op === 4) { po = 1; pu = 2; }
    else if (op === 5) { po = 2; pu = 2; }
    else if (op === 6) { po = 2; pu = 3; }
    else if (op === 7) { po = 3; pu = 3; }
    else if ((op >= 0x10 && op <= 0x16) || (op >= 0x18 && op <= 0x1a) || (op >= 0x1c && op <= 0x22)) { po = 2; pu = 1; }
    else if (op === 0x17 || op === 0x1b || op === 0x40) { po = 1; pu = 1; }
    else if (op === 0x31 || op === 0x32 || op === 0x50 || op === 0x51 || op === 0x53) po = 1;
    else if (op === 0x41) po = 2;
    if (s < po) return [o, ol, 2];
    if (s - po + pu > 256) return [o, ol, 3];
    pc = nx;
    switch (op) {
      case 0x00: return [o, ol, 0];
      case 0x01: D[s++] = (p[nx - 1] << 24) >> 24; break;
      case 0x02: D[s++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break;
      case 0x03: s--; break;
      case 0x04: D[s] = D[s - 1]; s++; break;
      case 0x05: { const t = D[s - 1]; D[s - 1] = D[s - 2]; D[s - 2] = t; break; }
      case 0x06: D[s] = D[s - 2]; s++; break;
      case 0x07: { const a = D[s - 3]; D[s - 3] = D[s - 2]; D[s - 2] = D[s - 1]; D[s - 1] = a; break; }
      case 0x17: D[s - 1] = -D[s - 1] | 0; break;
      case 0x1b: D[s - 1] = ~D[s - 1]; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        const b = D[s - 1], a = D[s - 2];
        let r;
        switch (op) {
          case 0x10: r = (a + b) | 0; break;
          case 0x11: r = (a - b) | 0; break;
          case 0x12: r = Math.imul(a, b); break;
          case 0x13:
            if (b === 0) return [o, ol, 4];
            r = (a === -2147483648 && b === -1) ? a : (a / b) | 0;
            break;
          case 0x14:
            if (b === 0) return [o, ol, 4];
            r = b === -1 ? 0 : (a % b) | 0;
            break;
          case 0x15:
            if (b === 0) return [o, ol, 4];
            r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
            break;
          case 0x16:
            if (b === 0) return [o, ol, 4];
            r = ((a >>> 0) % (b >>> 0)) | 0;
            break;
          case 0x18: r = a & b; break;
          case 0x19: r = a | b; break;
          case 0x1a: r = a ^ b; break;
          case 0x1c: r = a << (b & 31); break;
          case 0x1d: r = a >> (b & 31); break;
          case 0x1e: r = (a >>> (b & 31)) | 0; break;
          case 0x20: r = a === b ? 1 : 0; break;
          case 0x21: r = a < b ? 1 : 0; break;
          default: r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        }
        D[s - 2] = r;
        s--;
        break;
      }
      case 0x30: pc = nx + (((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16); break;
      case 0x31: { const v = D[--s]; if (v === 0) pc = nx + (((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16); break; }
      case 0x32: { const v = D[--s]; if (v !== 0) pc = nx + (((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16); break; }
      case 0x33:
        if (c === 64) return [o, ol, 7];
        C[c++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 0x34:
        if (c === 0) return [o, ol, 8];
        pc = C[--c];
        break;
      case 0x40: {
        const a = D[s - 1];
        if (a < 0 || a > 255) return [o, ol, 6];
        D[s - 1] = M[a];
        break;
      }
      case 0x41: {
        const a = D[s - 1], v = D[s - 2];
        if (a < 0 || a > 255) return [o, ol, 6];
        s -= 2;
        M[a] = v;
        break;
      }
      case 0x50: {
        const t = String(D[s - 1]);
        if (ol + t.length > 65536) return [o, ol, 11];
        for (let k = 0; k < t.length; k++) o[ol++] = t.charCodeAt(k);
        s--;
        break;
      }
      case 0x51:
        if (ol + 1 > 65536) return [o, ol, 11];
        o[ol++] = D[--s] & 255;
        break;
      case 0x52: D[s++] = ip < inp.length ? inp[ip++] : -1; break;
      default: return [o, ol, D[--s] & 255];
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const [o, ol, code] = run(
    new Uint8Array(readFileSync(join(I, id, 'program.bin'))),
    new Uint8Array(readFileSync(join(I, id, 'input.bin'))),
  );
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), o.subarray(0, ol));
  writeFileSync(join(O, id, 'exit.txt'), `${code}\n`);
}
