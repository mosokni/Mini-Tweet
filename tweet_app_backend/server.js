// Import packages we need
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const { MongoClient } = require("mongodb");

// Start the app
const app = express();

// Connect to MongoDB
const uri = "mongodb+srv://mdsokni:7281EsoRera@mo0001.pzuss6c.mongodb.net/tweet_app?retryWrites=true&w=majority&authSource=admin";
const client = new MongoClient(uri);

let db = null;
async function connectToDb() {
  try {
    await client.connect();
    db = client.db("tweet_app");
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}

// Middlewares
app.use(cors({
  origin: "http://127.0.0.1:5500",
  credentials: true
}));
app.use(express.json());

app.use(session({
  secret: "someRandomString",
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax',
    httpOnly: true
  }
}));

// Only let logged-in users continue
function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

// Get the database connection
function getDb() {
  return db;
}

// Register a new user
app.post("/M00840012/users", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  try {
    const db = getDb();
    const existing = await db.collection("users").findOne({ username });
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }
    await db.collection("users").insertOne({ username, password });
    res.json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check if user is logged in
app.get("/M00840012/login", (req, res) => {
  res.json({
    loggedIn: !!req.session.username,
    username: req.session.username || null,
  });
});

// Log in user
app.post("/M00840012/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  try {
    const db = getDb();
    const user = await db.collection("users").findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.username = username;
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ error: "Session could not be saved" });
      }
      res.json({ success: true, message: "Login successful", username });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Log out user
app.delete("/M00840012/login", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// Post a new tweet
app.post("/M00840012/contents", requireLogin, async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  try {
    const db = getDb();
    const doc = {
      username: req.session.username,
      text,
      createdAt: new Date()
    };
    await db.collection("contents").insertOne(doc);
    res.status(201).json({ success: true, message: "Tweet posted successfully!" });
  } catch (err) {
    console.error("Failed to insert tweet:", err);
    res.status(500).json({ error: "Failed to post tweet" });
  }
});

// Get tweets of followed users
app.get("/M00840012/contents", requireLogin, async (req, res) => {
  try {
    const db = getDb();
    const following = await db.collection("follows")
      .find({ follower: req.session.username })
      .toArray();
    const usernames = following.map((doc) => doc.following);

    const contents = await db.collection("contents")
      .find({ username: { $in: usernames } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, contents });
  } catch (err) {
    console.error("Failed to fetch tweets:", err);
    res.status(500).json({ error: "Failed to fetch tweets" });
  }
});

// Search for tweets
app.get("/M00840012/contents/search", async (req, res) => {
  const q = req.query.q || "";
  const regex = new RegExp(q, "i");

  try {
    const db = getDb();
    const contents = await db.collection("contents")
      .find({ text: regex })
      .toArray();
    res.json({ success: true, contents });
  } catch (err) {
    console.error("Search failed:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// Follow a user
app.post("/M00840012/follow", requireLogin, async (req, res) => {
  const { usernameToFollow } = req.body;
  if (!usernameToFollow || usernameToFollow === req.session.username) {
    return res.status(400).json({ error: "Invalid follow request" });
  }

  try {
    const db = getDb();
    const user = await db.collection("users").findOne({ username: usernameToFollow });
    if (!user) {
      return res.status(404).json({ error: "User does not exist" });
    }

    await db.collection("follows").updateOne(
      { follower: req.session.username, following: usernameToFollow },
      { $set: { follower: req.session.username, following: usernameToFollow } },
      { upsert: true }
    );

    res.json({ success: true, message: `Now following ${usernameToFollow}` });
  } catch (err) {
    console.error("Follow error:", err);
    res.status(500).json({ error: "Failed to follow user" });
  }
});

// Unfollow a user
app.delete("/M00840012/follow", requireLogin, async (req, res) => {
  const { usernameToUnfollow } = req.body;
  if (!usernameToUnfollow) {
    return res.status(400).json({ error: "Missing username to unfollow" });
  }

  try {
    const db = getDb();
    await db.collection("follows").deleteOne({
      follower: req.session.username,
      following: usernameToUnfollow
    });

    res.json({ success: true, message: `Unfollowed ${usernameToUnfollow}` });
  } catch (err) {
    console.error("Unfollow error:", err);
    res.status(500).json({ error: "Failed to unfollow user" });
  }
});

// Search for users
app.get("/M00840012/users/search", async (req, res) => {
  const q = req.query.q || "";
  const regex = new RegExp(q, "i");

  try {
    const db = getDb();
    const users = await db.collection("users")
      .find({ username: regex })
      .toArray();
    res.json({ success: true, users });
  } catch (err) {
    console.error("User search failed:", err);
    res.status(500).json({ error: "User search failed" });
  }
});

// Start the server
const PORT = 8080;
connectToDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to connect to MongoDB:", err);
});
