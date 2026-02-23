import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../logger';

export async function scrapeArticle(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;

  try {
    const { data: html } = await axios.get<string>(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsNexusBot/1.0; +https://cpsc.gov/)',
      },
    });

    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, form, noscript, svg').remove();

    const text = $('body').text();
    const clean = text.replace(/\s+/g, ' ').trim();
    const snippet = clean.length > 4000 ? `${clean.slice(0, 4000)}...` : clean;

    return snippet || null;
  } catch (err: any) {
    logger.warn(`Failed to scrape ${url}:`, err?.message);
    return null;
  }
}
