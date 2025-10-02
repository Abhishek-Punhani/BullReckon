import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { BaseConfig } from "../types/config";
import { User } from "../apps/auth_server/models/user";

interface SocketUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

class WebSocketService {
  private io?: SocketIOServer;
  private config?: BaseConfig;
  private connectedUsers: Map<string, Socket[]> = new Map();

  public initializeWithIO(
    ioInstance: SocketIOServer,
    config?: BaseConfig
  ): void {
    this.io = ioInstance;
    this.config = config;
    this.setupAuthentication();
    this.setupConnectionHandlers();
    this.setupErrorHandling();
    console.log("✅ WebSocketService initialized");
  }

  private setupAuthentication(): void {
    if (!this.io) return;
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.split(" ")[1];
        if (!token) return next(new Error("Authentication token required"));

        let decoded: any;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET_ACCESS!);
        } catch (err) {
          return next(new Error("Invalid or expired token"));
        }

        const user = await User.findById(decoded.id).select(
          "_id email firstName lastName role"
        );
        if (!user) return next(new Error("User not found"));

        socket.data.user = {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        };
        next();
      } catch (err) {
        next(new Error("Socket authentication failed"));
      }
    });
  }

  private setupConnectionHandlers(): void {
    if (!this.io) return;
    this.io.on("connection", (socket: Socket) => {
      const user: SocketUser = socket.data.user;
      if (!user) return;

      // Track connected user
      this.addConnectedUser(user.id, socket);

      // Join personal room
      socket.join(`user_${user.id}`);

      // Emit welcome
      socket.emit("connected", {
        message: "Connected to BullReckon WebSocket",
        userId: user.id,
        timestamp: new Date(),
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        this.removeConnectedUser(user.id, socket);
      });

      // Example: Listen for custom events
      socket.on("ping", () => {
        socket.emit("pong", { timestamp: new Date() });
      });
    });
  }

  private setupErrorHandling(): void {
    if (!this.io) return;
    this.io.on("error", (error) => {
      console.error("Socket.IO server error:", error);
    });
    this.io.engine.on("connection_error", (err) => {
      console.error("Socket.IO connection error:", err);
    });
  }

  // Utility methods
  public sendToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`user_${userId}`).emit(event, data);
  }

  public broadcastToAll(event: string, data: any): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  private addConnectedUser(userId: string, socket: Socket): void {
    const userSockets = this.connectedUsers.get(userId) || [];
    userSockets.push(socket);
    this.connectedUsers.set(userId, userSockets);
  }

  private removeConnectedUser(userId: string, socket: Socket): void {
    const userSockets = this.connectedUsers.get(userId) || [];
    const filtered = userSockets.filter((s) => s.id !== socket.id);
    if (filtered.length === 0) {
      this.connectedUsers.delete(userId);
    } else {
      this.connectedUsers.set(userId, filtered);
    }
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;
