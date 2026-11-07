"""Builds the seed catalogue for Gangasagar Kirana Stores.

Outputs (all generated, do not hand-edit):
  seed/catalogue.json   used by the static build and the demo database
  seed/catalogue.xlsx   the same rows in the admin Excel import/export format
  seed/catalogue.csv    same, as CSV
  supabase/seed.sql     INSERT statements for categories, products and variants

Every price and stock number here is a SAMPLE (price_is_sample / stock_is_sample = true).
Names are generic on purpose, except the products the store photographed itself.
"""
import csv, json, math, os, re
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ------------------------------------------------------------------ categories
# slug, en, hi, pour kind (3D pieces used on the masthead), pouch colour
CATEGORIES = [
    ("specials", "Gangasagar specials", "गंगासागर स्पेशल", "peanut", "#B3263A"),
    ("namkeen", "Namkeen and chips", "नमकीन और चिप्स", "chana_salted", "#D9822B"),
    ("chikki-sweets", "Chikki and sweets", "चिक्की और मिठाई", "chikki", "#9A5B2E"),
    ("candies", "Candies and mouth fresheners", "टॉफ़ी और मुखवास", "orange_candy", "#E46A2E"),
    ("rice", "Rice", "चावल", "rice", "#8C8A7E"),
    ("wheat-flours", "Wheat, millets and flours", "गेहूं, मोटा अनाज और आटा", "wheat", "#C08A3E"),
    ("dals", "Dals and pulses", "दालें और दलहन", "dal_toor", "#D6A21E"),
    ("oils-ghee", "Edible oils and ghee", "खाद्य तेल और घी", None, "#C9A227"),
    ("sugar-salt", "Sugar, jaggery and salt", "चीनी, गुड़ और नमक", "sugar", "#7E8C9A"),
    ("whole-spices", "Whole spices", "खड़े मसाले", "pea_black", "#6B3E2A"),
    ("ground-spices", "Ground spices and masalas", "पिसे मसाले", None, "#B8451F"),
    ("dry-fruits", "Dry fruits and nuts", "सूखे मेवे", "cashew", "#A0704A"),
    ("fasting", "Fasting (upvas)", "उपवास", "sabudana", "#6F8F5E"),
    ("breakfast", "Breakfast and staples", "नाश्ता और रोज़मर्रा", "poha", "#B79B5B"),
    ("tea-coffee", "Tea and coffee", "चाय और कॉफ़ी", None, "#4E3B30"),
    ("pickles", "Pickles and condiments", "अचार और चटपटे", None, "#9E3B2A"),
    ("pooja", "Pooja essentials", "पूजा सामग्री", None, "#C8662B"),
    ("home-care", "Home care", "घर की सफ़ाई", None, "#3E6E8E"),
    ("personal-care", "Personal care", "निजी देखभाल", None, "#5E7FA0"),
    ("biscuits-drinks", "Biscuits, chocolates and drinks", "बिस्कुट, चॉकलेट और पेय", None, "#5B3A29"),
]

# ------------------------------------------------------------------ helpers
STD_LOOSE = [500, 1000, 5000, 25000]


def rnd(x, step=1):
    """Round a rupee amount: under 100 to the rupee, above to 5."""
    if x >= 100:
        step = 5
    return float(max(step, round(x / step) * step))


def g_label(g):
    if g >= 1000:
        kg = g / 1000
        return (f"{kg:g} kg", f"{kg:g} किलो")
    return (f"{g} g", f"{g} ग्राम")


P = []  # products


def loose(cat, slug, en, hi, syn, per_kg, packs=STD_LOOSE, pour=None, special=False, photo=None, max_g=None):
    P.append(dict(category=cat, id=slug, en=en, hi=hi, syn=syn, sell="loose", per_kg=per_kg, packs=packs,
                  pour=pour, special=special, photo=photo, max_g=max_g))


def packed(cat, slug, en, hi, syn, per_kg, sizes, pour=None, photo=None, special=False):
    P.append(dict(category=cat, id=slug, en=en, hi=hi, syn=syn, sell="packed", per_kg=per_kg, sizes=sizes,
                  pour=pour, photo=photo, special=special))


def litre(cat, slug, en, hi, syn, per_l, sizes):
    P.append(dict(category=cat, id=slug, en=en, hi=hi, syn=syn, sell="litre", per_l=per_l, sizes=sizes))


def piece(cat, slug, en, hi, syn, variants):
    # variants: list of (label_en, label_hi, price, weight_g)
    P.append(dict(category=cat, id=slug, en=en, hi=hi, syn=syn, sell="piece", pieces=variants))


