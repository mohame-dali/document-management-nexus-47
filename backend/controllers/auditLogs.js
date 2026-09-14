
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');

// @desc    Get audit logs with filtering and pagination
// @route   GET /api/audit-logs
// @access  Admin only
const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    userId,
    action,
    entityType,
    page = 1,
    limit = 50
  } = req.query;

  // Build filter object
  const filter = {};

  // Date filtering
  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  } else if (startDate) {
    filter.createdAt = { $gte: new Date(startDate) };
  } else if (endDate) {
    filter.createdAt = { $lte: new Date(endDate) };
  }

  // User filtering
  if (userId) {
    filter.userId = userId;
  }

  // Action filtering
  if (action) {
    filter.action = action;
  }

  // Entity type filtering
  if (entityType) {
    filter.entityType = entityType;
  }

  // Pagination setup
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit))); // Max 200 records per page
  const skip = (pageNum - 1) * limitNum;

  try {
    // Get audit logs with pagination
    const auditLogs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'username role')
      .lean(); // Use lean() for better performance

    // Get total count for pagination
    const total = await AuditLog.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Format the response data
    const formattedLogs = auditLogs.map(log => ({
      ...log,
      userDetails: {
        username: log.userId?.username || log.userDetails?.username || 'Unknown User',
        role: log.userId?.role || log.userDetails?.role || 'Unknown Role'
      }
    }));

    res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        current: pageNum,
        pages: totalPages,
        total,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        userId: userId || null,
        action: action || null,
        entityType: entityType || null
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء جلب سجلات التدقيق'
    });
  }
});

