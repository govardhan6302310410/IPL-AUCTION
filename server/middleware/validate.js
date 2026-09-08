export const validateRegister = (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = [];
  
  if (!username || username.trim().length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.push('Please provide a valid email');
  }
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];
  
  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');
  
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  next();
};
