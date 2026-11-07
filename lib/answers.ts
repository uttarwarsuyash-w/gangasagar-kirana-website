// "Quick answers" built from the store's settings (verified rules), shared by the FAQ page and
// the help pop-up. Not invented FAQs: each answer restates a rule the store set.
import type { FeeSettings } from './commerce/rules'
import { SITE } from './site'

export interface Answer {
  id: string
  topic: 'orders' | 'delivery' | 'payment' | 'wholesale' | 'products' | 'account' | 'general'
  q_en: string
  q_hi: string
  a_en: string
  a_hi: string
  keywords: string[]
}

export function quickAnswers(f: FeeSettings, pincodes: string[]): Answer[] {
  const kg = (g: number) => `${g / 1000} kg`
  const kgHi = (g: number) => `${g / 1000} किलो`
  return [
    {
      id: 'hours',
      topic: 'general',
      q_en: 'When is the store open?',
      q_hi: 'दुकान कब खुली रहती है?',
      a_en: 'Every day, 8:00 AM to 8:00 PM. There is no weekly holiday.',
      a_hi: 'हर दिन सुबह 8:00 से रात 8:00 बजे तक। कोई साप्ताहिक छुट्टी नहीं।',
      keywords: ['hours', 'open', 'timing', 'time', 'close', 'sunday', 'holiday', 'समय', 'खुली', 'बंद', 'छुट्टी', 'vel', 'वेळ'],
    },
    {
      id: 'delivery-fees',
      topic: 'delivery',
      q_en: 'What does delivery cost in Nanded?',
      q_hi: 'नांदेड़ में डिलीवरी चार्ज कितना है?',
      a_en: `Free for orders of ₹${f.free_delivery_min_value} or more. Under ₹${f.free_delivery_min_value}: ₹${f.fee_heavy} if the order weighs ${kg(f.heavy_weight_g)} or more, otherwise ₹${f.fee_light}. Store pickup is always free.`,
      a_hi: `₹${f.free_delivery_min_value} या ज़्यादा के ऑर्डर पर मुफ़्त। ₹${f.free_delivery_min_value} से कम पर: ऑर्डर ${kgHi(f.heavy_weight_g)} या ज़्यादा हो तो ₹${f.fee_heavy}, नहीं तो ₹${f.fee_light}। दुकान पिकअप हमेशा मुफ़्त।`,
      keywords: ['delivery', 'charge', 'fee', 'shipping', 'free', 'cost', 'डिलीवरी', 'चार्ज', 'मुफ़्त', 'मुफ्त', 'शुल्क'],
    },
    {
      id: 'area',
      topic: 'delivery',
      q_en: 'Which areas do you deliver to?',
      q_hi: 'आप कहाँ डिलीवरी करते हैं?',
      a_en: `Home delivery in Nanded to these pincodes: ${pincodes.join(', ')}. Outside Nanded we send by courier or transport service.`,
      a_hi: `नांदेड़ में इन पिनकोड पर होम डिलीवरी: ${pincodes.join(', ')}। नांदेड़ के बाहर कूरियर या ट्रांसपोर्ट से भेजते हैं।`,
      keywords: ['area', 'pincode', 'deliver', 'where', 'location', 'पिनकोड', 'इलाक़ा', 'कहाँ'],
    },
    {
      id: 'outside',
      topic: 'delivery',
      q_en: 'Do you send orders outside Nanded?',
      q_hi: 'क्या आप नांदेड़ के बाहर भेजते हैं?',
      a_en: `Yes, with no minimum order. Under ${kg(f.bulk_threshold_g)} it is a flat ₹${f.outside_flat_fee} by courier or transport service. For ${kg(f.bulk_threshold_g)} or more the store sends a quotation with shipping. Payment is by UPI before the order is processed.`,
      a_hi: `हाँ, कोई न्यूनतम ऑर्डर नहीं। ${kgHi(f.bulk_threshold_g)} से कम पर कूरियर या ट्रांसपोर्ट के लिए ₹${f.outside_flat_fee}। ${kgHi(f.bulk_threshold_g)} या ज़्यादा पर दुकान शिपिंग सहित कोटेशन भेजती है। भुगतान ऑर्डर तैयार होने से पहले UPI से।`,
      keywords: ['outside', 'courier', 'transport', 'other city', 'bahar', 'बाहर', 'कूरियर', 'ट्रांसपोर्ट', 'pune', 'mumbai', 'hyderabad'],
    },
    {
      id: 'pay',
      topic: 'payment',
      q_en: 'How can I pay?',
      q_hi: 'भुगतान कैसे करें?',
      a_en: 'In Nanded, pay by cash or UPI when your order arrives or when you pick it up. Outside Nanded, pay by UPI first and add the UPI reference number in your account.',
      a_hi: 'नांदेड़ में, सामान आने पर या पिकअप पर नकद या UPI से भुगतान करें। नांदेड़ के बाहर, पहले UPI से भुगतान करें और खाते में UPI रेफ़रेंस नंबर जोड़ें।',
      keywords: ['pay', 'payment', 'upi', 'cash', 'gpay', 'phonepe', 'paytm', 'card', 'भुगतान', 'पैसे', 'नकद', 'यूपीआई'],
    },
    {
      id: 'wholesale',
      topic: 'wholesale',
      q_en: 'Do you sell wholesale?',
      q_hi: 'क्या आप थोक में बेचते हैं?',
      a_en: `Yes. For ${kg(f.bulk_threshold_g)} or more combined, request a wholesale price. The store sends a quotation on WhatsApp with prices, shipping and how long the price is valid.`,
      a_hi: `हाँ। कुल ${kgHi(f.bulk_threshold_g)} या ज़्यादा के लिए थोक दाम माँगें। दुकान व्हाट्सऐप पर दाम, शिपिंग और वैधता के साथ कोटेशन भेजती है।`,
      keywords: ['wholesale', 'bulk', 'quotation', 'quote', 'sack', 'reseller', 'shopkeeper', 'थोक', 'कोटेशन', 'बोरी', 'दुकानदार'],
    },
    {
      id: 'loose',
      topic: 'products',
      q_en: 'Can I buy a small amount?',
      q_hi: 'क्या थोड़ी मात्रा ले सकते हैं?',
      a_en: `Yes. Loose items start at ${f.loose_min_g} g and go up in ${f.loose_step_g} g steps. For any other amount from ${f.custom_min_g} g, use "Request a custom amount" on the product page.`,
      a_hi: `हाँ। खुला सामान ${f.loose_min_g} ग्राम से शुरू होता है और ${f.loose_step_g} ग्राम के हिसाब से बढ़ता है। ${f.custom_min_g} ग्राम से किसी और मात्रा के लिए उत्पाद पेज पर "अपनी मात्रा माँगें" चुनें।`,
      keywords: ['small', 'quantity', 'gram', 'minimum', '250', 'loose', 'amount', 'मात्रा', 'ग्राम', 'थोड़ा', 'खुला'],
    },
    {
      id: 'cancel',
      topic: 'orders',
      q_en: 'Can I cancel an order?',
      q_hi: 'क्या ऑर्डर रद्द कर सकते हैं?',
      a_en: 'Until it is dispatched, request a cancellation from your account. The store approves or rejects it. For anything else, call or WhatsApp the store.',
      a_hi: 'भेजे जाने तक, खाते से रद्द करने का अनुरोध करें। दुकान स्वीकार या अस्वीकार करती है। बाक़ी किसी बात के लिए दुकान को कॉल या व्हाट्सऐप करें।',
      keywords: ['cancel', 'cancellation', 'रद्द', 'कैंसल'],
    },
    {
      id: 'problem',
      topic: 'orders',
      q_en: 'Something is wrong with my order. What do I do?',
      q_hi: 'मेरे ऑर्डर में कुछ ग़लत है। क्या करूँ?',
      a_en: `Call or WhatsApp the store on ${SITE.phones.main} or ${SITE.phones.support}. There is no online return form.`,
      a_hi: `दुकान को ${SITE.phones.main} या ${SITE.phones.support} पर कॉल या व्हाट्सऐप करें। ऑनलाइन वापसी फ़ॉर्म नहीं है।`,
      keywords: ['wrong', 'problem', 'return', 'replace', 'damaged', 'missing', 'refund', 'complaint', 'ग़लत', 'गलत', 'वापसी', 'शिकायत', 'ख़राब', 'खराब'],
    },
    {
      id: 'track',
      topic: 'orders',
      q_en: 'How do I track my order?',
      q_hi: 'ऑर्डर ट्रैक कैसे करें?',
      a_en: 'Sign in and open Account, then Orders. Each order shows its status from Order Placed to Delivered.',
      a_hi: 'साइन इन करें और खाता, फिर ऑर्डर खोलें। हर ऑर्डर की स्थिति ऑर्डर मिला से पहुँच गया तक दिखती है।',
      keywords: ['track', 'status', 'where is my order', 'order', 'ट्रैक', 'स्थिति', 'ऑर्डर'],
    },
    {
      id: 'signin',
      topic: 'account',
      q_en: 'Why do I need to sign in?',
      q_hi: 'साइन इन क्यों ज़रूरी है?',
      a_en: 'You can browse and fill your bag without signing in. To place an order, sign in with Google so you can track it and reorder later. Your bag stays as it is.',
      a_hi: 'साइन इन किए बिना आप सामान देख सकते हैं और थैली भर सकते हैं। ऑर्डर देने के लिए गूगल से साइन इन करें, ताकि ट्रैक और दोबारा ऑर्डर कर सकें। आपकी थैली वैसी ही रहती है।',
      keywords: ['sign in', 'login', 'account', 'google', 'otp', 'password', 'साइन', 'लॉगिन', 'खाता'],
    },
    {
      id: 'contact',
      topic: 'general',
      q_en: 'How do I contact the store?',
      q_hi: 'दुकान से संपर्क कैसे करें?',
      a_en: `Call or WhatsApp Laxmikant ji on ${SITE.phones.main}, or support on ${SITE.phones.support}. The store is at Gokul Nagar, Nanded.`,
      a_hi: `लक्ष्मीकांत जी को ${SITE.phones.main} पर, या सहायता के लिए ${SITE.phones.support} पर कॉल या व्हाट्सऐप करें। दुकान गोकुल नगर, नांदेड़ में है।`,
      keywords: ['contact', 'phone', 'number', 'call', 'whatsapp', 'address', 'संपर्क', 'नंबर', 'फ़ोन', 'पता'],
    },
  ]
}

/** Very small keyword matcher for the help pop-up. Returns the best answer or null. */
export function matchAnswer(q: string, list: Answer[]): Answer | null {
  const n = q.toLowerCase().normalize('NFKC')
  let best: [number, Answer] | null = null
  for (const a of list) {
    let s = 0
    for (const k of a.keywords) if (n.includes(k.toLowerCase())) s += k.length > 4 ? 2 : 1
    for (const w of [a.q_en, a.q_hi].join(' ').toLowerCase().split(/\s+/)) if (w.length > 3 && n.includes(w)) s += 1
    if (s > 0 && (!best || s > best[0])) best = [s, a]
  }
  return best && best[0] >= 1 ? best[1] : null
}