// @desc    Export audit logs with enhanced formatting
// @route   GET /api/audit-logs/export
// @access  Admin only
const exportAuditLogs = asyncHandler(async (req, res) => {
  const { format, startDate, endDate, userId, action, entityType } = req.query;

  // Build filter object (same as getAuditLogs)
  const filter = {};
  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  } else if (startDate) {
    filter.createdAt = { $gte: new Date(startDate) };
  } else if (endDate) {
    filter.createdAt = { $lte: new Date(endDate) };
  }

  if (userId) filter.userId = userId;
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;

  try {
    // Get all matching audit logs (no pagination for export)
    const auditLogs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'username role')
      .lean();

    if (format === 'csv') {
      // Enhanced CSV export
      const csvHeader = [
        'التاريخ والوقت',
        'نوع العملية', 
        'نوع الكيان',
        'معرف الكيان',
        'اسم المستخدم',
        'دور المستخدم',
        'عنوان IP',
        'التفاصيل'
      ].join(',') + '\n';

      const csvData = auditLogs.map(log => {
        const timestamp = new Date(log.createdAt).toLocaleString('ar-SA');
        const username = log.userId?.username || log.userDetails?.username || 'غير معروف';
        const role = log.userId?.role || log.userDetails?.role || 'غير معروف';
        const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
        
        return [
          `"${timestamp}"`,
          `"${log.action}"`,
          `"${log.entityType}"`,
          `"${log.entityId}"`,
          `"${username}"`,
          `"${role}"`,
          `"${log.ipAddress || 'غير متوفر'}"`,
          `"${details}"`
        ].join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      
      // Add BOM for proper Arabic display in Excel
      res.write('\uFEFF');
      res.end(csvHeader + csvData);
      return; // Important: return after sending response

    } else if (format === 'pdf') {
      // Enhanced PDF export with Arabic support
      const doc = new PDFDocument({ 
        margin: 50,
        info: {
          Title: 'تقرير سجل التدقيق',
          Author: 'نظام إدارة الوثائق',
          Subject: 'سجل التدقيق والمراجعة',
          CreationDate: new Date()
        }
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.pdf`);
      
      doc.pipe(res);
      
      // PDF Header
      doc.fontSize(20)
         .text('تقرير سجل التدقيق والمراجعة', { align: 'center' })
         .moveDown();
         
      doc.fontSize(12)
         .text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, { align: 'center' })
         .text(`عدد السجلات: ${auditLogs.length}`, { align: 'center' })
         .moveDown(2);

      // Add filter information if any
      if (startDate || endDate || action || entityType) {
        doc.fontSize(14).text('معايير التصفية:', { underline: true });
        if (startDate) doc.fontSize(10).text(`من تاريخ: ${new Date(startDate).toLocaleDateString('ar-SA')}`);
        if (endDate) doc.fontSize(10).text(`إلى تاريخ: ${new Date(endDate).toLocaleDateString('ar-SA')}`);
        if (action) doc.fontSize(10).text(`نوع العملية: ${action}`);
        if (entityType) doc.fontSize(10).text(`نوع الكيان: ${entityType}`);
        doc.moveDown(2);
      }
      
      // Add audit logs
      auditLogs.forEach((log, index) => {
        if (index > 0) {
          doc.moveDown(0.5);
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);
        }
        
        const username = log.userId?.username || log.userDetails?.username || 'غير معروف';
        const role = log.userId?.role || log.userDetails?.role || 'غير معروف';
        
        doc.fontSize(12)
           .text(`${index + 1}. التاريخ: ${new Date(log.createdAt).toLocaleString('ar-SA')}`)
           .fontSize(10)
           .text(`العملية: ${log.action}`)
           .text(`نوع الكيان: ${log.entityType} (${log.entityId})`)
           .text(`المستخدم: ${username} (${role})`)
           .text(`عنوان IP: ${log.ipAddress || 'غير متوفر'}`);
        
        if (log.details && Object.keys(log.details).length > 0) {
          doc.text(`التفاصيل: ${JSON.stringify(log.details, null, 2)}`);
        }
        
        // Add page break if needed
        if (doc.y > 700) {
          doc.addPage();
        }
      });
      
      // Add footer
      doc.fontSize(8)
         .text(`تم إنشاء هذا التقرير في ${new Date().toLocaleString('ar-SA')}`, 50, doc.page.height - 50);
      
      doc.end();
      return; // Important: return after setting up PDF stream

    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'تنسيق التصدير غير مدعوم. يرجى استخدام csv أو pdf' 
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء تصدير سجلات التدقيق'
    });
  }
});

// @desc    Get document timeline with enhanced details
// @route   GET /api/audit-logs/document/:id/timeline
// @access  Admin only
const getDocumentTimeline = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const timeline = await AuditLog.find({
      entityType: 'document',
      entityId: id
    })
      .sort({ createdAt: -1 })
      .populate('userId', 'username role')
      .lean();

    // Format timeline data
    const formattedTimeline = timeline.map(log => ({
      ...log,
      userDetails: {
        username: log.userId?.username || log.userDetails?.username || 'Unknown User',
        role: log.userId?.role || log.userDetails?.role || 'Unknown Role'
      }
    }));

    res.json({
      success: true,
      data: formattedTimeline,
      documentId: id,
      totalEvents: formattedTimeline.length
    });
  } catch (error) {
    console.error('Error fetching document timeline:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء جلب تاريخ المستند'
    });
  }
});

// @desc    Create audit log entry
// @route   POST /api/audit-logs
// @access  Private (all authenticated users for internal logging)
const createAuditLog = asyncHandler(async (req, res) => {
  const { action, entityType, entityId, details, ipAddress } = req.body;

  try {
    const auditLog = await AuditLog.create({
      action,
      entityType,
      entityId,
      userId: req.user.id,
      userDetails: {
        username: req.user.username,
        role: req.user.role
      },
      details: details || {},
      ipAddress: ipAddress || req.ip || req.connection.remoteAddress
    });

    res.status(201).json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء إنشاء سجل التدقيق'
    });
  }
});

module.exports = {
  getAuditLogs,
  exportAuditLogs,
  getDocumentTimeline,
  createAuditLog
};
