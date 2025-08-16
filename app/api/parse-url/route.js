// Importiere Puppeteer für Web-Scraping
import puppeteer from "puppeteer";
import { execSync } from 'child_process';

// POST-Route für URL-Parsing
export async function POST(request) {
	try {
		// Request-Body extrahieren
		const body = await request.json();
		const { url } = body;

		// Überprüfe ob URL vorhanden ist
		if (!url) {
			return Response.json(
				{ error: "Missing required parameter: url" },
				{ status: 400 }
			);
		}

		let finalUrl;
		try {
			// Verwende headless Browser um JavaScript-Redirects zu handhaben
			finalUrl = await getResolvedUrl(url);
		} catch (browserError) {
			console.log(
				"Browser navigation failed, trying to parse original URL directly"
			);
			finalUrl = url;
		}

		// Reisedetails aus der aufgelösten URL extrahieren
		const journeyDetails = extractJourneyDetails(finalUrl);

		// Vereinfachte Reiseinformationen anzeigen
		displayJourneyInfo(journeyDetails);

		return Response.json({
			success: true,
			journeyDetails: journeyDetails,
		});
	} catch (error) {
		console.error("Error parsing URL:", error);
		return Response.json(
			{ error: "Failed to parse URL", details: error.message },
			{ status: 500 }
		);
	}
}

function extractJourneyDetails(url) {
	try {
		const urlObj = new URL(url);
		const hash = urlObj.hash;
		const searchParams = urlObj.searchParams;

		const details = {
			fromStation: null,
			fromStationId: null,
			toStation: null,
			toStationId: null,
			date: null,
			time: null,
			class: null,
		};

		// Helper functions for extraction
		const extractStationId = (paramValue) => {
			if (!paramValue) return null;
			const match = paramValue.match(/@L=(\d+)/);
			return match ? match[1] : null;
		};

		const extractStationName = (paramValue) => {
			if (!paramValue) return null;
			const oMatch = paramValue.match(/@O=([^@]+)/);
			if (oMatch) {
				return decodeURIComponent(oMatch[1]).replace(/\+/g, " ").trim();
			}
			const parts = paramValue.split("@L=");
			if (parts.length > 0) {
				return decodeURIComponent(parts[0]).replace(/\+/g, " ").trim();
			}
			return decodeURIComponent(paramValue);
		};

		// Extract from hash
		if (hash) {
			const soidMatch = hash.match(/soid=([^&]+)/);
			const zoidMatch = hash.match(/zoid=([^&]+)/);
			const dateMatch = hash.match(/hd=([^&]+)/);
			const timeMatch = hash.match(/ht=([^&]+)/);
			const classMatch = hash.match(/kl=([^&]+)/);

			if (soidMatch) {
				const soidValue = decodeURIComponent(soidMatch[1]);
				details.fromStationId = extractStationId(soidValue);
				details.fromStation = extractStationName(soidValue);
			}

			if (zoidMatch) {
				const zoidValue = decodeURIComponent(zoidMatch[1]);
				details.toStationId = extractStationId(zoidValue);
				details.toStation = extractStationName(zoidValue);
			}

			if (dateMatch) {
				const dateValue = decodeURIComponent(dateMatch[1]);
				if (dateValue.includes("T")) {
					const [datePart, timePart] = dateValue.split("T");
					details.date = datePart;
					if (timePart && !details.time) {
						details.time = timePart.replace(":00", "");
					}
				} else {
					details.date = dateValue;
				}
			}

			if (timeMatch && !details.time) {
				details.time = decodeURIComponent(timeMatch[1]);
			}

			if (classMatch) {
				details.class = parseInt(classMatch[1]);
			}

			// Legacy fallbacks
			const fromMatch = hash.match(/so=([^&]+)/);
			const toMatch = hash.match(/zo=([^&]+)/);
			if (fromMatch && !details.fromStation) {
				details.fromStation = decodeURIComponent(fromMatch[1]);
			}
			if (toMatch && !details.toStation) {
				details.toStation = decodeURIComponent(toMatch[1]);
			}
		}

		// Extract from search params as fallback
		if (searchParams.has("soid")) {
			const soidValue = searchParams.get("soid");
			details.fromStationId = extractStationId(soidValue);
			details.fromStation = extractStationName(soidValue);
		}
		if (searchParams.has("zoid")) {
			const zoidValue = searchParams.get("zoid");
			details.toStationId = extractStationId(zoidValue);
			details.toStation = extractStationName(zoidValue);
		}
		if (searchParams.has("hd")) details.date = searchParams.get("hd");
		if (searchParams.has("ht")) details.time = searchParams.get("ht");
		if (searchParams.has("kl"))
			details.class = parseInt(searchParams.get("kl"));
		if (searchParams.has("so") && !details.fromStation)
			details.fromStation = searchParams.get("so");
		if (searchParams.has("zo") && !details.toStation)
			details.toStation = searchParams.get("zo");

		// Normalize class to 1 or 2
		if (details.class && (details.class === 1 || details.class === 2)) {
			// Keep as is
		} else {
			details.class = 2; // Default to second class
		}

		return details;
	} catch (error) {
		console.error("❌ Error extracting journey details:", error);
		return {
			error: "Failed to extract journey details",
			details: error.message,
		};
	}
}

