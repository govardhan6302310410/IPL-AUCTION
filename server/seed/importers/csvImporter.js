/**
 * CSV Importer
 * Generic CSV importer for player data matching the schema:
 * name, country, role, batting_style, bowling_style, base_price,
 * matches, runs, average, strike_rate, wickets, economy,
 * bowling_average, bowling_strike_rate, catches, stumpings, run_outs
 */

import fs from 'fs';
import path from 'path';

const ROLE_MAP = {
  'batter': 'Batter', 'batsman': 'Batter', 'bat': 'Batter',
  'wicketkeeper': 'Wicketkeeper', 'wk': 'Wicketkeeper', 'keeper': 'Wicketkeeper',
  'all-rounder': 'All-Rounder', 'allrounder': 'All-Rounder', 'ar': 'All-Rounder',
  'fast bowler': 'Fast Bowler', 'pace': 'Fast Bowler', 'fast': 'Fast Bowler', 'seam': 'Fast Bowler',
  'spin bowler': 'Spin Bowler', 'spin': 'Spin Bowler', 'spinner': 'Spin Bowler'
};

const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
};

export const importCSV = (filePath) => {
  const report = { players: [], errors: [], warnings: [], total: 0, valid: 0, invalid: 0 };
  
  if (!fs.existsSync(filePath)) {
    report.errors.push(`File not found: ${filePath}`);
    return report;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) {
    report.errors.push('CSV must have a header row and at least one data row');
    return report;
  }
  
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    
    report.total += 1;
    const playerErrors = [];
    
    // Validate required fields
    if (!row.name) playerErrors.push('Missing name');
    if (!row.country) playerErrors.push('Missing country');
    if (!row.role) playerErrors.push('Missing role');
    
    const normalizedRole = ROLE_MAP[(row.role || '').toLowerCase()] || row.role;
    if (!['Batter', 'Wicketkeeper', 'All-Rounder', 'Fast Bowler', 'Spin Bowler'].includes(normalizedRole)) {
      playerErrors.push(`Invalid role: ${row.role}`);
    }
    
    if (playerErrors.length > 0) {
      report.errors.push({ row: i + 1, name: row.name || 'Unknown', errors: playerErrors });
      report.invalid += 1;
      continue;
    }
    
    // Determine country for overseas flag
    const overseasCountries = new Set();
    // Everyone except India is overseas in IPL context
    const isOverseas = (row.country || '').toLowerCase() !== 'india';
    
    const player = {
      name: row.name,
      country: row.country,
      role: normalizedRole,
      battingStyle: row.batting_style || 'Right-hand bat',
      bowlingStyle: row.bowling_style || 'None',
      isOverseas,
      isCapped: row.capped !== 'false' && row.capped !== '0',
      isWicketkeeper: normalizedRole === 'Wicketkeeper',
      basePrice: parseFloat(row.base_price) || 0.2,
      careerStats: {
        batting: {
          matches: parseInt(row.matches) || 0,
          runs: parseInt(row.runs) || 0,
          average: parseFloat(row.average) || 0,
          strikeRate: parseFloat(row.strike_rate) || 0,
          highestScore: parseInt(row.highest_score) || 0,
          fifties: parseInt(row.fifties) || 0,
          hundreds: parseInt(row.hundreds) || 0,
          fours: parseInt(row.fours) || 0,
          sixes: parseInt(row.sixes) || 0
        },
        bowling: {
          wickets: parseInt(row.wickets) || 0,
          economy: parseFloat(row.economy) || 0,
          average: parseFloat(row.bowling_average) || 0,
          strikeRate: parseFloat(row.bowling_strike_rate) || 0
        },
        fielding: {
          catches: parseInt(row.catches) || 0,
          stumpings: parseInt(row.stumpings) || 0,
          runOuts: parseInt(row.run_outs) || 0
        }
      },
      dataSource: 'demo'
    };
    
    // Warnings for incomplete data
    if (!player.careerStats.batting.matches) report.warnings.push({ row: i + 1, name: row.name, warning: 'No match data' });
    
    report.players.push(player);
    report.valid += 1;
  }
  
  return report;
};

export default { importCSV };
