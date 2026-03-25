import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="bg-gray-900 text-gray-400 py-10">
      <div className="max-w-screen-xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-white font-bold text-lg mb-3">RentDaNang</h3>
          <p className="text-sm leading-relaxed">
            {t("description")}
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-3">{t("areas")}</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/areas/an-thuong-my-an" className="hover:text-white transition-colors">
                {t("anThuongMyAn")}
              </Link>
            </li>
            <li>
              <Link href="/areas/son-tra" className="hover:text-white transition-colors">
                {t("sonTra")}
              </Link>
            </li>
            <li>
              <Link href="/areas/hai-chau" className="hover:text-white transition-colors">
                {t("haiChau")}
              </Link>
            </li>
            <li>
              <Link href="/areas/ngu-hanh-son" className="hover:text-white transition-colors">
                {t("nguHanhSon")}
              </Link>
            </li>
            <li>
              <Link href="/areas/lien-chieu" className="hover:text-white transition-colors">
                {t("lienChieu")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-3">{t("resources")}</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/blog" className="hover:text-white transition-colors">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/guide" className="hover:text-white transition-colors">
                {t("areaGuides")}
              </Link>
            </li>
            <li>
              <span className="text-gray-500">{t("rentalTips")}</span>
            </li>
            <li>
              <span className="text-gray-500">{t("priceTrends")}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-3">{t("legal")}</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">{t("privacyPolicy")}</Link>
            </li>
            <li>
              <Link href="/terms" className="text-gray-500 hover:text-white transition-colors">{t("terms")}</Link>
            </li>
            <li>
              <Link href="/our-mission" className="text-amber-500 hover:text-amber-400 transition-colors">Our Mission</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 mt-8 pt-6 border-t border-gray-800">
        <div className="flex items-center justify-center gap-2 text-sm text-amber-500/90 mb-4">
          <span>🐾</span>
          <span>Proudly supporting <a href="https://pawsforcompassion.org" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">Paws for Compassion</a> Da Nang</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <p>&copy; {new Date().getFullYear()} RentDaNang. {t("allRightsReserved")}</p>
        <p>
          {t("builtBy")}{" "}
          <a
            href="https://rentdanang.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white transition-colors"
          >
            RentDaNang Team
          </a>
        </p>
        </div>
      </div>
    </footer>
  );
}
