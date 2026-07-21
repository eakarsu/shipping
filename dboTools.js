'use strict';

function integrationDisabled() {
  var error = new Error('Database and carrier automation are disabled pending owner approval');
  error.status = 501;
  throw error;
}

// Deliberately no database connection is opened at module load. The historical
// code decrypted and logged carrier passwords, interpolated SQL, and ran a job
// automatically when imported; that behavior has been removed.
module.exports = {
  processOneUser: async function() { return integrationDisabled(); },
  processAllUsers: async function() { return integrationDisabled(); },
  processOneUserExt: async function() { return integrationDisabled(); },
  getPassword: async function() { return integrationDisabled(); }
};
