import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { DEPARTMENTS, DOCTORS, HOSPITAL_PROFILE } from '../src/data/hospitalData';
import type {
  AssistantDiagnostics,
  AssistantLanguage,
  DetectedLanguage,
} from '../src/types/hospital';

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

export type SuggestedModuleAction =
  | 'booking'
  | 'departments'
  | 'doctors'
  | 'tracker'
  | 'info'
  | null;

export interface AssistantResponse {
  reply: string;
  mode: 'gemini' | 'demo';
  detectedLanguage: DetectedLanguage;
  suggestedDepartmentId: string | null;
  suggestedDoctorId: string | null;
  suggestedAction: SuggestedModuleAction;
  isEmergency: boolean;
  followUpSuggestions: string[];
}

interface StructuredGeminiPayload {
  reply?: string;
  suggestedDepartmentId?: string;
  suggestedDoctorId?: string;
  suggestedAction?: string;
  isEmergency?: boolean;
  followUpSuggestions?: string[];
}

const GEMINI_MODEL = 'gemini-4-hydrogen';
const GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

const PRIMARY_HINGLISH_WORDS = new Set([
  'kya',
  'kaise',
  'kahan',
  'kaha',
  'kab',
  'kaun',
  'kaunsa',
  'kaunsi',
  'kaunse',
  'kis',
  'kisko',
  'kitna',
  'kitne',
  'kitni',
  'kyu',
  'kyun',
  'kyunki',
  'hai',
  'hain',
  'hoon',
  'hun',
  'tha',
  'thi',
  'hoga',
  'hogi',
  'honge',
  'chahiye',
  'chaiye',
  'sakta',
  'sakti',
  'sakte',
  'karna',
  'karne',
  'karo',
  'kare',
  'karen',
  'karu',
  'karun',
  'batao',
  'bataiye',
  'bataye',
  'batayein',
  'dikhao',
  'dikhana',
  'dikhaye',
  'dikhayein',
  'dikhau',
  'samjhao',
  'samjhaiye',
  'milega',
  'milegi',
  'milenge',
  'milta',
  'milti',
  'lena',
  'leni',
  'lene',
  'dekhna',
  'dekho',
  'jana',
  'jaana',
  'jao',
  'jaun',
  'aana',
  'aaunga',
  'aayenge',
  'raha',
  'rahi',
  'rahe',
  'gaya',
  'gayi',
  'gaye',
  'wala',
  'wali',
  'wale',
  'liye',
  'baad',
  'pehle',
  'abhi',
  'aaj',
  'kal',
  'subah',
  'shaam',
  'raat',
  'samay',
  'waqt',
  'mujhe',
  'mujhko',
  'humko',
  'humein',
  'hume',
  'tumhe',
  'aapko',
  'aapka',
  'aapki',
  'aapke',
  'mera',
  'meri',
  'hamara',
  'hamari',
  'humara',
  'unka',
  'unki',
  'unke',
  'iska',
  'iski',
  'iske',
  'kisi',
  'koi',
  'kuch',
  'sabhi',
  'bahut',
  'zyada',
  'nahi',
  'nahin',
  'haan',
  'kripya',
  'shukriya',
  'dhanyawad',
  'namaste',
  'namaskar',
  'mein',
  'aur',
  'dard',
  'bukhar',
  'bhukhar',
  'khansi',
  'sardi',
  'zukam',
  'jukam',
  'ghutne',
  'ghutna',
  'haddi',
  'haddiyan',
  'jodo',
  'jodon',
  'kamar',
  'peeth',
  'gardan',
  'dil',
  'seene',
  'saans',
  'chakkar',
  'khujli',
  'twacha',
  'tvacha',
  'chamdi',
  'baal',
  'bachcha',
  'baccha',
  'bachche',
  'bacche',
  'bachon',
  'ilaj',
  'ilaaj',
  'dawa',
  'dawai',
  'dawaiyan',
  'bimari',
  'beemari',
  'upchar',
  'jaanch',
  'janch',
  'vibhag',
  'aspatal',
  'mariz',
  'mareez',
  'rogi',
  'teeka',
  'tikakaran',
  'behosh',
  'khoon',
  'aapatkalin',
  'kamra',
  'pata',
  'samasya',
  'takleef',
  'taklif',
  'dikkat',
  'swasthya',
  'sehat',
]);

const SECONDARY_HINGLISH_WORDS = new Set([
  'ka',
  'ki',
  'ke',
  'ko',
  'se',
  'ya',
  'bhi',
  'par',
  'pe',
  'mere',
  'pet',
]);

function getConfiguredApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY' || key === 'your_api_key_here') {
    return null;
  }
  return key;
}

export function getAssistantMode(): 'gemini' | 'demo' {
  return getConfiguredApiKey() ? 'gemini' : 'demo';
}

export function getAssistantDiagnostics(): AssistantDiagnostics {
  const configured = Boolean(getConfiguredApiKey());
  if (configured) {
    return {
      configured: true,
      mode: 'gemini',
      model: GEMINI_MODEL,
      missingEnvVars: [],
      configurationHelp: 'Live Gemini API is configured via server environment variable GEMINI_API_KEY.',
    };
  }

  return {
    configured: false,
    mode: 'demo',
    model: GEMINI_MODEL,
    missingEnvVars: ['GEMINI_API_KEY'],
    configurationHelp:
      'Missing server environment variable GEMINI_API_KEY. Set GEMINI_API_KEY in AI Studio Settings > Secrets (or in a local .env file) and restart the server to switch from Demo Mode to live Gemini AI.',
  };
}

export function detectResponseLanguage(
  message: string,
  preference: AssistantLanguage,
): DetectedLanguage {
  // Explicit Devanagari script in user text always resolves to Hindi (Devanagari)
  if (/[\u0900-\u097F]/.test(message)) {
    return 'hi';
  }

  // Tokenize Latin-script words to detect Hinglish reliably without false positives on English
  const tokens = message
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let primaryHits = 0;
  let secondaryHits = 0;
  for (const token of tokens) {
    if (PRIMARY_HINGLISH_WORDS.has(token)) {
      primaryHits += 1;
    } else if (SECONDARY_HINGLISH_WORDS.has(token)) {
      secondaryHits += 1;
    }
  }

  if (primaryHits >= 1 || secondaryHits >= 2) {
    return 'hinglish';
  }

  // If user selected a specific UI language preference and sent a short ambiguous/entity query
  // (e.g. "Cardiology?" or "OPD hours?"), respect their selected tab.
  if (preference === 'hi' || preference === 'hinglish' || preference === 'en') {
    return preference;
  }

  return 'en';
}

