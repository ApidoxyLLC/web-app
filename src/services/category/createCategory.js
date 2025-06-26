import { categoryModel } from '@/models/shop/product/_Category';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import slugify from 'slugify';
import mongoose from 'mongoose';

export default async function createCategory(vendorDb, data, user, shop) {
  const Category = categoryModel(vendorDb);
  const session = await vendorDb.startSession();
  session.startTransaction();

  try {
    const { title, description, parent, image, metaTitle, metaDescription, keywords, slug: userSlug } = data;

    if (parent) {
      const parentInfo = await Category.findOne({ _id: parent }).session(session);
      if (!parentInfo) throw new Error('Parent category not found');
    }

    const slugOptions = { lower: true, strict: true, trim: true };
    const baseSlug = userSlug || slugify(title, slugOptions);
    let slug = baseSlug;
    let counter = 1;

    while (await Category.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const newCategory = new Category({
      title,
      description: description || '',
      slug,
      parent: parent || null,
      image: image || { url: '', alt: '' },
      metaTitle: metaTitle || '',
      metaDescription: metaDescription || '',
      keywords: keywords || [],
      createdBy: user._id
    });

    const saved = await newCategory.save({ session });

    if (saved.parent) {
      await Category.findByIdAndUpdate(saved.parent, { $push: { children: saved._id } }, { session });
    }

    // const Shop = shopModel(vendorDb);
    // await Shop.updateOne({ _id: shop._id }, { $addToSet: { categories: saved._id } });

    await session.commitTransaction();
    session.endSession();

    return { status: 201, body: { success: true, data: saved.toObject(), message: 'Category created successfully' } };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    const errorMsg = err.code === 11000
      ? 'A category with this slug already exists'
      : err.message || 'Something went wrong';

    return { status: 400, body: { success: false, error: errorMsg } };
  }
}