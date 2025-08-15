"use client";

// Importiere React-Hooks und Hilfsfunktionen
import { useState } from "react";
import {
	formatTime,
	formatDuration,
	getJourneyLegsWithTransfers,
	getStationName,
	getLineInfo,
} from "../utils/journeyUtils";
import {
	isLegCoveredByDeutschlandTicket,
	isFlixTrain,
} from "../utils/deutschlandTicketUtils";
import { createSegmentSearchUrl } from "../utils/createUrl";

// Hilfsfunktion zur Formatierung von Preisen mit deutschem Komma
const formatPriceDE = (price) => {
	return `${price.toFixed(2).replace(".", ",")}€`;
};

// Komponente zur Anzeige von Split-Ticket Optionen
const SplitOptions = ({
	splitOptions,
	originalJourney,
	loadingSplits,
	hasDeutschlandTicket,
	bahnCard,
}) => {
	// State für erweiterte Optionsanzeige (erste Option standardmäßig erweitert)
	const [expandedOption, setExpandedOption] = useState(0);

	// Berechne Split-Option Preisgestaltung mit Deutschland-Ticket Logik
	const calculateSplitOptionPricing = (splitOption) => {
		if (!splitOption || !splitOption.segments) {
			return {
				...splitOption,
				isFullyCovered: false,
				hasRegionalTrains: false,
				cannotShowPrice: false,
				hasPartialPricing: false,
				segmentsWithoutPricing: [],
				adjustedTotalPrice: splitOption?.totalPrice || 0,
				adjustedSavings: splitOption?.savings || 0,
			};
		}

		// Überprüfe ob Split-Option Regionalzüge enthält
		const hasRegionalTrains = splitOption.segments.some((segment) => {
			const trainLegs = getJourneyLegsWithTransfers(segment);
			return trainLegs.some((leg) => {
				const product = leg.line?.product?.toLowerCase() || "";
				const regionalProducts = [
					"regional",
					"regionalbahn",
					"regionalexpress",
					"sbahn",
					"suburban",
				];
				return regionalProducts.includes(product);
			});
		});

		const hasFlixTrains = splitOption.segments.some((segment) => {
			const trainLegs = getJourneyLegsWithTransfers(segment);
			return trainLegs.some((leg) => isFlixTrain(leg));
		});

		let cannotShowPrice = false;
		let hasPartialPricing = false;
		let segmentsWithoutPricing = [];
		let allSegmentsCovered = false;

		allSegmentsCovered = splitOption.segments.every((segment) => {
			const trainLegs = getJourneyLegsWithTransfers(segment);
			return trainLegs.every((leg) =>
				isLegCoveredByDeutschlandTicket(leg, hasDeutschlandTicket)
			);
		});

		if (hasDeutschlandTicket) {
			cannotShowPrice = false;
			hasPartialPricing = false;
		} else {
			let segmentsWithPrice = 0;
			let totalSegments = splitOption.segments.length;

			splitOption.segments.forEach((segment, index) => {
				const hasPrice = segment.price && segment.price.amount > 0;
				const segmentHasFlixTrain = getJourneyLegsWithTransfers(segment).some(
					(leg) => isFlixTrain(leg)
				);

				// Consider a segment as having no pricing if:
				// 1. It has no price data, OR
				// 2. It contains FlixTrain services (which we can't price)
				if (!hasPrice || segmentHasFlixTrain) {
					segmentsWithoutPricing.push(index);
				} else {
					segmentsWithPrice++;
				}
			});

			cannotShowPrice = segmentsWithPrice === 0;
			hasPartialPricing =
				segmentsWithPrice > 0 && segmentsWithPrice < totalSegments;
		}

		let adjustedTotalPrice = splitOption.totalPrice || 0;
		let adjustedSavings = splitOption.savings || 0;

		if (originalJourney) {
			// The API already returns prices with BahnCard discounts applied
			const originalJourneyApiPrice = originalJourney.price?.amount || 0;

			if (hasDeutschlandTicket) {
				let totalUncoveredPrice = 0;

				for (const segment of splitOption.segments) {
					const trainLegs = getJourneyLegsWithTransfers(segment);
					const segmentCovered = trainLegs.every((leg) =>
						isLegCoveredByDeutschlandTicket(leg, hasDeutschlandTicket)
					);
					const segmentPrice = segment.price?.amount || 0;

					if (!segmentCovered && segmentPrice > 0) {
						totalUncoveredPrice += segmentPrice;
					}
				}

				adjustedTotalPrice = totalUncoveredPrice;
			} else if (hasPartialPricing) {
				// For partial pricing, only sum up segments with available pricing
				let partialTotalPrice = 0;

				splitOption.segments.forEach((segment, index) => {
					if (!segmentsWithoutPricing.includes(index)) {
						partialTotalPrice += segment.price?.amount || 0;
					}
				});

				adjustedTotalPrice = partialTotalPrice;
			}

			adjustedSavings = Math.max(
				0,
				originalJourneyApiPrice - adjustedTotalPrice
			);
		}

		return {
			...splitOption,
			isFullyCovered: allSegmentsCovered && hasDeutschlandTicket,
			hasRegionalTrains,
			hasFlixTrains,
			cannotShowPrice,
			hasPartialPricing,
			segmentsWithoutPricing,
			adjustedTotalPrice,
			adjustedSavings,
		};
	};

	const formatSplitJourney = (splitOption) => {
		const segments = splitOption.segments;
		const splitStations = splitOption.splitStations;

		return {
			departure: formatTime(segments[0].legs[0].departure),
			arrival: formatTime(
				segments[segments.length - 1].legs[
					segments[segments.length - 1].legs.length - 1
				].arrival
			),
			duration: formatDuration({
				legs: [
					segments[0].legs[0],
					segments[segments.length - 1].legs[
						segments[segments.length - 1].legs.length - 1
					],
				],
			}),
			route: [
				getStationName(segments[0].legs[0].origin),
				...splitStations.map((s) => s.name),
				getStationName(
					segments[segments.length - 1].legs[
						segments[segments.length - 1].legs.length - 1
					].destination
				),
			].join(" → "),
		};
	};

	// Determine which split options to show based on pricing availability
	const getOptionsToShow = (splitOptions) => {
		if (!splitOptions || splitOptions.length === 0) return [];

		// Calculate pricing for all options first
		const optionsWithPricing = splitOptions.map((option) => ({
			...option,
			pricing: calculateSplitOptionPricing(option),
		}));

		// Sort by savings (highest first)
		const sortedOptions = optionsWithPricing.sort(
			(a, b) => b.pricing.adjustedSavings - a.pricing.adjustedSavings
		);

		// If user has Deutschland-Ticket, always show only the cheapest option
		if (hasDeutschlandTicket) {
			return [sortedOptions[0]];
		}

		// For users without Deutschland-Ticket
		const bestOption = sortedOptions[0];

		// If the best option has complete pricing (no partial or missing pricing), show only that
		if (
			!bestOption.pricing.cannotShowPrice &&
			!bestOption.pricing.hasPartialPricing
		) {
			return [bestOption];
		}

		// If the best option has pricing issues, show options until we find one with complete pricing
		const optionsToShow = [];
		let foundCompleteOption = false;

		for (const option of sortedOptions) {
			optionsToShow.push(option);

			// If this option has complete pricing, we can stop
			if (
				!option.pricing.cannotShowPrice &&
				!option.pricing.hasPartialPricing
			) {
				foundCompleteOption = true;
				break;
			}
		}

		// If we never found a complete option, show all options (they all have pricing issues)
		return foundCompleteOption ? optionsToShow : sortedOptions;
	};

	const optionsToDisplay = getOptionsToShow(splitOptions);

	if (loadingSplits) {
		return (
			<div className="text-center py-4">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
				<p className="text-yellow-700">Analyzing split journey options...</p>
			</div>
		);
	}

	if (!splitOptions || splitOptions.length === 0) {
		return (
			<div className="text-center py-4">
				<p className="text-gray-600">No cheaper split options found.</p>
				<p className="text-xs text-gray-500 mt-1">
					The direct journey appears to be the most cost-effective option.
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-4">
				{optionsToDisplay.map((splitOption, splitIndex) => {
					const splitPricing = splitOption.pricing;

					if (splitPricing.cannotShowPrice) {
						return (
							<div
								key={splitIndex}
								className="border border-primary rounded-lg p-4 "
							>
								<div className="text-orange-700">
									<div className="font-medium mb-1">
										Option {splitIndex + 1}
									</div>
									<div className="text-sm">
										⚠️ Cannot calculate pricing for
										{splitPricing.hasFlixTrains ? " FlixTrain and" : ""}{" "}
										regional services. Manual check required.
									</div>
								</div>
							</div>
						);
					}

					const isExpanded = expandedOption === splitIndex;
					const departureLeg = splitOption.segments[0].legs[0];
					const lastSegment =
						splitOption.segments[splitOption.segments.length - 1];
					const arrivalLeg = lastSegment.legs[lastSegment.legs.length - 1];

					const totalChanges =
						splitOption.segments.reduce(
							(acc, s) => acc + s.legs.length - 1,
							0
						) +
						(splitOption.segments.length - 1);

					return (
						<div
							key={splitIndex}
							className={`border rounded-lg overflow-hidden shadow-sm transition-all duration-300 ${
								splitPricing.hasPartialPricing
									? "border-orange-300 bg-orange-50"
									: "border-gray-200 bg-white"
							} ${isExpanded ? "shadow-lg" : ""}`}
						>
							<div
								className="p-4 cursor-pointer"
								onClick={() =>
									setExpandedOption(isExpanded ? null : splitIndex)
								}
							>
								<div className="flex items-start">
									<div className="flex flex-col items-center mr-4 pt-1">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-6 w-6 text-gray-600"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth="1.5"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M6 20h12M6 16h12M8 16V9a4 4 0 014-4h0a4 4 0 014 4v7"
											/>
										</svg>
										<div className="h-16 w-px bg-gray-300 my-2"></div>
										<div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div>
									</div>

									<div className="flex-grow">
										<div className="flex justify-between items-start">
											<div>
												<span className="font-bold text-xl">
													{formatTime(departureLeg.departure)}
												</span>
												<span className="ml-3 text-lg">
													{getStationName(departureLeg.origin)}
												</span>
											</div>
											<div className="text-right">
												{splitPricing.isFullyCovered ? (
													<div className="text-green-600">
														<div className="font-bold text-lg">
															Deutschland-Ticket
														</div>
														<div className="text-sm font-medium text-green-600">
															✓ Vollständig enthalten
														</div>
													</div>
												) : (
													<>
														<div className="font-bold text-lg text-green-600">
															Spare{" "}
															{formatPriceDE(splitPricing.adjustedSavings)}
														</div>
														<div className="text-xl font-bold text-gray-900">
															{formatPriceDE(splitPricing.adjustedTotalPrice)}
															{splitPricing.hasPartialPricing && (
																<span className="text-orange-600 ml-1">*</span>
															)}
														</div>
													</>
												)}
											</div>
										</div>

										<div className="text-sm text-gray-500 my-2 pl-1 flex items-center">
											<span>
												{formatDuration({ legs: [departureLeg, arrivalLeg] })}
											</span>
											<span className="mx-2">·</span>
											<span>
												{totalChanges} Zwischenstopp
												{totalChanges !== 1 ? "s" : ""}
											</span>
											<span className="ml-2 inline-block px-1.5 py-0.5 text-xs font-semibold text-red-700 border border-red-400 rounded-sm">
												DB
											</span>
										</div>

										{splitOption.splitStations &&
											splitOption.splitStations.length > 0 && (
												<div className="text-sm text-gray-500 mt-1 pl-1">
													Via:{" "}
													<span className="font-medium text-blue-600">
														{splitOption.splitStations
															.map((s) => s.name)
															.join(", ")}
													</span>
												</div>
											)}

										<div className="flex justify-between items-start mt-2">
											<div>
												<span className="font-bold text-xl">
													{formatTime(arrivalLeg.arrival)}
												</span>
												<span className="ml-3 text-lg">
													{getStationName(arrivalLeg.destination)}
												</span>
											</div>
										</div>
									</div>

									<div className="flex items-center h-full ml-2">
										<svg
											className={`w-6 h-6 text-gray-400 transform transition-transform ${
												isExpanded ? "rotate-180" : ""
											}`}
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
								</div>
							</div>

							{isExpanded && (
								<div className="border-t border-gray-200 mt-2">
									<div className="px-4 py-3 bg-gray-50/50">
										<h3 className="font-bold text-sm text-gray-700 mb-3">
											Die Teile deiner Reise
										</h3>
										<div className="space-y-2">
											{splitOption.segments.map((segment, segmentIndex) => {
												const segmentHasFlixTrain = getJourneyLegsWithTransfers(
													segment
												).some((leg) => isFlixTrain(leg));
												const hasUnknownPrice =
													splitPricing.segmentsWithoutPricing?.includes(
														segmentIndex
													);

												// Check if segment is covered by Deutschland-Ticket
												const segmentCoveredByDeutschlandTicket =
													hasDeutschlandTicket &&
													getJourneyLegsWithTransfers(segment).every((leg) =>
														isLegCoveredByDeutschlandTicket(
															leg,
															hasDeutschlandTicket
														)
													);

												return (
													<div
														key={segmentIndex}
														className="flex justify-between items-center p-2 rounded-md bg-white border border-gray-200"
													>
														<div className="flex-grow">
															<div className="font-semibold text-sm text-gray-800 flex items-center gap-2">
																{getJourneyLegsWithTransfers(segment).map(
																	(leg, legIndex) => (
																		<span
																			key={legIndex}
																			className="flex items-center gap-1"
																		>
																			{getLineInfo(leg)}
																			{legIndex <
																				getJourneyLegsWithTransfers(segment)
																					.length -
																					1 && (
																				<span className="text-gray-400">→</span>
																			)}
																		</span>
																	)
																)}
															</div>
															<div className="text-xs text-gray-500 mt-1">
																{getStationName(segment.legs[0].origin)} (
																{formatTime(segment.legs[0].departure)}) →{" "}
																{getStationName(
																	segment.legs[segment.legs.length - 1]
																		.destination
																)}{" "}
																(
																{formatTime(
																	segment.legs[segment.legs.length - 1].arrival
																)}
																)
															</div>
														</div>
														<div className="text-right ml-4 flex-shrink-0 w-28">
															<div className="font-bold text-md">
																{segmentCoveredByDeutschlandTicket ? (
																	<span className="text-xs font-medium text-green-600">
																		✓ D-Ticket
																	</span>
																) : hasUnknownPrice ? (
																	<span
																		className={`text-xs font-medium ${
																			segmentHasFlixTrain
																				? "text-purple-600"
																				: "text-orange-600"
																		}`}
																	>
																		{segmentHasFlixTrain
																			? "FlixTrain"
																			: "Price unknown"}
																	</span>
																) : (
																	<span>
																		{formatPriceDE(
																			parseFloat(segment.price?.amount || 0)
																		)}
																	</span>
																)}
															</div>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	const dbUrl = createSegmentSearchUrl(
																		segment,
																		2
																	);
																	if (dbUrl && !dbUrl.startsWith("Error:")) {
																		window.open(dbUrl, "_blank");
																	} else {
																		console.error(
																			"Failed to generate URL:",
																			dbUrl
																		);
																		alert("Failed to generate booking URL.");
																	}
																}}
																className="mt-1 px-3 py-1 bg-green-600 text-white text-xs rounded-md "
															>
																Zur Buchung
															</button>
														</div>
													</div>
												);
											})}
										</div>
										{splitPricing.hasPartialPricing && (
											<div className="mt-3 text-xs text-orange-700 p-2 bg-orange-100 rounded-md border border-orange-200">
												* Some segments have unknown pricing (e.g., regional
												trains, FlixTrain). The total price and savings are
												based on available data.
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</>
	);
};

export default SplitOptions;
