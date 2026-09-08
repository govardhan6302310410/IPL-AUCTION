export const ROOM_STATES = {
  LOBBY: 'LOBBY',
  STARTING: 'STARTING',
  IN_PROGRESS: 'IN_PROGRESS',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED'
};

export const AUCTION_STATES = {
  LOBBY: 'LOBBY',
  READY: 'READY',
  STARTING: 'STARTING',
  NOMINATING: 'NOMINATING',
  BIDDING: 'BIDDING',
  SOLD: 'SOLD',
  UNSOLD: 'UNSOLD',
  PAUSED: 'PAUSED',
  NEXT_PLAYER: 'NEXT_PLAYER',
  COMPLETED: 'COMPLETED'
};

export const TEAM_STATUS = {
  WAITING: 'WAITING',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  SPECTATOR: 'SPECTATOR',
  INACTIVE: 'INACTIVE',
  FINISHED: 'FINISHED'
};

export const PLAYER_ROLES = {
  BATTER: 'Batter',
  WICKETKEEPER: 'Wicketkeeper',
  ALL_ROUNDER: 'All-Rounder',
  FAST_BOWLER: 'Fast Bowler',
  SPIN_BOWLER: 'Spin Bowler'
};

export const BATTING_STYLES = {
  RIGHT_HAND: 'Right-hand bat',
  LEFT_HAND: 'Left-hand bat'
};

export const BOWLING_STYLES = {
  RIGHT_ARM_FAST: 'Right-arm fast',
  RIGHT_ARM_MEDIUM: 'Right-arm medium',
  LEFT_ARM_FAST: 'Left-arm fast',
  LEFT_ARM_MEDIUM: 'Left-arm medium',
  RIGHT_ARM_OFFSPIN: 'Right-arm offspin',
  RIGHT_ARM_LEGSPIN: 'Right-arm legspin',
  LEFT_ARM_ORTHODOX: 'Left-arm orthodox',
  LEFT_ARM_CHINAMAN: 'Left-arm chinaman',
  NONE: 'None'
};

export const DATA_SOURCES = {
  CRICSHEET: 'cricsheet',
  STATSGURU: 'statsguru',
  OFFICIAL_IPL: 'official_ipl',
  MANUAL_VERIFIED: 'manual_verified',
  DEMO: 'demo'
};

export const AI_PERSONALITIES = {
  AGGRESSIVE: 'Aggressive',
  CONSERVATIVE: 'Conservative',
  BALANCED: 'Balanced',
  STAR_HUNTER: 'Star Hunter',
  YOUNG_TALENT: 'Young Talent',
  BOWLING_SPECIALIST: 'Bowling Specialist',
  BATTING_SPECIALIST: 'Batting Specialist',
  BUDGET_MANAGER: 'Budget Manager'
};

export const DEFAULT_TEAMS = [
  { name: 'Chennai Super Kings', shortName: 'CSK', primaryColor: '#f9cd05', secondaryColor: '#f2b807' },
  { name: 'Mumbai Indians', shortName: 'MI', primaryColor: '#004ba0', secondaryColor: '#003b7a' },
  { name: 'Royal Challengers Bengaluru', shortName: 'RCB', primaryColor: '#da1818', secondaryColor: '#000000' },
  { name: 'Kolkata Knight Riders', shortName: 'KKR', primaryColor: '#3a225d', secondaryColor: '#dda835' },
  { name: 'Delhi Capitals', shortName: 'DC', primaryColor: '#004c97', secondaryColor: '#ef1c24' },
  { name: 'Sunrisers Hyderabad', shortName: 'SRH', primaryColor: '#f26522', secondaryColor: '#000000' },
  { name: 'Punjab Kings', shortName: 'PBKS', primaryColor: '#d71920', secondaryColor: '#d4af37' },
  { name: 'Rajasthan Royals', shortName: 'RR', primaryColor: '#ea1a85', secondaryColor: '#004ba0' },
  { name: 'Lucknow Super Giants', shortName: 'LSG', primaryColor: '#0057b8', secondaryColor: '#ff671f' },
  { name: 'Gujarat Titans', shortName: 'GT', primaryColor: '#1b2133', secondaryColor: '#cba92b' }
];

export const DEFAULT_AUCTION_SETTINGS = {
  purse: 120,  // in crores
  squadSize: 25,
  minSquad: 18,
  overseasLimit: 8,
  maxOverseasXI: 4,
  bidTimer: 15,  // seconds
  bidIncrement: 0.25,  // in crores
  minPoolSize: 360,
  maxPoolSize: 500
};
