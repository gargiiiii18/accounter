const fs = require('fs');
const file = process.argv[2];
const from = process.argv[3];
const to = process.argv[4];
const out = process.argv[5];
const t = fs.readFileSync(file, 'utf8');
const a = t.indexOf(from);
if (a < 0) { console.log('FROM-NOT-FOUND'); process.exit(1); }
let b = t.length;
if (to && to !== 'EOF') {
  b = t.indexOf(to, a + from.length);
  if (b < 0) { console.log('TO-NOT-FOUND'); process.exit(1); }
}
const slice = t.slice(a, b);
if (out) fs.writeFileSync(out, slice);
console.log('A=' + a + ' B=' + b + ' LEN=' + slice.length);
