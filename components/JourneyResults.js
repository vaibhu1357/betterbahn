"use client";

// Importiere JourneyCard-Komponente
import JourneyCard from "./JourneyCard";

// Komponente zur Anzeige aller gefundenen Verbindungen
const JourneyResults = ({
	journeys,
	bahnCard,
	hasDeutschlandTicket,
	passengerAge,
	travelClass,
	onJourneySelect,
	selectedJourney,
}) => {
	// Zeige nichts an, falls keine Verbindungen vorhanden
	if (!journeys || journeys.length === 0) {
		return null;
	}

	return (
		<div className="bg-white rounded-lg shadow-md p-6">
			{/* Überschrift für verfügbare Verbindungen */}
			<h2 className="text-xl font-bold mb-4 text-gray-800">
				Available Journeys
			</h2>
			<div className="space-y-4">
				{/* Iteriere über alle Verbindungen und zeige sie an */}
				{journeys.map((journey, index) => {
					const isSelected = selectedJourney === journey;
					return (
						<div
							key={index}
							className={`bg-gray-50 rounded-lg p-4 transition-all duration-200 ${
								isSelected
									? "ring-2 ring-blue-500 bg-blue-50"
									: "hover:bg-gray-100 cursor-pointer"
							}`}
							onClick={() => onJourneySelect && onJourneySelect(journey, index)}
						>
							{/* Zeige einzelne Verbindungskarte an */}
							<JourneyCard
								journey={journey}
								index={index}
								bahnCard={bahnCard}
								hasDeutschlandTicket={hasDeutschlandTicket}
								travelClass={travelClass}
								isSelected={isSelected}
							/>

							{/* Zeige Auswahl-Bestätigung für ausgewählte Verbindung */}
							{isSelected && (
								<div className="mt-3 p-3 bg-blue-100 rounded-lg border-l-4 border-blue-500">
									<p className="text-blue-800 text-sm font-medium">
										✅ Diese Verbindung ausgewählt - Scroll nach unten für
										Split-Ticket Analyse
									</p>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default JourneyResults;
