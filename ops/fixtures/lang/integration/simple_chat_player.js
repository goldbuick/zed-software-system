try { // first-line
while (true) {
if (api.sy()) { return 1; }
switch (api.getcase()) {
case 1:
  // 1 'restart' label
  break;
case 2:
  api.stat('player');
  break;
case 3:
  // skipped ispushable
  break;
case 4:
  // skipped cycle 1
  break;
case 5:
  // skipped char 2
  break;
case 6:
  // skipped color white
  break;
case 7:
  // skipped bg blue
  break;
case 8:
  // -8 'setup flags' comment
  break;
case 9:
  if (api.command('set', 'hint')) { continue; };
  break;
case 10:
  if (api.command('set', 'camera', 'far')) { continue; };
  break;
case 11:
  if (api.command('set', 'health', 100)) { continue; };
  break;
case 12:
  if (api.command('set', 'wickticks', 250)) { continue; };
  break;
case 13:
  if (api.command('set', 'facing', 90)) { continue; };
  break;
case 14:
  if (api.command('clear', 'mute')) { continue; };
  break;
case 15:
  if (api.command('clear', 'ammo')) { continue; };
  break;
case 16:
  if (api.command('clear', 'wick')) { continue; };
  break;
case 17:
  if (api.command('clear', 'light')) { continue; };
  break;
case 18:
  if (api.command('clear', 'torches')) { continue; };
  break;
case 19:
  if (api.command('clear', 'gems')) { continue; };
  break;
case 20:
  if (api.command('clear', 'score')) { continue; };
  break;
case 21:
  if (api.command('clear', 'reload')) { continue; };
  break;
case 22:
  if (api.command('clear', 'energized')) { continue; };
  break;
case 23:
  if (api.command('clear', 'key0')) { continue; };
  break;
case 24:
  if (api.command('clear', 'key9')) { continue; };
  break;
case 25:
  if (api.command('clear', 'key10')) { continue; };
  break;
case 26:
  if (api.command('clear', 'key11')) { continue; };
  break;
case 27:
  if (api.command('clear', 'key12')) { continue; };
  break;
case 28:
  if (api.command('clear', 'key13')) { continue; };
  break;
case 29:
  if (api.command('clear', 'key14')) { continue; };
  break;
case 30:
  if (api.command('clear', 'key15')) { continue; };
  break;
case 31:
  // 31 'think' label
  break;
case 32:
  // -32 'sidebar code' comment
  break;
case 33:
  api.text('Simple $9 $9 $9 ');
  break;
case 34:
  api.text(' $9 $9 $9 Chat v1.14');
  break;
case 35:
  api.text('');
  break;
case 36:
  if (!api.if('hint')) { api.jump(58); continue; }
  break;
case 37:
  api.text('press $whiteC$yellow to chat ');
  break;
case 38:
  api.text('press $white#$yellow for cli');
  break;
case 39:
  api.text(' ');
  break;
case 40:
  api.text('from the cli to');
  break;
case 41:
  api.text('set name');
  break;
case 42:
  api.text('$white#set user <name>');
  break;
case 43:
  api.text(' ');
  break;
case 44:
  api.text('toggle built-in ');
  break;
case 45:
  api.text('gadget on or off');
  break;
case 46:
  api.text('$white#gadget');
  break;
case 47:
  api.text('with gadget users');
  break;
case 48:
  api.text('can edit the board');
  break;
case 49:
  api.text('');
  break;
case 50:
  api.text('$black$ondkcyan Ctrl+O ');
  break;
case 51:
  api.text('$ondkblue $whiteOpen the net');
  break;
case 52:
  api.text('');
  break;
case 53:
  api.text('$black$ondkcyan $24$25$26$27 $ondkblue $whiteMove');
  break;
case 54:
  api.text('$black$onltgrey Tab $ondkblue $whiteToggle');
  break;
case 55:
  api.text('$ondkblue $whitePlayer Stats');
  break;
case 56:
  api.text('');
  break;
case 57:
  api.jump(133); continue;
  break;
case 58:
  // alt logic
  break;
case 59:
  api.text(' $white$2 $yellow Health:$health');
  break;
case 60:
  api.text(' $cyan$132 $yellow   Ammo:$ammo');
  break;
case 61:
  // -61 'torch info' comment
  break;
case 62:
  if (api.command('set', 'torchmeter', ' $brown$157 $yellowTorches:$torches')) { continue; };
  break;
case 63:
  if (!api.if(api.isLessThan('torches', 10))) { api.jump(66); continue; }
  break;
case 64:
  if (api.command('set', 'torchmeter', api.opPlus('torchmeter', '  '))) { continue; };
  break;
case 65:
  api.jump(71); continue;
  break;
case 66:
  // alt logic
  break;
case 67:
  if (!api.if(api.isLessThan('torches', 100))) { api.jump(70); continue; }
  break;
case 68:
  if (api.command('set', 'torchmeter', api.opPlus('torchmeter', ' '))) { continue; };
  break;
case 69:
  api.jump(71); continue;
  break;
case 70:
  // skip
  break;
case 71:
  // end of if
  break;
case 72:
  if (!api.if(api.isGreaterThan('wick', 0))) { api.jump(98); continue; }
  break;
case 73:
  if (!api.if(api.isGreaterThan('wick', 50))) { api.jump(76); continue; }
  break;
case 74:
  if (api.command('set', 'torchmeter', api.opPlus('torchmeter', '$177'))) { continue; };
  break;
case 75:
  api.jump(78); continue;
  break;
case 76:
  // alt logic
  break;
case 77:
  if (api.command('set', 'torchmeter', api.opPlus('torchmeter', '$176'))) { continue; };
  break;
case 78:
  // end of if
  break;
case 79:
  if (!api.if(api.isGreaterThan('wick', 100))) { api.jump(82); continue; }
  break;
case 80:
  if (api.command('set', 'torchmeter', api.opPlus('torchmeter', '$177'))) { continue; };
  break;
case 81:
  api.jump(84); continue;
  break;
case 82:
  // alt logic
  break;
case 83:
  if (api.command('set', 'torchmeter', api.opPlus('torchmeter', '$176'))) { continue; };
  break;
case 84:
  // end of if
  break;
case 85:
  if (!api.if(api.isGreaterThan('wick', 150))) { api.jump(88); continue; }
  break;
case 86:
  if (api.command('set', 'torchmeter', api.opPlus('torchmeter', '$177'))) { continue; };
  break;
case 87:
  api.jump(90); continue;
  break;
case 88:
  // alt logic
  break;
case 89:
  if (api.command('set', 'torchmeter', api.opPlus('torchmeter', '$176'))) { continue; };
  break;
case 90:
  // end of if
  break;
case 91:
  if (!api.if(api.isGreaterThan('wick', 200))) { api.jump(94); continue; }
  break;
case 92:
  if (api.command('set', 'torchmeter', api.opPlus('torchmeter', '$177'))) { continue; };
  break;
case 93:
  api.jump(96); continue;
  break;
case 94:
  // alt logic
  break;
case 95:
  if (api.command('set', 'torchmeter', api.opPlus('torchmeter', '$176'))) { continue; };
  break;
case 96:
  // end of if
  break;
case 97:
  api.jump(99); continue;
  break;
case 98:
  // alt logic
  break;
case 99:
  // end of if
  break;
case 100:
  api.text('$torchmeter');
  break;
case 101:
  api.text(' $cyan$4 $yellow   Gems:$gems');
  break;
case 102:
  api.text(' $yellow    Score:$score');
  break;
case 103:
  // -103 'make keys section of sidebar' comment
  break;
case 104:
  if (api.command('set', 'keylist', ' $white$12 $yellow   Keys:')) { continue; };
  break;
case 105:
  api.if('key0', 'set', 'keylist', api.opPlus('keylist', '$black$12'));
  break;
case 106:
  api.if('key9', 'set', 'keylist', api.opPlus('keylist', '$blue$12'));
  break;
case 107:
  api.if('key10', 'set', 'keylist', api.opPlus('keylist', '$green$12'));
  break;
case 108:
  api.if('key11', 'set', 'keylist', api.opPlus('keylist', '$cyan$12'));
  break;
case 109:
  api.if('key12', 'set', 'keylist', api.opPlus('keylist', '$red$12'));
  break;
case 110:
  api.if('key13', 'set', 'keylist', api.opPlus('keylist', '$purple$12'));
  break;
case 111:
  api.if('key14', 'set', 'keylist', api.opPlus('keylist', '$yellow$12'));
  break;
case 112:
  api.if('key15', 'set', 'keylist', api.opPlus('keylist', '$white$12'));
  break;
case 113:
  api.text('$keylist');
  break;
case 114:
  // -114 'hotkeys and input info' comment
  break;
case 115:
  api.text('');
  break;
case 116:
  api.hyperlink('Torch', 'lighttorch', 'hk', 't');
  break;
case 117:
  if (!api.if('mute')) { api.jump(120); continue; }
  break;
case 118:
  api.hyperlink('Be loud', 'soundon', 'hk', 'b');
  break;
case 119:
  api.jump(122); continue;
  break;
case 120:
  // alt logic
  break;
case 121:
  api.hyperlink('Be quiet', 'soundoff', 'hk', 'b');
  break;
case 122:
  // end of if
  break;
case 123:
  api.text('');
  break;
case 124:
  api.text('      $black$ondkcyan $24$25$26$27$ondkblue $whiteMove');
  break;
case 125:
  api.text('$black$onltgrey Shift $24$25$26$27$ondkblue $whiteShoot');
  break;
case 126:
  api.text('');
  break;
case 127:
  if (!api.if(api.isEq('graphics', 'fpv'))) { api.jump(131); continue; }
  break;
case 128:
  api.hyperlink('Turn Left', 'turnleft', 'hk', 'q');
  break;
case 129:
  api.hyperlink('Turn Right', 'turnright', 'hk', 'e');
  break;
case 130:
  api.jump(132); continue;
  break;
case 131:
  // alt logic
  break;
case 132:
  // end of if
  break;
case 133:
  // end of if
  break;
case 134:
  // -134 'update code' comment
  break;
case 135:
  if (!api.if('inputmenu')) { api.jump(139); continue; }
  break;
case 136:
  if (api.command('set', 'hint', api.opMinus(1, 'hint'))) { continue; };
  break;
case 137:
  if (api.command('idle')) { continue; };
  break;
case 138:
  api.jump(160); continue;
  break;
case 139:
  // alt logic
  break;
case 140:
  if (!api.if(api.and('inputmove', 'inputshift'))) { api.jump(154); continue; }
  break;
case 141:
  if (!api.if(api.not('reload'))) { api.jump(150); continue; }
  break;
case 142:
  api.give('reload', 3);
  break;
case 143:
  if (!api.take('ammo')) { api.jump(146); continue; }
  break;
case 144:
  if (api.command('ticker', 'You don\'t have any ammo!')) { continue; };
  break;
case 145:
  api.jump(148); continue;
  break;
case 146:
  // alt logic
  break;
case 147:
  if (api.command('shoot', 'inputmove')) { continue; };
  break;
case 148:
  // end of if
  break;
case 149:
  api.jump(151); continue;
  break;
case 150:
  // alt logic
  break;
case 151:
  // end of if
  break;
case 152:
  if (api.command('idle')) { continue; };
  break;
case 153:
  api.jump(160); continue;
  break;
case 154:
  // skip
  break;
case 155:
  if (!api.if('inputmove')) { api.jump(158); continue; }
  break;
case 156:
  api.command('go', 'inputmove');
  break;
case 157:
  api.jump(160); continue;
  break;
case 158:
  // skip
  break;
case 159:
  if (api.command('idle')) { continue; };
  break;
case 160:
  // end of if
  break;
case 161:
  // -161 'display code' comment
  break;
case 162:
  if (!api.if(api.isGreaterThan('energized', 0))) { api.jump(183); continue; }
  break;
case 163:
  if (!api.if(api.isEq('char', 2))) { api.jump(166); continue; }
  break;
case 164:
  if (api.command('char', 1)) { continue; };
  break;
case 165:
  api.jump(168); continue;
  break;
case 166:
  // alt logic
  break;
case 167:
  if (api.command('char', 2)) { continue; };
  break;
case 168:
  // end of if
  break;
case 169:
  if (!api.if(api.isEq(api.opModDivide('currenttick', 2), 1))) { api.jump(172); continue; }
  break;
case 170:
  if (api.command('color', 'white')) { continue; };
  break;
case 171:
  api.jump(174); continue;
  break;
case 172:
  // alt logic
  break;
case 173:
  if (api.command('color', api.opPlus(api.opModDivide('currenttick', 7), 8))) { continue; };
  break;
case 174:
  // end of if
  break;
case 175:
  api.take('energized');
  break;
case 176:
  if (!api.if(api.not('energized'))) { api.jump(180); continue; }
  break;
case 177:
  if (api.command('char', 2)) { continue; };
  break;
case 178:
  if (api.command('color', 'white')) { continue; };
  break;
case 179:
  api.jump(181); continue;
  break;
case 180:
  // alt logic
  break;
case 181:
  // end of if
  break;
case 182:
  api.jump(184); continue;
  break;
case 183:
  // alt logic
  break;
case 184:
  // end of if
  break;
case 185:
  // -185 'timing code' comment
  break;
case 186:
  api.take('reload');
  break;
case 187:
  if (!api.take('wick')) { api.jump(195); continue; }
  break;
case 188:
  if (!api.if('light')) { api.jump(192); continue; }
  break;
case 189:
  if (api.command('play', 'tc-c-c')) { continue; };
  break;
case 190:
  if (api.command('clear', 'light')) { continue; };
  break;
case 191:
  api.jump(193); continue;
  break;
case 192:
  // alt logic
  break;
case 193:
  // end of if
  break;
case 194:
  api.jump(196); continue;
  break;
case 195:
  // alt logic
  break;
case 196:
  // end of if
  break;
case 197:
  // -197 'loop it' comment
  break;
case 198:
  if (api.command('think')) { continue; };
  break;
case 199:
  // 199 'shot' label
  break;
case 200:
  if (api.command('bgplay', 't--c+c---c+d#')) { continue; };
  break;
case 201:
  if (!api.take('health', 10)) { api.jump(205); continue; }
  break;
case 202:
  if (api.command('ticker', 'You died!')) { continue; };
  break;
case 203:
  if (api.command('endgame')) { continue; };
  break;
case 204:
  api.jump(208); continue;
  break;
case 205:
  // alt logic
  break;
case 206:
  if (api.command('ticker', 'Ouch!')) { continue; };
  break;
case 207:
  if (api.command('think')) { continue; };
  break;
case 208:
  // end of if
  break;
case 209:
  // 209 'lighttorch' label
  break;
case 210:
  if (!api.if(api.not('isdark'))) { api.jump(213); continue; }
  break;
case 211:
  if (api.command('ticker', 'Don\'t need torch - room is not dark!')) { continue; };
  break;
case 212:
  api.jump(224); continue;
  break;
case 213:
  // alt logic
  break;
case 214:
  if (!api.if('light')) { api.jump(217); continue; }
  break;
case 215:
  if (api.command('ticker', 'Torch is already lit!')) { continue; };
  break;
case 216:
  api.jump(224); continue;
  break;
case 217:
  // skip
  break;
case 218:
  if (!api.take('torches')) { api.jump(221); continue; }
  break;
case 219:
  if (api.command('ticker', 'You don\'t have any torches!')) { continue; };
  break;
case 220:
  api.jump(224); continue;
  break;
case 221:
  // skip
  break;
case 222:
  if (api.command('set', 'light', 9)) { continue; };
  break;
case 223:
  api.give('wick', 'wickticks');
  break;
case 224:
  // end of if
  break;
case 225:
  if (api.command('think')) { continue; };
  break;
case 226:
  // 226 'soundon' label
  break;
case 227:
  if (api.command('clear', 'mute')) { continue; };
  break;
case 228:
  if (api.command('vol', 80)) { continue; };
  break;
case 229:
  if (api.command('think')) { continue; };
  break;
case 230:
  // 230 'soundoff' label
  break;
case 231:
  if (api.command('set', 'mute')) { continue; };
  break;
case 232:
  if (api.command('vol', 0)) { continue; };
  break;
case 233:
  if (api.command('think')) { continue; };
  break;
case 234:
  // 234 'turnleft' label
  break;
case 235:
  api.give('facing', -90);
  break;
case 236:
  if (api.command('think')) { continue; };
  break;
case 237:
  // 237 'turnright' label
  break;
case 238:
  api.give('facing', 90);
  break;
case 239:
  if (api.command('think')) { continue; };
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