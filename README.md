# Koersplan

Persoonlijk dashboard om te zien of je op koers ligt met je toekomst:

- **Overzicht**: je weekscore (hoeveel van je geplande acties je hebt afgevinkt, gemiddeld over je doelen), afvinken per doel en je handelsplan in het kort.
- **Doelen**: je doelen voor dit jaar, waarom ze je verder brengen, mijlpalen, een logboek en sparren met Claude.
- **Beleggen**: je handelsplan uit [Handelsplan](#koppeling-met-handelsplan) (regime, wat je per positie doet en bij welke niveaus, signalen, komende momenten, scenario's, spelregels en marktcijfers), plus je eigen portfolio, inleg per maand en een marktlogboek. Geen koop- of verkoopadvies.
- **Jaar**: jaaragenda met een score per week, het verloop, en per doel hoe je ervoor staat.

De app is één Node-server (`server.js`) met Postgres als opslag. Inloggen gaat met één wachtwoord dat je zelf in Railway instelt. Het ontwerp hoort bij dezelfde familie als Handelsplan; de lettertypen (Bricolage Grotesque, IBM Plex Sans en IBM Plex Mono, open source onder de OFL) worden door de app zelf geserveerd.

## Op Railway zetten

1. Ga naar [railway.com](https://railway.com) en kies **New Project → Deploy from GitHub repo**. Kies deze repo (`koersplan`). De eerste keer vraagt Railway toegang tot je GitHub; geef toegang tot deze repo.
2. Voeg in hetzelfde project een database toe: **Create → Database → PostgreSQL**.
3. Open de service **koersplan → Variables** en voeg toe:
   | Variabele | Waarde |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (heet je database-service anders, gebruik dan die naam) |
   | `APP_PASSWORD` | je eigen wachtwoord, liefst 12 tekens of meer |
   | `HANDELSPLAN_URL` | optioneel: het adres van je Handelsplan-site, bijvoorbeeld `https://handelsplan.vsonsbeek.nl` |
   | `HANDELSPLAN_PASSWORD` | optioneel: het wachtwoord waarmee je bij Handelsplan inlogt |
   | `ANTHROPIC_API_KEY` | optioneel, zie *Sparren met Claude* |
4. Ga naar **Settings → Networking → Generate Domain**. Open die link en log in.
5. Optioneel: zet bij **Settings → Deploy** het healthcheck-pad op `/healthz`.

Bij de eerste start maakt de app zelf de tabellen aan en zet hij je startdoelen en je investeringsplan erin. Dat gebeurt één keer; daarna is de database de bron.

## Wachtwoord wijzigen

Pas `APP_PASSWORD` aan bij Variables. Railway start de app opnieuw en iedereen die nog ingelogd was, moet opnieuw inloggen. Het wachtwoord staat nergens in de code of in de database.

## Koppeling met Handelsplan

Koersplan leest je plan uit Handelsplan; het schrijft er niets in terug.

- Met `HANDELSPLAN_URL` en `HANDELSPLAN_PASSWORD` logt de server in bij Handelsplan (`POST /api/token`) en haalt hij `plan/current` en `market/latest` op (`GET /api/doc`). De inlogsleutel blijft in het geheugen van de server; hij wordt nergens opgeslagen.
- Dat gebeurt bij het starten, elke 30 minuten (instelbaar met `HANDELSPLAN_SYNC_MINUTES`, minimaal 5) en als je bij **Beleggen** op **Nu bijwerken** klikt.
- Een kopie komt in de tabel `handelsplan`. Die is in Koersplan alleen-lezen. Lukt het ophalen even niet, dan zie je de laatst opgehaalde versie met een melding erbij.
- Je plan aanpassen doe je in Handelsplan zelf. Verander je daar je wachtwoord, pas dan ook `HANDELSPLAN_PASSWORD` aan.

## Doelen in één keer vervangen

Zet bij Variables `DOELEN_IMPORT` op JSON in de vorm `{"doelen": {"id": {titel, categorie, waarom, resultaat, deadline, acties, mijlpalen, volgorde}}}`. Bij de volgende start vervangt de app al je doelen door deze lijst. De oude doelen komen als back-up in `app_meta`. Dezelfde inhoud wordt maar één keer toegepast, dus de variabele mag blijven staan. Je weekscores van afgelopen weken blijven bewaard.

## Je gegevens in Postgres

| Tabel | Inhoud |
|---|---|
| `doelen` | je doelen, met wekelijkse acties en mijlpalen |
| `weken` | per week wat je hebt afgevinkt en je weekreflectie |
| `notities` | logboek en marktlogboek |
| `invest` | portfolio, waardeverloop, inleg per maand en je maximum per positie |
| `instellingen` | je naam en de startweek van je jaar |
| `handelsplan` | kopie van je plan en de marktcijfers uit Handelsplan, plus de status van het laatste ophalen |
| `app_meta` | intern: sessiesleutel en of de startdata geladen is |

Elke tabel heeft de kolommen `id`, `data` (jsonb) en `bijgewerkt`. Je kunt ze bekijken in Railway via de Postgres-service, tab **Data**. Een back-up van alles download je in de app via **Jaar → Back-up downloaden**.

## Sparren met Claude

Zet `ANTHROPIC_API_KEY` bij Variables om het sparpaneel aan te zetten. Een sleutel maak je aan op [console.anthropic.com](https://console.anthropic.com). Dat is een apart account dat per gebruik betaalt, los van een Claude-abonnement. Standaard gebruikt de app `claude-sonnet-5-5`; met `ANTHROPIC_MODEL` kies je een ander model. De app stuurt dan je doelen, weekscores, reflecties, logboek, de kern van je handelsplan en je portfolioverdeling (percentages, geen bedragen) mee als context. Wijzigingen die Claude voorstelt, pas je zelf toe.

## Privacy

`seed/startdata.json` bevat je startdoelen en de namen van je beleggingen, zonder bedragen. Houd deze repo privé. Wil je hem ooit openbaar maken, verwijder dan eerst dat bestand en de git-geschiedenis ervan. Je handelsplan zelf staat niet in de repo: dat haalt de server pas op als hij draait.

## Lokaal draaien

```bash
npm install
APP_PASSWORD=test DATABASE_URL=postgresql://localhost:5432/koersplan npm start
```

Open daarna http://localhost:3000. Zie `.env.example` voor alle variabelen.
