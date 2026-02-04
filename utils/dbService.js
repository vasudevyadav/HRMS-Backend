// for create one as well as create many
const create = (model, data) =>
  new Promise((resolve, reject) => {
    model.create(data, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

// update single document that will return updated document
const updateOne = (model, filter, data, options = { new: true }) =>
  new Promise((resolve, reject) => {
    model.findOneAndUpdate(filter, data, options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

// delete single document that will return updated document
const deleteOne = (model, filter, options = { new: true }) =>
  new Promise((resolve, reject) => {
    model.findOneAndDelete(filter, options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

// update multiple documents and returns count
const updateMany = (model, filter, data) =>
  new Promise((resolve, reject) => {
    model.updateMany(filter, data, (error, result) => {
      if (error) reject(error);
      else resolve(result.modifiedCount);
    });
  });

// delete multiple documents and returns count
const deleteMany = (model, filter) =>
  new Promise((resolve, reject) => {
    model.deleteMany(filter, (error, result) => {
      if (error) reject(error);
      else resolve(result.deletedCount);
    });
  });

// find single document by query
const findOne = (model, filter, projection = {}, options = {}) =>
  new Promise((resolve, reject) => {
    model.findOne(filter, projection, options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

// find multiple documents
const findMany = (model, filter, options = {}) =>
  new Promise((resolve, reject) => {
    model.find(filter, options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

// count documents
const count = (model, filter) =>
  new Promise((resolve, reject) => {
    model.countDocuments(filter, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

// find documents with pagination
const paginate = (model, filter, options) =>
  new Promise((resolve, reject) => {
    model.paginate(filter, options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

const aggregatePaginate = (model, pipeline, options) =>
  new Promise((resolve, reject) => {
    const {
      page = 1, limit = 10 
    } = options;
    const skip = (page - 1) * limit;
  
    // Clone the pipeline to avoid mutating the original
    const paginatedPipeline = [
      ...pipeline,
      { $skip: skip },
      { $limit: limit }
    ];
  
    // Execute the aggregation pipeline for paginated results
    model.aggregate(paginatedPipeline, (error, results) => {
      if (error) return reject(error);
  
      // Get the total count of documents without pagination
      const countPipeline = [
        ...pipeline,
        { $count: 'total' }
      ];
  
      model.aggregate(countPipeline, (countError, countResult) => {
        if (countError) return reject(countError);
  
        const totalRecords = countResult[0]?.total || 0;
  
        resolve({
          data: results,
          paginator: {
            itemCount: totalRecords,
            offset: skip,
            perPage: limit,
            pageCount: Math.ceil(totalRecords / limit),
            currentPage: page,
            slNo: skip + 1, // Serial number for the first item on the page
            hasPrevPage: page > 1,
            hasNextPage: skip + limit < totalRecords,
            prev: page > 1 ? page - 1 : null,
            next: skip + limit < totalRecords ? page + 1 : null
          }
        });
      });
    });
  });

module.exports = {
  create,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
  findOne,
  findMany,
  count,
  paginate,
  aggregatePaginate
};
