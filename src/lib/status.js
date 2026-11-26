export const statusOf = (s) => {
  if (s.live === false) return "unknown";
  const free = s.parkFree + s.chargers.reduce((a, c) => a + c.free, 0);
  return free === 0 ? "busy" : free < 4 ? "low" : "free";
};
