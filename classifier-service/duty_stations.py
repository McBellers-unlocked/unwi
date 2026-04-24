"""Emit dashboard/public/duty_stations.json.

Hand-curated coordinates for common UN duty stations. Used by the Section 6
map to plot bubbles for cities present in geography.csv.

Future work: extend with a Nominatim-backed filler for new cities discovered
in later snapshots. Call Nominatim at most once per unknown city with a
rate-limit of 1 req/s and the User-Agent required by their usage policy;
cache results back into STATIONS.

Run:
    python3 classifier-service/duty_stations.py
    writes public/duty_stations.json at repo root.
"""
from __future__ import annotations

import json
from pathlib import Path

# name -> {lat, lng, country}
# Coordinates are city centres, good enough for bubble placement on a world /
# Europe map at dashboard resolution. Keys are lowercased; lookup normalises.
STATIONS: dict[str, dict[str, float | str]] = {
    "geneva":           {"lat": 46.2044, "lng":   6.1432, "country": "Switzerland"},
    "brussels":         {"lat": 50.8503, "lng":   4.3517, "country": "Belgium"},
    "new york":         {"lat": 40.7128, "lng": -74.0060, "country": "United States"},
    "nairobi":          {"lat": -1.2921, "lng":  36.8219, "country": "Kenya"},
    "amman":            {"lat": 31.9454, "lng":  35.9284, "country": "Jordan"},
    "manila":           {"lat": 14.5995, "lng": 120.9842, "country": "Philippines"},
    "rome":             {"lat": 41.9028, "lng":  12.4964, "country": "Italy"},
    "vienna":           {"lat": 48.2082, "lng":  16.3738, "country": "Austria"},
    "copenhagen":       {"lat": 55.6761, "lng":  12.5683, "country": "Denmark"},
    "beirut":           {"lat": 33.8938, "lng":  35.5018, "country": "Lebanon"},
    "bangkok":          {"lat": 13.7563, "lng": 100.5018, "country": "Thailand"},
    "valencia":         {"lat": 39.4699, "lng":  -0.3763, "country": "Spain"},
    "brindisi":         {"lat": 40.6383, "lng":  17.9458, "country": "Italy"},
    "florence":         {"lat": 43.7696, "lng":  11.2558, "country": "Italy"},
    "gebze":            {"lat": 40.8000, "lng":  29.4400, "country": "Türkiye"},
    "madrid":           {"lat": 40.4168, "lng":  -3.7038, "country": "Spain"},
    "the hague":        {"lat": 52.0705, "lng":   4.3007, "country": "Netherlands"},
    "addis ababa":      {"lat":  9.0054, "lng":  38.7636, "country": "Ethiopia"},
    "budapest":         {"lat": 47.4979, "lng":  19.0402, "country": "Hungary"},
    "paris":            {"lat": 48.8566, "lng":   2.3522, "country": "France"},
    "stockholm":        {"lat": 59.3293, "lng":  18.0686, "country": "Sweden"},
    "cairo":            {"lat": 30.0444, "lng":  31.2357, "country": "Egypt"},
    "kabul":            {"lat": 34.5553, "lng":  69.2075, "country": "Afghanistan"},
    "kuala lumpur":     {"lat":  3.1390, "lng": 101.6869, "country": "Malaysia"},
    "lusaka":           {"lat": -15.3875, "lng": 28.3228, "country": "Zambia"},
    "luxembourg":       {"lat": 49.6116, "lng":   6.1319, "country": "Luxembourg"},
    "noordwijk":        {"lat": 52.2412, "lng":   4.4468, "country": "Netherlands"},
    "pemba":            {"lat": -12.9742, "lng": 40.5178, "country": "Mozambique"},
    "port of spain":    {"lat": 10.6549, "lng": -61.5019, "country": "Trinidad and Tobago"},
    "port-au-prince":   {"lat": 18.5944, "lng": -72.3074, "country": "Haiti"},
    "strasbourg":       {"lat": 48.5734, "lng":   7.7521, "country": "France"},
    "abidjan":          {"lat":  5.3600, "lng":  -4.0083, "country": "Côte d'Ivoire"},
    "antananarivo":     {"lat": -18.8792, "lng": 47.5079, "country": "Madagascar"},
    "bonn":             {"lat": 50.7374, "lng":   7.0982, "country": "Germany"},
    "brunssum":         {"lat": 50.9426, "lng":   5.9669, "country": "Netherlands"},
    "buenos aires":     {"lat": -34.6118, "lng": -58.3960, "country": "Argentina"},
    "caracas":          {"lat": 10.4806, "lng": -66.9036, "country": "Venezuela"},
    "colombo":          {"lat":  6.9271, "lng":  79.8612, "country": "Sri Lanka"},
    "dhaka":            {"lat": 23.8103, "lng":  90.4125, "country": "Bangladesh"},
    "helsinki":         {"lat": 60.1699, "lng":  24.9384, "country": "Finland"},
    "lome":             {"lat":  6.1725, "lng":   1.2314, "country": "Togo"},
    "mexico city":      {"lat": 19.4326, "lng": -99.1332, "country": "Mexico"},
    "mons":             {"lat": 50.4542, "lng":   3.9561, "country": "Belgium"},
    "norfolk":          {"lat": 36.8508, "lng": -76.2859, "country": "United States"},
    "prague":           {"lat": 50.0755, "lng":  14.4378, "country": "Czech Republic"},
    "santiago":         {"lat": -33.4489, "lng": -70.6693, "country": "Chile"},
    "valletta":         {"lat": 35.8989, "lng":  14.5146, "country": "Malta"},
    "maiduguri":        {"lat": 11.8333, "lng":  13.1500, "country": "Nigeria"},

    # Common UN field + HQ stations not in current reference but worth pre-staging
    "washington":       {"lat": 38.9072, "lng": -77.0369, "country": "United States"},
    "istanbul":         {"lat": 41.0082, "lng":  28.9784, "country": "Türkiye"},
    "dubai":            {"lat": 25.2048, "lng":  55.2708, "country": "United Arab Emirates"},
    "bogota":           {"lat":  4.7110, "lng": -74.0721, "country": "Colombia"},
    "dakar":            {"lat": 14.7167, "lng": -17.4677, "country": "Senegal"},
    "panama city":      {"lat":  8.9824, "lng": -79.5199, "country": "Panama"},
    "johannesburg":     {"lat": -26.2041, "lng": 28.0473, "country": "South Africa"},
    "kinshasa":         {"lat":  -4.4419, "lng": 15.2663, "country": "Democratic Republic of the Congo"},
    "baghdad":          {"lat": 33.3152, "lng":  44.3661, "country": "Iraq"},
    "beijing":          {"lat": 39.9042, "lng": 116.4074, "country": "China"},
    "tokyo":            {"lat": 35.6762, "lng": 139.6503, "country": "Japan"},
    "seoul":            {"lat": 37.5665, "lng": 126.9780, "country": "Republic of Korea"},
    "riyadh":           {"lat": 24.7136, "lng":  46.6753, "country": "Saudi Arabia"},
    "accra":            {"lat":  5.6037, "lng":  -0.1870, "country": "Ghana"},
    "juba":             {"lat":  4.8594, "lng":  31.5713, "country": "South Sudan"},
    "khartoum":         {"lat": 15.5007, "lng":  32.5599, "country": "Sudan"},
    "kampala":          {"lat":  0.3476, "lng":  32.5825, "country": "Uganda"},
    "kigali":           {"lat": -1.9706, "lng":  30.1044, "country": "Rwanda"},
    "dar es salaam":    {"lat": -6.7924, "lng":  39.2083, "country": "Tanzania"},
    "asmara":           {"lat": 15.3229, "lng":  38.9251, "country": "Eritrea"},
    "london":           {"lat": 51.5074, "lng":  -0.1278, "country": "United Kingdom"},
    "berlin":           {"lat": 52.5200, "lng":  13.4050, "country": "Germany"},
    "oslo":             {"lat": 59.9139, "lng":  10.7522, "country": "Norway"},
    "lisbon":           {"lat": 38.7223, "lng":  -9.1393, "country": "Portugal"},
    "warsaw":           {"lat": 52.2297, "lng":  21.0122, "country": "Poland"},
}


def main() -> None:
    out = Path(__file__).resolve().parent.parent / "public" / "duty_stations.json"
    out.write_text(json.dumps(STATIONS, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {len(STATIONS)} stations to {out}")


if __name__ == "__main__":
    main()
