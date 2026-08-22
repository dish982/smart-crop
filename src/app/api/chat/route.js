// src/app/api/chat/route.js

const INTENTS = {
  crop: {
    keywords: {
      en: [
        "crop",
        "crops",
        "plant",
        "plants",
        "grow",
        "farming",
        "cultivation",
        "sowing",
      ],
      hi: [
        "फसल",
        "खेती",
        "उगाना",
        "पौधा",
        "बुवाई",
        "बोना",
      ],
      mr: [
        "पीक",
        "पिक",
        "शेती",
        "लागवड",
        "पेरणी",
        "पेरणे",
      ],
    },
  },

  disease: {
    keywords: {
      en: [
        "disease",
        "diseases",
        "infection",
        "infected",
        "pest",
        "pests",
        "insect",
        "insects",
        "leaf",
        "leaves",
        "yellow leaves",
        "spots",
      ],
      hi: [
        "रोग",
        "बीमारी",
        "संक्रमण",
        "कीट",
        "कीड़े",
        "पत्ता",
        "पत्ते",
        "पीले पत्ते",
      ],
      mr: [
        "रोग",
        "किड",
        "कीड",
        "कीटक",
        "पान",
        "पाने",
        "पिवळी पाने",
      ],
    },
  },

  market: {
    keywords: {
      en: [
        "market",
        "mandi",
        "price",
        "prices",
        "rate",
        "rates",
        "sell",
        "selling",
        "buy",
        "buying",
      ],
      hi: [
        "मंडी",
        "बाजार",
        "भाव",
        "कीमत",
        "दाम",
        "बेचना",
        "खरीदना",
      ],
      mr: [
        "बाजार",
        "मंडी",
        "भाव",
        "किंमत",
        "दर",
        "विक्री",
        "खरेदी",
      ],
    },
  },

  weather: {
    keywords: {
      en: [
        "weather",
        "rain",
        "rainfall",
        "temperature",
        "forecast",
        "climate",
      ],
      hi: [
        "मौसम",
        "बारिश",
        "वर्षा",
        "तापमान",
        "पूर्वानुमान",
      ],
      mr: [
        "हवामान",
        "पाऊस",
        "पर्जन्य",
        "तापमान",
        "हवामानाचा अंदाज",
      ],
    },
  },

  fertilizer: {
    keywords: {
      en: [
        "fertilizer",
        "fertiliser",
        "manure",
        "urea",
        "compost",
        "nutrient",
      ],
      hi: [
        "उर्वरक",
        "खाद",
        "यूरिया",
        "कम्पोस्ट",
        "पोषक",
      ],
      mr: [
        "खत",
        "युरिया",
        "कंपोस्ट",
        "पोषक",
        "शेणखत",
      ],
    },
  },

  irrigation: {
    keywords: {
      en: [
        "irrigation",
        "water",
        "watering",
        "drip",
        "sprinkler",
      ],
      hi: [
        "सिंचाई",
        "पानी",
        "पानी देना",
        "ड्रिप",
        "स्प्रिंकलर",
      ],
      mr: [
        "सिंचन",
        "पाणी",
        "पाणी देणे",
        "ठिबक",
        "तुषार",
      ],
    },
  },
};


// --------------------------------------------------
// LANGUAGE DETECTION
// --------------------------------------------------

function detectLanguage(message) {
  // Marathi-specific words
  const marathiWords = [
    "मी",
    "माझा",
    "माझे",
    "माझ्या",
    "मला",
    "माझी",
    "आहे",
    "हवे",
    "हवी",
    "पीक",
    "पिक",
    "शेती",
    "पाऊस",
    "खत",
    "पाणी",
  ];

  const hindiWords = [
    "मैं",
    "मेरा",
    "मेरी",
    "मेरे",
    "मुझे",
    "है",
    "हैं",
    "चाहिए",
    "फसल",
    "खेती",
    "बारिश",
    "पानी",
  ];

  const lowerMessage = message.toLowerCase();

  const hasMarathi = marathiWords.some((word) =>
    message.includes(word)
  );

  const hasHindi = hindiWords.some((word) =>
    message.includes(word)
  );

  if (hasMarathi) {
    return "mr";
  }

  if (hasHindi) {
    return "hi";
  }

  // Default language
  return "en";
}


// --------------------------------------------------
// INTENT DETECTION
// --------------------------------------------------

