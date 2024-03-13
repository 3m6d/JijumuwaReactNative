import React, { useEffect, useRef, useState } from "react";
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
import { CONSTANT_WORDS_TO_SPEAK, blurhash } from "@/constants";
import { Image } from "expo-image";
import _ from "lodash";
import io, { Socket } from "socket.io-client";

const SOCKET_URL = "https://cd17-103-156-26-41.ngrok-free.app";
const SOCKET_OPTIONS = {
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
};

export default function TabTwoScreen() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [greeted, setGreeted] = useState(false);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [socket, setSocket] = useState<Socket>(io(SOCKET_URL, SOCKET_OPTIONS));
  const wordBufferRef = useRef("");
  const accumulatedLettersRef = useRef("");

  useEffect(() => {
    setupVoiceHandlers();
    greetUser();
    initSocket();

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const initSocket = () => {
    socket.on("connect", () =>
      console.log("Socket.IO connection established.")
    );
    socket.on("disconnect", (reason) =>
      console.log(
        `Socket.IO connection closed due to ${reason}. Attempting to reconnect...`
      )
    );

    socket.on("response", (data) => {
      console.log("Received response from server:", data);
      handleWebSocketMessage(data.data);
    });

    setSocket(socket);
  };

  const handleWebSocketMessage = (message: string) => {
    accumulatedLettersRef.current += message;
    checkAndSpeakBuffer();
  };

  const updateConversation = (sender: "user" | "sarathi", text: string) => {
    setConversation((prevConvo: Message[]) => [
      ...prevConvo,
      { id: uuid.v4().toString(), text, sender },
    ]);
  };

  const checkAndSpeakBuffer = _.debounce(() => {
    const words = accumulatedLettersRef.current.trim().split(/\s+/);
    if (words.length >= 3) {
      speak(accumulatedLettersRef.current.trim());
      updateConversation("sarathi", accumulatedLettersRef.current.trim());
      accumulatedLettersRef.current = "";
    } else {
      updateConversationWithoutAdding(
        "sarathi",
        accumulatedLettersRef.current.trim()
      );
    }
  }, 1000);

  const updateConversationWithoutAdding = (
    sender: "user" | "sarathi",
    text: string
  ) => {
    setConversation((prevConvo) => {
      const updatedConvo = [...prevConvo];
      if (updatedConvo.length > 0) {
        const lastMessage = updatedConvo[updatedConvo.length - 1];
        if (lastMessage.sender === sender) {
          lastMessage.text = text;
        } else {
          updatedConvo.push({ id: uuid.v4().toString(), text, sender });
        }
      } else {
        updatedConvo.push({ id: uuid.v4().toString(), text, sender });
      }
      return updatedConvo;
    });
  };

  const setupVoiceHandlers = () => {
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
  };

  const greetUser = () => {
    const greeting = CONSTANT_WORDS_TO_SPEAK.greet_customer;
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
    startSpeechToText();
  };

const speak = (text: string) => {
 updateConversation("sarathi", text);
 Speech.speak(text, {
    voice: "ne-NP-language",
    pitch: 1,
    rate: 1,
    onStart: () =>{
      stopSpeechToText().catch(error => console.error(error));
    },
    language: "ne-NP",
    onDone: () => {
      // Directly call startSpeechToText without returning its promise
      startSpeechToText().catch(error => console.error(error));
    },
 });
};

  const speakGoodbye = () => {
    if (conversationEnded) return;
    updateConversation("sarathi", CONSTANT_WORDS_TO_SPEAK.goodbye);
    Speech.speak(CONSTANT_WORDS_TO_SPEAK.goodbye, {
      voice: "ne-NP-language",
      pitch: 1,
      rate: 1,
      language: "ne-NP",
      onDone: () => {
        stopSpeechToText().then(() => {
          console.log("Speech finished");
          router.replace("/(tabs)/");
          setConversationEnded(true);
        });
      },
    });
  };

  const processSpeechResult = (text: string) => {
    const q = encodeURIComponent(text);
    if (q === "No result") {
      speak(
        "तपाईले के भन्नु भएको छ मैले ठ्याक्कै बुझिन, कृपया स्पष्ट रूपमा भन्न सक्नुहुन्छ"
      );
      return;
    }
    const byeRegex = new RegExp(/(bye|goodbye|बिदाई|धन्यवाद)/i);
    if (byeRegex.test(text)) {
      stopSpeechToText().then(() => speakGoodbye());
      return;
    }
    const uri = `https://api.wit.ai/message?v=20230215&q=${q}`;
    const auth = `Bearer ${process.env.EXPO_PUBLIC_AUTH_TOKEN}`;
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
            "जीवित नाता प्रमाणित गर्नको लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारको छन्: एक, निवेदकको नागरिकताको प्रतिलिपि , दुई , नाता कायम गर्नुपर्ने सबैको नागरिकताको प्रतिलिपि , तिन  , २ २ प्रतिवटा अटोसाइज फोटो , चार , चालु आर्थिक वर्षको सम्पत्ति कर बुझाएको प्रमाणपत्रको प्रतिलिपि"
          );
        } else if (intent === "Business_Closure_Request") {
          speak(
            " व्यवसाय बन्द गर्न सिफारिसको लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारको छन्। एक , निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि , दुई , सक्कल व्यवसाय प्रमाणपत्र"
          );
        } else if (intent === "Business_Registration") {
          speak(
            " व्यवसाय दर्ता गर्नको लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक , निवेदन पत्र ,  दुई , नागरिकता प्रमाणपत्रको प्रमाणित प्रतिलिपि , तिन , विदेशीको हकमा राहदानीको प्रमाणित प्रतिलिपि वा सम्बन्धित दुतावासको निजको परिचय खुल्ने सिफारिस , चार , २ प्रति फोटो , पाँच , घरबहाल सम्झौता , छ , आफ्नै घर टहरा भए चालु आर्थिक वर्षसम्मको मालपोत र घर जग्गाको कर तिरेको , सात, स्थानीय तहको नाममा दर्ता नगरी प्यान वा अन्य निकायमा दर्ता गरी व्यवसाय दर्ता गरेको हकमा अन्य निकायबाट जारी गरेको व्यवसाय प्रमाणपत्रको प्रमाणित प्रतिलिपि"
          );
        } else if (intent === "Business_Relocation_Request") {
          speak(
            "व्यवसाय ठाउँसारी सिफारिस गर्नको लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारको छन्। एक , निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि , दुई , सक्कल व्यवसाय प्रमाणपत्र , तिन , ठाउँसारी जाने घरधनीको सम्झौतापत्रको प्रतिलिपि"
          );
        } else if (intent === "Chhopaya_Request") {
          speak(
            "तपाईंको छोपाया अनुरोध प्रक्रिया गर्न, कृपया घटनाको विवरण र कुनै पनि समर्थन दस्तावेजहरू प्रदान गर्नुहोस्।"//TODO xaina pdf ma
          );
        } else if (intent === "Citizenship_Certificate_Request_New_Renew") {
          speak(
            "नागरिकता र प्रतिलिपि सिफारिसका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदन पत्र र आमा र बुवाको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, जन्मदर्ता प्रमाणपत्रको प्रतिलिपि, तिन, विवाहित महिलाको हकमा पति र आमा र बुबाको नागरिकता प्रमाणपत्रको प्रतिलिपि , चार, चारित्रिक प्रमाणपत्रको प्रतिलिपि (विद्यार्थीको हकमा), पाँच, विवाह दर्ता प्रमाणपत्रको प्रतिलिपि (विवाहिताको हकमा), छ, बसाईसराई आएका हकमा बसाईसराईको प्रमाणपत्रका प्रतिलिपि, सात, दुवै कान देखिने पासपोर्ट साइजको फोटो दुई प्रति, आठ, चालु आ.व. को सम्पत्ति कर निर्धारण प्रमाणपत्र, नौ, कर्मचारी परिवारको हकमा सम्बन्धित कार्यालयको सिफारिस ,दस, प्रतिलिपि नागरिकताको हकमा पुराना नागरिकताको प्रतिलिपि"
          );
        } else if (intent === "Court_Proceeding_Request") {
          speak(
            "कोट-फि मिनाहा सिफारिस गर्नको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, अदालतको पर्चा, तिन , विपन्न अथवा एकल महिला अथवा असाहाय व्यक्तिको कागजत।"
          );
        } else if (intent === "Dhara_Nam_Sari") {
          speak(
            "धारा नामसारी सिफारिस गर्नको लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारको छन्। एक ,  निवेदकको नागरिकताप्रति लिपि , दुई , जग्गाधनी प्रमाण पुर्जाको प्रतिलिपि , तिन , नक्सा पास प्रमाणपत्र , चार , सम्पत्ति कर बुझाएको प्रमाणपत्र , पाँच , धाराको कागज"
          );
        } else if (intent === "Disability_Application") {
          speak(
            "अशक्त सिफारिस गर्नको लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारको छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि , दुई , सामाजिक सुरक्षा भत्ताको प्रतिलिपि , तिन, वृद्धसँगको नाता , चार, सक्कल चेकबुक , पाँच, चालु आर्थिक वर्षको सम्पत्ति कर तिरेको प्रमाणपत्र"
          );
        } else if (intent === "Electricity_Connection_New_House") {
          speak(
            " नयाँ घरमा विद्युत जडान सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, जग्गा धनी प्रमाणपुर्जाको प्रतिलिपि, तिन, नक्सा पास प्रमाणपत्रको प्रतिलिपि, चार, चालु आ.व. को सम्पत्ति कर तिरेको प्रमाणपत्र।"
          );
        } else if (intent === "Electricity_Connection_Old_House") {
          speak(
            "पुरानो घरमा विद्युत जडान सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रतिलिपि, दुई, जग्गा धनी प्रमाणपुर्जाको प्रतिलिपि, तिन, सम्पत्ति कर तिरेको प्रमाणपत्रको प्रतिलिपि, चार, नापी नक्साको प्रतिलिपि। "
          );
        } else if (intent === "Electricity_Meter_Registration_Transfer") {
          speak(
            "विद्युत मिटर नामसारी सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रतिलिपि, दुई, जग्गाधनी प्रमाणपुर्जाको प्रतिलिपि, तिन, नक्सा पास प्रमाणपत्र, चार, सम्पत्ति कर बुझाएको प्रमाणपत्र, पाँच, विद्युत महसुलको कागज।"
          );
        } else if (intent === "Free_Health_Treatment_Application") {
          speak(
            "निशुल्क स्वास्थ्य उपचारको लागि सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, बिरामीको नागरिकता र , तिन, बिरामीको अस्पताल भर्नाको कागज।"
          );
        } else if (intent === "Guardian_Application") {
          speak(
            "संरक्षक सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, ७० वर्ष विरुद्धको नागरिकताको प्रतिलिपि, तिन, नाता खोलेको प्रमाणपत्र, चार, सम्पत्ति कर तिरेको प्रमाणपत्रको प्रतिलिपि । "
          );
        } else if (intent === "House_Demolition_Verification") {
          speak(
            "घर पाताल प्रमाणितका सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, जग्गाधनी प्रमाणपुर्जा प्रतिलिपि, तिन, सम्पत्ति कर बुझाएको प्रमाणपत्रको प्रतिलिपि, चार, स्थलगत निरीक्षण प्रतिवेदन। "
          );
        } else if (intent === "House_Land_Name_Transfer_Request") {
          speak(
            "घर वा जग्गाको नाम सार्नको लागि अनुरोध गर्न, कृपया आवश्यक कागजातहरू संलग्न गर्नु पर्ने कागजातहरु, एक,  निवेदकको नागरिकता प्रमाणपत्रका प्रतिलिपि, दुई, जग्गा धनी प्रमाण पुर्जाको प्रतिलिपि, तिन, चालु आ. व. सम्मको घर भए सम्पत्ति कर तिरेको प्रमाणपत्र, जग्गा भए मालपोत तिरेको रसिद, चार, नाता प्रमाणित प्रमाणपत्रका प्रतिलिपि, पाँच, सर्जमिन मुचल्का गरी बुझनु पर्ने भएमा साक्षी बस्नेको नागरिकता प्रमाणपत्रको प्रतिलिपि"
          );
        } else if (intent === "In_English_Application") {
          speak(
            "अङ्ग्रेजीमा सिफारिस गर्नको लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारको छन्। एक , जिउँदो नाता , दुई , जन्म मिति , तिन,स्थायी बसोबास। "
          );
        } else if (intent === "Indigenous_Certification") {
          speak(
            "आदिवासी जनजाति प्रमाणितको सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रमाणपत्रको प्रतिलिपि, दुई, जनजाति कार्डको प्रतिलिपि, तिन, चालु आ. व. को सम्पत्ति कर तिरेको प्रमाणपत्र।"
          );
        } else if (intent === "Inheritance_Rights_Verification") {
          speak(
            "फोटो टाँसको लागि तीन पुस्ते खोली सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, जग्गाधनी प्रमाण पुर्जाको प्रतिलिपि, तिन, सम्पत्ति कर तिरेको प्रमाणपत्र, चार, तीन पुस्ते खोलेको कागजत, पाँच, दुई प्रति फोटो। "
          );
        } else if (intent === "Land_Registration_Request") {
          speak(
            "जग्गा दर्ता सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रमाणपत्रको प्रतिलिपि, दुई, उत्तार, तिन,स्थलगत सर्जमिन। "
          );
        }
        else if (intent === "Lost_Land_Certificate") {
          speak(
            "जग्गाधनी प्रमाणपुर्जा हराएको लागि सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, जग्गाधनी प्रमाण पुर्जाको प्रतिलिपि, तिन, घरभए सम्पत्ति कर बुझाएको प्रमाणपत्रको प्रतिलिपि , चार, जग्गा भए मालपोत तिरेको रसिद, पाँच, सम्पत्ति कर बुझाएको प्रमाणपत्रको प्रतिलिपि, छ, निवेदकको दुई प्रति फोटो  । "
          );
        } else if (intent === "Medical_Treatment_Expenses") {
          speak(
            "औषधी उपचार बापत खर्च पाउँनको सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, कडा रोगको प्रमाणित गरेको ओपिटि रिपोर्ट, तिन, बसाईसराई भए बसाईसराई कागजपत्र।"
          );
        } else if (intent === "Minors_Application_Request") {
          speak(
            "नाबालक सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, श्रीमतीको नागरिकताको प्रतिलिपि , तिन, विवाह दर्ताको प्रतिलिपि, चार, जन्मदर्ताको प्रतिलिपि, पाँच, । बसाईसराई भए बसाईसराईको प्रतिलिपि, छ, चालु आ.व. को सम्पत्ति कर तिरेको प्रमाणपत्र।"
          );
        } else if (intent === "Mohi_Lease_Acquisition_Transfer") {
          speak(
            "मोही नामसारीको लागि सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, अस्थायी निस्साको प्रमाणपत्र, तिन, कुत बुझाएको भपाई।"
          );
        } else if (intent === "Mohi_Lease_Acquisition") {
          speak(
            "मोही लगत कट्टाको लागि सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, जग्गाधनी प्रमाण पुर्जाको प्रतिलिपि, तिन, जग्गाका प्रमाणित नापी नक्सा, चार, नाता प्रमाणित प्रमाणपत्रका प्रतिलिपि, पाँच, जग्गाका श्रेस्ता र फिल्डबुकका प्रमाणित प्रतिलिपि, छ, सर्जमिन मुचुल्का गरी बुझ्नु पर्ने भएमा साक्षी बस्नेको नागरिकता प्रमाणपत्रको प्रतिलिपि।"
          );
        } else if (intent === "Name_Standardization") {
          speak(
            "दुवै नाम गरेको व्यक्ति एकै हो भन्ने प्रमाणका लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, के के मा फरक परेको हो सोको कागजात, तिन, बसाई सराई भए बसाइसराइको प्रतिलिपि, चार, चालु आ. व. को सम्पत्ति कर तिरेको प्रमाणपत्र। "
          );
        } else if (intent === "Organization_Registration_Request") {
          speak(
            "संस्था दर्ता गर्नका सिफारिसको लागि संलग्न गर्नुपर्ने कागजहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, घरधनीसँग बहाल सम्झौता, तिन, सम्पत्ति कर बुझाएको प्रमाणपत्र, चार,घरेलु अथवा वाणिज्य अथवा उद्योग अथवा कम्पनीमा दर्ता भए सोको कागज। "
          );
        } else if (intent === "Permanent_Residence") {
          speak(
            "स्थायी बसोबासको सिफारिसको लागि संलग्न गर्नुपर्ने कागजहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, बसाईसराई भए बसाईसराई प्रमाणपत्रको प्रतिलिपि, तिन,चालु आ. व. को सम्पत्ति कर तिरेको प्रमाणपत्र।"
          );
        } else if (intent === "Pipeline_Installation") {
          speak(
            "धारा जडान सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, जग्गा धनी प्रमाण पुर्जाको प्रतिलिपि, तिन, नक्सा पास प्रमाणपत्रको प्रतिलिपि। , चार,निर्माण सम्पन्न प्रमाणपत्रको प्रतिलिपि, पाँच, चालु आ. व. को सम्पत्ति कर तिरेको प्रमाणपत्र । "
          );
        } else if (intent === "Property_Valuation") {
          speak(
            "जग्गा मूल्याङ्कन सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, जग्गा धनी प्रमाणपुर्जाको प्रतिलिपि, तिन, जग्गाको मालपोत तिरेको रसिद, चार, सम्पत्ति कर तिरेको प्रमाणपत्रको प्रतिलिपि, पाँच, मालपोत बुझाएको रसिद। "
          );
        } else if (intent === "Rental_Agreement_Application") {
          speak(
            "बहाल सम्झौता सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, दुबैको नागरिकता प्रतिलिपि, दुई, घर भए सम्पत्ति कर तिरेको प्रमाणपत्रको प्रतिलिपि, तिन, जग्गा भए जग्गाधनी प्रमाणपुर्जाको प्रतिलिपि, चार, सम्झौता पत्र।"
          );
        } else if (intent === "Road_Area_Validation") {
          speak(
            "घर बाटो प्रमाणित सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, लिने दिनेको नागरिकताको प्रतिलिपि , दुई, जग्गाधनी प्रमाणपुर्जाको प्रतिलिपि, तिन, घरभए सम्पत्ति कर बुझाएको प्रमाणपत्र, जग्गा भए मालपोत रसिद, चार, बढीमा छ महिनाभित्र निकालेको नापी नक्सा । "
          );
        } else if (intent === "Road_Maintenance_Proposal") {
          speak(
            "बाटो कायम सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि , दुई, जग्गाधनी प्रमाणपुर्जाको प्रतिलिपि, तिन, हालसालैको नापी नक्सा, चार,घरभए सम्पत्ति करतिरको प्रमाणपत्र अथवा जग्गा भए मालपोत रसिद । "
          );
        } else if (intent === "Room_Opening_Request") {
          speak(
            "कोठा खोली सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, ३५ दिने सूचनाको पत्रिका, तिन, सम्पत्ति कर तिरेको प्रमाणपत्रको प्रतिलिपि, चार, बहाल कर बुझाएको कागज।"
          );
        } else if (intent === "Scholarship_Application") {
          speak(
            "छात्रवृत्तिको लागि सिफारिस गर्नको लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि , दुई , विद्यार्थीको जन्मदर्ता , ३ , स्कुलमा अध्ययनको परिचयपत्र , ४ , वडा बाहिरको भए विपन्न सहरी गरिब आर्थिक अवस्था कमजोरको सिफारिस पत्र , ५ , घरधनीले सम्पत्ति कर तिरेको कागजात पत्र बहालमा भए बहाल कर तिरेको कागजात पत्र , ६ , भाडामा बस्नेको हकमा सम्बन्धित गाउँपालिका अथवा नगरपालिकाबाट सिफारिस ल्याउनुपर्ने"
          );
        } else if (intent === "School_Address_Change_Request") {
          speak(
            "विद्यालय ठाउँसारी सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, सक्कल व्यवसाय प्रमाणपत्र, तिन, ठाउँ सारी जाने घरधनीको सम्झौतापत्रको प्रतिलिपि। "
          );
        } else if (intent === "School_Operations_Class_Expansion_Request") {
          speak(
            "विद्यालय सञ्चालन अथवा कक्षा वृद्धिको सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, लेटर हेडमा लेखेको निवेदन, दुई, व्यवसाय प्रमाणपत्रको प्रतिलिपि, तिन, स्थलगत सर्जमिन।"
          );
        } else if (intent === "Social_Security_Allowance_Registration") {
          speak(
            "सामाजिक सुरक्षा भत्ता नाम दर्ता सम्बन्धमा सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, जेष्ठ नागरिकको हकमा (६८ वर्ष पूरा भएको), क, निवेदकको नागरिकता प्रतिलिपि ,ख, १ प्रति फोटो, दुई, विधवाको हकमा (विधवा भएदेखि), क, निवेदकको नागरिकताको प्रतिलिपि, ख, मृत्यु दर्ता प्रमाणपत्रको प्रतिलिपि, ग, एक प्रति फोटो, तिन, एकल महिलाको हकमा (६० वर्ष पूरा भएको), क, निवेदकको नागरिकताको प्रतिलिपि, ख, एक प्रति फोटो।"
          );
        } else if (intent === "Surveying_Road_No_Road_Field") {
          speak(
            "नापी नक्सामा बाटो नभएको फिल्डमा बाटो भएको सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, जग्गाधनी प्रमाणपुर्जाको प्रतिलिपि, तिन, मालपोत रसिद, चार,नापी नक्सा । "
          );
        } else if (intent === "Temporary_Property_Tax_Exemption") {
          speak(
            "अस्थायी टहराको सम्पत्ति कर तिर्न सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रतिलिपि , दुई, सम्झौतापत्रको प्रतिलिपि, तिन, लालपुर्जाको प्रतिलिपि । "
          );
        } else if (intent === "Temporary_Residence") {
          speak(
            "अस्थायी बसोबासको सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, घरधनीको नागरिकता, तिन, चालु आ. व. को सम्पत्ति कर तिरेको प्रमाणपत्र, चार, विदेशी भए नेपाल प्रवेश गरेको पासपोर्टको प्रतिलिपि, पाँच, कम्तिमा तीन महिना बसोबास गरेको सम्झौतापत्र।"
          );
        }
        else if (intent === "Unmarried_Status_Verification") {
          speak(
            "अविवाहित प्रमाणित सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, सम्पत्ति कर बुझाएको प्रमाणपत्रको प्रतिलिपि, तिन, स्थलगत सर्जमिन मुचुल्का, चार, सम्पत्ति कर बुझाएको प्रमाणपत्रको प्रतिलिपि। "
          );
        } else if (intent === "Verifying_Birth_Date") {
          speak(
            "जन्ममिति प्रमाणित सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, बसाईसराई आएको हकमा बसाईसराई प्रमाणपत्र, तिन, घरभए सम्पत्ति कर बुझाएको प्रमाणपत्र।"
          );
        } else if (intent === "Verifying_Death_Status") {
          speak(
            "मृत्यु नाता प्रमाणित सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, मृत्युदर्ता प्रमाणपत्रको प्रतिलिपि, तिन, तिन तिन प्रतिवटा साइजको फोटो । चार, चालु आ. व.सम्पत्ति कर तिरेको प्रमाणपत्रको प्रतिलिपि। "
          );
        } else if (intent === "Verifying_House_Land_Boundaries") {
          speak(
            "चार किल्ला प्रमाणित गर्न सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, जग्गाधनी प्रमाणपुर्जाको प्रतिलिपि, तिन, घरभए भयो सम्पत्ति कर बुझाएको प्रमाणपत्र अथवा जग्गा भए मालपोत रसिद, चार, बढीमा छ महिनाभित्र निकालेको नापी नक्सा । "
          );
        } else if (intent === "Verifying_Marriage") {
          speak(
            "विवाह प्रमाणित सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, दुल्हा दुलहीको नागरिकता प्रमाणपत्रको प्रतिलिपि, दुई, बसाईसराई आएको हकमा बसाईसराई प्रमाणपत्र, तिन, दुलहा दुलही दुवै उपस्थित भई सनाखत गर्नुपर्ने, चार, चालु आ. व. सम्मको सम्पत्ति कर तिरेको प्रमाणपत्रको प्रतिलिपि, पाँच, विक्रम सम्वत २०३६ पछिको हकमा विवाह दर्ता प्रमाणपत्रको प्रतिलिपि। "
          );
        } else if (intent === "Weak_Economic_Condition") {
          speak(
            "आर्थिक अवस्था कमजोर सिफारिसको लागि संलग्न गर्नुपर्ने कागजतहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रतिलिपि, दुई, बसाई सराई भए बसाईसराई प्रमाणपत्रको प्रतिलिपि, तिन, विषय प्रमाणित गर्ने कागजात भए सोको प्रतिलिपि, चार, चालु आवको सम्पत्ति कर तिरेको प्रमाणपत्र।"
          );
        } else {
          // console.log("socket", socket);
          socket
            ? console.log("socket.connected", socket.connected)
            : console.warn("socket not found");

          if (socket && socket.connected) {
            socket.emit(
              "chat_message",
              text +
              " act as a Nepal's chatbot and answer the question in Nepali all time within one small sentence only"
            );
          } else {
            console.error("Socket.IO connection is not open.");
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
