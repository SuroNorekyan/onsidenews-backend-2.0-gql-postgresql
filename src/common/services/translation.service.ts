import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TranslationService {
  private readonly baseUrl = 'http://localhost:5000/translate';

  async translateToAllLanguages(input: string): Promise<string[]> {
    const langs = ['en', 'ru', 'hy'];
    const inputLower = input.toLowerCase();
    const results = new Set<string>([inputLower]);

    await Promise.all(
      langs.map(async (lang) => {
        try {
          // Avoid unnecessary same-language translation
          if (lang === 'en' && /^[a-z0-9\s\-]+$/i.test(input)) {
            return; // likely already English
          }
          if (lang === 'ru' && /[\u0400-\u04FF]/.test(input)) {
            return; // already Cyrillic
          }
          if (lang === 'hy' && /[\u0530-\u058F]/.test(input)) {
            return; // already Armenian
          }

          const res = await axios.post(this.baseUrl, {
            q: input,
            source: 'auto',
            target: lang,
            format: 'text',
          });
          results.add(res.data.translatedText.toLowerCase());
        } catch (err) {
          console.error(
            `Translation to ${lang} failed for "${input}":`,
            err?.response?.data || err.message,
          );
        }
      }),
    );

    return Array.from(results);
  }
}
