# Koersplan

Persoonlijk dashboard om te zien of je op koers ligt met je toekomst:

- **Overzicht**: bovenaan in drie regels je toekomst: waar je naartoe werkt, in welke fase je zit en je volgende stap. Daaronder je weekscore (hoeveel van je geplande acties je hebt afgevinkt, gemiddeld over je doelen) en afvinken per doel. Bij elk doel zie je in één oogopslag waarom je het doet, waar het naartoe gaat en hoe lang je nog hebt, de volgende mijlpaal, en per actie een minigrafiek van je laatste weken met of je opbouwt. Deed je meer dan gepland, dan tik je op **+** voor een extra keer. Rechts staat wat eraan komt (tussendoelen, mijlpalen en streefdata) en je handelsplan in het kort.
- **Doelen**: bovenaan je toekomst in één zin, met daaronder waarom je dat wilt en hoe je het bereikt. Dan je toekomst per gebied (zoals werk, geld, wonen, gezondheid en wat je naast je werk doet): hoe het eruitziet, hoe je er komt en je volgende stap. Daarna hoe je nu je geld verdient en hoe later, en het pad in fasen: kies een fase voor de tussendoelen, die je afvinkt. Dan je doelen voor dit jaar: je koers als tijdlijn van nu tot je verste streefdatum, en je doelen als rustige lijst: per doel de streefdatum, de volgende mijlpaal en je uitvoering over de laatste 4 weken. Open een doel voor je waarom, het resultaat, je wekelijkse acties met hun opbouw en je mijlpalen. Daarnaast een logboek en sparren met Claude.
- **Beleggen**: je handelsplan uit [Handelsplan](#koppeling-met-handelsplan) (regime, wat je per positie doet en bij welke niveaus, signalen, komende momenten, scenario's, spelregels en marktcijfers), plus je eigen portfolio, inleg per maand en een marktlogboek. Geen koop- of verkoopadvies.
- **Jaar**: jaaragenda met een score per week, het verloop, en per doel je uitvoering en opbouw.

## Extra keren en opbouw

- **Extra keren.** Heb je alle geplande keren van een actie afgevinkt, dan verschijnt een **+**. Daarmee log je wat je méér deed dan gepland. Een extra vakje tik je aan om het weer weg te halen. Je weekscore blijft per doel maximaal 100%, zodat een extra training geen gemiste focusblokken wegpoetst; de extra keren tellen wel mee voor je opbouw.
- **Opbouw (progressive overload).** Per actie kijkt de app naar de trendlijn door je laatste (maximaal 8) afgeronde weken, extra keren meegeteld. *Opbouw* betekent dat je over vier weken gemeten minstens een halve keer per week meer doet (of 10% van je plan, als dat meer is), *Terugval* het omgekeerde, anders *Stabiel*. Weken die je niet invulde tellen niet mee als nul.
- **Eenheid.** Geef een actie een eenheid, bijvoorbeeld km of min. Dan vul je elke week ook de hoeveelheid in en gaat je opbouw over die hoeveelheid (Opbouw vanaf 10% over vier weken). Je ziet dan ook een rustige volgende stap: vorige week plus 10%.
- **De lat bijstellen.** Deed je twee van de laatste drie weken meer dan gepland (en haalde je je plan elke week), dan stelt de app voor om de lat één keer per week te verhogen. Zat je drie weken op rij onder de helft, dan stelt hij een haalbare lat voor. Jij beslist; *Nu niet* verbergt de suggestie voor deze week.

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
   | `HANDELSPLAN_PASSWORD` | optioneel: het wachtwoord of de pincode waarmee je bij Handelsplan inlogt |
   | `ANTHROPIC_API_KEY` | optioneel, zie *Sparren met Claude* |
4. Ga naar **Settings → Networking → Generate Domain**. Open die link en log in.
5. Optioneel: zet bij **Settings → Deploy** het healthcheck-pad op `/healthz`.

Bij de eerste start maakt de app zelf de tabellen aan en zet hij je startdoelen en je investeringsplan erin. Dat gebeurt één keer; daarna is de database de bron.

## Wachtwoord wijzigen

Pas `APP_PASSWORD` aan bij Variables. Railway start de app opnieuw en iedereen die nog ingelogd was, moet opnieuw inloggen. Het wachtwoord staat nergens in de code of in de database.

Bestaat `APP_PASSWORD` uit 4 tot 8 cijfers, dan toont de inlogpagina een pincodeveld met cijfertoetsenbord. Omdat een pincode snel te raden is, gelden dan strengere grenzen: 5 foute pogingen per IP-adres per kwartier, en na 20 foute pogingen in een uur (alle adressen samen) gaat inloggen tot het eind van dat uur dicht.

## Koppeling met Handelsplan

Koersplan leest je plan uit Handelsplan; het schrijft er niets in terug.

- Met `HANDELSPLAN_URL` en `HANDELSPLAN_PASSWORD` logt de server in bij Handelsplan (`POST /api/token`) en haalt hij `plan/current` en `market/latest` op (`GET /api/doc`). Gebruikt Handelsplan een pincode, dan zet je die pincode in `HANDELSPLAN_PASSWORD`. De inlogsleutel blijft in het geheugen van de server; hij wordt nergens opgeslagen.
- Dat gebeurt bij het starten, elke 30 minuten (instelbaar met `HANDELSPLAN_SYNC_MINUTES`, minimaal 5) en als je bij **Beleggen** op **Nu bijwerken** klikt.
- Een kopie komt in de tabel `handelsplan`. Die is in Koersplan alleen-lezen. Lukt het ophalen even niet, dan zie je de laatst opgehaalde versie met een melding erbij.
- Je plan aanpassen doe je in Handelsplan zelf. Verander je daar je wachtwoord of pincode, pas dan ook `HANDELSPLAN_PASSWORD` aan.

Zo voorkomt Koersplan dat Handelsplan hem buitensluit:

- **Klopt het wachtwoord niet, dan stopt het automatisch ophalen.** Handelsplan sluit een netwerk na 4 foute pogingen 24 uur af, dus Koersplan blijft het niet elk halfuur proberen. Pas `HANDELSPLAN_PASSWORD` aan; Railway start de app dan opnieuw en hij probeert het meteen. **Nu bijwerken** probeert het ook.
- **Koersplan logt in als bekend apparaat.** Na de eerste geslaagde inlog geeft Handelsplan een apparaatbewijs. Koersplan bewaart dat in `app_meta` en stuurt het voortaan mee. Een bekend apparaat heeft bij Handelsplan een eigen grens, dus foute pogingen van anderen (bijvoorbeeld bots) sluiten Koersplan niet buiten.
- **Bij een blokkade zie je tot wanneer.** Koersplan neemt de eindtijd over die Handelsplan noemt.
- **Alleen production haalt op.** In een kopie van je Railway-omgeving (andere `RAILWAY_ENVIRONMENT_NAME` dan `production`) logt Koersplan niet in bij Handelsplan, want die kopie heeft hetzelfde wachtwoord en zou anders extra pogingen doen.

## Doelen in één keer vervangen

Zet bij Variables `DOELEN_IMPORT` op JSON in de vorm `{"doelen": {"id": {titel, categorie, waarom, kort, resultaat, deadline, acties, mijlpalen, volgorde}}}`. Hierin is `kort` je waarom in één zin, `deadline` de streefdatum (`JJJJ-MM-DD`), een actie `{id, tekst, perWeek, eenheid}` met een optionele eenheid zoals `"km"`, en een mijlpaal `{id, tekst, klaar, datum}` met een optionele datum. Bij de volgende start vervangt de app al je doelen door deze lijst. De oude doelen komen als back-up in `app_meta`. Dezelfde inhoud wordt maar één keer toegepast, dus de variabele mag blijven staan. Je weekscores van afgelopen weken blijven bewaard.

## Je toekomst in één keer zetten

Je toekomst bewerk je in de app met **Toekomst bewerken** bovenaan Doelen. Wil je hem in één keer zetten, gebruik dan `VISIE_IMPORT` bij Variables, met JSON in de vorm `{"visie": {zin, rol, specialisme, horizon, kern, themas, werkwijze, waaromIntro, waarom, hoeIntro, hoe, gebieden, nu, later, fasen}}`:

- `zin` is je toekomst in één zin, groot bovenaan. Laat je hem weg, dan maakt de app een zin van `rol`, `specialisme` en `horizon`, bijvoorbeeld *Over 3 tot 6 jaar ben je senior integraal ontwerpadviseur, gespecialiseerd in duurzaamheid en regelgeving.* `kern` is een optionele toelichting onder die zin.
- `waarom` en `hoe` zijn lijstjes met tekst, met een optionele inleiding in `waaromIntro` en `hoeIntro`. Begin een regel met een korte kop en een punt (*Vrijheid. Je kiest zelf …*), dan staat die kop vet.
- `gebieden` is een lijst `{id, naam, beeld, hoe}`: per gebied hoe het eruitziet (`beeld`) en hoe je er komt (`hoe`, een lijstje). `themas` (waar je in uitblinkt) en `werkwijze` staan bij het gebied met id `werk`, of in de band als dat gebied er niet is.
- `nu` en `later` zijn `{titel, tekst, punten}`: hoe je nu je geld verdient en hoe later.
- `fasen` is een lijst `{id, naam, van, tot, doel, tussendoelen}` met `van` en `tot` als `JJJJ-MM`. Een tussendoel is `{id, tekst, datum, klaar, gebied}` met een optionele `datum` (`JJJJ-MM-DD`), optioneel `gebied` (het id van een gebied) en optioneel `doel` (het id van een doel waar je er elke week aan werkt).

Bij de volgende start zet de app deze inhoud in `instellingen`; de vorige komt als back-up in `app_meta`. Dezelfde inhoud wordt maar één keer toegepast, dus wat je daarna in de app afvinkt of aanpast blijft staan.

## Je gegevens in Postgres

| Tabel | Inhoud |
|---|---|
| `doelen` | je doelen, met waarom in één zin, streefdatum, wekelijkse acties (eventueel met eenheid) en mijlpalen (eventueel met datum) |
| `weken` | per week per actie hoe vaak je het deed (ook boven je plan), de hoeveelheid bij acties met een eenheid, en je weekreflectie |
| `notities` | logboek en marktlogboek |
| `invest` | portfolio, waardeverloop, inleg per maand en je maximum per positie |
| `instellingen` | je naam en de startweek van je jaar (`algemeen`) en je toekomst (`visie`) |
| `handelsplan` | kopie van je plan en de marktcijfers uit Handelsplan, plus de status van het laatste ophalen |
| `app_meta` | intern: sessiesleutel, of de startdata geladen is, back-ups van geïmporteerde doelen en het apparaatbewijs van Handelsplan |

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
