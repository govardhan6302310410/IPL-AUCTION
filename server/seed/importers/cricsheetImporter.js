/**
 * Cricsheet Importer
 * Parses Cricsheet YAML/JSON ball-by-ball data files and aggregates
 * into PlayerSeasonStats records.
 * 
 * Usage: Place Cricsheet data files in server/seed/data/cricsheet/
 * Then run: node server/seed/importers/cricsheetImporter.js
 * 
 * Data source: https://cricsheet.org/ (CC-BY-4.0 license)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const parseCricsheetMatch = (matchData) => {
  const playerStats = {};
  
  if (!matchData || !matchData.innings) return playerStats;
  
  const season = matchData.info?.dates?.[0] 
    ? new Date(matchData.info.dates[0]).getFullYear() 
    : null;
  
  // Track all players in the match
  const allPlayers = new Set();
  if (matchData.info?.players) {
    Object.values(matchData.info.players).forEach(teamPlayers => {
      teamPlayers.forEach(p => allPlayers.add(p));
    });
  }
  
  // Initialize player records
  allPlayers.forEach(playerName => {
    playerStats[playerName] = {
      name: playerName,
      season,
      team: Object.entries(matchData.info?.players || {}).find(([team, players]) => 
        players.includes(playerName)
      )?.[0] || 'Unknown',
      batting: { innings: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, dismissals: 0, highestScore: 0 },
      bowling: { innings: 0, overs: 0, balls: 0, runsConceded: 0, wickets: 0 },
      fielding: { catches: 0, runOuts: 0, stumpings: 0 }
    };
  });
  
  // Process each innings
  matchData.innings?.forEach(inning => {
    const inningsData = inning;
    const battingTeam = inningsData.team;
    const overs = inningsData.overs || [];
    
    // Track batters and bowlers in this innings
    const battersThisInnings = new Set();
    const bowlersThisInnings = new Set();
    
    overs.forEach(over => {
      over.deliveries?.forEach(delivery => {
        const batter = delivery.batter;
        const bowler = delivery.bowler;
        
        if (!playerStats[batter] || !playerStats[bowler]) return;
        
        battersThisInnings.add(batter);
        bowlersThisInnings.add(bowler);
        
        // Batting stats
        const runs = delivery.runs?.batter || 0;
        playerStats[batter].batting.runs += runs;
        playerStats[batter].batting.ballsFaced += 1;
        if (runs === 4) playerStats[batter].batting.fours += 1;
        if (runs === 6) playerStats[batter].batting.sixes += 1;
        
        // Bowling stats
        playerStats[bowler].bowling.runsConceded += (delivery.runs?.total || 0) - (delivery.runs?.extras || 0);
        playerStats[bowler].bowling.balls += 1;
        
        // Wickets
        if (delivery.wickets) {
          delivery.wickets.forEach(w => {
            if (['bowled', 'caught', 'lbw', 'stumped', 'caught and bowled', 'hit wicket'].includes(w.kind)) {
              playerStats[bowler].bowling.wickets += 1;
            }
            playerStats[batter].batting.dismissals += 1;
            
            // Fielding
            if (w.fielders) {
              w.fielders.forEach(f => {
                const fielderName = f.name || f;
                if (playerStats[fielderName]) {
                  if (w.kind === 'caught' || w.kind === 'caught and bowled') {
                    playerStats[fielderName].fielding.catches += 1;
                  } else if (w.kind === 'run out') {
                    playerStats[fielderName].fielding.runOuts += 1;
                  } else if (w.kind === 'stumped') {
                    playerStats[fielderName].fielding.stumpings += 1;
                  }
                }
              });
            }
          });
        }
      });
    });
    
    // Count innings participation
    battersThisInnings.forEach(b => { playerStats[b].batting.innings += 1; });
    bowlersThisInnings.forEach(b => { playerStats[b].bowling.innings += 1; });
  });
  
  return playerStats;
};

export const importCricsheetDirectory = async (dirPath) => {
  const results = { processed: 0, errors: [], playerAggregates: {} };
  
  if (!fs.existsSync(dirPath)) {
    results.errors.push(`Directory not found: ${dirPath}`);
    return results;
  }
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json') || f.endsWith('.yaml'));
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
      const matchData = JSON.parse(content);
      const stats = parseCricsheetMatch(matchData);
      
      // Merge into aggregates
      Object.entries(stats).forEach(([name, data]) => {
        const key = `${name}_${data.season}`;
        if (!results.playerAggregates[key]) {
          results.playerAggregates[key] = { ...data, matches: 1 };
        } else {
          const agg = results.playerAggregates[key];
          agg.matches += 1;
          agg.batting.runs += data.batting.runs;
          agg.batting.ballsFaced += data.batting.ballsFaced;
          agg.batting.fours += data.batting.fours;
          agg.batting.sixes += data.batting.sixes;
          agg.batting.innings += data.batting.innings;
          agg.batting.dismissals += data.batting.dismissals;
          agg.bowling.balls += data.bowling.balls;
          agg.bowling.runsConceded += data.bowling.runsConceded;
          agg.bowling.wickets += data.bowling.wickets;
          agg.bowling.innings += data.bowling.innings;
          agg.fielding.catches += data.fielding.catches;
          agg.fielding.runOuts += data.fielding.runOuts;
          agg.fielding.stumpings += data.fielding.stumpings;
        }
      });
      
      results.processed += 1;
    } catch (err) {
      results.errors.push(`Error processing ${file}: ${err.message}`);
    }
  }
  
  return results;
};

export default { parseCricsheetMatch, importCricsheetDirectory };
