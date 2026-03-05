const SEED_WORDS = [
  "apple","bridge","castle","dragon","eagle","forest","garden","harbor",
  "island","jungle","kitten","lemon","mango","noble","ocean","palace",
  "quartz","rabbit","silver","tiger","urban","valley","wisdom","xenon",
  "yellow","zenith",
];

export const randomHex = (len) =>
  [...Array(len)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");

export const generateAddress = () => "0x" + randomHex(40);

export const generateSeedPhrase = () =>
  [...SEED_WORDS].sort(() => Math.random() - 0.5).slice(0, 12);

export function calcPrivacyScore(txs) {
  if (!txs.length) return 0;
  const publicCount = txs.filter((t) => !t.isPrivate).length;
  return Math.round((publicCount / txs.length) * 100);
}

export function getScoreInfo(score) {
  if (score <= 30) return { label: "Highly Private",      color: "#16a34a" };
  if (score <= 70) return { label: "Moderate Exposure",   color: "#d97706" };
  return               { label: "High Exposure",          color: "#dc2626" };
}
