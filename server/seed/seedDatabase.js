import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Player from '../models/Player.js';
import PlayerSeasonStats from '../models/PlayerSeasonStats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Helper to generate random number in range
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

// Compute rating from stats
const computeRating = (player) => {
  let batting = 0, bowling = 0, fielding = 0;
  const s = player.careerStats;
  
  // Batting rating (0-100)
  if (s.batting.matches > 0) {
    const avgScore = Math.min(s.batting.average / 50, 1) * 30;
    const srScore = Math.min(s.batting.strikeRate / 180, 1) * 25;
    const runsScore = Math.min(s.batting.runs / 5000, 1) * 20;
    const boundaryScore = Math.min((s.batting.fours + s.batting.sixes) / 500, 1) * 15;
    const milestoneScore = Math.min((s.batting.fifties + s.batting.hundreds * 2) / 40, 1) * 10;
    batting = avgScore + srScore + runsScore + boundaryScore + milestoneScore;
  }
  
  // Bowling rating (0-100)
  if (s.bowling.wickets > 0) {
    const wicketScore = Math.min(s.bowling.wickets / 200, 1) * 30;
    const ecoScore = Math.max(0, (12 - (s.bowling.economy || 12)) / 6) * 25;
    const avgScore = Math.max(0, (40 - (s.bowling.average || 40)) / 30) * 25;
    const srScore = Math.max(0, (30 - (s.bowling.strikeRate || 30)) / 20) * 20;
    bowling = wicketScore + ecoScore + avgScore + srScore;
  }
  
  // Fielding rating (0-100)
  const catchScore = Math.min((s.fielding.catches || 0) / 100, 1) * 60;
  const otherScore = Math.min(((s.fielding.runOuts || 0) + (s.fielding.stumpings || 0)) / 30, 1) * 40;
  fielding = catchScore + otherScore;
  
  // Role-weighted overall
  let overall;
  switch (player.role) {
    case 'Batter': overall = batting * 0.65 + bowling * 0.1 + fielding * 0.25; break;
    case 'Wicketkeeper': overall = batting * 0.5 + fielding * 0.4 + bowling * 0.1; break;
    case 'All-Rounder': overall = batting * 0.4 + bowling * 0.4 + fielding * 0.2; break;
    case 'Fast Bowler': overall = bowling * 0.65 + batting * 0.1 + fielding * 0.25; break;
    case 'Spin Bowler': overall = bowling * 0.6 + batting * 0.15 + fielding * 0.25; break;
    default: overall = (batting + bowling + fielding) / 3;
  }
  
  return {
    overall: parseFloat(overall.toFixed(1)),
    batting: parseFloat(batting.toFixed(1)),
    bowling: parseFloat(bowling.toFixed(1)),
    fielding: parseFloat(fielding.toFixed(1)),
    consistency: parseFloat(randFloat(40, 90).toFixed(1)),
    recentForm: parseFloat(randFloat(30, 95).toFixed(1)),
    impact: parseFloat(randFloat(35, 92).toFixed(1))
  };
};

// ---- PLAYER GENERATION DATA ----
const INDIAN_FIRST_NAMES = [
  'Aarav', 'Advik', 'Arjun', 'Aditya', 'Ankit', 'Bharat', 'Chirag', 'Deepak', 'Dhruv', 'Eshan',
  'Farhan', 'Gaurav', 'Harsh', 'Ishaan', 'Jai', 'Kartik', 'Lakshya', 'Mohit', 'Naveen', 'Om',
  'Pranav', 'Rahul', 'Sachin', 'Tanmay', 'Umesh', 'Varun', 'Yash', 'Vivek', 'Suresh', 'Manish',
  'Ajay', 'Vikram', 'Rohan', 'Nikhil', 'Akash', 'Dev', 'Kiran', 'Ravi', 'Sanjay', 'Tarun',
  'Abhinav', 'Ashwin', 'Bhuvan', 'Chetan', 'Dinesh', 'Ganesh', 'Hemant', 'Jatin', 'Kunal', 'Lalit',
  'Mukesh', 'Nitin', 'Pankaj', 'Rajesh', 'Shubham', 'Tushar', 'Uday', 'Vinay', 'Yogesh', 'Zubin',
  'Rishabh', 'Shreyas', 'Ishan', 'Mayank', 'Prithvi', 'Devdutt', 'Ruturaj', 'Tilak', 'Yashasvi', 'Sai'
];

