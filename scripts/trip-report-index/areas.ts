/**
 * Free-text area matching, shared by the sources that state where they went in
 * prose rather than from a fixed vocabulary.
 *
 * Bob Spirko heads each report with a locality line ("Kananaskis, Alberta",
 * "Castle Provincial Park Alberta", "Kootenay Park, B.C.") and Annie Ouellet
 * names the area in her video titles ("Yoho National Park", "Yaha Tinda
 * Ranch"). Neither vocabulary is closed, so matching on a contained keyword
 * beats an exact table: "Kananaskis", "Kananaskis Country" and "Highwood,
 * Kananaskis" all land the same way, and a phrasing neither of them has used
 * yet still works.
 *
 * Order matters — the most specific pattern must come first, because
 * "Glacier National Park, Montana" also contains no word that distinguishes it
 * from Rogers Pass until Montana is tested.
 */
export const AREA_KEYWORDS: readonly (readonly [RegExp, string])[] = [
  [/waterton|akamina/i, 'waterton'],
  [/glacier national park,?\s*(?:mt|montana)\b|montana/i, 'glacier-montana'],
  [/rogers pass|selkirk|revelstoke|glacier national park,?\s*b\.?c\b|kicking horse|standard basin|gorman lake|\bgolden\b(?!\s+ears)/i, 'rogers-pass-selkirks'],
  [/yoho|lake o.?hara|emerald lake|\bfield\b/i, 'yoho'],
  [/kootenay (?:national )?park|radium|vermilion pass|marble canyon/i, 'kootenay'],
  [/assiniboine/i, 'assiniboine'],
  [/icefields? parkway|columbia icefield|wapta|bow lake|saskatchewan (?:river )?crossing|highway 93 north|central icefields|north icefields|clemenceau|murchison/i, 'icefields-parkway'],
  // These five sit above Banff because "Sunshine Coast" would otherwise match
  // its "sunshine", and above each other because "Vancouver Island" contains
  // "Vancouver".
  [/vancouver island|strathcona|tofino|cumberland|courtenay|comox/i, 'vancouver-island'],
  [/vancouver|squamish|whistler|pemberton|north shore|sunshine coast|sechelt|powell river|garibaldi|joffre lakes|duffey|lillooet|cypress provincial|mount seymour|stawamus|capilano|lynn headwaters/i, 'sea-to-sky'],
  [/chilliwack|fraser valley|cheam|manning|coquihalla|bc cascades|golden ears|north cascades|sumas mountain/i, 'fraser-valley'],
  // Above the Okanagan, which "Shuswap" and the lakes north of Vernon used to
  // fall into before they had a region of their own. Lumby is here rather than
  // with Vernon: it is the road to Mabel Lake and, by Cherryville, the Monashees.
  [/shuswap|monashee|salmon arm|skimikin|sicamous|sorrento|blind bay|tappen|enderby|mara lake|mabel lake|celista|scotch creek|saint ives|\bst\.? ives|lumby|cherryville|sugar lake|three valley gap|craigellachie|malakwa|eagle pass|keefer lake/i, 'shuswap-monashees'],
  [/okanagan|kelowna|penticton|beaverdell|osoyoos|kamloops|vernon|keremeos|cathedral park|falkland|pritchard|thompson valley|apex mountain|white lake grasslands|lac du bois|buse lake/i, 'okanagan'],
  [/nelson|kokanee|west kootenay|slocan|kaslo|new denver|nakusp|rossland|creston|stagleap|kootenay pass|valhalla|whitewater ski|crawford bay|gray creek|gladstone provincial|grand forks|castlegar|warfield/i, 'west-kootenay'],
  [/banff|lake louise|moraine|sunshine|skoki|castle junction/i, 'banff'],
  [/jasper|robson|hinton|switzer provincial|brule|miette|valemount|coal branch|grande cache|willmore|queen elizabeth range/i, 'jasper-robson'],
  [/david thompson|abraham|nordegg|siffleur|white goat|\bcline\b|bighorn|upper clearwater|\bram\b(?!parts)|clearwater ranges|north saskatchewan river|panther/i, 'david-thompson'],
  [/crowsnest|castle (?:provincial|wildland|wilderness|mountain (?:ski|resort))|livingstone|whaleback|porcupine hills|beaver mines|pincher|kiska|wilson public land|bob creek|chain lakes|beauvais lake|blairmore|coleman|bellevue|allison creek|andy good|east castle|west castle|racehorse/i, 'crowsnest-castle'],
  [/ghost|ya\s*ha\s*tinda|waiparous|red deer river|sundre/i, 'ghost-front-ranges'],
  [/kananaskis|canmore|exshaw|bragg creek|highwood|elbow|smith-dorrien|spray|sibbald|bow valley|seebe|longview|peter lou(?:g|t)heed|don getty|mclean creek|cataract creek|sheep river|bluerock|willow creek|oh ranch|evan.?thomas/i, 'kananaskis-canmore'],
  [/east kootenay|invermere|fernie|elkford|sparwood|cranbrook|kimberley|purcell|elk lakes|elk valley|bugaboo|fort steele|\belko\b|\bwasa\b|windermere|canal flats|top of the world|pedley pass|jumbo pass|island lake|fairmou?nt|flathead|kootenays|harrison range|corbin|st\. ?mary.s alpine|meachen|moyie|yahk|wycliffe|marysville|jimsmith|elk provincial forest/i, 'bc-rockies-purcells'],
  // Everywhere else the sources range to: the US southwest, New Zealand, further
  // afield, and the parts of BC and Alberta beyond the taxonomy — the north
  // coast, Haida Gwaii, Wells Gray, the prairie hills. Place names that are also
  // words in a peak's name are matched with their province ("terrace, bc").
  [/smithers|terrace,\s*bc|houston,\s*b\.?c|babine|sugarbowl|kitimat|prince rupert|haida gwaii|naikoon|moresby camp|tarundl|wells gray|cypress hills|hand hills|new zealand|\bnz\b|\baus\b|australia|utah|arizona|nevada|california|colorado|washington|oregon|idaho|wyoming|zion|yukon|iceland|peru|nepal|guatemala|argentina|mexico/i, 'elsewhere']
]

/** The region a free-text locality names, or undefined if none is recognised. */
export function matchArea(field: string): string | undefined {
  return AREA_KEYWORDS.find(([pattern]) => pattern.test(field))?.[1]
}
