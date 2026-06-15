try { // first-line
while (true) {
if (api.sy()) { return 1; }
switch (api.getcase()) {
case 1:
  // 1 'restart' label
  break;
case 2:
  if (api.command('send', 'n', 'calcdisplay')) { continue; };
  break;
case 3:
  // 3 'calcdisplay' label
  break;
case 4:
  if (!api.if('any', 'n', 'line')) { api.jump(7); continue; }
  break;
case 5:
  api.give('p1', 1);
  break;
case 6:
  api.jump(8); continue;
  break;
case 7:
  // alt logic
  break;
case 8:
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