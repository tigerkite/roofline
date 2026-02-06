export const Levels = (() => {
  const L = [
    {
      id: 1,
      name: "Compute",
      goal: 12,
      duration: 48,
      unlock: { batch: false, quality: false },
      trafficRps: 0.85,
      serviceBase: 2.50,
      bwStallBase: 0.22,
      remakeByQ: [0.18, 0.10, 0.04],
      bwContention: false,
      learn: "More baristas = more throughput. But watch the pantry \u2014 are baristas waiting on supplies?",
      unlockMsg: "\uD83E\uDDFA Try adjusting Pantry Speed next level!"
    },
    {
      id: 2,
      name: "Bandwidth",
      goal: 18,
      duration: 55,
      unlock: { batch: false, quality: false },
      trafficRps: 1.15,
      serviceBase: 2.35,
      bwStallBase: 0.30,
      remakeByQ: [0.18, 0.10, 0.04],
      bwContention: false,
      learn: "Baristas keep stalling \u2014 the pantry (bandwidth) is the bottleneck! Boosting pantry speed helps.",
      unlockMsg: "\uD83D\uDCE6 Batch size unlocked next level!"
    },
    {
      id: 3,
      name: "Batching & Goodput",
      goal: 24,
      duration: 65,
      unlock: { batch: true, quality: false },
      trafficRps: 1.40,
      serviceBase: 2.30,
      bwStallBase: 0.24,
      remakeByQ: [0.22, 0.12, 0.05],
      bwContention: false,
      learn: "Batching processes multiple drinks at once \u2014 higher throughput, but each customer waits longer (latency trade-off).",
      unlockMsg: "\u2705 Quality / Double-checks unlocked next level!"
    },
    {
      id: 4,
      name: "The Bandwidth Wall",
      goal: 35,
      duration: 55,
      unlock: { batch: true, quality: true },
      trafficRps: 2.20,
      serviceBase: 2.40,
      bwStallBase: 0.55,
      remakeByQ: [0.28, 0.16, 0.09],
      bwContention: true,
      learn: "No matter how you optimise, the pantry (bandwidth) can\u2019t keep up. You\u2019ve hit the Roofline ceiling.",
      unlockMsg: null
    },
  ];

  return { L };
})();