# ------------------------------------------------------------------ 1 specials
S = "specials"
loose(S, "raw-peanuts", "Raw peanuts", "कच्ची मूंगफली", "peanut moongfali mungfali shengdana singdana groundnut मूंगफली शेंगदाणे", 140, pour="peanut", special=True, photo="01-peanuts")
loose(S, "roasted-salted-peanuts", "Roasted salted peanuts", "भुनी नमकीन मूंगफली", "peanut moongfali shengdana bhuni roasted salted खारे शेंगदाणे", 180, pour="peanut_roasted", special=True)
loose(S, "masala-peanuts", "Masala peanuts", "मसाला मूंगफली", "peanut masala moongfali coated shengdana मसाला शेंगदाणे", 220, pour="peanut_masala", special=True)
loose(S, "roasted-chana-with-salt", "Roasted chana with salt", "नमकीन भुने चने", "chana roasted chane phutane futane salted bhune chane फुटाणे भुने चने", 140, pour="chana_salted", special=True, photo="02-roasted-chana-with-salt")
loose(S, "roasted-chana-without-salt", "Roasted chana without salt", "बिना नमक भुने चने", "chana roasted chane phutane futane plain unsalted फुटाणे", 130, pour="chana_plain", special=True, photo="03-roasted-chana-without-salt")
loose(S, "masala-green-peas", "Masala green peas", "मसाला हरे मटर", "green peas matar vatane masala fried hare matar मटर वाटाणे", 200, pour="pea_green", special=True, photo="04-masala-green-peas")
loose(S, "roasted-yellow-peas", "Roasted yellow peas", "भुने पीले मटर", "yellow peas matar vatane roasted pile matar पिवळे वाटाणे", 120, pour="pea_yellow", special=True, photo="05-roasted-yellow-peas")
loose(S, "raw-popcorn-maize", "Raw popcorn maize", "पॉपकॉर्न मक्का", "popcorn makka maize corn makai मक्का मका", 100, pour="maize")
loose(S, "kurmura", "Puffed rice (kurmura)", "मुरमुरे (कुरमुरा)", "kurmura murmura churmuri puffed rice mamra kurmure मुरमुरे चुरमुरे", 80, packs=[500, 1000, 5000], pour="kurmura")

# ------------------------------------------------------------------ 2 namkeen
N = "namkeen"
for slug, en, hi, syn, pk in [
    ("potato-chips", "Potato chips", "आलू चिप्स", "potato chips wafers aloo batata वेफर्स", 360),
    ("banana-chips", "Banana chips", "केले के चिप्स", "banana chips kela keli wafers केळी", 320),
    ("sabudana-chips", "Sabudana chips", "साबूदाना चिप्स", "sabudana chips papad fryums साबुदाणा", 260),
    ("rings-snack", "Rings snack", "रिंग्स स्नैक", "rings snack fryums kurkure", 300),
    ("poha-chivda", "Poha chivda", "पोहा चिवड़ा", "chivda chiwda poha namkeen चिवडा", 220),
    ("farsan-mix", "Farsan mix", "फरसाण मिक्स", "farsan mixture namkeen mix फरसाण", 240),
    ("fine-sev", "Fine sev", "बारीक सेव", "sev barik nylon sev शेव", 240),
    ("bhujia", "Bhujia", "भुजिया", "bhujia bhujiya aloo bhujia", 260),
    ("moong-dal-namkeen", "Moong dal namkeen", "मूंग दाल नमकीन", "moong dal namkeen fried moong मूग डाळ", 300),
    ("chakli", "Chakli", "चकली", "chakli chakri murukku", 300),
]:
    packed(N, slug, en, hi, syn, pk, [100, 200, 500, 1000])

# ------------------------------------------------------------------ 3 chikki and sweets
C = "chikki-sweets"
piece(C, "rk-peanut-chikki", "RK peanut chikki", "आरके मूंगफली चिक्की", "chikki peanut rk shengdana chikki गुड पट्टी", [
    ("1 pack", "1 पैक", 10.0, 40), ("Pack of 12", "12 पैक", 110.0, 480), ("Box of 48", "48 का डिब्बा", 420.0, 1950)])
P[-1].update(photo="07-rk-peanut-chikki", pour="chikki", special=True)
for slug, en, hi, syn, pk in [
    ("rajgira-chikki", "Rajgira chikki", "राजगिरा चिक्की", "rajgira chikki amaranth ramdana राजगिरा", 300),
    ("til-chikki", "Til chikki", "तिल चिक्की", "til chikki sesame tilgul तीळ", 320),
    ("dry-fruit-chikki", "Dry-fruit chikki", "ड्राई फ्रूट चिक्की", "dry fruit chikki kaju badam", 900),
    ("revdi", "Revdi", "रेवड़ी", "revdi rewari rewdi til gud", 240),
    ("gajak", "Gajak", "गजक", "gajak gazak til gud", 360),
]:
    packed(C, slug, en, hi, syn, pk, [250, 500, 1000])

# ------------------------------------------------------------------ 4 candies
D = "candies"
packed(D, "orange-candy", "Orange candy", "ऑरेंज कैंडी", "orange candy goli santra goli toffee संत्रा गोळी", 200, [100, 250, 500, 1000], pour="orange_candy", photo="06-orange-candy", special=True)
for slug, en, hi, syn, pk in [
    ("assorted-candies", "Assorted candies", "मिक्स टॉफ़ी", "candy toffee goli mix chocolate", 240),
    ("tamarind-candy", "Tamarind candy", "इमली कैंडी", "imli candy chinch goli tamarind चिंच", 240),
    ("khatti-meethi-goli", "Khatti-meethi goli", "खट्टी-मीठी गोली", "khatti meethi goli candy", 200),
    ("saunf-mukhwas", "Saunf mukhwas", "सौंफ मुखवास", "mukhwas saunf mouth freshener बडीशेप", 360),
    ("roasted-dhana-dal", "Roasted dhana dal", "भुनी धना दाल", "dhana dal mukhwas coriander", 400),
]:
    packed(D, slug, en, hi, syn, pk, [100, 250, 500, 1000])

