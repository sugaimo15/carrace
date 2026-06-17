// ─── Race settings ───────────────────────────────────────────────────────────
export const TOTAL_LAPS = 3
export const NUM_CHECKPOINTS = 8

// ─── Track ───────────────────────────────────────────────────────────────────
export const TRACK_WIDTH = 22          // meters, road surface
export const TRACK_SEGMENTS = 300      // geometry smoothness

// ─── Kart physics ────────────────────────────────────────────────────────────
export const MAX_SPEED       = 28      // m/s forward
export const MAX_REVERSE     = 8       // m/s reverse
export const ACCEL           = 18      // m/s² acceleration
export const BRAKE_FORCE     = 24      // m/s² braking deceleration
export const COAST_DECEL     = 6       // m/s² natural deceleration
export const STEER_RATE      = 2.2     // rad/s at full speed
export const STEER_RATE_LOW  = 1.2     // rad/s at zero speed
export const WALL_BOUNCE     = 0.35    // speed retention when hitting wall
export const GRASS_DRAG      = 3.5     // extra deceleration on grass (m/s²)

// ─── Drift ───────────────────────────────────────────────────────────────────
export const DRIFT_EXTRA_STEER = 0.9   // extra steering during drift
export const DRIFT_SIDE_SLIP   = 0.18  // lateral slide while drifting
export const DRIFT_MIN_SPEED   = 8     // minimum speed to initiate drift (m/s)

// ─── Boost (Mushroom) ────────────────────────────────────────────────────────
export const BOOST_SPEED    = 50
export const BOOST_DURATION = 2.2

// ─── AI ──────────────────────────────────────────────────────────────────────
export const AI_LOOKAHEAD     = 0.018   // track-T lookahead for AI steering
export const AI_SPEED_FACTOR  = [0.93, 0.96, 0.90]  // per AI kart

// ─── Rubber-banding ──────────────────────────────────────────────────────────
export const RUBBER_BAND_BEHIND = 1.18  // speed multiplier when far behind
export const RUBBER_BAND_AHEAD  = 0.88  // speed cap when far ahead
export const RUBBER_BAND_GAP    = 12    // seconds gap to trigger

// ─── Items ───────────────────────────────────────────────────────────────────
export const ITEM_BOX_RESPAWN  = 8000   // ms
export const ITEM_BOX_RADIUS   = 3      // m, pickup trigger radius
export const BANANA_RADIUS     = 2.5    // m, hit trigger
export const SHELL_SPEED       = 45     // m/s
export const SHELL_RADIUS      = 2.5    // m, hit trigger
export const SPINOUT_DURATION  = 1.8    // seconds
