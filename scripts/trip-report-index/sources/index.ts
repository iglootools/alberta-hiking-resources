/**
 * The source registry.
 *
 * `minimumReports` is the safety net that lets the parsers stay regex-based.
 * Each is set well below what the source published when its adapter was
 * written, so normal growth never trips it, but a redesign that breaks an
 * extractor fails the run instead of silently emptying a region page.
 */
import type { Fetcher } from '../fetch.ts'
import type { RawReport, Source } from '../types.ts'
import { scrapeAdamLaycock } from './adamlaycock.ts'
import { requireApiKey, scrapeAnnie } from './annie.ts'
import { scrapeAnugara } from './anugara.ts'
import { scrapeBillKerr } from './billkerr.ts'
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

export interface SourceAdapter extends Source {
  readonly scrape: (fetchText: Fetcher) => Promise<RawReport[]>
  readonly minimumReports: number
  /**
   * Checked for every source before any scraping starts, so a missing
   * credential fails in the first second rather than after the other sources
   * have been read. Only YouTube needs one.
   */
  readonly preflight?: () => void
}

/**
 * Listed in the order their links appear under an objective, so the two
 * archives with the widest coverage come first.
 *
 * climbglacier.com is deliberately absent: its 44 pages are the guidebook
 * series and its blog, with no per-peak route reports to index. It stays a
 * plain link on the trip reports page.
 */
export const SOURCES: readonly SourceAdapter[] = [
  {
    id: 'spirko',
    label: 'Bob Spirko',
    home: 'http://bobspirko.ca/',
    scrape: scrapeSpirko,
    minimumReports: 700
  },
  {
    id: 'explor8ion',
    label: 'Explor8ion',
    home: 'https://www.explor8ion.com/',
    scrape: scrapeExplor8ion,
    minimumReports: 800
  },
  {
    id: 'stevensong',
    label: 'Steven Song',
    home: 'https://stevensong.com/',
    scrape: scrapeStevenSong,
    // Counts only the Rockies, Selkirks, Purcells and Montana; the archive as a
    // whole is roughly five times this and mostly coastal BC and the US.
    minimumReports: 150
  },
  {
    id: 'goldenscrambles',
    label: 'Golden Scrambles',
    home: 'http://goldenscrambles.ca/',
    scrape: scrapeGoldenScrambles,
    minimumReports: 400
  },
  {
    id: 'annie',
    label: 'Annie Ouellet',
    home: 'https://www.youtube.com/@AnnieSteveClimbingTheRockies',
    scrape: scrapeAnnie,
    preflight: requireApiKey,
    minimumReports: 150
  },
  {
    id: 'virtualhiker',
    label: 'Virtual Hiker',
    home: 'https://virtualhiker.wordpress.com/',
    scrape: scrapeVirtualHiker,
    minimumReports: 100
  },
  {
    id: 'sonnybou',
    label: 'Sonny Bou',
    home: 'https://sonnybou.ca/scrambles/',
    scrape: scrapeSonnyBou,
    // Counts only Alberta, BC and Glacier Montana; the archive as a whole
    // reaches Nevada, Idaho and Poland.
    minimumReports: 600
  },
  {
    id: 'anugara',
    label: 'Andrew Nugara',
    home: 'https://anugara.net/log.html',
    scrape: scrapeAnugara,
    minimumReports: 600
  },
  {
    id: 'adamlaycock',
    label: 'Adam Laycock',
    home: 'https://adamlaycock.ca/Routes',
    scrape: scrapeAdamLaycock,
    minimumReports: 350
  },
  {
    id: 'spectacularmountains',
    label: 'Spectacular Mountains',
    home: 'https://www.spectacularmountains.com/',
    scrape: scrapeSpectacularMountains,
    minimumReports: 250
  },
  {
    id: 'ontop',
    label: 'On-Top',
    home: 'https://www.on-top.ca/',
    scrape: scrapeOnTop,
    minimumReports: 300
  },
  {
    id: 'peaksandstreams',
    label: 'Peaks and Streams',
    home: 'https://peaksandstreams.com/',
    scrape: scrapePeaksAndStreams,
    minimumReports: 200
  },
  {
    id: 'billkerr',
    label: 'Bill Kerr',
    home: 'https://www.billkerr.ca/',
    scrape: scrapeBillKerr,
    minimumReports: 100
  },
  {
    id: 'steepsheep',
    label: 'Steep Sheep',
    home: 'https://steepsheep.ca/',
    scrape: scrapeSteepSheep,
    minimumReports: 50
  }
]

export const SOURCE_ORDER: readonly string[] = SOURCES.map(source => source.id)
