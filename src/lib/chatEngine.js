/**
 * chatEngine.js — CargoExpress PH Chatbot Engine
 *
 * Extracted, intelligent chatbot logic with:
 * - 25+ FAQ topics with follow-up suggestions
 * - Fuzzy matching with Levenshtein distance
 * - Multi-word intent scoring
 * - Conversation context & memory
 * - Tracking number detection
 */

// ── Tracking number pattern ─────────────────────────────────────────────────
export const TRACKING_REGEX = /\bCE-\d{8}-\d{3,4}\b/i;

export const detectTrackingNumber = (input) => {
  const match = input.toUpperCase().match(TRACKING_REGEX);
  return match ? match[0] : null;
};

// ── Levenshtein distance for typo tolerance ─────────────────────────────────
const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

const fuzzyMatch = (word, pattern, threshold = 2) => {
  if (word === pattern) return true;
  if (word.includes(pattern) || pattern.includes(word)) return true;
  if (word.length >= 4 && pattern.length >= 4) {
    return levenshtein(word, pattern) <= threshold;
  }
  return false;
};

// ── FAQ Knowledge Base ──────────────────────────────────────────────────────
export const FAQ_DATABASE = [
  {
    id: 'booking',
    patterns: ['book', 'how to book', 'booking', 'ship', 'send', 'order', 'place order', 'new order', 'shipment'],
    answer: `To book a shipment:\n\n1️⃣ Create a free account (Sign Up)\n2️⃣ Go to "Place Order"\n3️⃣ Fill in sender & receiver details\n4️⃣ Select your route (Bohol ↔ Manila)\n5️⃣ Enter package weight\n6️⃣ Submit — your tracking number is generated instantly!\n\nIt only takes about 2 minutes. 🚀`,
    type: 'steps',
    followUps: [
      { label: '💰 How much?', query: 'how much is shipping' },
      { label: '🚢 What routes?', query: 'routes' },
      { label: '🔍 Track package', query: 'track' },
    ],
  },
  {
    id: 'routes',
    patterns: ['route', 'routes', 'where', 'destination', 'bohol', 'manila', 'areas', 'covered', 'coverage'],
    answer: `We currently serve two routes:\n\n🚢 Bohol → Manila\n🚢 Manila → Bohol\n\nDoor-to-door pickup and delivery on both routes!`,
    followUps: [
      { label: '📦 How to book?', query: 'how to book' },
      { label: '💰 Shipping fee?', query: 'shipping fee' },
      { label: '🕐 Delivery time?', query: 'delivery time' },
    ],
  },
  {
    id: 'pricing',
    patterns: ['price', 'fee', 'cost', 'rate', 'how much', 'charge', 'shipping fee', 'magkano', 'pesos', 'per kilo'],
    answer: null, // Dynamically set with price_per_kilo
    dynamicAnswer: (pricePerKilo) => {
      const price = pricePerKilo || 70;
      return `Shipping is charged per kilogram:\n\n💰 Approximately ₱${price}/kg\n📦 Final price = actual weight × rate\n✅ You'll see the exact cost before confirming your order.\n\nThe rate may vary — the exact amount is confirmed at booking.`;
    },
    type: 'pricing',
    followUps: [
      { label: '📦 How to book?', query: 'how to book' },
      { label: '💵 Payment options?', query: 'payment' },
      { label: '🔍 Track order', query: 'track' },
    ],
  },
  {
    id: 'tracking',
    patterns: ['track', 'tracking', 'where is', 'status', 'locate', 'check order', 'tracking number', 'check status'],
    answer: `To track your package:\n\n📦 Paste your tracking number here (e.g. CE-20240101-001) and I'll look it up for you!\n\nOr:\n🔍 Visit the Track page — no login needed\n📱 Log in and open Orders to view all shipments`,
    followUps: [
      { label: '📦 How to book?', query: 'how to book' },
      { label: '🕐 Delivery time?', query: 'delivery time' },
      { label: '📘 Contact us', query: 'contact' },
    ],
  },
  {
    id: 'schedule',
    patterns: ['schedule', 'when', 'depart', 'trip', 'departure', 'date', 'next trip', 'upcoming'],
    answer: `Trip schedules vary based on cargo volume and route demand.\n\n📅 After booking, the admin confirms your pickup schedule and estimated delivery date.\n📘 For upcoming trip dates, message us on Facebook.\n\nWe'll keep you updated every step of the way!`,
    followUps: [
      { label: '📦 How to book?', query: 'how to book' },
      { label: '🕐 Delivery time?', query: 'delivery time' },
      { label: '📘 Contact us', query: 'contact' },
    ],
  },
  {
    id: 'contact',
    patterns: ['contact', 'reach', 'call', 'message', 'facebook', 'fb', 'phone number', 'number'],
    answer: `You can reach us here:\n\n📘 Facebook: facebook.com/marlon.sarong.cargodeliveryservice\n\nWe respond Mon–Sat during business hours. Feel free to message anytime!`,
    type: 'contact',
    followUps: [
      { label: '📦 How to book?', query: 'how to book' },
      { label: '🔍 Track package', query: 'track' },
      { label: '💰 Shipping fee?', query: 'shipping fee' },
    ],
  },
  {
    id: 'register',
    patterns: ['register', 'sign up', 'create account', 'signup', 'new account', 'join'],
    answer: `Creating an account is free and takes just a minute! 🆓\n\n👆 Click "Create account" below and fill in:\n• Full name\n• Email & password\n• Mobile number (09xxxxxxxxx)\n• Address (optional)\n\nOnce registered, you can book and track shipments instantly!`,
    type: 'steps',
    followUps: [
      { label: '📦 How to book?', query: 'how to book' },
      { label: '🔐 Forgot password?', query: 'forgot password' },
      { label: '💰 Shipping fee?', query: 'shipping fee' },
    ],
  },
  {
    id: 'cancel',
    patterns: ['cancel', 'cancellation', 'cancel order', 'void'],
    answer: `To cancel an order:\n\n1️⃣ Log in to your account\n2️⃣ Go to Orders\n3️⃣ Select the order you want to cancel\n4️⃣ Tap "Cancel Order"\n\n⚠️ Orders can only be cancelled before pickup. For urgent cases, message us on Facebook.`,
    type: 'steps',
    followUps: [
      { label: '📘 Contact us', query: 'contact' },
      { label: '🔍 Track package', query: 'track' },
    ],
  },
  {
    id: 'payment',
    patterns: ['payment', 'pay', 'cash', 'bayad', 'payment method', 'payment options'],
    answer: `We accept the following payment methods:\n\n💵 Cash — pay on pickup or delivery\n📱 GCash — scan & pay via QR code\n⏳ Pay Later — with admin approval\n\nYou choose your payment method when your order is picked up.`,
    followUps: [
      { label: '📦 How to book?', query: 'how to book' },
      { label: '💰 Shipping fee?', query: 'shipping fee' },
      { label: '📘 Contact us', query: 'contact' },
    ],
  },
  {
    id: 'delivery_time',
    patterns: ['delivery time', 'how long', 'eta', 'arrive', 'days', 'estimated', 'when will', 'how many days'],
    answer: `Delivery typically takes 3–5 business days depending on the route and trip schedule.\n\n📦 Bohol → Manila: ~3–5 days\n📦 Manila → Bohol: ~3–5 days\n\nYou'll receive status updates at each stage — from pickup to delivery! 📡`,
    followUps: [
      { label: '🔍 Track package', query: 'track' },
      { label: '📅 Trip schedule?', query: 'schedule' },
      { label: '📦 How to book?', query: 'how to book' },
    ],
  },
  {
    id: 'pickup',
    patterns: ['pickup', 'pick up', 'how pickup works', 'collection', 'collect my package', 'pickup process'],
    answer: `Here's how pickup works:\n\n1️⃣ Book your order online\n2️⃣ Admin confirms and schedules pickup\n3️⃣ Our team picks up from the sender's address\n4️⃣ Package is weighed and payment is collected\n5️⃣ You receive a confirmation with tracking updates\n\nDoor-to-door — no need to drop off anywhere! 🏠`,
    type: 'steps',
    followUps: [
      { label: '💰 Shipping fee?', query: 'shipping fee' },
      { label: '💵 Payment options?', query: 'payment' },
      { label: '🕐 Delivery time?', query: 'delivery time' },
    ],
  },
  {
    id: 'delivery_process',
    patterns: ['deliver', 'delivery process', 'receive', 'how to receive', 'receiver', 'recipient'],
    answer: `When your package arrives:\n\n📦 We deliver directly to the receiver's address\n📞 The receiver is contacted before delivery\n✅ Delivery confirmation is recorded in the system\n\nYou can track every step from pickup to delivery using your tracking number!`,
    followUps: [
      { label: '🔍 Track package', query: 'track' },
      { label: '💵 Receiver pays?', query: 'receiver pays' },
      { label: '📘 Contact us', query: 'contact' },
    ],
  },
  {
    id: 'insurance',
    patterns: ['insurance', 'damage', 'broken', 'lost', 'claim', 'missing', 'damaged'],
    answer: `We handle your cargo with care! If you have concerns about damaged or missing items:\n\n📘 Contact us immediately on Facebook\n📞 Provide your tracking number and details\n🔍 We'll investigate and help resolve the issue\n\nPlease inspect your package upon delivery and report any issues right away.`,
    followUps: [
      { label: '📘 Contact us', query: 'contact' },
      { label: '🔍 Track package', query: 'track' },
    ],
  },
  {
    id: 'multiple_packages',
    patterns: ['multiple', 'bulk', 'many packages', 'batch', 'several', 'more than one'],
    answer: `Yes! You can book multiple shipments:\n\n📦 Simply place a new order for each package\n📋 Each order gets its own tracking number\n💰 Each is weighed and priced separately\n\nFor large/bulk shipments, message us on Facebook for special arrangements!`,
    followUps: [
      { label: '📦 How to book?', query: 'how to book' },
      { label: '💰 Shipping fee?', query: 'shipping fee' },
      { label: '📘 Contact us', query: 'contact' },
    ],
  },
  {
    id: 'forgot_password',
    patterns: ['forgot password', 'cant login', 'reset', 'locked out', 'reset password', 'change password', 'lost password'],
    answer: `To reset your password:\n\n1️⃣ Click "Forgot password?" on the login form\n2️⃣ Enter your registered email address\n3️⃣ Check your inbox for the reset link\n4️⃣ Create a new password\n\nIf you don't receive the email, check your spam folder or contact us on Facebook.`,
    type: 'steps',
    followUps: [
      { label: '🆕 Create account', query: 'register' },
      { label: '📘 Contact us', query: 'contact' },
    ],
  },
  {
    id: 'receiver_pays',
    patterns: ['receiver pays', 'collect', 'cod', 'receiver payment', 'pabayad', 'padala bayad'],
    answer: `Yes! The receiver can pay for the shipment:\n\n💡 When your order is picked up, select "Receiver" as the payer\n💵 Payment will be collected upon delivery\n📱 Cash or GCash accepted\n\nThis is great for sending packages where the recipient covers the cost!`,
    followUps: [
      { label: '💵 Payment options?', query: 'payment' },
      { label: '📦 How to book?', query: 'how to book' },
      { label: '🕐 Delivery time?', query: 'delivery time' },
    ],
  },
  {
    id: 'about',
    patterns: ['what is', 'about', 'who are you', 'company', 'cargoexpress', 'about us'],
    answer: `CargoExpress PH is a sea cargo delivery service connecting Bohol and Manila. 🚢\n\n🏠 Door-to-door pickup & delivery\n📡 Real-time package tracking\n💰 Affordable per-kilo rates\n⚡ Reliable and fast service\n\nWe make shipping between Bohol and Manila easy, safe, and affordable!`,
    followUps: [
      { label: '📦 How to book?', query: 'how to book' },
      { label: '🚢 Routes?', query: 'routes' },
      { label: '💰 Shipping fee?', query: 'shipping fee' },
    ],
  },
  {
    id: 'app',
    patterns: ['app', 'download', 'mobile', 'website', 'web app', 'install'],
    answer: `CargoExpress PH works on any device! 📱💻\n\n🌐 Just visit our website in your browser\n📱 Works on phones, tablets, and desktop\n🔔 Install as an app: tap "Add to Home Screen" in your browser\n\nNo app store download needed — it's a progressive web app!`,
    followUps: [
      { label: '🆕 Create account', query: 'register' },
      { label: '📦 How to book?', query: 'how to book' },
    ],
  },
];