const INDIAN_LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Verma', 'Gupta', 'Reddy', 'Nair', 'Rao', 'Iyer',
  'Chauhan', 'Mishra', 'Joshi', 'Pandey', 'Tiwari', 'Yadav', 'Thakur', 'Malik', 'Agarwal', 'Saxena',
  'Deshmukh', 'Kulkarni', 'Patil', 'Gaikwad', 'Jadhav', 'Pawar', 'Rathore', 'Rajput', 'Mehra', 'Kapoor'
];

const OVERSEAS_PLAYERS = [
  { country: 'Australia', firstNames: ['Mitchell', 'David', 'Steve', 'Glenn', 'Marcus', 'Josh', 'Cameron', 'Travis', 'Pat', 'Adam', 'Nathan', 'Tim', 'Ben', 'Jake', 'Ashton', 'Aaron', 'Daniel', 'Sean', 'Riley', 'Spencer'], lastNames: ['Warner', 'Smith', 'Maxwell', 'Stoinis', 'Hazlewood', 'Green', 'Head', 'Cummins', 'Zampa', 'Fraser', 'Lyon', 'Paine', 'McDermott', 'Ball', 'Agar', 'Finch', 'Richardson', 'Abbott', 'Meredith', 'Johnson'] },
  { country: 'England', firstNames: ['Jos', 'Ben', 'Jofra', 'Sam', 'Liam', 'Jason', 'Moeen', 'Chris', 'Mark', 'Tom', 'Harry', 'Jonny', 'James', 'Reece', 'Phil', 'Dawid', 'Alex', 'Adil', 'Olly', 'Will'], lastNames: ['Buttler', 'Stokes', 'Archer', 'Curran', 'Livingstone', 'Roy', 'Ali', 'Woakes', 'Wood', 'Bairstow', 'Brook', 'Malan', 'Vince', 'Topley', 'Salt', 'Rashid', 'Hales', 'Jordan', 'Stone', 'Jacks'] },
  { country: 'South Africa', firstNames: ['Quinton', 'Kagiso', 'Anrich', 'David', 'Aiden', 'Faf', 'Marco', 'Lungi', 'Rassie', 'Dewald', 'Reeza', 'Wayne', 'Tabraiz', 'Gerald', 'Heinrich', 'Keshav', 'Tristan', 'Ryan', 'Dwaine', 'Andile'], lastNames: ['de Kock', 'Rabada', 'Nortje', 'Miller', 'Markram', 'du Plessis', 'Jansen', 'Ngidi', 'van der Dussen', 'Brevis', 'Hendricks', 'Parnell', 'Shamsi', 'Coetzee', 'Klaasen', 'Maharaj', 'Stubbs', 'Rickelton', 'Pretorius', 'Phehlukwayo'] },
  { country: 'West Indies', firstNames: ['Nicholas', 'Shimron', 'Andre', 'Sunil', 'Shai', 'Jason', 'Kyle', 'Romario', 'Alzarri', 'Obed', 'Akeal', 'Fabian', 'Roston', 'Hayden', 'Brandon', 'Rovman', 'Gudakesh', 'Keacy', 'Shamar', 'Odean'], lastNames: ['Pooran', 'Hetmyer', 'Russell', 'Narine', 'Hope', 'Holder', 'Mayers', 'Shepherd', 'Joseph', 'McCoy', 'Hosein', 'Allen', 'Chase', 'Walsh', 'King', 'Powell', 'Motie', 'Carty', 'Joseph', 'Smith'] },
  { country: 'New Zealand', firstNames: ['Kane', 'Trent', 'Tim', 'Devon', 'Mitchell', 'Glenn', 'Daryl', 'Jimmy', 'Lockie', 'Kyle', 'Finn', 'Ish', 'Michael', 'Adam', 'Mark', 'Colin', 'Doug', 'Matt', 'Will', 'Tom'], lastNames: ['Williamson', 'Boult', 'Southee', 'Conway', 'Santner', 'Phillips', 'Mitchell', 'Neesham', 'Ferguson', 'Jamieson', 'Allen', 'Sodhi', 'Bracewell', 'Milne', 'Chapman', 'Munro', 'Bracewell', 'Henry', 'Young', 'Latham'] },
  { country: 'Sri Lanka', firstNames: ['Wanindu', 'Dushmantha', 'Dasun', 'Charith', 'Maheesh', 'Pathum', 'Bhanuka', 'Dunith', 'Chamika', 'Matheesha'], lastNames: ['Hasaranga', 'Chameera', 'Shanaka', 'Asalanka', 'Theekshana', 'Nissanka', 'Rajapaksa', 'Wellalage', 'Karunaratne', 'Pathirana'] },
  { country: 'Afghanistan', firstNames: ['Rashid', 'Mohammad', 'Rahmanullah', 'Fazalhaq', 'Hazratullah', 'Ibrahim', 'Najibullah', 'Azmatullah', 'Mujeeb', 'Naveen'], lastNames: ['Khan', 'Nabi', 'Gurbaz', 'Farooqi', 'Zazai', 'Zadran', 'Zadran', 'Omarzai', 'Ur Rahman', 'ul Haq'] },
  { country: 'Bangladesh', firstNames: ['Shakib', 'Mustafizur', 'Litton', 'Taskin', 'Tanzid', 'Towhid', 'Mehidy', 'Shoriful', 'Rishad', 'Nasum'], lastNames: ['Al Hasan', 'Rahman', 'Das', 'Ahmed', 'Hasan', 'Hridoy', 'Hasan Miraz', 'Islam', 'Hossain', 'Ahmed'] }
];

