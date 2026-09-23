/**
 * Hand-curated corrections. This is the one file here meant to be edited by
 * hand; everything else is derived from the sources on each run.
 *
 * It is a TypeScript module rather than YAML or JSON so that it needs no parser
 * and no dependency, gets type-checked, and can carry a comment explaining why
 * each entry exists — which is the part that stops it rotting.
 *
 * Both maps are keyed by `canonKey` output: lower case, accents and punctuation
 * stripped, "Mt." expanded to "mount", a leading "the" dropped.
 */

/**
 * Genuine spelling variants of one objective, mapping the variant onto the
 * spelling to keep. Only add a pair you have confirmed is the same mountain.
 *
 * Automatic fuzzy matching is deliberately not used — see the note in canon.ts.
 * Explor8ion alone publishes both "Mount Kitchener" and "Mount Michener", so
 * anything edit-distance would merge here has to be checked by a human first.
 * `--review` lists near-miss candidates to work from.
 */
export const ALIASES: Readonly<Record<string, string>> = {
  // Spelling variants of one peak.
  'mount hoffman': 'mount hoffmann',
  'belleview hill': 'bellevue hill',
  'blue hill lookout': 'blue hill fire lookout',
  'opal ridge north': 'opal ridge north peak',
  'opal ridge south': 'opal ridge south peak',
  'mount charles stewart south': 'charles stewart south peak',
  // Annie Ouellet's channel spells these three ways between them; all one peak.
  'haling peak': 'ha ling peak',
  'ha ling': 'ha ling peak',
  'wind tower': 'windtower',
  'blackrock mountain': 'black rock mountain',
  'yamnuska': 'mount yamnuska',
  'baldy south summit': 'baldy south peak',
  // Variants of an objective another source already names, confirmed against
  // the spelling that is on the page.
  'jura cave and creek': 'jura creek',
  'wastach peak': 'wastach mountain',
  'mockingbird': 'mockingbird lookout',
  'piitaistakis ridge': 'piitaistakis',
  'ships prow mountain true summit': 'ships prow mountain',
  'ships prow peak': 'ships prow mountain',

  // Report titles that name the objective in passing rather than plainly, and
  // would otherwise stand as an objective of their own.
  'prairie mountain for dummies': 'prairie mountain',
  'castle mountain traverse': 'castle mountain'
}

/**
 * The region an objective belongs to, keyed by canonical name, overriding
 * whatever the sources say.
 *
 * A value is either a region id from REGIONS or the string 'out-of-scope',
 * which drops the objective. Both are needed: Golden Scrambles' alphabetical
 * log mixes Rogers Pass peaks in with Colorado 14ers and Aconcagua, and without
 * a way to say "not ours" the foreign ones would sit in the review list for
 * ever.
 *
 * Two sources publish no usable region of their own: Steep Sheep publishes none
 * at all, and Bob Spirko files part of his archive under "NugaraScrambles",
 * a guidebook grouping that spans four regions. An objective only lands here if
 * it is also absent from every source that *does* publish a region, so the list
 * stays short — it is the residue after cross-source inheritance, not the whole
 * of either blog. `--review` prints the current residue in paste-ready form.
 */
