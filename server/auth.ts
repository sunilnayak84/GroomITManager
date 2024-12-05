import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, type User as SelectUser } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
export const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// Define the base user type we'll use throughout the application
interface BaseUser {
  id: number;
  username: string;
  role: string;
  name: string;
}

// Define Express.User to match our base user type
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      role: string;
      name: string;
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  
  // Enhanced session configuration
  const sessionConfig = {
    secret: process.env.REPL_ID || "groomit-secret",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    }),
    name: 'groomit.sid',
    cookie: {
      secure: false, // Set to false for development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax" as const,
      path: "/"
    },
  };

  // Trust proxy in production
  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const isValid = await crypto.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid credentials" });
        }

        // Only pass the required user fields to match BaseUser type
        const userInfo: BaseUser = {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name
        };
        return done(null, userInfo);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: BaseUser, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          role: users.role,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (!user) {
        return done(null, false);
      }
      
      const userInfo: BaseUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      };
      done(null, userInfo);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ ok: false, message: "Username and password are required" });
    }

    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string }) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ ok: false, message: "Internal server error" });
      }
      
      if (!user) {
        console.log("Login failed:", info.message);
        return res.status(401).json({ ok: false, message: info.message || "Invalid credentials" });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return res.status(500).json({ ok: false, message: "Failed to create session" });
        }
        
        console.log("User logged in successfully:", user.id);
        return res.json({ 
          ok: true, 
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    try {
      req.logout(() => {
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Add session check middleware for protected routes
  app.use("/api/*", (req, res, next) => {
    if (req.path === "/api/login" || req.path === "/api/user") {
      return next();
    }
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    next();
  });
}