# ------------------------------------------------------------------ 5 rice
R = "rice"
RICE_PACKS = [1000, 5000, 10000, 25000]
for slug, en, hi, syn, pk in [
    ("basmati-rice", "Basmati rice", "बासमती चावल", "basmati chawal tandul rice बासमती तांदूळ", 110),
    ("kolam-rice", "Kolam rice", "कोलम चावल", "kolam chawal tandul rice कोलम तांदूळ", 60),
    ("indrayani-rice", "Indrayani rice", "इंद्रायणी चावल", "indrayani chawal tandul rice इंद्रायणी", 62),
    ("ambemohar-rice", "Ambemohar rice", "आंबेमोहर चावल", "ambemohar chawal tandul rice आंबेमोहर", 95),
    ("sona-masoori-rice", "Sona Masoori rice", "सोना मसूरी चावल", "sona masoori masuri chawal rice", 58),
    ("hmt-rice", "HMT rice", "एचएमटी चावल", "hmt chawal tandul rice", 56),
    ("broken-rice", "Broken rice", "टूटा चावल", "broken rice tukda chawal kani कणी", 36),
]:
    loose(R, slug, en, hi, syn, pk, packs=RICE_PACKS, pour="rice")

# ------------------------------------------------------------------ 6 wheat, millets, flours
W = "wheat-flours"
FLOUR_PACKS = [1000, 5000, 10000, 25000]
for slug, en, hi, syn, pk, pour in [
    ("wheat-lokwan", "Wheat (Lokwan)", "गेहूं (लोकवन)", "wheat gehu gahu lokwan गहू", 36, "wheat"),
    ("wheat-sharbati", "Wheat (Sharbati)", "गेहूं (शरबती)", "wheat gehu gahu sharbati गहू", 46, "wheat"),
    ("chakki-atta", "Chakki atta", "चक्की आटा", "atta wheat flour gehu ka aata kanik pith कणिक", 42, None),
    ("jowar", "Jowar", "ज्वार", "jowar jwari sorghum ज्वारी", 44, "pea_white"),
    ("bajra", "Bajra", "बाजरा", "bajra bajri pearl millet बाजरी", 34, "millet"),
    ("jowar-flour", "Jowar flour", "ज्वार का आटा", "jowar atta jwari pith ज्वारी पीठ", 52, None),
    ("bajra-flour", "Bajra flour", "बाजरे का आटा", "bajra atta bajri pith बाजरी पीठ", 42, None),
    ("ragi", "Ragi (nachni)", "रागी (नाचनी)", "ragi nachni finger millet नाचणी", 60, "millet"),
    ("maida", "Maida", "मैदा", "maida refined flour", 44, None),
    ("besan", "Besan", "बेसन", "besan gram flour chana atta", 100, None),
    ("rava", "Rava (sooji)", "रवा (सूजी)", "rava sooji suji semolina रवा", 46, None),
    ("rice-flour", "Rice flour", "चावल का आटा", "rice flour chawal atta tandul pith", 50, None),
    ("makka-flour", "Makka flour", "मक्के का आटा", "makka atta maize flour corn", 50, None),
]:
    loose(W, slug, en, hi, syn, pk, packs=FLOUR_PACKS, pour=pour)

# ------------------------------------------------------------------ 7 dals and pulses
L = "dals"
for slug, en, hi, syn, pk, pour in [
    ("toor-dal", "Toor dal", "तूर दाल", "toor tur tuvar arhar dal तूर डाळ अरहर", 150, "dal_toor"),
    ("moong-dal", "Moong dal", "मूंग दाल", "moong mung dal split मूग डाळ", 120, "dal_moong"),
    ("whole-moong", "Whole moong", "साबुत मूंग", "moong whole green gram mung मूग", 115, "moong_whole"),
    ("masoor-dal", "Masoor dal", "मसूर दाल", "masoor masur dal red lentil", 100, "dal_masoor"),
    ("whole-masoor", "Whole masoor", "साबुत मसूर", "masoor whole lentil brown", 95, "masoor_whole"),
    ("urad-dal", "Urad dal", "उड़द दाल", "urad udid dal white उडीद डाळ", 125, "dal_urad"),
    ("whole-urad", "Whole urad", "साबुत उड़द", "urad whole black gram udid उडीद", 115, "pea_black"),
    ("chana-dal", "Chana dal", "चना दाल", "chana dal harbhara dal हरभरा डाळ", 90, "dal_toor"),
    ("kabuli-chana", "Kabuli chana", "काबुली चना", "kabuli chana chole chickpea kabuli harbhara", 120, "chana_kabuli"),
    ("kala-chana", "Kala chana", "काला चना", "kala chana black chickpea harbhara", 85, "chana_kala"),
    ("rajma", "Rajma", "राजमा", "rajma kidney beans", 140, "rajma"),
    ("matki", "Matki", "मटकी", "matki moth beans मटकी", 120, "moong_whole_brown"),
    ("chawli", "Chawli", "चवली", "chawli lobia black eyed beans चवळी", 110, "chawli"),
    ("white-vatana", "White vatana", "सफ़ेद मटर", "white vatana safed matar peas वाटाणे", 80, "pea_white"),
    ("dried-green-peas", "Dried green peas", "सूखे हरे मटर", "green vatana hare matar dried peas हिरवे वाटाणे", 100, "pea_green_dry"),
]:
    loose(L, slug, en, hi, syn, pk, pour=pour)

