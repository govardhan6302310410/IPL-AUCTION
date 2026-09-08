# IPL Auction — Analytics Formulas

This document defines every formula used in the analytics engine.

## Per-match & Per-innings Normalization
- `RunsPerInnings = runs / innings`
- `WicketsPerMatch = wickets / matches`
- `BowlingEfficiency = (economy * 0.4) + (bowlingAverage * 0.4) + (strikeRate * 0.2)`

## Player Value Classification
- **Expected Value (EV)** = `BasePrice * (1 + (OverallRating - 50)/25)`
- **Price Premium (PP)** = `(FinalPrice - BasePrice) / BasePrice`
- **Value For Money (VFM)** = `(OverallRating / FinalPrice)`

Classification logic:
- **STEAL**: `FinalPrice <= BasePrice * 1.2` AND (`OverallRating >= 75` OR `VFM > 50`)
- **GREAT VALUE**: `VFM > 35` AND `FinalPrice <= EV`
- **FAIR VALUE**: `FinalPrice <= EV * 1.25`
- **OVERPAID**: `FinalPrice > EV * 1.25`

## Team Rating Engine
Composite score (0-100) calculated from:
- Batting Strength (20%)
- Bowling Strength (20%)
- Batting Average & Strike Rate index (20%)
- Bowling Economy & Strike Rate index (20%)
- Squad Balance (10%)
- Purse Efficiency (10%)

## Winner Explanation Generator Rules
- Evaluates the composite score components.
- Highlights highest batting depth, top bowling unit, purse efficiency, etc.
- Example output: "Built the most potent bowling attack in the tournament with 4 front-line pacers and 2 spinners, while securing 3 marquee batters under market value."
