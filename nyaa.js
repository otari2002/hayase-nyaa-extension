/**
 * Hayase Nyaa Provider Extension (RSS / XML Version - Hardened)
 */
export async function search(query, options = {}) {
  // Always return an empty array if query is missing
  if (!query || typeof query !== "string") {
    return [];
  }

  const params = new URLSearchParams({
    page: "rss",
    f: options.filter || "0",
    c: options.category || "0_0",
    s: options.sort || "seeders",
    o: "desc",
    q: query
  });

  const url = `https://nyaa.si/?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      console.warn(`Nyaa request failed with status: ${response.status}`);
      return []; // Return empty array on HTTP error
    }

    const xmlText = await response.text();
    if (!xmlText || !xmlText.trim()) {
      return [];
    }

    const doc = new DOMParser().parseFromString(xmlText, "text/xml");

    // Check if DOMParser outputted an XML parsing error
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      console.error("XML Parsing Error:", parserError.textContent);
      return [];
    }

    const items = doc.querySelectorAll("item");
    if (!items || items.length === 0) {
      return [];
    }

    const results = [];

    // Safely iterate through items
    Array.from(items).forEach((item) => {
      try {
        const name = item.querySelector("title")?.textContent?.trim() || "";
        const link = item.querySelector("guid")?.textContent?.trim() || 
                     item.querySelector("link")?.textContent?.trim() || "";
        const date = item.querySelector("pubDate")?.textContent?.trim() || "";

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
      } catch (err) {
        console.error("Error parsing individual item:", err);
      }
    });

    // Ensure we strictly return an Array
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error("Nyaa RSS Extension Error:", error);
    return []; // Return empty array on exception to prevent "not iterable" error in Hayase
  }
}

/**
 * Helper to safely extract XML namespace tag values across environments
 */
function getXmlTagValue(parent, prefix, localName) {
  try {
    const nsElements = parent.getElementsByTagNameNS("*", localName);
    if (nsElements && nsElements.length > 0) {
      return nsElements[0].textContent?.trim() || "";
    }
    
    const queryElement = parent.querySelector(`${prefix}\\:${localName}, ${localName}`);
    return queryElement?.textContent?.trim() || "";
  } catch (e) {
    return "";
  }
}