const BASE_PRICES = [0.2, 0.3, 0.4, 0.5, 0.75, 1, 1.5, 2];

function generateIndianPlayer(index, role) {
  const firstName = INDIAN_FIRST_NAMES[index % INDIAN_FIRST_NAMES.length];
  const lastName = INDIAN_LAST_NAMES[Math.floor(index / INDIAN_FIRST_NAMES.length) % INDIAN_LAST_NAMES.length];
  const name = `${firstName} ${lastName}`;
  const isCapped = Math.random() > 0.3;
  const age = rand(19, 37);
  const experience = isCapped ? rand(1, 15) : rand(0, 3);
  
  let battingStyle = Math.random() > 0.3 ? 'Right-hand bat' : 'Left-hand bat';
  let bowlingStyle = 'None';
  
  if (role === 'Fast Bowler') {
    bowlingStyle = Math.random() > 0.5 ? 'Right-arm fast' : (Math.random() > 0.5 ? 'Right-arm medium' : (Math.random() > 0.5 ? 'Left-arm fast' : 'Left-arm medium'));
  } else if (role === 'Spin Bowler') {
    bowlingStyle = ['Right-arm offspin', 'Right-arm legspin', 'Left-arm orthodox', 'Left-arm chinaman'][rand(0, 3)];
  } else if (role === 'All-Rounder') {
    bowlingStyle = ['Right-arm fast', 'Right-arm medium', 'Right-arm offspin', 'Left-arm orthodox', 'Left-arm fast'][rand(0, 4)];
  }
  
  const matches = isCapped ? rand(10, 200) : rand(0, 15);
  const isTopPlayer = Math.random() > 0.7;
  
  let stats;
  if (role === 'Batter' || role === 'Wicketkeeper') {
    const innings = Math.max(1, Math.floor(matches * randFloat(0.85, 0.98)));
    const avg = isTopPlayer ? randFloat(28, 48) : randFloat(15, 35);
    const sr = isTopPlayer ? randFloat(130, 175) : randFloat(110, 150);
    const runs = Math.floor(innings * avg);
    stats = {
      batting: {
        matches, innings, runs, average: avg, strikeRate: sr,
        highestScore: isTopPlayer ? rand(70, 120) : rand(30, 85),
        fifties: Math.floor(runs / 300), hundreds: isTopPlayer ? Math.floor(runs / 800) : 0,
        fours: Math.floor(runs * 0.4 / 4), sixes: Math.floor(runs * 0.2 / 6),
        notOuts: rand(2, Math.floor(innings * 0.2)), ballsFaced: Math.floor(runs / sr * 100)
      },
      bowling: {
        matches: role === 'Wicketkeeper' ? 0 : rand(0, Math.floor(matches * 0.1)),
        wickets: rand(0, 5), economy: randFloat(7, 11), average: randFloat(25, 50), strikeRate: randFloat(18, 36),
        overs: randFloat(0, 20), runsConceded: rand(0, 200), bestBowling: '1/15',
        threeWickets: 0, fourWickets: 0, fiveWickets: 0, innings: 0
      },
      fielding: {
        catches: rand(5, matches), runOuts: rand(0, Math.floor(matches * 0.1)),
        stumpings: role === 'Wicketkeeper' ? rand(5, Math.floor(matches * 0.3)) : 0
      }
    };
  } else if (role === 'Fast Bowler' || role === 'Spin Bowler') {
    const bowlInnings = Math.max(1, Math.floor(matches * 0.9));
    const eco = role === 'Spin Bowler' ? (isTopPlayer ? randFloat(6.0, 7.5) : randFloat(7.0, 9.5)) : (isTopPlayer ? randFloat(6.5, 8.0) : randFloat(7.5, 10.0));
    const wickets = isTopPlayer ? rand(Math.floor(matches * 0.8), Math.floor(matches * 1.5)) : rand(Math.floor(matches * 0.3), Math.floor(matches * 0.9));
    const overs = matches * randFloat(3, 4);
    stats = {
      batting: {
        matches, innings: rand(Math.floor(matches * 0.3), Math.floor(matches * 0.7)),
        runs: rand(50, matches * 8), average: randFloat(6, 18), strikeRate: randFloat(100, 145),
        highestScore: rand(10, 40), fifties: 0, hundreds: 0,
        fours: rand(5, 50), sixes: rand(2, 30), notOuts: rand(5, 30), ballsFaced: rand(50, 300)
      },
      bowling: {
        matches, innings: bowlInnings, overs: parseFloat(overs.toFixed(1)),
        runsConceded: Math.floor(overs * eco), wickets,
        average: wickets > 0 ? parseFloat((overs * eco / wickets).toFixed(2)) : 0,
        economy: eco, strikeRate: wickets > 0 ? parseFloat((overs * 6 / wickets).toFixed(2)) : 0,
        bestBowling: `${rand(3, 5)}/${rand(15, 35)}`,
        threeWickets: Math.floor(wickets / 20), fourWickets: Math.floor(wickets / 40), fiveWickets: Math.floor(wickets / 80)
      },
      fielding: {
        catches: rand(3, Math.floor(matches * 0.4)), runOuts: rand(0, 5), stumpings: 0
      }
    };
  } else { // All-Rounder
    const innings = Math.max(1, Math.floor(matches * 0.85));
    const avg = isTopPlayer ? randFloat(22, 38) : randFloat(15, 28);
    const sr = randFloat(120, 165);
    const runs = Math.floor(innings * avg);
    const eco = isTopPlayer ? randFloat(7.0, 8.5) : randFloat(8.0, 10.0);
    const bowlOvers = matches * randFloat(2, 3.5);
    const wickets = isTopPlayer ? rand(Math.floor(matches * 0.5), Math.floor(matches * 1.0)) : rand(Math.floor(matches * 0.2), Math.floor(matches * 0.6));
    stats = {
      batting: {
        matches, innings, runs, average: avg, strikeRate: sr,
        highestScore: isTopPlayer ? rand(50, 95) : rand(25, 65),
        fifties: Math.floor(runs / 350), hundreds: isTopPlayer && runs > 1500 ? 1 : 0,
        fours: Math.floor(runs * 0.35 / 4), sixes: Math.floor(runs * 0.25 / 6),
        notOuts: rand(2, Math.floor(innings * 0.2)), ballsFaced: Math.floor(runs / sr * 100)
      },
      bowling: {
        matches, innings: Math.floor(matches * 0.8), overs: parseFloat(bowlOvers.toFixed(1)),
        runsConceded: Math.floor(bowlOvers * eco), wickets,
        average: wickets > 0 ? parseFloat((bowlOvers * eco / wickets).toFixed(2)) : 0,
        economy: eco, strikeRate: wickets > 0 ? parseFloat((bowlOvers * 6 / wickets).toFixed(2)) : 0,
        bestBowling: `${rand(2, 4)}/${rand(18, 35)}`,
        threeWickets: Math.floor(wickets / 25), fourWickets: 0, fiveWickets: 0
      },
      fielding: {
        catches: rand(5, Math.floor(matches * 0.5)), runOuts: rand(1, 8), stumpings: 0
      }
    };
  }
  
  const basePrice = isCapped 
    ? (isTopPlayer ? BASE_PRICES[rand(5, 7)] : BASE_PRICES[rand(2, 5)])
    : BASE_PRICES[rand(0, 2)];
    
  return {
    name, age, country: 'India', nationality: 'Indian', role, battingStyle, bowlingStyle,
    isWicketkeeper: role === 'Wicketkeeper', isOverseas: false, isCapped, basePrice,
    careerStats: stats, dataSource: 'demo', lastVerified: new Date()
  };
}

