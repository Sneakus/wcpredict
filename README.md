# World Cup Map

Live at: [worldcupmap.io](https://worldcupmap.io)

A live interactive map showing how every country in the world predicts the 2026 FIFA World Cup.

- Pick who you think wins the tournament - your country's collective answer colours the map.
- Predict individual matches as the tournament progresses.
- An accuracy leaderboard ranks every nation by how often their picks come true.

No accounts. No ads. No third-party trackers.

## Stack

- Vanilla JavaScript, D3.js v7, TopoJSON for the world map
- WebGL for the live activity dot layer (population-weighted positioning)
- Supabase (Postgres) for predictions, results, and scoring
- Vercel serverless + edge functions for the API and dynamic OG cards (Satori)
- Cloudflare for CDN and bot protection (Turnstile)

## Why this is open source

This is a solo project, built in about a week using Cursor + Claude. I'm releasing the code openly because:

1. Transparency about how the site handles data (it's all here)
2. To document what's possible to ship solo in a short timeframe with modern AI tooling
3. Because the moat for this kind of project isn't the code - it's timing, community, and brand

## A friendly request

If you're thinking about shipping a direct clone of this for the 2026 World Cup tournament window (June 11 – July 19, 2026): please don't. This project is the centrepiece of my solo-builder portfolio and the tournament is the one window where it matters. I'd rather chat about collaborations or future tournaments than race a copycat.

For everything else - forks, learning, contributions, future-tournament builds - go for it. The MIT license is permissive.

## Contact

GitHub: [@Sneakus](https://github.com/Sneakus)
