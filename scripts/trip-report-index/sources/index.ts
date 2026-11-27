/**
 * The source registry: the catalog (catalog.ts), with how each source is read.
 *
 * `minimumReports` is the safety net that lets the parsers stay regex-based.
 * Each is set well below what the source published when its adapter was
 * written, so normal growth never trips it, but a redesign that breaks an
 * extractor fails the run instead of silently emptying a region page.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport } from '../types.ts'
import type { Source, SourceId } from './catalog.ts'
import { SOURCE_CATALOG } from './catalog.ts'
import { scrapeAdamLaycock } from './adamlaycock.ts'
import { requireApiKey, scrapeAnnie } from './annie.ts'
import { scrapeAnugara } from './anugara.ts'
import { scrapeBillKerr } from './billkerr.ts'
import { scrapeCoastBackcountry } from './coastbackcountry.ts'
import { scrapeOnTop } from './ontop.ts'
import { scrapePeaksAndStreams } from './peaksandstreams.ts'
import { scrapeSonnyBou } from './sonnybou.ts'
import { scrapeSpectacularMountains } from './spectacularmountains.ts'
import { scrapeExplor8ion } from './explor8ion.ts'
import { scrapeGoldenScrambles } from './goldenscrambles.ts'
import { scrapeSpirko } from './spirko.ts'
import { scrapeSteepSheep } from './steepsheep.ts'
import { scrapeStevenSong } from './stevensong.ts'
import { scrapeVirtualHiker } from './virtualhiker.ts'

/** The secrets the sources need. Only YouTube needs one. */
export interface Credentials {
  readonly youtubeApiKey: string
}

/**
 * Every source's credential, read from `env`, or a MissingCredentialError
 * explaining how to get the one missing. The entry point calls it before any
 * scraping starts, so a missing credential fails in the first second rather
 * than after the other sources have been read.
 */
export function readCredentials(env: NodeJS.ProcessEnv): Credentials {
  return { youtubeApiKey: requireApiKey(env) }
}

export interface SourceAdapter extends Source {
  readonly scrape: (fetchText: Fetcher, credentials: Credentials) => Promise<RawReport[]>
  readonly minimumReports: number
}

type Scraper = Pick<SourceAdapter, 'scrape' | 'minimumReports'>

/** How each source is read. Keyed by id, so a source the catalog lists cannot be left without one. */
const SCRAPERS: Readonly<Record<SourceId, Scraper>> = {
  spirko: { scrape: scrapeSpirko, minimumReports: 700 },
  explor8ion: { scrape: scrapeExplor8ion, minimumReports: 800 },
  stevensong: {
    scrape: scrapeStevenSong,
    // Counts only the regions this site covers, about 1,280 when the adapter
    // was fixed to read the alphabetical list. Set above the 460 its sitemap
    // alone yields, so a return to reading only the capped sitemap fails here.
    minimumReports: 1000
  },
  goldenscrambles: { scrape: scrapeGoldenScrambles, minimumReports: 400 },
  annie: { scrape: scrapeAnnie, minimumReports: 150 },
  virtualhiker: { scrape: scrapeVirtualHiker, minimumReports: 100 },
  sonnybou: {
    scrape: scrapeSonnyBou,
    // Counts only Alberta, BC and Glacier Montana; the archive as a whole
    // reaches Nevada, Idaho and Poland.
    minimumReports: 600
  },
  anugara: { scrape: scrapeAnugara, minimumReports: 600 },
  adamlaycock: { scrape: scrapeAdamLaycock, minimumReports: 350 },
  spectacularmountains: { scrape: scrapeSpectacularMountains, minimumReports: 250 },
  ontop: { scrape: scrapeOnTop, minimumReports: 300 },
  peaksandstreams: { scrape: scrapePeaksAndStreams, minimumReports: 200 },
  billkerr: { scrape: scrapeBillKerr, minimumReports: 100 },
  coastbackcountry: {
    scrape: scrapeCoastBackcountry,
    // Its scramble category only; the ski touring reports are not read.
    minimumReports: 40
  },
  steepsheep: { scrape: scrapeSteepSheep, minimumReports: 50 }
}

/** Every source with its scraper, in the catalog's order, which is also the order they are read in. */
export const SOURCES: readonly SourceAdapter[] = SOURCE_CATALOG.map(source => ({ ...source, ...SCRAPERS[source.id] }))
