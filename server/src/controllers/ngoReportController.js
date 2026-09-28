const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validators } = require('../utils/validate');
const {
  getReportModel,
  isValidCategory,
  REPORT_CATEGORIES,
} = require('../config/reportRegistry');
const { aggregateReports, getReportStats } = require('../services/reportService');
const { REPORT_STATUSES } = require('../models/reportSchemaFactory');

function assertCategory(req) {
  const { category } = req.params;
  if (!isValidCategory(category)) {
    throw ApiError.badRequest(
      `Unknown report category "${category}". Use one of: ${REPORT_CATEGORIES.join(', ')}`
    );
  }
  return category;
}

/** GET /api/ngo/reports - combined, filtered, paginated feed. */
const listReports = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 60);

  const filter = {};

  if (req.query.status) {
    filter.status = validators.enum(req.query.status, REPORT_STATUSES, {
      label: 'Status',
    });
  }

  // `assigned=me` narrows the feed to the signed-in organisation's cases.
  if (req.query.assigned === 'me') {
    filter.assignedNGO = req.ngo._id;
  } else if (req.query.assigned === 'none') {
    filter.assignedNGO = null;
  }

  if (req.query.q) {
    // Escape the input so a user supplied string cannot act as a regex.
    const safe = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(safe, 'i');
    filter.$or = [{ title: pattern }, { description: pattern }, { address: pattern }];
  }

  const categories =
    req.query.category && isValidCategory(req.query.category)
      ? [req.query.category]
      : REPORT_CATEGORIES;

  const { data, total } = await aggregateReports({
    filter,
    categories,
    skip: (page - 1) * limit,
    limit,
  });

  res.json({
    success: true,
    data: { reports: data },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

/** GET /api/ngo/reports/stats */
const getStats = asyncHandler(async (req, res) => {
  const stats = await getReportStats({
    scopedToNgo: req.query.scope === 'mine',
    ngoId: req.ngo._id,
  });

  res.json({ success: true, data: stats });
});

/** PATCH /api/ngo/reports/:category/:id/claim */
const claimReport = asyncHandler(async (req, res) => {
  const category = assertCategory(req);
  validators.objectId(req.params.id, 'report id');
  const Model = getReportModel(category);

  const notes = req.body.notes
    ? validators.string(req.body.notes, 'notes', { max: 2000, label: 'Rescue notes' })
    : null;

  // Guarding on assignedNGO: null makes this atomic - if two NGOs click at the
  // same time only one update can match.
  const report = await Model.findOneAndUpdate(
    { _id: req.params.id, assignedNGO: null },
    { assignedNGO: req.ngo._id, status: 'ongoing', rescueNotes: notes },
    { new: true, runValidators: true }
  ).populate('assignedNGO', 'name phone');

  if (!report) {
    const exists = await Model.exists({ _id: req.params.id });
    if (!exists) throw ApiError.notFound('Report not found');
    throw ApiError.conflict('This case has already been taken by another NGO');
  }

  res.json({
    success: true,
    message: 'Case assigned to you',
    data: { report },
  });
});

/** PATCH /api/ngo/reports/:category/:id/status */
const updateStatus = asyncHandler(async (req, res) => {
  const category = assertCategory(req);
  validators.objectId(req.params.id, 'report id');
  const Model = getReportModel(category);

  const status = validators.enum(req.body.status, REPORT_STATUSES, {
    label: 'Status',
  });

  const notes =
    req.body.notes !== undefined
      ? req.body.notes === null || req.body.notes === ''
        ? null
        : validators.string(req.body.notes, 'notes', {
            max: 2000,
            label: 'Rescue notes',
          })
      : undefined;

  const existing = await Model.findById(req.params.id).lean();
  if (!existing) throw ApiError.notFound('Report not found');

  // Only the NGO holding the case, or any NGO handling a not-yet-claimed one,
  // may change its status.
  const isAssignee =
    existing.assignedNGO && String(existing.assignedNGO) === String(req.ngo._id);
  const isUnassigned = !existing.assignedNGO;

  if (!isAssignee && !isUnassigned) {
    throw ApiError.forbidden('This case is assigned to another organisation');
  }

  const update = { status };
  if (notes !== undefined) update.rescueNotes = notes;

  const report = await Model.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  }).populate('assignedNGO', 'name phone');

  res.json({ success: true, message: 'Status updated', data: { report } });
});

module.exports = { listReports, getStats, claimReport, updateStatus };
