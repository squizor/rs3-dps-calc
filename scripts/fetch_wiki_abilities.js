const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../src/assets/data/abilities.json');
const WIKI_API_URL = 'https://runescape.wiki/api.php';

// Specific abilities
const CATEGORIES = [
    'Melee_abilities', 'Ranged_abilities', 'Magic_abilities', 
    'Necromancy_abilities', 'Defence_abilities', 'Constitution_abilities'
];

const IGNORE_NAMES = [
    'Shout - Green Egg', 'Shout - Blue Egg', 'Shout - Red Egg', 
    'Shout - Poisoned Meat', 'Shout - Poisoned Worms', 'Shout - Poisoned Tofu', 
    'Shout - Worms', 'Shout - Tofu', 'Shout - Crackers',
    'Aggressive Stance', 'Defensive Stance', 'Balanced Stance', 'Reckless Stance',
    'Demoralise', 'Demoralise (Open Beta)', 'Momentum', 'Revolution', 'Single-Way Wilderness',
    'Horror', 'Shock', 'Rout', 'Aggression', 'Unsullied', "Kuradel's Favour",
    'Shout - Defensive Stance', 'Shout - Balanced Stance', 'Shout - Aggressive Stance',
    'Lesser Smash', 'Lesser Havoc', 'Lesser Sever', 'Lesser Cleave', 'Lesser Dismember',
    'Lesser Dazing Shot', 'Lesser Needle Strike', 'Lesser Fragmentation Shot', 'Lesser Snipe',
    'Lesser Combust', 'Lesser Dragon Breath', 'Lesser Sonic Wave', 'Lesser Concentrated Blast'
];

const PRESERVE_NAMES = [
    'Adrenaline Potion', 'Super Adrenaline Potion', 'Adrenaline Renewal Potion', 
    'Limitless', 'Eat Food', "Guthix's Blessing", 'Ice Asylum', 'Essence of Finality'
];

// Script doesn't pull the proper icons, so I manually downloaded them
const CUSTOM_ICON_ABILITIES = [
    'Attack', 'Ranged', 'Magic', 'Necromancy', 
    'Dragon Slayer', 'Demon Slayer', 'Undead Slayer'
];

async function fetchWikiPages(category) {
    let pages = [];
    let cmcontinue = null;
    do {
        let url = `${WIKI_API_URL}?action=query&list=categorymembers&cmtitle=Category:${category}&cmlimit=500&format=json`;
        if (cmcontinue) url += `&cmcontinue=${cmcontinue}`;
        
        const response = await fetch(url, { headers: { 'User-Agent': 'RS3-DPS-Calc-Updater/1.0' } });
        const data = await response.json();
        if (!data.query) { console.error('API Error:', data); break; }
        pages.push(...data.query.categorymembers);
        cmcontinue = data.continue ? data.continue.cmcontinue : null;
    } while (cmcontinue);
    return pages.filter(p => p.ns === 0).map(p => p.title);
}