# ------------------------------------------------------------------ 8 oils and ghee
O = "oils-ghee"
OIL = [(1, "1 L pouch", "1 लीटर पाउच", 920), (5, "5 L can", "5 लीटर कैन", 4750), (15, "15 L tin", "15 लीटर टिन", 14500)]
for slug, en, hi, syn, pl in [
    ("groundnut-oil", "Groundnut oil", "मूंगफली तेल", "groundnut oil shengdana tel moongfali tel शेंगदाणा तेल", 190),
    ("sunflower-oil", "Sunflower oil", "सूरजमुखी तेल", "sunflower oil suryaful tel refined", 150),
    ("soybean-oil", "Soybean oil", "सोयाबीन तेल", "soybean oil soya tel refined", 135),
    ("safflower-oil", "Safflower (kardi) oil", "करडी तेल", "kardi oil safflower करडई तेल", 230),
    ("mustard-oil", "Mustard oil", "सरसों तेल", "mustard oil sarson mohri tel", 170),
    ("til-oil", "Til oil", "तिल तेल", "til oil sesame gingelly तीळ तेल", 300),
]:
    litre(O, slug, en, hi, syn, pl, OIL)
packed(O, "cow-ghee", "Cow ghee", "गाय का घी", "ghee cow ghee tup तूप", 650, [200, 500, 1000])
packed(O, "vanaspati", "Vanaspati", "वनस्पति", "vanaspati dalda vanaspati ghee", 150, [500, 1000])

# ------------------------------------------------------------------ 9 sugar, jaggery, salt
G = "sugar-salt"
loose(G, "sugar", "Sugar", "चीनी", "sugar chini shakkar sakhar साखर शक्कर", 46, packs=[500, 1000, 5000, 50000], pour="sugar", max_g=50000)
loose(G, "jaggery-block", "Jaggery block (gul)", "गुड़ (भेली)", "jaggery gul gud गूळ", 60, packs=[500, 1000, 5000], pour="jaggery")
packed(G, "jaggery-powder", "Jaggery powder", "गुड़ पाउडर", "jaggery powder gul powder gud", 80, [500, 1000, 5000])
loose(G, "khadi-sakhar", "Khadi sakhar (mishri)", "खड़ी शक्कर (मिश्री)", "khadi sakhar mishri rock sugar खडीसाखर", 90, packs=[500, 1000], pour="mishri")
packed(G, "iodised-salt", "Iodised salt", "आयोडीन नमक", "salt namak mith iodised मीठ", 24, [1000])
packed(G, "rock-salt", "Rock salt (sendha)", "सेंधा नमक", "rock salt sendha namak upvas mith", 80, [500, 1000])
packed(G, "black-salt", "Black salt", "काला नमक", "black salt kala namak sanchal", 100, [100, 500])

# ------------------------------------------------------------------ 10 whole spices
H = "whole-spices"
SP = [50, 100, 250, 500, 1000]
for slug, en, hi, syn, pk in [
    ("jeera", "Jeera", "जीरा", "jeera jira cumin जिरे", 600),
    ("mohri", "Mohri (mustard seeds)", "राई (मोहरी)", "mohri rai mustard seeds मोहरी", 120),
    ("dhania-seeds", "Dhania seeds", "साबुत धनिया", "dhania coriander seeds dhane धणे", 160),
    ("methi-seeds", "Methi seeds", "मेथी दाना", "methi fenugreek seeds मेथी", 120),
    ("ajwain", "Ajwain", "अजवाइन", "ajwain ova carom ओवा", 280),
    ("saunf", "Saunf", "सौंफ", "saunf fennel badishep बडीशेप", 240),
    ("black-pepper", "Black pepper", "काली मिर्च", "kali mirch black pepper miri मिरी", 900),
    ("cloves", "Cloves", "लौंग", "laung lavang cloves लवंग", 1400),
    ("green-cardamom", "Green cardamom", "हरी इलायची", "elaichi cardamom veldode वेलची", 3000),
    ("cinnamon", "Cinnamon", "दालचीनी", "dalchini cinnamon", 500),
    ("bay-leaf", "Bay leaf", "तेज पत्ता", "tej patta bay leaf tamalpatra तमालपत्र", 200),
    ("star-anise", "Star anise", "चक्र फूल", "chakra phool star anise badiyan", 1200),
    ("black-cardamom", "Black cardamom", "बड़ी इलायची", "badi elaichi black cardamom masala velchi", 2000),
    ("dagad-phool", "Dagad phool", "दगड़ फूल", "dagad phool stone flower kalpasi दगडफूल", 1600),
    ("kalonji", "Kalonji", "कलौंजी", "kalonji nigella onion seeds", 400),
    ("til", "Til (sesame seeds)", "तिल", "til sesame seeds तीळ", 200),
    ("khus-khus", "Khus khus", "खसखस", "khus khus poppy seeds", 1600),
    ("dry-red-chilli", "Dry red chilli", "सूखी लाल मिर्च", "lal mirch dry red chilli sukhi mirchi मिरची", 300),
]:
    packed(H, slug, en, hi, syn, pk, SP)

# ------------------------------------------------------------------ 11 ground spices
M = "ground-spices"
for slug, en, hi, syn, pk, sizes in [
    ("turmeric-powder", "Turmeric powder", "हल्दी पाउडर", "haldi turmeric halad हळद", 280, [100, 200, 500, 1000]),
    ("red-chilli-powder", "Red chilli powder", "लाल मिर्च पाउडर", "lal mirch powder chilli tikhat मिरची पूड", 360, [100, 200, 500, 1000]),
    ("kashmiri-chilli-powder", "Kashmiri chilli powder", "कश्मीरी मिर्च पाउडर", "kashmiri mirch chilli powder", 560, [100, 200, 500]),
    ("dhania-powder", "Dhania powder", "धनिया पाउडर", "dhania powder coriander dhane pud", 240, [100, 200, 500, 1000]),
    ("jeera-powder", "Jeera powder", "जीरा पाउडर", "jeera powder cumin", 700, [50, 100, 200]),
    ("garam-masala", "Garam masala", "गरम मसाला", "garam masala", 900, [50, 100, 200]),
    ("goda-masala", "Goda masala", "गोडा मसाला", "goda masala kala masala maharashtrian", 700, [100, 200, 500]),
    ("kanda-lasun-masala", "Kanda-lasun masala", "कांदा-लसूण मसाला", "kanda lasun masala onion garlic", 500, [100, 200, 500]),
    ("hing", "Hing", "हींग", "hing asafoetida हिंग", 2400, [25, 50, 100]),
    ("amchur", "Amchur", "अमचूर", "amchur dry mango powder", 400, [50, 100, 200]),
]:
    packed(M, slug, en, hi, syn, pk, sizes)

