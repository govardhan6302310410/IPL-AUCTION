import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Player from '../models/Player.js';

// Championship Trophies, Captaincy Glory & Clutch Legacy Points (up to 22 pts)
export const CAPTAIN_TROPHY_LEGACY = {
  // Tier 1: 5x Champion Captains & All-time Winning Legends (+22 pts)
  'Rohit Sharma': 22, // 5x MI Captain Titles (2013, 2015, 2017, 2019, 2020) + 2009 title with Deccan Chargers = 6 titles total, 324 sixes, 7331 runs
  'MS Dhoni': 22,     // 5x CSK Captain Titles (2010, 2011, 2018, 2021, 2023), all-time clutch finisher

  // Tier 2: Multi-Trophy Pillars & All-time MVPs (+18 - 20 pts)
  'Virat Kohli': 20,        // All-time highest run king (9346+ runs, 8 hundreds, 317 sixes), iconic franchise builder
  'Jasprit Bumrah': 20,     // 5x Champion, all-time greatest death bowler, 190 wickets, 7.34 economy
  'Lasith Malinga': 19,     // 4x Champion, iconic final-over yorker title winner, 170 wickets
  'Sunil Narine': 19,       // 3x Champion (2012, 2014, 2024), 3x IPL MVP, 209 wickets
  'Ravindra Jadeja': 19,    // 4x Champion, final-ball IPL title winner, 101 catches, 180 wickets, 3500+ runs
  'Suresh Raina': 18,       // 4x Champion, 'Mr. IPL', 5536 runs, 109 catches
  'Andre Russell': 18,      // 2x IPL MVP, highest all-time IPL strike rate, clutch power hitter
  'Dwayne Bravo': 18,       // 3x Champion, 2x Purple Cap winner, 183 wickets
  'Kieron Pollard': 18,     // 5x Champion, iconic clutch finisher
  'David Warner': 18,       // SRH Title-winning Captain (2016), 3x Orange Cap winner, 6567 runs
  'Gautam Gambhir': 18,     // 2x KKR Title-winning Captain (2012, 2014), clutch finals hero
  'Hardik Pandya': 17,      // GT Title-winning Captain (2022), 5x Champion overall
  'AB de Villiers': 18,     // All-time 360 clutch legend, 5181 runs, 152+ SR, 264 sixes
  'Chris Gayle': 18,        // 6 centuries, 357 sixes, 2x Orange Cap, 175* record
  'Bhuvneshwar Kumar': 17,  // 2x Purple Cap, 1x Champion, 226 wickets
  'Yuzvendra Chahal': 17,   // All-time highest IPL wicket-taker (233 wkts), Purple Cap
  'Rashid Khan': 17,        // 1x Champion, 179 wickets, 7.28 economy king
  'Shane Watson': 17,       // 2x IPL MVP, 2x Trophy winner, finals centurion

  // Tier 3: Trophy-Winning Captains & Orange/Purple Cap Titans (+14 - 15 pts)
  'KL Rahul': 14,
  'Sanju Samson': 14,
  'Rishabh Pant': 14,
  'Jos Buttler': 15,
  'Faf du Plessis': 14,
  'Shubman Gill': 14,
  'Suryakumar Yadav': 15,
  'Shreyas Iyer': 14,       // KKR Title-winning Captain (2024)
  'Pat Cummins': 14,        // SRH Finalist Captain, World Champion
  'Mitchell Starc': 14,     // 2x Champion, 2024 Final MVP
  'Trent Boult': 14,
  'Mohammed Shami': 14,
  'Kagiso Rabada': 14,
  'Glenn Maxwell': 12,
  'Travis Head': 12,
  'Heinrich Klaasen': 12,
  'Axar Patel': 13,
  'Ruturaj Gaikwad': 12,
  'Rinku Singh': 11,
  'Shivam Dube': 11,
  'Arshdeep Singh': 11,
  'Mohammed Siraj': 11,
  'Varun Chakaravarthy': 12,
  'Quinton de Kock': 12,
  'Marcus Stoinis': 11,

  // Emerging / Supporting Squad Members
  'Ishan Kishan': 7
};

