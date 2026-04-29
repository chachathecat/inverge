import { access } from 'node:fs/promises';

export async function resolve(specifier, context, defaultResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.match(/\.[a-z]+$/i)) {
    try {
      return await defaultResolve(`${specifier}.ts`, context, defaultResolve);
    } catch {}
  }
  return defaultResolve(specifier, context, defaultResolve);
}
