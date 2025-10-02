/**
 * @swagger
 * /api/services/categories:
 *   get:
 *     tags: [Services]
 *     summary: Get service categories (Public)
 *     description: Get all available service categories
 *     responses:
 *       200:
 *         description: Service categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   category_id:
 *                     type: integer
 *                     example: 1
 *                   category_name:
 *                     type: string
 *                     example: Plumbing
 * 
 * /api/services/services:
 *   get:
 *     tags: [Services]
 *     summary: Get provider services
 *     description: Get all services for the authenticated provider with enhanced data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       listing_id:
 *                         type: integer
 *                         example: 123
 *                       service_id:
 *                         type: integer
 *                         example: 123
 *                       service_name:
 *                         type: string
 *                         example: Kitchen Plumbing Repair
 *                       service_title:
 *                         type: string
 *                         example: Kitchen Plumbing Repair
 *                       description:
 *                         type: string
 *                         example: Professional kitchen plumbing repair services
 *                       service_description:
 *                         type: string
 *                         example: Professional kitchen plumbing repair services
 *                       service_photos:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             imageUrl:
 *                               type: string
 *                               example: "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_123_0.jpg"
 *                             uploadedAt:
 *                               type: string
 *                               format: date-time
 *                               example: "2025-01-15T10:30:00.000Z"
 *                         example: []
 *                         description: Array of service photos (empty array if no photos)
 *                       price:
 *                         type: number
 *                         format: float
 *                         example: 150.00
 *                       service_startingprice:
 *                         type: number
 *                         format: float
 *                         example: 150.00
 *                       price_per_hour:
 *                         type: number
 *                         format: float
 *                         example: 150.00
 *                       provider_id:
 *                         type: integer
 *                         example: 456
 *                       is_available:
 *                         type: boolean
 *                         example: true
 *                         description: Based on servicelisting_isActive
 *                       status:
 *                         type: string
 *                         enum: [active, inactive]
 *                         example: active
 *                       specific_services:
 *                         type: array
 *                         items:
 *                           type: object
 *                       category_name:
 *                         type: string
 *                         example: Plumbing
 *                         description: From related category or "Uncategorized"
 *                       category:
 *                         type: object
 *                         nullable: true
 *                       category_id:
 *                         type: integer
 *                         nullable: true
 *                         example: 1
 *                       certificates:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Certificate'
 *                         description: Certificates covering the service
 *                       booking_count:
 *                         type: integer
 *                         example: 0
 *                         description: Default value (not tracked in current schema)
 *                 count:
 *                   type: integer
 *                   example: 5
 *                   description: Total number of services
 *       401:
 *         description: Unauthorized - Provider authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags: [Services]
 *     summary: Create new service
 *     description: Create a new service listing for the authenticated provider
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - service_title
 *               - service_description
 *               - service_startingprice
 *               - service_photos
 *               - certificate_id
 *             properties:
 *               service_title:
 *                 type: string
 *                 example: Bathroom Renovation
 *                 description: Title of the service
 *               service_description:
 *                 type: string
 *                 example: Complete bathroom renovation including plumbing and tiling
 *                 description: Detailed description of the service
 *               service_startingprice:
 *                 type: number
 *                 format: float
 *                 example: 500.00
 *                 description: Starting price for the service
 *               category_id:
 *                 type: integer
 *                 example: 1
 *                 description: Service category ID
 *               service_photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *                 description: Service images (up to 5 photos, JPG/PNG format)
 *               certificate_id:
 *                 type: integer
 *                 example: 1
 *                 description: Certificate ID associated with the service
 *
 *     responses:
 *       201:
 *         description: Service created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/services/services/{serviceId}:
 *   get:
 *     tags: [Services]
 *     summary: Get service by ID
 *     description: Get a specific service by ID for the authenticated provider
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceListing'
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [Services]
 *     summary: Update service
 *     description: Update an existing service for the authenticated provider
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service_title:
 *                 type: string
 *                 example: Updated Service Title
 *               service_description:
 *                 type: string
 *                 example: Updated service description
 *               service_startingprice:
 *                 type: number
 *                 format: float
 *                 example: 200.00
 *               servicelisting_isActive:
 *                 type: boolean
 *                 example: true
 *                 description: Service availability status
 *     responses:
 *       200:
 *         description: Service updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags: [Services]
 *     summary: Delete service
 *     description: Delete a service for the authenticated provider
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service deleted successfully
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
 *                   example: Service deleted successfully
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/services/services/{serviceId}/toggle:
 *   patch:
 *     tags: [Services]
 *     summary: Toggle service availability
 *     description: Toggle the servicelisting_isActive status of a service
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service availability toggled successfully
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
 *                   example: Service availability updated
 *                 data:
 *                   type: object
 *                   properties:
 *                     service_id:
 *                       type: integer
 *                       example: 123
 *                     servicelisting_isActive:
 *                       type: boolean
 *                       example: false
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/services/certificate-services:
 *   get:
 *     tags: [Services]
 *     summary: Get certificate services (Public)
 *     description: Get services that are covered by certificates
 *     responses:
 *       200:
 *         description: Certificate services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   certificate_id:
 *                     type: integer
 *                   certificate_name:
 *                     type: string
 *                   services:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         specific_service_id:
 *                           type: integer
 *                         specific_service_title:
 *                           type: string
 * 
 * /api/services/certificates:
 *   get:
 *     tags: [Services]
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
 */