function buildHospitalKnowledgeContext(): string {
  const deptLines = DEPARTMENTS.map(
    (d) =>
      `- ID: "${d.id}" | Name: ${d.name} (${d.hindiName}) | Tagline: ${d.tagline} | Overview: ${d.description} | Location: ${d.floor}, ${d.wing} (${d.consultationDeskExt}) | OPD Hours: ${d.opdHours} | Common Consultations: ${d.conditions.join(', ')} | Services: ${d.services.join(', ')} | Lead Doctor ID: "${d.leadDoctorId}"`,
  ).join('\n');

  const doctorLines = DOCTORS.map(
    (doc) =>
      `- ID: "${doc.id}" | Name: ${doc.name} (${doc.credentials}) | Department: ${doc.departmentName} ("${doc.departmentId}") | Specialization: ${doc.specialization} | Experience: ${doc.experienceYears} yrs | Languages: ${doc.languages.join(', ')} | Schedule: ${doc.availabilityDays}, ${doc.availabilityHours} | Available Today: ${doc.availableToday ? 'Yes' : 'No (next slot tomorrow)'} | Room: ${doc.roomNumber} | Demo Consultation Fee: INR ${doc.consultationFee} | Demo Slots: ${doc.slots.join(', ')}`,
  ).join('\n');

  const timingLines = HOSPITAL_PROFILE.timings
    .map((t) => `- ${t.label}: ${t.hours} (${t.note})`)
    .join('\n');

  const facilityLines = HOSPITAL_PROFILE.facilities
    .map((f) => `- ${f.title} [${f.category}, ${f.location}]: ${f.description}`)
    .join('\n');

  return `
HOSPITAL PROFILE (Fictional Demo Campus):
- Name: ${HOSPITAL_PROFILE.hospitalName} (${HOSPITAL_PROFILE.hindiHospitalName})
- Accreditation: ${HOSPITAL_PROFILE.accreditation}
- Address: ${HOSPITAL_PROFILE.address}
- 24/7 Emergency Helpline: ${HOSPITAL_PROFILE.emergencyPhone}
- Ambulance Dispatch: ${HOSPITAL_PROFILE.ambulanceHelpline}
- Outpatient Appointment Desk: ${HOSPITAL_PROFILE.appointmentDesk}
- Blood Bank: ${HOSPITAL_PROFILE.bloodBankPhone}
- Pharmacy (24/7): ${HOSPITAL_PROFILE.pharmacyPhone}
- Contact Email: ${HOSPITAL_PROFILE.email}

TIMINGS:
${timingLines}

FACILITIES:
${facilityLines}

DEPARTMENTS (6 Total):
${deptLines}

DOCTORS (6 Fictional Specialists):
${doctorLines}

BOOKING & TRACKING WORKFLOW IN MEDIASSIST AI:
1. Open the "Book Appointment" module (or click the pre-filled booking button).
2. Enter patient full name, age (1–120), phone or email, select Department, select Doctor, pick a date (today or future) and preferred time slot, and optional visit note.
3. Submitting saves the request in the hospital database and generates a unique Appointment ID (format: MA-YYYY-XXXX).
4. Use "Track Appointment" with that Appointment ID to check live status (Pending, Confirmed, Completed, or Cancelled).
`.trim();
}

function buildSystemInstruction(targetLanguage: DetectedLanguage): string {
  let languageDirective: string;
  if (targetLanguage === 'hi') {
    languageDirective =
      'LANGUAGE REQUIREMENT (STRICT): The user is communicating in Hindi. You MUST write your entire "reply" and all "followUpSuggestions" in natural, polite Hindi using Devanagari script (देवनागरी लिपि). You may include English hospital/department names or Appointment IDs in brackets where helpful for clarity, but the prose must be pure Hindi in Devanagari script.';
  } else if (targetLanguage === 'hinglish') {
    languageDirective =
      'LANGUAGE REQUIREMENT (STRICT): The user is communicating in Hinglish (Hindi written in Roman/Latin script mixed with everyday English hospital terms). You MUST write your entire "reply" and all "followUpSuggestions" in natural, polite Hinglish using Roman/Latin script only (for example: "Aap Cardiology department me Dr. Priya Sharma se mil sakte hain..."). Do NOT use Devanagari script and do NOT switch to pure formal English.';
  } else {
    languageDirective =
      'LANGUAGE REQUIREMENT (STRICT): The user is communicating in English. You MUST write your entire "reply" and all "followUpSuggestions" in clear, warm, professional English.';
  }

  return `
You are MediAssist AI, an automated hospital patient navigation assistant for ${HOSPITAL_PROFILE.hospitalName}.

NON-NEGOTIABLE SAFETY & IDENTITY RULES:
1. NEVER present yourself as a doctor, nurse, or medical professional. Always be transparent that you are an AI hospital navigation assistant.
2. NEVER diagnose diseases or interpret symptoms as confirming any medical condition.
3. NEVER prescribe medicines, suggest drug names, dosages, or recommend medical treatments or home remedies.
4. EMERGENCY ESCALATION: If the user mentions urgent or life-threatening symptoms (e.g., severe chest pain, difficulty breathing, sudden weakness/numbness, slurred speech, facial drooping, heavy bleeding, loss of consciousness, seizures, severe trauma, or asks for emergency help), set "isEmergency": true, "suggestedAction": "info", and immediately direct them to call ${HOSPITAL_PROFILE.emergencyPhone} or Ambulance ${HOSPITAL_PROFILE.ambulanceHelpline}, or visit the 24/7 Emergency & Trauma Care desk (Ground Floor, North Wing).
5. STRICT GROUNDING: Use ONLY the fictional hospital information provided below. Never invent new doctors, departments, phone numbers, prices, or facilities.
6. CONVERSATIONAL CONTEXT: Use the full conversation history to resolve follow-up questions (e.g., "what are their timings?", "unke slots kya hain?", "how do I book with them?").
7. HELPFUL NAVIGATION: Guide users across departments, Doctor Directory, Appointment Booking, Appointment Tracker, and Hospital Info. Keep replies clear and well-structured (80–170 words).

${languageDirective}

OUTPUT FORMAT (JSON ONLY):
- reply: Your helpful response to the patient in the exact required language/script.
- suggestedDepartmentId: Exact department ID from ["cardiology", "neurology", "orthopedics", "pediatrics", "dermatology", "general-medicine"] if relevant, otherwise "".
- suggestedDoctorId: Exact doctor ID from ["doc-priya-sharma", "doc-rajesh-sharma", "doc-mark-thompson", "doc-ananya-kulkarni", "doc-sarah-jenkins", "doc-arthur-bennett"] if a specific specialist is relevant, otherwise "".
- suggestedAction: One of ["booking", "departments", "doctors", "tracker", "info", "none"].
- isEmergency: true only if urgent/emergency symptoms or emergency request is detected, otherwise false.
- followUpSuggestions: 2 to 3 short, natural follow-up questions in the exact same language/script as your reply.

HOSPITAL KNOWLEDGE BASE:
${buildHospitalKnowledgeContext()}
`.trim();
}

