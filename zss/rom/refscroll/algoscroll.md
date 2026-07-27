## legend

s1, s2, s3, s4 = sound sources/operators
m = modulator
c = carrier
--> = signal flow

## algo0

S1 --> M --> S2 --> M --> S3 --> M --> S4 --> C

## shared algo config

#synth algo0
$whiteselect algo0 (same pattern for algo1 - algo7)

#algo0 harmonicity <number>
#algo0 harmonicity1 - harmonicity3
#algo0 modindex <number>
#algo0 modindex1 - modindex3
#algo0 osc1 - osc4 <sine, square, triangle, sawtooth, pulse, pwm>
#algo0 env1 - env4 <a> <d> <s> <r>
#algo0 env <a> <d> <s> <r>
#algo0 port <seconds>
#algo0 vol <db>

$whiteSame keys for algo1 - algo7 (+1-5 channel forms)

!synthscroll hk b " B " next;$ltgreyBack to synth
