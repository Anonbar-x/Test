
Anonbar — GitHub Pages theme with Blogger backend
==================================================

What this is
------------
A fully responsive, dark "community" theme for GitHub Pages that **pulls posts live from Blogger**.
Looks and feels like a community feed: cards, tags, likes (local), saves (local), post page, and optional
**Giscus** comments powered by GitHub Discussions.

How to use
----------
1) Open `assets/js/app.js` and set:
   `const BLOG_URL = "https://YOURBLOGNAME.blogspot.com"`
   (no trailing slash)
2) (Optional) Fill the Giscus config to enable comments on `post.html`.
3) Push the whole folder to your GitHub repo root and enable GitHub Pages (root or /docs).

Labels & filters
----------------
- Sidebar tags are just anchor links with `?label=YourLabel`. Edit in `index.html` as you like.
- The feed uses Blogger's JSONP feed and supports label filtering and infinite scroll (12 posts per batch).

Notes
-----
- Likes and Saves are local (per browser) via `localStorage`, since GitHub Pages is static.
- For real-time counters, connect a serverless backend or a third-party analytics.
- SEO: content renders client-side. If you want build-time HTML for crawlers, add a GitHub Action that fetches
  the feed and writes static pages.

License
-------
This template is provided as-is for your project.