# ------------------------------------------------------------------ 12 dry fruits
F = "dry-fruits"
DF = [100, 250, 500, 1000]
for slug, en, hi, syn, pk, pour in [
    ("cashew", "Cashew", "काजू", "kaju cashew काजू", 950, "cashew"),
    ("almond", "Almond", "बादाम", "badam almond", 900, "almond"),
    ("raisins", "Raisins", "किशमिश", "kishmish manuka raisins bedana", 400, "raisin"),
    ("walnut", "Walnut", "अखरोट", "akhrot walnut", 1100, None),
    ("dates", "Dates", "खजूर", "khajur dates", 260, None),
    ("anjeer", "Anjeer", "अंजीर", "anjeer fig", 1300, None),
    ("pistachio", "Pistachio", "पिस्ता", "pista pistachio", 1600, None),
    ("makhana", "Makhana", "मखाना", "makhana fox nut lotus seed", 1200, "popcorn"),
    ("dry-coconut", "Dry coconut (khobra)", "सूखा नारियल (खोबरा)", "khobra copra dry coconut sukha khobra", 260, None),
    ("charoli", "Charoli", "चिरौंजी", "charoli chironji", 2400, None),
    ("magaj", "Magaj (melon seeds)", "मगज (खरबूजे के बीज)", "magaj melon seeds charmagaj", 900, None),
]:
    packed(F, slug, en, hi, syn, pk, DF, pour=pour)

# ------------------------------------------------------------------ 13 fasting
U = "fasting"
UP = [250, 500, 1000]
for slug, en, hi, syn, pk, pour in [
    ("sabudana", "Sabudana", "साबूदाना", "sabudana sago tapioca pearls साबुदाणा", 90, "sabudana"),
    ("bhagar", "Bhagar (vari rice)", "भगर (वरई)", "bhagar vari rice samo sama varai वरई", 140, "millet"),
    ("rajgira-seeds", "Rajgira seeds", "राजगिरा", "rajgira amaranth ramdana seeds", 150, "millet"),
    ("rajgira-flour", "Rajgira flour", "राजगिरा आटा", "rajgira atta amaranth flour", 200, None),
    ("shingada-flour", "Shingada flour", "सिंघाड़ा आटा", "shingada singhara water chestnut flour", 300, None),
    ("upvas-bhajani", "Upvas bhajani", "उपवास भाजणी", "upvas bhajani fasting flour thalipeeth", 280, None),
]:
    packed(U, slug, en, hi, syn, pk, UP, pour=pour)

# ------------------------------------------------------------------ 14 breakfast
B = "breakfast"
BP = [200, 500, 1000]
for slug, en, hi, syn, pk, pour in [
    ("thick-poha", "Thick poha", "मोटा पोहा", "poha pohe thick jada pohe पोहे", 60, "poha"),
    ("thin-poha", "Thin poha", "पतला पोहा", "poha pohe thin patal pohe", 64, "poha"),
    ("vermicelli", "Vermicelli (shevaya)", "सेवइयां (शेवया)", "shevaya sevai vermicelli seviyan शेवया", 120, None),
    ("rice-papad", "Rice papad", "चावल पापड़", "papad rice papad tandul papad", 300, None),
    ("urad-papad", "Urad papad", "उड़द पापड़", "papad urad udid papad", 340, None),
    ("kurdai", "Kurdai", "कुरडई", "kurdai wheat fryums", 260, None),
]:
    packed(B, slug, en, hi, syn, pk, BP, pour=pour)

# ------------------------------------------------------------------ 15 tea and coffee
T = "tea-coffee"
packed(T, "tea-leaf", "Tea leaf", "चाय पत्ती", "chai patti tea leaf chaha", 520, [250, 500, 1000])
packed(T, "tea-dust", "Tea dust", "चाय डस्ट", "chai dust tea powder chaha pud", 480, [250, 500, 1000])
packed(T, "coffee-powder", "Coffee powder", "कॉफ़ी पाउडर", "coffee powder", 900, [50, 100, 200, 500])

# ------------------------------------------------------------------ 16 pickles
K = "pickles"
for slug, en, hi, syn, pk in [
    ("mango-pickle", "Mango pickle", "आम का अचार", "aam achar mango pickle loncha लोणचे", 220),
    ("lemon-pickle", "Lemon pickle", "नींबू का अचार", "nimbu achar lemon pickle limbu loncha", 220),
    ("mixed-pickle", "Mixed pickle", "मिक्स अचार", "mix achar mixed pickle", 220),
]:
    packed(K, slug, en, hi, syn, pk, [200, 500, 1000])
packed(K, "tamarind", "Tamarind (chinch)", "इमली (चिंच)", "imli chinch tamarind चिंच", 160, [250, 500, 1000])
packed(K, "kokum", "Kokum", "कोकम", "kokum amsul", 360, [100, 250, 500])
piece(K, "vinegar", "Vinegar", "सिरका", "vinegar sirka", [("500 ml bottle", "500 मि.ली. बोतल", 40.0, 560)])

