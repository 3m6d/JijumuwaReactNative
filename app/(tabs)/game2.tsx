import React, { useCallback, useState } from "react";
import { View } from "@/components/Themed";
import { LinearGradient } from "expo-linear-gradient";
import Conversation, { Message } from "@/components/Coversation";
import * as Speech from "expo-speech";
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
} from "@react-native-voice/voice";
import uuid from "react-native-uuid";
import { useRouter } from "expo-router";
import { blurhash } from "@/constants";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { GoogleGenerativeAI } from "@google/generative-ai";
import CONSTANT_WORDS_TO_SPEAK from "@/constants/wordsToSpeak";

const PATTERNS = {
  GIVE_UP: /(हार|हार्यो|छोड्यो|सकिनँ|थाहा छैन|बताउनुस|भन्नुस)/i,
  KAPIL: /(कपिल|kapil|कपील|कपि|कपी)/i,
  LAMICHHANE: /(लामिछाने|lamichhane|लमिछाने|लामीछाने|लमीछाने)/i,
  COMMON_NAMES:
    /(राम|श्याम|हरि|कृष्ण|सीता|गीता|रमेश|सुरेश|दिनेश|महेश|राजु|सञ्जय|विजय|अजय|मनोज|सरोज|प्रकाश|विकाश)/i,
  DESIGNATIONS: /(मैनेजर|सुपरभाइजर|अफिसर|डाइरेक्टर|बस|हाकिम|प्रमुख|सहायक)/i,
};

