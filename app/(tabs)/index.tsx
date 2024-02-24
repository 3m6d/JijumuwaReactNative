import { StyleSheet, TouchableOpacity } from "react-native";
import { Text, View } from "@/components/Themed";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { blurhash } from "@/constants/blurHash";
import { useRouter } from "expo-router";
import Voice, { SpeechErrorEvent, SpeechResultsEvent } from "@react-native-voice/voice";
import { useEffect, useState } from "react";

export default function TabOneScreen() {
  const router = useRouter();
  let [started, setStarted] = useState(false);
  let [results, setResults] = useState<string[]>([]);
  let [shouldListen, setShouldListen] = useState(true); // Controls continuous listening

  useEffect(() => {
    const onSpeechResults = (result: SpeechResultsEvent) => {
      setResults(result.value ? result.value : []);
      const nepaliSarathiRegex = /सारथी|सरथी|सारथि|सारथे|सारथ|सरथि|शारथि/;
      console.log(results[0]);
      if (result.value && result.value[0].match(nepaliSarathiRegex)) {
        Voice.stop().then(() => {
          router.push("/(tabs)/two");
        })
      }
      // Continue listening
      if (shouldListen) restartListening();
    };

    const onSpeechError = (error : SpeechErrorEvent) => {
      console.log("onSpeechError", error);
      // Continue listening even if there's an error
      if (shouldListen) restartListening();
    };

    const restartListening = async () => {
      await Voice.stop();
      await Voice.start("ne-NP", {
        EXTRA_LANGUAGE_MODEL: "LANGUAGE_MODEL_FREE_FORM",
        EXTRA_MAX_RESULTS: 1,
        EXTRA_PARTIAL_RESULTS: true,
      });
    };

    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    // Start listening initially
    startSpeechToText();

    return () => {
      setShouldListen(false); // Stop listening on component unmount
      // Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [shouldListen]);

  const startSpeechToText = async () => {
    console.log('voice available:', Voice.isAvailable());
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

  return (
    <View className="flex-1 items-center justify-between p-4">
      <LinearGradient
        colors={["rgba(255,255,255,255)", "#fff", "#ffffd0"]}
        className="absolute flex-1 top-0 left-0 right-0 bottom-0 z-0"
      />
      <View className="flex flex-row justify-between w-full bg-transparent">
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/namaste-sarathi.svg")}
          className="h-32 mt-4 w-32 z-10"
        />
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/namaskar-sarathi.svg")}
          className="h-32 mt-10 w-32 z-10"
        />
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/header.svg")}
          className="h-48 w-48 z-10"
        />
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/hi-sarathi.svg")}
          className="h-32 w-32 mt-10 z-10"
        />
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/hello-sarathi.svg")}
          className="h-32 w-32 mt-4 z-10"
        />
      </View>

      <View className="flex-1 items-center justify-center bg-transparent w-full">
        <Text className="text-xl text-black mb-4">
          Press the button below to start
        </Text>
        </View>
      <TouchableOpacity
        className="bg-yellow-400 py-2 px-10 rounded-full z-10"
        onPress={() => {
          shouldListen ? stopSpeechToText() : startSpeechToText();
          setShouldListen(!shouldListen);
        }}
      >
        <Text className="text-4xl text-center font-extrabold text-gray-800">
          {started ? "Stop Listening" : "Start Talking"}
        </Text>
      </TouchableOpacity>
      {/* Rest of your component's JSX */}
    </View>
  );
}
