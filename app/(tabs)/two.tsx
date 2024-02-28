import { StyleSheet, TouchableOpacity } from "react-native";

import { Text, View } from "@/components/Themed";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { blurhash } from "@/constants/blurHash";
import Conversation, { Message } from "@/components/Coversation";
import { messages } from "@/constants/mockMessages";
import * as Speech from "expo-speech";
import Voice, {
  SpeechEndEvent,
  SpeechErrorEvent,
  SpeechResultsEvent,
} from "@react-native-voice/voice";
import { useEffect, useState } from "react";
import uuid from "react-native-uuid";
import axios from "axios";
import { router } from "expo-router";

export default function TabTwoScreen() {
  const CONSTANT_WORDS_TO_SPEAK = {
    // namaste , ma sarathi ho. tapailai kasari sahayog garna sakchu?
    greet_customer:
      "सारथी तपाईंको सेवामा हाजिर छे। तपाईँलाई वडा सम्बन्धी केही काममा समस्या परेमा कृपया आफ्नो समस्या सुनाइदिनुहोला|",
    // server ma truti bhayo kripaya pachi feri prayas garnuhos. yasko lagi ma kshama chahanchu
    error_server:
      "सर्भरमा त्रुटि भयो। कृपया पछि फेरि प्रयास गर्नुहोस्। यसको लागि म क्षमा चाहन्छु।",
    // yo subhida prayog garnu bhayeko ma tapei lai dhanyabad
    bye_customer: "यो सुविधा प्रयोग गर्नु भएकोमा तपाईलाई धन्यवाद।",
  };

  let [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([
    {
      id: uuid.v4().toString(),
      text: CONSTANT_WORDS_TO_SPEAK.greet_customer,
      sender: "sarathi",
    },
  ]);

  const onSpeechError = (error: SpeechErrorEvent) => {
    console.log(error);
  };

  const stopSpeechToText = async () => {
    await Voice.stop();
    setStarted(false);
  };

  const onSpeechEnd = (error: SpeechEndEvent) => {
    console.log("onSpeechEnd", error);
    stopSpeechToText();
  };

  const speakResult = (say_this: string) => {
    Speech.speak(say_this, options);
  };


  const startSpeechToText = async () => {
    console.log("voice available:", Voice.isAvailable());
    await Voice.start("ne-NP", {
      EXTRA_LANGUAGE_MODEL: "LANGUAGE_MODEL_FREE_FORM",
      EXTRA_MAX_RESULTS: 1,
      EXTRA_PARTIAL_RESULTS: true,
    });
    setStarted(true);
  };

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



  const onSpeechResults = (result: SpeechResultsEvent) => {
    setConversation([
      ...conversation,
      {
        id: uuid.v4().toString(),
        text: result.value ? result.value[0] : "तपाईले के भन्नु भएको छ मैले ठ्याक्कै बुझिन, कृपया स्पष्ट रूपमा भन्न सक्नुहुन्छ",
        sender: result.value ? "user" : "sarathi",
      },
    ]);
    console.log(conversation);
    const q = encodeURIComponent(result.value ? result.value[0] : "No result");
    if (q === "No result") {
      speakResult(
        "तपाईले के भन्नु भएको छ मैले ठ्याक्कै बुझिन, कृपया स्पष्ट रूपमा भन्न सक्नुहुन्छ"
      );
      return;
    }
    const uri = "https://api.wit.ai/message?v=20230215&q=" + q;
    const auth = "Bearer " + process.env.EXPO_PUBLIC_AUTH_TOKEN;
    setLoading(true);
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
          speakResult(
            "तपाईंको अस्तित्व प्रमाणित गर्न, कृपया तपाईंको हालको सम्पर्क जानकारी र कुनै पनि आधिकारिक परिचयपत्र दस्तावेज प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Business_Closure_Request") {
          speakResult(
            "तपाईंको व्यापार बन्द गर्ने अनुरोध संग साथ अगाडि बढ्न, हामीलाई तपाईंको व्यापारको विवरण चाहिन्छ, जसमा यसको दर्ता नम्बर र बन्द गर्नुको कारण समावेश छ।"
          );
        } else if (intent === "Business_Registration") {
          speakResult(
            "तपाईंको व्यापार दर्ता गर्न, कृपया आवश्यक कागजातहरू जस्तै तपाईंको व्यापार योजना, ठेगानाको प्रमाण, र परिचयपत्र प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Business_Relocation_Request") {
          speakResult(
            "तपाईंको व्यापार सार्नको लागि, हामीलाई नयाँ स्थानको विवरण र सार्नुको कारणहरू चाहिन्छ।"
          );
        } else if (intent === "Chhopaya_Request") {
          speakResult(
            "तपाईंको छोपाया अनुरोध प्रक्रिया गर्न, कृपया घटनाको विवरण र कुनै पनि समर्थन दस्तावेजहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Citizenship_Certificate_Request_New_Renew") {
          speakResult(
            "नयाँ वा नवीकरण गरिएको नागरिकता प्रमाणपत्रको लागि आवेदन गर्न, तपाईंले आवश्यक कागजातहरू पेश गर्नु पर्छ र आवेदन फारम पूरा गर्नु पर्छ।"
          );
        } else if (intent === "Court_Proceeding_Request") {
          speakResult(
            "अदालती कार्यवाही सुरु गर्न, कृपया मुद्दाको विवरण र कुनै पनि सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Dhara_Nam_Sari") {
          speakResult(
            "तपाईंको धरा नाम सारी अनुरोधसँग अगाडि बढ्न, हामीलाई जग्गाको विवरण र कुनै पनि सहायक कागजातहरू चाहिन्छ।"
          );
        } else if (intent === "Disability_Application") {
          speakResult(
            "अपाङ्गता लाभको लागि आवेदन गर्न, कृपया चिकित्सा कागजात र तपाईंको अवस्थाको जानकारी प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Electricity_Connection_New_House") {
          speakResult(
            "नयाँ विद्युत् सम्बन्धको लागि, तपाईंले सम्पत्तिको स्वामित्व वा भाडामा लिने प्रमाण र परिचयपत्र दस्तावेज प्रदान गर्नु पर्छ।"
          );
        } else if (intent === "Electricity_Connection_Old_House") {
          speakResult(
            "पुरानो घरको लागि विद्युत् सम्बन्ध आवेदन गर्न, कृपया सम्पत्तिको स्वामित्व वा भाडामा लिने प्रमाण र परिचयपत्र दस्तावेज प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Electricity_Meter_Registration_Transfer") {
          speakResult(
            "विद्युत् मिटर दर्ता सार्न, कृपया वर्तमान र नयाँ मालिकको विवरण र सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Free_Health_Treatment_Application") {
          speakResult(
            "नि:शुल्क स्वास्थ्य उपचारको लागि आवेदन गर्न, कृपया तपाईंको चिकित्सा अवस्था र आर्थिक स्थितिको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Guardian_Application") {
          speakResult(
            "कानूनी संरक्षकत्वको लागि आवेदन गर्न, कृपया वार्डको विवरण र संरक्षकत्व खोज्नुको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "House_Demolition_Verification") {
          speakResult(
            "घर भत्काउनुको आवश्यकता प्रमाणित गर्न, कृपया सम्पत्तिको विवरण र भत्काउनुको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "House_Land_Name_Transfer_Request") {
          speakResult(
            "घर वा जग्गाको नाम सार्ने अनुरोध गर्न, कृपया आवश्यक कागजातहरू र सार्ने विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "In_English_Application") {
          speakResult(
            "कृपया प्रक्रिया गर्नको लागि तपाईंको आवेदनको विवरण अङ्ग्रेजीमा प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Indigenous_Certification") {
          speakResult(
            "आदिवासी स्थिति प्रमाणित गर्न, कृपया सम्बन्धित कागजात र तपाईंको पूर्वजको जानकारी प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Inheritance_Rights_Verification") {
          speakResult(
            "उत्तराधिकार अधिकारहरू प्रमाणित गर्न, कृपया सम्पत्तिको विवरण र कुनै पनि कानूनी कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Land_Registration_Request") {
          speakResult(
            "जग्गा दर्ता गर्न, कृपया आवश्यक कागजातहरू जसमा जग्गाको स्वामित्व प्रमाण र परिचयपत्र समावेश छ, प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Lost_Land_Certificate_Replacement") {
          speakResult(
            "हराएको जग्गा प्रमाणपत्र प्रतिस्थापन गर्न, कृपया हराएको प्रमाणपत्रको विवरण र कुनै पनि सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Lost_Land_Certificate") {
          speakResult(
            "हराएको जग्गा प्रमाणपत्र रिपोर्ट गर्न, कृपया हराएको प्रमाणपत्रको विवरण र कुनै पनि सम्बन्धित जानकारी प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Medical_Treatment_Expenses") {
          speakResult(
            "चिकित्सा उपचार खर्चको कभरेजको लागि आवेदन गर्न, कृपया उपचारको विवरण र तपाईंको आर्थिक स्थितिको जानकारी प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Minors_Application_Request") {
          speakResult(
            "नाबालकको तर्फबाट आवेदन गर्न, कृपया नाबालकको विवरण र आवेदनको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Mohi_Lease_Acquisition_Transfer") {
          speakResult(
            "मोही लिज अधिग्रहण सार्न, कृपया वर्तमान र नयाँ लिजधारकको विवरण र सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Mohi_Lease_Acquisition") {
          speakResult(
            "मोही लिज अधिग्रहणको लागि आवेदन गर्न, कृपया सम्पत्तिको विवरण र अधिग्रहणको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Name_Standardization") {
          speakResult(
            "तपाईंको नाम मानकीकरण गर्न, कृपया विविधताहरूको विवरण र कुनै पनि सहायक कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Organization_Registration_Request") {
          speakResult(
            "तपाईंको संगठन दर्ता गर्न, कृपया आवश्यक कागजातहरू जस्तै संगठनको चार्टर र परिचयपत्र प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Permanent_Residence") {
          speakResult(
            "स्थायी बसाइ सराइको लागि आवेदन गर्न, कृपया तपाईंको बसाइ सराइ स्थिति र कुनै पनि सम्बन्धित कागजातहरूको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Pipeline_Installation") {
          speakResult(
            "पाइपलाइन स्थापनाको लागि, कृपया स्थान र स्थापनाको उद्देश्यको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Property_Valuation") {
          speakResult(
            "सम्पत्ति मूल्यांकनको लागि अनुरोध गर्न, कृपया सम्पत्तिको विवरण र यसका विशेषताहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Rental_Agreement_Application") {
          speakResult(
            "भाडामा लिने सम्झौताको लागि आवेदन गर्न, कृपया सम्पत्तिको विवरण र सम्झौताका शर्तहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Road_Area_Validation") {
          speakResult(
            "सडक क्षेत्र प्रमाणित गर्न, कृपया स्थान र प्रमाणित गर्ने उद्देश्यको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Road_Maintenance_Proposal") {
          speakResult(
            "सडक रखरखावको प्रस्ताव गर्न, कृपया सडकको अवस्था र प्रस्तावित रखरखाव योजनाको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Room_Opening_Request") {
          speakResult(
            "कोठा खोल्ने अनुरोध गर्न, कृपया सम्पत्तिको विवरण र कोठा खोल्नुको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Scholarship_Application") {
          speakResult(
            "छात्रवृत्तिको लागि तपाईंको योग्यता निर्धारण गर्न, हामीलाई तपाईंको शैक्षिक उपलब्धिहरू, बाह्यक्रियाकलापहरू, र पारिवारिक आयको जानकारी चाहिन्छ। के तपाईं यी विवरणहरू प्रदान गर्न सक्नुहुन्छ?"
          );
        } else if (intent === "School_Address_Change_Request") {
          speakResult(
            "विद्यालयको ठेगाना परिवर्तनको लागि अनुरोध गर्न, कृपया वर्तमान र नयाँ ठेगानाको विवरण र कुनै पनि सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "School_Operations_Class_Expansion_Request") {
          speakResult(
            "विद्यालय संचालन वा कक्षाहरूको विस्तारको लागि अनुरोध गर्न, कृपया प्रस्तावित विस्तार र यसको औचित्यको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Social_Security_Allowance_Registration") {
          speakResult(
            "सामाजिक सुरक्षा भत्ताको लागि दर्ता गर्न, कृपया तपाईंको योग्यताको विवरण र कुनै पनि सहायक कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Surveying_Road_No_Road_Field") {
          speakResult(
            "सडक वा नो-सडक क्षेत्रको सर्वेक्षण गर्न, कृपया सर्वेक्षण गरिने क्षेत्र र सर्वेक्षणको उद्देश्यको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Temporary_Property_Tax_Exemption") {
          speakResult(
            "अस्थायी सम्पत्ति कर छूटको लागि आवेदन गर्न, कृपया सम्पत्तिको विवरण र छूटको कारण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Temporary_Residence") {
          speakResult(
            "अस्थायी बसाइ सराइको लागि आवेदन गर्न, कृपया तपाईंको बसाइ सराइ स्थिति र बसाइ सराइको अवधिको विवरण प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Transfer_Photo_Land_Ownership_Certificate") {
          speakResult(
            "फोटो भूमि स्वामित्व प्रमाणपत्र सार्न, कृपया सार्ने विवरण र सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Unmarried_Status_Verification") {
          speakResult(
            "तपाईंको अविवाहित स्थिति प्रमाणित गर्न, कृपया तपाईंको जन्म दर्ता प्रमाणपत्र र परिचयपत्र जस्ता सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Verifying_Birth_Date") {
          speakResult(
            "तपाईंको जन्म मिति प्रमाणित गर्न, कृपया तपाईंको जन्म दर्ता प्रमाणपत्र वा कुनै पनि आधिकारिक परिचयपत्र दस्तावेजको प्रतिलिपि प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Verifying_Death_Status") {
          speakResult(
            "मृत्यु स्थिति प्रमाणित गर्न, कृपया मृत्यु प्रमाणपत्र जस्ता सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Verifying_House_Land_Boundaries") {
          speakResult(
            "घर वा जग्गाका सीमानाहरू प्रमाणित गर्न, कृपया सम्पत्तिको विवरण र कुनै पनि सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Verifying_Marriage") {
          speakResult(
            "विवाह प्रमाणित गर्न, कृपया विवाह प्रमाणपत्र जस्ता सम्बन्धित कागजातहरू प्रदान गर्नुहोस्।"
          );
        } else if (intent === "Weak_Economic_Condition") {
          speakResult(
            "कमजोर आर्थिक अवस्थाका आधारमा योग्यता निर्धारण गर्न, हामीलाई तपाईंको आर्थिक स्थितिको विवरण र कुनै पनि सहायक कागजातहरूको आवश्यकता छ।"
          );
        } else {
          let data = new FormData();
          data.append("prompt", result.value ? result.value[0] : "No result");
          fetch("https://2f78-103-186-197-52.ngrok-free.app/robot/", {
            method: "POST",
            body: data,
          })
            .then((response) => response.json()) // Convert the response to JSON
            .then((data) => {
              console.log("Robot response:", data);
              speakResult(data);
            })
            .catch((error) => {
              console.error("Error fetching data from Robot:", error);
              speakResult(
                "तपाईले के भन्नु भएको छ मैले ठ्याक्कै बुझिन, कृपया स्पष्ट रूपमा भन्न सक्नुहुन्छ"
              );
            });
        }
      })
      .catch((error) => {
        console.error("Error fetching data from Wit.ai:", error);
      })
      .finally(() => {
        setLoading(false);
        startSpeechToText();
      });
  };

  
  useEffect(() => {
    setGreeted(false);
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechEnd = onSpeechEnd;
    // on first run only greet the user
    if (!greeted) {
      Speech.speak(CONSTANT_WORDS_TO_SPEAK.greet_customer, options);
      Speech.stop();
      setGreeted(true);
    }
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [router]);

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
      <Text className="z-10 align-center bg-transparent text-black">
        {started ? 'Voice started' : 'Voice not started'}
        {loading ? 'Loading' : 'Not loading'}
        </Text>

      <Conversation messages={conversation} loading={loading} />
    </View>
  );
}
