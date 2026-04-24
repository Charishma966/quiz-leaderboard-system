const axios = require("axios");

const BASE_URL = "https://devapigw.vidalhealthtpa.com/srm-quiz-task";
const REG_NO = "2024CS101"; // 🔁 PUT YOUR ACTUAL REG NO

// ⏳ delay function
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 🔁 retry until success (no skipping polls)
async function fetchPoll(poll) {
  while (true) {
    try {
      console.log(`📡 Fetching poll=${poll}`);

      const res = await axios.get(`${BASE_URL}/quiz/messages`, {
        params: { regNo: REG_NO, poll },
      });

      return res;
    } catch (err) {
      console.log(`⚠️ Poll ${poll} failed → retrying in 5 sec...`);
      await sleep(5000);
    }
  }
}

async function main() {
  const seen = new Set(); // 🔑 dedup
  const scores = {}; // 📊 aggregation

  console.log("🚀 Starting polling...\n");

  for (let poll = 0; poll < 10; poll++) {
    const response = await fetchPoll(poll);
    const events = response.data.events;

    for (const event of events) {
      // ✅ CORRECT DEDUP KEY
      const key = `${event.roundId}_${event.participant}`;

      if (seen.has(key)) {
        console.log(`⚠️ Duplicate ignored → ${key}`);
        continue;
      }

      seen.add(key);

      // ➕ add score
      if (!scores[event.participant]) {
        scores[event.participant] = 0;
      }

      scores[event.participant] += event.score;

      console.log(`✅ Added → ${event.participant} +${event.score}`);
    }

    // ⏳ mandatory delay
    if (poll < 9) {
      console.log("⏳ Waiting 5 seconds...\n");
      await sleep(5000);
    }
  }

  console.log("\n📊 Building leaderboard...\n");

  // 🧾 leaderboard sorted DESC
  const leaderboard = Object.entries(scores)
    .map(([participant, totalScore]) => ({
      participant,
      totalScore,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  // 🧮 total score
  const total = leaderboard.reduce((sum, p) => sum + p.totalScore, 0);

  console.log("🏆 Leaderboard:");
  console.table(leaderboard);
  console.log("🧮 Total:", total);

  // 🚀 submit once
  try {
    console.log("\n📤 Submitting...");

    const res = await axios.post(`${BASE_URL}/quiz/submit`, {
      regNo: REG_NO,
      leaderboard,
    });

    console.log("\n✅ FINAL RESPONSE:");
    console.log(res.data);
  } catch (err) {
    console.error("❌ Submission failed:", err.message);
  }
}

main();
