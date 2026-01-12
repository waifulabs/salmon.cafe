import { register, Gauge } from 'prom-client';
import simulator from './simulator.js';

// Create metrics
const salmonAlive = new Gauge({
  name: 'salmon_alive',
  help: 'Whether the salmon is alive (1) or dead (0)'
});

const salmonHunger = new Gauge({
  name: 'salmon_hunger',
  help: 'Current hunger level of the salmon (0-100)'
});

const salmonTankLevel = new Gauge({
  name: 'salmon_tank_level',
  help: 'Current tank level (1-5)'
});

const salmonDaysSurvived = new Gauge({
  name: 'salmon_days_survived',
  help: 'Number of days the current salmon has survived'
});

const salmonTotalDeaths = new Gauge({
  name: 'salmon_total_deaths',
  help: 'Total number of salmon deaths'
});

const salmonTotalActions = new Gauge({
  name: 'salmon_total_actions',
  help: 'Total number of user actions (feed/order)'
});

// Update metrics
export function updateMetrics() {
  const stats = simulator.getStats();
  
  salmonAlive.set(stats.isAlive);
  salmonHunger.set(stats.hunger);
  salmonTankLevel.set(stats.tankLevel);
  salmonDaysSurvived.set(stats.daysSurvived);
  salmonTotalDeaths.set(stats.totalDeaths);
  salmonTotalActions.set(stats.totalActions);
}

// Get metrics for Prometheus
export function getMetrics() {
  updateMetrics();
  return register.metrics();
}

export { register };
