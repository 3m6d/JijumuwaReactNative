import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, Button, View, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import Voice, { SpeechEndEvent, SpeechErrorEvent, SpeechResultsEvent } from "@react-native-voice/voice";
import * as Speech from "expo-speech";
import { FontAwesome5 } from "@expo/vector-icons";

/*
expo init expo-speech-to-text
cd expo-speech-to-text
expo install @react-native-voice/voice expo-dev-client

Add the following to your app.json, inside the expo section:
"plugins": [
  [
    "@react-native-voice/voice",
    {
      "microphonePermission": "Allow Voice to Text Tutorial to access the microphone",
      "speechRecognitionPermission": "Allow Voice to Text Tutorial to securely recognize user speech"
    }
  ]
]

If you don't have eas installed then install using the following command:
npm install -g eas-cli

eas login
eas build:configure

Build for local development on iOS or Android:
eas build -p ios --profile development --local
OR
eas build -p android --profile development --local

May need to install the following to build locally (which allows debugging)
npm install -g yarn
brew install fastlane

After building install on your device:
For iOS (simulator): https://docs.expo.dev/build-reference/simulators/
For Android: https://docs.expo.dev/build-reference/apk/

Run on installed app:
expo start --dev-client

*/


export default function TabThreeScreen() {
  let [started, setStarted] = useState(false);
  let [results, setResults] = useState<string[]>([]);
  const [speak_this, setSpeak_this] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);
  
  const CONSTANT_WORDS_TO_SPEAK = {
    // namaskar, mero naam riti kumari waiba ho. tapai ke ko lagi aunu bhayo?
   greet_customer: "नमस्कार, मेरो नाम रिति कुमारी वाइबा हो। तपाई के को लागि आउनु भयो?",
   // server ma truti bhayo kripaya pachi feri prayas garnuhos. yasko lagi ma kshama chahanchu
   error_server: "सर्भरमा त्रुटि भयो। कृपया पछि फेरि प्रयास गर्नुहोस्। यसको लागि म क्षमा चाहन्छु।",
   // yo subhida prayog garnu bhayeko ma tapei lai dhanyabad
   bye_customer: "यो सुविधा प्रयोग गर्नु भएकोमा तपाईलाई धन्यवाद।",
  }
  const options : Speech.SpeechOptions = {
    voice: "ne-NP-language",
    pitch: 1,
    rate: 1,
    onDone: () => {
      console.log("Speech finished");
      // check if speak is complete and then startSpeechToText again
      Speech.isSpeakingAsync().then((isSpeaking) => {
        if(!isSpeaking) {
          startSpeechToText();
        }
      }).catch((error) => {
        console.log(error);
      }).finally(() => {
        startSpeechToText();
      });
    },
    language: "ne-NP",
  };

  useEffect(() => {
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechEnd = onSpeechEnd;
    // on first run only greet the user
    if(!greeted) {
      setGreeted(true);
      Speech.speak(CONSTANT_WORDS_TO_SPEAK.greet_customer, options);
      Speech.stop();
    }
    // return () => {
    //   Voice.destroy().then(Voice.removeAllListeners);
    // };
  }, []);

  const startSpeechToText = async () => {
    console.log('voice available:',Voice.isAvailable());
    await Voice.start("ne-NP", {
      EXTRA_LANGUAGE_MODEL: "LANGUAGE_MODEL_FREE_FORM",
      EXTRA_MAX_RESULTS: 1,
      EXTRA_PARTIAL_RESULTS: true,
    });
    setStarted(true);
  };

  const stopSpeechToText = async () => {
    await Voice.stop();
    setStarted(false);
  };

  const onSpeechResults = (result : SpeechResultsEvent) => {
    if(result.value){
        setResults(result.value ? result.value : []);
    }
    const data = new FormData();
    console.log(result.value ? result.value[0] : "No result");
    
    setLoading(true);
    // axiosInstance
    //   .post("check_similarity", data)
    //   .then((response) => {
    //     console.log(response.data);
    //     setSpeak_this(response.data.sentence);
    //     setLoading(false);
    //     speakResult(response.data.sentence);
    //     // check if speak is complete and then startSpeechToText again
    //     Speech.isSpeakingAsync().then((isSpeaking) => {
    //       if(!isSpeaking) {
    //         startSpeechToText();
    //       }
    //     }).catch((error) => {
    //       console.log(error);
    //     }).finally(() => {
    //       startSpeechToText();
    //     });
    //   })
    //   .catch((error) => {
    //     console.log(error.message);
    //     setSpeak_this(CONSTANT_WORDS_TO_SPEAK.error_server);
    //     speakResult(CONSTANT_WORDS_TO_SPEAK.error_server);
    //   })
    //   .finally(() => {
    //     setLoading(false);
    //   });
  };

  const onSpeechError = (error: SpeechErrorEvent) => {
    console.log(error);
  };

  const onSpeechEnd = (error : SpeechEndEvent) => {
    console.log("onSpeechEnd",error);
    stopSpeechToText();
  }

  const speakResult = (say_this : string) => {
    Speech.speak(say_this, options);
  };

  return (
    <View style={styles.container}>
      {!started ? (
        <TouchableOpacity style={styles.microphoneContainer} onPress={startSpeechToText}>

          <FontAwesome5 name="microphone" size={48} backgroundColor="#000" color="#fff" style={{paddingHorizontal: 20
          ,paddingVertical: 13, borderRadius: 100}}
           />
        </TouchableOpacity>
      ) : undefined}
      {started ? (
        <TouchableOpacity style={styles.microphoneContainer} onPress={stopSpeechToText}>

        <FontAwesome5 name="microphone-slash" size={48} backgroundColor="#000" color="#fff" style={{paddingHorizontal: 20
        ,paddingVertical: 13, borderRadius: 100}}
         />
      </TouchableOpacity>
      ) : undefined}
      {results.map((result, index) => (
        <TouchableOpacity key={index}>
          <Text>{result}</Text>
        </TouchableOpacity>
      ))}

      {loading ? <Text>Loading...</Text> : <Text>{speak_this}</Text>}

      {/* {!loading && <Button title="Speak" onPress={speakResult} />} */}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  microphoneContainer: {
    fontSize: 100,
    borderRadius: 100,
  },
});
