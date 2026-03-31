import React, { useState } from 'react';
import client from '../api/client';
import { InventorySchema } from '../pages/AIBrain';
import { X, Loader2, Save, Package } from 'lucide-react';

interface Props {
  schema: InventorySchema;
  item: any | null; // null = adding new, object = editing
  onSave: () => void;
  onClose: () => void;
}

const ItemModal: React.FC<Props> = ({ schema, item, onSave, onClose }) => {
  const isEditing = !!item;

  const [itemName, setItemName] = useState(item?.item_name || '');
  const [category, setCategory] = useState(item?.category || '');
  const [price, setPrice] = useState(item?.price?.toString() || '');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '1');
  const [attributes, setAttributes] = useState<Record<string, any>>(item?.attributes || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAttributeChange = (key: string, value: any) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    setSaving(true);
    setError(null);

    const payload = {
      item_name: itemName.trim(),
      category: category.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
      quantity: quantity ? parseInt(quantity) : 1,
      attributes,
    };

    try {
      if (isEditing) {
        await client.patch(`/catalog/${item.id}`, payload);
      } else {
        await client.post('/catalog', payload);
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: { key: string; label: string; type: string; required?: boolean; options?: string[] }) => {
    const value = attributes[field.key] ?? '';

    switch (field.type) {
      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => handleAttributeChange(field.key, e.target.value)}
            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select {field.label}</option>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleAttributeChange(field.key, e.target.value ? parseFloat(e.target.value) : '')}
            placeholder={field.label}
            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleAttributeChange(field.key, e.target.checked)}
              className="w-5 h-5 rounded border-border accent-primary"
            />
            <span className="text-sm">{field.label}</span>
          </label>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleAttributeChange(field.key, e.target.value)}
            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleAttributeChange(field.key, e.target.value)}
            placeholder={field.label}
            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border/50 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 sticky top-0 bg-card rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">{isEditing ? 'Edit Item' : 'Add New Item'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Core fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Item Name *
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g., Honda City SV 2022"
                required
                className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Sedan, SUV, Hatchback"
                className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Price
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., 650000"
                className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Dynamic schema fields */}
          {schema.fields.length > 0 && (
            <>
              <div className="border-t border-border/30 pt-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Custom Fields
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schema.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      {field.label} {field.required && '*'}
                    </label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold text-muted-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !itemName.trim()}
              className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isEditing ? 'Update' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemModal;
