import slugifyLib from 'slugify';

export function createSlug(text: string): string {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    trim: true,
  });
}

export function createUniqueSlug(text: string): string {
  const base = createSlug(text);
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}