// ── Special Handlers ────────────────────────────────────────────────────────
const GREETING_PATTERNS = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'yo', 'magandang', 'kumusta', 'musta'];
const THANKS_PATTERNS = ['thank', 'thanks', 'salamat', 'bye', 'goodbye', 'ok', 'okay', 'got it', 'nice', 'great', 'perfect', 'awesome', 'sige'];
const HELP_PATTERNS = ['help', 'assist', 'support', 'need help', 'what can you do', 'menu', 'options', 'commands'];
const FOLLOW_UP_PATTERNS = ['more', 'details', 'explain', 'what else', 'tell me more', 'elaborate', 'and', 'continue', 'go on'];

const isGreeting = (input) => GREETING_PATTERNS.some(p => input.includes(p));
const isThanks = (input) => THANKS_PATTERNS.some(p => input.includes(p));
const isHelp = (input) => HELP_PATTERNS.some(p => input.includes(p));
const isFollowUp = (input) => FOLLOW_UP_PATTERNS.some(p => input.includes(p));

// ── Default Quick Questions ─────────────────────────────────────────────────
export const DEFAULT_QUICK_QUESTIONS = [
  { label: '📦 How to book?', query: 'how to book' },
  { label: '🚢 Routes?', query: 'what routes are available' },
  { label: '💰 Shipping fee?', query: 'how much is the shipping fee' },
  { label: '🔍 Track package', query: 'how to track my order' },
];