async function fetchAllWikiAbilitiesPage() {
    const url = `${WIKI_API_URL}?action=parse&page=Abilities&format=json`;
    const response = await fetch(url, { headers: { 'User-Agent': 'RS3-DPS-Calc-Updater/1.0' } });
    const data = await response.json();
    if (!data.parse || !data.parse.text) return [];
    
    const text = data.parse.text['*'];
    const matches = [...text.matchAll(/<tr>\n<td>(?:<span[^>]*>)?(?:<a[^>]*>(?:<img[^>]*>)?<\/a>)?(?:<\/span>)?\n<\/td>\n<td><a href=\"\/w\/[^\"]+\" title=\"([^\"]+)\"/g)];
    
    const uniqueTitles = [...new Set(matches.map(m => m[1]))];
    return uniqueTitles.map(t => t.replace(/ \([^)]+\)/g, ''));
}

async function fetchWikitext(titles) {
    let allContent = {};
    for (let i = 0; i < titles.length; i += 50) {
        const chunk = titles.slice(i, i + 50);
        const url = `${WIKI_API_URL}?action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(chunk.join('|'))}&format=json`;
        const response = await fetch(url, { headers: { 'User-Agent': 'RS3-DPS-Calc-Updater/1.0' } });
        const data = await response.json();
        
        if (!data.query || !data.query.pages) continue;

        for (const pageId in data.query.pages) {
            const page = data.query.pages[pageId];
            if (page.revisions) {
                allContent[page.title] = page.revisions[0].slots.main['*'];
            }
        }
    }
    return allContent;
}

async function downloadIcon(abilityName, localPath) {
    try {
        const fileTitle = `File:${abilityName}.png`;
        const url = `${WIKI_API_URL}?action=query&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(fileTitle)}&format=json`;
        const response = await fetch(url, { headers: { 'User-Agent': 'RS3-DPS-Calc-Updater/1.0' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const pages = data.query?.pages;
        if (!pages) return;
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1' || !pages[pageId].imageinfo || !pages[pageId].imageinfo[0].url) return;
        
        const imageUrl = pages[pageId].imageinfo[0].url;
        const imgRes = await fetch(imageUrl, { headers: { 'User-Agent': 'RS3-DPS-Calc-Updater/1.0' } });
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status} for image`);
        const buffer = await imgRes.arrayBuffer();
        fs.writeFileSync(localPath, Buffer.from(buffer));
    } catch (e) {
        console.error(`Failed to download icon for ${abilityName}:`, e.message);
    }
}

function extractInfobox(wikitext) {
    const match = wikitext.match(/{{Infobox Ability[\s\S]*?^}}$/m) || wikitext.match(/{{Infobox Ability[\s\S]*?\n}}/m);
    if (!match) return null;
    
    let info = {};
    const lines = match[0].split('\n');
    for (let line of lines) {
        if (line.trim().startsWith('|')) {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].replace(/\|/g, '').trim().toLowerCase();
                const val = parts.slice(1).join('=').trim();
                info[key] = val;
            }
        }
    }
    return info;
}

function parseDamage(damageStr) {
    if (!damageStr) return { min: 0, max: 0 };
    const nums = [...damageStr.matchAll(/(\d+(\.\d+)?)/g)].map(m => parseFloat(m[1]));
    if (nums.length === 0) return { min: 0, max: 0 };
    
    if (nums.length === 1) return { min: nums[0], max: nums[0] };
    if (damageStr.includes('-')) {
        return { min: nums[0], max: nums[1] };
    }

    return { min: nums[0], max: nums[0] };
}

function parseAdrenaline(costStr) {
    if (!costStr) return 9;
    if (costStr.toLowerCase().includes('gain')) {
        const nums = costStr.match(/(\d+)/);
        return nums ? parseInt(nums[1]) : 9;
    }
    if (costStr.toLowerCase().includes('cost') || costStr.toLowerCase().includes('drain')) {
        const nums = costStr.match(/(\d+)/);
        return nums ? -parseInt(nums[1]) : -15;
    }
    const val = parseInt(costStr.replace(/\D/g, ''));
    if (isNaN(val)) return 0;
    return -val;
}

async function run() {
    let existingData = {};
    if (fs.existsSync(OUTPUT_PATH)) {
        existingData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    }

    const wikiData = {};
    
    const flatExisting = [];
    const existingStyleMap = {};
    Object.keys(existingData).forEach(style => {
        if (Array.isArray(existingData[style])) {
            existingData[style].forEach(abi => {
                flatExisting.push(abi);
                existingStyleMap[abi.name.toLowerCase()] = style;
            });
        }
    });
    
    const outData = {
        'Attack': [],
        'Ranged': [],
        'Magic': [],
        'Necromancy': [],
        'Defence': [],
        'Constitution': [],
        'Items': []
    };

    const canonicalTitles = await fetchAllWikiAbilitiesPage();
    let allTitlesToFetch = [...new Set([...canonicalTitles])];

    let titleToCategory = {};

    for (let cat of CATEGORIES) {
        const catTitles = await fetchWikiPages(cat);
        catTitles.forEach(t => titleToCategory[t] = cat);
        allTitlesToFetch.push(...catTitles);
    }
    allTitlesToFetch = [...new Set(allTitlesToFetch)];

    const pagesRaw = await fetchWikitext(allTitlesToFetch);
    
    for (let [title, text] of Object.entries(pagesRaw)) {
            const info = extractInfobox(text);
            if (!info) continue;

            let finalName = title.replace(/ \([^)]+\)/g, '');
            if (IGNORE_NAMES.includes(finalName)) continue;

            const existing = flatExisting.find(e => e.name.toLowerCase() === title.toLowerCase());
            
            let t = 'basic';
            if (info.type?.toLowerCase().includes('threshold')) t = 'threshold';
            if (info.type?.toLowerCase().includes('ultimate')) t = 'ultimate';

            let cd = existing ? existing.cooldown : 0;
            if (info.cd) cd = parseFloat(info.cd);

            let adren = existing ? existing.adrenaline : 9;
            if (adren === 8) adren = 9;

            if (info.adr) {
                let adrtxt = info.adr.toLowerCase();
                if (adrtxt.includes('gain')) adren = parseInt(adrtxt.match(/\d+/) || 9);
                else adren = -parseInt(adrtxt.match(/\d+/) || 15);
            }

            let damage = existing ? existing.damage : {min: 0, max: 0};
            if (info.damage) damage = parseDamage(info.damage);

            let styleCategory = 'Attack';
            if (existingStyleMap[title.toLowerCase()]) {
                styleCategory = existingStyleMap[title.toLowerCase()];
                if (styleCategory === 'Strength') styleCategory = 'Attack';
            } else {
                let cat = titleToCategory[title] || 'Melee_abilities';
                if (cat === 'Melee_abilities') styleCategory = 'Attack';
                else if (cat === 'Ranged_abilities') styleCategory = 'Ranged';
                else if (cat === 'Magic_abilities') styleCategory = 'Magic';
                else if (cat === 'Necromancy_abilities') styleCategory = 'Necromancy';
                else if (cat === 'Defence_abilities') styleCategory = 'Defence';
                else if (cat === 'Constitution_abilities') styleCategory = 'Constitution';
            }

            let iconFilename = finalName.toLowerCase().replace(/ /g, '_').replace(/[':]/g, '') + '.png';
            
            if (CUSTOM_ICON_ABILITIES.includes(finalName)) {
                iconFilename = `${finalName.toLowerCase().replace(/ /g, '_')}_(ability).png`;
            }

            const iconLocalPath = path.join(__dirname, '../src/assets/icons', iconFilename);
            
            const newAbility = {
                id: existing ? existing.id : Math.floor(Math.random() * 10000) + 1000,
                name: existing ? existing.name : finalName,
                type: t,
                is_greater: finalName.toLowerCase().includes('greater'),
                gear: existing ? existing.gear : 'all',
                adrenaline: adren,
                cooldown: cd,
                damage: damage,
                icon: `icons/${iconFilename.toLowerCase()}`
            };
            
            if (existing && existing.effects) newAbility.effects = existing.effects;

            if (!CUSTOM_ICON_ABILITIES.includes(finalName) || !fs.existsSync(iconLocalPath)) {
                await downloadIcon(finalName, iconLocalPath);
            }

            if (!outData[styleCategory]) {
                outData[styleCategory] = [];
            }
            outData[styleCategory].push(newAbility);
        }

    for (let p of PRESERVE_NAMES) {
        const existing = flatExisting.find(e => e.name.toLowerCase() === p.toLowerCase());
        if (existing) {
            let cat = 'Items';
            if (!outData[cat]) outData[cat] = [];
            
            let existingInCat = false;
            for (let style in outData) {
                if (outData[style].find(a => a.name.toLowerCase() === p.toLowerCase())) existingInCat = true;
            }
            if (!existingInCat) {
                const iconFilename = existing.name.toLowerCase().replace(/ /g, '_').replace(/[':]/g, '') + '.png';
                existing.icon = `icons/${iconFilename}`;
                outData[cat].push(existing);
            }
        }
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outData, null, 2), 'utf-8');
    
    checkIcons(outData);
    compareBackup(outData);

    process.exit(0);
}

function checkIcons(data) {
    const missing = [];
    Object.values(data).flat().forEach(a => {
        if (!fs.existsSync(`src/assets/${a.icon}`)) missing.push(a.name);
    });
    if (missing.length > 0) console.log('Missing Icons:', missing);
}

function compareBackup(currentData) {
    const backupPath = path.join(__dirname, '../src/assets/data/abilities.backup.json');
    if (!fs.existsSync(backupPath)) {
        console.log('No backup found at', backupPath);
        return;
    }
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    const getNames = Object.values(backup).flatMap(arr => arr.map(a => a.name));
    const currNames = Object.values(currentData).flatMap(arr => arr.map(a => a.name));

    const missing = getNames.filter(name => !currNames.includes(name));
    const added = currNames.filter(name => !getNames.includes(name));

    if (missing.length > 0) console.log('Missing abilities:', missing);
    if (added.length > 0) console.log('Added abilities:', added);
}

run();
