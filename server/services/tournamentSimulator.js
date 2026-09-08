import Room from '../models/Room.js';

export const simulateTournament = (room) => {
  const teams = room.teams;
  if (!teams || teams.length < 2) {
    throw new Error('Not enough teams to simulate a tournament.');
  }

  // Calculate composite ratings for each team
  const teamRatings = teams.map(team => {
    let batRating = 0;
    let bowlRating = 0;
    const players = team.players || [];
    
    players.forEach(p => {
      // Simplistic rating estimation
      if (p.role === 'Batsman' || p.role === 'All-Rounder' || p.role === 'Wicket-Keeper') {
        batRating += p.basePrice || 1;
      }
      if (p.role === 'Bowler' || p.role === 'All-Rounder') {
        bowlRating += p.basePrice || 1;
      }
    });

    return {
      userId: team.userId.toString(),
      teamName: team.teamName,
      batRating: Math.max(batRating, 10),
      bowlRating: Math.max(bowlRating, 10),
      matches: 0,
      won: 0,
      lost: 0,
      pts: 0,
      nrr: 0,
      runsScored: 0,
      ballsFaced: 0,
      runsConceded: 0,
      ballsBowled: 0,
      players: players
    };
  });

  const matchSchedule = [];
  // Round-robin (double if <= 6 teams)
  const isDouble = teams.length <= 6;
  
  for (let i = 0; i < teamRatings.length; i++) {
    for (let j = i + 1; j < teamRatings.length; j++) {
      matchSchedule.push({ home: i, away: j });
      if (isDouble) {
        matchSchedule.push({ home: j, away: i });
      }
    }
  }

  const simulateMatch = (teamA, teamB) => {
    // Generate scores between 140 and 220
    const generateScore = (batTeam, bowlTeam) => {
      const base = 140;
      const variance = 80;
      const batAdvantage = Math.min((batTeam.batRating / bowlTeam.bowlRating) - 1, 1);
      const score = Math.floor(base + (variance * 0.5) + (batAdvantage * variance * 0.2) + (Math.random() * variance * 0.5));
      return Math.min(Math.max(score, 50), 280); 
    };

    const scoreA = generateScore(teamA, teamB);
    const scoreB = generateScore(teamB, teamA);
    
    return {
      teamAId: teamA.userId,
      teamAName: teamA.teamName,
      teamAScore: scoreA,
      teamBId: teamB.userId,
      teamBName: teamB.teamName,
      teamBScore: scoreB,
      winnerId: scoreA > scoreB ? teamA.userId : (scoreB > scoreA ? teamB.userId : null) // Tie handling omitted for simplicity
    };
  };

  const matchResults = matchSchedule.map(match => {
    const teamA = teamRatings[match.home];
    const teamB = teamRatings[match.away];
    
    const result = simulateMatch(teamA, teamB);
    
    teamA.matches++;
    teamB.matches++;
    
    // Simplistic NRR tracking
    teamA.runsScored += result.teamAScore;
    teamA.ballsFaced += 120;
    teamA.runsConceded += result.teamBScore;
    teamA.ballsBowled += 120;

    teamB.runsScored += result.teamBScore;
    teamB.ballsFaced += 120;
    teamB.runsConceded += result.teamAScore;
    teamB.ballsBowled += 120;
    
    if (result.winnerId === teamA.userId) {
      teamA.won++;
      teamA.pts += 2;
    } else if (result.winnerId === teamB.userId) {
      teamB.won++;
      teamB.pts += 2;
    } else {
      teamA.pts += 1;
      teamB.pts += 1;
    }

    return result;
  });

  // Calculate NRR
  teamRatings.forEach(team => {
    const runRateFor = team.runsScored / (team.ballsFaced / 6);
    const runRateAgainst = team.runsConceded / (team.ballsBowled / 6);
    team.nrr = (runRateFor - runRateAgainst).toFixed(3);
  });

  // Sort Points Table
  teamRatings.sort((a, b) => b.pts - a.pts || b.nrr - a.nrr);

  // Playoffs Simulation
  const playoffs = {};
  let champion = null;

  if (teamRatings.length >= 4) {
    const rank1 = teamRatings[0];
    const rank2 = teamRatings[1];
    const rank3 = teamRatings[2];
    const rank4 = teamRatings[3];

    // Qualifier 1
    const q1 = simulateMatch(rank1, rank2);
    playoffs.qualifier1 = q1;
    const q1Winner = q1.winnerId === rank1.userId ? rank1 : rank2;
    const q1Loser = q1.winnerId === rank1.userId ? rank2 : rank1;

    // Eliminator
    const elim = simulateMatch(rank3, rank4);
    playoffs.eliminator = elim;
    const elimWinner = elim.winnerId === rank3.userId ? rank3 : rank4;

    // Qualifier 2
    const q2 = simulateMatch(q1Loser, elimWinner);
    playoffs.qualifier2 = q2;
    const q2Winner = q2.winnerId === q1Loser.userId ? q1Loser : elimWinner;

    // Final
    const finalMatch = simulateMatch(q1Winner, q2Winner);
    playoffs.final = finalMatch;
    champion = finalMatch.winnerId === q1Winner.userId ? q1Winner : q2Winner;
  } else if (teamRatings.length >= 2) {
      // Just a final if 2 or 3 teams
      const finalMatch = simulateMatch(teamRatings[0], teamRatings[1]);
      playoffs.final = finalMatch;
      champion = finalMatch.winnerId === teamRatings[0].userId ? teamRatings[0] : teamRatings[1];
  }

  // Generate Player Stats for Awards (Mocked for now)
  const allPlayers = [];
  teamRatings.forEach(team => {
    team.players.forEach(p => {
        const pObj = (typeof p.toObject === 'function') ? p.toObject() : p;
        allPlayers.push({
            ...pObj,
            simRuns: Math.floor(Math.random() * 800),
            simWickets: Math.floor(Math.random() * 30),
            teamName: team.teamName
        });
    });
  });

  const orangeCap = allPlayers.sort((a, b) => b.simRuns - a.simRuns)[0];
  const purpleCap = allPlayers.sort((a, b) => b.simWickets - a.simWickets)[0];
  const mvp = allPlayers.sort((a, b) => ((b.simRuns + b.simWickets * 20) - (a.simRuns + a.simWickets * 20)))[0];
  const bestXI = allPlayers.sort((a, b) => ((b.simRuns + b.simWickets * 20) - (a.simRuns + a.simWickets * 20))).slice(0, 11);

  return {
    isSimulated: true,
    disclaimer: "SIMULATED RESULTS - Generated by analytics engine",
    pointsTable: teamRatings.map(t => ({
      userId: t.userId,
      teamName: t.teamName,
      matches: t.matches,
      won: t.won,
      lost: t.lost,
      pts: t.pts,
      nrr: t.nrr
    })),
    matchResults,
    playoffs,
    champion: champion ? { userId: champion.userId, teamName: champion.teamName } : null,
    awards: {
      orangeCap,
      purpleCap,
      mvp,
      bestXI
    }
  };
};