export const HELP_QUICK_QUESTIONS = [
  { label: '📦 Booking', query: 'how to book' },
  { label: '💰 Pricing', query: 'shipping fee' },
  { label: '🔍 Tracking', query: 'track' },
  { label: '🚢 Routes', query: 'routes' },
  { label: '💵 Payment', query: 'payment' },
  { label: '🕐 Delivery time', query: 'delivery time' },
  { label: '📘 Contact us', query: 'contact' },
  { label: '🆕 Sign up', query: 'register' },
];

// ── Intent Matching Engine ──────────────────────────────────────────────────
/**
 * Score each FAQ entry against the input. Returns best match + alternatives.
 */
export const matchIntent = (input) => {
  const lower = input.toLowerCase().trim();
  const words = lower.split(/\s+/);

  let bestMatch = null;
  let bestScore = 0;
  const scored = [];

  for (const faq of FAQ_DATABASE) {
    let score = 0;

    for (const pattern of faq.patterns) {
      // Exact substring match (strongest signal)
      if (lower.includes(pattern)) {
        score += pattern.split(/\s+/).length * 3; // Multi-word patterns score higher
        continue;
      }

      // Word-level matching
      const patternWords = pattern.split(/\s+/);
      for (const pw of patternWords) {
        for (const w of words) {
          if (w === pw) {
            score += 2;
          } else if (fuzzyMatch(w, pw)) {
            score += 1;
          }
        }
      }
    }

    if (score > 0) {
      scored.push({ faq, score });
      if (score > bestScore) {
        bestScore = score;
        bestMatch = faq;
      }
    }
  }

  // Sort alternatives by score descending, exclude best match
  const alternatives = scored
    .filter(s => s.faq.id !== bestMatch?.id)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.faq);

  return { match: bestMatch, score: bestScore, alternatives };
};

