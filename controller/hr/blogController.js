const { blog } = require('../../model');
const { validateDates } = require('../../helpers/function');
const dbService = require('../../utils/dbService');

exports.addBlog = async (req, res, next) => {
  try {
    const {
      title,
      blogUrl,
      bannerImage,
      author,
      publishDate,
      category,
      description,
      fileName,
      tags,
    } = req.body;
    if (
      !author ||
      !title ||
      !blogUrl ||
      !bannerImage ||
      !publishDate ||
      !category.label ||
      !description ||
      !fileName ||
      !tags
    ) {
      return res.badRequest({
        message:
          'author, title, bannerImage, blogUrl, publishDate, category, description, fileName, tags are required.',
      });
    }
    const validPublishDate = new Date(publishDate);
    if (isNaN(validPublishDate.getTime())) {
      return res.failure({ message: 'Invalid date format' });
    }
    const dataToCreate = {
      blogUrl,
      author,
      title,
      bannerImage,
      publishDate,
      category: category.label,
      description,
      fileName,
      tags,
    };
    const isBlogUrlExit = await blog.findOne({
      blogUrl,
      isDeleted: false,
    });
    if (isBlogUrlExit) {
      return res.failure({ message: 'Blog url already exists' });
    }
    const createBlog = await dbService.create(blog, dataToCreate);
    return res.success({
      message: `Blog added Successfully`,
      data: createBlog,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.updateBlog = async (req, res, next) => {
  try {
    const {
      id,
      author,
      title,
      bannerImage,
      publishDate,
      category,
      description,
      fileName,
      tags,
    } = req.body;
    if (
      !author ||
      !id ||
      !title ||
      !bannerImage ||
      !publishDate ||
      !category.label ||
      !description ||
      !fileName ||
      !tags
    ) {
      return res.badRequest({
        message:
          'author, title, bannerImage, publishDate, category, description, fileName,tags are required.',
      });
    }
    const validPublishDate = new Date(publishDate);
    if (isNaN(validPublishDate.getTime())) {
      return res.failure({ message: 'Invalid date format' });
    }
    const dataToUpdate = {
      author,
      title,
      bannerImage,
      publishDate,
      category: category.label,
      description,
      fileName,
      tags,
    };
    let where = {
      _id: id,
      isDeleted: false,
    };
    const getData = await blog.findOne(where);
    if (!getData) {
      return res.recordNotFound({ message: 'Blog data not found' });
    }
    const updateBlog = await dbService.updateOne(
      blog,
      { _id: id },
      dataToUpdate
    );
    return res.success({
      message: `Blog updated Successfully`,
      data: updateBlog,
    });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.updateBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.badRequest({
        message: 'Insufficient request parameters! id is required.',
      });
    }
    let where = {
      _id: id,
      isDeleted: false,
    };
    let getData = await blog.findOne(where);
    if (getData) {
      await dbService.updateOne(
        blog,
        { _id: id },
        { isActive: !getData.isActive }
      );
      getData = await blog.findOne(where);
      return res.success({ data: getData });
    } else {
      return res.recordNotFound({ message: 'Blog data not found' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.getBlogDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('id',id);
    
    if (!id) {
      return res.badRequest({
        message: 'Insufficient request parameters! id is required.',
      });
    }
    let where = {
      _id: id,
      isDeleted: false,
    };
    const getData = await blog.findOne(where, {
      updatedAt: 0,
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
    });
    if (getData) {
      const _obj = getData.toJSON();
      _obj.bannerUrl = `${process.env.S3_IMAGE_URL}blog/${getData.bannerImage}`;
      return res.success({
        data: _obj,
        message: 'Blog details fetched successfully',
      });
    } else {
      return res.recordNotFound({ message: 'Blog data not found' });
    }
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};
exports.getBlogList = async (req, res) => {
  try {
    const userData = req['user-data'];
    let options = {};
    let query = {};
  
    if (typeof req.body.query === 'object' && req.body.query !== null) {
      query = { ...req.body.query };
    }
    if (req.body.search) {
      // Using regex to search across multiple fields
      const searchTerm = req.body.search;
      query.$or = [
        {
          title: {
            $regex: searchTerm,
            $options: 'i' 
          } 
        },
        {
          blogUrl: {
            $regex: searchTerm,
            $options: 'i' 
          } 
        },
        {
          author: {
            $regex: searchTerm,
            $options: 'i' 
          } 
        },
        {
          category: {
            $regex: searchTerm,
            $options: 'i' 
          } 
        },
      ];
    }

    if (req.body.isCountOnly) {
      let totalRecords = await dbService.count(blog, query);
      return res.success({ data: { totalRecords } });
    }
    if (
      req.body &&
      typeof req.body.options === 'object' &&
      req.body.options !== null
    ) {
      options = { ...req.body.options };
    }
    query.isDeleted = false;
    options.projection = {
      isDeleted: 0,
      addedBy: 0,
      updatedBy: 0,
      updatedAt: 0,
    };    
    let foundBlogData = await dbService.paginate(blog, query, options);
    if (!foundBlogData || !foundBlogData.data || !foundBlogData.data.length) {
      return res.recordNotFound();
    }
    return res.success({ data: foundBlogData });
  } catch (error) {
    return res.internalServerError({ message: error.message });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ID is provided
    if (!id) {
      return res.badRequest({ message: 'Request parameter "id" is required.' });
    }

    // Find the blog post by ID
    const blogData = await blog.findOne({ _id: id });

    if (blogData) {
      // Mark the blog post as deleted
      await dbService.updateOne(blog, { _id: id }, { isDeleted: true });

      return res.success({
        data: blogData,
        message: 'Blog post successfully marked as deleted.',
      });
    } else {
      return res.recordNotFound({ message: 'Blog post not found.' });
    }
  } catch (error) {
    return res.internalServerError({
      message: `An error occurred: ${error.message}`,
    });
  }
};
