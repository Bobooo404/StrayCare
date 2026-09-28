# StrayCare

StrayCare is a web application that helps people report stray, lost, and injured animals and connects those reports with registered animal welfare organisations.

## What StrayCare Does

A person who finds an animal can:

* Report a stray, lost, or injured animal.
* Add a photo, description, address, and location.
* Get optional AI assistance to understand the urgency and basic first-aid steps.
* Find nearby clinics.
* Track the progress of their report.
* List pets for adoption.

Registered animal welfare organisations can:

* View animal reports in one place.
* Search and filter reports.
* Claim a case.
* Update the case status.
* Add rescue notes that the reporter can see.

## Rescue Process

**Find an animal → Create a report → NGO claims the case → Rescue begins → Case is completed**

Report statuses are:

**Pending → Ongoing → Completed**

## AI Triage

The optional AI feature analyzes a photo and description and provides:

* Urgency level
* Basic first-aid advice
* Possible situation
* Animal type
* Nearby clinics

The AI only creates a **draft**. It does not contact NGOs or submit reports automatically. The user reviews the information before submitting it.

## Main Technology

* **Frontend:** React
* **Backend:** Node.js + Express
* **Database:** MongoDB
* **Authentication:** JWT
* **AI:** Google Gemini
* **Clinic Search:** OpenStreetMap

## Main Users

### Public Users

Can report animals, track cases, use AI assistance, and manage adoption listings.

### Animal Welfare Organisations

Can view, claim, and manage animal rescue cases.

## Project Goal

StrayCare aims to close the gap between **finding an animal that needs help** and **getting an animal welfare organisation involved**.


### The full journey

```
                       +------------------------------+
  finds an animal    ->|  1. AI Triage (optional)     |
                       |     photo + description      |
                       |     -> urgency, first aid,   |
                       |       nearby clinics         |
                       +--------------+---------------+
                                      |  nothing is sent anywhere
                                      v
                       +------------------------------+
  reviews and edits  ->|  2. Report form              |
                       |     prefilled, editable      |
                       |     "remove AI summary"      |
                       +--------------+---------------+
                                      |  user presses submit
                                      v
                       +------------------------------+
  saved to MongoDB   ->|  3. Report created           |
                       |     status = pending         |
                       +--------------+---------------+
                                      |
                                      v
                       +------------------------------+
  NGO sees it        ->|  4. Combined feed            |
                       |     filters, search, counters|
                       +--------------+---------------+
                                      |  claim (atomic)
                                      v
                       +------------------------------+
  work happens       ->|  5. ongoing -> completed     |
                       |     rescue notes recorded    |
                       +--------------+---------------+
                                      |
                                      v
                       +------------------------------+
  reporter is told   ->|  6. Status updates on the    |
                       |     reporter's dashboard     |
                       +------------------------------+
```

### AI triage, in detail

A signed-in member of the public can open an AI panel, attach a photo of the animal, describe
what they see, and optionally share their location. The server sends both to Google Gemini with a
prompt written specifically for a stressed person standing on a roadside, and gets back a
structured answer:

| Field | What it means |
| --- | --- |
| `urgency` | `low`, `moderate`, `high` or `critical` |
| `summary` | Two to four sentences on what is visible and what it probably means |
| `firstAid` | Up to five safe steps to take right now |
| `likelySituation` | A short label, e.g. "Front leg injury after a collision" |
| `looksStray` | A judgement, deliberately biased towards `false` |
| `confidence` | `low` whenever the photo is unclear or the description is vague |
| `animalType` / `suggestedCategory` | Used to prefill the report form |

Alongside it, the server looks up clinics within 20 km through the free OpenStreetMap Overpass
API and lists the nearest ones, with a phone link when the data has one.

Three rules govern the whole feature, and they are the reason it is safe to put in front of
someone who has just found an injured animal:

1. **It never dispatches.** There is no code path from the AI to an NGO, a notification or an
   alert. The result is a draft. A human reads it, can delete it, edits the form, and presses
   submit. That submission is an ordinary report, indistinguishable in shape from one written by
   hand.
