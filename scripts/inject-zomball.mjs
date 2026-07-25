import fs from 'node:fs';
import path from 'node:path';

const targetPath = 'public/overrides/staticOverrides.json';
const imagePath = '/home/user/uploads/image.png';

try {
  if (fs.existsSync(targetPath) && fs.existsSync(imagePath)) {
    const data = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
    const imageBase64 = fs.readFileSync(imagePath, 'base64');
    const dataUrl = `data:image/png;base64,${imageBase64}`;

    if (!data.wikiOverrides) data.wikiOverrides = {};
    
    // Inject/Update Zomball override
    data.wikiOverrides['zomball'] = {
      name: 'ZomBall',
      rarity: 'Rares',
      image_url: dataUrl,
      description: 'ZomBall is a rare, slow-moving but high-health custom DPS unit.',
      type: 'DPS',
      raw_type: 'Basic DPS(Melee)',
      category: 'Unobtainable',
      placement_limit: '4',
      custom_unit: true,
      obtain: ['Unobtainable / Event Secret'],
      min_max_stats: {
        "Cooldown": "5 → 3",
        "Range": "3 → 7",
        "Melee": "500 → 4K"
      },
      upgrades: [],
      updated_at: new Date().toISOString()
    };

    // Also let's make sure shadowball is pre-configured
    if (!data.wikiOverrides['shadowball']) {
      data.wikiOverrides['shadowball'] = {
        name: 'ShadowBall',
        rarity: 'Rares',
        image_url: null,
        description: 'A shadowy, elusive unobtainable unit.',
        type: 'DPS',
        raw_type: 'Basic DPS(Ranged)',
        category: 'Unobtainable',
        placement_limit: '4',
        custom_unit: true,
        obtain: ['Unobtainable / Secret'],
        min_max_stats: {},
        upgrades: [],
        updated_at: new Date().toISOString()
      };
    }

    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('✅ Successfully injected Zomball and Shadowball overrides with the uploaded render!');
  } else {
    console.error('Files not found!');
  }
} catch (e) {
  console.error('Error:', e);
}
