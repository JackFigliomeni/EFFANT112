// Turns a generated app's HTML into the document that actually runs.
//
// Generated apps are untrusted code. They run in an iframe with `sandbox` and
// NO `allow-same-origin`, so they get an opaque origin: no access to our
// cookies, our Supabase session, or anything on this site. This file adds two
// more layers on top of that:
//   1. A Content-Security-Policy that blocks every network request (an app
//      can't send anything it's shown to a third party) and every external
//      script, stylesheet, or font.
//   2. A tiny `window.effant.storage` bridge, so the app can save its data
//      even though a sandboxed page has no localStorage of its own.
// The same builder makes the downloadable standalone file, where the bridge is
// backed by the browser's real localStorage instead of the host page.

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

const DEFAULT_ACCENT = "#171717";

function safeAccent(color: string | undefined): string {
  return color && /^#[0-9a-f]{3,8}$/i.test(color) ? color : DEFAULT_ACCENT;
}

// JSON that's safe to drop inside an inline <script>.
function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

type Mode = "embedded" | "standalone";

function bootstrap(mode: Mode, store: Record<string, unknown>, standaloneKey: string): string {
  const load =
    mode === "standalone"
      ? `var KEY=${scriptJson(standaloneKey)};var store={};try{store=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(e){store={}}`
      : `var store=${scriptJson(store)};`;
  const flush =
    mode === "standalone"
      ? `function flush(){try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}}`
      : `function flush(){try{parent.postMessage({__effant:1,type:"store",store:store},"*")}catch(e){}}`;
  return `(function(){
${load}
var timer;
${flush}
function schedule(){clearTimeout(timer);timer=setTimeout(flush,250)}
function clone(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v))}
window.effant={storage:{
  get:function(k,d){return Object.prototype.hasOwnProperty.call(store,k)?clone(store[k]):d},
  set:function(k,v){store[k]=clone(v);schedule()},
  remove:function(k){delete store[k];schedule()},
  keys:function(){return Object.keys(store)},
  clear:function(){store={};schedule()}
}};
${
  mode === "embedded"
    ? `function shim(name){try{void window[name]}catch(e){
  var pre=name==="localStorage"?"ls:":"ss:",mem={};
  function ks(){return Object.keys(name==="localStorage"?store:mem).filter(function(k){return k.indexOf(pre)===0})}
  var o={getItem:function(k){var s=name==="localStorage"?store:mem,v=s[pre+k];return v===undefined?null:String(v)},
  setItem:function(k,v){(name==="localStorage"?store:mem)[pre+k]=String(v);if(name==="localStorage")schedule()},
  removeItem:function(k){delete (name==="localStorage"?store:mem)[pre+k];if(name==="localStorage")schedule()},
  clear:function(){var s=name==="localStorage"?store:mem;ks().forEach(function(k){delete s[k]});if(name==="localStorage")schedule()},
  key:function(i){var a=ks();return a[i]===undefined?null:a[i].slice(3)}};
  Object.defineProperty(o,"length",{get:function(){return ks().length}});
  try{Object.defineProperty(window,name,{configurable:true,value:o})}catch(e2){}
}}
shim("localStorage");shim("sessionStorage");
window.addEventListener("message",function(e){var m=e.data;
  if(e.source===parent&&m&&m.__effant===1&&m.type==="accent"&&/^#[0-9a-f]{3,8}$/i.test(m.value))document.documentElement.style.setProperty("--accent",m.value)});`
    : ""
}
})();`;
}

export function buildAppDocument(
  html: string,
  opts: { mode: Mode; store?: Record<string, unknown>; accent?: string; standaloneKey?: string },
): string {
  const head =
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<style>:root{--accent:${safeAccent(opts.accent)}}</style>` +
    `<script>${bootstrap(opts.mode, opts.store ?? {}, opts.standaloneKey ?? "effant-app")}</script>`;

  const headOpen = /<head[^>]*>/i.exec(html);
  if (headOpen) {
    const at = headOpen.index + headOpen[0].length;
    return html.slice(0, at) + head + html.slice(at);
  }
  const htmlOpen = /<html[^>]*>/i.exec(html);
  if (htmlOpen) {
    const at = htmlOpen.index + htmlOpen[0].length;
    return html.slice(0, at) + `<head>${head}</head>` + html.slice(at);
  }
  return `<!doctype html><html><head>${head}</head><body>${html}</body></html>`;
}

/** Pulls the app's own <title> and <meta name="description"> out of its HTML. */
export function readAppMeta(html: string): { name: string; description: string } {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  const desc =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1]?.trim() ??
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.exec(html)?.[1]?.trim() ??
    "";
  const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return { name: decode(title).slice(0, 60), description: decode(desc).slice(0, 280) };
}

/** Strips a markdown fence or chatter around the document, if the model added any. */
export function cleanGeneratedHtml(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:html)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  const start = s.search(/<!doctype html|<html[\s>]/i);
  if (start > 0) s = s.slice(start);
  const end = s.toLowerCase().lastIndexOf("</html>");
  if (end !== -1) s = s.slice(0, end + "</html>".length);
  return s.trim();
}
