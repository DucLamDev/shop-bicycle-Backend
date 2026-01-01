import express from 'express';
import Expense from '../models/Expense.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all expenses
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { category, status, month, year, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (month) query['period.month'] = Number(month);
    if (year) query['period.year'] = Number(year);

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.json({
      success: true,
      data: expenses,
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

// Get expense statistics
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? Number(month) : currentDate.getMonth() + 1;
    const targetYear = year ? Number(year) : currentDate.getFullYear();

    const [
      totalExpenses,
      byCategory,
      byStatus,
      monthlyTrend
    ] = await Promise.all([
      // Total expenses for the month
      Expense.aggregate([
        { $match: { 'period.month': targetMonth, 'period.year': targetYear, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Expenses by category
      Expense.aggregate([
        { $match: { 'period.month': targetMonth, 'period.year': targetYear } },
        { $group: { 
          _id: '$category', 
          categoryName: { $first: '$categoryName' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }},
        { $sort: { total: -1 } }
      ]),
      // By status
      Expense.aggregate([
        { $match: { 'period.month': targetMonth, 'period.year': targetYear } },
        { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Last 6 months trend
      Expense.aggregate([
        { 
          $match: { 
            status: 'paid',
            $or: Array.from({ length: 6 }, (_, i) => {
              const d = new Date(targetYear, targetMonth - 1 - i, 1);
              return { 'period.month': d.getMonth() + 1, 'period.year': d.getFullYear() };
            })
          } 
        },
        { $group: { 
          _id: { month: '$period.month', year: '$period.year' },
          total: { $sum: '$amount' }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        totalExpenses: totalExpenses[0]?.total || 0,
        byCategory,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = { total: item.total, count: item.count };
          return acc;
        }, {}),
        monthlyTrend
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get category names
router.get('/categories', protect, authorize('admin'), async (req, res) => {
  try {
    const categories = Expense.getCategoryNames();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create new expense
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { category, amount, description, paymentMethod, receipt, period, isRecurring, recurringDay, dueDate, notes } = req.body;

    const categoryNames = Expense.getCategoryNames();
    
    const expense = await Expense.create({
      category,
      categoryName: categoryNames[category] || category,
      amount,
      description,
      paymentMethod,
      receipt,
      period: period || {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      },
      isRecurring,
      recurringDay,
      dueDate,
      notes,
      createdBy: req.user._id
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedExpense
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update expense
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chi phí'
      });
    }

    // Update category name if category changed
    if (req.body.category && req.body.category !== expense.category) {
      const categoryNames = Expense.getCategoryNames();
      req.body.categoryName = categoryNames[req.body.category] || req.body.category;
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      success: true,
      data: updatedExpense
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update expense status (mark as paid)
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chi phí'
      });
    }

    expense.status = status;
    if (status === 'paid') {
      expense.paidDate = new Date();
    }

    await expense.save();

    const populatedExpense = await Expense.findById(expense._id)
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: populatedExpense
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete expense
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chi phí'
      });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Đã xóa chi phí'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Generate monthly expense report
router.get('/report', protect, authorize('admin'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? Number(month) : currentDate.getMonth() + 1;
    const targetYear = year ? Number(year) : currentDate.getFullYear();

    const expenses = await Expense.find({
      'period.month': targetMonth,
      'period.year': targetYear
    }).sort({ category: 1, createdAt: -1 });

    const summary = await Expense.aggregate([
      { $match: { 'period.month': targetMonth, 'period.year': targetYear } },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: '$categoryName' },
          total: { $sum: '$amount' },
          paid: { 
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } 
          },
          pending: { 
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } 
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const grandTotal = summary.reduce((acc, item) => acc + item.total, 0);
    const paidTotal = summary.reduce((acc, item) => acc + item.paid, 0);
    const pendingTotal = summary.reduce((acc, item) => acc + item.pending, 0);

    res.json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        expenses,
        summary,
        totals: {
          grand: grandTotal,
          paid: paidTotal,
          pending: pendingTotal
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
