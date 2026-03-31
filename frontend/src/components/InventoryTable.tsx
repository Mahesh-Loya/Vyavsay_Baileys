import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { InventorySchema } from '../pages/AIBrain';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  Tag,
  Package,
  Loader2,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  schema: InventorySchema;
  onEdit: (item: any) => void;
  onRefresh: () => void;
}

const InventoryTable: React.FC<Props> = ({ schema, onEdit, onRefresh }) => {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'available' | 'sold' | 'all'>('available');
  const [sort, setSort] = useState<string>('newest');

  useEffect(() => {
    fetchItems();
  }, [page, statusFilter, sort]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        status: statusFilter,
        sort,
      });
      if (search) params.set('search', search);

      const { data } = await client.get(`/catalog?${params}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSold = async (id: string) => {
    try {
      await client.patch(`/catalog/${id}/sold`);
      fetchItems();
      onRefresh();
    } catch (err) {
      console.error('Failed to mark as sold');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await client.delete(`/catalog/${id}`);
      fetchItems();
      onRefresh();
    } catch (err) {
      console.error('Failed to delete item');
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    if (price >= 100000) return `${(price / 100000).toFixed(1)}L`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  // Get up to 4 attribute columns to show in table
  const visibleFields = schema.fields.slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border/50 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <XCircle className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 bg-card border border-border/50 rounded-2xl p-1">
          {(['available', 'sold', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                statusFilter === s ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="bg-card border border-border/50 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name">Name A-Z</option>
        </select>

        <span className="text-sm text-muted-foreground ml-auto">
          {total} item{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-3xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Items Found</h3>
            <p className="text-muted-foreground">
              {search ? 'Try a different search term.' : 'Add your first inventory item to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Image</th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Name</th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Category</th>
                  <th className="text-right px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Price</th>
                  <th className="text-center px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Qty</th>
                  {visibleFields.map(f => (
                    <th key={f.key} className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      {f.label}
                    </th>
                  ))}
                  <th className="text-center px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Status</th>
                  <th className="text-center px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {items.map((item) => {
                    const isSold = item.quantity <= 0 || !item.is_active;
                    const primaryImage = Array.isArray(item.images) && item.images.length > 0
                      ? item.images.sort((a: any, b: any) => a.order - b.order)[0]
                      : null;

                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`border-b border-border/20 hover:bg-muted/20 transition-colors ${isSold ? 'opacity-50' : ''}`}
                      >
                        {/* Image */}
                        <td className="px-6 py-4">
                          {primaryImage ? (
                            <img
                              src={primaryImage.url}
                              alt={item.item_name}
                              className="w-12 h-12 rounded-xl object-cover border border-border/50"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </td>

                        {/* Name */}
                        <td className="px-6 py-4">
                          <p className="font-semibold text-sm">{item.item_name}</p>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          {item.category ? (
                            <span className="bg-muted/50 text-xs font-semibold px-3 py-1 rounded-lg">
                              {item.category}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-sm">
                            {item.price ? `₹${formatPrice(item.price)}` : '-'}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="px-6 py-4 text-center">
                          <span className={`font-bold text-sm ${item.quantity <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {item.quantity}
                          </span>
                        </td>

                        {/* Dynamic attribute columns */}
                        {visibleFields.map(f => (
                          <td key={f.key} className="px-6 py-4 text-sm text-slate-300">
                            {item.attributes?.[f.key] !== undefined ? String(item.attributes[f.key]) : '-'}
                          </td>
                        ))}

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-lg ${
                            isSold
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-green-500/10 text-green-400 border border-green-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isSold ? 'bg-red-400' : 'bg-green-400'}`} />
                            {isSold ? 'Sold' : 'Available'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEdit(item)}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {!isSold && (
                              <button
                                onClick={() => handleMarkSold(item.id)}
                                className="p-2 text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10 rounded-xl transition-all"
                                title="Mark Sold"
                              >
                                <Tag className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = page <= 3 ? i + 1 : page + i - 2;
                if (pageNum < 1 || pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
                      page === pageNum ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryTable;
