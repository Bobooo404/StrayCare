const mongoose = require('mongoose');
const { buildReportSchema } = require('./reportSchemaFactory');

/** Reports of stray animals found roaming in public places. */
module.exports = mongoose.model(
  'StrayReport',
  buildReportSchema('stray')
);
