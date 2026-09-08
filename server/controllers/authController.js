import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

// Register
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check existing user
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(400).json({ message: `User with this ${field} already exists` });
    }
    
    const user = await User.create({
      username,
      email,
      password,
      displayName: username
    });
    
    const token = generateToken(user._id);
    
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email already taken' });
    }
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(503).json({
        message: 'Database is currently unreachable. Please whitelist your IP in MongoDB Atlas (Network Access -> Add IP -> 0.0.0.0/0).'
      });
    }
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    if (user.isGuest) {
      return res.status(401).json({ message: 'This is a guest account. Please register for a full account.' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const token = generateToken(user._id);
    
    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(503).json({
        message: 'Database is currently unreachable. Please whitelist your IP in MongoDB Atlas (Network Access -> Add IP -> 0.0.0.0/0).'
      });
    }
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// Guest Login
export const guestLogin = async (req, res) => {
  try {
    const { displayName } = req.body;
    const name = displayName || `Guest_${Math.random().toString(36).substring(2, 8)}`;
    
    const user = await User.create({
      username: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      displayName: name,
      isGuest: true
    });
    
    const token = generateToken(user._id);
    
    res.status(201).json({
      message: 'Guest session created',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating guest session', error: error.message });
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const { displayName, avatar, theme } = req.body;
    const updates = {};
    
    if (displayName) updates.displayName = displayName;
    if (avatar) updates.avatar = avatar;
    if (theme && ['dark', 'light'].includes(theme)) updates.theme = theme;
    
    const user = await User.findByIdAndUpdate(req.user._id, updates, { 
      new: true, 
      runValidators: true 
    });
    
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating profile', error: error.message });
  }
};

// Logout (client-side token removal, server just acknowledges)
export const logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};