# ------------------------------------------------------------------ 17 pooja
J = "pooja"
for slug, en, hi, syn, vs in [
    ("agarbatti", "Agarbatti", "अगरबत्ती", "agarbatti incense sticks udbatti", [("Small pack", "छोटा पैक", 20.0, 40), ("Large pack", "बड़ा पैक", 60.0, 120)]),
    ("camphor", "Camphor", "कपूर", "kapur camphor karpur", [("25 g", "25 ग्राम", 50.0, 30), ("100 g", "100 ग्राम", 180.0, 110)]),
    ("kumkum", "Kumkum", "कुमकुम", "kumkum kunku sindoor", [("50 g", "50 ग्राम", 20.0, 55)]),
    ("pooja-haldi", "Pooja haldi", "पूजा हल्दी", "haldi pooja turmeric halad", [("100 g", "100 ग्राम", 30.0, 105)]),
    ("cotton-wicks", "Cotton wicks", "रुई की बत्ती", "batti wicks cotton phulvati वाती", [("Round wicks pack", "गोल बत्ती पैक", 20.0, 20), ("Long wicks pack", "लंबी बत्ती पैक", 20.0, 20)]),
    ("diya-oil", "Diya oil", "दीया तेल", "diya oil deepak tel pooja oil", [("500 ml", "500 मि.ली.", 70.0, 470), ("1 L", "1 लीटर", 135.0, 930)]),
    ("matchbox", "Matchbox", "माचिस", "machis matchbox kadepeti काडेपेटी", [("Pack of 10", "10 का पैक", 20.0, 100)]),
]:
    piece(J, slug, en, hi, syn, vs)

# ------------------------------------------------------------------ 18 home care
Hc = "home-care"
for slug, en, hi, syn, vs in [
    ("detergent-powder", "Detergent powder", "डिटर्जेंट पाउडर", "detergent powder surf washing powder", [("500 g", "500 ग्राम", 60.0, 510), ("1 kg", "1 किलो", 110.0, 1010)]),
    ("detergent-bar", "Detergent bar", "कपड़े धोने का साबुन", "detergent bar washing soap sabun", [("1 bar", "1 बार", 10.0, 150), ("Pack of 4", "4 का पैक", 38.0, 600)]),
    ("dishwash-bar", "Dishwash bar", "बर्तन धोने का साबुन", "dishwash bar bartan sabun bhandi", [("1 bar", "1 बार", 10.0, 130), ("Large bar", "बड़ा बार", 30.0, 300)]),
    ("dishwash-liquid", "Dishwash liquid", "बर्तन धोने का लिक्विड", "dishwash liquid gel", [("250 ml", "250 मि.ली.", 55.0, 280), ("500 ml", "500 मि.ली.", 105.0, 550)]),
    ("floor-cleaner", "Floor cleaner", "फ़र्श क्लीनर", "floor cleaner phenyl liquid", [("500 ml", "500 मि.ली.", 99.0, 560), ("1 L", "1 लीटर", 185.0, 1100)]),
    ("toilet-cleaner", "Toilet cleaner", "टॉयलेट क्लीनर", "toilet cleaner", [("500 ml", "500 मि.ली.", 95.0, 580)]),
    ("phenyl", "Phenyl", "फिनाइल", "phenyl phenol", [("1 L", "1 लीटर", 70.0, 1080)]),
    ("steel-scrubber", "Steel scrubber", "स्टील स्क्रबर", "steel scrubber jaali bartan", [("1 piece", "1 पीस", 15.0, 20), ("Pack of 3", "3 का पैक", 40.0, 60)]),
    ("garbage-bags", "Garbage bags", "कचरा थैली", "garbage bags dustbin bags", [("Medium, roll of 30", "मीडियम, 30 का रोल", 60.0, 180), ("Large, roll of 15", "लार्ज, 15 का रोल", 70.0, 200)]),
    ("candles", "Candles", "मोमबत्ती", "candles mombatti menbatti", [("Pack of 6", "6 का पैक", 40.0, 240)]),
]:
    piece(Hc, slug, en, hi, syn, vs)

# ------------------------------------------------------------------ 19 personal care
Pc = "personal-care"
for slug, en, hi, syn, vs in [
    ("bath-soap", "Bath soap", "नहाने का साबुन", "bath soap sabun", [("1 bar", "1 बार", 35.0, 110), ("Pack of 4", "4 का पैक", 130.0, 440)]),
    ("shampoo-sachets", "Shampoo sachets", "शैम्पू सैशे", "shampoo sachet pouch", [("Strip of 16", "16 की स्ट्रिप", 32.0, 110)]),
    ("toothpaste", "Toothpaste", "टूथपेस्ट", "toothpaste paste", [("100 g", "100 ग्राम", 60.0, 130), ("150 g", "150 ग्राम", 95.0, 190)]),
    ("toothbrush", "Toothbrush", "टूथब्रश", "toothbrush brush", [("1 piece", "1 पीस", 25.0, 25), ("Pack of 4", "4 का पैक", 90.0, 100)]),
    ("coconut-hair-oil", "Coconut hair oil", "नारियल बालों का तेल", "coconut oil hair oil khobrel tel", [("100 ml", "100 मि.ली.", 50.0, 110), ("200 ml", "200 मि.ली.", 90.0, 215)]),
    ("talcum-powder", "Talcum powder", "टैल्कम पाउडर", "talcum powder talc", [("100 g", "100 ग्राम", 70.0, 140)]),
]:
    piece(Pc, slug, en, hi, syn, vs)

