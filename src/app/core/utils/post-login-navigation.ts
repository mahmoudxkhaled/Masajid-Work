export function resolvePostLoginUrl(returnUrl: string | null | undefined): string {
  if (
    returnUrl &&
    returnUrl.startsWith('/') &&
    !returnUrl.startsWith('//') &&
    !returnUrl.startsWith('/auth')
  ) {
    return returnUrl;
  }
  return '/dashboard';
}
