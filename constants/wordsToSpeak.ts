const CONSTANT_WORDS_TO_SPEAK = {
  greet_customer:
    "नमस्कार, म बलियो भेन्चर्स द्वारा बनाइएको नेपाल टेलिकमको डिजिटल सहयोगी हुँ। तपाईंलाई नेपाल टेलिकमको सेवाहरू सम्बन्धी कुनै जानकारी चाहिएमा कृपया सोध्नुहोला।",
  error_server:
    "सर्भरमा त्रुटि भयो। कृपया पछि फेरि प्रयास गर्नुहोस्। यसको लागि म क्षमा चाहन्छु।",
  goodbye: "नेपाल टेलिकमको सेवा प्रयोग गर्नु भएकोमा धन्यवाद।",
  error_understand:
    "माफ गर्नुहोस्, तपाईंले भन्नुभएको कुरा बुझ्न सकिएन। कृपया फेरि स्पष्टसँग भन्नुहोला।",
  noise_error:
    "माफ गर्नुहोस्, वरिपरिको आवाजको कारण तपाईंको कुरा राम्रोसँग सुन्न सकिएन। कृपया शान्त ठाउँमा गएर फेरि प्रयास गर्नुहोला।",
  game_greeting:
    "नमस्कार! म बलियो भेन्चर्स द्वारा बनाइएको खेलको होस्ट हुँ। के तपाई तयार हुनुहुन्छ?",
};

export const GAME_PATTERNS = {
  CORRECT_ANSWERS: [
    // Full name in Nepali with variations
    /कपिल\s+लामिछाने?/i,
    /कपिल\s+लामीछाने?/i,
    /क(?:पि|पी)ल\s+ला(?:मि|मी)छ(?:ा)?ने?/i,

    // Full name in English with variations
    /kapil\s+lami(?:ch|chh)an(?:e|ne)/i,
    /kapil\s+lami(?:ch|chh)h?an(?:e|ne)/i,

    // Full name with potential typos
    /k(?:a|o)pil\s+l(?:a|o)mi(?:ch|chh)(?:a|o)n(?:e|ne)/i,
  ],
  EXIT_GAME: /exit|quit|बन्द|समाप्त|stop|रोक्नुहोस्/i,
  HINT_PATTERN:
    /संकेत|हिन्ट|hint|जानकारी|next|अर्को|सुराक|सङ्केत|थप\s*जानकारी/i,
};

export default CONSTANT_WORDS_TO_SPEAK;