export function calculateComprehensiveRating(player) {
  const s = player.careerStats || {};
  const bat = s.batting || {};
  const bowl = s.bowling || {};
  const field = s.fielding || {};

  const matches = Math.max(bat.matches || 0, bowl.matches || 0);

  // 1. Batting Contribution Score (0 - 100)
  let batScore = 30;
  if (bat.matches > 0 || bat.runs > 0) {
    const runs = bat.runs || 0;
    const avg = bat.average || 0;
    const sr = bat.strikeRate || 0;
    const sixes = bat.sixes || 0;
    const fours = bat.fours || 0;
    const fifties = bat.fifties || 0;
    const hundreds = bat.hundreds || 0;
    const notOuts = bat.notOuts || 0;

    // Runs volume (up to 35 pts) - Kohli (9300+), Rohit (7300+), Warner (6500+), Dhoni (5400+)
    const runsScore = Math.min(35, (runs / 6500) * 35);

    // Six-Hitting and Boundary Power (up to 25 pts)
    // Rohit (324 sixes), Gayle (357), Dhoni (264), Kohli (317), de Villiers (253)
    const sixesScore = Math.min(15, (sixes / 250) * 15);
    const foursScore = Math.min(10, (fours / 550) * 10);

    // Strike Rate & Acceleration (up to 15 pts)
    let srScore = 0;
    if (sr >= 150) srScore = 15;
    else if (sr >= 135) srScore = 12 + ((sr - 135) / 15) * 3;
    else if (sr >= 120) srScore = 8 + ((sr - 120) / 15) * 4;
    else if (sr > 0) srScore = Math.max(3, (sr / 120) * 8);

    // Batting Average (up to 12 pts)
    const avgScore = Math.min(12, (avg / 38) * 12);

    // Milestones (50s & 100s) (up to 8 pts)
    const milestoneScore = Math.min(8, ((fifties * 0.4 + hundreds * 2) / 25) * 8);

    // Clutch Chase Not-Outs (up to 5 pts) - Dhoni (99), Jadeja, Russell
    const notOutScore = Math.min(5, (notOuts / 40) * 5);

    batScore = Math.min(99, Math.max(30, runsScore + sixesScore + foursScore + srScore + avgScore + milestoneScore + notOutScore));
  }

  // 2. Bowling Contribution Score (0 - 100)
  let bowlScore = 30;
  if (bowl.wickets > 0 || bowl.overs > 0) {
    const wkts = bowl.wickets || 0;
    const eco = (bowl.economy > 0) ? bowl.economy : 8.5;
    const sr = (bowl.strikeRate > 0) ? bowl.strikeRate : 24;
    const multiWkts = (bowl.threeWickets || 0) + (bowl.fourWickets || 0) * 2 + (bowl.fiveWickets || 0) * 3;

    // Wickets volume (up to 45 pts)
    const wktsScore = Math.min(45, (wkts / 170) * 45);

    // Economy & Dot-ball pressure (up to 30 pts)
    let ecoScore = 0;
    if (eco <= 7.0) ecoScore = 30;
    else if (eco <= 7.8) ecoScore = 24 + ((7.8 - eco) / 0.8) * 6;
    else if (eco <= 8.5) ecoScore = 18 + ((8.5 - eco) / 0.7) * 6;
    else ecoScore = Math.max(5, (11.5 - eco) / 3.0 * 18);

    // Breakthrough Hauls (up to 15 pts)
    const haulsScore = Math.min(15, (multiWkts / 8) * 15);

    bowlScore = Math.min(99, Math.max(30, wktsScore + ecoScore + haulsScore));
  }

  // 3. Fielding Score
  const catches = field.catches || 0;
  const stumpings = field.stumpings || 0;
  const runOuts = field.runOuts || 0;
  let fieldScore = 50;

  if (player.role === 'Wicketkeeper') {
    fieldScore = Math.min(99, Math.max(40, 15 + (catches / 100) * 50 + (stumpings / 30) * 35));
  } else {
    fieldScore = Math.min(99, Math.max(40, 15 + (catches / 80) * 75 + (runOuts / 15) * 10));
  }

  // 4. Franchise Longevity & Matches Score (0 - 100)
  // 220+ matches (Dhoni, Rohit, Kohli, Karthik, Raina, Jadeja) = 100 pts
  const longevityScore = Math.min(100, Math.max(30, (matches / 220) * 100));

  // 5. Championship Trophies, Captaincy & Clutch Legacy Bonus (up to 22 pts)
  const cleanName = player.name?.trim();
  const captainTrophyPoints = CAPTAIN_TROPHY_LEGACY[cleanName] || (matches >= 100 ? 7 : matches >= 40 ? 4 : 2);

  // 6. Role-Weighted Overall
  let rawRating = 50;
  switch (player.role) {
    case 'Batter':
      // 52% Batting + 22 pts Trophy/Captaincy Legacy + 15% Longevity + 8% Fielding
      rawRating = (batScore * 0.52) + (captainTrophyPoints * 1.5) + (longevityScore * 0.15) + (fieldScore * 0.08);
      break;

    case 'Wicketkeeper':
      // 46% Batting + 18% Keeping Dismissals + 22 pts Trophy/Captaincy Legacy + 14% Longevity
      rawRating = (batScore * 0.46) + (fieldScore * 0.18) + (captainTrophyPoints * 1.5) + (longevityScore * 0.14);
      break;

    case 'Fast Bowler':
    case 'Spin Bowler':
    case 'Bowler':
      // 65% Bowling + 20 pts Trophy/Captaincy Legacy + 15% Longevity + 5% Fielding
      rawRating = (bowlScore * 0.65) + (captainTrophyPoints * 1.4) + (longevityScore * 0.15) + (fieldScore * 0.05);
      break;

    case 'All-Rounder':
      const dualBonus = (batScore >= 45 && bowlScore >= 60) ? 10 : ((batScore >= 40 && bowlScore >= 50) ? 5 : 0);
      rawRating = (Math.max(batScore, bowlScore) * 0.40) + (Math.min(batScore, bowlScore) * 0.22) + (captainTrophyPoints * 1.4) + (longevityScore * 0.12) + dualBonus;
      break;

    default:
      rawRating = (batScore * 0.35) + (bowlScore * 0.35) + (captainTrophyPoints * 1.4) + (fieldScore * 0.15);
  }

  // Final Overall on standard 0-100 scale
  const overall = parseFloat(Math.min(99, Math.max(50, rawRating)).toFixed(1));

  return {
    overall,
    score100: overall,
    batting: parseFloat(batScore.toFixed(1)),
    bowling: parseFloat(bowlScore.toFixed(1)),
    fielding: parseFloat(fieldScore.toFixed(1)),
    consistency: parseFloat(Math.min(98, Math.max(50, longevityScore * 0.6 + batScore * 0.2 + (captainTrophyPoints * 1.2))).toFixed(1)),
    recentForm: parseFloat((70 + Math.random() * 25).toFixed(1)),
    impact: parseFloat(Math.min(99, Math.max(50, batScore * 0.35 + bowlScore * 0.35 + captainTrophyPoints * 1.5)).toFixed(1))
  };
}

