try { // first-line
while (true) {
if (api.sy()) { return 1; }
switch (api.getcase()) {
case 1:
  // 1 'restart' label
  break;
case 2:
  api.repeatstart(0, 1);
  break;
case 3:
  // start of repeat
  break;
case 4:
  if (!api.repeat(0, 1)) { api.jump(6); continue; }
  break;
  api.jump(6); continue;
case 5:
  api.jump(3); continue;
  break;
case 6:
  // end of repeat
  break;
default:
  return 0;
}
api.nextcase();
} // end of logic
} catch (e) {
console.error(e);
const source = api.stacktrace(e);
const err = new Error(e.message);
err.name = 'GameError';
err.meta = { line: source.line, column: source.column };
throw err;
}
//# sourceURL=zss.js