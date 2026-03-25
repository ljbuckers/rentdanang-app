export interface NeighborhoodContent {
  slug: string;
  name: string;
  heroImage: string;
  description: string;
  features: string[];
  faqs: { question: string; answer: string }[];
}

export const NEIGHBORHOODS: Record<string, NeighborhoodContent> = {
  "an-thuong": {
    slug: "an-thuong",
    name: "An Thuong / My An (The Expat Hub)",
    heroImage: "/images/an-thuong-hero.jpg", // Placeholder
    description: "Known as the 'Expat Quarter', An Thuong is the epicenter of international life in Da Nang. Walkable streets lined with cafes, bars, coworking spaces, and just steps from My Khe Beach make this the top choice for digital nomads and young professionals.",
    features: ["Walkable Streets", "My Khe Beach Access", "Western Restaurants & Bars", "Coworking Spaces"],
    faqs: [
      {
        question: "Is An Thuong safe at night?",
        answer: "Yes, An Thuong is very safe and lively at night, with well-lit streets and a bustling atmosphere."
      },
      {
        question: "What is the average rent in An Thuong?",
        answer: "Studios start around $300/month, while modern 2-bedroom apartments range from $500 to $900 depending on amenities."
      }
    ]
  },
  "son-tra": {
    slug: "son-tra",
    name: "Son Tra (Beach Life)",
    heroImage: "/images/son-tra-hero.jpg",
    description: "A blend of local charm and beachside living. Son Tra offers quieter streets, stunning ocean views, and easy access to the Son Tra Peninsula for nature lovers. Perfect for those who want to be close to the beach but away from the tourist bustle.",
    features: ["Ocean Views", "Quiet Atmosphere", "Nature Access (Monkey Mountain)", "Local Seafood Markets"],
    faqs: [
      {
        question: "Is Son Tra good for families?",
        answer: "Yes, it's quieter than An Thuong and has parks and easy beach access, making it great for families."
      },
      {
        question: "How far is Son Tra from the city center?",
        answer: "It's just across the Dragon Bridge or Han River Bridge, about a 5-10 minute drive to downtown Hai Chau."
      }
    ]
  },
  "hai-chau": {
    slug: "hai-chau",
    name: "Hai Chau (Downtown)",
    heroImage: "/images/hai-chau-hero.jpg",
    description: "The beating heart of Da Nang. Hai Chau is where business happens. Bustling markets, government offices, riverside promenades, and the best local food. Ideal for those who want a true Vietnamese city experience.",
    features: ["City Center", "Han Market", "Riverside Promenade", "Authentic Local Food"],
    faqs: [
      {
        question: "Is Hai Chau noisy?",
        answer: "It can be busier and noisier than the beach side due to traffic and commerce, but many find the energy exciting."
      },
      {
        question: "Are there gyms and supermarkets nearby?",
        answer: "Yes, Hai Chau has the highest concentration of amenities, including major supermarkets like Lotte Mart and Vincom."
      }
    ]
  },
  "ngu-hanh-son": {
    slug: "ngu-hanh-son",
    name: "Ngu Hanh Son (Marble Mountains)",
    heroImage: "/images/ngu-hanh-son-hero.jpg",
    description: "Located south of the city, this area is developing rapidly. Known for the iconic Marble Mountains and luxury resorts, it also offers affordable housing options in new developments. A quieter, more spacious alternative.",
    features: ["Marble Mountains", "Resort Access", "Developing Area", "Spacious Housing"],
    faqs: [
      {
        question: "Is it far from the city center?",
        answer: "It's about a 15-20 minute drive to the city center, but very close to the beach and resorts."
      }
    ]
  },
  "thanh-khe": {
    slug: "thanh-khe",
    name: "Thanh Khe (Local Living)",
    heroImage: "/images/thanh-khe-hero.jpg",
    description: "Authentic Da Nang living at its finest. Thanh Khe offers a deep dive into local culture with traditional markets, affordable street food, and a strong sense of community. Prices are often lower here than in expat-heavy areas.",
    features: ["Authentic Culture", "Local Markets", "Affordable Rent", "Community Feel"],
    faqs: [
      {
        question: "Is English widely spoken in Thanh Khe?",
        answer: "Less so than in An Thuong or Son Tra. Expect a more immersive Vietnamese language experience."
      }
    ]
  },
  "lien-chieu": {
    slug: "lien-chieu",
    name: "Lien Chieu (North Da Nang)",
    heroImage: "/images/lien-chieu-hero.jpg",
    description: "The northern gateway. Lien Chieu is an industrial and educational hub with universities and tech parks. It offers very affordable living and a distinct, industrious vibe, close to the beautiful Mikazuki resort area.",
    features: ["Universities", "Tech Parks", "Affordable Living", "Mikazuki Water Park"],
    faqs: [
      {
        question: "Is Lien Chieu good for students?",
        answer: "Yes, with several universities nearby, it's a student hub with cheap food and housing."
      }
    ]
  }
};
