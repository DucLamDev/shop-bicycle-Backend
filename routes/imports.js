import express from 'express';
import Import from '../models/Import.js';
import Product from '../models/Product.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Generate import number
const generateImportNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `IMP${timestamp}${random}`;
};

// Get all imports
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20, startDate, endDate } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Import.countDocuments(query);
    const imports = await Import.find(query)
      .populate('product', 'name brand category images')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.json({
      success: true,
      data: imports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get import statistics
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? Number(month) : currentDate.getMonth() + 1;
    const targetYear = year ? Number(year) : currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const [
      totalImports,
      totalCost,
      totalProfit,
      byStatus,
      topSuppliers
    ] = await Promise.all([
      Import.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Import.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: 'received' } },
        { $group: { _id: null, total: { $sum: '$totalCost' } } }
      ]),
      Import.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: 'received' } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$profit', '$quantity'] } } } }
      ]),
      Import.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Import.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: 'received' } },
        { $group: { 
          _id: '$supplier.name', 
          totalCost: { $sum: '$totalCost' },
          totalItems: { $sum: '$quantity' }
        }},
        { $sort: { totalCost: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        totalImports,
        totalCost: totalCost[0]?.total || 0,
        expectedProfit: totalProfit[0]?.total || 0,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        topSuppliers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get profit report
router.get('/profit-report', protect, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    const profitData = await Import.aggregate([
      { $match: { status: 'received', ...(Object.keys(dateQuery).length ? { createdAt: dateQuery } : {}) } },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: {
            category: '$productInfo.category',
            brand: '$productInfo.brand'
          },
          totalCost: { $sum: '$totalCost' },
          totalSellingValue: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } },
          totalProfit: { $sum: { $multiply: ['$profit', '$quantity'] } },
          totalQuantity: { $sum: '$quantity' },
          avgProfitMargin: { $avg: '$profitMargin' }
        }
      },
      { $sort: { totalProfit: -1 } }
    ]);

    const summary = await Import.aggregate([
      { $match: { status: 'received', ...(Object.keys(dateQuery).length ? { createdAt: dateQuery } : {}) } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
          totalSellingValue: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } },
          totalProfit: { $sum: { $multiply: ['$profit', '$quantity'] } },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        byCategory: profitData,
        summary: summary[0] || { totalCost: 0, totalSellingValue: 0, totalProfit: 0, totalQuantity: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create new import
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { product, supplier, quantity, costPrice, sellingPrice, shippingCost, otherCosts, notes } = req.body;

    // Verify product exists
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại'
      });
    }

    const importDoc = await Import.create({
      importNumber: generateImportNumber(),
      product,
      supplier,
      quantity,
      costPrice,
      sellingPrice,
      shippingCost: shippingCost || 0,
      otherCosts: otherCosts || 0,
      notes,
      createdBy: req.user._id
    });

    // Update product cost price and profit
    productDoc.costPrice = costPrice;
    productDoc.profit = sellingPrice - costPrice;
    productDoc.price = sellingPrice;
    await productDoc.save();

    const populatedImport = await Import.findById(importDoc._id)
      .populate('product', 'name brand category images')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedImport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update import
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const importDoc = await Import.findById(req.params.id);
    
    if (!importDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu nhập'
      });
    }

    const updatedImport = await Import.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('product', 'name brand category images')
    .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: updatedImport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update import status (receive goods)
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const importDoc = await Import.findById(req.params.id);
    
    if (!importDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu nhập'
      });
    }

    importDoc.status = status;
    if (status === 'received') {
      importDoc.receivedDate = new Date();
      
      // Update product stock
      await Product.findByIdAndUpdate(importDoc.product, {
        $inc: { stock: importDoc.quantity }
      });
    }

    await importDoc.save();

    const populatedImport = await Import.findById(importDoc._id)
      .populate('product', 'name brand category images')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: populatedImport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete import
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const importDoc = await Import.findById(req.params.id);
    
    if (!importDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu nhập'
      });
    }

    // If already received, decrease stock
    if (importDoc.status === 'received') {
      await Product.findByIdAndUpdate(importDoc.product, {
        $inc: { stock: -importDoc.quantity }
      });
    }

    await Import.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Đã xóa phiếu nhập'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
