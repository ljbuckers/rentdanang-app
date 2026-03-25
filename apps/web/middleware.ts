import createIntlMiddleware from 'next-intl/middleware';
import { withAuth } from 'next-auth/middleware';
import { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const authMiddleware = withAuth(
  function onSuccess(req) {
    return intlMiddleware(req);
  },
  {
    callbacks: {
      authorized: ({ token }) => token != null,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Strip locale prefix for path matching
  const pathnameWithoutLocale = routing.locales.reduce(
    (path, locale) => path.replace(new RegExp(`^/${locale}(/|$)`), '/'),
    pathname
  );

  // Protected routes: chain auth + intl
  if (pathnameWithoutLocale.startsWith('/account')) {
    return (authMiddleware as any)(req);
  }

  // Everything else: intl only
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
