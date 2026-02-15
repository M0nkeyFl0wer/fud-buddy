# When Ad-Tech Feels Like "Doxxing": How Identity Resolution Works at Scale (Harm-Reduction Overview)

## Executive Summary
Ad-tech and data-broker ecosystems can make you **consistently re-identifiable** across websites/apps and over time. Even when your name is not visible, that stable re-identification plus enrichment (location trails, interests, purchase/household attributes) can feel like "doxxing" because it becomes easy for powerful actors to narrow down "who you are" and predict where you'll be.

Key points:
- Most sites can learn your rough location (IP), device/browser details, and behavioral signals immediately.
- Third-party trackers (pixels/SDKs) can record your visit and connect it to broader identity graphs.
- You typically won't see a plain-text "Facebook ID" in a website's logs; platforms link visits to accounts internally.
- Real risk comes from **scale + sharing**: RTB broadcast dynamics, long vendor chains, and data brokers.
- You can materially reduce exposure with a small toolkit: password manager + 2FA, tracker blocking, hardened device settings, and private-by-default communication/services.

If you only do five things:
1. Use a password manager and unique passwords everywhere.
2. Turn on 2FA (prefer passkeys or hardware keys for critical accounts).
3. Install a content blocker (uBlock Origin) and a tracker blocker (Privacy Badger).
4. Audit location permissions and turn off ad personalization.
5. Move sensitive chat to Signal and use private email for important accounts.

## Abstract
Ad-tech systems are optimized to recognize the "same person" (or household) across pages, apps, devices, and time, then attach attributes and inferences that make the person targetable and measurable. In practice this can resemble "doxxing at scale": not because typical ad buyers receive a public name-and-address dossier by default, but because the ecosystem can (a) make an individual consistently re-identifiable via persistent IDs, (b) enrich those IDs with sensitive signals (location, interests, health inferences), and (c) expose those signals through many data flows and intermediaries. Using Byron Tau's *Means of Control* framing (public-private surveillance, data brokers, platform tracking), this document explains the high-level mechanisms and who can access what - without offering step-by-step instructions for targeting individuals.

## Identity Resolution / Identity Graphs
Ad-tech's central technical challenge is **identity resolution**: connecting many events to a stable entity (person/device/household) despite fragmented signals and privacy controls.

Common building blocks (high level):
- **Identifiers as nodes:** cookies, mobile ad IDs (MAIDs), hashed emails/phones, IP/ASN ranges, device properties, and sometimes household or "probabilistic" IDs.
- **Edges as link evidence:** logins, shared emails across services, repeated co-occurrence of an IP + device + app bundle, or observed transitions (e.g., the same identifier seen on multiple properties).
- **Graph outputs:** an "identity spine" or **cross-device graph** that yields a stable internal ID used for audience targeting, frequency capping, measurement, and attribution.