function sanitizeDepartmentId(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  return DEPARTMENTS.some((d) => d.id === cleaned) ? cleaned : null;
}

function sanitizeDoctorId(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  return DOCTORS.some((d) => d.id === cleaned) ? cleaned : null;
}

function sanitizeAction(raw?: string | null): SuggestedModuleAction {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (
    cleaned === 'booking' ||
    cleaned === 'departments' ||
    cleaned === 'doctors' ||
    cleaned === 'tracker' ||
    cleaned === 'info'
  ) {
    return cleaned;
  }
  return null;
}

const HINGLISH_DEPT_KEYWORDS: Record<string, string[]> = {
  cardiology: ['dil', 'seene', 'hriday', 'bp', 'blood pressure', 'dhadkan'],
  neurology: ['sirdard', 'sir dard', 'sar dard', 'dimag', 'nas', 'nason', 'chakkar', 'migraine'],
  orthopedics: ['haddi', 'haddiyon', 'ghutne', 'ghutna', 'jod', 'jodo', 'jodon', 'kamar', 'peeth', 'kandha'],
  pediatrics: ['bachcha', 'baccha', 'bachche', 'bacche', 'bacho', 'bachon', 'teeka', 'tikakaran', 'shishu'],
  dermatology: ['khujli', 'twacha', 'tvacha', 'chamdi', 'baal', 'daane', 'muhase', 'allergi'],
  'general-medicine': ['bukhar', 'bhukhar', 'sardi', 'khansi', 'zukam', 'jukam', 'kamzori', 'thakan', 'jaanch'],
};

function detectContextFromText(text: string): {
  departmentId: string | null;
  doctorId: string | null;
} {
  const lower = text.toLowerCase();

  for (const doc of DOCTORS) {
    const shortName = doc.name.replace(/^Dr\.\s*/i, '').toLowerCase();
    if (lower.includes(doc.name.toLowerCase()) || lower.includes(shortName)) {
      return { departmentId: doc.departmentId, doctorId: doc.id };
    }
  }

  for (const dept of DEPARTMENTS) {
    const hinglishMatches = HINGLISH_DEPT_KEYWORDS[dept.id] ?? [];
    if (
      lower.includes(dept.name.toLowerCase()) ||
      lower.includes(dept.id.toLowerCase()) ||
      dept.keywords.some((kw) => lower.includes(kw.toLowerCase())) ||
      hinglishMatches.some((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(lower))
    ) {
      return { departmentId: dept.id, doctorId: dept.leadDoctorId };
    }
  }

  return { departmentId: null, doctorId: null };
}

function resolveSessionContext(
  message: string,
  history: AssistantTurn[],
): { departmentId: string | null; doctorId: string | null } {
  const current = detectContextFromText(message);
  if (current.departmentId || current.doctorId) {
    return current;
  }

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const prior = detectContextFromText(history[i].content);
    if (prior.departmentId || prior.doctorId) {
      return prior;
    }
  }

  return { departmentId: null, doctorId: null };
}

