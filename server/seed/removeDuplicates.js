import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Player from '../models/Player.js';
import Room from '../models/Room.js';

// Explicit alias-to-canonical mappings where Cricsheet created duplicate entities
const DUPLICATE_PAIRS = [
  { shortName: 'K Yadav', canonicalName: 'Kuldeep Yadav' },
  { shortName: 'R Bishnoi', canonicalName: 'Ravi Bishnoi' },
  { shortName: 'N Saini', canonicalName: 'Navdeep Saini' },
  { shortName: 'MD Choudhary', canonicalName: 'Mukesh Choudhary' },
  { shortName: 'S Arora', canonicalName: 'Salil Arora' },
  { shortName: 'BAW Mendis', canonicalName: 'Ajantha Mendis' },
  { shortName: 'BKG Mendis', canonicalName: 'Kamindu Mendis' }
];

async function removeDuplicates() {
  console.log('Connecting to MongoDB Atlas to remove duplicates...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  let removedCount = 0;
  for (const pair of DUPLICATE_PAIRS) {
    const shortPlayer = await Player.findOne({ name: pair.shortName });
    const canonicalPlayer = await Player.findOne({ name: pair.canonicalName });

    if (shortPlayer && canonicalPlayer) {
      console.log(`Merging ${shortPlayer.name} into ${canonicalPlayer.name}...`);

      // Merge career stats into canonical player
      const cBat = canonicalPlayer.careerStats.batting;
      const sBat = shortPlayer.careerStats.batting;
      cBat.runs = (cBat.runs || 0) + (sBat.runs || 0);
      cBat.fours = (cBat.fours || 0) + (sBat.fours || 0);
      cBat.sixes = (cBat.sixes || 0) + (sBat.sixes || 0);
      cBat.ballsFaced = (cBat.ballsFaced || 0) + (sBat.ballsFaced || 0);

      const cBowl = canonicalPlayer.careerStats.bowling;
      const sBowl = shortPlayer.careerStats.bowling;
      cBowl.wickets = (cBowl.wickets || 0) + (sBowl.wickets || 0);
      cBowl.overs = (cBowl.overs || 0) + (sBowl.overs || 0);
      cBowl.runsConceded = (cBowl.runsConceded || 0) + (sBowl.runsConceded || 0);

      await canonicalPlayer.save();

      // Replace shortPlayer ID in all rooms
      await Room.updateMany(
        { 'auction.playerPool': shortPlayer._id },
        { $pull: { 'auction.playerPool': shortPlayer._id } }
      );

      // Remove the duplicate record
      await Player.deleteOne({ _id: shortPlayer._id });
      removedCount++;
      console.log(`Removed duplicate record for ${shortPlayer.name}.`);
    }
  }

  // Also deduplicate any identical names if any exist
  const all = await Player.find();
  const seen = new Map();
  let exactDupesRemoved = 0;
  for (const p of all) {
    const key = p.name.trim().toLowerCase();
    if (seen.has(key)) {
      console.log(`Deleting exact duplicate: ${p.name} (${p._id})`);
      await Player.deleteOne({ _id: p._id });
      await Room.updateMany(
        { 'auction.playerPool': p._id },
        { $pull: { 'auction.playerPool': p._id } }
      );
      exactDupesRemoved++;
    } else {
      seen.set(key, p._id);
    }
  }

  console.log(`\nCleanup complete: ${removedCount} alias duplicates merged and ${exactDupesRemoved} exact duplicates removed.`);
  console.log(`Total active unique players in DB now: ${await Player.countDocuments()}`);

  await mongoose.disconnect();
}

removeDuplicates().catch(err => {
  console.error(err);
  process.exit(1);
});
