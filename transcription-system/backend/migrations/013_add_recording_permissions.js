exports.up = async function(knex) {
  // Add recording permissions columns to users table
  await knex.schema.alterTable('users', function(table) {
    table.boolean('recording_enabled').defaultTo(false);
    table.jsonb('recording_pages').defaultTo('[]');
  });

  // Log the migration
  console.log('Added recording_enabled and recording_pages columns to users table');
};

exports.down = async function(knex) {
  await knex.schema.alterTable('users', function(table) {
    table.dropColumn('recording_enabled');
    table.dropColumn('recording_pages');
  });
};