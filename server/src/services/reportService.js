const mongoose = require('mongoose');
const { REPORT_MODELS, REPORT_CATEGORIES } = require('../config/reportRegistry');
const NGO = require('../models/NGO');

/**
 * Stray, lost and injured reports live in three separate collections, but the
 * NGO dashboard and the user's "my reports" list both need one combined,
 * correctly paginated feed. `$unionWith` lets MongoDB do the merge, sort and
 * paginate in the database rather than by concatenating arrays in Node.
 */

const NGO_COLLECTION = NGO.collection.name;

const BASE_FIELDS = {
  _id: 1,
  category: 1,
  reporterName: 1,
  contact: 1,
  animalType: 1,
  title: 1,
  description: 1,
  imageUrl: 1,
  location: 1,
  address: 1,
  dateReported: 1,
  status: 1,
  rescueNotes: 1,
  // Optional AI triage block. Listed explicitly because a report without one
  // simply omits the field, and the NGO dashboard needs it to badge the case.
  aiTriage: 1,
  // Must stay in the projection: LOOKUP_NGO binds it to `$$ngoId` and would
  // find nothing if `$project` had already dropped it.
  assignedNGO: 1,
  reportedBy: 1,
  createdAt: 1,
  updatedAt: 1,
};

const PROJECT = { $project: BASE_FIELDS };

/** Replaces the assignedNGO ObjectId with `{ _id, name, phone }` or null. */
const LOOKUP_NGO = {
  $lookup: {
    from: NGO_COLLECTION,
    let: { ngoId: '$assignedNGO' },
    pipeline: [
      { $match: { $expr: { $eq: ['$_id', '$$ngoId'] } } },
      { $project: { _id: 1, name: 1, phone: 1 } },
    ],
    as: 'assignedNGO',
  },
};

const FLATTEN_NGO = {
  $set: {
    assignedNGO: { $ifNull: [{ $arrayElemAt: ['$assignedNGO', 0] }, null] },
  },
};

/**
 * Builds the union pipeline.
 *
 * @param {object}   filter     Mongo filter applied to every collection
 * @param {string[]} categories which collections to include
 * @param {object}   options    { sort, skip, limit, withFacet }
 */
function buildReportPipeline(filter = {}, categories = REPORT_CATEGORIES, options = {}) {
  const {
    sort = { dateReported: -1 },
    skip = 0,
    limit = 20,
    withFacet = false,
  } = options;

  const models = categories
    .map((category) => REPORT_MODELS[category])
    .filter(Boolean);

  if (models.length === 0) {
    return { pipeline: [], models: [], baseCollection: null };
  }

  const [baseModel, ...restModels] = models;

  const pipeline = [{ $match: filter }, PROJECT];

  for (const model of restModels) {
    pipeline.push({
      $unionWith: {
        coll: model.collection.name,
        pipeline: [{ $match: filter }, PROJECT],
      },
    });
  }

  pipeline.push(LOOKUP_NGO, FLATTEN_NGO, { $sort: { ...sort, _id: -1 } });

  if (withFacet) {
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    });
  } else {
    pipeline.push({ $skip: skip }, { $limit: limit });
  }

  return { pipeline, models, baseCollection: baseModel.collection.name };
}

async function aggregateReports(options) {
  const { pipeline, baseCollection } = buildReportPipeline(
    options.filter,
    options.categories,
    {
      skip: options.skip,
      limit: options.limit,
      sort: options.sort,
      withFacet: true,
    }
  );

  if (pipeline.length === 0) {
    return { data: [], total: 0 };
  }

  // A native `Collection` handle is used because `mongoose.connection.db` is a
  // Mongoose wrapper and the native `Db.aggregate()` does not accept a
  // collection name. The pipeline runs against the first collection and pulls
  // the others in through `$unionWith`.
  const db = mongoose.connection.getClient().db();
  const rows = await db.collection(baseCollection).aggregate(pipeline).toArray();
  const [facet] = rows;

  return {
    data: facet?.data ?? [],
    total: facet?.metadata?.[0]?.total ?? 0,
  };
}

/**
 * Dashboard counters.
 *
 * @param {object} options
 * @param {boolean} options.scopedToNgo  only count cases assigned to this NGO
 * @param {string}  options.ngoId
 */
async function getReportStats({ scopedToNgo = false, ngoId } = {}) {
  const perCategory = {};

  await Promise.all(
    REPORT_CATEGORIES.map(async (category) => {
      const Model = REPORT_MODELS[category];

      const base = scopedToNgo ? { assignedNGO: ngoId } : {};

      const grouped = await Model.aggregate([
        { $match: base },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const bucket = { total: 0, pending: 0, ongoing: 0, completed: 0 };
      grouped.forEach(({ _id: status, count }) => {
        bucket.total += count;
        if (status in bucket) bucket[status] = count;
      });

      perCategory[category] = bucket;
    })
  );

  const totals = { total: 0, pending: 0, ongoing: 0, completed: 0 };
  Object.values(perCategory).forEach((bucket) => {
    totals.total += bucket.total;
    totals.pending += bucket.pending;
    totals.ongoing += bucket.ongoing;
    totals.completed += bucket.completed;
  });

  return { totals, byCategory: perCategory };
}

module.exports = { buildReportPipeline, aggregateReports, getReportStats };