export const REGION_OVERRIDES: Readonly<Record<string, string>> = {
  // --- Kananaskis Country and Canmore ---
  'black prince outlier': 'kananaskis-canmore',
  'buller north ridge': 'kananaskis-canmore',
  'burke mount north peak': 'kananaskis-canmore',
  'burns east ridge': 'kananaskis-canmore',
  'cat creek knob': 'kananaskis-canmore',
  'charles stewart south peak': 'kananaskis-canmore',
  'corral creek mountain cutline ridge': 'kananaskis-canmore',
  'exshaw ridge': 'kananaskis-canmore',
  'fist east ridge': 'kananaskis-canmore',
  'forgetmenot ridge north summit': 'kananaskis-canmore',
  'fortress ridge': 'kananaskis-canmore',
  'french creek': 'kananaskis-canmore',
  'galatea sw': 'kananaskis-canmore',
  'indian graves willow creek ridge': 'kananaskis-canmore',
  'johnson creek ridge cell phone ridge': 'kananaskis-canmore',
  'kent ridge south knob': 'kananaskis-canmore',
  'kent south peak': 'kananaskis-canmore',
  'kent south ridge': 'kananaskis-canmore',
  'kidd lookout': 'kananaskis-canmore',
  'north kent outlier': 'kananaskis-canmore',
  'odlum ridge east peak': 'kananaskis-canmore',
  'odlum ridge west peak': 'kananaskis-canmore',
  'opal ridge south traverse': 'kananaskis-canmore',
  'pasque mountain east peak': 'kananaskis-canmore',
  'plateau mountain north end': 'kananaskis-canmore',
  'rawson ridge': 'kananaskis-canmore',
  'rummel lake': 'kananaskis-canmore',
  'south rawson ridge': 'kananaskis-canmore',
  'stimson creek hills': 'kananaskis-canmore',
  'upper kananaskis falls': 'kananaskis-canmore',
  'warspite tarn': 'kananaskis-canmore',
  'willow creek hills': 'kananaskis-canmore',
  'zephyr creek hills': 'kananaskis-canmore',

  // --- Banff National Park ---
  'c level cirque': 'banff',
  'castle lookout': 'banff',
  'copper mountain west ridge': 'banff',
  'fossil ridge': 'banff',
  'mount bowlen': 'banff',
  'mount fay': 'banff',
  'mount little': 'banff',
  'mount whyte': 'banff',
  'muleshoe ridge': 'banff',
  'sanson peak': 'banff',
  'taylor lake': 'banff',
  'temple lake ridge': 'banff',

  // --- Icefields Parkway ---
  'bow peak south end': 'icefields-parkway',
  'bow summit': 'icefields-parkway',
  'hector lower south ridge': 'icefields-parkway',
  'jimmy simpson jr': 'icefields-parkway',
  'observation se1': 'icefields-parkway',

  // --- Yoho and Kootenay ---
  'narao lakes': 'yoho',
  'paget peak north': 'yoho',
  'sherbrooke lake': 'yoho',
  'marble canyon': 'kootenay',

  // --- Waterton, the Castle and the Crowsnest ---
  'avion ridge': 'waterton',
  'crypt lake': 'waterton',
  'forum ridge': 'waterton',
  'lineham twin peaks': 'waterton',
  'mounts carthew and alderson': 'waterton',
  'sunga la she': 'waterton',
  'victoria ridge': 'waterton',
  'vimy peak': 'waterton',
  'crowsnest ridge': 'crowsnest-castle',
  'livingstone south peak': 'crowsnest-castle',
  'st eloi mountain': 'crowsnest-castle',

  // --- Across the divide ---
  'jumbo pass': 'bc-rockies-purcells',
  'king george mount': 'bc-rockies-purcells',
  'prince george mount': 'bc-rockies-purcells',
  'princess mary mount': 'bc-rockies-purcells',
  'proctor mount planner peak': 'bc-rockies-purcells',
  'beaverhead peak': 'rogers-pass-selkirks',
  'little sir donald': 'rogers-pass-selkirks',
  'youngs peak traverse lookout mountain': 'rogers-pass-selkirks',

  // --- Kananaskis Country and Canmore ---
  'carnarvon lake': 'kananaskis-canmore',
  'chester lake to elephant rocks': 'kananaskis-canmore',
  'cox hill ridge': 'kananaskis-canmore',
  'dyson falls': 'kananaskis-canmore',
  'elephant rocks': 'kananaskis-canmore',
  'evan thomas creek': 'kananaskis-canmore',
  'forgetmenot north summit': 'kananaskis-canmore',
  'grassi lakes to whitemans pond': 'kananaskis-canmore',
  'heart mountain horseshoe': 'kananaskis-canmore',
  'jumpingpound': 'kananaskis-canmore',
  'jura creek': 'kananaskis-canmore',
  'king creek canyon': 'kananaskis-canmore',
  'helen kate ridge': 'icefields-parkway',
  'mount lady macdonald to the helipad': 'kananaskis-canmore',
  'piper pass': 'kananaskis-canmore',
  'powderface creek and ridge': 'kananaskis-canmore',
  'prairie creek': 'kananaskis-canmore',
  'sarrail ridge summit': 'kananaskis-canmore',
  'sibbald flats': 'kananaskis-canmore',
  'south lawson': 'kananaskis-canmore',
  'tiara peak traverse to boundary and belmore browne peaks': 'kananaskis-canmore',
  'wasootch peak and kananaskis falls': 'kananaskis-canmore',
  'white buddha': 'kananaskis-canmore',
  // Explor8ion states a range in its standfirst, but not for these two; each
  // names its area only in the body prose, which is not parsed.
  'two pines last break lyon': 'kananaskis-canmore', // "near Bragg Creek"

  // --- Banff National Park ---
  'boom lake': 'banff',
  'little beehive': 'banff',
  'castle mountain lookout': 'banff',
  'devils gap to minnewanka lake': 'banff',
  'johnston canyon to the ink pots': 'banff',
  'lake minnewanka': 'banff',

  // --- Yoho National Park ---
  'iceline trail to stanley mitchell alpine hut': 'yoho',
  'laughing falls': 'yoho',
  'opabin plateau and lake': 'yoho',
  'yoho pass to yoho lake from emerald lake': 'yoho',

  // --- Jasper and Mount Robson ---
  'folding mountain false summit': 'jasper-robson',
  'sunwapta falls': 'jasper-robson',

  // --- Waterton Lakes ---
  'bears hump': 'waterton',
  'bertha lake loop from waterton park': 'waterton',
  'great divide trail from cameron falls to cameron lake and down akamina parkway': 'waterton',
  'lineham falls': 'waterton',
  'mount crandall west route': 'waterton',

  // --- Crowsnest Pass and the Castle ---
  'mcgillivray canyon': 'crowsnest-castle',
  'north drywood falls': 'crowsnest-castle',
  // Bob Spirko's report gives no locality line; the summit is west of Pincher Creek.
  'prairie bluff': 'crowsnest-castle',
  'window mountain lake': 'crowsnest-castle',

  // --- The Ghost and the Front Ranges ---
  'wildcat': 'ghost-front-ranges',
  'pringle mount': 'ghost-front-ranges', // "on my way to the Ghost Wilderness and Ya Ha Tinda"

  // --- BC Rockies and the Purcells ---
  'farnham glacier overland': 'bc-rockies-purcells',
  'lake of the hanging glacier': 'bc-rockies-purcells',
  'lower bugaboo falls': 'bc-rockies-purcells',

  // --- West Kootenay ---
  // Steven Song files the whole Selkirk range under one heading, which mixes
  // Rogers Pass with the southern Selkirks 200 km away. These four are the
  // southern end: Valhalla, Kokanee Glacier, and the peaks above Nelson.
  'gladsheim peak': 'west-kootenay',
  'kokanee peak': 'west-kootenay',
  'wood peak': 'west-kootenay',
  'mount grohman': 'west-kootenay',

  // --- Not ours to list: Annie Ouellet’s channel ranges wider than this site ---
  // Prairie and badlands, not the mountains.
  'coulee viewpoint': 'out-of-scope',
  'dinosaure provincial park': 'out-of-scope',
  'eagle lake': 'out-of-scope',
  'glenbow ranch provincial park': 'out-of-scope',
  'kinbrook provincial park kinbrook island': 'out-of-scope',
  // The Okanagan, well west of anything here.
  'mcintyre bluff': 'out-of-scope',
  'mount kobau and chopaka lookout': 'out-of-scope',
  'saddle rock': 'out-of-scope',
  // Not a hike: a resort day, a skate, a road ride, a paved path.
  'lake louise ski resort': 'out-of-scope',
  'lake louises': 'out-of-scope',
  'legacy trail canmore to banff': 'out-of-scope',
  'cascade pound johnson lake': 'out-of-scope',
  'bandlands': 'out-of-scope',
  'fossil displays': 'out-of-scope',
  'cottonwood': 'out-of-scope',
  'road bike castle junction to moraine lake': 'out-of-scope',
  'skating on lake anette': 'out-of-scope',

  // --- Not ours to list ---
  // Prairie and badlands: Alberta, but not the mountains.
  'dry island buffalo jump': 'out-of-scope',
  'horse thief canyon': 'out-of-scope',
  'horseshoe canyon': 'out-of-scope',
  'writing on stone': 'out-of-scope',
  // Steep Sheep and Golden Scrambles range well beyond the Rockies.
  'acatenango': 'out-of-scope',
  'bonete cerro': 'out-of-scope',
  'ishpatina ridge tower summit': 'out-of-scope',
  'mount ollivier': 'out-of-scope',
  'mount rosea': 'out-of-scope',
  'mount ruapehu tukino peak': 'out-of-scope',
  'mount tauhara': 'out-of-scope',
  'mount wakefield': 'out-of-scope',
  'st arnaud range': 'out-of-scope',
  'volcan san pedro': 'out-of-scope',
  'yeoward mountain': 'out-of-scope',
  'thurston mount elk mountain': 'out-of-scope',
  // Goblin Valley State Park, Utah — the title names no country and the
  // description gives it away ("sandstone cave", "3.7 miles round trip").
  'goblins lair': 'out-of-scope',
  // People, not places: two videos titled only with a name.
  'adam perron': 'out-of-scope',
  'adam perron 2006': 'out-of-scope',
  // Articles and asides that sit among the trip reports on their blog.
  'digital photography with an eye to prints': 'out-of-scope',
  'i saw a bear video': 'out-of-scope',
  'sit by a lake': 'out-of-scope',
  'studio work': 'out-of-scope',
  'train passes by my cottage': 'out-of-scope',
  'virtually where': 'out-of-scope'
}
