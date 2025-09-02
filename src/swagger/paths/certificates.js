/**
 * @swagger
 * /api/certificates:
 *   get:
 *     tags: [Certificates]
 *     summary: Get provider certificates
 *     description: Get all certificates for the authenticated provider
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider certificates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Certificate'
 *       401:
 *         description: Unauthorized - Provider authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/certificates/valid-types:
 *   get:
 *     tags: [Certificates]
 *     summary: Get valid certificate types
 *     description: Get list of valid certificate types for providers
 *     responses:
 *       200:
 *         description: Valid certificate types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               example:
 *                 - "Electrical Certificate"
 *                 - "Plumbing License"
 *                 - "HVAC Certification"
 *                 - "General Contractor License"
 *                 - "Carpentry Certificate"
 *                 - "Painting License"
 *                 - "Appliance Repair Certificate"
 * 
 * /api/certificates/upload:
 *   post:
 *     tags: [Certificates]
 *     summary: Upload certificate
 *     description: Upload a new certificate for provider verification
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - certificate_name
 *               - certificate_number
 *               - certificateFile
 *             properties:
 *               certificate_name:
 *                 type: string
 *                 example: "Plumbing License"
 *                 description: Name of the certificate
 *               certificate_number:
 *                 type: string
 *                 example: "PL123456789"
 *                 description: Unique certificate number
 *               expiry_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *                 description: Certificate expiry date (optional)
 *               certificateFile:
 *                 type: string
 *                 format: binary
 *                 description: Certificate file (PDF, JPG, PNG, DOC, DOCX - max 10MB)
 *     responses:
 *       201:
 *         description: Certificate uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Certificate uploaded successfully
 *                 data:
 *                   $ref: '#/components/schemas/Certificate'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_fields:
 *                       value: "Certificate name, number, and file are required"
 *                     duplicate_number:
 *                       value: "Certificate number already exists"
 *                     invalid_file:
 *                       value: "Invalid file type. Please upload PDF, image, or document files only"
 *       422:
 *         description: File upload error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/certificates/{certificateId}:
 *   get:
 *     tags: [Certificates]
 *     summary: Get certificate by ID
 *     description: Get a specific certificate by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: certificateId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Certificate ID
 *     responses:
 *       200:
 *         description: Certificate retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Certificate'
 *       404:
 *         description: Certificate not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags: [Certificates]
 *     summary: Delete certificate
 *     description: Delete a certificate (removes file and database record)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: certificateId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Certificate ID
 *     responses:
 *       200:
 *         description: Certificate deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Certificate deleted successfully
 *       404:
 *         description: Certificate not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error deleting certificate file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
