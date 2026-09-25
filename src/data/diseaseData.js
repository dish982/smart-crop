export const DISEASE_KNOWLEDGE_BASE = {
  // ───────── TOMATO ─────────
  "Tomato___Late_blight": {
    severity: "Severe",
    symptoms: [
      "Water-soaked grey-green patches on foliage",
      "White fungal growth on leaf undersides",
      "Rapid leaf collapse and stem lesions",
    ],
    treatment: {
      organic: ["Copper-based fungicide spray (e.g. Bordeaux mixture) at first sign of infection", "Remove and destroy infected foliage immediately"],
      chemical: ["Mancozeb 75% WP @ 2g/L water", "Metalaxyl + Mancozeb combination for systemic protection"],
      dosage: "Spray every 5-7 days during humid/cool weather until symptoms subside",
      prevention: ["Improve field drainage and avoid overhead evening irrigation", "Ensure proper protective gear during chemical application"],
    },
  },
  "Tomato___Septoria_leaf_spot": {
    severity: "Moderate",
    symptoms: ["Small circular spots with dark margins", "Tiny black specks (pycnidia) inside spots", "Lower leaves yellowing and dropping early"],
    treatment: {
      organic: ["Prune bottom foliage to improve airflow", "Mulch around plant bases to stop soil splashback"],
      chemical: ["Mancozeb 75% WP @ 2-2.5g/L water"],
      dosage: "Apply every 7-10 days, more frequently in wet weather",
      prevention: ["Avoid overhead watering", "Remove infected lower leaves promptly"],
    },
  },
  "Tomato___Yellow_Leaf_Curl_Virus": {
    severity: "High",
    symptoms: ["Upward curling and yellowing leaf margins", "Stunted overall plant growth", "Drastic reduction in fruit set"],
    treatment: {
      organic: ["Neem oil spray (5ml/L water) to control whitefly vector", "Yellow sticky traps"],
      chemical: ["Imidacloprid 17.8% SL @ 0.3ml/L water for whitefly control (no direct cure for the virus itself)"],
      dosage: "Spray insecticide every 10-15 days to manage vector population",
      prevention: ["Uproot and destroy severely infected plants immediately", "Use reflective mulches to deter whiteflies"],
    },
  },
  "Tomato___healthy": {
    severity: "None",
    symptoms: ["Vibrant green foliage", "No visible spots or curling", "Normal growth structure"],
    treatment: {
      organic: ["No treatment needed"],
      chemical: [],
      dosage: "N/A",
      prevention: ["Maintain consistent watering schedule at soil level", "Monitor weekly for early insect or fungal activity"],
    },
  },
  "Tomato___Bacterial_spot": {
    severity: "Moderate to Severe",
    symptoms: ["Small, dark, water-soaked spots on leaves and fruit", "Spots may develop yellow halos as they age", "Leaf tissue around spots can tear, giving a ragged look"],
    treatment: {
      organic: ["Copper-based bactericide spray"],
      chemical: ["Copper Oxychloride 50% WP @ 2.5g/L water + Mancozeb combination"],
      dosage: "Spray every 7-10 days, especially after rain",
      prevention: ["Avoid overhead watering", "Rotate away from tomato/pepper crops for at least one season if recurring"],
    },
  },
  "Tomato___Early_blight": {
    severity: "Moderate",
    symptoms: ["Dark brown spots with concentric 'target-ring' pattern", "Yellowing of leaf tissue surrounding spots", "Lower, older leaves affected first, progressing upward"],
    treatment: {
      organic: ["Neem oil or copper spray at early symptom stage"],
      chemical: ["Chlorothalonil or Mancozeb @ 2g/L water"],
      dosage: "Spray every 7-10 days starting at first symptom",
      prevention: ["Stake or cage plants to improve airflow", "Remove lower infected leaves promptly"],
    },
  },
  "Tomato___Leaf_Mold": {
    severity: "Moderate",
    symptoms: ["Pale yellow patches on upper leaf surface", "Olive-green to grey fuzzy mold visible on the underside", "Common in humid, poorly ventilated conditions"],
    treatment: {
      organic: ["Improve ventilation and plant spacing"],
      chemical: ["Chlorothalonil or Mancozeb-based fungicide"],
      dosage: "Spray every 7-10 days in humid conditions",
      prevention: ["Avoid wetting foliage during watering — water at the base", "Remove and destroy affected leaves early"],
    },
  },
  "Tomato___Spider_mites": {
    severity: "Moderate",
    symptoms: ["Fine yellow/white stippling on leaf surface", "Leaves may appear bronzed or dry", "Fine webbing on leaf undersides in severe cases"],
    treatment: {
      organic: ["Insecticidal soap or neem oil spray on leaf undersides"],
      chemical: ["Abamectin or Spiromesifen-based miticide"],
      dosage: "Spray every 5-7 days until mite population reduces",
      prevention: ["Increase humidity around plants", "Introduce natural predators where feasible"],
    },
  },
  "Tomato___Target_Spot": {
    severity: "Moderate to Severe",
    symptoms: ["Brown lesions with concentric rings, similar to early blight", "Spots can appear on leaves, stems, and fruit", "Severe infections cause significant leaf drop"],
    treatment: {
      organic: ["Copper spray at early symptom stage"],
      chemical: ["Rotate Chlorothalonil, Azoxystrobin, and Mancozeb-based fungicides"],
      dosage: "Apply every 7-10 days, rotating chemical classes",
      prevention: ["Remove crop debris after harvest", "Avoid working in fields when foliage is wet"],
    },
  },
  "Tomato___mosaic_virus": {
    severity: "High",
    symptoms: ["Mottled light and dark green patches on leaves", "Leaf distortion, curling, or fern-like narrowing", "Stunted plant growth and reduced fruit yield"],
    treatment: {
      organic: ["No chemical cure — remove and destroy infected plants immediately, do not compost"],
      chemical: [],
      dosage: "N/A",
      prevention: ["Wash hands and tools after handling infected plants", "Avoid tobacco use near plants — related virus family"],
    },
  },

  // ───────── POTATO ─────────
  "Potato___Early_blight": {
    severity: "Moderate",
    symptoms: ["Dark brown concentric ring spots on lower leaves", "Yellowing around spots", "Premature leaf drop starting from older leaves"],
    treatment: {
      organic: ["Remove and destroy infected lower leaves", "Copper-based fungicide spray"],
      chemical: ["Mancozeb 75% WP @ 2g/L water or Chlorothalonil"],
      dosage: "Spray every 7-10 days from first symptom onward",
      prevention: ["Practice crop rotation (avoid potato/tomato back-to-back)", "Ensure adequate plant spacing for airflow"],
    },
  },
  "Potato___Late_blight": {
    severity: "Severe",
    symptoms: ["Water-soaked dark lesions on leaves, rapidly enlarging", "White fungal growth on leaf undersides in humid conditions", "Tubers develop reddish-brown rot"],
    treatment: {
      organic: ["Remove and destroy infected plants immediately", "Copper-based fungicide as preventive spray"],
      chemical: ["Metalaxyl + Mancozeb combination fungicide", "Cymoxanil-based fungicide for active outbreaks"],
      dosage: "Spray every 5-7 days during cool, wet weather; increase frequency under high disease pressure",
      prevention: ["Use certified disease-free seed potatoes", "Ensure good field drainage", "Destroy volunteer potato plants and cull piles"],
    },
  },
  "Potato___healthy": {
    severity: "None",
    symptoms: ["Uniform green foliage, no lesions or wilting"],
    treatment: {
      organic: ["No treatment needed"],
      chemical: [],
      dosage: "N/A",
      prevention: ["Maintain regular monitoring", "Follow balanced fertilization schedule"],
    },
  },

  // ───────── CORN ─────────
  "Corn___Common_rust": {
    severity: "Moderate",
    symptoms: ["Small, circular to elongate cinnamon-brown pustules on both leaf surfaces", "Pustules rupture releasing rust-colored spores", "Leaves may yellow and die in severe infections"],
    treatment: {
      organic: ["Remove and destroy heavily infected leaves", "Improve field airflow via proper plant spacing"],
      chemical: ["Propiconazole or Azoxystrobin-based fungicide"],
      dosage: "Apply at first sign of pustules, repeat after 14 days if disease persists",
      prevention: ["Plant rust-resistant hybrid varieties", "Rotate with non-host crops"],
    },
  },
  "Corn___Northern_Leaf_Blight": {
    severity: "Moderate to Severe",
    symptoms: ["Long, cigar-shaped grey-green to tan lesions on leaves", "Lesions may coalesce causing large dead areas", "Lower leaves affected first"],
    treatment: {
      organic: ["Remove crop debris after harvest — fungus overwinters in residue"],
      chemical: ["Mancozeb or Azoxystrobin-based fungicide"],
      dosage: "Spray at early symptom onset, repeat every 10-14 days under humid conditions",
      prevention: ["Use resistant hybrids where available", "Practice crop rotation and residue management"],
    },
  },
  "Corn___Cercospora_leaf_spot": {
    severity: "Moderate to Severe",
    symptoms: ["Rectangular tan to gray lesions running parallel to leaf veins", "Lesions restricted by leaf veins, giving a blocky appearance", "Severe infection causes leaf blight and reduced yield"],
    treatment: {
      organic: ["Rotate crops away from corn for at least one season", "Remove and bury crop residue"],
      chemical: ["Strobilurin or triazole-based fungicide"],
      dosage: "Apply at early tasseling if disease pressure is high, repeat per label interval",
      prevention: ["Plant resistant hybrids", "Avoid continuous corn cropping", "Improve field drainage and airflow"],
    },
  },
  "Corn___healthy": {
    severity: "None",
    symptoms: ["Uniform green leaves, no lesions"],
    treatment: {
      organic: ["No treatment needed"],
      chemical: [],
      dosage: "N/A",
      prevention: ["Regular monitoring", "Balanced fertilization"],
    },
  },
};