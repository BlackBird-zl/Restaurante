import type { Metadata } from 'next';
import { AuthCallback } from './AuthCallback';

export const metadata: Metadata = { title: 'A validar…', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function CallbackPage() {
  return <AuthCallback />;
}
