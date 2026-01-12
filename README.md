# 🐟 Salmon.cafe - Global Salmon Simulator

A multiplayer neglect simulator where one salmon is shared by all users. Keep it alive by feeding it, but be careful - overfeeding or neglect will cause death!

## Features

- **Global Shared Salmon**: One fish shared by everyone on the server
- **Hunger System**: Hunger decays by 5 points per hour (0-100 scale)
- **Death Mechanics**: 
  - Dies from starvation (hunger ≤ 0)
  - Dies from overfeeding (hunger ≥ 100)
- **Tank Levels**: Unlock better tanks based on survival days
  - Tank 1: 0 days
  - Tank 2: 2 days
  - Tank 3: 5 days
  - Tank 4: 10 days
  - Tank 5: 20 days
- **Nightly Deliveries**: Automatic food delivery at 3 AM
- **Death History**: Track all deaths with timestamp, cause, and duration
- **Action Logging**: Records all feed/order actions
- **Prometheus Metrics**: `/metrics` endpoint for monitoring
- **Simple HTML UI**: Real-time updates showing hunger, tank, status, and controls

## Tech Stack

- **Node.js v20+** with ES modules
- **Express.js** - Web server
- **Drizzle ORM** - Database management
- **Better-SQLite3** - SQLite database
- **Prom-Client** - Prometheus metrics

## Installation

```bash
npm install
```

## Usage

### Start the server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on port 3000 (or PORT environment variable):
- **UI**: http://localhost:3000
- **Metrics**: http://localhost:3000/metrics
- **Health**: http://localhost:3000/health

### API Endpoints

#### GET `/api/status`
Get current salmon state

```json
{
  "isAlive": true,
  "hunger": 50,
  "tankLevel": 1,
  "daysSurvived": 0,
  "bornAt": "2026-01-12T05:32:34.000Z",
  "lastFedAt": null
}
```

#### POST `/api/feed`
Feed the salmon (+15 hunger)

```json
{
  "success": true,
  "message": "Fed the salmon",
  "hunger": 65
}
```

#### POST `/api/order`
Order food for the salmon (+25 hunger)

```json
{
  "success": true,
  "message": "Ordered food for the salmon",
  "hunger": 75
}
```

#### POST `/api/respawn`
Respawn a new salmon after death

```json
{
  "success": true,
  "message": "New salmon spawned!"
}
```

#### GET `/api/history?limit=10`
Get death history

```json
[
  {
    "id": 1,
    "diedAt": "2026-01-12T05:33:31.000Z",
    "cause": "overfeeding",
    "daysSurvived": 0,
    "durationHours": 0.016,
    "finalHunger": 100,
    "tankLevel": 1
  }
]
```

#### GET `/api/actions?limit=20`
Get recent actions

```json
[
  {
    "id": 1,
    "action": "feed",
    "timestamp": "2026-01-12T05:32:52.000Z",
    "hungerBefore": 50,
    "hungerAfter": 65
  }
]
```

#### GET `/metrics`
Prometheus metrics endpoint

```
# HELP salmon_alive Whether the salmon is alive (1) or dead (0)
# TYPE salmon_alive gauge
salmon_alive 1

# HELP salmon_hunger Current hunger level of the salmon (0-100)
# TYPE salmon_hunger gauge
salmon_hunger 50

# HELP salmon_tank_level Current tank level (1-5)
# TYPE salmon_tank_level gauge
salmon_tank_level 1
...
```

## Game Mechanics

### Hunger Decay
- Hunger decreases by 5 points per hour
- Updates automatically every minute
- Range: 0-100

### Feeding
- **Feed**: Increases hunger by 15
- **Order**: Increases hunger by 25 (bigger meal)

### Death Conditions
- **Starvation**: Hunger drops to 0 or below
- **Overfeeding**: Hunger reaches 100

### Tank Upgrades
Tanks unlock automatically based on days survived:
- Days 0-1: Tank 1
- Days 2-4: Tank 2
- Days 5-9: Tank 3
- Days 10-19: Tank 4
- Days 20+: Tank 5

### Nightly Delivery
At 3 AM daily, the salmon receives automatic food delivery (+20 hunger) if alive.

## Project Structure

```
salmon.cafe/
├── src/
│   ├── db/
│   │   ├── schema.js        # Database schema definitions
│   │   └── index.js         # Database connection and initialization
│   ├── services/
│   │   ├── simulator.js     # Core salmon simulator logic
│   │   └── metrics.js       # Prometheus metrics
│   ├── public/
│   │   └── index.html       # HTML UI
│   └── index.js             # Express server entry point
├── data/
│   └── salmon.db            # SQLite database (auto-created)
├── package.json
└── drizzle.config.js        # Drizzle ORM configuration
```

## Development

The project uses:
- ES6+ modules (`type: "module"` in package.json)
- Node.js v20+ features
- SQLite with WAL mode for better concurrency
- Auto-updating hunger system (runs every minute)

## Database

The SQLite database stores:
- **salmon_state**: Current salmon state (single row)
- **death_history**: All historical deaths
- **action_log**: All user actions (feed/order)

Database file is automatically created at `./data/salmon.db` on first run.

## Monitoring

Prometheus metrics are available at `/metrics` for monitoring:
- `salmon_alive`: Alive status (1/0)
- `salmon_hunger`: Current hunger level
- `salmon_tank_level`: Current tank level
- `salmon_days_survived`: Days the current salmon has survived
- `salmon_total_deaths`: Total number of deaths
- `salmon_total_actions`: Total user actions

## License

MIT
