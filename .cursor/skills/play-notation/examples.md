# Play notation — ROM snippets

From [zss/rom/refscroll/notescales_major.md](../../../zss/rom/refscroll/notescales_major.md):

```
#play cdefgab+c
#play d!e!fg!a!b!c+d!
#play def#gabc#+d
```

MIDI import style ([midi-import.md](../../../zss/feature/parse/docs/midi-import.md)):

```
#play +qcdef;wx
#play +qgaa#+c; +qefga
```

ADSR env parity (half sustain / 8th retrigger):

```
+hc
+icdeg
```
