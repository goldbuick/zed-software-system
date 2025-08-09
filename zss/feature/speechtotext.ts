// Get the SpeechRecognition object, while handling browser prefixes
const SpeechRecognition =
  // @ts-expect-error prefix
  self.SpeechRecognition ??
  // @ts-expect-error prefix
  self.webkitSpeechRecognition ??
  // @ts-expect-error prefix
  self.mozSpeechRecognition ??
  // @ts-expect-error prefix
  self.msSpeechRecognition ??
  // @ts-expect-error prefix
  self.oSpeechRecognition

export class SpeechToText {
  recognition: any

  constructor(
    onFinalised: (value: string) => void,
    onEndEvent: () => void,
    onAnythingSaid: (value: string) => void,
    language = navigator.language,
  ) {
    // Check to see if this browser supports speech recognition
    // https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition#Browser_compatibility
    if (!('webkitSpeechRecognition' in window)) {
      throw new Error(
        "This browser doesn't support speech recognition. Try Google Chrome.",
      )
    }

    this.recognition = new SpeechRecognition()

    // set interim results to be returned if a callback for it has been passed in
    this.recognition.interimResults = !!onAnythingSaid
    this.recognition.lang = language

    let finalTranscript = ''

    // process both interim and finalised results
    this.recognition.onresult = (event: any) => {
      let interimTranscript = ''

      // concatenate all the transcribed pieces together (SpeechRecognitionResult)
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcriptionPiece = event.results[i][0].transcript
        // check for a finalised transciption in the cloud
        if (event.results[i].isFinal) {
          finalTranscript += transcriptionPiece
          onFinalised(finalTranscript)
          finalTranscript = ''
        } else if (this.recognition.interimResults) {
          interimTranscript += transcriptionPiece
          onAnythingSaid(interimTranscript)
        }
      }
    }

    this.recognition.onend = () => {
      onEndEvent()
    }
  }

  startListening() {
    this.recognition.start()
  }

  stopListening() {
    this.recognition.stop()
  }
}
