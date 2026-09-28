const mongoose = require('mongoose');
const { buildReportSchema } = require('./reportSchemaFactory');

/** Reports of owned pets that have gone missing. */
module.exports = mongoose.model(
  'LostReport',
  buildReportSchema('lost')
);
