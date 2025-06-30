// CONFIG & GLOBALS
const API_BASE = "http://127.0.0.1:8080/M00840012";
let currentUser = null;

// Shortcut DOM selector
const $ = (id) => document.getElementById(id);

// DOM ELEMENTS
const authSection = $("auth");
const appSection = $("app");
const userDisplay = $("user-display");

const tweetText = $("tweet-text");
const tweetsDiv = $("tweets");
const charCounter = $("char-counter");

const registerBtn = $("register-btn");
const loginBtn = $("login-btn");
const logoutBtn = $("logout-btn");
const postTweetBtn = $("post-tweet-btn");

const btnPost = $("btn-post");
const btnSearch = $("btn-search");
const btnFollow = $("btn-follow");
const btnViewPosts = $("btn-view-posts");

// SEARCH MODAL ELEMENTS
const searchModal = $("search-modal");
const searchOverlay = $("search-overlay");
const searchInput = $("search-input");
const cancelSearchBtn = $("cancel-search-btn");
const searchSubmitBtn = $("search-submit-btn");

// FOLLOW MODAL ELEMENTS
const followModal = $("follow-modal");
const followOverlay = $("follow-overlay");
const followInput = $("follow-input");
const cancelFollowBtn = $("cancel-follow-btn");
const followSubmitBtn = $("follow-submit-btn");

// EVENT LISTENERS
document.addEventListener("DOMContentLoaded", () => {
  // Auth
  registerBtn?.addEventListener("click", handleRegister);
  loginBtn?.addEventListener("click", handleLogin);
  logoutBtn?.addEventListener("click", handleLogout);

  // Tweets
  postTweetBtn?.addEventListener("click", postTweet);
  tweetText?.addEventListener("input", updateCharCounter);

  // Page actions
  btnPost?.addEventListener("click", () => toggleSection("tweet-form"));
  btnViewPosts?.addEventListener("click", loadTweets);
  btnSearch?.addEventListener("click", openSearchModal);
  btnFollow?.addEventListener("click", openFollowModal);

  // Search Modal actions
  cancelSearchBtn?.addEventListener("click", closeSearchModal);
  searchSubmitBtn?.addEventListener("click", handleSearchSubmit);

  // Follow Modal actions
  cancelFollowBtn?.addEventListener("click", closeFollowModal);
  followSubmitBtn?.addEventListener("click", handleFollowSubmit);

  // Check session
  checkLoginStatus();
});


// Toggles visibility between 'tweet-form' and 'tweets-feed'
function toggleSection(sectionId) {
  const sections = ["tweet-form", "tweets-feed"];
  sections.forEach((id) => {
    const el = $(id);
    if (el) {
      el.style.display = id === sectionId ? "block" : "none";
    }
  });
}

// Updates the character counter for tweet text
function updateCharCounter() {
  const maxLength = 280;
  const remaining = maxLength - tweetText.value.length;

  charCounter.textContent = `${remaining} characters remaining`;
  charCounter.style.color =
    remaining < 0 ? "red" : remaining < 50 ? "orange" : "#657786";
}


// Checks if the user is already logged in (server session)
async function checkLoginStatus() {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to verify session");

    const data = await response.json();
    if (data.loggedIn) {
      currentUser = data.username;
      userDisplay.textContent = currentUser;
      authSection.hidden = true;
      appSection.hidden = false;
      loadTweets(); // Load tweets after confirming login
    }
  } catch (err) {
    console.error("Session check error:", err);
  }
}

