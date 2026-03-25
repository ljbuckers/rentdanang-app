import type { Metadata } from "next";
import Image from "next/image";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Our Mission | RentDaNang",
  description:
    "RentDaNang partners with Paws for Compassion to support rescued dogs and cats in Da Nang, Vietnam. Find your home. Help us support theirs.",
  alternates: { canonical: "https://rentdanang.app/our-mission" },
  openGraph: {
    title: "Our Mission | RentDaNang",
    description:
      "A portion of every dollar RentDaNang earns goes directly to Paws for Compassion, a dog and cat rescue in Da Nang.",
    url: "https://rentdanang.app/our-mission",
    images: [
      {
        url: "/images/paws/paws-2.jpg",
        width: 1200,
        height: 800,
        alt: "A rescue dog at Paws for Compassion, Da Nang",
      },
    ],
  },
};

const galleryImages = [
  { src: "/images/paws/paws-1.jpg", alt: "A small rescue dog with alert ears and knowing eyes" },
  { src: "/images/paws/paws-4.jpg", alt: "A volunteer with two rescue dogs in the shelter courtyard" },
  { src: "/images/paws/paws-6.jpg", alt: "A young rescue pup standing cautiously on bare ground" },
  { src: "/images/paws/paws-5.jpg", alt: "A volunteer cradling a rescue dog, both sharing a moment of joy" },
  { src: "/images/paws/paws-7.jpg", alt: "A rescue pup looking up with soulful, trusting eyes" },
  { src: "/images/paws/paws-3.jpg", alt: "A dog peers through a window grate, looking for a way in" },
];

export default function OurMissionPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden">
        <Image
          src="/images/paws/paws-2.jpg"
          alt="A rescue dog gazes into the distance at Paws for Compassion, Da Nang"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-screen-xl mx-auto px-6 pb-16 w-full">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-2xl">
              Finding homes.
              <br />
              Funding theirs.
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mt-4 max-w-xl">
              A portion of every dollar RentDaNang earns goes directly to Paws
              for Compassion, a rescue shelter in Da Nang.
            </p>
          </div>
        </div>
      </section>

      {/* The Story */}
      <section className="py-20 lg:py-28">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/images/paws/paws-5.jpg"
                alt="A volunteer holds a rescue dog's face while the dog grins with pure joy"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-3">
                The Story
              </h2>
              <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                It started with the dogs.
              </h3>
              <div className="space-y-4 text-gray-700 text-lg leading-relaxed">
                <p>
                  When Lee arrived in Da Nang, he spent his mornings at Paws for
                  Compassion. Feeding dogs. Cleaning kennels. Walking rescues
                  that had been pulled from the meat trade. The kind of work
                  that stays with you.
                </p>
                <p>
                  He also noticed something else: every expat he met was
                  struggling to find a place to live. Listings were scattered
                  across Vietnamese platforms, Facebook groups, and word of
                  mouth. Nothing was translated. Nothing was in one place.
                </p>
                <p>
                  RentDaNang started as a simple idea. Gather every rental
                  listing in Da Nang into one searchable map, translated to
                  English, free to use. Then channel the revenue back to the
                  community that made it possible.
                </p>
                <p className="text-gray-900 font-medium">
                  The dogs gave Lee a reason to come to Da Nang. Now, every
                  rental search on this site helps take care of them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Paws for Compassion */}
      <section className="py-20 lg:py-28 bg-amber-50/60">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-3">
              Our Partner
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Paws for Compassion
            </h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              Founded in 2015 by Dom and Lexie, Paws for Compassion rescues dogs
              and cats from the meat trade in central Vietnam. They rehabilitate
              animals at their shelter in Ngu Hanh Son, Da Nang, and rehome them
              with families around the world.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 mb-2">10+</div>
              <p className="text-gray-600">Years rescuing animals</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 mb-2">30K+</div>
              <p className="text-gray-600">Supporters worldwide</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-600 mb-2">2</div>
              <p className="text-gray-600">Shelters: cats and dogs</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-700 mb-4">
              They also run an education program teaching Vietnamese children
              about animal welfare and compassion.
            </p>
            <a
              href="https://pawsforcompassion.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900 font-semibold transition-colors"
            >
              Visit pawsforcompassion.org
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="py-20 lg:py-28">
        <div className="max-w-screen-xl mx-auto px-6">
          <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-3 text-center">
            From the Shelter
          </h2>
          <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            The faces behind the mission
          </h3>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {galleryImages.map((img, i) => (
              <div
                key={img.src}
                className={`relative overflow-hidden rounded-xl group ${
                  i === 3 ? "col-span-2 aspect-[16/9]" : "aspect-square"
                }`}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes={
                    i === 3
                      ? "(max-width: 1024px) 100vw, 66vw"
                      : "(max-width: 1024px) 50vw, 33vw"
                  }
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-6 italic">
            All photos taken on 35mm film at Paws for Compassion, Da Nang.
          </p>
        </div>
      </section>

      {/* The Commitment */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/paws/paws-3.jpg"
            alt="A dog peers through a window, looking for a way in"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="relative max-w-screen-xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 max-w-2xl mx-auto leading-tight">
            Every search helps a rescue find safety.
          </h2>
          <p className="text-lg sm:text-xl text-white/80 max-w-xl mx-auto leading-relaxed">
            A portion of every dollar RentDaNang earns goes directly to Paws
            for Compassion. No middlemen. No overhead. Straight to the shelter
            that needs it.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-screen-xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Find your home in Da Nang.
            <br />
            Help us support theirs.
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            Browse thousands of verified listings on Da Nang&apos;s most
            complete rental map.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors text-lg"
            >
              Search Listings
            </Link>
            <a
              href="https://pawsforcompassion.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-gray-300 hover:border-amber-600 text-gray-700 hover:text-amber-700 font-semibold rounded-xl transition-colors text-lg"
            >
              Learn About Paws
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
