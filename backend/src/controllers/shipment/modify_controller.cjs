const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'shipment.controller.ts');
let content = fs.readFileSync(controllerPath, 'utf8');

const oldBulkImportMethod = `  /**
   * POST /api/shipments/bulk-import
   * Imports multiple shipments via CSV parsing results.
   */
  async bulkImport(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const actorId = req.user?.sub;
      const rows = req.body.shipments;

      if (!companyId || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ success: false, message: "Invalid payload format. Expected 'shipments' array." });
      }

      const result = await shipmentService.bulkImport(companyId, actorId, rows);

      if (result.successCount === 0 && result.failedCount > 0) {
        return res.status(400).json({
          success: false,
          message: \`Bulk import failed: all \${result.failedCount} rows contained errors\`,
          data: result
        });
      }

      return res.status(200).json({
        success: true,
        message: \`Bulk import completed: \${result.successCount} created, \${result.failedCount} failed\`,
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Internal server error during bulk import" });
    }
  }`;

const newMethods = `  async stageCsvImport(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const actorId = req.user?.sub;
      const csvData = req.body.csvData;
      if (!companyId || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" });
      
      const result = await shipmentService.stageCsvImport(companyId, actorId, csvData);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async submitBatchForApproval(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const actorId = req.user?.sub;
      const { batchId } = req.body;
      if (!companyId || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" });
      
      const result = await shipmentService.submitBatchForApproval(batchId, companyId, actorId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(error.status || 500).json({ success: false, message: error.message });
    }
  }

  async approveImportBatch(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const actorId = req.user?.sub;
      const { batchId } = req.body;
      if (!companyId || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" });
      
      const result = await shipmentService.approveImportBatch(batchId, companyId, actorId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(error.status || 500).json({ success: false, message: error.message });
    }
  }

  async rejectImportBatch(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const actorId = req.user?.sub;
      const { batchId, rejectionReason } = req.body;
      if (!companyId || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" });
      
      const result = await shipmentService.rejectImportBatch(batchId, companyId, actorId, rejectionReason);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(error.status || 500).json({ success: false, message: error.message });
    }
  }

  async cancelStagedBatch(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const actorId = req.user?.sub;
      const { batchId } = req.body;
      if (!companyId || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" });
      
      const result = await shipmentService.cancelStagedBatch(batchId, companyId, actorId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(error.status || 500).json({ success: false, message: error.message });
    }
  }

  async overrideBatchDecision(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const actorId = req.user?.sub;
      const { batchId, newStatus, reason } = req.body;
      if (!companyId || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" });
      
      const result = await shipmentService.overrideBatchDecision(batchId, companyId, actorId, newStatus, reason);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(error.status || 500).json({ success: false, message: error.message });
    }
  }

  async listPendingBatches(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(401).json({ success: false, message: "Unauthorized" });
      
      const result = await shipmentService.listPendingBatches(companyId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBatchDetailsForFinance(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const batchId = req.params.batchId;
      if (!companyId) return res.status(401).json({ success: false, message: "Unauthorized" });
      
      const result = await shipmentService.getBatchDetailsForFinance(batchId, companyId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBatchDetailsForAccountant(req: AuthRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const actorId = req.user?.sub;
      const batchId = req.params.batchId;
      if (!companyId || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" });
      
      const result = await shipmentService.getBatchDetailsForAccountant(batchId, companyId, actorId);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }`;

content = content.replace(oldBulkImportMethod, newMethods);

fs.writeFileSync(controllerPath, content, 'utf8');
console.log('Successfully updated shipment.controller.ts');
