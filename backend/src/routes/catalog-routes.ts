import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import ExcelJS from 'exceljs';
import { CatalogService } from '../services/catalog-service.js';
import { RagService } from '../services/rag-service.js';
import { validate, catalogItemCreate, catalogItemUpdate, catalogQuery, catalogBatch, schemaUpdate } from '../utils/validation.js';

export const catalogRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  const rag = new RagService(server.supabase);
  const catalog = new CatalogService(server.supabase, rag);

  /** List catalog items — paginated, filtered, sorted */
  server.get('/', async (request, reply) => {
    const userId = request.userId;
    const filters = validate(catalogQuery, request.query, reply);
    if (!filters) return;

    const result = await catalog.listItems(userId, filters);
    return reply.send({
      items: result.items,
      total: result.total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(result.total / filters.limit),
    });
  });

  /** Get inventory stats */
  server.get('/stats', async (request, reply) => {
    const stats = await catalog.getStats(request.userId);
    return reply.send(stats);
  });

  /** Export inventory as Excel (.xlsx) */
  server.get('/export', async (request, reply) => {
    const userId = request.userId;

    // Fetch all active items
    const { data: items } = await server.supabase
      .from('wb_catalog_items')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('item_name', { ascending: true });

    if (!items || items.length === 0) {
      return reply.status(404).send({ error: 'No items to export' });
    }

    // Fetch user's schema for column labels
    const { data: userData } = await server.supabase
      .from('wb_users')
      .select('inventory_schema')
      .eq('id', userId)
      .single();

    const schemaFields = userData?.inventory_schema?.fields || [];

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory');

    // Build columns: core fields + dynamic attribute fields
    const columns: { header: string; key: string; width: number }[] = [
      { header: 'Item Name', key: 'item_name', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
    ];

    // Add schema-defined attribute columns
    for (const field of schemaFields) {
      columns.push({ header: field.label, key: `attr_${field.key}`, width: 18 });
    }

    columns.push({ header: 'Status', key: 'status', width: 12 });
    sheet.columns = columns;

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    for (const item of items) {
      const row: Record<string, any> = {
        item_name: item.item_name,
        category: item.category || '',
        price: item.price || '',
        quantity: item.quantity,
        status: item.quantity > 0 ? 'Available' : 'Sold',
      };

      for (const field of schemaFields) {
        row[`attr_${field.key}`] = item.attributes?.[field.key] ?? '';
      }

      sheet.addRow(row);
    }

    // Generate buffer and send
    const buffer = await workbook.xlsx.writeBuffer();

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', 'attachment; filename=inventory_export.xlsx');
    return reply.send(Buffer.from(buffer as ArrayBuffer));
  });

  /** Get single catalog item */
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await catalog.getItem(request.userId, id);
    if (!item) return reply.status(404).send({ error: 'Item not found' });
    return reply.send({ item });
  });

  /** Add a new catalog item */
  server.post('/', async (request, reply) => {
    const body = validate(catalogItemCreate, request.body, reply);
    if (!body) return;

    const item = await catalog.addItem(request.userId, body);
    if (!item) return reply.status(500).send({ error: 'Failed to add item' });
    return reply.status(201).send({ item });
  });

  /** Update a catalog item */
  server.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = validate(catalogItemUpdate, request.body, reply);
    if (!updates) return;

    const item = await catalog.updateItem(request.userId, id, updates);
    if (!item) return reply.status(404).send({ error: 'Item not found or update failed' });
    return reply.send({ item });
  });

  /** Quick mark as sold */
  server.patch('/:id/sold', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await catalog.markSold(request.userId, id);
    if (!item) return reply.status(404).send({ error: 'Item not found' });
    return reply.send({ item });
  });

  /** Soft delete an item */
  server.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await catalog.deleteItem(request.userId, id);
    if (!success) return reply.status(500).send({ error: 'Failed to delete item' });
    return reply.send({ success: true });
  });

  /** Batch add items (for Excel/CSV import) */
  server.post('/batch', async (request, reply) => {
    const body = validate(catalogBatch, request.body, reply);
    if (!body) return;

    const result = await catalog.batchAddItems(request.userId, body.items, body.sourceFileId);
    return reply.send(result);
  });
};

/** Schema management routes */
export const schemaRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  /** Get user's inventory schema */
  server.get('/', async (request, reply) => {
    const { data, error } = await server.supabase
      .from('wb_users')
      .select('inventory_schema')
      .eq('id', request.userId)
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to fetch schema' });
    return reply.send({ schema: data?.inventory_schema || { fields: [] } });
  });

  /** Update user's inventory schema */
  server.patch('/', async (request, reply) => {
    const body = validate(schemaUpdate, request.body, reply);
    if (!body) return;

    const { data, error } = await server.supabase
      .from('wb_users')
      .update({ inventory_schema: body.schema })
      .eq('id', request.userId)
      .select('inventory_schema')
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to update schema' });
    return reply.send({ schema: data?.inventory_schema });
  });
};
