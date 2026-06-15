try { // first-line
while (true) {
if (api.sy()) { return 1; }
switch (api.getcase()) {
case 1:
  // 1 'restart' label
  break;
case 2:
  if (!api.if(1)) { api.jump(4); continue; }
  break;
  api.jump(0); continue;
case 3:
  api.jump(5); continue;
  break;
case 4:
  // alt logic
  break;
case 5:
  // end of if
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