function generateOverseasPlayer(countryData, index, role) {
  const firstName = countryData.firstNames[index % countryData.firstNames.length];
  const lastName = countryData.lastNames[index % countryData.lastNames.length];
  // Add suffix if name would repeat
  const suffix = Math.floor(index / countryData.firstNames.length) > 0 ? ` ${String.fromCharCode(65 + (index % 26))}` : '';
  const name = `${firstName} ${lastName}${suffix}`;
  
  // Reuse similar generation logic as Indian players
  const isCapped = true; // overseas are generally capped
  const age = rand(21, 36);
  const isTopPlayer = Math.random() > 0.5;
  const matches = rand(15, 120);
  
  let battingStyle = Math.random() > 0.35 ? 'Right-hand bat' : 'Left-hand bat';
  let bowlingStyle = 'None';
  
  if (role === 'Fast Bowler') {
    bowlingStyle = Math.random() > 0.5 ? 'Right-arm fast' : (Math.random() > 0.5 ? 'Left-arm fast' : 'Right-arm medium');
  } else if (role === 'Spin Bowler') {
    bowlingStyle = ['Right-arm offspin', 'Right-arm legspin', 'Left-arm orthodox', 'Left-arm chinaman'][rand(0, 3)];
  } else if (role === 'All-Rounder') {
    bowlingStyle = ['Right-arm fast', 'Right-arm medium', 'Right-arm offspin', 'Left-arm orthodox'][rand(0, 3)];
  }
  
  // Generate stats similar to Indian player generation but using the same role-based logic
  // (reuse the same stat generation patterns)
  let stats;
  if (role === 'Batter' || role === 'Wicketkeeper') {
    const innings = Math.max(1, Math.floor(matches * randFloat(0.85, 0.98)));
    const avg = isTopPlayer ? randFloat(30, 50) : randFloat(18, 35);
    const sr = isTopPlayer ? randFloat(135, 180) : randFloat(115, 155);
    const runs = Math.floor(innings * avg);
    stats = {
      batting: {
        matches, innings, runs, average: avg, strikeRate: sr,
        highestScore: isTopPlayer ? rand(75, 115) : rand(35, 80),
        fifties: Math.floor(runs / 280), hundreds: isTopPlayer ? Math.floor(runs / 750) : 0,
        fours: Math.floor(runs * 0.38 / 4), sixes: Math.floor(runs * 0.22 / 6),
        notOuts: rand(2, Math.floor(innings * 0.2)), ballsFaced: Math.floor(runs / sr * 100)
      },
      bowling: { matches: 0, wickets: 0, economy: 0, average: 0, strikeRate: 0, overs: 0, runsConceded: 0, bestBowling: '0/0', threeWickets: 0, fourWickets: 0, fiveWickets: 0, innings: 0 },
      fielding: {
        catches: rand(5, Math.floor(matches * 0.5)), runOuts: rand(0, 5),
        stumpings: role === 'Wicketkeeper' ? rand(5, Math.floor(matches * 0.25)) : 0
      }
    };
  } else if (role === 'Fast Bowler' || role === 'Spin Bowler') {
    const eco = role === 'Spin Bowler' ? (isTopPlayer ? randFloat(5.5, 7.0) : randFloat(7.0, 9.0)) : (isTopPlayer ? randFloat(6.5, 8.0) : randFloat(7.5, 9.5));
    const wickets = isTopPlayer ? rand(Math.floor(matches * 0.9), Math.floor(matches * 1.6)) : rand(Math.floor(matches * 0.4), Math.floor(matches * 0.9));
    const overs = matches * randFloat(3, 4);
    stats = {
      batting: {
        matches, innings: rand(Math.floor(matches * 0.3), Math.floor(matches * 0.6)),
        runs: rand(30, matches * 6), average: randFloat(5, 15), strikeRate: randFloat(95, 140),
        highestScore: rand(8, 35), fifties: 0, hundreds: 0,
        fours: rand(3, 40), sixes: rand(1, 20), notOuts: rand(5, 25), ballsFaced: rand(40, 250)
      },
      bowling: {
        matches, innings: Math.floor(matches * 0.9), overs: parseFloat(overs.toFixed(1)),
        runsConceded: Math.floor(overs * eco), wickets,
        average: wickets > 0 ? parseFloat((overs * eco / wickets).toFixed(2)) : 0,
        economy: eco, strikeRate: wickets > 0 ? parseFloat((overs * 6 / wickets).toFixed(2)) : 0,
        bestBowling: `${rand(3, 5)}/${rand(12, 30)}`,
        threeWickets: Math.floor(wickets / 18), fourWickets: Math.floor(wickets / 35), fiveWickets: Math.floor(wickets / 70)
      },
      fielding: { catches: rand(3, Math.floor(matches * 0.3)), runOuts: rand(0, 4), stumpings: 0 }
    };
  } else { // All-Rounder
    const innings = Math.max(1, Math.floor(matches * 0.85));
    const avg = isTopPlayer ? randFloat(25, 40) : randFloat(16, 28);
    const sr = randFloat(125, 170);
    const runs = Math.floor(innings * avg);
    const eco = isTopPlayer ? randFloat(7.0, 8.2) : randFloat(8.0, 10.0);
    const bowlOvers = matches * randFloat(2, 3.5);
    const wickets = isTopPlayer ? rand(Math.floor(matches * 0.5), Math.floor(matches * 1.1)) : rand(Math.floor(matches * 0.2), Math.floor(matches * 0.6));
    stats = {
      batting: {
        matches, innings, runs, average: avg, strikeRate: sr,
        highestScore: isTopPlayer ? rand(55, 100) : rand(30, 60),
        fifties: Math.floor(runs / 320), hundreds: 0,
        fours: Math.floor(runs * 0.35 / 4), sixes: Math.floor(runs * 0.25 / 6),
        notOuts: rand(2, Math.floor(innings * 0.2)), ballsFaced: Math.floor(runs / sr * 100)
      },
      bowling: {
        matches, innings: Math.floor(matches * 0.75), overs: parseFloat(bowlOvers.toFixed(1)),
        runsConceded: Math.floor(bowlOvers * eco), wickets,
        average: wickets > 0 ? parseFloat((bowlOvers * eco / wickets).toFixed(2)) : 0,
        economy: eco, strikeRate: wickets > 0 ? parseFloat((bowlOvers * 6 / wickets).toFixed(2)) : 0,
        bestBowling: `${rand(2, 4)}/${rand(18, 32)}`,
        threeWickets: Math.floor(wickets / 22), fourWickets: 0, fiveWickets: 0
      },
      fielding: { catches: rand(5, Math.floor(matches * 0.4)), runOuts: rand(1, 6), stumpings: 0 }
    };
  }
  
  const basePrice = isTopPlayer ? BASE_PRICES[rand(5, 7)] : BASE_PRICES[rand(3, 6)];
  
  return {
    name, age, country: countryData.country, nationality: countryData.country, role, battingStyle, bowlingStyle,
    isWicketkeeper: role === 'Wicketkeeper', isOverseas: true, isCapped, basePrice,
    careerStats: stats, dataSource: 'demo', lastVerified: new Date()
  };
}

