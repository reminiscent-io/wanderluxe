export function missingEnv(names: string[]): string[] {
  return names.filter((name) => !process.env[name]);
}
