import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import {
  SIERRA_CATEGORIES,
  METERS_PER_ROLL,
  searchSierraCatalog,
  parseUnitFromName,
  stripUnitFromName,
  withUnitInName,
  unitLabel,
  unitShort,
  unitPriceSuffix,
  stockToMeters,
  priceForPackaging,
  packagingLabelForItem,
  type ProductUnit,
  type SierraCatalogItem,
} from '../data/sierraCablesCatalog';

interface Product {
  id: number;
  name: string;
  category_id: number | null;
  brand_id: number | null;
  cost_price: number;
  selling_price: number;
  barcode: string;
  stock_quantity: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('roll_100');
  const [customMeters, setCustomMeters] = useState('75');
  const [allowedPackaging, setAllowedPackaging] = useState<ProductUnit[]>([
    'roll_100',
    'roll_50',
    'custom',
  ]);
  const [priceBasisMeters, setPriceBasisMeters] = useState(100);
  const [baseListPrice, setBaseListPrice] = useState(0);
  const [baseCostPrice, setBaseCostPrice] = useState(0);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const catalogMatches = useMemo(() => {
    if (editingId) return [];
    const base = searchSierraCatalog(catalogSearch, 50);
    const filtered = catalogCategory
      ? base.filter((p) => p.category === catalogCategory)
      : base;
    return filtered.slice(0, 20);
  }, [catalogSearch, catalogCategory, editingId]);

  const customMetersNum = Math.max(1, parseInt(customMeters, 10) || 1);

