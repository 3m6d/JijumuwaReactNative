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
import io, { Socket } from "socket.io-client";

export default function TabTwoScreen() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter(); // Assuming useRouter hook is correctly implemented
  const [greeted, setGreeted] = useState(false);
  const [socket, setSocket] = useState<Socket>(
    io("https://cd17-103-156-26-41.ngrok-free.app", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    })
  );
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
    socket.on("disconnect", (reason) => {
      console.log(
        `Socket.IO connection closed due to ${reason}. Attempting to reconnect...`
      );
    });

    socket.on("response", (data) => {
      console.log("Received response from server:", data);
      handleWebSocketMessage(data.data); // Assuming the server sends an object with a 'data' property
    }); // Listen for messages with the event name you expect

    setSocket(socket);
  };

  const handleWebSocketMessage = (message: string) => {
    console.log("Received message from server:", message);
    accumulatedLettersRef.current += message; // Accumulate the entire message first
    checkAndSpeakBuffer(); // Check and potentially update the conversation
  };

  const updateConversation = (sender: "user" | "sarathi", text: string) => {
    setConversation((prevConvo: Message[]) => [
      ...prevConvo,
      { id: uuid.v4().toString(), text, sender },
    ]);
  };

  // Updated function to handle debounced speaking and updating conversation with a minimum of 3 words
  const checkAndSpeakBuffer = _.debounce(() => {
    const words = accumulatedLettersRef.current.trim().split(/\s+/); // Split by one or more spaces
    if (words.length >= 3) {
      // Check if there are at least 3 words
      speak(accumulatedLettersRef.current.trim());
      updateConversation("sarathi", accumulatedLettersRef.current.trim());
      accumulatedLettersRef.current = ""; // Clear the buffer after speaking and updating the conversation
    } else {
      // If less than 3 words, just update the last message in the conversation without speaking
      updateConversationWithoutAdding(
        "sarathi",
        accumulatedLettersRef.current.trim()
      );
    }
  }, 1000); // Adjust debounce time as needed

  const updateConversationWithoutAdding = (
    sender: "user" | "sarathi",
    text: string
  ) => {
    setConversation((prevConvo) => {
      const updatedConvo = [...prevConvo];
      if (updatedConvo.length > 0) {
        // Modify the last entry if it exists
        const lastMessage = updatedConvo[updatedConvo.length - 1];
        if (lastMessage.sender === sender) {
          lastMessage.text = text;
        } else {
          // If the last message was not by the same sender, add a new message
          updatedConvo.push({ id: uuid.v4().toString(), text, sender });
        }
      } else {
        // If no messages yet, add the first message
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
            "तपाईंको छोपाया अनुरोध प्रक्रिया गर्न, कृपया घटनाको विवरण र कुनै पनि समर्थन दस्तावेजहरू प्रदान गर्नुहोस्।"//TODO
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
            "अशक्त सिफारिस गर्नको लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारको छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि , दुई , सामाजिक सुरक्षा भत्ताको प्रतिलिपि , ३ , वृद्धसँगको नाता , ४ , सक्कल चेकबुक , ५ , चालु आर्थिक वर्षको सम्पत्ति कर तिरेको प्रमाणपत्र"
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
            "कानूनी संरक्षकत्वको लागि आवेदन गर्न, कृपया वार्डको विवरण र संरक्षकत्व खोज्नुको कारण प्रदान गर्नुहोस्।" //TODO left
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
            "उत्तराधिकार अधिकारहरू प्रमाणित गर्न, कृपया सम्पत्तिको विवरण र कुनै पनि कानूनी कागजातहरू प्रदान गर्नुहोस्।"//TODO kun ho thavayena
          );
        } else if (intent === "Land_Registration_Request") {
          speak(
            "जग्गा दर्ता सिफारिस गर्नका लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकताको प्रमाणपत्रको प्रतिलिपि, दुई, उत्तार, तिन,स्थलगत सर्जमिन। "
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
            "छात्रवृत्तिको लागि सिफारिस गर्नको लागि संलग्न गर्नुपर्ने कागजातहरू निम्न प्रकारका छन्। एक, निवेदकको नागरिकता प्रमाणपत्रको प्रतिलिपि , दुई , विद्यार्थीको जन्मदर्ता , ३ , स्कुलमा अध्ययनको परिचयपत्र , ४ , वडा बाहिरको भए विपन्न सहरी गरिब आर्थिक अवस्था कमजोरको सिफारिस पत्र , ५ , घरधनीले सम्पत्ति कर तिरेको कागजात पत्र बहालमा भए बहाल कर तिरेको कागजात पत्र , ६ , भाडामा बस्नेको हकमा सम्बन्धित गाउँपालिका अथवा नगरपालिकाबाट सिफारिस ल्याउनुपर्ने"
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
