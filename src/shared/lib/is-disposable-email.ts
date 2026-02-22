import disposableDomains from 'disposable-email-domains';

export function isDisposableEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    return (disposableDomains as string[]).includes(domain);
}