// ── Main Reply Function ─────────────────────────────────────────────────────
/**
 * Get the bot's reply for a given input.
 *
 * @param {string} input - User's message text
 * @param {object} context - { lastTopic, userName, pricePerKilo }
 * @returns {{ text: string, type: string, followUps: Array, topicId: string|null }}
 */
export const getReply = (input, context = {}) => {
  const lower = input.toLowerCase().trim();
  const { lastTopic, userName, pricePerKilo } = context;

  // 1. Detect tracking number → return special type
  const trackingNum = detectTrackingNumber(input);
  if (trackingNum) {
    return {
      text: trackingNum,
      type: 'tracking_lookup',
      followUps: [
        { label: '🔍 Track another', query: 'track' },
        { label: '📦 How to book?', query: 'how to book' },
        { label: '📘 Contact us', query: 'contact' },
      ],
      topicId: 'tracking',
    };
  }

  // 2. Greeting
  if (isGreeting(lower) && lower.length < 30) {
    const name = userName || 'there';
    return {
      text: `Hey ${name}! 👋 How can I help you today?\n\nI can answer questions about booking, tracking, pricing, routes, and more!`,
      type: 'text',
      followUps: DEFAULT_QUICK_QUESTIONS,
      topicId: null,
    };
  }

  // 3. Thanks/goodbye
  if (isThanks(lower) && lower.length < 30) {
    return {
      text: `You're welcome! 😊 Happy to help.\n\nFeel free to ask if you need anything else. Have a great day! 🌟`,
      type: 'text',
      followUps: DEFAULT_QUICK_QUESTIONS,
      topicId: null,
    };
  }

  // 4. Help menu
  if (isHelp(lower)) {
    return {
      text: `Here's everything I can help with:\n\n📦 Booking a shipment\n🚢 Routes & coverage\n💰 Shipping fees & pricing\n🔍 Package tracking\n📅 Trip schedules\n💵 Payment methods\n🕐 Delivery timeframes\n🆕 Account creation\n🔐 Password reset\n📘 Contact information\n\nJust tap a topic below or type your question!`,
      type: 'text',
      followUps: HELP_QUICK_QUESTIONS,
      topicId: 'help',
    };
  }

  // 5. Follow-up on last topic
  if (isFollowUp(lower) && lastTopic) {
    const lastFaq = FAQ_DATABASE.find(f => f.id === lastTopic);
    if (lastFaq) {
      const followUpText = getFollowUpDetail(lastTopic);
      if (followUpText) {
        return {
          text: followUpText,
          type: 'text',
          followUps: lastFaq.followUps || DEFAULT_QUICK_QUESTIONS,
          topicId: lastTopic,
        };
      }
    }
  }

  // 6. Intent matching
  const { match, alternatives } = matchIntent(lower);

  if (match) {
    let answerText = match.answer;
    if (match.id === 'pricing' && match.dynamicAnswer) {
      answerText = match.dynamicAnswer(pricePerKilo);
    }
    return {
      text: answerText,
      type: match.type || 'text',
      followUps: match.followUps || DEFAULT_QUICK_QUESTIONS,
      topicId: match.id,
    };
  }

  // 7. Smart fallback with suggestions
  if (alternatives.length > 0) {
    const suggestions = alternatives.map(a => {
      const label = FAQ_DATABASE.find(f => f.id === a.id);
      return label ? `• ${label.patterns[0]}` : null;
    }).filter(Boolean).join('\n');

    return {
      text: `I'm not sure about that yet. 🤔\n\nDid you mean one of these?\n${suggestions}\n\nOr contact us directly:\n📘 Facebook: facebook.com/marlon.sarong.cargodeliveryservice`,
      type: 'text',
      followUps: alternatives.slice(0, 4).map(a => ({
        label: `❓ ${a.patterns[0]}`,
        query: a.patterns[0],
      })),
      topicId: null,
    };
  }

  // 8. Complete fallback
  return {
    text: `I'm not sure about that yet. 🤔\n\nHere's what I can help with:\n📦 Booking  •  🔍 Tracking  •  💰 Pricing  •  🚢 Routes\n\nOr contact us directly:\n📘 Facebook: facebook.com/marlon.sarong.cargodeliveryservice\n\nOur team will be happy to help!`,
    type: 'text',
    followUps: DEFAULT_QUICK_QUESTIONS,
    topicId: null,
  };
};

