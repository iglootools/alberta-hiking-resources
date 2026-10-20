/**
 * Hand-curated corrections. This is the one file here meant to be edited by
 * hand; everything else is derived from the sources on each run.
 *
 * It is a TypeScript module rather than YAML or JSON so that it needs no parser
 * and no dependency, gets type-checked, and can carry a comment explaining why
 * each entry exists — which is the part that stops it rotting.
 *
 * ALIASES and REGION_OVERRIDES are keyed by `canonKey` output: lower case,
 * accents and punctuation stripped, "Mt." expanded to "mount", a leading "the"
 * dropped. REPORT_OBJECTIVES is keyed by report URL.
 */

/**
 * The objectives one report covers, replacing what its title parses to.
 *
 * For the case the other two maps cannot express: a report whose name is
 * shared with a different mountain, published by a source with no region of
 * its own. The exact-match key merges it into the other peak, and because no
 * single source files the name under two regions, the homonym split in
 * regions.ts never fires. Giving the report a name of its own is what keeps it
 * off the wrong page. Only add a report you have read.
 */
export const REPORT_OBJECTIVES: Readonly<Record<string, readonly string[]>> = {
  // Climbed from Echo Lake in the Coast Mountains, not the Rockies peak above
  // the Icefields Parkway that every other source means.
  'https://coastbackcountry.com/2007/07/31/mount-murchison/': ['Mount Murchison, Echo Lake'],
  // The Fisher Peak above Cranbrook, not the Kananaskis one every other source
  // means; merged, it put the Kananaskis peak on the BC Rockies page too.
  'https://www.billkerr.ca/index.php/fisher-peak-cranbrook-july-52011/': ['Fisher Peak, Cranbrook'],
  // The Mount Henry above Jasper. Peaks and Streams and Andrew Nugara mean the
  // one in Glacier National Park, Montana, beside Appistoki Peak; merged, each
  // peak was listed on the other's page, and the Montana one's companions were
  // pulled towards Jasper.
  'https://stevensong.com/canadian-rockies/jasper/mount-henry/': ['Mount Henry, Jasper'],

  // Titles that parse to a name the report is not about. Each was read.
  // Nugara's log lists his fifth Pincher Ridge visit by its date alone.
  'https://anugara.net/pincher5.html': ['Pincher Ridge'],
  'https://anugara.net/buchanan.htm': ['Buchanan Ridge', 'Buchanan Peak'],
  'https://www.billkerr.ca/index.php/doorjamloder-may-152011/': ['Door Jamb Mountain', 'Loder Peak'],
  // Generic names, renamed here rather than given a region by name, which would
  // also catch any other "Unnamed" or "Mount Logan" a blog published later.
  'https://anugara.net/unnamed2.htm': ['Unnamed between Popes Peak and Mount Collier'],
  'https://anugara.net/logan.html': ['Mount Logan, Glacier National Park'],
  // Trips abroad under common names, dropped by report for the same reason:
  // Paradise Peak on St. Martin and Santa María in Guatemala. Spectacular
  // Mountains' older pages name no locality, so its adapter cannot tell.
  'https://www.spectacularmountains.com/paradise-peak-st-martin/': [],
  'https://www.spectacularmountains.com/santa-maria/': []
}

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
  'castle mountain traverse': 'castle mountain',

  // Coast Backcountry's names for peaks other sources already place. Its
  // Coquihalla report says "Coquihalla Mountain" in the body, and its
  // Callaghan report "Callaghan Peak".
  'coquihalla peak': 'coquihalla mountain',
  'jim kelly': 'jim kelly peak',
  'callaghan mountain': 'mount callaghan',

  // Names written without their generic, from the worksheet's "Names without
  // their generic" section, each checked against its report: same peak, and
  // the regions agree or are the two sides of one boundary. Rejected, as
  // different features sharing a word: The Wedge, The Table, The Tent, The
  // Onion, The Fortress, The Beehive, The Dog, The Sphinx, Whitehorn (the ski
  // hill), Wapta (the icefield), Marble, Carry, Eagle, Ghost, Little Goat, and
  // the passes and lakes in "Cory & Edith Passes", "Pulsatilla & Badger
  // Passes" and "Cirque & Chephren Lakes".
  //
  // Bill Kerr titles his posts by the bare name.
  'andromache': 'mount andromache',
  'brett': 'mount brett',
  'carthew': 'mount carthew',
  'erickson': 'mount erickson',
  'evan thomas': 'mount evan thomas',
  'heart': 'heart mountain',
  'holy cross': 'holy cross mountain',
  'hornecker': 'mount hornecker',
  'isabelle': 'isabelle peak',
  'jimmy simpson': 'mount jimmy simpson',
  'kent south': 'kent south peak',
  'kiwetinok': 'kiwetinok peak',
  'lady macdonald': 'mount lady macdonald',
  'limestone': 'limestone mountain',
  'livingstone': 'mount livingstone',
  'niles': 'mount niles',
  'opal south': 'opal south peak',
  'sheol': 'sheol mountain',
  // Door Jamb is spelled both ways, with and without the generic.
  'doorjamb': 'door jamb mountain',
  'door jamb': 'door jamb mountain',
  'doorjamb mountain': 'door jamb mountain',
  // Explor8ion's combined trips share one generic between several names —
  // "Aberdeen & Haddo, Mount", "Ward, Mount & Allison & Window" — so every
  // name but one arrives without it.
  'aberdeen': 'mount aberdeen',
  'allison': 'allison peak',
  'andy good': 'andy good peak',
  'anthozoan': 'anthozoan mountain',
  'belmore brown': 'belmore brown peak',
  'clubs': 'clubs peak',
  'cross': 'cross peak',
  'dundy': 'dundy peak',
  'etherington': 'mount etherington',
  'fairview': 'fairview mountain',
  'fording': 'fording mountain',
  'fossil': 'fossil mountain',
  'gargantua': 'gargantua peak',
  'gilligan': 'gilligan peak',
  'gunnery': 'gunnery mountain',
  'hawkins': 'mount hawkins',
  'hearts': 'hearts peak',
  'huber': 'mount huber',
  'isola': 'isola peak',
  'kilmarnock': 'mount kilmarnock',
  'kootenai brown': 'kootenai brown peak',
  'krowicki': 'krowicki peak',
  'lineham': 'mount lineham',
  'loomis': 'mount loomis',
  'lost': 'lost mountain',
  'mcgladrey': 'mount mcgladrey',
  'poker': 'poker peak',
  'serendipity': 'serendipity peak',
  'skoki': 'skoki mountain',
  'south totem': 'south totem peak',
  'spades': 'spades peak',
  'stenton': 'stenton peak',
  'tyrwhitt': 'mount tyrwhitt',
  'well site': 'well site mountain',
  'window': 'window mountain',
  'worthington': 'mount worthington',
  'yarrow': 'mount yarrow',
  'zekes': 'zekes peak',
  'zombie': 'zombie peak',
  // The rest, one or two from each of several blogs.
  'androlumbia': 'mount androlumbia',
  'buchanan': 'buchanan peak',
  'castle rock': 'castle rock peak',
  'cegnfs peak': 'cegnfs',
  'clements': 'clements mountain',
  'edith cavell': 'mount edith cavell',
  'giants head': 'giants head mountain',
  'hector south': 'hector south peak',
  'jumpingpound': 'jumpingpound mountain',
  'kidd lookout': 'mount kidd lookout',
  'kindersley south': 'kindersley south peak',
  'little alberta': 'mount little alberta',
  'little lawson': 'little lawson peak',
  'livingstone south': 'livingstone south peak',
  'north castle': 'north castle peak',
  'north twin': 'north twin peak',
  'northeast end of loaf': 'northeast end of loaf mountain',
  'promised land': 'promised land peak',
  'sky pilot': 'sky pilot mountain',
  'slalok': 'slalok mountain',
  'south twin': 'south twin peak',
  'stawamus chief': 'stawamus chief mountain',
  'stonerabbit': 'stonerabbit peak',
  'table top': 'table top peak',
  'top hat': 'top hat peak',
  'twin cairns': 'twin cairns peak',
  'west twin': 'west twin peak',
  'yates': 'yates mountain',
  // Read in their reports, from the catch-all page.
  'fisera ridge skin up': 'fisera ridge',
  'skin up fisera ridge trail': 'fisera ridge',
  'ship prows mountain': 'ships prow mountain',
  'st eloi': 'st eloi mountain' // "St. Eloi Mountain, 2nd peak of Syncline Mountain"
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

  // --- Sea to Sky and the Coast Mountains ---
  // Coast Backcountry publishes no region, and most of its scrambles are
  // objectives no other source has. Placed where the post names its area
  // (quoted), or where the peak is unambiguous. Those that are neither stay
  // unsorted rather than guessed at: Devil's Tongue, Elusive Peak, Mount
  // Hatfield, Outrigger Peak, Sun Peak, Stonerabbit, and Mount Murchison.
  'armchair traverse': 'sea-to-sky', // "traversing from Cook to Weart"
  'athelney pass': 'sea-to-sky',
  'blackcomb buttress': 'sea-to-sky',
  'brew hut': 'sea-to-sky',
  'chilcotins backpacking': 'sea-to-sky', // north of Pemberton and Gold Bridge
  'cloudburst mountain': 'sea-to-sky',
  'co pilot': 'sea-to-sky',
  'crown mountain': 'sea-to-sky', // "just outside of Vancouver"
  'cypress peak': 'sea-to-sky', // "along the Squamish Cheakamus Divide"
  'downton creek': 'sea-to-sky',
  'elaho valley': 'sea-to-sky',
  'gideon peak': 'sea-to-sky', // "above Van Horlick Creek"
  'gott creek': 'sea-to-sky',
  'gott creek west fork': 'sea-to-sky', // "into the Duffey"
  'lake lovelywater': 'sea-to-sky', // "to the Tantalus Range"
  'lydia mountain': 'sea-to-sky', // "above Lake Lovelywater"
  'mount chief pascal': 'sea-to-sky', // "on the Duffey"
  'mount gillespi': 'sea-to-sky', // "in the Mamquam area"
  'mount hanover': 'sea-to-sky',
  'mount niobe': 'sea-to-sky',
  'mount ronayne': 'sea-to-sky',
  'mountain lakes hut': 'sea-to-sky', // "We climbed Ledge, Sky Pilot, Sheer and Ben Lomond"
  'omega mountain': 'sea-to-sky',
  'saxifrage mountain': 'sea-to-sky', // "in the Duffey"
  'seagram lake': 'sea-to-sky', // "from Squamish Main Branch 220"
  'shovelnose creek': 'sea-to-sky', // "on the Squamish-Cheakamus Divide"
  'sigurd creek': 'sea-to-sky', // "the north end of the Tantalus Range"
  'sigurd lake': 'sea-to-sky',
  'sigurd peak': 'sea-to-sky',
  'st jacobs mountain': 'sea-to-sky',
  'tantalus traverse': 'sea-to-sky',
  'tricouni meadows east': 'sea-to-sky',
  'tricouni peak': 'sea-to-sky',

  // --- Jasper and Mount Robson ---
  // Steven Song files it with the Monashees, which it is, but at their far
  // northern end above Valemount, 300 km from the Shuswap and beside Robson.
  'canoe mountain': 'jasper-robson',

  // --- Fraser Valley and the Cascades ---
  'conway peak': 'fraser-valley', // "in Cheam Range"
  'edge peak': 'fraser-valley', // Golden Ears
  'isollilock peak': 'fraser-valley',
  'mount mcguire': 'fraser-valley', // "the access from Tamihi"
  'mount robie reid': 'fraser-valley',
  'silvertip mountain': 'fraser-valley', // "from the Silver-Skagit"
  'tulameen mountain': 'fraser-valley', // climbed with Coquihalla Mountain
  'vicuna peak': 'fraser-valley', // climbed with Guanaco Peak

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
  'virtually where': 'out-of-scope',

  // --- From the catch-all page, October 2026, each read in its report ---
  // Kananaskis Country and Canmore. Andrew Nugara's grid references say where
  // they are in their titles: "north of Mount McDougall", "(Highwood Range)",
  // "east end of Burns Ridge", "south Kananaskis".
  'big rim ridge': 'kananaskis-canmore',
  'birdwood mountain': 'kananaskis-canmore',
  'black prince tarns': 'kananaskis-canmore',
  'bogart tower': 'kananaskis-canmore',
  'buller pass peak': 'kananaskis-canmore',
  'burns ridge': 'kananaskis-canmore',
  'canyon creek ice caves': 'kananaskis-canmore',
  'east peak of wendell mountain': 'kananaskis-canmore',
  'engadine burn': 'kananaskis-canmore',
  'glasgow n': 'kananaskis-canmore',
  'goat creek peak 1': 'kananaskis-canmore',
  'gr237374': 'kananaskis-canmore',
  'gr244254': 'kananaskis-canmore',
  'gr308352': 'kananaskis-canmore',
  'gr34447': 'kananaskis-canmore',
  'gr345444': 'kananaskis-canmore',
  'gr369377': 'kananaskis-canmore',
  'gr371159': 'kananaskis-canmore',
  'gr380492': 'kananaskis-canmore',
  'gr385487': 'kananaskis-canmore',
  'gr555096': 'kananaskis-canmore',
  'gr565088': 'kananaskis-canmore',
  'gr617954': 'kananaskis-canmore',
  'gr628936': 'kananaskis-canmore',
  'grable peak': 'kananaskis-canmore',
  'grable peak recconaissance': 'kananaskis-canmore',
  'grillmair chimney on mount yamnuska': 'kananaskis-canmore',
  'guinns pass': 'kananaskis-canmore',
  'kananaskis weekend': 'kananaskis-canmore',
  'lake warspite': 'kananaskis-canmore',
  'limestone mountain loop': 'kananaskis-canmore',
  'little evan': 'kananaskis-canmore',
  'mount indefatigable traverse': 'kananaskis-canmore',
  'opal falls': 'kananaskis-canmore',
  'piggyburst col': 'kananaskis-canmore',
  'ridge at gr302358': 'kananaskis-canmore',
  'robertson pass': 'kananaskis-canmore',
  'south baldy ridge': 'kananaskis-canmore',
  'spoon needle scramble attempt from galatea creek': 'kananaskis-canmore',
  'suicide peak': 'kananaskis-canmore',
  'unnamed at gr303516': 'kananaskis-canmore',
  'unnamed summit at gr338442': 'kananaskis-canmore',
  'unnamed summit at gr652811': 'kananaskis-canmore',
  'unnamed summits at gr334455': 'kananaskis-canmore',
  'west wind pass windtower': 'kananaskis-canmore',
  // Elsewhere in the Rockies.
  'assiniboine area trip': 'assiniboine',
  'monarchs healy pass': 'banff',
  'unnamed between popes peak and mount collier': 'banff',
  'east stanley ridge': 'kootenay',
  'stanley valley': 'kootenay',
  'mount mistaya': 'icefields-parkway',
  'observation subpeak': 'icefields-parkway',
  'peyto hut': 'icefields-parkway',
  'akamina west': 'waterton',
  'bennett pass peak': 'waterton', // "close to Bennett Pass", from Wall Lake
  'blakiston drainage north': 'waterton',
  'mount blakiston horseshoe': 'waterton',
  'mount galwey loop': 'waterton',
  // Glacier National Park's names that GNIS spells otherwise ("Mount Cannon").
  'cannon mountain': 'glacier-montana',
  'henkel mountain': 'glacier-montana',
  'mount logan glacier national park': 'glacier-montana',
  // Beyond the Rockies.
  'eagles landing': 'bc-rockies-purcells', // "north ridge of Angel's Peak in the East Kootenays"
  'graves lookout': 'bc-rockies-purcells', // Sonny Bou: "White River, BC"
  'haystack mountain': 'bc-rockies-purcells', // Sonny Bou: "Kianuko Provincial Park, BC", in the Purcells
  'king george south face': 'bc-rockies-purcells',
  'sunshine high point': 'west-kootenay', // Sonny Bou's report is under the Phoenix ski area
  'blanket': 'shuswap-monashees', // the Blanket Glacier Chalet
  'ellison to winfield via the okanagan rail trail': 'okanagan',
  // Ice and sport climbs, which this index of hikes and scrambles does not cover.
  'aftonroe': 'out-of-scope',
  'chantilly falls': 'out-of-scope',
  'combo falls': 'out-of-scope',
  'grotto falls': 'out-of-scope',
  'ice climbing': 'out-of-scope',
  'interpretive canyon ice climbing': 'out-of-scope',
  'left compound gully ice climb': 'out-of-scope',
  'morningside sport climb': 'out-of-scope',
  'wedge smear': 'out-of-scope',
  // Abroad, or beyond the taxonomy.
  'almolonga candelaria': 'out-of-scope',
  'atalaya monte': 'out-of-scope',
  'axeman peak': 'out-of-scope', // Tombstone Territorial Park, Yukon
  'blencathra via sharp edge ridge': 'out-of-scope',
  'cameron falls': 'out-of-scope',
  'chicabal': 'out-of-scope',
  'el boqueron': 'out-of-scope',
  'el pital': 'out-of-scope',
  'mera peak nepal': 'out-of-scope',
  'mera peak trek': 'out-of-scope',
  'moab': 'out-of-scope',
  'moab roadtrip': 'out-of-scope',
  'mount liamuiga': 'out-of-scope',
  'nevis peak': 'out-of-scope',
  'nwt waterfalls': 'out-of-scope',
  'olivees mountain': 'out-of-scope',
  'picacho': 'out-of-scope',
  'quemado': 'out-of-scope',
  'royal mont': 'out-of-scope',
  'santo tomas': 'out-of-scope',
  'tajamulco': 'out-of-scope',
  'yellowknife': 'out-of-scope',
  // Not trips: photo essays, an exhibition, a lockdown diary.
  'a byte of history pop up museum 1': 'out-of-scope',
  'lethbridge landscapes': 'out-of-scope',
  'mountain landscapes': 'out-of-scope',
  'prairie landscapes': 'out-of-scope',
  'unexpected photo day': 'out-of-scope',
  'urban mountains march to': 'out-of-scope'
}
