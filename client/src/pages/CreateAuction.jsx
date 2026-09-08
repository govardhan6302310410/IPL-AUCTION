import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, IndianRupee, Clock, Settings, Zap, Globe, Bot, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import useRoomStore from '../store/roomStore';

const AUCTION_TYPES = [
  { value: 'standard', label: 'Standard', desc: 'Players nominated one by one' },
  { value: 'category', label: 'Category', desc: 'Grouped by role/tier' },
];

const Field = ({ label, icon: Icon, children }) => (
  <div>
    <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
      {Icon && <Icon className="w-4 h-4" />} {label}
    </label>
    {children}
  </div>
);

const inputStyle = {
  backgroundColor: 'var(--broadcast-surface)',
  border: '1px solid var(--broadcast-border)',
  color: 'var(--text-primary)'
};

export default function CreateAuction() {
  const navigate = useNavigate();
  const { createRoom, isLoading, error, clearError } = useRoomStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [config, setConfig] = useState({
    name: '',
    preferredTeamIndex: -1,
    maxTeams: 10,
    purse: 120,
    squadSize: 25,
    minSquad: 18,
    overseasLimit: 8,
    maxOverseasXI: 4,
    bidTimer: 15,
    bidIncrement: 0.25,
    auctionType: 'standard',
    poolSize: 400,
    visibility: 'private',
    isAIRoom: false,
    nominationMode: 'automatic'
  });

  const update = (key, value) => {
    clearError();
    setConfig(c => ({ ...c, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const room = await createRoom(config);
      navigate(`/room/${room.roomId}/lobby`);
    } catch (err) {}
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        <Trophy className="w-8 h-8 inline mr-2" style={{ color: 'var(--gold-primary)' }} />
        Create Auction
      </h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>Configure your auction room and invite players.</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Settings */}
        <div className="p-6 rounded-xl space-y-4" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Basic Settings</h2>
          
          <Field label="Auction Name" icon={Trophy}>
            <input type="text" value={config.name} onChange={e => update('name', e.target.value)}
              placeholder="e.g. IPL Mega Auction 2024"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
          </Field>

          <Field label="Your Starting Franchise" icon={Shield}>
            <select 
              value={config.preferredTeamIndex} 
              onChange={e => update('preferredTeamIndex', parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none" 
              style={inputStyle}
            >
              <option value={-1}>Choose your team in the Lobby</option>
              <option value={0}>Chennai Super Kings (CSK)</option>
              <option value={1}>Mumbai Indians (MI)</option>
              <option value={2}>Royal Challengers Bengaluru (RCB)</option>
              <option value={3}>Kolkata Knight Riders (KKR)</option>
              <option value={4}>Delhi Capitals (DC)</option>
              <option value={5}>Sunrisers Hyderabad (SRH)</option>
              <option value={6}>Punjab Kings (PBKS)</option>
              <option value={7}>Rajasthan Royals (RR)</option>
              <option value={8}>Lucknow Super Giants (LSG)</option>
              <option value={9}>Gujarat Titans (GT)</option>
            </select>
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Number of Teams" icon={Users}>
              <select value={config.maxTeams} onChange={e => update('maxTeams', parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle}>
                {[2,3,4,5,6,7,8,9,10,12,14,16,18,20].map(n => (
                  <option key={n} value={n}>{n} Teams</option>
                ))}
              </select>
            </Field>

            <Field label="Purse per Team (\u20b9 Cr)" icon={IndianRupee}>
              <input type="number" value={config.purse} onChange={e => update('purse', parseFloat(e.target.value))}
                min={50} max={500} step={5}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Bid Timer (seconds)" icon={Clock}>
              <select value={config.bidTimer} onChange={e => update('bidTimer', parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle}>
                {[5,10,15,20,30].map(n => (
                  <option key={n} value={n}>{n} seconds</option>
                ))}
              </select>
            </Field>

            <Field label="Bid Increment (\u20b9 Cr)" icon={Zap}>
              <select value={config.bidIncrement} onChange={e => update('bidIncrement', parseFloat(e.target.value))}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle}>
                {[0.05, 0.1, 0.25, 0.5, 1, 2].map(n => (
                  <option key={n} value={n}>₹{n} Cr</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Auction Type">
              <div className="flex gap-2">
                {AUCTION_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => update('auctionType', t.value)}
                    className="flex-1 p-3 rounded-lg text-sm text-center transition"
                    style={{
                      backgroundColor: config.auctionType === t.value ? 'rgba(245,166,35,0.15)' : 'var(--broadcast-surface)',
                      border: config.auctionType === t.value ? '2px solid var(--gold-primary)' : '1px solid var(--broadcast-border)',
                      color: config.auctionType === t.value ? 'var(--gold-primary)' : 'var(--text-secondary)'
                    }}>
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Room Visibility" icon={Globe}>
              <div className="flex gap-2">
                {[{ v: 'private', l: 'Private' }, { v: 'public', l: 'Public' }].map(opt => (
                  <button key={opt.v} type="button" onClick={() => update('visibility', opt.v)}
                    className="flex-1 py-3 rounded-lg text-sm font-medium transition"
                    style={{
                      backgroundColor: config.visibility === opt.v ? 'rgba(245,166,35,0.15)' : 'var(--broadcast-surface)',
                      border: config.visibility === opt.v ? '2px solid var(--gold-primary)' : '1px solid var(--broadcast-border)',
                      color: config.visibility === opt.v ? 'var(--gold-primary)' : 'var(--text-secondary)'
                    }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* AI Room Toggle */}
          <div className="p-4 rounded-lg space-y-2" style={{ backgroundColor: 'var(--broadcast-surface)', border: config.isAIRoom ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Play with AI Mode</p>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      Difficult Mode
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Auto-fills empty franchise slots with bots + auto-assigns 1 dedicated AI Auctioneer
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => update('isAIRoom', !config.isAIRoom)}
                className="w-12 h-6 rounded-full transition-all relative"
                style={{ backgroundColor: config.isAIRoom ? '#8b5cf6' : 'var(--broadcast-border)' }}>
                <div className="w-5 h-5 rounded-full absolute top-0.5 transition-all bg-white"
                  style={{ left: config.isAIRoom ? '26px' : '2px' }} />
              </button>
            </div>
            {config.isAIRoom && (
              <div className="text-xs p-2.5 rounded bg-purple-950/30 border border-purple-900/40 text-purple-200/90 leading-relaxed">
                🤖 <strong>Auto-Fill Active:</strong> You chose <strong>{config.maxTeams} Teams</strong>. The system will auto-create AI franchises for all unoccupied slots when the auction begins, and assign an independent <strong>AI Auctioneer</strong> to run nominations and gavel calls.
              </div>
            )}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="rounded-xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-4 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              <Settings className="w-4 h-4" /> Advanced Settings
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
          </button>
          {showAdvanced && (
            <div className="p-4 pt-0 grid sm:grid-cols-2 gap-4" style={{ borderTop: '1px solid var(--broadcast-border)' }}>
              <Field label="Squad Size">
                <input type="number" value={config.squadSize} onChange={e => update('squadSize', parseInt(e.target.value))}
                  min={15} max={35} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
              </Field>
              <Field label="Minimum Squad">
                <input type="number" value={config.minSquad} onChange={e => update('minSquad', parseInt(e.target.value))}
                  min={11} max={config.squadSize} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
              </Field>
              <Field label="Overseas Limit">
                <input type="number" value={config.overseasLimit} onChange={e => update('overseasLimit', parseInt(e.target.value))}
                  min={0} max={12} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
              </Field>
              <Field label="Max Overseas in XI">
                <input type="number" value={config.maxOverseasXI} onChange={e => update('maxOverseasXI', parseInt(e.target.value))}
                  min={0} max={config.overseasLimit} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
              </Field>
              <Field label="Player Pool Size">
                <input type="number" value={config.poolSize} onChange={e => update('poolSize', parseInt(e.target.value))}
                  min={360} max={500} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Min 360, Max 500 players</p>
              </Field>
              <Field label="Nomination Mode">
                <select value={config.nominationMode} onChange={e => update('nominationMode', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle}>
                  <option value="automatic">Automatic</option>
                  <option value="admin">Admin Nomination</option>
                  <option value="team">Team Rotation</option>
                </select>
              </Field>
            </div>
          )}
        </div>

        <button type="submit" disabled={isLoading}
          className="w-full py-4 rounded-xl font-display text-lg font-bold transition hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--gradient-gold)', color: '#000' }}>
          {isLoading ? 'Creating Room...' : '\uD83C\uDFCF Create Auction Room'}
        </button>
      </form>
    </div>
  );
}
