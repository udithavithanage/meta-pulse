# ⚡ Meta Pulse

Meta Pulse is an automated, AI-driven content generation and publishing pipeline that researches trending topics in your niche, writes highly engaging post captions, creates striking visual assets, and automatically publishes them directly to your Facebook Page.

Powered by **Bun**, **Gemini API** (with Google Search Grounding), **Pollinations AI**, and **Sharp**.

## 🚀 Features

- **Automated Topic Research:** Researches and selects engaging topics using the Gemini API, preventing repeats and filtering out banned subjects.
- **Google Search Grounding:** Leverages real-time search queries to generate up-to-date posts on current trends.
- **Dynamic Caption Generation:** Tailors captions based on custom niches, safe modes, target goals, predefined CTA options, and banned words.
- **Visual Synthesis:** Generates raw images with Pollinations AI and overlays branded template headers/headlines using `sharp` for high-quality, professional assets.
- **Direct Facebook Integration:** Automated publishing directly to Facebook Pages using the Graph API with automatic retries and logging.
- **History Tracking & Prevention:** Remembers previously covered topics to ensure your feed stays fresh and diverse.

## 🛠️ Prerequisites

Before getting started, make sure you have the following:

- **Bun Runtime:** Meta Pulse is built on Bun. [Install Bun](https://bun.sh/) if you haven't already.
- **Google AI Studio Account:** To generate API keys for Gemini.
- **Facebook Page & Developer Account:** To publish content automatically.

## 🔑 Complete Setup Guide

Setting up your API keys and Meta credentials can be tricky. Follow these step-by-step guides to get up and running.

### 1. How to get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Log in with your Google account.
3. Click on the **Get API key** button in the left sidebar.
4. Click **Create API key**. You can choose to create it in a new Google Cloud project or an existing one.
5. Copy your newly generated key and save it as `GEMINI_API_KEY` in your `.env` file.

### 2. How to find your Facebook Page ID

Your Page ID is a unique numeric identifier for your Facebook Page.

#### Method A: From Page Settings

1. Go to your Facebook Page and switch to your Page profile.
2. Click your Page profile picture in the top right, go to **Settings & Privacy** > **Settings**.
3. In the left menu, click **New Pages Experience** or go to **Page Setup**.
4. You will find your **Page ID** listed there.

#### Method B: From the URL

1. Navigate to your Facebook Page.
2. Look at the URL in your browser. It often looks like `https://www.facebook.com/profile.php?id=1000987654321` or `https://www.facebook.com/YourPageName-1000987654321`.
3. The long number at the end (`1000987654321`) is your **Page ID**.

### 3. How to generate a Never-Expiring Facebook Page Access Token

To automate posts, you need a Page Access Token that does not expire. Follow these steps carefully:

#### Step 3.1: Create a Meta Developer App

1. Go to the [Meta for Developers Portal](https://developers.facebook.com/) and register or log in.
2. Click **My Apps** in the top-right corner and click **Create App**.
3. Select **Other** as the use case, click **Next**, and choose **Business** or **None** as the app type.
4. Enter an App Name, contact email, select your Business Account (if applicable), and click **Create app**.

#### Step 3.2: Get a Short-Lived User Access Token

1. Go to the [Graph API Explorer Tool](https://developers.facebook.com/tools/explorer/).
2. In the right-hand panel, select your **Meta App** from the dropdown.
3. Under **User or Page**, select **User Access Token**.
4. Under **Permissions**, add the following required permissions:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_show_list`
5. Click **Generate Access Token** and log in to authorize the permissions. Copy the generated User Access Token.

#### Step 3.3: Convert to a Long-Lived User Access Token

To convert your token (which normally expires in 2 hours) to one that lasts 60 days, run this HTTP request using Graph Explorer, cURL, or Postman:

```http
GET https://graph.facebook.com/v23.0/oauth/access_token?
    grant_type=fb_exchange_token&
    client_id={YOUR_APP_ID}&
    client_secret={YOUR_APP_SECRET}&
    fb_exchange_token={SHORT_LIVED_USER_ACCESS_TOKEN}
```

_(You can find your `App ID` and `App Secret` under **App Settings > Basic** in the Meta Developer Console)._

Copy the new `access_token` returned in the JSON response. This is your **Long-Lived User Access Token** (valid for 60 days).

#### Step 3.4: Extract the Never-Expiring Page Access Token

With your Long-Lived User Access Token, fetch the accounts associated with your user. This will return a list of Pages you manage along with **never-expiring** Page Access Tokens:

```http
GET https://graph.facebook.com/v23.0/me/accounts?access_token={LONG_LIVED_USER_ACCESS_TOKEN}
```

In the response, find the object matching your Facebook Page. Copy the `access_token` value from that object.
**This is your never-expiring Page Access Token.** Save it as `FACEBOOK_ACCESS_TOKEN` in `.env`.

## ⚙️ Installation & Configuration

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/udithavithanage/meta-pulse
   cd meta-pulse
   ```

2. **Install Dependencies:**
   Ensure you have Bun installed. Run:

   ```bash
   bun install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Open `.env` and fill in your collected credentials:

   ```env
   # FaceBook Configuration
   FACEBOOK_PAGE_ID=your_facebook_page_id
   FACEBOOK_PAGE_NAME="Your Page Brand Name"
   FACEBOOK_ACCESS_TOKEN=your_never_expiring_page_access_token
   GRAPH_API_VERSION=v23.0

   # Gemini API Configuration
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_TEXT_MODEL=gemini-1.5-flash
   ...
   ```

## 🚀 Usage

### Run the Content Automation Pipeline

To run the automated content generation and publishing workflow:

```bash
bun start
```

### Build the Project

To compile the TypeScript project into a minified bundle:

```bash
bun run build
```

### Verify Facebook Access Token

You can verify if your Facebook Page Access Token is valid and ready:

```bash
bun run check:token
```

### Linting and Formatting

Meta Pulse uses [Biome](https://biomejs.dev/) for fast linting and formatting:

```bash
bun run lint      # Run linter
bun run format    # Format codebase
bun run typecheck # Run TypeScript type checker
```

## 📁 Project Structure

```
meta-pulse/
├── .chiva/                # Git Hooks Configuration
├── scripts/
│   └── check-token.ts     # Helper script to validate Meta access tokens
├── src/
│   ├── index.ts           # Pipeline Orchestrator Entrypoint
│   ├── services/          # Business logic & APIs (Gemini, Meta, Sharp, etc.)
│   ├── types/             # TypeScript interfaces & types
│   └── utils/             # Helper utilities
├── logs/                  # Post History & Runtime logs
└── .env                   # Configuration Variables (ignored by Git)
```

## 🔒 Security & Git Hooks

This project uses **Chiva** for automated git hooks:

- **Pre-Commit:** Runs Biome formatter and linter to keep the code clean.
- **Commit Message Linting:** Enforces conventional commit standards.

Never commit your `.env` file or expose your API keys.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
