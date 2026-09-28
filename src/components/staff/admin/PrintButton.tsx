'use client';
import { Button } from '@/components/ui/primitives';

export function PrintButton() {
  return <Button variant="primary" icon="printer" onClick={() => window.print()}>Imprimir</Button>;
}
