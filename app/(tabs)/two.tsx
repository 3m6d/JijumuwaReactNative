import React, { useEffect, useRef, useState } from "react";
import { View } from "@/components/Themed";
import { LinearGradient } from "expo-linear-gradient";
import Conversation, { Message } from "@/components/Coversation";
import * as Speech from "expo-speech";
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
} from "@react-native-voice/voice";
import uuid from "react-native-uuid"; // Assuming react-native-uuid provides this
import { useRouter } from "expo-router";
import { CONSTANT_WORDS_TO_SPEAK, blurhash } from "@/constants";
import { Image } from "expo-image";
import _ from "lodash";

export default function TabTwoScreen() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter(); // Assuming useRouter hook is correctly implemented
  const [greeted, setGreeted] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const wordBufferRef = useRef("");
  const accumulatedLettersRef = useRef("");

  const options: Speech.SpeechOptions = {
    voice: "ne-NP-language",
    pitch: 1,
    rate: 1,
    onDone: () => {
      console.log("Speech finished");
      // check if speak is complete and then startSpeechToText again
      Speech.isSpeakingAsync()
        .then((isSpeaking) => {
          if (!isSpeaking) {
            startSpeechToText();
          }
        })
        .catch((error) => {
          console.log(error);
        })
        .finally(() => {
          startSpeechToText();
        });
    },
    language: "ne-NP",
  };

  useEffect(() => {
    setupVoiceHandlers();
    greetUser();
    initWebSocket();
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const initWebSocket = () => {
    // TODO : Replace with actual server URL and run it
    const ws = new WebSocket("https://42e0-111-119-49-104.ngrok-free.app");
    ws.onopen = () => console.log("WebSocket connection established.");
    ws.onmessage = handleWebSocketMessage;
    ws.onclose = () => console.log("WebSocket connection closed.");
    setSocket(ws);
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    const message = event.data;
    console.log("Received message from server:", message);

    // Accumulate letters for batch update
    for (const letter of message) {
      accumulatedLettersRef.current += letter;
      if (letter === " ") {
        // Check and potentially speak the buffer
        checkAndSpeakBuffer();
        // Update conversation with accumulated letters
        updateConversation("sarathi", accumulatedLettersRef.current);
        accumulatedLettersRef.current = "";
      }
    }
    // Final update for any remaining letters
    if (accumulatedLettersRef.current.trim()) {
      updateConversation("sarathi", accumulatedLettersRef.current);
      accumulatedLettersRef.current = "";
    }
  };

  const checkAndSpeakBuffer = _.debounce(() => {
    const words = wordBufferRef.current.trim().split(" ");
    if (words.length >= 3) {
      speak(wordBufferRef.current.trim());
      wordBufferRef.current = ""; // Reset buffer after speaking
    }
  }, 1000); // Adjust debounce time as needed

  const setupVoiceHandlers = () => {
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
  };

  const greetUser = () => {
    const greeting = CONSTANT_WORDS_TO_SPEAK.greet_customer;
    updateConversation("sarathi", greeting);
    speak(greeting);
  };

  const startSpeechToText = async () => {
    try {
      await Voice.start("ne-NP");
    } catch (error) {
      console.log("Voice start error:", error);
    }
  };

  const stopSpeechToText = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.log("Voice stop error:", error);
    }
  };

  const onSpeechResults = (result: SpeechResultsEvent) => {
    const text = result.value
      ? result.value[0]
      : CONSTANT_WORDS_TO_SPEAK.error_understand;
    updateConversation("user", text);
    processSpeechResult(text);
  };

  const onSpeechEnd = () => {
    stopSpeechToText();
  };

  const onSpeechError = (error: SpeechErrorEvent) => {
    console.log("Speech error:", error);
    // Continue listening even if there's an error
    startSpeechToText();
  };

  const speak = (text: string) => {
    updateConversation("sarathi", text);
    Speech.speak(text, {
      voice: "ne-NP-language",
      pitch: 1,
      rate: 1,
      language: "ne-NP",
      onDone: () => {
        console.log("Speech finished");
        startSpeechToText();
      },
    });
  };

  const updateConversation = (sender: "user" | "sarathi", text: string) => {
    setConversation((prevConvo: Message[]) => [
      ...prevConvo,
      { id: uuid.v4().toString(), text, sender },
    ]);
  };

  const processSpeechResult = (text: string) => {
    const q = encodeURIComponent(text);
    if (q === "No result") {
      speak(
        "तपाईले के भन्नु भएको छ मैले ठ्याक्कै बुझिन, कृपया स्पष्ट रूपमा भन्न सक्नुहुन्छ"
      );
      return;
    }
    //goodbye| dhanyabad
    const byeRegex = new RegExp(/(bye|goodbye|बिदाई|धन्यवाद)/i);

    if (byeRegex.test(text)) {
      speak(CONSTANT_WORDS_TO_SPEAK.goodbye);
      stopSpeechToText()
        .then(() => {
          router.replace("/(tabs)/");
        })
        .catch((error) => {
          console.log(error);
        });
    }

    const uri = "https://api.wit.ai/message?v=20230215&q=" + q;
    const auth = "Bearer " + process.env.EXPO_PUBLIC_AUTH_TOKEN;
    fetch(uri, { headers: { Authorization: auth } })
      .then((res) => res.json())
      .then((res) => {
        // Process the response from Wit.ai here
        console.log(res);

        // Example: Extract intent from Wit.ai response
        const intent =
          res.intents && res.intents.length > 0 ? res.intents[0].name : null;
        console.log("Intent : " + intent);
        if (intent === "Alive_Verification") {
          speak(
            "तपाईंको अस्तित्व प्रमाणित गर्न, कृपया तपाईंको हालको सम्पर्क जानकारी र कुनै पनि आधिकारिक परिचयपत्र दस्तावेज प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Business_Closure_Request") {
          speak(
            "तपाईंको व्यापार बन्द गर्ने अनुरोध संग साथ अगाडि बढ्न, हामीलाई तपाईंको व्यापारको विवरण चाहिन्छ, जसमा यसको दर्ता नम्बर र बन्द गर्नुको कारण समावेश छ।"
          );
        } else if (intent === "Business_Registration") {
          speak(
            "तपाईंको व्यापार दर्ता गर्न, कृपया आवश्यक कागजातहरू जस्तै तपाईंको व्यापार योजना, ठेगानाको प्रमाण, र परिचयपत्र प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Business_Relocation_Request") {
          speak(
            "तपाईंको व्यापार सार्नको लागि, हामीलाई नयाँ स्थानको विवरण र सार्नुको कारणहरू चाहिन्छ।"
          );
        } else if (intent === "Chhopaya_Request") {
          speak(
            "तपाईंको छोपाया अनुरोध प्रक्रिया गर्न, कृपया घटनाको विवरण र कुनै पनि समर्थन दस्तावेजहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Citizenship_Certificate_Request_New_Renew") {
          speak(
            "नयाँ वा नवीकरण गरिएको नागरिकता प्रमाणपत्रको लागि आवेदन गर्न, तपाईंले आवश्यक कागजातहरू पेश गर्नु पर्छ र आवेदन फारम पूरा गर्नु पर्छ।"
          );
        } else if (intent === "Court_Proceeding_Request") {
          speak(
            "अदालती कार्यवाही सुरु गर्न, कृपया मुद्दाको विवरण र कुनै पनि सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Dhara_Nam_Sari") {
          speak(
            "तपाईंको धरा नाम सारी अनुरोधसँग अगाडि बढ्न, हामीलाई जग्गाको विवरण र कुनै पनि सहायक कागजातहरू चाहिन्छ।"
          );
        } else if (intent === "Disability_Application") {
          speak(
            "अपाङ्गता लाभको लागि आवेदन गर्न, कृपया चिकित्सा कागजात र तपाईंको अवस्थाको जानकारी प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Electricity_Connection_New_House") {
          speak(
            "नयाँ विद्युत् सम्बन्धको लागि, तपाईंले सम्पत्तिको स्वामित्व वा भाडामा लिने प्रमाण र परिचयपत्र दस्तावेज प्रदान गर्नु पर्छ।"
          );
        } else if (intent === "Electricity_Connection_Old_House") {
          speak(
            "पुरानो घरको लागि विद्युत् सम्बन्ध आवेदन गर्न, कृपया सम्पत्तिको स्वामित्व वा भाडामा लिने प्रमाण र परिचयपत्र दस्तावेज प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Electricity_Meter_Registration_Transfer") {
          speak(
            "विद्युत् मिटर दर्ता सार्न, कृपया वर्तमान र नयाँ मालिकको विवरण र सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Free_Health_Treatment_Application") {
          speak(
            "नि:शुल्क स्वास्थ्य उपचारको लागि आवेदन गर्न, कृपया तपाईंको चिकित्सा अवस्था र आर्थिक स्थितिको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Guardian_Application") {
          speak(
            "कानूनी संरक्षकत्वको लागि आवेदन गर्न, कृपया वार्डको विवरण र संरक्षकत्व खोज्नुको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "House_Demolition_Verification") {
          speak(
            "घर भत्काउनुको आवश्यकता प्रमाणित गर्न, कृपया सम्पत्तिको विवरण र भत्काउनुको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "House_Land_Name_Transfer_Request") {
          speak(
            "घर वा जग्गाको नाम सार्ने अनुरोध गर्न, कृपया आवश्यक कागजातहरू र सार्ने विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "In_English_Application") {
          speak(
            "कृपया प्रक्रिया गर्नको लागि तपाईंको आवेदनको विवरण अङ्ग्रेजीमा प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Indigenous_Certification") {
          speak(
            "आदिवासी स्थिति प्रमाणित गर्न, कृपया सम्बन्धित कागजात र तपाईंको पूर्वजको जानकारी प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Inheritance_Rights_Verification") {
          speak(
            "उत्तराधिकार अधिकारहरू प्रमाणित गर्न, कृपया सम्पत्तिको विवरण र कुनै पनि कानूनी कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Land_Registration_Request") {
          speak(
            "जग्गा दर्ता गर्न, कृपया आवश्यक कागजातहरू जसमा जग्गाको स्वामित्व प्रमाण र परिचयपत्र समावेश छ, प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Lost_Land_Certificate_Replacement") {
          speak(
            "हराएको जग्गा प्रमाणपत्र प्रतिस्थापन गर्न, कृपया हराएको प्रमाणपत्रको विवरण र कुनै पनि सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Lost_Land_Certificate") {
          speak(
            "हराएको जग्गा प्रमाणपत्र रिपोर्ट गर्न, कृपया हराएको प्रमाणपत्रको विवरण र कुनै पनि सम्बन्धित जानकारी प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Medical_Treatment_Expenses") {
          speak(
            "चिकित्सा उपचार खर्चको कभरेजको लागि आवेदन गर्न, कृपया उपचारको विवरण र तपाईंको आर्थिक स्थितिको जानकारी प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Minors_Application_Request") {
          speak(
            "नाबालकको तर्फबाट आवेदन गर्न, कृपया नाबालकको विवरण र आवेदनको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Mohi_Lease_Acquisition_Transfer") {
          speak(
            "मोही लिज अधिग्रहण सार्न, कृपया वर्तमान र नयाँ लिजधारकको विवरण र सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Mohi_Lease_Acquisition") {
          speak(
            "मोही लिज अधिग्रहणको लागि आवेदन गर्न, कृपया सम्पत्तिको विवरण र अधिग्रहणको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Name_Standardization") {
          speak(
            "तपाईंको नाम मानकीकरण गर्न, कृपया विविधताहरूको विवरण र कुनै पनि सहायक कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Organization_Registration_Request") {
          speak(
            "तपाईंको संगठन दर्ता गर्न, कृपया आवश्यक कागजातहरू जस्तै संगठनको चार्टर र परिचयपत्र प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Permanent_Residence") {
          speak(
            "स्थायी बसाइ सराइको लागि आवेदन गर्न, कृपया तपाईंको बसाइ सराइ स्थिति र कुनै पनि सम्बन्धित कागजातहरूको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Pipeline_Installation") {
          speak(
            "पाइपलाइन स्थापनाको लागि, कृपया स्थान र स्थापनाको उद्देश्यको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Property_Valuation") {
          speak(
            "सम्पत्ति मूल्यांकनको लागि अनुरोध गर्न, कृपया सम्पत्तिको विवरण र यसका विशेषताहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Rental_Agreement_Application") {
          speak(
            "भाडामा लिने सम्झौताको लागि आवेदन गर्न, कृपया सम्पत्तिको विवरण र सम्झौताका शर्तहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Road_Area_Validation") {
          speak(
            "सडक क्षेत्र प्रमाणित गर्न, कृपया स्थान र प्रमाणित गर्ने उद्देश्यको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Road_Maintenance_Proposal") {
          speak(
            "सडक रखरखावको प्रस्ताव गर्न, कृपया सडकको अवस्था र प्रस्तावित रखरखाव योजनाको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Room_Opening_Request") {
          speak(
            "कोठा खोल्ने अनुरोध गर्न, कृपया सम्पत्तिको विवरण र कोठा खोल्नुको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Scholarship_Application") {
          speak(
            "छात्रवृत्तिको लागि तपाईंको योग्यता निर्धारण गर्न, हामीलाई तपाईंको शैक्षिक उपलब्धिहरू, बाह्यक्रियाकलापहरू, र पारिवारिक आयको जानकारी चाहिन्छ। के तपाईं यी विवरणहरू प्रदान गर्न सक्नुहुन्छ?"
          );
        } else if (intent === "School_Address_Change_Request") {
          speak(
            "विद्यालयको ठेगाना परिवर्तनको लागि अनुरोध गर्न, कृपया वर्तमान र नयाँ ठेगानाको विवरण र कुनै पनि सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "School_Operations_Class_Expansion_Request") {
          speak(
            "विद्यालय संचालन वा कक्षाहरूको विस्तारको लागि अनुरोध गर्न, कृपया प्रस्तावित विस्तार र यसको औचित्यको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Social_Security_Allowance_Registration") {
          speak(
            "सामाजिक सुरक्षा भत्ताको लागि दर्ता गर्न, कृपया तपाईंको योग्यताको विवरण र कुनै पनि सहायक कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Surveying_Road_No_Road_Field") {
          speak(
            "सडक वा नो-सडक क्षेत्रको सर्वेक्षण गर्न, कृपया सर्वेक्षण गरिने क्षेत्र र सर्वेक्षणको उद्देश्यको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Temporary_Property_Tax_Exemption") {
          speak(
            "अस्थायी सम्पत्ति कर छूटको लागि आवेदन गर्न, कृपया सम्पत्तिको विवरण र छूटको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Temporary_Residence") {
          speak(
            "अस्थायी बसाइ सराइको लागि आवेदन गर्न, कृपया तपाईंको बसाइ सराइ स्थिति र बसाइ सराइको अवधिको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Transfer_Photo_Land_Ownership_Certificate") {
          speak(
            "फोटो भूमि स्वामित्व प्रमाणपत्र सार्न, कृपया सार्ने विवरण र सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Unmarried_Status_Verification") {
          speak(
            "तपाईंको अविवाहित स्थिति प्रमाणित गर्न, कृपया तपाईंको जन्म दर्ता प्रमाणपत्र र परिचयपत्र जस्ता सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Verifying_Birth_Date") {
          speak(
            "तपाईंको जन्म मिति प्रमाणित गर्न, कृपया तपाईंको जन्म दर्ता प्रमाणपत्र वा कुनै पनि आधिकारिक परिचयपत्र दस्तावेजको प्रतिलिपि प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Verifying_Death_Status") {
          speak(
            "मृत्यु स्थिति प्रमाणित गर्न, कृपया मृत्यु प्रमाणपत्र जस्ता सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Verifying_House_Land_Boundaries") {
          speak(
            "घर वा जग्गाका सीमानाहरू प्रमाणित गर्न, कृपया सम्पत्तिको विवरण र कुनै पनि सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Verifying_Marriage") {
          speak(
            "विवाह प्रमाणित गर्न, कृपया विवाह प्रमाणपत्र जस्ता सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Weak_Economic_Condition") {
          speak(
            "कमजोर आर्थिक अवस्थाका आधारमा योग्यता निर्धारण गर्न, हामीलाई तपाईंको आर्थिक स्थितिको विवरण र कुनै पनि सहायक कागजातहरूको आवश्यकता छ।"
          );
        } else {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(
              text +
                " act as a nepals chatbot and answer the question in nepali all time within one small sentence only"
            );
          } else {
            console.error("WebSocket connection is not open.");
            // Handle the WebSocket not open scenario (e.g., display an error message)
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching data from Wit.ai:", error);
        speak(CONSTANT_WORDS_TO_SPEAK.error_server);
      })
      .finally(() => {
        setLoading(false);
        startSpeechToText();
      });
  };

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

      <Conversation messages={conversation} loading={loading} />
    </View>
  );
}