2. **It never diagnoses.** The system prompt forbids naming a disease, a drug or a dosage. It
   describes what it can observe and gives general first aid. If the photo does not match the
   description, or is too unclear to judge, it is required to say so and drop its confidence,
   rather than guess.
3. **The key never reaches the browser.** The Gemini API key is read from `server/.env` on the
   server. The client calls StrayCare's own API; the photo is forwarded server-side to Google
   and nowhere else. AI triage also degrades gracefully: with no key configured the button is
   hidden and the rest of the application is unaffected.

Every value the AI returns is re-validated on the server when the report is submitted, so a
modified request cannot smuggle in an arbitrary urgency rating or model name. The stored block
records `reviewedByUser: true`, which is the audit trail for rule 1.

If the model is unreachable, retried a few times and still failing, the user gets a plain "the AI
service is busy" message and a **Try again** button that keeps the photo and description already
entered. The free tier of the Gemini API fails roughly half of all calls, so this is a normal
thing to see rather than a bug.


## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 6, React Router 7, Tailwind CSS 4, lucide-react |
| Backend | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB, local or Atlas. `MONGO_URI` is the only difference |
| Auth | JWT in an httpOnly cookie, role based (`user` / `ngo`) |
| Uploads | multer, single image, mime type verified before it is stored |
| AI triage | Google Gemini vision model, server side only. Optional |
| Clinic lookup | OpenStreetMap Overpass API, no key required. Optional |

## Project layout

```
StrayCare/
  client/                      React single page app
    src/
      components/              Navbar, HeroSlideshow, ReportCard, AiTriagePanel, ...
      context/                 AuthContext, AiDraftContext
      pages/                   dashboards, report form, adoption board
  server/                      Express REST API
    src/
      controllers/             request handlers
      services/                reportService, geminiService, placesService
      models/                  User, NGO, report factories, AdoptionPet
      middleware/              auth, upload, rate limiting, origin checks
      routes/                  route tables, one per resource
    scripts/
      seed.js                  demo data for a real MongoDB
      devMemory.js             runs the API against a throwaway in-memory MongoDB
    tests/
      smoke.test.js            API integration tests
      gemini.unit.test.js      offline tests for the AI response handling
      places.unit.test.js      offline tests for the clinic lookup helpers
  StrayCare-main/              original EJS app, untouched
```


### Option B - with a real MongoDB

```bash
cd server
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run seed                # demo users, NGOs, reports and adoption listings
npm start

cd ../client
npm install
npm run dev
```

### Demo logins

| Role | Email | Password |
| --- | --- | --- |
| User | `straycare@example.com` | `user12345` |
| User | `rohan@example.com` | `user12345` |
| NGO | `contact@gaawt.org` | `ngo12345` |
| NGO | `help@coastalpaws.org` | `ngo12345` |


## Scripts

### server/

| Command | Purpose |
| --- | --- |
| `npm start` | Start the API against `MONGO_URI` |
| `npm run dev` | Same, with file watching |
| `npm run dev:memory` | Start the API with a temporary in-memory MongoDB and demo data |
| `npm run seed` | Reset all collections and load demo data |
| `npm test` | Run the API integration tests (38 checks) |
| `npm run test:unit` | Run the offline unit tests for the Gemini and Overpass helpers |

### client/

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | Production build into `client/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

## Features

**Public**
- Landing page explaining the rescue flow, with live counts of people and organisations
- Adoption board with pet type and availability filters, call and WhatsApp contact
- Adoption listing detail for every available pet

**Signed in as a user**
- Register and sign in
- Dashboard summarising reports, with per status counts
- Submit stray, lost and injured reports with an optional photo, address and GPS coordinates
- **AI triage** from a photo and description: urgency, safe first aid, and nearby clinics, prefilled
  into the report form for review before anything is filed
- Track every report, including which NGO took the case and the rescue notes it left
- Create, edit, mark adopted and delete adoption listings

**Signed in as an NGO**
- Separate NGO portal at `/ngo/login`
- Dashboard counters for pending, in progress and completed cases, broken down by report type
- Combined feed of all three report types with filters for type, status, assignment and free text search
- **The AI triage summary on any case that had one**, so the animal's condition is known before a visit
- Claim a case, which locks it to that organisation, and update its status and rescue notes