# ------------------------------------------------------------------ 20 biscuits and drinks
Bd = "biscuits-drinks"
for slug, en, hi, syn, vs in [
    ("glucose-biscuits", "Glucose biscuits", "ग्लूकोज़ बिस्कुट", "biscuit glucose parle", [("Small pack", "छोटा पैक", 10.0, 70), ("Family pack", "फ़ैमिली पैक", 50.0, 400)]),
    ("cream-biscuits", "Cream biscuits", "क्रीम बिस्कुट", "biscuit cream", [("Small pack", "छोटा पैक", 10.0, 60), ("Large pack", "बड़ा पैक", 30.0, 160)]),
    ("rusk", "Rusk", "रस्क", "rusk toast khari", [("200 g", "200 ग्राम", 40.0, 210)]),
    ("assorted-chocolates", "Assorted chocolates", "मिक्स चॉकलेट", "chocolate", [("Small bar", "छोटा बार", 10.0, 15), ("Large bar", "बड़ा बार", 50.0, 60)]),
    ("soft-drinks", "Soft drinks", "कोल्ड ड्रिंक", "cold drink soft drink soda", [("600 ml bottle", "600 मि.ली. बोतल", 40.0, 650), ("2 L bottle", "2 लीटर बोतल", 95.0, 2100)]),
    ("drinking-water", "Packaged drinking water", "पैकेज्ड पीने का पानी", "water bottle pani bisleri", [("1 L bottle", "1 लीटर बोतल", 20.0, 1030), ("Box of 12 x 1 L", "12 x 1 लीटर डिब्बा", 220.0, 12500)]),
]:
    piece(Bd, slug, en, hi, syn, vs)

# ------------------------------------------------------------------ build
CAT_NOUN = {c[0]: c for c in CATEGORIES}


def describe(p):
    en, hi = p["en"], p["hi"]
    if p["sell"] == "loose":
        return (f"{en}, sold loose by weight. Choose any amount from 250 g in 250 g steps, or pick a ready weight.",
                f"{hi}, वज़न के हिसाब से खुला। 250 ग्राम से, 250 ग्राम के हिसाब से कोई भी मात्रा चुनें, या तैयार वज़न चुनें।")
    if p["sell"] == "packed":
        sizes = ", ".join(g_label(s)[0] for s in p["sizes"])
        sizes_hi = ", ".join(g_label(s)[1] for s in p["sizes"])
        return (f"{en}, available in {sizes} packs.", f"{hi}, {sizes_hi} के पैक में उपलब्ध।")
    if p["sell"] == "litre":
        return (f"{en}, available as a 1 L pouch, 5 L can and 15 L tin.", f"{hi}, 1 लीटर पाउच, 5 लीटर कैन और 15 लीटर टिन में उपलब्ध।")
    return (f"{en}, sold by the piece or pack. Ask the store which brands are in stock today.",
            f"{hi}, पीस या पैक के हिसाब से। आज कौन से ब्रांड उपलब्ध हैं, दुकान से पूछें।")


def variants_for(p):
    out = []
    if p["sell"] == "loose":
        out.append(dict(id=f"{p['id']}--loose", label_en="Loose, per kg", label_hi="खुला, प्रति किलो", is_loose=True,
                        unit_weight_g=1000, price=rnd(p["per_kg"]), stock=60000 if p.get("special") else 40000))
    elif p["sell"] == "packed":
        for s in p["sizes"]:
            le, lh = g_label(s)
            out.append(dict(id=f"{p['id']}--{s}g", label_en=le, label_hi=lh, is_loose=False, unit_weight_g=s,
                            price=rnd(p["per_kg"] * s / 1000), stock=30 if s <= 1000 else 10))
    elif p["sell"] == "litre":
        for litres, le, lh, w in p["sizes"]:
            factor = {1: 1.0, 5: 0.98, 15: 0.97}[litres]
            out.append(dict(id=f"{p['id']}--{litres}l", label_en=le, label_hi=lh, is_loose=False, unit_weight_g=w,
                            price=rnd(p["per_l"] * litres * factor), stock=20 if litres == 1 else 6))
    else:
        for i, (le, lh, price, w) in enumerate(p["pieces"]):
            slug = re.sub(r"[^a-z0-9]+", "-", le.lower()).strip("-")
            out.append(dict(id=f"{p['id']}--{slug}", label_en=le, label_hi=lh, is_loose=False, unit_weight_g=w,
                            price=float(price), stock=40))
    for v in out:
        v.update(price_is_sample=True, stock_is_sample=True, sale_price=None)
    return out


def build():
    cats = []
    for i, (slug, en, hi, pour, colour) in enumerate(CATEGORIES):
        cats.append(dict(id=slug, name_en=en, name_hi=hi, pour_kind=pour, colour=colour, sort=i + 1))
    prods = []
    seen = set()
    for i, p in enumerate(P):
        assert p["id"] not in seen, p["id"]
        seen.add(p["id"])
        den, dhi = describe(p)
        photo = p.get("photo")
        prods.append(dict(
            id=p["id"], category_id=p["category"], name_en=p["en"], name_hi=p["hi"],
            synonyms=sorted(set(p["syn"].split())),
            description_en=den, description_hi=dhi,
            sell_type="loose" if p["sell"] == "loose" else ("piece" if p["sell"] == "piece" else ("litre" if p["sell"] == "litre" else "packed")),
            min_qty_g=250 if p["sell"] == "loose" else None,
            step_g=250 if p["sell"] == "loose" else None,
            max_qty_g=p.get("max_g") or (100000 if p["sell"] == "loose" else None),
            pack_sizes_g=p.get("packs") if p["sell"] == "loose" else [],
            limited_stock_level=5000 if p["sell"] == "loose" else 5,
            is_special=bool(p.get("special")), pour_kind=p.get("pour"),
            image_url=f"/img/products/{photo}" if photo else None,
            image_source="store" if photo else "illustration",
            image_is_placeholder=not bool(photo),
            sort=i + 1,
            variants=variants_for(p),
        ))
    return cats, prods


