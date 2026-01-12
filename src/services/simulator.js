import { db, schema } from '../db/index.js';
import { eq, sql, desc } from 'drizzle-orm';

// Constants
const HUNGER_DECAY_PER_HOUR = 5; // Hunger decreases by 5 per hour
const FEED_AMOUNT = 15; // Feeding increases hunger by 15
const ORDER_AMOUNT = 25; // Ordering increases hunger by 25
const STARVATION_THRESHOLD = 0; // Dies if hunger <= 0
const OVERFEED_THRESHOLD = 100; // Dies if hunger >= 100
const HOURS_PER_DAY = 24;
const DELIVERY_HOUR = 3; // 3 AM delivery time

// Tank unlock thresholds (days survived)
const TANK_THRESHOLDS = [
  { level: 1, daysRequired: 0 },
  { level: 2, daysRequired: 2 },
  { level: 3, daysRequired: 5 },
  { level: 4, daysRequired: 10 },
  { level: 5, daysRequired: 20 }
];

export class SalmonSimulator {
  constructor() {
    this.updateInterval = null;
  }

  // Get current salmon state
  getState() {
    return db.select().from(schema.salmonState).where(eq(schema.salmonState.id, 1)).get();
  }

  // Update hunger based on time elapsed
  updateHunger() {
    const state = this.getState();
    if (!state || !state.isAlive) return state;

    const now = new Date();
    const lastUpdate = state.updatedAt || state.bornAt;
    const hoursElapsed = (now - lastUpdate) / (1000 * 60 * 60);

    if (hoursElapsed < 0.01) return state; // Skip if less than ~36 seconds

    // Calculate new hunger
    const hungerDecay = hoursElapsed * HUNGER_DECAY_PER_HOUR;
    const newHunger = Math.max(0, Math.min(100, state.hunger - hungerDecay));

    // Check for death
    if (newHunger <= STARVATION_THRESHOLD) {
      return this.handleDeath(state, 'starvation', newHunger);
    }

    // Calculate days survived
    const totalHours = (now - state.bornAt) / (1000 * 60 * 60);
    const daysSurvived = Math.floor(totalHours / HOURS_PER_DAY);

    // Check for tank level upgrade
    const newTankLevel = this.calculateTankLevel(daysSurvived);

    // Check for nightly delivery
    this.checkNightlyDelivery(state, now);

    // Update state
    db.update(schema.salmonState)
      .set({
        hunger: newHunger,
        daysSurvived,
        tankLevel: newTankLevel,
        updatedAt: now
      })
      .where(eq(schema.salmonState.id, 1))
      .run();

    return this.getState();
  }

  // Feed the salmon
  feed() {
    const state = this.updateHunger();
    if (!state || !state.isAlive) {
      return { success: false, message: 'Salmon is dead' };
    }

    const oldHunger = state.hunger;
    const newHunger = Math.min(100, state.hunger + FEED_AMOUNT);

    // Check for overfeed death
    if (newHunger >= OVERFEED_THRESHOLD) {
      this.handleDeath(state, 'overfeeding', newHunger);
      return { success: false, message: 'Salmon died from overfeeding!' };
    }

    // Update state
    db.update(schema.salmonState)
      .set({
        hunger: newHunger,
        lastFedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.salmonState.id, 1))
      .run();

    // Log action
    db.insert(schema.actionLog).values({
      action: 'feed',
      timestamp: new Date(),
      hungerBefore: oldHunger,
      hungerAfter: newHunger
    }).run();

    return { success: true, message: 'Fed the salmon', hunger: newHunger };
  }