Deterministic vs probabilistic:
- **Deterministic matching** uses strong signals (e.g., login email/phone, or a platform's own authenticated user ID). It tends to be more accurate but more regulated/consent-sensitive.
- **Probabilistic matching** uses statistical linkage (e.g., device traits + network patterns). It can be wrong, but at scale it can still be operationally useful for advertisers.

Why this matters for harm: once a stable ID exists, many otherwise "small" events become a durable behavioral record. Data brokers and ad intermediaries can then **enrich** that record with offline data (address history, demographics) or sensitive inferences (political interest categories, health-related browsing patterns).

Reference: FTC data broker report (overview of broker practices)
- https://www.ftc.gov/system/files/documents/reports/data-brokers-call-transparency-accountability-report-federal-trade-commission-may-2014/140527databrokerreport.pdf

## Pixels / SDKs (Collection at the Edge)
**Pixels** (web) and **SDKs** (mobile) are the "sensors" that turn user actions into event streams.

What they do (in concept):
- **Emit events** (page views, purchases, sign-ups) from a site/app to an analytics or ads endpoint.
- **Attach identifiers** (first-party cookies, MAIDs, device/network info, or user-provided fields) so events can be linked over time.
- **Support retargeting and measurement:** "show ads to people who visited X," "measure conversions," "build lookalikes."

Why they're risky:
- They often sit outside the app/site's core function, yet can receive high-granularity behavioral data.
- Event payloads can inadvertently include sensitive context (page URLs that encode health conditions, form fields, etc.) when integrations are misconfigured.
- SDKs can create transitive exposure: one app includes an SDK -> that SDK's partners may get signals via downstream sharing.

Helpful references:
- Google Ads: remarketing concept: https://support.google.com/google-ads/answer/2453998?hl=en
- Firefox Enhanced Tracking Protection (illustrates what browsers block): https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop

## Cookies / MAIDs (Mobile Advertising IDs)
### Cookies (web)
Cookies (especially third-party cookies) historically enabled:
- Cross-site recognition
- Frequency capping and attribution
- Audience building and retargeting

Even with third-party cookie deprecation pressures, **first-party cookies** and server-side identifiers can still support meaningful tracking within a publisher ecosystem or via identity vendors.

### MAIDs (mobile)
Mobile operating systems provide ad identifiers intended for advertising/measurement:
- Android Advertising ID: https://support.google.com/googleplay/android-developer/answer/6048248?hl=en
- Apple's App Tracking Transparency (ATT): https://support.apple.com/en-us/HT212025

Why this matters: MAIDs and cookies are "primary keys" in many identity graphs. When available, they make linking cheap and scalable; when restricted, the ecosystem often shifts to alternative linkages (first-party login IDs, contextual targeting, or fingerprinting).

## Fingerprinting (Stability Without "IDs")
**Fingerprinting** aims to distinguish devices/browsers using combinations of observable properties rather than a single explicit ID.

High-level sources of entropy (examples):
- Device/OS/browser versions
- Screen size, fonts, rendering quirks
- Time zone / locale settings
- Network characteristics

Why it persists:
- It can work even when cookies are cleared.
- It can be embedded in analytics, anti-fraud tooling, or ad measurement pipelines.
- It can be difficult for users to detect.

References:
- EFF Panopticlick: https://www.eff.org/pages/panopticlick
- Privacy Sandbox overview: https://privacysandbox.google.com/

## RTB / Bidstream Data Leakage (Real-Time Bidding)
In **real-time bidding (RTB)**, an ad impression is broadcast to many potential buyers in milliseconds. To decide whether to bid, buyers often receive a **bid request** containing metadata about the context and (often) the user/device.

Key risk: broadcast dynamics
- Even if only one buyer "wins" the auction, many parties may receive the bid request.
- This creates structural leakage risk: sensitive signals can be replicated across many organizations in a supply chain.

References:
- OpenRTB spec repo: https://github.com/InteractiveAdvertisingBureau/openrtb
- IAB Tech Lab OpenRTB page: https://iabtechlab.com/standards/openrtb/
- ICCL RTB evidence hub: https://www.iccl.ie/human-rights/online-privacy/real-time-bidding/
- Brave/Johnny Ryan report (PDF): https://brave.com/wp-content/uploads/2018/09/Behavioural-advertising-and-personal-data.pdf

## Data Brokers & Offline Enrichment
Data brokers aggregate and sell data about people and households from many sources (public records, commercial records, loyalty programs, location supply chains).

Offline enrichment in the ad context:
- "This device belongs to a household with attributes X"
- "This hashed email belongs to a consumer with attributes Y"

Reference:
- FTC data broker report (PDF): https://www.ftc.gov/system/files/documents/reports/data-brokers-call-transparency-accountability-report-federal-trade-commission-may-2014/140527databrokerreport.pdf

## Platform Clean Rooms & "Onboarding" (Customer Match / Custom Audiences)
Platforms offer ways to upload first-party customer data (often contact info) so advertisers can reach existing customers on the platform.

Reference:
- Google Ads Customer Match: https://support.google.com/google-ads/answer/6379332?hl=en

## Government / Law Enforcement Access Pathways (Public-Private Surveillance)
*Means of Control* emphasizes the state accessing commercial surveillance rather than building everything itself.

High-level pathways:
- Legal process to platforms/publishers (subpoenas/warrants)
- Legal process to intermediaries (ad-tech vendors, analytics providers)
- Commercial purchase of datasets (often via brokers)

Illustrative reference:
- NYT: location data and re-identification risk: https://www.nytimes.com/interactive/2019/12/19/opinion/location-tracking-cell-phone.html

## Who Can Access What (Advertisers vs Brokers vs Analysts)
Separate capability from typical access:

1) Typical advertisers
- Usually see: segment controls, campaign performance, aggregated reporting.
- Usually do not see: raw bidstream at scale, direct name/address unless they already have it.