XLSX_COLUMNS = [
    "product_id", "category_id", "name_en", "name_hi", "variant_id", "variant_en", "variant_hi", "sell_type",
    "unit_weight_g", "price", "sale_price", "price_is_sample", "stock", "stock_is_sample", "hidden",
    "synonyms", "description_en", "description_hi",
]


def rows(prods):
    for p in prods:
        for v in p["variants"]:
            yield [p["id"], p["category_id"], p["name_en"], p["name_hi"], v["id"], v["label_en"], v["label_hi"],
                   p["sell_type"], v["unit_weight_g"], v["price"], v["sale_price"] or "",
                   "yes" if v["price_is_sample"] else "no", v["stock"], "yes" if v["stock_is_sample"] else "no", "no",
                   " ".join(p["synonyms"]), p["description_en"], p["description_hi"]]


def sql_str(s):
    if s is None:
        return "null"
    if isinstance(s, bool):
        return "true" if s else "false"
    if isinstance(s, (int, float)):
        return repr(s)
    if isinstance(s, list):
        if not s:
            return "'{}'"
        if all(isinstance(x, int) for x in s):
            return "'{" + ",".join(str(x) for x in s) + "}'"
        return "array[" + ",".join(sql_str(x) for x in s) + "]::text[]"
    return "'" + str(s).replace("'", "''") + "'"


def main():
    cats, prods = build()
    os.makedirs(os.path.join(ROOT, "seed"), exist_ok=True)
    with open(os.path.join(ROOT, "seed/catalogue.json"), "w", encoding="utf-8") as f:
        json.dump(dict(categories=cats, products=prods), f, ensure_ascii=False, indent=1)

    with open(os.path.join(ROOT, "seed/catalogue.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(XLSX_COLUMNS)
        w.writerows(rows(prods))

    wb = Workbook()
    ws = wb.active
    ws.title = "Catalogue"
    ws.append(XLSX_COLUMNS)
    for r in rows(prods):
        ws.append(r)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="B3263A")
    widths = [24, 16, 26, 24, 30, 18, 18, 10, 12, 10, 10, 14, 10, 14, 8, 40, 60, 60]
    for i, wdt in enumerate(widths):
        ws.column_dimensions[chr(65 + i)].width = wdt
    ws.freeze_panes = "C2"
    help_ws = wb.create_sheet("How to use")
    for line in [
        "How to update prices and stock with this file",
        "1. Change only the yellow-highlighted kind of columns: price, sale_price, stock, hidden, names, descriptions, synonyms.",
        "2. When a price is checked and correct, change price_is_sample from yes to no.",
        "3. When a stock number is counted, change stock_is_sample from yes to no.",
        "4. hidden = yes hides the product from customers without deleting it.",
        "5. Do not change product_id or variant_id: they connect each row to the website.",
        "6. To add a new product, add a new row with a new product_id and variant_id (lowercase, dashes, no spaces).",
        "7. Save, then upload in Admin > Products > Import from Excel. You will see a preview before anything changes.",
        "Prices are in rupees. Loose items (sell_type = loose) are priced per kg.",
    ]:
        help_ws.append([line])
    help_ws.column_dimensions["A"].width = 120
    help_ws["A1"].font = Font(bold=True, size=14)
    wb.save(os.path.join(ROOT, "seed/catalogue.xlsx"))

    out = ["-- generated by scripts/catalogue.py: sample catalogue. Every price and stock value is flagged as a sample.",
           "begin;"]
    for c in cats:
        out.append("insert into public.categories (id, name_en, name_hi, pour_kind, colour, sort) values (" + ", ".join(
            sql_str(x) for x in [c["id"], c["name_en"], c["name_hi"], c["pour_kind"], c["colour"], c["sort"]]) + ");")
    for p in prods:
        cols = ["id", "category_id", "name_en", "name_hi", "synonyms", "description_en", "description_hi", "sell_type",
                "min_qty_g", "step_g", "max_qty_g", "pack_sizes_g", "limited_stock_level", "is_special", "pour_kind",
                "image_url", "image_source", "image_is_placeholder", "sort"]
        out.append(f"insert into public.products ({', '.join(cols)}) values (" + ", ".join(sql_str(p[c]) for c in cols) + ");")
        for v in p["variants"]:
            vcols = ["id", "label_en", "label_hi", "is_loose", "unit_weight_g", "price", "price_is_sample", "stock", "stock_is_sample"]
            out.append(f"insert into public.variants (product_id, sort, {', '.join(vcols)}) values ({sql_str(p['id'])}, {p['variants'].index(v) + 1}, " +
                       ", ".join(sql_str(v[c]) for c in vcols) + ");")
    out.append("commit;")
    with open(os.path.join(ROOT, "supabase/seed_catalogue.sql"), "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    nv = sum(len(p["variants"]) for p in prods)
    print(f"categories={len(cats)} products={len(prods)} variants={nv}")


if __name__ == "__main__":
    main()
