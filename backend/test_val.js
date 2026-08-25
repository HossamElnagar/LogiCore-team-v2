import joi from "joi";

const bulkShipmentRowSchema = joi.object({
  trackingNumber: joi.string().trim().min(1).required().messages({
    "any.required": "Tracking number is required.",
    "string.empty": "Tracking number cannot be empty."
  }),
  customerName: joi.string().trim().min(2).max(200).required().messages({
    "string.min": "Customer name must be at least 2 characters.",
    "string.max": "Customer name must be max 200 characters.",
    "any.required": "Customer name is required."
  }),
  customerPhone: joi.string().pattern(/^[0-9]+$/).required().messages({
    "string.pattern.base": "Customer phone must contain digits only.",
    "any.required": "Customer phone is required."
  }),
  deliveryAddress: joi.string().trim().min(1).required().messages({
    "any.required": "Delivery address is required.",
    "string.empty": "Delivery address cannot be empty."
  }),
  pickupAddress: joi.string().trim().min(1).required().messages({
    "any.required": "Pickup address is required.",
    "string.empty": "Pickup address cannot be empty."
  }),
  codAmount: joi.number().min(0).required().messages({
    "number.min": "COD amount cannot be negative.",
    "any.required": "COD amount is required."
  }),
  driverEmail: joi.string().email().required().messages({
    "string.email": "Driver email must be a valid email address.",
    "any.required": "Driver email is required."
  }),
  customerEmail: joi.string().email().optional().messages({
    "string.email": "Customer email must be a valid email address."
  }),
  paymentMethod: joi.string().valid("COD", "ONLINE").default("COD").optional()
});

const bulkImportSchema = joi.object({
  shipments: joi.array().items(bulkShipmentRowSchema).min(1).max(500).required().messages({
    "array.min": "Bulk import must contain at least 1 shipment.",
    "array.max": "Bulk import cannot exceed 500 shipments per request.",
    "any.required": "Shipments array is required."
  })
});

const payload = {
  shipments: [
    {
      "trackingNumber": "TRK-001",
      "codAmount": 100,
      "pickupAddress": "Main Hub",
      "driverEmail": "driver1@company.com",
      "customerName": "Alice",
      "customerPhone": "01012345678",
      "deliveryAddress": "Address 1"
    },
    {
      "trackingNumber": "TRK-002",
      "codAmount": 200,
      "pickupAddress": "Main Hub",
      "driverEmail": "driver1@company.com",
      "customerName": "Bob",
      "customerPhone": "01012345678",
      "deliveryAddress": "Address 2"
    }
  ]
};

const { error } = bulkImportSchema.validate(payload, { abortEarly: false });
if (error) {
  console.log("Validation Errors:", error.details.map(d => d.message));
} else {
  console.log("Validation Passed!");
}
