const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { User } = require("./models");

function setupSocket(httpServer, app) {
  const CLIENT_URL = process.env.CLIENT_URL || process.env.REACT_APP_CLIENT_URL || "http://localhost:3000";

  const io = new Server(httpServer, {
    cors: {
      origin: [CLIENT_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error("Unauthorized"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
      const user = await User.findByPk(decoded.id);
      if (!user || user.isBlocked) return next(new Error("Unauthorized"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("discussion:join", (positionId) => {
      if (!positionId) return;
      socket.join(`position:${positionId}`);
    });

    socket.on("discussion:leave", (positionId) => {
      if (!positionId) return;
      socket.leave(`position:${positionId}`);
    });
  });

  app.set("io", io);
  return io;
}

module.exports = { setupSocket };