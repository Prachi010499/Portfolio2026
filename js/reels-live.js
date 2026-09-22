/*
 * Live loader for the Explore Reelscape canvas.
 *
 * Fetches the Instagram feed from Behold (cached, CORS-enabled, non-expiring
 * image URLs) and MERGES it with the bundled snapshot in reels-data.js:
 *   - live posts (newest) come first, so anything you just posted shows up
 *   - the local 49 fill in behind them, deduped by Instagram shortcode, so the
 *     canvas stays dense even though the free feed only returns the latest ~6
 *   - if the fetch fails / times out / is offline, it falls back to the bundled
 *     snapshot alone — the page can never break
 *
 * The Reelscape engine (reelscape.js) is untouched; this only decides what
 * array of { url, cover } gets handed to initReelscape().
 */
(function () {
  "use strict";

  var FEED = "https://feeds.behold.so/Y7MqxcCQZZOXHip3Q96g";
  var TIMEOUT_MS = 5000;
  // hide anything posted before this date (the snapshot in reels-data.js is
  // already filtered to match; this guards the live feed too)
  var CUTOFF = Date.parse("2020-06-01T00:00:00Z");

  // extract the /reel/<x>/ or /p/<x>/ shortcode so live + snapshot dedupe cleanly
  function shortcode(url) {
    if (!url) return url;
    var m = url.match(/instagram\.com\/(?:reel|p|tv)\/([^\/?#]+)/i);
    return m ? m[1] : url.replace(/[\/?#].*$/, "");
  }

  // pick a Behold-cached cover for a post (post-level sizes, else first child's)
  function coverOf(p) {
    var order = ["medium", "large", "small", "full"];
    var s = p.sizes || {};
    for (var i = 0; i < order.length; i++) {
      if (s[order[i]] && s[order[i]].mediaUrl) return s[order[i]].mediaUrl;
    }
    var kids = p.children || [];
    for (var j = 0; j < kids.length; j++) {
      var cs = kids[j].sizes || {};
      for (var k = 0; k < order.length; k++) {
        if (cs[order[k]] && cs[order[k]].mediaUrl) return cs[order[k]].mediaUrl;
      }
    }
    return null;
  }

  function mapLive(posts) {
    var out = [];
    (posts || []).forEach(function (p) {
      if (p.timestamp && Date.parse(p.timestamp) < CUTOFF) return;   // pre-June-2020
      var c = coverOf(p), u = p.permalink;
      if (c && u) out.push({ url: u, cover: c });
    });
    return out;
  }

  function merge(live, snapshot) {
    var seen = {}, out = [];
    function add(r) {
      var key = shortcode(r.url);
      if (!seen[key]) { seen[key] = 1; out.push(r); }
    }
    (live || []).forEach(add);
    (snapshot || []).forEach(add);
    return out;
  }

  function fetchFeed() {
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    return fetch(FEED, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) {
        if (timer) clearTimeout(timer);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (d) { return (d && d.posts) || []; });
  }

  window.bootReelscape = function (mount) {
    var snapshot = window.REELS || [];
    function start(reels) {
      initReelscape(mount, {
        reels: reels && reels.length ? reels : snapshot,
        handle: "",
        height: "100vh"
      });
    }
    if (!("fetch" in window)) { start(snapshot); return; }
    fetchFeed()
      .then(function (posts) { start(merge(mapLive(posts), snapshot)); })
      .catch(function () { start(snapshot); });   // offline / down / CORS → snapshot
  };
})();