  // Order food for the salmon (larger feeding)
  order() {
    const state = this.updateHunger();
    if (!state || !state.isAlive) {
      return { success: false, message: 'Salmon is dead' };
    }

    const oldHunger = state.hunger;
    const newHunger = Math.min(100, state.hunger + ORDER_AMOUNT);

    // Check for overfeed death
    if (newHunger >= OVERFEED_THRESHOLD) {
      this.handleDeath(state, 'overfeeding', newHunger);
      return { success: false, message: 'Salmon died from overfeeding!' };
    }

    // Update state
    db.update(schema.salmonState)
      .set({
        hunger: newHunger,
        lastFedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.salmonState.id, 1))
      .run();

    // Log action
    db.insert(schema.actionLog).values({
      action: 'order',
      timestamp: new Date(),
      hungerBefore: oldHunger,
      hungerAfter: newHunger
    }).run();

    return { success: true, message: 'Ordered food for the salmon', hunger: newHunger };
  }

  // Handle salmon death
  handleDeath(state, cause, finalHunger) {
    const now = new Date();
    const durationMs = now - state.bornAt;
    const durationHours = durationMs / (1000 * 60 * 60);

    // Record death
    db.insert(schema.deathHistory).values({
      diedAt: now,
      cause,
      daysSurvived: state.daysSurvived,
      durationHours,
      finalHunger,
      tankLevel: state.tankLevel
    }).run();

    // Mark as dead
    db.update(schema.salmonState)
      .set({
        isAlive: false,
        hunger: finalHunger,
        updatedAt: now
      })
      .where(eq(schema.salmonState.id, 1))
      .run();

    return this.getState();
  }

  // Respawn a new salmon
  respawn() {
    const now = new Date();
    
    db.update(schema.salmonState)
      .set({
        hunger: 50,
        isAlive: true,
        tankLevel: 1,
        daysSurvived: 0,
        bornAt: now,
        lastFedAt: null,
        lastDeliveryAt: null,
        updatedAt: now
      })
      .where(eq(schema.salmonState.id, 1))
      .run();

    return { success: true, message: 'New salmon spawned!' };
  }

  // Calculate tank level based on days survived
  calculateTankLevel(daysSurvived) {
    for (let i = TANK_THRESHOLDS.length - 1; i >= 0; i--) {
      if (daysSurvived >= TANK_THRESHOLDS[i].daysRequired) {
        return TANK_THRESHOLDS[i].level;
      }
    }
    return 1;
  }

  // Check and perform nightly delivery
  checkNightlyDelivery(state, now) {
    const lastDelivery = state.lastDeliveryAt;
    const currentHour = now.getHours();

    // Check if it's delivery time and we haven't delivered today
    if (currentHour === DELIVERY_HOUR) {
      if (!lastDelivery || now - lastDelivery > 23 * 60 * 60 * 1000) {
        // Deliver food (add some hunger)
        const deliveryAmount = 20;
        const newHunger = Math.min(100, state.hunger + deliveryAmount);

        db.update(schema.salmonState)
          .set({
            hunger: newHunger,
            lastDeliveryAt: now
          })
          .where(eq(schema.salmonState.id, 1))
          .run();
      }
    }
  }

  // Get death history
  getDeathHistory(limit = 10) {
    return db.select()
      .from(schema.deathHistory)
      .orderBy(desc(schema.deathHistory.diedAt))
      .limit(limit)
      .all();
  }

  // Get recent actions
  getRecentActions(limit = 20) {
    return db.select()
      .from(schema.actionLog)
      .orderBy(desc(schema.actionLog.timestamp))
      .limit(limit)
      .all();
  }

  // Start automatic updates
  startAutoUpdate(intervalMs = 60000) { // Update every minute by default
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.updateHunger();
    }, intervalMs);
  }

  // Stop automatic updates
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Get statistics for Prometheus
  getStats() {
    const state = this.getState();
    const deathCount = db.select({ count: sql`COUNT(*)` }).from(schema.deathHistory).get()?.count || 0;
    const actionCount = db.select({ count: sql`COUNT(*)` }).from(schema.actionLog).get()?.count || 0;

    return {
      isAlive: state?.isAlive ? 1 : 0,
      hunger: state?.hunger || 0,
      tankLevel: state?.tankLevel || 0,
      daysSurvived: state?.daysSurvived || 0,
      totalDeaths: deathCount,
      totalActions: actionCount
    };
  }
}

export default new SalmonSimulator();
