// Naomi games: one ear's hot / cold direction may change only after it has held for MIN seconds.
window.MoHeatDwell = { MIN: .4, may(E, dt) { E.held = (E.held || 0) + dt; return E.held >= this.MIN; } };