function buildDemoModeReply(
  message: string,
  targetLang: DetectedLanguage,
  history: AssistantTurn[],
): AssistantResponse {
  const lower = message.toLowerCase();

  // 1. Emergency Escalation Check
  const emergencyKeywords = [
    'chest pain',
    'can\'t breathe',
    'cannot breathe',
    'breathing difficulty',
    'shortness of breath',
    'unconscious',
    'fainted',
    'severe bleeding',
    'heart attack',
    'stroke',
    'seizure now',
    'accident',
    'emergency',
    'seene me tez dard',
    'seene mein tez dard',
    'saans lene me',
    'saans nahi',
    'behosh',
    'aapatkalin',
    'सीने में तेज दर्द',
    'सांस लेने में तकलीफ',
    'बेहोश',
    'आपातकालीन',
    'एम्बुलेंस',
    'दुर्घटना',
  ];

  if (emergencyKeywords.some((kw) => lower.includes(kw))) {
    const reply =
      targetLang === 'hi'
        ? `यदि यह चिकित्सीय आपातकाल है, तो कृपया प्रतीक्षा न करें और तुरंत हमारी 24/7 आपातकालीन सेवाओं से संपर्क करें:\n\n• 24/7 आपातकालीन और ट्रॉमा डेस्क: ${HOSPITAL_PROFILE.emergencyPhone}\n• एम्बुलेंस सेवा: ${HOSPITAL_PROFILE.ambulanceHelpline}\n• स्थान: ग्राउंड फ्लोर, नॉर्थ विंग (${HOSPITAL_PROFILE.hindiHospitalName})\n\nमैं एक AI अस्पताल नेविगेशन सहायक हूँ, डॉक्टर नहीं। तत्काल चिकित्सीय सहायता के लिए कृपया ऊपर दिए गए नंबरों पर कॉल करें या नजदीकी इमरजेंसी विभाग में जाएं।`
        : targetLang === 'hinglish'
          ? `Agar yeh medical emergency hai, toh bilkul wait na karein aur turant hamari 24/7 emergency service se contact karein:\n\n• 24/7 Emergency & Trauma Desk: ${HOSPITAL_PROFILE.emergencyPhone}\n• Ambulance Dispatch: ${HOSPITAL_PROFILE.ambulanceHelpline}\n• Location: Ground Floor, North Wing (${HOSPITAL_PROFILE.hospitalName})\n\nDhyan dein: Main ek AI hospital navigation assistant hoon, doctor nahi. Turant emergency care ke liye upar diye numbers par call karein ya seedha Emergency Desk par pahuchein.`
          : `If you or someone nearby is experiencing urgent or severe symptoms, do not wait for an outpatient appointment. Contact our 24/7 emergency services immediately:\n\n• 24/7 Emergency & Trauma Desk: ${HOSPITAL_PROFILE.emergencyPhone}\n• Ambulance Dispatch: ${HOSPITAL_PROFILE.ambulanceHelpline}\n• Location: Ground Floor, North Wing (${HOSPITAL_PROFILE.hospitalName})\n\nPlease note: I am an AI hospital navigation assistant, not a doctor. Seek immediate in-person emergency care right away.`;

    const followUpSuggestions =
      targetLang === 'hi'
        ? [
            'अस्पताल का पूरा पता और इमरजेंसी गेट कहाँ है?',
            '24 घंटे फार्मेसी और ब्लड बैंक के नंबर क्या हैं?',
          ]
        : targetLang === 'hinglish'
          ? [
              'Hospital ka pura address aur North Wing entrance kahan hai?',
              '24/7 pharmacy aur blood bank ke phone numbers kya hain?',
            ]
          : [
              'What is the hospital campus address and North Wing entrance?',
              'What are the 24/7 pharmacy and blood bank phone numbers?',
            ];

    return {
      mode: 'demo',
      detectedLanguage: targetLang,
      suggestedDepartmentId: null,
      suggestedDoctorId: null,
      suggestedAction: 'info',
      isEmergency: true,
      reply,
      followUpSuggestions,
    };
  }

  // 2. Non-diagnosis / non-prescription / non-treatment guardrail
  const medicalAdviceKeywords = [
    'diagnose',
    'diagnosis',
    'prescribe',
    'prescription',
    'medicine',
    'medication',
    'tablet',
    'pill',
    'dosage',
    'drug',
    'cure',
    'treatment plan',
    'which disease',
    'what disease',
    'am i having',
    'are you a doctor',
    'dawa batao',
    'dawai batao',
    'kaunsi dawa',
    'ilaj batao',
    'bimari kya hai',
    'kya aap doctor',
    'दवा बताओ',
    'कौन सी दवा',
    'इलाज बताओ',
    'बीमारी क्या है',
    'क्या आप डॉक्टर हैं',
  ];

  if (medicalAdviceKeywords.some((kw) => lower.includes(kw))) {
    const context = resolveSessionContext(message, history);
    const dept =
      DEPARTMENTS.find((d) => d.id === context.departmentId) ??
      DEPARTMENTS.find((d) => d.id === 'general-medicine')!;
    const doc = DOCTORS.find((d) => d.id === dept.leadDoctorId)!;

    const reply =
      targetLang === 'hi'
        ? `मैं MediAssist AI हूँ — एक स्वचालित अस्पताल नेविगेशन सहायक, डॉक्टर नहीं। मैं किसी बीमारी का निदान (diagnosis) नहीं कर सकता, कोई दवा (medicine) नहीं लिख सकता और न ही उपचार बता सकता हूँ।\n\nसही जांच के लिए कृपया हमारे योग्य डॉक्टर से परामर्श लें। आपके प्रश्न के आधार पर **${dept.hindiName}** (${doc.name}, ${doc.roomNumber}) उपयुक्त हो सकता है। आप नीचे दिए बटन से अपॉइंटमेंट बुक कर सकते हैं।`
        : targetLang === 'hinglish'
          ? `Main MediAssist AI hoon — ek automated hospital navigation assistant, doctor nahi. Main kisi bimari ka diagnosis nahi kar sakta, koi dawai prescribe nahi kar sakta, aur na hi treatment suggest kar sakta hoon.\n\nSahi checkup ke liye hamare qualified specialist se milna zaroori hai. Aapke sawaal ke hisaab se **${dept.name}** department (${doc.name}, ${doc.roomNumber}) sahi option ho sakta hai. Aap neeche diye button se appointment request submit kar sakte hain.`
          : `I am MediAssist AI, an automated hospital navigation assistant — not a doctor. I cannot diagnose medical conditions, prescribe medications, or recommend treatments.\n\nFor a safe clinical evaluation, please consult a qualified specialist in person. Based on our hospital directory, **${dept.name}** (${doc.name}, ${doc.roomNumber}) is available for outpatient consultations, and you can request an appointment directly below.`;

    const followUpSuggestions =
      targetLang === 'hi'
        ? [
            `${doc.name} के उपलब्ध समय स्लॉट क्या हैं?`,
            'अपॉइंटमेंट बुक करने की प्रक्रिया बताएं',
          ]
        : targetLang === 'hinglish'
          ? [
              `${doc.name} ke available time slots kya hain?`,
              'Appointment book karne ka step-by-step process bataiye',
            ]
          : [
              `What time slots are available with ${doc.name}?`,
              'Guide me step-by-step through booking an appointment',
            ];

    return {
      mode: 'demo',
      detectedLanguage: targetLang,
      suggestedDepartmentId: dept.id,
      suggestedDoctorId: doc.id,
      suggestedAction: 'booking',
      isEmergency: false,
      reply,
      followUpSuggestions,
    };
  }

  // 3. Doctor Directory / Hindi-speaking doctors
  const isDoctorDirectoryQuery =
    lower.includes('doctor directory') ||
    lower.includes('all doctors') ||
    lower.includes('list of doctors') ||
    lower.includes('hindi speaking') ||
    lower.includes('which doctors') ||
    lower.includes('kaunse doctor') ||
    lower.includes('kaun se doctor') ||
    lower.includes('doctors list') ||
    lower.includes('hindi bolne') ||
    lower.includes('डॉक्टरों की सूची') ||
    lower.includes('हिंदी बोलने वाले डॉक्टर');

  if (isDoctorDirectoryQuery) {
    const hindiDoctors = DOCTORS.filter((d) => d.languages.includes('Hindi'));
    const reply =
      targetLang === 'hi'
        ? `हमारे अस्पताल की डॉक्टर डायरेक्टरी में 6 विशेषज्ञ उपलब्ध हैं। इनमें से **${hindiDoctors.length} डॉक्टर हिंदी और अंग्रेजी दोनों बोलते हैं**:\n\n${hindiDoctors
            .map((d) => `• ${d.name} (${d.departmentName}) — ${d.availabilityDays}, ${d.availabilityHours}`)
            .join('\n')}\n\nअन्य विशेषज्ञों में Dr. Mark Thompson (Orthopedics) और Dr. Sarah Jenkins (Dermatology) शामिल हैं। आप डॉक्टर डायरेक्टरी खोलकर उपलब्ध स्लॉट चुन सकते हैं।`
        : targetLang === 'hinglish'
          ? `Hamare hospital ki Doctor Directory me 6 specialists available hain. Inme se **${hindiDoctors.length} doctors Hindi aur English dono bolte hain**:\n\n${hindiDoctors
              .map((d) => `• ${d.name} (${d.departmentName}) — ${d.availabilityDays}, ${d.availabilityHours}`)
              .join('\n')}\n\nIske alawa Dr. Mark Thompson (Orthopedics) aur Dr. Sarah Jenkins (Dermatology) bhi available hain. Aap neeche Doctor Directory kholkar department ya language ke hisaab se filter kar sakte hain.`
          : `Our fictional Doctor Directory includes 6 specialists across all departments. **${hindiDoctors.length} specialists speak both English and Hindi**:\n\n${hindiDoctors
              .map((d) => `• ${d.name} (${d.departmentName}) — ${d.availabilityDays}, ${d.availabilityHours}`)
              .join('\n')}\n\nWe also have Dr. Mark Thompson (Orthopedics) and Dr. Sarah Jenkins (Dermatology). Open the Doctor Directory below to filter by department, availability, or language.`;

    const followUpSuggestions =
      targetLang === 'hi'
        ? [
            'डॉ. प्रिया शर्मा के बारे में विस्तार से बताएं',
            'अपॉइंटमेंट बुक करने के लिए कौन-कौन सी जानकारी चाहिए?',
          ]
        : targetLang === 'hinglish'
          ? [
              'Dr. Priya Sharma ke baare me detail aur unke slots bataiye',
              'Appointment book karne ke liye kya details chahiye hoti hain?',
            ]
          : [
              'Tell me more about Dr. Priya Sharma and her slots',
              'What details are needed to book an appointment?',
            ];

    return {
      mode: 'demo',
      detectedLanguage: targetLang,
      suggestedDepartmentId: null,
      suggestedDoctorId: null,
      suggestedAction: 'doctors',
      isEmergency: false,
      reply,
      followUpSuggestions,
    };
  }

  // 4. Contextual follow-up or explicit Department / Doctor inquiry
  const context = resolveSessionContext(message, history);
  const isFollowUpAboutSlotsOrHours =
    lower.includes('slot') ||
    lower.includes('fee') ||
    lower.includes('room') ||
    lower.includes('floor') ||
    lower.includes('where') ||
    lower.includes('schedule') ||
    lower.includes('timing') ||
    lower.includes('their') ||
    lower.includes('them') ||
    lower.includes('there') ||
    lower.includes('unke') ||
    lower.includes('unka') ||
    lower.includes('kamra') ||
    lower.includes('samay') ||
    lower.includes('kahan') ||
    lower.includes('स्लॉट') ||
    lower.includes('फीस') ||
    lower.includes('कमरा') ||
    lower.includes('समय') ||
    lower.includes('डॉक्टर');

  if (
    context.departmentId &&
    (detectContextFromText(message).departmentId || isFollowUpAboutSlotsOrHours)
  ) {
    const dept = DEPARTMENTS.find((d) => d.id === context.departmentId)!;
    const doc =
      DOCTORS.find((d) => d.id === context.doctorId) ??
      DOCTORS.find((d) => d.id === dept.leadDoctorId)!;

    const reply =
      targetLang === 'hi'
        ? `**${dept.hindiName}** और संबंधित विशेषज्ञ की जानकारी:\n\n• स्थान: ${dept.floor}, ${dept.wing} (${dept.consultationDeskExt})\n• विभाग ओपीडी समय: ${dept.opdHours}\n• विशेषज्ञ: ${doc.name} (${doc.credentials}) — ${doc.experienceYears} वर्ष अनुभव\n• भाषाएं: ${doc.languages.join(', ')} | कमरा: ${doc.roomNumber}\n• डेमो परामर्श शुल्क: INR ${doc.consultationFee}\n• उपलब्ध डेमो स्लॉट: ${doc.slots.join(', ')}\n\nमैं एक AI नेविगेशन सहायक हूँ (डॉक्टर नहीं)। आप नीचे दिए बटन से ${doc.name} के साथ अपॉइंटमेंट बुक कर सकते हैं या डॉक्टर डायरेक्टरी देख सकते हैं।`
        : targetLang === 'hinglish'
          ? `**${dept.name}** department aur specialist ki puri jaankari yahan hai:\n\n• Location: ${dept.floor}, ${dept.wing} (${dept.consultationDeskExt})\n• Department OPD Hours: ${dept.opdHours}\n• Specialist: ${doc.name} (${doc.credentials}) — ${doc.experienceYears} saal ka anubhav\n• Languages: ${doc.languages.join(', ')} · Room: ${doc.roomNumber}\n• Demo Consultation Fee: INR ${doc.consultationFee}\n• Available Demo Slots: ${doc.slots.join(', ')}\n• Key Services: ${dept.services.join(', ')}\n\nMain ek AI navigation guide hoon, doctor nahi. Aap neeche diye button se ${doc.name} ke saath seedha appointment book kar sakte hain.`
          : `Here are the details for **${dept.name}** and our specialist:\n\n• Location: ${dept.floor}, ${dept.wing} (${dept.consultationDeskExt})\n• Department OPD Hours: ${dept.opdHours}\n• Specialist: ${doc.name} (${doc.credentials}) — ${doc.experienceYears} yrs experience\n• Languages: ${doc.languages.join(', ')} · Room: ${doc.roomNumber}\n• Demo Consultation Fee: INR ${doc.consultationFee}\n• Available Demo Slots: ${doc.slots.join(', ')}\n• Key Services: ${dept.services.join(', ')}\n\nPlease note that I am an AI navigation assistant, not a doctor. You can proceed to book with ${doc.name} or explore the Doctor Directory below.`;

    const followUpSuggestions =
      targetLang === 'hi'
        ? [
            'इस विभाग में अपॉइंटमेंट कैसे बुक करें?',
            'इस विभाग में कौन-कौन सी जांच (Services) उपलब्ध हैं?',
          ]
        : targetLang === 'hinglish'
          ? [
              `${doc.name} ke saath appointment kaise book karein?`,
              `${dept.name} department me kaunsi diagnostic services milti hain?`,
            ]
          : [
              `How do I book an appointment with ${doc.name}?`,
              `What diagnostic services are in ${dept.name}?`,
            ];

    return {
      mode: 'demo',
      detectedLanguage: targetLang,
      suggestedDepartmentId: dept.id,
      suggestedDoctorId: doc.id,
      suggestedAction: 'booking',
      isEmergency: false,
      reply,
      followUpSuggestions,
    };
  }

  // 5. Appointment Tracking Guidance
  if (
    lower.includes('track') ||
    lower.includes('status') ||
    lower.includes('ma-202') ||
    lower.includes('ट्रैक') ||
    lower.includes('स्टेटस')
  ) {
    const reply =
      targetLang === 'hi'
        ? `अपने अपॉइंटमेंट की लाइव स्थिति जांचने के लिए **Appointment Tracker** खोलें और अपना यूनिक अपॉइंटमेंट आईडी (जैसे \`MA-2026-1042\`) दर्ज करें।\n\nवहां आपको रोगी विवरण, निर्धारित डॉक्टर, कमरा नंबर, दिनांक/समय स्लॉट और लाइव स्टेटस (Pending, Confirmed, Completed या Cancelled) दिखाई देगा।`
        : targetLang === 'hinglish'
          ? `Apne appointment ka live status check karne ke liye **Appointment Tracker** open karein aur apna unique Appointment ID (jaise \`MA-2026-1042\`) enter karein.\n\nWahan aapko patient details, assigned doctor, clinic room, date/time slot aur live status (Pending, Confirmed, Completed, ya Cancelled) turant dikh jayega.`
          : `To check your live appointment status, open the **Appointment Tracker** and enter your unique Appointment ID (for example, \`MA-2026-1042\`).\n\nYou will immediately see the assigned specialist, clinic room, scheduled date and time slot, and live status (Pending, Confirmed, Completed, or Cancelled).`;

    const followUpSuggestions =
      targetLang === 'hi'
        ? ['नया अपॉइंटमेंट कैसे बुक करें?', 'अस्पताल के ओपीडी समय क्या हैं?']
        : targetLang === 'hinglish'
          ? ['Naya appointment kaise book karein?', 'Hospital ke OPD timings kya hain?']
          : ['How do I book a new appointment?', 'What are the hospital OPD timings?'];

    return {
      mode: 'demo',
      detectedLanguage: targetLang,
      suggestedDepartmentId: null,
      suggestedDoctorId: null,
      suggestedAction: 'tracker',
      isEmergency: false,
      reply,
      followUpSuggestions,
    };
  }

  // 6. Appointment Booking Process Guidance
  if (
    lower.includes('book') ||
    lower.includes('appointment') ||
    lower.includes('schedule') ||
    lower.includes('अपॉइंटमेंट') ||
    lower.includes('बुक')
  ) {
    const reply =
      targetLang === 'hi'
        ? `MediAssist AI में अपॉइंटमेंट बुक करने के 4 सरल चरण हैं:\n\n1. **Book Appointment** मॉड्यूल खोलें।\n2. रोगी का नाम, आयु (1–120) और फोन या ईमेल दर्ज करें (केवल डेमो विवरण उपयोग करें)।\n3. विभाग (6 में से एक), विशेषज्ञ डॉक्टर, तारीख और उपलब्ध समय स्लॉट चुनें।\n4. सबमिट करते ही आपको एक यूनिक **Appointment ID** मिलेगा जिसे आप कभी भी **Track Appointment** में देख सकते हैं।`
        : targetLang === 'hinglish'
          ? `MediAssist AI me outpatient appointment book karne ke 4 aasan steps hain:\n\n1. **Book Appointment** module kholein (ya neeche diye button par click karein).\n2. Patient ka naam, age (1–120), aur phone ya email enter karein (sirf demo details use karein).\n3. 6 departments me se ek choose karein, doctor select karein, future date aur time slot chunein.\n4. Submit karte hi aapko ek unique **Appointment ID** milega jisse aap **Track Appointment** me status dekh sakte hain.`
          : `Booking an outpatient appointment in MediAssist AI takes four simple steps:\n\n1. Open **Book Appointment** (or click the button below).\n2. Enter the patient's name, age (1–120), and phone number or email (demo data only).\n3. Choose one of our 6 departments, select a specialist doctor, pick a future date, and choose an available time slot.\n4. Submit the form to receive a unique **Appointment ID** immediately for live tracking.`;

    const followUpSuggestions =
      targetLang === 'hi'
        ? ['कौन-कौन से 6 विभाग उपलब्ध हैं?', 'मैं अपने अपॉइंटमेंट का स्टेटस कैसे ट्रैक करूँ?']
        : targetLang === 'hinglish'
          ? ['Hospital me kaunse 6 departments hain?', 'Apne appointment ka status kaise track karein?']
          : ['Which 6 departments are available at the hospital?', 'How do I track my appointment status?'];

    return {
      mode: 'demo',
      detectedLanguage: targetLang,
      suggestedDepartmentId: context.departmentId,
      suggestedDoctorId: context.doctorId,
      suggestedAction: 'booking',
      isEmergency: false,
      reply,
      followUpSuggestions,
    };
  }

  // 7. Hospital Timings, Facilities & Emergency Numbers
  if (
    lower.includes('timing') ||
    lower.includes('open') ||
    lower.includes('hour') ||
    lower.includes('facility') ||
    lower.includes('facilities') ||
    lower.includes('visiting') ||
    lower.includes('address') ||
    lower.includes('phone') ||
    lower.includes('contact') ||
    lower.includes('samay') ||
    lower.includes('waqt') ||
    lower.includes('pata') ||
    lower.includes('khulne') ||
    lower.includes('समय') ||
    lower.includes('खुलने') ||
    lower.includes('सुविधा') ||
    lower.includes('पता') ||
    lower.includes('नंबर')
  ) {
    const reply =
      targetLang === 'hi'
        ? `**${HOSPITAL_PROFILE.hindiHospitalName}** की मुख्य जानकारी:\n\n• ओपीडी (OPD): सोमवार – शनिवार, सुबह 08:30 – शाम 06:00\n• आपातकालीन सेवा एवं फार्मेसी: 24 घंटे, सातों दिन\n• डायग्नोस्टिक्स और पैथोलॉजी लैब: प्रतिदिन सुबह 07:00 – रात 09:00\n• मिलने का समय: प्रतिदिन 11:00 AM – 01:00 PM और 05:00 PM – 07:00 PM\n• आपातकालीन हेल्पलाइन: ${HOSPITAL_PROFILE.emergencyPhone} | अपॉइंटमेंट डेस्क: ${HOSPITAL_PROFILE.appointmentDesk}`
        : targetLang === 'hinglish'
          ? `**${HOSPITAL_PROFILE.hospitalName}** ke main timings aur contacts:\n\n• Outpatient Department (OPD): Mon – Sat, 08:30 AM – 06:00 PM\n• Emergency, Trauma & Pharmacy: 24/7 Open\n• Diagnostics & Pathology Lab: Rozana 07:00 AM – 09:00 PM\n• Visiting Hours: Rozana 11:00 AM – 01:00 PM aur 05:00 PM – 07:00 PM\n• Emergency Helpline: ${HOSPITAL_PROFILE.emergencyPhone} · Appointment Desk: ${HOSPITAL_PROFILE.appointmentDesk}`
          : `Here are the key timings and contacts for **${HOSPITAL_PROFILE.hospitalName}**:\n\n• Outpatient Department (OPD): Mon – Sat, 08:30 AM – 06:00 PM\n• Emergency, Trauma & Pharmacy: Open 24/7\n• Diagnostics & Pathology Lab: Daily, 07:00 AM – 09:00 PM\n• Inpatient Visiting Hours: Daily, 11:00 AM – 01:00 PM & 05:00 PM – 07:00 PM\n• Emergency Helpline: ${HOSPITAL_PROFILE.emergencyPhone} · Appointment Desk: ${HOSPITAL_PROFILE.appointmentDesk}`;

    const followUpSuggestions =
      targetLang === 'hi'
        ? [
            'अस्पताल में कौन-कौन सी जांच सुविधाएं (MRI, CT, Lab) उपलब्ध हैं?',
            'अस्पताल के 6 विभागों की सूची दिखाएं',
          ]
        : targetLang === 'hinglish'
          ? [
              'Hospital me MRI, CT aur Lab jaisi kaunsi facilities hain?',
              'Hospital ke sabhi 6 departments ki list dikhaiye',
            ]
          : [
              'What diagnostic facilities like MRI, CT, or Lab are available?',
              'Show me all 6 hospital departments',
            ];

    return {
      mode: 'demo',
      detectedLanguage: targetLang,
      suggestedDepartmentId: null,
      suggestedDoctorId: null,
      suggestedAction: 'info',
      isEmergency: false,
      reply,
      followUpSuggestions,
    };
  }

  // 8. All Departments Overview
  if (
    lower.includes('department') ||
    lower.includes('specialt') ||
    lower.includes('vibhag') ||
    lower.includes('विभाग')
  ) {
    const reply =
      targetLang === 'hi'
        ? `हमारे अस्पताल में 6 मुख्य क्लिनिकल विभाग उपलब्ध हैं:\n\n${DEPARTMENTS.map(
            (d) => `• ${d.name} (${d.hindiName}) — ${d.floor}, ${d.opdHours}`,
          ).join('\n')}\n\nआप किसी भी विभाग के नाम पर पूछ सकते हैं या नीचे **Department Finder** खोल सकते हैं।`
        : targetLang === 'hinglish'
          ? `Hamare hospital me 6 main clinical departments available hain:\n\n${DEPARTMENTS.map(
              (d) => `• **${d.name}** — ${d.floor}, ${d.wing} (${d.opdHours})`,
            ).join('\n')}\n\nAap kisi bhi department ke baare me pooch sakte hain ya neeche **Department Finder** open kar sakte hain.`
          : `We offer 6 specialized clinical departments at ${HOSPITAL_PROFILE.hospitalName}:\n\n${DEPARTMENTS.map(
              (d) => `• **${d.name}** — ${d.floor}, ${d.wing} (${d.opdHours})`,
            ).join('\n')}\n\nAsk about any department to check its lead specialist and services, or open the Department Finder below.`;

    const followUpSuggestions =
      targetLang === 'hi'
        ? [
            'कार्डियोलॉजी (Cardiology) विभाग और डॉक्टर के बारे में बताएं',
            'जनरल मेडिसिन (General Medicine) में कौन से डॉक्टर हैं?',
          ]
        : targetLang === 'hinglish'
          ? [
              'Cardiology department aur wahan ke doctor ke baare me bataiye',
              'General Medicine me kaunse doctor milte hain?',
            ]
          : [
              'Tell me about Cardiology and its specialist',
              'Who is the specialist in General Medicine?',
            ];

    return {
      mode: 'demo',
      detectedLanguage: targetLang,
      suggestedDepartmentId: null,
      suggestedDoctorId: null,
      suggestedAction: 'departments',
      isEmergency: false,
      reply,
      followUpSuggestions,
    };
  }

  // 9. General Welcome / Unmatched Overview
  const reply =
    targetLang === 'hi'
      ? `मैं **MediAssist AI** हूँ — ${HOSPITAL_PROFILE.hindiHospitalName} का रोगी नेविगेशन सहायक (मैं डॉक्टर नहीं हूँ, और कोई निदान या दवा नहीं बताता)। मैं आपकी इन कार्यों में मदद कर सकता हूँ:\n\n• 6 विभागों की जानकारी (Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology, General Medicine)\n• डॉक्टर डायरेक्टरी में विशेषज्ञ, भाषा और ओपीडी स्लॉट देखना\n• अपॉइंटमेंट बुक करना और Appointment ID से स्टेटस ट्रैक करना\n• अस्पताल के समय, सुविधाएं और 24/7 आपातकालीन संपर्क बताना`
      : targetLang === 'hinglish'
        ? `Main **MediAssist AI** hoon — ${HOSPITAL_PROFILE.hospitalName} ka patient navigation assistant (main doctor nahi hoon, aur koi diagnosis ya dawai prescribe nahi karta). Main aapki in cheezon me help kar sakta hoon:\n\n• 6 departments ki jaankari (Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology, General Medicine)\n• Doctor Directory me specialists, languages aur OPD slots dekhna\n• Appointment book karna aur Appointment ID se status track karna\n• Hospital timings, diagnostic facilities aur 24/7 emergency numbers batana`
        : `I am **MediAssist AI**, your hospital navigation assistant at ${HOSPITAL_PROFILE.hospitalName} (I am an AI guide, not a doctor, and I do not diagnose conditions or prescribe treatments). I can help you with:\n\n• Exploring our 6 departments (Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology, General Medicine)\n• Finding doctors, spoken languages, consultation fees, and demo slots\n• Guiding you through booking or tracking an outpatient appointment\n• Checking OPD hours, diagnostic facilities, and 24/7 emergency contacts`;

  const followUpSuggestions =
    targetLang === 'hi'
      ? [
          'सभी 6 विभागों के बारे में बताएं',
          'हिंदी बोलने वाले डॉक्टर कौन-कौन हैं?',
          'अपॉइंटमेंट बुक करने की प्रक्रिया बताएं',
        ]
      : targetLang === 'hinglish'
        ? [
            'Sabhi 6 hospital departments ke baare me bataiye',
            'Kaunse doctors Hindi bolte hain?',
            'Appointment kaise book karein?',
          ]
        : [
            'Explain all 6 hospital departments',
            'Which doctors speak Hindi?',
            'How do I book an appointment?',
          ];

  return {
    mode: 'demo',
    detectedLanguage: targetLang,
    suggestedDepartmentId: null,
    suggestedDoctorId: null,
    suggestedAction: 'departments',
    isEmergency: false,
    reply,
    followUpSuggestions,
  };
}

