import express, { Application, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import cookieParser from "cookie-parser";
import compression from "compression";
import fileUpload from "express-fileupload";
import cors from "cors";
import createHttpError from "http-errors";
import session from "express-session";
import MongoStore from "connect-mongo";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import http from "http";
import { QueueManager } from "./queueManager";

import { errorHandler } from "../middleware/errorHandler";
import { BaseConfig } from "../types/config";
import webSocketService from "./webSocketServer";

export interface AppOptions {
  serviceName: string;
  config: BaseConfig;
  enableSockets?: boolean;
  enableSessions?: boolean;
  enableFileUpload?: boolean;
  enableQueues?: boolean;
  customRateLimit?: {
    windowMs: number;
    max: number;
  };
  customCors?: cors.CorsOptions;
}

export class BaseApp {
  public app: Application;
  public server?: http.Server;
  public io?: Server;
  public queueManager?: QueueManager;
  private config: BaseConfig;
  private serviceName: string;

  constructor(options: AppOptions) {
    this.app = express();
    this.config = options.config;
    this.serviceName = options.serviceName;

    this.initializeMiddleware(options);

    if (options.enableSockets) {
      this.initializeSocketIO();
    }

    if (options.enableQueues) {
      this.initializeQueues();
    }
  }

  private initializeMiddleware(options: AppOptions): void {
    // Trust proxy for deployment
    this.app.set("trust proxy", 1);

    // Development logging
    if (this.config.NODE_ENV !== "production") {
      this.app.use(morgan("dev"));
    }

    // Security middleware
    this.app.disable("x-powered-by");
    this.app.use(
      helmet({
        contentSecurityPolicy: false,
      })
    );

    // Rate limiting
    const rateLimitConfig = options.customRateLimit || {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
    };

    const limiter = rateLimit({
      ...rateLimitConfig,
      message: "Too many requests from this IP, please try again later.",
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use("/api/", limiter);

    // CORS configuration
    const corsOptions: cors.CorsOptions = options.customCors || {
      origin: this.config.CLIENT_URL,
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    };
    this.app.use(cors(corsOptions));

    // Body parsing middleware
    this.app.use(cookieParser());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: false }));

    // Session middleware (optional)
    if (options.enableSessions !== false) {
      this.initializeSessions();
    }

    // File upload (optional)
    if (options.enableFileUpload) {
      this.app.use(
        fileUpload({
          useTempFiles: true,
          tempFileDir: "/tmp/",
          limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
        })
      );
    }

    // Health check endpoint
    this.app.get("/health", (req: Request, res: Response) => {
      res.status(200).json({
        status: "OK",
        service: this.serviceName,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    });
    // Security and optimization
    this.app.use((req, res, next) => {
      // Only sanitize req.body and req.params, not req.query
      if (req.body) mongoSanitize.sanitize(req.body);
      if (req.params) mongoSanitize.sanitize(req.params);
      next();
    });
    this.app.use(compression());
  }
  private initializeSessions(): void {
    console.log("config");
    const store = MongoStore.create({
      mongoUrl: this.config.DB_URL,
      crypto: {
        secret: this.config.SESSION_SECRET,
      },
      touchAfter: 24 * 3600,
    });

    const sessionConfig: session.SessionOptions = {
      secret: this.config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: this.config.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: this.config.NODE_ENV === "production" ? "none" : "lax",
      },
      store,
    };

    this.app.use(session(sessionConfig));
  }

  private initializeSocketIO(): void {
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      pingTimeout: 60000,
      cors: {
        origin: this.config.CLIENT_URL,
        credentials: true,
      },
    });

    // Attach socket.io to request object for route handlers
    this.app.use((req: any, res, next) => {
      req.io = this.io;
      next();
    });

    // Initialize global WebSocket service with io instance
    webSocketService.initializeWithIO(this.io);

    // Optionally: Make globally available
    (global as any).io = this.io;
    (global as any).webSocketService = webSocketService;
  }

  private async initializeQueues(): Promise<void> {
    this.queueManager = QueueManager.getInstance();
    await this.queueManager.initialize();
    (global as any).queueManager = this.queueManager;
  }

  public initializeErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      next(createHttpError.NotFound(`Route ${req.originalUrl} not found`));
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  // Method to add routes
  public addRoutes(path: string, router: express.Router): void {
    this.app.use(path, router);
  }

  // Method to add custom middleware
  public addMiddleware(middleware: express.RequestHandler): void {
    this.app.use(middleware);
  }

  // Method to start the server
  public listen(port: number): Promise<void> {
    return new Promise((resolve) => {
      const serverInstance = this.server || this.app;

      serverInstance.listen(port, () => {
        console.log(`🚀 ${this.serviceName} listening on port ${port}`);
        resolve();
      });
    });
  }

  // Method to add socket event handlers
  public addSocketHandlers(handler: (io: Server) => void): void {
    if (this.io) {
      handler(this.io);
    } else {
      throw new Error(
        "Socket.IO not initialized. Set enableSockets: true in options."
      );
    }
  }

  // Graceful shutdown
  public async close(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log(`🛑 ${this.serviceName} server closed`);
          resolve();
        });
      });
    }
  }
}