export default function TabTwoScreen() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const router = useRouter();
  const [gameEnded, setGameEnded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setupVoiceHandlers();
      startGame();

      return () => {
        stopSpeechToText();
        resetAppState();
        Voice.destroy().then(Voice.removeAllListeners);
      };
    }, [])
  );

  const updateConversation = (sender: "user" | "sarathi", text: string) => {
    setConversation((prevConvo) => [
      ...prevConvo,
      { id: uuid.v4().toString(), text, sender },
    ]);
  };

  const setupVoiceHandlers = () => {
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
  };

  const startGame = () => {
    const greeting = `नमस्कार! म मैना हुँ। आज हामी एउटा रमाइलो खेल खेल्न गइरहेका छौं। के तपाईं यस कार्तिक महिनाको विशेष कर्मचारी को हुनुहुन्छ भनेर ���नुमान गर्न सक्नुहुन्छ?`;
    speak(greeting);
  };

  const startSpeechToText = async () => {
    if (!isSpeaking) {
      try {
        await Voice.start("ne-NP");
      } catch (error) {
        console.log("Voice start error:", error);
      }
    }
  };

  const resetAppState = () => {
    setConversation([]);
    setLoading(false);
    setIsSpeaking(false);
  };

  const stopSpeechToText = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.error("Voice stop error:", error);
    }
  };

  const onSpeechResults = (result: SpeechResultsEvent) => {
    const text = result.value?.[0] || CONSTANT_WORDS_TO_SPEAK.error_understand;
    updateConversation("user", text);
    processSpeechResult(text);
  };

  const onSpeechEnd = () => {
    stopSpeechToText();
  };

  const onSpeechError = (error: SpeechErrorEvent) => {
    console.log("Speech error:", error);
    startSpeechToText();
  };

  const speak = (text: string) => {
    const processedText = text.replace(/[१२३४५६७८९०]+/g, (match) => {
      return match.split("").join(" ");
    });

    updateConversation("sarathi", text);
    setIsSpeaking(true);

    Speech.speak(processedText, {
      voice: "ne-NP-language",
      pitch: 1,
      rate: 1,
      onStart: () => {
        stopSpeechToText().catch(console.error);
      },
      language: "ne-NP",
      onDone: () => {
        setIsSpeaking(false);
        if (!loading) {
          startSpeechToText().catch(console.error);
        }
      },
    });
  };

  const processSpeechResult = (text: string) => {
    if (text === "No result") {
      speak(CONSTANT_WORDS_TO_SPEAK.error_understand);
      return;
    }

    handleGeminiResponse(text);
  };

  const handleGeminiResponse = async (text: string) => {
    try {
      const genAI = new GoogleGenerativeAI(
        process.env.EXPO_PUBLIC_GEMINI_API_KEY || ""
      );
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

      const isKapilRelated = PATTERNS.KAPIL.test(text);
      const isLamichhaneRelated = PATTERNS.LAMICHHANE.test(text);
      const isCommonName = PATTERNS.COMMON_NAMES.test(text);
      const hasDesignation = PATTERNS.DESIGNATIONS.test(text);
      const isGivingUp = PATTERNS.GIVE_UP.test(text);

      if (isGivingUp) {
        speak(
          `ठीक छ, कुनै चिन्ता नगर्नुहोस्! यस कार्तिक महिनाको उत्कृष्ट कर्मचारी हुनुहुन्छ कपिल लामिछाने (ID: ६६१३)। खेल खेल्नुभएकोमा धन्यवाद!`
        );
        setTimeout(navigateAway, 3000);
        return;
      }

      if (isKapilRelated && isLamichhaneRelated) {
        speak(
          `वाह! बधाई छ!! तपाईंले सही अनुमान गर्नुभयो। कपिल लामिछाने (ID: ६६१३) यस महिनाको उत्कृष्ट कर्मचारी हुनुहुन्छ। तपाईं साँच्चै चतुर हुनुहुन्छ!`
        );
        setTimeout(navigateAway, 3000);
        return;
      }

      const prompt = `
      तपाईं नेपाल टेलिकमको एक मजाकिलो खेल होस्ट हुनुहुन्छ।

      खेलाडीको भनाई: "${text}"
      विश्लेषण:
      - कपिल सम्बन्धित: ${isKapilRelated}
      - लामिछाने सम्बन्धित: ${isLamichhaneRelated}
      - सामान्य नाम: ${isCommonName}
      - पद उल्लेख: ${hasDesignation}

      निर्देशनहरू:
      1. खेलाडीले भनेको नामको आधारमा रमाइलो जवाफ दिनुहोस्
      2. कार्यालय सम्बन्धी मजाक गर्नुहोस्
      3. १५-२० शब्दमा सीमित राख्नुहोस्
      4. विजेताको नाम कहिल्यै नभन्नुहोस्

      जवाफको शैली:
      - यदि पद उल्लेख छ: पदको मजाक गर्नुहोस्
      - यदि सामान्य नाम छ: त्यो नामको व्यक्तिको कार्यालय व्यवहारको मजाक गर्नुहोस्
      - यदि कपिल/लामिछाने सम्बन्धित छ: उत्साहजनक जवाफ दिनुहोस्

      जवाफ नेपालीमा मात्र दिनुहोस्।`;

      const result = await model.generateContent(prompt);
      const response = await result.response.text();

      if (response) {
        speak(response);
      } else {
        speak(CONSTANT_WORDS_TO_SPEAK.error_server);
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      speak(CONSTANT_WORDS_TO_SPEAK.error_server);
    }
  };

  const speakGoodbye = async () => {
    const speechOptions = {
      voice: "ne-NP-language",
      pitch: 1,
      rate: 1,
      language: "ne-NP",
      onStart: () => stopSpeechToText().catch(console.error),
      onDone: () => {
        console.log("Speech finished");
        navigateAway();
      },
    };
    updateConversation("sarathi", CONSTANT_WORDS_TO_SPEAK.goodbye);
    Speech.speak(CONSTANT_WORDS_TO_SPEAK.goodbye, {
      ...speechOptions,
      onStart: () => {
        stopSpeechToText().catch(console.error);
      },
      onDone: () => {
        console.log("Speech finished");
        navigateAway();
      },
    });
  };

  const navigateAway = async () => {
    await stopSpeechToText();
    router.navigate("/(tabs)/");
  };

  return (
    <View className="flex-1 items-center justify-center">
      <LinearGradient
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

      <Conversation messages={conversation} loading={loading} />
    </View>
  );
}
