import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

// Setup ES modules paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.resolve(rootDir, '.env') });

import Player from '../models/Player.js';
import PlayerSeasonStats from '../models/PlayerSeasonStats.js';
import { calculateComprehensiveRating } from '../analytics/recalculateRatings.js';

async function main() {
  let connected = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`Connecting to MongoDB Atlas (attempt ${attempt}/5)...`);
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
      console.log('Connected to MongoDB Atlas successfully.');
      connected = true;
      break;
    } catch (err) {
      console.warn(`Connection attempt ${attempt} failed: ${err.message}. Retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  if (!connected) throw new Error('Could not connect to MongoDB Atlas after 5 attempts.');


  console.log('Clearing existing records...');
  await Player.deleteMany({});
  await PlayerSeasonStats.deleteMany({});
  console.log('Cleared.');

  console.log('Loading metadata and people.csv...');
  const metadataPath = path.join(__dirname, 'playerMetadata.json');
  let playerMetadata = {};
  if (fs.existsSync(metadataPath)) {
    try {
      playerMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    } catch (e) {
      console.warn('Could not parse playerMetadata.json:', e.message);
    }
  }

  const peopleCsvPath = path.join(__dirname, 'data', 'people.csv');
  let peopleMapping = {}; // map identifier to full name
  if (fs.existsSync(peopleCsvPath)) {
    const csvData = fs.readFileSync(peopleCsvPath, 'utf8');
    const records = parse(csvData, { columns: true, skip_empty_lines: true });
    records.forEach(row => {
      if (row.name) {
         peopleMapping[row.identifier] = row.name;
      }
    });
  }

  const getCleanPlayerName = (name) => {
    if (playerMetadata[name]?.name) return playerMetadata[name].name;
    return name;
  };

  const getPlayerCountry = (cleanName, rawName) => {
    if (playerMetadata[rawName]?.country) return playerMetadata[rawName].country;
    if (playerMetadata[cleanName]?.country) return playerMetadata[cleanName].country;

    const overseasKeywords = [
      'Warner', 'Smith', 'Maxwell', 'Cummins', 'Starc', 'Head', 'Marsh', 'Zampa', 'Hazlewood', 'Green', 'Stoinis', 'Finch', 'Wade', 'Lynn', 'Johnson', 'Watson', 'Faulkner', 'Hussey', 'Gilchrist', 'Hayden', 'Lee', 'Symonds', 'Warne', 'Christian', 'Meredith', 'Richardson', 'Ellis', 'David',
      'Stokes', 'Buttler', 'Archer', 'Curran', 'Bairstow', 'Moeen', 'Livingstone', 'Wood', 'Woakes', 'Roy', 'Brook', 'Salt', 'Jacks', 'Mills', 'Jordan', 'Topley', 'Willey', 'Morgan', 'Pietersen', 'Flintoff', 'Bopara', 'Rashid',
      'de Kock', 'du Plessis', 'Miller', 'Rabada', 'Nortje', 'Klaasen', 'Markram', 'Jansen', 'Ngidi', 'Steyn', 'Morkel', 'Tahil', 'Pretorius', 'Morris', 'Duminy', 'Kallis', 'Gibbs', 'Boucher', 'Brevis', 'Stubbs', 'Coetzee', 'Burger',
      'Gayle', 'Russell', 'Narine', 'Pollard', 'Bravo', 'Pooran', 'Hetmyer', 'Holder', 'Joseph', 'Badree', 'Simmons', 'Lewis', 'Allen', 'McCoy', 'Shepherd', 'Mayers', 'Powell', 'Hope', 'Brathwaite', 'Sammy', 'Sarwan', 'Lara', 'Chanderpaul',
      'Boult', 'Williamson', 'Southee', 'Conway', 'Santner', 'Ferguson', 'Mitchell', 'Guptill', 'McCullum', 'Vettori', 'Franklin', 'Ryder', 'Oram', 'Neesham', 'Milne', 'Henry', 'Allen', 'Phillips', 'Rachin Ravindra',
      'Hasaranga', 'Malinga', 'Pathirana', 'Theekshana', 'Muralitharan', 'Sangakkara', 'Jayawardene', 'Dilshan', 'Jayasuriya', 'Mendis', 'Shanaka', 'Chameera', 'Perera', 'Mathews', 'Vaas',
      'Rashid Khan', 'Nabi', 'Mujeeb', 'Gurbaz', 'Farooqi', 'Naveen-ul-Haq', 'Noor Ahmad', 'Omarzai',
      'Shakib', 'Mustafizur', 'Tamim', 'Mashrafe'
    ];

    for (const kw of overseasKeywords) {
      if (cleanName.includes(kw) || rawName.includes(kw)) {
        if (['Warner', 'Smith', 'Maxwell', 'Cummins', 'Starc', 'Head', 'Marsh', 'Zampa', 'Hazlewood', 'Green', 'Stoinis', 'Finch', 'Wade', 'Lynn', 'Johnson', 'Watson', 'Faulkner', 'Hussey', 'Gilchrist', 'Hayden', 'Lee', 'Symonds', 'Warne', 'Christian', 'Meredith', 'Richardson', 'Ellis', 'David'].some(k => cleanName.includes(k))) return 'Australia';
        if (['Stokes', 'Buttler', 'Archer', 'Curran', 'Bairstow', 'Moeen', 'Livingstone', 'Wood', 'Woakes', 'Roy', 'Brook', 'Salt', 'Jacks', 'Mills', 'Jordan', 'Topley', 'Willey', 'Morgan', 'Pietersen', 'Flintoff', 'Bopara'].some(k => cleanName.includes(k))) return 'England';
        if (['de Kock', 'du Plessis', 'Miller', 'Rabada', 'Nortje', 'Klaasen', 'Markram', 'Jansen', 'Ngidi', 'Steyn', 'Morkel', 'Pretorius', 'Morris', 'Duminy', 'Kallis', 'Gibbs', 'Boucher', 'Brevis', 'Stubbs', 'Coetzee', 'Burger'].some(k => cleanName.includes(k))) return 'South Africa';
        if (['Gayle', 'Russell', 'Narine', 'Pollard', 'Bravo', 'Pooran', 'Hetmyer', 'Holder', 'Joseph', 'Badree', 'Simmons', 'Lewis', 'Allen', 'McCoy', 'Shepherd', 'Mayers', 'Powell', 'Hope', 'Brathwaite', 'Sammy', 'Sarwan', 'Lara', 'Chanderpaul'].some(k => cleanName.includes(k))) return 'West Indies';
        if (['Boult', 'Williamson', 'Southee', 'Conway', 'Santner', 'Ferguson', 'Mitchell', 'Guptill', 'McCullum', 'Vettori', 'Franklin', 'Ryder', 'Oram', 'Neesham', 'Milne', 'Henry', 'Allen', 'Phillips', 'Rachin Ravindra'].some(k => cleanName.includes(k))) return 'New Zealand';
        if (['Hasaranga', 'Malinga', 'Pathirana', 'Theekshana', 'Muralitharan', 'Sangakkara', 'Jayawardene', 'Dilshan', 'Jayasuriya', 'Mendis', 'Shanaka', 'Chameera', 'Perera', 'Mathews', 'Vaas'].some(k => cleanName.includes(k))) return 'Sri Lanka';
        if (['Rashid Khan', 'Nabi', 'Mujeeb', 'Gurbaz', 'Farooqi', 'Naveen-ul-Haq', 'Noor Ahmad', 'Omarzai'].some(k => cleanName.includes(k))) return 'Afghanistan';
        if (['Shakib', 'Mustafizur', 'Tamim', 'Mashrafe'].some(k => cleanName.includes(k))) return 'Bangladesh';
        return 'Australia';
      }
    }
    return 'India';
  };

  const getPlayerRole = (cleanName, rawName, runs, wickets, stumpings, catches) => {
    if (playerMetadata[rawName]?.role) return playerMetadata[rawName].role;
    if (playerMetadata[cleanName]?.role) return playerMetadata[cleanName].role;

    const wkNames = ['Dhoni', 'Pant', 'Karthik', 'Samson', 'de Kock', 'Buttler', 'Klaasen', 'Rahul', 'Pooran', 'Kishan', 'Saha', 'Uthappa', 'Rawat', 'Jurel', 'Bairstow', 'Sangakkara', 'Gilchrist', 'McCullum', 'Gurbaz', 'Salt'];
    if (stumpings > 0 || wkNames.some(w => cleanName.includes(w))) return 'Wicketkeeper';

    if (wickets >= 15 && runs >= 350) return 'All-Rounder';

    if (wickets >= 10) {
      const spinners = ['Chahal', 'Ashwin', 'Chawla', 'Mishra', 'Kuldeep', 'Narine', 'Rashid', 'Harbhajan', 'Krunal', 'Axar', 'Bishnoi', 'Varun', 'Theekshana', 'Santner', 'Muralitharan', 'Tahir', 'Shakib', 'Zampa', 'Gopal', 'Markande', 'Hasaranga'];
      if (spinners.some(s => cleanName.includes(s))) return 'Spin Bowler';
      return 'Fast Bowler';
    }

    return 'Batter';
  };

  const calculateBasePrice = (runs, wickets, isOverseas, rating) => {
    if (rating >= 85 || runs >= 3000 || wickets >= 100) return 2.0;
    if (rating >= 78 || runs >= 1500 || wickets >= 50) return 1.5;
    if (rating >= 70 || runs >= 600 || wickets >= 20) return 1.0;
    if (rating >= 60 || runs >= 200 || wickets >= 10) return 0.5;
    return isOverseas ? 0.5 : 0.2;
  };

  const normalizeBowlingStyle = (rawStyle, role) => {
    if (!rawStyle || rawStyle === 'None') {
      if (role === 'Spin Bowler') return 'Right-arm offspin';
      if (role === 'Fast Bowler') return 'Right-arm fast';
      return 'None';
    }
    const s = rawStyle.toLowerCase();
    if (s.includes('chinaman')) return 'Left-arm chinaman';
    if (s.includes('orthodox') || (s.includes('left') && s.includes('spin'))) return 'Left-arm orthodox';
    if (s.includes('legspin') || s.includes('leg break') || s.includes('legbreak')) return 'Right-arm legspin';
    if (s.includes('offspin') || s.includes('offbreak') || s.includes('off break') || s.includes('spin')) return 'Right-arm offspin';
    if (s.includes('left') && (s.includes('fast') || s.includes('pace'))) return 'Left-arm fast';
    if (s.includes('left') && s.includes('medium')) return 'Left-arm medium';
    if (s.includes('right') && s.includes('fast')) return 'Right-arm fast';
    if (s.includes('right') && (s.includes('medium') || s.includes('pace'))) return 'Right-arm medium';
    if (role === 'Fast Bowler') return 'Right-arm fast';
    if (role === 'Spin Bowler') return 'Right-arm offspin';
    return 'None';
  };

  const normalizeBattingStyle = (rawStyle) => {
    if (rawStyle && rawStyle.toLowerCase().includes('left')) return 'Left-hand bat';
    return 'Right-hand bat';
  };

  const iplJsonDir = path.join(__dirname, 'data', 'ipl_json');
  console.log(`Loading match files from ${iplJsonDir}`);
  const files = fs.readdirSync(iplJsonDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} match files.`);

  const playerStats = {};

  const initPlayer = (name) => {
    if (!playerStats[name]) {
      const cleanName = getCleanPlayerName(name);
      playerStats[name] = {
        rawName: name,
        name: cleanName,
        fullName: cleanName,
        matches: new Set(),
        batting: { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, dismissals: 0, highestScore: 0, fifties: 0, hundreds: 0, notOuts: 0 },
        bowling: { ballsBowled: 0, runsConceded: 0, wickets: 0, threeWickets: 0, fourWickets: 0, fiveWickets: 0, bestBowlingW: 0, bestBowlingR: 999 },
        fielding: { catches: 0, runOuts: 0, stumpings: 0 },
        matchScores: {},
        bowlerMatchScores: {}
      };
    }
    return playerStats[name];
  };

  let fileCount = 0;
  for (const file of files) {
    fileCount++;
    if (fileCount % 200 === 0) console.log(`Processed ${fileCount}/${files.length} match files...`);
    let matchData;
    try {
      matchData = JSON.parse(fs.readFileSync(path.join(iplJsonDir, file), 'utf8'));
    } catch (e) {
      continue;
    }
    
    const matchId = file.replace('.json', '');
    const innings = matchData.innings || [];

    for (const inn of innings) {
      const overs = inn.overs || [];
      for (const over of overs) {
        for (const delivery of over.deliveries) {
          const batter = delivery.batter;
          const bowler = delivery.bowler;
          const runs = delivery.runs.batter;
          const isFour = runs === 4;
          const isSix = runs === 6;

          const pBatter = initPlayer(batter);
          pBatter.matches.add(matchId);
          pBatter.batting.runs += runs;
          if (!delivery.extras || !delivery.extras.wides) {
            pBatter.batting.ballsFaced += 1;
          }
          if (isFour) pBatter.batting.fours += 1;
          if (isSix) pBatter.batting.sixes += 1;
          
          if (!pBatter.matchScores[matchId]) pBatter.matchScores[matchId] = 0;
          pBatter.matchScores[matchId] += runs;

          const pBowler = initPlayer(bowler);
          pBowler.matches.add(matchId);
          if (!delivery.extras || (!delivery.extras.wides && !delivery.extras.noballs)) {
            pBowler.bowling.ballsBowled += 1;
          }
          const conceded = delivery.runs.total - (delivery.extras?.byes || 0) - (delivery.extras?.legbyes || 0);
          pBowler.bowling.runsConceded += Math.max(0, conceded);

          if (!pBowler.bowlerMatchScores[matchId]) pBowler.bowlerMatchScores[matchId] = { w: 0, r: 0 };
          pBowler.bowlerMatchScores[matchId].r += Math.max(0, conceded);

          if (delivery.wickets) {
            for (const wicket of delivery.wickets) {
              const outPlayer = initPlayer(wicket.player_out);
              outPlayer.batting.dismissals += 1;

              if (['bowled', 'caught', 'lbw', 'stumped', 'caught and bowled', 'hit wicket'].includes(wicket.kind)) {
                pBowler.bowling.wickets += 1;
                pBowler.bowlerMatchScores[matchId].w += 1;
              }

              if (wicket.fielders) {
                for (const fielder of wicket.fielders) {
                  const fName = fielder.name || fielder;
                  const pFielder = initPlayer(fName);
                  if (wicket.kind === 'caught' || wicket.kind === 'caught and bowled') pFielder.fielding.catches += 1;
                  if (wicket.kind === 'run out') pFielder.fielding.runOuts += 1;
                  if (wicket.kind === 'stumped') pFielder.fielding.stumpings += 1;
                }
              }
            }
          }
        }
      }
    }
  }

  console.log('Calculating career aggregates and determining roles...');
  const playerDocs = [];
  const playersArray = Object.values(playerStats);
  
  for (const p of playersArray) {
    const numMatches = p.matches.size;
    
    // Filter out zero-activity records
    if (numMatches < 1 && p.batting.runs === 0 && p.bowling.wickets === 0) continue;

    // Batting calculations
    const inningsCount = Object.keys(p.matchScores).length;
    for (const matchId in p.matchScores) {
      const score = p.matchScores[matchId];
      if (score > p.batting.highestScore) p.batting.highestScore = score;
      if (score >= 100) p.batting.hundreds += 1;
      else if (score >= 50) p.batting.fifties += 1;
    }
    const average = p.batting.dismissals > 0 ? (p.batting.runs / p.batting.dismissals) : p.batting.runs;
    const strikeRate = p.batting.ballsFaced > 0 ? (p.batting.runs / p.batting.ballsFaced) * 100 : 0;
    const notOuts = Math.max(0, inningsCount - p.batting.dismissals);

    // Bowling calculations
    const overs = parseFloat((p.bowling.ballsBowled / 6).toFixed(1));
    const bowlAverage = p.bowling.wickets > 0 ? (p.bowling.runsConceded / p.bowling.wickets) : 0;
    const economy = overs > 0 ? (p.bowling.runsConceded / overs) : 0;
    const bowlStrikeRate = p.bowling.wickets > 0 ? (p.bowling.ballsBowled / p.bowling.wickets) : 0;

    let bestW = 0, bestR = 999;
    let threeW = 0, fourW = 0, fiveW = 0;
    for (const matchId in p.bowlerMatchScores) {
      const bScore = p.bowlerMatchScores[matchId];
      if (bScore.w >= 5) fiveW++;
      else if (bScore.w === 4) fourW++;
      else if (bScore.w === 3) threeW++;

      if (bScore.w > bestW || (bScore.w === bestW && bScore.r < bestR)) {
        bestW = bScore.w;
        bestR = bScore.r;
      }
    }
    const bestBowling = bestW > 0 ? `${bestW}/${bestR}` : '0/0';

    const country = getPlayerCountry(p.name, p.rawName);
    const isOverseas = country !== 'India';
    const role = getPlayerRole(p.name, p.rawName, p.batting.runs, p.bowling.wickets, p.fielding.stumpings, p.fielding.catches);

    // Ratings
    const safeBatRuns = p.batting.runs || 0;
    const safeAvg = isNaN(average) ? 0 : average;
    const safeSR = isNaN(strikeRate) ? 0 : strikeRate;
    const safeWkts = p.bowling.wickets || 0;
    const safeEco = isNaN(economy) ? 8 : economy;
    const safeCatches = p.fielding.catches || 0;
    const safeStumpings = p.fielding.stumpings || 0;

    const batScore = Math.min(99, Math.max(30, Math.floor((safeBatRuns / 70) + (safeAvg * 0.8) + (safeSR * 0.2)) || 45));
    const bowlScore = Math.min(99, Math.max(30, Math.floor((safeWkts * 0.5) + Math.max(0, 11 - safeEco) * 5) || 45));
    const fieldScore = Math.min(99, Math.max(30, Math.floor((safeCatches * 1.5) + (safeStumpings * 3) + 30) || 45));

    let overall;
    switch (role) {
      case 'Batter': overall = batScore * 0.75 + fieldScore * 0.2 + bowlScore * 0.05; break;
      case 'Wicketkeeper': overall = batScore * 0.65 + fieldScore * 0.35; break;
      case 'All-Rounder': overall = batScore * 0.45 + bowlScore * 0.45 + fieldScore * 0.1; break;
      case 'Fast Bowler': overall = bowlScore * 0.75 + fieldScore * 0.15 + batScore * 0.1; break;
      case 'Spin Bowler': overall = bowlScore * 0.75 + fieldScore * 0.15 + batScore * 0.1; break;
      default: overall = (batScore + bowlScore + fieldScore) / 3;
    }
    const finalOverall = parseFloat(Math.min(99, Math.max(50, isNaN(overall) ? 60 : overall)).toFixed(1));

    const basePrice = calculateBasePrice(p.batting.runs, p.bowling.wickets, isOverseas, finalOverall);

    const doc = {
      name: p.name,
      fullName: p.fullName,
      country,
      nationality: country === 'India' ? 'Indian' : country,
      role,
      battingStyle: normalizeBattingStyle(playerMetadata[p.rawName]?.battingStyle || playerMetadata[p.name]?.battingStyle || (Math.random() > 0.25 ? 'Right-hand bat' : 'Left-hand bat')),
      bowlingStyle: normalizeBowlingStyle(playerMetadata[p.rawName]?.bowlingStyle || playerMetadata[p.name]?.bowlingStyle, role),
      isWicketkeeper: role === 'Wicketkeeper',
      isOverseas,
      isCapped: numMatches >= 3 || p.batting.runs >= 100 || p.bowling.wickets >= 5,
      basePrice,
      careerStats: {
        batting: {
          matches: numMatches,
          innings: inningsCount,
          runs: p.batting.runs,
          average: parseFloat((isNaN(average) ? 0 : average).toFixed(2)),
          strikeRate: parseFloat((isNaN(strikeRate) ? 0 : strikeRate).toFixed(2)),
          highestScore: p.batting.highestScore,
          fifties: p.batting.fifties,
          hundreds: p.batting.hundreds,
          fours: p.batting.fours,
          sixes: p.batting.sixes,
          notOuts,
          ballsFaced: p.batting.ballsFaced
        },
        bowling: {
          matches: numMatches,
          innings: Object.keys(p.bowlerMatchScores).length,
          overs,
          runsConceded: p.bowling.runsConceded,
          wickets: p.bowling.wickets,
          average: parseFloat((isNaN(bowlAverage) ? 0 : bowlAverage).toFixed(2)),
          economy: parseFloat((isNaN(economy) ? 0 : economy).toFixed(2)),
          strikeRate: parseFloat((isNaN(bowlStrikeRate) ? 0 : bowlStrikeRate).toFixed(2)),
          bestBowling,
          threeWickets: threeW,
          fourWickets: fourW,
          fiveWickets: fiveW
        },
        fielding: {
          catches: p.fielding.catches,
          runOuts: p.fielding.runOuts,
          stumpings: p.fielding.stumpings
        }
      },
      dataSource: 'cricsheet',
      lastVerified: new Date()
    };
    
    // Calculate comprehensive rating factoring in trophies, 5x captaincy, sixes, fours, and matches
    doc.rating = calculateComprehensiveRating(doc);
    
    playerDocs.push(doc);
  }

  // Filter to realistic active pool: players with at least 2 matches or notable contribution
  const poolDocs = playerDocs.filter(p => p.careerStats.batting.matches >= 2 || p.careerStats.batting.runs >= 20 || p.careerStats.bowling.wickets >= 1);
  poolDocs.sort((a, b) => b.careerStats.batting.runs - a.careerStats.batting.runs);

  console.log(`Inserting ${poolDocs.length} real players into MongoDB Atlas...`);
  await Player.insertMany(poolDocs);
  console.log('Inserted all real players.');

  console.log('\nTop 15 IPL Run Scorers in Database:');
  for (let i = 0; i < Math.min(15, poolDocs.length); i++) {
    const p = poolDocs[i];
    console.log(`${i+1}. ${p.name} (${p.country}, ${p.role}) - Runs: ${p.careerStats.batting.runs} | Avg: ${p.careerStats.batting.average} | SR: ${p.careerStats.batting.strikeRate} | 100s: ${p.careerStats.batting.hundreds} | 50s: ${p.careerStats.batting.fifties} | Rating: ${p.rating.overall}`);
  }

  const topBowlers = [...poolDocs].sort((a, b) => b.careerStats.bowling.wickets - a.careerStats.bowling.wickets);
  console.log('\nTop 10 IPL Wicket Takers in Database:');
  for (let i = 0; i < Math.min(10, topBowlers.length); i++) {
    const p = topBowlers[i];
    console.log(`${i+1}. ${p.name} (${p.country}, ${p.role}) - Wickets: ${p.careerStats.bowling.wickets} | Overs: ${p.careerStats.bowling.overs} | Eco: ${p.careerStats.bowling.economy} | Best: ${p.careerStats.bowling.bestBowling}`);
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB Atlas.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
