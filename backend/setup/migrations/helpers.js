// Migration helper: creates a collection with a validation rule, or updates the rule if it already exists.
// 'moderate' validation checks new and updated documents but leaves old invalid ones alone.
async function ensureCollection(db, name, schema) {
  const exists = (await db.listCollections({ name }).toArray()).length > 0;
  const options = { validator: { $jsonSchema: schema }, validationLevel: 'moderate' };
  if (exists) await db.command({ collMod: name, ...options });
  else await db.createCollection(name, options);
}

module.exports = { ensureCollection };
