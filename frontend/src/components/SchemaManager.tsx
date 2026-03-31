import React, { useState } from 'react';
import { InventorySchema, SchemaField } from '../pages/AIBrain';
import { X, Plus, Trash2, GripVertical, Save, Settings2 } from 'lucide-react';

interface Props {
  schema: InventorySchema;
  onSave: (schema: InventorySchema) => void;
  onClose: () => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
];

const SchemaManager: React.FC<Props> = ({ schema, onSave, onClose }) => {
  const [fields, setFields] = useState<SchemaField[]>(schema.fields.length > 0 ? [...schema.fields] : []);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<SchemaField['type']>('text');
  const [editingOptions, setEditingOptions] = useState<string | null>(null);
  const [optionsInput, setOptionsInput] = useState('');

  const addField = () => {
    if (!newFieldLabel.trim()) return;

    const key = newFieldLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    // Prevent duplicate keys
    if (fields.some(f => f.key === key)) return;

    const newField: SchemaField = {
      key,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: false,
    };

    if (newFieldType === 'dropdown') {
      newField.options = [];
    }

    setFields([...fields, newField]);
    setNewFieldLabel('');
    setNewFieldType('text');
  };

  const removeField = (key: string) => {
    setFields(fields.filter(f => f.key !== key));
  };

  const toggleRequired = (key: string) => {
    setFields(fields.map(f => f.key === key ? { ...f, required: !f.required } : f));
  };

  const saveOptions = (key: string) => {
    const options = optionsInput.split(',').map(o => o.trim()).filter(o => o.length > 0);
    setFields(fields.map(f => f.key === key ? { ...f, options } : f));
    setEditingOptions(null);
    setOptionsInput('');
  };

  const handleSave = () => {
    onSave({ fields });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border/50 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 sticky top-0 bg-card rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Manage Inventory Fields</h2>
              <p className="text-xs text-muted-foreground">Define what data each item should have</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="bg-muted/30 border border-border/30 rounded-2xl p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Core fields</strong> (Name, Category, Price, Quantity) are always included.
            Add custom fields below for your specific business needs.
          </div>

          {/* Existing fields */}
          {fields.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Custom Fields</p>
              {fields.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center gap-3 bg-muted/20 border border-border/30 rounded-xl p-3"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{field.label}</span>
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-md uppercase tracking-widest font-bold text-muted-foreground">
                        {field.type}
                      </span>
                      {field.required && (
                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-md font-bold">
                          Required
                        </span>
                      )}
                    </div>

                    {/* Dropdown options */}
                    {field.type === 'dropdown' && (
                      <div className="mt-2">
                        {editingOptions === field.key ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={optionsInput}
                              onChange={(e) => setOptionsInput(e.target.value)}
                              placeholder="Option1, Option2, Option3"
                              className="flex-1 bg-card border border-border/50 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                              autoFocus
                            />
                            <button
                              onClick={() => saveOptions(field.key)}
                              className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-semibold"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingOptions(field.key);
                              setOptionsInput((field.options || []).join(', '));
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            {field.options && field.options.length > 0
                              ? `Options: ${field.options.join(', ')}`
                              : '+ Add options'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => toggleRequired(field.key)}
                    className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-all ${
                      field.required
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {field.required ? 'Required' : 'Optional'}
                  </button>

                  <button
                    onClick={() => removeField(field.key)}
                    className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new field */}
          <div className="border border-dashed border-border/50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add New Field</p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="Field name (e.g., Color, Fuel Type, Year)"
                className="flex-1 bg-muted/30 border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addField())}
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as SchemaField['type'])}
                className="bg-muted/30 border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button
                onClick={addField}
                disabled={!newFieldLabel.trim()}
                className="bg-muted hover:bg-muted/80 p-3 rounded-xl transition-all disabled:opacity-30"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold text-muted-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Save className="w-5 h-5" /> Save Schema
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaManager;
