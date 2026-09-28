import { buildPlaceholders } from './lib/placeholders';

const manifest = buildPlaceholders();
console.log(`assets: ${manifest.length} slots, ${manifest.filter((a) => a.status === 'pending').length} pending (placeholders written)`);
