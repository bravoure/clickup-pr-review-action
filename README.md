# ClickUp PR Review Action

Deze GitHub Action voegt automatisch tags toe aan ClickUp taken en plaatst opmerkingen met review-informatie wanneer een gerelateerde Pull Request wordt goedgekeurd of wanneer er wijzigingen worden gevraagd op GitHub.

## Hoe het werkt

1. Wanneer een Pull Request wordt goedgekeurd of wijzigingen worden gevraagd op GitHub, wordt deze action uitgevoerd.
2. De action extraheert ClickUp taak-ID's uit:
   - De branch naam
   - De PR titel
   - Alle commit berichten in de PR
3. Voor elke gevonden taak:
   - Voor goedkeuringen: Voegt een "Pull request approved" tag toe via de ClickUp API
   - Voor gevraagde wijzigingen: Voegt een "Changes requested on pull request" tag toe via de ClickUp API
   - Plaatst een opmerking met de naam van de reviewer, een link naar de PR, en voor gevraagde wijzigingen worden ook de review opmerkingen toegevoegd

## Gebruik

Voeg de volgende workflow toe aan je repository in `.github/workflows/clickup-pr-review.yml`:

```yaml
name: ClickUp PR Review Integration
on:
  pull_request_review:
    types: [submitted]

jobs:
  update-clickup:
    runs-on: ubuntu-latest
    if: github.event.review.state == 'approved' || github.event.review.state == 'changes_requested'
    steps:
      - uses: bravoure/clickup-pr-review-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          clickup-api-key: ${{ secrets.CLICKUP_API_KEY }}
```

## Vereisten

1. **ClickUp API Key**: Je moet je ClickUp API key toevoegen als een GitHub repository secret met de naam `CLICKUP_API_KEY`.

   Om deze secret aan te maken:
   - Ga naar je GitHub repository
   - Navigeer naar Settings > Secrets and variables > Actions
   - Klik op "New repository secret"
   - Naam: `CLICKUP_API_KEY`
   - Waarde: Je ClickUp API key

2. **ClickUp Tags**: Zorg ervoor dat de volgende tags bestaan in je ClickUp workspace:
   - `Pull request approved` - Voor goedgekeurde PR's
   - `Changes requested on pull request` - Voor PR's waar wijzigingen zijn gevraagd

## Taak-ID formaat

De action zoekt naar ClickUp taak-ID's in de volgende formaten:
- `CU-abc123` of `cu-abc123` (hoofdletterongevoelig)
- `CU_abc123` of `cu_abc123` (hoofdletterongevoelig)
- `#abc123`

Zorg ervoor dat je branch namen, PR titels of commit berichten het taak-ID in een van deze formaten bevatten. 