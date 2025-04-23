import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { locales, pathnames, localePrefix } from './config'

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale: 'es',
    localePrefix,
    pathnames,
})

export default function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Prevenir redirección infinita en la raíz
    if (pathname === '/') {
        request.nextUrl.pathname = '/es' // o el default que uses
        return NextResponse.redirect(request.nextUrl)
    }

    return intlMiddleware(request)
}

export const config = {
    matcher: ["/((?!api|_next|.*\\..*).*)"],
};