export async function recalculateAllPlayerRatings() {
  console.log('Connecting to MongoDB Atlas to recalculate player ratings with trophy captaincy weight...');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected.');

  const players = await Player.find();
  console.log(`Found ${players.length} players. Recalculating ratings...`);

  const operations = players.map(player => ({
    updateOne: {
      filter: { _id: player._id },
      update: { $set: { rating: calculateComprehensiveRating(player) } }
    }
  }));

  const res = await Player.bulkWrite(operations);
  console.log(`Successfully updated ${res.modifiedCount} player ratings in bulk.`);

  // Print Top 25 players by rating
  const top25 = await Player.find().sort({ 'rating.overall': -1 }).limit(25);
  console.log('\n================ TOP 25 IPL PLAYERS BY TROPHY, CAPTAINCY & CAREER PERFORMANCE ================');
  top25.forEach((p, idx) => {
    console.log(
      `${(idx + 1).toString().padStart(2)}. ${p.name.padEnd(20)} | Role: ${p.role.padEnd(14)} | ★ ${p.rating.overall} | Runs: ${(p.careerStats?.batting?.runs || 0).toString().padStart(5)} | 6s: ${(p.careerStats?.batting?.sixes || 0).toString().padStart(3)} | 4s: ${(p.careerStats?.batting?.fours || 0).toString().padStart(3)} | Wkts: ${(p.careerStats?.bowling?.wickets || 0).toString().padStart(3)} | Mat: ${(p.careerStats?.batting?.matches || p.careerStats?.bowling?.matches || 0).toString().padStart(3)}`
    );
  });

  const ishan = await Player.findOne({ name: 'Ishan Kishan' });
  const rohit = await Player.findOne({ name: 'Rohit Sharma' });
  console.log('\n--- DIRECT COMPARISON ---');
  console.log(`Rohit Sharma -> Rating: ${rohit.rating.overall} | 5x IPL Champion Captain | 6 IPL Titles | Runs: ${rohit.careerStats.batting.runs} | 6s: ${rohit.careerStats.batting.sixes} | 4s: ${rohit.careerStats.batting.fours} | Matches: ${rohit.careerStats.batting.matches}`);
  console.log(`Ishan Kishan -> Rating: ${ishan.rating.overall} | 0 Captain Titles | Runs: ${ishan.careerStats.batting.runs} | 6s: ${ishan.careerStats.batting.sixes} | 4s: ${ishan.careerStats.batting.fours} | Matches: ${ishan.careerStats.batting.matches}`);

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB Atlas.');
}

// If run directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  recalculateAllPlayerRatings()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error recalculating ratings:', err);
      process.exit(1);
    });
}
