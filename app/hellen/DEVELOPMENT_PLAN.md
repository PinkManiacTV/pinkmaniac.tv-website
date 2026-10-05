# Wel bekennen — plan

Afgesproken in chat (2026-08-15). Oude versie is af (jij getest). V2 = kopie + verder bouwen.

## Vision

Klassiek 4-speler blijft staan (`hellen` → `wel-bekennen/`). V2 is een tweede tegel: 4–8 spelers, 1 mens + rest bots, standaard Engels.

## V1 (bevroren)

`app/hellen` → `app/wel-bekennen/`. Alleen nog bugfixes als jij die vraagt.

## V2 (nu)

Bron: `app/hellen-v2` (Vite). Live site: `app/hearthunter/`. Tweede tegel op PM APP.

1. **Kopie** van de afgewerkte V1.
2. **Taal:** standaard Engels. Vlaggetje EN ↔ NL (localStorage).
3. **Spelers 4–8** (startscherm). 1 mens, rest bots.
4. **Max kaarten** kiesbaar, cap = `floor(52 / n)` (4→13, 5→10, 6→8, 7→7, 8→6).
5. Zelfde ronde-patroon: 1 → max → max nog eens → terug naar 1.
6. Extra bots 5–8: tijdelijk **Seat 5–8** + hergebruik-portret. Jij levert later namen/plaatjes; tot die tijd geen verzinnen.
7. Tafel + scorebord + dealer-loten op 1 scherm bij 5–8.

## Later (niet in deze V2-ronde)

| | Status |
|---|---|
| Echte namen/plaatjes Seat 5–8 | wacht op jou |
| Online rooms | deferred |
| Play Store (ná web-V2) | deferred |
| Pass-and-play | excluded |
| Oude tegel weghalen | excluded |
