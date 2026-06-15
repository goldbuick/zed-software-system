try { // first-line
while (true) {
if (api.sy()) { return 1; }
switch (api.getcase()) {
case 1:
  // 1 'restart' label
  break;
case 2:
  if (!api.if(1)) { api.jump(10); continue; }
  break;
case 3:
  if (!api.duplicate('by', 1, 0, 'by', 0, 0)) { api.jump(6); continue; }
  break;
case 4:
  if (api.command('bgplay', 'a')) { continue; };
  break;
case 5:
  api.jump(8); continue;
  break;
case 6:
  // alt logic
  break;
case 7:
  if (api.command('bgplay', 'b')) { continue; };
  break;
case 8:
  // end of if
  break;
case 9:
  api.jump(11); continue;
  break;
case 10:
  // alt logic
  break;
case 11:
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