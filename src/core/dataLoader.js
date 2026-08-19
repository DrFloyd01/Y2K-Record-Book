/**
 * Asynchronous Data Loader for Y2K Record Book v2
 * Loads static JSON data with fallback paths, caching, and error handling.
 */

let cachedData = {};

/**
 * Fetches league dataset asynchronously.
 * @param {string} dataUrl - URL path to the JSON dataset.
 * @returns {Promise<Object>} - The loaded league dataset.
 */
export async function loadLeagueData(dataUrl = 'data/leagueData.json') {
  if (cachedData[dataUrl]) {
    return cachedData[dataUrl];
  }

  const cleanName = dataUrl.split('/').pop();
  const candidates = [
    dataUrl,
    `./${dataUrl.replace(/^\.?\//, '')}`,
    `/${dataUrl.replace(/^\.?\//, '')}`,
    `data/${cleanName}`,
    `./data/${cleanName}`,
    `/data/${cleanName}`,
    `../data/${cleanName}`
  ];

  let lastError = null;
  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        cachedData[dataUrl] = data;
        return data;
      }
    } catch (err) {
      lastError = err;
    }
  }

  console.error('Failed to load league data from candidates:', candidates, lastError);
  throw lastError || new Error(`Failed to load ${dataUrl}`);
}
