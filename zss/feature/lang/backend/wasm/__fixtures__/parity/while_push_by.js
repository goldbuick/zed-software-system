try { // first-line
while (true) {
if (api.sy()) { return 1; }
switch (api.getcase()) {
case 1:
  // 1 'restart' label
  break;
case 2:
  // start of while
  break;
case 3:
  if (!api.if(api.isNotEq('p1', 8))) { api.jump(7); continue; }
  break;
case 4:
  api.if(api.isEq('p1', 0), 'push', 'by', -1, 1, 'up');
  break;
case 5:
  api.give('p1');
  break;
case 6:
  api.jump(2); continue;
  break;
case 7:
  // end of while
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