// Helper function to display simplified journey information
function displayJourneyInfo(journeyDetails) {
	if (!journeyDetails || journeyDetails.error) {
		console.log("❌ Failed to extract journey information");
		return;
	}

	const from = journeyDetails.fromStation || "Unknown";
	const fromId = journeyDetails.fromStationId || "N/A";
	const to = journeyDetails.toStation || "Unknown";
	const toId = journeyDetails.toStationId || "N/A";
	const date = journeyDetails.date || "N/A";
	const time = journeyDetails.time || "N/A";
	const travelClass =
		journeyDetails.class === 1
			? "First"
			: journeyDetails.class === 2
			? "Second"
			: "N/A";

	console.log(
		`From: ${from} (${fromId}) → To: ${to} (${toId}) | Date: ${date} | Time: ${time} | Class: ${travelClass}`
	);
}

function getSystemChromium() {
  try {
    return execSync("which chromium").toString().trim();
  } catch {
    throw new Error("System Chromium not found in PATH");
  }
}

async function getResolvedUrl(url) {
	let browser;
	try {
		const launchOptions = {
			headless: true,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-dev-shm-usage",
				"--disable-gpu",
			],
		};

		// Only set executablePath in production/deployment
		if (process.env.USE_SYSTEM_CHROMIUM === "true") {
            launchOptions.executablePath = getSystemChromium();
        } else if (
			process.env.NODE_ENV === "production" ||
			process.env.USE_CHROMIUM_PATH === "true"
		) {
			launchOptions.executablePath = "/usr/bin/chromium";
		}

		browser = await puppeteer.launch(launchOptions);
		const page = await browser.newPage();
		await page.setViewport({ width: 1366, height: 768 });

		// Listen for journey URLs during navigation
		let finalUrl = url;

		// Listen for all navigation events
		page.on("framenavigated", (frame) => {
			const frameUrl = frame.url();
			if (frameUrl.includes("fahrplan") && frameUrl.includes("#")) {
				finalUrl = frameUrl;
			}
		});

		page.on("response", (response) => {
			const responseUrl = response.url();
			if (responseUrl.includes("fahrplan/suche") && responseUrl.includes("#")) {
				finalUrl = responseUrl;
			}
		});

		// Navigate to the URL with more lenient settings
		await page.goto(url, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});

		// Wait for potential redirects and JavaScript execution
		await new Promise((resolve) => setTimeout(resolve, 3000));

		// Check current URL
		const currentUrl = page.url();
		if (currentUrl !== url && currentUrl.includes("fahrplan")) {
			finalUrl = currentUrl;
		}

		console.log("Original URL:", url);
		console.log("Final URL:", finalUrl);

		return finalUrl;
	} catch (error) {
		console.error("Browser error:", error.message);
		// Instead of returning original URL, throw the error so we can handle it properly
		throw new Error(`Browser navigation failed: ${error.message}`);
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}
