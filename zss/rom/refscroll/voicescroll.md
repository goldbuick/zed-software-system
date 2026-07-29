## text to speech

#ttsengine
$whiteno args lists engines: piper, supertonic, fish
#ttsengine <engine> [config] [model]
$whiteset engine; fish needs api key and optional model
$dkgrayfish: #ttsengine fish <api_key> [s2.1-pro-free|s2.1-pro|s2-pro|s1]

#tts
$whiteclear the tts queue
#tts <voice>
$whiteshow info for that voice
#tts <voice> <phrase>
$whitespeak phrase with voice
$dkgrayfish: #tts <reference_id> phrase (via brick.zed.cafe)

#ttsqueue <voice> <phrase>
$whitequeue a phrase without interrupting current speech

#ttsvol <volume>
$whiteset tts volume

!menu hk b " B " next;$ltgreyBack to main menu
