import printSessionService from "../services/printSession.service.js";

export const printSessionAuth = async (req, res, next) => {
  try {
    const token =
      req.headers["x-print-session-token"] ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Print session token missing",
      });
    }

    const { data, error } =
      await printSessionService.getSessionByToken(token);

    if (error || !data) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired print session",
      });
    }

    if (
      data.status === "expired" ||
      data.status === "archived"
    ) {
      return res.status(410).json({
        success: false,
        message: "Print session is no longer active",
      });
    }

    req.printSession = data;
    req.sessionToken = token;

    next();
  } catch (error) {
    next(error);
  }
};