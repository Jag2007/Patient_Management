// Runs several database writes as one MongoDB transaction: either all of them are saved, or none are.
// Used when an appointment change and its audit entry must succeed or fail together.
// Transactions need a replica set (MongoDB Atlas always is one). A plain local `mongod` is not,
// so there the writes run without a transaction (each single-document update is still atomic).
const mongoose = require('mongoose');

const NOT_A_REPLICA_SET = 20; // MongoDB error code "IllegalOperation": transactions are not supported here

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