function detectIntent(message, language) {
  const normalizedMessage = message.toLowerCase();

  let bestIntent = "unknown";
  let highestScore = 0;

  for (const [intentName, intentData] of Object.entries(INTENTS)) {
    const keywords = intentData.keywords[language] || [];

    let score = 0;

    for (const keyword of keywords) {
      if (normalizedMessage.includes(keyword.toLowerCase())) {
        score++;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestIntent = intentName;
    }
  }

  return bestIntent;
}


// --------------------------------------------------
// RESPONSES
// --------------------------------------------------

function generateResponse(intent, language) {
  const responses = {
    crop: {
      en: "I can help you with crop-related information. Tell me the crop name, your soil type, location, and season for a better recommendation.",
      hi: "मैं फसल से संबंधित जानकारी में आपकी मदद कर सकता हूँ। बेहतर सलाह के लिए फसल का नाम, मिट्टी का प्रकार, स्थान और मौसम बताएं।",
      mr: "मी पीक संबंधित माहितीमध्ये तुमची मदत करू शकतो. योग्य सल्ल्यासाठी पिकाचे नाव, जमिनीचा प्रकार, ठिकाण आणि हंगाम सांगा.",
    },

    disease: {
      en: "I can help with crop disease and pest-related questions. Tell me the crop name and describe the symptoms you are seeing.",
      hi: "मैं फसल के रोग और कीट से संबंधित समस्याओं में मदद कर सकता हूँ। फसल का नाम और दिखाई देने वाले लक्षण बताएं।",
      mr: "मी पिकावरील रोग आणि किडीशी संबंधित समस्यांमध्ये मदत करू शकतो. पिकाचे नाव आणि दिसणारी लक्षणे सांगा.",
    },

    market: {
      en: "I can help with market-related information. Tell me the crop name and your location.",
      hi: "मैं बाजार से संबंधित जानकारी में मदद कर सकता हूँ। कृपया फसल का नाम और अपना स्थान बताएं।",
      mr: "मी बाजाराशी संबंधित माहितीमध्ये मदत करू शकतो. कृपया पिकाचे नाव आणि तुमचे ठिकाण सांगा.",
    },

    weather: {
      en: "I can help you with weather-related agricultural questions. Tell me your location.",
      hi: "मैं मौसम से संबंधित कृषि प्रश्नों में आपकी मदद कर सकता हूँ। कृपया अपना स्थान बताएं।",
      mr: "मी हवामानाशी संबंधित कृषी प्रश्नांमध्ये मदत करू शकतो. कृपया तुमचे ठिकाण सांगा.",
    },

    fertilizer: {
      en: "I can help with fertilizer-related questions. Tell me the crop name and soil information.",
      hi: "मैं उर्वरक से संबंधित जानकारी में मदद कर सकता हूँ। कृपया फसल का नाम और मिट्टी की जानकारी बताएं।",
      mr: "मी खताशी संबंधित माहितीमध्ये मदत करू शकतो. कृपया पिकाचे नाव आणि जमिनीची माहिती सांगा.",
    },

    irrigation: {
      en: "I can help with irrigation-related questions. Tell me the crop and available water source.",
      hi: "मैं सिंचाई से संबंधित जानकारी में मदद कर सकता हूँ। कृपया फसल और उपलब्ध पानी के स्रोत के बारे में बताएं।",
      mr: "मी सिंचनाशी संबंधित प्रश्नांमध्ये मदत करू शकतो. कृपया पीक आणि उपलब्ध पाण्याच्या स्रोताबद्दल सांगा.",
    },

    unknown: {
      en: "I can help with agriculture-related questions about crops, diseases, pests, weather, fertilizers, irrigation, and markets. Please tell me what you need help with.",
      hi: "मैं फसल, रोग, कीट, मौसम, उर्वरक, सिंचाई और बाजार से संबंधित कृषि प्रश्नों में मदद करू शकता हूँ। आपको किस बारे में जानकारी चाहिए?",
      mr: "मी पीक, रोग, किडी, हवामान, खत, सिंचन आणि बाजाराशी संबंधित कृषी प्रश्नांमध्ये मदत करू शकतो. तुम्हाला कशाबद्दल माहिती हवी आहे?",
    },
  };

  return responses[intent]?.[language] || responses.unknown[language];
}


// --------------------------------------------------
// POST /api/chat
// --------------------------------------------------

export async function POST(request) {
  try {
    const body = await request.json();

    const message = body?.message?.trim();

    if (!message) {
      return Response.json(
        {
          success: false,
          response: "Please enter or speak a question.",
          intent: "unknown",
        },
        { status: 400 }
      );
    }

    const language = detectLanguage(message);

    const intent = detectIntent(
      message,
      language
    );

    const response = generateResponse(
      intent,
      language
    );

    return Response.json({
      success: true,
      message,
      language,
      intent,
      response,
    });
  } catch (error) {
    console.error("Chat API Error:", error);

    return Response.json(
      {
        success: false,
        response: "Something went wrong. Please try again.",
        intent: "unknown",
      },
      { status: 500 }
    );
  }
}