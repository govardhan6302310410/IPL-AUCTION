import { calculateMaxLegalBid, checkTeamCanLegallyBid } from '../auction/PurseManager.js';
import { calculatePlayerExpectedValue, classifyPlayerValue } from '../analytics/playerValue.js';
import { calculateTeamRating } from '../analytics/teamRating.js';
import { simulateTournament } from '../services/tournamentSimulator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log('  PASS: ' + message);
    passed++;
  } else {
    console.error('  FAIL: ' + message);
    failed++;
  }
}

console.log('\nCRICKET AUCTION ENGINE TEST SUITE\n');

// 1. PurseManager & Max Legal Bid Tests
console.log('1. Testing PurseManager & Legal Bid Rules:');
const mockSettings = { minSquad: 18, squadSize: 25, overseasLimit: 8, minReservePerPlayer: 0.2 };
const team1 = {
  purse: { remaining: 10.0 },
  squad: new Array(15).fill({}),
  overseas: 4
};
const maxBid = calculateMaxLegalBid(team1, mockSettings);
assert(maxBid === 9.6, 'Max legal bid matches reserve formula (expected 9.6 Cr, got ' + maxBid + ' Cr)');

const legalCheckValid = checkTeamCanLegallyBid(team1, { isOverseas: false }, 9.5, mockSettings);
assert(legalCheckValid.canBid === true, 'Legal bid of 9.5 Cr is accepted within 9.6 Cr limit');

const legalCheckExceeds = checkTeamCanLegallyBid(team1, { isOverseas: false }, 9.8, mockSettings);
assert(legalCheckExceeds.canBid === false, 'Illegal bid of 9.8 Cr exceeding 9.6 Cr reserve is rejected');

const overseasPlayer = { isOverseas: true };
const fullOverseasTeam = { ...team1, overseas: 8 };
const overseasBlocked = checkTeamCanLegallyBid(fullOverseasTeam, overseasPlayer, 1.0, mockSettings);
assert(overseasBlocked.canBid === false, 'Overseas bid blocked when team has reached overseas limit of 8');

// 2. Player Value & Analytics Tests
console.log('\n2. Testing Analytics & Value Classification:');
const starPlayer = { basePrice: 2.0, rating: 90 };
const starEV = calculatePlayerExpectedValue(starPlayer);
assert(starEV > 2.0, 'Star player EV is higher than base price (expected > 2.0 Cr, got ' + starEV.toFixed(2) + ' Cr)');

const stealResult = classifyPlayerValue(starPlayer, 2.2);
assert(stealResult.classification === 'STEAL', 'Player bought at base + 10% is classified as STEAL (got ' + stealResult.classification + ')');

const overpaidResult = classifyPlayerValue({ basePrice: 0.5, rating: 55 }, 12.0);
assert(overpaidResult.classification === 'OVERPAID', 'Low rating player bought at 12 Cr is classified as OVERPAID (got ' + overpaidResult.classification + ')');

// 3. Team Rating Engine Tests
console.log('\n3. Testing Team Rating Engine:');
const mockTeam = {
  name: 'Chennai Falcons',
  purse: { remaining: 5.0, spent: 95.0 },
  squadDetails: [
    { player: { role: 'Batter', rating: 85 } },
    { player: { role: 'Batter', rating: 80 } },
    { player: { role: 'Batter', rating: 78 } },
    { player: { role: 'Batter', rating: 75 } },
    { player: { role: 'Batter', rating: 70 } },
    { player: { role: 'Wicket-Keeper', rating: 92 } },
    { player: { role: 'Bowler', rating: 88 } },
    { player: { role: 'Bowler', rating: 84 } },
    { player: { role: 'Bowler', rating: 82 } },
    { player: { role: 'Bowler', rating: 80 } },
    { player: { role: 'Bowler', rating: 76 } },
    { player: { role: 'All-Rounder', rating: 85 } },
    { player: { role: 'All-Rounder', rating: 82 } },
    { player: { role: 'Batter', rating: 72 } },
    { player: { role: 'Bowler', rating: 74 } },
    { player: { role: 'Bowler', rating: 73 } },
    { player: { role: 'Batter', rating: 71 } },
    { player: { role: 'Bowler', rating: 70 } }
  ]
};
const rating = calculateTeamRating(mockTeam, mockSettings);
assert(rating.compositeScore > 70, 'Balanced team receives high composite score (>70, got ' + rating.compositeScore.toFixed(1) + ')');
assert(rating.breakdown.balanceScore === 100, 'Team with adequate batters, WKs, and bowlers has 100% balance score');

// 4. Tournament Simulator Tests
console.log('\n4. Testing Tournament Simulator:');
const mockRoom = {
  name: 'Premier League',
  teams: [
    { userId: 'u1', teamName: 'Chennai Falcons', players: [{ role: 'Batsman', basePrice: 15 }, { role: 'Bowler', basePrice: 15 }] },
    { userId: 'u2', teamName: 'Mumbai Titans', players: [{ role: 'Batsman', basePrice: 14 }, { role: 'Bowler', basePrice: 14 }] },
    { userId: 'u3', teamName: 'Bangalore Warriors', players: [{ role: 'Batsman', basePrice: 16 }, { role: 'Bowler', basePrice: 10 }] },
    { userId: 'u4', teamName: 'Kolkata Riders', players: [{ role: 'Batsman', basePrice: 12 }, { role: 'Bowler', basePrice: 13 }] }
  ]
};
const tournament = simulateTournament(mockRoom);
assert(tournament.pointsTable.length === 4, 'Points table generated with all 4 teams');
assert(tournament.champion !== null, 'Playoffs simulated to champion (Champion: ' + tournament.champion.teamName + ')');
assert(tournament.awards.orangeCap !== null, 'Simulated Orange Cap awarded');
assert(tournament.awards.purpleCap !== null, 'Simulated Purple Cap awarded');
assert(tournament.isSimulated === true, 'Tournament marked with isSimulated flag');

console.log('\nTEST SUMMARY: ' + passed + ' Passed, ' + failed + ' Failed');
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED!\n');
  process.exit(0);
}
