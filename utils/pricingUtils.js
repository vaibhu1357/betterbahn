// Preis- und Rabattberechnungen

// Vorberechnete Lookups für Regionalzüge
const REGIONAL_PRODUCTS = new Set([
	"regional",
	"regionalbahn",
	"regionalexpress",
	"sbahn",
	"suburban",
]);

// Regex-Patterns für Regionalzug-Erkennung
const REGIONAL_PATTERNS = [/^re\s*\d+/i, /^rb\s*\d+/i, /^s\s*\d+/i, /^s-bahn/i];

// Überprüfe ob ein Leg ein Regionalzug ist
export const isRegionalTrain = (leg) => {
	if (!leg || leg.walking || !leg.line) return false;

	// Überprüfe Produkttyp
	const product = leg.line.product?.toLowerCase();
	if (product && REGIONAL_PRODUCTS.has(product)) return true;

	// Überprüfe Linienname gegen Patterns
	const lineName = leg.line.name?.toLowerCase() || "";
	return REGIONAL_PATTERNS.some((pattern) => pattern.test(lineName));
};
