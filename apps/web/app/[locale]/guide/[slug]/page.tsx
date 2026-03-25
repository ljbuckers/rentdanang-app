import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { GUIDES, GUIDE_CATEGORIES, getGuide, getGuidesByCategory } from "@/lib/guide-data";

// ---------------------------------------------------------------------------
// Static params + metadata
// ---------------------------------------------------------------------------
export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const guide = getGuide(params.slug);
  if (!guide) {
    return { title: "Guide Not Found | RentDaNang" };
  }
  return {
    title: `${guide.title} | RentDaNang`,
    alternates: { canonical: `https://rentdanang.app/guide/${params.slug}` },
    description: guide.subtitle,
  };
}

// ---------------------------------------------------------------------------
// Icon helper (mirrors the guide hub icons)
// ---------------------------------------------------------------------------
function GuideIcon({ icon, className }: { icon: string; className?: string }) {
  const cn = className || "w-5 h-5";
  switch (icon) {
    case "passport":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      );
    case "van":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 104 0 2 2 0 00-4 0zM3 9h13l3 4v4H3V9zm2-4h8v4H5V5z" />
        </svg>
      );
    case "creditcard":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case "motorbike":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "waves":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6l-4.22 5.63a1 1 0 01-1.6-.01L4 6m16 0l-4.22 5.63a1 1 0 01-1.6-.01L10 6m10 6l-4.22 5.63a1 1 0 01-1.6-.01L10 12" />
        </svg>
      );
    case "smartphone":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case "calculator":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case "shield":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    default:
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Content renderer - basic markdown-like parsing
// ---------------------------------------------------------------------------
function renderContent(content: string) {
  // Split on blank lines to get blocks
  const blocks = content.split(/\n\n+/);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    const lines = block.split("\n");

    // Check if this block is a table (lines starting with |)
    const isTable = lines.every((l) => l.trim().startsWith("|"));
    if (isTable) {
      const tableRows = lines.map((line) =>
        line
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell.length > 0)
      );
      // First row is the header
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1);

      elements.push(
        <div key={i} className="overflow-x-auto my-4">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-amber-50/50">
                {headerRow?.map((cell, ci) => (
                  <th
                    key={ci}
                    className="text-left px-3 py-2 font-semibold text-gray-700 border-b border-gray-200"
                    dangerouslySetInnerHTML={{ __html: inlineFormat(cell) }}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr
                  key={ri}
                  className={ri % 2 === 1 ? "bg-gray-50/50" : "bg-white"}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2 text-gray-600 border-b border-gray-100"
                      dangerouslySetInnerHTML={{ __html: inlineFormat(cell) }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Check if this block is a list (lines starting with "- ")
    const isList = lines.every((l) => l.trim().startsWith("- "));
    if (isList) {
      elements.push(
        <ul key={i} className="list-disc list-outside ml-5 space-y-1.5 text-gray-700">
          {lines.map((line, li) => (
            <li
              key={li}
              className="pl-1"
              dangerouslySetInnerHTML={{
                __html: inlineFormat(line.trim().replace(/^- /, "")),
              }}
            />
          ))}
        </ul>
      );
      continue;
    }

    // Mixed block: some lines are list items, some are paragraphs
    // Render line by line
    const subElements: React.ReactNode[] = [];
    let listBuffer: string[] = [];

    const flushList = (bufferKey: string) => {
      if (listBuffer.length > 0) {
        subElements.push(
          <ul
            key={bufferKey}
            className="list-disc list-outside ml-5 space-y-1.5 text-gray-700"
          >
            {listBuffer.map((item, li) => (
              <li
                key={li}
                className="pl-1"
                dangerouslySetInnerHTML={{ __html: inlineFormat(item) }}
              />
            ))}
          </ul>
        );
        listBuffer = [];
      }
    };

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j].trim();
      if (line.startsWith("- ")) {
        listBuffer.push(line.replace(/^- /, ""));
      } else {
        flushList(`list-${i}-${j}`);
        subElements.push(
          <p
            key={`p-${i}-${j}`}
            className="text-gray-700"
            dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
          />
        );
      }
    }
    flushList(`list-${i}-end`);

    if (subElements.length === 1) {
      elements.push(<div key={i}>{subElements[0]}</div>);
    } else {
      elements.push(
        <div key={i} className="space-y-3">
          {subElements}
        </div>
      );
    }
  }

  return elements;
}

/** Inline formatting: **bold** -> <strong> */
function inlineFormat(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// ===========================================================================
// PAGE
// ===========================================================================
export default function GuideArticlePage({ params }: Props) {
  const guide = getGuide(params.slug);
  if (!guide) {
    notFound();
  }

  const category = GUIDE_CATEGORIES.find((c) => c.id === guide.category);

  // Related guides: same category, excluding current, up to 3
  const relatedGuides = getGuidesByCategory(guide.category)
    .filter((g) => g.slug !== guide.slug)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-cream">
      <Header />

      {/* ----------------------------------------------------------------- */}
      {/* Hero                                                               */}
      {/* ----------------------------------------------------------------- */}
      <section>
        {/* Colored top bar */}
        <div className="h-2" style={{ backgroundColor: category?.color || guide.color }} />

        <div className="bg-white border-b border-gray-200">
          <div className="max-w-screen-xl mx-auto px-4 py-10">
            <div className="flex items-start gap-4">
              <span
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: (category?.color || guide.color) + "22",
                  color: category?.color || guide.color,
                }}
              >
                <GuideIcon icon={guide.icon} className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {guide.title}
                </h1>
                <p className="text-gray-600 mt-1 text-lg">{guide.subtitle}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                    {guide.readTime}
                  </span>
                  <span className="text-sm text-gray-400">
                    Last updated {guide.lastUpdated}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Two-column layout                                                  */}
      {/* ----------------------------------------------------------------- */}
      <div className="max-w-screen-xl mx-auto px-4 py-10">
        <div className="lg:flex lg:gap-10">
          {/* Left sidebar - Table of Contents */}
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <div className="sticky top-20">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                On this page
              </h3>
              <nav className="space-y-1">
                {guide.sections.map((section, index) => (
                  <a
                    key={index}
                    href={`#section-${index}`}
                    className="block text-sm text-gray-600 hover:text-warm transition-colors py-1.5 border-l-2 border-transparent hover:border-warm pl-3"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
              <div className="mt-8 pt-6 border-t border-gray-200">
                <Link
                  href="/guide"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to guides
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Mobile TOC */}
            <div className="lg:hidden mb-8 bg-white rounded-xl border border-amber-100/60 p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Contents
              </h3>
              <nav className="space-y-1">
                {guide.sections.map((section, index) => (
                  <a
                    key={index}
                    href={`#section-${index}`}
                    className="block text-sm text-gray-600 hover:text-primary py-1"
                  >
                    {index + 1}. {section.title}
                  </a>
                ))}
              </nav>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              {guide.sections.map((section, index) => (
                <section
                  key={index}
                  id={`section-${index}`}
                  className="bg-white rounded-xl border border-amber-100/60 p-6 md:p-8 scroll-mt-24"
                  style={{ boxShadow: '0 1px 3px rgba(217, 119, 6, 0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span
                      className="w-1 h-6 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: category?.color || guide.color }}
                    />
                    {section.title}
                  </h2>
                  <div className="leading-relaxed space-y-4">
                    {renderContent(section.content)}
                  </div>
                </section>
              ))}
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Related Guides                                                  */}
            {/* -------------------------------------------------------------- */}
            {relatedGuides.length > 0 && (
              <div className="mt-12">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Related Guides
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedGuides.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/guide/${related.slug}`}
                      className="bg-white rounded-xl border border-amber-100/60 p-5 hover:shadow-warm-md transition-all group"
                    >
                      <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">
                        {related.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {related.subtitle}
                      </p>
                      <span className="mt-3 inline-block text-sm font-medium text-primary">
                        Read guide &rarr;
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* Bottom back link                                                */}
            {/* -------------------------------------------------------------- */}
            <div className="mt-10 text-center">
              <Link
                href="/guide"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to all guides
              </Link>
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
