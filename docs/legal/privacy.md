# ModScribe — Privacy Policy

**Last updated:** May 24, 2026

This Privacy Policy describes how **ModScribe** ("the App"), a Reddit Devvit application, handles information when moderators use it in a subreddit.

## 1. Scope

This policy applies to data processed by the App on behalf of **moderators** of subreddits where the App is installed. The App is **not intended for general Reddit users**; the moderator dashboard and automation features are restricted to subreddit moderators.

Public subreddit wiki pages remain governed by Reddit’s policies and your subreddit’s public rules.

## 2. Information we process

When moderators use the App, it may process:

| Data | Purpose |
|------|---------|
| **Posts and comments** (IDs, titles, body text, scores, authors, flairs, permalinks, timestamps) | Inbox, archiving, draft generation, linking sources to wiki articles |
| **Subreddit name** | Context for ingestion, wiki publish, and settings |
| **Moderator user IDs** | Access control (moderator-only API), attribution on nominations and archives |
| **App settings** (thresholds, keywords, flairs, automation toggles, AI provider choice) | Filtering, watch/discover behavior, generation |
| **API keys** (optional, for OpenAI or Gemini) | Draft generation when configured by mods in install settings |
| **Drafts, articles, archive records, proposals** | Moderator workflow state stored in app storage |

We do not operate a separate public user account system for the App.

## 3. Where data is stored

App state (inbox items, drafts, archives, articles, settings overrides) is stored using **Reddit Devvit infrastructure**, including **Redis**, as part of running the App on Reddit’s platform.

Content you publish to the subreddit wiki is stored by **Reddit** as part of the normal wiki feature.

## 4. Third-party services

If moderators configure **OpenAI** or **Google Gemini**:

- Excerpts from posts/comments and wiki context may be sent to those providers to generate drafts
- Those providers process data under **their own privacy policies and terms**
- API keys are supplied by the installing moderator/subreddit via Devvit install settings and validated on save

**Mock mode** does not send content to external AI providers.

## 5. What we do not do

- We do not sell personal information
- We do not use the App to serve ads
- We do not expose the moderator dashboard or draft queue to non-moderators through the App’s API

## 6. Retention

Data retained in App storage persists until moderators delete or archive items, or until the App is uninstalled or data is cleared as part of normal app operation. We do not define a separate multi-year retention program; treat App storage as operational moderation tooling.

## 7. Security

Access to moderator API routes is limited to users Reddit identifies as **moderators** of the installed subreddit. Moderators should protect install settings, especially AI API keys.

No system is perfectly secure. Use the App in line with your subreddit’s security practices.

## 8. Your choices

Moderators can:

- Disable watch, discover, and scheduled scans in settings
- Archive or reject sources instead of publishing them
- Avoid configuring external AI providers (use mock mode)
- Uninstall the App from the subreddit

## 9. Children

The App is not directed at children and is intended for subreddit moderation use.

## 10. Changes

We may update this policy by posting a revised version at the URL listed on the app listing. The “Last updated” date will change when we do.

## 11. Contact

Questions about this policy: use the contact method on the Reddit app listing or the ModScribe repository.

---

*ModScribe is an independent developer project and is not affiliated with Reddit, Inc.*