function generateSeasonStats(player, playerId) {
  const seasons = [];
  const numSeasons = player.isCapped ? rand(1, 3) : (Math.random() > 0.5 ? 1 : 0);
  const startYear = 2024 - numSeasons;
  
  for (let i = 0; i < numSeasons; i++) {
    const seasonYear = startYear + i;
    const seasonMatches = rand(5, 16);
    const factor = seasonMatches / Math.max(player.careerStats.batting.matches, 1);
    
    seasons.push({
      player: playerId,
      season: seasonYear,
      team: 'Demo Team',
      batting: {
        matches: seasonMatches,
        innings: Math.max(1, Math.floor(seasonMatches * 0.9)),
        runs: Math.floor((player.careerStats.batting.runs || 0) * factor * randFloat(0.6, 1.4)),
        average: randFloat(Math.max(5, (player.careerStats.batting.average || 20) - 10), (player.careerStats.batting.average || 20) + 10),
        strikeRate: randFloat(Math.max(80, (player.careerStats.batting.strikeRate || 120) - 20), (player.careerStats.batting.strikeRate || 120) + 20),
        highestScore: rand(10, Math.max(20, player.careerStats.batting.highestScore || 30)),
        fifties: rand(0, 3),
        hundreds: rand(0, 1),
        fours: rand(5, 40),
        sixes: rand(2, 25),
        notOuts: rand(0, 4),
        ballsFaced: rand(50, 300),
        dotBallPercent: randFloat(20, 45),
        boundaryPercent: randFloat(30, 65)
      },
      bowling: {
        matches: seasonMatches,
        innings: player.careerStats.bowling.wickets > 0 ? Math.floor(seasonMatches * 0.8) : 0,
        overs: player.careerStats.bowling.overs > 0 ? parseFloat((seasonMatches * randFloat(2, 4)).toFixed(1)) : 0,
        runsConceded: player.careerStats.bowling.runsConceded > 0 ? rand(50, 300) : 0,
        wickets: player.careerStats.bowling.wickets > 0 ? rand(2, 20) : 0,
        average: randFloat(15, 40),
        economy: player.careerStats.bowling.economy > 0 ? randFloat(6, 10) : 0,
        strikeRate: randFloat(12, 30),
        bestBowling: player.careerStats.bowling.wickets > 0 ? `${rand(1, 4)}/${rand(15, 35)}` : '0/0',
        threeWickets: rand(0, 2),
        fourWickets: rand(0, 1),
        fiveWickets: 0,
        dotBallPercent: randFloat(30, 55)
      },
      fielding: {
        catches: rand(1, 10),
        runOuts: rand(0, 3),
        stumpings: player.isWicketkeeper ? rand(1, 8) : 0
      },
      dataSource: 'demo',
      lastVerified: new Date()
    });
  }
  return seasons;
}

