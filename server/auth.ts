import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
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

// Define the User type that matches our schema
type BaseUser = {
  id: number;
  username: string;
  role: string;
  name: string;
};

declare global {
  namespace Express {
    // Define User interface explicitly
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
  const sessionConfig = {
    secret: process.env.REPL_ID || "groomit-secret",
    name: "connect.sid",
    resave: true,
    saveUninitialized: true,
    store: new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    }),
    cookie: {
      httpOnly: true,
      secure: false, // We're in development mode
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax" as const,
      path: "/"
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionConfig.cookie.secure = true;
  }

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Attempting login for user:", username);
        
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log("User not found:", username);
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = await crypto.compare(password, user.password);
        if (!isValid) {
          console.log("Invalid password for user:", username);
          return done(null, false, { message: "Invalid username or password" });
        }

        const userInfo: BaseUser = {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name
        };

        console.log("Login successful for user:", username);
        return done(null, userInfo);
      } catch (err) {
        console.error("Login error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
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
        console.log("User not found during deserialization:", id);
        return done(null, false);
      }

      const userInfo: BaseUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      };

      console.log("User deserialized successfully:", id);
      done(null, userInfo);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt for:", req.body.username);
    
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ 
        ok: false, 
        message: "Username and password are required" 
      });
    }

    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ 
          ok: false, 
          message: "An error occurred during login" 
        });
      }

      if (!user) {
        console.log("Authentication failed:", info?.message);
        return res.status(401).json({ 
          ok: false, 
          message: info?.message || "Invalid username or password" 
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return res.status(500).json({ 
            ok: false, 
            message: "Failed to create session" 
          });
        }

        // Ensure session is saved before sending response
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ 
              ok: false, 
              message: "Failed to save session" 
            });
          }

          console.log("Login successful - User:", user.username);
          console.log("Session ID:", req.sessionID);
          
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
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    const username = req.user?.username;
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ 
          ok: false, 
          message: "Failed to logout" 
        });
      }
      console.log("User logged out:", username);
      res.json({ ok: true, message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
}
