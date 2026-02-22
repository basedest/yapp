export function getLegalLinks(locale: string) {
    const prefix = locale === 'ru' ? '/ru' : '/en';
    return {
        terms: `${prefix}/terms`,
        privacyPolicy: `${prefix}/privacy-policy`,
    };
}
