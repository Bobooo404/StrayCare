const StrayReport = require('../models/StrayReport');
const LostReport = require('../models/LostReport');
const InjuredReport = require('../models/InjuredReport');

/**
 * Single source of truth mapping a report category to its collection.
 * Controllers use this instead of hard-coding model names, so adding a
 * category is a one line change.
 */
const REPORT_MODELS = Object.freeze({
  stray: StrayReport,
  lost: LostReport,
  injured: InjuredReport,
});

const REPORT_CATEGORIES = Object.keys(REPORT_MODELS);

function getReportModel(category) {
  return REPORT_MODELS[category] || null;
}

function isValidCategory(category) {
  return Object.prototype.hasOwnProperty.call(REPORT_MODELS, category);
}

module.exports = {
  REPORT_MODELS,
  REPORT_CATEGORIES,
  getReportModel,
  isValidCategory,
};
