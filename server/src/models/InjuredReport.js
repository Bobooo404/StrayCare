const mongoose = require('mongoose');
const { buildReportSchema } = require('./reportSchemaFactory');

/** Reports of animals that need urgent medical attention. */
module.exports = mongoose.model(
  'InjuredReport',
  buildReportSchema('injured')
);
