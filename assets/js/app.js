
// ============== CONFIG ==============
// Change to your public Blogger URL (no trailing slash)
const BLOG_URL = "https://YOURBLOGNAME.blogspot.com";

// Optional: Giscus (GitHub Discussions) comments for post.html
// Fill to enable, otherwise comments block stays hidden
const GISCUS = {
  repo: "", // e.g. "yourname/yourrepo"
  repoId: "",
  category: "General",
  categoryId: "",
  mapping: "pathname", // or "title"
  reactionsEnabled: "1"
};

const PAGE_SIZE = 12;

// ============== UTIL ==============
const qs = new URLSearchParams(location.search);
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const emitToast = (msg) => {
  const t = $(".toast"); if(!t) return;
  t.textContent = msg; t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 1800);
};

function jsonp(url, cbName) {
  return new Promise((resolve,reject)=>{
    const cb = cbName || ("cb" + Math.random().toString(36).slice(2));
    window[cb] = (data)=>{ resolve(data); try{ delete window[cb]; }catch(e){}; s.remove(); };
    const s = document.createElement("script");
    s.src = `${url}${url.includes("?") ? "&" : "?"}callback=${cb}`;
    s.onerror = () => { reject(new Error("JSONP failed")); s.remove(); };
    s.setAttribute('data-jsonp','1');
    document.body.appendChild(s);
  });
}

function stripHtml(html=""){
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll("script,style,noscript").forEach(e=>e.remove());
  return tmp.textContent.trim();
}

function firstImageFrom(html=""){
  const tmp = document.createElement("div"); tmp.innerHTML = html;
  const im = tmp.querySelector("img"); return im ? im.src : "";
}

function getPostIdFromEntry(entry){
  // entry.id.$t like: tag:blogger.com,1999:blog-12345.post-67890
  const raw = entry?.id?.$t || "";
  const m = raw.match(/post-(\d+)/);
  return m ? m[1] : null;
}

function buildLabelChips(entry){
  const labels = (entry.category || []).map(c => c.term);
  if (!labels.length) return "";
  return labels.map(l => `<a class="tag" href="?label=${encodeURIComponent(l)}">#${l}</a>`).join(" ");
}

// Local like/bookmark storage
function toggleLocal(key){
  const cur = localStorage.getItem(key);
  if(cur){ localStorage.removeItem(key); return false; }
  localStorage.setItem(key, "1"); return true;
}
function hasLocal(key){ return !!localStorage.getItem(key); }

// ====== FEED LIST (index.html) ======
async function runIndex(){
  const feedEl = $(".feed-list");
  if(!feedEl) return;

  let label = qs.get("label") || "";
  let startIndex = Number(qs.get("start") || 1);
  let loading = false;
  let endReached = false;

  // highlight tag in sidebar
  $$(".tag").forEach(a => {
    const isAll = !label && a.dataset.all === "1";
    const isMatch = label && a.textContent.replace("#","") === label;
    if(isAll || isMatch) a.classList.add("active");
  });

  async function loadPage(){
    if(loading || endReached) return; loading = true;
    const base = BLOG_URL.replace(/\/$/,"");
    let url = `${base}/feeds/posts/default?alt=json-in-script&orderby=published&max-results=${PAGE_SIZE}&start-index=${startIndex}`;
    if(label) url += `&category=${encodeURIComponent(label)}`;
    try{
      const data = await jsonp(url);
      const entries = data?.feed?.entry || [];
      if (!entries.length){
        endReached = true;
        if(startIndex===1 && !feedEl.children.length){
          $(".empty")?.classList.remove("hide");
        }
        return;
      }
      for(const entry of entries){
        const title = entry.title?.$t || "Untitled";
        const html = entry.content?.$t || entry.summary?.$t || "";
        const text = stripHtml(html);
        const excerpt = text.length > 160 ? text.slice(0,160)+"…" : text;
        const date = new Date(entry.published?.$t || entry.updated?.$t || Date.now());
        const postId = getPostIdFromEntry(entry);
        const alt = (entry.link||[]).find(l=>l.rel==="alternate")?.href || "#";
        const thumb = entry['media$thumbnail']?.url || firstImageFrom(html) || "";

        const card = document.createElement("article");
        card.className = "card post";
        card.innerHTML = `
          ${thumb ? `<a class="thumb" href="post.html?id=${postId}"><img src="${thumb}" alt=""></a>` : ""}
          <div class="meta">
            <span>${date.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"})}</span>
            <span class="dot"></span>
            <span class="badge">Community</span>
          </div>
          <a class="title" href="post.html?id=${postId}">${title}</a>
          <div class="excerpt">${excerpt}</div>
          <div class="actions">
            <div class="left">
              <button class="pill like" data-id="${postId}" aria-pressed="${hasLocal('like-'+postId)}">👍 <span class="t">Like</span></button>
              <button class="pill save" data-id="${postId}" aria-pressed="${hasLocal('save-'+postId)}">🔖 <span class="t">Save</span></button>
            </div>
            <div class="right">
              <a class="pill" href="post.html?id=${postId}">Open</a>
              <a class="pill" href="${alt}" target="_blank" rel="noopener">Blogger →</a>
            </div>
          </div>
          <div class="section">
            <div class="tags">${buildLabelChips(entry)}</div>
          </div>
        `;
        feedEl.appendChild(card);
      }
      startIndex += entries.length;
    }catch(e){
      console.error(e);
      emitToast("failed to load feed");
    }finally{
      loading = false;
    }
  }

  // Like/Save handlers
  document.addEventListener("click", (e)=>{
    const b = e.target.closest(".pill.like");
    if(b){
      const id = b.dataset.id;
      const on = toggleLocal("like-"+id);
      b.setAttribute("aria-pressed", on);
      emitToast(on ? "Liked" : "Unliked");
    }
    const s = e.target.closest(".pill.save");
    if(s){
      const id = s.dataset.id;
      const on = toggleLocal("save-"+id);
      s.setAttribute("aria-pressed", on);
      emitToast(on ? "Saved" : "Removed");
    }
  });

  // Infinite scroll
  window.addEventListener("scroll", () => {
    if(endReached || loading) return;
    const nearBottom = window.innerHeight + window.scrollY > document.body.offsetHeight - 600;
    if(nearBottom) loadPage();
  });

  // initial
  await loadPage();
}

