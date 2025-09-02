/**
 * @swagger
 * /api/availability:
 *   get:
 *     tags: [Availability]
 *     summary: Get provider availability
 *     description: Get availability schedule for a provider
 *     parameters:
 *       - in: query
 *         name: provider_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Provider ID
 *       - in: query
 *         name: day
 *         schema:
 *           type: string
 *         description: Specific day of week (optional)
 *     responses:
 *       200:
 *         description: Provider availability retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Availability'
 *   post:
 *     tags: [Availability]
 *     summary: Set provider availability
 *     description: Create a new availability slot for a provider
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_id
 *               - dayOfWeek
 *               - startTime
 *               - endTime
 *             properties:
 *               provider_id:
 *                 type: integer
 *                 example: 456
 *                 description: Provider ID
 *               dayOfWeek:
 *                 type: string
 *                 example: "Monday"
 *                 description: Day of the week
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *                 description: Start time in HH:MM format
 *               endTime:
 *                 type: string
 *                 example: "17:00"
 *                 description: End time in HH:MM format
 *               availability_isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether this availability slot is active
 *     responses:
 *       201:
 *         description: Availability created successfully
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
 * /api/availability/{availabilityId}:
 *   delete:
 *     tags: [Availability]
 *     summary: Delete availability
 *     description: Delete an availability slot
 *     parameters:
 *       - in: path
 *         name: availabilityId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Availability ID
 *     responses:
 *       200:
 *         description: Availability deleted successfully
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
 *                   example: Availability slot deleted successfully
 *       404:
 *         description: Availability not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/availability/summary:
 *   get:
 *     tags: [Availability]
 *     summary: Get availability summary
 *     description: Get a summary of provider availability
 *     parameters:
 *       - in: query
 *         name: provider_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Provider ID
 *     responses:
 *       200:
 *         description: Availability summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     provider_id:
 *                       type: integer
 *                       example: 456
 *                     total_slots:
 *                       type: integer
 *                       example: 14
 *                     active_slots:
 *                       type: integer
 *                       example: 12
 *                     weekly_schedule:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           day:
 *                             type: string
 *                             example: "Monday"
 *                           slots:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 startTime:
 *                                   type: string
 *                                   example: "09:00"
 *                                 endTime:
 *                                   type: string
 *                                   example: "17:00"
 *                                 isActive:
 *                                   type: boolean
 *                                   example: true
 */
