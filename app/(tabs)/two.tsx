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
import intentResponses from "@/constants/intentResponses";
import CONSTANT_WORDS_TO_SPEAK from "@/constants/wordsToSpeak";

// {"entities": {}, "intents": [{"confidence": 0.9709269656906307, "id": "1436792370584032", "name": "Dhara_Nam_Sari"}], "text": "ढल निकास व्यवस्थापन गर्न के चाहिन्छ", "traits": {}}

type IntentResponse = {
  entities: Record<string, any>;
  intents: { confidence: number; id: string; name: string }[];
  text: string;
  traits: Record<string, any>;
};

export default function TabTwoScreen() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const router = useRouter();
  const [latestSpeakMessage, setLatestSpeakMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      setupVoiceHandlers();
      greetUser();

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

  const greetUser = () => {
    speak(CONSTANT_WORDS_TO_SPEAK.greet_customer);
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
    setLatestSpeakMessage(text);
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
    const q = encodeURIComponent(text);
    setLoading(true);

    if (q === "No result") {
      speak(
        "तपाईले के भन्नु भएको छ मैले ठ्याक्कै बुझिन, कृपया स्पष्ट रूपमा भन्न सक्नुहुन्छ"
      );
      return;
    }

    const regexMap = {
      bye: /(bye|goodbye|बिदाई|धन्यवाद)/i,
      repeat: /(फेरि भन्नुहोस्|फेरि भन्नु भएको छ|फेरि भन्नुहोस्)/i,
      notUnderstood: /(बुझिन|मैले ठ्याक्कै बुझिन|मैले ठ्याक्कै बुझिन)/i,
    };

    if (regexMap.notUnderstood.test(text) || regexMap.repeat.test(text)) {
      speak(latestSpeakMessage);
      return;
    }
    if (regexMap.bye.test(text)) {
      stopSpeechToText().then(speakGoodbye);
      return;
    }

    const uri = `https://api.wit.ai/message?v=20241113&q=${q}`;
    const auth = `Bearer ${process.env.EXPO_PUBLIC_AUTH_TOKEN}`;

    fetch(uri, { headers: { Authorization: auth } })
      .then((res) => res.json())
      .then(async (res: IntentResponse) => {
        const intent = res.intents?.[0]?.name || "No_Intent";
        console.log("Intent : " + intent);

        await stopSpeechToText();

        await callGeminiAPI(
          text,
          res,
          intentResponses[intent as keyof typeof intentResponses]
        );
      })
      .catch((error) => {
        console.error("Error fetching data from Wit.ai:", error);
        speak(CONSTANT_WORDS_TO_SPEAK.error_server);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const callGeminiAPI = async (
    text: string,
    intentResponse: IntentResponse,
    ourResponse: string
  ) => {
    try {
      const genAI = new GoogleGenerativeAI(
        process.env.EXPO_PUBLIC_GEMINI_API_KEY || ""
      );
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

      const prompt = `
    IDENTITY:
      Name: Project Jijumuwa (Created by Dipawoli Malla)
      Role: Assistant for Elderly Users

      You are a knowledgeable and helpful assistant specializing in NTC Nepal services. Always provide complete, confident answers.

      CORE GUIDELINES:

      Answer all aspects of user questions completely
      Never refuse to answer
      Provide solutions even for complex queries
      Be practical and action-oriented
      CONTEXT SETTINGS:

      NTC Nepal Services:

      Mobile Services: [PostPaid and Prepaid eSim]



      Internet Services: [Fiber-to-the-Home (FTTH) and Dedicated Lease Connectivity and ADSL services]

      Fixed Line Services: [Landline, Toll Free Phone, IVR Services, SIP PBX Services]

      Prepaid:
      Classic Plans: Various plans with different voice call, SMS, and data benefits.
      Data Packs: A range of data packs with varying data volumes and validity periods.
      Combo Packs: Bundles that combine voice calls, SMS, and data benefits.
      Specific Combo Packs:
      Combo 199 Pack: 2GB data, 200 minutes all-net calls, 28 days validity
      Combo 299 Pack: 4GB data, 300 minutes all-net calls, 20 SMS (NT-NT), 28 days validity
      Combo 499 Pack: 8GB data, 500 minutes all-net calls, 100 SMS all-net, 28 days validity
      Sajilo Unlimited 699 Pack: 15GB data, unlimited all-net calls, 200 SMS all-net, 28 days validity (prepaid) / 30 days (postpaid)
      Sajilo Unlimited 799 Pack: 30GB data, unlimited all-net calls, 250 SMS all-net, 28 days validity (prepaid) / 30 days (postpaid)
      Sajilo Unlimited 999 Pack: 60GB data, unlimited all-net calls, 300 SMS all-net, 28 days validity (prepaid) / 30 days (postpaid)
      Sajilo Unlimited 1499 Pack: 100GB data, unlimited all-net calls, 350 SMS all-net, 28 days validity (prepaid) / 30 days (postpaid)
      Sajilo Executive Pack: 200GB data, unlimited all-net calls, 500 SMS all-net, 28 days validity (prepaid) / 30 days (postpaid)


      To get an eSIM in Nepal, you can:
    Check device compatibility: Make sure your phone supports eSIM technology. You can check by dialing *#06# on Android phones, or looking for the "add cellular plan" option in the settings on Apple iOS devices. 
Choose a plan: Select an eSIM data plan that meets your needs. Consider your stay duration, expected data usage, and whether you'll travel to other areas. 
Purchase the eSIM: Buy the eSIM plan from a website like eSIM.net or ETravelSim. 
      Install and activate the eSIM: You'll receive an email with a QR code and instructions for installation and activation. 
      Test connectivity: Verify that your device can connect to the internet. 

      Postpaid:
      Smart Plans: Customized plans with flexible data, voice call, and SMS limits.
      Family Plans: Shared plans for multiple SIM cards within a family.
      Specific Postpaid Plans:
      373 Voice Pack: 800 minutes (NT-NT), 30 days validity
      373 Data Pack: 6GB data, 30 days validity
      Postpaid 499 Pack: 500 minutes all-net calls, 8GB data, 100 SMS all-net, 30 days validity
      Home Broadband:

      Fiber-to-the-Home (FTTH): High-speed internet plans with different speeds and data limits.
      Wireless Broadband: 4G LTE wireless broadband plans for areas with limited fiber connectivity.
      Other Services:

      NTC Money: Mobile financial services for easy money transfers and payments.
      NTC TV: Digital television service with various channel packages.
      NTC Cloud: Cloud-based storage and computing solutions.
      General Queries:

      Provide Nepal-focused information
      Include fees, timelines, and requirements when applicable and also if they need suggestion then suggest the best possible option available.
      RESPONSE STYLE:

      Friendly and conversational tone
      Maximum 80 words per response
      Use simple, clear language
      Mix Nepali and English terms appropriately
      Include specific steps and requirements
      Dont add any contact information (NTC Customer Care: 1498)
      
      FOR UNCERTAIN CASES:
      Provide best possible answer based on similar scenarios
      Suggest practical alternatives
      Include general process guidelines
      Recommend next steps

      If user asks for some volume of data they want then recommend the best possible plan available rather than saying no. User might
      also ask based on no of days please suggest accrodingly.

      If anyone asks who are you or wants to know your identity then say i am robot made by baliyo ventures for NTC customer services.
      User Query: ${text}
      Answer in Complete Nepali language only.
  
      If anyone asks who are you or wants to know your identity then say i am robot made by baliyo ventures for ward related services.
      User Query: ${text}
      Intent: ${intentResponse}
      Our Response: ${ourResponse}

      Previous Conversation: ${conversation}
      Answer in Complete Nepali language only.
      if question is in english reply in english.
    `;

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
