import { parsetarget } from 'zss/device'

export function editorread(address: string) {
  const { target, path } = parsetarget(address)
  switch (target) {
    case 'label':
      return `desc;$DKGRAYdesignates a starting point for running code`.trim()
    case 'comment':
      return `desc;$DKGRAYdesignates an inactive label or comment`.trim()
    case 'hyperlink':
      return `
`.trim()
    case 'shortmove':
      return `
            `.trim()
    case 'command':
      switch (path.trim()) {
        case '':
          return `
desc;commands
audio;tts,bpm,vol,bgvol,ttsvol,play,bgplay,synth,echo,fcrush,phaser,reverb,distort,vibrato
board;board,edge,shove,duplicate,write,change,put,putwith,oneof,oneofwith,shoot,shootwith
display;toast,palette,charset
element;clear,set,become,bind,char,color,go,walk,idle,end,endwith,lock,unlock,zap,restore,cycle,die,endgame,run,runwith
loader;readline,readjson,readbin,readrexpaint,with
network;fetch,fetchwith,twitchchat,twitchbroadcast
transforms;snapshot,revert,copy,remix,weave,pivot
`.trim()
        case 'if':
          return `desc;evals condition for true or false`.trim()
        case 'else':
          return `desc;used in an if-do-done block`.trim()
        default:
          return `
desc;send message ${path}
`.trim()
      }
  }
}
