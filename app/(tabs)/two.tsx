import { StyleSheet, TouchableOpacity } from "react-native";

import { Text, View } from "@/components/Themed";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { blurhash } from "@/constants/blurHash";
import Conversation from "@/components/Coversation";
import { messages } from "@/constants/mockMessages";
import * as Speech from "expo-speech";
import Voice, { SpeechEndEvent, SpeechErrorEvent, SpeechResultsEvent } from "@react-native-voice/voice";
import { useEffect, useState } from "react";


export default function TabTwoScreen() {
  let [started, setStarted] = useState(false);
  let [results, setResults] = useState<string[]>([]);
  const [speak_this, setSpeak_this] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);


  const onSpeechError = (error : SpeechErrorEvent) => {
    console.log(error);
  };

  const stopSpeechToText = async () => {
    await Voice.stop();
    setStarted(false);
  };

  const onSpeechEnd = (error : SpeechEndEvent) => {
    console.log("onSpeechEnd",error);
    stopSpeechToText();
  }

  const speakResult = (say_this : string) => {
    Speech.speak(say_this, options);
  };

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

  const startSpeechToText = async () => {
    console.log('voice available:',Voice.isAvailable());
    await Voice.start("ne-NP", {
      EXTRA_LANGUAGE_MODEL: "LANGUAGE_MODEL_FREE_FORM",
      EXTRA_MAX_RESULTS: 1,
      EXTRA_PARTIAL_RESULTS: true,
    });
    setStarted(true);
  };

  const onSpeechResults = (result: SpeechResultsEvent) => {
    if(result.value){
      setResults(result.value);
    }
    console.log(result.value ? result.value[0] : "No result");
    setLoading(true);
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

  return (
    <View className="flex-1 items-center justify-center">
      <LinearGradient
        // Background Linear Gradient
        colors={["rgba(255,255,255,255)", "#fff", "#ffffd0"]}
        className="absolute flex-1 top-0 left-0 right-0 bottom-0 z-0"
      />
      <View className="flex flex-row justify-center w-full bg-transparent">
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/bye-en.svg")}
          className="h-16 mt-10 w-16 z-10"
        />
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/header.svg")}
          className="h-32 w-32 z-10"
        />
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/bye-np.svg")}
          className="h-16 w-16 mt-10 z-10"
        />
      </View>

      <Conversation messages={messages} />
    </View>
  );
}
