/**
 * Hayase Nyaa Provider Extension (RSS / XML Version with Configurable Settings)
 */
export async function search(query, options = {}) {
  if (!query) return [];

  // Read configured options with fallbacks to default values
  const category = options.category || "1_2"; // Default: Anime - English-translated
  const filter = options.filter || "0";       // Default: No Filter

  const params = new URLSearchParams({
    page: "rss",
    f: filter,
    c: category,
    s: "seeders",
    o: "desc",
    q: query
  });

  const url = `https://nyaa.si/?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const xmlText = await response.text();
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    const items = doc.querySelectorAll("item");

    const results = [];

    items.forEach((item) => {
      const name = item.querySelector("title")?.textContent.trim() || "";
      const link = item.querySelector("guid")?.textContent.trim() || item.querySelector("link")?.textContent.trim() || "";
      const date = item.querySelector("pubDate")?.textContent.trim() || "";

      const seedersText = getXmlTagValue(item, "nyaa", "seeders") || "0";
      const leechersText = getXmlTagValue(item, "nyaa", "leechers") || "0";
      const downloadsText = getXmlTagValue(item, "nyaa", "downloads") || "0";
      const size = getXmlTagValue(item, "nyaa", "size") || "Unknown";

      const infoHash = getXmlTagValue(item, "nyaa", "infoHash");
      let magnet = "";

      if (infoHash) {
        magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}`;
      } else {
        const enclosure = item.querySelector("enclosure");
        magnet = enclosure?.getAttribute("url") || "";
      }

      if (!name || !magnet) return;

      results.push({
        name,
        magnet,
        size,
        seeders: parseInt(seedersText, 10) || 0,
        leechers: parseInt(leechersText, 10) || 0,
        downloads: parseInt(downloadsText, 10) || 0,
        date,
        link
      });
    });

    return results;
  } catch (error) {
    console.error("Nyaa RSS Extension Error:", error);
    return [];
  }
}

function getXmlTagValue(parent, prefix, localName) {
  const nsElements = parent.getElementsByTagNameNS("*", localName);
  if (nsElements.length > 0) {
    return nsElements[0].textContent.trim();
  }
  const queryElement = parent.querySelector(`${prefix}\\:${localName}, ${localName}`);
  return queryElement?.textContent.trim() || "";
}
