/**
 * Hayase Nyaa Provider Extension (HTML Scraping Version - Hardened)
 */
export async function search(query, options = {}) {
  // Always return an empty array if query is missing
  if (!query || typeof query !== "string") {
    return [];
  }

  // Construct query parameters for Nyaa HTML page
  const params = new URLSearchParams({
    f: options.filter || "0",     // 0 = No filter, 1 = No remakes, 2 = Trusted only
    c: options.category || "0_0", // 0_0 = All categories, 1_2 = Anime - English-translated
    s: options.sort || "seeders", // Default sort by seeders
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
      console.warn(`Nyaa HTML fetch failed with status: ${response.status}`);
      return [];
    }

    const htmlText = await response.text();
    if (!htmlText || !htmlText.trim()) {
      return [];
    }

    // Parse returned string as HTML
    const doc = new DOMParser().parseFromString(htmlText, "text/html");
    const rows = doc.querySelectorAll("table.torrent-list tbody tr");

    if (!rows || rows.length === 0) {
      return [];
    }

    const results = [];

    // Safely iterate through table rows
    Array.from(rows).forEach((row) => {
      try {
        const cells = row.querySelectorAll("td");
        if (!cells || cells.length < 8) return;

        // Extract title link and magnet link
        const titleLink = row.querySelector('td[colspan="2"] a[href^="/view/"]:not(.comments)');
        const magnetLink = row.querySelector('a[href^="magnet:"]');

        if (!titleLink || !magnetLink) return;

        const name = titleLink.textContent?.trim() || "";
        const magnet = magnetLink.getAttribute("href") || "";
        const href = titleLink.getAttribute("href") || "";

        // Column extraction based on Nyaa table layout
        const size = cells[3]?.textContent?.trim() || "Unknown";
        const date = cells[4]?.textContent?.trim() || "";
        const seedersText = cells[5]?.textContent?.trim() || "0";
        const leechersText = cells[6]?.textContent?.trim() || "0";
        const downloadsText = cells[7]?.textContent?.trim() || "0";

        if (!name || !magnet) return;

        results.push({
          name,
          magnet,
          size,
          seeders: parseInt(seedersText, 10) || 0,
          leechers: parseInt(leechersText, 10) || 0,
          downloads: parseInt(downloadsText, 10) || 0,
          date,
          link: href.startsWith("http") ? href : `https://nyaa.si${href}`
        });
      } catch (err) {
        console.error("Error parsing row:", err);
      }
    });

    // Ensure we strictly return an Array
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error("Nyaa HTML Extension Error:", error);
    return []; // Return empty array on exception to prevent "not iterable" error
  }
}
