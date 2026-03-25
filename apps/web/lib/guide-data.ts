// =============================================================================
// Guide Data - Comprehensive articles for expats and digital nomads in Da Nang
// =============================================================================

export interface GuideSection {
  title: string;
  content: string;
}

export type GuideCategory =
  | "essentials"
  | "getting-around"
  | "lifestyle"
  | "legal"
  | "money";

export interface Guide {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  category: GuideCategory;
  color: string;
  lastUpdated: string;
  readTime: string;
  sections: GuideSection[];
}

export const GUIDE_CATEGORIES: {
  id: GuideCategory;
  label: string;
  icon: string;
  color: string;
}[] = [
  { id: "essentials", label: "Essentials", icon: "star", color: "#FF6B6B" },
  {
    id: "getting-around",
    label: "Getting Around",
    icon: "motorbike",
    color: "#4ECDC4",
  },
  { id: "lifestyle", label: "Lifestyle", icon: "palm", color: "#45B7D1" },
  { id: "legal", label: "Legal", icon: "clipboard", color: "#96CEB4" },
  { id: "money", label: "Money", icon: "coins", color: "#FFEAA7" },
];

export const GUIDES: Guide[] = [
  // ===========================================================================
  // 1. VISA REQUIREMENTS
  // ===========================================================================
  {
    slug: "visa-requirements",
    title: "Vietnam Visa Guide",
    subtitle:
      "E-visas, visa-free entry, and everything you need before arriving",
    icon: "passport",
    category: "legal",
    color: "#96CEB4",
    lastUpdated: "2026-02-09",
    readTime: "8 min read",
    sections: [
      {
        title: "Visa-Free Entry",
        content: `Many nationalities can enter Vietnam without a visa. Below is a comprehensive list grouped by the duration of stay allowed.

**90-day visa-free entry:**
- Chile
- Panama

**45-day visa-free entry (valid until August 2028):**
- France
- Germany
- Italy
- Spain
- United Kingdom
- Russia
- Japan
- South Korea
- Denmark
- Sweden
- Norway
- Finland
- Belarus
- Belgium
- Bulgaria
- Croatia
- Czech Republic
- Hungary
- Luxembourg
- Netherlands
- Poland
- Romania
- Slovakia
- Slovenia
- Switzerland

**30-day visa-free entry:**
- Cambodia
- Indonesia
- Kazakhstan
- Kyrgyzstan
- Laos
- Malaysia
- Mongolia
- Myanmar
- Singapore
- Thailand

**21-day visa-free entry:**
- Philippines

**14-day visa-free entry:**
- Brunei

**Requirements for visa-free entry:**
- Passport must be valid for at least **6 months** from your date of entry
- You need at least **2 blank pages** in your passport for stamps
- The **30-day waiting period** between visa-free entries was **removed in 2022** -- you can exit and re-enter immediately
- Visa-free entry is **NOT extendable** -- you must leave and re-enter, or apply for a different visa type before it expires`,
      },
      {
        title: "E-Visa (90 Days)",
        content: `Since 2023, **all nationalities** are eligible for the Vietnam e-visa, making it the most flexible option for longer stays.

**Key details:**
- Available as **single entry** or **multiple entry** for up to **90 days**
- Apply online at **evisa.xuatnhapcanh.gov.vn** (the official government portal)
- Cost: **$25 USD** for single entry / **$50 USD** for multiple entry
- Processing time: **3-5 business days**
- E-visas are **not processed during Tet** (Vietnamese Lunar New Year), so plan around late January / early February

**Our recommendation:** Always get the **multiple entry** e-visa. The extra $25 is worth it because it allows you to do border runs, take weekend trips to neighboring countries, and re-enter without any issues. A single-entry visa means if you leave Vietnam for any reason, you need a brand new visa to get back in.

**How to apply:**
- Fill out the online form with your passport details
- Upload a passport photo and a scan of your passport data page
- Pay by credit card or debit card
- You will receive the e-visa PDF via email
- Print at least **two copies** and carry them when you travel`,
      },
      {
        title: "Working Considerations",
        content: `This is the gray area that every digital nomad in Vietnam navigates. Here is the honest breakdown.

**The technical situation:**
- A tourist visa (including e-visa and visa-free entry) does **not** legally permit you to work in Vietnam
- Most remote workers and digital nomads use tourist visas without any issues, as enforcement targets Vietnamese employers hiring foreigners without permits, not freelancers working on laptops in cafes
- If you are employed by a **Vietnamese company**, you are required to have a **work permit** -- this is actively enforced

**Digital Nomad Visa:**
- A dedicated Digital Nomad Visa for Vietnam has been **discussed** at the government level but is **not yet available**
- If introduced, it would likely formalize the status of remote workers

**Tax residency warning:**
- Spending **183 or more days** in Vietnam within a calendar year technically makes you a **tax resident**
- Vietnam's personal income tax rates range from 5% to 35%
- In practice, enforcement against remote workers earning from overseas is minimal, but the law exists and could be applied
- Consider consulting a tax professional if you plan to stay long-term`,
      },
    ],
  },

  // ===========================================================================
  // 2. BORDER RUNS
  // ===========================================================================
  {
    slug: "border-runs",
    title: "Border Run Guide",
    subtitle:
      "How to renew your visa without leaving Da Nang for more than a day",
    icon: "van",
    category: "legal",
    color: "#96CEB4",
    lastUpdated: "2026-02-09",
    readTime: "10 min read",
    sections: [
      {
        title: "What Is a Border Run",
        content: `A border run is the process of leaving Vietnam, entering another country, and then returning to Vietnam with a fresh visa or visa-free entry. It is a well-established practice used by thousands of expats and digital nomads every 45-90 days.

**How it works:**
- Your current visa or visa-free period is about to expire
- You apply for a **new e-visa** online **2-3 weeks** before your current one expires
- You physically travel to a border crossing or fly to another country
- You exit Vietnam, getting an exit stamp
- You enter the other country (even briefly)
- You exit the other country and return to Vietnam
- You present your new e-visa and get a fresh entry stamp

**Why people do it:**
- It resets your allowed stay for another 90 days (with an e-visa)
- It is significantly cheaper than visa agencies offering extensions
- The Lao Bao land border can be done as a day trip from Da Nang
- Many people combine it with a weekend trip to Thailand, Malaysia, or Singapore`,
      },
      {
        title: "Lao Bao Land Border",
        content: `The Lao Bao border crossing into Laos is the cheapest and most popular option for Da Nang-based expats. It can be done in a single day.

**Distance and travel time:**
- Approximately **250 km** from Da Nang
- **4-5 hours** by van each way
- Route goes west along QL1A then Highway 9 through Dong Ha and Khe Sanh to the border

**The border process step by step:**
- Exit Vietnam at Lao Bao checkpoint -- present your passport, receive a Vietnam exit stamp
- Walk across the border zone (about 200 meters) to the Laos checkpoint at Dansavanh
- Get a **Laos entry stamp** -- Laos visa on arrival costs **$30-42 USD** depending on nationality
- You are now in Laos -- you can stay for a few minutes or a few hours
- Get a **Laos exit stamp** at the same checkpoint
- Walk back across to the Vietnam checkpoint
- Present your **new e-visa** (printed) along with your passport
- Receive a fresh **Vietnam entry stamp** -- you are back with a new 90-day stay

**Total cost: $100-150 USD** including transport, Laos visa on arrival, and lunch.

**Organized services (recommended for first-timers):**
- **Lynn Visa** -- contact via WhatsApp, provides van transport and handles all paperwork, costs approximately **2.2M VND (~$88 USD)**. Very popular with the Da Nang expat community.
- **Trang Visa** -- similar service, often recommended in Facebook groups

**DIY option:**
- Take a public bus from **Da Nang Bus Station** (Ben Xe Da Nang) heading to Dong Ha or Lao Bao
- Journey takes approximately **6 hours** by public bus
- Cheaper but significantly more time-consuming and requires navigating the border process alone

**What to bring:**
- Passport with at least 6 months validity
- **Printed copy of your new e-visa** (critical -- do not rely on a phone screen)
- **2 passport photos** (4x6 cm) for the Laos visa on arrival
- **USD cash** for the Laos visa fee ($30-42 depending on nationality)
- **VND cash** for lunch and incidentals along the way
- Phone charger / power bank for the long day
- Snacks and water for the van ride`,
      },
      {
        title: "Fly Out Option",
        content: `If you prefer a more comfortable border run or want to combine it with a short holiday, flying out of Da Nang is a great alternative.

**Cheapest flights from Da Nang (round trip, booked 2-4 weeks ahead):**
- **Da Nang to Bangkok**: from **$60 USD** round trip on VietJet or AirAsia
- **Da Nang to Kuala Lumpur**: from **$80 USD** round trip on AirAsia
- **Da Nang to Singapore**: from **$100 USD** round trip on various carriers

**Why fly instead of driving to the border:**
- More comfortable than a 10-hour round trip in a van
- Turn your visa renewal into a weekend trip
- Explore another city, stock up on items not available in Da Nang
- Some routes are barely more expensive than the Lao Bao option once you factor in the Laos visa fee

**Booking tips:**
- Use **Google Flights** or **Skyscanner** to compare prices
- VietJet and AirAsia run frequent sales -- sign up for their newsletters
- Book **carry-on only** for the cheapest fares
- Tuesday and Wednesday flights are usually cheapest`,
      },
      {
        title: "Pro Tips",
        content: `Hard-earned advice from expats who have done dozens of border runs:

- The **multiple entry e-visa** is absolutely worth the extra $25 -- it allows you to take spontaneous trips without worrying about re-entry
- Keep **scanned copies** of your passport, e-visa, and important documents on your phone and in cloud storage
- Always have a **flight booking or hotel reservation** ready to show at immigration if asked about your plans (even a refundable booking works)
- After **3-4 border runs**, consider looking into a longer-term visa option -- some visa agencies can arrange 6-month or 1-year business visas
- **Avoid scheduling border runs during Tet** (Vietnamese Lunar New Year, usually late January or early February) -- borders are extremely crowded, processing slows down, and transport options are limited
- Apply for your new e-visa as soon as possible -- do not wait until the last minute in case there are processing delays
- Join the **Da Nang Expats** Facebook group for up-to-date border run reports and to find travel companions`,
      },
    ],
  },

  // ===========================================================================
  // 3. BANKING & ATMS
  // ===========================================================================
  {
    slug: "banking-atms",
    title: "Banking & ATMs",
    subtitle: "Where to withdraw, which banks to use, how to avoid fees",
    icon: "creditcard",
    category: "money",
    color: "#FFEAA7",
    lastUpdated: "2026-02-09",
    readTime: "7 min read",
    sections: [
      {
        title: "ATM Quick Reference",
        content: `Not all ATMs are equal in Vietnam. The difference between the best and worst can cost you thousands of dong per withdrawal. Here is a comparison of the major banks:

| Bank | Fee | Limit Per Withdrawal | Notes |
| VPBank | FREE | 10M VND (~$400) | Best option -- no fee, high limit, no daily cap |
| ACB | FREE | 3M VND (~$120) | Free but low limit -- need multiple withdrawals for larger amounts |
| TPBank | ~3.3% fee (since Jun 2025) | 5-13M VND | Was previously free -- now the most expensive option -- AVOID |
| Techcombank | 50K VND (~$2) | 5M VND | Reasonable fee with decent limit |
| Vietcombank | 30-55K VND | 3M VND | Widespread but low limits |
| Agribank | 22-33K VND | 3M VND | Most ATMs in rural areas but low limit |
| BIDV | 33-55K VND | 3M VND | Common but fees add up |

**The clear winner is VPBank** -- free withdrawals with a 10M VND limit means fewer transactions and no fees. Locate VPBank ATMs on Google Maps before you need them.

**Important note about TPBank:** TPBank used to be the top recommendation in every expat guide. As of June 2025, they introduced a roughly 3.3% fee on international card withdrawals. This makes them the most expensive option by far. If you see old guides recommending TPBank, that information is outdated.`,
      },
      {
        title: "Essential Tips",
        content: `These tips will save you real money over the course of your stay:

- **Always choose VND** when the ATM asks which currency to use. If it offers to convert to your home currency, **decline**. This is called Dynamic Currency Conversion (DCC) and it adds a **3-5% markup** that goes straight to the ATM operator. It is essentially a legal scam. The screen may say something like "guaranteed rate" or "home currency for your convenience" -- always refuse and take VND.

- **Use branch-attached ATMs** whenever possible. Standalone ATMs on street corners are more likely to have skimming devices, run out of cash, or eat your card. ATMs inside or directly outside a bank branch are regularly maintained and monitored.

- **Lock your card when not withdrawing.** Most banking apps (Wise, Revolut, traditional banks) let you temporarily freeze your card. Keep it frozen and only unlock when you are physically standing at the ATM. This prevents unauthorized charges if your card details are compromised.

- **Carry a maximum of 1-2M VND** in cash on you at any time. That is roughly $40-80 USD. Vietnam is increasingly card-friendly, especially in Da Nang, so you do not need large amounts of cash. If your wallet is lost or stolen, you minimize the damage.

- **Avoid airport ATMs.** The ATMs at Da Nang International Airport charge higher fees and often have worse exchange rates. Withdraw only what you need for a Grab ride (about 100K VND) and find a VPBank ATM in the city.`,
      },
      {
        title: "Best Cards for Travelers",
        content: `The card you use matters just as much as the ATM you choose. Here are the best options:

**Wise (formerly TransferWise) -- Most Popular Among Expats**
- Free ATM withdrawals up to approximately **$400 USD per month** (then a small fee applies)
- Uses the **mid-market exchange rate** with no hidden markup
- Instant notifications for every transaction
- Supports multiple currency balances
- Available as physical or virtual card
- The single most recommended card in every Da Nang expat group

**Revolut**
- Similar to Wise with free withdrawals up to a monthly limit
- Good exchange rates on weekdays (weekend markup applies)
- Metal plan increases free withdrawal limits
- Good app with spending analytics

**Charles Schwab Investor Checking (US residents)**
- **Refunds all ATM fees worldwide** -- no limits, no caps
- No foreign transaction fees
- Linked to a Schwab brokerage account (no minimums)
- The best option if you are a US citizen or resident

**General recommendation:**
- Bring at least **2 different cards** from different providers as backup
- If one card gets blocked, frozen, or eaten by an ATM, you need a fallback
- Keep one card in your accommodation safe and carry one with you`,
      },
      {
        title: "Opening a Vietnamese Bank Account",
        content: `Opening a local bank account can be useful for receiving transfers, paying local bills, and getting better rates on domestic transactions.

**Requirements:**
- Valid passport
- Rental contract or proof of address in Vietnam
- Some banks require a **work permit** (but not all)
- Minimum deposit varies by bank (usually 50-500K VND)

**Why it is useful:**
- Receive money via **Wise** or **Payoneer** transfers at better rates than ATM withdrawals
- Pay for local services, utilities, and subscriptions
- Some landlords prefer bank transfers for rent
- Domestic transfers between Vietnamese banks are instant and free

**Recommended banks for foreigners:**
- **TPBank** -- despite the ATM fee issue, they have the **best English-language mobile app** and the smoothest account opening process for foreigners
- **VPBank** -- good app, helpful staff, free international ATM withdrawals with their own card
- **Techcombank** -- solid English support, widely accepted

**Process:**
- Visit a branch in person (bring passport and rental contract)
- Fill out the application forms (staff will help)
- Takes about 30-60 minutes
- You usually receive a debit card on the spot or within a few days
- Download the mobile banking app before leaving the branch`,
      },
      {
        title: "Sending Money",
        content: `Whether you are receiving payment for remote work or sending money to your Vietnamese bank account, here is how to move money efficiently:

**Wise (best for most people):**
- Best exchange rates, typically only a **~1.5% total fee**
- Send from your home bank to your Wise account, then to a Vietnamese bank account or withdraw from ATM
- Transfers usually arrive within **1-2 business days**
- The gold standard for international money transfer among expats

**Payoneer:**
- Better for **large amounts** and business payments
- Popular with freelancers on platforms like Upwork and Fiverr
- Can withdraw to a Vietnamese bank account
- Fees vary but competitive for larger transfers

**What to avoid:**
- **Western Union** -- significantly more expensive than Wise, poor exchange rates, only useful if you have no other option
- **Traditional bank wires** -- fees of **$25-40 USD** per transfer on top of poor exchange rates, plus the receiving Vietnamese bank may charge an additional fee
- **PayPal** -- high fees for currency conversion (3-4%) and not widely accepted for withdrawals in Vietnam`,
      },
    ],
  },

  // ===========================================================================
  // 4. MOTORBIKE RENTAL
  // ===========================================================================
  {
    slug: "motorbike-rental",
    title: "Motorbike Rental Guide",
    subtitle:
      "Cost, licenses, scam avoidance, getting around on two wheels",
    icon: "motorbike",
    category: "getting-around",
    color: "#4ECDC4",
    lastUpdated: "2026-02-09",
    readTime: "9 min read",
    sections: [
      {
        title: "Rental Costs",
        content: `Motorbikes are the primary mode of transport in Da Nang. Here is what you can expect to pay:

**Automatic scooters (Honda Vision, Yamaha Janus, Honda Air Blade):**
- Daily: **100-200K VND** ($4-8 USD)
- Monthly: **1.2-2.5M VND** ($48-100 USD)
- These are the most popular choice for expats -- easy to ride, practical for city use

**Semi-automatic (Honda Wave, Honda Future):**
- Daily: **80-150K VND** ($3-6 USD)
- Monthly: **800K-1.5M VND** ($32-60 USD)
- Cheaper but requires gear shifting with your foot -- less intuitive for beginners

**Manual / bigger bikes (Honda Winner, Yamaha Exciter, Royal Enfield):**
- Daily: **200-350K VND** ($8-14 USD)
- Monthly: **2-5M VND** ($80-200 USD)
- For experienced riders or those wanting more power for highway trips

**Monthly rentals are always significantly cheaper** than daily rates. If you know you are staying more than a week, negotiate a monthly price.

**Buy vs. rent decision:**
- **Rent for your first 2 months** to get familiar with riding in Vietnam and figure out what type of bike you like
- **Buy a used motorbike for $300-600 USD** if you are staying 6 months or longer -- you can sell it for roughly the same price when you leave
- The Honda Vision and Honda Air Blade hold their resale value extremely well
- Check the **Da Nang Buy & Sell** Facebook group for used bikes`,
      },
      {
        title: "License Requirements",
        content: `This is probably the most important section in this guide. Getting caught without a proper license can be costly and void your insurance.

**What you need:**
- An **International Driving Permit (IDP)** with a motorcycle endorsement is the legal requirement for foreigners riding motorbikes in Vietnam
- Your IDP must be accompanied by your valid home country driving license
- Get your IDP **before traveling** to Vietnam -- it is issued in your home country (AAA offices in the US, Post Office in the UK, etc.)

**Da Nang enforcement:**
- Da Nang **specifically** has police checkpoints targeting foreigners on motorbikes
- This is more strictly enforced here than in Hoi An, Hanoi, or Ho Chi Minh City
- Checkpoints are common on major roads, near the Dragon Bridge, and along the beach road

**The 50cc exception:**
- Technically, you do not need a license for motorbikes **under 50cc** in Vietnam
- However, almost all rental bikes are **110-125cc**, so this exception rarely applies
- Do not assume your rental is under 50cc -- check the registration

**Fines for riding without an IDP:**
- **800K-1.2M VND** ($32-48 USD) per offense
- Police may hold your bike until the fine is paid
- More importantly, if you have an accident without a valid license, your **travel insurance will NOT cover** medical costs or liability -- this is the real risk

**Bottom line:** Get your IDP before you come. It costs about $20 in most countries and takes 15 minutes. It is not worth the risk to skip it.`,
      },
      {
        title: "Scam Prevention",
        content: `Most rental shops are honest, but these scams do exist. Knowing about them in advance protects you completely.

**The Vanishing Bike Trick:**
- How it works: You park your rented bike, someone with a spare key rides it away, the shop claims you lost it and demands $500-1500 in compensation
- **Prevention:** Buy and use **your own disc lock** (available at any motorbike accessories shop for 150-300K VND). A disc lock attaches to the brake disc and prevents the wheel from turning. If the bike cannot be moved, it cannot "vanish."

**Fake Damage Claims:**
- How it works: You return the bike and the shop points to scratches or dents that were already there, demanding you pay for repairs
- **Prevention:** Before riding away, take **photos and video of every angle** of the bike -- both sides, front, back, wheels, mirrors, seat, and any existing scratches. Send these to the shop via WhatsApp or Zalo with a timestamp. When you return, do the same thing. This eliminates any dispute.

**Passport as Deposit:**
- Some shops ask to hold your passport as a deposit. **NEVER do this.**
- If the shop demands your passport, go to a different shop
- Leave a **cash deposit of 2-5M VND** ($80-200 USD) instead, or a photocopy of your passport
- Reputable shops will accept a cash deposit or just a passport copy

**Trusted rental shops in Da Nang:**
- **Tigit Motorbikes** -- professional operation, proper contracts, well-maintained bikes, fair pricing
- **Rentabike Vietnam** -- good reputation, English-speaking staff, transparent policies`,
      },
      {
        title: "Driving Tips",
        content: `Driving in Vietnam is unlike anywhere else. These tips come from years of expat experience:

- **Go with the flow** -- the most important rule. Do not make sudden stops or sharp lane changes. Traffic in Vietnam flows like water. Move predictably and everyone adjusts around you.

- **The horn means "I am here"** -- it is not aggressive. Drivers honk to let you know they are beside you or behind you. Use your horn too, especially when overtaking or approaching blind corners.

- **Bigger vehicles have right of way in practice** -- regardless of traffic laws, trucks and buses will not stop for you. Give them space. Always yield to anything larger than you.

- **Always wear a helmet** -- it is the law and it is enforced. Fines for no helmet are 200-400K VND. More importantly, head injuries are the leading cause of motorbike fatalities. Wear a proper helmet, not a decorative one.

- **Be extra cautious at night** -- many local riders drive without headlights, pedestrians walk in the road, and visibility is limited. Slow down after dark.

- **Roads flood in rainy season** (September-December) -- water can hide potholes and debris. Drive slowly through flooded areas. If the water is above your wheel hub, find an alternate route.

- **Google Maps works well** for navigation in Da Nang -- mount your phone on the handlebars (phone mounts cost 50-100K VND) and follow the directions. Waze is not commonly used here.

- **Fuel stations** are everywhere. Fill up when you are at half tank. Most stations are full-service -- just pull up and say "day binh" (fill up) or show a number with your fingers for a specific amount.`,
      },
    ],
  },

  // ===========================================================================
  // 5. BEACHES
  // ===========================================================================
  {
    slug: "beaches",
    title: "Da Nang Beaches Guide",
    subtitle: "Swimming, surfing, sunsets, avoiding crowds",
    icon: "waves",
    category: "lifestyle",
    color: "#45B7D1",
    lastUpdated: "2026-02-09",
    readTime: "6 min read",
    sections: [
      {
        title: "My Khe Beach",
        content: `My Khe is Da Nang's main beach and one of the most famous stretches of sand in Vietnam. It runs for about 10 kilometers and is the beach you see in most photos of the city.

**What to expect:**
- Wide, clean sandy beach with gentle waves most of the year
- **Lifeguards** on duty during daylight hours along the main stretch
- Beach volleyball courts set up along the central section
- Spectacular **sunrise** views -- the beach faces east, making it perfect for early mornings
- Loungers available for **50-100K VND** ($2-4 USD) per session, usually including an umbrella

**Crowds:**
- Gets **packed after 5pm** when locals finish work and come to swim, exercise, and socialize
- Early mornings (before 7am) are quiet and beautiful
- Weekday mid-mornings are the sweet spot for having the beach mostly to yourself
- The **south end** toward Non Nuoc is noticeably quieter than the central section near the Dragon Bridge

**Nearby amenities:**
- Dozens of seafood restaurants line the beach road
- Convenience stores within walking distance
- Showers and changing facilities at several access points`,
      },
      {
        title: "My An / Bac My An",
        content: `The stretch of beach in the My An and Bac My An area is where most expats spend their time. It is south of the main My Khe beach area and has a more relaxed atmosphere.

**Why expats love it:**
- **Quieter than My Khe** with fewer tourist crowds
- Close to the An Thuong neighborhood where most expats live
- More beach bars and Western-friendly restaurants nearby
- Generally cleaner and better maintained

**Highlights:**
- **Paradise Beach Bar** offers an outdoor cinema on the sand -- movies projected on a big screen while you sit in bean bags with drinks. A unique Da Nang experience.
- The **best sunset spot** in Da Nang -- while the beaches face east for sunrise, the view looking south along the coast during golden hour is stunning
- The **Fusion Maia** resort stretch is one of the most beautiful sections of coastline -- you can walk along the public beach in front of it

**Access:**
- Multiple access points from the beach road (Vo Nguyen Giap)
- Less developed infrastructure than My Khe, which is part of the charm
- Grab can drop you within a 2-minute walk of the sand`,
      },
      {
        title: "Non Nuoc Beach",
        content: `Non Nuoc is at the southern end of Da Nang's coastline, near the Marble Mountains. It is the go-to beach for surfing and a mellower atmosphere.

**Surfing:**
- The best surf in Da Nang from **September to March** when swells pick up
- **T20 Surf School** is the most popular option for beginners -- friendly instructors, small group lessons
- Board rental approximately **200K VND per hour** ($8 USD)
- Waves are beginner to intermediate level -- not Bali, but enough to learn and have fun
- The surf community is small but growing, with a mix of locals and expats

**Swimming considerations:**
- **Stronger currents** than My Khe or My An -- this is not the calmest swimming beach
- Always **check for red flags** before entering the water -- they indicate dangerous conditions
- Best for confident swimmers or surfers

**Character:**
- Feels more remote and natural than the beaches further north
- Fewer beachfront restaurants and vendors
- Popular with Vietnamese families on weekends
- The Marble Mountains provide a dramatic backdrop`,
      },
      {
        title: "Swimming Safety",
        content: `Da Nang's beaches are generally safe, but the ocean demands respect. Here is what you need to know:

**Lifeguards:**
- Present at **My Khe** and **My An** beaches during **daytime hours** (roughly 5am to 7pm)
- Lifeguards use flags to indicate conditions -- green means safe, red means do not swim
- If in doubt, ask a lifeguard before entering the water

**Seasonal conditions:**
- **Red flag days** -- when red flags are posted, do not enter the water. The currents are dangerously strong and people drown every year ignoring this.
- **Rainy season (September-December)** brings rough water and undertow. The surf picks up but so do the hazards. Even strong swimmers should be cautious.
- **Jellyfish** occasionally appear after storms. They are usually not dangerous but stings are painful. If you see jellyfish washed up on the sand, expect more in the water.
- **Best swimming months: March through August** -- calmer seas, warmer water, better visibility, fewer hazards

**General advice:**
- Swim near other people, not alone on an empty stretch
- Do not swim after drinking alcohol
- If caught in a rip current, swim parallel to the shore until you escape it, then swim back in. Do not fight the current directly.
- The water is warm enough year-round that wetsuits are unnecessary, though a rash guard helps with sun protection`,
      },
    ],
  },

  // ===========================================================================
  // 6. FIRST WEEK
  // ===========================================================================
  {
    slug: "first-week",
    title: "Your First Week in Da Nang",
    subtitle: "SIM cards, internet, groceries, getting set up",
    icon: "smartphone",
    category: "essentials",
    color: "#FF6B6B",
    lastUpdated: "2026-02-09",
    readTime: "8 min read",
    sections: [
      {
        title: "SIM Card",
        content: `Getting a local SIM card should be one of the first things you do after landing. You need data for Grab, maps, and messaging.

**Where to buy:**
- **Airport kiosks** -- right after you exit customs at Da Nang International Airport, there are several phone carrier booths. Most convenient option.
- **City carrier stores** -- Viettel and Vinaphone have stores throughout the city with slightly better prices

**Which carrier:**
- **Viettel** -- best overall coverage, fastest 4G/5G, most reliable in rural areas if you plan to explore
- **Vinaphone** -- solid coverage in Da Nang and other cities, slightly cheaper plans

**Pricing:**
- Airport kiosks: **200-250K VND** ($8-10 USD) for a SIM with **10-60 GB** of data valid for 30 days
- City Viettel store: approximately **150K VND** ($6 USD) for **20 GB** on a 30-day plan
- Renewal is easy -- top up at any convenience store or through the carrier app

**Requirements:**
- You need your **passport** to register a SIM card (this is the law)
- The staff will handle the registration for you

**eSIM option:**
- eSIMs are available from Viettel and Vinaphone
- You can also buy a Vietnam eSIM through services like Airalo or Holafly before you arrive
- Useful if your phone supports eSIM and you want data immediately upon landing

**Avoid street vendors** selling SIM cards -- they may not properly register the SIM to your passport, which can result in it being deactivated after a few days.`,
      },
      {
        title: "Internet",
        content: `Da Nang has excellent internet infrastructure, which is one of the reasons it is so popular with remote workers.

**In your accommodation:**
- Most rental apartments and houses include **50-100 Mbps fiber internet** in the rent
- Confirm with your landlord before signing -- ask about the speed and whether it is included
- If internet is not included, setting up a new connection through **VNPT** or **Viettel** costs approximately **200-250K VND per month** ($8-10 USD) for a reliable fiber connection
- Installation usually takes 1-3 days

**Working from cafes:**
- Da Nang cafes generally have **reliable WiFi** suitable for video calls and regular work
- Speeds vary from 20-80 Mbps depending on the cafe and how many people are connected
- Popular work-friendly cafes include those in the An Thuong area and along the beach road

**Backup plan:**
- Use your **4G phone as a mobile hotspot** when WiFi is unreliable
- Viettel 4G is fast enough for most work tasks including video calls
- Consider getting a data plan with generous tethering allowance (most plans allow it by default)`,
      },
      {
        title: "Grocery Shopping",
        content: `You have plenty of options for groceries in Da Nang, from large supermarkets to tiny local markets.

**Big supermarkets:**
- **Lotte Mart** -- large Korean-owned supermarket with international products, imported goods, household items. Closest thing to a Western supermarket.
- **GO! (formerly Big C)** -- wide selection, good prices on local products, has a food court
- **Mega Market** -- wholesale-style store, great for bulk buying, slightly outside the center

**Convenience and specialty stores:**
- **MOONMILK** -- popular with expats in the beach area, stocks Western products, craft beer, cheese, imported snacks
- Convenience stores (Circle K, GS25, Ministop) are on every other corner -- open 24/7, useful for basics, drinks, and snacks

**Local markets (cheapest option):**
- **An Hai Dong Market** -- local wet market with incredibly cheap produce, meat, and seafood
- **An Hai Bac Market** -- similar local market, slightly smaller
- Expect **zero English** at local markets -- use Google Translate or learn basic Vietnamese numbers
- Prices are roughly **50-70% cheaper** than supermarkets for fresh produce
- Markets are best visited in the **early morning** (6-9am) for the freshest selection

**Delivery:**
- **GrabMart** delivers groceries from various stores to your door, usually within 30-60 minutes
- Several stores on the Grab app offer full grocery ranges
- Convenient for heavy items or when you do not feel like going out`,
      },
      {
        title: "Essential Apps",
        content: `Download these before you arrive or on your first day. They will make your life significantly easier.

**Grab -- the essential super-app:**
- Ride-hailing (motorbike taxis and cars)
- Food delivery from thousands of restaurants
- Grocery delivery via GrabMart
- Payment via GrabPay
- You will use this app multiple times per day

**Google Maps:**
- Works well in Da Nang for navigation
- Has most restaurants, shops, and businesses listed
- Use it to find ATMs, pharmacies, and other services nearby

**Google Translate:**
- The **camera feature** is invaluable -- point your phone at Vietnamese text (menus, signs, contracts) and it translates in real time
- Download the **Vietnamese language pack** for offline translation
- The conversation mode works for basic interactions

**Wise or Revolut:**
- Manage your money, track spending, and use for ATM withdrawals
- Get exchange rate notifications
- Freeze and unfreeze your card

**WhatsApp:**
- Common among the expat community for group chats and coordination
- Many businesses and services communicate via WhatsApp

**Zalo:**
- Vietnam's equivalent of WhatsApp -- used by virtually all Vietnamese people
- **Landlords strongly prefer Zalo** for communication
- Useful for contacting Vietnamese businesses, repair services, and local shops
- Download it and set it up even if you do not plan to use it much -- your landlord will thank you`,
      },
      {
        title: "Healthcare",
        content: `Da Nang has good healthcare options, especially compared to smaller Vietnamese cities. Here is what you need to know.

**Hospitals and clinics:**
- **Vinmec International Hospital** -- the best hospital in Da Nang. Modern facility, English-speaking doctors, international standards. A general consultation costs **500-800K VND** ($20-32 USD). This should be your first choice for anything serious.
- **Family Medical Practice** -- an expat-focused clinic with English-speaking staff. Higher prices but very comfortable for foreigners who want a familiar healthcare experience.

**Pharmacies:**
- **Pharmacity** chains are everywhere -- clean, well-stocked, professional
- Most medications are available **over the counter** (OTC) without a prescription, including antibiotics, pain medication, and allergy drugs
- Pharmacists often speak basic English
- Prices for medication are a fraction of what you would pay in Western countries

**Dentistry:**
- Dental care in Vietnam is **very affordable** and generally high quality
- A cleaning costs approximately 200-400K VND ($8-16 USD)
- Many dental clinics have modern equipment and English-speaking dentists
- Popular for more expensive procedures like crowns, implants, and veneers at a fraction of the Western cost

**Insurance:**
- **SafetyWing** is the most popular travel/health insurance among digital nomads -- costs **$56 USD per 4-week period**
- Covers hospitalization, emergency medical treatment, and emergency dental
- Can be purchased after you have already left your home country
- Other options: World Nomads, Genki, PassportCard
- Make sure your insurance covers motorbike riding if you plan to ride (and that you have a valid IDP)`,
      },
    ],
  },

  // ===========================================================================
  // 7. COST OF LIVING
  // ===========================================================================
  {
    slug: "cost-of-living",
    title: "Cost of Living Calculator",
    subtitle: "Real monthly budgets with hidden costs most guides miss",
    icon: "calculator",
    category: "money",
    color: "#FFEAA7",
    lastUpdated: "2026-02-09",
    readTime: "5 min read",
    sections: [
      {
        title: "Budget Tiers",
        content: `Three realistic monthly budgets based on actual expat spending in Da Nang. These are based on real numbers, not theoretical estimates.

**Backpacker / Bare Minimum: $465-705/month**
- Accommodation: **$100-200** -- shared room in a hostel or basic shared apartment
- Food: **$150-200** -- eating local food (com tam, pho, banh mi) for every meal, cooking occasionally
- Transport: **$30-50** -- no motorbike, walking and Grab rides only
- Phone/internet: **$10-15** -- basic SIM card data plan
- Entertainment: **$50-100** -- occasional beers, local coffee shops
- Miscellaneous: **$25-40** -- toiletries, laundry, small purchases
- This budget is tight but doable if you live like a local

**Comfortable / Most Expats: $900-1,600/month**
- Accommodation: **$300-500** -- private 1-bedroom apartment with kitchen, AC, WiFi, central location
- Food: **$250-400** -- mix of local and Western food, some cooking at home, occasional nice restaurants
- Transport: **$50-80** -- motorbike rental plus occasional Grab rides
- Gym: **$25-40** -- monthly gym membership
- Coworking: **$75** -- coworking space membership (if needed, many work from cafes)
- Entertainment/bars: **$100-200** -- regular nights out, beach bars, social activities
- Phone/internet: **$10-15**
- Miscellaneous: **$50-100**
- This is where most digital nomads and expats land. Comfortable without being extravagant.

**Premium / Living Well: $2,000-4,000+/month**
- Accommodation: **$700-1,200** -- spacious 2-bedroom apartment or luxury studio, pool, gym, ocean view
- Food: **$400-600** -- Western food daily, regular fine dining, premium groceries
- Transport: **$100-150** -- nice motorbike plus frequent Grab cars
- Fitness: **$50-100** -- premium gym, yoga classes, personal training
- Nightlife/entertainment: **$200-400** -- regular nights out, rooftop bars, events
- Weekend trips: **$100-200** -- Hoi An, Hue, Ba Na Hills, beach resorts
- Phone/internet/subscriptions: **$30-50**
- Miscellaneous: **$100-200**
- At this tier you are living very well by any standard. Private pool, eating out every meal, doing whatever you want.`,
      },
      {
        title: "Hidden Costs Most Guides Miss",
        content: `These are the expenses that catch newcomers off guard. Budget for them from day one.

**Electricity: 800K-1.5M VND/month ($32-60 USD)**
- Government rate is approximately **3,500-4,000 VND per kWh** on a tiered scale
- Your usage **spikes dramatically with air conditioning**, especially during the hot months (May-September) when temperatures hit 35-40 degrees Celsius
- Some landlords **inflate the electricity rate** to 4,500-6,000 VND/kWh as a way to make extra money. Ask about the rate **before signing your lease**. If it is above 4,000 VND/kWh, negotiate or look elsewhere.
- A single AC unit running 8 hours per day can add 500K-1M VND to your monthly bill
- Use fans when possible and set AC to 26-27 degrees to keep costs reasonable

**Visa runs: $100-200 every 45-90 days ($400-800/year)**
- This is a real ongoing cost that many budget guides ignore
- Even the cheapest Lao Bao border run costs about $100 once you include transport, Laos visa, and food
- Flying out for a weekend costs $150-300+
- Budget for approximately **$100-200 every 2-3 months**

**Motorbike extras:**
- Gas: **200-400K VND/month** ($8-16 USD) depending on how much you ride
- Disc lock (one-time purchase): **150-300K VND** ($6-12 USD) -- essential for theft prevention
- IDP fines if caught without one: **800K-1.2M VND** ($32-48 USD) per offense
- Occasional repairs and maintenance: budget **100-200K VND/month**

**Laundry: 20-40K VND per kg ($0.80-1.60 USD/kg)**
- Most apartments in Da Nang do **not have a washing machine**
- You will use drop-off laundry services -- they are everywhere and usually return clothes same day or next morning
- Budget approximately **200-400K VND/month** for regular laundry

**Water:**
- Usually **included in rent** or costs **100-200K VND/month** ($4-8 USD)
- Drinking water: buy 19-liter jugs for approximately 15-20K VND each, or use a filter`,
      },
    ],
  },

  // ===========================================================================
  // 8. SCAMS & SAFETY
  // ===========================================================================
  {
    slug: "scams-safety",
    title: "Scams & Safety Guide",
    subtitle:
      "Common scams and why Da Nang is still one of SE Asia's safest cities",
    icon: "shield",
    category: "essentials",
    color: "#FF6B6B",
    lastUpdated: "2026-02-09",
    readTime: "7 min read",
    sections: [
      {
        title: "The Honest Truth",
        content: `Let us start with the big picture before diving into specifics.

Da Nang is **genuinely one of the safest cities in Southeast Asia**. This is not marketing -- it is the consistent experience of thousands of expats who live here.

**Key facts:**
- **Violent crime against foreigners is extremely rare.** Muggings, assaults, and robberies are almost unheard of in Da Nang.
- **Most long-term expats report zero safety issues** during their entire stay
- The "scams" that do exist are **mild compared to Bangkok, Bali, or Ho Chi Minh City** -- we are talking about minor overcharging, not dangerous situations
- Da Nang consistently ranks as one of Vietnam's safest cities, and Vietnam itself is one of the safest countries in Southeast Asia
- Women generally report feeling safe walking alone at night, though standard precautions still apply

**Why is it so safe?**
- Da Nang is smaller and more community-oriented than HCMC or Hanoi
- The local government actively maintains public safety
- Tourism-dependent businesses have an incentive to keep visitors happy
- Vietnamese culture generally values hospitality toward guests

That said, petty issues do exist. Here is what to watch for:`,
      },
      {
        title: "Transport Scams",
        content: `Transport scams are the most common issue you might encounter, and they are easy to avoid entirely.

**Airport taxi long-routing:**
- How it works: Traditional taxi drivers take unnecessarily long routes from the airport to inflate the meter
- The real cost from Da Nang Airport to the An Thuong / beach area is approximately **100K VND** (~$4 USD)
- If a driver quotes you 300-500K VND, they are overcharging

**The simple solution: Always use Grab from the airport.**
- Book a Grab car or Grab bike from inside the terminal
- Walk to the designated Grab pickup area (signed in the airport)
- The fare is fixed before you get in -- no meter manipulation possible
- A Grab car to An Thuong costs approximately **100K VND**, which is the fair price
- This one habit eliminates virtually all transport scams`,
      },
      {
        title: "Rental Scams",
        content: `Apartment rental scams do occur in Da Nang, especially targeting newcomers who are eager to secure housing quickly.

**Bait-and-switch:**
- How it works: A listing shows a beautiful apartment at a great price. When you arrive, the "real" apartment is different (smaller, worse condition, different location).
- **Prevention:** Do a **video call** with the landlord or agent before paying any deposit. Ask them to walk through the actual unit in real time. If they refuse, it is a red flag.

**Vietnamese-only contracts:**
- How it works: You sign a rental contract written entirely in Vietnamese without understanding the terms. Hidden clauses may include excessive penalties for early termination, responsibility for all repairs, or forfeiting your deposit for minor issues.
- **Prevention:** Insist on an **English translation** of the contract. If one is not available, use Google Translate's camera feature to read through it. Review clauses about deposit refund, early termination, maintenance responsibility, and what happens if you need to leave early.

**Fake agents:**
- How it works: Someone poses as a real estate agent, collects a deposit or finder's fee, and disappears.
- **Prevention:** Always **meet at a real office**, check their **Google reviews**, and ask for references from other expats. Never transfer money before seeing the apartment in person.

**Electricity rate markup:**
- How it works: The landlord charges you 5,000-6,000 VND per kWh for electricity when the government rate is approximately 3,500-4,000 VND/kWh. Over months, this adds up significantly.
- **Prevention:** Ask about the electricity rate **before signing your lease**. The government rate is approximately **3,500 VND/kWh** at the base tier, scaling up to about 4,000 VND/kWh for higher usage. Anything significantly above this means the landlord is profiting from your electricity usage. Negotiate or find a different place.`,
      },
      {
        title: "General Safety Tips",
        content: `These are not major threats, but awareness helps you avoid minor annoyances.

**Helmet theft:**
- Leaving your helmet on your motorbike seat (as locals do) can result in it being stolen
- **Solution:** Carry your helmet with you or use a helmet lock/cable to secure it to the bike

**Beach theft:**
- Do not leave bags, phones, or valuables unattended on the beach while swimming
- **Solution:** Go to the beach with a friend and take turns watching belongings. Alternatively, bring only what you can afford to lose and use a waterproof phone pouch.

**Bag snatching:**
- Rare in Da Nang but occasionally reported -- a motorbike rider grabs your bag as they pass
- **Solution:** Carry bags on the **building side** of the sidewalk (away from the road), use a **crossbody bag**, and keep a firm grip. This is more of a concern in HCMC than Da Nang.

**Tourist pricing:**
- Some restaurants, markets, or shops charge foreigners slightly more than locals
- The amounts are usually trivial -- an extra 10-20K VND ($0.40-0.80) on a meal
- **Not worth arguing about** in most cases. If it bothers you, check prices on Grab Food before ordering at a restaurant, or shop at supermarkets with fixed prices.

**Credit card skimming:**
- ATM skimming devices are rare but not impossible
- **Solution:** Use ATMs attached to bank branches, cover the keypad when entering your PIN, check for loose card slot covers, and keep your card frozen in your banking app when not actively withdrawing. Monitor your transactions regularly.`,
      },
    ],
  },

  // ===========================================================================
  // 9. LIVING IN DA NANG 2026
  // ===========================================================================
  {
    slug: "living-in-da-nang-2026",
    title: "Living in Da Nang 2026",
    subtitle: "The complete guide for digital nomads moving to Vietnam",
    icon: "palm",
    category: "lifestyle",
    color: "#45B7D1",
    lastUpdated: "2026-02-20",
    readTime: "15 min read",
    sections: [
      {
        title: "Why Da Nang?",
        content: `Da Nang has quietly become the best digital nomad base in Southeast Asia for 2026, overtaking Chiang Mai and Bali for many remote workers.

**The Trifecta:**
- **Beach:** World-class beaches (My Khe, Non Nuoc) minutes from your door.
- **City:** Modern infrastructure, fiber internet, and international hospitals.
- **Mountains:** Monkey Mountain (Son Tra) and Marble Mountains for weekend hikes.

**The Cost:**
You can live extremely well for **$1,000 - $1,500 USD per month**. That includes a modern studio apartment near the beach ($350-500), motorbike rental ($100), eating out daily, and coworking membership.

**The Vibe:**
Unlike the chaotic energy of Ho Chi Minh City or the tourist trap feel of Phuket, Da Nang strikes a balance. It is a real working city with a laid-back coastal rhythm. The expat community is welcoming but not overwhelming.`,
      },
      {
        title: "Neighborhood Guide",
        content: `Choosing where to live is your most important decision.

**1. An Thuong (My An): The Expat Hub**
- **Vibe:** Westernized, walkable, busy.
- **Best for:** First-timers, social butterflies.
- **Rent:** $350 - $600 for a 1-bedroom.
- **Pros:** English everywhere, great cafes, walking distance to beach.
- **Cons:** Construction noise, higher prices, "bubble" feel.

**2. Son Tra: The Quiet Alternative**
- **Vibe:** Residential, local, peaceful.
- **Best for:** Couples, long-term stays, nature lovers.
- **Rent:** $250 - $450.
- **Pros:** Bigger apartments, ocean views, cheaper, near Monkey Mountain.
- **Cons:** Need a motorbike, fewer Western restaurants.

**3. Hai Chau: The City Center**
- **Vibe:** Authentic, bustling, Vietnamese.
- **Best for:** Budget seekers, city lovers.
- **Rent:** $200 - $400.
- **Pros:** Cheapest rent, best local food, central location.
- **Cons:** No beach (10 min ride), noisy, less English spoken.`,
      },
      {
        title: "Getting Settled Checklist",
        content: `**Day 1:**
- Get a SIM card at the airport (Viettel is best).
- Download **Grab** (transport) and **Zalo** (messaging).
- Check into a hotel for 3 nights (do not rent long-term online!).

**Day 2:**
- Rent a motorbike (approx. 150k VND/day).
- Join "Da Nang Expats" Facebook group.
- Visit **rentdanang.app** to find verified listings.

**Day 3:**
- View 3-5 apartments in person.
- Check internet speed and construction noise.
- Sign a 1-month or 3-month contract (negotiate!).`,
      },
    ],
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}

export function getGuidesByCategory(category: GuideCategory): Guide[] {
  return GUIDES.filter((guide) => guide.category === category);
}
