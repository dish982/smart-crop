export const DISEASE_KNOWLEDGE_BASE = {
  "Tomato___Late_blight": {
    severity: "Severe",
    symptoms: [
      "Water-soaked grey-green patches on foliage",
      "White fungal growth on leaf undersides",
      "Rapid leaf collapse and stem lesions"
    ],
    treatmentCategory: "Systemic + Contact Fungicide Programme",
    purpose: "Halt rapid blight progression during humid, cool weather conditions.",
    precautions: [
      "Remove and safely destroy heavily infected foliage",
      "Improve field drainage and avoid overhead evening irrigation",
      "Ensure proper protective gear during chemical application"
    ]
  },
  "Tomato___Septoria_leaf_spot": {
    severity: "Moderate",
    symptoms: [
      "Small circular spots with dark margins",
      "Tiny black specks (pycnidia) inside spots",
      "Lower leaves yellowing and dropping early"
    ],
    treatmentCategory: "Copper-based / Mancozeb Fungicide Spray",
    purpose: "Prevent fungal spore dissemination across lower canopy leaves.",
    precautions: [
      "Prune bottom foliage to improve airflow",
      "Mulch around plant bases to stop soil splashback",
      "Apply copper spray every 7-10 days in rainy periods"
    ]
  },
  "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
    severity: "High",
    symptoms: [
      "Upward curling and yellowing leaf margins",
      "Stunted overall plant growth",
      "Drastic reduction in fruit set"
    ],
    treatmentCategory: "Whitefly Vector Management & Sanitation",
    purpose: "Control Bemisia tabaci (whitefly) vectors to prevent viral spread.",
    precautions: [
      "Apply Neem oil or yellow sticky traps for insect control",
      "Uproot and destroy severely infected viral plants immediately",
      "Use reflective mulches to deter whiteflies"
    ]
  },
  "Tomato___healthy": {
    severity: "None",
    symptoms: ["Vibrant green foliage", "No visible spots or curling", "Normal growth structure"],
    treatmentCategory: "Preventative Maintenance",
    purpose: "Maintain optimal soil nutrients and moisture levels.",
    precautions: [
      "Maintain consistent watering schedule at soil level",
      "Monitor weekly for early insect or fungal activity"
    ]
  },
  "Tomato___Bacterial_spot": {
  severity: "Moderate to Severe",
  symptoms: [
    "Small, dark, water-soaked spots on leaves and fruit",
    "Spots may develop yellow halos as they age",
    "Leaf tissue around spots can tear, giving a ragged look"
  ],
  treatmentCategory: "Copper-based Bactericide Programme",
  purpose: "Suppress bacterial spread, especially important since this pathogen has no true chemical cure once established.",
  precautions: [
    "Avoid overhead watering — spreads readily via water splash",
    "Remove and destroy infected plant debris at season end",
    "Rotate away from tomato/pepper crops for at least one season if recurring"
  ]
},

"Tomato___Early_blight": {
  severity: "Moderate",
  symptoms: [
    "Dark brown spots with concentric 'target-ring' pattern",
    "Yellowing of leaf tissue surrounding spots",
    "Lower, older leaves affected first, progressing upward"
  ],
  treatmentCategory: "Broad-spectrum Fungicide (Chlorothalonil / Mancozeb family)",
  purpose: "Limit fungal spore production and slow spread to healthy foliage.",
  precautions: [
    "Stake or cage plants to improve airflow and reduce leaf wetness",
    "Remove lower infected leaves promptly",
    "Apply mulch to prevent soil-borne spores splashing onto leaves"
  ]
},

"Tomato___Leaf_Mold": {
  severity: "Moderate",
  symptoms: [
    "Pale yellow patches on upper leaf surface",
    "Olive-green to grey fuzzy mold visible on the underside",
    "Common in humid, poorly ventilated conditions (greenhouses especially)"
  ],
  treatmentCategory: "Ventilation Management + Fungicide Spray",
  purpose: "Reduce humidity around foliage, the primary driver of this disease, alongside fungicide control.",
  precautions: [
    "Increase spacing between plants and improve airflow",
    "Avoid wetting foliage during watering — water at the base",
    "Remove and destroy affected leaves early to limit spore spread"
  ]
},

"Tomato___Spider_mites Two-spotted_spider_mite": {
  severity: "Moderate",
  symptoms: [
    "Fine yellow/white stippling or speckling on leaf surface",
    "Leaves may appear bronzed or dry with heavy infestation",
    "Fine webbing visible on leaf undersides in severe cases"
  ],
  treatmentCategory: "Miticide / Insecticidal Soap Programme",
  purpose: "Control mite population before webbing and leaf damage spread across the plant.",
  precautions: [
    "Spray undersides of leaves thoroughly — mites cluster there",
    "Increase humidity around plants; mites thrive in hot, dry conditions",
    "Introduce natural predators (e.g. predatory mites) where feasible instead of broad insecticides"
  ]
},

"Tomato___Target_Spot": {
  severity: "Moderate to Severe",
  symptoms: [
    "Brown lesions with concentric rings, similar to early blight",
    "Spots can appear on leaves, stems, and fruit",
    "Severe infections cause significant leaf drop"
  ],
  treatmentCategory: "Broad-spectrum Fungicide Rotation",
  purpose: "Prevent fungal resistance buildup and control spread across leaves and fruit.",
  precautions: [
    "Rotate between different fungicide classes to avoid resistance",
    "Remove crop debris after harvest — fungus survives in old plant material",
    "Avoid working in fields when foliage is wet"
  ]
},

"Tomato___Tomato_mosaic_virus": {
  severity: "High",
  symptoms: [
    "Mottled light and dark green patches on leaves",
    "Leaf distortion, curling, or fern-like narrowing",
    "Stunted plant growth and reduced fruit yield"
  ],
  treatmentCategory: "Sanitation & Vector-Free Management (No Chemical Cure)",
  purpose: "There is no direct chemical treatment for viral infection — focus is on preventing further spread.",
  precautions: [
    "Remove and destroy infected plants immediately — do not compost",
    "Wash hands and tools after handling infected plants (virus spreads via contact)",
    "Avoid tobacco use near plants — this virus is related to Tobacco Mosaic Virus and can spread via residue"
  ]
}
};