2) Ad-tech intermediaries
- More likely to see: bid requests, identifiers, event-level logs.

3) Data brokers
- Specialize in mapping offline/online identifiers and householding.

## Why It Feels Like Doxxing
Even without a visible name-and-address dossier, it can feel like doxxing because:
- Re-identification can be feasible with a few anchor points (home/work) and location trails.
- Identity graphs make a person consistently trackable across contexts.
- RTB and broker ecosystems can multiply exposure beyond the originating site.

## Limits & Uncertainty
- Matching errors exist (shared devices, shared networks).
- Privacy controls reduce signal quality (ATT, tracking protection).
- No single company sees everything, but many see enough.

## Defensive Mitigations (Practical)
This section is intentionally practical and action-oriented (harm reduction). None of these steps are perfect alone; the goal is to shrink your attack surface.

### Passwords and Authentication
- Password manager: **Bitwarden** (cloud sync; also supports passkeys on supported platforms)
  - https://bitwarden.com/
- Turn on 2FA everywhere it exists.
- Prefer, in order, for high-value accounts (email, bank, crypto, password manager):
  - **Passkeys** (when available)
  - **Hardware security keys** (e.g., YubiKey)
  - Authenticator apps (TOTP)
- Avoid SMS 2FA for important accounts when you can (SIM swap risk).

Hardware keys:
- YubiKey overview: https://www.yubico.com/products/yubikey/

### Browser, Extensions, and Settings
Baseline:
- Use a browser with strong tracking protections (Firefox or Brave).
  - Firefox Enhanced Tracking Protection: https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop

Extensions:
- **uBlock Origin** (content blocker): https://ublockorigin.com/
- **Privacy Badger** (tracker learning/blocking): https://privacybadger.org/

Settings:
- Block third-party cookies.
- Disable/limit cross-site tracking.
- Consider separate browser profiles for:
  - Banking/crypto
  - Social media
  - General browsing

### Device Privacy and Hardening
- iOS:
  - Use "Ask App Not to Track" (ATT): https://support.apple.com/en-us/HT212025
  - If you're at higher risk (journalist, activist, high-value financial accounts), consider **Lockdown Mode**:
    - https://support.apple.com/en-us/105120
- Android:
  - Reset / delete Advertising ID (and review per-app permissions):
    - https://support.google.com/googleplay/android-developer/answer/6048248?hl=en

General:
- Review location permissions; set most apps to "While using" or "Never".
- Turn off ad personalization where available.
- Keep OS + browser up to date.

### Private-by-Default Services
If you want to reduce the amount of sensitive data stored in ad-funded ecosystems, consider privacy-focused providers:
- Email / Drive / Docs / Calendar: **Proton**
  - https://proton.me/

### Messaging
- Chat: **Signal** (end-to-end encrypted): https://signal.org/

### Going Further (Optional)
- Consider Linux for a lower-bloat, more transparent desktop environment. It's much easier than it used to be.
  - If you want to keep it simple, pick **Ubuntu** (easy, widely supported) or **Arch** (more DIY).
  - "Go all in" approach: keep a clean Linux install for daily browsing/work and reserve a separate profile/device for banking/crypto.
- Keep separate devices or separate OS profiles for high-value accounts (banking/crypto) vs everyday browsing.

### For Developers (If You Build Websites/Apps)
- Minimize third-party SDKs/pixels.
- Avoid sending sensitive URLs or event properties.
- Prefer aggregated measurement and strict access control.
- Treat vendor selection as a security decision: retention, sub-processors, and breach posture matter.

## What Our App Can Honestly Demonstrate (Safe, Consent-Based Demos)
Safe demos:
- Consent-based traffic inspection and disclosure of third-party calls.
- Synthetic bidstream simulation (fabricated OpenRTB-like payloads).
- First-party identity graph demos on test users.
- Show effects of blocker tools (Privacy Badger) on requests and load time.

Avoid demonstrating:
- Pulling real RTB bidstreams from production exchanges.
- Reverse lookups from IDs to names/addresses.
- Workflows that reveal or target a real person without explicit consent.

## Additional Reference: Global Privacy Control
- https://globalprivacycontrol.org/
