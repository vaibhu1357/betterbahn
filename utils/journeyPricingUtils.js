// Importiere Hilfsfunktionen für Reise- und Preisanalyse
import { getJourneyLegsWithTransfers } from "./journeyUtils.js";
import { isRegionalTrain } from "./pricingUtils.js";
import { isLegCoveredByDeutschlandTicket } from "./deutschlandTicketUtils.js";

// Berechne Reiseabdeckung und Preisgestaltung
export const calculateJourneyPricing = (journey, hasDeutschlandTicket) => {
	// Extrahiere nur Zuglegs (keine Fußwege)
	const trainLegs = getJourneyLegsWithTransfers(journey);
	const analyzer = (leg) =>
		isLegCoveredByDeutschlandTicket(leg, hasDeutschlandTicket);
	const isFullyCovered = trainLegs.every(analyzer);

	// Überprüfe ob Reise Regionalzüge enthält
	const isRegional = (leg) => isRegionalTrain(leg);
	const hasRegionalTrains = trainLegs.some(isRegional);
	const isOnlyRegionalTrains =
		trainLegs.length > 0 && trainLegs.every(isRegional);

	// Basis-Ergebnis-Objekt erstellen
	const baseResult = (overrides) => ({
		hasRegionalTrains,
		isOnlyRegionalTrains,
		...overrides,
	});

	// Überprüfe ob API-Preis verfügbar ist
	const noApiPrice = !journey.price?.amount;

	if (noApiPrice) {
		// Falls kein API-Preis vorhanden und Deutschland-Ticket vollständig abdeckt
		if (hasDeutschlandTicket && isFullyCovered) {
			return baseResult({
				totalPrice: 0,
				originalPrice: 0,
				deutschlandTicketSavings: 0,
				finalPrice: 0,
				isFullyCovered: true,
				hasPartialCoverage: false,
				coveredLegs: [],
				uncoveredLegs: [],
				cannotShowPrice: false,
			});
		}

		// Schätze Preis basierend auf Deutschland-Ticket Status
		const estimatedPrice =
			hasDeutschlandTicket && (hasRegionalTrains || isFullyCovered) ? 49 : 0;

		return baseResult({
			totalPrice: estimatedPrice,
			originalPrice: estimatedPrice,
			deutschlandTicketSavings: 0,
			finalPrice: estimatedPrice,
			isFullyCovered: hasDeutschlandTicket && isFullyCovered,
			hasPartialCoverage: false,
			coveredLegs: [],
			uncoveredLegs: [],
			cannotShowPrice: !hasDeutschlandTicket && hasRegionalTrains,
		});
	}

	const apiPrice = journey.price.amount; // Already discounted by BahnCard if applied

	const legAnalysis = trainLegs.map((leg) => ({
		leg,
		isCovered: analyzer(leg),
		trainType: leg.line?.product || "unknown",
		isRegional: isRegional(leg),
	}));

	const coveredLegs = legAnalysis.filter((l) => l.isCovered);
	const uncoveredLegs = legAnalysis.filter((l) => !l.isCovered);
	const hasPartialCoverage = coveredLegs.length > 0 && uncoveredLegs.length > 0;

	let finalPrice = apiPrice;
	let originalPrice = apiPrice;
	let deutschlandTicketSavings = 0;

	if (hasDeutschlandTicket && (isFullyCovered || hasPartialCoverage)) {
		if (isFullyCovered) {
			originalPrice = apiPrice > 0 ? apiPrice : hasRegionalTrains ? 49 : 89;
			deutschlandTicketSavings = originalPrice;
			finalPrice = 0;
		} else {
			// partial coverage
			const coverageRatio = coveredLegs.length / trainLegs.length;
			originalPrice = apiPrice > 0 ? apiPrice / (1 - coverageRatio * 0.6) : 49;
			deutschlandTicketSavings = originalPrice - apiPrice;
		}
	}

	return baseResult({
		originalPrice,
		deutschlandTicketSavings,
		finalPrice,
		isFullyCovered,
		hasPartialCoverage,
		coveredLegs,
		uncoveredLegs,
		legAnalysis,
		cannotShowPrice: false,
	});
};