// ── Follow-up Details ───────────────────────────────────────────────────────
const getFollowUpDetail = (topicId) => {
  const details = {
    booking: `More about booking:\n\n📱 You can book from any device — phone, tablet, or computer\n🆓 Registration is completely free\n🔢 You get a tracking number immediately after booking\n📧 Notifications are sent at every status change\n\nThe whole process takes about 2 minutes!`,
    pricing: `More about pricing:\n\n⚖️ Your package is weighed during pickup\n💰 The final cost is calculated based on actual weight\n💵 You can pay via Cash, GCash, or Pay Later\n📊 No hidden fees — what you see is what you pay\n\nFor special/bulk pricing, contact us on Facebook.`,
    tracking: `More about tracking:\n\n📡 7 tracking stages: Pending → Assigned → Picked Up → In Transit → Arrived at Hub → Out for Delivery → Delivered\n🔔 You get notifications at each stage\n🌐 The public tracking page works without logging in\n📋 Just enter your tracking number (CE-XXXXXXXX-XXXX)\n\nYou can also paste your tracking number here and I'll look it up for you!`,
    routes: `More about our routes:\n\n🚢 We operate sea cargo between Bohol and Manila\n🏠 Door-to-door service on both routes\n📅 Trip schedules depend on cargo volume\n📦 Both small and large packages accepted\n\nMessage us on Facebook for the latest trip schedules!`,
    payment: `More about payments:\n\n💵 Cash — collected during pickup or on delivery\n📱 GCash — scan a QR code to pay instantly\n⏳ Pay Later — available with admin approval, with a promised payment date\n👤 Either sender or receiver can be the payer\n\nPayment method is selected during the pickup process.`,
    delivery_time: `More about delivery:\n\n📅 Typical transit: 3–5 business days\n🚢 Depends on the shipping schedule and route\n📡 Track your package in real-time\n📞 Receiver is contacted before delivery\n\nFor urgent shipments, message us on Facebook!`,
    contact: `More ways to reach us:\n\n📘 Facebook: facebook.com/marlon.sarong.cargodeliveryservice\n🕐 Response hours: Mon–Sat, business hours\n💬 You can also send a message through our About page\n\nWe typically respond within a few hours!`,
  };
  return details[topicId] || null;
};

// ── Session Persistence ─────────────────────────────────────────────────────
const STORAGE_KEY = 'cargoexpress_chat';

export const saveChat = (data) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
};

export const loadChat = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearChat = () => {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
};
