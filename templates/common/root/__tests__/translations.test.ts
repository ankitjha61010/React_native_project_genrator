import { resources } from '{{IMPORT:i18n.resources}}';

type Files = Record<string, Record<string, unknown>>;

const withoutPluralSuffix = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '');

const keysOf = (file: Record<string, unknown>) => new Set(Object.keys(file).map(withoutPluralSuffix));

describe('translations', () => {
  const english = resources.en as unknown as Files;

  for (const [language, files] of Object.entries(resources as unknown as Record<string, Files>)) {
    it(`${language} keys are flat strings`, () => {
      const nested = Object.entries(files).flatMap(([file, content]) =>
        Object.entries(content)
          .filter(([, text]) => typeof text !== 'string')
          .map(([key]) => `${file}.json › ${key}`),
      );
      expect(nested).toEqual([]);
    });

    it(`${language} has every file and key that English has`, () => {
      const missing = Object.entries(english).flatMap(([file, content]) => {
        const actual = files[file] ? keysOf(files[file]) : new Set<string>();
        return [...keysOf(content)].filter(key => !actual.has(key)).map(key => `${file}.json › ${key}`);
      });
      expect(missing).toEqual([]);
    });
  }
});
