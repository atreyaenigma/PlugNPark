export const statusOf = (s) => {
  const free = s.parkFree + s.chargers.reduce((a, c) => a + c.free, 0);
  return free === 0 ? "busy" : free < 4 ? "low" : "free";
};