function stripJsonCodeFences(rawText: string): string {
  const trimmed = rawText.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  return trimmed;
}

function parseGeminiStructuredOutput(
  rawText: string,
  message: string,
  detectedLanguage: DetectedLanguage,
  history: AssistantTurn[],
): AssistantResponse {
  let parsed: StructuredGeminiPayload;
  try {
    parsed = JSON.parse(stripJsonCodeFences(rawText)) as StructuredGeminiPayload;
  } catch {
    throw new Error('Gemini API returned an invalid JSON payload. Please retry your request.');
  }

  const reply = parsed.reply?.trim();
  if (!reply) {
    throw new Error('Gemini API returned an empty reply. Please retry your request.');
  }

  const sanitizedDept = sanitizeDepartmentId(parsed.suggestedDepartmentId);
  const sanitizedDoc = sanitizeDoctorId(parsed.suggestedDoctorId);
  const inferred = resolveSessionContext(`${message} ${reply}`, history);

  const finalDoctorId = sanitizedDoc ?? (sanitizedDept ? inferred.doctorId : null);
  const finalDepartmentId =
    sanitizedDept ??
    (finalDoctorId ? DOCTORS.find((d) => d.id === finalDoctorId)?.departmentId ?? null : null);

  const followUps = Array.isArray(parsed.followUpSuggestions)
    ? parsed.followUpSuggestions
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(0, 3)
    : [];

  const defaultFollowUps =
    detectedLanguage === 'hi'
      ? ['डॉक्टरों के उपलब्ध समय स्लॉट क्या हैं?', 'अपॉइंटमेंट कैसे बुक करें?']
      : detectedLanguage === 'hinglish'
        ? ['Doctors ke available time slots kya hain?', 'Appointment kaise book karein?']
        : ['Which specialists are available today?', 'How do I book an appointment?'];

  return {
    reply,
    mode: 'gemini',
    detectedLanguage,
    suggestedDepartmentId: finalDepartmentId,
    suggestedDoctorId: finalDoctorId,
    suggestedAction: sanitizeAction(parsed.suggestedAction),
    isEmergency: Boolean(parsed.isEmergency),
    followUpSuggestions: followUps.length > 0 ? followUps : defaultFollowUps,
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('500') ||
    msg.includes('unavailable') ||
    msg.includes('timeout') ||
    msg.includes('econnreset')
  );
}

