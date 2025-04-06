export const intentResponses = {
  // Existing intents (omitted for brevity)...

  // New intents for elderly users feeling sad
  Emotional_Support:
    "मलाई थाहा छ, तपाईंलाई अहिले नरमाइलो लागिरहेको छ। म यहाँ तपाईंसँग छु। तपाईंलाई के कुराले दुखी बनाएको छ भनेर मसँग सेयर गर्न चाहनुहुन्छ? म सुन्न तयार छु, र सक्दो सहयोग गर्छु।",

  Contact_Family_Friend:
    "यदि तपाईंलाई एक्लो महसुस भइरहेको छ भने, आफ्नो परिवार वा साथीलाई सम्पर्क गर्न सक्नुहुन्छ। म तपाईंलाई फोन नम्बर सम्झाउन वा डायल गर्न सहयोग गर्न सक्छु। कसलाई फोन गर्न चाहनुहुन्छ, मलाई भन्नुहोस्।",

  Find_Local_Support_Group:
    "तपाईंलाई सहयोग गर्न नजिकैको समुदाय वा ज्येष्ठ नागरिक समूह हुन सक्छ। म तपाईंको ठाउँमा यस्तो समूहको बारेमा जानकारी खोज्न सक्छु। कृपया मलाई आफ्नो ठेगाना वा वडा नम्बर बताउनुहोस्, म खोजेर भनौंला।",

  Play_Favorite_Song:
    "संगीतले मन शान्त बनाउन सक्छ। तपाईंको मनपर्ने गीत कुन हो? म तपाईंलाई त्यो गीतको बारेमा जानकारी दिन सक्छु वा त्यसलाई कसरी सुन्ने भनेर सुझाव दिन सक्छु।",

  Tell_A_Joke:
    "तपाईंको मुड हल्का बनाउन म एउटा हल्का हाँसोको कुरा सुनाउन सक्छु। मलाई 'हाँस्न मन छ' भन्नुहोस्, म तपाईंलाई एउटा रमाइलो कुरा सुनाउँछु। उदाहरण: 'कukhukhले किन सधैं बिर्सन्छ? किनभने उसको दिमाग हावामा उड्छ!'",

  Share_Positive_Memory:
    "पुराना खुशीका कुराहरू सम्झनाले मन हल्का हुन्छ। तपाईंको जीवनको कुनै रमाइलो सम्झना मसँग सेयर गर्न चाहनुहुन्छ? वा म तपाईंलाई एउटा सकारात्मक कथा सुनाउन सक्छु।",

  Guided_Relaxation:
    "तपाईंको मन शान्त गर्न, म तपाईंलाई सजिलो तरिका सिकाउन सक्छु। गहिरो सास लिनुहोस्, ४ सेकेन्डसम्म रोक्नुहोस्, अनि बिस्तारै छोड्नुहोस्। यो २-३ पटक गर्नुहोस्। मसँगै गर्न चाहनुहुन्छ भने मलाई भन्नुहोस्।",

  Prayer_Or_Spiritual_Support:
    "यदि तपाईं आध्यात्मिक हुनुहुन्छ भने, म तपाईंलाई प्रार्थना वा शान्तिको लागि सुझाव दिन सक्छु। तपाईंको मनपर्ने भजन वा मन्त्र छ भने मलाई भन्नुहोस्, म त्यसको बारेमा कुरा गर्न सक्छु।",

  Suggest_Light_Activity:
    "हल्का गतिविधिले तपाईंको मन हल्का गर्न सक्छ। घरभित्रै बसेर हल्का हिँड्नुहोस् वा बाहिर हरियाली हेर्नुहोस्। म तपाईंलाई सजिलो व्यायामको बारेमा पनि सुझाव दिन सक्छु। गर्न चाहनुहुन्छ?",

  Connect_To_Helpline:
    "यदि तपाईंलाई धेरै दुख लागिरहेको छ भने, म तपाईंलाई सहायता हेल्पलाइनमा जोड्न सुझाव दिन्छु। नेपालमा मानसिक स्वास्थ्य हेल्पलाइन नम्बर ११६६ छ। म तपाईंलाई यो नम्बर डायल गर्न सहयोग गर्न सक्छु। चाहनुहुन्छ?",

  // Other existing intents (omitted for brevity)...
} as const;

// Update the IntentProcessor to use this file
export default intentResponses;