  const loadProducts = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const data = await window.electronAPI.getProducts();
        setProducts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setName('');
    setBarcode('');
    setSellingPrice('');
    setCostPrice('');
    setStock('0');
    setUnit('roll_100');
    setCustomMeters('75');
    setAllowedPackaging(['roll_100', 'roll_50', 'custom']);
    setPriceBasisMeters(100);
    setBaseListPrice(0);
    setBaseCostPrice(0);
    setCatalogSearch('');
    setCatalogCategory('');
  };

  const openAddModal = () => {
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setName(stripUnitFromName(product.name));
    setBarcode(product.barcode || '');
    setSellingPrice(product.selling_price.toString());
    setCostPrice((product.cost_price ?? 0).toString());
    setStock(product.stock_quantity.toString());
    const parsed = parseUnitFromName(product.name);
    setUnit(parsed.unit);
    setCustomMeters(String(parsed.customMeters || 75));
    setAllowedPackaging(['roll_100', 'roll_50', 'coil_10', 'coil_500', 'meter', 'custom']);
    setPriceBasisMeters(100);
    setBaseListPrice(product.selling_price);
    setBaseCostPrice(product.cost_price ?? 0);
    setCatalogSearch('');
    setCatalogCategory('');
    setModalOpen(true);
  };

  const applyPackagingPrices = (
    nextUnit: ProductUnit,
    nextCustom: number,
    basis: number,
    list: number,
    cost: number
  ) => {
    setSellingPrice(String(priceForPackaging(list, basis, nextUnit, nextCustom)));
    setCostPrice(String(priceForPackaging(cost, basis, nextUnit, nextCustom)));
  };

  const pickFromCatalog = (item: SierraCatalogItem) => {
    setName(item.name);
    setBarcode(item.sku);
    setAllowedPackaging(item.packaging);
    setPriceBasisMeters(item.priceBasisMeters);
    setBaseListPrice(item.listPrice);
    setBaseCostPrice(item.costPrice);
    setUnit(item.defaultUnit);
    const meters = item.defaultUnit === 'custom' ? customMetersNum : 1;
    applyPackagingPrices(item.defaultUnit, meters, item.priceBasisMeters, item.listPrice, item.costPrice);
    if (!stock) setStock('0');
    setCatalogSearch('');
    setCatalogCategory(item.category);
  };

  const selectUnit = (next: ProductUnit) => {
    setUnit(next);
    if (baseListPrice > 0 || baseCostPrice > 0) {
      applyPackagingPrices(next, customMetersNum, priceBasisMeters, baseListPrice, baseCostPrice);
    }
  };

  const onCustomMetersChange = (value: string) => {
    setCustomMeters(value);
    const meters = Math.max(1, parseInt(value, 10) || 1);
    if (unit === 'custom' && (baseListPrice > 0 || baseCostPrice > 0)) {
      applyPackagingPrices('custom', meters, priceBasisMeters, baseListPrice, baseCostPrice);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: withUnitInName(name, unit, customMetersNum),
        barcode,
        selling_price: parseFloat(sellingPrice),
        cost_price: parseFloat(costPrice || '0'),
        stock_quantity: parseInt(stock, 10) || 0,
      };

      // @ts-ignore
      if (window.electronAPI) {
        if (editingId) {
          // @ts-ignore
          await window.electronAPI.updateProduct(editingId, payload);
        } else {
          // @ts-ignore
          await window.electronAPI.addProduct(payload);
        }
        await loadProducts();
        setModalOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save product');
    }
  };

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Product Management</h2>
          <p className="text-slate-500">
            Sierra Cables catalog — (S) Single Core vs (T) Twin Flat · 1 Roll = {METERS_PER_ROLL}M · Custom bobbins
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search products by name or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto table-wrapper">
          <table className="w-full text-left border-collapse table-stack">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Barcode</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Selling Price</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(search.toLowerCase()) ||
                    (p.barcode && p.barcode.includes(search))
                )
                .map((product) => {
                  const { unit: u, customMeters: cm } = parseUnitFromName(product.name);
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td data-label="Barcode" className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {product.barcode || 'N/A'}
                      </td>
                      <td data-label="Product Name" className="px-6 py-4 text-sm font-medium text-slate-900">
                        {stripUnitFromName(product.name)}
                      </td>
                      <td data-label="Unit" className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {unitLabel(u, cm)}
                        </span>
                      </td>
                      <td data-label="Stock" className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.stock_quantity > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.stock_quantity} {unitShort(u)}
                          {u !== 'meter' ? ` (${stockToMeters(product.stock_quantity, u, cm)} m)` : ''}
                        </span>
                      </td>
                      <td data-label="Selling Price" className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        LKR {Number(product.selling_price).toFixed(2)} / {unitPriceSuffix(u, cm)}
                      </td>
                      <td data-label="Actions" className="px-6 py-4 whitespace-nowrap text-sm text-right flex justify-end gap-2">
                        <button onClick={() => openEditModal(product)} className="text-slate-400 hover:text-blue-600 transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button className="text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No products in inventory yet. Click &quot;Add Product&quot; and search the Sierra Cables catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-4 sm:p-6 space-y-4">
              {!editingId && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Search Sierra Cables price list</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCatalogCategory('')}
                      className={`px-2 py-1 rounded text-xs font-medium border ${
                        !catalogCategory ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      All
                    </button>
                    {SIERRA_CATEGORIES.map((cat) => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setCatalogCategory(cat.name)}
                        className={`px-2 py-1 rounded text-xs font-medium border ${
                          catalogCategory === cat.name
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      inputMode="search"
                      placeholder="Type SKU, (S), (T), twin, earth, flex..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-white outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
                    {catalogMatches.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-slate-500">No catalog matches.</p>
                    ) : (
                      catalogMatches.map((item) => (
                        <button
                          key={item.sku}
                          type="button"
                          onClick={() => pickFromCatalog(item)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                        >
                          <div className="text-sm font-medium text-slate-800 truncate">{item.name}</div>
                          <div className="text-xs text-slate-500 flex flex-wrap gap-x-2">
                            <span>{item.sku}</span>
                            {item.cableType && (
                              <span className="font-semibold text-indigo-700">({item.cableType})</span>
                            )}
                            <span>· {item.category}</span>
                            <span className="font-semibold text-amber-700">{unitLabel(item.defaultUnit)}</span>
                            <span className="text-blue-700 font-medium">
                              LKR {item.listPrice.toFixed(2)} / {item.priceBasisMeters}m
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {packagingLabelForItem(item)}
                            {item.editableMeters ? ' · editable meters' : ''}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Tap a cable to auto-fill name, SKU, packaging, and prices.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Barcode / SKU</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Packaging</label>
                <div className="grid grid-cols-2 gap-2">
                  {allowedPackaging.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => selectUnit(opt)}
                      className={`px-3 py-2 rounded-md border text-sm font-medium ${
                        unit === opt
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {unitLabel(opt)}
                    </button>
                  ))}
                </div>
                {unit === 'custom' && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Custom bobbin length (meters)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={customMeters}
                      onChange={(e) => onCustomMetersChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Price and stock are per {unitPriceSuffix(unit, customMetersNum)}. Confirming GRN adds this packaging to inventory.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cost Price (LKR / {unitPriceSuffix(unit, customMetersNum)})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Selling Price (LKR / {unitPriceSuffix(unit, customMetersNum)})
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Initial Stock ({unitShort(unit)})
                  {stock
                    ? ` · ${stockToMeters(parseInt(stock, 10) || 0, unit, customMetersNum)} m total`
                    : ''}
                </label>
                <input
                  required
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