// Registers a new user
async function handleRegister() {
  const username = $("reg-username").value.trim();
  const password = $("reg-password").value;

  if (!username || !password) {
    showAlert("Please fill in all fields", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Registration failed");

    showAlert("Registration successful! Please log in.", "success");
    $("reg-username").value = "";
    $("reg-password").value = "";
  } catch (err) {
    console.error("Registration error:", err);
    showAlert(err.message, "error");
  }
}

// Logs an existing user in
async function handleLogin() {
  const username = $("login-username").value.trim();
  const password = $("login-password").value;

  if (!username || !password) {
    showAlert("Please fill in all fields", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Login failed");

    currentUser = username;
    userDisplay.textContent = username;
    authSection.hidden = true;
    appSection.hidden = false;

    showAlert(`Welcome back, ${username}!`, "success");
    loadTweets();
  } catch (err) {
    console.error("Login error:", err);
    showAlert(err.message, "error");
  }
}

// Logs the current user out
async function handleLogout() {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Logout failed");

    currentUser = null;
    authSection.hidden = false;
    appSection.hidden = true;
    showAlert("Logged out successfully", "success");
  } catch (err) {
    console.error("Logout error:", err);
    showAlert(err.message, "error");
  }
}

// Posts a new tweet for the current user
async function postTweet() {
  const text = tweetText.value.trim();

  if (!text) {
    showAlert("Tweet cannot be empty", "error");
    return;
  }
  if (text.length > 280) {
    showAlert("Tweet exceeds 280 characters", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/contents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to post tweet");

    tweetText.value = "";
    updateCharCounter();
    showAlert("Tweet posted successfully!", "success");
    loadTweets();
  } catch (err) {
    console.error("Tweet post error:", err);
    showAlert(err.message, "error");
  }
}

// Loads tweets (feed) for the current user
async function loadTweets() {
  try {
    const response = await fetch(`${API_BASE}/contents`, {
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to load tweets");

    renderTweets(data.contents || []);
    toggleSection("tweets-feed");
  } catch (err) {
    console.error("Tweet load error:", err);
    showAlert(err.message, "error");
    renderTweets([]);
  }
}

// Renders tweet array into the DOM
function renderTweets(tweets) {
  tweetsDiv.innerHTML = "";

  if (!tweets.length) {
    tweetsDiv.innerHTML = `<p class="no-tweets">No tweets to show. Be the first to post!</p>`;
    return;
  }

  tweets.forEach(({ username, text, createdAt }) => {
    const tweetEl = document.createElement("div");
    tweetEl.className = "tweet";
    tweetEl.innerHTML = `
      <div class="tweet-header">
        <strong class="tweet-username">@${username}</strong>
        <small class="tweet-time">${formatTweetTime(createdAt)}</small>
      </div>
      <div class="tweet-content">${escapeHtml(text)}</div>
    `;
    tweetsDiv.appendChild(tweetEl);
  });
}


// Show the search modal
function openSearchModal() {
  searchModal.classList.remove("hidden");
  searchInput.value = "";
  searchInput.focus();
}

// Hide the search modal
function closeSearchModal() {
  searchModal.classList.add("hidden");
}

// Called when user clicks the "Search" button in the modal
async function handleSearchSubmit() {
  const query = searchInput.value.trim();
  if (!query) {
    showAlert("Please enter a username!", "info");
    return;
  }
  closeSearchModal();

  try {
    const response = await fetch(
      `${API_BASE}/users/search?q=${encodeURIComponent(query)}`,
      { credentials: "include" }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Search failed");

    if (data.users.length) {
      const names = data.users.map((u) => u.username).join(", ");
      showAlert(`Found: ${names}`, "success");
    } else {
      showAlert("No users found", "info");
    }
  } catch (err) {
    console.error("Search error:", err);
    showAlert(err.message, "error");
  }
}


// Open the follow modal (instead of prompt)
function openFollowModal() {
  followModal.classList.remove("hidden");
  followInput.value = "";
  followInput.focus();
}

// Hide the follow modal
function closeFollowModal() {
  followModal.classList.add("hidden");
}

// Handle actual follow request after user enters a username
async function handleFollowSubmit() {
  const usernameToFollow = followInput.value.trim();
  if (!usernameToFollow) {
    showAlert("Please enter a username!", "info");
    return;
  }
  closeFollowModal();

  try {
    const response = await fetch(`${API_BASE}/follow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ usernameToFollow }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Follow failed");

    showAlert(data.message, "success");
    loadTweets(); // reload feed
  } catch (err) {
    console.error("Follow error:", err);
    showAlert(err.message, "error");
  }
}

// UTILITY FUNCTIONS
// Displays a temporary alert message on screen
function showAlert(message, type = "info") {
  const alertEl = document.createElement("div");
  alertEl.className = `alert ${type}`;
  alertEl.textContent = message;

  document.body.appendChild(alertEl);
  setTimeout(() => {
    alertEl.classList.add("fade-out");
    setTimeout(() => alertEl.remove(), 500);
  }, 3000);
}

// Formats a tweet's timestamp into a "just now", "x m ago", or date
function formatTweetTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return then.toLocaleDateString();
}

// Escapes HTML special characters to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}