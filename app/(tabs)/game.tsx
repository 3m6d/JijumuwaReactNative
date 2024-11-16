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

// Simplified and focused regex patterns
const answerPatterns = [
  // Employee of the month variations in Nepali
  /महिनाको\s*कर्मचारी/i,
  /उत्कृष्ट\s*कर्मचारी/i,
  /कार्तिक\s*महिनाको\s*कर्मचारी/i,
  /सर्वोत्कृष्ट\s*कर्मचारी/i,
  /कर्मचारी\s*अफ\s*द\s*मन्थ/i,

  // Mixed language variations
  /employee\s*of\s*the\s*month/i,
  /नेपाल\s*टेलिकमको\s*इम्प्लोइ\s*अफ\s*द\s*मन्थ/i,
  /को\s*हो/i,
  // employ of the month
  /employe\s*of\s*month/i,
  /best\s*employee/i,
  /employee\s*of\s*the\s*month/i,
  /best\s*employee/i,
  /कर्मचारी\s*अफ\s*द\s*मन्थ/i,
  /employee\s*of\s*the\s*month/i,
  /best\s*कर्मचारी/i,
  /उत्कृष्ट\s*employee/i,
  /कर्मचारी\s*of\s*month/i,
  /कर्मचारी\s*of\s*the\s*month/i,

  // Question forms in Nepali
  /महिनाको\s*कर्मचारी\s*को\s*हो/i,
  /उत्कृष्ट\s*कर्मचारी\s*को\s*हो/i,
  /कार्तिक\s*महिनाको\s*कर्मचारी\s*को(?:\s*रहेछ|\s*हो)/i,

  // Direct questions about employee
  /कर्मचारी\s*को\s*हो/i,
  /कर्मचारी\s*को\s*रहेछ/i,
  /कर्मचारी\s*को\s*पो\s*हो/i,

  // Variations with honorifics
  /कर्मचारी\s*बताइदिनुस/i,
  /कर्मचारी\s*भनिदिनुस/i,
  /कर्मचारी\s*खोज्नुस/i,

  // Common phrases
  /विजेता\s*कर्मचारी/i,
  /छानिएको\s*कर्मचारी/i,
  /उत्कृष्ट\s*कामदार/i,

  // Short forms
  /emp\s*of\s*month/i,
  /eom/i,
];

// Combine patterns with flexible whitespace
const combinedPattern = new RegExp(
  answerPatterns.map((pattern) => pattern.source).join("|"),
  "i"
);

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
    const greeting = `नमस्ते। म बलियो भेन्चर्सद्वारा निर्माणित मैना रोबोट हुँ। सुन्धारा कार्यालयमा टेलिकम कार्यालयको सहयोगी। आज चाहिँ हामी कार्तिक महिनाको एम्प्लोय अफ द मन्थ गेस गर्ने गेम खेल्दैछौ।,म धेरै हल्लामा सुन्न सक्दिन। हात उठाएर एन्सर दिनुहोला, अब गेम सुरु गरुम ल।`;
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

    // Normalize input text
    const normalizedText = text.trim().toLowerCase();

    if (combinedPattern.test(normalizedText)) {
      const revealAnswer = async () => {
        const suspensePart1 =
          "ठीक छ... कार्तिक महिनाको उत्कृष्ट कर्मचारी को हुनुहुन्छ भनेर तपाईंलाई बताउँछु...";
        const suspensePart2 =
          "यो व्यक्ति एक कर्मठ र मिहिनेती कर्मचारी हुनुहुन्छ...";
        const finalReveal =
          "उहाँ हुनुहुन्छ हाम्रो आफ्नै कपिल लामिछाने! आई.डी नम्बर ६६१३!";
        const praise =
          "उहाँको कार्यक्षमता र लगनशीलताको कदर गर्दै यो सम्मान प्रदान गरिएको छ। बधाई छ कपिल जी!";

        await speak(suspensePart1);
        setTimeout(async () => {
          await speak(suspensePart2);
          setTimeout(async () => {
            await speak(finalReveal);
            setTimeout(async () => {
              await speak(praise);
              navigateAway();
            }, 2000);
          }, 2000);
        }, 2000);
      };

      revealAnswer();
    } else {
      handleGeminiResponse(text);
    }
  };

  const handleGeminiResponse = async (text: string) => {
    try {
      const genAI = new GoogleGenerativeAI(
        process.env.EXPO_PUBLIC_GEMINI_API_KEY || ""
      );
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

      const prompt = `
      You are a fun game host for Nepal Telecom.
      Player's message: "${text}"

      You must respond in JSON format.

      If the player:
      - asks about employee name
      - asks who is employee of the month
      - asks who is the best employee
      - asks who is Kartik month's employee
      - asks for the answer
      - gives up
      - says they don't know
      - requests to tell the answer
      return this JSON:
      {
        "funny_text_response": "",
        "answer": "ठीक छ... कार्तिक महिनाको उत्कृष्ट कर्मचारी को हुनुहुन्छ भनेर तपाईंलाई बताउँछु... यो व्यक्ति एक कर्मठ र मिहिनेती कर्मचारी हुनुहुन्छ... उहाँ हुनुहुन्छ हाम्रो आफ्नै कपिल लामिछाने! आई.डी नम्बर ६६१३! उहाँको कार्यक्षमता र लगनशीलताको कदर गर्दै यो सम्मान प्रदान गरिएको छ। बधाई छ कपिल जी!",
        "navigate_away": true
      }

      Otherwise, for a funny response based on player's message:
      {
        "funny_text_response": "15-20 word funny response in Nepali based on player's message",
        "answer": "",
        "navigate_away": false
      }

      Instructions:
      1. When giving funny response:
         - Make jokes about the name player mentioned
         - Make office-related jokes
         - Keep it limited to 15-20 words
         - Never mention the winner's name

      2. When giving the answer:
         - Build suspense before revealing
         - Give full name with ID
         - Praise their work
         - Make it feel like an award announcement

      Give responses only in Nepali. Don't write anything except JSON.`;

      const result = await model.generateContent(prompt);
      const response = await result.response.text();

      console.log("Raw Gemini Response:", response);

      try {
        const cleanedResponse = response
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        console.log("Cleaned Response:", cleanedResponse);

        const jsonResponse = JSON.parse(cleanedResponse);
        console.log("Parsed JSON:", jsonResponse);

        if (jsonResponse.navigate_away) {
          speak(jsonResponse.answer);
          setTimeout(navigateAway, 3000);
        } else {
          speak(jsonResponse.funny_text_response);
        }
      } catch (error) {
        console.error("JSON parse error:", error);
        console.error("Failed to parse response:", response);
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
