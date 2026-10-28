// Runs work(session) in a MongoDB transaction, so all its writes are saved or none are.
// A plain local mongod (no replica set) can't do transactions, so there it runs without one.
const mongoose = require('mongoose');

const NOT_A_REPLICA_SET = 20; // MongoDB's IllegalOperation code: no transaction support here

async function withTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (error.code !== NOT_A_REPLICA_SET) throw error;
    return work(undefined);
  } finally {
    await session.endSession();
  }
}

module.exports = withTransaction;