// ====== POST PAGE (post.html) ======
async function runPost(){
  const wrap = $(".post-wrap");
  if(!wrap) return;

  const id = qs.get("id");
  if(!id){ wrap.innerHTML = "<div class='section'>Missing id</div>"; return; }

  const base = BLOG_URL.replace(/\/$/,"");
  const url = `${base}/feeds/posts/default/${id}?alt=json-in-script`;

  try{
    const data = await jsonp(url);
    const entry = data?.entry;
    if(!entry){ wrap.innerHTML = "<div class='section'>Not found</div>"; return; }
    const title = entry.title?.$t || "Untitled";
    const html = entry.content?.$t || entry.summary?.$t || "";
    const date = new Date(entry.published?.$t || entry.updated?.$t || Date.now());
    const alt = (entry.link||[]).find(l=>l.rel==="alternate")?.href || "#";
    const cover = entry['media$thumbnail']?.url || firstImageFrom(html) || "";

    document.title = `${title} — Anonbar`;

    wrap.innerHTML = `
      <article class="card post-page">
        ${cover ? `<div class="post-cover"><img src="${cover}" alt=""></div>` : ""}
        <div class="section">
          <div class="meta"><span>${date.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"})}</span> <span class="dot"></span> <a href="${alt}" target="_blank" rel="noopener">View on Blogger</a></div>
          <h1 class="title" style="font-size:1.6rem;margin:.4em 0 0 0">${title}</h1>
        </div>
        <div class="section post-body">${html}</div>
        <div class="section" id="comments-block" style="display:none">
          <h3>Discussion</h3>
          <script src="https://giscus.app/client.js"
            data-repo="${GISCUS.repo}"
            data-repo-id="${GISCUS.repoId}"
            data-category="${GISCUS.category}"
            data-category-id="${GISCUS.categoryId}"
            data-mapping="${GISCUS.mapping}"
            data-reactions-enabled="${GISCUS.reactionsEnabled}"
            data-theme="dark"
            crossorigin="anonymous"
            async>
          </script>
          <noscript>Enable JavaScript to load comments.</noscript>
        </div>
      </article>
    `;

    // enable comments if configured
    if (GISCUS.repo && GISCUS.repoId && GISCUS.categoryId) {
      $("#comments-block").style.display = "block";
    }

  }catch(e){
    console.error(e);
    wrap.innerHTML = "<div class='section'>Error loading post.</div>";
  }
}

// ====== Shared (theme, actions) ======
function setYear(){ const y = document.getElementById("y"); if(y) y.textContent = new Date().getFullYear(); }
function wireThemeToggle(){
  const t = $(".theme-toggle"); if(!t) return;
  t.addEventListener("click", ()=> emitToast("Theme toggling placeholder"));
}

document.addEventListener("DOMContentLoaded", ()=>{
  setYear();
  wireThemeToggle();
  runIndex();
  runPost();
});