export async function generatePatientAssistantReply(params: {
  message: string;
  language: AssistantLanguage;
  history: AssistantTurn[];
}): Promise<AssistantResponse> {
  const targetLanguage = detectResponseLanguage(params.message, params.language);
  const apiKey = getConfiguredApiKey();

  // Clearly labelled Demo Mode ONLY when GEMINI_API_KEY is unconfigured in server environment
  if (!apiKey) {
    return buildDemoModeReply(params.message, targetLanguage, params.history);
  }

  // When GEMINI_API_KEY IS configured, NEVER silently fall back to Demo Mode if Gemini fails.
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const recentHistory = params.history.slice(-16).map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));

  const contents = [
    ...recentHistory,
    {
      role: 'user',
      parts: [{ text: params.message }],
    },
  ];

  const modelsToTry = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL];
  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: buildSystemInstruction(targetLanguage),
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description:
                    'Concise, grounded hospital navigation response in English, Hindi (Devanagari), or Hinglish (Roman script).',
                },
                suggestedDepartmentId: {
                  type: Type.STRING,
                  description:
                    'Exact department ID if relevant (cardiology, neurology, orthopedics, pediatrics, dermatology, general-medicine) or empty string.',
                },
                suggestedDoctorId: {
                  type: Type.STRING,
                  description: 'Exact fictional doctor ID if relevant, or empty string.',
                },
                suggestedAction: {
                  type: Type.STRING,
                  description:
                    'Recommended module: booking, departments, doctors, tracker, info, or none.',
                },
                isEmergency: {
                  type: Type.BOOLEAN,
                  description: 'True only when urgent/emergency care redirection is required.',
                },
                followUpSuggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    '2 to 3 short follow-up question suggestions in the exact same language/script as reply.',
                },
              },
              required: [
                'reply',
                'suggestedDepartmentId',
                'suggestedDoctorId',
                'suggestedAction',
                'isEmergency',
                'followUpSuggestions',
              ],
            },
          },
        });

        const rawText = (response.text ?? '').trim();
        if (!rawText) {
          throw new Error('Gemini API returned an empty response. Please try again.');
        }

        return parseGeminiStructuredOutput(
          rawText,
          params.message,
          targetLanguage,
          params.history,
        );
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message.toUpperCase() : '';
        const isQuotaError = msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429');

        if (isQuotaError && modelName !== GEMINI_FALLBACK_MODEL) {
          console.warn(
            `[MediAssist AI] Primary model ${modelName} hit 429 quota; trying ${GEMINI_FALLBACK_MODEL}...`,
          );
          break;
        }

        if (attempt < 2 && isTransientError(err)) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to reach the Gemini AI assistant service.');
}
