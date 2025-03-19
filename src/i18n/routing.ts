import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
    locales: ['es', 'en', 'fr', 'de'],
    defaultLocale: 'es',
    localePrefix: 'never',
});