// ---- MAIN SEED FUNCTION ----
const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await Player.deleteMany({});
    await PlayerSeasonStats.deleteMany({});
    console.log('Cleared existing player data');
    
    const allPlayers = [];
    let playerIndex = 0;
    
    // Indian Players (~320)
    const indianRoles = [
      { role: 'Batter', count: 95 },
      { role: 'Wicketkeeper', count: 45 },
      { role: 'All-Rounder', count: 65 },
      { role: 'Fast Bowler', count: 70 },
      { role: 'Spin Bowler', count: 45 }
    ];
    
    for (const { role, count } of indianRoles) {
      for (let i = 0; i < count; i++) {
        allPlayers.push(generateIndianPlayer(playerIndex++, role));
      }
    }
    console.log(`Generated ${allPlayers.length} Indian players`);
    
    // Overseas Players (~180)
    const overseasRolesPerCountry = [
      { country: 0, roles: [{ role: 'Batter', count: 5 }, { role: 'All-Rounder', count: 5 }, { role: 'Fast Bowler', count: 6 }, { role: 'Spin Bowler', count: 3 }, { role: 'Wicketkeeper', count: 2 }] }, // Australia
      { country: 1, roles: [{ role: 'Batter', count: 5 }, { role: 'All-Rounder', count: 5 }, { role: 'Fast Bowler', count: 5 }, { role: 'Spin Bowler', count: 3 }, { role: 'Wicketkeeper', count: 2 }] }, // England
      { country: 2, roles: [{ role: 'Batter', count: 4 }, { role: 'All-Rounder', count: 4 }, { role: 'Fast Bowler', count: 6 }, { role: 'Spin Bowler', count: 2 }, { role: 'Wicketkeeper', count: 2 }] }, // South Africa
      { country: 3, roles: [{ role: 'Batter', count: 4 }, { role: 'All-Rounder', count: 5 }, { role: 'Fast Bowler', count: 4 }, { role: 'Spin Bowler', count: 4 }, { role: 'Wicketkeeper', count: 2 }] }, // West Indies
      { country: 4, roles: [{ role: 'Batter', count: 4 }, { role: 'All-Rounder', count: 3 }, { role: 'Fast Bowler', count: 5 }, { role: 'Spin Bowler', count: 3 }, { role: 'Wicketkeeper', count: 2 }] }, // New Zealand
      { country: 5, roles: [{ role: 'All-Rounder', count: 3 }, { role: 'Fast Bowler', count: 3 }, { role: 'Spin Bowler', count: 4 }] }, // Sri Lanka
      { country: 6, roles: [{ role: 'All-Rounder', count: 3 }, { role: 'Fast Bowler', count: 2 }, { role: 'Spin Bowler', count: 5 }] }, // Afghanistan
      { country: 7, roles: [{ role: 'All-Rounder', count: 3 }, { role: 'Fast Bowler', count: 3 }, { role: 'Spin Bowler', count: 4 }] }  // Bangladesh
    ];
    
    let overseasIndex = 0;
    for (const { country, roles } of overseasRolesPerCountry) {
      for (const { role, count } of roles) {
        for (let i = 0; i < count; i++) {
          allPlayers.push(generateOverseasPlayer(OVERSEAS_PLAYERS[country], overseasIndex++, role));
        }
      }
    }
    
    console.log(`Total players generated: ${allPlayers.length}`);
    
    // Insert players
    const insertedPlayers = await Player.insertMany(allPlayers);
    console.log(`Inserted ${insertedPlayers.length} players into database`);
    
    // Generate season stats
    let totalSeasonStats = 0;
    for (const player of insertedPlayers) {
      const seasonStats = generateSeasonStats(player, player._id);
      if (seasonStats.length > 0) {
        await PlayerSeasonStats.insertMany(seasonStats);
        totalSeasonStats += seasonStats.length;
      }
    }
    console.log(`Inserted ${totalSeasonStats} season stat records`);
    
    // Compute and update ratings
    for (const player of insertedPlayers) {
      const rating = computeRating(player);
      await Player.findByIdAndUpdate(player._id, { rating });
    }
    console.log('Computed and updated all player ratings');
    
    // Print summary
    const summary = {
      total: insertedPlayers.length,
      indian: insertedPlayers.filter(p => !p.isOverseas).length,
      overseas: insertedPlayers.filter(p => p.isOverseas).length,
      byRole: {},
      capped: insertedPlayers.filter(p => p.isCapped).length,
      uncapped: insertedPlayers.filter(p => !p.isCapped).length,
      seasonStats: totalSeasonStats,
      dataSource: 'demo (all records)'
    };
    ['Batter', 'Wicketkeeper', 'All-Rounder', 'Fast Bowler', 'Spin Bowler'].forEach(role => {
      summary.byRole[role] = insertedPlayers.filter(p => p.role === role).length;
    });
    
    console.log('\n=== SEED SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    console.log('\n⚠️  All data is labeled dataSource: "demo"');
    console.log('Import real data via Cricsheet/CSV importers to replace demo data.');
    
    await mongoose.disconnect();
    console.log('\nDone! Database seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

if (process.argv.includes('--dummy')) {
  seedDatabase();
} else {
  console.log('Defaulting to real official Cricsheet IPL data importer...');
  import('./importRealCricsheetIPL.js');
}
