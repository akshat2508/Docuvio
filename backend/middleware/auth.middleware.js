// middleware/auth.middleware.js
import supabaseService from '../services/supabase.service.js';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token missing',
      });
    }

    const token = authHeader.split(' ')[1];

    const { data, error } = await supabaseService.getUserFromToken(token);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

   // Attach authenticated Supabase user
req.user = data.user;

// Fetch application-level user
const {
  data: appUser,
  error: appUserError,
} = await supabaseService.getAppUserById(data.user.id);

if (appUserError || !appUser) {
  return res.status(403).json({
    success: false,
    message: "Application user not found",
  });
}

// Canonical application identity
req.user.appRole = appUser.role;
req.user.organisationId = appUser.organisation_id;
req.user.appUser = appUser;

next();
  } catch (err) {
    next(err);
  }
};

export default authMiddleware;
